// api/buscar-carros.js
// Production version v1.0.1
//
// Endpoint principal — Serverless Function da Vercel
// Recebe: POST { query: string }
// Retorna: { query, total, sites, results }
//
// Busca em TODOS os parsers cadastrados em paralelo (Promise.allSettled).
// Se um site falhar, os outros continuam normalmente.

const { normalizePrice } = require("./_lib/price-utils");
const { sendWebhookAlert } = require("./_lib/webhook-utils");
const { extractMetadataFromTitle } = require("./_lib/metadata-utils");
const { supabase } = require("./_lib/supabase");

// ── Parsers reais (um arquivo por site de revenda) ────────────────────────
const PARSERS = [
  require("./_scrapers/zmveiculos"),
  require("./_scrapers/amfveiculos"),
  require("./_scrapers/savinhomotors"),
  require("./_scrapers/ramiroveiculos"),
  require("./_scrapers/glveiculos"),
  require("./_scrapers/autoprimerp"),
  require("./_scrapers/krveiculos"),
  require("./_scrapers/baseveiculos"),
  require("./_scrapers/mmveiculos"),
  require("./_scrapers/valvechveiculos"),
  require("./_scrapers/copaveiculos"),
  require("./_scrapers/automaisveiculos"),
  require("./_scrapers/rossiveiculos"),
  require("./_scrapers/seminovosribeirao"),
  require("./_scrapers/tcamotors"),
  require("./_scrapers/holfautos"),
  // Novas 9 Revendas Adicionadas
  require("./_scrapers/bolsadeveiculo"),
  require("./_scrapers/cristalveiculos"),
  require("./_scrapers/lexcarmultimarcas"),
  require("./_scrapers/sandiegoveiculos"),
  require("./_scrapers/hiperauto"),
  require("./_scrapers/tharleyveiculos"),
  require("./_scrapers/mixveiculos"),
  require("./_scrapers/kitoveiculos"),
  require("./_scrapers/cemveiculos"),
];

// Headers para imitar um navegador e evitar bloqueios simples
const BROWSER_HEADERS = {
  "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8",
};

const TIMEOUT_MS = 8000; // 8 segundos por site para evitar timeout da Vercel (10s)

// ── Handler principal ─────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Use GET ou POST." });
  }

  const query = req.method === "GET" ? (req.query.query || "") : (req.body?.query || "");
  if (!query || !query.trim()) {
    return res.status(400).json({ error: "Campo 'query' obrigatório." });
  }

  const term = query.trim();
  const normalizedQuery = term.toLowerCase();

  // Tenta buscar no cache do Supabase
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("search_cache")
        .select("*")
        .eq("query", normalizedQuery)
        .single();

      if (data && !error) {
        const ageMs = Date.now() - new Date(data.updated_at).getTime();
        const maxAgeMs = 24 * 60 * 60 * 1000; // 24 horas

        if (ageMs < maxAgeMs) {
          const revendaCars = data.results.filter(car => !car.is_own_stock);
          const hasFipeDataInRevendas = revendaCars.length === 0 || revendaCars.some(car => car.fipe_price_str);
          
          if (data.results.length > 0 && !hasFipeDataInRevendas) {
            console.log(`[Cache INVALIDADO] Cache antigo sem FIPE para: "${normalizedQuery}". Refazendo busca...`);
          } else {
            console.log(`[Cache HIT] Resultados retornados do banco para: "${normalizedQuery}"`);
            
            // Reagrupa por lojas (sites) para o formato da resposta
            const sitesMap = {};
            data.results.forEach(car => {
              const src = car.dealer_name || "Desconhecido";
              if (!sitesMap[src]) sitesMap[src] = 0;
              sitesMap[src]++;
            });
            const sites = Object.entries(sitesMap).map(([name, count]) => ({ name, status: "success", count }));

            return res.status(200).json({
              status: "success",
              count: data.results.length,
              sites,
              results: data.results
            });
          }
        } else {
          console.log(`[Cache STALE] Cache expirado para: "${normalizedQuery}". Atualizando via scrapers...`);
        }
      }
    } catch (err) {
      console.warn("[Supabase Cache] Erro ao buscar cache:", err.message);
    }
  }

  // Configura cabeçalho de cache CDN (Edge) com stale-while-revalidate para requisições GET
  if (req.method === "GET") {
    res.setHeader(
      "Cache-Control",
      "public, max-age=0, s-maxage=1800, stale-while-revalidate=600"
    );
  }

  // Busca em todos os parsers em paralelo — falhas individuais não derrubam o resto
  const settled = await Promise.allSettled(
    PARSERS.map(parser =>
      withTimeout(
        parser.search(term, fetchHtml),
        TIMEOUT_MS,
        parser.name
      )
    )
  );

  // Agrega resultados e estatísticas por loja
  const allResults = [];
  const sites      = [];
  const webhookPromises = [];

  const { getFipePrice } = require('./_scrapers/fipe-matcher');

  for (let i = 0; i < settled.length; i++) {
    const outcome = settled[i];
    const parser = PARSERS[i];

    if (outcome.status === "fulfilled") {
      let cars = (outcome.value || []).map(car => {
        const { display, value } = normalizePrice(car.price);
        const meta = extractMetadataFromTitle(car.title);
        return {
          ...car,
          title: meta.title,
          price: display,
          price_value: value,
          year: car.year || meta.year,
          km: car.km || meta.km
        };
      });

      // Busca FIPE para os carros das revendas de forma assíncrona
      cars = await Promise.all(cars.map(async car => {
        if (car.year && car.year > 1990) {
          const brandName = term.split(' ')[0] || car.title.split(' ')[0];
          const fipeData = await getFipePrice(brandName, car.title, car.version, car.year);
          if (fipeData) {
            car.fipe_price_str = fipeData.priceStr;
            car.fipe_model_name = fipeData.fipeModel;
            const numValue = parseFloat(fipeData.priceStr.replace(/[R$\s\.]/g, '').replace(',', '.'));
            car.fipe_price_value = numValue;
          }
        }
        return car;
      }));

      sites.push({ name: parser.name, status: "success", count: cars.length });
      allResults.push(...cars);
    } else {
      const errMsg = outcome.reason?.message || "Falha desconhecida";
      console.error(`[${parser.name}] Erro:`, errMsg);
      sites.push({
        name:   parser.name,
        status: "error",
        count:  0,
        error:  String(errMsg).slice(0, 120),
      });
      // Agenda envio do webhook de alerta
      webhookPromises.push(sendWebhookAlert(parser.name, errMsg, `Busca (JSON) - Termo: "${term}"`));
    }
  }

  // Aguarda todos os webhooks disparados concluírem antes de responder
  if (webhookPromises.length > 0) {
    await Promise.all(webhookPromises).catch(err => {
      console.error("[Monitoramento] Erro ao aguardar envio de webhooks:", err);
    });
  }

  // Salva os resultados agregados no cache do Supabase
  if (supabase && allResults.length > 0) {
    try {
      const { error } = await supabase
        .from("search_cache")
        .upsert({
          query: normalizedQuery,
          results: allResults,
          updated_at: new Date().toISOString()
        });
      if (error) {
        console.error("[Supabase Cache] Erro ao salvar cache:", error.message);
      } else {
        console.log(`[Cache Save] Resultados salvos no banco para: "${normalizedQuery}"`);
      }
    } catch (err) {
      console.warn("[Supabase Cache] Falha ao executar upsert:", err.message);
    }
  }

  return res.status(200).json({
    query: term,
    total: allResults.length,
    sites,
    results: allResults,
  });
};

// ── Utilitários ───────────────────────────────────────────────────────────

/**
 * Faz um GET HTTP e retorna o corpo como texto.
 * Usado pelos parsers para buscar o HTML dos sites.
 */
async function fetchHtml(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      headers: BROWSER_HEADERS,
      signal:  controller.signal,
      redirect: "follow",
    });

    if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Envolve uma Promise com um timeout.
 * Se demorar mais que maxMs, rejeita com erro de timeout.
 */
function withTimeout(promise, maxMs, label) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout (${maxMs}ms) em ${label}`)), maxMs)
  );
  return Promise.race([promise, timeout]);
}
