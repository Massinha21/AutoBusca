# parsers/valvechveiculos.py
from bs4 import BeautifulSoup
from parsers.base_parser import BaseParser
from config import REQUEST_TIMEOUT

class ValvechVeiculosParser(BaseParser):
    def search(self, query):
        url = f"{self.base_url}/_Geral/getEstoque"
        
        results = []
        page = 1
        query_words = query.lower().split()
        
        while page <= 10:  # Limita a busca a no máximo 10 páginas
            try:
                # O site espera o número da página no POST
                headers = {"X-Requested-With": "XMLHttpRequest"}
                response = self.session.post(
                    url, 
                    data={"pagina": str(page)}, 
                    headers=headers,
                    timeout=REQUEST_TIMEOUT
                )
                response.raise_for_status()
                
                html = response.text
                try:
                    data = response.json()
                    html = data.get("html", "")
                except Exception:
                    pass
                
                soup = BeautifulSoup(html, "html.parser")
                cards = soup.find_all("div", class_="cerca")
                
                if not cards:
                    break
                    
                for card in cards:
                    try:
                        # 1. URL do anúncio
                        a_tag = card.find("a", href=True)
                        if not a_tag:
                            continue
                        
                        link = a_tag["href"]
                        if link.startswith("//"):
                            link = f"https:{link}"
                        elif not link.startswith("http"):
                            link = f"{self.base_url.rstrip('/')}/{link.lstrip('/')}"
                            
                        # Limpa possíveis barras duplas na URL construída
                        link = link.replace("com.br//", "com.br/")
                        
                        # 2. Título
                        title_span = card.find("span", class_=lambda c: c and 'l' in c.split())
                        if not title_span:
                            title_span = card.find("span", class_="l")
                            
                        title = title_span.get_text(strip=True) if title_span else "Veículo"
                        title = " ".join(title.split())
                        
                        # Filtro de busca local
                        if not all(word in title.lower() for word in query_words):
                            continue
                            
                        # 3. Imagem
                        img_tag = card.find("img")
                        image_url = img_tag.get("src") if img_tag else None
                        if image_url and image_url.startswith("//"):
                            image_url = f"https:{image_url}"
                        elif image_url and not image_url.startswith("http"):
                            image_url = f"{self.base_url.rstrip('/')}/{image_url.lstrip('/')}"
                            
                        # 4. Preço
                        price_span = card.find("span", class_=lambda c: c and 'r' in c.split())
                        if not price_span:
                            price_span = card.find("span", class_="r")
                            
                        price = price_span.get_text(strip=True) if price_span else "Sob consulta"
                        price = " ".join(price.split())
                        
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
                        print(f"Erro ao processar veículo na {self.name}: {e}")
                        continue
                
                # Se a página retornou menos carros que o tamanho padrão de página (24), terminamos
                if len(cards) < 24:
                    break
                    
                page += 1
                
            except Exception as e:
                print(f"Erro ao pesquisar em {self.name} (Pág. {page}): {e}")
                break
                
        return results
