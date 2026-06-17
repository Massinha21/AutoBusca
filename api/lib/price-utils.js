// api/lib/price-utils.js
//
// Utilitários para normalizar preços vindos de diferentes sites de revenda.
// Cada site pode formatar o preço de forma diferente. Exemplos reais:
//   "R$ 45.000"        → 45000
//   "R$45.000,00"      → 45000
//   "45000"            → 45000
//   "Sob consulta"     → null
//   "A combinar"       → null
//
// Estas funções são reutilizadas tanto no back-end (api/) quanto servem de
// referência para a lógica de ordenação no front-end (public/js/app.js).

/**
 * Converte uma string de preço para número (float).
 * Retorna null se o preço não for identificável (ex: "Sob consulta").
 *
 * @param {string} priceStr - Preço bruto extraído do site
 * @returns {number|null}
 */
function parsePrice(priceStr) {
  if (!priceStr || typeof priceStr !== "string") return null;

  const lower = priceStr.toLowerCase().trim();

  // Preços que não são numéricos — tratamos como "sem preço definido"
  const noPrice = ["sob consulta", "consulte", "a combinar", "combinar", "solicite", "0"];
  if (noPrice.some((term) => lower.includes(term))) return null;

  // Remove "R$", espaços, pontos de milhar e converte vírgula decimal → ponto
  // Exemplo: "R$ 45.900,50" → "45900.50"
  let clean = priceStr
    .replace(/R\$\s*/gi, "")   // remove "R$" e espaço após
    .replace(/\./g, "")         // remove pontos de milhar
    .replace(",", ".")          // vírgula decimal → ponto
    .replace(/[^\d.]/g, "")    // remove qualquer outro caractere não numérico
    .trim();

  const value = parseFloat(clean);
  return isNaN(value) || value === 0 ? null : value;
}

/**
 * Formata um número para string de preço em BRL.
 * Exemplo: 45900 → "R$ 45.900"
 *
 * @param {number|null} value
 * @returns {string}
 */
function formatPrice(value) {
  if (value === null || value === undefined) return "Sob consulta";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Normaliza o preço de um carro: faz o parse e retorna o preço padronizado.
 * Se não conseguir parsear, mantém o texto original.
 *
 * @param {string} rawPrice - Preço bruto extraído do site
 * @returns {{ display: string, value: number|null }}
 */
function normalizePrice(rawPrice) {
  const value = parsePrice(rawPrice);
  return {
    display: value !== null ? formatPrice(value) : rawPrice || "Sob consulta",
    value,
  };
}

module.exports = { parsePrice, formatPrice, normalizePrice };
