import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Monitor, 
  UserCheck, 
  History, 
  RefreshCcw, 
  Maximize, 
  Minimize, 
  Settings, 
  GraduationCap,
  Database,
  LogOut,
  ExternalLink,
  Check,
  CloudLightning,
  AlertTriangle
} from 'lucide-react';

import { LibraryEntry, Gender, UserRole } from './types';
import { getTodayDateString, generateInitialEntries } from './mockData';
import DashboardView from './components/DashboardView';
import KioskMode from './components/KioskMode';
import LibrarianMode from './components/LibrarianMode';
import LogsView from './components/LogsView';

import {
  initAuth,
  googleSignIn,
  logout,
  getOrCreateSpreadsheet,
  fetchEntriesFromSheet,
  appendEntriesToSheet,
  rewriteEntriesToSheet
} from './lib/googleSheets';

export default function App() {
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'kiosk' | 'librarian' | 'logs'>('dashboard');
  const [fullscreenKiosk, setFullscreenKiosk] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);

  // Google Sheets Integration States
  const [user, setUser] = useState<any | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'connecting' | 'syncing' | 'error' | 'not_logged_in'>('not_logged_in');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Custom confirmation modal state to avoid native alert/confirm popups block in sandboxed iframes
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // 1. Initial State Loading & Storage Seeding
  useEffect(() => {
    // A. Load immediate local offline cache representation of visitors
    const stored = localStorage.getItem('library_entries_v2');
    if (stored) {
      try {
        setEntries(JSON.parse(stored));
      } catch (e) {
        console.error('Error parsing stored logs. Reseeding...', e);
        const initial = generateInitialEntries();
        setEntries(initial);
        localStorage.setItem('library_entries_v2', JSON.stringify(initial));
      }
    } else {
      // First boot: Seed with rich, realistic mock data for today immediately!
      const initial = generateInitialEntries();
      setEntries(initial);
      localStorage.setItem('library_entries_v2', JSON.stringify(initial));
    }

    // B. Suspscribe / Listen to Google Sign-In state changes
    const unsubscribe = initAuth(
      async (currentUser, currentToken) => {
        setUser(currentUser);
        setToken(currentToken);
        setSyncStatus('connecting');
        setStatusMessage('กำลังเชื่อมต่อ Google Sheets...');
        try {
          const sheetId = await getOrCreateSpreadsheet(currentToken);
          setSpreadsheetId(sheetId);
          setSyncStatus('syncing');
          setStatusMessage('กำลังดึงสถิติเข้าคลาวด์ชีต...');
          
          const sheetEntries = await fetchEntriesFromSheet(currentToken, sheetId);
          
          // Use spreadsheet data if it already contains data or had been previously synced
          if (sheetEntries.length > 0 || localStorage.getItem('library_entries_googlesheet_synced')) {
            setEntries(sheetEntries);
            localStorage.setItem('library_entries_v2', JSON.stringify(sheetEntries));
          } else {
            // Document is freshly created: seed with current local records to preserve them
            const storedLocal = localStorage.getItem('library_entries_v2');
            let localList: LibraryEntry[] = [];
            if (storedLocal) {
              try { localList = JSON.parse(storedLocal); } catch (e) {}
            }
            if (localList.length > 0) {
              await appendEntriesToSheet(currentToken, sheetId, localList);
            }
          }
          localStorage.setItem('library_entries_googlesheet_synced', 'true');
          setSyncStatus('synced');
          setStatusMessage('เชื่อมโยงและซิงค์ข้อมูลกับคลาวด์ชีตเสร็จสมบูรณ์');
        } catch (err: any) {
          console.error(err);
          setSyncStatus('error');
          setStatusMessage('การซิงค์ชีตขัดข้อง: ' + err.message);
        }
      },
      () => {
        setUser(null);
        setToken(null);
        setSpreadsheetId(null);
        setSyncStatus('not_logged_in');
        setStatusMessage('');
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Save changes to localStorage whenever entries update (acts as local hybrid offline cache)
  const saveEntries = (newEntries: LibraryEntry[]) => {
    setEntries(newEntries);
    localStorage.setItem('library_entries_v2', JSON.stringify(newEntries));
  };

  // Helper function to safely execute cloud operations in background
  const syncWithGoogleSheet = async (action: () => Promise<void>) => {
    if (!token || !spreadsheetId) return;
    setSyncStatus('syncing');
    setStatusMessage('กำลังบันทึกสถิติไปยัง Google Sheet...');
    try {
      await action();
      setSyncStatus('synced');
      setStatusMessage('บันทึกข้อมูลแบบเรียลไทม์สำเร็จ');
    } catch (err: any) {
      console.error('Google Sheets Sync Failed:', err);
      setSyncStatus('error');
      setStatusMessage('เชื่อมระบบคลาวด์ขัดข้อง: ' + err.message);
    }
  };

  // Seeding function (test data generation)
  const reseedTestData = () => {
    const initial = generateInitialEntries();
    saveEntries(initial);
    if (token && spreadsheetId) {
      syncWithGoogleSheet(async () => {
        await rewriteEntriesToSheet(token, spreadsheetId, initial);
      });
    }
  };

  // 2. Core Actions
  // Action A: Add individual entry
  const handleAddEntry = (gender: Gender, role: UserRole, channel: 'Kiosk' | 'Librarian' | 'Bulk') => {
    const today = getTodayDateString();
    const now = new Date();
    
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;

    const nextQueue = entries.length > 0 ? Math.max(...entries.map(e => e.queue)) + 1 : 1;

    const newEntry: LibraryEntry = {
      id: `live-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      queue: nextQueue,
      timestamp: new Date().toISOString(),
      date: today,
      time: timeStr,
      gender,
      role,
      channel,
    };

    const updated = [...entries, newEntry];
    updated.sort((a, b) => a.queue - b.queue); // Keep sorted by queue order
    saveEntries(updated);

    // Sync to Google Sheet if connected
    if (token && spreadsheetId) {
      syncWithGoogleSheet(async () => {
        await appendEntriesToSheet(token, spreadsheetId, [newEntry]);
      });
    }
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

    // Sync to Google Sheet if connected
    if (token && spreadsheetId) {
      syncWithGoogleSheet(async () => {
        await appendEntriesToSheet(token, spreadsheetId, newEntriesToAdd);
      });
    }
  };

  // Action C: Delete specific entry with custom confirm modal option
  const handleDeleteEntry = (id: string, detailMsg?: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'ลบรายการบันทึกสถิติ',
      message: detailMsg 
        ? `คุณต้องการลบสถิติรายการ "${detailMsg}" ใช่หรือไม่?`
        : 'คุณต้องการลบสถิติรายการนี้ใช่หรือไม่?',
      confirmText: 'ใช่, ฉันต้องการลบ',
      cancelText: 'ย้อนกลับ',
      type: 'danger',
      onConfirm: () => {
        const remaining = entries.filter((e) => e.id !== id);
        saveEntries(remaining);

        // Sync deletion by rewriting the array to the Google Sheet
        if (token && spreadsheetId) {
          syncWithGoogleSheet(async () => {
            await rewriteEntriesToSheet(token, spreadsheetId, remaining);
          });
        }
      }
    });
  };

  // Action D: Clear database
  const handleClearAll = () => {
    saveEntries([]);
    if (token && spreadsheetId) {
      syncWithGoogleSheet(async () => {
        await rewriteEntriesToSheet(token, spreadsheetId, []);
      });
    }
  };

  // Authentication Handlers
  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setToken(result.accessToken);
        setUser(result.user);
        setSyncStatus('connecting');
        setStatusMessage('กำลังค้นหา/สร้างไฟล์รายงานผลใน Drive...');
        
        const sheetId = await getOrCreateSpreadsheet(result.accessToken);
        setSpreadsheetId(sheetId);
        setSyncStatus('syncing');
        setStatusMessage('กำลังดาวน์โหลดข้อมูลเข้าระบบ...');
        
        const sheetEntries = await fetchEntriesFromSheet(result.accessToken, sheetId);
        
        if (sheetEntries.length > 0 || localStorage.getItem('library_entries_googlesheet_synced')) {
          setEntries(sheetEntries);
          localStorage.setItem('library_entries_v2', JSON.stringify(sheetEntries));
        } else {
          // If the sheet is brand new but visitor statistics already exist locally, back them up
          if (entries.length > 0) {
            await appendEntriesToSheet(result.accessToken, sheetId, entries);
          }
        }
        localStorage.setItem('library_entries_googlesheet_synced', 'true');
        setSyncStatus('synced');
        setStatusMessage('ยินดีต้อนรับ! เชื่อมโยง Google Sheet ความเร็วสูงสำเร็จแล้ว');
      }
    } catch (err: any) {
      console.error(err);
      setSyncStatus('error');
      setStatusMessage('ไม่สามารถเชื่อมต่อได้: ' + err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    setConfirmDialog({
      isOpen: true,
      title: 'ยกเลิกการซิงค์บัญชี Google Sheets',
      message: 'คุณต้องการยกเลิกการซิงค์บัญชีนี้หรือไม่? ข้อมูลประวัติการใช้งานเดิมจะยังคงถูกบันทึกไว้อย่างปลอดภัยใน Google Sheet ส่วนตัวของคุณ',
      confirmText: 'ใช่, ยกเลิกการซิงค์',
      cancelText: 'ย้อนกลับ',
      type: 'warning',
      onConfirm: async () => {
        await logout();
        setUser(null);
        setToken(null);
        setSpreadsheetId(null);
        setSyncStatus('not_logged_in');
        setStatusMessage('');
        localStorage.removeItem('library_entries_googlesheet_synced');
      }
    });
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
        <header className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-slate-900 text-white shadow-xl py-4 flex items-center" id="app-main-header">
          <div className="w-full max-w-5xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
            
            {/* LHS Logo and titles */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10 shadow-inner shrink-0">
                <GraduationCap className="w-7 h-7 text-teal-300 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg md:text-xl font-black tracking-tight text-white leading-none">ศูนย์วิทยบริการ โรงเรียนบ้านไผ่</h1>
                  <span className="bg-teal-500 text-slate-950 text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider shrink-0">สพม.ขอนแก่น</span>
                </div>
                <p className="text-indigo-200 text-xs mt-1 font-semibold max-w-[450px]">
                  ระบบรายงานจำนวนคนเข้าใช้บริการห้องสมุดแบบเรียลไทม์
                </p>
                {statusMessage && (
                  <p className="text-[10px] text-teal-300 mt-1 flex items-center gap-1 font-black">
                    <CloudLightning className="w-3 h-3 animate-bounce" />
                    {statusMessage}
                  </p>
                )}
              </div>
            </div>

            {/* RHS Actions and connection widget */}
            <div className="flex items-center gap-2.5 shrink-0" id="header-settings-actions">
              
              {/* Google Sheets Sync Indicator & Login Control */}
              <div className="flex items-center gap-2 bg-indigo-950/60 p-2.5 rounded-xl border border-white/10 shadow-md">
                {syncStatus === 'not_logged_in' ? (
                  <button
                    onClick={handleLogin}
                    disabled={isLoggingIn}
                    className="flex items-center gap-2 text-[11px] font-extrabold text-indigo-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-500 hover:to-teal-500 px-3.5 py-2 rounded-xl transition transform active:scale-95 cursor-pointer disabled:opacity-50 shadow-md shadow-emerald-500/10"
                  >
                    <Database className="w-3.5 h-3.5" />
                    {isLoggingIn ? 'กำลังลงชื่อเข้าใช้...' : 'เชื่อมต่อ Google Sheet'}
                  </button>
                ) : (
                  <div className="flex items-center gap-2.5">
                    <div className="flex flex-col text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400 font-extrabold" />
                        <span className="text-[10px] text-emerald-400 font-black">ซิงค์ Google Sheet แล้ว</span>
                      </div>
                      <span className="text-[9px] text-indigo-200 truncate max-w-[130px]" title={user?.email}>
                        {user?.email}
                      </span>
                    </div>

                    {spreadsheetId && (
                      <a
                        href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-emerald-500/10 hover:bg-emerald-500/25 rounded-lg text-emerald-300 hover:text-white transition flex items-center justify-center border border-emerald-500/20 shadow-inner"
                        title="เปิดดูไฟล์ Google Sheet ปลายทาง"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}

                    <button
                      onClick={handleLogout}
                      className="p-2 bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 rounded-lg text-indigo-200 hover:border-rose-500/30 border border-white/5 transition flex items-center justify-center"
                      title="ออกจากระบบ"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Maintenance Settings Options */}
              <div className="relative">
                <button
                  onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
                  className="p-2.5 bg-indigo-900/60 hover:bg-slate-800 rounded-xl transition text-white/90 cursor-pointer border border-white/5"
                  title="ตัวเลือกการจำลองและตั้งค่า"
                >
                  <Settings className="w-5 h-5" />
                </button>
                
                {showSettingsDropdown && (
                  <div className="absolute right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 py-2 w-48 z-30 text-slate-700 text-xs font-semibold">
                    <button
                      onClick={() => {
                        setConfirmDialog({
                          isOpen: true,
                          title: 'รีเซ็ตข้อมูลตัวอย่างเดโม',
                          message: 'คุณต้องการโหลดข้อมูลตัวอย่างสำหรับการสาธิต (ประมาณ 1,000 รายการสะสม) ใช่หรือไม่? รายการป้อนข้อมูลล่าสุดทั้งหมดของคุณในอุปกรณ์นี้และ Google Sheets (ถ้าเชื่อมโยงไว้) จะถูกลบเพื่อเขียนทับข้อมูลทดสอบชุดนี้',
                          confirmText: 'ตกลง, รีเซ็ตข้อมูล',
                          cancelText: 'ย้อนกลับ',
                          type: 'warning',
                          onConfirm: () => {
                            reseedTestData();
                          }
                        });
                        setShowSettingsDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2 transition cursor-pointer"
                    >
                      <RefreshCcw className="w-4 h-4 text-indigo-500" />
                      รีเซ็ตข้อมูลเดโมตัวอย่าง
                    </button>
                    <button
                      onClick={() => {
                        setConfirmDialog({
                          isOpen: true,
                          title: 'ลบข้อมูลสถิติทั้งหมด',
                          message: 'ยืนยันประสงค์ในการล้างข้อมูลสถิติผู้ใช้งานทั้งหมดใช่หรือไม่? ข้อมูลในอุปกรณ์นี้และใน Google Sheets ในส่วนประวัติ (หากเชื่อมต่ออยู่) จะถูกล้างว่างเปล่าทันทีและไม่สามารถกู้คืนได้!',
                          confirmText: 'ยืนยัน, ลบทั้งหมด',
                          cancelText: 'ย้อนกลับ',
                          type: 'danger',
                          onConfirm: () => {
                            handleClearAll();
                          }
                        });
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
                เปิดระบบเต็มหน้าจอ
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

      {/* Premium custom confirmation dialog to avoid popups blocks */}
      <AnimatePresence>
        {confirmDialog.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]"
            />
            
            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', duration: 0.25 }}
              className="relative bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 max-w-md w-full z-10 flex flex-col gap-4 overflow-hidden"
              id="custom-confirm-modal"
            >
              {/* Header block with contextual indicator accent */}
              <div className="flex gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  confirmDialog.type === 'danger' 
                    ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                    : confirmDialog.type === 'warning'
                    ? 'bg-amber-50 text-amber-600 border border-amber-100'
                    : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                }`}>
                  <AlertTriangle className="w-6 h-6 animate-pulse" />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-slate-900 font-extrabold text-base tracking-tight leading-snug">
                    {confirmDialog.title}
                  </h3>
                  <p className="text-slate-500 text-xs mt-1.5 font-medium leading-relaxed">
                    {confirmDialog.message}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2.5 mt-2 pt-2 border-t border-slate-50 shrink-0">
                <button
                  onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 rounded-xl text-xs font-bold transition border border-slate-200 cursor-pointer"
                >
                  {confirmDialog.cancelText || 'ยกเลิก'}
                </button>
                <button
                  onClick={() => {
                    confirmDialog.onConfirm();
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                  }}
                  className={`px-4 py-2 text-white rounded-xl text-xs font-bold transition transform active:scale-95 shadow-md cursor-pointer ${
                    confirmDialog.type === 'danger'
                      ? 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-rose-500/10'
                      : confirmDialog.type === 'warning'
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-amber-500/10'
                      : 'bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 shadow-indigo-600/10'
                  }`}
                >
                  {confirmDialog.confirmText || 'ตกลง'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
