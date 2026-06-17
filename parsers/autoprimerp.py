# parsers/autoprimerp.py
import re
from bs4 import BeautifulSoup
from parsers.base_parser import BaseParser

class AutoPrimeRPParser(BaseParser):
    def search(self, query):
        # A AutoPrimeRP lista todo o seu estoque em /estoque e não possui busca direta por texto no backend.
        # Nós baixamos o estoque completo e filtramos localmente.
        url = f"{self.base_url}/estoque"
        
        try:
            html = self.fetch_url(url)
        except Exception as e:
            print(f"Erro ao acessar {self.name}: {e}")
            return []

        soup = BeautifulSoup(html, "html.parser")
        results = []

        # A estrutura da plataforma Exibição coloca os veículos em blocos div contendo ul > li
        # Vamos buscar todos os uls que representam os cards de veículos
        # Cada ul de veículo contém li.li-foto-estoque e li.li-desc-estoque
        uls = soup.find_all("ul")
        
        for ul in uls:
            try:
                foto_li = ul.find("li", class_="li-foto-estoque")
                desc_li = ul.find("li", class_="li-desc-estoque")
                
                if not foto_li or not desc_li:
                    continue

                # 1. URL do anúncio
                # O link fica dentro do a que envolve a foto ou no botão detalhes
                a_tag = ul.find("a", href=True)
                link = a_tag["href"] if a_tag else None
                if link and not link.startswith("http"):
                    link = f"{self.base_url}/{link.lstrip('/')}"

                if not link or "exibicao" not in link:
                    continue

                # 2. Título (Marca - Modelo/Versão)
                title_span = desc_li.find("span", class_="tx-titulo-estoque")
                title = title_span.get_text(strip=True) if title_span else "Veículo"
                
                # Normaliza caracteres (ex: Ã  -> Á, etc. por conta de encodings)
                # O python lida bem com UTF-8, mas caso venha corrompido do site fazemos fallback
                title = title.encode('latin1', errors='ignore').decode('utf-8', errors='ignore') if hasattr(title, 'encode') else title
                # Remove espaços duplos
                title = " ".join(title.split())

                # Filtro local do termo de busca
                query_words = query.lower().split()
                if not all(word in title.lower() for word in query_words):
                    continue

                # 3. Imagem
                # A imagem vem como background-image inline no li
                image_url = None
                style = foto_li.get("style", "")
                match = re.search(r"url\(['\"]?(.*?)['\"]?\)", style)
                if match:
                    image_url = match.group(1)
                    if image_url and not image_url.startswith("http"):
                        image_url = f"{self.base_url}/{image_url.lstrip('/')}"

                # 4. Preço
                price_span = desc_li.find("span", class_="tx-preco")
                price = price_span.get_text(strip=True) if price_span else "Sob consulta"
                
                price_clean = price.replace("R$", "").replace(" ", "").replace(",00", "").replace(".00", "").strip()
                if not price or price_clean in ("0", "", "0.00", "0,00"):
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

        return results
