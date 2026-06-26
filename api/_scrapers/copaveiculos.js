// api/parsers/copaveiculos.js
// Copa Veículos — GET /estoque (lista completa, filtro local)
// Plataforma Exibição — compartilha a mesma estrutura de plataforma da Auto Prime RP

const cheerio = require("cheerio");
const NAME     = "Copa Veículos";
const BASE_URL = "https://www.copaveiculos.com.br";

async function search(query, fetchHtml) {
  const queryWords = query.toLowerCase().split(/\s+/);
const results = [];

  const MAX_PAGES = 5;
  let page = 1;
  let hasNext = true;

  while (page <= MAX_PAGES && hasNext) {
    let initialLength = results.length;
    
  const html = await fetchHtml(`${BASE_URL}/estoque?page=${page}`);
  const $ = cheerio.load(html);
  
  

  $("ul").each((_, ul) => {
    try {
      const el     = $(ul);
      const fotoLi = el.find("li.li-foto-estoque");
      const descLi = el.find("li.li-desc-estoque");
      if (!fotoLi.length || !descLi.length) return;

      let link = el.find("a[href]").first().attr("href") || null;
      if (!link || !link.includes("exibicao")) return;
      if (!link.startsWith("http")) link = `${BASE_URL}/${link.replace(/^\//, "")}`;

      const titleSpan = descLi.find("span.tx-titulo-estoque");
      let title = titleSpan.text().trim().replace(/\s+/g, " ") || "Veículo";
      if (!queryWords.every(w => title.toLowerCase().includes(w))) return;

      let image_url = null;
      const style = fotoLi.attr("style") || "";
      const bgm = style.match(/url\(['"]?(.*?)['"]?\)/);
      if (bgm) {
        image_url = bgm[1];
        if (!image_url.startsWith("http")) image_url = `${BASE_URL}/${image_url.replace(/^\//, "")}`;
      }

      let price = descLi.find("span.tx-preco").text().trim() || "Sob consulta";
      const clean = price.replace(/R\$|\s|\,00|\.00/g, "");
      if (!clean || clean === "0") price = "Sob consulta";

      
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
