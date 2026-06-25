const fs = require('fs');
let appJs = fs.readFileSync('public/js/app.js', 'utf8');

// Replace handlePriceFilterChange entirely
const oldPriceFuncRegex = /function handlePriceFilterChange\(\) \{[\s\S]*?\}\s*\}\s*function handleKmFilterChange\(\) \{[\s\S]*?\}\s*\}/;

const newFunctions = `function handlePriceFilterChange() {
    const val = parseInt(filterPriceRange.value);
    const maxVal = parseInt(filterPriceRange.max);
    if (val === maxVal) {
      priceFilterValue.textContent = "Qualquer valor";
    } else {
      priceFilterValue.textContent = \`Até \${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(val)}\`;
    }
    updateBubble(filterPriceRange, document.getElementById('price-bubble'), true);
  }

  function handleKmFilterChange() {
    const val = parseInt(filterKmRange.value);
    const maxVal = parseInt(filterKmRange.max);
    if (val === maxVal) {
      kmFilterValue.textContent = "Qualquer KM";
    } else {
      kmFilterValue.textContent = \`Até \${val.toLocaleString("pt-BR")} km\`;
    }
    updateBubble(filterKmRange, document.getElementById('km-bubble'), false);
  }`;

appJs = appJs.replace(oldPriceFuncRegex, newFunctions);

// Add initial bubble updates in initFilters if missing
if (!appJs.includes("updateBubble(filterPriceRange, document.getElementById('price-bubble'), true);")) {
    // wait, it is inside handlePriceFilterChange now.
    // I want to call it on init.
}
// Let's just append to the end of initFilters
appJs = appJs.replace(
  /if \(btnClearFilters\) \{\s*btnClearFilters\.addEventListener\("click", resetFilters\);\s*\}\s*\}/,
  `if (btnClearFilters) {
      btnClearFilters.addEventListener("click", resetFilters);
    }
    
    // Initial bubble positioning
    if (filterPriceRange) updateBubble(filterPriceRange, document.getElementById('price-bubble'), true);
    if (filterKmRange) updateBubble(filterKmRange, document.getElementById('km-bubble'), false);
  }`
);

fs.writeFileSync('public/js/app.js', appJs);
console.log("Bug do balãozinho (if max) corrigido.");
