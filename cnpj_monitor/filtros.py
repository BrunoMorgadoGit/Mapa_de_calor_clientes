"""
Filtros de negócio para o monitor de estabelecimentos.

Responsável por:
- Filtrar por CNAE (mercado/supermercado)
- Validar CNPJ
- Detectar se um CNPJ é novo (não está no histórico)
- Filtros dinâmicos: cidade, estado, CNAE, data mínima

Todas as funções são seguras — nunca levantam exceção,
retornam None/False em caso de dados inválidos.
"""

from config import CNAES_MERCADO


def is_mercado(registro):
    """Verifica se o registro é de um mercado/supermercado.

    Args:
        registro: dict com os campos do CSV.

    Returns:
        str — O CNAE se for mercado, ou None.
    """
    try:
        cnae = registro.get("cnae", "")
        if not cnae or not isinstance(cnae, str):
            return None
        cnae = cnae.strip()
        if cnae in CNAES_MERCADO:
            return cnae
    except (TypeError, AttributeError):
        pass
    return None


def is_cnpj_valido(cnpj):
    """Valida se o CNPJ tem 14 dígitos numéricos.

    Args:
        cnpj: String com o CNPJ montado.

    Returns:
        bool — True se válido.
    """
    if not cnpj or not isinstance(cnpj, str):
        return False
    return len(cnpj) == 14 and cnpj.isdigit()


def is_novo(cnpj, historico):
    """Verifica se o CNPJ não está no histórico (lookup O(1)).

    Args:
        cnpj: String com o CNPJ completo.
        historico: set de CNPJs já processados.

    Returns:
        bool — True se novo.
    """
    if not cnpj or not historico:
        return True
    return cnpj not in historico


# ============================================================
#  FILTROS DINÂMICOS (reutilizáveis por CLI, API, dashboard)
# ============================================================

def aplicar_filtros(registro, filtros_dict):
    """Aplica filtros dinâmicos a um registro já formatado.

    Retorna True se o registro passa em TODOS os filtros ativos.
    Filtros com valor None são ignorados (não filtram).

    Args:
        registro: dict com campos do registro (formato API).
        filtros_dict: dict com os filtros a aplicar.
            Chaves suportadas:
                cidade   (str)  — código do município (match exato)
                uf       (str)  — sigla do estado, ex: "SP" (case-insensitive)
                cnae     (str)  — código CNAE principal (match exato)
                data_min (str)  — data mínima de início (YYYYMMDD).
                                  Só passa registros com data >= data_min.

    Returns:
        bool — True se o registro passa em todos os filtros.
    """
    if not filtros_dict:
        return True

    # ---- FILTRO: Estado (UF) ----
    uf_filtro = filtros_dict.get("uf")
    if uf_filtro:
        uf_registro = (registro.get("uf") or "").strip().upper()
        if uf_registro != uf_filtro.strip().upper():
            return False

    # ---- FILTRO: Cidade (código do município) ----
    cidade_filtro = filtros_dict.get("cidade")
    if cidade_filtro:
        cidade_registro = (registro.get("municipio") or registro.get("cidade") or "").strip()
        if cidade_registro != cidade_filtro.strip():
            return False

    # ---- FILTRO: CNAE ----
    cnae_filtro = filtros_dict.get("cnae")
    if cnae_filtro:
        cnae_registro = (registro.get("cnae_principal") or registro.get("cnae") or "").strip()
        if cnae_registro != cnae_filtro.strip():
            return False

    # ---- FILTRO: Data mínima de início ----
    data_min = filtros_dict.get("data_min")
    if data_min:
        data_registro = (registro.get("data_inicio") or registro.get("data_inicio_atividade") or "").strip()
        # Comparação lexicográfica funciona para YYYYMMDD
        if not data_registro or data_registro < data_min.strip():
            return False

    return True


def construir_filtros(uf=None, cidade=None, cnae=None, data_min=None):
    """Constrói o dict de filtros a partir de parâmetros individuais.

    Conveniência para montar o dict sem precisar saber a estrutura interna.
    Parâmetros None são omitidos do dict resultante.

    Args:
        uf: Sigla do estado (ex: "SP").
        cidade: Código do município.
        cnae: Código CNAE.
        data_min: Data mínima no formato YYYYMMDD.

    Returns:
        dict — Apenas com os filtros ativos (valores não-None).
    """
    filtros = {}
    if uf:
        filtros["uf"] = uf
    if cidade:
        filtros["cidade"] = cidade
    if cnae:
        filtros["cnae"] = cnae
    if data_min:
        filtros["data_min"] = data_min
    return filtros
