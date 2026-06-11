import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Users, GraduationCap, ArrowLeft, CheckCircle2, Heart } from 'lucide-react';
import { Gender, UserRole } from '../types';

interface KioskModeProps {
  onAddEntry: (gender: Gender, role: UserRole, channel: 'Kiosk') => void;
}

export default function KioskMode({ onAddEntry }: KioskModeProps) {
  const [selectedGender, setSelectedGender] = useState<Gender | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ gender: Gender; role: UserRole } | null>(null);
  const [countdown, setCountdown] = useState(1.5);

  const rolesList: { role: UserRole; label: string; icon: any; color: string }[] = [
    { role: 'ม.1', label: 'มัธยมศึกษาปีที่ 1 (ม.1)', icon: GraduationCap, color: 'from-blue-500 to-indigo-600' },
    { role: 'ม.2', label: 'มัธยมศึกษาปีที่ 2 (ม.2)', icon: GraduationCap, color: 'from-blue-500 to-indigo-600' },
    { role: 'ม.3', label: 'มัธยมศึกษาปีที่ 3 (ม.3)', icon: GraduationCap, color: 'from-blue-500 to-indigo-600' },
    { role: 'ม.4', label: 'มัธยมศึกษาปีที่ 4 (ม.4)', icon: GraduationCap, color: 'from-emerald-500 to-teal-600' },
    { role: 'ม.5', label: 'มัธยมศึกษาปีที่ 5 (ม.5)', icon: GraduationCap, color: 'from-emerald-500 to-teal-600' },
    { role: 'ม.6', label: 'มัธยมศึกษาปีที่ 6 (ม.6)', icon: GraduationCap, color: 'from-emerald-500 to-teal-600' },
    { role: 'ครู', label: 'คุณครู / บรรณารักษ์', icon: User, color: 'from-purple-500 to-indigo-600' },
    { role: 'ผู้บริหาร', label: 'ผู้บริหารสถานศึกษา', icon: User, color: 'from-amber-500 to-orange-600' },
    { role: 'เจ้าหน้าที่', label: 'เจ้าหน้าที่ / บุคลากร', icon: User, color: 'from-cyan-500 to-blue-600' },
    { role: 'บุคคลภายนอก', label: 'บุคคลภายนอก / ผู้ปกครอง', icon: Users, color: 'from-rose-500 to-pink-600' },
  ];

  const handleGenderSelect = (gender: Gender) => {
    setSelectedGender(gender);
  };

  const handleRoleSelect = (role: UserRole) => {
    if (!selectedGender) return;
    
    // Add record
    onAddEntry(selectedGender, role, 'Kiosk');
    setSuccessInfo({ gender: selectedGender, role });
    setShowSuccess(true);
    
    // Reset wizard
    setSelectedGender(null);
  };

  // Timer countdown for success screen (1.5 seconds auto-reset)
  useEffect(() => {
    let interval: any;
    if (showSuccess) {
      setCountdown(1.5);
      const startTime = Date.now();
      interval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        const remaining = Math.max(0, 1.5 - elapsed);
        setCountdown(remaining);
        if (remaining <= 0) {
          setShowSuccess(false);
          setSuccessInfo(null);
          clearInterval(interval);
        }
      }, 50);
    }
    return () => clearInterval(interval);
  }, [showSuccess]);

  const handleReset = () => {
    setSelectedGender(null);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6" id="kiosk-container">
      {/* Outer Card */}
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden relative min-h-[520px] flex flex-col justify-between">
        
        {/* Progress header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-8 py-5 text-white flex justify-between items-center" id="kiosk-header">
          <div>
            <h2 className="text-xl font-bold tracking-tight">🖥️ ระบบลงชื่อเข้าใช้บริการตนเอง</h2>
            <p className="text-emerald-50 text-xs mt-0.5">ศูนย์วิทยบริการ โรงเรียนบ้านไผ่ จังหวัดขอนแก่น</p>
          </div>
          {selectedGender && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-xl text-xs font-medium transition cursor-pointer"
              id="kiosk-back-btn"
            >
              <ArrowLeft className="w-4 h-4" />
              กลับไปเลือกเพศใหม่
            </button>
          )}
        </div>

        {/* Success Modal / Screen Cover */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-emerald-600 text-white flex flex-col items-center justify-center z-20 p-8 text-center"
              id="kiosk-success-screen"
            >
              <motion.div
                initial={{ scale: 0.7, rotate: -15 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="mb-6 bg-white/10 rounded-full p-6 text-white"
              >
                <CheckCircle2 className="w-20 h-20 text-white" />
              </motion.div>
              
              <motion.h3 
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-4xl font-extrabold tracking-tight"
              >
                บันทึกสถิติสำเร็จ!
              </motion.h3>
              
              <motion.p 
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-emerald-100 text-lg mt-3 font-medium"
              >
                เพศ: <span className="font-bold underline">{successInfo?.gender}</span> &bull; 
                ประเภท: <span className="font-bold underline">{successInfo?.role}</span>
              </motion.p>
              
              <motion.div 
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-8 text-sm text-emerald-200/90 font-mono tracking-wider"
              >
                ระบบกำลังเตรียมพร้อมสำหรับผู้ถัดไปใน {countdown.toFixed(1)} วินาที...
              </motion.div>

              {/* Progress visual countdown */}
              <div className="w-48 bg-white/20 h-1.5 rounded-full overflow-hidden mt-3">
                <div 
                  className="bg-white h-full transition-all duration-75"
                  style={{ width: `${(countdown / 1.5) * 100}%` }}
                ></div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Standard Wizard Flow */}
        <div className="p-8 flex-1 flex flex-col justify-center" id="kiosk-wizard-flow">
          <AnimatePresence mode="wait">
            {!selectedGender ? (
              /* Sub-step 1: Select Gender */
              <motion.div
                key="gender-step"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="text-center"
              >
                <span className="bg-teal-50 text-teal-800 text-xs px-3 py-1.5 rounded-full font-bold tracking-wider uppercase mb-3 inline-block">
                  ขั้นตอนที่ 1 จาก 2
                </span>
                <h3 className="text-2xl font-bold text-slate-800 tracking-tight">โปรดแตะเลือก "เพศ" ของท่าน</h3>
                <p className="text-slate-500 text-sm mt-1 mb-8">เพื่อสถิติความสนใจและอัตราส่วนบริการห้องสมุดประจำวัน</p>

                <div className="grid grid-cols-2 gap-6 max-w-lg mx-auto">
                  {/* Male Button */}
                  <button
                    onClick={() => handleGenderSelect('ชาย')}
                    className="flex flex-col items-center justify-center p-8 bg-sky-50/50 hover:bg-sky-50 hover:border-sky-300 border-2 border-dashed border-sky-100 rounded-3xl group transition-all duration-200 transform active:scale-95 cursor-pointer shadow-sm hover:shadow-md"
                    id="kiosk-gender-male"
                  >
                    <div className="w-20 h-20 bg-sky-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/20 group-hover:scale-110 transition-transform duration-300">
                      <User className="w-10 h-10" />
                    </div>
                    <span className="text-sky-800 text-2xl font-extrabold mt-4">ชาย (M)</span>
                    <span className="text-sky-500 text-xs font-semibold mt-1">ยินดีต้อนรับครับ</span>
                  </button>

                  {/* Female Button */}
                  <button
                    onClick={() => handleGenderSelect('หญิง')}
                    className="flex flex-col items-center justify-center p-8 bg-pink-50/50 hover:bg-pink-50 hover:border-pink-300 border-2 border-dashed border-pink-100 rounded-3xl group transition-all duration-200 transform active:scale-95 cursor-pointer shadow-sm hover:shadow-md"
                    id="kiosk-gender-female"
                  >
                    <div className="w-20 h-20 bg-pink-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-pink-500/20 group-hover:scale-110 transition-transform duration-300">
                      <Heart className="w-10 h-10" />
                    </div>
                    <span className="text-pink-800 text-2xl font-extrabold mt-4">หญิง (F)</span>
                    <span className="text-pink-500 text-xs font-semibold mt-1">ยินดีต้อนรับค่ะ</span>
                  </button>
                </div>
              </motion.div>
            ) : (
              /* Sub-step 2: Select Role / Level */
              <motion.div
                key="role-step"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
              >
                <div className="text-center mb-6">
                  <span className="bg-emerald-50 text-emerald-800 text-xs px-3 py-1.5 rounded-full font-bold tracking-wider uppercase mb-2 inline-block">
                    ขั้นตอนที่ 2 จาก 2 (เพศ: {selectedGender})
                  </span>
                  <h3 className="text-2xl font-bold text-slate-800 tracking-tight">โปรดระบุ "ประเภท / ระดับชั้น"</h3>
                  <p className="text-slate-500 text-xs mt-1">กรุณากดเลือกหนึ่งระดับตามสถานะของท่านเพื่อบันทึกข้อมูลครับ</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4" id="kiosk-role-grid">
                  {rolesList.map((item) => {
                    const IconComp = item.icon;
                    return (
                      <button
                        key={item.role}
                        onClick={() => handleRoleSelect(item.role)}
                        className={`flex flex-col items-center justify-center p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl hover:border-indigo-400 group transition-all duration-200 cursor-pointer transform active:scale-95 hover:shadow-md`}
                        id={`kiosk-role-${item.role}`}
                      >
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} text-white flex items-center justify-center mb-2.5 shadow-sm group-hover:scale-105 transition-transform`}>
                          <IconComp className="w-5 h-5" />
                        </div>
                        <span className="text-slate-800 text-sm font-bold">{item.role}</span>
                        <span className="text-[10px] text-slate-400 font-medium text-center mt-0.5 mt-auto line-clamp-1">
                          {item.role.startsWith('ม.') ? `มัธยมปีที่ ${item.role.replace('ม.', '')}` : item.role}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Kiosk instructions and guidelines */}
        <div className="bg-slate-50 border-t border-slate-100 p-5 flex items-center justify-between text-xs text-slate-400" id="kiosk-footer">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="font-medium text-slate-500">สถานะแผงแตะบัตร/บริการตนเอง: ออนไลน์อยู่</span>
          </div>
          <div>*โปรดช่วยกันประหยัดไฟฟ้าและดูแลรักษาอุปกรณ์*</div>
        </div>

      </div>
    </div>
  );
}
