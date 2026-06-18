// api/_scrapers/cemveiculos.js
// Cem Veículos — GET /estoque
// Plataforma Garaje.com.br (Legacy)

const cheerio = require("cheerio");
const NAME     = "Cem Veículos";
const BASE_URL = "https://www.cemveiculos.com.br";

async function search(query, fetchHtml) {
  // Retorna vazio graciosamente para não quebrar a busca de outras lojas
  // já que o site atual do Cem Veículos (100% Veículos) carrega a busca de forma AJAX/JS antiga.
  return [];
}

module.exports = { search, name: NAME };
