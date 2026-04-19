"""
Módulo de Classificação de Clientes — Deusa Alimentos.

Gerencia o status comercial dos estabelecimentos mapeados:
    - ATIVO: cliente que compra regularmente
    - INATIVO: cliente que parou de comprar
    - NAO_CLIENTE: estabelecimento identificado mas não é cliente

Persistência via SQLite (clientes.db).
"""

import os
import sqlite3
from datetime import datetime

from config import DIR_BASE, logger

# ============================================================
#  CONFIGURAÇÃO
# ============================================================
DB_PATH = os.path.join(DIR_BASE, "clientes.db")

STATUS_VALIDOS = {"ATIVO", "INATIVO", "NAO_CLIENTE"}


# ============================================================
#  BANCO DE DADOS
# ============================================================
def _get_conn():
    """Retorna conexão com o SQLite de clientes."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Cria tabela de classificação de clientes."""
    conn = _get_conn()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS clientes (
            cnpj TEXT PRIMARY KEY,
            status TEXT NOT NULL DEFAULT 'NAO_CLIENTE'
                CHECK(status IN ('ATIVO', 'INATIVO', 'NAO_CLIENTE')),
            notas TEXT DEFAULT '',
            atualizado_em TEXT DEFAULT CURRENT_TIMESTAMP,
            atualizado_por TEXT DEFAULT ''
        )
    """)
    conn.commit()
    conn.close()
    logger.info("Banco de clientes inicializado.")


# ============================================================
#  CRUD
# ============================================================
def classificar(cnpj, status, notas="", usuario=""):
    """Define ou atualiza a classificação de um estabelecimento.

    Args:
        cnpj: CNPJ do estabelecimento (14 dígitos).
        status: ATIVO, INATIVO ou NAO_CLIENTE.
        notas: Observações opcionais.
        usuario: Username de quem fez a classificação.

    Returns:
        dict com resultado da operação.
    """
    if status not in STATUS_VALIDOS:
        return {"sucesso": False, "erro": f"Status inválido: {status}"}

    conn = _get_conn()
    agora = datetime.now().isoformat(timespec="seconds")

    conn.execute("""
        INSERT INTO clientes (cnpj, status, notas, atualizado_em, atualizado_por)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(cnpj) DO UPDATE SET
            status = excluded.status,
            notas = excluded.notas,
            atualizado_em = excluded.atualizado_em,
            atualizado_por = excluded.atualizado_por
    """, (cnpj, status, notas, agora, usuario))
    conn.commit()
    conn.close()

    logger.info(f"Cliente {cnpj} classificado como {status} por {usuario}")
    return {"sucesso": True, "cnpj": cnpj, "status": status}


def obter_status(cnpj):
    """Retorna o status comercial de um CNPJ específico."""
    conn = _get_conn()
    row = conn.execute(
        "SELECT * FROM clientes WHERE cnpj = ?", (cnpj,)
    ).fetchone()
    conn.close()

    if row is None:
        return "NAO_CLIENTE"
    return row["status"]


def obter_todos():
    """Retorna dict {cnpj: status} de todos os clientes classificados."""
    conn = _get_conn()
    rows = conn.execute("SELECT cnpj, status FROM clientes").fetchall()
    conn.close()
    return {row["cnpj"]: row["status"] for row in rows}


def listar_por_status(status=None):
    """Lista clientes filtrados por status.

    Args:
        status: ATIVO, INATIVO ou NAO_CLIENTE. None = todos.

    Returns:
        list de dicts com cnpj, status, notas, atualizado_em, atualizado_por.
    """
    conn = _get_conn()
    if status and status in STATUS_VALIDOS:
        rows = conn.execute(
            "SELECT * FROM clientes WHERE status = ? ORDER BY atualizado_em DESC",
            (status,),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM clientes ORDER BY atualizado_em DESC"
        ).fetchall()
    conn.close()

    return [dict(row) for row in rows]


def calcular_score_regiao(mercados):
    """Calcula score de oportunidade por cidade.

    Score = (não-clientes / total) × 100
    Quanto maior, mais oportunidade de expansão.

    Args:
        mercados: lista de dicts com cnpj e cidade.

    Returns:
        list de dicts com cidade, total, clientes, nao_clientes, score.
    """
    classificacoes = obter_todos()

    # Agrupar por cidade
    cidades = {}
    for m in mercados:
        cidade = (m.get("cidade") or "").strip()
        if not cidade:
            continue
        if cidade not in cidades:
            cidades[cidade] = {"total": 0, "clientes": 0, "nao_clientes": 0}

        cidades[cidade]["total"] += 1
        status = classificacoes.get(m.get("cnpj", ""), "NAO_CLIENTE")
        if status == "ATIVO":
            cidades[cidade]["clientes"] += 1
        else:
            cidades[cidade]["nao_clientes"] += 1

    # Calcular scores
    resultado = []
    for cidade, dados in sorted(cidades.items()):
        score = 0
        if dados["total"] > 0:
            score = round((dados["nao_clientes"] / dados["total"]) * 100)
        resultado.append({
            "cidade": cidade,
            "total": dados["total"],
            "clientes": dados["clientes"],
            "nao_clientes": dados["nao_clientes"],
            "score": score,
        })

    # Ordenar por score descendente (maior oportunidade primeiro)
    resultado.sort(key=lambda x: x["score"], reverse=True)
    return resultado
