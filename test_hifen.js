const { getFipePrice } = require('./api/_scrapers/fipe-matcher');
async function run() {
  const res = await getFipePrice("chevrolet", "CHEVROLET - ONIX 1.4 MPFI LTZ 8V FLEX 4P AUTOMÁTICO", "", 2019);
  console.log("FIPE RESPONSE:", res);
}
run();
