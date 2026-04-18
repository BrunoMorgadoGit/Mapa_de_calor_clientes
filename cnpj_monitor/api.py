"""
API Flask — Integra cnpj_monitor com o frontend Deusa Alimentos.

Endpoints:
    GET  /                  → Serve o frontend
    GET  /api/mercados      → Todos os mercados do CSV (novos + existentes)
    GET  /api/mercados/novos → Apenas novos mercados
    GET  /api/mercados/mapa → Dados do Overpass API (OpenStreetMap)
    GET  /api/stats         → Estatísticas do monitor
    POST /api/processar     → Dispara nova execução do monitor

Uso:
    python api.py
    → Abre http://localhost:5000
"""

import os
import json
import urllib.request
import urllib.parse
import urllib.error

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

import monitor
from config import logger

# ============================================================
#  SETUP
# ============================================================
DIR_BASE = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(DIR_BASE, "frontend")

app = Flask(__name__, static_folder=FRONTEND_DIR)
CORS(app)


# ============================================================
#  ROTAS — FRONTEND
# ============================================================
@app.route("/")
def index():
    """Serve a página principal do frontend."""
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.route("/<path:filename>")
def static_files(filename):
    """Serve arquivos estáticos (CSS, JS, etc.)."""
    return send_from_directory(FRONTEND_DIR, filename)


# ============================================================
#  ROTAS — API
# ============================================================
@app.route("/api/mercados")
def api_mercados():
    """Retorna TODOS os mercados do CSV com flag is_novo."""
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
    return jsonify(resultado)


@app.route("/api/mercados/novos")
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
def api_stats():
    """Retorna estatísticas do monitor."""
    resultado = monitor.listar_todos_mercados(pagina=1, limite=1)
    return jsonify({
        "sucesso": True,
        "resumo": resultado.get("resumo", {}),
    })


@app.route("/api/processar", methods=["POST"])
def api_processar():
    """Dispara nova execução do monitor."""
    resultado = monitor.executar()
    return jsonify(resultado)


# ============================================================
#  MAIN
# ============================================================
if __name__ == "__main__":
    print("\n" + "=" * 50)
    print("  🗺️  Deusa Alimentos — Monitor Integrado")
    print("  📍 http://localhost:5000")
    print("=" * 50 + "\n")
    app.run(debug=True, host="0.0.0.0", port=5000)
