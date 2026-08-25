const EMOJI_MAP: { keywords: string[]; emoji: string }[] = [
  // These must come BEFORE 'cloth' so 'bag' and 'shoe' match here first
  { keywords: ['shoe', 'footwear', 'sandal', 'boot', 'slipper', 'sneaker', 'heel', 'loafer'], emoji: '👟' },
  { keywords: ['bag', 'purse', 'handbag', 'luggage', 'backpack', 'suitcase', 'wallet', 'clutch'], emoji: '👜' },

  { keywords: ['provision', 'grocery', 'grocerie', 'supermarket', 'food store'], emoji: '🛒' },
  { keywords: ['cloth', 'fashion', 'wear', 'dress', 'shirt', 'trouser', 'textile', 'fabric', 'ankara', 'lace', 'skirt', 'blouse'], emoji: '👗' },
  { keywords: ['electron', 'phone', 'laptop', 'computer', 'gadget', 'device', 'tech'], emoji: '📱' },
  { keywords: ['drink', 'water', 'bev', 'juice', 'wine', 'beer', 'alcohol', 'soda', 'bottle', 'soft'], emoji: '🥤' },
  { keywords: ['food', 'cooked', 'meal', 'restaurant', 'eatery', 'snack', 'rice', 'soup', 'bread'], emoji: '🍲' },
  { keywords: ['beauty', 'cosmetic', 'makeup', 'hair', 'cream', 'lotion', 'skincare', 'perfume', 'fragrance'], emoji: '💄' },
  { keywords: ['build', 'material', 'cement', 'iron', 'rod', 'tile', 'paint', 'hardware', 'plumb'], emoji: '🏗️' },
  { keywords: ['pharma', 'medicine', 'drug', 'health', 'hospital', 'clinic', 'medical', 'supplement'], emoji: '💊' },
  { keywords: ['auto', 'car', 'vehicle', 'spare', 'part', 'motor', 'tyre', 'bike', 'engine'], emoji: '🚗' },
  { keywords: ['book', 'station', 'pen', 'paper', 'school', 'office', 'print'], emoji: '📚' },
  { keywords: ['farm', 'produce', 'crop', 'grain', 'seed', 'agro', 'fish', 'meat', 'poultry', 'egg', 'vegetable', 'fruit'], emoji: '🌾' },
  { keywords: ['furniture', 'household', 'home', 'chair', 'table', 'kitchen', 'decor', 'mattress', 'bed'], emoji: '🪑' },
  { keywords: ['recharge', 'airtime', 'data', 'card', 'voucher'], emoji: '📶' },
  { keywords: ['jewelry', 'jewellery', 'gold', 'silver', 'accessory', 'watch', 'bead', 'chain', 'ring'], emoji: '💍' },
  { keywords: ['baby', 'child', 'children', 'kid', 'toy', 'infant', 'diaper', 'pamper'], emoji: '🍼' },
];

export function getCategoryEmoji(name: string): string {
  const lower = name.toLowerCase();
  for (const { keywords, emoji } of EMOJI_MAP) {
    if (keywords.some(k => lower.includes(k))) return emoji;
  }
  return '📦';
}

export function formatStock(qty: number): string {
  if (qty === 0) return 'Out of stock';
  if (qty === 1) return '1 piece left';
  if (qty < 5) return `Only ${qty} left`;
  return `${qty} in stock`;
}

export function stockColor(qty: number): string {
  if (qty === 0) return '#C62828';
  if (qty < 5) return '#E65100';
  return '#2E7D32';
}
