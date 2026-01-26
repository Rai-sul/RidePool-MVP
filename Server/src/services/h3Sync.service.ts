import * as h3 from 'h3-js';

interface SearchHexInput {
  lat: number;
  lng: number;
  resolution: number;
  ringSize: number;
}

interface RouteH3Input {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  resolution: number;
}

class H3SyncService {
  getRouteH3Cells(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number,
    resolution: number
  ): { startCell: string; endCell: string; pathCells: string[]; cellCount: number } {
    const startCell = h3.latLngToCell(startLat, startLng, resolution);
    const endCell = h3.latLngToCell(endLat, endLng, resolution);
    const cells = h3.gridPathCells(startCell, endCell);
    return { startCell, endCell, pathCells: cells, cellCount: cells.length };
  }

  getSearchHexagons(
    lat: number,
    lng: number,
    resolution: number,
    ringSize: number
  ): { centerCell: string; hexagons: string[]; count: number } {
    const centerCell = h3.latLngToCell(lat, lng, resolution);
    const hexagons = h3.gridDisk(centerCell, ringSize);
    return { centerCell, hexagons, count: hexagons.length };
  }

  calculateH3Distance(cell1: string, cell2: string): { distance: number } {
    const distance = h3.gridDistance(cell1, cell2);
    return { distance };
  }

  batchLatLngToH3(
    points: Array<{ lat: number; lng: number }>,
    resolution: number
  ): { cells: string[] } {
    const cells = points.map((p) => h3.latLngToCell(p.lat, p.lng, resolution));
    return { cells };
  }

  latLngToCell(lat: number, lng: number, resolution: number): string {
    return h3.latLngToCell(lat, lng, resolution);
  }

  getStats(): { activeWorkers: number; queueLength: number; maxWorkers: number } {
    return {
      activeWorkers: 0,
      queueLength: 0,
      maxWorkers: 1,
    };
  }
}

export const h3SyncService = new H3SyncService();
