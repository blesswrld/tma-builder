import type { WorkerRequest, WorkerResponse } from "./workerTypes";
import {
  filterOrders,
  filterReviews,
  filterCatalog,
  calculateCart,
  calculateRevenueDynamics,
  filterPublicShops,
} from "./workerCalculations";

// Global Worker message router
self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const req = event.data;
  if (!req || !req.id || !req.type) return;

  try {
    switch (req.type) {
      case "FILTER_ORDERS": {
        const result = filterOrders(req.payload);
        const res: WorkerResponse = { id: req.id, success: true, type: "FILTER_ORDERS", result };
        self.postMessage(res);
        break;
      }
      case "FILTER_REVIEWS": {
        const result = filterReviews(req.payload);
        const res: WorkerResponse = { id: req.id, success: true, type: "FILTER_REVIEWS", result };
        self.postMessage(res);
        break;
      }
      case "FILTER_CATALOG": {
        const result = filterCatalog(req.payload);
        const res: WorkerResponse = { id: req.id, success: true, type: "FILTER_CATALOG", result };
        self.postMessage(res);
        break;
      }
      case "CALCULATE_CART": {
        const result = calculateCart(req.payload);
        const res: WorkerResponse = { id: req.id, success: true, type: "CALCULATE_CART", result };
        self.postMessage(res);
        break;
      }
      case "CALCULATE_REVENUE_DYNAMICS": {
        const result = calculateRevenueDynamics(req.payload);
        const res: WorkerResponse = { id: req.id, success: true, type: "CALCULATE_REVENUE_DYNAMICS", result };
        self.postMessage(res);
        break;
      }
      case "FILTER_PUBLIC_SHOPS": {
        const result = filterPublicShops(req.payload);
        const res: WorkerResponse = { id: req.id, success: true, type: "FILTER_PUBLIC_SHOPS", result };
        self.postMessage(res);
        break;
      }
      default: {
        const unknownReq = req as any;
        const res: WorkerResponse = { id: unknownReq.id, success: false, error: `Unknown task type: ${unknownReq.type}` };
        self.postMessage(res);
      }
    }
  } catch (err: any) {
    const res: WorkerResponse = { id: req.id, success: false, error: err?.message || String(err) };
    self.postMessage(res);
  }
};
