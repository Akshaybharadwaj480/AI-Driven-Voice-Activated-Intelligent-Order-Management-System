import { Router } from 'express';
import {
  cancelOrder,
  computeStats,
  createOrder,
  getOrder,
  listOrders,
  modifyOrder,
  normalizeOrderId,
} from '../services/orderService.js';
import {
  isValidStatus,
  sanitizeAmount,
  sanitizeCustomerName,
  sanitizeItems,
  sanitizePlatform,
  sanitizeProductName,
} from '../utils/requestValidation.js';

const router = Router();

router.get('/', async (_req, res) => {
  const orders = await listOrders();
  return res.json({ success: true, orders, stats: computeStats(orders) });
});

router.get('/:orderId', async (req, res) => {
  const order = await getOrder(req.params.orderId);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }
  return res.json({ success: true, order });
});

router.post('/', async (req, res) => {
  const body = req.body || {};
  const amount = sanitizeAmount(body.amount);

  if (amount === null) {
    return res.status(400).json({ success: false, message: 'amount must be a non-negative number' });
  }

  const order = await createOrder({
    customerName: sanitizeCustomerName(body.customerName),
    amount,
    productName: sanitizeProductName(body.productName, ''),
    platform: sanitizePlatform(body.platform),
    items: sanitizeItems(body.items, { fallbackDefaultItem: true }),
  });

  const orders = await listOrders();
  return res.status(201).json({ success: true, order, stats: computeStats(orders) });
});

router.patch('/:orderId', async (req, res) => {
  const body = req.body || {};
  const addAmount = sanitizeAmount(body.addAmount, 0);
  if (addAmount === null) {
    return res.status(400).json({ success: false, message: 'addAmount must be a non-negative number' });
  }

  if (body.status !== undefined && !isValidStatus(body.status)) {
    return res.status(400).json({ success: false, message: 'status value is invalid' });
  }

  const updated = await modifyOrder(req.params.orderId, {
    status: body.status,
    addAmount,
    customerName: sanitizeCustomerName(body.customerName, ''),
    addItems: sanitizeItems(body.addItems),
    replaceProductName: sanitizeProductName(body.replaceProductName, ''),
    platform: sanitizePlatform(body.platform),
  });

  if (!updated) {
    return res.status(404).json({ success: false, message: `Order ${normalizeOrderId(req.params.orderId)} not found` });
  }

  const orders = await listOrders();
  return res.json({ success: true, order: updated, stats: computeStats(orders) });
});

router.delete('/:orderId', async (req, res) => {
  const cancelled = await cancelOrder(req.params.orderId);
  if (!cancelled) {
    return res.status(404).json({ success: false, message: `Order ${normalizeOrderId(req.params.orderId)} not found` });
  }

  const orders = await listOrders();
  return res.json({ success: true, order: cancelled, stats: computeStats(orders) });
});

export default router;
