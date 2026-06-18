import { mockEstablishments } from "./establishment-map-mocks";
import type {
  Establishment,
  EstablishmentSearchFilters,
  EstablishmentSummary,
  HeatmapPoint,
  MapMarker,
} from "./establishment-map-types";

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function formatAnalyzedCity(filters: EstablishmentSearchFilters) {
  if (filters.bairro && filters.cidade) return `${filters.bairro}, ${filters.cidade}`;
  if (filters.cidade) return filters.cidade;
  return filters.uf || "SP";
}

export const EstablishmentMapService = {
  getMockEstablishments(): Establishment[] {
    return mockEstablishments;
  },

  searchByFilters(filters: EstablishmentSearchFilters): Establishment[] {
    return this.filterActiveOnly(this.getMockEstablishments()).filter((item) => {
      const matchesCnae = item.cnaePrincipal === filters.cnaePrincipal;
      const matchesUf = normalize(item.uf) === normalize(filters.uf);
      const matchesCity = !filters.cidade || normalize(item.cidade) === normalize(filters.cidade);
      const matchesNeighborhood = !filters.bairro || normalize(item.bairro) === normalize(filters.bairro);

      return matchesCnae && matchesUf && matchesCity && matchesNeighborhood;
    });
  },

  filterActiveOnly(items: Establishment[]): Establishment[] {
    return items.filter((item) => item.situacaoCadastral === "ATIVA");
  },

  calculateSummary(items: Establishment[], filters?: EstablishmentSearchFilters): EstablishmentSummary {
    const neighborhoodCounts = items.reduce<Record<string, number>>((acc, item) => {
      acc[item.bairro] = (acc[item.bairro] ?? 0) + 1;
      return acc;
    }, {});
    const [topNeighborhood] =
      Object.entries(neighborhoodCounts).sort((a, b) => b[1] - a[1])[0] ?? [];

    return {
      totalFound: items.length,
      selectedCnaeCount: filters?.cnaePrincipal ? 1 : 0,
      analyzedCity: filters ? formatAnalyzedCity(filters) : "SP",
      topNeighborhood: topNeighborhood ?? "-",
    };
  },

  getHeatmapPoints(items: Establishment[]): HeatmapPoint[] {
    return items.map((item) => ({
      lat: item.latitude,
      lng: item.longitude,
      intensity: 1,
    }));
  },

  getMapMarkers(items: Establishment[]): MapMarker[] {
    return items.map((item) => ({
      id: item.cnpj,
      lat: item.latitude,
      lng: item.longitude,
      establishment: item,
    }));
  },
};
