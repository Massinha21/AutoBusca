// api/parsers/amfveiculos.js
//
// Parser do site AMF Veículos (https://amfveiculos.com.br)
// Plataforma: WordPress + JetEngine listing grid
// Busca: GET /?s=<query>
// Seletores: .jet-listing-grid__item

const cheerio = require("cheerio");

const NAME     = "AMF Veículos";
const BASE_URL = "https://amfveiculos.com.br";

async function search(query, fetchHtml) {
  const url = `${BASE_URL}/?s=${encodeURIComponent(query)}`;
  const html = await fetchHtml(url);
  const $    = cheerio.load(html);
  const results = [];

  $(".jet-listing-grid__item").each((_, item) => {
    try {
      const el = $(item);

      // Link do anúncio
      let link = el.find("a.jet-engine-listing-overlay-link").attr("href")
        || el.find("div.jet-engine-listing-overlay-wrap").attr("data-url")
        || el.find("a[href]").first().attr("href");
      if (!link) return;

      // Imagem (lazy loading)
      const img = el.find("img").first();
      const image_url = img.attr("data-src") || img.attr("src") || null;

      // Título (termos dinâmicos do JetEngine)
      const terms = el.find("a.jet-listing-dynamic-terms__link")
        .map((_, t) => $(t).text().trim()).get().filter(Boolean);
      let title = terms.length
        ? terms.join(" ")
        : el.find("h2,h3,h4,h5").first().text().trim() || "Veículo";

      // Preço
      let price = "Sob consulta";
      el.find(".jet-listing-dynamic-field__content").each((_, f) => {
        const t = $(f).text().trim();
        if (t.includes("R$")) { price = t; return false; }
      });

      results.push({ title, price, image_url, url: link, dealer_name: NAME });
    } catch (_) {}
  });

  return results;
}

module.exports = { search, name: NAME };
