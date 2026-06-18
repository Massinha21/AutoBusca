// api/parsers/krveiculos.js
// KR Veículos — GET / (homepage com estoque) — filtro local por título

const cheerio = require("cheerio");
const NAME     = "KR Veículos";
const BASE_URL = "https://www.krveiculos.com.br";

async function search(query, fetchHtml) {
  const html = await fetchHtml(BASE_URL);
  const $ = cheerio.load(html);
  const queryWords = query.toLowerCase().split(/\s+/);
  const results = [];

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

      results.push({ title, price, image_url, url: link, dealer_name: NAME });
    } catch (_) {}
  });
  return results;
}
module.exports = { search, name: NAME };
