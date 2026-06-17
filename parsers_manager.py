# parsers_manager.py
import time
import importlib
from config import DEALERS, REQUEST_DELAY

class ParsersManager:
    def __init__(self):
        self.parsers = {}
        # Inicializa apenas os parsers ativos
        for dealer_id, dealer_config in DEALERS.items():
            if dealer_config.get("active", False):
                try:
                    module_name = f"parsers.{dealer_config['parser_module']}"
                    module = importlib.import_module(module_name)
                    # Encontra a classe do parser (ex: AMFVeiculosParser)
                    # A classe deve herdar de BaseParser e terminar com 'Parser'
                    parser_class = None
                    for name in dir(module):
                        if name.endswith("Parser") and name != "BaseParser":
                            parser_class = getattr(module, name)
                            break
                    
                    if parser_class:
                        self.parsers[dealer_id] = parser_class(dealer_id, dealer_config)
                        print(f"Carregado parser: {dealer_config['name']} ({parser_class.__name__})")
                    else:
                        print(f"Aviso: Classe Parser não encontrada no módulo {module_name}")
                except Exception as e:
                    print(f"Erro ao carregar parser {dealer_id}: {e}")

    def search_generator(self, query):
        """
        Executa a busca sequencialmente em todos os parsers ativos e retorna um gerador.
        Respeita o delay configurado entre as requisições e envia atualizações de progresso.
        """
        active_parsers = list(self.parsers.values())
        total_sites = len(active_parsers)
        
        if total_sites == 0:
            yield {"type": "error", "message": "Nenhum site de busca está ativado no momento."}
            return

        for index, parser in enumerate(active_parsers, start=1):
            # 1. Envia status de início de busca no site
            yield {
                "type": "progress",
                "site_name": parser.name,
                "index": index,
                "total": total_sites,
                "status": "searching"
            }

            results = []
            status = "success"
            error_msg = ""

            try:
                # 2. Executa a busca
                results = parser.search(query)
            except Exception as e:
                status = "error"
                error_msg = str(e)
                print(f"Erro na busca do site {parser.name}: {e}")

            # 3. Retorna os resultados encontrados nesse site
            yield {
                "type": "results",
                "site_name": parser.name,
                "index": index,
                "total": total_sites,
                "status": status,
                "error_message": error_msg,
                "results": results
            }

            # 4. Aguarda um delay antes de pesquisar no próximo site (polidez)
            if index < total_sites:
                time.sleep(REQUEST_DELAY)

        # 5. Envia sinal de término de busca geral
        yield {
            "type": "done",
            "message": "Busca finalizada em todos os sites cadastrados!"
        }
