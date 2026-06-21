// api/parsers/valvechveiculos.js
// Valvech Veículos — POST /_Geral/getEstoque paginado — filtro local

const cheerio = require("cheerio");
const NAME     = "Valvech Veículos";
const BASE_URL = "https://valvechveiculos.com.br";

async function search(query, fetchHtml) {
  const queryWords = query.toLowerCase().split(/\s+/);
  const results    = [];

  for (let page = 1; page <= 5; page++) {
    try {
      // POST com paginação
      const raw = await fetch(`${BASE_URL}/_Geral/getEstoque`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "X-Requested-With": "XMLHttpRequest",
          "User-Agent": "Mozilla/5.0",
        },
        body: `pagina=${page}`,
      });
      let html = await raw.text();
      try { const j = JSON.parse(html); html = j.html || html; } catch (_) {}

      const $     = cheerio.load(html);
      const cards = $(".cerca");
      if (!cards.length) break;

      cards.each((_, card) => {
        try {
          const el = $(card);

          let link = el.find("a[href]").first().attr("href") || null;
          if (link?.startsWith("//")) link = `https:${link}`;
          else if (link && !link.startsWith("http")) link = `${BASE_URL}/${link.replace(/^\//, "")}`;
          if (!link) return;

          let title = el.find("span.l").text().trim().replace(/\s+/g, " ") || "Veículo";
          if (!queryWords.every(w => title.toLowerCase().includes(w))) return;

          let image_url = el.find("img").first().attr("src") || null;
          if (image_url?.startsWith("//")) image_url = `https:${image_url}`;
          else if (image_url && !image_url.startsWith("http")) image_url = `${BASE_URL}/${image_url.replace(/^\//, "")}`;

          let price = el.find("span.r").text().trim().replace(/\s+/g, " ") || "Sob consulta";
          if (price === "R$ 0,00" || price === "R$") price = "Sob consulta";

          
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

      if (cards.length < 24) break;
    } catch (_) { break; }
  }
  return results;
}
module.exports = { search, name: NAME };
