"""
Sistema de cache para geocoding.

Evita chamadas repetidas à APIs de Geocoding (Google, Nominatim, Mapbox)
armazenando o mapeamento 'endereço -> coordenadas' em um arquivo JSON local.
"""

import json
import os
from config import ARQUIVO_GEOCACHE, logger


def carregar(caminho=None):
    """Carrega o cache de geocoding do disco.

    Returns:
        dict: Onde a chave é o endereço (string) e o valor é um dict {'lat': ..., 'lng': ...}.
    """
    caminho = caminho or ARQUIVO_GEOCACHE

    if not os.path.exists(caminho):
        return {}

    try:
        with open(caminho, "r", encoding="utf-8") as f:
            cache = json.load(f)
            if not isinstance(cache, dict):
                logger.warning("Cache de geocoding corrompido. Reiniciando.")
                return {}
            return cache
    except Exception as e:
        logger.error(f"Erro ao carregar cache de geocoding: {e}")
        return {}


def salvar(cache, caminho=None):
    """Salva o cache de geocoding no disco.

    Args:
        cache (dict): O dicionário de cache completo.
        caminho: Caminho do arquivo JSON.
    """
    caminho = caminho or ARQUIVO_GEOCACHE

    try:
        # Salva formatado para ser legível (opcional)
        with open(caminho, "w", encoding="utf-8") as f:
            json.dump(cache, f, indent=2, ensure_ascii=False)
    except Exception as e:
        logger.error(f"Erro ao salvar cache de geocoding: {e}")


def buscar(endereco, cache):
    """Busca um endereço no cache.

    Args:
        endereco (str): O endereço normalizado.
        cache (dict): O dicionário de cache.

    Returns:
        dict ou None: {'lat': ..., 'lng': ...} se encontrado, senão None.
    """
    if not endereco:
        return None
        
    return cache.get(endereco.strip().upper())


def adicionar(endereco, lat, lng, cache):
    """Adiciona um novo resultado ao cache (não salva no disco automaticamente).

    Args:
        endereco (str): O endereço original.
        lat (float): Latitude.
        lng (float): Longitude.
        cache (dict): O dicionário de cache.
    """
    if not endereco:
        return

    cache[endereco.strip().upper()] = {
        "lat": lat,
        "lng": lng
    }
