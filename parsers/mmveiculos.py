# parsers/mmveiculos.py
from bs4 import BeautifulSoup
from parsers.base_parser import BaseParser
import json

class MMVeiculosParser(BaseParser):
    def search(self, query):
        url = f"{self.base_url}/estoque"
        
        try:
            html = self.fetch_url(url)
        except Exception as e:
            print(f"Erro ao acessar {self.name}: {e}")
            return []
            
        soup = BeautifulSoup(html, "html.parser")
        results = []
        
        # Encontra todos os cards do Wix
        cards = soup.find_all("div", attrs={"data-hook": "product-item-root"})
        query_words = query.lower().split()
        
        for card in cards:
            try:
                # 1. URL do anúncio
                a_tag = card.find("a", attrs={"data-hook": "product-item-container"})
                if not a_tag:
                    a_tag = card.find("a", href=True)
                link = a_tag["href"] if a_tag else None
                if link and not link.startswith("http"):
                    link = f"{self.base_url.rstrip('/')}/{link.lstrip('/')}"
                    
                if not link:
                    continue
                    
                # 2. Título (Nome do produto/carro)
                title_tag = card.find(attrs={"data-hook": "product-item-name"})
                if not title_tag:
                    title_tag = card.find("h3")
                    
                title = title_tag.get_text(strip=True) if title_tag else "Veículo"
                title = " ".join(title.split())
                
                # Filtro local do termo de busca
                if not all(word in title.lower() for word in query_words):
                    continue
                    
                # 3. Imagem (Construção da imagem original em alta resolução no Wix)
                image_url = None
                wow_image = card.find("wow-image")
                if wow_image and wow_image.get("data-image-info"):
                    try:
                        data_info = json.loads(wow_image.get("data-image-info"))
                        uri = data_info.get("imageData", {}).get("uri")
                        if uri:
                            image_url = f"https://static.wixstatic.com/media/{uri}"
                    except Exception:
                        pass
                        
                # Fallback para a tag img comum se wow-image falhar
                if not image_url:
                    img_tag = card.find("img")
                    image_url = img_tag.get("src") if img_tag else None
                    if image_url and not image_url.startswith("http"):
                        image_url = f"{self.base_url.rstrip('/')}/{image_url.lstrip('/')}"
                        
                # 4. Preço
                price_tag = card.find(attrs={"data-hook": "product-item-price-to-pay"})
                if not price_tag:
                    price_tag = card.find(attrs={"data-hook": "prices-container"})
                    
                price = "Sob consulta"
                if price_tag:
                    price_text = price_tag.get_text(strip=True)
                    # Wix inclui a palavra "Preço" junto ao valor em alguns elementos (ex: "PreçoR$ 39.900,00")
                    price_text = price_text.replace("Preço", "").replace("\xa0", " ").strip()
                    if price_text:
                        price = price_text
                price_clean = price.replace("R$", "").replace(" ", "").replace(",00", "").replace(".00", "").strip()
                if not price or price == "R$" or price_clean in ("0", "", "0.00", "0,00"):
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
