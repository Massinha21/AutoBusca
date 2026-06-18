// api/buscar-carros.js — versão de diagnóstico
// Verifica se cheerio e todos os parsers carregam corretamente

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const errors = [];
  const loaded = [];

  // Testa cheerio
  try {
    require("cheerio");
    loaded.push("cheerio OK");
  } catch (e) {
    errors.push("cheerio: " + e.message);
  }

  // Testa price-utils
  try {
    require("./lib/price-utils");
    loaded.push("price-utils OK");
  } catch (e) {
    errors.push("price-utils: " + e.message);
  }

  // Testa cada parser individualmente
  const parserNames = [
    "zmveiculos", "amfveiculos", "savinhomotors", "ramiroveiculos",
    "glveiculos", "autoprimerp", "krveiculos", "baseveiculos",
    "mmveiculos", "valvechveiculos", "copaveiculos", "automaisveiculos",
    "rossiveiculos", "seminovosribeirao", "tcamotors", "holfautos"
  ];

  for (const name of parserNames) {
    try {
      require("./parsers/" + name);
      loaded.push(name + " OK");
    } catch (e) {
      errors.push(name + ": " + e.message);
    }
  }

  return res.status(200).json({ loaded, errors });
};
