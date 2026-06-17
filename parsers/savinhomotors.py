# parsers/savinhomotors.py
from bs4 import BeautifulSoup
from parsers.base_parser import BaseParser

class SavinhoMotorsParser(BaseParser):
    def search(self, query):
        # A Savinho Motors possui uma API interna que retorna os cards de veículos em HTML dentro de um JSON!
        # Endpoint: https://savinhomotors.com.br/api/vehicles
        # Parâmetro de busca: 'search'
        url = f"{self.base_url}/api/vehicles"
        params = {"search": query}
        
        try:
            # Faz a requisição HTTP. fetch_url retorna o texto. Como é JSON, precisamos decodificar.
            response_text = self.fetch_url(url, params=params)
            import json
            data = json.loads(response_text)
        except Exception as e:
            print(f"Erro ao acessar API da {self.name}: {e}")
            return []

        if not data.get("success", False):
            print(f"API de {self.name} retornou status de erro.")
            return []

        html_content = data.get("html", "")
        if not html_content:
            return []

        soup = BeautifulSoup(html_content, "html.parser")
        results = []

        # Cada veículo é encapsulado em uma tag <article class="vehicle-card">
        cards = soup.find_all("article", class_="vehicle-card")
        
        for card in cards:
            try:
                # 1. URL do anúncio
                a_tag = card.find("a", href=True)
                link = a_tag["href"] if a_tag else None
                if link and not link.startswith("http"):
                    link = f"{self.base_url}/{link.lstrip('/')}"
                
                if not link:
                    continue

                # 2. Imagem do veículo
                img_tag = card.find("img")
                image_url = None
                if img_tag:
                    image_url = img_tag.get("src")
                    # Se for a imagem de placeholder padrão ou caminho relativo, ajusta
                    if image_url and image_url.startswith("/"):
                        image_url = f"{self.base_url}/{image_url.lstrip('/')}"
                
                # 3. Título (Nome do veículo)
                name_tag = card.find("h3", class_="vehicle-name")
                title = name_tag.get_text(strip=True) if name_tag else "Veículo"
                
                # Se o título estiver vazio ou for genérico, tenta a marca
                if not name_tag:
                    brand_tag = card.find("div", class_="vehicle-brand")
                    if brand_tag:
                        title = brand_tag.get_text(strip=True)

                # 4. Preço
                price_tag = card.find("div", class_="vehicle-price")
                price = price_tag.get_text(strip=True) if price_tag else "Sob consulta"
                
                # Se o preço vier zerado (ex: R$ 0,00), mostramos "Sob consulta"
                if price == "R$ 0,00":
                    price = "Sob consulta"

                results.append({
                    "title": title,
                    "price": price,
                    "image_url": image_url,
                    "url": link,
                    "dealer_name": self.name
                })
            except Exception as e:
                print(f"Erro ao processar veículo em {self.name}: {e}")
                continue

        return results
