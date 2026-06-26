// api/parsers/amfveiculos.js
//
// Parser do site AMF Veículos (https://amfveiculos.com.br)
// Plataforma: WordPress + JetEngine listing grid
// Busca: GET /?s=<query>
// Seletores: .jet-listing-grid__item

const cheerio = require("cheerio");

const NAME     = "AMF Veículos";
const BASE_URL = "https://amfveiculos.com.br";

async function search(query, fetchHtml) {
  const queryWords = query.toLowerCase().split(/\s+/);
const results = [];

  const MAX_PAGES = 5;
  let page = 1;
  let hasNext = true;

  while (page <= MAX_PAGES && hasNext) {
    let itemsFoundOnPage = 0;
    
  const url = `${BASE_URL}/?s=${encodeURIComponent(query)}&paged=${page}`;
  const html = await fetchHtml(url);
  const $    = cheerio.load(html);
  
  

  $(".jet-listing-grid__item").each((_, item) => {
    try {
      const el = $(item);

      // Link do anúncio
      let link = el.find("a.jet-engine-listing-overlay-link").attr("href")
        || el.find("div.jet-engine-listing-overlay-wrap").attr("data-url")
        || el.find("a[href]").first().attr("href");
      if (!link) return;

      // Imagem (lazy loading)
      const img = el.find("img").first();
      const image_url = img.attr("data-src") || img.attr("src") || null;

      // Título (termos dinâmicos do JetEngine)
      const terms = el.find("a.jet-listing-dynamic-terms__link")
        .map((_, t) => $(t).text().trim()).get().filter(Boolean);
      let title = terms.length
        ? terms.join(" ")
        : el.find("h2,h3,h4,h5").first().text().trim() || "";

      // Filtro de segurança: se não achou título real ou se for genérico "veículo"
      if (!title || title.toLowerCase() === "veículo") return;

      // Filtro local do termo de busca
      if (!queryWords.every(w => title.toLowerCase().includes(w))) return;

      // Preço
      let price = "Sob consulta";
      el.find(".jet-listing-dynamic-field__content").each((_, f) => {
        const t = $(f).text().trim();
        if (t.includes("R$")) { price = t; return false; }
      });

      
      // --- Auto-Extraction of Year and KM ---
      let extYear = null;
      let extKm = null;
      try {
        const fullText = el.text().replace(/\s+/g, " ");
        // Year: like 2019/2020 or 2019
        const yearMatch = fullText.match(/\b(20\d{2}|19\d{2})(?:\/[12]0\d{2})?\b/);
        if (yearMatch) extYear = yearMatch[0];
        
        // KM: like 45.000 km, 120 mil km, 45000km
        let kmMatch = fullText.match(/\bkm[:\-\s]*(\d{1,3}(?:\.\d{3})+|\d+)\b/i);
        if (!kmMatch) kmMatch = fullText.match(/\b(\d{1,3}(?:\.\d{3})+|\d+)\s*(?:km|kms|mil\s*km)\b/i);
        if (kmMatch) {
          let parsedKm = parseInt(kmMatch[1].replace(/\./g, ""), 10);
          if (extYear && parsedKm === parseInt(extYear)) kmMatch = null;
          if (kmMatch && !isNaN(parsedKm)) extKm = new Intl.NumberFormat("pt-BR").format(parsedKm) + " km";
        }
      } catch (e) {}

      itemsFoundOnPage++;
      results.push({ title, price, image_url, url: link, dealer_name: NAME, year: extYear, km: extKm });
    } catch (_) {}
  });

  
    
    if (itemsFoundOnPage === 0) {
      hasNext = false;
    } else {
      page++;
    }
  }
return results;
}

module.exports = { search, name: NAME };
