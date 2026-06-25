const fs = require('fs');
let c = fs.readFileSync('api/_scrapers/facebook-marketplace.js', 'utf8');

c = c.split('\\\\b').join('\\b');
c = c.split('\\\\d').join('\\d');

fs.writeFileSync('api/_scrapers/facebook-marketplace.js', c);
console.log('Regex consertada!');
