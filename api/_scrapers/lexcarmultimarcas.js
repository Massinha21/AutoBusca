// api/_scrapers/lexcarmultimarcas.js
// Lexcar Multimarcas — GET /estoque (com cookie bypass cookiescheck=ok)
// Plataforma Webmotors Integrador (Sitewebmotors)

const cheerio = require("cheerio");
const NAME     = "Lexcar Multimarcas";
const BASE_URL = "https://lexcarmultimarcas.com.br";

async function search(query, fetchHtml) {
  // Passamos o cookie no fetchHtml injetado. Como o fetchHtml padrão não recebe cookies adicionais por parâmetro,
  // nós implementamos nossa própria chamada HTTP ou decoramos a requisição se necessário.
  // IMPORTANTE: Para o scraper rodar no Vercel de forma limpa, podemos fazer um request fetch customizado com Cookie!
  const queryWords = query.toLowerCase().split(/\s+/);
  const results = [];

  try {
    // Busca customizada com headers e cookies
    const response = await fetch(`${BASE_URL}/estoque`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Cookie": "cookiescheck=ok"
      }
    });
    
    if (!response.ok) return [];
    const html = await response.text();
    const $    = cheerio.load(html);

    // Itera por cada link de veículo da Webmotors
    $("a[href^='/estoque/veiculo/']").each((_, aEl) => {
      try {
        const a = $(aEl);
        const img = a.find("img.img-responsive").first();
        if (!img.length) return;

        let title = img.attr("alt") || a.text().trim();
        title = title.replace(/\s+/g, " ").trim();
        if (!title) return;

        if (!queryWords.every(w => title.toLowerCase().includes(w))) return;

        let link = a.attr("href");
        if (!link.startsWith("http")) link = `${BASE_URL}/${link.replace(/^\//, "")}`;

        let image_url = img.attr("src") || null;
        if (image_url && image_url.startsWith("//")) image_url = "https:" + image_url;

        // O Webmotors costuma esconder o preço em divs irmãs. Vamos tentar achar o preço ao redor.
        let price = "Sob consulta";
        // Procura classes comuns do Webmotors como .car-price, .preco, .result-item-price
        const parent = a.closest("div");
        if (parent.length) {
          const priceText = parent.text();
          const priceMatch = priceText.match(/R\$\s*[\d\.\,]+/i);
          if (priceMatch) price = priceMatch[0];
        }

        if (results.some(r => r.url === link)) return;

        results.push({ title, price, image_url, url: link, dealer_name: NAME });
      } catch (_) {}
    });

  } catch (err) {
    console.error(`[${NAME}] Erro no fetch customizado:`, err.message);
  }

  return results;
}

module.exports = { search, name: NAME };
