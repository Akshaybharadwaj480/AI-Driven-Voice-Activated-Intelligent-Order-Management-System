import { getOrdersCollection } from '../db/mongoClient.js';

const MAX_ITEM_NAME_LENGTH = 80;
const MAX_CUSTOMER_NAME_LENGTH = 80;
const MAX_ITEMS_PER_ORDER = 25;
const MAX_ITEM_QTY = 100;
const ALLOWED_PLATFORMS = new Set(['amazon', 'flipkart']);

const STATUS_STEPS = {
  pending: 'Order created and waiting for confirmation',
  processing: 'Kitchen is preparing your order',
  completed: 'Order delivered successfully',
  cancelled: 'Order has been cancelled',
  created: 'Order created and waiting for confirmation',
  preparing: 'Kitchen is preparing your order',
  out_for_delivery: 'Order is out for delivery',
  delivered: 'Order delivered successfully',
};

const VALID_STATUSES = new Set([
  'pending',
  'processing',
  'completed',
  'cancelled',
  'created',
  'preparing',
  'out_for_delivery',
  'delivered',
]);

let initPromise;

async function ensureInitialized() {
  if (!initPromise) {
    initPromise = (async () => {
      const collection = await getOrdersCollection();
      await collection.createIndex({ id: 1 }, { unique: true });
    })();
  }

  await initPromise;
}

function sanitizeOrder(order) {
  if (!order) {
    return null;
  }

  const { _id, ...safe } = order;
  return safe;
}

function calculateOrderAmount(order) {
  if (Number(order?.amount) > 0) {
    return Math.max(1, Math.round(Number(order.amount)));
  }

  const totalItems = (order?.items || []).reduce((sum, item) => sum + Math.max(1, Number(item.qty || 1)), 0);
  return totalItems * 120;
}

function normalizeOrderId(orderId) {
  if (!orderId) return null;
  const match = String(orderId).toUpperCase().match(/(?:ORD[-\s]?)?(\d{1,})/);
  if (!match) return String(orderId).toUpperCase();
  return `ORD-${String(Number(match[1])).padStart(3, '0')}`;
}

function nextOrderId(orders) {
  const max = orders.reduce((m, o) => {
    const numeric = Number(String(o.id).replace(/[^0-9]/g, ''));
    return Number.isFinite(numeric) ? Math.max(m, numeric) : m;
  }, 100);
  return `ORD-${String(max + 1).padStart(3, '0')}`;
}

function normalizeItems(items = []) {
  return items
    .slice(0, MAX_ITEMS_PER_ORDER)
    .filter((item) => item && item.name)
    .map((item) => ({
      name: String(item.name).trim().toLowerCase().slice(0, MAX_ITEM_NAME_LENGTH),
      qty: Math.min(MAX_ITEM_QTY, Math.max(1, Math.round(Number(item.qty || 1)))),
    }));
}

function normalizeProductName(value, fallback = 'default item') {
  if (typeof value !== 'string') {
    return fallback;
  }

  const cleaned = value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^a-zA-Z0-9\s\-]/g, '')
    .toLowerCase();

  if (!cleaned) {
    return fallback;
  }

  return cleaned.slice(0, MAX_ITEM_NAME_LENGTH);
}

function normalizePlatform(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return ALLOWED_PLATFORMS.has(normalized) ? normalized : null;
}

function normalizeCustomerName(value) {
  if (typeof value !== 'string') {
    return 'Walk-in Customer';
  }

  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (!trimmed) {
    return 'Walk-in Customer';
  }

  return trimmed.slice(0, MAX_CUSTOMER_NAME_LENGTH);
}

function mergeItems(existingItems, addItems) {
  const map = new Map();
  for (const item of existingItems) {
    map.set(item.name, { ...item });
  }
  for (const item of addItems) {
    const found = map.get(item.name);
    if (found) {
      found.qty += item.qty;
    } else {
      map.set(item.name, { ...item });
    }
  }
  return [...map.values()];
}

export function computeStats(orders) {
  const activeOrders = orders.filter((o) => o.status !== 'cancelled');

  return {
    totalOrders: activeOrders.length,
    pendingOrders: orders.filter((o) => ['pending', 'processing', 'created', 'preparing', 'out_for_delivery'].includes(o.status)).length,
    completedOrders: orders.filter((o) => ['completed', 'delivered'].includes(o.status)).length,
    revenue: orders
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, order) => sum + calculateOrderAmount(order), 0),
  };
}

export async function listOrders() {
  await ensureInitialized();
  const collection = await getOrdersCollection();
  const orders = await collection.find({}, { projection: { _id: 0 } }).sort({ updatedAt: -1 }).toArray();
  return orders;
}

export async function getOrder(orderId) {
  const normalized = normalizeOrderId(orderId);
  await ensureInitialized();
  const collection = await getOrdersCollection();
  const order = await collection.findOne({ id: normalized }, { projection: { _id: 0 } });
  return sanitizeOrder(order);
}

export async function getLatestOrder() {
  await ensureInitialized();
  const collection = await getOrdersCollection();
  const latest = await collection.findOne({}, { sort: { updatedAt: -1 }, projection: { _id: 0 } });
  return sanitizeOrder(latest);
}

export async function createOrder({ customerName, items, amount, productName, platform }) {
  await ensureInitialized();
  const collection = await getOrdersCollection();
  const now = new Date().toISOString();
  const normalizedItems = normalizeItems(items);
  const safeProductName = normalizeProductName(productName, normalizedItems[0]?.name || 'default item');
  const safeItems = normalizedItems.length > 0 ? normalizedItems : [{ name: safeProductName, qty: 1 }];
  const safePlatform = normalizePlatform(platform);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const existingOrders = await listOrders();
    const proposedAmount = Number(amount) > 0 ? Math.max(1, Math.round(Number(amount))) : 0;
    const order = {
      id: nextOrderId(existingOrders),
      customerName: normalizeCustomerName(customerName),
      productName: safeProductName,
      platform: safePlatform,
      status: 'pending',
      amount: proposedAmount,
      items: safeItems,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await collection.insertOne(order);
      return sanitizeOrder(order);
    } catch (error) {
      if (error?.code === 11000 && attempt < 2) {
        continue;
      }

      throw error;
    }
  }

  throw new Error('Unable to generate a unique order id after multiple attempts');
}

export async function modifyOrder(orderId, { addItems = [], status, addAmount, customerName, replaceProductName, platform } = {}) {
  const normalized = normalizeOrderId(orderId);
  await ensureInitialized();
  const collection = await getOrdersCollection();
  const current = await collection.findOne({ id: normalized }, { projection: { _id: 0 } });

  if (!current) return null;

  const normalizedAddedItems = normalizeItems(addItems);
  const safeReplaceProduct =
    typeof replaceProductName === 'string' ? normalizeProductName(replaceProductName, '') : '';

  let nextItems = current.items;
  if (safeReplaceProduct) {
    nextItems = [{ name: safeReplaceProduct, qty: 1 }];
  } else if (normalizedAddedItems.length > 0) {
    nextItems = mergeItems(current.items || [], normalizedAddedItems);
  }

  const amountDelta = Number(addAmount) > 0 ? Number(addAmount) : 0;
  const nextAmount = Math.max(1, Math.round(calculateOrderAmount(current) + amountDelta));
  const safeStatus = status && VALID_STATUSES.has(status) ? status : current.status;
  const safeCustomerName = typeof customerName === 'string' ? normalizeCustomerName(customerName) : current.customerName;
  const nextProductName = safeReplaceProduct || nextItems?.[0]?.name || current.productName || 'default item';
  const nextPlatform = normalizePlatform(platform) ?? current.platform ?? null;

  const updated = {
    ...current,
    customerName: safeCustomerName,
    productName: nextProductName,
    platform: nextPlatform,
    amount: nextAmount,
    items: nextItems,
    status: safeStatus,
    updatedAt: new Date().toISOString(),
  };

  await collection.updateOne({ id: normalized }, { $set: updated });
  return updated;
}

export async function cancelOrder(orderId) {
  return modifyOrder(orderId, { status: 'cancelled' });
}

export function getStatusLabel(status) {
  return STATUS_STEPS[status] || 'Status unavailable';
}

export { normalizeOrderId };
