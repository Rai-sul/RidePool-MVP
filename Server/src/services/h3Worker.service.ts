import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import * as h3 from 'h3-js';
import path from 'path';

interface H3WorkerResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

interface RouteH3Input {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  resolution: number;
}

interface SearchHexInput {
  lat: number;
  lng: number;
  resolution: number;
  ringSize: number;
}

if (!isMainThread && parentPort) {
  const { task, params } = workerData as { task: string; params: unknown };

  try {
    let result: unknown;

    switch (task) {
      case 'getRouteH3Cells': {
        const { startLat, startLng, endLat, endLng, resolution } = params as RouteH3Input;
        const startCell = h3.latLngToCell(startLat, startLng, resolution);
        const endCell = h3.latLngToCell(endLat, endLng, resolution);
        const cells = h3.gridPathCells(startCell, endCell);
        result = { startCell, endCell, pathCells: cells, cellCount: cells.length };
        break;
      }

      case 'getSearchHexagons': {
        const { lat, lng, resolution, ringSize } = params as SearchHexInput;
        const centerCell = h3.latLngToCell(lat, lng, resolution);
        const hexagons = h3.gridDisk(centerCell, ringSize);
        result = { centerCell, hexagons, count: hexagons.length };
        break;
      }

      case 'calculateH3Distance': {
        const { cell1, cell2 } = params as { cell1: string; cell2: string };
        const distance = h3.gridDistance(cell1, cell2);
        result = { distance };
        break;
      }

      case 'batchLatLngToH3': {
        const { points, resolution } = params as {
          points: Array<{ lat: number; lng: number }>;
          resolution: number;
        };
        const cells = points.map((p) => h3.latLngToCell(p.lat, p.lng, resolution));
        result = { cells };
        break;
      }

      default:
        throw new Error(`Unknown task: ${task}`);
    }

    parentPort.postMessage({ success: true, data: result });
  } catch (error) {
    parentPort.postMessage({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

class H3WorkerPool {
  private workerPath: string;
  private maxWorkers: number;
  private activeWorkers: number = 0;
  private taskQueue: Array<{
    task: string;
    params: unknown;
    resolve: (value: H3WorkerResult) => void;
    reject: (error: Error) => void;
  }> = [];

  constructor() {
    this.workerPath = path.join(__dirname, 'h3Worker.service.js');
    this.maxWorkers = parseInt(process.env.H3_WORKER_POOL_SIZE || '4', 10);
  }

  private processQueue(): void {
    if (this.taskQueue.length === 0 || this.activeWorkers >= this.maxWorkers) {
      return;
    }

    const task = this.taskQueue.shift();
    if (!task) return;

    this.activeWorkers++;

    const worker = new Worker(this.workerPath, {
      workerData: { task: task.task, params: task.params },
    });

    const timeout = setTimeout(() => {
      worker.terminate();
      task.reject(new Error('Worker timeout'));
      this.activeWorkers--;
      this.processQueue();
    }, 5000);

    worker.on('message', (result: H3WorkerResult) => {
      clearTimeout(timeout);
      task.resolve(result);
      this.activeWorkers--;
      this.processQueue();
    });

    worker.on('error', (error) => {
      clearTimeout(timeout);
      task.reject(error);
      this.activeWorkers--;
      this.processQueue();
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        clearTimeout(timeout);
      }
    });
  }

  async execute<T>(task: string, params: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      this.taskQueue.push({
        task,
        params,
        resolve: (result) => {
          if (result.success) {
            resolve(result.data as T);
          } else {
            reject(new Error(result.error || 'Worker failed'));
          }
        },
        reject,
      });
      this.processQueue();
    });
  }

  async getRouteH3Cells(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number,
    resolution: number
  ): Promise<{ startCell: string; endCell: string; pathCells: string[]; cellCount: number }> {
    return this.execute('getRouteH3Cells', { startLat, startLng, endLat, endLng, resolution });
  }

  async getSearchHexagons(
    lat: number,
    lng: number,
    resolution: number,
    ringSize: number
  ): Promise<{ centerCell: string; hexagons: string[]; count: number }> {
    return this.execute('getSearchHexagons', { lat, lng, resolution, ringSize });
  }

  async calculateH3Distance(cell1: string, cell2: string): Promise<{ distance: number }> {
    return this.execute('calculateH3Distance', { cell1, cell2 });
  }

  async batchLatLngToH3(
    points: Array<{ lat: number; lng: number }>,
    resolution: number
  ): Promise<{ cells: string[] }> {
    return this.execute('batchLatLngToH3', { points, resolution });
  }

  getStats(): { activeWorkers: number; queueLength: number; maxWorkers: number } {
    return {
      activeWorkers: this.activeWorkers,
      queueLength: this.taskQueue.length,
      maxWorkers: this.maxWorkers,
    };
  }
}

export const h3WorkerPool = new H3WorkerPool();

export function h3Sync(task: string, params: unknown): unknown {
  switch (task) {
    case 'getSearchHexagons': {
      const { lat, lng, resolution, ringSize } = params as SearchHexInput;
      const centerCell = h3.latLngToCell(lat, lng, resolution);
      const hexagons = h3.gridDisk(centerCell, ringSize);
      return { centerCell, hexagons, count: hexagons.length };
    }
    case 'latLngToCell': {
      const { lat, lng, resolution } = params as { lat: number; lng: number; resolution: number };
      return h3.latLngToCell(lat, lng, resolution);
    }
    default:
      throw new Error(`Unknown sync task: ${task}`);
  }
}
