/**
 * Deusa Alimentos — Plataforma de Inteligência Comercial
 * Frontend Application com autenticação e módulos.
 */

// ============================================================
//  CONFIG
// ============================================================
const API = window.location.origin;
const CENTER = [-21.935, -50.512];
const ZOOM = 14;

// ============================================================
//  STATE & GLOBALS
// ============================================================
const state = { rf: [], osm: [], user: null };
let map, pins;
let chartSources, chartCities;

// ============================================================
//  INIT
// ============================================================
document.addEventListener("DOMContentLoaded", async () => {
    // Auth guard — check if user is logged in
    const authed = await checkAuth();
    if (!authed) {
        window.location.href = "/login";
        return;
    }

    initNavigation();
    initMap();
    bindEvents();
    loadAll();

    // Load commercial module data if user has access
    if (state.user && state.user.modulos.includes("comercial")) {
        loadComercialData();
    }
});

// ============================================================
//  AUTHENTICATION
// ============================================================
async function checkAuth() {
    try {
        const res = await fetch(API + "/api/me", { credentials: "include" });
        if (!res.ok) return false;
        const data = await res.json();
        if (!data.autenticado) return false;

        state.user = data.usuario;
        applyUserProfile(data.usuario);
        return true;
    } catch (e) {
        return false;
    }
}

function applyUserProfile(user) {
    // Display user info in header
    const nameEl = $("user-display-name");
    const badgeEl = $("user-display-perfil");
    if (nameEl) nameEl.textContent = user.nome;
    if (badgeEl) badgeEl.textContent = user.perfil;

    // Show only allowed modules in nav
    const modulos = user.modulos || [];
    document.querySelectorAll("#main-nav .main-nav-list li[data-module]").forEach(li => {
        const mod = li.getAttribute("data-module");
        if (!modulos.includes(mod)) {
            li.style.display = "none";
        } else {
            li.style.display = "";
        }
    });

    // Navigate to the user's first allowed module
    // (e.g. LOGISTICA opens directly on Mapa instead of Dashboard)
    const firstAllowed = document.querySelector(`#main-nav li[data-module="${modulos[0]}"] .nav-btn`);
    if (firstAllowed) {
        document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
        firstAllowed.click();
    }
}

async function logout() {
    try {
        await fetch(API + "/api/logout", { method: "POST", credentials: "include" });
    } catch (e) { /* ignore */ }
    window.location.href = "/login";
}

// ============================================================
//  NAVIGATION (TABS)
// ============================================================
function initNavigation() {
    const navBtns = document.querySelectorAll(".main-nav-list .nav-btn");
    navBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            navBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            const targetId = btn.getAttribute("data-target");
            document.querySelectorAll(".view-layer").forEach(v => v.classList.add("view-hidden"));
            document.getElementById(targetId).classList.remove("view-hidden");

            // Trigger map resize if map became visible
            if (targetId === "view-map" && map) {
                setTimeout(() => map.invalidateSize(), 150);
            }
        });
    });
}

// ============================================================
//  MAP
// ============================================================
function initMap() {
    map = L.map("map", { center: CENTER, zoom: ZOOM, zoomControl: false });

    // Zoom control on top-right to avoid sidebar overlap
    L.control.zoom({ position: 'topright' }).addTo(map);

    L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        {
            attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
            subdomains: "abcd",
            maxZoom: 19,
        }
    ).addTo(map);

    pins = L.layerGroup().addTo(map);
}

// ============================================================
//  EVENTS
// ============================================================
function bindEvents() {
    $("input-busca").addEventListener("input", debounce(render, 180));
    $("filter-tipo").addEventListener("change", render);
    $("filter-cidade").addEventListener("change", render);

    const filterCliente = $("filter-cliente");
    if (filterCliente) filterCliente.addEventListener("change", render);

    $("btn-refresh").addEventListener("click", runMonitor);

    const rs = document.querySelector("#main-nav .main-nav-bottom .nav-btn");
    if (rs) rs.addEventListener("click", runMonitor);

    // Sidebar toggle
    const toggleBtn = $("btn-toggle-sidebar");
    if (toggleBtn) {
        toggleBtn.addEventListener("click", () => {
            const sidebar = $("sidebar");
            if (sidebar) sidebar.classList.toggle("collapsed");
        });
    }

    // Logout
    const logoutBtn = $("btn-logout");
    if (logoutBtn) logoutBtn.addEventListener("click", logout);
}

// ============================================================
//  DATA LOADER
// ============================================================
async function loadAll() {
    setGlobalStatus("Carregando inteligência...", "loading");

    try {
        const [rfRes, osmRes] = await Promise.allSettled([
            api("/api/mercados?limit=500"),
            api("/api/mercados/mapa"),
        ]);

        if (rfRes.status === "fulfilled" && rfRes.value.sucesso) {
            state.rf = (rfRes.value.mercados || []).map((m) => ({
                ...m,
                src: "rf",
                status: m.is_novo ? "novo" : "existente",
                status_cliente: m.status_cliente || "NAO_CLIENTE",
            }));
        }

        if (osmRes.status === "fulfilled" && osmRes.value.sucesso) {
            state.osm = (osmRes.value.mercados || []).map((m) => ({
                ...m,
                src: "osm",
                status: "osm",
                status_cliente: "NAO_CLIENTE",
            }));
        }

        fillCityFilter();
        updateKPIs();
        renderCharts();
        generateInsights();
        render();

        const t = state.rf.length + state.osm.length;
        setGlobalStatus(`Sincronizado — ${t} estabelecimentos`, "ok");
    } catch(err) {
        setGlobalStatus("Falha ao sincronizar dados", "err");
    }
}

async function api(path) {
    const r = await fetch(API + path, { credentials: "include" });
    if (r.status === 401) {
        window.location.href = "/login";
        throw new Error("Not authenticated");
    }
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
}

// ============================================================
//  RENDER MAP & LIST
// ============================================================
function render() {
    const data = filtered();
    drawPins(data);
    drawCards(data);
    $("results-count").textContent = `${data.length} filtrados`;
}

function filtered() {
    const tipo = $("filter-tipo").value;
    const cidade = $("filter-cidade").value;
    const clienteFilter = $("filter-cliente") ? $("filter-cliente").value : "";
    const q = $("input-busca").value.toLowerCase().trim();

    let d = [...state.rf, ...state.osm];
    if (tipo !== "todos") d = d.filter((m) => m.status === tipo);
    if (cidade) d = d.filter((m) => (m.cidade || "").toLowerCase() === cidade.toLowerCase());
    if (clienteFilter) d = d.filter((m) => m.status_cliente === clienteFilter);
    if (q)
        d = d.filter(
            (m) =>
                (m.nome || "").toLowerCase().includes(q) ||
                (m.cidade || "").toLowerCase().includes(q) ||
                (m.endereco || "").toLowerCase().includes(q) ||
                (m.cnpj || "").includes(q)
        );
    return d;
}

// ============================================================
//  MAP VISUALS & CARDS
// ============================================================
function getPinClass(m) {
    if (m.src === "osm") return "pin-osm";
    if (m.status_cliente === "ATIVO") return "pin-ativo";
    if (m.status_cliente === "INATIVO") return "pin-inativo";
    if (m.status === "novo") return "pin-novo";
    return "pin-existente";
}

function drawPins(data) {
    pins.clearLayers();
    data.forEach((m) => {
        if (!m.lat || !m.lng) return;
        const sz = m.status_cliente === "ATIVO" ? 14 : m.status === "novo" ? 14 : 11;
        const icon = L.divIcon({
            className: getPinClass(m),
            iconSize: [sz, sz],
            iconAnchor: [sz / 2, sz / 2],
            popupAnchor: [0, -(sz / 2) - 6],
        });
        L.marker([m.lat, m.lng], { icon })
            .addTo(pins)
            .bindPopup(popupHTML(m), { maxWidth: 300, minWidth: 240 });
    });
}

function popupHTML(m) {
    const statusLabel = {
        "ATIVO": "✅ Cliente Ativo",
        "INATIVO": "⏸️ Inativo",
        "NAO_CLIENTE": "🔵 Não Cliente"
    };
    const clienteStatus = statusLabel[m.status_cliente] || "🔵 Não Cliente";

    const canClassify = state.user && (state.user.perfil === "ADMIN" || state.user.perfil === "COMERCIAL");

    let classifyBtns = "";
    if (canClassify && m.cnpj) {
        classifyBtns = `<div class="popup-classify-btns">
            <button class="popup-classify-btn green" onclick="classificarCliente('${m.cnpj}','ATIVO')">✅ Ativo</button>
            <button class="popup-classify-btn gray" onclick="classificarCliente('${m.cnpj}','INATIVO')">⏸️ Inativo</button>
        </div>`;
    }

    return `<div class="popup-card">
        <h3>${esc(m.nome || "Sem nome")}</h3>
        <div style="font-size:.65rem;font-weight:700;color:var(--slate-500);margin-bottom:8px;">${clienteStatus}</div>
        <div class="popup-card-rows">
            <div class="popup-row">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <span>${esc(m.endereco || "Endereço indisponível")}</span>
            </div>
            ${m.cidade ? `<div class="popup-row">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                <span>${esc(m.cidade)}${m.uf ? " / " + m.uf : ""}</span>
            </div>` : ""}
        </div>
        ${m.cnpj ? `<div class="popup-card-cnpj">CNPJ ${fmtCnpj(m.cnpj)}</div>` : ""}
        ${classifyBtns}
    </div>`;
}

async function classificarCliente(cnpj, status) {
    try {
        const res = await fetch(API + "/api/clientes/classificar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ cnpj, status }),
        });
        const data = await res.json();
        if (data.sucesso) {
            // Update local state
            [...state.rf].forEach(m => {
                if (m.cnpj === cnpj) m.status_cliente = status;
            });
            render();
            updateKPIs();
            // Close any open popup
            map.closePopup();
        }
    } catch (e) {
        console.error("Falha ao classificar:", e);
    }
}
window.classificarCliente = classificarCliente;

function drawCards(data) {
    const el = $("card-list");

    if (!data.length) {
        el.innerHTML = `<div class="empty-state" style="padding:24px; text-align:center; color:var(--slate-400);">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:12px; opacity:0.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <p style="font-size:0.8rem; font-weight:600">Nenhum mercado corresponde aos filtros.</p></div>`;
        return;
    }

    el.innerHTML = data
        .map(
            (m, i) => `<div class="m-card" data-i="${i}" onclick="selectCard(${i},${m.lat || 0},${m.lng || 0})">
        <div class="m-card-stripe ${m.status_cliente === 'ATIVO' ? 'novo' : m.status}"></div>
        <div class="m-card-body">
            <div class="m-card-top">
                <span class="m-card-name">${esc(m.nome || "Sem nome")}</span>
                <span class="m-card-badge ${m.status}">${m.status_cliente === "ATIVO" ? "Cliente" : m.status === "novo" ? "Novo" : m.status === "existente" ? "RF" : "OSM"}</span>
            </div>
            <div class="m-card-addr">${esc(m.endereco || "—")}</div>
            <div class="m-card-meta">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                ${esc(m.cidade || "")}${m.uf ? " · " + m.uf : ""}
                ${m.cnpj ? ` · ${fmtCnpj(m.cnpj)}` : ""}
            </div>
        </div>
    </div>`
        )
        .join("");
}

function selectCard(i, lat, lng) {
    if (!lat || !lng) return;
    document.querySelectorAll(".m-card.active").forEach((c) => c.classList.remove("active"));
    const card = document.querySelector(`.m-card[data-i="${i}"]`);
    if (card) card.classList.add("active");
    map.flyTo([lat, lng], 17, { animate: true, duration: 0.8 });

    pins.eachLayer((l) => {
        const p = l.getLatLng();
        if (Math.abs(p.lat - lat) < 0.0002 && Math.abs(p.lng - lng) < 0.0002) {
            setTimeout(() => l.openPopup(), 450);
        }
    });
}
window.selectCard = selectCard;

function zoomTo(lat, lng) {
    map.flyTo([lat, lng], 18, { animate: true, duration: 0.6 });
}
window.zoomTo = zoomTo;

// ============================================================
//  DASHBOARD METRICS & CHARTS
// ============================================================
function updateKPIs() {
    const total = state.rf.length + state.osm.length;
    const novos = state.rf.filter(m => m.status === "novo").length;
    const clientesAtivos = state.rf.filter(m => m.status_cliente === "ATIVO").length;
    const cidadesCount = new Set([...state.rf, ...state.osm].map(m => (m.cidade || "").toLowerCase()).filter(Boolean)).size;

    animNum("dash-kpi-total", total);
    animNum("dash-kpi-novos", novos);
    animNum("dash-kpi-clientes", clientesAtivos);
    animNum("dash-kpi-cidades", cidadesCount);

    animNum("side-kpi-total", total);
    animNum("side-kpi-novos", novos);
}

function renderCharts() {
    if (!window.Chart) return;

    const BRAND_YELLOW = "#FFD500";
    const BRAND_RED = "#E30613";
    const BRAND_BLUE = "#0057A4";
    const EMERALD = "#10b981";

    const cntNovos = state.rf.filter(m => m.status === "novo").length;
    const cntExistentes = state.rf.filter(m => m.status === "existente").length;
    const cntOsm = state.osm.length;
    const cntAtivos = state.rf.filter(m => m.status_cliente === "ATIVO").length;

    const ctxSrc = document.getElementById('chart-sources').getContext('2d');
    if (chartSources) chartSources.destroy();

    chartSources = new Chart(ctxSrc, {
        type: 'doughnut',
        data: {
            labels: ['Clientes Ativos', 'Novos (RF)', 'Histórico (RF)', 'OpenStreetMap'],
            datasets: [{
                data: [cntAtivos, cntNovos, cntExistentes, cntOsm],
                backgroundColor: [EMERALD, BRAND_YELLOW, BRAND_BLUE, BRAND_RED],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 10, padding: 15, font: { family: 'Inter' } } }
            }
        }
    });

    // City Concentration Chart
    const cityCounts = {};
    [...state.rf, ...state.osm].forEach(m => {
        if(m.cidade) {
            const c = processCityName(m.cidade);
            cityCounts[c] = (cityCounts[c] || 0) + 1;
        }
    });

    const sortedCities = Object.entries(cityCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    const ctxCities = document.getElementById('chart-cities').getContext('2d');
    if (chartCities) chartCities.destroy();

    chartCities = new Chart(ctxCities, {
        type: 'bar',
        data: {
            labels: sortedCities.map(c => c[0]),
            datasets: [{
                label: ' Volume de Mercados',
                data: sortedCities.map(c => c[1]),
                backgroundColor: BRAND_BLUE,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: "#f1f5f9" }, border: { display:false } },
                x: { grid: { display: false }, border: { display:false }, ticks: { font: { family: 'Inter'} } }
            }
        }
    });
}

function generateInsights() {
    const els = document.getElementById("insights-container");
    const total = state.rf.length + state.osm.length;
    const novos = state.rf.filter(m => m.status === "novo").length;
    const clientesAtivos = state.rf.filter(m => m.status_cliente === "ATIVO").length;

    if (total === 0) {
        els.innerHTML = `<p class="insight-text">Sem dados suficientes para gerar insights operacionais.</p>`;
        return;
    }

    const cityCounts = {};
    [...state.rf, ...state.osm].forEach(m => {
        if(m.cidade) {
            const c = processCityName(m.cidade);
            cityCounts[c] = (cityCounts[c] || 0) + 1;
        }
    });

    let topCity = { name: "Desconhecida", count: 0 };
    Object.entries(cityCounts).forEach(([name, count]) => {
        if(count > topCity.count) topCity = { name, count };
    });

    const percentCity = Math.round((topCity.count / total) * 100);
    const taxaConversao = total > 0 ? Math.round((clientesAtivos / total) * 100) : 0;

    let html = "";

    if (clientesAtivos > 0) {
        html += `<div class="insight-item positive">
            <p class="insight-text">Taxa de conversão: <strong>${taxaConversao}%</strong> dos estabelecimentos mapeados são clientes ativos. ${taxaConversao < 30 ? "Há grande potencial de expansão!" : "Boa cobertura comercial."}</p>
        </div>`;
    }

    if (novos > 0) {
        html += `<div class="insight-item positive">
            <p class="insight-text"><strong>${novos} novos mercados</strong> detectados via Receita Federal — potenciais aberturas de pontos de venda.</p>
        </div>`;
    }

    if(topCity.count > 0) {
        html += `<div class="insight-item">
            <p class="insight-text"><strong>${topCity.name}</strong> concentra <strong>${percentCity}%</strong> (${topCity.count}) da base mapeada.</p>
        </div>`;
    }

    els.innerHTML = html;
}

function processCityName(cName) {
    return cName.split(' ')[0].replace(/[^a-zA-ZáàâãéèêíïóôõöúçñÁÀÂÃÉÈÍÏÓÔÕÖÚÇÑ]/g, "");
}

// ============================================================
//  COMERCIAL MODULE
// ============================================================
async function loadComercialData() {
    try {
        const [scoreRes] = await Promise.allSettled([
            api("/api/inteligencia/score"),
        ]);

        if (scoreRes.status === "fulfilled" && scoreRes.value.sucesso) {
            renderScoreTable(scoreRes.value.scores);
        }

        renderOportunidades();
    } catch(e) {
        console.error("Erro ao carregar dados comerciais:", e);
    }
}

function renderScoreTable(scores) {
    const tbody = $("score-table-body");
    if (!tbody) return;

    if (!scores || scores.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:24px; color:#94a3b8">Sem dados regionais disponíveis</td></tr>`;
        return;
    }

    tbody.innerHTML = scores.map(s => {
        const scoreClass = s.score >= 70 ? "score-high" : s.score >= 40 ? "score-medium" : "score-low";
        return `<tr>
            <td style="font-weight:700">${esc(s.cidade)}</td>
            <td>${s.total}</td>
            <td>${s.clientes}</td>
            <td>${s.nao_clientes}</td>
            <td>
                <div style="display:flex; align-items:center; gap:8px" class="${scoreClass}">
                    <div class="score-bar-bg" style="width:80px">
                        <div class="score-bar-fill" style="width:${s.score}%"></div>
                    </div>
                    <span class="score-value">${s.score}</span>
                </div>
            </td>
        </tr>`;
    }).join("");
}

function renderOportunidades() {
    const el = $("oportunidades-list");
    if (!el) return;

    const naoClientes = state.rf.filter(m => m.status_cliente !== "ATIVO" && m.cnpj);
    if (naoClientes.length === 0) {
        el.innerHTML = `<div style="padding:24px; text-align:center; color:#94a3b8; font-size:.85rem">
            Todos os estabelecimentos mapeados já são clientes!</div>`;
        return;
    }

    el.innerHTML = naoClientes.slice(0, 20).map(m => `
        <div class="oport-card">
            <div class="oport-info">
                <div class="oport-nome">${esc(m.nome || "Sem nome")}</div>
                <div class="oport-cidade">${esc(m.cidade || "")}${m.uf ? " · " + m.uf : ""} · CNPJ: ${fmtCnpj(m.cnpj)}</div>
            </div>
            <div class="oport-actions">
                <button class="btn-classificar" onclick="classificarCliente('${m.cnpj}','ATIVO')">
                    ✅ Marcar como Cliente
                </button>
            </div>
        </div>
    `).join("");
}

// ============================================================
//  ACTIONS & UTILS
// ============================================================
async function runMonitor() {
    document.querySelectorAll(".btn-refresh").forEach(b => b.classList.add("loading"));
    setGlobalStatus("Monitoramento em andamento...", "loading");

    try {
        const d = await api("/api/processar");
        if (d.sucesso) {
            await loadAll();
        } else {
            setGlobalStatus("Falha na atualização", "err");
        }
    } catch (e) {
        if (e.message !== "Not authenticated") {
            setGlobalStatus("Falha de conexão com a API", "err");
        }
    } finally {
        document.querySelectorAll(".btn-refresh").forEach(b => b.classList.remove("loading"));
    }
}

function fillCityFilter() {
    const set = new Set();
    [...state.rf, ...state.osm].forEach((m) => m.cidade && set.add(m.cidade));
    const sel = $("filter-cidade");
    sel.innerHTML = '<option value="">Todas as Cidades</option>';
    [...set].sort().forEach((c) => {
        const o = document.createElement("option");
        o.value = c;
        o.textContent = c;
        sel.appendChild(o);
    });
}

function animNum(id, target) {
    const el = $(id);
    if(!el) return;
    const start = parseInt(el.textContent) || 0;
    const t0 = performance.now();
    const dur = 480;
    (function tick(now) {
        const p = Math.min((now - t0) / dur, 1);
        const e = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(start + (target - start) * e);
        if (p < 1) requestAnimationFrame(tick);
    })(t0);
}

function $(id) { return document.getElementById(id); }

function setGlobalStatus(msg, stateClass) {
    const chip = $("global-status-chip");
    if(chip) {
        $("global-status-msg").textContent = msg;
        chip.className = "status-chip " + (stateClass || "");
    }
}

function esc(s) {
    if (!s) return "";
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
}

function fmtCnpj(c) {
    if (!c || c.length !== 14) return c || "";
    return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}`;
}

function debounce(fn, ms) {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
