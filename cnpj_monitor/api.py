"""
API Flask — Plataforma Corporativa Deusa Alimentos.

Endpoints:
    --- Autenticação ---
    POST /api/login          → Login (retorna JWT)
    POST /api/logout         → Logout (limpa cookie)
    GET  /api/me             → Dados do usuário logado

    --- Mercados ---
    GET  /                   → Serve o frontend (login ou app)
    GET  /api/mercados       → Todos os mercados do CSV
    GET  /api/mercados/novos → Apenas novos mercados
    GET  /api/mercados/mapa  → Dados do Overpass API (OpenStreetMap)
    GET  /api/stats          → Estatísticas do monitor
    POST /api/processar      → Dispara nova execução do monitor

    --- Módulo Comercial ---
    GET  /api/clientes            → Lista classificações
    POST /api/clientes/classificar → Classifica estabelecimento
    GET  /api/inteligencia/score  → Score de oportunidade por região

Uso:
    python api.py
    → Abre http://localhost:5000
"""

import os
import json
import urllib.request
import urllib.parse
import urllib.error

from flask import Flask, jsonify, request, send_from_directory, make_response, g
from flask_cors import CORS

import monitor
import auth
import clientes
from config import logger

# ============================================================
#  SETUP
# ============================================================
DIR_BASE = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(DIR_BASE, "frontend")

app = Flask(__name__, static_folder=FRONTEND_DIR)
CORS(app, supports_credentials=True)

# Inicializar bancos de dados
auth.init_db()
clientes.init_db()


# ============================================================
#  ROTAS — AUTENTICAÇÃO
# ============================================================
@app.route("/api/login", methods=["POST"])
def api_login():
    """Autentica o usuário e retorna JWT."""
    data = request.get_json(silent=True) or {}
    username = data.get("username", "").strip()
    senha = data.get("password", "").strip()

    if not username or not senha:
        return jsonify({"erro": "Usuário e senha são obrigatórios"}), 400

    user = auth.autenticar(username, senha)
    if user is None:
        return jsonify({"erro": "Credenciais inválidas"}), 401

    token = auth.gerar_token(user)

    resp = make_response(jsonify({
        "sucesso": True,
        "usuario": {
            "id": user["id"],
            "username": user["username"],
            "nome": user["nome"],
            "perfil": user["perfil"],
            "modulos": user["modulos"],
        },
        "token": token,
    }))

    # Cookie httponly para segurança
    resp.set_cookie(
        "token", token,
        httponly=True,
        samesite="Lax",
        max_age=86400,  # 24h
        path="/"
    )
    return resp


@app.route("/api/logout", methods=["POST"])
def api_logout():
    """Remove o cookie de autenticação."""
    resp = make_response(jsonify({"sucesso": True}))
    resp.set_cookie("token", "", expires=0, path="/")
    return resp


@app.route("/api/me")
def api_me():
    """Retorna dados do usuário logado (verifica token)."""
    token = request.cookies.get("token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]

    if not token:
        return jsonify({"autenticado": False}), 401

    payload = auth.verificar_token(token)
    if payload is None:
        return jsonify({"autenticado": False}), 401

    return jsonify({
        "autenticado": True,
        "usuario": {
            "id": payload["sub"],
            "username": payload["username"],
            "nome": payload["nome"],
            "perfil": payload["perfil"],
            "modulos": payload["modulos"],
        },
    })


# ============================================================
#  ROTAS — FRONTEND
# ============================================================
@app.route("/")
def index():
    """Serve a página principal do frontend."""
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.route("/login")
def login_page():
    """Serve a página de login."""
    return send_from_directory(FRONTEND_DIR, "login.html")


@app.route("/<path:filename>")
def static_files(filename):
    """Serve arquivos estáticos (CSS, JS, etc.)."""
    return send_from_directory(FRONTEND_DIR, filename)


# ============================================================
#  ROTAS — MERCADOS (protegidas)
# ============================================================
@app.route("/api/mercados")
@auth.login_required()
def api_mercados():
    """Retorna TODOS os mercados do CSV com flag is_novo e status_cliente."""
    pagina = request.args.get("page", 1, type=int)
    limite = request.args.get("limit", 200, type=int)
    uf = request.args.get("uf")
    cidade = request.args.get("cidade")

    filtros_dict = {}
    if uf:
        filtros_dict["uf"] = uf
    if cidade:
        filtros_dict["cidade"] = cidade

    resultado = monitor.listar_todos_mercados(
        pagina=pagina,
        limite=limite,
        filtros_dict=filtros_dict if filtros_dict else None,
    )

    # Enriquecer com status de cliente
    classificacoes = clientes.obter_todos()
    for m in resultado.get("mercados", []):
        cnpj = m.get("cnpj", "")
        m["status_cliente"] = classificacoes.get(cnpj, "NAO_CLIENTE")

    return jsonify(resultado)


@app.route("/api/mercados/novos")
@auth.login_required()
def api_mercados_novos():
    """Retorna apenas os mercados novos (não no histórico)."""
    pagina = request.args.get("page", 1, type=int)
    limite = request.args.get("limit", 200, type=int)
    uf = request.args.get("uf")
    cidade = request.args.get("cidade")

    filtros_dict = {}
    if uf:
        filtros_dict["uf"] = uf
    if cidade:
        filtros_dict["cidade"] = cidade

    resultado = monitor.executar(
        pagina=pagina,
        limite=limite,
        filtros_dict=filtros_dict if filtros_dict else None,
    )
    return jsonify(resultado)


@app.route("/api/mercados/mapa")
@auth.login_required()
def api_mercados_mapa():
    """Proxy para Overpass API — busca mercados do OpenStreetMap em Tupã."""
    query = (
        '[out:json][timeout:25];'
        '('
        'node["shop"~"supermarket|convenience"](-21.9686,-50.5517,-21.9022,-50.4728);'
        'way["shop"~"supermarket|convenience"](-21.9686,-50.5517,-21.9022,-50.4728);'
        ');'
        'out center;'
    )

    try:
        # POST is more reliable for Overpass queries
        post_data = urllib.parse.urlencode({"data": query}).encode("utf-8")
        req = urllib.request.Request(
            "https://overpass-api.de/api/interpreter",
            data=post_data,
            method="POST",
        )
        req.add_header("User-Agent", "DeusaAlimentos/1.0")
        req.add_header("Content-Type", "application/x-www-form-urlencoded")

        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))

        mercados = []
        for item in data.get("elements", []):
            lat = item.get("lat") or (item.get("center", {}).get("lat"))
            lon = item.get("lon") or (item.get("center", {}).get("lon"))
            tags = item.get("tags", {})

            if lat and lon:
                mercados.append({
                    "nome": tags.get("name", "Mercado/Conveniência"),
                    "endereco": tags.get("addr:street", "Via mapa"),
                    "cidade": tags.get("addr:city", "Tupa"),
                    "uf": "SP",
                    "lat": lat,
                    "lng": lon,
                    "tipo": tags.get("shop", "supermarket"),
                    "fonte": "openstreetmap",
                })

        return jsonify({
            "sucesso": True,
            "total": len(mercados),
            "mercados": mercados,
        })

    except Exception as e:
        logger.warning(f"Overpass API falhou: {e}")
        # Return empty success so frontend doesn't break
        return jsonify({
            "sucesso": True,
            "total": 0,
            "mercados": [],
            "aviso": f"Overpass API indisponível: {str(e)}",
        })


@app.route("/api/stats")
@auth.login_required()
def api_stats():
    """Retorna estatísticas do monitor."""
    resultado = monitor.listar_todos_mercados(pagina=1, limite=1)
    return jsonify({
        "sucesso": True,
        "resumo": resultado.get("resumo", {}),
    })


@app.route("/api/processar", methods=["POST"])
@auth.login_required(roles=["ADMIN"])
def api_processar():
    """Dispara nova execução do monitor."""
    resultado = monitor.executar()
    return jsonify(resultado)


# ============================================================
#  ROTAS — MÓDULO COMERCIAL
# ============================================================
@app.route("/api/clientes")
@auth.login_required(roles=["ADMIN", "COMERCIAL"])
def api_clientes():
    """Lista classificações de clientes."""
    status = request.args.get("status")
    lista = clientes.listar_por_status(status)
    return jsonify({"sucesso": True, "clientes": lista, "total": len(lista)})


@app.route("/api/clientes/classificar", methods=["POST"])
@auth.login_required(roles=["ADMIN", "COMERCIAL"])
def api_classificar_cliente():
    """Classifica ou reclassifica um estabelecimento."""
    data = request.get_json(silent=True) or {}
    cnpj = data.get("cnpj", "").strip()
    status = data.get("status", "").strip().upper()
    notas = data.get("notas", "").strip()

    if not cnpj:
        return jsonify({"erro": "CNPJ é obrigatório"}), 400

    usuario = g.current_user.get("username", "sistema")
    resultado = clientes.classificar(cnpj, status, notas, usuario)

    if resultado["sucesso"]:
        return jsonify(resultado)
    return jsonify(resultado), 400


@app.route("/api/inteligencia/score")
@auth.login_required(roles=["ADMIN", "COMERCIAL"])
def api_score():
    """Retorna score de oportunidade por região."""
    res = monitor.listar_todos_mercados(pagina=1, limite=9999)
    mercados = res.get("mercados", [])
    scores = clientes.calcular_score_regiao(mercados)
    return jsonify({"sucesso": True, "scores": scores})


# ============================================================
#  MAIN
# ============================================================
if __name__ == "__main__":
    print("\n" + "=" * 50)
    print("  🗺️  Deusa Alimentos — Plataforma Corporativa")
    print("  📍 http://localhost:5000")
    print("=" * 50 + "\n")
    app.run(debug=True, host="0.0.0.0", port=5000)
