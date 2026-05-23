export interface Shop {
  id: string;
  name: string;
  category: string;
  phone: string;
  area: string;
  address?: string;
  description?: string;
  openTime: string;
  closeTime: string;
  minOrder: number;
  delivery: boolean;
  is24x7: boolean;
  plan: number; // 0: FREE, 99: Bronze, 199: Silver, 299: Gold
  img?: string;
  revenue: number;
  status: 'active' | 'suspended' | 'closed';
  ownerId: string | null;
  slug: string;
  createdAt: string;
  featured: boolean;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  orgPrice: number; // MRP
  stock: number;
  lowStockAt: number;
  emoji: string;
  tags: string[];
  desc?: string;
  img?: string;
  featured: boolean;
  shopRef: string;
  shopName: string;
  slug: string;
  salesCount: number;
  status: 'active' | 'archived' | 'orphaned';
  createdAt: string;
  flashOriginalPrice?: number;
}

export interface Owner {
  id: string;
  name: string;
  phone: string;
  email?: string;
  pin: string; // bcrypt/sha256 hash or simple security hash
  salt: string;
  secQuestion: string;
  secAnswer: string; // hashed answers
  refCode: string;
  referredBy: string | null;
  status: 'active' | 'banned';
  failedAttempts: number;
  lockedUntil: number; // timestamp MS
  remember: boolean;
  lastLogin: string | null;
  phoneVerified: boolean;
  createdAt: string;
  legacyPin?: boolean;
}

export interface OrderItem {
  id: number;
  name: string;
  qty: number;
  price: number;
  shopRef: string;
}

export interface Order {
  id: string;
  customer: {
    name: string;
    phone: string;
    address: string;
    pincode?: string;
    notes?: string;
  };
  items: OrderItem[];
  subtotal: number;
  discount: number;
  tax: number;
  delivery: number;
  total: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'refunded';
  payment: 'cod' | 'upi' | 'whatsapp';
  date: string;
  createdAt: string;
  timeline: { status: string; time: string }[];
}

export interface Coupon {
  code: string;
  type: 'percent' | 'flat';
  disc: number;
  min: number;
  maxUses: number;
  used: number;
  expiry: string;
  active: boolean;
  createdAt: string;
}

export interface Review {
  id: number;
  name: string;
  rating: number;
  text: string;
  date: string;
  approved: boolean;
}

export interface LogEntry {
  msg: string;
  time: string;
}

export interface Notification {
  id: number;
  type: string;
  msg: string;
  link: string | null;
  time: number;
  timeStr: string;
  read: boolean;
}

export interface ChatMessage {
  from: 'me' | 'them';
  text: string;
  time: string;
}

export interface FlashSale {
  itemId: number;
  price: number;
  endsAt: number;
}

export interface ReferralStat {
  count: number;
  bonusEarned: number;
}

export interface Session {
  ownerId: string;
  name: string;
  phone: string;
  loginTime: number;
  remember: boolean;
}

export interface AppSettings {
  adminPin: string;
  adminSalt: string;
  enableChat: boolean;
  requireOtp: boolean;
  moderateReviews: boolean;
  taxRate: number;
  delivFee: number;
  freeDelivAbove: number;
  initialized: boolean;
}
