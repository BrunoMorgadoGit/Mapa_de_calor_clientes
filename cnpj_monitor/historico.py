"""
Persistência do histórico de CNPJs processados.

Responsável por carregar e salvar o arquivo JSON que rastreia
quais CNPJs já foram detectados em execuções anteriores.
"""

import json
import os

from config import ARQUIVO_HISTORICO, logger


def carregar(caminho=None):
    """Carrega o histórico de CNPJs já processados.

    Args:
        caminho: Caminho do arquivo JSON (padrão: ARQUIVO_HISTORICO).

    Returns:
        set de strings com os CNPJs já processados.
    """
    caminho = caminho or ARQUIVO_HISTORICO

    if not os.path.exists(caminho):
        logger.info("Arquivo de historico nao encontrado. Criando novo.")
        return set()

    try:
        with open(caminho, "r", encoding="utf-8") as f:
            dados = json.load(f)

            if not isinstance(dados, list):
                logger.warning("Historico corrompido (formato invalido). Reiniciando.")
                return set()

            logger.info(f"Historico carregado: {len(dados)} CNPJ(s) registrado(s).")
            return set(dados)

    except json.JSONDecodeError as e:
        logger.error(f"Historico JSON corrompido: {e}. Reiniciando historico.")
        return set()
    except PermissionError:
        logger.error("Sem permissao para ler o arquivo de historico.")
        return set()
    except Exception as e:
        logger.error(f"Erro inesperado ao carregar historico: {e}")
        return set()


def salvar(cnpjs, caminho=None):
    """Salva o conjunto de CNPJs processados no histórico.

    Args:
        cnpjs: set ou iterable de CNPJs para salvar.
        caminho: Caminho do arquivo JSON (padrão: ARQUIVO_HISTORICO).
    """
    caminho = caminho or ARQUIVO_HISTORICO

    try:
        with open(caminho, "w", encoding="utf-8") as f:
            json.dump(sorted(cnpjs), f, indent=2, ensure_ascii=False)
        logger.info(f"Historico salvo: {len(cnpjs)} CNPJ(s) registrado(s).")
    except PermissionError:
        logger.error("Sem permissao para salvar o arquivo de historico.")
    except Exception as e:
        logger.error(f"Erro inesperado ao salvar historico: {e}")
