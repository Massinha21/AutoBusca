const { search } = require('./api/_scrapers/facebook-marketplace');
const fs = require('fs');

(async () => {
  console.log('Testando a extração do Onix diretamente do módulo...');
  try {
    const items = await search('Onix');
    fs.writeFileSync('test_onix_output.json', JSON.stringify(items, null, 2));
    console.log('Resultados salvos em test_onix_output.json');
  } catch(e) {
    console.error(e);
  }
})();
