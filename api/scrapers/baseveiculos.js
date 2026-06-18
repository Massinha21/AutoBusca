// api/parsers/baseveiculos.js
// Base Veículos — GET /veiculos.php — filtro local — seletores: .box-car

const cheerio = require("cheerio");
const NAME     = "Base Veículos";
const BASE_URL = "https://www.baseveiculos.com.br";

async function search(query, fetchHtml) {
  const html = await fetchHtml(`${BASE_URL}/veiculos.php`);
  const $ = cheerio.load(html);
  const queryWords = query.toLowerCase().split(/\s+/);
  const results = [];

  $(".box-car").each((_, card) => {
    try {
      const el = $(card);

      let link = el.find("a[href]").first().attr("href") || null;
      if (link && !link.startsWith("http")) link = `${BASE_URL}/${link.replace(/^\//, "")}`;
      if (!link) return;

      const h3      = el.find("h3").text().trim();
      const strong  = el.find("p strong").text().trim();
      let title = `${h3} ${strong}`.trim().replace(/\s+/g, " ") || "Veículo";
      if (!queryWords.every(w => title.toLowerCase().includes(w))) return;

      let image_url = el.find("img").first().attr("src") || null;
      if (image_url?.startsWith("//")) image_url = `https:${image_url}`;
      else if (image_url && !image_url.startsWith("http")) image_url = `${BASE_URL}/${image_url.replace(/^\//, "")}`;

      let price = "Sob consulta";
      const pText = el.find("p").text();
      const m = pText.match(/R\$\s*[\d\.,]+/);
      if (m) price = m[0];
      if (price === "R$ 0,00" || price === "R$ 0") price = "Sob consulta";

      results.push({ title, price, image_url, url: link, dealer_name: NAME });
    } catch (_) {}
  });
  return results;
}
module.exports = { search, name: NAME };
