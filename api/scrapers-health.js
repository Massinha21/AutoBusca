// api/scrapers-health.js
//
// Endpoint de saúde dos scrapers — Serverless Function da Vercel
// Executa um teste leve em paralelo em todos os scrapers para verificar sua integridade.
// Retorna um relatório com a saúde, tempo de resposta e erros de cada revenda.
//

const { sendWebhookAlert } = require("./_lib/webhook-utils");

const PARSERS = [
  require("./_scrapers/zmveiculos"),
  require("./_scrapers/smartcarros"),
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

const BROWSER_HEADERS = {
  "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8",
};

const TEST_TIMEOUT_MS = 6000; // Timeout reduzido para o teste de saúde

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-cache, no-transform");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Use GET para verificar a saúde dos scrapers." });
  }

  const start = Date.now();
  const results = [];

  // Executa os testes de todos os parsers em paralelo
  const promises = PARSERS.map(async (parser) => {
    const pStart = Date.now();
    try {
      // Faz uma pesquisa simples e comum ("Palio") para validar a resposta
      const cars = await withTimeout(
        parser.search("Palio", fetchHtml),
        TEST_TIMEOUT_MS,
        parser.name
      );

      const duration = Date.now() - pStart;
      results.push({
        name: parser.name,
        status: "healthy",
        duration: `${duration}ms`,
        count: cars.length
      });
    } catch (err) {
      const duration = Date.now() - pStart;
      const errMsg = err.message || "Erro desconhecido";
      results.push({
        name: parser.name,
        status: "unhealthy",
        duration: `${duration}ms`,
        error: errMsg
      });

      // Dispara alerta assíncrono via webhook
      await sendWebhookAlert(parser.name, errMsg, "Health Check");
    }
  });

  await Promise.all(promises);

  const unhealthyList = results.filter(r => r.status === "unhealthy");
  
  // Ordena os resultados: saudáveis primeiro, ordenados por nome
  results.sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === "healthy" ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  let overallStatus = "healthy";
  if (unhealthyList.length > 0) {
    overallStatus = unhealthyList.length > 5 ? "critical" : "warning";
  }

  return res.status(200).json({
    status: overallStatus,
    total: PARSERS.length,
    healthy: PARSERS.length - unhealthyList.length,
    unhealthy: unhealthyList.length,
    duration: `${Date.now() - start}ms`,
    scrapers: results
  });
};

// ── Utilitários ───────────────────────────────────────────────────────────

async function fetchHtml(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TEST_TIMEOUT_MS);

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

function withTimeout(promise, maxMs, label) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout (${maxMs}ms) em ${label}`)), maxMs)
  );
  return Promise.race([promise, timeout]);
}
