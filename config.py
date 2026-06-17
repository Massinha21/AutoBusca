# config.py
# Configurações globais do buscador de veículos

# Cabeçalho HTTP para imitar um navegador padrão e evitar bloqueios
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
}

# Timeout para requisições de rede (em segundos)
REQUEST_TIMEOUT = 10

# Delay padrão entre requisições no mesmo site para respeitar os servidores (em segundos)
REQUEST_DELAY = 1.5

# Mapeamento completo dos 15 sites de revenda cadastrados
DEALERS = {
    "loja_1": {
        "name": "AMF Veículos",
        "url": "https://amfveiculos.com.br",
        "parser_module": "amfveiculos",
        "active": True
    },
    "loja_2": {
        "name": "Savinho Motors",
        "url": "https://savinhomotors.com.br",
        "parser_module": "savinhomotors",
        "active": True
    },
    "loja_3": {
        "name": "Ramiro Veículos",
        "url": "https://www.ramiroveiculos.com",
        "parser_module": "ramiroveiculos",
        "active": True
    },
    "loja_4": {
        "name": "Auto Prime RP",
        "url": "https://autoprimerp.com.br",
        "parser_module": "autoprimerp",
        "active": True
    },
    "loja_5": {
        "name": "Copa Veículos",
        "url": "https://www.copaveiculos.com.br",
        "parser_module": "copaveiculos",
        "active": True
    },
    "loja_6": {
        "name": "Auto Mais Veículos",
        "url": "https://www.automaisveiculosribeirao.com.br",
        "parser_module": "automaisveiculos",
        "active": True
    },
    "loja_7": {
        "name": "Valvech Veículos",
        "url": "https://valvechveiculos.com.br",
        "parser_module": "valvechveiculos",
        "active": True
    },
    "loja_8": {
        "name": "GL Veículos",
        "url": "https://glveiculos.com.br",
        "parser_module": "glveiculos",
        "active": True
    },
    "loja_9": {
        "name": "KR Veículos",
        "url": "https://www.krveiculos.com.br",
        "parser_module": "krveiculos",
        "active": True
    },
    "loja_10": {
        "name": "Base Veículos",
        "url": "https://www.baseveiculos.com.br",
        "parser_module": "baseveiculos",
        "active": True
    },
    "loja_11": {
        "name": "Rossi Veículos",
        "url": "https://rossiveiculos.com.br",
        "parser_module": "rossiveiculos",
        "active": True
    },
    "loja_12": {
        "name": "Seminovos Ribeirão Veículos",
        "url": "http://www.seminovosribeiraoveiculos.com.br",
        "parser_module": "seminovosribeirao",
        "active": True
    },
    "loja_13": {
        "name": "TCA Motors",
        "url": "https://tcamotors.com.br",
        "parser_module": "tcamotors",
        "active": True
    },
    "loja_14": {
        "name": "Holf Autos",
        "url": "https://www.holfautos.com",
        "parser_module": "holfautos",
        "active": True
    },
    "loja_15": {
        "name": "MM Veículos RP",
        "url": "https://www.mmveiculosrp.com.br",
        "parser_module": "mmveiculos",
        "active": True
    }
}
