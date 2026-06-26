// api/_scrapers/tharleyveiculos.js
// Tharley Veículos — GET /estoque/ (lista completa, filtro local)
// Plataforma Destaque Auto / Integrador de Anúncios

const cheerio = require("cheerio");
const NAME     = "Tharley Veículos";
const BASE_URL = "https://tharleyveiculos.com.br";

async function search(query, fetchHtml) {
  const queryWords = query.toLowerCase().split(/\s+/);
const results = [];

  const MAX_PAGES = 5;
  let page = 1;
  let hasNext = true;

  while (page <= MAX_PAGES && hasNext) {
    let initialLength = results.length;
    
  const html = await fetchHtml(`${BASE_URL}/estoque/?page=${page}`);
  const $    = cheerio.load(html);
  
  

  // Cada card está dentro de div.itemContainer ou um a.inventory
  $("a.inventory").each((_, aEl) => {
    try {
      const a = $(aEl);
      let link = a.attr("href");
      if (!link) return;
      if (!link.startsWith("http")) link = `${BASE_URL}/${link.replace(/^\//, "")}`;

      const titleDiv = a.find(".title").first();
      let title = titleDiv.length ? titleDiv.text() : "";
      title = title.replace(/\s+/g, " ").trim();
      if (!title) return;

      // Filtro local
      if (!queryWords.every(w => title.toLowerCase().includes(w))) return;

      // Imagem
      const img = a.find("img.preview").first();
      let image_url = img.length ? img.attr("src") : null;
      if (image_url && !image_url.startsWith("http")) {
        image_url = `${BASE_URL}/${image_url.replace(/^\//, "")}`;
      }

      // Preço
      let price = "Sob consulta";
      // Procura texto de preço após a tabela do card
      const parent = a.parent();
      const priceText = parent.text();
      const m = priceText.match(/R\$\s*[\d\.\,]+/i);
      if (m) price = m[0];
      if (price === "R$ 0" || price === "R$ 0,00") price = "Sob consulta";

      // Evita duplicados
      if (results.some(r => r.url === link)) return;

      
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

      results.push({ title, price, image_url, url: link, dealer_name: NAME, year: extYear, km: extKm });
    } catch (_) {}
  });

  
    
    
    // Deduplicate results inside the loop to see if we actually added NEW cars
    const uniqueResults = [...new Map(results.map(v => [v.url, v])).values()];
    results.length = 0;
    results.push(...uniqueResults);

    if (results.length === initialLength) {
      hasNext = false;
    } else {
      page++;
    }
  }
return results;
}

module.exports = { search, name: NAME };
