import { Shop, Product, Owner, Order, Coupon } from '../types';

export const BANNED_PINS = new Set(['0000','1111','2222','3333','4444','5555','6666','7777','8888','9999','1234','4321','1122','1212','2580','0123','3210']);

export const BAD_WORDS = new Set(['fuck','shit','bitch','asshole','bastard','dick','cunt','chutiya','madarchod','behenchod','gandu','randi','bhosadi','lund','chod']);

export const Sec = {
  // Hash function matching exactly what is in the original, supporting promises
  async hash(s: string, salt: string = ''): Promise<string> {
    if (window.crypto && window.crypto.subtle) {
      try {
        const data = new TextEncoder().encode(s + '|' + salt + '|vm-pepper-2026');
        const buf = await window.crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(buf))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
      } catch {
        return this._fnvHash(s + salt);
      }
    }
    return this._fnvHash(s + salt);
  },

  _fnvHash(s: string): string {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
  },

  esc(s: any): string {
    return String(s == null ? '' : s).replace(/[<>"'&]/g, c => ({
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '&': '&amp;'
    }[c] || c));
  },

  jsStr(s: any): string {
    return String(s == null ? '' : s)
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/</g, '\\u003c');
  },

  phone(p: string): boolean {
    return /^[6-9]\d{9}$/.test(String(p).trim());
  },

  pin(p: string): boolean {
    return /^\d{4}$/.test(p) && !BANNED_PINS.has(p);
  },

  email(e?: string): boolean {
    return !e || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  },

  pincode(p?: string): boolean {
    return !p || /^\d{6}$/.test(p);
  },

  cleanText(s: string): string {
    if (!s) return s;
    let cleaned = s;
    BAD_WORDS.forEach(w => {
      const rx = new RegExp('\\b' + w + '\\b', 'gi');
      cleaned = cleaned.replace(rx, '*'.repeat(w.length));
    });
    return cleaned;
  },

  hasBadWords(s: string): boolean {
    if (!s) return false;
    const low = s.toLowerCase();
    return [...BAD_WORDS].some(w => low.includes(w));
  }
};

// Sequential ID Counter Logic
let _idCounter = parseInt(localStorage.getItem('vm_idc') || '0') || Date.now();
export const saveIdCounter = () => localStorage.setItem('vm_idc', String(_idCounter));
export const gid = (): number => {
  _idCounter++;
  saveIdCounter();
  return _idCounter;
};

export const gOrdId = (): string => {
  const d = new Date();
  return 'ORD' + d.getFullYear().toString().slice(-2) +
    String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0') +
    Math.random().toString(36).slice(2, 6).toUpperCase();
};

export const gOwId = (): string => 'OWN' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
export const gShopId = (): string => 'SHP' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
export const gRefCode = (): string => 'VM' + Math.random().toString(36).slice(2, 7).toUpperCase();
export const slug = (s: string): string => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

export const now = (): string => {
  return new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const today = (): string => new Date().toISOString().slice(0, 10);

export const RL = {
  buckets: {} as Record<string, number[]>,
  check(key: string, maxPerMin: number = 5): boolean {
    const timeNow = Date.now();
    if (!this.buckets[key]) this.buckets[key] = [];
    this.buckets[key] = this.buckets[key].filter(t => timeNow - t < 60000);
    if (this.buckets[key].length >= maxPerMin) return false;
    this.buckets[key].push(timeNow);
    return true;
  }
};

// Healing/Repair logic to fix circular/broken schemas on load & prevent crashes
export function repairData(shops: Shop[], items: Product[], orders: Order[], owners: Owner[], coupons: Coupon[]): {
  shops: Shop[];
  items: Product[];
  orders: Order[];
  owners: Owner[];
  coupons: Coupon[];
} {
  // Ensure every shop has proper default properties
  const repairedShops = shops.map(s => {
    const defaultShop = {
      id: s.id || gShopId(),
      name: s.name || 'Unnamed Store',
      category: s.category || '🛒 Grocery & Supermarket',
      phone: s.phone || '9999999999',
      area: s.area || 'Sadar Bazaar',
      address: s.address || '',
      description: s.description || '',
      openTime: s.openTime || '09:00',
      closeTime: s.closeTime || '21:00',
      minOrder: s.minOrder || 0,
      delivery: s.delivery !== undefined ? s.delivery : true,
      is24x7: s.is24x7 !== undefined ? s.is24x7 : false,
      plan: s.plan !== undefined ? s.plan : 0,
      img: s.img || '',
      revenue: s.revenue !== undefined ? s.revenue : 0,
      status: s.status || 'active',
      ownerId: s.ownerId || null,
      slug: s.slug || slug(s.name || 'shop'),
      createdAt: s.createdAt || new Date().toISOString(),
      featured: s.featured !== undefined ? s.featured : false
    };
    return defaultShop as Shop;
  });

  const validShopIds = new Set(repairedShops.map(s => s.id));

  // Repair product links
  const repairedItems = items.map(it => {
    const shopRef = it.shopRef || '';
    const shop = repairedShops.find(s => s.id === shopRef);
    const itemShopName = shop ? shop.name : (it.shopName || 'Unknown Store');
    return {
      id: typeof it.id === 'number' ? it.id : gid(),
      name: it.name || 'Unnamed Product',
      price: typeof it.price === 'number' && it.price >= 0 ? it.price : 100,
      orgPrice: typeof it.orgPrice === 'number' ? it.orgPrice : 0,
      stock: typeof it.stock === 'number' && it.stock >= 0 ? it.stock : 10,
      lowStockAt: typeof it.lowStockAt === 'number' ? it.lowStockAt : 5,
      emoji: it.emoji || '📦',
      tags: Array.isArray(it.tags) ? it.tags : [],
      desc: it.desc || '',
      img: it.img || '',
      featured: it.featured !== undefined ? it.featured : false,
      shopRef: shopRef,
      shopName: itemShopName,
      slug: it.slug || slug(it.name || 'p'),
      salesCount: typeof it.salesCount === 'number' ? it.salesCount : 0,
      status: validShopIds.has(shopRef) ? (it.status || 'active') : 'orphaned',
      createdAt: it.createdAt || new Date().toISOString(),
      flashOriginalPrice: it.flashOriginalPrice
    } as Product;
  });

  // Repair order history
  const repairedOrders = orders.map(o => {
    return {
      id: o.id || gOrdId(),
      customer: o.customer || { name: 'Customer', phone: '9999999999', address: 'Vidisha' },
      items: Array.isArray(o.items) ? o.items : [],
      subtotal: typeof o.subtotal === 'number' ? o.subtotal : 0,
      discount: typeof o.discount === 'number' ? o.discount : 0,
      tax: typeof o.tax === 'number' ? o.tax : 0,
      delivery: typeof o.delivery === 'number' ? o.delivery : 0,
      total: typeof o.total === 'number' ? o.total : 0,
      status: o.status || 'pending',
      payment: o.payment || 'cod',
      date: o.date || now(),
      createdAt: o.createdAt || new Date().toISOString(),
      timeline: Array.isArray(o.timeline) ? o.timeline : [{ status: 'pending', time: o.date || now() }]
    } as Order;
  });

  // Repair owner logins
  const repairedOwners = owners.map(ow => {
    return {
      id: ow.id || gOwId(),
      name: ow.name || 'Shop Owner',
      phone: ow.phone || '9999999999',
      email: ow.email || '',
      pin: ow.pin || '',
      salt: ow.salt || '',
      secQuestion: ow.secQuestion || 'What was your first pet\'s name?',
      secAnswer: ow.secAnswer || '',
      refCode: ow.refCode || gRefCode(),
      referredBy: ow.referredBy || null,
      status: ow.status || 'active',
      failedAttempts: ow.failedAttempts || 0,
      lockedUntil: ow.lockedUntil || 0,
      remember: ow.remember !== undefined ? ow.remember : false,
      lastLogin: ow.lastLogin || null,
      phoneVerified: ow.phoneVerified !== undefined ? ow.phoneVerified : false,
      createdAt: ow.createdAt || new Date().toISOString(),
      legacyPin: ow.legacyPin
    } as Owner;
  });

  return {
    shops: repairedShops,
    items: repairedItems,
    orders: repairedOrders,
    owners: repairedOwners,
    coupons
  };
}
