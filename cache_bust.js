const fs = require('fs');

let html = fs.readFileSync('public/index.html', 'utf8');

// Generate a random version number
const v = Date.now();

// Replace css links
html = html.replace(/href="style\.css(\?v=\d+)?"/, `href="style.css?v=${v}"`);
html = html.replace(/href="fipe\.css(\?v=\d+)?"/, `href="fipe.css?v=${v}"`);

// Replace js scripts
html = html.replace(/src="js\/storage\.js(\?v=\d+)?"/, `src="js/storage.js?v=${v}"`);
html = html.replace(/src="js\/ui\.js(\?v=\d+)?"/, `src="js/ui.js?v=${v}"`);
html = html.replace(/src="js\/api\.js(\?v=\d+)?"/, `src="js/api.js?v=${v}"`);
html = html.replace(/src="js\/app\.js(\?v=\d+)?"/, `src="js/app.js?v=${v}"`);

fs.writeFileSync('public/index.html', html);
console.log("Cache bust version added:", v);
