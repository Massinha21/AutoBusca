// api/buscar-carros.js
//
// Endpoint principal — Serverless Function da Vercel
// Recebe: POST { query: string }
// Retorna: { query, total, sites, results }
//
// Busca em TODOS os parsers cadastrados em paralelo (Promise.allSettled).
// Se um site falhar, os outros continuam normalmente.

const { normalizePrice } = require("./lib/price-utils");

// ── Parsers reais (um arquivo por site de revenda) ────────────────────────
const PARSERS = [
  require("./parsers/amfveiculos"),
  require("./parsers/savinhomotors"),
  require("./parsers/ramiroveiculos"),
  require("./parsers/glveiculos"),
  require("./parsers/autoprimerp"),
  require("./parsers/krveiculos"),
  require("./parsers/baseveiculos"),
  require("./parsers/mmveiculos"),
  require("./parsers/valvechveiculos"),
  require("./parsers/copaveiculos"),
  require("./parsers/automaisveiculos"),
  require("./parsers/rossiveiculos"),
  require("./parsers/seminovosribeirao"),
  require("./parsers/tcamotors"),
  require("./parsers/holfautos"),
];

// Headers para imitar um navegador e evitar bloqueios simples
const BROWSER_HEADERS = {
  "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8",
};

const TIMEOUT_MS = 12000; // 12 segundos por site

// ── Handler principal ─────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")    return res.status(405).json({ error: "Use POST." });

  const { query } = req.body || {};
  if (!query || !query.trim()) {
    return res.status(400).json({ error: "Campo 'query' obrigatório." });
  }

  const term = query.trim();

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

  settled.forEach((outcome, i) => {
    const parser = PARSERS[i];

    if (outcome.status === "fulfilled") {
      const cars = (outcome.value || []).map(car => {
        const { display, value } = normalizePrice(car.price);
        return { ...car, price: display, price_value: value };
      });

      sites.push({ name: parser.name, status: "success", count: cars.length });
      allResults.push(...cars);
    } else {
      console.error(`[${parser.name}] Erro:`, outcome.reason?.message || outcome.reason);
      sites.push({
        name:   parser.name,
        status: "error",
        count:  0,
        error:  String(outcome.reason?.message || "Falha desconhecida").slice(0, 120),
      });
    }
  });

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
