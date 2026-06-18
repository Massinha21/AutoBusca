// api/_scrapers/tcamotors.js
// TCA Motors — GET /estoque (lista completa, filtro local)
// Plataforma Exibição
//
// CORREÇÃO: iteramos por li.li-desc-estoque e pegamos o parent("ul") de cada um.
// O seletor anterior $("ul") capturava ul ancestrais que englobavam TODOS os
// anúncios de uma vez, causando título concatenado e preços duplicados.

const cheerio = require("cheerio");
const NAME     = "TCA Motors";
const BASE_URL = "https://tcamotors.com.br";

async function search(query, fetchHtml) {
  const html = await fetchHtml(`${BASE_URL}/estoque`);
  const $    = cheerio.load(html);
  const queryWords = query.toLowerCase().split(/\s+/);
  const results = [];

  // Cada li.li-desc-estoque corresponde a UM anúncio; pegamos seu ul pai direto.
  $("li.li-desc-estoque").each((_, descLiEl) => {
    try {
      const descLi = $(descLiEl);
      const parentUl = descLi.parent("ul");
      if (!parentUl.length) return;

      // Título do anúncio
      const title = descLi.find("span.tx-titulo-estoque").first()
        .text().trim().replace(/\s+/g, " ");
      if (!title || title.toLowerCase() === "veículo") return;
      if (!queryWords.every(w => title.toLowerCase().includes(w))) return;

      // Link — procura no ul pai; o href deve conter "exibicao"
      let link = parentUl.find("a[href]").first().attr("href") || null;
      if (!link || !link.includes("exibicao")) return;
      if (!link.startsWith("http")) link = `${BASE_URL}/${link.replace(/^\//, "")}`;

      // Imagem — está na li.li-foto-estoque irmã, no mesmo ul pai
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

      // Preço — apenas o PRIMEIRO span.tx-preco dentro do descLi
      let price = descLi.find("span.tx-preco").first().text().trim() || "Sob consulta";
      const clean = price.replace(/R\$|\s|\,00|\.00/g, "");
      if (!clean || clean === "0") price = "Sob consulta";

      results.push({ title, price, image_url, url: link, dealer_name: NAME });
    } catch (_) {}
  });

  return results;
}

module.exports = { search, name: NAME };
