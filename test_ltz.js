const { getFipePrice } = require('./api/_scrapers/fipe-matcher');
async function run() {
  const res = await getFipePrice("chevrolet", "ONIX HATCH LTZ 1.0 12V TB Flex 5p Aut.", "", 2024);
  console.log(res);
}
run();
