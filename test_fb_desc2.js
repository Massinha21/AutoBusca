const fs = require('fs');
const html = fs.readFileSync('test_ad.html', 'utf8');
const match = html.match(/<meta property="og:description" content="([^"]+)"/);
if (match) {
  console.log('Description extracted:', match[1]);
  console.log('Length:', match[1].length);
} else {
  console.log('Not found');
}
