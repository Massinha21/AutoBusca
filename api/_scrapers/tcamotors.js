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
  const queryWords = query.toLowerCase().split(/\s+/);
const results = [];

  const MAX_PAGES = 5;
  let page = 1;
  let hasNext = true;

  while (page <= MAX_PAGES && hasNext) {
    let itemsFoundOnPage = 0;
    
  const html = await fetchHtml(`${BASE_URL}/estoque?page=${page}`);
  const $    = cheerio.load(html);
  
  

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

      
      // --- Auto-Extraction of Year and KM ---
      let extYear = null;
      let extKm = null;
      try {
        const fullText = el.text().replace(/\s+/g, " ");
        // Year: like 2019/2020 or 2019
        const yearMatch = fullText.match(/\b(20\d{2}|19\d{2})(?:\/[12]0\d{2})?\b/);
        if (yearMatch) extYear = yearMatch[0];
        
        // KM: like 45.000 km, 120 mil km, 45000km
        let kmMatch = fullText.match(/\bkm[:\-\s]*(\d{1,3}(?:\.\d{3})+|\d+)\b/i);
        if (!kmMatch) kmMatch = fullText.match(/\b(\d{1,3}(?:\.\d{3})+|\d+)\s*(?:km|kms|mil\s*km)\b/i);
        if (kmMatch) {
          let parsedKm = parseInt(kmMatch[1].replace(/\./g, ""), 10);
          if (extYear && parsedKm === parseInt(extYear)) kmMatch = null;
          if (kmMatch && !isNaN(parsedKm)) extKm = new Intl.NumberFormat("pt-BR").format(parsedKm) + " km";
        }
      } catch (e) {}

      itemsFoundOnPage++;
      results.push({ title, price, image_url, url: link, dealer_name: NAME, year: extYear, km: extKm });
    } catch (_) {}
  });

  
    
    if (itemsFoundOnPage === 0) {
      hasNext = false;
    } else {
      page++;
    }
  }
return results;
}

module.exports = { search, name: NAME };
