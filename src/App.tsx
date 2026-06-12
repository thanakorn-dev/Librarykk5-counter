import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutDashboard, Monitor, UserCheck, History, RefreshCcw, Maximize, Minimize, Settings, GraduationCap } from 'lucide-react';

import { LibraryEntry, Gender, UserRole } from './types';
import { getTodayDateString, generateInitialEntries } from './mockData';
import DashboardView from './components/DashboardView';
import KioskMode from './components/KioskMode';
import LibrarianMode from './components/LibrarianMode';
import LogsView from './components/LogsView';

export default function App() {
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'kiosk' | 'librarian' | 'logs'>('dashboard');
  const [fullscreenKiosk, setFullscreenKiosk] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);

  // 1. Initial State Loading & Storage Seeding
  useEffect(() => {
    const stored = localStorage.getItem('library_entries_v2');
    if (stored) {
      try {
        setEntries(JSON.parse(stored));
      } catch (e) {
        console.error('Error parsing stored logs. Reseeding...', e);
        reseedTestData();
      }
    } else {
      // First boot: Seed with rich, realistic mock data for today immediately!
      reseedTestData();
    }
  }, []);

  // Save changes to localStorage whenever entries update
  const saveEntries = (newEntries: LibraryEntry[]) => {
    setEntries(newEntries);
    localStorage.setItem('library_entries_v2', JSON.stringify(newEntries));
  };

  // Seeding function (test data generation)
  const reseedTestData = () => {
    const initial = generateInitialEntries();
    saveEntries(initial);
  };

  // 2. Core Actions
  // Action A: Add individual entry
  const handleAddEntry = (gender: Gender, role: UserRole, channel: 'Kiosk' | 'Librarian' | 'Bulk') => {
    const today = getTodayDateString();
    const now = new Date();
    
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    const timeStr = `${hours}:${minutes}:${seconds}`;

    // Statically compute next available queue number of the day
    const queuesForDate = entries.filter((e) => e.date === today);
    const nextQueue = entries.length > 0 ? Math.max(...entries.map(e => e.queue)) + 1 : 1;

    const newEntry: LibraryEntry = {
      id: `live-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      queue: nextQueue,
      timestamp: new Date().toISOString(),
      date: today,
      time: `${hours}:${minutes}`, // Store hours:minutes for graph parsing
      gender,
      role,
      channel,
    };

    const updated = [...entries, newEntry];
    updated.sort((a, b) => a.queue - b.queue); // Keep sorted by queue order
    saveEntries(updated);
  };

  // Action B: Add classroom or block count (Bulk Entry)
  const handleBulkAdd = (role: UserRole, maleCount: number, femaleCount: number) => {
    const today = getTodayDateString();
    const now = new Date();
    const currentHour = now.getHours();

    const newEntriesToAdd: LibraryEntry[] = [];
    let currentMaxQueue = entries.length > 0 ? Math.max(...entries.map(e => e.queue)) : 0;

    // Create Male records
    for (let i = 0; i < maleCount; i++) {
      currentMaxQueue++;
      
      // Slightly stagger the minutes within the current hour to look naturally distributed
      // E.g., random minutes between 0 and 59 based on actual clock or spread
      const randomMinute = Math.floor(Math.random() * 60).toString().padStart(2, '0');
      const timeStr = `${currentHour.toString().padStart(2, '0')}:${randomMinute}`;
      
      newEntriesToAdd.push({
        id: `bulk-m-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        queue: currentMaxQueue,
        timestamp: new Date().toISOString(),
        date: today,
        time: timeStr,
        gender: 'ชาย',
        role,
        channel: 'Bulk',
      });
    }

    // Create Female records
    for (let j = 0; j < femaleCount; j++) {
      currentMaxQueue++;
      
      const randomMinute = Math.floor(Math.random() * 60).toString().padStart(2, '0');
      const timeStr = `${currentHour.toString().padStart(2, '0')}:${randomMinute}`;

      newEntriesToAdd.push({
        id: `bulk-f-${Date.now()}-${j}-${Math.random().toString(36).substring(2, 6)}`,
        queue: currentMaxQueue,
        timestamp: new Date().toISOString(),
        date: today,
        time: timeStr,
        gender: 'หญิง',
        role,
        channel: 'Bulk',
      });
    }

    const updated = [...entries, ...newEntriesToAdd];
    updated.sort((a, b) => a.queue - b.queue);
    saveEntries(updated);
  };

  // Action C: Delete specific entry
  const handleDeleteEntry = (id: string) => {
    const remaining = entries.filter((e) => e.id !== id);
    
    // Optional: We can choose to keep original queue numbers so they act as historical receipts,
    // which prevents gaps of missing numbers, OR re-index them.
    // Keeping historical receipts is standard so receipts don't change queue order.
    // Let's just leave the remaining entries, ensuring integrity of log IDs.
    saveEntries(remaining);
  };

  // Action D: Clear database
  const handleClearAll = () => {
    saveEntries([]);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between" id="app-wrapper">
      
      {/* FULL SCREEN KIOSK mode overlay (Locked UI for visitors/students to touch) */}
      <AnimatePresence>
        {fullscreenKiosk && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900 z-50 flex flex-col justify-between overflow-y-auto"
            id="fullscreen-kiosk-view"
          >
            {/* Minimalist overlay header */}
            <div className="bg-slate-950 px-6 py-4 flex justify-between items-center border-b border-white/5 h-20 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-teal-500 rounded-lg flex items-center justify-center text-white shrink-0 font-bold">
                  บ.ภ
                </div>
                <div>
                  <h1 className="text-white text-md font-extrabold tracking-tight">ศูนย์วิทยบริการ โรงเรียนบ้านไผ่</h1>
                  <p className="text-teal-400 text-[10px] uppercase tracking-wider font-extrabold">โรงเรียนบ้านไผ่ จังหวัดขอนแก่น สพม.ขอนแก่น</p>
                </div>
              </div>
              <button
                onClick={() => setFullscreenKiosk(false)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white hover:text-emerald-300 rounded-xl text-xs font-bold transition transform active:scale-95 cursor-pointer"
                id="exit-fullscreen-btn"
              >
                <Minimize className="w-4 h-4" />
                ออกจากโหมดตู้แบบเต็มหน้าจอ
              </button>
            </div>

            {/* Screen content */}
            <div className="flex-1 flex items-center justify-center py-8">
              <KioskMode onAddEntry={handleAddEntry} />
            </div>

            {/* Locked footer screen disclaimer */}
            <div className="bg-slate-950 py-3.5 text-center text-slate-500 text-[10px] tracking-wider shrink-0 border-t border-white/5 font-medium">
              * แผงควบคุมบริการคิวอัจฉริยะ ล็อคหน้าจอเซิร์ฟเวอร์เรียลไทม์ &bull; ปีการศึกษา 2026
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* STANDARD NAVIGATION VIEW (Admin/Librarian Mode) */}
      <div className="flex flex-col flex-1">
        {/* Main top header bar with emblem details */}
        <header className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-slate-900 text-white shadow-xl h-24 shrink-0 flex items-center" id="app-main-header">
          <div className="w-full max-w-5xl mx-auto px-6 flex justify-between items-center">
            
            {/* LHS Logo and titles */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10 shadow-inner">
                <GraduationCap className="w-7 h-7 text-teal-300 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg md:text-xl font-black tracking-tight text-white leading-none">ศูนย์วิทยบริการ โรงเรียนบ้านไผ่</h1>
                  <span className="bg-teal-500 text-slate-950 text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider">สพม.ขอนแก่น</span>
                </div>
                <p className="text-indigo-200 text-xs mt-1 font-semibold">
                  ระบบนับจำนวนคนเข้าห้องสมุดพร้อมระบบรายงานผลรายวันแบบเรียลไทม์ (Library Counter & Dashboard)
                </p>
              </div>
            </div>

            {/* RHS Actions and maintenance configs */}
            <div className="flex items-center gap-2" id="header-settings-actions">
              <div className="relative">
                <button
                  onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
                  className="p-2.5 bg-indigo-900/60 hover:bg-slate-800 rounded-xl transition text-white/90 cursor-pointer border border-white/5"
                  title="ตัวเลือกการจำลองและตั้งค่า"
                >
                  <Settings className="w-5 h-5" />
                </button>
                
                {showSettingsDropdown && (
                  <div className="absolute right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 py-2 w-48 z-10 text-slate-700 text-xs font-semibold">
                    <button
                      onClick={() => {
                        if (confirm('คุณต้องการโหลดข้อมูลตัวอย่างสำหรับการสาธิต (ประมาณ 1,000 รายการต่อวันสะสม) ใช่หรือไม่?')) {
                          reseedTestData();
                        }
                        setShowSettingsDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2 transition cursor-pointer"
                    >
                      <RefreshCcw className="w-4 h-4 text-indigo-500" />
                      รีเช็ตข้อมูลเดโมตัวอย่าง
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('ยืนยันประสงค์การทดลองเคลียร์ข้อมูลทั้งหมด?')) {
                          handleClearAll();
                        }
                        setShowSettingsDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 text-red-500 hover:text-red-600 flex items-center gap-2 transition cursor-pointer"
                    >
                      <span>🗑️ ลบข้อมูลทั้งหมด</span>
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => setFullscreenKiosk(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-slate-950 font-black rounded-xl text-xs shadow-md shadow-emerald-500/10 cursor-pointer transition transform active:scale-95"
                id="enter-kiosk-fullscreen-trigger"
                title="ล็อคหน้าจอไอแพดเพื่อตั้งเป้าให้นักเรียนแตะเลือก"
              >
                <Maximize className="w-4 h-4" />
                ลงชื่อเข้าใช้เต็มหน้าจอ
              </button>
            </div>

          </div>
        </header>

        {/* Dynamic Navigation Tab Bar container */}
        <nav className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-20" id="main-nav-tabs">
          <div className="max-w-5xl mx-auto px-4 flex justify-between md:justify-start gap-1 md:gap-2 overflow-x-auto py-2.5">
            
            {/* Tab 1: Dashboard */}
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs max-xs:px-2 Transition cursor-pointer shrink-0 border ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/10' : 'bg-white text-slate-600 hover:text-indigo-600 border-transparent hover:bg-slate-50'}`}
              id="tab-dashboard"
            >
              <LayoutDashboard className="w-4 h-4" />
              รายงานสถิติเรียลไทม์
            </button>

            {/* Tab 2: Kiosk Preview */}
            <button
              onClick={() => setActiveTab('kiosk')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs max-xs:px-2 transition cursor-pointer shrink-0 border ${activeTab === 'kiosk' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/10' : 'bg-white text-slate-600 hover:text-indigo-600 border-transparent hover:bg-slate-50'}`}
              id="tab-kiosk"
            >
              <Monitor className="w-4 h-4" />
              ลงชื่อเข้าใช้บริการ
            </button>

            {/* Tab 3: Librarian Incrementor */}
            <button
              onClick={() => setActiveTab('librarian')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs max-xs:px-2 transition cursor-pointer shrink-0 border ${activeTab === 'librarian' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/10' : 'bg-white text-slate-600 hover:text-indigo-600 border-transparent hover:bg-slate-50'}`}
              id="tab-librarian"
            >
              <UserCheck className="w-4 h-4" />
              แผงควบคุมบรรณารักษ์ (+1/กลุ่ม)
            </button>

            {/* Tab 4: Logs table history */}
            <button
              onClick={() => setActiveTab('logs')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs max-xs:px-2 transition cursor-pointer shrink-0 border ${activeTab === 'logs' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/10' : 'bg-white text-slate-600 hover:text-indigo-600 border-transparent hover:bg-slate-50'}`}
              id="tab-logs"
            >
              <History className="w-4 h-4" />
              ตารางผู้เข้าใช้อย่างละเอียด ({entries.length})
            </button>

          </div>
        </nav>

        {/* Dynamic Main Workspace panel change based on selected Tab */}
        <main className="flex-1 py-6 bg-slate-50" id="main-content-zone">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.18 }}
            >
              {activeTab === 'dashboard' && (
                <DashboardView entries={entries} />
              )}
              {activeTab === 'kiosk' && (
                <KioskMode onAddEntry={(gender, role) => handleAddEntry(gender, role, 'Kiosk')} />
              )}
              {activeTab === 'librarian' && (
                <LibrarianMode
                  entries={entries}
                  onAddEntry={(gender, role) => handleAddEntry(gender, role, 'Librarian')}
                  onBulkAdd={handleBulkAdd}
                  onClearAll={handleClearAll}
                />
              )}
              {activeTab === 'logs' && (
                <LogsView
                  entries={entries}
                  onDeleteEntry={handleDeleteEntry}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Main static, professional system footer in line with Guidelines */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-6 text-xs text-center font-medium h-20 shrink-0 flex flex-col justify-center" id="app-main-footer">
        <div>
          ศูนย์วิทยบริการ โรงเรียนบ้านไผ่ จังหวัดขอนแก่น
        </div>
        <div className="text-[10px] text-slate-500 mt-1">
          สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาขอนแก่น
        </div>
      </footer>

    </div>
  );
}
