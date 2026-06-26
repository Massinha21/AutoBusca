// api/_scrapers/cristalveiculos.js
// Cristal Veículos — GET /veiculos.php (estoque completo, filtro local)
// Plataforma CarroBrasil

const cheerio = require("cheerio");
const NAME     = "Cristal Veículos";
const BASE_URL = "http://www.cristalveiculosrp.com.br";

async function search(query, fetchHtml) {
  const queryWords = query.toLowerCase().split(/\s+/);
const results = [];

  const MAX_PAGES = 5;
  let page = 1;
  let hasNext = true;

  while (page <= MAX_PAGES && hasNext) {
    let itemsFoundOnPage = 0;
    
  const html = await fetchHtml(`${BASE_URL}/veiculos.php?page=${page}`);
  const $    = cheerio.load(html);
  
  

  // Cada card de veículo está em um link de detalhe detalhe.php?id=...
  $("a[href^='detalhe.php?id=']").each((_, aEl) => {
    try {
      const a = $(aEl);
      let text = a.text().trim().replace(/\s+/g, " ");
      if (!text) {
        // Se for um link de imagem vazio, tenta pegar o texto do link irmão ou do container
        text = a.parent().text().trim().replace(/\s+/g, " ");
      }
      if (!text) return;

      // Filtra pela busca
      if (!queryWords.every(w => text.toLowerCase().includes(w))) return;

      // Link
      let link = a.attr("href");
      if (!link.startsWith("http")) link = `${BASE_URL}/${link.replace(/^\//, "")}`;

      // Imagem (pode estar dentro do link ou em tags irmãs)
      let image_url = null;
      const img = a.find("img").first();
      let src = img.length ? img.attr("src") : null;
      if (!src) {
        // Tenta achar imagem próxima no mesmo container
        const parent = a.parent();
        const siblingImg = parent.find("img").first();
        src = siblingImg.length ? siblingImg.attr("src") : null;
      }
      if (src) {
        // Trata URL do CarroBrasil: //www.carrobrasil.com.br/img-SF.php?img=https://...
        if (src.startsWith("//")) src = "https:" + src;
        const m = src.match(/img=(https:\/\/.*)/);
        image_url = m ? m[1] : src;
      }

      // Separa preço e título
      let price = "Sob consulta";
      const priceMatch = text.match(/R\$\s*[\d\.\,]+/i);
      if (priceMatch) {
        price = priceMatch[0];
      }
      
      // Limpa título tirando o preço e termos repetidos
      let title = text.replace(/R\$\s*[\d\.\,]+/gi, "").trim();
      title = title.replace(/\s+/g, " ");
      if (!title) title = "Veículo";

      // Evita duplicados (como temos links de imagem e texto separados para o mesmo carro)
      if (results.some(r => r.url === link)) return;

      
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
