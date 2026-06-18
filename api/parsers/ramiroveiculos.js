// api/parsers/ramiroveiculos.js
//
// Parser do site Ramiro Veículos (https://www.ramiroveiculos.com)
// Busca: GET /estoque?veiculo=<query>
// Seletores: .card-destaque ou .destaque
// Imagem: background-image inline em .destaque-imagem

const cheerio = require("cheerio");

const NAME     = "Ramiro Veículos";
const BASE_URL = "https://www.ramiroveiculos.com";

async function search(query, fetchHtml) {
  const url = `${BASE_URL}/estoque?veiculo=${encodeURIComponent(query)}`;
  const html = await fetchHtml(url);
  const $    = cheerio.load(html);
  const results = [];

  const cards = $(".card-destaque").length ? $(".card-destaque") : $(".destaque");

  cards.each((_, card) => {
    try {
      const el = $(card);

      // Link (prioriza href com "veiculo" no caminho)
      let link = null;
      el.find("a[href]").each((_, a) => {
        const href = $(a).attr("href");
        if (href && href.includes("veiculo")) { link = href; return false; }
      });
      if (!link) link = el.find("a[href]").first().attr("href") || null;
      if (link && !link.startsWith("http")) link = `${BASE_URL}/${link.replace(/^\//, "")}`;
      if (!link) return;

      // Imagem — background-image inline em .destaque-imagem
      let image_url = null;
      const style = el.find(".destaque-imagem").attr("style") || "";
      const bgMatch = style.match(/url\(['"]?(.*?)['"]?\)/);
      if (bgMatch) {
        image_url = bgMatch[1];
        if (!image_url.startsWith("http")) image_url = `${BASE_URL}/${image_url.replace(/^\//, "")}`;
      }
      if (!image_url) {
        image_url = el.find("img").first().attr("src") || null;
        if (image_url && !image_url.startsWith("http")) image_url = `${BASE_URL}/${image_url.replace(/^\//, "")}`;
      }

      // Preço
      let price = el.find(".valor-destacadado").text().trim() || null;
      if (!price) {
        el.find("*").each((_, node) => {
          const txt = $(node).text().trim();
          if (txt.includes("R$") && txt.length < 25) { price = txt; return false; }
        });
      }
      if (!price) price = "Sob consulta";

      // Título
      let title = "";
      const titleDiv = el.find(".titulo-sub-destaque");
      if (titleDiv.length) {
        title = titleDiv.find("p").map((_, p) => $(p).text().trim()).get().filter(Boolean).join(" ");
      }
      if (!title) {
        const m = (link || "").match(/\/veiculo\/([^/]+)/);
        title = m ? m[1].replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "Veículo";
      }

      results.push({ title, price, image_url, url: link, dealer_name: NAME });
    } catch (_) {}
  });

  return results;
}

module.exports = { search, name: NAME };
