// Inicializa o mapa focado em Tupã/SP
const map = L.map('map').setView([-21.935, -50.512], 14);

// Carrega as imagens das ruas
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let marcadores = [];

async function buscarDadosAutomaticos() {
    const lista = document.getElementById('lista-empresas');
    const status = document.getElementById('status');

    // Query para buscar mercados em Tupã (Box de coordenadas da cidade)
    const query = `
        [out:json][timeout:25];
        (
          node["shop"~"supermarket|convenience"](-21.9686,-50.5517,-21.9022,-50.4728);
          way["shop"~"supermarket|convenience"](-21.9686,-50.5517,-21.9022,-50.4728);
        );
        out center;
    `;

    const url = "https://overpass-api.de/api/interpreter?data=" + encodeURIComponent(query);

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Erro na rede");
        
        const data = await response.json();
        
        lista.innerHTML = "";
        status.innerText = `${data.elements.length} estabelecimentos encontrados em Tupã`;

        data.elements.forEach(item => {
            const lat = item.lat || item.center.lat;
            const lon = item.lon || item.center.lon;
            const nome = item.tags.name || "Mercado/Conveniência";
            const rua = item.tags["addr:street"] || "Endereço via Mapa";

            // 1. Criar Marcador
            const marker = L.marker([lat, lon]).addTo(map);
            marker.bindPopup(`<b>${nome}</b>`);
            marcadores.push(marker);

            // 2. Criar Card
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `<h4>${nome}</h4><p>${rua}</p>`;
            
            // 3. Ação de voar ao clicar
            card.onclick = () => {
                map.flyTo([lat, lon], 17, { animate: true, duration: 1.2 });
                marker.openPopup();
            };

            lista.appendChild(card);
        });

    } catch (error) {
        status.innerText = "Erro ao carregar dados automáticos.";
        status.style.color = "red";
        console.error("Erro:", error);
    }
}

// Executa a busca assim que o mapa estiver pronto
window.onload = buscarDadosAutomaticos;