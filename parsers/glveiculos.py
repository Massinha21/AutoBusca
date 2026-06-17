# parsers/glveiculos.py
from bs4 import BeautifulSoup
from parsers.base_parser import BaseParser

class GLVeiculosParser(BaseParser):
    def search(self, query):
        url = f"{self.base_url}/estoque"
        params = {"termo": query}
        
        try:
            html = self.fetch_url(url, params=params)
        except Exception as e:
            print(f"Erro ao acessar {self.name}: {e}")
            return []
            
        soup = BeautifulSoup(html, "html.parser")
        results = []
        
        cards = soup.find_all("div", class_="card-car")
        
        for card in cards:
            try:
                # 1. Link de detalhes
                # Fica no 'a' dentro do card-header
                a_tag = card.find("a", href=True)
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
                    
                # 3. Título do carro
                # O parágrafo fw-bold dentro do card-body contém a descrição completa do carro
                title_tag = card.find("p", class_="fw-bold")
                if title_tag:
                    title = title_tag.get_text(strip=True)
                else:
                    # Fallback com marca/modelo se fw-bold não existir
                    title_h3 = card.find("h3", class_="fw-normal")
                    title = title_h3.get_text(" ", strip=True) if title_h3 else "Veículo"
                    
                title = " ".join(title.split())
                
                # 4. Preço do carro
                price_div = card.find(class_="price")
                price = "Sob consulta"
                if price_div:
                    price_text = price_div.get_text(" ", strip=True)
                    # Exemplo: "R$ 61.900" ou "R$ 61.900 Ver mais"
                    # Vamos limpar para manter apenas a parte com R$ e o valor
                    import re
                    match = re.search(r"R\$\s*[\d\.]+", price_text)
                    if match:
                        price = match.group(0)
                        
                if price == "R$ 0" or price == "R$ 0,00":
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
