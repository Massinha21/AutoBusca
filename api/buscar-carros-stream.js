// api/buscar-carros-stream.js
// Production version v1.0.0
//
// Endpoint de Streaming — Serverless Function da Vercel (SSE)
// Recebe: GET /api/buscar-carros-stream?query=string
// Retorna: Stream de dados formatados como Server-Sent Events (SSE)
//

const { normalizePrice } = require("./lib/price-utils");
const { sendWebhookAlert } = require("./lib/webhook-utils");
const { extractMetadataFromTitle } = require("./lib/metadata-utils");
const { supabase } = require("./lib/supabase");

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

// Função auxiliar para formatar e enviar dados no protocolo SSE
function sendSSE(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  if (typeof res.flush === "function") res.flush();
}

// ── Handler principal ─────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Use GET para streaming (SSE)." });
  }

  const { query } = req.query || {};
  if (!query || !query.trim()) {
    return res.status(400).json({ error: "Campo 'query' obrigatório na query string." });
  }

  const term = query.trim();
  const normalizedQuery = term.toLowerCase();

  // Tenta buscar no cache do Supabase antes de iniciar scrapers
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
          console.log(`[Cache HIT - SSE] Resultados retornados do banco para: "${normalizedQuery}"`);
          // Envia lista inicial com apenas o site de cache
          sendSSE(res, "init", {
            sites: [{ name: "Banco de Dados (Cache)" }]
          });
          // Envia os resultados do cache de uma vez só
          sendSSE(res, "site-result", {
            name: "Banco de Dados (Cache)",
            status: "success",
            count: data.results.length,
            results: data.results
          });
          // Finaliza o stream
          sendSSE(res, "done", { finished: true });
          return res.end();
        }
        console.log(`[Cache STALE - SSE] Cache expirado para: "${normalizedQuery}". Atualizando via scrapers...`);
      }
    } catch (err) {
      console.warn("[Supabase Cache - SSE] Erro ao buscar cache:", err.message);
    }
  }

  // Envia lista inicial de sites para configurar barra de progresso no front-end
  const allSites = [{ name: "Meu Estoque" }, ...PARSERS.map(p => ({ name: p.name }))];
  sendSSE(res, "init", {
    sites: allSites
  });

  const accumulatedResults = [];

  // Busca instantânea no estoque próprio (tabela carros)
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("carros")
        .select("*")
        .eq("ativo", true)
        .or(`modelo.ilike.%${normalizedQuery}%,marca.ilike.%${normalizedQuery}%`);

      if (!error && data && data.length > 0) {
        const myCars = data.map(c => ({
          url: c.url_externo || `#meu-estoque-${c.id}`,
          title: `${c.marca} ${c.modelo}`,
          price: `R$ ${c.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          price_value: c.preco,
          image_url: c.imagem_url,
          dealer_name: c.fonte || "Meu Estoque",
          year: c.ano,
          km: c.quilometragem,
          brand: c.marca,
          updated_at: c.updated_at,
          is_own_stock: true
        }));
        accumulatedResults.push(...myCars);
        sendSSE(res, "site-result", {
          name: "Meu Estoque",
          status: "success",
          count: myCars.length,
          results: myCars
        });
      } else {
        sendSSE(res, "site-result", { name: "Meu Estoque", status: "empty", count: 0, results: [] });
      }
    } catch (err) {
      sendSSE(res, "site-result", { name: "Meu Estoque", status: "error", error: err.message });
    }
  } else {
    sendSSE(res, "site-result", { name: "Meu Estoque", status: "empty", count: 0, results: [] });
  }

  // Executa cada parser e envia os resultados individualmente conforme terminam
  const promises = PARSERS.map(async (parser) => {
    try {
      const rawCars = await withTimeout(
        parser.search(term, fetchHtml),
        TIMEOUT_MS,
        parser.name
      );

      const cars = (rawCars || []).map(car => {
        const { display, value } = normalizePrice(car.price);
        const meta = extractMetadataFromTitle(car.title);
        return {
          ...car,
          title: meta.title,
          price: display,
          price_value: value,
          year: meta.year,
          km: meta.km
        };
      });

      // Acumula os carros encontrados com sucesso para salvar no cache
      if (cars.length > 0) {
        accumulatedResults.push(...cars);
      }

      sendSSE(res, "site-result", {
        name: parser.name,
        status: "success",
        count: cars.length,
        results: cars
      });
    } catch (err) {
      const errMsg = err.message || "Falha desconhecida";
      console.error(`[${parser.name}] Erro no stream:`, errMsg);
      // Dispara alerta via webhook de forma assíncrona
      await sendWebhookAlert(parser.name, errMsg, `Busca (Stream) - Termo: "${term}"`);
      sendSSE(res, "site-result", {
        name: parser.name,
        status: "error",
        count: 0,
        error: String(errMsg).slice(0, 120)
      });
    }
  });

  // Aguarda todos os scrapers concluírem para fechar a conexão
  await Promise.all(promises);

  // Salva no cache do Supabase os resultados acumulados de todos os scrapers
  if (supabase && accumulatedResults.length > 0) {
    try {
      const { error } = await supabase
        .from("search_cache")
        .upsert({
          query: normalizedQuery,
          results: accumulatedResults,
          updated_at: new Date().toISOString()
        });
      if (error) {
        console.error("[Supabase Cache - SSE] Erro ao salvar cache:", error.message);
      } else {
        console.log(`[Cache Save - SSE] Resultados salvos no banco para: "${normalizedQuery}"`);
      }
    } catch (err) {
      console.warn("[Supabase Cache - SSE] Falha ao executar upsert:", err.message);
    }
  }

  sendSSE(res, "done", { finished: true });
  res.end();
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
