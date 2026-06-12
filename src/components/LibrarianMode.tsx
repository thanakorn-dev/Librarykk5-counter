import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Users, UserPlus, CheckCircle, PlusCircle, AlertCircle, Trash2, ShieldAlert } from 'lucide-react';
import { Gender, UserRole, LibraryEntry } from '../types';

interface LibrarianModeProps {
  entries: LibraryEntry[];
  onAddEntry: (gender: Gender, role: UserRole, channel: 'Librarian' | 'Bulk') => void;
  onBulkAdd: (role: UserRole, maleCount: number, femaleCount: number) => void;
  onClearAll: () => void;
}

export default function LibrarianMode({ entries, onAddEntry, onBulkAdd, onClearAll }: LibrarianModeProps) {
  // Bulk state
  const [bulkRole, setBulkRole] = useState<UserRole>('ม.2');
  const [bulkMaleCount, setBulkMaleCount] = useState<number>(20);
  const [bulkFemaleCount, setBulkFemaleCount] = useState<number>(20);
  const [showBulkSuccess, setShowBulkSuccess] = useState(false);
  const [lastBulkCount, setLastBulkCount] = useState<number>(0);

  // Clear confirmation state
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearInputConfirm, setClearInputConfirm] = useState('');
  const [clearError, setClearError] = useState('');

  const rolesList: UserRole[] = [
    'ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6', 'ครู', 'ผู้บริหาร', 'เจ้าหน้าที่', 'บุคคลภายนอก'
  ];

  // Calculate current counts for the incremental grid for today only
  const getCellCount = (gender: Gender, role: UserRole): number => {
    const d = new Date();
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    return entries.filter(e => e.date === todayStr && e.gender === gender && e.role === role).length;
  };

  const handleQuickAdd = (gender: Gender, role: UserRole) => {
    onAddEntry(gender, role, 'Librarian');
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (bulkMaleCount <= 0 && bulkFemaleCount <= 0) {
      alert('กรุณาระบุจำนวนผู้เข้าใช้มากกว่า 0');
      return;
    }
    
    onBulkAdd(bulkRole, bulkMaleCount, bulkFemaleCount);
    
    const totalAdded = (bulkMaleCount > 0 ? bulkMaleCount : 0) + (bulkFemaleCount > 0 ? bulkFemaleCount : 0);
    setLastBulkCount(totalAdded);
    setShowBulkSuccess(true);
    
    // Auto-dismiss bulk success message
    setTimeout(() => {
      setShowBulkSuccess(false);
    }, 3000);
  };

  const triggerClearDatabase = () => {
    if (clearInputConfirm === 'ยืนยันล้างข้อมูล') {
      onClearAll();
      setShowClearConfirm(false);
      setClearInputConfirm('');
      setClearError('');
    } else {
      setClearError('กรุณาป้อนข้อความยืนยันให้ถูกต้อง ("ยืนยันล้างข้อมูล")');
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-4 space-y-6" id="librarian-container">
      
      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Quick counters increment grid (Take 2 cols on tablet/desktop) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-indigo-500" />
                  แผงบันทึกด่วน (+1 คลิกเดียว)
                </h3>
                <p className="text-slate-500 text-xs mt-0.5">กดบวกเพื่อบันทึกประวัติทันที บรรณารักษ์สามารถเห็นยอดบันทึกสะสมวันนี้ได้แบบสดๆ</p>
              </div>
            </div>

            {/* Quick Grid Container */}
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center w-24">เพศ</th>
                    {rolesList.map(role => (
                      <th key={role} className="p-3 text-xs font-bold text-slate-700 text-center uppercase tracking-wider">
                        {role}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Male Row */}
                  <tr className="hover:bg-sky-50/20 transition-colors">
                    <td className="p-3 font-semibold text-sky-800 bg-sky-50/30 text-center text-sm border-r border-slate-100">
                      ชาย
                    </td>
                    {rolesList.map(role => {
                      const count = getCellCount('ชาย', role);
                      return (
                        <td key={role} className="p-2 text-center">
                          <button
                            onClick={() => handleQuickAdd('ชาย', role)}
                            className="w-full py-3.5 px-1 bg-white hover:bg-sky-500 hover:text-white hover:border-sky-500 border border-slate-200 hover:shadow-md transition-all duration-150 rounded-xl flex flex-col items-center justify-center gap-1 group cursor-pointer"
                            title={`คลิกเพิ่มผู้ชายประเภท ${role}`}
                          >
                            <span className="text-xs text-slate-400 group-hover:text-sky-100 font-medium">เพิ่ม ชาย</span>
                            <span className="text-slate-800 group-hover:text-white font-extrabold text-base bg-slate-100 group-hover:bg-sky-600 px-2 py-0.5 rounded-lg text-xs leading-tight transition-colors">
                              {count} คน
                            </span>
                          </button>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Female Row */}
                  <tr className="hover:bg-pink-50/20 transition-colors">
                    <td className="p-3 font-semibold text-pink-800 bg-pink-50/30 text-center text-sm border-r border-slate-100">
                      หญิง
                    </td>
                    {rolesList.map(role => {
                      const count = getCellCount('หญิง', role);
                      return (
                        <td key={role} className="p-2 text-center">
                          <button
                            onClick={() => handleQuickAdd('หญิง', role)}
                            className="w-full py-3.5 px-1 bg-white hover:bg-pink-500 hover:text-white hover:border-pink-500 border border-slate-200 hover:shadow-md transition-all duration-150 rounded-xl flex flex-col items-center justify-center gap-1 group cursor-pointer"
                            title={`คลิกเพิ่มผู้หญิงประเภท ${role}`}
                          >
                            <span className="text-xs text-slate-400 group-hover:text-pink-100 font-medium">เพิ่ม หญิง</span>
                            <span className="text-slate-800 group-hover:text-white font-extrabold text-base bg-slate-100 group-hover:bg-pink-600 px-2 py-0.5 rounded-lg text-xs leading-tight transition-colors">
                              {count} คน
                            </span>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-[10px] text-slate-400 mt-3 text-right italic">* ตัวเลขสีเทาในแถบสี่เหลี่ยมระบุยอดสะสมของผู้ใช้งานแต่ละประเภท ณ วันนี้</p>
          </div>
        </div>

        {/* Right Column: Bulk entry form & Maintenance tools */}
        <div className="space-y-6">
          {/* Bulk Entry Form */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 overflow-hidden relative">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-1">
              <Users className="w-5 h-5 text-emerald-500" />
              บันทึกแบบกลุ่ม (Bulk Entry)
            </h3>
            <p className="text-slate-500 text-xs mb-4">คีย์ข้อมูลจำนวนทั้งห้องเรียนพร้อมกัน เมื่อนักเรียนเข้ามาศึกษาค้นคว้าเป็นรายวิชา</p>

            {/* Form */}
            <form onSubmit={handleBulkSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">เลือกประเภท / ระดับชั้นกลุ่มศึกษา</label>
                <select
                  value={bulkRole}
                  onChange={(e) => setBulkRole(e.target.value as UserRole)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 text-sm focus:outline-none"
                >
                  {rolesList.map(role => (
                    <option key={role} value={role}>{role} (ระดับชั้น {role.startsWith('ม.') ? `มัธยมศึกษาปีที่ ${role.replace('ม.', '')}` : role})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-sky-700 mb-1">นักเรียนเพศชาย (คน)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={bulkMaleCount}
                    onChange={(e) => setBulkMaleCount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full p-2.5 rounded-xl border border-sky-150 focus:border-sky-500 text-sm focus:outline-none font-bold text-sky-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-pink-700 mb-1">นักเรียนเพศหญิง (คน)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={bulkFemaleCount}
                    onChange={(e) => setBulkFemaleCount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full p-2.5 rounded-xl border border-pink-150 focus:border-pink-500 text-sm focus:outline-none font-bold text-pink-800"
                  />
                </div>
              </div>

              {/* Summary display */}
              <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 flex justify-between items-center">
                <span>ยอดรวมที่ป้อนสถิติตัวเลข:</span>
                <span className="font-extrabold text-slate-800 text-sm">
                  {bulkMaleCount + bulkFemaleCount} คน
                </span>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/10 transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                บันทึกห้องเรียนเข้ารวม
              </button>
            </form>

            {/* Success flash */}
            {showBulkSuccess && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-emerald-600 text-white p-6 flex flex-col items-center justify-center text-center z-10"
              >
                <CheckCircle className="w-12 h-12 text-white mb-2" />
                <h4 className="font-extrabold text-lg">เพิ่มข้อมูลแบบกลุ่มสำเร็จ!</h4>
                <p className="text-emerald-100 text-xs mt-1">
                  ได้จัดเก็บประวัติของ <span className="font-bold underline">{bulkRole}</span> จำนวน <span className="font-bold underline">{lastBulkCount}</span> เข้าสู่ระบบเรียบร้อยแล้ว
                </p>
              </motion.div>
            )}
          </div>

          {/* Maintenance / Danger Zone */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h3 className="text-xl font-bold text-rose-700 flex items-center gap-2 mb-1">
              <ShieldAlert className="w-5 h-5 text-rose-500" />
              การจัดการระบบความปลอดภัย
            </h3>
            <p className="text-slate-500 text-xs mb-4 text-justify">
              ฟังก์ชันเตรียมพร้อมระบบสำหรับการเริ่มต้นภาคการศึกษาใหม่ บรรณารักษ์สามารถล้างประข้อมูลสถิติที่จัดเก็บไว้ทั้งหมด
            </p>

            {!showClearConfirm ? (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4 text-rose-600" />
                ล้างข้อมูลฐานข้อมูลทั้งหมด...
              </button>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs space-y-3"
              >
                <div className="flex gap-2 text-red-800">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">⚠️ ยืนยันสองชั้นก่อนลบ!</p>
                    <p className="mt-0.5 text-slate-600">การลบจะล้างข้อมูลสถิติและคิวในวันนี้ทั้งหมด ไม่สามารถกู้คืนได้</p>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">พิมพ์คำว่า <span className="font-bold text-red-700 underline">ยืนยันล้างข้อมูล</span> เพื่อลบ:</label>
                  <input
                    type="text"
                    value={clearInputConfirm}
                    onChange={(e) => setClearInputConfirm(e.target.value)}
                    placeholder="พิมพ์ที่นี่..."
                    className="w-full p-2 bg-white rounded-lg border border-red-200 focus:outline-none focus:border-red-500 text-xs font-bold"
                  />
                  {clearError && (
                    <p className="text-[10px] text-red-600 font-semibold mt-1">{clearError}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setShowClearConfirm(false);
                      setClearInputConfirm('');
                      setClearError('');
                    }}
                    className="py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition text-[11px] cursor-pointer"
                  >
                    ยกเลิกคำขอ
                  </button>
                  <button
                    onClick={triggerClearDatabase}
                    className="py-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition text-[11px] cursor-pointer"
                  >
                    ยืนยันการลบ
                  </button>
                </div>
              </motion.div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
