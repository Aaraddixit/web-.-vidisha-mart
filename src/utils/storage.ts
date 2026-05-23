import { Shop, Product, Owner, Order, Coupon, AppSettings, Notification, LogEntry, ChatMessage, FlashSale } from '../types';
import { INITIAL_SHOPS, INITIAL_PRODUCTS, INITIAL_SETTINGS, INITIAL_COUPONS } from '../data/initialData';
import { repairData } from './security';

const KEYS = {
  v: 'vm_v',
  shops: 'vm_shops',
  items: 'vm_items',
  cart: 'vm_cart',
  orders: 'vm_ords',
  wish: 'vm_wish',
  coupons: 'vm_coup',
  log: 'vm_log',
  settings: 'vm_set',
  reviews: 'vm_revs',
  favs: 'vm_favs',
  owners: 'vm_own',
  sess: 'vm_sess',
  srchHist: 'vm_srch',
  notifs: 'vm_notif',
  chats: 'vm_chats',
  flashSales: 'vm_flash',
  theme: 'vm_theme',
  lang: 'vm_lang'
};

const DB_VER = 8;

export const StorageEngine = {
  loadAll() {
    try {
      const ver = parseInt(localStorage.getItem(KEYS.v) || '0');
      
      // Load tables, falling back to initial data if empty
      let shops: Shop[] = JSON.parse(localStorage.getItem(KEYS.shops) || 'null') || [];
      let items: Product[] = JSON.parse(localStorage.getItem(KEYS.items) || 'null') || [];
      let settings: AppSettings = JSON.parse(localStorage.getItem(KEYS.settings) || 'null') || INITIAL_SETTINGS;
      let coupons: Coupon[] = JSON.parse(localStorage.getItem(KEYS.coupons) || 'null') || INITIAL_COUPONS;
      
      let cart = JSON.parse(localStorage.getItem(KEYS.cart) || '[]') as any[];
      let orders = JSON.parse(localStorage.getItem(KEYS.orders) || '[]') as Order[];
      let wish = JSON.parse(localStorage.getItem(KEYS.wish) || '[]') as number[];
      let reviews = JSON.parse(localStorage.getItem(KEYS.reviews) || '{}') as Record<string, any[]>;
      let favs = JSON.parse(localStorage.getItem(KEYS.favs) || '[]') as string[];
      let owners = JSON.parse(localStorage.getItem(KEYS.owners) || '[]') as Owner[];
      let sess = JSON.parse(localStorage.getItem(KEYS.sess) || 'null') as any;
      let log = JSON.parse(localStorage.getItem(KEYS.log) || '[]') as LogEntry[];
      let srchHist = JSON.parse(localStorage.getItem(KEYS.srchHist) || '[]') as string[];
      let notifs = JSON.parse(localStorage.getItem(KEYS.notifs) || '[]') as Notification[];
      let chats = JSON.parse(localStorage.getItem(KEYS.chats) || '{}') as Record<string, ChatMessage[]>;
      let flashSales = JSON.parse(localStorage.getItem(KEYS.flashSales) || '[]') as FlashSale[];
      let theme = localStorage.getItem(KEYS.theme) || 'light';
      let lang = localStorage.getItem(KEYS.lang) || 'en';

      // First-time load prepopulation
      if (shops.length === 0 && owners.length === 0) {
        shops = INITIAL_SHOPS;
        items = INITIAL_PRODUCTS;
        settings = INITIAL_SETTINGS;
        coupons = INITIAL_COUPONS;
        
        // Save initial datasets
        localStorage.setItem(KEYS.shops, JSON.stringify(shops));
        localStorage.setItem(KEYS.items, JSON.stringify(items));
        localStorage.setItem(KEYS.settings, JSON.stringify(settings));
        localStorage.setItem(KEYS.coupons, JSON.stringify(coupons));
        localStorage.setItem(KEYS.v, String(DB_VER));
      }

      // Schema upgrades if necessary
      if (ver < DB_VER) {
        // Run migration / healing
        const healed = repairData(shops, items, orders, owners, coupons);
        shops = healed.shops;
        items = healed.items;
        orders = healed.orders;
        owners = healed.owners;
        localStorage.setItem(KEYS.v, String(DB_VER));
        
        localStorage.setItem(KEYS.shops, JSON.stringify(shops));
        localStorage.setItem(KEYS.items, JSON.stringify(items));
        localStorage.setItem(KEYS.orders, JSON.stringify(orders));
        localStorage.setItem(KEYS.owners, JSON.stringify(owners));
      }

      // Self-healing check
      const healed = repairData(shops, items, orders, owners, coupons);
      
      return {
        shops: healed.shops,
        items: healed.items,
        cart,
        orders: healed.orders,
        wish,
        coupons: healed.coupons,
        reviews,
        favs,
        owners: healed.owners,
        settings,
        log,
        srchHist,
        sess,
        notifs,
        chats,
        flashSales,
        theme,
        lang
      };
    } catch (e) {
      console.error("Storage load crashed, restoring safemode", e);
      return {
        shops: INITIAL_SHOPS,
        items: INITIAL_PRODUCTS,
        cart: [],
        orders: [],
        wish: [],
        coupons: INITIAL_COUPONS,
        reviews: {},
        favs: [],
        owners: [],
        settings: INITIAL_SETTINGS,
        log: [{ msg: "⚠️ Database error. Restored fallback mode.", time: new Date().toLocaleString() }],
        srchHist: [],
        sess: null,
        notifs: [],
        chats: {},
        flashSales: [],
        theme: 'light',
        lang: 'en'
      };
    }
  },

  save(keyPath: string, data: any) {
    try {
      const realKey = KEYS[keyPath as keyof typeof KEYS];
      if (realKey) {
        localStorage.setItem(realKey, JSON.stringify(data));
      }
    } catch (e) {
      console.error("Localstorage write failed, triggering compression helper", e);
      this._freeSpaceAndRetry(keyPath, data);
    }
  },

  saveAll(state: any) {
    Object.keys(KEYS).forEach(k => {
      const value = state[k];
      if (value !== undefined) {
        this.save(k, value);
      }
    });
  },

  _freeSpaceAndRetry(keyPath: string, data: any) {
    try {
      // Clear logs beyond first 10 entries and unread notifications to save quotas
      const logKey = KEYS.log;
      const logs = JSON.parse(localStorage.getItem(logKey) || '[]');
      if (logs.length > 10) {
        localStorage.setItem(logKey, JSON.stringify(logs.slice(0, 10)));
      }
      const realKey = KEYS[keyPath as keyof typeof KEYS];
      if (realKey) {
        localStorage.setItem(realKey, JSON.stringify(data));
      }
    } catch {
      alert("Local storage is mathematically loaded to capacity. Please wipe logs or backup database in Admin center!");
    }
  },

  getUsage() {
    let tot = 0;
    try {
      for (const k in localStorage) {
        if (Object.prototype.hasOwnProperty.call(localStorage, k)) {
          tot += (localStorage[k] || '').length * 2;
        }
      }
    } catch {}
    return tot;
  }
};
