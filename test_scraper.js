const scraper = require('./api/_scrapers/facebook-marketplace');

(async () => {
  console.log("Iniciando busca de teste por 'onix' no Marketplace...");
  const resultados = await scraper.search("onix");
  console.log("Resultados encontrados:", resultados.length);
  if (resultados.length > 0) {
    console.log("Exemplo de item:", resultados[0]);
  }
})();
