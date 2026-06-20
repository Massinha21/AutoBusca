// api/_scrapers/kitoveiculos.js
// Kito Veículos — GET /estoque/ (lista completa, filtro local)
// Plataforma WordPress + Elementor (Custom Post Type .carrosnovo)

const cheerio = require("cheerio");
const NAME     = "Kito Veículos";
const BASE_URL = "https://kitoveiculos.com.br";

async function search(query, fetchHtml) {
  const html = await fetchHtml(`${BASE_URL}/estoque/`);
  const $    = cheerio.load(html);
  const queryWords = query.toLowerCase().split(/\s+/);
  const results = [];

  // Cada veículo é um artigo/loop do WordPress com as classes do Elementor
  $(".carrosnovo, .type-carrosnovo, .e-loop-item").each((_, item) => {
    try {
      const el = $(item);

      // Apenas processa se for um card de carro (ignora ícones sociais)
      const a = el.find("a[href*='/carrosnovo/'], a[href*='/veiculos/'], a[href*='/estoque/']").first();
      if (!a.length) return;

      let link = a.attr("href");
      if (link && !link.startsWith("http")) link = `${BASE_URL}/${link.replace(/^\//, "")}`;
      if (!link) return;

      // O título pode estar em um heading do elementor ou no link
      let title = el.find("h1, h2, h3, .elementor-heading-title").first().text();
      if (!title) title = a.text();
      title = title.replace(/\s+/g, " ").trim();
      if (!title || title.toLowerCase() === "veículo") return;

      if (!queryWords.every(w => title.toLowerCase().includes(w))) return;

      // Imagem
      const img = el.find("img").first();
      let image_url = img.attr("src") || null;
      if (image_url && image_url.startsWith("//")) image_url = "https:" + image_url;

      // Preço
      let price = "Sob consulta";
      const priceText = el.text();
      const m = priceText.match(/R\$\s*[\d\.\,]+/i);
      if (m) price = m[0];
      if (price === "R$ 0" || price === "R$ 0,00") price = "Sob consulta";

      // Evita duplicados
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
        const kmMatch = fullText.match(/\b(\d{1,3}(?:\.\d{3})*)\s*(?:km|kms|mil\s*km)\b/i);
        if (kmMatch) {
          let parsedKm = parseInt(kmMatch[1].replace(/\./g, ""), 10);
          if (!isNaN(parsedKm)) extKm = new Intl.NumberFormat("pt-BR").format(parsedKm) + " km";
        }
      } catch (e) {}

      results.push({ title, price, image_url, url: link, dealer_name: NAME, year: extYear, km: extKm });
    } catch (_) {}
  });

  return results;
}

module.exports = { search, name: NAME };
