import type {
  WorkerRequest,
  WorkerResponse,
  WorkerFilterOrdersPayload,
  WorkerFilterOrdersResult,
  WorkerFilterReviewsPayload,
  WorkerFilterReviewsResult,
  WorkerFilterCatalogPayload,
  WorkerFilterCatalogResult,
  WorkerCartCalculationPayload,
  WorkerCartCalculationResult,
  WorkerRevenueDynamicsPayload,
  WorkerRevenueDynamicsResult,
  WorkerFilterPublicShopsPayload,
  WorkerFilterPublicShopsResult,
} from "./workerTypes";
import { filterPublicShops as syncFilterPublicShops } from "./workerCalculations";

class ComputationWorkerManager {
  private worker: Worker | null = null;
  private pendingRequests = new Map<
    string,
    { resolve: (val: any) => void; reject: (err: any) => void }
  >();
  private requestCounter = 0;

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    if (typeof window === "undefined" || typeof Worker === "undefined") {
      return;
    }

    try {
      this.worker = new Worker(new URL("./computationWorker.ts", import.meta.url), {
        type: "module",
      });

      this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const res = event.data;
        if (!res || !res.id) return;

        const pending = this.pendingRequests.get(res.id);
        if (pending) {
          this.pendingRequests.delete(res.id);
          if (res.success) {
            pending.resolve(res.result);
          } else {
            pending.reject(new Error((res as { error: string }).error));
          }
        }
      };

      this.worker.onerror = (err) => {
        console.error("[ComputationWorkerManager] Worker error:", err);
      };
    } catch (e) {
      console.warn("[ComputationWorkerManager] Failed to initialize Worker, fallback to sync:", e);
      this.worker = null;
    }
  }

  public isAvailable(): boolean {
    return this.worker !== null;
  }

  private postTask<T>(type: WorkerRequest["type"], payload: any): Promise<T> {
    if (!this.worker) {
      return Promise.reject(new Error("Worker not initialized"));
    }

    const id = `req_${++this.requestCounter}_${Date.now()}`;
    const req: WorkerRequest = { id, type, payload } as WorkerRequest;

    return new Promise<T>((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.worker!.postMessage(req);
    });
  }

  public filterOrders(payload: WorkerFilterOrdersPayload): Promise<WorkerFilterOrdersResult> {
    return this.postTask<WorkerFilterOrdersResult>("FILTER_ORDERS", payload);
  }

  public filterReviews(payload: WorkerFilterReviewsPayload): Promise<WorkerFilterReviewsResult> {
    return this.postTask<WorkerFilterReviewsResult>("FILTER_REVIEWS", payload);
  }

  public filterCatalog(payload: WorkerFilterCatalogPayload): Promise<WorkerFilterCatalogResult> {
    return this.postTask<WorkerFilterCatalogResult>("FILTER_CATALOG", payload);
  }

  public calculateCart(payload: WorkerCartCalculationPayload): Promise<WorkerCartCalculationResult> {
    return this.postTask<WorkerCartCalculationResult>("CALCULATE_CART", payload);
  }

  public calculateRevenueDynamics(
    payload: WorkerRevenueDynamicsPayload
  ): Promise<WorkerRevenueDynamicsResult> {
    return this.postTask<WorkerRevenueDynamicsResult>("CALCULATE_REVENUE_DYNAMICS", payload);
  }

  public async filterPublicShops(
    payload: WorkerFilterPublicShopsPayload
  ): Promise<WorkerFilterPublicShopsResult> {
    if (!this.worker) {
      return syncFilterPublicShops(payload);
    }
    try {
      return await this.postTask<WorkerFilterPublicShopsResult>("FILTER_PUBLIC_SHOPS", payload);
    } catch {
      return syncFilterPublicShops(payload);
    }
  }
}

export const computationWorker = new ComputationWorkerManager();
