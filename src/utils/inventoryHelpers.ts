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

const PRODUCT_EMOJI_MAP: { keywords: string[]; emoji: string }[] = [
  // Noodles — before food/snack
  { keywords: ['indomie', 'noodle', 'pasta', 'spaghetti', 'macaroni'], emoji: '🍜' },
  // Rice
  { keywords: ['rice', 'ofada', 'basmati', 'parboiled', 'jollof'], emoji: '🍚' },
  // Bread / bakery
  { keywords: ['bread', 'loaf', 'bun', 'cake', 'pastry', 'chin chin', 'doughnut', 'moi moi'], emoji: '🍞' },
  // Egg
  { keywords: ['egg'], emoji: '🥚' },
  // Water — before drink
  { keywords: ['pure water', 'sachet water', 'bottled water', 'table water', 'aquafina', 'eva water', 'swan water'], emoji: '💧' },
  // Soft drink / soda
  { keywords: ['coke', 'pepsi', 'sprite', 'fanta', 'mirinda', 'seven up', '7up', 'zobo', 'chapman', 'malt', 'malta', 'soft drink', 'soda water'], emoji: '🥤' },
  // Beer / alcohol
  { keywords: ['beer', 'stout', 'guinness', 'heineken', 'star lager', 'trophy', 'lager', 'wine', 'gin', 'whiskey', 'vodka', 'spirit', 'ogogoro', 'schnapps'], emoji: '🍺' },
  // Juice
  { keywords: ['juice', 'chivita', 'capri', 'hollandia', 'five alive', 'bigi juice', 'nectar'], emoji: '🧃' },
  // Milk / dairy
  { keywords: ['milk', 'peak milk', 'peak tin', 'evaporated milk', 'yogurt', 'yoghurt', 'butter', 'cheese', 'cowbell', 'nunu'], emoji: '🥛' },
  // Beans / legumes
  { keywords: ['beans', 'lentil', 'soya', 'soybean', 'black eyed', 'oloyin'], emoji: '🫘' },
  // Tubers / starchy staples
  { keywords: ['garri', 'yam', 'cassava', 'plantain', 'cocoyam', 'eba', 'fufu', 'semovita', 'amala', 'pounded yam', 'tuwo', 'akpu'], emoji: '🍠' },
  // Vegetables
  { keywords: ['vegetable', 'ugu', 'spinach', 'lettuce', 'cucumber', 'carrot', 'cabbage', 'bitter leaf', 'waterleaf', 'efo', 'ewedu', 'okro', 'okra', 'tatashe'], emoji: '🥬' },
  // Tomato / pepper — after vegetables so 'tatashe' hits vegetable first
  { keywords: ['tomato', 'onion', 'pepper', 'scotch bonnet', 'habanero'], emoji: '🍅' },
  // Fruit
  { keywords: ['apple', 'orange', 'banana', 'mango', 'pineapple', 'pawpaw', 'papaya', 'watermelon', 'grape', 'lemon', 'coconut', 'avocado', 'strawberry', 'pear'], emoji: '🍎' },
  // Chicken / poultry
  { keywords: ['chicken', 'turkey', 'duck', 'gizzard', 'liver', 'orobo', 'turkey wing'], emoji: '🍗' },
  // Meat / beef
  { keywords: ['beef', 'goat meat', 'pork', 'ponmo', 'tripe', 'suya', 'kilishi', 'sausage', 'hot dog', 'minced meat', 'ram'], emoji: '🥩' },
  // Fish / seafood
  { keywords: ['fish', 'catfish', 'tilapia', 'sardine', 'tuna', 'mackerel', 'titus', 'shrimp', 'prawn', 'crayfish', 'stockfish', 'stock fish', 'mangala', 'panla'], emoji: '🐟' },
  // Seasoning / spice
  { keywords: ['seasoning', 'maggi', 'knorr', 'curry', 'thyme', 'salt', 'sugar', 'spice', 'egusi', 'ogiri', 'dawadawa', 'uziza'], emoji: '🧂' },
  // Cooking oil
  { keywords: ['oil'], emoji: '🫙' },
  // Snacks / biscuit
  { keywords: ['biscuit', 'cookie', 'cracker', 'cabin biscuit', 'rich tea', 'shortcake', 'marie biscuit', 'chocolate', 'sweet', 'candy', 'lollipop', 'gum', 'bubblegum', 'puff puff', 'akara', 'doughnut'], emoji: '🍪' },
  // Chips / crisps / nuts
  { keywords: ['chip', 'crisp', 'popcorn', 'groundnut', 'peanut', 'cashew', 'nut', 'plantain chip'], emoji: '🍿' },
  // Soap / detergent
  { keywords: ['soap', 'detergent', 'omo', 'ariel', 'sunlight', 'key soap', 'dettol', 'izal', 'bleach', 'jik', 'washing powder', 'harpic', 'liquid soap', 'hand wash', 'hand sanitizer'], emoji: '🧼' },
  // Toothpaste / oral
  { keywords: ['toothpaste', 'toothbrush', 'mouthwash', 'closeup', 'close-up', 'macleans', 'colgate', 'oral b', 'oral-b', 'sensodyne', 'dental floss'], emoji: '🦷' },
  // Body lotion / skincare
  { keywords: ['lotion', 'body cream', 'moisturis', 'body butter', 'vaseline', 'palmer', 'fair lovely', 'skin glow', 'body oil', 'body milk', 'face cream', 'sunscreen', 'spf'], emoji: '🧴' },
  // Shampoo / hair care
  { keywords: ['shampoo', 'conditioner', 'relaxer', 'perm', 'weave', 'wig', 'braids', 'hair oil', 'hair spray', 'hair gel', 'dark lovely', 'hair food', 'hair cream', 'hair dye'], emoji: '💆' },
  // Perfume / deodorant
  { keywords: ['perfume', 'cologne', 'deodorant', 'roll-on', 'body spray', 'antiperspirant', 'axe', 'rexona', 'sure deodorant', 'dove spray', 'nivea spray'], emoji: '🌸' },
  // Sanitary / pad
  { keywords: ['sanitary pad', 'tampon', 'always pad', 'kotex', 'stayfree', 'feminine pad', 'menstrual'], emoji: '🩹' },
  // Diaper / baby
  { keywords: ['diaper', 'pamper', 'huggies', 'molfix', 'nappy', 'baby wipe', 'wet wipe'], emoji: '👶' },
  // Phone / smartphone brand
  { keywords: ['iphone', 'samsung', 'tecno', 'infinix', 'itel', 'redmi', 'xiaomi', 'nokia', 'oppo', 'vivo', 'smartphone', 'mobile phone'], emoji: '📱' },
  // Phone accessories
  { keywords: ['charger', 'earphone', 'headphone', 'earpiece', 'earbuds', 'airpod', 'screen protector', 'phone case', 'power bank', 'powerbank', 'usb cable', 'type-c', 'lightning cable'], emoji: '🔌' },
  // Battery / bulb
  { keywords: ['battery', 'bulb', 'torch', 'flashlight', 'led bulb', 'fluorescent', 'rechargeable torch', 'lantern'], emoji: '🔋' },
  // Laptop / computer
  { keywords: ['laptop', 'computer', 'desktop', 'printer', 'keyboard', 'mouse', 'monitor', 'hard drive', 'flash drive', 'memory card', 'sd card'], emoji: '💻' },
  // TV / large electronics
  { keywords: ['tv', 'television', 'decoder', 'dstv', 'gotv', 'remote control', 'speaker', 'radio', 'fan', 'refrigerator', 'fridge', 'washing machine', 'blender', 'pressing iron', 'electric iron'], emoji: '📺' },
  // Stationery / pen
  { keywords: ['pen', 'pencil', 'biro', 'marker', 'highlighter', 'ruler', 'stapler', 'sellotape', 'glue stick', 'eraser', 'rubber', 'sharpener'], emoji: '✏️' },
  // Notebook / paper
  { keywords: ['notebook', 'exercise book', 'jotter', 'notepad', 'textbook', 'paper ream', 'card sheet'], emoji: '📓' },
  // Medicine / health
  { keywords: ['paracetamol', 'panadol', 'ibuprofen', 'vitamin', 'capsule', 'tablet', 'syrup', 'inhaler', 'ointment', 'plaster', 'bandage', 'cotton wool', 'supplement', 'amoxicillin', 'ampiclox', 'malaria drug'], emoji: '💊' },
  // Recharge / airtime
  { keywords: ['recharge card', 'airtime', 'data plan', 'mtn card', 'glo card', 'airtel card', '9mobile', 'sim card'], emoji: '📶' },
  // Fuel / gas
  { keywords: ['petrol', 'kerosene', 'diesel', 'cooking gas', 'lpg', 'gas cylinder', 'gas refill', 'fuel'], emoji: '⛽' },
  // Shirt / top
  { keywords: ['shirt', 't-shirt', 'tshirt', 'blouse', 'polo', 'jersey', 'singlet', 'vest', 'sweatshirt', 'hoodie', 'cardigan'], emoji: '👕' },
  // Trouser / bottom
  { keywords: ['trouser', 'jean', 'denim', 'short', 'skirt', 'legging', 'chino', 'jogger pant'], emoji: '👖' },
  // Dress / native
  { keywords: ['dress', 'gown', 'agbada', 'kaftan', 'ankara', 'lace material', 'aso-ebi', 'boubou', 'buba', 'iro and buba'], emoji: '👗' },
  // Shoe / footwear
  { keywords: ['shoe', 'sandal', 'slipper', 'boot', 'sneaker', 'heel', 'loafer', 'flat shoe', 'canvas shoe', 'chappal'], emoji: '👟' },
  // Bag
  { keywords: ['bag', 'handbag', 'purse', 'backpack', 'school bag', 'laptop bag', 'suitcase', 'luggage', 'wallet', 'clutch bag', 'tote bag'], emoji: '👜' },
  // Watch / jewelry
  { keywords: ['watch', 'wristwatch', 'bracelet', 'necklace', 'earring', 'ring', 'bead', 'chain', 'anklet', 'cufflink'], emoji: '⌚' },
  // Candle / matches
  { keywords: ['candle', 'matchbox', 'lighter'], emoji: '🕯️' },
  // Broom / mop
  { keywords: ['broom', 'mop', 'dustpan', 'scrubbing brush', 'sponge'], emoji: '🧹' },
  // Pots / kitchen items
  { keywords: ['pot', 'frying pan', 'kettle', 'cooler', 'flask', 'thermos', 'plate', 'cup', 'mug', 'spoon', 'fork', 'bowl', 'bucket', 'basin', 'jerry can'], emoji: '🍳' },
  // Building materials
  { keywords: ['cement', 'iron rod', 'nail', 'screw', 'tile', 'paint', 'plank', 'pipe', 'bolt', 'sandpaper', 'primer', 'varnish', 'putty'], emoji: '🏗️' },
  // Farming / agriculture
  { keywords: ['fertilizer', 'herbicide', 'pesticide', 'seedling', 'cocoa', 'palm kernel', 'maize', 'millet', 'wheat flour', 'flour'], emoji: '🌱' },
  // Generic food catch-all
  { keywords: ['food', 'cooked', 'meal', 'snack', 'eat', 'ration', 'portion'], emoji: '🍲' },
  // Generic phone catch-all
  { keywords: ['phone', 'device', 'gadget'], emoji: '📱' },
];

export function getProductEmoji(name: string): string {
  const lower = name.toLowerCase();
  for (const { keywords, emoji } of PRODUCT_EMOJI_MAP) {
    if (keywords.some(k => lower.includes(k))) return emoji;
  }
  return '🏷️';
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
