import React, { useState, useEffect } from 'react';
import { CheckCircle, X, Search, Eye, EyeOff, Plus, ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const Toast = ({ message, type = 'success', onClose }) => (
  <div className={`toast ${type}`}>
    <CheckCircle size={20} />
    <span>{message}</span>
    <button className="close-btn" onClick={onClose}><X size={18} /></button>
  </div>
);

// --- LocalStorage Helpers ---
const loadData = () => {
  const w = JSON.parse(localStorage.getItem('wt_workers') || '[]');
  const l = JSON.parse(localStorage.getItem('wt_logs') || '[]');
  return { w, l };
};

const saveData = (w, l) => {
  localStorage.setItem('wt_workers', JSON.stringify(w));
  localStorage.setItem('wt_logs', JSON.stringify(l));
};

function calculateHours(start, end) {
  if (!start || !end || start === '-' || end === '-') return 0;
  const [h1, m1] = start.split(':').map(Number);
  const [h2, m2] = end.split(':').map(Number);
  let d1 = new Date(); d1.setHours(h1, m1, 0);
  let d2 = new Date(); d2.setHours(h2, m2, 0);
  if (d2 < d1) d2.setDate(d2.getDate() + 1);
  const diffMs = d2 - d1;
  return Math.round((diffMs / 3600000) * 100) / 100;
}

const getEnhancedWorkers = () => {
  const { w, l } = loadData();
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const currentMonth = now.toISOString().slice(0, 7);

  const enhanced = w.map(worker => {
      const workerLogs = l.filter(log => log.worker_id === worker.id);
      
      let totalHours7Days = 0;
      let totalHoursMonth = 0;
      let weeklyDataArr = [0, 0, 0, 0, 0, 0, 0];

      workerLogs.forEach(log => {
          const logDate = new Date(log.date);
          if (logDate >= sevenDaysAgo) {
              totalHours7Days += log.hours;
              weeklyDataArr[logDate.getDay()] += log.hours;
          }
          if (log.date.startsWith(currentMonth)) {
              totalHoursMonth += log.hours;
          }
      });

      const weeklyData = [
          { name: 'Dush', h: weeklyDataArr[1] },
          { name: 'Sesh', h: weeklyDataArr[2] },
          { name: 'Chor', h: weeklyDataArr[3] },
          { name: 'Pay', h: weeklyDataArr[4] },
          { name: 'Juma', h: weeklyDataArr[5] },
          { name: 'Shan', h: weeklyDataArr[6] },
          { name: 'Yak', h: weeklyDataArr[0] }
      ];

      return { ...worker, totalHours7Days, totalHoursMonth, weeklyData };
  });

  enhanced.sort((a, b) => b.totalHours7Days - a.totalHours7Days);
  return enhanced;
};
// ----------------------------

function App() {
  const [auth, setAuth] = useState(localStorage.getItem('auth') === 'true');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [toast, setToast] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWorkerData, setNewWorkerData] = useState({ name: '', start: '08:00', end: '16:00' });
  
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [showMaosh, setShowMaosh] = useState(false);
  
  const [lang, setLang] = useState('uz');

  useEffect(() => {
    if (auth) {
      fetchWorkers();
      showToast('Welcome to WorkTrack!');
    }
  }, [auth]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === 'sardor2007') {
      localStorage.setItem('auth', 'true');
      setAuth(true);
    } else {
      showToast('Xato parol!', 'error');
    }
  };

  const fetchWorkers = () => {
    const data = getEnhancedWorkers();
    setWorkers(data);
    if (selectedWorker) {
       const updated = data.find(w => w.id === selectedWorker.id);
       if (updated) setSelectedWorker(updated);
    }
  };

  const handleSmartInput = async (e) => {
    if (e.key === 'Enter') {
      setShowDropdown(false);
      const val = searchInput.trim().toLowerCase();
      
      if (val.includes('keldi') && val.includes('ketdi')) {
        const nameMatch = searchInput.match(/^([a-zA-Zа-яА-Я]+)/);
        const times = searchInput.match(/\d{1,2}:\d{2}/g);
        
        if (nameMatch && times && times.length === 2) {
            const name = nameMatch[1];
            const start = times[0];
            const end = times[1];
            saveWorkerTime(name, start, end);
        }
      }
    }
  };

  const saveWorkerTime = (name, start, end) => {
     let { w, l } = loadData();
     
     // Find or create worker
     let worker = w.find(wrk => wrk.name.toLowerCase() === name.toLowerCase());
     if (!worker) {
         worker = { id: Date.now().toString(), name };
         w.push(worker);
     }

     const today = new Date().toISOString().slice(0, 10);
     let existingLog = l.find(log => log.worker_id === worker.id && log.date === today);

     if (existingLog) {
         existingLog.start_time = start;
         existingLog.end_time = end;
         existingLog.hours = calculateHours(start, end);
     } else {
         const hours = calculateHours(start, end);
         l.push({
             id: Date.now().toString() + Math.random().toString(),
             worker_id: worker.id,
             date: today,
             start_time: start,
             end_time: end,
             hours,
             status: 'keldi/ketdi'
         });
     }

     saveData(w, l);
     showToast(`✅ ${name} saqlandi`);
     setSearchInput('');
     fetchWorkers();
  };

  const handleModalSubmit = (e) => {
     e.preventDefault();
     if (!newWorkerData.name) {
        showToast("Ismni kiriting", "error");
        return;
     }
     saveWorkerTime(newWorkerData.name, newWorkerData.start, newWorkerData.end);
     setShowAddModal(false);
     setNewWorkerData({ name: '', start: '08:00', end: '16:00' });
  };

  const handleDeleteWorker = (e, id) => {
     e.stopPropagation();
     if (window.confirm("Rostdan ham bu ishchini o'chirmoqchimisiz?")) {
         let { w, l } = loadData();
         w = w.filter(worker => worker.id !== id);
         l = l.filter(log => log.worker_id !== id);
         saveData(w, l);
         showToast("Ishchi o'chirildi", "success");
         fetchWorkers();
         if (selectedWorker && selectedWorker.id === id) {
             setSelectedWorker(null);
         }
     }
  };

  const handleEditWorker = (e, worker) => {
     e.stopPropagation();
     const newName = window.prompt("Ishchining yangi ismini kiriting:", worker.name);
     if (newName && newName.trim() !== "") {
         let { w, l } = loadData();
         const target = w.find(wrk => wrk.id === worker.id);
         if (target) {
             target.name = newName;
             saveData(w, l);
             showToast("Ism o'zgartirildi", "success");
             fetchWorkers();
         }
     }
  };

  // Render Login Screen
  if (!auth) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <h2>Login</h2>
          <form onSubmit={handleLogin}>
            <div className="login-input-group">
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <div className="eye-icon" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </div>
            </div>
            <button type="submit" className="login-btn">Kirish</button>
          </form>
        </div>
        {toast && <div className="toast-container"><Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} /></div>}
      </div>
    );
  }

  const showAll = searchInput.toLowerCase() === 'hamma ishchilar';
  const displayWorkers = showAll ? workers : searchInput ? workers.filter(w => w.name.toLowerCase().includes(searchInput.toLowerCase())) : [];

  // Chart Colors
  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <>
      {toast && (
        <div className="toast-container">
          <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />
        </div>
      )}

      {/* Navbar */}
      <nav className="navbar">
        <div className="nav-logo">WorkTrack</div>
        <div className="nav-links">
          <a className={`nav-link ${!showMaosh ? 'active' : ''}`} onClick={() => setShowMaosh(false)}>Asosiy</a>
          <a className={`nav-link ${showMaosh ? 'active' : ''}`} onClick={() => setShowMaosh(true)}>Maosh <span className="coming-soon">Coming soon</span></a>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={() => { localStorage.removeItem('auth'); setAuth(false); }} className="btn btn-outline" style={{ padding: '6px 10px' }} title="Chiqish">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          </button>
        </div>
      </nav>

      {showMaosh ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
           <h1 style={{ fontSize: '4rem', background: 'linear-gradient(135deg, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: '0 0 20px 0' }}>Coming Soon</h1>
           <p style={{ fontSize: '1.2rem', color: '#94a3b8' }}>Next Update v3.0</p>
        </div>
      ) : (
        <div className="container">
          
          {/* Smart Search with Dropdown */}
        <div className="smart-input-wrapper">
          <Search size={20} color="#94a3b8" style={{ position: 'absolute', left: 16, top: 18 }} />
          <input 
            type="text" 
            className="smart-input" 
            style={{ paddingLeft: 46 }}
            placeholder="Ism yozing..."
            value={searchInput}
            onChange={e => { setSearchInput(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            onKeyDown={handleSmartInput}
          />
          {showDropdown && (
            <div className="dropdown">
              <div className="dropdown-item" onClick={() => { setSearchInput('hamma ishchilar'); setShowDropdown(false); }}>
                 <Search size={16}/> Hamma ishchilar
              </div>
              <div className="dropdown-item" onClick={() => { setShowAddModal(true); setShowDropdown(false); }}>
                 <Plus size={16}/> Yangi ishchi qo'shish
              </div>
            </div>
          )}
        </div>

        {/* Title for Reyting */}
        {showAll && (
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ margin: 0, color: '#60a5fa' }}>Reyting (Top)</h3>
          </div>
        )}

        {/* Worker Cards */}
        {displayWorkers.map((w, i) => (
          <div className="worker-card" key={w.id} onClick={() => setSelectedWorker(w)}>
            <div className="worker-card-header" style={{ width: '100%', cursor: 'pointer' }}>
              <div className="worker-info">
                {showAll && <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#60a5fa' }}>{i + 1}</div>}
                <h3>{w.name}</h3>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-outline" style={{ padding: '6px' }} onClick={(e) => handleEditWorker(e, w)} title="Tahrirlash">
                   <Pencil size={16} />
                </button>
                <button className="btn btn-outline" style={{ padding: '6px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }} onClick={(e) => handleDeleteWorker(e, w.id)} title="O'chirish">
                   <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Floating Instructions */}
        <div className="instructions-floating">
          Qoida: 'hamma ishchilar' - reyting. 'Asadbek keldi 08:00 ketdi 16:00' - saqlash.
        </div>
      </div>
      )}

      {/* Add Worker Modal */}
      {showAddModal && (
        <div className="modal-overlay">
           <div className="modal-content">
              <button className="modal-close" onClick={() => setShowAddModal(false)}><X size={24}/></button>
              <h2 style={{ marginTop: 0, marginBottom: 24 }}>Yangi ishchi qo'shish</h2>
              <form onSubmit={handleModalSubmit}>
                 <div className="form-group">
                    <label>Ishchi Ismi</label>
                    <input type="text" placeholder="Masalan: Asadbek" value={newWorkerData.name} onChange={e => setNewWorkerData({...newWorkerData, name: e.target.value})} required />
                 </div>
                 <div className="form-group">
                    <label>Kelgan vaqti (Soat:Daqiqa)</label>
                    <input type="time" value={newWorkerData.start} onChange={e => setNewWorkerData({...newWorkerData, start: e.target.value})} />
                 </div>
                 <div className="form-group">
                    <label>Ketgan vaqti (Soat:Daqiqa)</label>
                    <input type="time" value={newWorkerData.end} onChange={e => setNewWorkerData({...newWorkerData, end: e.target.value})} />
                 </div>
                 <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}>Saqlash</button>
              </form>
           </div>
        </div>
      )}

      {/* Worker Stats Modal */}
      {selectedWorker && (
        <div className="modal-overlay">
           <div className="modal-content large">
              <button className="modal-close" onClick={() => setSelectedWorker(null)}><X size={24}/></button>
              <h2 style={{ marginTop: 0, color: '#60a5fa' }}>{selectedWorker.name} - Statistikasi</h2>
              
              <div className="stats-grid">
                 <div className="stat-box">
                    <h4>7 Kunlik (Jami)</h4>
                    <div className="value">{selectedWorker.totalHours7Days} soat</div>
                 </div>
                 <div className="stat-box">
                    <h4>Oylik (Jami)</h4>
                    <div className="value">{selectedWorker.totalHoursMonth} soat</div>
                 </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '30px', marginTop: '30px' }}>
                 {/* Bar Chart */}
                 <div style={{ flex: '1 1 300px', height: 250, background: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 12 }}>
                    <h4 style={{ textAlign: 'center', color: '#94a3b8', margin: '0 0 15px 0' }}>Haftalik Progress</h4>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={selectedWorker.weeklyData || []}>
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false}/>
                        <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{backgroundColor: '#0f172a', border:'1px solid #333', borderRadius: 8}}/>
                        <Bar dataKey="h" fill="#3b82f6" radius={[6,6,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                 </div>

                 {/* Donut Chart */}
                 <div style={{ flex: '1 1 300px', height: 250, background: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 12 }}>
                    <h4 style={{ textAlign: 'center', color: '#94a3b8', margin: '0 0 15px 0' }}>Oylik Norma</h4>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={[
                           { name: 'Ishladi', value: selectedWorker.totalHoursMonth > 0 ? selectedWorker.totalHoursMonth : 1 },
                           { name: 'Qoldi', value: 160 - selectedWorker.totalHoursMonth > 0 ? 160 - selectedWorker.totalHoursMonth : 159 }
                        ]} innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                           <Cell fill="#10b981" />
                           <Cell fill="rgba(255,255,255,0.05)" />
                        </Pie>
                        <Tooltip contentStyle={{backgroundColor: '#0f172a', border:'1px solid #333', borderRadius: 8}}/>
                      </PieChart>
                    </ResponsiveContainer>
                 </div>
              </div>

           </div>
        </div>
      )}

    </>
  );
}

export default App;
