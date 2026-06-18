// api/parsers/rossiveiculos.js
// Rossi Veículos — GET /veiculos?modelo=<query>
// Plataforma AutoCerto — compartilha a mesma estrutura de plataforma da Auto Mais Veículos

const cheerio = require("cheerio");
const NAME     = "Rossi Veículos";
const BASE_URL = "https://rossiveiculos.com.br";

async function search(query, fetchHtml) {
  const url = `${BASE_URL}/veiculos?modelo=${encodeURIComponent(query)}`;
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  const queryWords = query.toLowerCase().split(/\s+/);
  const results = [];

  $("div.result-item").each((_, card) => {
    try {
      const el = $(card);

      let aTag = el.find("a.media-box");
      if (!aTag.length) {
        aTag = el.find("h4.result-item-title a");
      }
      let link = aTag.attr("href") || null;
      if (!link) return;

      if (!link.startsWith("http")) {
        link = `${BASE_URL.replace(/\/$/, "")}/${link.replace(/^\//, "")}`;
      }

      const imgTag = el.find("img");
      let image_url = imgTag.attr("src") || null;
      if (image_url && !image_url.startsWith("http")) {
        image_url = `${BASE_URL.replace(/\/$/, "")}/${image_url.replace(/^\//, "")}`;
      }

      const titleTag = el.find("h4.result-item-title");
      let title = titleTag.text().trim().replace(/\s+/g, " ") || "Veículo";
      
      if (!queryWords.every(w => title.toLowerCase().includes(w))) return;

      let priceTag = el.find("div.result-item-pricing");
      if (!priceTag.length) {
        priceTag = el.find(".price");
      }
      let price = priceTag.text().trim().replace(/\s+/g, " ") || "Sob consulta";
      if (!price.includes("R$")) {
        price = `R$ ${price}`;
      }
      if (price === "R$ 0,00" || price === "R$" || price === "R$ ") {
        price = "Sob consulta";
      }

      results.push({ title, price, image_url, url: link, dealer_name: NAME });
    } catch (_) {}
  });

  return results;
}

module.exports = { search, name: NAME };
