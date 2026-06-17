# parsers/ramiroveiculos.py
import re
from bs4 import BeautifulSoup
from parsers.base_parser import BaseParser

class RamiroVeiculosParser(BaseParser):
    def search(self, query):
        # Ramiro Veículos busca através de /estoque?veiculo=termo
        url = f"{self.base_url}/estoque"
        params = {"veiculo": query}
        
        try:
            html = self.fetch_url(url, params=params)
        except Exception as e:
            print(f"Erro ao acessar {self.name}: {e}")
            return []

        soup = BeautifulSoup(html, "html.parser")
        results = []

        # Encontra os cards de veículos (geralmente sob a classe 'destaque' ou contendo 'card-destaque')
        cards = soup.find_all("div", class_="card-destaque")
        if not cards:
            # Tenta encontrar pela classe 'destaque'
            cards = soup.find_all("div", class_="destaque")

        for card in cards:
            try:
                # 1. URL (Link direto)
                # O card tem vários links. Vamos pegar o primeiro com href
                a_tags = card.find_all("a", href=True)
                link = None
                for a in a_tags:
                    href = a["href"]
                    # Evita links de whatsapp ou links vazios
                    if "veiculo" in href:
                        link = href
                        if not link.startswith("http"):
                            link = f"{self.base_url}/{link.lstrip('/')}"
                        break
                
                if not link and a_tags:
                    # Fallback para qualquer link do card
                    link = a_tags[0]["href"]
                    if link and not link.startswith("http"):
                        link = f"{self.base_url}/{link.lstrip('/')}"

                if not link:
                    continue

                # 2. Preço
                price_tag = card.find(class_="valor-destacadado")
                price = price_tag.get_text(strip=True) if price_tag else None
                
                # Fallback se não encontrar o preço
                if not price:
                    for elem in card.find_all(text=True):
                        if "R$" in elem:
                            cleaned = elem.strip()
                            if len(cleaned) < 25:
                                price = cleaned
                                break
                
                if not price:
                    price = "Sob consulta"

                # 3. Imagem
                # O site Ramiro Veículos usa background-image inline no div com classe 'destaque-imagem'
                image_url = None
                img_div = card.find("div", class_="destaque-imagem")
                if img_div and img_div.get("style"):
                    style = img_div["style"]
                    # Expressão regular para extrair a URL de background: url('...')
                    match = re.search(r"url\(['\"]?(.*?)['\"]?\)", style)
                    if match:
                        image_url = match.group(1)
                        if image_url and not image_url.startswith("http"):
                            image_url = f"{self.base_url}/{image_url.lstrip('/')}"
                
                # Fallback se não for imagem de background
                if not image_url:
                    img_tag = card.find("img")
                    if img_tag:
                        image_url = img_tag.get("src")
                        if image_url and not image_url.startswith("http"):
                            image_url = f"{self.base_url}/{image_url.lstrip('/')}"

                # 4. Título
                # Geralmente no div class="titulo-sub-destaque" com dois <p>
                title = ""
                title_div = card.find(class_="titulo-sub-destaque")
                if title_div:
                    paragraphs = title_div.find_all("p")
                    title_parts = [p.get_text(strip=True) for p in paragraphs if p.get_text(strip=True)]
                    title = " ".join(title_parts)
                
                if not title:
                    # Fallback para o nome do veículo na URL do link
                    # Ex: /veiculo/renault-duster-preto-2022/1409001
                    match = re.search(r"/veiculo/([^/]+)", link)
                    if match:
                        title = match.group(1).replace("-", " ").title()
                    else:
                        title = "Veículo"

                results.append({
                    "title": title,
                    "price": price,
                    "image_url": image_url,
                    "url": link,
                    "dealer_name": self.name
                })
            except Exception as e:
                print(f"Erro ao processar anúncio em {self.name}: {e}")
                continue

        return results
