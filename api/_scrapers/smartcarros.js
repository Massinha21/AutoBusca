const cheerio = require("cheerio");

const NAME     = "Smart Carros";
const BASE_URL = "https://smartcarrosribeirao.com.br";

async function search(query, fetchHtml) {
  const url = `${BASE_URL}/estoque?termo=${encodeURIComponent(query)}`;
  const html = await fetchHtml(url);
  const $    = cheerio.load(html);
  const queryWords = query.toLowerCase().split(/\s+/);
  const results = [];

  $("article.car-card").each((_, item) => {
    try {
      const el = $(item);

      // Link do anúncio
      const linkPath = el.find("a").first().attr("href");
      if (!linkPath) return;
      const link = linkPath.startsWith('http') ? linkPath : `${BASE_URL}${linkPath}`;

      // Imagem
      let image_url = el.find("figure img").attr("src");
      if (image_url && image_url.startsWith('/')) {
        image_url = `${BASE_URL}${image_url}`;
      }

      // Título
      let title = el.find("h3").first().text().trim();
      if (!title) {
         title = el.find(".card-content__title").text().trim();
      }
      if (!title) return;

      // Filtro de segurança: se for genérico ou não corresponder à busca
      if (title.toLowerCase() === "veículo") return;
      if (!queryWords.every(w => title.toLowerCase().includes(w))) return;

      // Preço
      let price = "Sob consulta";
      el.find("p").each((_, p) => {
         const text = $(p).text().trim();
         if (text.includes("R$")) {
            price = text;
         }
      });

      // Ano e KM extraídos da listagem de ícones e features
      let year = null;
      let km = null;

      el.find(".car-detail--icons li p").each((_, p) => {
          const text = $(p).text().trim();
          if (text.toLowerCase().includes('km')) {
              km = text;
          } else if (/^\d{4}$/.test(text) || /^\d{4}\/\d{4}$/.test(text)) {
              year = text;
          }
      });

      // Fallback para o ano, se não achar nos ícones
      if (!year) {
         const showGrid = el.find(".show-grid").text().trim();
         const m = showGrid.match(/20\d{2}/);
         if (m) year = m[0];
      }

      results.push({ title, price, image_url, url: link, dealer_name: NAME, year, km });
    } catch (_) {}
  });

  return results;
}

module.exports = { search, name: NAME };
