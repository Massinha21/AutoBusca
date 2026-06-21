// api/parsers/zmveiculos.js
//
// Estoque interno da loja ZM Veículos.
// Estes carros são mockados conforme os do usuário e devem aparecer nos resultados.

const NAME = "ZM Veículos";

const ESTOQUE_LOCAL = [
  { title: "S10 2.4 MPFI EXECUTIVE 4X2 CD 8V FLEX 4P MANUAL", price: "R$ 67.900,00" },
  { title: "SPIN 1.8 PREMIER 8V FLEX 4P AUTOMÁTICO", price: "R$ 79.900,00" },
  { title: "PALIO 1.0 MPI FIRE 8V FLEX 4P MANUAL", price: "R$ 22.900,00" },
  { title: "TORO 2.4 16V MULTIAIR FLEX VOLCANO AT9", price: "R$ 98.900,00" },
  { title: "FIESTA 1.6 MPI HATCH 8V FLEX 4P MANUAL", price: "R$ 31.900,00" },
  { title: "CIVIC 2.0 LXR 16V FLEX 4P AUTOMÁTICO", price: "R$ 75.900,00" },
  { title: "HR-V 1.8 16V FLEX EX 4P AUTOMÁTICO", price: "R$ 84.900,00" },
  { title: "HB20 1.0 COMFORT PLUS 12V FLEX 4P MANUAL", price: "R$ 43.900,00" },
  { title: "GLA 200 1.6 CGI ADVANCE 16V TURBO FLEX 4P AUTOMÁTICO", price: "R$ 98.900,00" },
  { title: "COOPER 1.5 12V TURBO GASOLINA 4P AUTOMÁTICO", price: "R$ 85.900,00" },
  { title: "LOGAN 1.6 EXPRESSION 16V FLEX 4P AUTOMÁTICO", price: "R$ 28.900,00" },
  { title: "TIGUAN 2.0 350 TSI GASOLINA ALLSPACE R-LINE 4MOTION DSG", price: "R$ 148.900,00" }
];

async function search(query, fetchHtml) {
  const queryWords = query.toLowerCase().split(/\s+/);
  const results = [];

  ESTOQUE_LOCAL.forEach(car => {
    // Filtro do termo de busca
    if (queryWords.every(w => car.title.toLowerCase().includes(w))) {
      
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

      results.push({ title: car.title,
        price: car.price,
        image_url: null, // Sem imagem disponível
        url: "https://www.zmveiculos.com.br",
        dealer_name: NAME, year: extYear, km: extKm });
    }
  });

  return results;
}

module.exports = { search, name: NAME };
