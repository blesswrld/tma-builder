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
  WorkerChartDataPoint,
  WorkerFilterPublicShopsPayload,
  WorkerFilterPublicShopsResult,
} from "./workerTypes";

export const MONTH_NAMES_RU = [
  "янв", "фев", "мар", "апр", "май", "июн",
  "июл", "авг", "сен", "окт", "ноя", "дек"
];

export const MONTH_NAMES_FULL_RU = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
];

export const WEEKDAY_NAMES_RU = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

export function formatDateRu(date: Date): string {
  const day = date.getDate();
  const month = MONTH_NAMES_RU[date.getMonth()];
  return `${day} ${month}`;
}

export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function filterOrders(payload: WorkerFilterOrdersPayload): WorkerFilterOrdersResult {
  const orders = payload?.orders || [];
  const statusFilter = payload?.statusFilter || "ALL";
  const typeFilter = payload?.typeFilter || "ALL";
  const q = (payload?.searchQuery || "").trim().toLowerCase();

  let pending = 0;
  let inProgress = 0;
  let completed = 0;
  let cancelled = 0;
  let totalRevenue = 0;

  for (let i = 0; i < orders.length; i++) {
    const o = orders[i];
    const s = o.status;
    if (s === "PENDING" || s === "NEW") pending++;
    else if (s === "CONFIRMED" || s === "IN_PROGRESS") inProgress++;
    else if (s === "COMPLETED") {
      completed++;
      totalRevenue += Number(o.totalPrice ?? o.totalAmount) || 0;
    } else if (s === "CANCELLED") cancelled++;
  }

  const filteredOrders = orders.filter((o) => {
    if (statusFilter !== "ALL" && o.status !== statusFilter) return false;
    if (typeFilter !== "ALL") {
      const method = o.fulfillmentMethod || (o.deliveryAddress ? "courier" : "pickup");
      if (method !== typeFilter) return false;
    }
    if (q) {
      const matchId = (o.id || "").toLowerCase().includes(q);
      const matchName = (o.customerName || "").toLowerCase().includes(q);
      const matchPhone = (o.customerPhone || "").toLowerCase().includes(q);
      const matchAddr = (o.deliveryAddress || "").toLowerCase().includes(q);
      const matchTable = (o.tableNumber || "").toLowerCase().includes(q);
      const matchTime = (o.preferredTime || "").toLowerCase().includes(q);
      const matchNote = (o.note || o.comment || "").toLowerCase().includes(q);
      const matchItems = (o.items || "").toLowerCase().includes(q);
      return matchId || matchName || matchPhone || matchAddr || matchTable || matchTime || matchNote || matchItems;
    }
    return true;
  });

  return {
    filteredOrders,
    counts: {
      total: orders.length,
      pending,
      inProgress,
      completed,
      cancelled,
      totalRevenue,
    },
  };
}

export function filterReviews(payload: WorkerFilterReviewsPayload): WorkerFilterReviewsResult {
  const reviews = payload?.reviews || [];
  const q = (payload?.searchQuery || "").trim().toLowerCase();
  const total = reviews.length;

  let sumRating = 0;
  let positiveCount = 0;
  let unrepliedCount = 0;
  const starCounts: { 1: number; 2: number; 3: number; 4: number; 5: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  for (let i = 0; i < reviews.length; i++) {
    const r = reviews[i];
    const rate = Math.round(Number(r.rating)) as 1 | 2 | 3 | 4 | 5;
    sumRating += Number(r.rating) || 0;
    if (rate >= 4) positiveCount++;
    if (!r.reply || r.reply.trim() === "") unrepliedCount++;
    if (rate >= 1 && rate <= 5) {
      starCounts[rate] = (starCounts[rate] || 0) + 1;
    }
  }

  const avgRating = total > 0 ? (sumRating / total).toFixed(1) : "5.0";
  const positivePercentage = total > 0 ? Math.round((positiveCount / total) * 100) : 100;
  const repliedCount = total - unrepliedCount;

  const filteredReviews = reviews.filter((rev) => {
    if (!q) return true;
    const nameMatch = rev.customerName?.toLowerCase().includes(q);
    const commentMatch = rev.comment?.toLowerCase().includes(q);
    const replyMatch = rev.reply?.toLowerCase().includes(q);
    return Boolean(nameMatch || commentMatch || replyMatch);
  });

  return {
    filteredReviews,
    stats: {
      total,
      avgRating,
      positiveCount,
      positivePercentage,
      unrepliedCount,
      repliedCount,
      starCounts,
    },
  };
}

export function filterCatalog(payload: WorkerFilterCatalogPayload): WorkerFilterCatalogResult {
  const services = payload?.services || [];
  const selectedCategory = payload?.selectedCategory || "ALL";
  const q = (payload?.searchQuery || "").trim().toLowerCase();
  const favSet = new Set(payload?.favorites || []);

  const catSet = new Set<string>();
  for (let i = 0; i < services.length; i++) {
    if (services[i].category) catSet.add(services[i].category as string);
  }
  const categories = Array.from(catSet);

  const filteredServices = services.filter((s) => {
    const matchesCategory =
      selectedCategory === "ALL"
        ? true
        : selectedCategory === "FAVORITES"
        ? favSet.has(s.id)
        : s.category === selectedCategory;

    if (!matchesCategory) return false;

    if (!q) return true;
    const matchTitle = s.title?.toLowerCase().includes(q);
    const matchDesc = s.description?.toLowerCase().includes(q);
    const matchTags = s.tags?.toLowerCase().includes(q);
    return Boolean(matchTitle || matchDesc || matchTags);
  });

  return { categories, filteredServices };
}

export function calculateCart(payload: WorkerCartCalculationPayload): WorkerCartCalculationResult {
  const cart = payload?.cart || {};
  const services = payload?.services || [];
  const appliedPromo = payload?.appliedPromo;

  const priceMap = new Map<string, number>();
  for (let i = 0; i < services.length; i++) {
    priceMap.set(services[i].id, services[i].price);
  }

  let totalItems = 0;
  let totalPrice = 0;

  for (const [id, qty] of Object.entries(cart)) {
    const numQty = Number(qty) || 0;
    if (numQty > 0) {
      totalItems += numQty;
      const unitPrice = priceMap.get(id) || 0;
      totalPrice += unitPrice * numQty;
    }
  }

  let discountValue = 0;
  if (appliedPromo) {
    if (appliedPromo.discountPercent && Number(appliedPromo.discountPercent) > 0) {
      discountValue = Math.round((totalPrice * Number(appliedPromo.discountPercent)) / 100);
    } else if (appliedPromo.discountAmount && Number(appliedPromo.discountAmount) > 0) {
      discountValue = Math.min(totalPrice, Number(appliedPromo.discountAmount));
    } else if (
      (appliedPromo.discountType === "PERCENT" || appliedPromo.discountType === "percent") &&
      appliedPromo.discountValue
    ) {
      discountValue = Math.round((totalPrice * Number(appliedPromo.discountValue)) / 100);
    } else if (
      (appliedPromo.discountType === "FIXED" || appliedPromo.discountType === "fixed") &&
      appliedPromo.discountValue
    ) {
      discountValue = Math.min(totalPrice, Number(appliedPromo.discountValue));
    }
  }

  const finalPrice = Math.max(0, totalPrice - discountValue);

  return {
    totalItems,
    totalPrice,
    discountValue,
    finalPrice,
  };
}

export function calculateRevenueDynamics(payload: WorkerRevenueDynamicsPayload): WorkerRevenueDynamicsResult {
  const ordersTimeline = payload?.ordersTimeline || [];
  const hourlyDistribution = payload?.hourlyDistribution || [];
  const summary = payload?.summary;
  const period = payload?.period || "week";
  const metricType = payload?.metricType || "revenue";
  const selectedDayKey = payload?.selectedDayKey || "auto";

  const validOrders = ordersTimeline.map((o) => ({
    ...o,
    dateObj: new Date(o.createdAt),
    isPaid: o.status === "COMPLETED" || o.status === "CONFIRMED",
  }));

  const dateMap = new Map<string, { key: string; label: string; count: number; revenue: number }>();
  validOrders.forEach((o) => {
    const key = formatDateKey(o.dateObj);
    const prev = dateMap.get(key) || {
      key,
      label: formatDateRu(o.dateObj),
      count: 0,
      revenue: 0,
    };
    prev.count += 1;
    if (o.isPaid) prev.revenue += o.totalPrice || 0;
    dateMap.set(key, prev);
  });

  const availableDates = Array.from(dateMap.values()).sort((a, b) => b.key.localeCompare(a.key));

  let activeDayKey = "all";
  if (selectedDayKey !== "auto" && selectedDayKey !== "all") {
    activeDayKey = selectedDayKey;
  } else if (selectedDayKey === "all") {
    activeDayKey = "all";
  } else if (availableDates.length > 0) {
    activeDayKey = availableDates[0].key;
  }

  // 1. Day data
  const hours: WorkerChartDataPoint[] = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    label: `${String(i).padStart(2, "0")}:00`,
    fullLabel: `Время ${String(i).padStart(2, "0")}:00`,
    revenue: 0,
    orders: 0,
    avgCheck: 0,
  }));

  if (validOrders.length > 0) {
    validOrders.forEach((o) => {
      const orderDayKey = formatDateKey(o.dateObj);
      if (activeDayKey === "all" || orderDayKey === activeDayKey) {
        const h = o.dateObj.getHours();
        if (h >= 0 && h < 24) {
          hours[h].orders += 1;
          if (o.isPaid) {
            hours[h].revenue += o.totalPrice || 0;
          }
        }
      }
    });
  } else if (hourlyDistribution.length === 24) {
    hourlyDistribution.forEach((hd, i) => {
      if (hours[i]) {
        hours[i].orders = hd.orders;
        const avg = summary?.avgCheck || 1500;
        hours[i].revenue = hd.orders * avg;
      }
    });
  }

  hours.forEach((h) => {
    h.avgCheck = h.orders > 0 ? Math.round(h.revenue / h.orders) : 0;
  });

  // 2. Week data (7 days)
  const daysCountWeek = 7;
  let maxTimestampWeek = Date.now();
  if (validOrders.length > 0) {
    const orderTimestamps = validOrders.map((o) => o.dateObj.getTime());
    maxTimestampWeek = Math.max(...orderTimestamps, Date.now());
  }
  const endWeek = new Date(maxTimestampWeek);
  endWeek.setHours(23, 59, 59, 999);
  const startWeek = new Date(endWeek);
  startWeek.setDate(startWeek.getDate() - (daysCountWeek - 1));
  startWeek.setHours(0, 0, 0, 0);

  const dailyWeekMap = new Map<string, { revenue: number; orders: number }>();
  validOrders.forEach((o) => {
    const key = formatDateKey(o.dateObj);
    const prev = dailyWeekMap.get(key) || { revenue: 0, orders: 0 };
    prev.orders += 1;
    if (o.isPaid) prev.revenue += o.totalPrice || 0;
    dailyWeekMap.set(key, prev);
  });

  const weekData: WorkerChartDataPoint[] = [];
  const currWeek = new Date(startWeek);
  while (currWeek <= endWeek) {
    const key = formatDateKey(currWeek);
    const dataForDay = dailyWeekMap.get(key) || { revenue: 0, orders: 0 };
    const weekday = WEEKDAY_NAMES_RU[currWeek.getDay()];
    weekData.push({
      date: key,
      label: `${weekday}, ${currWeek.getDate()} ${MONTH_NAMES_RU[currWeek.getMonth()]}`,
      fullLabel: `${weekday}, ${currWeek.getDate()} ${MONTH_NAMES_FULL_RU[currWeek.getMonth()]} ${currWeek.getFullYear()}`,
      revenue: dataForDay.revenue,
      orders: dataForDay.orders,
      avgCheck: dataForDay.orders > 0 ? Math.round(dataForDay.revenue / dataForDay.orders) : 0,
    });
    currWeek.setDate(currWeek.getDate() + 1);
  }

  // 3. Month data (30 days)
  const daysCountMonth = 30;
  let maxTimestampMonth = Date.now();
  if (validOrders.length > 0) {
    const orderTimestamps = validOrders.map((o) => o.dateObj.getTime());
    maxTimestampMonth = Math.max(...orderTimestamps, Date.now());
  }
  const endMonth = new Date(maxTimestampMonth);
  endMonth.setHours(23, 59, 59, 999);
  const startMonth = new Date(endMonth);
  startMonth.setDate(startMonth.getDate() - (daysCountMonth - 1));
  startMonth.setHours(0, 0, 0, 0);

  const monthData: WorkerChartDataPoint[] = [];
  const currMonth = new Date(startMonth);
  while (currMonth <= endMonth) {
    const key = formatDateKey(currMonth);
    const dataForDay = dailyWeekMap.get(key) || { revenue: 0, orders: 0 };
    monthData.push({
      date: key,
      label: `${currMonth.getDate()} ${MONTH_NAMES_RU[currMonth.getMonth()]}`,
      fullLabel: `${currMonth.getDate()} ${MONTH_NAMES_FULL_RU[currMonth.getMonth()]} ${currMonth.getFullYear()}`,
      revenue: dataForDay.revenue,
      orders: dataForDay.orders,
      avgCheck: dataForDay.orders > 0 ? Math.round(dataForDay.revenue / dataForDay.orders) : 0,
    });
    currMonth.setDate(currMonth.getDate() + 1);
  }

  let activeDataset: WorkerChartDataPoint[];
  switch (period) {
    case "day":
      activeDataset = hours;
      break;
    case "week":
      activeDataset = weekData;
      break;
    case "month":
      activeDataset = monthData;
      break;
    default:
      activeDataset = weekData;
  }

  let totalRev = 0;
  let totalOrd = 0;
  let peakItem: WorkerChartDataPoint | null = null;

  activeDataset.forEach((item) => {
    totalRev += item.revenue || 0;
    totalOrd += item.orders || 0;
    if (
      !peakItem ||
      (metricType === "orders" ? item.orders > peakItem.orders : item.revenue > peakItem.revenue)
    ) {
      peakItem = item;
    }
  });

  const avgCheck = totalOrd > 0 ? Math.round(totalRev / totalOrd) : 0;
  const xAxisInterval = period === "day" ? 2 : period === "month" ? 3 : 0;

  return {
    availableDates,
    activeDataset,
    viewMetrics: {
      totalRevenue: totalRev,
      totalOrders: totalOrd,
      avgCheck,
      peakItem,
    },
    xAxisInterval,
  };
}

export function filterPublicShops(payload: WorkerFilterPublicShopsPayload): WorkerFilterPublicShopsResult {
  const {
    shops = [],
    searchQuery = "",
    category = "ALL",
    city = "ALL",
    onlyOpen = false,
    onlyDelivery = false,
    minRating = 0,
    hasCashback = false,
    favorites = [],
    onlyFavorites = false,
    sortBy = "popular",
    limit = 30,
    offset = 0,
  } = payload;

  const cleanQuery = searchQuery.trim().toLowerCase();
  const categoryCounts: Record<string, number> = {};

  // Count categories across all shops
  for (let i = 0; i < shops.length; i++) {
    const s = shops[i];
    if (s.categories && Array.isArray(s.categories)) {
      for (let j = 0; j < s.categories.length; j++) {
        const cat = s.categories[j];
        if (cat) {
          categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        }
      }
    }
  }

  let result = [...shops];

  // Filter by favorites
  if (onlyFavorites) {
    const favSet = new Set(favorites);
    result = result.filter((s) => favSet.has(s.id) || favSet.has(s.slug));
  }

  // Filter by open status
  if (onlyOpen) {
    result = result.filter((s) => s.isOpen !== false);
  }

  // Filter by delivery
  if (onlyDelivery) {
    result = result.filter((s) => {
      const d = s.deliveryOptions;
      return Boolean(d && (d.enabled || d.courier || d.shipping));
    });
  }

  // Filter by min rating
  if (minRating > 0) {
    result = result.filter((s) => (Number(s.avgRating) || 5) >= minRating);
  }

  // Filter by cashback
  if (hasCashback) {
    result = result.filter((s) => (Number(s.cashbackPercent) || 0) > 0);
  }

  // Filter by category
  if (category && category !== "ALL" && category !== "Все") {
    const lowerCat = category.toLowerCase();
    result = result.filter((s) => {
      const inCats = (s.categories || []).some(
        (c: string) => c.toLowerCase().includes(lowerCat) || lowerCat.includes(c.toLowerCase())
      );
      const inDesc = (s.description || "").toLowerCase().includes(lowerCat);
      return inCats || inDesc;
    });
  }

  // Filter by city
  if (city && city !== "ALL") {
    const lowerCity = city.toLowerCase();
    result = result.filter((s) => {
      return (s.address || "").toLowerCase().includes(lowerCity);
    });
  }

  // Filter by search query
  if (cleanQuery) {
    result = result.filter((s) => {
      const inName = (s.name || "").toLowerCase().includes(cleanQuery);
      const inDesc = (s.description || "").toLowerCase().includes(cleanQuery);
      const inAddr = (s.address || "").toLowerCase().includes(cleanQuery);
      const inCats = (s.categories || []).some((c: string) => c.toLowerCase().includes(cleanQuery));
      const inFeatured = (s.featuredServices || []).some((srv: any) =>
        (srv.title || "").toLowerCase().includes(cleanQuery)
      );
      return inName || inDesc || inAddr || inCats || inFeatured;
    });
  }

  // Sorting
  if (sortBy === "rating") {
    result.sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0) || (b.reviewsCount || 0) - (a.reviewsCount || 0));
  } else if (sortBy === "newest") {
    result.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  } else if (sortBy === "name") {
    result.sort((a, b) => (a.name || "").localeCompare(b.name || "", "ru"));
  } else if (sortBy === "services") {
    result.sort((a, b) => (b.servicesCount || 0) - (a.servicesCount || 0));
  } else {
    // popular default
    result.sort((a, b) => {
      const scoreA = (a.ordersCount || 0) * 3 + (a.reviewsCount || 0) * 2 + (a.avgRating || 5) * 5;
      const scoreB = (b.ordersCount || 0) * 3 + (b.reviewsCount || 0) * 2 + (b.avgRating || 5) * 5;
      return scoreB - scoreA;
    });
  }

  const totalFiltered = result.length;
  const paged = result.slice(offset, offset + limit);
  const hasMore = offset + limit < totalFiltered;

  return {
    filteredShops: paged,
    totalFiltered,
    hasMore,
    categoryCounts,
  };
}
