// api/_scrapers/sandiegoveiculos.js
// San Diego Veículos — GET /estoque?nome=<query>
// Plataforma Autoconf

const cheerio = require("cheerio");
const NAME     = "San Diego Veículos";
const BASE_URL = "https://sandiegoveiculos.com.br";

async function search(query, fetchHtml) {
  const html = await fetchHtml(`${BASE_URL}/estoque?nome=${encodeURIComponent(query)}`);
  const $    = cheerio.load(html);
  const queryWords = query.toLowerCase().split(/\s+/);
  const results = [];

  $(".card-car").each((_, card) => {
    try {
      const el = $(card);
      
      // Link e Título
      const a = el.find("a[href*='/carros/']").first();
      if (!a.length) return;

      let link = a.attr("href");
      if (link && !link.startsWith("http")) link = `${BASE_URL}/${link.replace(/^\//, "")}`;
      if (!link) return;

      let title = a.attr("title") || el.find(".car-description h2, .car-description h3").first().text();
      title = title.replace(/\s+/g, " ").trim();
      if (!title) title = "Veículo";

      if (!queryWords.every(w => title.toLowerCase().includes(w))) return;

      // Imagem
      const img = el.find(".card-header img").first();
      let image_url = img.attr("srcset") || img.attr("src") || null;
      if (image_url) {
        // Se usar srcset, pega a primeira imagem da lista
        if (image_url.includes(",")) {
          image_url = image_url.split(",")[0].trim().split(" ")[0];
        }
        if (!image_url.startsWith("http")) image_url = `${BASE_URL}/${image_url.replace(/^\//, "")}`;
      }

      // Preço
      let price = "Sob consulta";
      const priceText = el.find(".card-footer, .card-price").text().trim();
      const m = priceText.match(/R\$\s*[\d\.\,]+/i);
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
