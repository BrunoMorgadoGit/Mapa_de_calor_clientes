/**
 * Deusa Alimentos — Commercial Intelligence Platform
 * Enterprise-grade frontend application.
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
const state = { rf: [], osm: [] };
let map, pins;
let chartSources, chartCities;

// ============================================================
//  INIT
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
    initNavigation();
    initMap();
    bindEvents();
    loadAll();
});

// ============================================================
//  NAVIGATION (TABS)
// ============================================================
function initNavigation() {
    const navBtns = document.querySelectorAll(".main-nav-list .nav-btn");
    navBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            // Update active state on buttons
            navBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            // Switch views
            const targetId = btn.getAttribute("data-target");
            document.querySelectorAll(".view-layer").forEach(v => v.classList.add("view-hidden"));
            document.getElementById(targetId).classList.remove("view-hidden");

            // Update title
            const title = targetId === "view-dashboard" ? "Dashboard Analítico" : "Mapeamento Estratégico";
            $("page-title").textContent = title;

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
    map = L.map("map", { center: CENTER, zoom: ZOOM, zoomControl: true });

    // CartoDB Voyager — clean, light, professional basemap
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
    $("btn-refresh").addEventListener("click", runMonitor);
    // Global Header refresh also runs monitor
    document.querySelector("#main-nav .main-nav-bottom .nav-btn").addEventListener("click", runMonitor);
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
            }));
        }

        if (osmRes.status === "fulfilled" && osmRes.value.sucesso) {
            state.osm = (osmRes.value.mercados || []).map((m) => ({
                ...m,
                src: "osm",
                status: "osm",
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
    const r = await fetch(API + path);
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
    const q = $("input-busca").value.toLowerCase().trim();

    let d = [...state.rf, ...state.osm];
    if (tipo !== "todos") d = d.filter((m) => m.status === tipo);
    if (cidade) d = d.filter((m) => (m.cidade || "").toLowerCase() === cidade.toLowerCase());
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
function drawPins(data) {
    pins.clearLayers();
    data.forEach((m) => {
        if (!m.lat || !m.lng) return;
        const sz = m.status === "novo" ? 14 : 11;
        const icon = L.divIcon({
            className: `pin-${m.status}`,
            iconSize: [sz, sz],
            iconAnchor: [sz / 2, sz / 2],
            popupAnchor: [0, -(sz / 2) - 6],
        });
        L.marker([m.lat, m.lng], { icon })
            .addTo(pins)
            .bindPopup(popupHTML(m), { maxWidth: 300, minWidth: 220 });
    });
}

function popupHTML(m) {
    return `<div class="popup-card">
        <h3>${esc(m.nome || "Sem nome")}</h3>
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
        <div class="popup-card-actions">
            <button class="popup-btn" onclick="zoomTo(${m.lat},${m.lng})">Aproximar Local</button>
        </div>
    </div>`;
}

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
        <div class="m-card-stripe ${m.status}"></div>
        <div class="m-card-body">
            <div class="m-card-top">
                <span class="m-card-name">${esc(m.nome || "Sem nome")}</span>
                <span class="m-card-badge ${m.status}">${m.status === "novo" ? "Novo" : m.status === "existente" ? "Histórico RF" : "OSM"}</span>
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
    const existentes = state.rf.filter(m => m.status === "existente").length;
    const cidadesCount = new Set([...state.rf, ...state.osm].map(m => (m.cidade || "").toLowerCase()).filter(Boolean)).size;

    // Dashboard View KPIs
    animNum("dash-kpi-total", total);
    animNum("dash-kpi-novos", novos);
    animNum("dash-kpi-existentes", existentes);
    animNum("dash-kpi-cidades", cidadesCount);

    // Map Sidebar KPIs (Mini)
    animNum("side-kpi-total", total);
    animNum("side-kpi-novos", novos);
}

function renderCharts() {
    if (!window.Chart) return;

    // Chart Design System Tokens (matching style.css)
    const C_EMERALD = "#10b981";
    const C_BLUE = "#3b82f6";
    const C_AMBER = "#f59e0b";
    const C_SLATE = "#94a3b8";

    // 1. Source/Status Dist. Chart (Pie/Doughnut)
    const cntNovos = state.rf.filter(m => m.status === "novo").length;
    const cntExistentes = state.rf.filter(m => m.status === "existente").length;
    const cntOsm = state.osm.length;

    const ctxSrc = document.getElementById('chart-sources').getContext('2d');
    if (chartSources) chartSources.destroy();
    
    chartSources = new Chart(ctxSrc, {
        type: 'doughnut',
        data: {
            labels: ['Novos (RF)', 'Histórico (RF)', 'OpenStreetMap'],
            datasets: [{
                data: [cntNovos, cntExistentes, cntOsm],
                backgroundColor: [C_EMERALD, C_BLUE, C_AMBER],
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

    // 2. City Concentration Chart (Bar)
    const cityCounts = {};
    [...state.rf, ...state.osm].forEach(m => {
        if(m.cidade) {
            const c = processCityName(m.cidade);
            cityCounts[c] = (cityCounts[c] || 0) + 1;
        }
    });

    const sortedCities = Object.entries(cityCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10); // top 10

    const ctxCities = document.getElementById('chart-cities').getContext('2d');
    if (chartCities) chartCities.destroy();

    chartCities = new Chart(ctxCities, {
        type: 'bar',
        data: {
            labels: sortedCities.map(c => c[0]),
            datasets: [{
                label: ' Volume de Mercados',
                data: sortedCities.map(c => c[1]),
                backgroundColor: C_BLUE,
                borderRadius: 4
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

    if (total === 0) {
        els.innerHTML = `<p class="insight-text">Sem dados suficientes para gerar insights operacionais.</p>`;
        return;
    }

    // Calc dominant city
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
    
    let html = "";

    // Insight 1: Novos vs Existing
    if (novos > 0) {
        html += `<div class="insight-item positive">
            <p class="insight-text">Aumento na cobertura! <strong>${novos} novos mercados</strong> foram detectados recentemente via Receita Federal, indicando potenciais aberturas de pontos de venda.</p>
        </div>`;
    } else {
        html += `<div class="insight-item">
            <p class="insight-text">A rede mapeada estabilizou em <strong>${total} estabelecimentos</strong> totais. Nenhuma alteração recente detectada na malha da Receita Federal.</p>
        </div>`;
    }

    // Insight 2: Concentration
    if(topCity.count > 0) {
        html += `<div class="insight-item">
            <p class="insight-text">O município de <strong>${topCity.name}</strong> possui a maior concentração de pontos, abrigando <strong>${percentCity}%</strong> (${topCity.count}) de toda a base mapeada.</p>
        </div>`;
    }

    els.innerHTML = html;
}

// Utilities for naming
function processCityName(cName) {
    return cName.split(' ')[0].replace(/[^a-zA-ZáàâãéèêíïóôõöúçñÁÀÂÃÉÈÍÏÓÔÕÖÚÇÑ]/g, ""); // Fast simple sanitize to avoid huge names breaking UI
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
        setGlobalStatus("Falha de conexão com a API", "err");
    } finally {
        document.querySelectorAll(".btn-refresh").forEach(b => b.classList.remove("loading"));
    }
}

function fillCityFilter() {
    const set = new Set();
    [...state.rf, ...state.osm].forEach((m) => m.cidade && set.add(m.cidade));
    const sel = $("filter-cidade");
    sel.innerHTML = '<option value="">Todas as Cidades</option>'; // reset
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
