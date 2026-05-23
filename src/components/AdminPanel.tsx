import React, { useState } from 'react';
import { Shop, Product, Owner, Order, Coupon, AppSettings, LogEntry, Review, FlashSale } from '../types';
import { Sec, now, today } from '../utils/security';
import { StorageEngine } from '../utils/storage';

interface AdminPanelProps {
  show: boolean;
  onClose: () => void;
  shops: Shop[];
  setShops: React.Dispatch<React.SetStateAction<Shop[]>>;
  items: Product[];
  setItems: React.Dispatch<React.SetStateAction<Product[]>>;
  owners: Owner[];
  setOwners: React.Dispatch<React.SetStateAction<Owner[]>>;
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  coupons: Coupon[];
  setCoupons: React.Dispatch<React.SetStateAction<Coupon[]>>;
  reviews: Record<string, Review[]>;
  setReviews: React.Dispatch<React.SetStateAction<Record<string, Review[]>>>;
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  flashSales: FlashSale[];
  setFlashSales: React.Dispatch<React.SetStateAction<FlashSale[]>>;
  log: LogEntry[];
  addLog: (msg: string) => void;
  showToast: (msg: string, type?: 'success' | 'warn' | 'error' | 'info') => void;
  firebaseUser?: any;
}

export default function AdminPanel({
  show,
  onClose,
  shops,
  setShops,
  items,
  setItems,
  owners,
  setOwners,
  orders,
  setOrders,
  coupons,
  setCoupons,
  reviews,
  setReviews,
  settings,
  setSettings,
  flashSales,
  setFlashSales,
  log,
  addLog,
  showToast,
  firebaseUser
}: AdminPanelProps) {
  if (!show) return null;

  if (!firebaseUser || firebaseUser.email !== 'aaraddixit@gmail.com') {
    return (
      <div className="overlay scaleUp on" style={{ zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="pcard max-w-md mx-auto bg-white dark:bg-slate-900 p-8 text-center rounded-2xl shadow-xl relative m-4 border border-red-200">
          <span className="text-5xl block mb-4">🚫</span>
          <h3 className="text-xl font-bold text-red-600 mb-2">Access Denied</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Only the supreme master administrator account (<strong>aaraddixit@gmail.com</strong>) has access authorization.
          </p>
          <button className="btn-main" onClick={onClose}>Close panel</button>
        </div>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState<'overview' | 'shops' | 'owners' | 'products' | 'orders' | 'coupons' | 'flash' | 'reviews' | 'activity' | 'analytics' | 'system'>('overview');

  // Search local states
  const [shopQ, setShopQ] = useState('');
  const [ownerQ, setOwnerQ] = useState('');
  const [prodQ, setProdQ] = useState('');
  const [revQ, setRevQ] = useState('');

  // Coupon creator state
  const [cpCode, setCpCode] = useState('');
  const [cpType, setCpType] = useState<'percent' | 'flat'>('percent');
  const [cpDisc, setCpDisc] = useState('');
  const [cpMin, setCpMin] = useState('');
  const [cpMax, setCpMax] = useState('');
  const [cpExp, setCpExp] = useState(today());

  // Flash creator state
  const [flProd, setFlProd] = useState('');
  const [flPrice, setFlPrice] = useState('');
  const [flHours, setFlHours] = useState('24');

  // Security pin state
  const [newAdmPin, setNewAdmPin] = useState('');
  const [cfAdmPin, setCfAdmPin] = useState('');

  // Filtered lists
  const filteredShops = shops.filter(s =>
    s.name.toLowerCase().includes(shopQ.toLowerCase()) ||
    (s.area || '').toLowerCase().includes(shopQ.toLowerCase()) ||
    s.category.toLowerCase().includes(shopQ.toLowerCase())
  );

  const filteredOwners = owners.filter(o =>
    o.name.toLowerCase().includes(ownerQ.toLowerCase()) ||
    o.phone.includes(ownerQ)
  );

  const filteredProducts = items.filter(i =>
    i.name.toLowerCase().includes(prodQ.toLowerCase()) ||
    (i.shopName || '').toLowerCase().includes(prodQ.toLowerCase())
  );

  // Flat reviews array for moderation
  const allReviews: { shopId: string; shopName: string; review: Review }[] = [];
  Object.entries(reviews).forEach(([shopId, arr]) => {
    const s = shops.find(sh => sh.id === shopId);
    arr.forEach(r => {
      allReviews.push({ shopId, shopName: s ? s.name : 'Unknown Shop', review: r });
    });
  });

  const filteredReviews = allReviews.filter(r =>
    r.review.name.toLowerCase().includes(revQ.toLowerCase()) ||
    r.review.text.toLowerCase().includes(revQ.toLowerCase())
  );

  // Coupon functions
  const handleAddCoupon = () => {
    if (!cpCode || !cpExp || !cpDisc) return showToast('Fill all fields', 'error');
    if (coupons.some(c => c.code === cpCode)) return showToast('Coupon code exists', 'error');
    const discVal = parseFloat(cpDisc);
    if (isNaN(discVal) || discVal <= 0) return showToast('Invalid discount', 'error');

    const newCp: Coupon = {
      code: cpCode.toUpperCase().replace(/[^A-Z0-9]/g, ''),
      type: cpType,
      disc: discVal,
      min: parseFloat(cpMin) || 0,
      maxUses: parseInt(cpMax) || 0,
      used: 0,
      expiry: cpExp,
      active: true,
      createdAt: new Date().toISOString()
    };

    setCoupons(prev => [...prev, newCp]);
    addLog(`🎫 Promo Coupon Created: ${newCp.code}`);
    showToast('Coupon added successfully!');
    setCpCode('');
    setCpDisc('');
    setCpMin('');
    setCpMax('');
  };

  const handleDeleteCoupon = (code: string) => {
    setCoupons(prev => prev.filter(c => c.code !== code));
    addLog(`🗑 Promo Coupon Deleted: ${code}`);
    showToast('Coupon deleted!');
  };

  // Flash sales functions
  const handleAddFlash = () => {
    const itemId = parseInt(flProd);
    const priceVal = parseFloat(flPrice);
    const hrsVal = parseInt(flHours);
    if (!itemId || isNaN(priceVal) || priceVal <= 0) return showToast('Select product and enter price', 'error');
    const it = items.find(i => i.id === itemId);
    if (!it) return showToast('Product not found', 'error');
    if (flashSales.some(f => f.itemId === itemId)) return showToast('Flash sale already exists', 'error');

    // Store original price to restore upon cancel/expiry
    const originalPrice = it.price;
    setItems(prev => prev.map(p => p.id === itemId ? { ...p, price: priceVal, flashOriginalPrice: originalPrice } : p));
    
    const newFlash: FlashSale = {
      itemId,
      price: priceVal,
      endsAt: Date.now() + (hrsVal || 24) * 3600 * 1000
    };

    setFlashSales(prev => [...prev, newFlash]);
    addLog(`⚡ Flash sale active: ${it.name} at ₹${priceVal}`);
    showToast('Flash sale started successfully!');
    setFlProd('');
    setFlPrice('');
  };

  const handleCancelFlash = (itemId: number) => {
    const it = items.find(i => i.id === itemId);
    if (it && it.flashOriginalPrice) {
      setItems(prev => prev.map(p => p.id === itemId ? { ...p, price: it.flashOriginalPrice!, flashOriginalPrice: undefined } : p));
    }
    setFlashSales(prev => prev.filter(f => f.itemId !== itemId));
    addLog(`⚡ Flash sale cancelled: ${it ? it.name : itemId}`);
    showToast('Flash sale cancelled!');
  };

  // Reviews actions
  const handleApproveReview = (shopId: string, revId: number) => {
    setReviews(prev => {
      const copy = { ...prev };
      if (copy[shopId]) {
        copy[shopId] = copy[shopId].map(r => r.id === revId ? { ...r, approved: true } : r);
      }
      return copy;
    });
    addLog(`⭐ Review approved in database for shop ID: ${shopId}`);
    showToast('Review approved!');
  };

  const handleDeleteReview = (shopId: string, revId: number) => {
    setReviews(prev => {
      const copy = { ...prev };
      if (copy[shopId]) {
        copy[shopId] = copy[shopId].filter(r => r.id !== revId);
      }
      return copy;
    });
    addLog(`🗑 Review deleted from database for shop ID: ${shopId}`);
    showToast('Review deleted!');
  };

  // Switch owner banned state
  const handleToggleBan = (id: string) => {
    setOwners(prev => prev.map(o => {
      if (o.id === id) {
        const nextStatus = o.status === 'active' ? 'banned' as const : 'active' as const;
        addLog(`👤 Owner ${o.name} status updated -> ${nextStatus}`);
        return { ...o, status: nextStatus };
      }
      return o;
    }));
    showToast('Owner status toggled!');
  };

  // Verify/unverify shop
  const handleToggleVerifyShop = (id: string) => {
    setShops(prev => prev.map(s => {
      if (s.id === id) {
        const nextPlan = s.plan >= 99 ? 0 : 99; // 99 is verified Bronze
        addLog(`🏪 Shop ${s.name} verification status toggled`);
        return { ...s, plan: nextPlan };
      }
      return s;
    }));
    showToast('Shop verification updated!');
  };

  // System actions
  const handleChangePin = async () => {
    if (!newAdmPin || !Sec.pin(newAdmPin)) return showToast('New PIN must be 4 digits', 'error');
    if (newAdmPin !== cfAdmPin) return showToast('PIN confirmations do not match', 'error');
    
    setSettings(prev => ({
      ...prev,
      adminPin: newAdmPin
    }));
    addLog('🔐 Admin access PIN changed');
    showToast('Admin PIN updated successfully!');
    setNewAdmPin('');
    setCfAdmPin('');
  };

  const handleBackupDownload = () => {
    const data = { shops, items, orders, owners, coupons, reviews, settings, flashSales };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vidishamart-backup-${today()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup JSON downloaded!');
  };

  const handleBackupRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (confirm('This will wipe all existing local database tables. Continue?')) {
          if (Array.isArray(parsed.shops)) setShops(parsed.shops);
          if (Array.isArray(parsed.items)) setItems(parsed.items);
          if (Array.isArray(parsed.orders)) setOrders(parsed.orders);
          if (Array.isArray(parsed.owners)) setOwners(parsed.owners);
          if (Array.isArray(parsed.coupons)) setCoupons(parsed.coupons);
          if (parsed.reviews) setReviews(parsed.reviews);
          if (parsed.settings) setSettings(parsed.settings);
          if (parsed.flashSales) setFlashSales(parsed.flashSales);

          showToast('Database Restore Completed! Reloading...');
          setTimeout(() => window.location.reload(), 1500);
        }
      } catch {
        showToast('Invalid backup file parsed', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleExportCSV = () => {
    const headers = ['OrderID', 'Customer', 'Phone', 'Items', 'Subtotal', 'Discount', 'GST', 'Delivery', 'Total', 'Status', 'Date'];
    const rows = orders.map(o => [
      o.id,
      o.customer.name,
      o.customer.phone,
      o.items.map(i => `${i.name} x${i.qty}`).join('; '),
      o.subtotal,
      o.discount,
      o.tax,
      o.delivery,
      o.total,
      o.status,
      o.date
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `vidishamart-orders-${today()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Orders exported as CSV!');
  };

  const handleResetAll = () => {
    if (confirm('💣 WARNING: This will permanently purge your entire local storage database and reload. Continue?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleClearOrders = () => {
    if (confirm('Purge all transaction history?')) {
      setOrders([]);
      addLog('🧾 Transaction ledger wiped');
      showToast('Orders cleared!');
    }
  };

  // Analytics Helpers
  const analyticsByDays = () => {
    const days: Record<string, number> = {};
    const d = new Date();
    for (let i = 6; i >= 0; i--) {
      const prev = new Date(d);
      prev.setDate(prev.getDate() - i);
      const iso = prev.toISOString().slice(0, 10);
      days[iso] = 0;
    }
    orders.forEach(o => {
      const oDate = o.createdAt ? o.createdAt.slice(0, 10) : '';
      if (days[oDate] !== undefined) {
        days[oDate] += o.total;
      }
    });
    return Object.entries(days);
  };

  const topShopsByRev = () => {
    const sums: Record<string, number> = {};
    orders.forEach(o => {
      if (o.status === 'cancelled') return;
      o.items.forEach(i => {
        sums[i.shopRef] = (sums[i.shopRef] || 0) + (i.price * i.qty);
      });
    });
    return Object.entries(sums)
      .map(([id, sum]) => ({ id, name: shops.find(s => s.id === id)?.name || 'Unknown', revenue: sum }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  };

  const shopCategoryDistribution = () => {
    const counts: Record<string, number> = {};
    shops.forEach(s => {
      counts[s.category] = (counts[s.category] || 0) + 1;
    });
    return Object.entries(counts);
  };

  return (
    <div className="adm-wrap show" style={{ display: 'flex' }}>
      <div className="adm-hd">
        <h2>🛠️ VidishaMart Administrative Core</h2>
        <button className="adm-close-btn" onClick={onClose}>✕ Close Control</button>
      </div>

      <div className="adm-nav">
        <button className={`anav ${activeTab === 'overview' ? 'on' : ''}`} onClick={() => setActiveTab('overview')}>📊 Overview</button>
        <button className={`anav ${activeTab === 'shops' ? 'on' : ''}`} onClick={() => setActiveTab('shops')}>🏪 Shops</button>
        <button className={`anav ${activeTab === 'owners' ? 'on' : ''}`} onClick={() => setActiveTab('owners')}>👤 Owners</button>
        <button className={`anav ${activeTab === 'products' ? 'on' : ''}`} onClick={() => setActiveTab('products')}>📦 Products</button>
        <button className={`anav ${activeTab === 'orders' ? 'on' : ''}`} onClick={() => setActiveTab('orders')}>🧾 Orders</button>
        <button className={`anav ${activeTab === 'coupons' ? 'on' : ''}`} onClick={() => setActiveTab('coupons')}>🏷️ Coupons</button>
        <button className={`anav ${activeTab === 'flash' ? 'on' : ''}`} onClick={() => setActiveTab('flash')}>⚡ Flash Sales</button>
        <button className={`anav ${activeTab === 'reviews' ? 'on' : ''}`} onClick={() => setActiveTab('reviews')}>⭐ Reviews</button>
        <button className={`anav ${activeTab === 'activity' ? 'on' : ''}`} onClick={() => setActiveTab('activity')}>📜 Log Console</button>
        <button className={`anav ${activeTab === 'analytics' ? 'on' : ''}`} onClick={() => setActiveTab('analytics')}>📈 Analytics</button>
        <button className={`anav ${activeTab === 'system' ? 'on' : ''}`} onClick={() => setActiveTab('system')}>🔧 Preferences</button>
      </div>

      <div className="adm-body">
        {/* OVERVIEW PANEL */}
        {activeTab === 'overview' && (
          <div className="adm-sec on">
            <div className="adm-sg animate-fadeIn">
              <div className="asc green">
                <div className="asc-n">{shops.filter(s => s.status === 'active').length}</div>
                <div className="asc-l">Running Shops</div>
              </div>
              <div className="asc blue">
                <div className="asc-n">{items.filter(i => i.status === 'active').length}</div>
                <div className="asc-l">Listed Products</div>
              </div>
              <div className="asc purple">
                <div className="asc-n">{owners.length}</div>
                <div className="asc-l">Master Accounts</div>
              </div>
              <div className="asc gold">
                <div className="asc-n">{orders.length}</div>
                <div className="asc-l">Orders Received</div>
              </div>
            </div>

            <h4 style={{ fontWeight: 800, fontSize: '13px', marginBottom: '10px', marginTop: '15px' }}>📈 Popular Dynamic Products (By Volume)</h4>
            <div className="pcard">
              {[...items].sort((a, b) => b.salesCount - a.salesCount).slice(0, 4).map((p, i) => (
                <div className="tp-row" key={p.id}>
                  <span className="tp-rank">#{i + 1}</span>
                  <span>{p.emoji} {p.name} ({p.shopName})</span>
                  <span style={{ marginLeft: 'auto', fontWeight: 800 }}>{p.salesCount} sold</span>
                </div>
              ))}
            </div>

            <h4 style={{ fontWeight: 800, fontSize: '13px', marginBottom: '10px' }}>📜 Recent Operating Logs</h4>
            <div className="act-list">
              {log.slice(0, 5).map((l, i) => (
                <div className="act-row" key={i}>
                  <div className="act-ico">📜</div>
                  <div style={{ flex: 1 }}>
                    <div className="act-txt">{l.msg}</div>
                    <div className="act-time">{l.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SHOPS TAB */}
        {activeTab === 'shops' && (
          <div className="adm-sec on">
            <div className="adm-srch">
              <span>🔍</span>
              <input placeholder="Filter shops by name, niche or area..." value={shopQ} onChange={e => setShopQ(e.target.value)} />
            </div>
            <div className="tbl-wrap">
              <table className="adm-tbl">
                <thead>
                  <tr>
                    <th>Store Name</th>
                    <th>Niche / Tag</th>
                    <th>Representative</th>
                    <th>Plan Level</th>
                    <th>Stock Items</th>
                    <th>Gross Sales</th>
                    <th>Status</th>
                    <th>Direct Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredShops.map(s => {
                    const owner = owners.find(o => o.id === s.ownerId);
                    const prodCount = items.filter(i => i.shopRef === s.id).length;
                    return (
                      <tr key={s.id}>
                        <td style={{ fontWeight: 700 }}>{s.name}</td>
                        <td>{s.category}</td>
                        <td>{owner ? owner.name : 'Quick Listed'}</td>
                        <td>{s.plan === 299 ? '👑 Gold' : s.plan === 199 ? '🥈 Silver' : s.plan === 99 ? '🥉 Bronze' : '🆓 Free'}</td>
                        <td>{prodCount} items</td>
                        <td style={{ fontWeight: 800 }}>₹{s.revenue || 0}</td>
                        <td>
                          <span className={`pill-${s.status === 'active' ? 'green' : 'red'}`}>{s.status}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '5px' }}>
                            <button className="btn-green" style={{ padding: '4px 8px' }} onClick={() => handleToggleVerifyShop(s.id)}>
                              {s.plan >= 99 ? 'Unverify' : '✓ Verify'}
                            </button>
                            <button className="btn-del" style={{ padding: '4px 8px' }} onClick={() => {
                              if (confirm('Suspend shop temporary?')) {
                                setShops(prev => prev.map(sh => sh.id === s.id ? { ...sh, status: sh.status === 'suspended' ? 'active' : 'suspended' } : sh));
                                showToast('Shop status modified');
                              }
                            }}>
                              {s.status === 'suspended' ? 'Activate' : 'Suspend'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* OWNERS TAB */}
        {activeTab === 'owners' && (
          <div className="adm-sec on">
            <div className="adm-srch">
              <span>🔍</span>
              <input placeholder="Search owner profiles..." value={ownerQ} onChange={e => setOwnerQ(e.target.value)} />
            </div>
            <div className="tbl-wrap">
              <table className="adm-tbl">
                <thead>
                  <tr>
                    <th>Shop Owner Name</th>
                    <th>Mobile Phone</th>
                    <th>Registered Shops</th>
                    <th>Verification</th>
                    <th>Account Health</th>
                    <th>Action Block</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOwners.map(o => {
                    const shopCount = shops.filter(s => s.ownerId === o.id).length;
                    return (
                      <tr key={o.id}>
                        <td style={{ fontWeight: 700 }}>{o.name}</td>
                        <td>{o.phone}</td>
                        <td>{shopCount} shops</td>
                        <td>{o.phoneVerified ? '✅ Phone Verified' : '❌ Unverified'}</td>
                        <td>
                          <span className={`pill-${o.status === 'active' ? 'green' : 'red'}`}>
                            {o.status === 'active' ? 'Good Standing' : 'Suspended'}
                          </span>
                        </td>
                        <td>
                          <button className={o.status === 'active' ? 'btn-del' : 'btn-green'} style={{ padding: '5px 10px' }} onClick={() => handleToggleBan(o.id)}>
                            {o.status === 'active' ? '🚫 Freeze' : '🔓 Restore'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PRODUCTS TAB */}
        {activeTab === 'products' && (
          <div className="adm-sec on">
            <div className="adm-srch">
              <span>🔍</span>
              <input placeholder="Filter inventory item database..." value={prodQ} onChange={e => setProdQ(e.target.value)} />
            </div>
            <div className="tbl-wrap">
              <table className="adm-tbl">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Listed Store</th>
                    <th>Unit Price</th>
                    <th>In Stock</th>
                    <th>Sales Vol</th>
                    <th>Stock Alert</th>
                    <th>Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 'bold' }}>{p.emoji} {p.name}</td>
                      <td>{p.shopName}</td>
                      <td style={{ fontWeight: 'bold' }}>₹{p.price}</td>
                      <td>{p.stock} units</td>
                      <td>{p.salesCount} sold</td>
                      <td>
                        <span className={`pill-${p.stock <= 0 ? 'red' : p.stock <= p.lowStockAt ? 'gold' : 'green'}`}>
                          {p.stock <= 0 ? 'Out of stock' : p.stock <= p.lowStockAt ? 'Low Stock alert' : 'Healthy'}
                        </span>
                      </td>
                      <td>
                        <button className="btn-del" style={{ padding: '4px 8px' }} onClick={() => {
                          if (confirm('Remove item listings instantly?')) {
                            setItems(prev => prev.filter(i => i.id !== p.id));
                            addLog(`📦 Admin Purged Product: ${p.name}`);
                            showToast('Product listings deleted!');
                          }
                        }}>🗑 Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ORDERS TAB */}
        {activeTab === 'orders' && (
          <div className="adm-sec on">
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '11px' }}>
              <button className="exp-btn" onClick={handleExportCSV}>📥 Download CSV Ledger</button>
              <button className="exp-btn" style={{ background: 'var(--g4)' }} onClick={handleBackupDownload}>💾 Full Database Backup</button>
            </div>
            <div className="tbl-wrap">
              <table className="adm-tbl">
                <thead>
                  <tr>
                    <th>Order Reference</th>
                    <th>Target Customer</th>
                    <th>Subtotal</th>
                    <th>Grand Total</th>
                    <th>Transit State</th>
                    <th>Execution Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {[...orders].reverse().map(o => (
                    <tr key={o.id}>
                      <td style={{ fontWeight: 800 }}>{o.id}</td>
                      <td>{o.customer.name} ({o.customer.phone})</td>
                      <td>₹{o.subtotal}</td>
                      <td style={{ fontWeight: 800, color: 'var(--p)' }}>₹{o.total}</td>
                      <td>
                        <span className={`pill-${o.status === 'delivered' ? 'green' : o.status === 'cancelled' ? 'red' : 'blue'}`}>
                          {o.status.toUpperCase()}
                        </span>
                      </td>
                      <td>{o.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* COUPONS TAB */}
        {activeTab === 'coupons' && (
          <div className="adm-sec on">
            <div className="pcard">
              <div className="pcard-title">🏷️ Create Promotional Coupon (Global)</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="fg">
                  <label>Coupon Code *</label>
                  <input placeholder="e.g. MONSOON30" value={cpCode} onChange={e => setCpCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} />
                </div>
                <div className="fg">
                  <label>Promo Class</label>
                  <select value={cpType} onChange={e => setCpType(e.target.value as any)}>
                    <option value="percent">Percentage % Off</option>
                    <option value="flat">Flat Amount (Value) ₹ Off</option>
                  </select>
                </div>
                <div className="fg">
                  <label>Discount Value</label>
                  <input type="number" placeholder="20" value={cpDisc} onChange={e => setCpDisc(e.target.value)} />
                </div>
                <div className="fg">
                  <label>Minimum Store Cart (₹)</label>
                  <input type="number" placeholder="0" value={cpMin} onChange={e => setCpMin(e.target.value)} />
                </div>
                <div className="fg">
                  <label>Max Uses (Set 0 for Unlimited)</label>
                  <input type="number" placeholder="0" value={cpMax} onChange={e => setCpMax(e.target.value)} />
                </div>
                <div className="fg">
                  <label>Voucher Expiry Date</label>
                  <input type="date" value={cpExp} onChange={e => setCpExp(e.target.value)} />
                </div>
              </div>
              <button className="btn-main" onClick={handleAddCoupon}>✦ Issue Global Voucher</button>
            </div>

            <div className="pcard">
              <div className="pcard-title">Voucher Registry</div>
              <div className="tbl-wrap">
                <table className="adm-tbl">
                  <thead>
                    <tr>
                      <th>Voucher Code</th>
                      <th>Class</th>
                      <th>Ratio</th>
                      <th>Basket Minimum</th>
                      <th>Redemptions</th>
                      <th>Expiry</th>
                      <th>State</th>
                      <th>Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coupons.map(c => (
                      <tr key={c.code}>
                        <td style={{ fontWeight: 900 }}>{c.code}</td>
                        <td>{c.type === 'percent' ? 'Percentage' : 'Flat Value'}</td>
                        <td>{c.disc}{c.type === 'percent' ? '%' : '₹'} Off</td>
                        <td>₹{c.min}</td>
                        <td>{c.used} / {c.maxUses === 0 ? '∞' : c.maxUses} used</td>
                        <td>{c.expiry}</td>
                        <td>
                          <span className={`pill-${c.active && c.expiry >= today() ? 'green' : 'red'}`}>
                            {c.active && c.expiry >= today() ? 'Live' : 'Closed'}
                          </span>
                        </td>
                        <td>
                          <button className="btn-del" onClick={() => handleDeleteCoupon(c.code)}>🗑 Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* FLASH SALES */}
        {activeTab === 'flash' && (
          <div className="adm-sec on">
            <div className="pcard animate-fadeIn">
              <div className="pcard-title">⚡ Mount Active Flash Promo Campaigns</div>
              <div className="fg">
                <label>Target Product</label>
                <select value={flProd} onChange={e => setFlProd(e.target.value)}>
                  <option value="">— Select item from catalog —</option>
                  {items.filter(i => i.status === 'active').map(i => (
                    <option value={i.id} key={i.id}>{i.name} [Shop: {i.shopName}]</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="fg">
                  <label>Dynamic Promo Price (₹) *</label>
                  <input type="number" placeholder="99.00" value={flPrice} onChange={e => setFlPrice(e.target.value)} />
                </div>
                <div className="fg">
                  <label>Duration Limit (hours)</label>
                  <input type="number" value={flHours} onChange={e => setFlHours(e.target.value)} />
                </div>
              </div>
              <button className="btn-main font-bold" onClick={handleAddFlash}>⚡ Deploy Flash Campaign</button>
            </div>

            <div className="pcard">
              <div className="pcard-title">Running Flash Sales</div>
              {flashSales.length === 0 ? (
                <p style={{ color: '#999', fontSize: '12px' }}>No active flash sales listed currently.</p>
              ) : (
                flashSales.map(f => {
                  const p = items.find(i => i.id === f.itemId);
                  return (
                    <div className="ord-card" style={{ borderLeft: '4px solid #fa709a' }} key={f.itemId}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ fontSize: '13px' }}>⚡ {p ? p.name : 'Unknown Product'}</strong>
                          <div style={{ fontSize: '10px', color: '#999', marginTop: '3px' }}>
                            Ends: {new Date(f.endsAt).toLocaleString('en-IN')}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--danger)' }}>₹{f.price}</span>
                          <div style={{ textDecoration: 'line-through', fontSize: '10px', color: '#ccc' }}>
                            Reg: ₹{p ? p.flashOriginalPrice || p.price : ''}
                          </div>
                        </div>
                      </div>
                      <button className="btn-del" style={{ border: 'none', background: '#fee2e2', color: '#dc2626', width: '100%', marginTop: '10px', padding: '6px' }} onClick={() => handleCancelFlash(f.itemId)}>
                        Cancel Flash Campaign
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* REVIEWS MODERATION */}
        {activeTab === 'reviews' && (
          <div className="adm-sec on">
            <div className="adm-srch">
              <span>🔍</span>
              <input placeholder="Filter reviews..." value={revQ} onChange={e => setRevQ(e.target.value)} />
            </div>
            <div className="pcard">
              <div className="pcard-title">Reviews Moderation Center</div>
              {filteredReviews.length === 0 ? (
                <p style={{ color: '#999', textAlign: 'center', padding: '15px' }}>No pending or approved reviews match criteria.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {filteredReviews.map(({ shopId, shopName, review }) => (
                    <div className="rev-item" key={review.id}>
                      <div className="rev-hd">
                        <span className="rev-usr">{review.name}</span>
                        <span className="rev-dt">{review.date}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--p)', fontWeight: 'bold', marginBottom: '4px' }}>
                        🏥 Store: {shopName}
                      </div>
                      <div className="rev-stars">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</div>
                      <div className="rev-txt">"{review.text}"</div>
                      <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                        {!review.approved && (
                          <button className="btn-green" style={{ padding: '4px 10px' }} onClick={() => handleApproveReview(shopId, review.id)}>
                            Approve & Publish
                          </button>
                        )}
                        <button className="btn-del" style={{ padding: '4px 10px' }} onClick={() => handleDeleteReview(shopId, review.id)}>
                          Purge Review
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* LOG SYSTEM */}
        {activeTab === 'activity' && (
          <div className="adm-sec on">
            <div className="pcard">
              <div className="pcard-title">Dynamic Operations Console Logs</div>
              <div style={{ maxHeight: '450px', overflowY: 'auto' }}>
                {log.map((entry, idx) => (
                  <div className="act-row" key={idx}>
                    <div className="act-ico">📜</div>
                    <div style={{ flex: 1 }}>
                      <p className="act-txt">{entry.msg}</p>
                      <span className="act-time">{entry.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="adm-sec on">
            <div className="pcard animate-fadeIn">
              <div className="pcard-title">📈 Ledger Revenue History (Last 7 Days)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {analyticsByDays().map(([day, val]) => (
                  <div key={day} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#fafafa', borderRadius: '8px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '12px' }}>{day}</span>
                    <span style={{ color: 'var(--p)', fontWeight: 800 }}>₹{val}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pcard animate-fadeIn">
              <div className="pcard-title">🏆 Top-Selling Shops by Gross Revenue</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {topShopsByRev().map((s, idx) => (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#fafafa', borderRadius: '8px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '12px' }}>#{idx + 1} {s.name}</span>
                    <span style={{ color: 'var(--p)', fontWeight: 800 }}>₹{s.revenue}</span>
                  </div>
                ))}
                {topShopsByRev().length === 0 && <p style={{ color: '#999', fontSize: '11px' }}>No sales logged yet.</p>}
              </div>
            </div>

            <div className="pcard animate-fadeIn">
              <div className="pcard-title">📊 Category Share of Catalog</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {shopCategoryDistribution().map(([cat, val]) => (
                  <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#fafafa', borderRadius: '8px' }}>
                    <span style={{ fontSize: '12px' }}>{cat}</span>
                    <span style={{ fontWeight: 'bold' }}>{val} shops</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PREFERENCES */}
        {activeTab === 'system' && (
          <div className="adm-sec on">
            <div className="pcard">
              <div className="pcard-title">🔐 Alter Master Security PIN</div>
              <div className="fg">
                <label>New Administrative PIN</label>
                <input type="password" value={newAdmPin} onChange={e => setNewAdmPin(e.target.value)} maxLength={4} placeholder="4-digit numeric code" />
              </div>
              <div className="fg">
                <label>Confirm PIN</label>
                <input type="password" value={cfAdmPin} onChange={e => setCfAdmPin(e.target.value)} maxLength={4} placeholder="repeat 4-digit code" />
              </div>
              <button className="btn-main" onClick={handleChangePin}>Update Access PIN</button>
            </div>

            <div className="pcard animate-fadeIn">
              <div className="pcard-title">💾 System Database Sync & Backup</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button className="exp-btn" style={{ marginBottom: 0 }} onClick={handleBackupDownload}>📥 Save Database Snapshots</button>
                <label className="exp-btn" style={{ background: 'var(--g4)', display: 'inline-flex', alignItems: 'center', cursor: 'pointer', marginBottom: 0 }}>
                  📤 Restore Database
                  <input type="file" accept=".json" onChange={handleBackupRestore} style={{ display: 'none' }} />
                </label>
              </div>
            </div>

            <div className="pcard">
              <div className="pcard-title">📦 Local Browser Storage Usage</div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                <p><strong>DB Engine Version:</strong> v8 Production-Grade</p>
                <p><strong>Storage consumed:</strong> {(StorageEngine.getUsage() / 1024).toFixed(2)} KB allocated in LocalStorage</p>
              </div>
            </div>

            <div className="pcard">
              <div className="pcard-title">🔧 Global Controls & Financial Parameters</div>
              <div className="chk-row">
                <input type="checkbox" checked={settings.enableChat} id="enableChatChk" onChange={e => setSettings(prev => ({ ...prev, enableChat: e.target.checked }))} />
                <label htmlFor="enableChatChk">💬 Allow Customer-Owner Chatboxes</label>
              </div>
              <div className="chk-row">
                <input type="checkbox" checked={settings.requireOtp} id="otpRegChk" onChange={e => setSettings(prev => ({ ...prev, requireOtp: e.target.checked }))} />
                <label htmlFor="otpRegChk">📱 Force Otp verification simulation on signups</label>
              </div>
              <div className="chk-row">
                <input type="checkbox" checked={settings.moderateReviews} id="modRevChk" onChange={e => setSettings(prev => ({ ...prev, moderateReviews: e.target.checked }))} />
                <label htmlFor="modRevChk">🛡️ Force Moderation on Customer Reviews</label>
              </div>
              <div className="fg" style={{ marginTop: '15px' }}>
                <label>Tax Rate (GST % Override)</label>
                <input type="number" step="0.1" value={settings.taxRate} onChange={e => setSettings(p => ({ ...p, taxRate: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="fg">
                <label>Default Flat Delivery Courier Fee (₹)</label>
                <input type="number" value={settings.delivFee} onChange={e => setSettings(p => ({ ...p, delivFee: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="fg">
                <label>Waive Delivery For Cart Values Beyond (₹)</label>
                <input type="number" value={settings.freeDelivAbove} onChange={e => setSettings(p => ({ ...p, freeDelivAbove: parseFloat(e.target.value) || 0 }))} />
              </div>
            </div>

            <div className="danger-zone font-sans">
              <h4>⚠️ Danger Zone Controls (Force Factory Erase)</h4>
              <p style={{ fontSize: '11px', color: '#991b1b', opacity: 0.8, marginBottom: '10px' }}>
                Irreversibility alert. These options will permanently flush persistent client storage database sheets.
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button className="btn-del" onClick={handleResetAll}>🗑 Reset Local Database to Defaults</button>
                <button className="btn-del" onClick={handleClearOrders}>🧾 Wipe Ledger Logs</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
