"""
Parser de arquivos da Receita Federal.

Responsável por:
- Leitura streaming do CSV (linha por linha, sem carregar na memória)
- Parsing e limpeza de campos
- Montagem de CNPJ completo
- Montagem de endereço completo
- Extração de registro estruturado
- Validação de campos obrigatórios
"""

import csv

from config import (
    ENCODING_CSV,
    BUFFER_LEITURA,
    SEPARADOR,
    logger,
)


# Campos obrigatórios para um registro válido
CAMPOS_OBRIGATORIOS = ["cnpj", "cnae", "uf"]


# ============================================================
#  LEITURA STREAMING
# ============================================================
def stream_linhas(caminho):
    """Gerador que lê o arquivo linha por linha com buffer otimizado.

    Trata erros de encoding automaticamente (errors='replace').
    Se o arquivo não puder ser aberto, loga o erro e retorna vazio.

    Args:
        caminho: Caminho absoluto do arquivo CSV.

    Yields:
        str — cada linha do arquivo (sem strip).
    """
    try:
        with open(caminho, "r", encoding=ENCODING_CSV, errors="replace",
                  buffering=BUFFER_LEITURA) as f:
            for linha in f:
                yield linha
    except UnicodeDecodeError as e:
        logger.error(f"Erro de encoding ao ler '{caminho}': {e}")
    except PermissionError:
        logger.error(f"Sem permissao para ler: {caminho}")
    except OSError as e:
        logger.error(f"Erro de I/O ao ler '{caminho}': {e}")


def stream_registros(caminho):
    """Gerador que lê CSV com cabeçalho e retorna dicts por linha.

    Detecta automaticamente os nomes das colunas pela primeira linha.
    Imprime debug com os nomes encontrados.

    Args:
        caminho: Caminho absoluto do arquivo CSV.

    Yields:
        dict — cada linha como dicionário {nome_coluna: valor}.
    """
    try:
        with open(caminho, "r", encoding=ENCODING_CSV, errors="replace",
                  buffering=BUFFER_LEITURA) as f:
            reader = csv.DictReader(f, delimiter=SEPARADOR)

            # Debug: mostra as colunas detectadas no CSV
            print(f"  [DEBUG] Colunas detectadas no CSV: {reader.fieldnames}")
            logger.info(f"Colunas do CSV: {reader.fieldnames}")

            for registro in reader:
                yield registro
    except PermissionError:
        logger.error(f"Sem permissao para ler: {caminho}")
    except OSError as e:
        logger.error(f"Erro de I/O ao ler '{caminho}': {e}")


def parsear_linha(linha):
    """Faz split e limpeza de aspas de uma linha bruta do CSV.

    Args:
        linha: String da linha já com strip aplicado.

    Returns:
        list de strings com campos limpos, ou None se inválida.
    """
    try:
        campos = linha.split(SEPARADOR)
    except (AttributeError, TypeError):
        return None

    if len(campos) < MIN_COLUNAS:
        return None

    # Limpeza de aspas em passagem única
    try:
        return [c.strip('"') for c in campos]
    except (AttributeError, TypeError):
        return None


# ============================================================
#  VALIDAÇÃO DE CAMPOS
# ============================================================
def validar_campos_obrigatorios(registro):
    """Verifica se os campos obrigatórios estão preenchidos.

    Args:
        registro: dict com os campos do CSV.

    Returns:
        tuple (valido: bool, campos_vazios: list de nomes).
    """
    vazios = []
    for campo in CAMPOS_OBRIGATORIOS:
        valor = registro.get(campo, "")
        if not valor or not str(valor).strip():
            vazios.append(campo)

    return (len(vazios) == 0, vazios)


def validar_data(data_str):
    """Valida se a data está no formato esperado (YYYYMMDD, 8 dígitos).

    Args:
        data_str: String com a data.

    Returns:
        str — a data se válida, ou string vazia.
    """
    if not data_str or not isinstance(data_str, str):
        return ""

    data_limpa = data_str.strip()

    # Formato RF: YYYYMMDD (8 dígitos) ou vazia
    if len(data_limpa) == 8 and data_limpa.isdigit():
        # Validação básica de mês/dia
        mes = int(data_limpa[4:6])
        dia = int(data_limpa[6:8])
        if 1 <= mes <= 12 and 1 <= dia <= 31:
            return data_limpa

    # Data vazia ou "00000000" — aceitar sem erro
    if not data_limpa or data_limpa == "00000000":
        return ""

    # Data em formato inesperado — retorna o que tem
    return data_limpa


# ============================================================
#  MONTAGEM DE CAMPOS
# ============================================================
def montar_cnpj(registro):
    """Extrai o CNPJ do registro.

    Suporta CNPJ como campo único (já completo).
    Remove formatação (pontos, barras, hífens) se houver.

    Args:
        registro: dict com os campos do CSV.

    Returns:
        str — CNPJ limpo (apenas dígitos), ou string vazia.
    """
    try:
        cnpj = registro.get("cnpj", "")
        if cnpj:
            return cnpj.replace(".", "").replace("/", "").replace("-", "").strip()
        return ""
    except (TypeError, AttributeError):
        return ""


def montar_endereco(registro):
    """Monta o endereço completo a partir dos campos do registro.

    Nunca levanta exceção — retorna fallback se dados faltarem.

    Args:
        registro: dict com os campos do CSV.

    Returns:
        str — Endereço formatado.
    """
    logradouro = registro.get("logradouro", "") or ""
    numero = registro.get("numero", "") or ""
    bairro = registro.get("bairro", "") or ""
    municipio = registro.get("municipio", "") or ""
    uf = registro.get("uf", "") or ""
    cep = registro.get("cep", "") or ""

    partes = []

    # Logradouro
    if logradouro:
        partes.append(logradouro)

    # Número
    if numero:
        if str(numero).upper() == "S/N":
            partes.append("S/N")
        else:
            partes.append("N " + str(numero))

    # Bairro
    if bairro:
        partes.append(bairro)

    # Município/UF
    if municipio and uf:
        partes.append(municipio + "/" + uf)
    elif municipio:
        partes.append(municipio)

    # CEP
    if cep:
        partes.append("CEP " + cep)

    return ", ".join(partes) if partes else "Endereco nao disponivel"


def extrair_registro(registro, cnpj, cnae):
    """Extrai um dicionário estruturado de um registro do CSV.

    Se algum campo falhar, usa fallback vazio ao invés de levantar exceção.

    Args:
        registro: dict com os campos do CSV.
        cnpj: CNPJ completo pré-extraído.
        cnae: CNAE principal pré-extraído.

    Returns:
        dict com os campos do registro, ou None se falhar criticamente.
    """
    try:
        return {
            "cnpj": cnpj,
            "nome_fantasia": registro.get("nome_fantasia", ""),
            "cnae_principal": cnae,
            "situacao": registro.get("situacao", ""),
            "data_inicio": registro.get("data_inicio_atividade", ""),
            "uf": registro.get("uf", ""),
            "municipio": registro.get("municipio", ""),
            "endereco": montar_endereco(registro),
        }
    except Exception as e:
        logger.warning(f"Erro ao extrair registro CNPJ {cnpj}: {e}")
        return None
