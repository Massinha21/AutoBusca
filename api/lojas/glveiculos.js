// api/parsers/glveiculos.js
// GL Veículos — GET /estoque?termo=<query> — seletores: .card-car

const cheerio = require("cheerio");
const NAME     = "GL Veículos";
const BASE_URL = "https://glveiculos.com.br";

async function search(query, fetchHtml) {
  const html = await fetchHtml(`${BASE_URL}/estoque?termo=${encodeURIComponent(query)}`);
  const $ = cheerio.load(html);
  const results = [];

  $(".card-car").each((_, card) => {
    try {
      const el = $(card);
      let link = el.find("a[href]").first().attr("href") || null;
      if (link && !link.startsWith("http")) link = `${BASE_URL}/${link.replace(/^\//, "")}`;
      if (!link) return;

      let image_url = el.find("img").first().attr("src") || null;
      if (image_url && !image_url.startsWith("http")) image_url = `${BASE_URL}/${image_url.replace(/^\//, "")}`;

      let title = el.find("p.fw-bold").text().trim()
        || el.find("h3.fw-normal").text().trim()
        || "Veículo";
      title = title.replace(/\s+/g, " ");

      let price = "Sob consulta";
      const priceText = el.find(".price").text().trim();
      const m = priceText.match(/R\$\s*[\d\.]+/);
      if (m) price = m[0];
      if (price === "R$ 0" || price === "R$ 0,00") price = "Sob consulta";

      results.push({ title, price, image_url, url: link, dealer_name: NAME });
    } catch (_) {}
  });
  return results;
}
module.exports = { search, name: NAME };
