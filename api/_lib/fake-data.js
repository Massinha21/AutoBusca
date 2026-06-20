// api/lib/fake-data.js
//
// Dados falsos usados na Fase 1 para validar o visual e a estrutura do front-end
// antes de implementar o scraping real na Fase 2.
//
// Formato de cada item (será o mesmo nas fases futuras com dados reais):
// {
//   title:       string  — nome/modelo do carro
//   price:       string  — preço formatado (ex: "R$ 45.900")
//   image_url:   string  — URL de uma imagem pública
//   url:         string  — link do anúncio original
//   dealer_name: string  — nome da loja de revenda
// }

const FAKE_CARS = [
  {
    title: "Hyundai HB20 Sense 1.0 2023",
    price: "R$ 72.900",
    image_url: "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=600&q=80",
    url: "https://amfveiculos.com.br/veiculo/hb20-sense-2023",
    dealer_name: "AMF Veículos",
  },
  {
    title: "Hyundai HB20 Vision 1.6 2022",
    price: "R$ 68.500",
    image_url: "https://images.unsplash.com/photo-1502877338535-766e1452684a?w=600&q=80",
    url: "https://savinhomotors.com.br/veiculo/hb20-vision-2022",
    dealer_name: "Savinho Motors",
  },
  {
    title: "Hyundai HB20 Sport Premium 2021",
    price: "R$ 61.000",
    image_url: "https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=600&q=80",
    url: "https://ramiroveiculos.com/veiculo/hb20-sport-2021",
    dealer_name: "Ramiro Veículos",
  },
  {
    title: "Hyundai HB20 Comfort 1.0 2020",
    price: "R$ 54.800",
    image_url: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=600&q=80",
    url: "https://autoprimerp.com.br/veiculo/hb20-comfort-2020",
    dealer_name: "Auto Prime RP",
  },
  {
    title: "Hyundai HB20S Sedan 1.6 2022",
    price: "R$ 71.400",
    image_url: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&q=80",
    url: "https://glveiculos.com.br/veiculo/hb20s-2022",
    dealer_name: "GL Veículos",
  },
  {
    title: "Hyundai HB20 Diamond Plus 2023",
    price: "R$ 89.900",
    image_url: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&q=80",
    url: "https://valvechveiculos.com.br/veiculo/hb20-diamond-2023",
    dealer_name: "Valvech Veículos",
  },
  {
    title: "Hyundai HB20 Unique 1.0 2019",
    price: "Sob consulta",
    image_url: "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=600&q=80",
    url: "https://www.krveiculos.com.br/veiculo/hb20-unique-2019",
    dealer_name: "KR Veículos",
  },
  {
    title: "Hyundai HB20 Titen 1.0 T-GDI 2024",
    price: "R$ 95.000",
    image_url: "https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=600&q=80",
    url: "https://www.mmveiculosrp.com.br/veiculo/hb20-titen-2024",
    dealer_name: "MM Veículos RP",
  },
];

module.exports = { FAKE_CARS };
