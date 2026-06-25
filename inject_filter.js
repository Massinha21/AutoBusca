const fs = require('fs');
let c = fs.readFileSync('public/js/app.js', 'utf8');

const target = `  function applyFilters() {
    if (allCars.length === 0) return;
    const enriched = enrichCarsWithFipe(allCars);`;

const replacement = `  function applyFilters() {
    if (allCars.length === 0) return;
    
    let filtered = allCars;
    const qualitySelect = document.getElementById("quality-select");
    if (qualitySelect && qualitySelect.value === 'safe') {
      filtered = filtered.filter(c => c.quality_badge !== 'suspicious');
    }

    const enriched = enrichCarsWithFipe(filtered);`;

c = c.replace(target, replacement);
fs.writeFileSync('public/js/app.js', c);
console.log('Filtro aplicado com sucesso');
