const r1 = /\b(\d{1,3}(?:\.\d{3})+|\d+)\s*(?:km|kms|mil\s*km)\b/i;
const r2 = /\bkm[:\-\s]*(\d{1,3}(?:\.\d{3})+|\d+)\b/i;

console.log('45.000 km'.match(r1)[1]);
console.log('61500 km'.match(r1)[1]);
console.log('KM: 61500'.match(r2)[1]);
console.log('KM 120.000'.match(r2)[1]);
