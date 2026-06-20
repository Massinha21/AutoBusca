// api/parsers/mmveiculos.js
// MM Veículos RP — GET /estoque — Plataforma Wix
// Seletores: [data-hook="product-item-root"]

const cheerio = require("cheerio");
const NAME     = "MM Veículos RP";
const BASE_URL = "https://www.mmveiculosrp.com.br";

async function search(query, fetchHtml) {
  const html = await fetchHtml(`${BASE_URL}/estoque`);
  const $ = cheerio.load(html);
  const queryWords = query.toLowerCase().split(/\s+/);
  const results = [];

  $('[data-hook="product-item-root"]').each((_, card) => {
    try {
      const el = $(card);

      let link = el.find('[data-hook="product-item-container"]').attr("href")
        || el.find("a[href]").first().attr("href") || null;
      if (link && !link.startsWith("http")) link = `${BASE_URL}/${link.replace(/^\//, "")}`;
      if (!link) return;

      let title = (el.find('[data-hook="product-item-name"]').text()
        || el.find("h3").text()).trim().replace(/\s+/g, " ") || "Veículo";
      if (!queryWords.every(w => title.toLowerCase().includes(w))) return;

      // Wix usa wow-image com JSON no atributo data-image-info
      let image_url = null;
      const wowImg = el.find("wow-image");
      if (wowImg.length) {
        try {
          const info = JSON.parse(wowImg.attr("data-image-info") || "{}");
          const uri  = info?.imageData?.uri;
          if (uri) image_url = `https://static.wixstatic.com/media/${uri}`;
        } catch (_) {}
      }
      if (!image_url) image_url = el.find("img").first().attr("src") || null;

      let price = el.find('[data-hook="product-item-price-to-pay"]').text()
        || el.find('[data-hook="prices-container"]').text();
      price = (price || "").replace("Preço", "").replace(/\xa0/g, " ").trim().replace(/\s+/g, " ");
      const clean = price.replace(/R\$|\s|\,00|\.00/g, "");
      if (!price || !clean || clean === "0") price = "Sob consulta";

      
      // --- Auto-Extraction of Year and KM ---
      let extYear = null;
      let extKm = null;
      try {
        const fullText = el.text().replace(/\s+/g, " ");
        // Year: like 2019/2020 or 2019
        const yearMatch = fullText.match(/\b(20\d{2}|19\d{2})(?:\/[12]0\d{2})?\b/);
        if (yearMatch) extYear = yearMatch[0];
        
        // KM: like 45.000 km, 120 mil km, 45000km
        const kmMatch = fullText.match(/\b(\d{1,3}(?:\.\d{3})*)\s*(?:km|kms|mil\s*km)\b/i);
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
