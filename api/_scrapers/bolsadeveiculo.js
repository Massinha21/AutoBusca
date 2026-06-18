// api/_scrapers/bolsadeveiculo.js
// Bolsa de Veículo — GET /estoque (lista completa, filtro local)
// Plataforma Exibição — idêntico ao Auto Prime RP e Savinho Motors

const cheerio = require("cheerio");
const NAME     = "Bolsa de Veículo";
const BASE_URL = "https://www.bolsadeveiculo.com.br";

async function search(query, fetchHtml) {
  const html = await fetchHtml(`${BASE_URL}/estoque`);
  const $    = cheerio.load(html);
  const queryWords = query.toLowerCase().split(/\s+/);
  const results = [];

  $("li.li-desc-estoque").each((_, descLiEl) => {
    try {
      const descLi = $(descLiEl);
      const parentUl = descLi.parent("ul");
      if (!parentUl.length) return;

      const title = descLi.find("span.tx-titulo-estoque").first()
        .text().trim().replace(/\s+/g, " ");
      if (!title || title.toLowerCase() === "veículo") return;
      if (!queryWords.every(w => title.toLowerCase().includes(w))) return;

      let link = parentUl.find("a[href]").first().attr("href") || null;
      if (!link || !link.includes("exibicao")) return;
      if (!link.startsWith("http")) link = `${BASE_URL}/${link.replace(/^\//, "")}`;

      let image_url = null;
      const fotoLi = parentUl.find("li.li-foto-estoque");
      if (fotoLi.length) {
        const style = fotoLi.attr("style") || "";
        const bgm   = style.match(/url\(['"']?(.*?)['"']?\)/);
        if (bgm) {
          image_url = bgm[1];
          if (!image_url.startsWith("http"))
            image_url = `${BASE_URL}/${image_url.replace(/^\//, "")}`;
        }
      }

      let price = descLi.find("span.tx-preco").first().text().trim() || "Sob consulta";
      const clean = price.replace(/R\$|\s|\,00|\.00/g, "");
      if (!clean || clean === "0") price = "Sob consulta";

      results.push({ title, price, image_url, url: link, dealer_name: NAME });
    } catch (_) {}
  });

  return results;
}

module.exports = { search, name: NAME };
