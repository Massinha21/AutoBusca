// api/parsers/krveiculos.js
// KR Veículos — GET / (homepage com estoque) — filtro local por título

const cheerio = require("cheerio");
const NAME     = "KR Veículos";
const BASE_URL = "https://www.krveiculos.com.br";

async function search(query, fetchHtml) {
  const queryWords = query.toLowerCase().split(/\s+/);
const results = [];

  const MAX_PAGES = 5;
  let page = 1;
  let hasNext = true;

  while (page <= MAX_PAGES && hasNext) {
    let itemsFoundOnPage = 0;
    
  const html = await fetchHtml(BASE_URL + `?page=${page}`);
  const $ = cheerio.load(html);
  
  

  $("article").each((_, article) => {
    try {
      const el = $(article);

      let link = null;
      el.find("a[href]").each((_, a) => {
        const href = $(a).attr("href");
        const cls  = ($(a).attr("class") || "");
        if (href && href.includes("/veiculo/") && !cls.includes("search_dropdown")) {
          link = href; return false;
        }
      });
      if (!link) return;
      if (!link.startsWith("http")) link = `${BASE_URL}/${link.replace(/^\//, "")}`;

      const model     = el.find("h3").text().trim();
      const brandInfo = el.find("h4").text().trim();
      const brand     = brandInfo.includes("-") ? brandInfo.split("-")[0].trim() : brandInfo;
      let title = `${brand} ${model}`.trim().replace(/\s+/g, " ") || "Veículo";
      if (!queryWords.every(w => title.toLowerCase().includes(w))) return;

      let image_url = el.find("img").first().attr("src") || null;
      if (image_url && !image_url.startsWith("http")) image_url = `${BASE_URL}/${image_url.replace(/^\//, "")}`;

      let price = "Sob consulta";
      el.find("div").each((_, d) => {
        if (($(d).attr("class") || "").includes("card_price")) {
          price = ($(d).find("span").text() || $(d).text()).trim().replace(/\s+/g, " ");
          return false;
        }
      });
      if (!price || price === "R$ 0,00" || price === "R$") price = "Sob consulta";

      
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
