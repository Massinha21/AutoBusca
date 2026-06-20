const fs = require('fs');
const path = require('path');

const dir = 'api/_scrapers';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

const injectCode = `
      // --- Auto-Extraction of Year and KM ---
      let extYear = null;
      let extKm = null;
      try {
        const fullText = el.text().replace(/\\s+/g, " ");
        // Year: like 2019/2020 or 2019
        const yearMatch = fullText.match(/\\b(20\\d{2}|19\\d{2})(?:\\/[12]0\\d{2})?\\b/);
        if (yearMatch) extYear = yearMatch[0];
        
        // KM: like 45.000 km, 120 mil km, 45000km
        const kmMatch = fullText.match(/\\b(\\d{1,3}(?:\\.\\d{3})*)\\s*(?:km|kms|mil\\s*km)\\b/i);
        if (kmMatch) {
          let parsedKm = parseInt(kmMatch[1].replace(/\\./g, ""), 10);
          if (!isNaN(parsedKm)) extKm = new Intl.NumberFormat("pt-BR").format(parsedKm) + " km";
        }
      } catch (e) {}
`;

files.forEach(file => {
  const filePath = path.join(dir, file);
  let code = fs.readFileSync(filePath, 'utf8');

  // Verifica se já foi injetado
  if (code.includes('Auto-Extraction of Year and KM')) return;

  const rx = /results\.push\(\{([^}]*dealer_name:\s*NAME[^}]*)\}\);/;
  if (rx.test(code)) {
    code = code.replace(rx, (match, p1) => {
      // Pega o conteúdo de dentro do push e adiciona year e km
      const newInner = p1.trim() + ", year: extYear, km: extKm";
      return injectCode + "\n      results.push({ " + newInner + " });";
    });
    fs.writeFileSync(filePath, code);
    console.log("Injected into " + file);
  } else {
    console.log("Could not find results.push in " + file);
  }
});
