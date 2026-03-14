const ALLOWED_STATUSES = new Set([
  'pending',
  'processing',
  'completed',
  'cancelled',
  'created',
  'preparing',
  'out_for_delivery',
  'delivered',
]);

const MAX_ITEM_NAME_LENGTH = 80;
const MAX_CUSTOMER_NAME_LENGTH = 80;
const MAX_ITEMS_PER_REQUEST = 25;
const MAX_ITEM_QTY = 100;
const MAX_AMOUNT = 1_000_000;
const MAX_COMMAND_LENGTH = 300;
const ALLOWED_PLATFORMS = new Set(['amazon', 'flipkart']);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function sanitizeCustomerName(value, fallback = 'Walk-in Customer') {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (!trimmed) {
    return fallback;
  }

  return trimmed.slice(0, MAX_CUSTOMER_NAME_LENGTH);
}

export function sanitizeAmount(value, fallback = 0) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return clamp(Math.round(parsed), 0, MAX_AMOUNT);
}

export function sanitizeItems(items, options = {}) {
  const { fallbackDefaultItem = false } = options;
  if (!Array.isArray(items)) {
    return fallbackDefaultItem ? [{ name: 'default item', qty: 1 }] : [];
  }

  const normalized = items
    .slice(0, MAX_ITEMS_PER_REQUEST)
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const rawName = typeof item.name === 'string' ? item.name.trim().toLowerCase() : '';
      if (!rawName) {
        return null;
      }

      const qtyRaw = Number(item.qty || 1);
      const qty = Number.isFinite(qtyRaw) ? clamp(Math.round(qtyRaw), 1, MAX_ITEM_QTY) : 1;

      return {
        name: rawName.slice(0, MAX_ITEM_NAME_LENGTH),
        qty,
      };
    })
    .filter(Boolean);

  if (normalized.length === 0 && fallbackDefaultItem) {
    return [{ name: 'default item', qty: 1 }];
  }

  return normalized;
}

export function sanitizeProductName(value, fallback = '') {
  if (typeof value !== 'string') {
    return fallback;
  }

  const cleaned = value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^a-zA-Z0-9\s\-]/g, '');

  if (!cleaned) {
    return fallback;
  }

  return cleaned.slice(0, MAX_ITEM_NAME_LENGTH);
}

export function sanitizePlatform(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  return ALLOWED_PLATFORMS.has(normalized) ? normalized : null;
}

export function isValidStatus(status) {
  return typeof status === 'string' && ALLOWED_STATUSES.has(status);
}

export function sanitizeVoiceCommand(command) {
  if (typeof command !== 'string') {
    return null;
  }

  const trimmed = command.trim();
  if (!trimmed || trimmed.length > MAX_COMMAND_LENGTH) {
    return null;
  }

  return trimmed;
}
