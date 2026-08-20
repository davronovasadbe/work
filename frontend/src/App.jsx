import React, { useState, useEffect } from 'react';
import { CheckCircle, X, Search, Eye, EyeOff, Plus, ChevronLeft, UserX, Clock, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

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

const groupLogsByWeeks = (logs, rate) => {
    const ascLogs = [...logs].reverse();
    // Assign absolute day numbers
    ascLogs.forEach((log, index) => {
        log.dayIndex = index + 1;
    });

    const weeks = [];
    let currentWeekLogs = [];
    let weekIndex = 1;

    ascLogs.forEach(log => {
        currentWeekLogs.push(log);
        if (currentWeekLogs.length === 7) {
            let tHours = 0, tLunch = 0, keldi = 0, kelmadi = 0;
            currentWeekLogs.forEach(l => {
                if (l.status === 'kelmadi') { kelmadi++; }
                else { keldi++; tHours += l.hours || 0; tLunch += l.lunchMins || 0; }
            });
            weeks.push({
                id: `week-${weekIndex}`,
                name: `${weekIndex}-Hafta`,
                logs: [...currentWeekLogs].reverse(),
                tHours, tLunch, keldi, kelmadi,
                tSum: tHours * rate
            });
            currentWeekLogs = [];
            weekIndex++;
        }
    });

    let ungrouped = [];
    if (currentWeekLogs.length > 0) {
        ungrouped = currentWeekLogs.reverse();
    }

    return { weeks: weeks.reverse(), ungrouped };
};

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
      
      const stajDays = workerLogs.length > 0 
          ? Math.floor((new Date() - new Date(workerLogs[workerLogs.length - 1].date)) / 86400000) + 1 
          : 0;

      const grouped = groupLogsByWeeks(workerLogs, rate);

      return { ...worker, hourlyRate: rate, logs: workerLogs, totalAllTimeHours, totalSalary, stajDays, grouped };
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
  
  // Worker Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWorkerData, setNewWorkerData] = useState({ name: '', surname: '', rate: 20000 });
  
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [showMaosh, setShowMaosh] = useState(false);
  
  const [editingRate, setEditingRate] = useState('');
  
  // Log Addition state
  const [showAddLog, setShowAddLog] = useState(false);
  const [newLogLunch, setNewLogLunch] = useState(60);
  const [newLogStart, setNewLogStart] = useState('08:00');
  const [newLogEnd, setNewLogEnd] = useState('16:00');

  const [openWeeks, setOpenWeeks] = useState({});
  const toggleWeek = (id) => setOpenWeeks(prev => ({...prev, [id]: !prev[id]}));
  const [logToEdit, setLogToEdit] = useState(null);

  useEffect(() => {
    if (auth) { fetchWorkers(); }
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
       if (updated) { setSelectedWorker(updated); } else { setSelectedWorker(null); }
    }
  };

  const openWorker = (w) => {
      setSelectedWorker(w);
      setEditingRate(w.hourlyRate);
      setOpenWeeks({});
      setShowAddLog(false); // Reset add log view
  }

  const handleSmartInput = async (e) => {
    if (e.key === 'Enter') {
      setShowDropdown(false);
      const val = searchInput.trim().toLowerCase();
      if (val.includes('keldi') && val.includes('ketdi')) {
        const nameMatch = searchInput.match(/^([a-zA-Zа-яА-Я]+)/);
        const times = searchInput.match(/\d{1,2}:\d{2}/g);
        if (nameMatch && times && times.length === 2) {
            saveLogDirectly(nameMatch[1], times[0], times[1], 'keldi', 60);
        }
      }
    }
  };

  const saveLogDirectly = (name, start, end, status = 'keldi', lunchMins = 0) => {
     let { w, l } = loadData();
     let worker = w.find(wrk => wrk.name.toLowerCase().includes(name.toLowerCase()));
     if (!worker) {
         showToast("Bunday ishchi topilmadi!", "error");
         return;
     }

     const today = new Date().toISOString().slice(0, 10);
     let existingLog = l.find(log => log.worker_id === worker.id && log.date === today);

     if (existingLog) {
         if (!window.confirm("Bugungi kun uchun ma'lumot kiritilgan. Yangilashni xohlaysizmi?")) return;
         existingLog.start_time = start;
         existingLog.end_time = end;
         existingLog.status = status;
         existingLog.lunchMins = lunchMins;
         existingLog.hours = status === 'kelmadi' ? 0 : calculateHours(start, end, lunchMins);
     } else {
         const hours = status === 'kelmadi' ? 0 : calculateHours(start, end, lunchMins);
         l.push({ id: Date.now().toString() + Math.random().toString(), worker_id: worker.id, date: today, start_time: start, end_time: end, lunchMins, hours, status });
     }
     saveData(w, l);
     showToast(`✅ Ma'lumot saqlandi`);
     setSearchInput('');
     fetchWorkers();
  };

  const saveNewLog = (status) => {
     const today = new Date().toISOString().slice(0, 10);
     let { w, l } = loadData();
     let existingLog = l.find(log => log.worker_id === selectedWorker.id && log.date === today);
     
     if (existingLog) {
         showToast("Bugun uchun ma'lumot allaqachon qo'shilgan! Uni tahrirlang.", "error");
         setShowAddLog(false);
         return;
     }

     const hours = status === 'kelmadi' ? 0 : calculateHours(newLogStart, newLogEnd, newLogLunch);
     l.push({ 
         id: Date.now().toString() + Math.random().toString(), 
         worker_id: selectedWorker.id, 
         date: today, 
         start_time: newLogStart, 
         end_time: newLogEnd, 
         lunchMins: newLogLunch, 
         hours, 
         status 
     });
     
     saveData(w, l);
     showToast("✅ Kun qo'shildi");
     setShowAddLog(false);
     fetchWorkers();
  };

  const handleModalSubmit = (e) => {
     e.preventDefault();
     const { name, surname, rate } = newWorkerData;
     if (!name || !surname) { showToast("Ism va familyani kiriting", "error"); return; }
     
     const fullName = `${surname} ${name}`.trim();
     let { w, l } = loadData();
     
     if (w.some(wrk => wrk.name.toLowerCase() === fullName.toLowerCase())) {
         showToast("Bu ismli ishchi allaqachon mavjud!", "error");
         return;
     }

     w.push({ id: Date.now().toString(), name: fullName, hourlyRate: Number(rate) });
     saveData(w, l);
     showToast("✅ Yangi ishchi yaratildi");
     setShowAddModal(false);
     setNewWorkerData({ name: '', surname: '', rate: 20000 });
     fetchWorkers();
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
         if (selectedWorker && selectedWorker.id === id) setSelectedWorker(null);
     }
  };

  const handleEditWorker = (e, worker) => {
     e.stopPropagation();
     const newName = window.prompt("Ishchining yangi ismini (familyasini) kiriting:", worker.name);
     if (newName && newName.trim() !== "") {
         let { w, l } = loadData();
         if (w.some(wrk => wrk.name.toLowerCase() === newName.toLowerCase() && wrk.id !== worker.id)) {
            showToast("Bunday ism allaqachon bor!", "error"); return;
         }
         const target = w.find(wrk => wrk.id === worker.id);
         if (target) { target.name = newName; saveData(w, l); showToast("Ism o'zgartirildi", "success"); fetchWorkers(); }
     }
  };

  const saveRate = () => {
      if(!selectedWorker) return;
      let { w, l } = loadData();
      const target = w.find(wrk => wrk.id === selectedWorker.id);
      if (target) { target.hourlyRate = Number(editingRate); saveData(w, l); showToast("Ish haqi yangilandi", "success"); fetchWorkers(); }
  };

  const deleteLog = (logId) => {
      if(window.confirm("Bu kunni o'chirishni xohlaysizmi?")) {
          let { w, l } = loadData();
          l = l.filter(lg => lg.id !== logId);
          saveData(w, l);
          fetchWorkers();
          showToast("Kun o'chirildi", "success");
      }
  };

  const saveEditLog = (e) => {
      e.preventDefault();
      let { w, l } = loadData();
      let target = l.find(lg => lg.id === logToEdit.id);
      if(target) {
          target.start_time = logToEdit.start_time;
          target.end_time = logToEdit.end_time;
          target.lunchMins = logToEdit.lunchMins;
          target.status = logToEdit.status;
          target.hours = target.status === 'kelmadi' ? 0 : calculateHours(target.start_time, target.end_time, target.lunchMins);
          saveData(w, l);
          fetchWorkers();
          showToast("O'zgarish saqlandi", "success");
          setLogToEdit(null);
      }
  };

  const openAddLogUI = () => {
     const today = new Date().toISOString().slice(0, 10);
     const existingLog = selectedWorker.logs.find(log => log.date === today);
     if (existingLog) {
         showToast("Bugun uchun ma'lumot qoshilgan. Iltimos quyidagi tarix ro'yxatidan tahrirlang.", "error");
     } else {
         setShowAddLog(true);
     }
  };

  const renderLogItem = (log) => (
      <div key={log.id} className="history-item">
          <div className="history-date">
              <span style={{color: '#60a5fa', fontWeight: 'bold', fontSize: '1.2rem', marginRight: 10}}>{log.dayIndex}-kun</span> 
              <span style={{color: '#94a3b8', fontSize: '0.9rem'}}>({new Date(log.date).toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' })})</span>
          </div>
          <div className="history-details">
              {log.status === 'kelmadi' ? (
                  <span style={{ color: '#ef4444', fontWeight: 'bold', padding: '4px 10px', background: 'rgba(239,68,68,0.1)', borderRadius: 8 }}>Kelmadi</span>
              ) : (
                  <>
                    <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{log.start_time} - {log.end_time} <small>({log.lunchMins} daq obed)</small></span>
                    <span style={{ fontWeight: 'bold', color: '#60a5fa', background: 'rgba(96,165,250,0.1)', padding: '4px 10px', borderRadius: 8 }}>{log.hours} soat</span>
                    <span style={{ fontWeight: 'bold', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '4px 10px', borderRadius: 8 }}>
                        {((log.hours || 0) * (selectedWorker?.hourlyRate || 20000)).toLocaleString()} so'm
                    </span>
                  </>
              )}
          </div>
          <div style={{ display: 'flex', gap: 5, marginTop: 10 }}>
              <button className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => setLogToEdit(log)}>Tahrirlash</button>
              <button className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '12px', color: '#ef4444' }} onClick={() => deleteLog(log.id)}>O'chirish</button>
          </div>
      </div>
  );

  if (!auth) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <h2>Tizimga Kirish</h2>
          <form onSubmit={handleLogin}>
            <div className="login-input-group">
              <input type={showPassword ? "text" : "password"} placeholder="Parol" value={password} onChange={e => setPassword(e.target.value)} />
              <div className="eye-icon" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </div>
            </div>
            <button type="submit" className="login-btn">Kirish</button>
          </form>
        </div>
      </div>
    );
  }

  const showAll = searchInput.toLowerCase() === 'hamma ishchilar';
  const displayWorkers = showAll ? workers : searchInput ? workers.filter(w => w.name.toLowerCase().includes(searchInput.toLowerCase())) : [];

  return (
    <>
      {toast && <div className="toast-container"><Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} /></div>}

      <nav className="navbar">
        <div className="nav-logo">WorkTrack</div>
        <div className="nav-links">
          <a className={`nav-link ${!showMaosh ? 'active' : ''}`} onClick={() => setShowMaosh(false)}>Asosiy</a>
          <a className={`nav-link ${showMaosh ? 'active' : ''}`} onClick={() => setShowMaosh(true)}>Maosh</a>
        </div>
        <button onClick={() => { localStorage.removeItem('auth'); setAuth(false); }} className="btn btn-outline" style={{ padding: '6px 10px' }}>Chiqish</button>
      </nav>

      {showMaosh ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
           <h1 className="text-3d">Yaqinda qo'shiladi...</h1>
           <p style={{ fontSize: '1.2rem', color: '#94a3b8', marginTop: '20px' }}>Keyingi versiyani kuting</p>
        </div>
      ) : (
        <div className="container">
        <div className="smart-input-wrapper">
          <Search size={20} color="#94a3b8" style={{ position: 'absolute', left: 16, top: 18 }} />
          <input type="text" className="smart-input" style={{ paddingLeft: 46 }} placeholder="Familya yoki Ism yozing..." value={searchInput} onChange={e => { setSearchInput(e.target.value); setShowDropdown(true); }} onFocus={() => setShowDropdown(true)} onKeyDown={handleSmartInput} />
          {showDropdown && (
            <div className="dropdown">
              <div className="dropdown-item" onClick={() => { setSearchInput('hamma ishchilar'); setShowDropdown(false); }}><Search size={16}/> Hamma ishchilar</div>
              <div className="dropdown-item" onClick={() => { setShowAddModal(true); setShowDropdown(false); }}><Plus size={16}/> Yangi ishchi qo'shish</div>
            </div>
          )}
        </div>

        {showAll && ( <div style={{ marginBottom: 16 }}><h3 style={{ margin: 0, color: '#60a5fa' }}>Reyting (Top)</h3></div> )}

        {displayWorkers.map((w, i) => (
          <div className="worker-card" key={w.id} onClick={() => openWorker(w)}>
            <div className="worker-card-header" style={{ width: '100%', cursor: 'pointer' }}>
              <div className="worker-info">
                {showAll && <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#60a5fa' }}>{i + 1}</div>}
                <h3>{w.name}</h3>
                <span style={{fontSize:'0.8rem', color:'#94a3b8', background:'rgba(255,255,255,0.1)', padding:'2px 6px', borderRadius:4}}>Staj: {w.stajDays} kun</span>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-outline" style={{ padding: '6px' }} onClick={(e) => handleEditWorker(e, w)} title="Tahrirlash"><Pencil size={16} /></button>
                <button className="btn btn-outline" style={{ padding: '6px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }} onClick={(e) => handleDeleteWorker(e, w.id)} title="O'chirish"><Trash2 size={16} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Add Worker Modal */}
      {showAddModal && (
        <div className="modal-overlay">
           <div className="modal-content">
              <button className="modal-close" onClick={() => setShowAddModal(false)}><X size={24}/></button>
              <h2 style={{ marginTop: 0, marginBottom: 24 }}>Yangi ishchi qo'shish</h2>
              <form onSubmit={handleModalSubmit}>
                 <div className="form-group"><label>Familyasi</label><input type="text" placeholder="Masalan: Davronov" value={newWorkerData.surname} onChange={e => setNewWorkerData({...newWorkerData, surname: e.target.value})} required /></div>
                 <div className="form-group"><label>Ismi</label><input type="text" placeholder="Masalan: Asadbek" value={newWorkerData.name} onChange={e => setNewWorkerData({...newWorkerData, name: e.target.value})} required /></div>
                 <div className="form-group"><label>Soatbay ish haqi (So'm)</label><input type="number" value={newWorkerData.rate} onChange={e => setNewWorkerData({...newWorkerData, rate: e.target.value})} /></div>
                 <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}>Saqlash</button>
              </form>
           </div>
        </div>
      )}

      {/* Edit Log Modal */}
      {logToEdit && (
        <div className="modal-overlay" style={{ zIndex: 2000 }}>
           <div className="modal-content">
              <button className="modal-close" onClick={() => setLogToEdit(null)}><X size={24}/></button>
              <h2 style={{ marginTop: 0 }}>{logToEdit.dayIndex}-kunni Tahrirlash</h2>
              <p style={{ color: '#94a3b8' }}>{new Date(logToEdit.date).toLocaleDateString('uz-UZ')}</p>
              <form onSubmit={saveEditLog}>
                 <div className="form-group">
                    <label>Holati</label>
                    <select className="smart-input" value={logToEdit.status} onChange={e => setLogToEdit({...logToEdit, status: e.target.value})} style={{ width: '100%', padding: '10px' }}>
                        <option value="keldi">Keldi</option>
                        <option value="kelmadi">Kelmadi</option>
                    </select>
                 </div>
                 {logToEdit.status === 'keldi' && (
                     <>
                        <div className="form-group"><label>Kelgan</label><input type="time" value={logToEdit.start_time} onChange={e => setLogToEdit({...logToEdit, start_time: e.target.value})} /></div>
                        <div className="form-group"><label>Ketgan</label><input type="time" value={logToEdit.end_time} onChange={e => setLogToEdit({...logToEdit, end_time: e.target.value})} /></div>
                        <div className="form-group"><label>Obed (Daqiqa)</label><input type="number" value={logToEdit.lunchMins} onChange={e => setLogToEdit({...logToEdit, lunchMins: Number(e.target.value)})} /></div>
                     </>
                 )}
                 <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Saqlash</button>
              </form>
           </div>
        </div>
      )}

      {selectedWorker && (
        <div className="fullscreen-overlay mobile-fullscreen">
           <div className="fullscreen-content mobile-fullscreen-content">
              <div className="fs-header">
                 <button className="fs-back" onClick={() => setSelectedWorker(null)}><ChevronLeft size={28}/> Orqaga</button>
                 <div style={{ display: 'flex', flexDirection: 'column' }}>
                     <h2 style={{ margin: 0, color: '#60a5fa' }}>{selectedWorker.name}</h2>
                     <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Ish staji: {selectedWorker.stajDays} kun</span>
                 </div>
              </div>
              <div className="fs-body">
                  <div className="fs-card glass-panel" style={{ marginBottom: 20 }}>
                     <div style={{ display: 'flex', gap: 15, flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '120px' }}><label style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Jami Ishlangan (Soat)</label><div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{selectedWorker.totalAllTimeHours}</div></div>
                        <div style={{ flex: 1, minWidth: '150px' }}><label style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Umumiy Maosh (So'm)</label><div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>{selectedWorker.totalSalary.toLocaleString()}</div></div>
                     </div>
                     <div style={{ marginTop: 15, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 15, display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                        <div className="form-group" style={{ marginBottom: 0, flex: 1 }}><label>1 Soatlik Narx (So'm)</label><input type="number" value={editingRate} onChange={e => setEditingRate(e.target.value)} style={{ padding: '8px 12px' }}/></div>
                        <button className="btn btn-primary" onClick={saveRate} style={{ padding: '9px 15px' }}>Saqlash</button>
                     </div>
                  </div>

                  {/* Add New Log Section */}
                  {!showAddLog ? (
                      <button className="btn btn-primary" onClick={openAddLogUI} style={{ width: '100%', justifyContent: 'center', padding: '15px', fontSize: '1.1rem', marginBottom: '20px', borderRadius: '12px' }}>
                          <Plus size={24} style={{ marginRight: '8px' }}/> Bugungi ish vaqtini qo'shish
                      </button>
                  ) : (
                      <div className="fs-card glass-panel" style={{ marginBottom: 20 }}>
                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                            <h4 style={{ margin: 0, color: '#f8fafc' }}>Bugungi kunni kiritish</h4>
                            <button className="modal-close" onClick={() => setShowAddLog(false)} style={{ position: 'relative', top: 0, right: 0 }}><X size={20}/></button>
                         </div>
                         <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 15 }}>
                             <div className="form-group" style={{ flex: 1, minWidth: '100px', marginBottom: 0 }}><label>Kelgan vaqti</label><input type="time" value={newLogStart} onChange={e => setNewLogStart(e.target.value)} /></div>
                             <div className="form-group" style={{ flex: 1, minWidth: '100px', marginBottom: 0 }}><label>Ketgan vaqti</label><input type="time" value={newLogEnd} onChange={e => setNewLogEnd(e.target.value)} /></div>
                             <div className="form-group" style={{ flex: 1, minWidth: '100px', marginBottom: 0 }}><label>Obed (Daqiqa)</label><input type="number" value={newLogLunch} onChange={e => setNewLogLunch(Number(e.target.value))} /></div>
                         </div>
                         <div style={{ display: 'flex', gap: 10 }}>
                             <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.4)', padding: '10px' }} onClick={() => saveNewLog('keldi')}><Clock size={18}/> Keldi</button>
                             <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)', padding: '10px' }} onClick={() => saveNewLog('kelmadi')}><UserX size={18}/> Kelmadi</button>
                         </div>
                      </div>
                  )}

                  <h3 style={{ color: '#f8fafc', marginBottom: 15 }}>Kunlik Tarix (Spiska)</h3>
                  {selectedWorker.logs.length === 0 ? (
                      <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>Hech qanday tarix yo'q</div>
                  ) : (
                      <div className="history-list custom-scroll">
                          {selectedWorker.grouped.ungrouped.map(renderLogItem)}
                          {selectedWorker.grouped.weeks.map(week => (
                              <div key={week.id} className="week-group">
                                  <div className="week-header glass-panel" onClick={() => toggleWeek(week.id)} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', marginBottom: '10px' }}>
                                      <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#60a5fa' }}>{week.name}</span>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                                          <span style={{ color: '#10b981', fontWeight: 'bold' }}>{week.tSum.toLocaleString()} so'm</span>
                                          {openWeeks[week.id] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                      </div>
                                  </div>
                                  {openWeeks[week.id] && (
                                      <div className="week-content" style={{ paddingLeft: '15px', marginBottom: '20px' }}>
                                          {week.logs.map(renderLogItem)}
                                          <div style={{ marginTop: 15, padding: 15, background: 'rgba(255,255,255,0.05)', borderRadius: 12, fontSize: '0.9rem' }}>
                                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}><span>Jami ishlagan vaqt:</span> <strong>{week.tHours} soat</strong></div>
                                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}><span>Jami obed vaqti:</span> <strong>{week.tLunch} daqiqa</strong></div>
                                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}><span>Kelgan kunlari:</span> <strong>{week.keldi} marta</strong></div>
                                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}><span>Kelmagan kunlari:</span> <strong style={{ color: '#ef4444' }}>{week.kelmadi} marta</strong></div>
                                          </div>
                                      </div>
                                  )}
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
