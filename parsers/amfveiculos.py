# parsers/amfveiculos.py
from bs4 import BeautifulSoup
from parsers.base_parser import BaseParser

class AMFVeiculosParser(BaseParser):
    def search(self, query):
        url = f"{self.base_url}/"
        params = {"s": query}
        
        try:
            html = self.fetch_url(url, params=params)
        except Exception as e:
            print(f"Erro ao acessar {self.name}: {e}")
            return []

        soup = BeautifulSoup(html, "html.parser")
        results = []

        # Os itens do estoque usam a classe do JetEngine listing grid
        grid_items = soup.find_all("div", class_="jet-listing-grid__item")
        
        for item in grid_items:
            try:
                # 1. URL do anúncio (link direto)
                # O JetEngine coloca um link invisível cobrindo o card
                link_tag = item.find("a", class_="jet-engine-listing-overlay-link")
                link = link_tag["href"] if link_tag else None
                
                # Se não achar o link invisível, tenta o data-url do wrap
                if not link:
                    wrap_tag = item.find("div", class_="jet-engine-listing-overlay-wrap")
                    link = wrap_tag.get("data-url") if wrap_tag else None
                
                if not link:
                    # Tenta qualquer link no card
                    a_tag = item.find("a")
                    link = a_tag["href"] if a_tag else None

                if not link:
                    continue

                # 2. Imagem do veículo
                img_tag = item.find("img")
                # Alguns temas usam lazy loading, verificamos data-src ou src
                image_url = None
                if img_tag:
                    image_url = img_tag.get("data-src") or img_tag.get("src")

                # 3. Título (Marca + Modelo + Versão)
                # No JetEngine, marca, modelo e versão costumam ser termos separados com a classe jet-listing-dynamic-terms__link
                terms = item.find_all("a", class_="jet-listing-dynamic-terms__link")
                title_parts = [t.get_text(strip=True) for t in terms if t.get_text(strip=True)]
                
                # Se não encontrar os termos estruturados, tenta buscar um título de cabeçalho
                if not title_parts:
                    h_tag = item.find(["h2", "h3", "h4", "h5"])
                    title = h_tag.get_text(strip=True) if h_tag else "Veículo"
                else:
                    title = " ".join(title_parts)

                # 4. Preço
                # O preço geralmente está em um campo dinâmico contendo "R$"
                price = None
                fields = item.find_all(class_="jet-listing-dynamic-field__content")
                for f in fields:
                    text = f.get_text(strip=True)
                    if "R$" in text:
                        price = text
                        break
                
                # Fallback para preço se não achar na classe padrão
                if not price:
                    # Procura por qualquer elemento contendo R$ no card
                    for elem in item.find_all(text=True):
                        if "R$" in elem:
                            cleaned = elem.strip()
                            if len(cleaned) < 20:  # Garante que não é um texto longo
                                price = cleaned
                                break
                
                if not price:
                    price = "Sob consulta"

                results.append({
                    "title": title,
                    "price": price,
                    "image_url": image_url,
                    "url": link,
                    "dealer_name": self.name
                })
            except Exception as e:
                # Se falhar ao processar um card específico, pula ele
                print(f"Erro ao processar anúncio na {self.name}: {e}")
                continue

        return results
