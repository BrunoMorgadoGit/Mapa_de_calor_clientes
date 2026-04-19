"""
Autenticação JWT + SQLite para a plataforma Deusa Alimentos.

Funcionalidades:
    - Banco de usuários em SQLite (criado automaticamente)
    - Hash de senhas com hashlib (sem dependências extras)
    - Geração/validação de tokens JWT via PyJWT
    - Decorator @login_required(roles=[]) para Flask

Usuários padrão criados automaticamente na primeira execução:
    admin     / admin123   → ADMIN
    logistica / log123     → LOGISTICA
    comercial / com123     → COMERCIAL
"""

import os
import sqlite3
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt
from flask import request, jsonify, g

from config import DIR_BASE, logger

# ============================================================
#  CONFIGURAÇÃO
# ============================================================
DB_PATH = os.path.join(DIR_BASE, "users.db")
JWT_SECRET = os.environ.get("JWT_SECRET", "deusa-alimentos-secret-key-2026-xK9m")
JWT_EXPIRY_HOURS = 24
JWT_ALGORITHM = "HS256"

# Perfis válidos
PERFIS = {"ADMIN", "LOGISTICA", "COMERCIAL"}

# Mapeamento de módulos por perfil
MODULOS_POR_PERFIL = {
    "ADMIN": ["dashboard", "mapa", "comercial", "logistica"],
    "LOGISTICA": ["mapa", "logistica"],
    "COMERCIAL": ["dashboard", "mapa", "comercial"],
}


# ============================================================
#  HASH DE SENHAS
# ============================================================
def _hash_senha(senha, salt=None):
    """Gera hash SHA-256 com salt para a senha."""
    if salt is None:
        salt = secrets.token_hex(16)
    h = hashlib.sha256(f"{salt}:{senha}".encode("utf-8")).hexdigest()
    return f"{salt}${h}"


def _verificar_senha(senha, hash_armazenado):
    """Verifica se uma senha corresponde ao hash armazenado."""
    if "$" not in hash_armazenado:
        return False
    salt = hash_armazenado.split("$")[0]
    return _hash_senha(senha, salt) == hash_armazenado


# ============================================================
#  BANCO DE DADOS
# ============================================================
def _get_conn():
    """Retorna conexão com o SQLite de usuários."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Cria tabela de usuários e insere usuários padrão se não existirem."""
    conn = _get_conn()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            nome TEXT NOT NULL,
            perfil TEXT NOT NULL CHECK(perfil IN ('ADMIN', 'LOGISTICA', 'COMERCIAL')),
            ativo INTEGER DEFAULT 1,
            criado_em TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Inserir usuários padrão (apenas se tabela vazia)
    count = cursor.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    if count == 0:
        usuarios_padrao = [
            ("admin", "admin123", "Administrador", "ADMIN"),
            ("logistica", "log123", "Equipe Logística", "LOGISTICA"),
            ("comercial", "com123", "Equipe Comercial", "COMERCIAL"),
        ]
        for username, senha, nome, perfil in usuarios_padrao:
            cursor.execute(
                "INSERT INTO users (username, password_hash, nome, perfil) VALUES (?, ?, ?, ?)",
                (username, _hash_senha(senha), nome, perfil),
            )
        logger.info(f"Criados {len(usuarios_padrao)} usuários padrão.")

    conn.commit()
    conn.close()


# ============================================================
#  AUTENTICAÇÃO
# ============================================================
def autenticar(username, senha):
    """Verifica credenciais e retorna dados do usuário ou None.

    Returns:
        dict com id, username, nome, perfil, modulos — ou None.
    """
    conn = _get_conn()
    row = conn.execute(
        "SELECT * FROM users WHERE username = ? AND ativo = 1",
        (username,),
    ).fetchone()
    conn.close()

    if row is None:
        return None

    if not _verificar_senha(senha, row["password_hash"]):
        return None

    perfil = row["perfil"]
    return {
        "id": row["id"],
        "username": row["username"],
        "nome": row["nome"],
        "perfil": perfil,
        "modulos": MODULOS_POR_PERFIL.get(perfil, []),
    }


def gerar_token(user_data):
    """Gera um JWT para o usuário autenticado."""
    payload = {
        "sub": str(user_data["id"]),
        "username": user_data["username"],
        "nome": user_data["nome"],
        "perfil": user_data["perfil"],
        "modulos": user_data["modulos"],
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verificar_token(token):
    """Decodifica e valida um JWT. Retorna payload ou None."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


# ============================================================
#  DECORATOR FLASK
# ============================================================
def login_required(roles=None):
    """Decorator que protege rotas Flask com JWT.

    Args:
        roles: lista de perfis permitidos (e.g. ["ADMIN", "COMERCIAL"]).
               Se None, qualquer perfil autenticado tem acesso.

    Uso:
        @app.route("/api/rota-protegida")
        @login_required(roles=["ADMIN"])
        def rota():
            user = g.current_user  # dados do usuário logado
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            token = None

            # Tentar obter token de múltiplas fontes
            auth_header = request.headers.get("Authorization", "")
            if auth_header.startswith("Bearer "):
                token = auth_header[7:]

            if not token:
                token = request.cookies.get("token")

            if not token:
                return jsonify({"erro": "Token de autenticação não fornecido"}), 401

            payload = verificar_token(token)
            if payload is None:
                return jsonify({"erro": "Token inválido ou expirado"}), 401

            # Verificar perfil
            if roles and payload.get("perfil") not in roles:
                return jsonify({"erro": "Acesso não autorizado para este perfil"}), 403

            g.current_user = payload
            return f(*args, **kwargs)
        return wrapper
    return decorator
