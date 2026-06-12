import { useState } from 'react';
import { motion } from 'motion/react';
import { Users, Users2, Trophy, Clock, Award, ArrowUpRight, Calendar, BarChart3, HelpCircle } from 'lucide-react';
import { LibraryEntry, UserRole } from '../types';

interface DashboardViewProps {
  entries: LibraryEntry[];
}

export default function DashboardView({ entries }: DashboardViewProps) {
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');
  
  // Extract all unique dates and months available in the entries database
  const availableDates = Array.from(new Set(entries.map((e) => e.date)))
    .sort((a, b) => b.localeCompare(a)); // Newest first

  const availableMonths = Array.from(new Set(entries.map((e) => e.date.substring(0, 7))))
    .sort((a, b) => b.localeCompare(a)); // Newest first

  // Setup default states based on what dates exist
  const defaultDate = availableDates[0] || new Date().toISOString().split('T')[0];
  const defaultMonth = availableMonths[0] || new Date().toISOString().split('T')[0].substring(0, 7);

  const [selectedDate, setSelectedDate] = useState<string>(defaultDate);
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth);

  const [hoveredRole, setHoveredRole] = useState<UserRole | null>(null);
  const [hoveredHour, setHoveredHour] = useState<string | null>(null);
  const [hoveredMonthlyDay, setHoveredMonthlyDay] = useState<number | null>(null);

  // Filter entries based on the current mode and active selection
  const currentEntries = entries.filter((entry) => {
    if (viewMode === 'daily') {
      return entry.date === selectedDate;
    } else {
      return entry.date.startsWith(selectedMonth);
    }
  });

  const totalCount = currentEntries.length;

  // 1. Calculate Gender counts & percentages
  const maleCount = currentEntries.filter((e) => e.gender === 'ชาย').length;
  const femaleCount = currentEntries.filter((e) => e.gender === 'หญิง').length;
  const malePercent = totalCount > 0 ? Math.round((maleCount / totalCount) * 100) : 0;
  const femalePercent = totalCount > 0 ? Math.round((femaleCount / totalCount) * 100) : 0;

  // 2. Calculate Role distributions
  const allRoles: UserRole[] = [
    'ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6', 'ครู', 'ผู้บริหาร', 'เจ้าหน้าที่', 'บุคคลภายนอก',
  ];

  const roleCounts = allRoles.reduce((acc, curr) => {
    acc[curr] = currentEntries.filter((e) => e.role === curr).length;
    return acc;
  }, {} as Record<UserRole, number>);

  // Sort roles to find the primary group
  const sortedRoles = [...allRoles].sort((a, b) => roleCounts[b] - roleCounts[a]);
  const primaryGroup = sortedRoles[0];
  const primaryCount = roleCounts[primaryGroup] || 0;
  const primaryPercent = totalCount > 0 ? Math.round((primaryCount / totalCount) * 100) : 0;

  // 3. Hourly Breakdown (07:00 to 18:00) - For Daily View
  const hoursList = [
    { label: '07:00', start: 7, end: 7 },
    { label: '08:00', start: 8, end: 8 },
    { label: '09:00', start: 9, end: 9 },
    { label: '10:00', start: 10, end: 10 },
    { label: '11:00', start: 11, end: 11 },
    { label: '12:00', start: 12, end: 12 },
    { label: '13:00', start: 13, end: 13 },
    { label: '14:00', start: 14, end: 14 },
    { label: '15:00', start: 15, end: 15 },
    { label: '16:00', start: 16, end: 16 },
    { label: '17:00', start: 17, end: 17 },
    { label: '18:00', start: 18, end: 18 },
  ];

  const hourlyData = hoursList.map((hr) => {
    const count = currentEntries.filter((e) => {
      const hStr = e.time.split(':')[0];
      const entryHour = parseInt(hStr, 10);
      return entryHour === hr.start;
    }).length;

    return {
      hourString: hr.label,
      count,
    };
  });

  // Find Peak Hour
  const sortedHours = [...hourlyData].sort((a, b) => b.count - a.count);
  const peakHourItem = sortedHours[0];
  const peakHourText = peakHourItem && peakHourItem.count > 0 
    ? `${peakHourItem.hourString} - ${parseInt(peakHourItem.hourString) + 1}:00 น.`
    : 'ไม่มีข้อมูล';

  // 4. Monthly Day-by-Day Trend (1st to Nth) - For Monthly View
  const getDaysInSelectedMonth = () => {
    if (!selectedMonth) return 30;
    const [yearStr, monthStr] = selectedMonth.split('-');
    return new Date(parseInt(yearStr, 10), parseInt(monthStr, 10), 0).getDate();
  };

  const daysInMonth = getDaysInSelectedMonth();
  const monthlyTrendData = Array.from({ length: daysInMonth }, (_, index) => {
    const dayNum = index + 1;
    const dateString = `${selectedMonth}-${dayNum.toString().padStart(2, '0')}`;
    const count = entries.filter((e) => e.date === dateString).length;
    return {
      dayNum,
      dateString,
      count,
    };
  });

  const maxMonthlyDayCount = Math.max(...monthlyTrendData.map((d) => d.count), 1);

  // 5. Calculate Average Daily Count and Peak Day of Week for Monthly Summary
  const distinctDaysInSelectedMonth = Array.from(
    new Set(currentEntries.map((e) => e.date))
  ).length;
  const averageDailyCount = distinctDaysInSelectedMonth > 0 
    ? Math.round(totalCount / distinctDaysInSelectedMonth) 
    : 0;

  // Weekday Name Mapper & Counter
  const weekdayNames = ["วันอาทิตย์", "วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์"];
  const weekdayCounts = [0, 0, 0, 0, 0, 0, 0];
  currentEntries.forEach((entry) => {
    const dayIndex = new Date(entry.date).getDay();
    weekdayCounts[dayIndex]++;
  });

  let maxDayIndex = 0;
  let maxDayCount = 0;
  weekdayCounts.forEach((cnt, idx) => {
    if (cnt > maxDayCount) {
      maxDayCount = cnt;
      maxDayIndex = idx;
    }
  });

  const peakDayOfWeekText = maxDayCount > 0 
    ? `${weekdayNames[maxDayIndex]} (ยอดยอดรวม ${maxDayCount} คน)` 
    : 'ไม่มีข้อมูล';

  // SVG Donut Setup
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const maleOffset = circumference - (malePercent / 100) * circumference;
  const femaleOffset = circumference - (femalePercent / 100) * circumference;

  const progressGradients: Record<string, string> = {
    'ม.1': 'from-sky-500 to-indigo-500',
    'ม.2': 'from-sky-500 to-indigo-500',
    'ม.3': 'from-sky-500 to-indigo-500',
    'ม.4': 'from-emerald-500 to-teal-500',
    'ม.5': 'from-emerald-500 to-teal-500',
    'ม.6': 'from-emerald-500 to-teal-500',
    'ครู': 'from-purple-500 to-violet-500',
    'ผู้บริหาร': 'from-amber-500 to-orange-500',
    'เจ้าหน้าที่': 'from-cyan-500 to-blue-500',
    'บุคคลภายนอก': 'from-rose-500 to-pink-500',
  };

  const getGradientClass = (role: UserRole) => {
    return progressGradients[role] || 'from-slate-500 to-slate-600';
  };

  const maxHourCount = Math.max(...hourlyData.map(h => h.count), 1);

  // Helper to translate YYYY-MM into Thai Month Label
  const formatThaiMonth = (yearMonthStr: string) => {
    const [year, month] = yearMonthStr.split('-');
    const monthNames = [
      "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
      "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    ];
    const thaiYear = parseInt(year, 10) + 543;
    return `${monthNames[parseInt(month, 10) - 1]} พ.ศ. ${thaiYear}`;
  };

  // Helper to translate YYYY-MM-DD into short Thai Date label
  const formatThaiDateShort = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: '2-digit'
    });
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-4 space-y-6" id="dashboard-container">
      
      {/* Upper Mode Selector & Selector dropdowns */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* View Toggle tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto" id="dashboard-toggle-control">
            <button
               onClick={() => setViewMode('daily')}
               className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 px-5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                 viewMode === 'daily' 
                   ? 'bg-white text-indigo-700 shadow-sm' 
                   : 'text-slate-500 hover:text-slate-800'
               }`}
            >
              <Calendar className="w-4 h-4" />
              รายงานสถิติรายวัน
            </button>
            <button
               onClick={() => setViewMode('monthly')}
               className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 px-5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                 viewMode === 'monthly' 
                   ? 'bg-white text-indigo-700 shadow-sm' 
                   : 'text-slate-500 hover:text-slate-800'
               }`}
            >
              <BarChart3 className="w-4 h-4" />
              รายงานสรุปรายเดือน
            </button>
          </div>

          {/* Quick Date Selectors based on mode */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            {viewMode === 'daily' ? (
              <div className="flex items-center gap-2 w-full md:w-auto">
                <span className="text-[11px] font-extrabold text-slate-500 shrink-0">เลือกวันที่ตรวจสอบ:</span>
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 rounded-xl px-3 py-2 outline-none focus:border-indigo-500 w-full md:w-52"
                >
                  {availableDates.length > 0 ? (
                    availableDates.map(date => (
                      <option key={date} value={date}>
                        {formatThaiDateShort(date)} ({entries.filter(e => e.date === date).length} รายการ)
                      </option>
                    ))
                  ) : (
                    <option value={new Date().toISOString().split('T')[0]}>ไม่มีข้อมูลสถิติ</option>
                  )}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-2 w-full md:w-auto">
                <span className="text-[11px] font-extrabold text-slate-500 shrink-0">เลือกเดือนตรวจสอบ:</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 rounded-xl px-3 py-2 outline-none focus:border-indigo-500 w-full md:w-52"
                >
                  {availableMonths.length > 0 ? (
                    availableMonths.map(month => (
                      <option key={month} value={month}>
                        {formatThaiMonth(month)} ({entries.filter(e => e.date.startsWith(month)).length} รายการ)
                      </option>
                    ))
                  ) : (
                    <option value={new Date().toISOString().split('T')[0].substring(0, 7)}>ไม่มีข้อมูล</option>
                  )}
                </select>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* 1. Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="metric-cards">
        
        {/* Metric 1: Total visitors */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex items-center gap-4 hover:shadow-md transition-all duration-200">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400">
              {viewMode === 'daily' ? 'ผู้ใช้บริการรวมวันนี้' : 'ผู้ใช้บริการรวมสะสมทั้งเดือน'}
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-800 tracking-tight" id="dashboard-total-count">
                {totalCount}
              </span>
              <span className="text-xs text-slate-500">คน</span>
            </div>
            <p className="text-[10px] text-emerald-600 font-bold flex items-center mt-0.5">
              <ArrowUpRight className="w-3.5 h-3.5 inline" /> 
              {viewMode === 'daily' ? 'ดึงสถิติรายวันสดเรียลไทม์' : `ความถี่สะสม ${distinctDaysInSelectedMonth} วันทำการ`}
            </p>
          </div>
        </div>

        {/* Metric 2: Gender ratio */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex items-center gap-4 hover:shadow-md transition-all duration-200">
          <div className="w-12 h-12 rounded-xl bg-pink-50 text-pink-500 flex items-center justify-center gap-0.5">
            <Users2 className="w-6 h-6 text-sky-500" />
          </div>
          <div className="flex-1">
            <p className="text-[11px] font-bold text-slate-400">สัดส่วนผู้ใช้ ชาย/หญิง</p>
            <div className="flex justify-between items-baseline mt-1">
              <span className="text-md font-black text-sky-600 leading-none">{malePercent}% ชาย</span>
              <span className="text-[9px] text-slate-350">|</span>
              <span className="text-md font-black text-pink-500 leading-none">{femalePercent}% หญิง</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1.5 flex">
              <div className="bg-sky-500 h-full" style={{ width: `${malePercent}%` }}></div>
              <div className="bg-pink-500 h-full" style={{ width: `${femalePercent}%` }}></div>
            </div>
          </div>
        </div>

        {/* Metric 3: Primary group */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex items-center gap-4 hover:shadow-md transition-all duration-200">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400">กลุ่มเป้าหมายใช้ห้องสมุดสูงสุด</p>
            <p className="text-lg font-black text-slate-800 tracking-tight mt-0.5">
              {totalCount > 0 ? (
                <>
                  ระดับ <span className="text-indigo-600 underline">{primaryGroup}</span>
                </>
              ) : 'ไม่มีข้อมูล'}
            </p>
            <p className="text-[10px] text-slate-500">
              {totalCount > 0 ? `ผู้ใช้ ${primaryCount} รายคิดเป็น ${primaryPercent}%` : `รอสถิติบันทึก`}
            </p>
          </div>
        </div>

        {/* Metric 4: Peak hour / Daily average */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex items-center gap-4 hover:shadow-md transition-all duration-200">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400">
              {viewMode === 'daily' ? 'ช่วงเวลาหนาแน่นที่สุด' : 'เฉลี่ยต่อวันทำการ'}
            </p>
            <p className="text-sm font-black text-teal-700 tracking-tight mt-1 leading-tight">
              {viewMode === 'daily' ? peakHourText : `${averageDailyCount} คน / วัน`}
            </p>
            <p className="text-[10px] text-slate-500 mt-1 leading-none">
              {viewMode === 'daily' 
                ? (peakHourItem && peakHourItem.count > 0 ? `ยอดรวมช่วงเวลา: ${peakHourItem.count} คน` : 'สะสมสถิติวันนี้')
                : (totalCount > 0 ? `เฉลี่ยจากข้อมูลบันทึกจริงรายวัน` : 'ไม่มีข้อมูล')
              }
            </p>
          </div>
        </div>

      </div>

      {/* 2. Donut & Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        
        {/* Interactive SVG Donut */}
        <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col items-center justify-center">
          <div className="w-full text-center mb-4">
            <h3 className="text-md font-bold text-slate-700">สัดส่วนเพศผู้เข้าใช้ประจำช่วงเวลา</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {viewMode === 'daily' ? 'รายงานตรวจสอบผู้ใช้ของวันที่เลือก' : 'รายงานตรวจสอบสะสมตลอดเดือนคัดกรอง'}
            </p>
          </div>

          {totalCount > 0 ? (
            <div className="relative flex items-center justify-center" id="svg-donut">
              <svg className="w-48 h-48 transform -rotate-90">
                {/* Back Circle */}
                <circle
                  cx="96"
                  cy="96"
                  r={radius}
                  fill="transparent"
                  stroke="#f1f5f9"
                  strokeWidth="16"
                />
                
                {/* Male Segment (Sky blue) */}
                <circle
                  cx="96"
                  cy="96"
                  r={radius}
                  fill="transparent"
                  stroke="#0ea5e9"
                  strokeWidth="16"
                  strokeDasharray={circumference}
                  strokeDashoffset={maleOffset}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
                
                {/* Female Segment (Pink/rose overlayed) */}
                <circle
                  cx="96"
                  cy="96"
                  r={radius}
                  fill="transparent"
                  stroke="#ec4899"
                  strokeWidth="16"
                  strokeDasharray={circumference}
                  strokeDashoffset={femaleOffset}
                  transform={`rotate(${(malePercent / 100) * 360} 96 96)`}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              
              {/* Inner Information Text */}
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black text-slate-800">{totalCount}</span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">คนตามกลุ่มวิเคราะห์</span>
              </div>
            </div>
          ) : (
            <div className="w-48 h-48 rounded-full border-4 border-dashed border-slate-100 flex items-center justify-center text-xs text-slate-400">
              รอสรุปผลข้อมูลสถิติ
            </div>
          )}

          {/* Color Indicators Legend */}
          <div className="grid grid-cols-2 gap-4 mt-4 w-full">
            <div className="bg-sky-50 rounded-xl p-2.5 text-center border border-sky-100">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-sky-500 mr-1.5 font-bold"></span>
              <span className="text-xs font-bold text-sky-900">ชาย ({maleCount} คน)</span>
              <div className="text-sm font-extrabold text-sky-600 mt-0.5">{malePercent}%</div>
            </div>
            
            <div className="bg-pink-50 rounded-xl p-2.5 text-center border border-pink-100">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-pink-500 mr-1.5 font-bold"></span>
              <span className="text-xs font-bold text-pink-900">หญิง ({femaleCount} คน)</span>
              <div className="text-sm font-extrabold text-pink-600 mt-0.5">{femalePercent}%</div>
            </div>
          </div>
        </div>

        {/* Level / Role Breakdown Progress Bars */}
        <div className="md:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-700 flex items-center gap-1.5">
              <Award className="w-5 h-5 text-indigo-500" />
              โครงสร้างกลุ่มแยกตามประเภทบุคคล
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {viewMode === 'daily' ? `สัดส่วนระดับชั้นผู้ใช้ของวันที่ ${formatThaiDateShort(selectedDate)}` : `สัดส่วนระดับชั้นผู้ใช้รวมในรอบเดือน ${formatThaiMonth(selectedMonth)}`}
            </p>
          </div>

          <div className="space-y-2.5 mt-4" id="role-progress-bars">
            {allRoles.map((role) => {
              const count = roleCounts[role] || 0;
              const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
              
              return (
                <div 
                  key={role} 
                  className={`p-1.5 rounded-xl transition-all duration-150 ${hoveredRole === role ? 'bg-indigo-50/50 shadow-sm border border-indigo-100' : 'border border-transparent'}`}
                  onMouseEnter={() => setHoveredRole(role)}
                  onMouseLeave={() => setHoveredRole(null)}
                >
                  <div className="flex justify-between items-center text-xs font-semibold mb-1">
                    <span className="text-slate-700 text-sm">{role} <span className="font-medium text-slate-400 text-xs">({role.startsWith('ม.') ? `ระดับชั้นมัธยมศึกษาปีที่ ${role.replace('ม.', '')}` : role})</span></span>
                    <span className="text-slate-800 font-bold">{count} คน <span className="text-indigo-600">({pct}%)</span></span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full bg-gradient-to-r ${getGradientClass(role)} rounded-full transition-all duration-1000`}
                      style={{ width: `${totalCount > 0 ? pct : 0}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* 3. Conditional Graph View based on selection (Daily vs Monthly graph) */}
      {viewMode === 'daily' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div>
            <h3 className="text-lg font-bold text-slate-700 flex items-center gap-1.5">
              <Clock className="w-5 h-5 text-teal-600" />
              การกระจายตัวของผู้เข้าใช้งานรายชั่วโมงประจำวัน (Hourly Dispersal)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              แสดงการกระจายของชั่วโมงเข้าเรียนที่บันทึกของวันที่ <strong className="text-slate-700 underline">{formatThaiDateShort(selectedDate)}</strong>
            </p>
          </div>

          {/* Hourly chart */}
          <div className="pt-8 pb-4 px-2" id="hourly-bars-graph">
            <div className="h-44 flex items-end justify-between gap-2 border-b border-slate-100 relative">
              
              <div className="absolute left-0 right-0 top-0 border-t border-slate-100 text-[9px] text-slate-350 pt-1 pointer-events-none"></div>
              <div className="absolute left-0 right-0 top-1/2 border-t border-slate-100 text-[9px] text-slate-350 pt-1 pointer-events-none"></div>

              {hourlyData.map((hour) => {
                const heightPct = maxHourCount > 0 ? (hour.count / maxHourCount) * 100 : 0;
                const isHovered = hoveredHour === hour.hourString;

                return (
                  <div 
                    key={hour.hourString} 
                    className="flex-1 flex flex-col items-center relative group"
                    onMouseEnter={() => setHoveredHour(hour.hourString)}
                    onMouseLeave={() => setHoveredHour(null)}
                  >
                    {/* Tooltip */}
                    <div className={`absolute -top-12 bg-slate-800 text-white rounded-lg px-2.5 py-1 text-xs font-bold transition-all z-10 shadow-lg pointer-events-none flex flex-col items-center ${isHovered ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
                      <span>{hour.count} คน</span>
                      <div className="w-2 h-2 bg-slate-800 rotate-45 -mb-1 mt-0.5"></div>
                    </div>

                    {/* Hourly Bar */}
                    <div className="w-full max-w-[34px] bg-slate-50 hover:bg-slate-100 rounded-t-xl overflow-hidden flex flex-col justify-end transition-colors min-h-[4px]">
                      <div 
                        className={`w-full bg-gradient-to-t ${isHovered ? 'from-teal-600 to-indigo-500' : 'from-teal-500 to-sky-400'} rounded-t-lg transition-all duration-700`}
                        style={{ height: `${totalCount > 0 ? Math.max(4, heightPct) : 4}%` }}
                      ></div>
                    </div>

                    {/* Clock Label */}
                    <span className={`text-[10px] font-bold mt-2 ${isHovered ? 'text-indigo-600 scale-105' : 'text-slate-400'} transition-all`}>
                      {hour.hourString}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="flex justify-between items-center text-[10px] text-slate-400 bg-slate-50 rounded-xl p-3 mt-1">
            <span>* วางเมาส์ (Hover) เหนือแท่งกราฟของแต่ละชั่วโมงเพื่อดูสถิติจำนวนคนสแกน</span>
            <span className="font-semibold text-slate-500">เป้าหมาย: บริการประทับใจส่งเสริมการเรียนรู้ของทุกระดับชั้น</span>
          </div>

        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-700 flex items-center gap-1.5">
                <BarChart3 className="w-5 h-5 text-teal-600" />
                กราฟความผันผวนของผู้เข้าใช้งานรายวัน (Daily Monthly Trend)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                สถิติมุมมองแนวโน้มความเคลื่อนไหวของแต่ละวันในเดือน <strong className="text-slate-700 underline">{formatThaiMonth(selectedMonth)}</strong>
              </p>
            </div>
            
            {/* Legend info badges */}
            <div className="flex gap-3 text-[10px] text-slate-500 font-bold">
              <span className="flex items-center gap-1 bg-teal-50 px-2 py-1 rounded-lg text-teal-700 border border-teal-100">
                เฉลี่ยรายวัน: {averageDailyCount} คน
              </span>
              <span className="flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-lg text-indigo-700 border border-indigo-100">
                วันพีค: {peakDayOfWeekText.split(' ')[0]}
              </span>
            </div>
          </div>

          {/* Monthly Trend Scrollable Bar Chart */}
          <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200">
            <div className="pt-8 pb-2 px-2 min-w-[700px] w-full" id="monthly-trend-bars-graph">
              <div className="h-44 flex items-end justify-between gap-1.5 border-b border-slate-100 relative">
                
                <div className="absolute left-0 right-0 top-0 border-t border-slate-100 text-[9px] text-slate-350 pt-1 pointer-events-none"></div>
                <div className="absolute left-0 right-0 top-1/2 border-t border-slate-100 text-[9px] text-slate-350 pt-1 pointer-events-none"></div>

                {monthlyTrendData.map((item) => {
                  const heightPct = maxMonthlyDayCount > 0 ? (item.count / maxMonthlyDayCount) * 100 : 0;
                  const isHovered = hoveredMonthlyDay === item.dayNum;
                  
                  return (
                    <div 
                      key={item.dayNum} 
                      className="flex-1 flex flex-col items-center relative group min-w-[14px]"
                      onMouseEnter={() => setHoveredMonthlyDay(item.dayNum)}
                      onMouseLeave={() => setHoveredMonthlyDay(null)}
                    >
                      {/* Tooltip */}
                      <div className={`absolute -top-14 bg-slate-900 text-white rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all z-10 shadow-lg pointer-events-none flex flex-col items-center w-20 leading-tight ${isHovered ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
                        <span className="text-[8px] text-slate-400">วันที่ {item.dayNum}</span>
                        <span className="text-teal-300">{item.count} คน</span>
                        <div className="w-1.5 h-1.5 bg-slate-900 rotate-45 -mb-1 mt-0.5"></div>
                      </div>

                      {/* Day Bar */}
                      <div className="w-full bg-slate-150/40 hover:bg-slate-100 rounded-t-md overflow-hidden flex flex-col justify-end transition-colors min-h-[4px]">
                        <div 
                          className={`w-full bg-gradient-to-t ${isHovered ? 'from-indigo-600 to-indigo-400 shadow-md' : 'from-teal-500 to-teal-400'} rounded-t-sm transition-all duration-700`}
                          style={{ height: `${item.count > 0 ? Math.max(4, heightPct) : 0}%` }}
                        ></div>
                      </div>

                      {/* Day Number Label */}
                      <span className={`text-[9px] font-bold mt-2 ${isHovered ? 'text-indigo-600 scale-110 font-extrabold' : 'text-slate-400'}`}>
                        {item.dayNum}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          
          <div className="flex justify-between items-center text-[10px] text-slate-400 bg-slate-50 rounded-xl p-3 mt-2">
            <span>* วางเมาส์ (Hover) เหนือกราฟแต่ละแท่ง เพื่อดูยอดรวมผู้ใช้บริการวิเคราะห์สรุปรายวันของเดือน</span>
            <span className="font-semibold text-slate-500">โรงเรียนบ้านไผ่ จังหวัดขอนแก่น</span>
          </div>

        </div>
      )}

    </div>
  );
}
