import express from "express";
import path from "path";
import fs from "fs";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, getDocs, setDoc, deleteDoc, collection } from "firebase/firestore";
import { createServer as createViteServer } from "vite";

// Read Firebase configurations
const rootDir = process.cwd();
const firebaseConfigPath = path.join(rootDir, "firebase-applet-config.json");
let firebaseConfig: any = null;
let db: any = null;

try {
  if (fs.existsSync(firebaseConfigPath)) {
    const raw = fs.readFileSync(firebaseConfigPath, "utf8");
    firebaseConfig = JSON.parse(raw);
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    console.log("Backend Firebase initialized successfully.");
  }
} catch (err) {
  console.error("Backend Firebase failed to initialize. Using custom robust back-up fallback memory db:", err);
}

// Memory fallback lists to prevent crashes if Firestore is offline
let localProducts: any[] = [
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
    category: "Grocery",
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
    category: "Grocery",
    createdAt: new Date().toISOString()
  },
  {
    id: 201,
    name: "Fortune Pure Kachi Ghani Mustard Oil (1L)",
    price: 165,
    orgPrice: 195,
    stock: 60,
    lowStockAt: 10,
    emoji: "🍾",
    tags: ["grocery", "cooking", "oil"],
    desc: "Authentic strong flavor and regional cuisine. Extracted from premium mustard seeds.",
    img: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&fit=crop",
    featured: true,
    shopRef: "SHP_NEH_SUP",
    shopName: "Vidisha Fresh Supermarket",
    slug: "fortune-kachighani-mustard-oil",
    salesCount: 8,
    status: "active",
    category: "Grocery",
    createdAt: new Date().toISOString()
  },
  {
    id: 401,
    name: "Fast Charging Braided USB-C Cable",
    price: 149,
    orgPrice: 399,
    stock: 45,
    lowStockAt: 10,
    emoji: "🔌",
    tags: ["electronics", "charger"],
    desc: "Premium styled smart charge cable with reinforced braided cover support.",
    img: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=500&fit=crop",
    featured: true,
    shopRef: "SHP_SHN_ELE",
    shopName: "Shubham Mobile & Electronics",
    slug: "braided-usb-type-c-cable",
    salesCount: 22,
    status: "active",
    category: "Electronics",
    createdAt: new Date().toISOString()
  },
  {
    id: 501,
    name: "Classic Leather Men's Aviator Jacket",
    price: 2499,
    orgPrice: 4999,
    stock: 12,
    lowStockAt: 3,
    emoji: "🧥",
    tags: ["fashion", "clothing", "premium"],
    desc: "Premium design, deep brown faux leather aviator jacket for a rustic but modern styling aura.",
    img: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500&fit=crop",
    featured: true,
    shopRef: "SHP_SHN_ELE",
    shopName: "Vidisha Mart Elite Fashion",
    slug: "leather-mens-jacket",
    salesCount: 5,
    status: "active",
    category: "Fashion",
    createdAt: new Date().toISOString()
  },
  {
    id: 601,
    name: "Smart FHD Android TV 43-inch",
    price: 18499,
    orgPrice: 29999,
    stock: 8,
    lowStockAt: 2,
    emoji: "📺",
    tags: ["electronics", "tv", "appliances"],
    desc: "Ultra slim frame, rich acoustic Dolby sound output, and Google Voice Assistant built right in.",
    img: "https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=500&fit=crop",
    featured: true,
    shopRef: "SHP_SHN_ELE",
    shopName: "Vidisha Mart Electronics Hub",
    slug: "smart-android-tv-43",
    salesCount: 3,
    status: "active",
    category: "Home Appliances",
    createdAt: new Date().toISOString()
  },
  {
    id: 701,
    name: "Natural Aloe Vera Herbal Skin Care Gel",
    price: 199,
    orgPrice: 249,
    stock: 50,
    lowStockAt: 8,
    emoji: "🧴",
    tags: ["beauty", "skincare", "herbal"],
    desc: "Deep skin soothing, 100% organic pure extract. Keeps body skin fresh with lightweight hydration.",
    img: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500&fit=crop",
    featured: false,
    shopRef: "SHP_SDR_MED",
    shopName: "Sanchit Medicos & General",
    slug: "aloe-vera-herbal-gel",
    salesCount: 19,
    status: "active",
    category: "Beauty",
    createdAt: new Date().toISOString()
  },
  {
    id: 801,
    name: "English Premier League Match Football",
    price: 899,
    orgPrice: 1599,
    stock: 14,
    lowStockAt: 3,
    emoji: "⚽",
    tags: ["sports", "football", "outdoor"],
    desc: "Official flight precision panels. High responsive aerodynamics, perfect for professional practice matches.",
    img: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=500&fit=crop",
    featured: true,
    shopRef: "SHP_NEH_SUP",
    shopName: "Vidisha Fresh Supermarket",
    slug: "epl-match-football",
    salesCount: 11,
    status: "active",
    category: "Sports",
    createdAt: new Date().toISOString()
  },
  {
    id: 901,
    name: "The Intelligent Investor Paperback",
    price: 499,
    orgPrice: 799,
    stock: 35,
    lowStockAt: 5,
    emoji: "📚",
    tags: ["books", "finance", "bestseller"],
    desc: "The classic text on value investing. Enriched with updated commentary by Benjamin Graham.",
    img: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500&fit=crop",
    featured: true,
    shopRef: "SHP_SDR_MED",
    shopName: "Sanchit Medicos & General",
    slug: "intelligent-investor-book",
    salesCount: 40,
    status: "active",
    category: "Books",
    createdAt: new Date().toISOString()
  }
];

let localOrders: any[] = [];
let localReviews: Record<string, any[]> = {};
let localCarts: Record<string, any[]> = {};
let localWishlists: Record<string, number[]> = {};

const defaultCategories = [
  "Electronics",
  "Fashion",
  "Grocery",
  "Mobiles",
  "Books",
  "Home Appliances",
  "Beauty",
  "Sports"
];

const app = express();
app.use(express.json({ limit: "15mb" }));

// Helper to remove undefined for Firestore safety
function sanitize(obj: any): any {
  return JSON.parse(JSON.stringify(obj || null));
}

// API Routes
// 1. Categories
app.get("/api/categories", (req, res) => {
  res.json({ success: true, data: defaultCategories });
});

// 2. Products - GET, POST, DELETE
app.get("/api/products", async (req, res) => {
  try {
    if (db) {
      const snap = await getDocs(collection(db, "products"));
      const list: any[] = [];
      snap.forEach(doc => {
        list.push(doc.data());
      });
      if (list.length > 0) {
        return res.json({ success: true, data: list });
      }
    }
  } catch (err) {
    console.warn("Backend products fetch err (using memory buffer):", err);
  }
  // Fallback to local memory products
  res.json({ success: true, data: localProducts });
});

app.post("/api/products", async (req, res) => {
  const prod = req.body;
  if (!prod.id) {
    prod.id = Date.now();
  }
  prod.createdAt = prod.createdAt || new Date().toISOString();
  
  try {
    if (db) {
      await setDoc(doc(db, "products", String(prod.id)), sanitize(prod));
    }
  } catch (err) {
    console.error("Firestore product save err:", err);
  }

  // Update memory state as well
  const idx = localProducts.findIndex(p => p.id === prod.id || p.id === Number(prod.id));
  if (idx > -1) {
    localProducts[idx] = { ...localProducts[idx], ...prod };
  } else {
    localProducts.push(prod);
  }

  res.json({ success: true, data: prod });
});

app.delete("/api/products/:id", async (req, res) => {
  const pid = req.params.id;
  try {
    if (db) {
      await deleteDoc(doc(db, "products", pid));
    }
  } catch (err) {
    console.error("Firestore product delete err:", err);
  }

  localProducts = localProducts.filter(p => String(p.id) !== pid);
  res.json({ success: true, message: "Product deleted successfully." });
});

// 3. Orders - GET, POST, PUT
app.get("/api/orders", async (req, res) => {
  try {
    if (db) {
      const snap = await getDocs(collection(db, "orders"));
      const list: any[] = [];
      snap.forEach(doc => {
        list.push(doc.data());
      });
      if (list.length > 0) {
        return res.json({ success: true, data: list });
      }
    }
  } catch (err) {
    console.warn("Backend orders view error:", err);
  }
  res.json({ success: true, data: localOrders });
});

app.post("/api/orders", async (req, res) => {
  const order = req.body;
  if (!order.id) {
    order.id = "ORD_" + Math.floor(100000 + Math.random() * 900000);
  }
  order.createdAt = order.createdAt || new Date().toISOString();
  order.date = order.date || new Date().toLocaleDateString();

  try {
    if (db) {
      await setDoc(doc(db, "orders", order.id), sanitize(order));
    }
  } catch (err) {
    console.error("Firestore save order error:", err);
  }

  localOrders.unshift(order);

  // Decrement stocks and update sales count
  order.items?.forEach((item: any) => {
    const found = localProducts.find(p => p.id === Number(item.id));
    if (found) {
      found.stock = Math.max(0, found.stock - (item.qty || 1));
      found.salesCount = (found.salesCount || 0) + (item.qty || 1);
      if (db) {
        setDoc(doc(db, "products", String(found.id)), sanitize(found)).catch(console.error);
      }
    }
  });

  res.json({ success: true, data: order });
});

app.put("/api/orders/:id", async (req, res) => {
  const ordId = req.params.id;
  const { status, timeline } = req.body;

  let currentOrd = localOrders.find(o => o.id === ordId);
  if (currentOrd) {
    currentOrd.status = status;
    if (timeline) currentOrd.timeline = timeline;
  }

  try {
    if (db) {
      const orderRef = doc(db, "orders", ordId);
      const snap = await getDoc(orderRef);
      if (snap.exists()) {
        const full = snap.data();
        full.status = status;
        if (timeline) full.timeline = timeline;
        await setDoc(orderRef, sanitize(full));
        currentOrd = full;
      }
    }
  } catch (err) {
    console.error("Firestore update order error:", err);
  }

  res.json({ success: true, data: currentOrd });
});

// 4. Cart - GET, POST
app.get("/api/cart/:userId", (req, res) => {
  const user = req.params.userId;
  res.json({ success: true, data: localCarts[user] || [] });
});

app.post("/api/cart/:userId", (req, res) => {
  const user = req.params.userId;
  const { cartItems } = req.body;
  localCarts[user] = cartItems || [];
  res.json({ success: true, data: localCarts[user] });
});

// 5. Wishlist - GET, POST
app.get("/api/wishlist/:userId", (req, res) => {
  const user = req.params.userId;
  res.json({ success: true, data: localWishlists[user] || [] });
});

app.post("/api/wishlist/:userId", (req, res) => {
  const user = req.params.userId;
  const { wishItems } = req.body;
  localWishlists[user] = wishItems || [];
  res.json({ success: true, data: localWishlists[user] });
});

// 6. Reviews - GET, POST
app.get("/api/reviews", async (req, res) => {
  try {
    if (db) {
      const snap = await getDocs(collection(db, "reviews"));
      const rMap: Record<string, any[]> = {};
      snap.forEach(doc => {
        const d = doc.data();
        if (d.shopId) {
          if (!rMap[d.shopId]) rMap[d.shopId] = [];
          rMap[d.shopId].push(d);
        }
      });
      if (Object.keys(rMap).length > 0) {
        return res.json({ success: true, data: rMap });
      }
    }
  } catch (err) {
    console.warn("Reviews api get error:", err);
  }
  res.json({ success: true, data: localReviews });
});

app.post("/api/reviews", async (req, res) => {
  const { shopId, review } = req.body;
  if (!shopId || !review) {
    return res.status(400).json({ success: false, message: "Missing content parameters." });
  }

  review.id = review.id || Date.now();
  review.date = review.date || new Date().toLocaleDateString();
  review.approved = review.approved !== undefined ? review.approved : true;
  review.shopId = shopId;

  try {
    if (db) {
      await setDoc(doc(db, "reviews", String(review.id)), sanitize(review));
    }
  } catch (err) {
    console.error("Firestore save review error:", err);
  }

  if (!localReviews[shopId]) {
    localReviews[shopId] = [];
  }
  localReviews[shopId].push(review);

  res.json({ success: true, data: review });
});

// Mount Vite middleware in Development mode, otherwise static folder in Production
async function startServer() {
  const PORT = 3000;

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express Server running on port ${PORT}`);
  });
}

startServer();
