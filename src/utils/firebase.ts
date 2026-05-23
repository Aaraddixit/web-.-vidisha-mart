import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  collection, 
  onSnapshot, 
  getDocFromServer 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Shop, Product, Owner, Order, Coupon, AppSettings } from '../types';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth(app);

// Authentication helpers
export const provider = new GoogleAuthProvider();

export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Google Auth popup failed:", error);
    throw error;
  }
}

export async function loginWithEmailAndPasswordHelper(email: string, pass: string) {
  try {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    return result.user;
  } catch (error) {
    console.error("Email login failed:", error);
    throw error;
  }
}

export async function registerWithEmailAndPasswordHelper(email: string, pass: string) {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    return result.user;
  } catch (error) {
    console.error("Email registration failed:", error);
    throw error;
  }
}

export async function logoutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout failed:", error);
  }
}

// Validation helper constraint: Test Firestore Connection on startup
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test-connection-vm', 'ping'));
    console.log("Firebase Connection verified.");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration or network status.");
    }
  }
}

// Error Handling block requested by strict guideline
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Dynamic Loader and Syncer Engine to act as bridge between Firestore & state
export async function fetchAllShops(): Promise<Shop[]> {
  const path = 'shops';
  try {
    const querySnapshot = await getDocs(collection(db, path));
    const list: Shop[] = [];
    querySnapshot.forEach((doc) => {
      list.push(doc.data() as Shop);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export async function fetchAllProducts(): Promise<Product[]> {
  const path = 'products';
  try {
    const querySnapshot = await getDocs(collection(db, path));
    const list: Product[] = [];
    querySnapshot.forEach((doc) => {
      list.push(doc.data() as Product);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export async function fetchAllOwners(): Promise<Owner[]> {
  const path = 'owners';
  try {
    const querySnapshot = await getDocs(collection(db, path));
    const list: Owner[] = [];
    querySnapshot.forEach((doc) => {
      list.push(doc.data() as Owner);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export async function fetchAllOrders(): Promise<Order[]> {
  const path = 'orders';
  try {
    const querySnapshot = await getDocs(collection(db, path));
    const list: Order[] = [];
    querySnapshot.forEach((doc) => {
      list.push(doc.data() as Order);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export async function fetchAllCoupons(): Promise<Coupon[]> {
  const path = 'coupons';
  try {
    const querySnapshot = await getDocs(collection(db, path));
    const list: Coupon[] = [];
    querySnapshot.forEach((doc) => {
      list.push(doc.data() as Coupon);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export async function fetchAppSettings(): Promise<AppSettings | null> {
  const path = 'settings/config';
  try {
    const docSnap = await getDoc(doc(db, 'settings', 'config'));
    if (docSnap.exists()) {
      return docSnap.data() as AppSettings;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

// Clean undefined values from object recursively so Firestore won't throw errors
function cleanData<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanData(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const copy = { ...obj } as any;
    for (const key in copy) {
      if (copy[key] === undefined) {
        delete copy[key];
      } else if (typeof copy[key] === 'object' && copy[key] !== null) {
        copy[key] = cleanData(copy[key]);
      }
    }
    return copy;
  }
  return obj;
}

// Set functions for mutations
export async function saveShopToDb(shop: Shop) {
  const path = `shops/${shop.id}`;
  try {
    await setDoc(doc(db, 'shops', shop.id), cleanData(shop));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveProductToDb(prod: Product) {
  const path = `products/${prod.id}`;
  try {
    await setDoc(doc(db, 'products', String(prod.id)), cleanData(prod));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveOwnerToDb(owner: Owner) {
  const path = `owners/${owner.id}`;
  try {
    await setDoc(doc(db, 'owners', owner.id), cleanData(owner));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveOrderToDb(order: Order) {
  const path = `orders/${order.id}`;
  try {
    await setDoc(doc(db, 'orders', order.id), cleanData(order));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveCouponToDb(coupon: Coupon) {
  const path = `coupons/${coupon.code}`;
  try {
    await setDoc(doc(db, 'coupons', coupon.code), cleanData(coupon));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveAppSettingsToDb(settings: AppSettings) {
  const path = 'settings/config';
  try {
    await setDoc(doc(db, 'settings', 'config'), cleanData(settings));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Bulk sync utility for initial populating
export async function syncStorageWithFirebase(
  shops: Shop[],
  products: Product[],
  owners: Owner[],
  orders: Order[],
  coupons: Coupon[],
  settings: AppSettings
) {
  try {
    // 1. Settings
    const liveSettings = await fetchAppSettings();
    if (!liveSettings && settings?.initialized) {
      await saveAppSettingsToDb(settings);
    }

    // 2. Shops
    const liveShops = await fetchAllShops();
    if (liveShops.length === 0 && shops.length > 0) {
      for (const s of shops) {
        await saveShopToDb(s);
      }
    }

    // 3. Products
    const liveProducts = await fetchAllProducts();
    if (liveProducts.length === 0 && products.length > 0) {
      for (const p of products) {
        await saveProductToDb(p);
      }
    }

    // 4. Owners
    const liveOwners = await fetchAllOwners();
    if (liveOwners.length === 0 && owners.length > 0) {
      for (const o of owners) {
        await saveOwnerToDb(o);
      }
    }

    // 5. Coupons
    const liveCoupons = await fetchAllCoupons();
    if (liveCoupons.length === 0 && coupons.length > 0) {
      for (const c of coupons) {
        await saveCouponToDb(c);
      }
    }

    // 6. Orders
    const liveOrders = await fetchAllOrders();
    if (liveOrders.length === 0 && orders.length > 0) {
      for (const ord of orders) {
        await saveOrderToDb(ord);
      }
    }
  } catch (e) {
    console.error("Bulk sync error: ", e);
  }
}
