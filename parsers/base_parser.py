# parsers/base_parser.py
from abc import ABC, abstractmethod
import time
import requests
from config import HEADERS, REQUEST_TIMEOUT

class BaseParser(ABC):
    def __init__(self, dealer_id, dealer_config):
        self.dealer_id = dealer_id
        self.name = dealer_config["name"]
        self.base_url = dealer_config["url"]
        self.session = requests.Session()
        self.session.headers.update(HEADERS)

    @abstractmethod
    def search(self, query):
        """
        Realiza a busca pelo termo 'query' no site e retorna uma lista de dicionários.
        Cada dicionário deve conter:
        {
            'title': str,       # Nome/modelo do carro
            'price': str,       # Preço formatado (ex: R$ 50.000)
            'image_url': str,   # URL da imagem do carro
            'url': str,         # Link direto do anúncio
            'dealer_name': str  # Nome da loja (self.name)
        }
        """
        pass

    def fetch_url(self, url, params=None):
        """Método utilitário para realizar requisições HTTP GET com tratamento e timeout padronizados."""
        response = self.session.get(url, params=params, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
        return response.text
