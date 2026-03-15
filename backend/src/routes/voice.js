import { Router } from 'express';
import { detectVoiceIntent } from '../nlp/intentDetector.js';
import {
  cancelOrder,
  computeStats,
  createOrder,
  getLatestOrder,
  getOrder,
  getStatusLabel,
  listOrders,
  modifyOrder,
  normalizeOrderId,
} from '../services/orderService.js';
import {
  sanitizeCustomerName,
  sanitizeItems,
  sanitizePlatform,
  sanitizeProductName,
  sanitizeVoiceCommand,
} from '../utils/requestValidation.js';
import { openWithPythonWebbrowser } from '../services/pythonBrowserLauncher.js';

const router = Router();

function normalizeItems(items) {
  return sanitizeItems(items, { fallbackDefaultItem: true });
}

function buildSearchUrl(platform, productName) {
  const safePlatform = sanitizePlatform(platform);
  const safeProduct = sanitizeProductName(productName, '');

  if (!safePlatform || !safeProduct) {
    return null;
  }

  const query = encodeURIComponent(safeProduct);
  if (safePlatform === 'amazon') {
    return `https://www.amazon.in/s?k=${query}`;
  }

  if (safePlatform === 'flipkart') {
    return `https://www.flipkart.com/search?q=${query}`;
  }

  return null;
}

function platformLabel(platform) {
  if (platform === 'amazon') {
    return 'Amazon';
  }

  if (platform === 'flipkart') {
    return 'Flipkart';
  }

  return '';
}

router.post('/', async (req, res) => {
  const safeCommand = sanitizeVoiceCommand(req.body?.command);

  if (!safeCommand) {
    return res.status(400).json({ success: false, message: 'command text is required and must be under 300 characters' });
  }

  const nlp = detectVoiceIntent(safeCommand);
  const { intent, entities } = nlp;

  if (intent === 'browse_product') {
    const safeProductName = sanitizeProductName(entities.productName, '');
    const safePlatform = sanitizePlatform(entities.platform);
    const openUrl = buildSearchUrl(safePlatform, safeProductName);

    if (!openUrl) {
      return res.status(400).json({
        success: false,
        message: 'Please mention both a product and platform (Amazon or Flipkart).',
      });
    }

    const order = await createOrder({
      customerName: sanitizeCustomerName(entities.customerName),
      productName: safeProductName,
      platform: safePlatform,
      items: normalizeItems(entities.items),
    });

    const browserResult = await openWithPythonWebbrowser(openUrl);
    const openMessage = browserResult.opened
      ? ` Opening ${platformLabel(safePlatform)} in your browser.`
      : ` Could not auto-open browser from backend, but the link is ready.`;

    const orders = await listOrders();
    return res.json({
      success: true,
      intent,
      confidence: nlp.confidence,
      responseText: `Order ${order.id} saved. Searching ${safeProductName} on ${platformLabel(safePlatform)}.${openMessage}`,
      openUrl,
      order,
      browserOpened: browserResult.opened,
      orders,
      stats: computeStats(orders),
    });
  }

  if (intent === 'create_order') {
    const safeProductName = sanitizeProductName(entities.productName, entities.items?.[0]?.name || 'generic product');
    const safePlatform = sanitizePlatform(entities.platform);

    const order = await createOrder({
      customerName: sanitizeCustomerName(entities.customerName),
      productName: safeProductName,
      platform: safePlatform,
      items: normalizeItems(entities.items),
    });

    const openUrl = buildSearchUrl(order.platform, order.productName);
    const platformResponse = openUrl
      ? ` Opening ${platformLabel(order.platform)} to search for the product.`
      : '';
    const browserResult = openUrl ? await openWithPythonWebbrowser(openUrl) : { opened: false };
    const browserResponse = openUrl && !browserResult.opened
      ? ' Could not auto-open browser from backend, but the link is ready.'
      : '';

    const orders = await listOrders();
    return res.json({
      success: true,
      intent,
      confidence: nlp.confidence,
      responseText: `Your order has been created successfully. Order ID is ${order.id}.${platformResponse}${browserResponse}`,
      openUrl,
      browserOpened: Boolean(browserResult.opened),
      order,
      orders,
      stats: computeStats(orders),
    });
  }

  if (intent === 'modify_order') {
    const targetOrderId = entities.orderId || (await getLatestOrder())?.id;
    if (!targetOrderId) {
      return res.status(404).json({ success: false, message: 'No order found to modify' });
    }

    const safeProductName = sanitizeProductName(entities.productName, '');
    const safePlatform = sanitizePlatform(entities.platform);

    const updated = await modifyOrder(targetOrderId, {
      addItems: normalizeItems(entities.items),
      replaceProductName: safeProductName,
      platform: safePlatform,
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: `Order ${normalizeOrderId(targetOrderId)} not found` });
    }

    const openUrl = buildSearchUrl(updated.platform, updated.productName);
    const platformResponse = openUrl
      ? ` Opening ${platformLabel(updated.platform)} to search for the product.`
      : '';
    const browserResult = openUrl ? await openWithPythonWebbrowser(openUrl) : { opened: false };
    const browserResponse = openUrl && !browserResult.opened
      ? ' Could not auto-open browser from backend, but the link is ready.'
      : '';

    const orders = await listOrders();
    return res.json({
      success: true,
      intent,
      confidence: nlp.confidence,
      responseText: `Your order has been updated successfully.${platformResponse}${browserResponse}`,
      openUrl,
      browserOpened: Boolean(browserResult.opened),
      order: updated,
      orders,
      stats: computeStats(orders),
    });
  }

  if (intent === 'track_order' || intent === 'order_status') {
    const targetOrderId = entities.orderId || (await getLatestOrder())?.id;
    if (!targetOrderId) {
      return res.status(404).json({ success: false, message: 'No order found to track' });
    }

    const order = await getOrder(targetOrderId);
    if (!order) {
      return res.status(404).json({ success: false, message: `Order ${normalizeOrderId(targetOrderId)} not found` });
    }

    const openUrl = buildSearchUrl(order.platform, order.productName);
    const platformResponse = openUrl
      ? ` Opening ${platformLabel(order.platform)} product search.`
      : '';

    const orders = await listOrders();
    return res.json({
      success: true,
      intent,
      confidence: nlp.confidence,
      responseText: `Order ${order.id} status is ${order.status}. ${getStatusLabel(order.status)}.${platformResponse}`,
      openUrl,
      order,
      orders,
      stats: computeStats(orders),
    });
  }

  if (intent === 'cancel_order') {
    const targetOrderId = entities.orderId || (await getLatestOrder())?.id;
    if (!targetOrderId) {
      return res.status(404).json({ success: false, message: 'No order found to cancel' });
    }

    const order = await cancelOrder(targetOrderId);
    if (!order) {
      return res.status(404).json({ success: false, message: `Order ${normalizeOrderId(targetOrderId)} not found` });
    }

    const orders = await listOrders();
    return res.json({
      success: true,
      intent,
      confidence: nlp.confidence,
      responseText: 'Your order has been cancelled.',
      order,
      orders,
      stats: computeStats(orders),
    });
  }

  if (intent === 'complete_order') {
    const targetOrderId = entities.orderId || (await getLatestOrder())?.id;
    if (!targetOrderId) {
      return res.status(404).json({ success: false, message: 'No order found to complete' });
    }

    const order = await modifyOrder(targetOrderId, { status: 'completed' });
    if (!order) {
      return res.status(404).json({ success: false, message: `Order ${normalizeOrderId(targetOrderId)} not found` });
    }

    const orders = await listOrders();
    return res.json({
      success: true,
      intent,
      confidence: nlp.confidence,
      responseText: `Order ${order.id} marked as completed.`,
      order,
      orders,
      stats: computeStats(orders),
    });
  }

  if (intent === 'show_stats') {
    const orders = await listOrders();
    const stats = computeStats(orders);

    return res.json({
      success: true,
      intent,
      confidence: nlp.confidence,
      responseText: `You have ${stats.totalOrders} total orders, ${stats.pendingOrders} pending, and ${stats.completedOrders} completed.`,
      orders,
      stats,
    });
  }

  const orders = await listOrders();
  return res.json({
    success: true,
    intent,
    confidence: nlp.confidence,
    responseText:
      'Sorry, I did not understand. Try create order, modify order, track order, cancel order, or order status.',
    orders,
    stats: computeStats(orders),
  });
});

export default router;
