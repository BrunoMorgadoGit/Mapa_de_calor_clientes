"""
Serviço de Geocoding com Cache — OpenStreetMap (Nominatim).

Converte endereços em coordenadas (lat/lng) usando a API gratuita
do Nominatim. Prioriza o cache local para evitar chamadas repetidas
e respeita o rate limit de 1 requisição por segundo.

Docs: https://nominatim.org/release-docs/develop/api/Search/
"""

import time
import json
import urllib.request
import urllib.parse
import urllib.error

import geocache
from config import logger

# Cache persistente em memória para a sessão
_cache = geocache.carregar()

# Nominatim exige pelo menos 1s entre requisições
_DELAY_ENTRE_REQUESTS = 1.1  # segundos (margem de segurança)
_ultimo_request = 0.0

# User-Agent obrigatório para Nominatim (identifica sua aplicação)
_USER_AGENT = "cnpj_monitor/1.0 (github.com/usuario/cnpj_monitor)"


def _chamar_nominatim(endereco):
    """Faz uma chamada real à API do Nominatim.

    Args:
        endereco (str): Endereço para geocodificar.

    Returns:
        tuple (lat, lng) ou None se não encontrar.
    """
    global _ultimo_request

    # Respeitar rate limit do Nominatim (1 req/s)
    agora = time.time()
    tempo_desde_ultimo = agora - _ultimo_request
    if tempo_desde_ultimo < _DELAY_ENTRE_REQUESTS:
        espera = _DELAY_ENTRE_REQUESTS - tempo_desde_ultimo
        time.sleep(espera)

    # Montar URL de busca
    params = urllib.parse.urlencode({
        "q": endereco,
        "format": "json",
        "limit": 1,
        "countrycodes": "br",
    })
    url = f"https://nominatim.openstreetmap.org/search?{params}"

    req = urllib.request.Request(url)
    req.add_header("User-Agent", _USER_AGENT)
    req.add_header("Accept", "application/json")

    try:
        _ultimo_request = time.time()

        with urllib.request.urlopen(req, timeout=10) as resp:
            dados = json.loads(resp.read().decode("utf-8"))

        if not dados:
            logger.warning(f"Nominatim: nenhum resultado para '{endereco}'")
            return None

        lat = float(dados[0]["lat"])
        lng = float(dados[0]["lon"])
        logger.info(f"Geocoding OK: '{endereco}' -> ({lat}, {lng})")
        return (lat, lng)

    except urllib.error.HTTPError as e:
        logger.warning(f"Nominatim HTTP {e.code} para '{endereco}': {e.reason}")
        return None
    except urllib.error.URLError as e:
        logger.warning(f"Nominatim erro de rede: {e.reason}")
        return None
    except (json.JSONDecodeError, KeyError, IndexError, ValueError) as e:
        logger.warning(f"Nominatim resposta inesperada para '{endereco}': {e}")
        return None
    except Exception as e:
        logger.warning(f"Nominatim erro inesperado: {e}")
        return None


def obter_coordenadas(endereco):
    """Obtém lat/lng para um endereço, consultando o cache primeiro.

    Fluxo:
    1. Busca no cache local (instantâneo)
    2. Se não encontrar, chama Nominatim (com delay)
    3. Salva o resultado no cache para futuras execuções

    Args:
        endereco (str): Endereço completo.

    Returns:
        dict: {'lat': ..., 'lng': ...} ou None se falhar.
    """
    if not endereco or endereco == "Endereco nao disponivel":
        return None

    # 1. Tenta buscar no cache (O(1))
    resultado = geocache.buscar(endereco, _cache)
    if resultado:
        return resultado

    # 2. Chamar Nominatim
    coords = _chamar_nominatim(endereco)

    if coords is None:
        return None

    lat, lng = coords

    # 3. Salva no cache e persiste no disco
    geocache.adicionar(endereco, lat, lng, _cache)
    geocache.salvar(_cache)

    return {"lat": lat, "lng": lng}
