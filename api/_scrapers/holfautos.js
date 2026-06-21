// api/parsers/holfautos.js
// Holf Autos — GET /veiculos?modelo=<query>
// Plataforma AutoCerto — compartilha a mesma estrutura de plataforma da Auto Mais Veículos

const cheerio = require("cheerio");
const NAME     = "Holf Autos";
const BASE_URL = "https://www.holfautos.com";

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

      
      // --- Auto-Extraction of Year and KM ---
      let extYear = null;
      let extKm = null;
      try {
        const fullText = el.text().replace(/\s+/g, " ");
        // Year: like 2019/2020 or 2019
        const yearMatch = fullText.match(/\b(20\d{2}|19\d{2})(?:\/[12]0\d{2})?\b/);
        if (yearMatch) extYear = yearMatch[0];
        
        // KM: like 45.000 km, 120 mil km, 45000km
        let kmMatch = fullText.match(/\b(\d{1,3}(?:\.\d{3})+|\d+)\s*(?:km|kms|mil\s*km)\b/i);
        if (!kmMatch) kmMatch = fullText.match(/\bkm[:\-\s]*(\d{1,3}(?:\.\d{3})+|\d+)\b/i);
        if (kmMatch) {
          let parsedKm = parseInt(kmMatch[1].replace(/\./g, ""), 10);
          if (!isNaN(parsedKm)) extKm = new Intl.NumberFormat("pt-BR").format(parsedKm) + " km";
        }
      } catch (e) {}

      results.push({ title, price, image_url, url: link, dealer_name: NAME, year: extYear, km: extKm });
    } catch (_) {}
  });

  return results;
}

module.exports = { search, name: NAME };
