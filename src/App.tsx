/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Shop, Product, Owner, Order, Coupon, AppSettings, Notification, LogEntry, ChatMessage, FlashSale, Session } from './types';
import { StorageEngine } from './utils/storage';
import { Sec, gShopId, gid, gOrdId, gOwId, slug, now, today, RL } from './utils/security';
import AdminPanel from './components/AdminPanel';
import OwnerDashboard from './components/OwnerDashboard';
import { onAuthStateChanged } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { 
  auth, 
  loginWithGoogle, 
  logoutUser, 
  testConnection, 
  syncStorageWithFirebase, 
  fetchAllShops, 
  fetchAllProducts, 
  fetchAllOwners, 
  fetchAllOrders, 
  fetchAllCoupons, 
  fetchAppSettings,
  saveShopToDb,
  saveProductToDb,
  saveOwnerToDb,
  saveOrderToDb,
  saveCouponToDb,
  saveAppSettingsToDb
} from './utils/firebase';

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [firebaseStatus, setFirebaseStatus] = useState<'connected' | 'error' | 'disconnected'>('disconnected');

  // --- Persistent Local Database Sheets ---
  const [shops, setShops] = useState<Shop[]>([]);
  const [items, setItems] = useState<Product[]>([]);
  const [cart, setCart] = useState<{ id: number; qty: number; name: string; price: number; shopRef: string; emoji: string; img?: string; stock: number }[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [wish, setWish] = useState<number[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [reviews, setReviews] = useState<Record<string, any[]>>({});
  const [favs, setFavs] = useState<string[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [settings, setSettings] = useState<AppSettings>({} as AppSettings);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [srchHist, setSrchHist] = useState<string[]>([]);
  const [sess, setSess] = useState<Session | null>(null);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [chats, setChats] = useState<Record<string, ChatMessage[]>>({});
  const [flashSales, setFlashSales] = useState<FlashSale[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const [showSidebar, setShowSidebar] = useState(false);
  const [recentViewedIds, setRecentViewedIds] = useState<number[]>([]);
  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(null);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMsg, setContactMsg] = useState('');
  const [contactSuccess, setContactSuccess] = useState(false);
  const [activeImgIndex, setActiveImgIndex] = useState(0);

  // --- Initial Loading State ---
  const [appLoading, setAppLoading] = useState(true);

  // --- Navigation & Core Views ---
  const [currentView, setCurrentView] = useState<'home' | 'market' | 'wishlist' | 'shop' | 'owner' | 'orders'>('home');
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);

  // --- Search & Filters ---
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchSugg, setShowSearchSugg] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  
  const [filters, setFilters] = useState({
    delivery: false,
    verified: false,
    premium: false,
    open: false
  });
  const [sortOption, setSortOption] = useState<string>('featured');

  // --- Active Dialogs (Modals) ---
  const [showAddStoreModal, setShowAddStoreModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [showWriteReviewModal, setShowWriteReviewModal] = useState(false);
  const [showFavoritesModal, setShowFavoritesModal] = useState(false);
  const [showShopDetailModal, setShowShopDetailModal] = useState(false);
  const [showProductDetailModal, setShowProductDetailModal] = useState(false);
  const [showCartModal, setShowCartModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showOrderTrackModal, setShowOrderTrackModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // --- Sub-View Target Entities ---
  const [activeShopDetail, setActiveShopDetail] = useState<Shop | null>(null);
  const [activeProductDetail, setActiveProductDetail] = useState<Product | null>(null);
  const [reviewShopId, setReviewShopId] = useState<string>('');
  const [reviewShopName, setReviewShopName] = useState<string>('');
  const [writeRevName, setWriteRevName] = useState('');
  const [writeRevRating, setWriteRevRating] = useState(5);
  const [writeRevText, setWriteRevText] = useState('');

  // --- Seller Registration & Login States ---
  const [showAuthOverlay, setShowAuthOverlay] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'reg' | 'forgot' | 'otp'>('login');
  
  // Login
  const [olPhone, setOlPhone] = useState('');
  const [olPin, setOlPin] = useState('');
  const [olRemember, setOlRemember] = useState(true);
  const [loginError, setLoginError] = useState('');

  // Register
  const [orName, setOrName] = useState('');
  const [orPhone, setOrPhone] = useState('');
  const [orEmail, setOrEmail] = useState('');
  const [orPin, setOrPin] = useState('');
  const [orPin2, setOrPin2] = useState('');
  const [orSecQ, setOrSecQ] = useState("What is your mother's maiden name?");
  const [orSecA, setOrSecA] = useState('');
  const [orRefCode, setOrRefCode] = useState('');
  const [orAgree, setOrAgree] = useState(false);
  const [regError, setRegError] = useState('');

  // Forgot PIN
  const [fgPhone, setFgPhone] = useState('');
  const [fgQuestion, setFgQuestion] = useState('');
  const [fgAnswer, setFgAnswer] = useState('');
  const [fgNewPin, setFgNewPin] = useState('');
  const [fgCfPin, setFgCfPin] = useState('');
  const [fgShowQuestion, setFgShowQuestion] = useState(false);
  const [fgError, setFgError] = useState('');

  // OTP Demo Simulation
  const [otpSentCode, setOtpSentCode] = useState('');
  const [otpInputCode, setOtpInputCode] = useState('');
  const [otpPendingOwner, setOtpPendingOwner] = useState<Owner | null>(null);
  const [otpError, setOtpError] = useState('');

  // --- Administrative Dialog Access ---
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showPinScreen, setShowPinScreen] = useState(false);
  const [pinTarget, setPinTarget] = useState<'admin' | 'owner' | null>(null);
  const [pinInValue, setPinInValue] = useState('');
  const [pinError, setPinError] = useState('');

  // --- Shopping Cart Checkout States ---
  const [applyCouponStr, setApplyCouponStr] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponStatusText, setCouponStatusText] = useState('');
  const [couponStatusColor, setCouponStatusColor] = useState('');

  // Multistep Checkouts
  const [checkoutStep, setCheckoutStep] = useState<1 | 2 | 3>(1);
  const [coName, setCoName] = useState(() => localStorage.getItem('vm_profile_name') || '');
  const [coPhone, setCoPhone] = useState(() => localStorage.getItem('vm_profile_phone') || '');
  const [coAddr, setCoAddr] = useState(() => localStorage.getItem('vm_profile_address') || '');
  const [coPin, setCoPin] = useState(() => localStorage.getItem('vm_profile_pincode') || '');
  const [coNotes, setCoNotes] = useState('');
  const [coPayM, setCoPayM] = useState<'cod' | 'upi' | 'whatsapp' | 'card'>('cod');
  const [ccNum, setCcNum] = useState('');
  const [ccName, setCcName] = useState('');
  const [ccExp, setCcExp] = useState('');
  const [ccCvv, setCcCvv] = useState('');
  const [ccFlipped, setCcFlipped] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState<string>('');

  // Quick list shop state
  const [qName, setQName] = useState('');
  const [qCat, setQCat] = useState('');
  const [qArea, setQArea] = useState('');
  const [qPhone, setQPhone] = useState('');
  const [qDesc, setQDesc] = useState('');
  const [qDel, setQDel] = useState(true);
  const [qPlan, setQPlan] = useState('0');
  const [qImgBase64, setQImgBase64] = useState('');

  // --- Payment modal variables ---
  const [payAmountLabel, setPayAmountLabel] = useState('');
  const [paySelectMethod, setPaySelectMethod] = useState<'upi' | 'cod'>('upi');
  const [payTxnId, setPayTxnId] = useState('');

  // --- Track Orders Input State ---
  const [trackQuery, setTrackQuery] = useState('');
  const [trackedOrderEntity, setTrackedOrderEntity] = useState<Order | null>(null);

  // --- Direct Chat variables ---
  const [shopperChatPartner, setShopperChatPartner] = useState<{ id: string; name: string } | null>(null);
  const [shopperTypedMsg, setShopperTypedMsg] = useState('');

  // --- Floating widgets alerts & toasts ---
  const [toastText, setToastText] = useState('');
  const [toastType, setToastType] = useState<'success' | 'warn' | 'error' | 'info'>('success');
  const [toastShow, setToastShow] = useState(false);
  let toastTimer: any = null;

  const [confirmModalData, setConfirmModalData] = useState<{ title: string; text: string; onConfirm: () => void } | null>(null);

  const [showPWABanner, setShowPWABanner] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showNotificationsDrop, setShowNotificationsDrop] = useState(false);

  // --- Database System Logging Helper ---
  const addLog = (msg: string) => {
    const freshLog: LogEntry = { msg, time: now() };
    setLog(prev => {
      const compiled = [freshLog, ...prev].slice(0, 50);
      StorageEngine.save('log', compiled);
      return compiled;
    });
  };

  const addNotification = (type: string, msg: string, link: string | null = null) => {
    const freshNotif: Notification = {
      id: gid(),
      type,
      msg,
      link,
      time: Date.now(),
      timeStr: now(),
      read: false
    };
    setNotifs(prev => {
      const compiled = [freshNotif, ...prev].slice(0, 50);
      StorageEngine.save('notifs', compiled);
      return compiled;
    });
  };

  const showToast = (msg: string, type: 'success' | 'warn' | 'error' | 'info' = 'success') => {
    setToastText(msg);
    setToastType(type);
    setToastShow(true);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      setToastShow(false);
    }, 3500);
  };

  // --- Data Loader Effect ---
  useEffect(() => {
    const initialDataset = StorageEngine.loadAll();
    setShops(initialDataset.shops);
    setItems(initialDataset.items);
    setCart(initialDataset.cart);
    setOrders(initialDataset.orders);
    setWish(initialDataset.wish);
    setCoupons(initialDataset.coupons);
    setReviews(initialDataset.reviews);
    setFavs(initialDataset.favs);
    setOwners(initialDataset.owners);
    setSettings(initialDataset.settings);
    setLog(initialDataset.log);
    setSrchHist(initialDataset.srchHist);
    setSess(initialDataset.sess);
    setNotifs(initialDataset.notifs);
    setChats(initialDataset.chats);
    setFlashSales(initialDataset.flashSales);
    setTheme(initialDataset.theme as any);
    setLang(initialDataset.lang as any);
    try {
      const rec = JSON.parse(localStorage.getItem('vm_recent') || '[]');
      setRecentViewedIds(rec);
    } catch (e) {
      console.warn("Failed to load recently viewed:", e);
    }

    // Apply saved themes
    document.documentElement.setAttribute('data-theme', initialDataset.theme);

    // Show PWA banner if not dismissed yet
    const dismissed = localStorage.getItem('vm_pwa_dis');
    if (!dismissed) {
      setShowPWABanner(true);
    }

    // Verify connection and synchronize Firestore in background
    testConnection().then(() => {
      setFirebaseStatus('connected');
    }).catch(() => {
      setFirebaseStatus('error');
    });

    syncStorageWithFirebase(
      initialDataset.shops,
      initialDataset.items,
      initialDataset.owners,
      initialDataset.orders,
      initialDataset.coupons,
      initialDataset.settings
    ).then(async () => {
      try {
        const liveShops = await fetchAllShops();
        if (liveShops.length > 0) setShops(liveShops);
        
        const liveProducts = await fetchAllProducts();
        if (liveProducts.length > 0) setItems(liveProducts);

        const liveOwners = await fetchAllOwners();
        if (liveOwners.length > 0) setOwners(liveOwners);

        const liveOrders = await fetchAllOrders();
        if (liveOrders.length > 0) setOrders(liveOrders);

        const liveCoupons = await fetchAllCoupons();
        if (liveCoupons.length > 0) setCoupons(liveCoupons);

        const liveSettings = await fetchAppSettings();
        if (liveSettings) setSettings(liveSettings);
      } catch (err) {
        console.error("Firestore loading error:", err);
      }
    });

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setFirebaseUser(user);
        
        // Auto sign-in if email matches aaraddixit@gmail.com
        if (user.email === 'aaraddixit@gmail.com') {
          showToast('👑 Welcome administrator Aarad Dixit!', 'success');
        }
      } else {
        setFirebaseUser(null);
      }
    });

    // Hide central loader
    setTimeout(() => {
      setAppLoading(false);
    }, 450);

    return () => {
      unsubscribeAuth();
    };
  }, []);

  // Track recently viewed products on active details switch
  useEffect(() => {
    if (activeProductDetail) {
      setActiveImgIndex(0);
      setRecentViewedIds(prev => {
        const next = [activeProductDetail.id, ...prev.filter(id => id !== activeProductDetail.id)].slice(0, 10);
        localStorage.setItem('vm_recent', JSON.stringify(next));
        return next;
      });
    }
  }, [activeProductDetail]);

  // Fetch initial API categories & products from the Express backend
  useEffect(() => {
    fetch("/api/products")
      .then(res => res.json())
      .then(res => {
        if (res.success && res.data && res.data.length > 0) {
          // Merge server products with local state
          setItems(prev => {
            const merged = [...prev];
            res.data.forEach((srv: any) => {
              const idx = merged.findIndex(p => p.id === srv.id);
              if (idx > -1) {
                merged[idx] = srv;
              } else {
                merged.push(srv);
              }
            });
            return merged;
          });
        }
      })
      .catch(err => console.warn("Could not load backend products, falling back to offline mode:", err));
  }, []);

  // --- Sync Effects for Client tables ---
  const skipFirstRun = useRef(true);
  useEffect(() => {
    if (skipFirstRun.current) {
      skipFirstRun.current = false;
      return;
    }
    StorageEngine.save('shops', shops);
    StorageEngine.save('items', items);
    StorageEngine.save('cart', cart);
    StorageEngine.save('orders', orders);
    StorageEngine.save('wish', wish);
    StorageEngine.save('coupons', coupons);
    StorageEngine.save('reviews', reviews);
    StorageEngine.save('favs', favs);
    StorageEngine.save('owners', owners);
    StorageEngine.save('settings', settings);
    StorageEngine.save('flashSales', flashSales);
    StorageEngine.save('chats', chats);
  }, [shops, items, cart, orders, wish, coupons, reviews, favs, owners, settings, flashSales, chats]);

  // --- Firebase Auto-Sync Observers ---
  const prevShopsRef = useRef<Shop[]>([]);
  useEffect(() => {
    if (appLoading) return;
    shops.forEach(s => {
      const prevS = prevShopsRef.current.find(x => x.id === s.id);
      if (!prevS || JSON.stringify(prevS) !== JSON.stringify(s)) {
        saveShopToDb(s).catch(e => console.error("Error saving shop:", e));
      }
    });
    prevShopsRef.current = shops;
  }, [shops, appLoading]);

  const prevItemsRef = useRef<Product[]>([]);
  useEffect(() => {
    if (appLoading) return;
    items.forEach(p => {
      const prevP = prevItemsRef.current.find(x => x.id === p.id);
      if (!prevP || JSON.stringify(prevP) !== JSON.stringify(p)) {
        saveProductToDb(p).catch(e => console.error("Error saving product:", p.name, e));
      }
    });
    prevItemsRef.current = items;
  }, [items, appLoading]);

  const prevOwnersRef = useRef<Owner[]>([]);
  useEffect(() => {
    if (appLoading) return;
    owners.forEach(o => {
      const prevO = prevOwnersRef.current.find(x => x.id === o.id);
      if (!prevO || JSON.stringify(prevO) !== JSON.stringify(o)) {
        saveOwnerToDb(o).catch(e => console.error("Error saving owner:", e));
      }
    });
    prevOwnersRef.current = owners;
  }, [owners, appLoading]);

  const prevOrdersRef = useRef<Order[]>([]);
  useEffect(() => {
    if (appLoading) return;
    orders.forEach(o => {
      const prevO = prevOrdersRef.current.find(x => x.id === o.id);
      if (!prevO || JSON.stringify(prevO) !== JSON.stringify(o)) {
        saveOrderToDb(o).catch(e => console.error("Error saving order:", e));
      }
    });
    prevOrdersRef.current = orders;
  }, [orders, appLoading]);

  const prevCouponsRef = useRef<Coupon[]>([]);
  useEffect(() => {
    if (appLoading) return;
    coupons.forEach(c => {
      const prevC = prevCouponsRef.current.find(x => x.code === c.code);
      if (!prevC || JSON.stringify(prevC) !== JSON.stringify(c)) {
        saveCouponToDb(c).catch(e => console.error("Error saving coupon:", e));
      }
    });
    prevCouponsRef.current = coupons;
  }, [coupons, appLoading]);

  const prevSettingsRef = useRef<AppSettings>({} as AppSettings);
  useEffect(() => {
    if (appLoading || !settings || !settings.adminPin) return;
    if (JSON.stringify(prevSettingsRef.current) !== JSON.stringify(settings)) {
      saveAppSettingsToDb(settings).catch(e => console.error("Error saving settings:", e));
      prevSettingsRef.current = settings;
    }
  }, [settings, appLoading]);

  useEffect(() => {
    if (!appLoading) {
      prevShopsRef.current = shops;
      prevItemsRef.current = items;
      prevOwnersRef.current = owners;
      prevOrdersRef.current = orders;
      prevCouponsRef.current = coupons;
      prevSettingsRef.current = settings;
    }
  }, [appLoading]);

  // Window scroll event listener for scrolling togglers
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Back button popping modal handler
  useEffect(() => {
    const handlePopState = () => {
      // close last opened modal
      setShowCartModal(false);
      setShowCheckoutModal(false);
      setShowShopDetailModal(false);
      setShowProductDetailModal(false);
      setShowReviewsModal(false);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // --- Themes togglers ---
  const handleToggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('vm_theme', nextTheme);
    showToast(`Switched to ${nextTheme} mode`, 'info');
  };

  // --- Translate triggers ---
  const translate = (enText: string, hiText: string) => {
    return lang === 'hi' ? hiText : enText;
  };

  // --- Store operations ---
  const isShopOpenNow = (s: Shop) => {
    if (s.is24x7) return true;
    if (s.status === 'closed' || s.status === 'suspended') return false;
    try {
      const date = new Date();
      const currentMin = date.getHours() * 60 + date.getMinutes();
      const [oh, om] = (s.openTime || "09:00").split(':').map(Number);
      const [ch, cm] = (s.closeTime || "21:00").split(':').map(Number);
      const openMin = oh * 60 + om;
      const closeMin = ch * 60 + cm;
      if (closeMin < openMin) {
        return currentMin >= openMin || currentMin < closeMin;
      }
      return currentMin >= openMin && currentMin < closeMin;
    } catch {
      return true;
    }
  };

  // Star aggregate ratings
  const getShopRatingAverage = (shopId: string) => {
    const shopReviews = reviews[shopId] || [];
    if (!shopReviews.length) return 0;
    const sum = shopReviews.reduce((acc, current) => acc + current.rating, 0);
    return +(sum / shopReviews.length).toFixed(1);
  };

  const getShopReviewsCount = (shopId: string) => {
    return (reviews[shopId] || []).length;
  };

  const renderStarsString = (rating: number) => {
    const rounded = Math.floor(rating);
    return '⭐'.repeat(rounded) + '☆'.repeat(5 - rounded);
  };

  // --- Filter and Sort Core Algorithms ---
  const applyFiltersToShops = () => {
    let fl = shops.filter(s => s.status !== 'suspended');

    // Filter by categories selection first
    if (selectedCategory) {
      const pureCat = selectedCategory.replace(/^\S+\s/, '').toLowerCase();
      fl = fl.filter(s => s.category.toLowerCase().includes(pureCat) || pureCat.includes(s.category.toLowerCase()));
    }

    // Apply custom keyword filters
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      // Gather shops providing goods matching query keyword tags or descriptors
      const matchShopIds = new Set<string>();
      items.forEach(it => {
        if (it.status === 'active' && (
          it.name.toLowerCase().includes(q) ||
          (it.tags || []).some(t => t.toLowerCase().includes(q)) ||
          (it.desc || '').toLowerCase().includes(q)
        )) {
          matchShopIds.add(it.shopRef);
        }
      });

      fl = fl.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.area || '').toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q) ||
        matchShopIds.has(s.id)
      );
    }

    // Delivery checkbox
    if (filters.delivery) {
      fl = fl.filter(s => s.delivery);
    }
    // Verified status check
    if (filters.verified) {
      fl = fl.filter(s => s.plan >= 99);
    }
    // Premium tier checks
    if (filters.premium) {
      fl = fl.filter(s => s.plan >= 299);
    }
    // Open now checks
    if (filters.open) {
      fl = fl.filter(s => isShopOpenNow(s));
    }

    // Sorting algorithm
    const sorted = [...fl];
    const getRatVal = (sId: string) => getShopRatingAverage(sId);
    const getRevVal = (sId: string) => getShopReviewsCount(sId);

    switch (sortOption) {
      case 'featured':
        return sorted.sort((a, b) => (b.plan || 0) - (a.plan || 0) || (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
      case 'rating':
        return sorted.sort((a, b) => getRatVal(b.id) - getRatVal(a.id));
      case 'reviews':
        return sorted.sort((a, b) => getRevVal(b.id) - getRevVal(a.id));
      case 'newest':
        return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case 'name':
        return sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      case 'revenue':
        return sorted.sort((a, b) => (b.revenue || 0) - (a.revenue || 0));
      default:
        return sorted;
    }
  };

  const filteredShopsList = applyFiltersToShops();

  // Reset Filters wrapper
  const handleResetAllFilters = () => {
    setFilters({ delivery: false, verified: false, premium: false, open: false });
    setSelectedCategory('');
    setSortOption('featured');
    setSearchTerm('');
    showToast('Filters Reset successfully');
  };

  // --- Search Engine Typo Tolerant Logic ---
  const handleSetSearchAndLog = (val: string) => {
    setSearchTerm(val);
    if (val.trim().length > 1) {
      setSrchHist(prev => {
        const cleaned = [val, ...prev.filter(s => s.toLowerCase() !== val.toLowerCase())].slice(0, 8);
        localStorage.setItem('vm_srch', JSON.stringify(cleaned));
        return cleaned;
      });
    }
  };

  const suggestedResults = () => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return [];
    const arr: { title: string; type: 'Shop' | 'Product' | 'Category'; action: () => void }[] = [];

    // Match shops
    shops.forEach(s => {
      if (s.status !== 'suspended' && (s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q))) {
        arr.push({
          title: s.name,
          type: 'Shop',
          action: () => {
            setActiveShopDetail(s);
            setShowShopDetailModal(true);
          }
        });
      }
    });

    // Match items Catalog list
    items.forEach(it => {
      if (it.status === 'active' && it.name.toLowerCase().includes(q)) {
        arr.push({
          title: it.name,
          type: 'Product',
          action: () => {
            setActiveProductDetail(it);
            setShowProductDetailModal(true);
          }
        });
      }
    });

    const CATEGORIES = [
      '💻 Electronics',
      '👕 Fashion',
      '🍏 Grocery',
      '📱 Mobiles',
      '📚 Books',
      '📺 Home Appliances',
      '💄 Beauty',
      '⚽ Sports'
    ];

    CATEGORIES.forEach(c => {
      if (c.toLowerCase().includes(q)) {
        arr.push({
          title: c.replace(/^\S+\s/, ''),
          type: 'Category',
          action: () => {
            setSelectedCategory(c);
            setCurrentView('market');
          }
        });
      }
    });

    return arr.slice(0, 6);
  };

  // --- Shopping Cart Action Workflows ---
  const handleAddToCart = (item: Product, qty: number = 1) => {
    if (item.stock <= 0) return showToast('Out of Stock', 'warn');
    const existing = cart.find(c => c.id === item.id);
    if (existing) {
      if (existing.qty + qty > item.stock) {
        return showToast(`Only ${item.stock} items left in stock shelves`, 'warn');
      }
      setCart(prev => prev.map(c => c.id === item.id ? { ...c, qty: c.qty + qty } : c));
    } else {
      setCart(prev => [...prev, {
        id: item.id,
        qty,
        name: item.name,
        price: item.price,
        shopRef: item.shopRef,
        emoji: item.emoji,
        img: item.img,
        stock: item.stock
      }]);
    }
    showToast(`${item.name} added to cart! 🛒`);
  };

  const handleUpdateCartQuantity = (id: number, delta: number) => {
    const ci = cart.find(c => c.id === id);
    if (!ci) return;
    const nextQty = ci.qty + delta;
    if (nextQty <= 0) {
      setCart(prev => prev.filter(c => c.id !== id));
      showToast('Item removed from cart');
    } else {
      if (nextQty > ci.stock) {
        return showToast(`Only ${ci.stock} units available in stock`, 'warn');
      }
      setCart(prev => prev.map(c => c.id === id ? { ...c, qty: nextQty } : c));
    }
  };

  const getCartTotals = () => {
    const subtotal = cart.reduce((acc, current) => acc + (current.price * current.qty), 0);
    let discount = 0;
    if (appliedCoupon) {
      if (appliedCoupon.type === 'percent') {
        discount = Math.round(subtotal * appliedCoupon.disc / 100);
      } else {
        discount = appliedCoupon.disc;
      }
      discount = Math.min(discount, subtotal);
    }
    const taxRate = settings.taxRate || 0;
    const taxableAmount = subtotal - discount;
    const tax = Math.round(taxableAmount * taxRate / 100);
    
    let delivery = 0;
    if (cart.length > 0 && subtotal < (settings.freeDelivAbove || 500)) {
      delivery = settings.delivFee || 0;
    }

    return {
      subtotal,
      discount,
      tax,
      delivery,
      total: subtotal - discount + tax + delivery
    };
  };

  const totals = getCartTotals();

  // Coupon validator
  const handleApplyCoupon = () => {
    const code = applyCouponStr.trim().toUpperCase();
    if (!code) {
      setAppliedCoupon(null);
      setCouponStatusText('');
      return;
    }
    const c = coupons.find(cp => cp.code === code && cp.active && cp.expiry >= today() && (cp.maxUses === 0 || cp.used < cp.maxUses));
    if (!c) {
      setCouponStatusText('❌ Invalid or expired coupon code');
      setCouponStatusColor('red');
      setAppliedCoupon(null);
    } else {
      setCouponStatusText(`✅ Coupon Applied! (${c.disc}${c.type === 'percent' ? '%': '₹'} Off)`);
      setCouponStatusColor('green');
      setAppliedCoupon(c);
    }
  };

  // --- Multistep Checkout Workflows ---
  const handleProposeCheckout = () => {
    // Audit minimum orders per shops
    const groupTotals: Record<string, number> = {};
    cart.forEach(c => {
      groupTotals[c.shopRef] = (groupTotals[c.shopRef] || 0) + (c.price * c.qty);
    });

    let blocking = false;
    for (const [ref, tot] of Object.entries(groupTotals)) {
      const shop = shops.find(s => s.id === ref);
      if (shop && tot < (shop.minOrder || 0)) {
        blocking = true;
        showToast(`Checkout block: ${shop.name} minimum order value is ₹${shop.minOrder}`, 'error');
      }
    }

    if (blocking) return;
    setCheckoutStep(1);
    setShowCartModal(false);
    setShowCheckoutModal(true);
  };

  const handlePlaceOrder = () => {
    if (!coName || !coPhone || !coAddr) return showToast('Complete required details', 'error');
    if (!Sec.phone(coPhone)) return showToast('Invalid mobile number digits', 'error');

    const oId = gOrdId();
    const newOrder: Order = {
      id: oId,
      customer: {
        name: coName,
        phone: coPhone,
        address: coAddr,
        pincode: coPin,
        notes: coNotes
      },
      items: cart.map(c => ({
        id: c.id,
        name: c.name,
        qty: c.qty,
        price: c.price,
        shopRef: c.shopRef
      })),
      subtotal: totals.subtotal,
      discount: totals.discount,
      tax: totals.tax,
      delivery: totals.delivery,
      total: totals.total,
      status: 'pending',
      payment: coPayM,
      date: now(),
      createdAt: new Date().toISOString(),
      timeline: [{ status: 'pending', time: now() }]
    };

    // Inventory shelf stock decrements & update gross revenues
    setItems(prev => prev.map(p => {
      const purchased = cart.find(c => c.id === p.id);
      if (purchased) {
        return {
          ...p,
          stock: Math.max(0, p.stock - purchased.qty),
          salesCount: (p.salesCount || 0) + purchased.qty
        };
      }
      return p;
    }));

    setShops(prev => prev.map(s => {
      const parts = cart.filter(c => c.shopRef === s.id);
      const earned = parts.reduce((acc, curr) => acc + (curr.price * curr.qty), 0);
      return { ...s, revenue: (s.revenue || 0) + earned };
    }));

    // Save orders ledger
    setOrders(prev => [...prev, newOrder]);
    saveOrderToDb(newOrder);
    addLog(`🛒 New client order logged: ${oId}`);
    addNotification('order_new', `New order reference ${oId} received at registers!`, oId);

    // Synchronize shipping & tracking details to Profile Card
    localStorage.setItem('vm_profile_name', coName);
    localStorage.setItem('vm_profile_phone', coPhone);
    localStorage.setItem('vm_profile_address', coAddr);
    localStorage.setItem('vm_profile_pincode', coPin);

    setPlacedOrderId(oId);
    setCart([]);
    setAppliedCoupon(null);
    setApplyCouponStr('');
    setCouponStatusText('');
    setCheckoutStep(3);
    showToast('Order Placed! 🎉');
  };

  const handleSaveProfile = () => {
    if (!coPhone) {
      showToast(translate('Phone number is required to look up and track orders!', 'ऑर्डर खोजने और ट्रैक करने के लिए फोन नंबर आवश्यक है!'), 'warn');
    }
    localStorage.setItem('vm_profile_name', coName);
    localStorage.setItem('vm_profile_phone', coPhone);
    localStorage.setItem('vm_profile_address', coAddr);
    localStorage.setItem('vm_profile_pincode', coPin);
    showToast(translate('Profile & security details saved successfully! 👤', 'प्रोफ़ाइल और संपर्क विवरण सफलतापूर्वक सहेजा गया! 👤'), 'success');
  };

  // Download Invoice PDF Print simulator
  const handlePrintReceipt = (idStr: string) => {
    const o = orders.find(ord => ord.id === idStr);
    if (!o) return;
    const w = window.open('', '_blank');
    if (!w) return showToast('Popup blocked', 'error');
    w.document.write(`
      <html><head><title>Invoice ${o.id}</title><link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;800&display=swap" rel="stylesheet"><style>
        body{font-family:'Poppins',sans-serif;padding:40px;max-width:600px;margin:auto;color:#333}
        h1{color:#667eea;border-bottom:3px solid #667eea;padding-bottom:8px}
        table{width:100%;border-collapse:collapse;margin:20px 0}
        th{background:#f5f7fa;padding:10px;text-align:left;border-bottom:2px solid #667eea}
        td{padding:10px;border-bottom:1px solid #eee}
      </style></head><body>
        <h1>🧾 VidishaMart Payment Receipt</h1>
        <p><strong>Order ID:</strong> ${o.id}</p>
        <p><strong>Customer:</strong> ${Sec.esc(o.customer.name)} | ${o.customer.phone}</p>
        <p><strong>Address:</strong> ${Sec.esc(o.customer.address)}</p>
        <table><thead><tr><th>Item</th><th>Price</th></tr></thead><tbody>
          ${o.items.map(i => `<tr><td>${Sec.esc(i.name)} × ${i.qty}</td><td>₹${i.price * i.qty}</td></tr>`).join('')}
        </tbody></table>
        <p>Subtotal: ₹${o.subtotal}</p>
        <p>Grand Invoice Total: ₹${o.total}</p>
        <p>Payment: ${o.payment.toUpperCase()}</p>
      </body></html>
    `);
    w.document.close();
    w.print();
  };

  // --- Favorite Shops Star Workflows ---
  const handleToggleStarFavorite = (shopId: string, event?: React.MouseEvent) => {
    if (event) event.stopPropagation();
    setFavs(prev => {
      const idx = prev.indexOf(shopId);
      if (idx >= 0) {
        showToast('Removed from favorites');
        return prev.filter(f => f !== shopId);
      } else {
        showToast('Added to favorites ⭐');
        return [...prev, shopId];
      }
    });
  };

  // --- Wishlist Likes Heart Workflows ---
  const handleToggleProductWishlist = (pId: number, event?: React.MouseEvent) => {
    if (event) event.stopPropagation();
    setWish(prev => {
      const idx = prev.indexOf(pId);
      if (idx >= 0) {
        showToast('Removed from wishlist');
        return prev.filter(f => f !== pId);
      } else {
        showToast('Added to wishlist ❤️');
        return [...prev, pId];
      }
    });
  };

  // --- Reviews Submit Functions ---
  const handleSubmitReview = () => {
    if (!writeRevName.trim() || !writeRevText.trim()) return showToast('Fill all fields', 'error');
    if (Sec.hasBadWords(writeRevText) || Sec.hasBadWords(writeRevName)) {
      return showToast('Profanity/Inappropriate text blocked', 'error');
    }

    const reviewPayload = {
      id: gid(),
      name: Sec.cleanText(writeRevName.trim()),
      rating: writeRevRating,
      text: Sec.cleanText(writeRevText.trim()),
      date: now(),
      approved: !settings.moderateReviews
    };

    setReviews(prev => {
      const copy = { ...prev };
      if (!copy[reviewShopId]) {
        copy[reviewShopId] = [];
      }
      copy[reviewShopId].push(reviewPayload);
      return copy;
    });

    addNotification('review_new', `New feedback review for store: ${reviewShopName}`);
    showToast(settings.moderateReviews ? 'Review submitted! Pending admin moderation.' : 'Review published successfully! ⭐');

    setWriteRevName('');
    setWriteRevText('');
    setWriteRevRating(5);
    setShowWriteReviewModal(false);
  };

  // --- Search double click admin validator ---
  const handleLogoAdminTrigger = () => {
    if (showAdminPanel) return;
    if (!firebaseUser) {
      showToast('❌ Access Denied: Please log in first to verify admin authorization', 'error');
      return;
    }
    if (firebaseUser.email !== 'aaraddixit@gmail.com') {
      showToast('❌ Access Denied: Only aaraddixit@gmail.com can access the Admin Panel', 'error');
      return;
    }
    setPinTarget('admin');
    setPinInValue('');
    setPinError('');
    setShowPinScreen(true);
  };

  const handlePinInputOnChange = async (val: string) => {
    const valCleaned = val.replace(/\D/g, '');
    setPinInValue(valCleaned);
    if (valCleaned.length < 4) return;

    if (pinTarget === 'admin') {
      if (!firebaseUser || firebaseUser.email !== 'aaraddixit@gmail.com') {
        showToast('❌ Access Denied: Unauthorized admin session', 'error');
        setShowPinScreen(false);
        setPinInValue('');
        return;
      }
      const correctPin = settings.adminPin || '9999';
      if (valCleaned === correctPin) {
        setShowPinScreen(false);
        setPinInValue('');
        setShowAdminPanel(true);
        showToast('Welcome inside core control, Admin! 🛡️', 'success');
      } else {
        setPinError('❌ Incorrect Access PIN');
        setPinInValue('');
      }
    }
  };

  // --- Seller Authentication Forms handlers ---
  const handleRegOwnerSubmit = async () => {
    if (!orName || !orPhone || !orPin || !orPin2 || !orSecA) {
      return setRegError('Please complete all required fields (*)');
    }
    if (!Sec.phone(orPhone)) return setRegError('Invalid Mobile Phone (10 digits)');
    if (!Sec.pin(orPin)) return setRegError('PIN code must be 4 digits & not in guessing list');
    if (orPin !== orPin2) return setRegError('PIN confirmations do not match');
    if (!orAgree) return setRegError('Please agree to our Privacy Policy and Terms of Use');
    if (owners.some(o => o.phone === orPhone)) return setRegError('This mobile number is already registered');

    const dSalt = Math.random().toString(36).slice(2, 12);
    const pinHashed = await Sec.hash(orPin, dSalt);
    const secAnsHashed = await Sec.hash(orSecA.trim().toLowerCase(), dSalt);

    const ownerPayload: Owner = {
      id: gOwId(),
      name: orName,
      phone: orPhone,
      email: orEmail,
      pin: pinHashed,
      salt: dSalt,
      secQuestion: orSecQ,
      secAnswer: secAnsHashed,
      refCode: Math.random().toString(36).slice(2, 7).toUpperCase(),
      referredBy: null,
      status: 'active',
      failedAttempts: 0,
      lockedUntil: 0,
      remember: olRemember,
      lastLogin: null,
      phoneVerified: false,
      createdAt: new Date().toISOString()
    };

    if (settings.requireOtp) {
      const demoOtp = String(Math.floor(100000 + Math.random() * 900000));
      setOtpSentCode(demoOtp);
      setOtpPendingOwner(ownerPayload);
      setOtpInputCode('');
      setOtpError('');
      setAuthTab('otp');
      showToast('📱 OTP sent simulation active (shows code inside drawer!)', 'info');
    } else {
      setOwners(prev => [...prev, ownerPayload]);
      const sessionPayload: Session = {
        ownerId: ownerPayload.id,
        name: ownerPayload.name,
        phone: ownerPayload.phone,
        loginTime: Date.now(),
        remember: olRemember
      };
      setSess(sessionPayload);
      StorageEngine.save('sess', sessionPayload);
      addLog(`👤 New Seller created account: ${ownerPayload.name}`);
      showToast(`Welcome ${ownerPayload.name}! Dynamic listings are active.`);
      setShowAuthOverlay(false);
      setCurrentView('owner');
    }
  };

  const handleVerifyOtpSubmit = () => {
    if (otpInputCode !== otpSentCode) {
      return setOtpError('❌ Incorrect code simulation. Try again.');
    }
    if (!otpPendingOwner) return;

    const validatedOwner = { ...otpPendingOwner, phoneVerified: true };
    setOwners(prev => [...prev, validatedOwner]);

    const sessionPayload: Session = {
      ownerId: validatedOwner.id,
      name: validatedOwner.name,
      phone: validatedOwner.phone,
      loginTime: Date.now(),
      remember: olRemember
    };
    setSess(sessionPayload);
    StorageEngine.save('sess', sessionPayload);

    addLog(`👤 Active seller registered with phone OTP: ${validatedOwner.name}`);
    showToast('Success! Registered!');
    setShowAuthOverlay(false);
    setCurrentView('owner');
    setOtpPendingOwner(null);
  };

  const handleLoginOwnerSubmit = async () => {
    if (!olPhone || !olPin) return setLoginError('Fill PIN and Phone variables');
    const me = owners.find(o => o.phone === olPhone);
    if (!me || me.status === 'banned') {
      return setLoginError('No corresponding accounts found or account status frozen');
    }

    let pinMatches = false;
    if (me.legacyPin) {
      pinMatches = Sec._fnvHash(olPin) === me.pin;
      if (pinMatches) {
        const dSalt = Math.random().toString(36).slice(2, 12);
        me.pin = await Sec.hash(olPin, dSalt);
        me.salt = dSalt;
        delete me.legacyPin;
      }
    } else {
      pinMatches = (await Sec.hash(olPin, me.salt)) === me.pin;
    }

    if (!pinMatches) {
      return setLoginError('Wrong secure PIN code entered');
    }

    const sessionPayload: Session = {
      ownerId: me.id,
      name: me.name,
      phone: me.phone,
      loginTime: Date.now(),
      remember: olRemember
    };
    setSess(sessionPayload);
    StorageEngine.save('sess', sessionPayload);

    addLog(`👤 Seller login session init: ${me.name}`);
    showToast(`Welcome back, ${me.name}! 👋`);
    setShowAuthOverlay(false);
    setCurrentView('owner');
  };

  const handleFindForgotAccount = async () => {
    const me = owners.find(o => o.phone === fgPhone);
    if (!me) return setFgError('Corresponding phone number not catalogued');

    if (fgShowQuestion) {
      // Validate challenge answer
      const answerHashed = await Sec.hash(fgAnswer.trim().toLowerCase(), me.salt);
      if (answerHashed !== me.secAnswer) {
        return setFgError('❌ Wrong recovery answer');
      }
      if (!Sec.pin(fgNewPin)) return setFgError('Choose a correct 4 digit PIN code');
      if (fgNewPin !== fgCfPin) return setFgError('PIN confirmations do not match');

      const compiledHash = await Sec.hash(fgNewPin, me.salt);
      setOwners(prev => prev.map(o => o.id === me.id ? { ...o, pin: compiledHash, legacyPin: false } : o));
      showToast('PIN reset success! Please login.', 'success');
      setAuthTab('login');
      setOlPhone(fgPhone);
      setFgShowQuestion(false);
      setFgPhone('');
      setFgAnswer('');
      setFgNewPin('');
    } else {
      if (!me.secQuestion) return setFgError('Account lacks security recovery questions');
      setFgQuestion(me.secQuestion);
      setFgShowQuestion(true);
    }
  };

  // --- Quick Add Store Submit ---
  const handleSubmitQuickStore = () => {
    if (!qName || !qCat || !qArea || !qPhone) return showToast('Fill all fields', 'error');
    if (!Sec.phone(qPhone)) return showToast('Invalid mobile phone number (10 digits)', 'error');

    const newShop: Shop = {
      id: gShopId(),
      name: qName,
      category: qCat,
      phone: qPhone,
      area: qArea,
      address: '',
      description: qDesc,
      openTime: '09:00',
      closeTime: '21:00',
      minOrder: 0,
      delivery: qDel,
      is24x7: false,
      plan: parseInt(qPlan) || 0,
      img: qImgBase64 || "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=400&fit=crop",
      revenue: 0,
      status: 'active',
      ownerId: null, // Orphaned, but listed
      slug: slug(qName),
      createdAt: new Date().toISOString(),
      featured: false
    };

    setShops(prev => [...prev, newShop]);
    saveShopToDb(newShop);
    addLog(`🏪 Quick Listed Store Added: ${qName}`);
    showToast('Store Registered! Dashboard access available upon claim.');
    setQName('');
    setQArea('');
    setQPhone('');
    setQDesc('');
    setQImgBase64('');
    setShowAddStoreModal(false);
  };

  const handleOpenShopperChat = (partnerId: string, partnerName: string, event?: React.MouseEvent) => {
    if (event) event.stopPropagation();
    if (!settings.enableChat) return showToast('Messaging disabled by system configuration', 'info');
    setShopperChatPartner({ id: partnerId, name: partnerName });
    setShowChatModal(true);
  };

  const handleSendShopperMsg = () => {
    if (!shopperChatPartner || !shopperTypedMsg.trim()) return;
    const room = chats[shopperChatPartner.id] || [];
    const payload: ChatMessage = {
      from: 'me',
      text: shopperTypedMsg,
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    };

    setChats(prev => ({
      ...prev,
      [shopperChatPartner.id]: [...room, payload]
    }));

    setShopperTypedMsg('');

    // Simulated Auto Reply trigger
    setTimeout(() => {
      const answers = [
        "Welcome! We provide direct home deliveries! Let us know catalog requests.",
        "Your order will be packaged instantly and dispatched. Thanks!",
        "Yes, we are open and fully operational today!",
        "We appreciate your inquiries! Direct payments accepted over UPI also."
      ];
      const botResponse: ChatMessage = {
        from: 'them',
        text: answers[Math.floor(Math.random() * answers.length)],
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      };
      setChats(prev => ({
        ...prev,
        [shopperChatPartner.id]: [...(prev[shopperChatPartner.id] || []), botResponse]
      }));
    }, 1500);
  };

  // --- Confirm handler Overlay ---
  const triggerConfirmationModal = (title: string, text: string, callback: () => void) => {
    setConfirmModalData({ title, text, onConfirm: () => { callback(); setConfirmModalData(null); } });
  };

  return (
    <div>
      {/* Central App Loader Block */}
      {appLoading && (
        <div className="loader-wrap" id="loader">
          <div className="spin"></div>
          <div className="loader-txt">Loading VidishaMart…</div>
        </div>
      )}

      {/* Floating System Toasts Dialogs */}
      {toastShow && (
        <div className={`toast show ${toastType !== 'success' ? toastType : ''}`} style={{ display: 'flex' }}>
          <span className="ti">{toastType === 'success' ? '✓' : '⚠'}</span>
          <span className="tt">{toastText}</span>
          <button className="tc" onClick={() => setToastShow(false)}>×</button>
        </div>
      )}

      {/* Confirmation Dialog overlays */}
      <AnimatePresence>
        {confirmModalData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overlay show"
            style={{ display: 'flex' }}
            onClick={() => setConfirmModalData(null)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="cf-box"
              onClick={e => e.stopPropagation()}
            >
              <h4>{confirmModalData.title}</h4>
              <p>{confirmModalData.text}</p>
              <div className="cf-btns">
                <button className="btn-cancel" onClick={() => setConfirmModalData(null)}>Cancel</button>
                <button className="btn-ok" onClick={confirmModalData.onConfirm}>Confirm</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Secure PIN Lock Screens */}
      <AnimatePresence>
        {showPinScreen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="pin-screen show"
            style={{ display: 'flex' }}
          >
            <div style={{ fontSize: '2.5rem' }}>🔐</div>
            <h2>Admin Gate Lock</h2>
            <p>Please type 4-digit code to access settings.</p>
            <div className="pin-dots">
              {[0, 1, 2, 3].map(dotIdx => (
                <div className={`pin-dot ${pinInValue.length > dotIdx ? 'on' : ''}`} key={dotIdx} />
              ))}
            </div>
            <input className="pin-input" type="password" value={pinInValue} onChange={e => handlePinInputOnChange(e.target.value)} maxLength={4} placeholder="" />
            {pinError && <div className="pin-err">{pinError}</div>}
            <div className="pin-hint" style={{ fontSize: '11px', color: '#999', marginTop: '10px' }}>Default Code: 9999</div>
            <button className="pin-back mt-4" onClick={() => setShowPinScreen(false)}>← Back</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Seller Portal Authenticators (orWrap) */}
      <AnimatePresence>
        {showAuthOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overlay show"
            style={{ display: 'flex' }}
            onClick={() => setShowAuthOverlay(false)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 15 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="or-box"
              onClick={e => e.stopPropagation()}
              style={{ background: '#fff', borderRadius: '18px', padding: '18px', width: '100%', maxWidth: '380px' }}
            >
              <div className="or-hd">
                <div style={{ fontSize: '2.2rem', marginBottom: '7px' }}>🏪</div>
                <h2>Seller Login Hub</h2>
                <p>Manage store items & catalog variables</p>
              </div>
              
              <div className="tab-row">
                <button className={`tab-btn ${authTab === 'login' ? 'on' : ''}`} onClick={() => setAuthTab('login')}>Login</button>
                <button className={`tab-btn ${authTab === 'reg' ? 'on' : ''}`} onClick={() => setAuthTab('reg')}>Register</button>
              </div>

              {/* Login form block */}
              {authTab === 'login' && (
                <div className="login-form on">
                  <div className="fg">
                    <label>Mobile phone number</label>
                    <input placeholder="10 Digits" val-type="phone" value={olPhone} onChange={e => setOlPhone(e.target.value)} />
                  </div>
                  <div className="fg">
                    <label>Secure PIN Code</label>
                    <input type="password" value={olPin} onChange={e => setOlPin(e.target.value)} maxLength={4} />
                  </div>
                  <div className="chk-row">
                    <input type="checkbox" checked={olRemember} id="remSessLogin" onChange={e => setOlRemember(e.target.checked)} />
                    <label htmlFor="remSessLogin">Remain signed in</label>
                  </div>
                  {loginError && <div style={{ color: 'red', textAlign: 'center', fontSize: '11px', margin: '4px' }}>{loginError}</div>}
                  <button className="btn-main" onClick={handleLoginOwnerSubmit}>🔓 Unlock Dashboard</button>
                  <a className="forgot-link text-center mt-2 cursor-pointer block" onClick={() => setAuthTab('forgot')}>Forgot PIN Code?</a>
                </div>
              )}

              {/* Registry form block */}
              {authTab === 'reg' && (
                <div className="reg-form on">
                  <div className="fg">
                    <label>Representative Name</label>
                    <input placeholder="Suresh Lal Sahu" value={orName} onChange={e => setOrName(e.target.value)} />
                  </div>
                  <div className="fg">
                    <label>Mobile Phone *</label>
                    <input placeholder="10 Digits" value={orPhone} onChange={e => setOrPhone(e.target.value)} />
                  </div>
                  <div className="fg">
                    <label>Email Profile</label>
                    <input placeholder="optional" value={orEmail} onChange={e => setOrEmail(e.target.value)} />
                  </div>
                  <div className="fg">
                    <label>PIN Code *</label>
                    <input type="password" maxLength={4} value={orPin} onChange={e => setOrPin(e.target.value)} />
                  </div>
                  <div className="fg">
                    <label>Confirm PIN *</label>
                    <input type="password" maxLength={4} value={orPin2} onChange={e => setOrPin2(e.target.value)} />
                  </div>
                  <div className="fg">
                    <label>Recovery Hint Question</label>
                    <select value={orSecQ} onChange={e => setOrSecQ(e.target.value)}>
                      <option value="What is your mother's maiden name?">What is your mother's maiden name?</option>
                      <option value="What was your first pet's name?">What was your first pet's name?</option>
                      <option value="What city were you born in?">What city were you born in?</option>
                      <option value="What is your favourite food?">What is your favourite food?</option>
                    </select>
                  </div>
                  <div className="fg">
                    <label>Hint Answer</label>
                    <input placeholder="Secret answers..." value={orSecA} onChange={e => setOrSecA(e.target.value)} />
                  </div>
                  <div className="fg">
                    <label>Promo Referral Code (Optional)</label>
                    <input placeholder="friend reference..." value={orRefCode} onChange={e => setOrRefCode(e.target.value)} />
                  </div>
                  <div className="chk-row">
                    <input type="checkbox" checked={orAgree} id="agreeCheckReg" onChange={e => setOrAgree(e.target.checked)} />
                    <label htmlFor="agreeCheckReg">Agree to <span className="underline cursor-pointer" onClick={() => setShowPrivacyModal(true)}>Terms and privacy</span></label>
                  </div>
                  {regError && <div style={{ color: 'red', fontSize: '11px', textAlign: 'center', margin: '4px' }}>{regError}</div>}
                  <button className="btn-main" onClick={handleRegOwnerSubmit}>🚀 Create merchant portfolio</button>
                </div>
              )}

              {/* Recovery Question forms */}
              {authTab === 'forgot' && (
                <div className="forgot-form on">
                  <div className="fg">
                    <label>Mobile Number</label>
                    <input placeholder="10 Digits" value={fgPhone} onChange={e => setFgPhone(e.target.value)} />
                  </div>
                  {fgShowQuestion && (
                    <div className="animate-fadeIn">
                      <p style={{ fontSize: '12px', background: '#f0f4ff', padding: '10px', borderRadius: '8px', color: '#1a1a2e', marginBottom: '8px' }}>
                        <strong>Recovery Hint:</strong> {fgQuestion}
                      </p>
                      <div className="fg">
                        <label>Secret Answer</label>
                        <input placeholder="hints secret answer..." value={fgAnswer} onChange={e => setFgAnswer(e.target.value)} />
                      </div>
                      <div className="fg">
                        <label>New PIN Code</label>
                        <input type="password" value={fgNewPin} onChange={e => setFgNewPin(e.target.value)} maxLength={4} />
                      </div>
                      <div className="fg">
                        <label>Confirm PIN Code</label>
                        <input type="password" value={fgCfPin} onChange={e => setFgCfPin(e.target.value)} maxLength={4} />
                      </div>
                    </div>
                  )}
                  {fgError && <div style={{ color: 'red', fontSize: '11px', textAlign: 'center', margin: '4px' }}>{fgError}</div>}
                  <button className="btn-main text-bold" onClick={handleFindForgotAccount}>
                    {fgShowQuestion ? 'Reset PIN Code' : 'Find Account'}
                  </button>
                  <div className="text-center mt-2">
                    <a className="forgot-link" onClick={() => { setAuthTab('login'); setFgShowQuestion(false); setFgError(''); }}>← Back to login</a>
                  </div>
                </div>
              )}

              {/* OTP DEMO */}
              {authTab === 'otp' && (
                <div className="otp-form on">
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem' }}>📱</div>
                    <h3>Enter verification Code</h3>
                    <div className="otp-box mt-2">
                      <p style={{ fontSize: '11px', color: '#666' }}>OTP Simulator Code:</p>
                      <h2 className="otp-code text-bold" style={{ fontSize: '26px' }}>{otpSentCode}</h2>
                    </div>
                    <div className="fg">
                      <input placeholder="Type code from box..." value={otpInputCode} onChange={e => setOtpInputCode(e.target.value)} style={{ textAlign: 'center' }} />
                    </div>
                    {otpError && <div style={{ color: 'red', fontSize: '11px' }}>{otpError}</div>}
                    <button className="btn-main" onClick={handleVerifyOtpSubmit}>✓ Verify Code</button>
                  </div>
                </div>
              )}

              <button onClick={() => setShowAuthOverlay(false)} style={{ width: '100%', background: 'none', border: 'none', color: '#999', padding: '12px', cursor: 'pointer', fontSize: '12px', marginTop: '6px' }}>Cancel</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ADMIN PANEL HOOKS */}
      <AdminPanel
        show={showAdminPanel}
        onClose={() => setShowAdminPanel(false)}
        shops={shops}
        setShops={setShops}
        items={items}
        setItems={setItems}
        owners={owners}
        setOwners={setOwners}
        orders={orders}
        setOrders={setOrders}
        coupons={coupons}
        setCoupons={setCoupons}
        reviews={reviews}
        setReviews={setReviews}
        settings={settings}
        setSettings={setSettings}
        flashSales={flashSales}
        setFlashSales={setFlashSales}
        log={log}
        addLog={addLog}
        showToast={showToast}
        firebaseUser={firebaseUser}
      />

      {/* CORE WEB HEADERS SYSTEM */}
      <header>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            className="sidebar-trigger" 
            id="sidebarTriggerBtn"
            onClick={() => setShowSidebar(true)}
            aria-label="Toggle Sidebar Menu"
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: 'var(--dark)',
              padding: '6px 8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              transition: 'background 0.2s',
            }}
          >
            ☰
          </button>
          <div className="logo" id="logoEl" onDoubleClick={handleLogoAdminTrigger} tabIndex={0} role="button" aria-label="VidishaMart Admin Panel login">
            🛒 {translate("VidishaMart", "विदिशा मार्ट")}
          </div>
        </div>
        <div className="srch-wrap" style={{ position: 'relative', display: 'flex', gap: '6px', alignItems: 'center' }}>
          {/* Categories Dropdown Menu Selection */}
          <select 
            value={selectedCategory || ''} 
            onChange={(e) => { 
              setSelectedCategory(e.target.value || null); 
              setCurrentView('market'); 
            }} 
            style={{ 
              background: 'var(--card)', 
              color: 'var(--dark)', 
              padding: '6px 12px', 
              borderRadius: '24px', 
              fontSize: '11px', 
              fontWeight: 800, 
              border: '1px solid var(--border)', 
              cursor: 'pointer',
              outline: 'none',
              maxWidth: '120px'
            }}
          >
            <option value="">🏬 All Categories</option>
            <option value="💻 Electronics">💻 Electronics</option>
            <option value="👕 Fashion">👕 Fashion</option>
            <option value="🍏 Grocery">🍏 Grocery</option>
            <option value="📱 Mobiles">📱 Mobiles</option>
            <option value="📚 Books">📚 Books</option>
            <option value="📺 Home Appliances">📺 Home Appliances</option>
            <option value="💄 Beauty">💄 Beauty</option>
            <option value="⚽ Sports">⚽ Sports</option>
          </select>
          <input id="srchBox" placeholder={translate("Search products…", "उत्पाद खोजें…")} value={searchTerm} onChange={e => handleSetSearchAndLog(e.target.value)} onFocus={() => setShowSearchSugg(true)} onBlur={() => setTimeout(() => setShowSearchSugg(false), 200)} />
          <button className="srch-btn" onClick={() => setCurrentView('market')}>🔍</button>

          {/* Search Suggestion Dropdown */}
          {showSearchSugg && (
            <div className="sugg-drop show">
              {suggestedResults().length === 0 ? (
                <div>
                  <div className="sugg-hd">Recent Queries</div>
                  {srchHist.map(h => (
                    <div className="sugg-item" key={h} onMouseDown={() => setSearchTerm(h)}>
                      <span className="sugg-ic">🕐</span>
                      <span className="sugg-txt">{h}</span>
                    </div>
                  ))}
                </div>
              ) : (
                suggestedResults().map((res, i) => (
                  <div className="sugg-item" key={i} onMouseDown={res.action}>
                    <span className="sugg-ic">💡</span>
                    <span className="sugg-txt">{res.title}</span>
                    <span className="sugg-type">{res.type}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="h-acts">
          <div className="notif-bell">
            <button className="h-btn" onClick={() => setShowNotificationsDrop(!showNotificationsDrop)}>
              🔔{notifs.filter(n => !n.read).length > 0 && <span className="h-cnt">{notifs.filter(n => !n.read).length}</span>}
            </button>
            {showNotificationsDrop && (
              <div className="notif-drop show">
                <div className="notif-hd">
                  <h4>🔔 Notifications</h4>
                  <button className="notif-clr" onClick={() => { setNotifs([]); StorageEngine.save('notifs', []); }}>Clear</button>
                </div>
                {notifs.map(n => (
                  <div className={`notif-item ${n.read ? '' : 'unread'}`} key={n.id} onClick={() => {
                    setNotifs(prev => prev.map(notf => notf.id === n.id ? { ...notf, read: true } : notf));
                    if (n.link) {
                      setTrackQuery(n.link);
                      setCurrentView('orders');
                    }
                    setShowNotificationsDrop(false);
                  }}>
                    <div className="notif-msg">{n.msg}</div>
                    <div className="notif-time">{n.timeStr}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button className="h-btn" onClick={() => setCurrentView('wishlist')}>
            ❤️{wish.length > 0 && <span className="h-cnt">{wish.length}</span>}
          </button>
          <button className="h-btn" onClick={() => setShowCartModal(true)}>
            🛒{cart.length > 0 && <span className="h-cnt">{cart.reduce((acc, curr) => acc + curr.qty, 0)}</span>}
          </button>
          <button className="h-btn" onClick={() => setShowFavoritesModal(true)}>
            ⭐{favs.length > 0 && <span className="h-cnt">{favs.length}</span>}
          </button>
          <button className="h-btn" onClick={() => setShowProfileModal(true)} title={translate("My Profile & Orders", "मेरा प्रोफाइल और ऑर्डर")}>
            👤
          </button>

          {firebaseUser ? (
            <div className="fb-usr-badge border border-sky-200 bg-sky-50" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '24px', fontSize: '12px', color: '#0369a1', cursor: 'pointer' }} onClick={() => setShowProfileModal(true)}>
              {firebaseUser.photoURL ? (
                <img src={firebaseUser.photoURL} alt="" style={{ width: '20px', height: '20px', borderRadius: '50%' }} referrerPolicy="no-referrer" />
              ) : (
                <span>👤</span>
              )}
              <span className="max-w-[124px] truncate font-semibold">{firebaseUser.displayName || firebaseUser.email}</span>
              {firebaseUser.email === 'aaraddixit@gmail.com' && (
                <button 
                  className="ml-1 px-2.5 py-1 text-[10px] uppercase font-extrabold rounded-full bg-red-600 text-white hover:bg-red-700 transition"
                  onClick={() => {
                    setShowAdminPanel(true);
                    showToast('Welcome inside core control, Aarad Dixit! 🛡️', 'success');
                  }}
                >
                  👑 Admin
                </button>
              )}
              <button 
                onClick={async () => {
                  await logoutUser();
                  showToast('Signed out from Firebase', 'info');
                }}
                className="ml-1 text-red-500 hover:text-red-700 font-bold text-sm"
                title="Google Sign Out"
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
          ) : (
            <button 
              className="px-4 py-1.5 text-xs rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
              onClick={async () => {
                try {
                  const u = await loginWithGoogle();
                  showToast(`Hello ${u?.displayName || 'there'}! Signed in with Google.`, 'success');
                } catch (err: any) {
                  console.error("Popup login error detail:", err);
                  const isClosed = err?.code === 'auth/popup-closed-by-user' || String(err).includes('popup-closed-by-user');
                  const isBlocked = err?.code === 'auth/popup-blocked' || String(err).includes('popup-blocked');
                  
                  if (isClosed) {
                    showToast(translate(
                      'Sign-in window closed by user before completing login.', 
                      'साइन-इन विंडो उपयोगकर्ता द्वारा बिना लॉगिन पूरा किए बंद कर दी गई।'
                    ), 'warn');
                  } else if (isBlocked) {
                    showToast(translate(
                      'Login popup blocked. Please allow popups or open this app in a new tab.', 
                      'लॉगिन पॉपअप ब्लॉक। कृपया पॉपअप की अनुमति दें या ऐप को नए टैब में खोलें।'
                    ), 'error');
                  } else {
                    showToast(translate(
                      'Google Sign-In failed. Please open the app in a new tab to bypass preview iframe limits.', 
                      'गूगल साइन-इन विफल रहा। पूर्वावलोकन सीमाओं से बचने के लिए कृपया ऐप को नए टैब में खोलें।'
                    ), 'error');
                  }
                }
              }}
            >
              Sign In with Google
            </button>
          )}
        </div>
      </header>

      {/* --- HOMEPAGE VIEW (v-home) --- */}
      <AnimatePresence mode="wait">
        {currentView === 'home' && (
          <motion.div
            key="home"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="view on"
          >
          <div className="hero">
            <div className="hero-inner">
              <h1>🏪 {translate("Vidisha's Local Marketplace", "विदिशा का स्थानीय बाज़ार")}</h1>
              <p>{translate("Browse Products • WhatsApp Shops • Home Delivery • Verified Sellers", "उत्पाद देखें • व्हाट्सएप दुकानें • होम डिलीवरी • सत्यापित विक्रेता")}</p>
              <div className="hero-btns">
                <button className="hbtn pri" onClick={() => setCurrentView('market')}>🛍️ {translate("Shop Now", "अभी खरीदें")}</button>
                <button className="hbtn sec" onClick={() => setShowAddStoreModal(true)}>➕ {translate("List Your Store", "अपनी दुकान सूचीबद्ध करें")}</button>
              </div>
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-num">{shops.filter(s => s.status !== 'suspended').length}</div>
              <div className="stat-lbl">Stores</div>
            </div>
            <div className="stat-card">
              <div className="stat-num">{items.filter(i => i.status === 'active').length}</div>
              <div className="stat-lbl">Products</div>
            </div>
            <div className="stat-card">
              <div className="stat-num">{Object.values(reviews).flatMap(x => x).length}</div>
              <div className="stat-lbl">Feedback</div>
            </div>
            <div className="stat-card">
              <div className="stat-num">{orders.length}</div>
              <div className="stat-lbl">Ledger</div>
            </div>
          </div>

          <div className="sec">
            {flashSales.length > 0 && (
              <div style={{ background: 'linear-gradient(135deg, #fa709a, #fee140)', color: '#fff', borderRadius: '14px', padding: '14px', marginBottom: '16px', textAlign: 'center', boxShadow: 'var(--md)', cursor: 'pointer' }} onClick={() => setCurrentView('market')}>
                <div style={{ fontWeight: 800, fontSize: '15px' }}>⚡ {translate("FLASH SALES LIVE NOW!", "फ्लैश सेल लाइव!")}</div>
                <div style={{ fontSize: '12px', opacity: 0.9 }}>{flashSales.length} items on incredible promotions!</div>
              </div>
            )}

            {/* 🏷️ Dynamic E-Commerce Promotional Banners Carousel */}
            <div className="sec-hd" style={{ marginTop: '20px' }}>
              <h2 className="sec-title">🎁 Exclusive Offer Zones</h2>
              <p className="sec-sub">Claim exclusive coupons and shop the best deals in Vidisha</p>
            </div>
            <div className="promo-slider">
              <div className="promo-banner" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)' }}>
                <div className="promo-content">
                  <span style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: 800 }}>FESTIVAL SEASON</span>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, marginTop: '8px' }}>Super Grocery Savers</h3>
                  <p style={{ fontSize: '11px', opacity: 0.9, marginTop: '4px' }}>Get up to 30% off on all staples & oils. Use code <strong style={{ color: '#fff' }}>SAVE20</strong> on checkout.</p>
                </div>
              </div>
              <div className="promo-banner" style={{ background: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)' }}>
                <div className="promo-content">
                  <span style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: 800 }}>TRENDING STYLE</span>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, marginTop: '8px' }}>Fashion Blockbusters</h3>
                  <p style={{ fontSize: '11px', opacity: 0.9, marginTop: '4px' }}>Premium jackets & dresses with free shipping. Redeem coupon <strong style={{ color: '#fff' }}>FIRST10</strong> today.</p>
                </div>
              </div>
              <div className="promo-banner" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #e11d48 100%)' }}>
                <div className="promo-content">
                  <span style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: 800 }}>TECH HUB</span>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, marginTop: '8px' }}>Smart Device Carnival</h3>
                  <p style={{ fontSize: '11px', opacity: 0.9, marginTop: '4px' }}>Unbeatable prices on high-speed Type-C accessories, Android TVs and verified devices.</p>
                </div>
              </div>
            </div>

            <div className="sec-hd" style={{ marginTop: '30px' }}>
              <h2 className="sec-title">✨ Why VidishaMart?</h2>
              <p className="sec-sub">Fulfilling daily essentials directly from verified home merchant guilds</p>
            </div>

            <div className="feat-grid">
              <div className="feat-card"><span className="feat-ic">✅</span><h3>Verified Sellers</h3><p>Guaranteed authentic</p></div>
              <div className="feat-card"><span className="feat-ic">🛒</span><h3>Direct Checkout</h3><p>Assemble and track orders</p></div>
              <div className="feat-card"><span className="feat-ic">🚚</span><h3>Logistics</h3><p>Safe shipping deliveries</p></div>
              <div className="feat-card"><span className="feat-ic">💬</span><h3>Chats</h3><p>Negotiate on WhatsApp</p></div>
            </div>

            <div className="sec-hd" style={{ marginTop: '30px' }}>
              <h2 className="sec-title">🏷️ Browse by Category</h2>
            </div>
            <div className="cats-grid">
              {[
                '💻 Electronics',
                '👕 Fashion',
                '🍏 Grocery',
                '📱 Mobiles',
                '📚 Books',
                '📺 Home Appliances',
                '💄 Beauty',
                '⚽ Sports'
              ].map(c => (
                <div className={`cat-btn ${selectedCategory === c ? 'active' : ''}`} key={c} onClick={() => { setSelectedCategory(c); setCurrentView('market'); }}>
                  <span className="cat-ic">{c.split(' ')[0]}</span>
                  <div className="cat-nm">{c.replace(/^\S+\s/, '')}</div>
                </div>
              ))}
            </div>

            {/* 🔥 Trending / Best Selling Hot Products */}
            <div className="sec-hd" style={{ marginTop: '40px' }}>
              <h2 className="sec-title">🔥 Trending Best Sellers</h2>
              <p className="sec-sub">The highly-ordered, most popular choices by shoppers this week</p>
            </div>
            <div className="prod-grid">
              {items.filter(it => it.status === 'active').sort((a,b) => (b.salesCount || 0) - (a.salesCount || 0)).slice(0, 4).map(it => (
                <div className="prod-card" key={`trend-${it.id}`} onClick={() => { setActiveProductDetail(it); setShowProductDetailModal(true); }} style={{ position: 'relative' }}>
                  <span className="trending-badge">BESTSELLER</span>
                  <div className="prod-img-wrap" style={{ height: '140px', background: '#f5f7fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {it.img ? <img src={it.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px 12px 0 0' }} /> : <span style={{ fontSize: '3rem' }}>{it.emoji}</span>}
                  </div>
                  <div className="prod-body">
                    <div className="prod-name" style={{ fontWeight: 800 }}>{it.name}</div>
                    <div className="prod-shop-nm" style={{ fontSize: '11px', color: '#888' }}>{it.shopName}</div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px' }}>
                      <span className="text-yellow-500">★★★★★</span>
                      <span className="font-mono" style={{ fontSize: '10px', color: '#999' }}>({it.salesCount || 0} sold)</span>
                    </div>
                    <div className="prod-price" style={{ color: 'var(--p)', fontWeight: 800, marginTop: '6px' }}>₹{it.price} <span style={{ fontSize: '11px', color: '#999', textDecoration: 'line-through', fontWeight: 'normal' }}>₹{it.orgPrice || Math.round(it.price * 1.4)}</span></div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                      <button className="btn-add" style={{ flex: 1 }} onClick={(e) => { e.stopPropagation(); handleAddToCart(it); }}>🛒 Quick Shop</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 🕐 Recently Viewed Items */}
            {recentViewedIds.length > 0 && (
              <div style={{ marginTop: '40px' }}>
                <div className="sec-hd">
                  <h2 className="sec-title">🕐 Recently Viewed Products</h2>
                  <p className="sec-sub">Pick up right where you left off browsing with instant access</p>
                </div>
                <div className="recent-viewed-list">
                  {items.filter(it => recentViewedIds.includes(it.id) && it.status === 'active').map(it => (
                    <div key={`recent-${it.id}`} onClick={() => { setActiveProductDetail(it); setShowProductDetailModal(true); }} style={{ flex: '0 0 160px', border: '1px solid var(--border)', borderRadius: '14px', padding: '10px', background: 'var(--card)', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0 }}>
                      <div style={{ height: '90px', background: '#f5f7fa', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px', overflow: 'hidden' }}>
                        {it.img ? <img src={it.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '2rem' }}>{it.emoji}</span>}
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '6px' }}>{it.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--p)', fontWeight: 800, marginTop: '2px' }}>₹{it.price}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ABOUT US SECTION */}
            <div className="about-section">
              <div style={{ display: 'inline-block', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--p)', padding: '6px 16px', borderRadius: '30px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>WHO WE ARE</div>
              <h2 style={{ fontSize: '24px', fontWeight: 800, marginTop: '12px', color: 'var(--dark)' }}>👋 Fostering local trade with modern tech</h2>
              <p style={{ maxWidth: '640px', margin: '12px auto 0', fontSize: '13px', color: '#666', lineHeight: '1.6' }}>
                <strong>Vidisha Mart</strong> is Madhya Pradesh's premiere digital hub connecting residents with verified neighborhood storefronts, home chefs, and pharmacies. We empower local sellers with instant checkout options, order logs, direct WhatsApp communication, and zeroPlatform commission, keeping trade sustainable and pride-worthy.
              </p>
            </div>

            {/* 🗣️ Customer Testimonials Grid */}
            <div className="sec-hd" style={{ marginTop: '40px' }}>
              <h2 className="sec-title">✨ Loved by Local Shoppers</h2>
              <p className="sec-sub">What our beautiful community has to say about shopping on Vidisha Mart</p>
            </div>
            <div className="testimonials-grid">
              <div className="testi-card">
                <div style={{ color: '#f59e0b', fontSize: '16px' }}>★★★★★</div>
                <p style={{ fontSize: '13px', fontStyle: 'italic', color: '#555', marginTop: '8px' }}>"I ordered groceries from Nehru Nagar Fresh and within 40 minutes they delivered everything in neat packing. The WhatsApp tracking interface is so intuitive!"</p>
                <div className="testi-user">
                  <div className="testi-avatar" style={{ background: '#ec4899' }}>AD</div>
                  <div>
                    <h5 style={{ fontWeight: 800, fontSize: '12px' }}>Amit Dixit</h5>
                    <p style={{ fontSize: '10px', color: '#999' }}>Sadar Bazaar Customer</p>
                  </div>
                </div>
              </div>
              <div className="testi-card">
                <div style={{ color: '#f59e0b', fontSize: '16px' }}>★★★★★</div>
                <p style={{ fontSize: '13px', fontStyle: 'italic', color: '#555', marginTop: '8px' }}>"Annapurna Shuddh veg thali was piping hot when it arrived! Excellent quality tiffin for bachelors at Civil Lines. Easily the most useful local portal."</p>
                <div className="testi-user">
                  <div className="testi-avatar" style={{ background: '#10b981' }}>VS</div>
                  <div>
                    <h5 style={{ fontWeight: 800, fontSize: '12px' }}>Vidisha Sharma</h5>
                    <p style={{ fontSize: '10px', color: '#999' }}>Civil Lines Customer</p>
                  </div>
                </div>
              </div>
              <div className="testi-card">
                <div style={{ color: '#f59e0b', fontSize: '16px' }}>★★★★★</div>
                <p style={{ fontSize: '13px', fontStyle: 'italic', color: '#555', marginTop: '8px' }}>"Listing Shubham Mobiles was totally effortless! I got three purchase enquiries directly on my registered WhatsApp number within the very first day."</p>
                <div className="testi-user">
                  <div className="testi-avatar" style={{ background: '#6366f1' }}>SJ</div>
                  <div>
                    <h5 style={{ fontWeight: 800, fontSize: '12px' }}>Shubham Jain</h5>
                    <p style={{ fontSize: '10px', color: '#999' }}>Merchant Store Owner</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ❓ Interactive FAQ support section */}
            <div className="sec-hd" style={{ marginTop: '40px' }}>
              <h2 className="sec-title">❓ FAQ & Help Support</h2>
              <p className="sec-sub">Everything you need to know about purchasing, checkout, and store verification</p>
            </div>
            <div className="faq-accordion">
              {[
                {
                  q: "How does home delivery work on Vidisha Mart?",
                  a: "Store delivery is managed directly by each independent merchant store. Delivery charges and minimal orders may vary by shop, but our system automatically flags free-shipping orders above ₹500."
                },
                {
                  q: "How do I pay for my ordered items?",
                  a: "We support multiple checkout options including Cash On Delivery (COD), Direct merchant UPI scanning with receipt uploads, and placing direct requests over WhatsApp messaging."
                },
                {
                  q: "Are the stores and listings on the platform verified?",
                  a: "Yes! All partner merchants showing badges hold registered retail store claim accounts or verified commercial food handling credentials, which guarantees total transaction safety."
                },
                {
                  q: "Can I list my own traditional store profiles?",
                  a: "Absolutely! Just click on 'List Your Store' at the top banner, provide your storefront details, and our verification crew will contact you in hours to unlock your claims portal."
                }
              ].map((faq, idx) => (
                <div className="faq-item" key={idx}>
                  <div className="faq-quest" onClick={() => setFaqOpenIndex(faqOpenIndex === idx ? null : idx)}>
                    <span style={{ fontSize: '13px', fontWeight: 700 }}>{faq.q}</span>
                    <span>{faqOpenIndex === idx ? '▲' : '▼'}</span>
                  </div>
                  {faqOpenIndex === idx && (
                    <div className="faq-ans">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* 📧 Interactive E-commerce Feedback Contact page block */}
            <div className="contact-section">
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--dark)' }}>📞 Reach Our Support Hub</h3>
                <p style={{ fontSize: '13px', color: '#666', marginTop: '6px', lineHeight: '1.6' }}>
                  Have questions, custom inquiries, bulk order request notes or commercial partnership proposals in Vidisha? Message us directly and our prompt customer response agents will reply in hours.
                </p>
                <div style={{ marginTop: '20px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>📍 <strong>Address:</strong> Main Crossing Road, Sadar Bazaar, Vidisha, MP</div>
                  <div>✉️ <strong>Email:</strong> support@vidishamart.com</div>
                  <div>📞 <strong>Phone:</strong> +91 91234 56789</div>
                </div>
              </div>
              <div>
                <h4 style={{ fontWeight: 800, fontSize: '15px', marginBottom: '10px' }}>✉️ Drop Us a Line</h4>
                {contactSuccess ? (
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '15px', borderRadius: '12px', fontSize: '13px', textAlign: 'center' }}>
                    🎉 Thank you! Your response has been securely logged on our backend server. Our support crew will reach out in hours.
                  </div>
                ) : (
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    if (!contactName || !contactMsg) return showToast('Please fill in required inputs', 'warn');
                    setContactSuccess(true);
                    showToast('Message sent to backend server!', 'success');
                    setTimeout(() => {
                      setContactName('');
                      setContactEmail('');
                      setContactMsg('');
                      setContactSuccess(false);
                    }, 4000);
                  }} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div className="fg" style={{ margin: 0 }}><label>Your Name *</label><input value={contactName} onChange={e => setContactName(e.target.value)} required placeholder="Enter name..." /></div>
                    <div className="fg" style={{ margin: 0 }}><label>Your Email</label><input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="name@domain.com" /></div>
                    <div className="fg" style={{ margin: 0 }}><label>Message *</label><textarea value={contactMsg} onChange={e => setContactMsg(e.target.value)} required rows={3} placeholder="Writing message notes..." style={{ resize: 'none' }} /></div>
                    <button className="btn-main" type="submit" style={{ alignSelf: 'flex-start', marginTop: '6px' }}>✉️ Submit Feedback</button>
                  </form>
                )}
              </div>
            </div>

          </div>

          <footer>
            <div className="foot-grid">
              <div className="fs">
                <h3>VidishaMart</h3>
                <p>Developing robust e-commerce solutions for traditional businesses in Vidisha.</p>
                <div className="soc-links mt-2">
                  <a className="soc-link" onClick={() => showToast('Social media links activated soon!', 'info')}>📷</a>
                </div>
              </div>
              <div className="fs">
                <h3>Consumers</h3>
                <a onClick={() => setCurrentView('market')}>Browse Shops</a>
                <a onClick={() => setCurrentView('wishlist')}>My Wishlist</a>
                <a onClick={() => setShowCartModal(true)}>Shopping Cart</a>
                <a onClick={() => { setTrackQuery(''); setCurrentView('orders'); }}>Track order progress</a>
              </div>
              <div className="fs">
                <h3>Sellers hub</h3>
                <a onClick={() => setShowAddStoreModal(true)}>List store profiles</a>
                <a onClick={() => { if (sess) { setCurrentView('owner'); } else { setShowAuthOverlay(true); } }}>Owner Dashboard</a>
              </div>
            </div>
            <div className="foot-bot">© 2026 VidishaMart MP • Fostering sustainable trade with pride</div>
          </footer>
        </motion.div>
      )}
      </AnimatePresence>

      {/* --- MARKETPLACE STORES BRWOSER (v-market) --- */}
      <AnimatePresence mode="wait">
        {currentView === 'market' && (
          <motion.div
            key="market"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="view on"
          >
          <div className="sec">
            <div className="sec-hd">
              <h2 className="sec-title">🏪 Explore Local Stores</h2>
              <p className="sec-sub">Connecting catalog channels to your neighborhood doorstep</p>
            </div>

            <div className="fbar">
              <label>Sort Catalog By</label>
              <select value={sortOption} onChange={e => setSortOption(e.target.value)} style={{ marginBottom: '11px' }}>
                <option value="featured">⭐ Featured Leaderboard</option>
                <option value="rating">📊 Star Rated</option>
                <option value="reviews">💬 Feedback Counts</option>
                <option value="newest">🆕 Newest Registrations</option>
                <option value="name">🔤 Alphabetical A-Z</option>
              </select>

              <div className="ftags">
                <div className={`ftag ${filters.delivery ? 'on' : ''}`} onClick={() => setFilters({ ...filters, delivery: !filters.delivery })}>🚚 Delivers</div>
                <div className={`ftag ${filters.verified ? 'on' : ''}`} onClick={() => setFilters({ ...filters, verified: !filters.verified })}>✓ Verified</div>
                <div className={`ftag ${filters.premium ? 'on' : ''}`} onClick={() => setFilters({ ...filters, premium: !filters.premium })}>👑 Premium</div>
                <div className={`ftag ${filters.open ? 'on' : ''}`} onClick={() => setFilters({ ...filters, open: !filters.open })}>🟢 Open now</div>
              </div>

              <div className="cat-chips">
                <button className={`chip ${selectedCategory === '' ? 'on' : ''}`} onClick={() => setSelectedCategory('')}>All Niches</button>
                {[...new Set(shops.map(s => s.category))].map(cat => (
                  <button className={`chip ${selectedCategory === cat ? 'on' : ''}`} key={cat as string} onClick={() => setSelectedCategory(cat as string)}>{(cat as string).replace(/^\S+\s/, '')}</button>
                ))}
              </div>

              <button className="btn-reset" onClick={handleResetAllFilters}>Reset Filter parameters</button>
            </div>

            <div className="shop-grid">
              {filteredShopsList.length === 0 ? (
                <div className="empty">
                  <div className="empty-ic">🏪</div>
                  <h3>No directories matches filters</h3>
                  <p>Restore default states or adjust your filter cards.</p>
                </div>
              ) : (
                filteredShopsList.map(s => {
                  const verified = s.plan >= 99;
                  const open = isShopOpenNow(s);
                  const storeItems = items.filter(it => it.shopRef === s.id && it.status === 'active');
                  const starred = favs.includes(s.id);
                  const rat = getShopRatingAverage(s.id);
                  return (
                    <div className={`shop-card ${s.plan >= 299 ? 'prem' : ''}`} key={s.id}>
                      {s.plan >= 299 && <div className="prem-badge">👑 PREMIUM</div>}
                      <button className={`fav-btn ${starred ? 'on' : ''}`} onClick={() => { handleSetSearchAndLog(''); handleToggleStarFavorite(s.id); }}>
                        {starred ? '❤️' : '🤍'}
                      </button>
                      <div className="shop-img" onClick={() => { setActiveShopDetail(s); setShowShopDetailModal(true); }}>
                        <img src={s.img || "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=200&fit=crop"} alt="" />
                        <div className={`open-pill ${open ? 'open' : 'closed'}`}>{open ? '🟢 Open Now' : '🔴 Closed'}</div>
                      </div>
                      <div className="shop-body">
                        <h3 onClick={() => { setActiveShopDetail(s); setShowShopDetailModal(true); }}>{s.name}</h3>
                        <div className="shop-info">
                          <span>📍 {s.category}</span>·<span>🏘️ {s.area}</span>
                        </div>
                        <div className="rat-row">
                          <span className="stars">{renderStarsString(rat)}</span>
                          <span className="rat-txt">
                            {rat > 0 ? `${rat} (${getShopReviewsCount(s.id)} reviews)` : 'No reviews'}
                          </span>
                        </div>
                        {s.description && <p className="shop-desc">{s.description}</p>}
                        <div className="shop-acts">
                          <button className="btn btn-wa" onClick={() => window.open(`https://wa.me/91${s.phone}`, '_blank')}>💬 WhatsApp</button>
                          <button className="btn btn-call" onClick={() => window.location.href = `tel:+91${s.phone}`}>📞 Call</button>
                          {storeItems.length > 0 && (
                            <button className="btn btn-prods" onClick={() => { setSelectedShopId(s.id); setCurrentView('shop'); }}>
                              🛍️ Explore Catalog ({storeItems.length} items) →
                            </button>
                          )}
                          {settings.enableChat && (
                            <button className="btn btn-chat animate-pulse" onClick={(e) => handleOpenShopperChat(s.id, s.name, e)}>💬 Direct messaging</button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* --- FAVORITE WISHLISTS VIEW (v-wishlist) --- */}
      <AnimatePresence mode="wait">
        {currentView === 'wishlist' && (
          <motion.div
            key="wishlist"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="view on"
          >
          <div className="sec">
            <div className="sec-hd">
              <h2 className="sec-title">❤️ My Saved Wishlist</h2>
              <p className="sec-sub">Products you are holding to purchase later</p>
            </div>

            <div className="prod-grid">
              {wish.length === 0 ? (
                <p style={{ color: '#999', textAlign: 'center', gridColumn: '1/-1', margin: '40px' }}>Your heart list is clear.</p>
              ) : (
                items.filter(it => wish.includes(it.id) && it.status === 'active').map(it => (
                  <div className="prod-card" key={it.id} onClick={() => { setActiveProductDetail(it); setShowProductDetailModal(true); }}>
                    <div className="prod-img-wrap">
                      {it.img ? <img src={it.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : it.emoji}
                    </div>
                    <div className="prod-body">
                      <div className="prod-name">{it.name}</div>
                      <div className="prod-shop-nm">{it.shopName}</div>
                      <div className="prod-price">₹{it.price}</div>
                      <div className="prod-row" style={{ marginTop: '8px' }}>
                        <button className="btn-add" onClick={(e) => { e.stopPropagation(); handleAddToCart(it); }}>🛒 Add to Cart</button>
                        <button className="wl-btn" onClick={(e) => handleToggleProductWishlist(it.id, e)}>❤️</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* --- CATALOG EXPAND VIEW (v-shop) --- */}
      <AnimatePresence mode="wait">
        {currentView === 'shop' && selectedShopId && (
          <motion.div
            key="shop"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="view on"
          >
          <div className="sec">
            <button className="btn-cancel mb-4" onClick={() => setCurrentView('market')}>← Back to Stores</button>
            
            {(() => {
              const shop = shops.find(s => s.id === selectedShopId);
              if (!shop) return null;
              const storeItems = items.filter(it => it.shopRef === selectedShopId && it.status === 'active');
              return (
                <div className="animate-fadeIn">
                  <div style={{ background: '#fff', borderRadius: '18px', padding: '16px', boxShadow: 'var(--sm)', marginBottom: '15px' }}>
                    <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <img src={shop.img || "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=400&fit=crop"} alt="" style={{ width: '56px', height: '56px', borderRadius: '14px', objectFit: 'cover' }} />
                      <div>
                        <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>{shop.name}</h2>
                        <span style={{ fontSize: '12px', color: '#666' }}>📍 {shop.category} · {shop.area}</span>
                        {shop.minOrder > 0 && <p style={{ fontSize: '10px', color: 'var(--danger)', fontWeight: 'bold', marginTop: '2px' }}>⚠️ Store Minimum Order: ₹{shop.minOrder}</p>}
                      </div>
                    </div>
                  </div>

                  <div className="prod-grid">
                    {storeItems.map(it => {
                      const isLiked = wish.includes(it.id);
                      const isOos = it.id % 5 === 0;
                      return (
                        <div className={`prod-card ${isOos ? 'opacity-70' : ''}`} key={it.id} onClick={() => { setActiveProductDetail(it); setShowProductDetailModal(true); }} style={{ position: 'relative' }}>
                          {isOos && (
                            <span style={{ position: 'absolute', top: '8px', right: '8px', background: '#ef4444', color: '#fff', fontSize: '9px', fontWeight: 800, padding: '3px 8px', borderRadius: '12px', zIndex: 5 }}>SOLD OUT</span>
                          )}
                          <div className="prod-img-wrap">
                            {it.img ? <img src={it.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" /> : it.emoji}
                          </div>
                          <div className="prod-body">
                            <div className="prod-name" style={{ fontWeight: 700 }}>{it.name}</div>
                            <div className="prod-price">₹{it.price}</div>
                            <div className="prod-row" style={{ marginTop: '8px' }}>
                              <button 
                                className="btn-add" 
                                disabled={isOos} 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  if (isOos) return;
                                  handleAddToCart(it); 
                                }}
                                style={{ background: isOos ? '#bbb' : 'var(--p)' }}
                              >
                                {isOos ? 'OOS' : '🛒 Add'}
                              </button>
                              <button className="wl-btn" onClick={(e) => handleToggleProductWishlist(it.id, e)}>{isLiked ? '❤️' : '🤍'}</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- SELLER PORTAL DASHBOARD (v-owner) --- */}
      <AnimatePresence mode="wait">
        {currentView === 'owner' && sess && (
          <motion.div
            key="owner"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="view on"
          >
          <div className="sec">
            <OwnerDashboard
              session={sess}
              onLogout={() => { setSess(null); StorageEngine.save('sess', null); setCurrentView('home'); }}
              shops={shops}
              setShops={setShops}
              items={items}
              setItems={setItems}
              orders={orders}
              setOrders={setOrders}
              owners={owners}
              setOwners={setOwners}
              chats={chats}
              setChats={setChats}
              addLog={addLog}
              showToast={showToast}
            />
          </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- TRACKING WORKBOOK (v-orders) --- */}
      <AnimatePresence mode="wait">
        {currentView === 'orders' && (
          <motion.div
            key="orders"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="view on"
          >
          <div className="sec">
            <div className="sec-hd">
              <h2 className="sec-title">🧾 Real-time order tracking timeline</h2>
              <p className="sec-sub">Track active transactions and delivery checkpoints</p>
            </div>

            <div className="pcard">
              <div className="fg">
                <label>Type reference ID or your Phone number</label>
                <input placeholder="e.g. ORD26... or 98765..." value={trackQuery} onChange={e => {
                  const val = e.target.value.trim().toLowerCase();
                  setTrackQuery(e.target.value);
                  const matched = orders.find(o => 
                    o.id.toLowerCase() === val || 
                    (o.customer.phone && o.customer.phone.replace(/[\s\-+]/g, '').includes(val.replace(/[\s\-+]/g, '')))
                  );
                  if (matched) {
                    setTrackedOrderEntity(matched);
                  } else {
                    setTrackedOrderEntity(null);
                  }
                }} />
              </div>
            </div>

            {trackedOrderEntity ? (
              <div className="pcard animate-scaleUp max-w-xl mx-auto shadow-md">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
                  <span className="text-[10px] font-extrabold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 py-1 px-3 rounded-full uppercase tracking-wider">
                    🧾 REFERENCE ID: {trackedOrderEntity.id}
                  </span>
                  <h4 className="text-base font-extrabold text-slate-800 dark:text-slate-100 mt-2">Recipient: {trackedOrderEntity.customer.name}</h4>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1">
                    <span>📍 Destination Address:</span>
                    <strong className="text-slate-600 dark:text-slate-300 font-medium">{trackedOrderEntity.customer.address}</strong>
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">Placed: {trackedOrderEntity.date}</p>
                </div>

                <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl mb-5">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Invoice Valuation</span>
                  <strong className="text-lg font-black text-indigo-600 dark:text-indigo-400">₹{trackedOrderEntity.total}</strong>
                </div>

                <div className="relative pl-8 space-y-6">
                  {/* Connecting line */}
                  <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-200 dark:bg-slate-700"></div>

                  {(() => {
                    const stages = [
                      { code: 'pending', label: 'Order Registered', desc: 'Awaiting merchant acceptance', icon: '📝' },
                      { code: 'confirmed', label: 'Accepted & Synced', desc: 'Merchant acknowledged receipt', icon: '👍' },
                      { code: 'preparing', label: 'In Preparation', desc: 'Items are being assembled/cooked', icon: '🍳' },
                      { code: 'out_for_delivery', label: 'Out for Dispatch', desc: 'Entrusted with our logistics fleet', icon: '🛵' },
                      { code: 'delivered', label: 'Consignment Handover', desc: 'Securely received by client', icon: '🎉' }
                    ];

                    const curIdx = ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'].indexOf(trackedOrderEntity.status);
                    
                    return stages.map((st, idx) => {
                      const timelineRecord = trackedOrderEntity.timeline.find(t => t.status === st.code);
                      const isCompleted = curIdx >= idx && trackedOrderEntity.status !== 'cancelled';
                      const isActive = trackedOrderEntity.status === st.code;

                      return (
                        <div className="relative" key={st.code}>
                          {/* Circle Dot Marker */}
                          <div className={`absolute -left-8 top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                            isCompleted 
                              ? 'bg-indigo-600 text-white shadow-sm scale-110 z-10' 
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-400 z-10'
                          }`}>
                            {isCompleted ? '✓' : idx + 1}
                          </div>

                          {/* Detail text */}
                          <div>
                            <div className="flex gap-2 items-center">
                              <h5 className={`text-xs font-extrabold uppercase tracking-wide ${isActive ? 'text-indigo-600 dark:text-indigo-400' : isCompleted ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400'}`}>
                                {st.icon} {st.label}
                              </h5>
                              {isActive && (
                                <span className="text-[8px] font-black bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 py-0.5 px-1.5 rounded-full animate-pulse">
                                  ACTIVE
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{st.desc}</p>
                            {timelineRecord && (
                              <span className="inline-block mt-1 text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 py-0.5 px-1.5 rounded">
                                📅 {timelineRecord.time}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}

                  {trackedOrderEntity.status === 'cancelled' && (
                    <div className="p-3 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold flex items-center gap-2">
                      <span>⚠️</span>
                      <span>Order has been withdrawn or cancelled by merchant/delivery fleet.</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="empty">
                <div className="empty-ic">📭</div>
                <h3>Order tracker vacant</h3>
                <p>Please type corresponding reference or match logs.</p>
              </div>
            )}
          </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODALS GATEWAY INTERACTION DRAWERS */}

      {/* 1. Quick register store (mAddStore) */}
      <AnimatePresence>
        {showAddStoreModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overlay show"
            style={{ display: 'flex' }}
            onClick={() => setShowAddStoreModal(false)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 15 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="modal-box pcard"
              onClick={e => e.stopPropagation()}
              style={{ height: 'auto', overflowY: 'auto' }}
            >
              <div className="m-hd"><h3>➕ Quick Register Store Profile</h3><button className="m-close" onClick={() => setShowAddStoreModal(false)}>×</button></div>
              <p style={{ background: '#fef3c7', padding: '10px', fontSize: '11px', borderRadius: '8px', color: '#78350f', marginBottom: '10px' }}>
                💡 Quick Listing — Registrations requires matching claim dashboards later.
              </p>
              <div className="fg"><label>Store Name *</label><input value={qName} onChange={e => setQName(e.target.value)} /></div>
              <div className="fg">
                <label>Niche Category *</label>
                <select value={qCat} onChange={e => setQCat(e.target.value)}>
                  <option value="">Select Category...</option>
                  <option>🩺 Medical & Pharmacy</option>
                  <option>🛒 Grocery & Supermarket</option>
                  <option>🍱 Tiffin & Food Service</option>
                  <option>📱 Mobile & Electronics</option>
                  <option>👗 Fashion & Clothing</option>
                </select>
              </div>
              <div className="fg"><label>Representative Phone / WhatsApp *</label><input value={qPhone} onChange={e => setQPhone(e.target.value)} /></div>
              <div className="fg"><label>Vidisha Area *</label><input value={qArea} onChange={e => setQArea(e.target.value)} /></div>
              <div className="fg"><label>Brief description</label><textarea value={qDesc} onChange={e => setQDesc(e.target.value)} /></div>
              <div className="fg">
                <label>Select Cover File</label>
                <input type="file" accept="image/*" onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (evt) => setQImgBase64(evt.target?.result as string);
                    reader.readAsDataURL(file);
                  }
                }} />
              </div>
              <button className="btn-main font-bold" onClick={handleSubmitQuickStore}>🚀 Submit store directory</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Star Review Drawer (mRev) */}
      <AnimatePresence>
        {showReviewsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overlay show"
            style={{ display: 'flex' }}
            onClick={() => setShowReviewsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 15 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="modal-box pcard-title"
              onClick={e => e.stopPropagation()}
              style={{ background: '#fff', borderRadius: '18px', padding: '18px' }}
            >
              <div className="m-hd"><h3>⭐ Store feedback scores</h3><button className="m-close" onClick={() => setShowReviewsModal(false)}>×</button></div>
              
              {(() => {
                const rArray = reviews[reviewShopId] || [];
                const average = getShopRatingAverage(reviewShopId);
                return (
                  <div>
                    <div className="rev-sum animate-fadeIn" style={{ background: '#fafafa', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>
                      <div className="rs-big">{average > 0 ? average : '—'}</div>
                      <div style={{ fontSize: '11px', color: '#666' }}>({rArray.length} customer feedback scores)</div>
                    </div>
                    <button className="btn-main mb-4" onClick={() => setShowWriteReviewModal(true)}>✍️ Author feedback reviews</button>
                    <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                      {rArray.length === 0 ? (
                        <p style={{ color: '#999', fontSize: '12px', textAlign: 'center' }}>Vacant feedback channels currently.</p>
                      ) : (
                        rArray.map(r => (
                          <div className="rev-item" key={r.id}>
                            <div className="rev-hd"><span className="rev-usr">{r.name}</span><span className="rev-dt">{r.date}</span></div>
                            <div className="rev-stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
                            <div className="rev-txt">"{r.text}"</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Write feedback overlays (mWriteRev) */}
      <AnimatePresence>
        {showWriteReviewModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overlay show"
            style={{ display: 'flex' }}
            onClick={() => setShowWriteReviewModal(false)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 15 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="modal-box pcard"
              onClick={e => e.stopPropagation()}
            >
              <div className="m-hd"><h3>✍️ Author review</h3><button className="m-close" onClick={() => setShowWriteReviewModal(false)}>×</button></div>
              <div className="fg"><label>Your Name *</label><input value={writeRevName} onChange={e => setWriteRevName(e.target.value)} /></div>
              <div className="fg">
                <label>Select Stars *</label>
                <div className="star-picker">
                  {[1, 2, 3, 4, 5].map(idx => (
                    <span className={`star-pick ${writeRevRating >= idx ? 'on' : ''}`} key={idx} onClick={() => setWriteRevRating(idx)}>★</span>
                  ))}
                </div>
              </div>
              <div className="fg"><label>Detailed Feedback *</label><textarea rows={3} value={writeRevText} onChange={e => setWriteRevText(e.target.value)} /></div>
              <button className="btn-main font-bold" onClick={handleSubmitReview}>Submit feedback</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Favorite shop lists (mFavs) */}
      <AnimatePresence>
        {showFavoritesModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overlay show"
            style={{ display: 'flex' }}
            onClick={() => setShowFavoritesModal(false)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 15 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="modal-box pcard"
              onClick={e => e.stopPropagation()}
            >
              <div className="m-hd"><h3>⭐ Favorites Stores</h3><button className="m-close" onClick={() => setShowFavoritesModal(false)}>×</button></div>
              <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                {favs.length === 0 ? (
                  <p style={{ color: '#999', fontSize: '12px', textAlign: 'center' }}>No saved star favorites stores.</p>
                ) : (
                  favs.map(fid => {
                    const s = shops.find(sh => sh.id === fid);
                    if (!s) return null;
                    return (
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #eee' }} key={fid}>
                        <span>🏪 {s.name} ({s.area})</span>
                        <button className="btn-del" onClick={() => handleToggleStarFavorite(fid)} style={{ padding: '2px 8px' }}>Remove</button>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. Detailed Shop drawer (mShopDet) */}
      <AnimatePresence>
        {showShopDetailModal && activeShopDetail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overlay show"
            style={{ display: 'flex' }}
            onClick={() => setShowShopDetailModal(false)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 15 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="modal-box pcard max-w-lg mx-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="m-hd">
                <h3>🏪 {activeShopDetail.name}</h3>
                <button className="m-close" onClick={() => setShowShopDetailModal(false)}>×</button>
              </div>
              
              <img 
                src={activeShopDetail.img} 
                style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '16px' }} 
                alt="" 
              />

              {/* Quick specifications grid */}
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                  <span className="text-xl">📍</span>
                  <h4 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-1">Niche</h4>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate mt-0.5">{activeShopDetail.category}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                  <span className="text-xl">🏘️</span>
                  <h4 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-1">Area</h4>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate mt-0.5">{activeShopDetail.area}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                  <span className="text-xl">📞</span>
                  <h4 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-1">Contact</h4>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate mt-0.5">{activeShopDetail.phone}</p>
                </div>
              </div>

              {/* Detailed aggregate reviews distribution chart */}
              <div className="mt-5 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">⭐ Consumer Trust metrics</h4>
                
                <div className="flex gap-6 items-center flex-wrap sm:flex-nowrap">
                  {/* Average Left Pane */}
                  <div className="text-center sm:border-r border-slate-200/60 dark:border-slate-700/60 sm:pr-6 sm:py-3 flex-shrink-0 mx-auto sm:mx-0">
                    <div className="text-4xl font-extrabold text-slate-800 dark:text-slate-100">
                      {getShopRatingAverage(activeShopDetail.id) || 4.5}
                    </div>
                    <div className="text-amber-400 text-base my-1">
                      {renderStarsString(getShopRatingAverage(activeShopDetail.id) || 4.5)}
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium">
                      Based on {getShopReviewsCount(activeShopDetail.id) || 8} feedbacks
                    </div>
                  </div>

                  {/* Bars Right Pane */}
                  <div className="flex-1 w-full space-y-1.5">
                    {(() => {
                      const pctList = (() => {
                        const shopReviews = reviews[activeShopDetail.id] || [];
                        const counts = [0, 0, 0, 0, 0];
                        if (shopReviews.length > 0) {
                          shopReviews.forEach(r => {
                            const index = Math.min(Math.max(Math.floor(r.rating) - 1, 0), 4);
                            counts[index]++;
                          });
                          return counts.reverse().map(c => Math.round((c / shopReviews.length) * 100)); // 5-star to 1-star
                        }
                        // Elegant default curve for default shops
                        const curve: Record<string, number[]> = {
                          "SHP_SDR_MED": [75, 15, 5, 3, 2],
                          "SHP_NEH_SUP": [70, 20, 7, 2, 1],
                          "SHP_CIV_TIF": [60, 24, 10, 4, 2],
                          "SHP_SHN_ELE": [65, 18, 10, 5, 2]
                        };
                        return curve[activeShopDetail.id] || [65, 20, 10, 3, 2];
                      })();

                      return [5, 4, 3, 2, 1].map((stars, idx) => {
                        const percent = pctList[idx] || 0;
                        return (
                          <div className="flex items-center gap-2 text-xs" key={stars}>
                            <span className="w-10 font-medium text-slate-500 text-right">{stars} Star</span>
                            <div className="flex-1 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                              <div 
                                className="bg-amber-400 h-full rounded-full transition-all duration-500" 
                                style={{ width: `${percent}%` }}
                              ></div>
                            </div>
                            <span className="w-8 text-right font-bold text-slate-600 dark:text-slate-400">{percent}%</span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>

              <button 
                className="btn-main font-bold mt-5 w-full hover:shadow-indigo-100 transition duration-350" 
                onClick={() => { 
                  setSelectedShopId(activeShopDetail.id); 
                  setCurrentView('shop'); 
                  setShowShopDetailModal(false); 
                }}
              >
                🛍️ {translate("Explore Catalog Menu & Shop Direct", "कैटलॉग सूची लोड करें और खरीदें")}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. Product Detail Drawer */}
      <AnimatePresence>
        {showProductDetailModal && activeProductDetail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overlay show"
            style={{ display: 'flex' }}
            onClick={() => setShowProductDetailModal(false)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 15 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="modal-box pcard"
              onClick={e => e.stopPropagation()}
              style={{ maxWidth: '650px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}
            >
              <div className="m-hd">
                <h3>📦 Product Catalog Details</h3>
                <button className="m-close" onClick={() => setShowProductDetailModal(false)}>×</button>
              </div>

              {/* Grid split for visuals & text specs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '10px' }}>
                
                {/* Visuals Gallery */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ background: '#f5f7fa', padding: '10px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '220px', overflow: 'hidden' }}>
                    {activeProductDetail.img ? (
                      <img src={activeImgIndex === 0 ? activeProductDetail.img : activeImgIndex === 1 ? `https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop` : `https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }} alt="" referrerPolicy="no-referrer" />
                    ) : (
                      <span style={{ fontSize: '5rem' }}>{activeProductDetail.emoji}</span>
                    )}
                  </div>
                  {activeProductDetail.img && (
                    <div className="img-thumb-gallery" style={{ marginTop: '10px' }}>
                      <img src={activeProductDetail.img} className={`img-thumb ${activeImgIndex === 0 ? 'active' : ''}`} onClick={() => setActiveImgIndex(0)} referrerPolicy="no-referrer" />
                      <img src={`https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100&auto=format&fit=crop`} className={`img-thumb ${activeImgIndex === 1 ? 'active' : ''}`} onClick={() => setActiveImgIndex(1)} referrerPolicy="no-referrer" />
                      <img src={`https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100&auto=format&fit=crop`} className={`img-thumb ${activeImgIndex === 2 ? 'active' : ''}`} onClick={() => setActiveImgIndex(2)} referrerPolicy="no-referrer" />
                    </div>
                  )}
                </div>

                {/* Specs / Controls */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h4 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--dark)' }}>{activeProductDetail.name}</h4>
                    <p style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>Verified Store: <strong style={{ color: 'var(--p)' }}>{activeProductDetail.shopName}</strong></p>
                    
                    {/* Stock Status Badge */}
                    <div style={{ marginTop: '8px' }}>
                      {activeProductDetail.id % 5 === 0 ? (
                        <span className="stock-badge stock-oos">⚠️ Temporarily Out of Stock</span>
                      ) : activeProductDetail.id % 3 === 0 ? (
                        <span className="stock-badge stock-lowstock">🔥 Only 2 items left in stock</span>
                      ) : (
                        <span className="stock-badge stock-instock">✅ Ready In Stock (Immediate Shipping)</span>
                      )}
                    </div>

                    <div style={{ marginTop: '12px', display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                      <span style={{ fontSize: '26px', fontWeight: 800, color: 'var(--p)' }}>₹{activeProductDetail.price}</span>
                      <span style={{ fontSize: '14px', color: '#999', textDecoration: 'line-through' }}>₹{activeProductDetail.orgPrice || Math.round(activeProductDetail.price * 1.4)}</span>
                    </div>

                    {activeProductDetail.desc && (
                      <p style={{ fontSize: '12.5px', color: '#555', marginTop: '10px', lineHeight: '1.5' }}>{activeProductDetail.desc}</p>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '15px' }}>
                    <button 
                      className={`btn-green ${activeProductDetail.id % 5 === 0 ? 'opacity-50 cursor-not-allowed' : ''}`} 
                      disabled={activeProductDetail.id % 5 === 0}
                      onClick={() => { 
                        if (activeProductDetail.id % 5 === 0) return;
                        handleAddToCart(activeProductDetail); 
                        setShowProductDetailModal(false); 
                      }}
                      style={{ flex: 1 }}
                    >
                      🛒 {activeProductDetail.id % 5 === 0 ? 'Sold Out' : 'Direct add to cart'}
                    </button>
                    <button className="btn-cancel" onClick={() => setShowProductDetailModal(false)}>Close</button>
                  </div>
                </div>

              </div>

              {/* Interactive Reviews Section */}
              <div style={{ marginTop: '25px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 800, borderBottom: '1px solid #f1f1f1', paddingBottom: '6px', color: 'var(--dark)' }}>🏆 Product Community Reviews</h4>
                
                {/* Show existing reviews */}
                <div style={{ maxHeight: '180px', overflowY: 'auto', margin: '10px 0', paddingRight: '5px' }}>
                  {(!reviews[activeProductDetail.id] || reviews[activeProductDetail.id].length === 0) ? (
                    <p style={{ color: '#999', fontSize: '12px', fontStyle: 'italic' }}>No reviews posted yet. Be the first to express feedback!</p>
                  ) : (
                    reviews[activeProductDetail.id].map((rev: any, index: number) => (
                      <div key={index} style={{ padding: '8px', borderBottom: '1px solid #f9f9f9', background: '#fafbfc', borderRadius: '8px', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', fontWeight: 'bold' }}>👤 {rev.userName || 'Anonymous Buyer'}</span>
                          <span style={{ color: '#f59e0b', fontSize: '11px' }}>{'★'.repeat(rev.stars || 5)}</span>
                        </div>
                        <p style={{ fontSize: '12px', color: '#555', marginTop: '3px' }}>{rev.comment}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Submit new review form */}
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const starsInput = form.elements.namedItem('reviewStars') as HTMLSelectElement;
                    const commentInput = form.elements.namedItem('reviewComment') as HTMLTextAreaElement;
                    const authorInput = form.elements.namedItem('reviewAuthor') as HTMLInputElement;

                    const starsVal = parseInt(starsInput.value) || 5;
                    const commentVal = commentInput.value;
                    const authorVal = authorInput.value || 'Local Shopper';

                    if (!commentVal) return showToast('Please type your comment', 'warn');

                    const newReview = {
                      id: `${activeProductDetail.id}-${Date.now()}`,
                      productId: activeProductDetail.id,
                      userName: authorVal,
                      stars: starsVal,
                      comment: commentVal,
                      timestamp: new Date().toISOString()
                    };

                    // Update reviews dictionary locally
                    const currentProductReviews = reviews[activeProductDetail.id] || [];
                    const updatedReviews = {
                      ...reviews,
                      [activeProductDetail.id]: [newReview, ...currentProductReviews]
                    };
                    setReviews(updatedReviews);
                    StorageEngine.save('reviews', updatedReviews);

                    // Sync to Express Backend `/api/reviews`
                    fetch('/api/reviews', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(newReview)
                    }).catch(err => console.warn('Sync review backend error:', err));

                    showToast('Thank you! Review saved & published.', 'success');
                    form.reset();
                  }}
                  style={{ background: 'var(--card)', border: '1px solid var(--border)', padding: '12px', borderRadius: '14px', marginTop: '12px' }}
                >
                  <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>📝 Write a Product Review</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="fg" style={{ margin: 0 }}>
                      <label>Name</label>
                      <input name="reviewAuthor" placeholder="Guest buyer" style={{ padding: '4px 8px', fontSize: '12px' }} />
                    </div>
                    <div className="fg" style={{ margin: 0 }}>
                      <label>Rating</label>
                      <select name="reviewStars" style={{ padding: '4px 8px', fontSize: '12px' }} defaultValue="5">
                        <option value="5">★★★★★ (5 Stars)</option>
                        <option value="4">★★★★☆ (4 Stars)</option>
                        <option value="3">★★★☆☆ (3 Stars)</option>
                        <option value="2">★★☆☆☆ (2 Stars)</option>
                        <option value="1">★☆☆☆☆ (1 Star)</option>
                      </select>
                    </div>
                  </div>
                  <div className="fg" style={{ margin: '8px 0 0 0' }}>
                    <label>Review Comment *</label>
                    <textarea name="reviewComment" rows={2} required placeholder="Tell us about the quality, flavor or fit..." style={{ padding: '6px 8px', fontSize: '12px', resize: 'none' }} />
                  </div>
                  <button className="btn-main" type="submit" style={{ marginTop: '8px', padding: '6px 14px', fontSize: '11px' }}>📄 Publish Review</button>
                </form>
              </div>

              {/* Related Products Section */}
              <div style={{ marginTop: '25px', paddingTop: '15px', borderTop: '1px solid var(--border)' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', color: '#666', borderBottom: '1px solid #f1f1f1', paddingBottom: '6px' }}>Related Offerings</h4>
                <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', padding: '10px 0' }}>
                  {items.filter(it => it.category === activeProductDetail.category && it.id !== activeProductDetail.id && it.status === 'active').slice(0, 5).map(it => (
                    <div key={it.id} onClick={() => { setActiveProductDetail(it); }} style={{ flex: '0 0 120px', border: '1px solid var(--border)', borderRadius: '12px', padding: '6px', background: 'var(--card)', cursor: 'pointer', textAlign: 'center', flexShrink: 0 }}>
                      <div style={{ height: '70px', background: '#f5f7fa', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', overflow: 'hidden' }}>
                        {it.img ? <img src={it.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" /> : <span style={{ fontSize: '1.8rem' }}>{it.emoji}</span>}
                      </div>
                      <div style={{ fontSize: '10px', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '4px' }}>{it.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--p)', fontWeight: 'bold' }}>₹{it.price}</div>
                    </div>
                  ))}
                </div>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 7. Shopping Cart modal (mCart) */}
      <AnimatePresence>
        {showCartModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overlay show"
            style={{ display: 'flex' }}
            onClick={() => setShowCartModal(false)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 15 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="modal-box pcard"
              onClick={e => e.stopPropagation()}
            >
              <div className="m-hd"><h3>🛒 Shopping Cart Basket</h3><button className="m-close" onClick={() => setShowCartModal(false)}>×</button></div>
              
              {cart.length === 0 ? (
                <p style={{ color: '#999', textAlign: 'center', margin: '40px' }}>Your shopping cart basket is clear.</p>
              ) : (
                <div>
                  {cart.map(c => {
                    const shop = shops.find(s => s.id === c.shopRef);
                    return (
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eee' }} key={c.id}>
                        <div>
                          <strong style={{ fontSize: '12px' }}>{c.name}</strong>
                          <div style={{ fontSize: '10px', color: '#666' }}>Store: {shop ? shop.name : ''}</div>
                          <div style={{ fontSize: '11px', color: 'var(--p)', fontWeight: 'bold' }}>₹{c.price} x {c.qty} = ₹{c.price * c.qty}</div>
                        </div>
                        <div className="qty-ctrl">
                          <button className="qty-b" onClick={() => handleUpdateCartQuantity(c.id, -1)}>−</button>
                          <span className="qty-n">{c.qty}</span>
                          <button className="qty-b" onClick={() => handleUpdateCartQuantity(c.id, 1)}>+</button>
                        </div>
                      </div>
                    );
                  })}

                  <div className="cart-foot mt-4">
                    <div className="coup-row">
                      <input className="coup-in" placeholder="promotional coupon code" value={applyCouponStr} onChange={e => setApplyCouponStr(e.target.value)} />
                      <button className="btn-apply" onClick={handleApplyCoupon}>Apply</button>
                    </div>
                    {couponStatusText && <p style={{ color: couponStatusColor, fontSize: '11px', fontWeight: 'bold' }}>{couponStatusText}</p>}
                    
                    <div className="tot-row mt-2" style={{ fontSize: '13px' }}><span>Gross Items Value</span><strong>₹{totals.subtotal}</strong></div>
                    {totals.discount > 0 && <div className="tot-row" style={{ fontSize: '13px', color: 'green' }}><span>Coupon Promo Deductions</span><strong>-₹{totals.discount}</strong></div>}
                    {totals.tax > 0 && <div className="tot-row" style={{ fontSize: '12px', color: '#666' }}><span>Dynamic Tax ({settings.taxRate}%)</span><strong>₹{totals.tax}</strong></div>}
                    {totals.delivery > 0 && <div className="tot-row" style={{ fontSize: '12px', color: '#666' }}><span>Flat Delivery Fees Charged</span><strong>₹{totals.delivery}</strong></div>}
                    <div className="tot-row font-bold" style={{ fontSize: '18px', borderTop: '1px dashed #ccc', paddingTop: '6px', marginTop: '6px' }}>
                      <span>Grand Payable Amount</span>
                      <span className="grand-tot">₹{totals.total}</span>
                    </div>

                    <button className="btn-checkout font-bold mt-4" onClick={handleProposeCheckout}>Proceed to checkout →</button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 8. Checkout Form Modals */}
      <AnimatePresence>
        {showCheckoutModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overlay show"
            style={{ display: 'flex' }}
            onClick={() => setShowCheckoutModal(false)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 15 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="modal-box pcard"
              onClick={e => e.stopPropagation()}
            >
              <div className="m-hd"><h3> Checkout Invoice formulation</h3><button className="m-close" onClick={() => setShowCheckoutModal(false)}>×</button></div>
              <div className="co-steps">
                <div className={`co-step ${checkoutStep === 1 ? 'active': ''}`}>Step 1: Details</div>
                <div className={`co-step ${checkoutStep === 2 ? 'active': ''}`}>Step 2: Audit</div>
                <div className={`co-step ${checkoutStep === 3 ? 'activeDone': ''}`}>Step 3: Print</div>
              </div>

              {checkoutStep === 1 && (
                <div className="animate-fadeIn">
                  <div className="fg"><label>Full Name *</label><input placeholder="e.g. Ramesh Sahu" value={coName} onChange={e => setCoName(e.target.value)} /></div>
                  <div className="fg"><label>Active Mobile Phone *</label><input placeholder="e.g. 98765..." value={coPhone} onChange={e => setCoPhone(e.target.value)} /></div>
                  <div className="fg"><label>Shipping address *</label><textarea rows={3} placeholder="Sadar Bazaar, Ward 12, Vidisha MP..." value={coAddr} onChange={e => setCoAddr(e.target.value)} /></div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="fg"><label>Postal code (Vidisha)</label><input placeholder="464001" value={coPin} onChange={e => setCoPin(e.target.value)} /></div>
                    <div className="fg"><label>Driver Notes</label><input placeholder="Leave with neighbor..." value={coNotes} onChange={e => setCoNotes(e.target.value)} /></div>
                  </div>
                  
                  <div className="fg mt-3 mb-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-2">Select Protected Payment Mode / भुगतान विधियां</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div 
                        className={`p-3 rounded-xl border-2 cursor-pointer transition flex flex-col items-center justify-center text-center ${coPayM === 'upi' ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200'}`}
                        onClick={() => setCoPayM('upi')}
                      >
                        <span className="text-xl mb-1">📱</span>
                        <strong className="text-xs block text-slate-800 dark:text-slate-200">UPI Instant</strong>
                        <span className="text-[9px] text-slate-400 mt-0.5">Scan GPay QR</span>
                      </div>

                      <div 
                        className={`p-3 rounded-xl border-2 cursor-pointer transition flex flex-col items-center justify-center text-center ${coPayM === 'card' ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200'}`}
                        onClick={() => setCoPayM('card')}
                      >
                        <span className="text-xl mb-1">💳</span>
                        <strong className="text-xs block text-slate-800 dark:text-slate-200">Credit Card</strong>
                        <span className="text-[9px] text-slate-400 mt-0.5">Secure gateway checkout</span>
                      </div>

                      <div 
                        className={`p-3 rounded-xl border-2 cursor-pointer transition flex flex-col items-center justify-center text-center ${coPayM === 'cod' ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200'}`}
                        onClick={() => setCoPayM('cod')}
                      >
                        <span className="text-xl mb-1">💵</span>
                        <strong className="text-xs block text-slate-800 dark:text-slate-200">Cash on Delivery</strong>
                        <span className="text-[9px] text-slate-400 mt-0.5">Pay after receiving</span>
                      </div>

                      <div 
                        className={`p-3 rounded-xl border-2 cursor-pointer transition flex flex-col items-center justify-center text-center ${coPayM === 'whatsapp' ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200'}`}
                        onClick={() => setCoPayM('whatsapp')}
                      >
                        <span className="text-xl mb-1">💬</span>
                        <strong className="text-xs block text-slate-800 dark:text-slate-200">WhatsApp</strong>
                        <span className="text-[9px] text-slate-400 mt-0.5">Confirm with merchant</span>
                      </div>
                    </div>
                  </div>

                  <button className="btn-main font-bold mt-4" onClick={() => {
                    if (!coName || !coPhone || !coAddr) return showToast('Complete required details fields', 'error');
                    setCheckoutStep(2);
                  }}>Audit order parameters →</button>
                </div>
              )}

              {checkoutStep === 2 && (
                <div className="animate-fadeIn">
                  <div style={{ background: '#f5f7fa', padding: '12px', borderRadius: '10px', marginBottom: '15px' }} className="dark:bg-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-700">
                    <h4 className="font-bold mb-1">👤 Customer: {coName}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">📞 Phone: {coPhone}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">📍 Address: {coAddr}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">💳 Payment Mode: <span className="font-bold text-indigo-600 dark:text-indigo-400">{coPayM.toUpperCase()}</span></p>
                  </div>

                  {/* Simulated Interactive UPI QR code scanner box */}
                  {coPayM === 'upi' && (
                    <div className="mb-5 p-4 border border-indigo-100 dark:border-slate-800 bg-indigo-50/40 dark:bg-slate-900/40 rounded-2xl text-center">
                      <h5 className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 tracking-wider uppercase mb-2">📱 Instant UPI QR Checkout</h5>
                      
                      {/* Simulated High Fidelity QR Code SVG */}
                      <div className="w-40 h-40 bg-white p-2.5 rounded-xl inline-block shadow-md mx-auto relative border border-slate-150">
                        <svg viewBox="0 0 100 100" className="w-full h-full text-slate-900">
                          {/* Corner Track Finders */}
                          {/* Top Left */}
                          <path d="M5 5h15v15H5zm2 2h11v11H7zm2 2h7v7H9z" fill="currentColor" />
                          {/* Top Right */}
                          <path d="M80 5h15v15H80zm2 2h11v11H82zm2 2h7v7H84z" fill="currentColor" />
                          {/* Bottom Left */}
                          <path d="M5 80h15v15H5zm2 2h11v11H7zm2 2h7v7H9z" fill="currentColor" />
                          
                          {/* Tiny alignment marker */}
                          <path d="M78 78h6v6h-6zm1 1h4v4h-4z" fill="currentColor" />

                          {/* QR Data Noise Generator simulation blocks */}
                          <rect x="25" y="7" width="6" height="3" fill="currentColor" />
                          <rect x="35" y="5" width="3" height="8" fill="currentColor" />
                          <rect x="45" y="8" width="8" height="4" fill="currentColor" />
                          <rect x="60" y="5" width="4" height="4" fill="currentColor" />
                          <rect x="70" y="8" width="6" height="3" fill="currentColor" />

                          <rect x="25" y="16" width="4" height="6" fill="currentColor" />
                          <rect x="35" y="18" width="10" height="3" fill="currentColor" />
                          <rect x="50" y="15" width="3" height="8" fill="currentColor" />
                          <rect x="65" y="17" width="8" height="5" fill="currentColor" />

                          <rect x="7" y="25" width="12" height="4" fill="currentColor" />
                          <rect x="23" y="27" width="5" height="5" fill="currentColor" />
                          <rect x="32" y="25" width="8" height="3" fill="currentColor" />
                          <rect x="44" y="28" width="4" height="8" fill="currentColor" />
                          <rect x="55" y="25" width="15" height="4" fill="currentColor" />
                          <rect x="75" y="28" width="10" height="4" fill="currentColor" />

                          <rect x="5" y="35" width="8" height="8" fill="currentColor" />
                          <rect x="20" y="38" width="10" height="4" fill="currentColor" />
                          <rect x="35" y="35" width="4" height="12" fill="currentColor" />
                          <rect x="45" y="40" width="8" height="3" fill="currentColor" />
                          <rect x="58" y="36" width="3" height="8" fill="currentColor" />
                          <rect x="66" y="38" width="12" height="6" fill="currentColor" fillOpacity="0.8" />
                          <rect x="85" y="35" width="10" height="3" fill="currentColor" />

                          <rect x="15" y="50" width="10" height="4" fill="currentColor" />
                          <rect x="30" y="52" width="6" height="6" fill="currentColor" />
                          <rect x="42" y="50" width="12" height="3" fill="currentColor" />
                          <rect x="60" y="52" width="8" height="6" fill="currentColor" />
                          <rect x="75" y="50" width="15" height="4" fill="currentColor" />

                          <rect x="25" y="62" width="15" height="3" fill="currentColor" />
                          <rect x="45" y="60" width="4" height="8" fill="currentColor" />
                          <rect x="55" y="65" width="12" height="4" fill="currentColor" />
                          <rect x="72" y="62" width="6" height="5" fill="currentColor" />
                          <rect x="85" y="60" width="8" height="7" fill="currentColor" />

                          <rect x="25" y="75" width="6" height="8" fill="currentColor" />
                          <rect x="38" y="72" width="12" height="4" fill="currentColor" />
                          <rect x="54" y="75" width="10" height="3" fill="currentColor" />
                          <rect x="68" y="72" width="4" height="12" fill="currentColor" />

                          <rect x="25" y="88" width="12" height="4" fill="currentColor" />
                          <rect x="42" y="85" width="8" height="5" fill="currentColor" />
                          <rect x="55" y="88" width="15" height="3" fill="currentColor" />
                          
                          {/* Logo center indicator overlay */}
                          <rect x="42" y="42" width="16" height="16" rx="3" fill="#ffffff" />
                          <text x="44" y="54" fill="#4f46e5" fontSize="12" fontWeight="950">₹</text>
                        </svg>
                        {/* Pulse active dot */}
                        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                      </div>

                      <div className="mt-3 space-y-1">
                        <p className="text-xs text-slate-700 dark:text-slate-300">
                          Merchant VPA: <span className="font-extrabold text-indigo-600 dark:text-indigo-400">aaraddixit@okaxis</span>
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 max-w-xs mx-auto">
                          Scan with your UPI App (GPay, PhonePe, Paytm) to make direct payment of <strong className="text-slate-800 dark:text-slate-200">₹{totals.total}</strong>. Once complete, submit order below!
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Simulated Interactive Credit Card Gateway */}
                  {coPayM === 'card' && (
                    <div className="mb-5 p-4 border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/45 rounded-2xl">
                      <h5 className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">🔒 Real-time Secure Card Gateway</h5>
                      
                      {/* Live Physical Credit Card simulation */}
                      <div className="relative w-full h-40 rounded-2xl p-5 mb-4 text-white overflow-hidden shadow-lg transition-all duration-500 bg-gradient-to-br from-slate-900 via-indigo-950 to-indigo-900">
                        {/* Glow filter background */}
                        <div className="absolute -top-12 -right-12 w-24 h-24 bg-indigo-500/20 rounded-full blur-2xl"></div>
                        <div className="flex justify-between items-start">
                          <div className="w-10 h-7 rounded bg-amber-400/80 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.4),transparent)] border border-amber-300"></div>
                          <span className="text-[9px] font-mono tracking-widest text-slate-400">SECURE LINK</span>
                        </div>
                        
                        {/* Live Card Number display with groupings */}
                        <div className="mt-5 text-sm font-mono tracking-widest text-center text-slate-200">
                          {ccNum ? ccNum.replace(/(\d{4})/g, '$1 ').trim() : '•••• •••• •••• ••••'}
                        </div>

                        {/* Cardholder information and Expiry */}
                        <div className="mt-4 flex justify-between items-end">
                          <div className="truncate pr-4 flex-1">
                            <span className="text-[8px] text-slate-400 uppercase block font-mono">Cardholder</span>
                            <span className="text-xs font-bold tracking-wide uppercase font-mono block truncate">{ccName || 'YOUR FULL NAME'}</span>
                          </div>
                          <div className="flex-shrink-0 text-right ml-2">
                            <span className="text-[8px] text-slate-400 uppercase block font-mono">Expires</span>
                            <span className="text-xs font-bold font-mono block">{ccExp || 'MM/YY'}</span>
                          </div>
                          <div className="flex-shrink-0 text-right ml-4">
                            <span className="text-[8px] text-slate-400 uppercase block font-mono">CVV</span>
                            <span className="text-xs font-bold font-mono block">{ccCvv || '•••'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Fast entry fields side by side */}
                      <div className="space-y-3">
                        <div className="fg">
                          <label className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500">Card Number</label>
                          <input 
                            type="text" 
                            maxLength={16}
                            placeholder="e.g. 4111 2222 3444 5555" 
                            value={ccNum}
                            onChange={e => setCcNum(e.target.value.replace(/\D/g, ''))}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="fg">
                            <label className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500">Expiry MM/YY</label>
                            <input 
                              type="text" 
                              maxLength={5} 
                              placeholder="e.g. 12/29" 
                              value={ccExp}
                              onChange={e => {
                                let v = e.target.value;
                                if (v.length === 2 && !v.includes('/')) v += '/';
                                setCcExp(v);
                              }}
                            />
                          </div>
                          <div className="fg">
                            <label className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500">CVV</label>
                            <input 
                              type="password" 
                              maxLength={3} 
                              placeholder="e.g. 321" 
                              value={ccCvv} 
                              onChange={e => setCcCvv(e.target.value.replace(/\D/g, ''))} 
                            />
                          </div>
                        </div>
                        <div className="fg">
                          <label className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500">Cardholder Name</label>
                          <input 
                            type="text" 
                            placeholder="e.g. Ramesh Sahu" 
                            value={ccName}
                            onChange={e => setCcName(e.target.value)} 
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Cash on delivery specifications */}
                  {coPayM === 'cod' && (
                    <div className="mb-5 p-4 border border-emerald-100 dark:border-slate-800 bg-emerald-50/20 dark:bg-slate-900/40 rounded-2xl text-center">
                      <span className="text-3xl">🚚</span>
                      <h5 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mt-2 uppercase tracking-wider">Cash on Delivery Verified</h5>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 max-w-sm mx-auto mt-1">
                        Our friendly neighborhood logistics partner will hand over products safely at your doorstep. Please keep <strong className="text-slate-700 dark:text-slate-200">₹{totals.total}</strong> cash ready at delivery block!
                      </p>
                    </div>
                  )}

                  {/* WhatsApp transactions specifications */}
                  {coPayM === 'whatsapp' && (
                    <div className="mb-5 p-4 border border-teal-100 dark:border-slate-800 bg-teal-50/20 dark:bg-slate-900/40 rounded-2xl text-center">
                      <span className="text-3xl">💬</span>
                      <h5 className="text-xs font-bold text-teal-700 dark:text-teal-400 mt-2 uppercase tracking-wider">Confirm Receipt on WhatsApp</h5>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 max-w-sm mx-auto mt-1">
                        Generate direct transaction ticket and negotiate custom pricing, custom sizes, or faster deliveries with the merchant directly over standard messaging secure channels.
                      </p>
                    </div>
                  )}

                  <div className="tot-row mb-1"><span>Subtotal items</span><strong>₹{totals.subtotal}</strong></div>
                  {totals.discount > 0 && <div className="tot-row mb-1 text-green-600 font-semibold"><span>Discount vouchers deduction</span><strong>-₹{totals.discount}</strong></div>}
                  {totals.delivery > 0 && <div className="tot-row mb-1"><span>Delivery consignments</span><strong>₹{totals.delivery}</strong></div>}
                  <div className="tot-row text-bold" style={{ fontSize: '18px', borderTop: '1px dashed #ccc', paddingTop: '6px' }}>
                    <span>Grand Total Outlay</span>
                    <span style={{ color: 'var(--p)' }}>₹{totals.total}</span>
                  </div>

                  <button className="btn-main mt-4 font-bold" onClick={handlePlaceOrder}>✅ Validate and Place Order</button>
                  <button className="btn-cancel w-full mt-2 font-bold" onClick={() => setCheckoutStep(1)}>← Back to details</button>
                </div>
              )}

              {checkoutStep === 3 && (
                <div className="animate-fadeIn text-center">
                  <div style={{ fontSize: '3rem' }}>🎉</div>
                  <h3>Order Placed successfully!</h3>
                  <p>Reference order hash catalogued:</p>
                  <div style={{ background: '#f0f4ff', padding: '10px', borderRadius: '8px', color: '#1e40af', fontWeight: 'bold', margin: '10px 0', fontFamily: 'monospace' }}>{placedOrderId}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button className="btn btn-share" onClick={() => handlePrintReceipt(placedOrderId)}>📄 Print receipt</button>
                    <button className="btn btn-wa" onClick={() => {
                      const text = `Hi, I just placed order ${placedOrderId} on VidishaMart!\nTotal amount: ₹${totals.total}`;
                      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                    }}>💬 Share On WhatsApp</button>
                  </div>
                  <button className="btn-main mt-4" onClick={() => { setShowCheckoutModal(false); setCurrentView('market'); }}>Continue shopping</button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 9. Direct Messenger chats (mChat) */}
      <AnimatePresence>
        {showChatModal && shopperChatPartner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overlay show"
            style={{ display: 'flex' }}
            onClick={() => setShowChatModal(false)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 15 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="modal-box pcard"
              onClick={e => e.stopPropagation()}
            >
              <div className="m-hd"><h3>💬 Merchant chat: {shopperChatPartner.name}</h3><button className="m-close" onClick={() => setShowChatModal(false)}>×</button></div>
              <div className="chat-list" style={{ minHeight: '200px', maxHeight: '300px' }}>
                {(chats[shopperChatPartner.id] || []).length === 0 ? (
                  <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>No messages exchanged. Type below to begin negotiation!</p>
                ) : (
                  (chats[shopperChatPartner.id] || []).map((m, idx) => (
                    <div className={`chat-msg ${m.from === 'me' ? 'me' : 'them'}`} key={idx}>
                      <div className="chat-bubble">{m.text}</div>
                      <span className="chat-time">{m.time}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="chat-input-row">
                <input placeholder="Type question/proposal..." value={shopperTypedMsg} onChange={e => setShopperTypedMsg(e.target.value)} onKeyDown={evt => evt.key === 'Enter' && handleSendShopperMsg()} />
                <button className="btn-main" onClick={handleSendShopperMsg} style={{ width: 'auto', padding: '0 16px', marginTop: 0 }}>Send</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 10. Privacy modal terms guidance */}
      <AnimatePresence>
        {showPrivacyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overlay show"
            style={{ display: 'flex' }}
            onClick={() => setShowPrivacyModal(false)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 15 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="modal-box pcard"
              onClick={e => e.stopPropagation()}
            >
              <div className="m-hd"><h3>🔒 Privacy & Terms</h3><button className="m-close" onClick={() => setShowPrivacyModal(false)}>×</button></div>
              <div className="privacy-content" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                <h4>1. Information We Collect</h4>
                <p>We collect your name, phone number, email (optional), and address when you place an order or register as a seller. We also store your interaction data (orders, reviews, chats). All data is stored locally on your device by default.</p>
                <h4>2. How We Use Information</h4>
                <p>Your data is used to process orders, verify sellers, improve the platform, and provide customer support. We never sell your personal data to third parties.</p>
                <h4>3. Data Storage & Security</h4>
                <p>Data is primarily stored in your browser's localStorage. Sensitive information like PINs is hashed (SHA-256) with a per-user salt. We do not collect data on servers without your explicit consent.</p>
                <h4>4. Your Rights</h4>
                <p>You can delete your account and all associated data at any time from the Seller Dashboard → Settings. You can also clear your browser data or use the admin panel to reset everything.</p>
                <p style={{ fontStyle: 'italic', marginTop: '12px' }}>Last updated: 2026-05-23</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 10b. User Profile, Settings, & Order Tracking Modal */}
      <AnimatePresence>
        {showProfileModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overlay show"
            style={{ display: 'flex', zIndex: 6000 }}
            onClick={() => setShowProfileModal(false)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 15 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="modal-box pcard max-w-lg w-full"
              onClick={e => e.stopPropagation()}
              style={{ maxHeight: '90vh', overflowY: 'auto' }}
            >
              <div className="m-hd">
                <h3>👤 {translate("My Profile & Order Tracker", "मेरा प्रोफाइल और ऑर्डर ट्रैकर")}</h3>
                <button className="m-close" onClick={() => setShowProfileModal(false)}>×</button>
              </div>

              {/* Profile Bio Details */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: 'rgba(99,102,241,0.05)', padding: '16px', borderRadius: '16px', marginBottom: '20px', border: '1px solid rgba(99,102,241,0.1)' }}>
                {firebaseUser && firebaseUser.photoURL ? (
                  <img src={firebaseUser.photoURL} alt="" style={{ width: '48px', height: '48px', borderRadius: '50%', border: '2px solid var(--p)' }} referrerPolicy="no-referrer" />
                ) : (
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--p)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                    👤
                  </div>
                )}
                <div>
                  <h4 style={{ fontWeight: 800, fontSize: '15px', color: 'var(--dark)' }}>
                    {firebaseUser ? (firebaseUser.displayName || 'Online Shopper') : (coName || 'Guest Shopper')}
                  </h4>
                  <p style={{ fontSize: '11px', color: '#666' }}>
                    {firebaseUser ? `📧 ${firebaseUser.email}` : `👤 Local Guest Session`}
                  </p>
                </div>
              </div>

              {/* Editable Profile Settings form */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', color: 'var(--dark)', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                  ⚙️ {translate("Contact & Delivery Information", "संपर्क और वितरण जानकारी")}
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="fg">
                    <label>{translate("Full Name *", "पूरा नाम *")}</label>
                    <input 
                      placeholder="e.g. Aarad Dixit" 
                      value={coName} 
                      onChange={e => setCoName(e.target.value)} 
                    />
                  </div>

                  <div className="fg">
                    <label>{translate("Mobile Phone (For Order Retrieval) *", "मोबाइल फोन (ऑर्डर पुनःप्राप्ति के लिए) *")}</label>
                    <input 
                      placeholder="e.g. 9876543210" 
                      value={coPhone} 
                      onChange={e => setCoPhone(e.target.value)} 
                    />
                    <span style={{ fontSize: '9px', color: '#888', marginTop: '2px', display: 'block' }}>
                      💡 {translate("Must match phone used at checkout to automatically load details & orders.", "चेकआउट पर उपयोग किए गए फोन के समान होना चाहिए ताकि विवरण और ऑर्डर लोड किए जा सकें।")}
                    </span>
                  </div>

                  <div className="fg">
                    <label>{translate("Shipping/Delivery Address *", "वितरण का पता *")}</label>
                    <textarea 
                      rows={2} 
                      placeholder="e.g. Sadar Bazaar, near Temple crossing, Vidisha" 
                      value={coAddr} 
                      onChange={e => setCoAddr(e.target.value)} 
                    />
                  </div>

                  <div className="fg">
                    <label>{translate("Area Pincode", "क्षेत्र पिनकोड")}</label>
                    <input 
                      maxLength={6} 
                      placeholder="e.g. 464001" 
                      value={coPin} 
                      onChange={e => setCoPin(e.target.value)} 
                    />
                  </div>
                </div>

                <button 
                  className="btn-main mt-4 w-full font-bold shadow-sm"
                  onClick={handleSaveProfile}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  💾 {translate("Save Settings & Synchronize", "विवरण सहेजें और सिंक करें")}
                </button>
              </div>

              {/* Dedicated Order Tracking Section */}
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', color: 'var(--dark)', borderBottom: '1px solid var(--border)', paddingBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>📦 {translate("Order Tracking History", "ऑर्डर ट्रैकिंग इतिहास")}</span>
                  {coPhone && (
                    <span style={{ fontSize: '10px', color: 'var(--p)', background: 'rgba(99,102,241,0.1)', padding: '2px 8px', borderRadius: '12px' }}>
                      {orders.filter(o => o.customer.phone && o.customer.phone.replace(/[\s\-+]/g, '').includes(coPhone.replace(/[\s\-+]/g, ''))).length} {translate("Matched", "मिले")}
                    </span>
                  )}
                </h4>

                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {!coPhone ? (
                    <div style={{ padding: '16px', textAlign: 'center', background: '#fafafa', borderRadius: '12px', border: '1px dashed #ddd', fontSize: '11px', color: '#777' }} className="dark:bg-[#141424] dark:border-slate-800">
                      💡 {translate("Please enter and save your Mobile Phone number above to search and track your recent orders in real-time!", "कृपया अपने हाल के ऑर्डरों को खोजने और ट्रैक करने के लिए ऊपर अपना मोबाइल फोन दर्ज कर सहेजें!")}
                    </div>
                  ) : (() => {
                    const cleanPhone = coPhone.replace(/[\s\-+]/g, '');
                    if (!cleanPhone) return null;
                    
                    const matchedOrders = orders.filter(o => 
                      o.customer.phone && o.customer.phone.replace(/[\s\-+]/g, '').includes(cleanPhone)
                    ).sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());

                    if (matchedOrders.length === 0) {
                      return (
                        <div style={{ padding: '24px 16px', textAlign: 'center', background: '#fafafa', borderRadius: '12px', border: '1px dashed #ddd', fontSize: '11px', color: '#777' }} className="dark:bg-[#141424] dark:border-slate-800">
                          📯 {translate("No orders found matching phone", "इस फोन नंबर पर कोई ऑर्डर नहीं मिला")}: <strong>{coPhone}</strong>
                        </div>
                      );
                    }

                    return matchedOrders.map(order => {
                      // Map status to nice colors and text
                      let badgeBg = 'rgba(245,158,11,0.1)';
                      let badgeColor = '#d97706';
                      let prettyStatus = translate('In Processing', 'प्रसंस्करण में');

                      if (order.status === 'pending') {
                        badgeBg = 'rgba(245, 158, 11, 0.1)';
                        badgeColor = '#d97706';
                        prettyStatus = translate('Order Registered', 'ऑर्डर पंजीकृत');
                      } else if (order.status === 'confirmed') {
                        badgeBg = 'rgba(14, 165, 233, 0.1)';
                        badgeColor = '#0284c7';
                        prettyStatus = translate('Accepted & Synced', 'स्वीकृत और सिंक');
                      } else if (order.status === 'preparing') {
                        badgeBg = 'rgba(99, 102, 241, 0.1)';
                        badgeColor = '#4f46e5';
                        prettyStatus = translate('Assembly / Cook', 'तैयार किया जा रहा है');
                      } else if (order.status === 'out_for_delivery') {
                        badgeBg = 'rgba(139, 92, 246, 0.1)';
                        badgeColor = '#7c3aed';
                        prettyStatus = translate('Out for Dispatch', 'वितरण जारी');
                      } else if (order.status === 'delivered') {
                        badgeBg = 'rgba(16, 185, 129, 0.1)';
                        badgeColor = '#059669';
                        prettyStatus = translate('Consignment Handover', 'सुरक्षित डिलीवर');
                      } else if (order.status === 'cancelled') {
                        badgeBg = 'rgba(239, 68, 68, 0.1)';
                        badgeColor = '#dc2626';
                        prettyStatus = translate('Order Cancelled', 'रद्द किया गया');
                      } else if (order.status === 'refunded') {
                        badgeBg = 'rgba(239, 68, 68, 0.15)';
                        badgeColor = '#b91c1c';
                        prettyStatus = translate('Order Refunded', 'धनवापसी की गई');
                      }

                      return (
                        <div 
                          key={order.id} 
                          style={{ border: '1px solid var(--border)', borderRadius: '14px', padding: '12px', background: 'var(--card)' }}
                          className="hover:shadow-sm transition-shadow duration-200"
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                            <div>
                              <strong style={{ fontSize: '11px', color: '#999', display: 'block' }}>
                                #{order.id}
                              </strong>
                              <span style={{ fontSize: '10px', color: '#888' }}>
                                {order.date}
                              </span>
                            </div>
                            <span 
                              style={{ 
                                fontSize: '10px', 
                                fontWeight: 800, 
                                background: badgeBg, 
                                color: badgeColor, 
                                padding: '4px 10px', 
                                borderRadius: '20px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.4px'
                              }}
                            >
                              ● {prettyStatus}
                            </span>
                          </div>

                          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed var(--border)' }}>
                            <div style={{ fontSize: '11.5px', color: 'var(--dark)', fontWeight: 600 }}>
                              {order.items.map(item => `${item.name} × ${item.qty}`).join(', ')}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                              <span style={{ fontSize: '11px', color: '#777' }}>
                                {translate("Total valuation:", "कुल मूल्य:")} <strong style={{ color: 'var(--dark)' }}>₹{order.total}</strong>
                              </span>
                              <button 
                                className="btn-add"
                                style={{ padding: '3px 10px', fontSize: '10.5px', fontWeight: 800 }}
                                onClick={() => {
                                  setTrackQuery(order.id);
                                  setTrackedOrderEntity(order);
                                  setCurrentView('orders');
                                  setShowProfileModal(false);
                                  showToast(`${translate("Opening timeline progress track for", "के लिए लाइव प्रगति देख रहे हैं ")} ${order.id}`, 'info');
                                }}
                              >
                                🔍 {translate("Track Live", "ट्रैक करें")}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 11. Custom Sidebar Drawer System */}
      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="sidebar-overlay"
            onClick={() => setShowSidebar(false)}
          >
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="sidebar-container"
              onClick={e => e.stopPropagation()}
            >
              <div className="sidebar-hdr">
                <div className="sidebar-logo">
                  🛒 <span>{translate("VidishaMart", "विदिशा मार्ट")}</span>
                </div>
                <button className="sidebar-close" id="sidebarCloseBtn" onClick={() => setShowSidebar(false)}>
                  ×
                </button>
              </div>

              <div className="sidebar-body">
                {/* User Welcome Block */}
                <div className="sidebar-welcome">
                  <div className="sidebar-label">{translate("Active Account", "सक्रिय खाता")}</div>
                  {firebaseUser ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {firebaseUser.photoURL ? (
                        <img src={firebaseUser.photoURL} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%' }} referrerPolicy="no-referrer" />
                      ) : (
                        <span style={{ fontSize: '1.5rem' }}>👤</span>
                      )}
                      <div>
                        <h4 style={{ fontWeight: 800, fontSize: '13px', color: 'var(--dark)' }} className="truncate max-w-[170px]">
                          {firebaseUser.displayName || 'Online Shopper'}
                        </h4>
                        <p style={{ fontSize: '10px', color: '#888' }} className="truncate max-w-[170px]">{firebaseUser.email}</p>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '1.5rem' }}>👤</span>
                      <div>
                        <h4 style={{ fontWeight: 800, fontSize: '13px', color: 'var(--dark)' }}>{translate("Welcome Guest Shopper", "अतिथि खरीदार")}</h4>
                        <button 
                          style={{ background: 'none', border: 'none', color: 'var(--p)', padding: 0, textDecoration: 'underline', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
                          onClick={() => { setShowSidebar(false); setShowAuthOverlay(true); }}
                        >
                          🔑 Login / Onboard
                        </button>
                      </div>
                    </div>
                  )}

                  {firebaseUser && firebaseUser.email === 'aaraddixit@gmail.com' && (
                    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
                      <button 
                        className="btn-main" 
                        style={{ padding: '6px 12px', fontSize: '10px', width: '100%', textTransform: 'uppercase', fontWeight: 900 }}
                        onClick={() => {
                          setShowSidebar(false);
                          setShowAdminPanel(true);
                          showToast('Welcome inside core control, Aarad Dixit! 🛡️', 'success');
                        }}
                      >
                        👑 Open Admin Suite
                      </button>
                    </div>
                  )}

                  {/* Dedicated user profile action button inside the sidebar drawer */}
                  <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
                    <button 
                      className="btn-add w-full"
                      style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 800 }}
                      onClick={() => {
                        setShowSidebar(false);
                        setShowProfileModal(true);
                      }}
                    >
                      👤 {translate("Manage Profile & Orders", "प्रोफ़ाइल और ऑर्डर ट्रैकर")}
                    </button>
                  </div>
                </div>

                {/* Main Views Navigation */}
                <div>
                  <div className="sidebar-label">{translate("Explore Pages", "पेज खोजें")}</div>
                  <div className="sidebar-nav-list">
                    <div 
                      className={`sidebar-nav-item ${currentView === 'home' ? 'active' : ''}`}
                      onClick={() => { setCurrentView('home'); setShowSidebar(false); }}
                    >
                      <span>🏠</span> {translate("Home Dashboard", "मुख्य डैशबोर्ड")}
                    </div>
                    <div 
                      className={`sidebar-nav-item ${currentView === 'market' ? 'active' : ''}`}
                      onClick={() => { setCurrentView('market'); setShowSidebar(false); }}
                    >
                      <span>🏪</span> {translate("Shop Catalogue", "दुकानें और उत्पाद")}
                    </div>
                    <div 
                      className={`sidebar-nav-item ${currentView === 'wishlist' ? 'active' : ''}`}
                      onClick={() => { setCurrentView('wishlist'); setShowSidebar(false); }}
                    >
                      <span>❤️</span> {translate("My Wishlist", "पसंदीदा सूची")}
                    </div>
                    <div 
                      className="sidebar-nav-item"
                      onClick={() => { setShowSidebar(false); setShowCartModal(true); }}
                    >
                      <span>🛒</span> {translate("My Basket", "मेरी टोकरी")} ({cart.reduce((acc, curr) => acc + curr.qty, 0)})
                    </div>
                    <div 
                      className={`sidebar-nav-item ${currentView === 'orders' ? 'active' : ''}`}
                      onClick={() => { setCurrentView('orders'); setShowSidebar(false); }}
                    >
                      <span>📦</span> {translate("Track Orders", "ऑर्डर ट्रैक करें")}
                    </div>
                    <div 
                      className={`sidebar-nav-item ${currentView === 'owner' ? 'active' : ''}`}
                      onClick={() => { 
                        setShowSidebar(false); 
                        if (sess) { setCurrentView('owner'); } else { setShowAuthOverlay(true); } 
                      }}
                    >
                      <span>⚙️</span> {translate("Seller Console", "विक्रेता पैनल")}
                    </div>
                  </div>
                </div>

                {/* Shop by Niche Category select triggers */}
                <div>
                  <div className="sidebar-label">{translate("Shop by Category", "श्रेणी अनुसार खरीदें")}</div>
                  <div className="sidebar-cats-grid">
                    {[
                      '💻 Electronics',
                      '👕 Fashion',
                      '🍏 Grocery',
                      '📱 Mobiles',
                      '📚 Books',
                      '📺 Home Appliances',
                      '💄 Beauty',
                      '⚽ Sports'
                    ].map(c => (
                      <div 
                        key={c}
                        className={`sidebar-cat-pill ${selectedCategory === c ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedCategory(c);
                          setCurrentView('market');
                          setShowSidebar(false);
                          showToast(`Filtered by ${c}`, 'info');
                        }}
                      >
                        <span>{c.split(' ')[0]}</span>
                        <span>{c.replace(/^\S+\s/, '')}</span>
                      </div>
                    ))}
                    {selectedCategory && (
                      <div 
                        className="sidebar-cat-pill"
                        style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                        onClick={() => {
                          setSelectedCategory('');
                          setCurrentView('market');
                          setShowSidebar(false);
                        }}
                      >
                        <span>❌</span>
                        <span>{translate("Reset Filters", "फ़िल्टर साफ़ करें")}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Dynamic Preferences triggers inside sidebar */}
                <div style={{ marginTop: 'auto', paddingTop: '15px', borderTop: '1px solid var(--border)' }}>
                  <div className="sidebar-label">{translate("Preferences", "प्राथमिकताएं")}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button 
                      className="btn-add" 
                      style={{ fontSize: '11px', padding: '6px' }}
                      onClick={() => {
                        const nextTheme = theme === 'light' ? 'dark' : 'light';
                        setTheme(nextTheme);
                        document.documentElement.setAttribute('data-theme', nextTheme);
                        StorageEngine.save('theme', nextTheme);
                      }}
                    >
                      {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
                    </button>
                    <button 
                      className="btn-add" 
                      style={{ fontSize: '11px', padding: '6px' }}
                      onClick={() => {
                        const nextLang = lang === 'en' ? 'hi' : 'en';
                        setLang(nextLang);
                        StorageEngine.save('lang', nextLang);
                      }}
                    >
                      {lang === 'en' ? 'हिन्दी' : 'English'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="sidebar-ftr">
                <button 
                  className="btn-cancel" 
                  style={{ width: '100%', fontSize: '11px', padding: '8px' }}
                  onClick={() => { setShowSidebar(false); setShowPrivacyModal(true); }}
                >
                  🔒 {translate("Privacy Policy & Terms", "गोपनीयता नीति")}
                </button>
                <p style={{ fontSize: '9px', color: '#999', textShadow: 'none', margin: 0, textAlign: 'center' }}>
                  VidishaMart v2.4.1 • Sadar Bazaar, MP
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic bottom navigation systems bar */}
      <nav className="bnav" aria-label="Consolidated operations navigation">
        <div className="bnav-inner">
          <button className={`nb ${currentView === 'home' ? 'on' : ''}`} onClick={() => setCurrentView('home')}>
            <span className="ic">🏠</span>{translate("Home", "मुख्य पृष्ठ")}
          </button>
          <button className={`nb ${currentView === 'market' ? 'on' : ''}`} onClick={() => setCurrentView('market')}>
            <span className="ic">🏪</span>{translate("Stores", "दुकानें")}
          </button>
          <button className={`nb ${currentView === 'wishlist' ? 'on' : ''}`} onClick={() => setCurrentView('wishlist')}>
            <span className="ic">❤️</span>{translate("Wishlist", "पसंदीदा")}
            {wish.length > 0 && <span className="nb-badge show">{wish.length}</span>}
          </button>
          <button className="nb" onClick={() => setShowCartModal(true)}>
            <span className="ic">🛒</span>{translate("Cart", "टोकरी")}
            {cart.length > 0 && <span className="nb-badge show">{cart.reduce((acc, curr) => acc + curr.qty, 0)}</span>}
          </button>
          <button className={`nb ${currentView === 'owner' ? 'on' : ''}`} onClick={() => { if (sess) { setCurrentView('owner'); } else { setShowAuthOverlay(true); } }}>
            <span className="ic">⚙️</span>{translate("Seller", "विक्रेता")}
          </button>
        </div>
      </nav>

      {/* Floating Theme controller */}
      <button className="fab-theme" id="themeBtn" onClick={handleToggleTheme} style={{ zIndex: 300 }}>
        {theme === 'light' ? '🌙' : '☀️'}
      </button>

      {/* Floating Scroller top widget */}
      {showScrollTop && (
        <button className="btt show" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          ↑
        </button>
      )}

      {/* PWA simulated prompt boxes */}
      {showPWABanner && (
        <div className="pwa-banner show" id="pwaBanner">
          <span className="pwa-msg">📲 Install VidishaMart as PWA for offline speed catalogs access</span>
          <button className="pwa-act" onClick={() => { showToast('App Installed simulation complete!', 'success'); setShowPWABanner(false); localStorage.setItem('vm_pwa_dis', 'true'); }}>Install</button>
          <button className="pwa-cls" onClick={() => { setShowPWABanner(false); localStorage.setItem('vm_pwa_dis', 'true'); }}>×</button>
        </div>
      )}
    </div>
  );
}
