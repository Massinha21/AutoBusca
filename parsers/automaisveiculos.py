# parsers/automaisveiculos.py
from bs4 import BeautifulSoup
from parsers.base_parser import BaseParser

class AutoMaisVeiculosParser(BaseParser):
    def search(self, query):
        # A plataforma AutoCerto permite buscar usando a URL /veiculos?modelo=termo
        url = f"{self.base_url}/veiculos"
        params = {"modelo": query}
        
        try:
            html = self.fetch_url(url, params=params)
        except Exception as e:
            print(f"Erro ao acessar {self.name}: {e}")
            return []

        soup = BeautifulSoup(html, "html.parser")
        results = []

        # Cada anúncio fica dentro de uma div com classe 'result-item'
        cards = soup.find_all("div", class_="result-item")
        
        for card in cards:
            try:
                # 1. Link de detalhes
                # Fica no 'a' com classe 'media-box' ou no título h4
                a_tag = card.find("a", class_="media-box")
                if not a_tag:
                    title_tag = card.find("h4", class_="result-item-title")
                    if title_tag:
                        a_tag = title_tag.find("a")
                
                link = a_tag["href"] if a_tag else None
                if link and not link.startswith("http"):
                    link = f"{self.base_url.rstrip('/')}/{link.lstrip('/')}"

                if not link:
                    continue

                # 2. Imagem do carro
                img_tag = card.find("img")
                image_url = img_tag.get("src") if img_tag else None
                if image_url and not image_url.startswith("http"):
                    image_url = f"{self.base_url.rstrip('/')}/{image_url.lstrip('/')}"

                # 3. Título
                title = ""
                title_tag = card.find("h4", class_="result-item-title")
                if title_tag:
                    title = title_tag.get_text(strip=True)
                    # Limpa quebras de linha que possam vir no HTML
                    title = " ".join(title.split())
                
                if not title:
                    title = "Veículo"

                # Filtro local do termo de busca
                query_words = query.lower().split()
                if not all(word in title.lower() for word in query_words):
                    continue

                # 4. Preço
                price_tag = card.find("div", class_="result-item-pricing")
                if not price_tag:
                    price_tag = card.find(class_="price")
                
                price = price_tag.get_text(strip=True) if price_tag else "Sob consulta"
                # Limpa o preço (ex: remove "R$" duplicado se houver e formata)
                price = " ".join(price.split())
                if "R$" not in price:
                    price = f"R$ {price}"
                
                if price == "R$ 0,00" or price == "R$":
                    price = "Sob consulta"

                results.append({
                    "title": title,
                    "price": price,
                    "image_url": image_url,
                    "url": link,
                    "dealer_name": self.name
                })
            except Exception as e:
                print(f"Erro ao processar anúncio na {self.name}: {e}")
                continue

        return results
