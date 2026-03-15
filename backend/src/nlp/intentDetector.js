function parseItems(command) {
  const text = command.toLowerCase();
  const normalized = text.replace(/\band\b/g, ',');
  const pattern = /(\d+)\s+([a-z][a-z\s-]*?)(?=,|$)/g;
  const items = [];

  let match;
  while ((match = pattern.exec(normalized)) !== null) {
    const qty = Number(match[1]);
    const name = match[2]
      .replace(/\bto\s+order\s+(?:ord[-\s]?)?\d+\b/g, '')
      .replace(/\b(my|order|for|please)\b/g, '')
      .trim();

    if (qty > 0 && name) {
      items.push({ qty, name });
    }
  }

  return items;
}

function parsePlatform(command) {
  const match = command.match(/\b(amazon|flipkart)\b/i);
  return match ? match[1].toLowerCase() : null;
}

function cleanupProductName(raw) {
  if (!raw) {
    return null;
  }

  const cleaned = raw
    .toLowerCase()
    .replace(/\bfrom\s+(amazon|flipkart)\b/g, '')
    .replace(/\b(on|at)\s+(amazon|flipkart)\b/g, '')
    .replace(/\bplease\b/g, '')
    .replace(/[^a-z0-9\s\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned || null;
}

function parseCreateProduct(command) {
  const pattern =
    /(?:order|buy|purchase|create\s+order\s+for|create\s+order\s+of|create\s+order|order\s+a|order\s+an|buy\s+a|buy\s+an)\s+([a-z0-9][a-z0-9\s\-]{1,80}?)(?:\s+from\s+(amazon|flipkart)|\s+on\s+(amazon|flipkart)|$)/i;
  const match = command.match(pattern);

  if (!match) {
    return null;
  }

  return cleanupProductName(match[1]);
}

function parseModifyProduct(command) {
  const pattern =
    /(?:change|update|modify)\s+(?:my\s+)?order(?:\s+number\s+\d+|\s+ord[-\s]?\d+)?\s*(?:to|with|for)\s+([a-z0-9][a-z0-9\s\-]{1,80}?)(?:\s+from\s+(amazon|flipkart)|\s+on\s+(amazon|flipkart)|$)/i;
  const match = command.match(pattern);

  if (!match) {
    return null;
  }

  return cleanupProductName(match[1]);
}

function parseBrowseProduct(command) {
  const pattern =
    /(?:want|need|looking\s+for|search(?:\s+for)?|find|show\s+me|open)\s+([a-z0-9][a-z0-9\s\-]{1,80}?)(?:\s+from\s+(amazon|flipkart)|\s+on\s+(amazon|flipkart)|$)/i;
  const match = command.match(pattern);

  if (!match) {
    return null;
  }

  return cleanupProductName(match[1]);
}

function detectIntent(command) {
  const text = command.toLowerCase();
  const hasExistingOrderContext =
    /(order\s*(id|number)\s*(ord[-\s]?\d+|\d+)|order\s*(ord[-\s]?\d+|\d+)|\bord[-\s]?\d+\b|\bmy\s+order\b)/.test(
      text,
    );

  if (/(complete|finish|mark\s+completed).*(order)/.test(text)) {
    return { intent: 'complete_order', confidence: 0.93 };
  }

  if (/(show|display|get).*(stats|analytics|dashboard)|\bstats\b|\banalytics\b/.test(text)) {
    return { intent: 'show_stats', confidence: 0.91 };
  }

  if (/(cancel|abort|delete)\s+(my\s+)?order/.test(text)) {
    return { intent: 'cancel_order', confidence: 0.95 };
  }

  if (
    /(where is|track|locate).*(order)/.test(text) ||
    (/(track|where is|locate|find)\b/.test(text) && hasExistingOrderContext)
  ) {
    return { intent: 'track_order', confidence: 0.93 };
  }

  if (/(status).*(order)|order\s+status/.test(text)) {
    return { intent: 'order_status', confidence: 0.92 };
  }

  if (/(add|modify|update|change).*(order)/.test(text)) {
    return { intent: 'modify_order', confidence: 0.9 };
  }

  if (/\border\s+(?!status\b)(?:a|an|my\s+)?[a-z0-9]/.test(text) && !hasExistingOrderContext) {
    return { intent: 'create_order', confidence: 0.93 };
  }

  if (/(buy|purchase)\s+[a-z0-9]/.test(text)) {
    return { intent: 'create_order', confidence: 0.93 };
  }

  if (/(create|place|make|new).*(order)/.test(text)) {
    return { intent: 'create_order', confidence: 0.94 };
  }

  if (
    /(want|need|looking\s+for|search(?:\s+for)?|find|show\s+me|open).*[a-z0-9]/.test(text) &&
    !/(cancel|abort|delete|track|status|modify|update|change|complete|finish).*(order)/.test(text)
  ) {
    return { intent: 'browse_product', confidence: 0.89 };
  }

  return { intent: 'unknown', confidence: 0.4 };
}

function parseOrderReference(command) {
  const explicitOrderMatch = command.match(/order\s*(?:id|number)?\s*(ord[-\s]?\d+|\d{1,})/i);
  if (explicitOrderMatch) {
    return explicitOrderMatch[1];
  }

  const prefixedOrderMatch = command.match(/\b(ord[-\s]?\d+)\b/i);
  if (prefixedOrderMatch) {
    return prefixedOrderMatch[1];
  }

  return null;
}

function parseCustomer(command) {
  const match = command.match(/for\s+([a-zA-Z\s]+?)\s+with\b/i);
  return match ? match[1].trim() : null;
}

export function detectVoiceIntent(command) {
  const intentData = detectIntent(command);
  const productFromCreate = parseCreateProduct(command);
  const productFromModify = parseModifyProduct(command);
  const productFromBrowse = parseBrowseProduct(command);
  const intentAwareProduct =
    intentData.intent === 'modify_order'
      ? productFromModify || productFromCreate || productFromBrowse
      : intentData.intent === 'browse_product'
        ? productFromBrowse || productFromCreate
        : productFromCreate || productFromBrowse;

  return {
    ...intentData,
    entities: {
      orderId: parseOrderReference(command),
      customerName: parseCustomer(command),
      items: parseItems(command),
      productName: intentAwareProduct,
      platform: parsePlatform(command),
      rawText: command,
    },
  };
}
