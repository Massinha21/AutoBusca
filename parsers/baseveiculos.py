# parsers/baseveiculos.py
from bs4 import BeautifulSoup
from parsers.base_parser import BaseParser
import re

class BaseVeiculosParser(BaseParser):
    def search(self, query):
        url = f"{self.base_url}/veiculos.php"
        
        try:
            html = self.fetch_url(url)
        except Exception as e:
            print(f"Erro ao acessar {self.name}: {e}")
            return []
            
        soup = BeautifulSoup(html, "html.parser")
        results = []
        
        cards = soup.find_all("div", class_="box-car")
        query_words = query.lower().split()
        
        for card in cards:
            try:
                # 1. URL do anúncio
                a_tag = card.find("a", href=True)
                link = a_tag["href"] if a_tag else None
                if link and not link.startswith("http"):
                    link = f"{self.base_url.rstrip('/')}/{link.lstrip('/')}"
                    
                if not link:
                    continue
                    
                # 2. Título (Marca/Modelo + Versão)
                h3 = card.find("h3")
                brand_model = h3.get_text(strip=True) if h3 else ""
                
                p_tag = card.find("p")
                version = ""
                if p_tag:
                    strong_tag = p_tag.find("strong")
                    if strong_tag:
                        version = strong_tag.get_text(strip=True)
                        
                title = f"{brand_model} {version}".strip()
                title = " ".join(title.split())
                if not title:
                    title = "Veículo"
                    
                # Filtro local de busca
                if not all(word in title.lower() for word in query_words):
                    continue
                    
                # 3. Imagem
                img = card.find("img")
                image_url = img.get("src") if img else None
                if image_url:
                    if image_url.startswith("//"):
                        image_url = f"https:{image_url}"
                    elif not image_url.startswith("http"):
                        image_url = f"{self.base_url.rstrip('/')}/{image_url.lstrip('/')}"
                        
                # 4. Preço (extraído com regex do parágrafo)
                price = "Sob consulta"
                if p_tag:
                    p_text = p_tag.get_text(" ", strip=True)
                    match = re.search(r"R\$\s*[\d\.,]+", p_text)
                    if match:
                        price = match.group(0)
                        
                if price == "R$ 0,00" or price == "R$ 0":
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
