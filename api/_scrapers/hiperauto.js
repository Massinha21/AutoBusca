// api/_scrapers/hiperauto.js
// Hiper Auto — GET /estoque?nome=<query>
// Plataforma Autoconf

const cheerio = require("cheerio");
const NAME     = "Hiper Auto";
const BASE_URL = "https://hiperauto.com.br";

async function search(query, fetchHtml) {
  const html = await fetchHtml(`${BASE_URL}/estoque?nome=${encodeURIComponent(query)}`);
  const $    = cheerio.load(html);
  const results = [];

  $(".card-car").each((_, card) => {
    try {
      const el = $(card);
      
      const a = el.find("a[href*='/carros/']").first();
      if (!a.length) return;

      let link = a.attr("href");
      if (link && !link.startsWith("http")) link = `${BASE_URL}/${link.replace(/^\//, "")}`;
      if (!link) return;

      let title = a.attr("title") || el.find(".car-description h2, .car-description h3").first().text();
      title = title.replace(/\s+/g, " ").trim();
      if (!title) title = "Veículo";

      const img = el.find(".card-header img").first();
      let image_url = img.attr("srcset") || img.attr("src") || null;
      if (image_url) {
        if (image_url.includes(",")) {
          image_url = image_url.split(",")[0].trim().split(" ")[0];
        }
        if (!image_url.startsWith("http")) image_url = `${BASE_URL}/${image_url.replace(/^\//, "")}`;
      }

      let price = "Sob consulta";
      const priceText = el.find(".card-footer, .card-price").text().trim();
      const m = priceText.match(/R\$\s*[\d\.\,]+/i);
      if (m) price = m[0];
      if (price === "R$ 0" || price === "R$ 0,00") price = "Sob consulta";

      results.push({ title, price, image_url, url: link, dealer_name: NAME });
    } catch (_) {}
  });

  return results;
}

module.exports = { search, name: NAME };
