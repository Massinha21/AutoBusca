// api/parsers/zmveiculos.js
// Scraper real para a ZM Veículos.

const cheerio = require("cheerio");

const NAME = "ZM Veículos";
const BASE_URL = "https://zmveiculos.com.br";

async function search(query, fetchHtml) {
  try {
    const results = [];
    const queryWords = query.toLowerCase().split(/\s+/);
    const MAX_PAGES = 5;
    let page = 1;
    let hasNext = true;

    while (page <= MAX_PAGES && hasNext) {
      const url = `${BASE_URL}/estoque?page=${page}`;
      const html = await fetchHtml(url);
      const $ = cheerio.load(html);
      let itemsFoundOnPage = 0;

      $('td').each((i, el) => {
        const htmlText = $(el).html() || "";
        if (htmlText.includes('R$') && htmlText.includes('Valor:')) {
          const carContainer = $(el).closest('table');
          if (carContainer.length > 0) {
             const titleEl = carContainer.find('.texto14_azul_negrito, .texto14_preto_negrito, .texto16_preto_negrito').first();
             const title = titleEl.text().trim();
             if (!title) return;

             // Filtro do termo de busca no título
             if (!queryWords.every(w => title.toLowerCase().includes(w))) {
               return;
             }

             const priceMatch = carContainer.text().match(/R\$\s*[\d\.]+,00/);
             
             // Extraindo URL do atributo onclick
             let link = null;
             const tdWithClick = carContainer.find('td[onclick*="document.location.href"]');
             if (tdWithClick.length > 0) {
               const onclick = tdWithClick.attr('onclick');
               const urlMatch = onclick.match(/href='([^']+)'/);
               if (urlMatch) {
                 link = urlMatch[1];
               }
             }
             
             // Extraindo imagem
             let img = carContainer.find('img').attr('src');
             if (img && !img.startsWith('http')) {
                img = `${BASE_URL}${img}`;
             }
             
             // Extraindo Ano e KM
             let extYear = null;
             let extKm = null;
             const textBlue = carContainer.find('.texto12_azul_normal').text();
             const yearMatch = textBlue.match(/\b(20\d{2}|19\d{2})(?:\/[12]0\d{2})?\b/);
             if (yearMatch) extYear = yearMatch[0];

             // km extraction by reading the entire html text block
             try {
               const fullText = carContainer.text().replace(/\s+/g, " ");
               let kmMatch = fullText.match(/\bkm[:\-\s]*(\d{1,3}(?:\.\d{3})+|\d+)\b/i);
          if (!kmMatch) kmMatch = fullText.match(/\b(\d{1,3}(?:\.\d{3})+|\d+)\s*(?:km|kms|mil\s*km)\b/i);
          if (kmMatch) {
            let parsedKm = parseInt(kmMatch[1].replace(/\./g, ""), 10);
            if (extYear && parsedKm === parseInt(extYear)) kmMatch = null;
            if (kmMatch && !isNaN(parsedKm)) extKm = new Intl.NumberFormat("pt-BR").format(parsedKm) + " km";
          }
             } catch (e) {}

             if(title && priceMatch) {
               results.push({
                 title,
                 price: priceMatch[0],
                 url: link ? `${BASE_URL}${link}` : BASE_URL,
                 image_url: img || null,
                 dealer_name: NAME,
                 year: extYear,
                 km: extKm
               });
               itemsFoundOnPage++;
             }
          }
        }
      });

      if (itemsFoundOnPage === 0) {
        hasNext = false;
      } else {
        page++;
      }
    }

    // Remove duplicados pelo URL
    const uniqueResults = [...new Map(results.map(v => [v.url, v])).values()];

    return uniqueResults;
  } catch (err) {
    console.error(`[${NAME}] Erro ao buscar carros:`, err.message);
    return []; // Retorna array vazio em caso de erro para não quebrar o Promise.all
  }
}

module.exports = { search, name: NAME };
