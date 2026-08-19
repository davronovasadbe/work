import React, { useState, useEffect } from 'react';
import { CheckCircle, X, Search, Eye, EyeOff, Plus, ArrowLeft, Pencil, Trash2, ChevronLeft, UserX, Clock } from 'lucide-react';

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

function calculateHours(start, end, lunchMins = 0) {
  if (!start || !end || start === '-' || end === '-') return 0;
  const [h1, m1] = start.split(':').map(Number);
  const [h2, m2] = end.split(':').map(Number);
  let d1 = new Date(); d1.setHours(h1, m1, 0);
  let d2 = new Date(); d2.setHours(h2, m2, 0);
  if (d2 < d1) d2.setDate(d2.getDate() + 1);
  let diffMs = d2 - d1;
  diffMs -= (lunchMins * 60000);
  if (diffMs < 0) diffMs = 0;
  return Math.round((diffMs / 3600000) * 100) / 100;
}

const getEnhancedWorkers = () => {
  const { w, l } = loadData();

  const enhanced = w.map(worker => {
      const workerLogs = l.filter(log => log.worker_id === worker.id).sort((a, b) => new Date(b.date) - new Date(a.date));
      
      let totalAllTimeHours = 0;
      workerLogs.forEach(log => {
          if(log.status !== 'kelmadi') {
              totalAllTimeHours += log.hours || 0;
          }
      });
      
      const rate = worker.hourlyRate || 20000;
      const totalSalary = totalAllTimeHours * rate;

      return { ...worker, hourlyRate: rate, logs: workerLogs, totalAllTimeHours, totalSalary };
  });

  enhanced.sort((a, b) => b.totalAllTimeHours - a.totalAllTimeHours);
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
  const [newWorkerData, setNewWorkerData] = useState({ name: '', start: '08:00', end: '16:00', rate: 20000, lunch: 60 });
  
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [showMaosh, setShowMaosh] = useState(false);
  
  // Rate Edit
  const [editingRate, setEditingRate] = useState('');
  const [editingLunch, setEditingLunch] = useState(60);
  const [editingStart, setEditingStart] = useState('08:00');
  const [editingEnd, setEditingEnd] = useState('16:00');

  useEffect(() => {
    if (auth) {
      fetchWorkers();
      if(!localStorage.getItem('welcomed')) {
         showToast('Welcome to WorkTrack!');
         localStorage.setItem('welcomed', 'true');
      }
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
       if (updated) {
           setSelectedWorker(updated);
           setEditingRate(updated.hourlyRate);
       }
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
            saveWorkerTime(name, start, end, 'keldi', null, 60);
        }
      }
    }
  };

  const saveWorkerTime = (name, start, end, status = 'keldi', rate = null, lunchMins = 0) => {
     let { w, l } = loadData();
     
     // Find or create worker
     let worker = w.find(wrk => wrk.name.toLowerCase() === name.toLowerCase());
     if (!worker) {
         worker = { id: Date.now().toString(), name, hourlyRate: rate || 20000 };
         w.push(worker);
     } else if (rate !== null) {
         worker.hourlyRate = rate;
     }

     const today = new Date().toISOString().slice(0, 10);
     let existingLog = l.find(log => log.worker_id === worker.id && log.date === today);

     if (existingLog) {
         existingLog.start_time = start;
         existingLog.end_time = end;
         existingLog.status = status;
         existingLog.lunchMins = lunchMins;
         existingLog.hours = status === 'kelmadi' ? 0 : calculateHours(start, end, lunchMins);
     } else {
         const hours = status === 'kelmadi' ? 0 : calculateHours(start, end, lunchMins);
         l.push({
             id: Date.now().toString() + Math.random().toString(),
             worker_id: worker.id,
             date: today,
             start_time: start,
             end_time: end,
             lunchMins,
             hours,
             status
         });
     }

     saveData(w, l);
     showToast(`✅ Ma'lumot saqlandi`);
     setSearchInput('');
     fetchWorkers();
  };

  const markAbsent = (workerName) => {
     saveWorkerTime(workerName, '-', '-', 'kelmadi', null, 0);
  };

  const handleModalSubmit = (e) => {
     e.preventDefault();
     if (!newWorkerData.name) {
        showToast("Ismni kiriting", "error");
        return;
     }
     saveWorkerTime(newWorkerData.name, newWorkerData.start, newWorkerData.end, 'keldi', Number(newWorkerData.rate), Number(newWorkerData.lunch));
     setShowAddModal(false);
     setNewWorkerData({ name: '', start: '08:00', end: '16:00', rate: 20000, lunch: 60 });
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

  const saveRate = () => {
      if(!selectedWorker) return;
      let { w, l } = loadData();
      const target = w.find(wrk => wrk.id === selectedWorker.id);
      if (target) {
          target.hourlyRate = Number(editingRate);
          saveData(w, l);
          showToast("Ish haqi yangilandi", "success");
          fetchWorkers();
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
          <div className="worker-card" key={w.id} onClick={() => { setSelectedWorker(w); setEditingRate(w.hourlyRate); }}>
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
                    <label>Soatbay ish haqi (So'm)</label>
                    <input type="number" value={newWorkerData.rate} onChange={e => setNewWorkerData({...newWorkerData, rate: e.target.value})} />
                 </div>
                 <div className="form-group">
                    <label>Bugun Kelgan vaqti (Soat:Daqiqa)</label>
                    <input type="time" value={newWorkerData.start} onChange={e => setNewWorkerData({...newWorkerData, start: e.target.value})} />
                 </div>
                 <div className="form-group">
                    <label>Bugun Ketgan vaqti (Soat:Daqiqa)</label>
                    <input type="time" value={newWorkerData.end} onChange={e => setNewWorkerData({...newWorkerData, end: e.target.value})} />
                 </div>
                 <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}>Saqlash</button>
              </form>
           </div>
        </div>
      )}

      {/* Worker Stats Modal (Full screen on mobile) */}
      {selectedWorker && (
        <div className="fullscreen-overlay mobile-fullscreen">
           <div className="fullscreen-content mobile-fullscreen-content">
              
              <div className="fs-header">
                 <button className="fs-back" onClick={() => setSelectedWorker(null)}><ChevronLeft size={28}/> Orqaga</button>
                 <h2 style={{ margin: 0, color: '#60a5fa' }}>{selectedWorker.name}</h2>
              </div>
              
              <div className="fs-body">
                  {/* Financials & Rate */}
                  <div className="fs-card glass-panel" style={{ marginBottom: 20 }}>
                     <div style={{ display: 'flex', gap: 15, flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '120px' }}>
                            <label style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Jami Ishlangan (Soat)</label>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{selectedWorker.totalAllTimeHours}</div>
                        </div>
                        <div style={{ flex: 1, minWidth: '150px' }}>
                            <label style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Umumiy Maosh (So'm)</label>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>
                                {selectedWorker.totalSalary.toLocaleString()}
                            </div>
                        </div>
                     </div>
                     <div style={{ marginTop: 15, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 15, display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                        <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                            <label>1 Soatlik Narx (So'm)</label>
                            <input type="number" value={editingRate} onChange={e => setEditingRate(e.target.value)} style={{ padding: '8px 12px' }}/>
                        </div>
                        <button className="btn btn-primary" onClick={saveRate} style={{ padding: '9px 15px' }}>Saqlash</button>
                     </div>
                  </div>

                  {/* Actions for Today */}
                  <div className="fs-card glass-panel" style={{ marginBottom: 20 }}>
                     <h4 style={{ margin: '0 0 15px 0', color: '#f8fafc' }}>Bugungi kunni kiritish</h4>
                     <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 15 }}>
                         <div className="form-group" style={{ flex: 1, minWidth: '100px', marginBottom: 0 }}>
                            <label>Kelgan vaqti</label>
                            <input type="time" value={editingStart} onChange={e => setEditingStart(e.target.value)} />
                         </div>
                         <div className="form-group" style={{ flex: 1, minWidth: '100px', marginBottom: 0 }}>
                            <label>Ketgan vaqti</label>
                            <input type="time" value={editingEnd} onChange={e => setEditingEnd(e.target.value)} />
                         </div>
                         <div className="form-group" style={{ flex: 1, minWidth: '100px', marginBottom: 0 }}>
                            <label>Obed (Daqiqa)</label>
                            <input type="number" value={editingLunch} onChange={e => setEditingLunch(Number(e.target.value))} />
                         </div>
                     </div>
                     <div style={{ display: 'flex', gap: 10 }}>
                         <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.4)', padding: '10px' }} onClick={() => saveWorkerTime(selectedWorker.name, editingStart, editingEnd, 'keldi', null, editingLunch)}>
                             <Clock size={18}/> Keldi
                         </button>
                         <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)', padding: '10px' }} onClick={() => markAbsent(selectedWorker.name)}>
                             <UserX size={18}/> Kelmadi
                         </button>
                     </div>
                  </div>

                  {/* History List */}
                  <h3 style={{ color: '#f8fafc', marginBottom: 15 }}>Tarix (Spiska)</h3>
                  {selectedWorker.logs.length === 0 ? (
                      <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>Hech qanday tarix yo'q</div>
                  ) : (
                      <div className="history-list custom-scroll">
                          {selectedWorker.logs.map(log => (
                              <div key={log.id} className="history-item">
                                  <div className="history-date">
                                      {new Date(log.date).toLocaleDateString('uz-UZ', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                                  </div>
                                  <div className="history-details">
                                      {log.status === 'kelmadi' ? (
                                          <span style={{ color: '#ef4444', fontWeight: 'bold', padding: '4px 10px', background: 'rgba(239,68,68,0.1)', borderRadius: 8 }}>Kelmadi</span>
                                      ) : (
                                          <>
                                            <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{log.start_time} - {log.end_time}</span>
                                            <span style={{ fontWeight: 'bold', color: '#60a5fa', background: 'rgba(96,165,250,0.1)', padding: '4px 10px', borderRadius: 8 }}>{log.hours} soat</span>
                                            <span style={{ fontWeight: 'bold', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '4px 10px', borderRadius: 8 }}>
                                                {((log.hours || 0) * (selectedWorker.hourlyRate || 20000)).toLocaleString()} so'm
                                            </span>
                                          </>
                                      )}
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>

           </div>
        </div>
      )}

    </>
  );
}

export default App;
