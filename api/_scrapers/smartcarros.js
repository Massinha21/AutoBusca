const cheerio = require("cheerio");

const NAME     = "Smart Carros";
const BASE_URL = "https://smartcarrosribeirao.com.br";

async function search(query, fetchHtml) {
  const MAX_PAGES = 5;
  let page = 1;
  let hasNext = true;

  while (page <= MAX_PAGES && hasNext) {
    const url = `${BASE_URL}/estoque?termo=${encodeURIComponent(query)}&page=${page}`;
    const html = await fetchHtml(url);
    const $    = cheerio.load(html);
    
    let initialLength = results.length;

    $("article.car-card").each((_, item) => {
      try {
        const el = $(item);

        const linkPath = el.find("a").first().attr("href");
        if (!linkPath) return;
        const link = linkPath.startsWith('http') ? linkPath : `${BASE_URL}${linkPath}`;

        let image_url = el.find("figure img").attr("src");
        if (image_url && image_url.startsWith('/')) {
          image_url = `${BASE_URL}${image_url}`;
        }

        let title = el.find("h3").first().text().trim();
        if (!title) {
           title = el.find(".card-content__title").text().trim();
        }
        if (!title) return;

        if (title.toLowerCase() === "veículo") return;
        if (!queryWords.every(w => title.toLowerCase().includes(w))) return;

        let price = "Sob consulta";
        el.find("p").each((_, p) => {
           const text = $(p).text().trim();
           if (text.includes("R$")) {
              price = text;
           }
        });

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

        if (!year) {
           const showGrid = el.find(".show-grid").text().trim();
           const m = showGrid.match(/20\d{2}/);
           if (m) year = m[0];
        }

        results.push({ title, price, image_url, url: link, dealer_name: NAME, year, km });
        itemsFoundOnPage++;
      } catch (_) {}
    });

    
    // Deduplicate results inside the loop to see if we actually added NEW cars
    const uniqueResults = [...new Map(results.map(v => [v.url, v])).values()];
    results.length = 0;
    results.push(...uniqueResults);

    if (results.length === initialLength) {
      hasNext = false;
    } else {
      page++;
    }
  }

  return results;
}

module.exports = { search, name: NAME };
