const fs = require('fs');

// 1. UPDATE index.html
let html = fs.readFileSync('public/index.html', 'utf8');

const oldLogo = /<div class="logo-area">[\s\S]*?<\/div>/;
const newLogo = `<div class="logo-area">
        <img src="logo.png" alt="AutoBusca Logo" class="main-logo-img">
      </div>`;

html = html.replace(oldLogo, newLogo);
fs.writeFileSync('public/index.html', html);


// 2. UPDATE style.css
let css = fs.readFileSync('public/style.css', 'utf8');

// Adiciona o CSS da nova logo
if (!css.includes('.main-logo-img')) {
  css += `\n\n/* Nova Logo */\n.main-logo-img {\n  max-height: 45px;\n  width: auto;\n  object-fit: contain;\n}\n`;
  fs.writeFileSync('public/style.css', css);
}

console.log("Logo atualizada no código.");
