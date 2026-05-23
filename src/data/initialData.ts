import { Shop, Product, Coupon, AppSettings } from '../types';

export const INITIAL_SHOPS: Shop[] = [
  {
    id: "SHP_SDR_MED",
    name: "Sanchit Medicos & General",
    category: "🩺 Medical & Pharmacy",
    phone: "9876543210",
    area: "Sadar Bazaar",
    address: "Shop No. 12, Main Road, Sadar Bazaar, Vidisha, MP",
    description: "Your trusted 24/7 pharmaceutical and wellness destination. Free home delivery above ₹200.",
    openTime: "00:00",
    closeTime: "23:59",
    minOrder: 100,
    delivery: true,
    is24x7: true,
    plan: 299, // Gold Tier
    img: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&h=400&fit=crop",
    revenue: 1250,
    status: "active",
    ownerId: "OWN_DEMO_SDR",
    slug: "sanchit-medicos-general",
    createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    featured: true
  },
  {
    id: "SHP_NEH_SUP",
    name: "Vidisha Fresh Supermarket",
    category: "🛒 Grocery & Supermarket",
    phone: "8765432109",
    area: "Nehru Nagar",
    address: "Block B, Near Green Park, Nehru Nagar, Vidisha",
    description: "Direct-from-farm organic vegetables, daily staples and imported products with flat delivery rate.",
    openTime: "08:00",
    closeTime: "22:00",
    minOrder: 150,
    delivery: true,
    is24x7: false,
    plan: 199, // Silver Tier
    img: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&h=400&fit=crop",
    revenue: 840,
    status: "active",
    ownerId: "OWN_DEMO_NEH",
    slug: "vidisha-fresh-supermarket",
    createdAt: new Date(Date.now() - 25 * 24 * 3600 * 1000).toISOString(),
    featured: true
  },
  {
    id: "SHP_CIV_TIF",
    name: "Annapurna Shuddh Tiffin Service",
    category: "🍱 Tiffin & Food Service",
    phone: "7654321098",
    area: "Civil Lines",
    address: "House 24, Lane 3, Civil Lines, Vidisha",
    description: "Hygienic, home-style lunches & dinners delivered in hot thermal cases. Monthly subscriptions available.",
    openTime: "11:00",
    closeTime: "21:30",
    minOrder: 70,
    delivery: true,
    is24x7: false,
    plan: 99, // Bronze Tier
    img: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=400&fit=crop",
    revenue: 2150,
    status: "active",
    ownerId: "OWN_DEMO_CIV",
    slug: "annapurna-shuddh-tiffin",
    createdAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
    featured: false
  },
  {
    id: "SHP_SHN_ELE",
    name: "Shubham Mobile & Electronics",
    category: "📱 Mobile & Electronics",
    phone: "6543210987",
    area: "Sadar Bazaar",
    address: "Kothari Market, Main Crossing, Vidisha",
    description: "Genuine smartphone accessories, prompt hardware diagnostics, mobile recharges, smart watches.",
    openTime: "10:00",
    closeTime: "20:30",
    minOrder: 0,
    delivery: false,
    is24x7: false,
    plan: 0, // Free
    img: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600&h=400&fit=crop",
    revenue: 0,
    status: "active",
    ownerId: "OWN_DEMO_SHN",
    slug: "shubham-mobile-electronics",
    createdAt: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
    featured: false
  }
];

export const INITIAL_PRODUCTS: Product[] = [
  // Medicos
  {
    id: 101,
    name: "Digital Infrared Thermometer",
    price: 650,
    orgPrice: 1200,
    stock: 25,
    lowStockAt: 5,
    emoji: "🌡️",
    tags: ["medical", "safety", "homecare"],
    desc: "Contactless high precision temperature sensing with memory recall and backlit LED guide.",
    img: "https://images.unsplash.com/photo-1584036561566-baf241f20422?w=500&fit=crop",
    featured: true,
    shopRef: "SHP_SDR_MED",
    shopName: "Sanchit Medicos & General",
    slug: "digital-infrared-thermometer",
    salesCount: 15,
    status: "active",
    createdAt: new Date().toISOString()
  },
  {
    id: 102,
    name: "N95 Protective Face Masks (Pack of 5)",
    price: 180,
    orgPrice: 350,
    stock: 120,
    lowStockAt: 15,
    emoji: "😷",
    tags: ["hygiene", "respirator", "masks"],
    desc: "5-layer PM2.5 filtration with certified nose clip wire frame and comfortable elastic earloops.",
    img: "https://images.unsplash.com/photo-1584634731339-252c581abfc5?w=500&fit=crop",
    featured: false,
    shopRef: "SHP_SDR_MED",
    shopName: "Sanchit Medicos & General",
    slug: "n95-protective-face-masks",
    salesCount: 50,
    status: "active",
    createdAt: new Date().toISOString()
  },
  // Grocery
  {
    id: 201,
    name: "Fortune Pure Kachi Ghani Mustard Oil (1L)",
    price: 165,
    orgPrice: 195,
    stock: 60,
    lowStockAt: 10,
    emoji: "🍾",
    tags: ["grocery", "cooking", "oil"],
    desc: "Authentic strong flavor and pungent aroma extracted from quality seeds. Ideal for regional cuisine.",
    img: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&fit=crop",
    featured: true,
    shopRef: "SHP_NEH_SUP",
    shopName: "Vidisha Fresh Supermarket",
    slug: "fortune-kachighani-mustard-oil",
    salesCount: 8,
    status: "active",
    createdAt: new Date().toISOString()
  },
  {
    id: 202,
    name: "Premium Basmati Rice (Long Grain, 5Kg)",
    price: 520,
    orgPrice: 650,
    stock: 4, // low stock warning test
    lowStockAt: 5,
    emoji: "🍚",
    tags: ["staple", "daily", "grains"],
    desc: "Naturally-aged aromatic extra-long grains of Basmati rice, perfect for Pulao and Biryani feasts.",
    img: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&fit=crop",
    featured: false,
    shopRef: "SHP_NEH_SUP",
    shopName: "Vidisha Fresh Supermarket",
    slug: "premium-basmati-rice",
    salesCount: 12,
    status: "active",
    createdAt: new Date().toISOString()
  },
  // Tiffin
  {
    id: 301,
    name: "Organic Special Veg Thali Lunch",
    price: 85,
    orgPrice: 100,
    stock: 15,
    lowStockAt: 3,
    emoji: "🍱",
    tags: ["food", "tiffin", "fresh"],
    desc: "4 Butter Rotis, Steamed Jeera Rice, Paneer Masala, Daal Fry, Green Salad, and Pickle in locked containers.",
    img: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&fit=crop",
    featured: true,
    shopRef: "SHP_CIV_TIF",
    shopName: "Annapurna Shuddh Tiffin Service",
    slug: "organic-special-veg-thali",
    salesCount: 42,
    status: "active",
    createdAt: new Date().toISOString()
  },
  // Electronics
  {
    id: 401,
    name: "Heavy Duty Braided USB Type-C Cable (1.5m)",
    price: 120,
    orgPrice: 299,
    stock: 30,
    lowStockAt: 5,
    emoji: "🔌",
    tags: ["electronics", "charger", "accessories"],
    desc: "3A fast charging, highly durable braided nylon sheathing with reinforced premium metal jacket joints.",
    img: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=500&fit=crop",
    featured: false,
    shopRef: "SHP_SHN_ELE",
    shopName: "Shubham Mobile & Electronics",
    slug: "braided-usb-type-c-cable",
    salesCount: 0,
    status: "active",
    createdAt: new Date().toISOString()
  }
];

export const INITIAL_SETTINGS: AppSettings = {
  adminPin: "9999",
  adminSalt: "demo_admin_salt_2026",
  enableChat: true,
  requireOtp: false,
  moderateReviews: false,
  taxRate: 0,
  delivFee: 40,
  freeDelivAbove: 500,
  initialized: true
};

export const INITIAL_COUPONS: Coupon[] = [
  {
    code: "SAVE20",
    type: "percent",
    disc: 20,
    min: 200,
    maxUses: 100,
    used: 0,
    expiry: "2027-12-31",
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    code: "FIRST10",
    type: "percent",
    disc: 10,
    min: 0,
    maxUses: 1,
    used: 0,
    expiry: "2027-12-31",
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    code: "VIDISHA50",
    type: "flat",
    disc: 50,
    min: 300,
    maxUses: 500,
    used: 0,
    expiry: "2027-12-31",
    active: true,
    createdAt: new Date().toISOString()
  }
];
