const fs = require('fs');

let sw = fs.readFileSync('public/sw.js', 'utf8');

// Bump cache version
sw = sw.replace(/const CACHE_NAME = "autobusca-cache-v1";/, 'const CACHE_NAME = "autobusca-cache-v2";');

fs.writeFileSync('public/sw.js', sw);
console.log("Service Worker cache bumped to v2.");
