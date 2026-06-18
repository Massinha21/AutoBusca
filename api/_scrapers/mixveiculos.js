// api/_scrapers/mixveiculos.js
// Mix Veículos — GET /index.php?route=product/search&search=<query>
// Plataforma OpenCart (Journal2 Theme)

const cheerio = require("cheerio");
const NAME     = "Mix Veículos";
const BASE_URL = "https://mixveiculosribeirao.com.br";

async function search(query, fetchHtml) {
  const url = `${BASE_URL}/index.php?route=product/search&search=${encodeURIComponent(query)}`;
  const html = await fetchHtml(url);
  const $    = cheerio.load(html);
  const results = [];

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

      // Imagem
      const img = el.find(".image img").first();
      let image_url = img.attr("src") || null;
      if (image_url && image_url.startsWith("//")) image_url = "https:" + image_url;

      // Preço
      let price = "Sob consulta";
      const priceText = el.find(".price").text().trim();
      const m = priceText.match(/R\$\s*[\d\.\,]+/i);
      if (m) price = m[0];
      if (price === "R$ 0" || price === "R$ 0,00") price = "Sob consulta";

      results.push({ title, price, image_url, url: link, dealer_name: NAME });
    } catch (_) {}
  });

  return results;
}

module.exports = { search, name: NAME };
