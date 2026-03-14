export type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled';
export type ShoppingPlatform = 'amazon' | 'flipkart';

export interface Order {
  id: string;
  customer: string;
  productName: string;
  platform: ShoppingPlatform | null;
  amount: number;
  status: OrderStatus;
  items: number;
  createdAt: string;
}

export interface OrderStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  revenue: number;
}

export const ORDER_UPDATE_EVENT = 'ai-vaom-orders-updated';

interface BackendOrderItem {
  name: string;
  qty: number;
}

interface BackendOrder {
  id: string;
  customerName: string;
  productName?: string;
  platform?: string | null;
  amount?: number;
  status: string;
  items: BackendOrderItem[];
  createdAt: string;
  updatedAt?: string;
}

interface BackendStats {
  totalOrders?: number;
  pendingOrders?: number;
  completedOrders?: number;
  revenue?: number;
}

interface VoiceCommandApiResponse {
  success: boolean;
  responseText?: string;
  stats?: BackendStats;
  openUrl?: string | null;
  message?: string;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

function isBrowser() {
  return typeof window !== 'undefined';
}

function mapBackendStatus(status: string): OrderStatus {
  if (status === 'completed' || status === 'delivered') {
    return 'completed';
  }

  if (status === 'processing' || status === 'preparing' || status === 'out_for_delivery') {
    return 'processing';
  }

  if (status === 'cancelled') {
    return 'cancelled';
  }

  return 'pending';
}

function mapFrontendStatus(status: OrderStatus): string {
  switch (status) {
    case 'pending':
      return 'pending';
    case 'processing':
      return 'processing';
    case 'completed':
      return 'completed';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'pending';
  }
}

function toNumberOrZero(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapBackendStats(stats: BackendStats | undefined): OrderStats {
  return {
    totalOrders: Math.max(0, Math.round(toNumberOrZero(stats?.totalOrders))),
    pendingOrders: Math.max(0, Math.round(toNumberOrZero(stats?.pendingOrders))),
    completedOrders: Math.max(0, Math.round(toNumberOrZero(stats?.completedOrders))),
    revenue: Math.max(0, Math.round(toNumberOrZero(stats?.revenue))),
  };
}

function toOrder(apiOrder: BackendOrder): Order {
  const totalItems = Array.isArray(apiOrder.items)
    ? apiOrder.items.reduce((sum, item) => sum + Math.max(1, Number(item.qty || 1)), 0)
    : 1;

  const normalizedAmount = Number(apiOrder.amount) > 0 ? Math.max(1, Math.round(Number(apiOrder.amount))) : totalItems * 120;

  const leadItem = apiOrder.items?.[0]?.name || 'unknown product';
  const safeProductName = String(apiOrder.productName || leadItem).trim();
  const platform =
    apiOrder.platform === 'amazon' || apiOrder.platform === 'flipkart' ? apiOrder.platform : null;

  return {
    id: apiOrder.id,
    customer: apiOrder.customerName || 'Unknown Customer',
    productName: safeProductName || 'unknown product',
    platform,
    amount: normalizedAmount,
    status: mapBackendStatus(apiOrder.status),
    items: totalItems,
    createdAt: apiOrder.createdAt || new Date().toISOString(),
  };
}

function emitOrderUpdate() {
  if (!isBrowser()) {
    return;
  }

  window.dispatchEvent(new CustomEvent(ORDER_UPDATE_EVENT));
}

function sortOrders(orders: Order[]) {
  return [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

async function requestApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.message || body?.responseText || `Request failed with status ${response.status}`);
  }

  return body as T;
}

export async function initializeOrders(): Promise<Order[]> {
  return getOrders();
}

export async function getOrders(): Promise<Order[]> {
  const data = await requestApi<{ success: boolean; orders: BackendOrder[] }>('/api/orders');
  return sortOrders((data.orders || []).map(toOrder));
}

export function saveOrders(_orders: Order[]) {
  emitOrderUpdate();
}

export async function addOrder(input: { customer: string; amount: number; items: number }): Promise<Order> {
  const payload = {
    customerName: input.customer,
    amount: Math.max(1, Math.round(input.amount)),
    items: [{ name: 'custom item', qty: Math.max(1, Math.round(input.items)) }],
  };

  const data = await requestApi<{ success: boolean; order: BackendOrder }>('/api/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  emitOrderUpdate();
  return toOrder(data.order);
}

export async function createProductOrder(input: {
  customer: string;
  productName: string;
  platform?: ShoppingPlatform | null;
}): Promise<Order> {
  const safeProductName = input.productName.trim() || 'generic product';

  const data = await requestApi<{ success: boolean; order: BackendOrder }>('/api/orders', {
    method: 'POST',
    body: JSON.stringify({
      customerName: input.customer.trim() || 'Walk-in Customer',
      productName: safeProductName,
      platform: input.platform || null,
      items: [{ name: safeProductName, qty: 1 }],
      amount: 120,
    }),
  });

  emitOrderUpdate();
  return toOrder(data.order);
}

export function normalizeOrderId(rawId: string) {
  const match = rawId.toUpperCase().match(/(?:ORD[-\s]?)?(\d{1,})/);
  if (!match) {
    return rawId.toUpperCase();
  }

  return `ORD-${String(Number(match[1])).padStart(3, '0')}`;
}

export async function findOrder(orderId: string): Promise<Order | null> {
  const normalized = normalizeOrderId(orderId);
  try {
    const data = await requestApi<{ success: boolean; order: BackendOrder }>(`/api/orders/${normalized}`);
    return toOrder(data.order);
  } catch {
    return null;
  }
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order | null> {
  const normalized = normalizeOrderId(orderId);

  try {
    const data = await requestApi<{ success: boolean; order: BackendOrder }>(`/api/orders/${normalized}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: mapFrontendStatus(status) }),
    });

    emitOrderUpdate();
    return toOrder(data.order);
  } catch {
    return null;
  }
}

export async function modifyOrder(
  orderId: string,
  updates: {
    addItems?: number;
    addAmount?: number;
    customer?: string;
  },
): Promise<Order | null> {
  const normalized = normalizeOrderId(orderId);

  const addItems = Math.max(0, Math.round(updates.addItems ?? 0));
  const payload = {
    addItems: addItems > 0 ? [{ name: 'extra item', qty: addItems }] : [],
    addAmount: Math.max(0, Math.round(updates.addAmount ?? 0)),
    customerName: updates.customer?.trim() ? updates.customer.trim() : undefined,
  };

  try {
    const data = await requestApi<{ success: boolean; order: BackendOrder }>(`/api/orders/${normalized}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });

    emitOrderUpdate();
    return toOrder(data.order);
  } catch {
    return null;
  }
}

export async function replaceOrderProduct(
  orderId: string,
  updates: { productName: string; platform?: ShoppingPlatform | null },
): Promise<Order | null> {
  const normalized = normalizeOrderId(orderId);

  try {
    const data = await requestApi<{ success: boolean; order: BackendOrder }>(`/api/orders/${normalized}`, {
      method: 'PATCH',
      body: JSON.stringify({
        replaceProductName: updates.productName.trim(),
        platform: updates.platform || null,
      }),
    });

    emitOrderUpdate();
    return toOrder(data.order);
  } catch {
    return null;
  }
}

export async function cancelOrderById(orderId: string): Promise<Order | null> {
  return updateOrderStatus(orderId, 'cancelled');
}

export function getOrderStats(orders: Order[]): OrderStats {
  const activeOrders = orders.filter((order) => order.status !== 'cancelled');

  return {
    totalOrders: activeOrders.length,
    pendingOrders: orders.filter((order) => order.status === 'pending' || order.status === 'processing').length,
    completedOrders: orders.filter((order) => order.status === 'completed').length,
    revenue: orders
      .filter((order) => order.status !== 'cancelled')
      .reduce((sum, order) => sum + order.amount, 0),
  };
}

export async function executeVoiceCommandApi(command: string): Promise<{
  spokenResponse: string;
  stats?: OrderStats;
  openUrl?: string | null;
}> {
  const data = await requestApi<VoiceCommandApiResponse>('/api/voice-command', {
    method: 'POST',
    body: JSON.stringify({ command }),
  });

  emitOrderUpdate();

  return {
    spokenResponse: data.responseText || data.message || 'Command processed.',
    stats: data.stats ? mapBackendStats(data.stats) : undefined,
    openUrl: data.openUrl || null,
  };
}
