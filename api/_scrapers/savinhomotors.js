// api/parsers/savinhomotors.js
//
// Parser do site Savinho Motors (https://savinhomotors.com.br)
// Diferencial: possui API interna que retorna HTML dentro de JSON!
// Endpoint: GET /api/vehicles?search=<query>
// Retorna: { success: true, html: "<article class='vehicle-card'>..." }

const cheerio = require("cheerio");

const NAME     = "Savinho Motors";
const BASE_URL = "https://savinhomotors.com.br";

async function search(query, fetchHtml) {
  // Este site tem API própria que retorna JSON com HTML embutido
  const url = `${BASE_URL}/api/vehicles?search=${encodeURIComponent(query)}`;
  const raw  = await fetchHtml(url);

  let html;
  try {
    const data = JSON.parse(raw);
    if (!data.success) return [];
    html = data.html || "";
  } catch {
    return [];
  }

  if (!html) return [];

  const $       = cheerio.load(html);
  const results = [];

  $("article.vehicle-card").each((_, card) => {
    try {
      const el = $(card);

      // Link
      let link = el.find("a[href]").first().attr("href") || null;
      if (link && !link.startsWith("http")) link = `${BASE_URL}/${link.replace(/^\//, "")}`;
      if (!link) return;

      // Imagem
      let image_url = el.find("img").first().attr("src") || null;
      if (image_url && !image_url.startsWith("http")) image_url = `${BASE_URL}/${image_url.replace(/^\//, "")}`;

      // Título
      const title = el.find("h3.vehicle-name").text().trim()
        || el.find(".vehicle-brand").text().trim()
        || "Veículo";

      // Preço
      let price = el.find(".vehicle-price").text().trim() || "Sob consulta";
      if (price === "R$ 0,00") price = "Sob consulta";

      
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
