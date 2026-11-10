import { useState, useEffect, useRef } from "react";
import { computationWorker } from "./workerManager";
import {
  filterOrders,
  filterReviews,
  filterCatalog,
  calculateCart,
  calculateRevenueDynamics,
} from "./workerCalculations";
import type {
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
} from "./workerTypes";

// Hook: Background Order Filtering & Stats
export function useWorkerOrdersFilter(payload: WorkerFilterOrdersPayload): WorkerFilterOrdersResult {
  const [result, setResult] = useState<WorkerFilterOrdersResult>(() => filterOrders(payload));
  const abortRef = useRef(0);
  const prevResultRef = useRef(result);
  prevResultRef.current = result;

  useEffect(() => {
    const currentRun = ++abortRef.current;

    const handleUpdate = (next: WorkerFilterOrdersResult) => {
      const prev = prevResultRef.current;
      if (
        prev &&
        prev.filteredOrders.length === next.filteredOrders.length &&
        prev.counts?.total === next.counts?.total &&
        prev.counts?.pending === next.counts?.pending &&
        prev.counts?.completed === next.counts?.completed &&
        prev.counts?.cancelled === next.counts?.cancelled &&
        prev.counts?.totalRevenue === next.counts?.totalRevenue &&
        (prev.filteredOrders.length === 0 || prev.filteredOrders[0]?.id === next.filteredOrders[0]?.id)
      ) {
        return;
      }
      setResult(next);
    };

    if (!computationWorker.isAvailable()) {
      handleUpdate(filterOrders(payload));
      return;
    }

    computationWorker
      .filterOrders(payload)
      .then((res) => {
        if (currentRun === abortRef.current) {
          handleUpdate(res);
        }
      })
      .catch((err) => {
        console.error("[useWorkerOrdersFilter] Worker fallback:", err);
        if (currentRun === abortRef.current) {
          handleUpdate(filterOrders(payload));
        }
      });
  }, [
    payload.orders,
    payload.statusFilter,
    payload.typeFilter,
    payload.searchQuery,
  ]);

  return result;
}

// Hook: Background Reviews Filtering & Rating Distribution
export function useWorkerReviewsFilter(payload: WorkerFilterReviewsPayload): WorkerFilterReviewsResult {
  const [result, setResult] = useState<WorkerFilterReviewsResult>(() => filterReviews(payload));
  const abortRef = useRef(0);
  const prevResultRef = useRef(result);
  prevResultRef.current = result;

  useEffect(() => {
    const currentRun = ++abortRef.current;

    const handleUpdate = (next: WorkerFilterReviewsResult) => {
      const prev = prevResultRef.current;
      if (
        prev &&
        prev.filteredReviews.length === next.filteredReviews.length &&
        prev.stats.total === next.stats.total &&
        prev.stats.avgRating === next.stats.avgRating &&
        prev.stats.unrepliedCount === next.stats.unrepliedCount
      ) {
        return;
      }
      setResult(next);
    };

    if (!computationWorker.isAvailable()) {
      handleUpdate(filterReviews(payload));
      return;
    }

    computationWorker
      .filterReviews(payload)
      .then((res) => {
        if (currentRun === abortRef.current) {
          handleUpdate(res);
        }
      })
      .catch((err) => {
        console.error("[useWorkerReviewsFilter] Worker fallback:", err);
        if (currentRun === abortRef.current) {
          handleUpdate(filterReviews(payload));
        }
      });
  }, [payload.reviews, payload.searchQuery]);

  return result;
}

// Hook: Background Catalog Filtering
export function useWorkerCatalogFilter(payload: WorkerFilterCatalogPayload): WorkerFilterCatalogResult {
  const [result, setResult] = useState<WorkerFilterCatalogResult>(() => filterCatalog(payload));
  const abortRef = useRef(0);
  const prevResultRef = useRef(result);
  prevResultRef.current = result;

  useEffect(() => {
    const currentRun = ++abortRef.current;

    const handleUpdate = (next: WorkerFilterCatalogResult) => {
      const prev = prevResultRef.current;
      if (
        prev &&
        prev.filteredServices.length === next.filteredServices.length &&
        prev.categories.length === next.categories.length &&
        (prev.filteredServices.length === 0 || prev.filteredServices[0]?.id === next.filteredServices[0]?.id)
      ) {
        return;
      }
      setResult(next);
    };

    if (!computationWorker.isAvailable()) {
      handleUpdate(filterCatalog(payload));
      return;
    }

    computationWorker
      .filterCatalog(payload)
      .then((res) => {
        if (currentRun === abortRef.current) {
          handleUpdate(res);
        }
      })
      .catch((err) => {
        console.error("[useWorkerCatalogFilter] Worker fallback:", err);
        if (currentRun === abortRef.current) {
          handleUpdate(filterCatalog(payload));
        }
      });
  }, [
    payload.services,
    payload.selectedCategory,
    payload.searchQuery,
    payload.favorites,
  ]);

  return result;
}

// Hook: Background Cart Pricing & Promo Calculation
export function useWorkerCartCalculation(payload: WorkerCartCalculationPayload): WorkerCartCalculationResult {
  const [result, setResult] = useState<WorkerCartCalculationResult>(() => calculateCart(payload));
  const abortRef = useRef(0);
  const prevResultRef = useRef(result);
  prevResultRef.current = result;

  useEffect(() => {
    const currentRun = ++abortRef.current;

    const handleUpdate = (next: WorkerCartCalculationResult) => {
      const prev = prevResultRef.current;
      if (
        prev &&
        prev.totalItems === next.totalItems &&
        prev.totalPrice === next.totalPrice &&
        prev.discountValue === next.discountValue
      ) {
        return;
      }
      setResult(next);
    };

    if (!computationWorker.isAvailable()) {
      handleUpdate(calculateCart(payload));
      return;
    }

    computationWorker
      .calculateCart(payload)
      .then((res) => {
        if (currentRun === abortRef.current) {
          handleUpdate(res);
        }
      })
      .catch((err) => {
        console.error("[useWorkerCartCalculation] Worker fallback:", err);
        if (currentRun === abortRef.current) {
          handleUpdate(calculateCart(payload));
        }
      });
  }, [payload.cart, payload.services, payload.appliedPromo]);

  return result;
}

// Hook: Background Revenue Dynamics Chart Aggregation
export function useWorkerRevenueDynamics(payload: WorkerRevenueDynamicsPayload): WorkerRevenueDynamicsResult {
  const [result, setResult] = useState<WorkerRevenueDynamicsResult>(() => calculateRevenueDynamics(payload));
  const abortRef = useRef(0);

  useEffect(() => {
    const currentRun = ++abortRef.current;

    if (!computationWorker.isAvailable()) {
      setResult(calculateRevenueDynamics(payload));
      return;
    }

    computationWorker
      .calculateRevenueDynamics(payload)
      .then((res) => {
        if (currentRun === abortRef.current) {
          setResult(res);
        }
      })
      .catch((err) => {
        console.error("[useWorkerRevenueDynamics] Worker fallback:", err);
        if (currentRun === abortRef.current) {
          setResult(calculateRevenueDynamics(payload));
        }
      });
  }, [
    payload.ordersTimeline,
    payload.hourlyDistribution,
    payload.summary,
    payload.period,
    payload.metricType,
    payload.selectedDayKey,
  ]);

  return result;
}
