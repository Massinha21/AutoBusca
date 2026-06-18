// api/parsers/mmveiculos.js
// MM Veículos RP — GET /estoque — Plataforma Wix
// Seletores: [data-hook="product-item-root"]

const cheerio = require("cheerio");
const NAME     = "MM Veículos RP";
const BASE_URL = "https://www.mmveiculosrp.com.br";

async function search(query, fetchHtml) {
  const html = await fetchHtml(`${BASE_URL}/estoque`);
  const $ = cheerio.load(html);
  const queryWords = query.toLowerCase().split(/\s+/);
  const results = [];

  $('[data-hook="product-item-root"]').each((_, card) => {
    try {
      const el = $(card);

      let link = el.find('[data-hook="product-item-container"]').attr("href")
        || el.find("a[href]").first().attr("href") || null;
      if (link && !link.startsWith("http")) link = `${BASE_URL}/${link.replace(/^\//, "")}`;
      if (!link) return;

      let title = (el.find('[data-hook="product-item-name"]').text()
        || el.find("h3").text()).trim().replace(/\s+/g, " ") || "Veículo";
      if (!queryWords.every(w => title.toLowerCase().includes(w))) return;

      // Wix usa wow-image com JSON no atributo data-image-info
      let image_url = null;
      const wowImg = el.find("wow-image");
      if (wowImg.length) {
        try {
          const info = JSON.parse(wowImg.attr("data-image-info") || "{}");
          const uri  = info?.imageData?.uri;
          if (uri) image_url = `https://static.wixstatic.com/media/${uri}`;
        } catch (_) {}
      }
      if (!image_url) image_url = el.find("img").first().attr("src") || null;

      let price = el.find('[data-hook="product-item-price-to-pay"]').text()
        || el.find('[data-hook="prices-container"]').text();
      price = (price || "").replace("Preço", "").replace(/\xa0/g, " ").trim().replace(/\s+/g, " ");
      const clean = price.replace(/R\$|\s|\,00|\.00/g, "");
      if (!price || !clean || clean === "0") price = "Sob consulta";

      results.push({ title, price, image_url, url: link, dealer_name: NAME });
    } catch (_) {}
  });
  return results;
}
module.exports = { search, name: NAME };
