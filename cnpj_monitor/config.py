"""
Configurações centrais do monitor de estabelecimentos.

Todas as constantes, caminhos e mapeamento de colunas da Receita Federal
ficam aqui. Para alterar o comportamento do sistema, edite apenas este arquivo.
"""

import os
import logging

# ============================================================
#  LOGGING
# ============================================================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("cnpj_monitor")

# ============================================================
#  CAMINHOS
# ============================================================
DIR_BASE = os.path.dirname(os.path.abspath(__file__))

ARQUIVO_DADOS = os.path.join(DIR_BASE, "dados.csv")
ARQUIVO_HISTORICO = os.path.join(DIR_BASE, "historico.json")
ARQUIVO_GEOCACHE = os.path.join(DIR_BASE, "geocache.json")

# ============================================================
#  FILTROS DE CNAE
# ============================================================
# CNAEs considerados "mercado/supermercado"
CNAES_MERCADO = frozenset({"4711302", "4712100"})

# ============================================================
#  FORMATO DO ARQUIVO DA RECEITA FEDERAL
# ============================================================
SEPARADOR = ","
ENCODING_CSV = "utf-8"
MIN_COLUNAS = 3

# ============================================================
#  PERFORMANCE
# ============================================================
BUFFER_LEITURA = 64 * 1024   # 64 KB — reduz syscalls em arquivos grandes
LOG_INTERVALO = 500_000      # Log de progresso a cada N linhas

# ============================================================
#  MAPEAMENTO DE COLUNAS - LAYOUT RECEITA FEDERAL
# ============================================================
# Layout oficial do arquivo de Estabelecimentos da RF:
# Os arquivos NÃO possuem cabeçalho. O separador é ";"
#
# Índice | Campo
# -------|-------------------------------
#   0    | CNPJ Básico (8 dígitos)
#   1    | CNPJ Ordem (4 dígitos)
#   2    | CNPJ DV (2 dígitos)
#   3    | Identificador Matriz/Filial
#   4    | Nome Fantasia
#   5    | Situação Cadastral
#   6    | Data Situação Cadastral
#   7    | Motivo Situação Cadastral
#   8    | Nome Cidade Exterior
#   9    | Código País
#  10    | Data Início Atividade
#  11    | CNAE Fiscal Principal
#  12    | CNAE Fiscal Secundária
#  13    | Tipo de Logradouro
#  14    | Logradouro
#  15    | Número
#  16    | Complemento
#  17    | Bairro
#  18    | CEP
#  19    | UF
#  20    | Município (código)
#  21    | DDD 1
#  22    | Telefone 1
#  23    | DDD 2
#  24    | Telefone 2
#  25    | DDD Fax
#  26    | Fax
#  27    | Correio Eletrônico
#  28    | Situação Especial
#  29    | Data Situação Especial

COL_CNPJ_BASE = 0
COL_CNPJ_ORDEM = 1
COL_CNPJ_DV = 2
COL_NOME_FANTASIA = 4
COL_SITUACAO = 5
COL_DATA_INICIO = 10
COL_CNAE_PRINCIPAL = 11
COL_TIPO_LOGRADOURO = 13
COL_LOGRADOURO = 14
COL_NUMERO = 15
COL_COMPLEMENTO = 16
COL_BAIRRO = 17
COL_CEP = 18
COL_UF = 19
COL_MUNICIPIO = 20
