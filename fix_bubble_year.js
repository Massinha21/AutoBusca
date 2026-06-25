const fs = require('fs');

let appJs = fs.readFileSync('public/js/app.js', 'utf8');

// 1. Fix updateBubble logic
const oldBubbleLogic = /function updateBubble\(inputEl, bubbleEl, isCurrency\) \{[\s\S]*?bubbleEl\.textContent = isCurrency[\s\S]*?\: val\.toLocaleString\("pt-BR"\) \+ " km";\s*\}\s*\}/;

const newBubbleLogic = `function updateBubble(inputEl, bubbleEl, isCurrency) {
    if (!bubbleEl || !inputEl) return;
    const val = Number(inputEl.value) || 0;
    const min = Number(inputEl.min) || 0;
    const max = Number(inputEl.max) || 1;
    let percent = (val - min) / (max - min);
    if (isNaN(percent)) percent = 1;
    percent = Math.max(0, Math.min(1, percent));
    
    // Calcula o offset exato considerando o tamanho da bolinha (16px aproximado)
    bubbleEl.style.left = \`calc(\${percent * 100}% + (\${8 - percent * 16}px))\`;
    
    if (val === max) {
      bubbleEl.textContent = "Qualquer";
    } else {
      bubbleEl.textContent = isCurrency 
        ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(val)
        : val.toLocaleString("pt-BR") + " km";
    }
  }`;

appJs = appJs.replace(oldBubbleLogic, newBubbleLogic);


// 2. Fix Year Options (populateFiltersData)
const oldYearLogic = /\/\/ 2\. Popula Anos[\s\S]*?filterYearMin\.appendChild\(option\);\s*\}\);/;

const newYearLogic = `// 2. Popula Anos de forma sequencial do mais novo até 2000
    const currentYear = new Date().getFullYear();
    const allYears = [];
    for (let y = currentYear + 1; y >= 2000; y--) {
      allYears.push(y);
    }
    
    const currentSelectedYear = filterYearMin.value;
    filterYearMin.innerHTML = '<option value="all">Qualquer ano</option>';
    
    allYears.forEach(y => {
      const option = document.createElement("option");
      option.value = y;
      option.textContent = y;
      if (currentSelectedYear === y.toString()) {
        option.selected = true;
      }
      filterYearMin.appendChild(option);
    });`;

appJs = appJs.replace(oldYearLogic, newYearLogic);

fs.writeFileSync('public/js/app.js', appJs);
console.log("Bug do balãozinho e select de ano corrigidos.");
