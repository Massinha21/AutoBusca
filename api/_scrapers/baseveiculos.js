// api/parsers/baseveiculos.js
// Base Veículos — GET /veiculos.php — filtro local — seletores: .box-car

const cheerio = require("cheerio");
const NAME     = "Base Veículos";
const BASE_URL = "https://www.baseveiculos.com.br";

async function search(query, fetchHtml) {
  const html = await fetchHtml(`${BASE_URL}/veiculos.php`);
  const $ = cheerio.load(html);
  const queryWords = query.toLowerCase().split(/\s+/);
  const results = [];

  $(".box-car").each((_, card) => {
    try {
      const el = $(card);

      let link = el.find("a[href]").first().attr("href") || null;
      if (link && !link.startsWith("http")) link = `${BASE_URL}/${link.replace(/^\//, "")}`;
      if (!link) return;

      const h3      = el.find("h3").text().trim();
      const strong  = el.find("p strong").text().trim();
      let title = `${h3} ${strong}`.trim().replace(/\s+/g, " ") || "Veículo";
      if (!queryWords.every(w => title.toLowerCase().includes(w))) return;

      let image_url = el.find("img").first().attr("src") || null;
      if (image_url?.startsWith("//")) image_url = `https:${image_url}`;
      else if (image_url && !image_url.startsWith("http")) image_url = `${BASE_URL}/${image_url.replace(/^\//, "")}`;

      let price = "Sob consulta";
      const pText = el.find("p").text();
      const m = pText.match(/R\$\s*[\d\.,]+/);
      if (m) price = m[0];
      if (price === "R$ 0,00" || price === "R$ 0") price = "Sob consulta";

      
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
