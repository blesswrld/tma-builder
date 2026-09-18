// WebWorker message contracts and payload definitions

export interface WorkerOrder {
  id: string;
  shopId?: string;
  customerName?: string;
  customerPhone?: string;
  tableNumber?: string | null;
  preferredTime?: string | null;
  fulfillmentMethod?: string | null;
  deliveryAddress?: string | null;
  items?: string;
  totalPrice?: number;
  totalAmount?: number;
  status: string;
  note?: string | null;
  comment?: string | null;
  createdAt: string;
}

export interface WorkerFilterOrdersPayload {
  orders: WorkerOrder[];
  statusFilter: string;
  typeFilter: string;
  searchQuery: string;
}

export interface WorkerFilterOrdersResult {
  filteredOrders: WorkerOrder[];
  counts: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    cancelled: number;
    totalRevenue: number;
  };
}

export interface WorkerReview {
  id: string;
  customerName?: string;
  rating: number;
  comment?: string | null;
  reply?: string | null;
  createdAt?: string;
}

export interface WorkerFilterReviewsPayload {
  reviews: WorkerReview[];
  searchQuery: string;
}

export interface WorkerFilterReviewsResult {
  filteredReviews: WorkerReview[];
  stats: {
    total: number;
    avgRating: string;
    positiveCount: number;
    positivePercentage: number;
    unrepliedCount: number;
    repliedCount: number;
    starCounts: { 1: number; 2: number; 3: number; 4: number; 5: number };
  };
}

export interface WorkerService {
  id: string;
  title: string;
  price: number;
  description?: string | null;
  category?: string | null;
  tags?: string | null;
  isAvailable?: boolean;
}

export interface WorkerFilterCatalogPayload {
  services: WorkerService[];
  selectedCategory: string;
  searchQuery: string;
  favorites: string[];
}

export interface WorkerFilterCatalogResult {
  categories: string[];
  filteredServices: WorkerService[];
}

export interface WorkerCartCalculationPayload {
  cart: Record<string, number>;
  services: Array<{ id: string; price: number }>;
  appliedPromo?: {
    discountPercent?: number | null;
    discountAmount?: number | null;
    discountType?: string | null;
    discountValue?: number | null;
  } | null;
}

export interface WorkerCartCalculationResult {
  totalItems: number;
  totalPrice: number;
  discountValue: number;
  finalPrice: number;
}

export interface WorkerRevenueDynamicsPayload {
  ordersTimeline?: Array<{
    id: string;
    createdAt: string | Date;
    totalPrice: number;
    status: string;
  }>;
  hourlyDistribution?: Array<{ hour: string; orders: number }>;
  summary?: {
    totalRevenue: number;
    totalOrders: number;
    completedOrders: number;
    avgCheck: number;
  };
  period: "day" | "week" | "month";
  metricType: "revenue" | "orders" | "both";
  selectedDayKey: string;
}

export interface WorkerChartDataPoint {
  date?: string;
  hour?: number;
  label: string;
  fullLabel: string;
  revenue: number;
  orders: number;
  avgCheck: number;
}

export interface WorkerRevenueDynamicsResult {
  availableDates: Array<{ key: string; label: string; count: number; revenue: number }>;
  activeDataset: WorkerChartDataPoint[];
  viewMetrics: {
    totalRevenue: number;
    totalOrders: number;
    avgCheck: number;
    peakItem: WorkerChartDataPoint | null;
  };
  xAxisInterval: number;
}

// Request & Response discriminated unions
export type WorkerRequest =
  | { id: string; type: "FILTER_ORDERS"; payload: WorkerFilterOrdersPayload }
  | { id: string; type: "FILTER_REVIEWS"; payload: WorkerFilterReviewsPayload }
  | { id: string; type: "FILTER_CATALOG"; payload: WorkerFilterCatalogPayload }
  | { id: string; type: "CALCULATE_CART"; payload: WorkerCartCalculationPayload }
  | { id: string; type: "CALCULATE_REVENUE_DYNAMICS"; payload: WorkerRevenueDynamicsPayload };

export type WorkerResponse =
  | { id: string; success: true; type: "FILTER_ORDERS"; result: WorkerFilterOrdersResult }
  | { id: string; success: true; type: "FILTER_REVIEWS"; result: WorkerFilterReviewsResult }
  | { id: string; success: true; type: "FILTER_CATALOG"; result: WorkerFilterCatalogResult }
  | { id: string; success: true; type: "CALCULATE_CART"; result: WorkerCartCalculationResult }
  | { id: string; success: true; type: "CALCULATE_REVENUE_DYNAMICS"; result: WorkerRevenueDynamicsResult }
  | { id: string; success: false; error: string };
