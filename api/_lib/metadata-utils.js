// api/lib/metadata-utils.js
//
// Utilitários para extrair metadados (ano, quilometragem) do título do veículo.

/**
 * Extrai o ano e a quilometragem (KM) de uma string de título de anúncio,
 * retornando os metadados extraídos e uma versão limpa do título.
 *
 * @param {string} title - Título original do anúncio
 * @returns {{ title: string, year: string|null, km: string|null }}
 */
function extractMetadataFromTitle(title) {
  if (!title || typeof title !== "string") {
    return { title: "", year: null, km: null };
  }

  let cleanTitle = title;
  let year = null;
  let km = null;

  // 1. Extrai o ano (ex: 2019/2020, 2019-2020, 2019/20, 2019)
  const yearRegex = /\b(19\d\d|20\d\d)(?:[/-]\d{2,4})?\b/;
  const yearMatch = cleanTitle.match(yearRegex);
  if (yearMatch) {
    year = yearMatch[0];
    cleanTitle = cleanTitle.replace(yearMatch[0], "");
  }

  // 2. Extrai a quilometragem (KM) (ex: 45.000 KM, 45000km, 120 mil km)
  const kmRegex = /\b(\d+(?:\.\d{3})*)\s*(?:km|kms|mil\s*km)\b/i;
  const kmMatch = cleanTitle.match(kmRegex);
  if (kmMatch) {
    const rawNum = kmMatch[1].replace(/\./g, "");
    const parsedKm = parseInt(rawNum, 10);
    if (!isNaN(parsedKm)) {
      km = new Intl.NumberFormat("pt-BR").format(parsedKm) + " km";
    } else {
      km = kmMatch[0].trim();
    }
    cleanTitle = cleanTitle.replace(kmMatch[0], "");
  }

  // 3. Limpeza do título residual (remove hífens, barras, espaços duplos)
  cleanTitle = cleanTitle
    .replace(/\s*[-–—/,\s|]+\s*$/g, "") // remove separadores no final
    .replace(/^\s*[-–—/,\s|]+\s*/g, "") // remove separadores no início
    .replace(/\s*[-–—/|,\s]{2,}\s*/g, " - ") // normaliza separadores duplos no meio
    .replace(/\s+/g, " ") // normaliza espaços múltiplos
    .trim();

  // Se o título ficar vazio após a limpeza, restaura o original
  if (!cleanTitle || /^[-–—/,\s|]+$/.test(cleanTitle)) {
    cleanTitle = title;
  }

  return { title: cleanTitle, year, km };
}

module.exports = { extractMetadataFromTitle };
