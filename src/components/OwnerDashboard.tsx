import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shop, Product, Owner, Order, Session, LogEntry, ChatMessage } from '../types';
import { Sec, now, slug, gShopId, gid } from '../utils/security';

interface OwnerDashboardProps {
  session: Session;
  onLogout: () => void;
  shops: Shop[];
  setShops: React.Dispatch<React.SetStateAction<Shop[]>>;
  items: Product[];
  setItems: React.Dispatch<React.SetStateAction<Product[]>>;
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  owners: Owner[];
  setOwners: React.Dispatch<React.SetStateAction<Owner[]>>;
  chats: Record<string, ChatMessage[]>;
  setChats: React.Dispatch<React.SetStateAction<Record<string, ChatMessage[]>>>;
  addLog: (msg: string) => void;
  showToast: (msg: string, type?: 'success' | 'warn' | 'error' | 'info') => void;
}

export default function OwnerDashboard({
  session,
  onLogout,
  shops,
  setShops,
  items,
  setItems,
  orders,
  setOrders,
  owners,
  setOwners,
  chats,
  setChats,
  addLog,
  showToast
}: OwnerDashboardProps) {

  const [activeTab, setActiveTab] = useState<'shops' | 'products' | 'orders' | 'sales' | 'chats' | 'settings'>('shops');

  // Shop creator local state
  const [sName, setSName] = useState('');
  const [sCat, setSCat] = useState('');
  const [sPhone, setSPhone] = useState('');
  const [sArea, setSArea] = useState('');
  const [sAddr, setSAddr] = useState('');
  const [sDesc, setSDesc] = useState('');
  const [sOpen, setSOpen] = useState('09:00');
  const [sClose, setSClose] = useState('21:00');
  const [sMin, setSMin] = useState('');
  const [sDel, setSDel] = useState(true);
  const [s247, setS247] = useState(false);
  const [sPlan, setSPlan] = useState('0');
  const [shopImgBase64, setShopImgBase64] = useState('');

  // Product creator state
  const [iShopSel, setIShopSel] = useState('');
  const [iName, setIName] = useState('');
  const [iPrice, setIPrice] = useState('');
  const [iMrp, setIMrp] = useState('');
  const [iStock, setIStock] = useState('');
  const [iLowAt, setILowAt] = useState('5');
  const [iEmoji, setIEmoji] = useState('📦');
  const [iTags, setITags] = useState('');
  const [iDesc, setIDesc] = useState('');
  const [iFeat, setIFeat] = useState(false);
  const [prodImgBase64, setProdImgBase64] = useState('');

  // Bulk Restock state
  const [bulkSel, setBulkSel] = useState('');
  const [bulkVal, setBulkVal] = useState('');

  // Search product state
  const [prodSearch, setProdSearch] = useState('');

  // Editing modal states (can mock inline edit card for clean visuals)
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [editingProd, setEditingProd] = useState<Product | null>(null);

  // Password / PIN change state
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [cfPin, setCfPin] = useState('');

  // Change Security Questions
  const [secVerPin, setSecVerPin] = useState('');
  const [secNewQ, setSecNewQ] = useState("What is your mother's maiden name?");
  const [secNewA, setSecNewA] = useState('');

  // Chat conversation view state
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chatTypeMsg, setChatTypeMsg] = useState('');

  // Filter lists by owner mapping
  const myShops = shops.filter(s => s.ownerId === session.ownerId);
  const myShopIds = new Set(myShops.map(s => s.id));
  const myProducts = items.filter(it => myShopIds.has(it.shopRef) && it.status !== 'orphaned');
  
  // Search filter
  const filteredMyProducts = myProducts.filter(p =>
    p.name.toLowerCase().includes(prodSearch.toLowerCase()) ||
    p.tags.some(t => t.toLowerCase().includes(prodSearch.toLowerCase()))
  );

  // Orders directed to my shop list
  const myOrders = orders.filter(o => o.items.some(i => myShopIds.has(i.shopRef)))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Shop register handlers
  const handleRegShop = () => {
    if (!sName || !sCat || !sPhone || !sArea) {
      return showToast('Complete all required store attributes (*)', 'error');
    }
    if (!Sec.phone(sPhone)) return showToast('Invalid mobile phone number (10 digits)', 'error');

    const newShop: Shop = {
      id: gShopId(),
      name: sName,
      category: sCat,
      phone: sPhone,
      area: sArea,
      address: sAddr,
      description: sDesc,
      openTime: sOpen,
      closeTime: sClose,
      minOrder: parseFloat(sMin) || 0,
      delivery: sDel,
      is24x7: s247,
      plan: parseInt(sPlan) || 0,
      img: shopImgBase64 || "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=400&fit=crop",
      revenue: 0,
      status: 'active',
      ownerId: session.ownerId,
      slug: slug(sName),
      createdAt: new Date().toISOString(),
      featured: false
    };

    setShops(prev => [...prev, newShop]);
    addLog(`🏪 Live Store Registered: ${sName}`);
    showToast('Success! Shop Registered Live! 🎉');

    // Wipe states
    setSName('');
    setSPhone('');
    setSArea('');
    setSAddr('');
    setSDesc('');
    setSMin('');
    setShopImgBase64('');
  };

  const handleDeleteShop = (id: string, name: string) => {
    if (confirm(`💣 Delete shop "${name}" permanently? All linked products will be deleted too!`)) {
      setShops(prev => prev.filter(s => s.id !== id));
      setItems(prev => prev.filter(p => p.shopRef !== id));
      addLog(`❌ Shop deleted: ${name}`);
      showToast('Shop deleted permanently');
    }
  };

  // Product register handlers
  const handleAddProd = () => {
    if (!iShopSel || !iName || !iPrice) return showToast('Complete required product details (*)', 'error');
    const priceVal = parseFloat(iPrice);
    if (isNaN(priceVal) || priceVal <= 0) return showToast('Price must be positive', 'error');

    const shop = shops.find(s => s.id === iShopSel);

    const newProd: Product = {
      id: gid(),
      name: iName,
      price: priceVal,
      orgPrice: parseFloat(iMrp) || 0,
      stock: parseInt(iStock) || 0,
      lowStockAt: parseInt(iLowAt) || 5,
      emoji: iEmoji || '📦',
      tags: iTags.split(',').map(t => t.trim()).filter(Boolean),
      desc: iDesc,
      img: prodImgBase64 || '',
      featured: iFeat,
      shopRef: iShopSel,
      shopName: shop ? shop.name : 'Unknown Store',
      slug: slug(iName),
      salesCount: 0,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    setItems(prev => [...prev, newProd]);
    addLog(`📦 New Product Catalogued: ${iName}`);
    showToast('Product Catalogued Successfully!');

    setIName('');
    setIPrice('');
    setIMrp('');
    setIStock('');
    setIEmoji('📦');
    setITags('');
    setIDesc('');
    setProdImgBase64('');
  };

  const handleBulkRestock = () => {
    const pid = parseInt(bulkSel);
    const amt = parseInt(bulkVal);
    if (!pid || isNaN(amt) || amt < 0) return showToast('Select item and input positive stock amount', 'error');

    setItems(prev => prev.map(p => p.id === pid ? { ...p, stock: amt } : p));
    showToast('Bulk restock updated successfully!');
    setBulkSel('');
    setBulkVal('');
  };

  const handleDeleteProd = (id: number, name: string) => {
    if (confirm(`Remove item listing for "${name}"?`)) {
      setItems(prev => prev.filter(i => i.id !== id));
      addLog(`🗑 Listing withdrawn: ${name}`);
      showToast('Listing withdrawn!');
    }
  };

  // Change PIN handler
  const handleUpdatePIN = async () => {
    if (!oldPin || !newPin || !cfPin) return showToast('Wipe entries before updating', 'error');
    if (!Sec.pin(newPin)) return showToast('PIN must be 4 digits & not listed in guess lists', 'error');
    if (newPin !== cfPin) return showToast('PIN Confirmations do not match', 'error');

    const me = owners.find(o => o.id === session.ownerId);
    if (!me) return;

    let pinMatches = false;
    if (me.legacyPin) {
      pinMatches = Sec._fnvHash(oldPin) === me.pin;
    } else {
      pinMatches = (await Sec.hash(oldPin, me.salt)) === me.pin;
    }

    if (!pinMatches) return showToast('Incorrect current PIN entered code', 'error');

    const newSalt = Math.random().toString(36).slice(2, 12);
    const compiledHash = await Sec.hash(newPin, newSalt);

    setOwners(prev => prev.map(o => o.id === session.ownerId ? { ...o, pin: compiledHash, salt: newSalt, legacyPin: false } : o));
    addLog(`🔐 PIN modified for owner: ${me.name}`);
    showToast('PIN updated successfully!');
    setOldPin('');
    setNewPin('');
    setCfPin('');
  };

  // Security Question updates
  const handleUpdateSecQuestion = async () => {
    if (!secVerPin || !secNewA) return showToast('Verify current PIN and write questions answers', 'error');
    const me = owners.find(o => o.id === session.ownerId);
    if (!me) return;

    let pinMatches = false;
    if (me.legacyPin) {
      pinMatches = Sec._fnvHash(secVerPin) === me.pin;
    } else {
      pinMatches = (await Sec.hash(secVerPin, me.salt)) === me.pin;
    }

    if (!pinMatches) return showToast('Wrong PIN security validation failed', 'error');

    const secAnsString = await Sec.hash(secNewA.trim().toLowerCase(), me.salt);

    setOwners(prev => prev.map(o => o.id === session.ownerId ? { ...o, secQuestion: secNewQ, secAnswer: secAnsString } : o));
    showToast('Security Question Saved successfully!');
    setSecVerPin('');
    setSecNewA('');
  };

  // Process order state status upgrades
  const handleUpdateOrderState = (oId: string, nextStatus: Order['status']) => {
    setOrders(prev => prev.map(ord => {
      if (ord.id === oId) {
        const nextTimeline = [...ord.timeline, { status: nextStatus, time: now() }];
        
        // Return cancelled inventory quantities to stock shelves
        if (nextStatus === 'cancelled') {
          setItems(prevItems => prevItems.map(p => {
            const purchasedItem = ord.items.find(ot => ot.id === p.id);
            if (purchasedItem) {
              return { ...p, stock: p.stock + purchasedItem.qty };
            }
            return p;
          }));
        }

        addLog(`🧾 Order Status Change: ${oId} -> ${nextStatus}`);
        return { ...ord, status: nextStatus, timeline: nextTimeline };
      }
      return ord;
    }));
    showToast(`Order status updated to ${nextStatus.toUpperCase()}`);
  };

  // Interactive Owner Chat box helpers
  const handleSendChat = () => {
    if (!activeChatId || !chatTypeMsg.trim()) return;
    const room = chats[activeChatId] || [];
    const payload: ChatMessage = {
      from: 'me',
      text: chatTypeMsg,
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    };

    const nextRoom = [...room, payload];
    setChats(prev => ({
      ...prev,
      [activeChatId]: nextRoom
    }));

    setChatTypeMsg('');

    // Trigger auto simulation shopper response
    setTimeout(() => {
      const answers = [
        "Are you open currently to proceed the batch?",
        "Please expedite delivery since it is critical.",
        "Could you verify the fresh batch quality once?",
        "Excellent product! Placing recurring orders shortly!"
      ];
      const botResponse: ChatMessage = {
        from: 'them',
        text: answers[Math.floor(Math.random() * answers.length)],
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      };
      setChats(prev => ({
        ...prev,
        [activeChatId]: [...(prev[activeChatId] || []), botResponse]
      }));
    }, 1500);
  };

  // Helper reader to load file base64
  const readBase64Image = (e: React.ChangeEvent<HTMLInputElement>, setter: (s: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return showToast('Single attachment limit 2MB', 'error');
    const reader = new FileReader();
    reader.onload = (evt) => setter(evt.target?.result as string);
    reader.readAsDataURL(file);
  };

  // Inline editing save commands
  const saveShopEdit = () => {
    if (!editingShop) return;
    setShops(prev => prev.map(s => s.id === editingShop.id ? editingShop : s));
    addLog(`🏪 Updated shop profile: ${editingShop.name}`);
    showToast('Store settings saved successfully!');
    setEditingShop(null);
  };

  const saveProductEdit = () => {
    if (!editingProd) return;
    setItems(prev => prev.map(p => p.id === editingProd.id ? editingProd : p));
    addLog(`📦 Updated product settings: ${editingProd.name}`);
    showToast('Product variables modified!');
    setEditingProd(null);
  };

  // Analytics
  const myTotalRevenue = myOrders.filter(o => o.status !== 'cancelled').reduce((acc, current) => acc + current.total, 0);

  return (
    <div className="v-owner show" style={{ display: 'block' }}>
      <div className="pnl-hd">
        <h3>🏪 Seller Control Dashboard</h3>
        <p>Merchant console for shop networks in Vidisha</p>
      </div>

      <div style={{ background: '#fff', borderRadius: '13px', padding: '11px 14px', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: 'var(--sm)', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <div style={{ width: '36px', height: '36px', background: 'var(--g1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyItems: 'center', color: '#fff', fontSize: '16px', flexShrink: 0, justifyContent: 'center' }}>👤</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '13px', color: '#1a1a2e' }}>{session.name} ({session.phone})</div>
            <div style={{ fontSize: '10px', color: '#999' }}>Account Owner ID: {session.ownerId}</div>
          </div>
        </div>
        <button onClick={onLogout} style={{ background: 'var(--g2)', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: '50px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins' }}>
          🚪 Terminate Session
        </button>
      </div>

      <div className="pnl-tabs">
        <button className={`ptab ${activeTab === 'shops' ? 'on' : ''}`} onClick={() => setActiveTab('shops')}>🏪 My Shops</button>
        <button className={`ptab ${activeTab === 'products' ? 'on' : ''}`} onClick={() => setActiveTab('products')}>📦 My Products</button>
        <button className={`ptab ${activeTab === 'orders' ? 'on' : ''}`} onClick={() => setActiveTab('orders')}>🧾 Client Orders</button>
        <button className={`ptab ${activeTab === 'sales' ? 'on' : ''}`} onClick={() => setActiveTab('sales')}>📊 Performance</button>
        <button className={`ptab ${activeTab === 'chats' ? 'on' : ''}`} onClick={() => setActiveTab('chats')}>💬 Live Chats</button>
        <button className={`ptab ${activeTab === 'settings' ? 'on' : ''}`} onClick={() => setActiveTab('settings')}>⚙️ Settings</button>
      </div>

      {/* SHOPS TAB */}
      {activeTab === 'shops' && (
        <div className="ptab-sec on">
          <div className="pcard-title">Register New Marketplace Shop</div>
          <div className="pcard">
            <div className="fg">
              <label>Shop/Store Name *</label>
              <input placeholder="e.g. Sahu Kirana and General Stores" value={sName} onChange={e => setSName(e.target.value)} />
            </div>
            <div className="fg">
              <label>Market Category *</label>
              <select value={sCat} onChange={e => setSCat(e.target.value)}>
                <option value="">— Select Category —</option>
                <option>🩺 Medical & Pharmacy</option>
                <option>🛒 Grocery & Supermarket</option>
                <option>🍱 Tiffin & Food Service</option>
                <option>📱 Mobile & Electronics</option>
                <option>🛠️ Services & Repair</option>
                <option>👗 Fashion & Clothing</option>
                <option>📚 Books & Stationery</option>
                <option>🏠 Home & Garden</option>
                <option>💎 Jewellery</option>
                <option>🍰 Bakery & Sweets</option>
                <option>⚽ Sports & Outdoors</option>
                <option>🎨 Art & Crafts</option>
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="fg">
                <label>Seller Phone *</label>
                <input placeholder="10 digits" value={sPhone} onChange={e => setSPhone(e.target.value)} />
              </div>
              <div className="fg">
                <label>Vidisha Area/Ward *</label>
                <input placeholder="Sadar Bazaar" value={sArea} onChange={e => setSArea(e.target.value)} />
              </div>
            </div>
            <div className="fg">
              <label>Store Physical Address</label>
              <textarea rows={2} placeholder="Full block / ward layout..." value={sAddr} onChange={e => setSAddr(e.target.value)} />
            </div>
            <div className="fg">
              <label>Store Bio / Catchy Description</label>
              <textarea rows={2} placeholder="Direct from farm organic essentials ..." value={sDesc} onChange={e => setSDesc(e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="fg">
                <label>Operational Hours Opens At</label>
                <input type="time" value={sOpen} onChange={e => setSOpen(e.target.value)} />
              </div>
              <div className="fg">
                <label>Closes At</label>
                <input type="time" value={sClose} onChange={e => setSClose(e.target.value)} />
              </div>
            </div>
            <div className="fg">
              <label>Minimum Store Checkout basket amount (₹)</label>
              <input type="number" placeholder="0" value={sMin} onChange={e => setSMin(e.target.value)} />
            </div>
            <div className="chk-row">
              <input type="checkbox" checked={sDel} id="shopDelChk" onChange={e => setSDel(e.target.checked)} />
              <label htmlFor="shopDelChk">🚚 Provide Home Delivery Logistics</label>
            </div>
            <div className="chk-row">
              <input type="checkbox" checked={s247} id="shop247Chk" onChange={e => setS247(e.target.checked)} />
              <label htmlFor="shop247Chk">🕐 Open 24 Hours (Nocturnal operations)</label>
            </div>
            <div className="fg">
              <label>Select Monetized Plan Level</label>
              <select value={sPlan} onChange={e => setSPlan(e.target.value)}>
                <option value="0">🆓 Free Listing Tier</option>
                <option value="99">🥉 Bronze Verified Tier (₹99/mo)</option>
                <option value="199">🥈 Silver Prime Tier (₹199/mo)</option>
                <option value="299">👑 Gold Premium Leaderboard Tier (₹299/mo)</option>
              </select>
            </div>
            <div className="fg">
              <label>Attach Store Banner Cover Image</label>
              <div className="img-drop">
                <input type="file" accept="image/*" onChange={e => readBase64Image(e, setShopImgBase64)} />
                <p>📎 Pick cover files (Recommended JPG/PNG below 2MB)</p>
              </div>
              {shopImgBase64 && <img className="img-prev" src={shopImgBase64} style={{ display: 'block' }} alt="Shop Preview" />}
            </div>
            <button className="btn-main font-bold" onClick={handleRegShop}>🚀 Register & Go Live</button>
          </div>

          <div style={{ fontWeight: 800, fontSize: '13px', marginBottom: '11px' }}>My Active Shops ({myShops.length})</div>
          {myShops.length === 0 ? (
            <p style={{ color: '#999', fontSize: '12px' }}>Whip up your first shop to start selling on VidishaMart!</p>
          ) : (
            myShops.map(s => (
              <div className="shop-row flex" key={s.id}>
                <div className="sr-info">
                  <div className="sr-icon">
                    <img src={s.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }} />
                  </div>
                  <div>
                    <div className="sr-name" style={{ fontWeight: 800 }}>{s.name}</div>
                    <div className="sr-meta">{s.category} · {s.area} · WhatsApp: {s.phone}</div>
                    {s.status === 'suspended' && <div style={{ color: 'red', fontSize: '10px', fontWeight: 'bold' }}>⚠️ Suspended by Admin</div>}
                  </div>
                </div>
                <div className="sr-acts">
                  <button className="btn-edit" onClick={() => setEditingShop(s)}>✏️ Edit Profile</button>
                  <button className="btn-del" onClick={() => handleDeleteShop(s.id, s.name)}>🗑 Delete</button>
                </div>
              </div>
            ))
          )}

          {/* SHOP EDITING MODAL INLINE Overlay */}
          <AnimatePresence>
            {editingShop && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="pcard mt-4"
              >
                <div className="pcard-title" style={{ color: 'var(--p)' }}>✏️ Editing Shop Profile: {editingShop.name}</div>
                <div className="fg"><label>Store Name</label><input value={editingShop.name} onChange={e => setEditingShop({ ...editingShop, name: e.target.value })} /></div>
                <div className="fg"><label>Category</label><input value={editingShop.category} disabled /></div>
                <div className="fg"><label>Mobile Phone</label><input value={editingShop.phone} onChange={e => setEditingShop({ ...editingShop, phone: e.target.value })} /></div>
                <div className="fg"><label>Address Location</label><textarea value={editingShop.address || ''} onChange={e => setEditingShop({ ...editingShop, address: e.target.value })} /></div>
                <div className="fg"><label>Minimum order</label><input type="number" value={editingShop.minOrder} onChange={e => setEditingShop({ ...editingShop, minOrder: parseFloat(e.target.value) || 0 })} /></div>
                <div className="chk-row">
                  <input type="checkbox" checked={editingShop.delivery} id="editDelCheck" onChange={e => setEditingShop({ ...editingShop, delivery: e.target.checked })} />
                  <label htmlFor="editDelCheck">Provide Home delivery</label>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button className="btn-green" onClick={saveShopEdit}>Save Shop Edits</button>
                  <button className="btn-cancel" onClick={() => setEditingShop(null)}>Cancel</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* PRODUCTS TAB */}
      {activeTab === 'products' && (
        <div className="ptab-sec on">
          <div className="pcard-title">Catalogue New Product Listing</div>
          <div className="pcard">
            <div className="fg">
              <label>Associated Store *</label>
              <select value={iShopSel} onChange={e => setIShopSel(e.target.value)}>
                <option value="">— Select registered store —</option>
                {myShops.map(s => (
                  <option value={s.id} key={s.id}>{s.name} ({s.category})</option>
                ))}
              </select>
            </div>
            <div className="fg">
              <label>Product / Item Title *</label>
              <input placeholder="e.g. Saffola Sunflower Oil 1L" value={iName} onChange={e => setIName(e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="fg">
                <label>Unit Sales Price (₹) *</label>
                <input type="number" placeholder="100.00" value={iPrice} onChange={e => setIPrice(e.target.value)} />
              </div>
              <div className="fg">
                <label>MRP Tag (₹)</label>
                <input type="number" placeholder="120.00" value={iMrp} onChange={e => setIMrp(e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="fg">
                <label>Stock Available Volume</label>
                <input type="number" placeholder="50" value={iStock} onChange={e => setIStock(e.target.value)} />
              </div>
              <div className="fg">
                <label>Low stock alert trigger amount</label>
                <input type="number" placeholder="5" value={iLowAt} onChange={e => setILowAt(e.target.value)} />
              </div>
            </div>
            <div className="fg">
              <label>Identifiable Product Emoji Representation</label>
              <input value={iEmoji} onChange={e => setIEmoji(e.target.value)} />
            </div>
            <div className="fg">
              <label>Search Meta Keywords (comma separated)</label>
              <input placeholder="cooking, oil, refined" value={iTags} onChange={e => setITags(e.target.value)} />
            </div>
            <div className="fg">
              <label>Detailed Item Description</label>
              <textarea placeholder="Provides detailed attributes..." value={iDesc} onChange={e => setIDesc(e.target.value)} />
            </div>
            <div className="fg">
              <label>Product Item Snapshot Image</label>
              <div className="img-drop">
                <input type="file" accept="image/*" onChange={e => readBase64Image(e, setProdImgBase64)} />
                <p>📎 Attach product photos (JPG/PNG below 1MB)</p>
              </div>
              {prodImgBase64 && <img className="img-prev" src={prodImgBase64} style={{ display: 'block' }} alt="Prod Preview" />}
            </div>
            <div className="chk-row">
              <input type="checkbox" checked={iFeat} id="prodFeatCheck" onChange={e => setIFeat(e.target.checked)} />
              <label htmlFor="prodFeatCheck">⭐ Make this a featured banner product</label>
            </div>
            <button className="btn-main font-bold" onClick={handleAddProd}>✦ Catalog Product Item</button>
          </div>

          {/* BULK RESTOCKING BOX */}
          <div className="pcard">
            <div className="pcard-title">📦 Quick Inventory Restocker Center</div>
            <div style={{ display: 'flex', gap: '9px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div className="fg" style={{ flex: 1, minWidth: '130px', margin: 0 }}>
                <label>Target Stock Item</label>
                <select value={bulkSel} onChange={e => setBulkSel(e.target.value)}>
                  <option value="">— Select item —</option>
                  {myProducts.map(p => (
                    <option value={p.id} key={p.id}>{p.name} ({p.shopName}) - Current: {p.stock}</option>
                  ))}
                </select>
              </div>
              <div className="fg" style={{ width: '80px', margin: 0 }}>
                <label>Stock Count</label>
                <input type="number" placeholder="50" value={bulkVal} onChange={e => setBulkVal(e.target.value)} />
              </div>
              <button className="btn-green font-bold" onClick={handleBulkRestock} style={{ padding: '12px 16px', borderRadius: '50px' }}>Apply restock</button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '11px', flexWrap: 'wrap', gap: '7px' }}>
            <span style={{ fontWeight: 800, fontSize: '13px' }}>My Active Catalog ({myProducts.length})</span>
          </div>

          <input className="mb-4" placeholder="🔍 Filter local catalog by keywords..." value={prodSearch} onChange={e => setProdSearch(e.target.value)} style={{ width: '100%', padding: '9px 13px', border: '2px solid #e0e0e0', borderRadius: '50px', fontSize: '12px', outline: 'none' }} />

          <div className="prod-grid">
            {filteredMyProducts.length === 0 ? (
              <p style={{ color: '#999', fontSize: '12px', gridColumn: '1/-1', textAlign: 'center' }}>No catalog records matched keywords.</p>
            ) : (
              filteredMyProducts.map(p => (
                <div className="prod-card" key={p.id}>
                  <div className="prod-img-wrap">
                    {p.img ? <img src={p.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : p.emoji}
                  </div>
                  <div className="prod-body">
                    <div className="prod-name" style={{ fontWeight: 700 }}>{p.name}</div>
                    <div className="prod-shop-nm">{p.shopName}</div>
                    <div className="prod-price">₹{p.price}</div>
                    <div className={p.stock <= 0 ? 'stk-out' : p.stock <= p.lowStockAt ? 'stk-low' : 'stk-ok'}>
                      Stock shelves: {p.stock} units
                    </div>
                    <div className="prod-row" style={{ marginTop: '8px' }}>
                      <button className="btn-edit" onClick={() => setEditingProd(p)}>✏️ Edit</button>
                      <button className="btn-del" onClick={() => handleDeleteProd(p.id, p.name)}>🗑 Delete</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* PRODUCT EDIT OVERLAY BOX */}
          <AnimatePresence>
            {editingProd && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="pcard mt-4"
              >
                <div className="pcard-title" style={{ color: 'var(--p)' }}>✏️ Modify Product: {editingProd.name}</div>
                <div className="fg"><label>Product Name</label><input value={editingProd.name} onChange={e => setEditingProd({ ...editingProd, name: e.target.value })} /></div>
                <div className="fg"><label>Unit price (₹)</label><input type="number" value={editingProd.price} onChange={e => setEditingProd({ ...editingProd, price: parseFloat(e.target.value) || 0 })} /></div>
                <div className="fg"><label>MRP Price tag (₹)</label><input type="number" value={editingProd.orgPrice || 0} onChange={e => setEditingProd({ ...editingProd, orgPrice: parseFloat(e.target.value) || 0 })} /></div>
                <div className="fg"><label>Shelved Inventory stock</label><input type="number" value={editingProd.stock} onChange={e => setEditingProd({ ...editingProd, stock: parseInt(e.target.value) || 0 })} /></div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button className="btn-green" onClick={saveProductEdit}>Save Product variable changes</button>
                  <button className="btn-cancel" onClick={() => setEditingProd(null)}>Cancel</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ORDERS TAB */}
      {activeTab === 'orders' && (
        <div className="ptab-sec on">
          <div style={{ fontWeight: 800, fontSize: '13px', marginBottom: '11px' }}>Order Processing Desk</div>
          {myOrders.length === 0 ? (
            <p style={{ color: '#999', fontSize: '12px' }}>No orders listed for your stores yet.</p>
          ) : (
            myOrders.map(o => {
              const myTargetItems = o.items.filter(i => myShopIds.has(i.shopRef));
              return (
                <div className={`ord-card st-${o.status}`} key={o.id}>
                  <div className="ord-id">
                    {o.id}{' '}
                    <span className="ord-st-badge">{o.status.toUpperCase().replace(/_/g, ' ')}</span>
                  </div>
                  <div style={{ fontSize: '12px', margin: '4px 0', borderBottom: '1px dashed #eee', paddingBottom: '4px' }}>
                    {myTargetItems.map(item => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>• {item.name} × {item.qty}</span>
                        <strong>₹{item.price * item.qty}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="ord-cust" style={{ marginTop: '5px' }}>
                    👤 <strong>Client:</strong> {o.customer.name} | Phone: {o.customer.phone}
                    <div style={{ fontSize: '10px', color: '#999' }}>Address: {o.customer.address}</div>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--p)', marginTop: '4px' }}>
                    Grand invoice total: ₹{o.total}
                  </div>
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '10px' }}>
                    {o.status === 'pending' && (
                      <button className="btn-green" onClick={() => handleUpdateOrderState(o.id, 'confirmed')}>✅ Accept & Confirm</button>
                    )}
                    {o.status === 'confirmed' && (
                      <button className="btn-green" onClick={() => handleUpdateOrderState(o.id, 'preparing')}>👨‍🍳 Prepare & Pack</button>
                    )}
                    {o.status === 'preparing' && (
                      <button className="btn-green" onClick={() => handleUpdateOrderState(o.id, 'out_for_delivery')}>🚚 Out for Delivery</button>
                    )}
                    {o.status === 'out_for_delivery' && (
                      <button className="btn-green" onClick={() => handleUpdateOrderState(o.id, 'delivered')}>📦 Deliver order</button>
                    )}
                    {['pending', 'confirmed', 'preparing'].includes(o.status) && (
                      <button className="btn-del" onClick={() => handleUpdateOrderState(o.id, 'cancelled')}>✕ Cancel</button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* SALES TAB */}
      {activeTab === 'sales' && (
        <div className="ptab-sec on">
          <div className="dash-grid">
            <div className="dsc green">
              <div className="dsc-num">₹{myTotalRevenue}</div>
              <div className="dsc-lbl">Net revenue</div>
            </div>
            <div className="dsc blue">
              <div className="dsc-num">{myOrders.filter(o => o.status === 'delivered').length}</div>
              <div className="dsc-lbl">Fulfillment count</div>
            </div>
          </div>

          <div style={{ fontWeight: 800, fontSize: '13px', marginBottom: '11px' }}>Shop revenue performance charts</div>
          <div className="pcard">
            {myShops.map(s => {
              const shopOrders = myOrders.filter(o => o.status !== 'cancelled' && o.items.some(i => i.shopRef === s.id));
              const shopRev = shopOrders.reduce((acc, current) => {
                const myParts = current.items.filter(it => it.shopRef === s.id);
                return acc + myParts.reduce((sAcc, i) => sAcc + (i.price * i.qty), 0);
              }, 0);
              return (
                <div className="shop-row flex" key={s.id}>
                  <strong>🏪 {s.name}</strong>
                  <span style={{ fontWeight: 800, color: 'var(--p)' }}>₹{shopRev} gross</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CHATS TAB */}
      {activeTab === 'chats' && (
        <div className="ptab-sec on">
          <div style={{ display: 'grid', gridTemplateColumns: activeChatId ? '1fr 1fr' : '1fr', gap: '10px' }}>
            <div className="pcard">
              <div className="pcard-title">My Chat Rooms</div>
              {Object.keys(chats).length === 0 ? (
                <p style={{ color: '#999', fontSize: '12px' }}>No user chat logs established yet.</p>
              ) : (
                Object.entries(chats).map(([partnerId, roomMsgs]) => {
                  const shop = shops.find(s => s.id === partnerId);
                  const latest = roomMsgs[roomMsgs.length - 1];
                  return (
                    <div className={`ord-card ${activeChatId === partnerId ? 'st-confirmed' : ''}`} key={partnerId} onClick={() => setActiveChatId(partnerId)}>
                      <strong>🏪 {shop ? shop.name : partnerId}</strong>
                      <p style={{ fontSize: '11px', color: '#666', marginTop: '3px' }}>
                        {latest ? `${latest.from === 'me' ? 'You' : 'shopper'}: ${latest.text}` : 'Empty state'}
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            <AnimatePresence>
              {activeChatId && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="pcard"
                >
                  <div className="pcard-title">💬 Shopper room: {shops.find(s => s.id === activeChatId)?.name || 'Shopper'}</div>
                  <div className="chat-list" style={{ minHeight: '180px', maxHeight: '250px' }}>
                    {(chats[activeChatId] || []).map((m, idx) => (
                      <div className={`chat-msg ${m.from === 'me' ? 'me' : 'them'}`} key={idx}>
                        <div className="chat-bubble">{m.text}</div>
                        <span className="chat-time">{m.time}</span>
                      </div>
                    ))}
                  </div>
                  <div className="chat-input-row">
                    <input placeholder="Type response..." value={chatTypeMsg} onChange={e => setChatTypeMsg(e.target.value)} onKeyDown={evt => evt.key === 'Enter' && handleSendChat()} />
                    <button className="chat-send-btn" onClick={handleSendChat}>Send</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* SETTINGS TAB */}
      {activeTab === 'settings' && (
        <div className="ptab-sec on">
          {/* SECURITY PASSCODES PANEL */}
          <div className="pcard animate-fadeIn">
            <div className="pcard-title">🔐 Alter Account Security PIN Access</div>
            <div className="fg">
              <label>Current Account PIN</label>
              <input type="password" maxLength={4} value={oldPin} onChange={e => setOldPin(e.target.value)} />
            </div>
            <div className="fg">
              <label>Choose New PIN Code</label>
              <input type="password" maxLength={4} value={newPin} onChange={e => setNewPin(e.target.value)} />
            </div>
            <div className="fg">
              <label>Confirm PIN Code</label>
              <input type="password" maxLength={4} value={cfPin} onChange={e => setCfPin(e.target.value)} />
            </div>
            <button className="btn-main" onClick={handleUpdatePIN}>Update PIN Code</button>
          </div>

          {/* SEC QUESTIONS RECOVERY */}
          <div className="pcard animate-fadeIn">
            <div className="pcard-title">🛡️ Secure Account PIN Recover Hint Setting</div>
            <div className="fg">
              <label>Current PIN confirmation</label>
              <input type="password" maxLength={4} value={secVerPin} onChange={e => setSecVerPin(e.target.value)} />
            </div>
            <div className="fg">
              <label>Select Hint Challenge Question</label>
              <select value={secNewQ} onChange={e => setSecNewQ(e.target.value)}>
                <option value="What is your mother's maiden name?">What is your mother's maiden name?</option>
                <option value="What was your first pet's name?">What was your first pet's name?</option>
                <option value="What city were you born in?">What city were you born in?</option>
                <option value="What is your favourite food?">What is your favourite food?</option>
                <option value="What was your first school's name?">What was your first school's name?</option>
              </select>
            </div>
            <div className="fg">
              <label>Secret Hint Answer</label>
              <input placeholder="hints answer string (not case sensitive)" value={secNewA} onChange={e => setSecNewA(e.target.value)} />
            </div>
            <button className="btn-main font-bold" onClick={handleUpdateSecQuestion}>Save Recovery hint parameters</button>
          </div>
        </div>
      )}
    </div>
  );
}
