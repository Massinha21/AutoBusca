// api/_scrapers/mixveiculos.js
// Mix Veículos — GET /index.php?route=product/search&search=<query>
// Plataforma OpenCart (Journal2 Theme)

const cheerio = require("cheerio");
const NAME     = "Mix Veículos";
const BASE_URL = "https://mixveiculosribeirao.com.br";

async function search(query, fetchHtml) {
  const results = [];

  const MAX_PAGES = 5;
  let page = 1;
  let hasNext = true;

  while (page <= MAX_PAGES && hasNext) {
    let initialLength = results.length;
    
  const url = `${BASE_URL}/index.php?route=product/search&search=${encodeURIComponent(query)}&page=${page}`;
  const html = await fetchHtml(url);
  const $    = cheerio.load(html);
  

  $(".product-grid-item, .product-list-item").each((_, item) => {
    try {
      const el = $(item);

      // Link e Título
      const a = el.find(".name a, .image a").first();
      if (!a.length) return;

      let link = a.attr("href");
      if (link && !link.startsWith("http")) link = `${BASE_URL}/${link.replace(/^\//, "")}`;
      if (!link) return;

      let title = el.find(".name a").first().text() || a.attr("title") || "Veículo";
      title = title.replace(/\s+/g, " ").trim();

      // Imagem — tenta src, depois data-src (lazy-load), depois o background inline do a.has-second-image
      const img = el.find(".image img").first();
      let image_url = null;
      if (img.length) {
        image_url = img.attr("src") || img.attr("data-src") || null;
      }
      
      // Se ainda não achou, tenta extrair o background inline do link
      if (!image_url) {
        const style = el.find(".image a").first().attr("style") || "";
        const bgm   = style.match(/url\(['"']?(.*?)['"']?\)/);
        if (bgm) image_url = bgm[1];
      }

      if (image_url && image_url.startsWith("//")) image_url = "https:" + image_url;

      // Preço
      let price = "Sob consulta";
      const priceText = el.find(".price").text().trim();
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
