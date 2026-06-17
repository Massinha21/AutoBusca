// api/buscar-carros.js
//
// Serverless Function principal da Vercel.
// Recebe uma requisição de busca e retorna carros encontrados nas revendas.
//
// FASE 1: retorna dados fake para validar o visual e a estrutura do front-end.
// FASE 2+: cada site terá um parser real em /api/parsers/<nome-do-site>.js
//
// Método aceito: POST
// Body esperado (JSON):
//   {
//     "query": "HB20",
//     "urls": ["https://site1.com", "https://site2.com"]  ← opcional na Fase 1
//   }
//
// Resposta (JSON):
//   {
//     "query": "HB20",
//     "total": 8,
//     "sites": [
//       { "name": "AMF Veículos", "status": "success", "count": 2 },
//       { "name": "Site Falhou", "status": "error",   "count": 0, "error": "Timeout" }
//     ],
//     "results": [ { title, price, image_url, url, dealer_name }, ... ]
//   }

const { FAKE_CARS } = require("./lib/fake-data");
const { normalizePrice } = require("./lib/price-utils");

// ─── Handler principal da Serverless Function ──────────────────────────────
module.exports = async function handler(req, res) {
  // Permite chamadas do front-end (CORS) — necessário para testar localmente
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Resposta ao preflight do navegador (CORS OPTIONS)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido. Use POST." });
  }

  // ── Lê e valida o corpo da requisição ──────────────────────────────────
  let query, urls;
  try {
    ({ query, urls } = req.body);
  } catch {
    return res.status(400).json({ error: "Body JSON inválido." });
  }

  if (!query || typeof query !== "string" || query.trim() === "") {
    return res.status(400).json({ error: "O campo 'query' é obrigatório e não pode estar vazio." });
  }

  const searchTerm = query.trim().toLowerCase();

  // ── FASE 1: filtra os dados fake pelo termo de busca ───────────────────
  // Na Fase 2+, este bloco será substituído por chamadas reais aos parsers.
  const matchedCars = FAKE_CARS
    .filter((car) => car.title.toLowerCase().includes(searchTerm))
    .map((car) => {
      // Normaliza o preço para garantir formato consistente
      const { display, value } = normalizePrice(car.price);
      return {
        ...car,
        price: display,
        price_value: value, // valor numérico para ordenação no front-end
      };
    });

  // ── Agrega estatísticas por loja (útil para o painel de progresso) ─────
  const siteStats = {};
  matchedCars.forEach((car) => {
    if (!siteStats[car.dealer_name]) {
      siteStats[car.dealer_name] = { name: car.dealer_name, status: "success", count: 0 };
    }
    siteStats[car.dealer_name].count++;
  });

  // ── Resposta final ─────────────────────────────────────────────────────
  return res.status(200).json({
    query: query.trim(),
    total: matchedCars.length,
    sites: Object.values(siteStats),
    results: matchedCars,
    // Flag para o front-end saber que ainda é dado de teste
    _phase: 1,
    _note: "Dados simulados. Fase 2 implementará scraping real por site.",
  });
};
