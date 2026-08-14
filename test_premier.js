const { getFipePrice } = require('./api/_scrapers/fipe-matcher');
async function run() {
  const res = await getFipePrice("chevrolet", "CHEVROLET ONIX 1.0 TURBO FLEX PREMIER AUTOMÁTICO", "", 2025);
  console.log("FIPE RESPONSE:", res);
}
run();
