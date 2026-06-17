# parsers/krveiculos.py
from bs4 import BeautifulSoup
from parsers.base_parser import BaseParser

class KRVeiculosParser(BaseParser):
    def search(self, query):
        url = self.base_url
        
        try:
            html = self.fetch_url(url)
        except Exception as e:
            print(f"Erro ao acessar {self.name}: {e}")
            return []
            
        soup = BeautifulSoup(html, "html.parser")
        results = []
        
        # Encontra todos os artigos de veículo
        articles = soup.find_all("article")
        query_words = query.lower().split()
        
        for article in articles:
            try:
                # 1. URL do anúncio
                # Procuramos um link que aponte para /veiculo/
                a_tags = article.find_all("a", href=True)
                link = None
                for a in a_tags:
                    href = a["href"]
                    # Filtra dropdown items e pega o real link de exibição
                    if "/veiculo/" in href and "search_dropdown" not in " ".join(a.get("class", [])):
                        link = href
                        break
                        
                if not link:
                    continue
                    
                if not link.startswith("http"):
                    link = f"{self.base_url.rstrip('/')}/{link.lstrip('/')}"
                    
                # 2. Título (Marca + Modelo)
                h3 = article.find("h3") # Geralmente contém o modelo
                h4 = article.find("h4") # Geralmente contém a marca (ex: "Mitsubishi - Ano/Modelo...")
                
                model = h3.get_text(" ", strip=True) if h3 else ""
                brand_info = h4.get_text(" ", strip=True) if h4 else ""
                
                # Extrai a marca (primeira parte antes do hífen)
                brand = brand_info.split("-")[0].strip() if "-" in brand_info else brand_info
                
                title = f"{brand} {model}".strip()
                title = " ".join(title.split())
                if not title:
                    title = "Veículo"
                    
                # Filtro local do termo de busca
                if not all(word in title.lower() for word in query_words):
                    continue
                    
                # 3. Imagem
                img = article.find("img")
                image_url = img.get("src") if img else None
                if image_url and not image_url.startswith("http"):
                    image_url = f"{self.base_url.rstrip('/')}/{image_url.lstrip('/')}"
                    
                # 4. Preço
                # Procuramos a div que contém a classe card_price
                price_div = None
                for d in article.find_all("div"):
                    class_str = " ".join(d.get("class", []))
                    if "card_price" in class_str:
                        price_div = d
                        break
                        
                price = "Sob consulta"
                if price_div:
                    price_span = price_div.find("span")
                    price = price_span.get_text(strip=True) if price_span else price_div.get_text(strip=True)
                    # Limpa caracteres corrompidos de encoding (ex: R$281.500,00)
                    price = price.replace("", "").replace("\xa0", " ")
                    price = " ".join(price.split())
                    
                if price == "R$ 0,00" or price == "R$" or not price:
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
