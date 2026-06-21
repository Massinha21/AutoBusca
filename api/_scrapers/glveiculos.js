// api/parsers/glveiculos.js
// GL Veículos — GET /estoque?termo=<query> — seletores: .card-car

const cheerio = require("cheerio");
const NAME     = "GL Veículos";
const BASE_URL = "https://glveiculos.com.br";

async function search(query, fetchHtml) {
  const html = await fetchHtml(`${BASE_URL}/estoque?termo=${encodeURIComponent(query)}`);
  const $ = cheerio.load(html);
  const results = [];

  $(".card-car").each((_, card) => {
    try {
      const el = $(card);
      let link = el.find("a[href]").first().attr("href") || null;
      if (link && !link.startsWith("http")) link = `${BASE_URL}/${link.replace(/^\//, "")}`;
      if (!link) return;

      let image_url = el.find("img").first().attr("src") || null;
      if (image_url && !image_url.startsWith("http")) image_url = `${BASE_URL}/${image_url.replace(/^\//, "")}`;

      let title = el.find("p.fw-bold").text().trim()
        || el.find("h3.fw-normal").text().trim()
        || "Veículo";
      title = title.replace(/\s+/g, " ");

      let price = "Sob consulta";
      const priceText = el.find(".price").text().trim();
      const m = priceText.match(/R\$\s*[\d\.]+/);
      if (m) price = m[0];
      if (price === "R$ 0" || price === "R$ 0,00") price = "Sob consulta";

      
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
