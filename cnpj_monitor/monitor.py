
"""
Pipeline principal do monitor de estabelecimentos.

Este módulo conecta parser, filtros e histórico em um gerador
que processa o arquivo da RF de forma incremental.

Pode ser importado diretamente por uma API (FastAPI) sem
depender da camada CLI (main.py).

Uso como gerador (streaming, memória constante):
    from monitor import processar_novos

    stats = {}
    for registro in processar_novos(stats=stats):
        print(registro)

Uso como retorno JSON (acumula tudo, pronto para API):
    from monitor import executar

    resultado = executar()
    # resultado = {
    #     "novos": [ { "cnpj": "...", "nome": "...", ... }, ... ],
    #     "stats": { "total_lidos": ..., "tempo_segundos": ... },
    #     "timestamp": "2026-04-13T02:49:07"
    # }
"""

import os
import time
from datetime import datetime

from config import ARQUIVO_DADOS, LOG_INTERVALO, logger
import historico
import parser
import filtros
import geocoding


def processar_novos(caminho_csv=None, caminho_historico=None, stats=None):
    """Gerador principal — detecta novos mercados no CSV da RF.

    Lê o arquivo linha por linha (streaming), aplica filtros e faz yield
    de cada registro novo encontrado. Ao final, salva o histórico atualizado.

    Args:
        caminho_csv: Caminho do CSV (padrão: ARQUIVO_DADOS).
        caminho_historico: Caminho do histórico JSON (padrão: ARQUIVO_HISTORICO).
        stats: dict opcional — se fornecido, será populado com contadores
               e tempo de execução ao final do processamento.
               Chaves: total_lidos, total_mercados, total_ignorados,
                       total_novos, total_historico, tempo_segundos.

    Yields:
        dict — Registro de um novo estabelecimento de mercado.
    """
    t_inicio = time.perf_counter()
    caminho_csv = caminho_csv or ARQUIVO_DADOS

    if stats is None:
        stats = {}

    if not os.path.exists(caminho_csv):
        logger.error(f"Arquivo CSV nao encontrado: {caminho_csv}")
        return

    # Carregar histórico
    hist = historico.carregar(caminho_historico)
    todos_cnpjs = set(hist)

    # Contadores
    total_lidos = 0
    total_mercados = 0
    total_ignorados = 0
    total_novos = 0
    total_erros = 0

    # Limite de logs de aviso (evita poluir o terminal com milhares de warnings)
    MAX_LOG_AVISOS = 10

    # Cache local para performance no hot loop
    _log_intervalo = LOG_INTERVALO

    try:
        for num_linha, dados in enumerate(parser.stream_registros(caminho_csv), start=1):
            # === TRY por linha — NUNCA quebra o loop ===
            try:
                total_lidos += 1

                # Log de progresso
                if total_lidos % _log_intervalo == 0:
                    logger.info(f"Progresso: {total_lidos:,} linhas processadas...")

                # ---- VALIDAÇÃO DE CAMPOS OBRIGATÓRIOS ----
                valido, campos_vazios = parser.validar_campos_obrigatorios(dados)
                if not valido:
                    total_ignorados += 1
                    if total_ignorados <= MAX_LOG_AVISOS:
                        logger.warning(
                            f"Linha {num_linha}: campo(s) vazio(s): "
                            f"{', '.join(campos_vazios)}. Ignorada."
                        )
                    continue

                # ---- FILTRO CNAE ----
                cnae = filtros.is_mercado(dados)
                if cnae is None:
                    continue

                total_mercados += 1

                # ---- MONTAR E VALIDAR CNPJ ----
                cnpj = parser.montar_cnpj(dados)

                if not filtros.is_cnpj_valido(cnpj):
                    total_ignorados += 1
                    if total_ignorados <= MAX_LOG_AVISOS:
                        logger.warning(f"Linha {num_linha}: CNPJ invalido '{cnpj}'.")
                    continue

                # Rastrear todos os CNPJs de mercado
                todos_cnpjs.add(cnpj)

                # ---- DETECTAR NOVOS ----
                if filtros.is_novo(cnpj, hist):
                    registro = parser.extrair_registro(dados, cnpj, cnae)

                    if registro is None:
                        total_ignorados += 1
                        if total_ignorados <= MAX_LOG_AVISOS:
                            logger.warning(f"Linha {num_linha}: falha ao extrair registro.")
                        continue

                    total_novos += 1
                    
                    # Tentar geocodificar o novo endereço (usa cache interno)
                    coords = geocoding.obter_coordenadas(registro.get("endereco"))
                    if coords:
                        registro["lat"] = coords["lat"]
                        registro["lng"] = coords["lng"]

                    yield registro

            except UnicodeDecodeError as e:
                total_erros += 1
                if total_erros <= MAX_LOG_AVISOS:
                    logger.warning(f"Linha {num_linha}: erro de encoding: {e}")
            except (ValueError, TypeError) as e:
                total_erros += 1
                if total_erros <= MAX_LOG_AVISOS:
                    logger.warning(f"Linha {num_linha}: dados invalidos: {e}")
            except Exception as e:
                total_erros += 1
                if total_erros <= MAX_LOG_AVISOS:
                    logger.warning(f"Linha {num_linha}: erro inesperado: {e}")

    except PermissionError:
        logger.error("Sem permissao para ler o arquivo CSV.")
    except OSError as e:
        logger.error(f"Erro de I/O ao processar CSV: {e}")
    except Exception as e:
        logger.error(f"Erro fatal ao processar CSV: {e}")

    # ---- FINALIZAÇÃO (sempre executa) ----

    # Salvar histórico atualizado (mesmo que tenha tido erros)
    if todos_cnpjs:
        historico.salvar(todos_cnpjs, caminho_historico)

    # Calcular tempo total
    tempo = time.perf_counter() - t_inicio

    # Resumo final via logging
    logger.info(f"Registros lidos no CSV: {total_lidos:,}")
    logger.info(f"Registros de mercado (CNAEs filtrados): {total_mercados:,}")
    logger.info(f"Registros ignorados (campos invalidos): {total_ignorados:,}")
    logger.info(f"Erros de processamento: {total_erros:,}")
    logger.info(f"Novos mercados detectados: {total_novos:,}")
    logger.info(f"Tempo de execucao: {tempo:.2f}s")

    if total_erros > MAX_LOG_AVISOS:
        logger.warning(
            f"Suprimidos {total_erros - MAX_LOG_AVISOS} avisos adicionais."
        )

    # Popula stats para o chamador
    stats.update({
        "total_lidos": total_lidos,
        "total_mercados": total_mercados,
        "total_ignorados": total_ignorados,
        "total_erros": total_erros,
        "total_novos": total_novos,
        "total_historico": len(todos_cnpjs),
        "tempo_segundos": round(tempo, 3),
    })


# ============================================================
#  FORMATAÇÃO DO REGISTRO PARA JSON / API
# ============================================================
def formatar_registro(registro):
    """Converte um registro interno para o formato de saída JSON/API.

    Normaliza os nomes dos campos para um contrato limpo e estável,
    independente da estrutura interna do parser.

    Args:
        registro: dict retornado por parser.extrair_registro().

    Returns:
        dict com campos padronizados para a API.
    """
    return {
        "cnpj": registro.get("cnpj", ""),
        "nome": registro.get("nome_fantasia", "") or "(sem nome fantasia)",
        "cnae": registro.get("cnae_principal", ""),
        "cidade": registro.get("municipio", ""),
        "uf": registro.get("uf", ""),
        "endereco": registro.get("endereco", ""),
        "data_inicio_atividade": registro.get("data_inicio", ""),
        "lat": registro.get("lat"),
        "lng": registro.get("lng"),
    }


# ============================================================
#  FUNÇÃO PRINCIPAL — RETORNO JSON-SERIALIZÁVEL
# ============================================================
def executar(caminho_csv=None, caminho_historico=None, pagina=1, limite=20,
             filtros_dict=None):
    """Processa o CSV e retorna resultado paginado e filtrado.

    Esta é a função que uma API (FastAPI) deve chamar diretamente.

    Args:
        caminho_csv: Caminho do CSV (padrão: ARQUIVO_DADOS).
        caminho_historico: Caminho do histórico JSON (padrão: ARQUIVO_HISTORICO).
        pagina: Número da página (1-indexed).
        limite: Quantidade de itens por página.
        filtros_dict: dict de filtros dinâmicos (ver filtros.aplicar_filtros).
            Chaves: uf, cidade, cnae, data_min.

    Returns:
        dict com dados filtrados, metadados de paginação e estatísticas.
    """
    stats = {}
    todos_novos = []

    try:
        # 1. Coletar todos os novos
        for registro in processar_novos(caminho_csv, caminho_historico, stats=stats):
            todos_novos.append(formatar_registro(registro))

        # 2. Aplicar Filtros Dinâmicos (antes da paginação)
        if filtros_dict:
            todos_novos = [
                r for r in todos_novos
                if filtros.aplicar_filtros(r, filtros_dict)
            ]

        # 3. Aplicar Paginação
        total_itens = len(todos_novos)
        offset = (pagina - 1) * limite
        paginado = todos_novos[offset : offset + limite]

        total_paginas = (total_itens + limite - 1) // limite if limite > 0 else 1

        return {
            "sucesso": True,
            "timestamp": datetime.now().isoformat(timespec="seconds"),
            "filtros_ativos": filtros_dict or {},
            "paginacao": {
                "pagina_atual": pagina,
                "limite_por_pagina": limite,
                "total_itens": total_itens,
                "total_paginas": total_paginas,
                "tem_proxima": pagina < total_paginas,
                "tem_anterior": pagina > 1,
            },
            "novos": paginado,
            "stats": stats,
        }

    except Exception as e:
        logger.error(f"Erro ao executar monitor: {e}")
        return {
            "sucesso": False,
            "timestamp": datetime.now().isoformat(timespec="seconds"),
            "erro": str(e),
            "novos": [],
            "stats": stats,
        }


# ============================================================
#  LISTAR TODOS OS MERCADOS (novos + existentes)
# ============================================================
def listar_todos_mercados(caminho_csv=None, caminho_historico=None,
                          pagina=1, limite=50, filtros_dict=None):
    """Retorna TODOS os mercados do CSV, cada um com flag is_novo.

    Diferente de executar() que retorna apenas novos, esta função
    retorna o panorama completo para o dashboard/mapa.

    Args:
        caminho_csv: Caminho do CSV (padrão: ARQUIVO_DADOS).
        caminho_historico: Caminho do histórico JSON.
        pagina: Número da página (1-indexed).
        limite: Quantidade de itens por página.
        filtros_dict: dict de filtros dinâmicos.

    Returns:
        dict com todos os mercados, paginação e estatísticas.
    """
    caminho_csv = caminho_csv or ARQUIVO_DADOS

    if not os.path.exists(caminho_csv):
        logger.error(f"Arquivo CSV nao encontrado: {caminho_csv}")
        return {"sucesso": False, "erro": "CSV nao encontrado", "mercados": []}

    # Carregar histórico para saber quais são novos
    hist = historico.carregar(caminho_historico)

    todos_mercados = []

    try:
        for registro in parser.stream_registros(caminho_csv):
            # Filtrar apenas mercados (CNAE)
            cnae = filtros.is_mercado(registro)
            if cnae is None:
                continue

            cnpj = parser.montar_cnpj(registro)
            if not filtros.is_cnpj_valido(cnpj):
                continue

            item = formatar_registro(
                parser.extrair_registro(registro, cnpj, cnae)
            )
            item["is_novo"] = cnpj not in hist

            # Tentar geocodificar
            coords = geocoding.obter_coordenadas(item.get("endereco"))
            if coords:
                item["lat"] = coords["lat"]
                item["lng"] = coords["lng"]

            todos_mercados.append(item)

    except Exception as e:
        logger.error(f"Erro ao listar mercados: {e}")
        return {"sucesso": False, "erro": str(e), "mercados": []}

    # Aplicar filtros dinâmicos
    if filtros_dict:
        todos_mercados = [
            r for r in todos_mercados
            if filtros.aplicar_filtros(r, filtros_dict)
        ]

    # Paginação
    total_itens = len(todos_mercados)
    offset = (pagina - 1) * limite
    paginado = todos_mercados[offset : offset + limite]
    total_paginas = (total_itens + limite - 1) // limite if limite > 0 else 1

    return {
        "sucesso": True,
        "timestamp": datetime.now().isoformat(timespec="seconds"),
        "filtros_ativos": filtros_dict or {},
        "paginacao": {
            "pagina_atual": pagina,
            "limite_por_pagina": limite,
            "total_itens": total_itens,
            "total_paginas": total_paginas,
        },
        "mercados": paginado,
        "resumo": {
            "total_mercados": total_itens,
            "total_novos": sum(1 for m in todos_mercados if m.get("is_novo")),
            "total_existentes": sum(1 for m in todos_mercados if not m.get("is_novo")),
        },
    }
