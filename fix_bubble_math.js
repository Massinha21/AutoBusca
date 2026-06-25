const fs = require('fs');

let appJs = fs.readFileSync('public/js/app.js', 'utf8');

const oldBubbleLogic = /function updateBubble\(inputEl, bubbleEl, isCurrency\) \{[\s\S]*?bubbleEl\.textContent = isCurrency[\s\S]*?\: val\.toLocaleString\("pt-BR"\) \+ " km";\s*\}\s*\}/;

const newBubbleLogic = `function updateBubble(inputEl, bubbleEl, isCurrency) {
    if (!bubbleEl || !inputEl) return;
    const val = Number(inputEl.value) || 0;
    const min = Number(inputEl.min) || 0;
    const max = Number(inputEl.max) || 1;
    let percent = (val - min) / (max - min);
    if (isNaN(percent)) percent = 1;
    percent = Math.max(0, Math.min(1, percent));
    
    bubbleEl.style.left = (percent * 100) + "%";
    bubbleEl.style.marginLeft = (8 - percent * 16) + "px";
    
    if (val === max) {
      bubbleEl.textContent = "Qualquer";
    } else {
      bubbleEl.textContent = isCurrency 
        ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(val)
        : val.toLocaleString("pt-BR") + (isCurrency ? "" : " km");
    }
  }`;

appJs = appJs.replace(oldBubbleLogic, newBubbleLogic);
fs.writeFileSync('public/js/app.js', appJs);

console.log("Bug do balãozinho mitigado com marginLeft.");
