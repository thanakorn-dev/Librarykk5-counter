import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Search, Filter, Download, Trash2, Calendar, FileText, CheckCircle, ChevronRight, BarChart3 } from 'lucide-react';
import { LibraryEntry, UserRole, Gender } from '../types';

interface LogsViewProps {
  entries: LibraryEntry[];
  onDeleteEntry: (id: string, detailMsg?: string) => void;
}

export default function LogsView({ entries, onDeleteEntry }: LogsViewProps) {
  // Extract all unique dates and months available in the entries database
  const availableDates = Array.from(new Set(entries.map((e) => e.date)))
    .sort((a, b) => b.localeCompare(a)); // Newest first

  const availableMonths = Array.from(new Set(entries.map((e) => e.date.substring(0, 7))))
    .sort((a, b) => b.localeCompare(a)); // Newest first

  // Date and filter modes
  const [dateMode, setDateMode] = useState<'ทั้งหมด' | 'เจาะจงวัน' | 'เจาะจงเดือน'>('เจาะจงวัน');
  const [selectedTargetDate, setSelectedTargetDate] = useState<string>(availableDates[0] || new Date().toISOString().split('T')[0]);
  const [selectedTargetMonth, setSelectedTargetMonth] = useState<string>(availableMonths[0] || new Date().toISOString().split('T')[0].substring(0, 7));

  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState<'ทั้งหมด' | Gender>('ทั้งหมด');
  const [roleFilter, setRoleFilter] = useState<'ทั้งหมด' | UserRole>('ทั้งหมด');
  const [channelFilter, setChannelFilter] = useState<'ทั้งหมด' | 'Kiosk' | 'Librarian' | 'Bulk'>('ทั้งหมด');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const rolesList: UserRole[] = [
    'ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6', 'ครู', 'ผู้บริหาร', 'เจ้าหน้าที่', 'บุคคลภายนอก'
  ];

  // Helper to translate YYYY-MM into Thai Month Label
  const formatThaiMonthStr = (yearMonthStr: string) => {
    if (!yearMonthStr) return '';
    const [year, month] = yearMonthStr.split('-');
    const monthNames = [
      "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
      "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    ];
    return `${monthNames[parseInt(month, 10) - 1]} พ.ศ. ${parseInt(year, 10) + 543}`;
  };

  // Helper to translate YYYY-MM-DD into short Thai Date label
  const formatThaiDateStrShort = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // 1. Filtered and searched data
  const filteredEntries = entries.filter((entry) => {
    // A. Apply Date Filter Mode
    if (dateMode === 'เจาะจงวัน') {
      if (entry.date !== selectedTargetDate) return false;
    } else if (dateMode === 'เจาะจงเดือน') {
      if (!entry.date.startsWith(selectedTargetMonth)) return false;
    }

    // B. Apply Text Search Matches (Filter by Queue, Role or Channel)
    const roleMatch = entry.role.toLowerCase().includes(searchTerm.toLowerCase());
    const queueMatch = entry.queue.toString() === searchTerm.trim();
    const channelMatch = entry.channel.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSearch = searchTerm === '' || roleMatch || queueMatch || channelMatch;

    // C. Apply Demographic Dropdown Filters
    const matchesGender = genderFilter === 'ทั้งหมด' || entry.gender === genderFilter;
    const matchesRole = roleFilter === 'ทั้งหมด' || entry.role === roleFilter;
    const matchesChannel = channelFilter === 'ทั้งหมด' || entry.channel === channelFilter;

    return matchesSearch && matchesGender && matchesRole && matchesChannel;
  });

  // Calculate pages
  const totalItems = filteredEntries.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEntries = filteredEntries.slice(startIndex, startIndex + itemsPerPage);

  // Helper to get channel badge labels and styles
  const getChannelBadge = (channel: 'Kiosk' | 'Librarian' | 'Bulk') => {
    switch (channel) {
      case 'Kiosk':
        return {
          label: 'ลงชื่อเข้าใช้บริการ (Kiosk)',
          color: 'bg-emerald-50 text-emerald-700 border-emerald-200'
        };
      case 'Librarian':
        return {
          label: 'บรรณารักษ์ (+1)',
          color: 'bg-indigo-50 text-indigo-700 border-indigo-200'
        };
      case 'Bulk':
        return {
          label: 'บันทึกกลุ่ม (Bulk)',
          color: 'bg-amber-50 text-amber-700 border-amber-200'
        };
    }
  };

  // 2. Export 2-Sheet Excel Worksheet (Microsoft Excel Compatible Structure)
  const handleExportExcel = () => {
    // Generate context label for filename and headers
    let activeFilterLabel = '';
    if (dateMode === 'เจาะจงวัน') {
      activeFilterLabel = `ประจำวันที่_${formatThaiDateStrShort(selectedTargetDate)}`;
    } else if (dateMode === 'เจาะจงเดือน') {
      activeFilterLabel = `ประจำเดือน_${formatThaiMonthStr(selectedTargetMonth)}`;
    } else {
      activeFilterLabel = 'ทั้งหมดย้อนหลัง';
    }

    const reportTitleDate = dateMode === 'เจาะจงวัน' 
      ? formatThaiDateStrShort(selectedTargetDate) 
      : (dateMode === 'เจาะจงเดือน' ? formatThaiMonthStr(selectedTargetMonth) : 'สถิติประวัติทั้งหมด');

    // Stats calculations strictly on the selected filtered subset to match search and date filter
    const maleCount = filteredEntries.filter(e => e.gender === 'ชาย').length;
    const femaleCount = filteredEntries.filter(e => e.gender === 'หญิง').length;
    const totalCount = filteredEntries.length;
    const malePct = totalCount > 0 ? Math.round((maleCount / totalCount) * 100) : 0;
    const femalePct = totalCount > 0 ? Math.round((femaleCount / totalCount) * 100) : 0;

    const roleCounts = rolesList.reduce((acc, curr) => {
      acc[curr] = filteredEntries.filter(e => e.role === curr).length;
      return acc;
    }, {} as Record<UserRole, number>);

    // Construct Sheet 1: Aggregate statistics summary table
    const sheet1Data = [
      [`รายงานสรุปวิเคราะห์สถิติผู้เข้าใช้บริการห้องสมุด (${reportTitleDate})`],
      ["ศูนย์วิทยบริการ โรงเรียนบ้านไผ่ จังหวัดขอนแก่น สพม.ขอนแก่น"],
      [`ประมวลผลข้อมูลส่งออก ณ วันที่: ${new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} น.`],
      [],
      ["ตารางที่ 1: สรุปความถี่ผู้เข้าใช้บริการจำแนกตามเพศ"],
      ["เพศผู้ใช้งาน", "จำนวนผู้เข้าใช้บริการ (คน)", "คิดเป็นอัตราส่วน (%)"],
      ["ชาย (Male)", maleCount, `${malePct}%`],
      ["หญิง (Female)", femaleCount, `${femalePct}%`],
      ["ยอดรวมผู้ใช้บริการคัดกรองทั้งหมด", totalCount, "100%"],
      [],
      ["ตารางที่ 2: สรุปความถี่ผู้เข้าใช้บริการจัดกลุ่มตามระดับชั้น/บทบาทและสถานภาพ"],
      ["ประเภทระดับชั้น / บทบาทบุคลากร", "จำนวนผู้เข้าใช้บริการ (คน)", "คิดเป็นสัดส่วนสะสม (%)"],
      ...rolesList.map(role => {
        const count = roleCounts[role];
        const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
        return [role, count, `${pct}%`];
      }),
      ["ยอดสถิติตามตัวกรองรวมทั้งสิ้น", totalCount, "100%"],
      [],
      ["* ไฟล์ส่งออกความละเอียดเชิงกลยุทธ์จากเซิร์ฟเวอร์ระบบสารสนเทศคิวคัดกรอง ศูนย์วิทยบริการ โรงเรียนบ้านไผ่"]
    ];

    // Construct Sheet 2: Raw data records
    const sheet2Data = [
      [`รายการประวัติสถิติบันทึกผู้ใช้บริการห้องสมุดรายตัวบุคคล (${reportTitleDate})`],
      ["ศูนย์วิทยบริการ โรงเรียนบ้านไผ่ จังหวัดขอนแก่น สพม.ขอนแก่น"],
      [],
      ["ลำดับคิวกดบัตร", "วันที่จดบันทึก (ปี-เดือน-วัน)", "ช่วงเวลาบันทึกเข้า", "เพศของบุคคล", "ประเภทวิชา / ระดับชั้น", "ช่องทางการลงทะเบียน"],
      ...filteredEntries.map(e => [
        e.queue,
        e.date,
        e.time,
        e.gender,
        e.role,
        e.channel === 'Kiosk' ? 'ลงชื่อเข้าใช้บริการ (Kiosk Touch)' : (e.channel === 'Librarian' ? 'คุณครูบันทึกด่วน (+1)' : 'บันทึกกลุ่มสำหรับเรียน (Bulk)')
      ])
    ];

    // Create a new workbook
    const wb = XLSX.utils.book_new();

    // Sheet 1 setup
    const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);
    ws1['!cols'] = [
      { wch: 42 }, // Col A
      { wch: 26 }, // Col B
      { wch: 24 }  // Col C
    ];
    XLSX.utils.book_append_sheet(wb, ws1, "สรุปภาพรวมสถิติ");

    // Sheet 2 setup
    const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);
    ws2['!cols'] = [
      { wch: 16 }, // Queue
      { wch: 22 }, // Date
      { wch: 18 }, // Time
      { wch: 15 }, // Gender
      { wch: 26 }, // Role
      { wch: 38 }  // Channel text
    ];
    XLSX.utils.book_append_sheet(wb, ws2, "ข้อมูลรายละเอียดรายบุคคล");

    // Trigger download
    XLSX.writeFile(wb, `รายงานสถิติห้องสมุด_โรงเรียนบ้านไผ่_${activeFilterLabel}.xlsx`);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-4 space-y-6" id="logs-container">
      
      {/* Search and Filters Header block */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-500" />
              รายงานข้อมูลและสถิติตารางผู้เข้าใช้อย่างละเอียด
            </h3>
            <p className="text-slate-500 text-xs mt-0.5">เลือกเจาะจงวัน ดูรายเวลาย้อนหลัง หรือเลือกรายงานรายเดือนเพื่อดึงประวัติมาออกไฟล์ Excel</p>
          </div>
          
          <button
            onClick={handleExportExcel}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/10 cursor-pointer transition transform active:scale-95"
            id="logs-export-excel"
            title="ดาวน์โหลดโครงสร้าง Microsoft Excel .xlsx 2 แผ่นงาน"
          >
            <Download className="w-4 h-4" />
            ดาวน์โหลดเข้า Excel (.xlsx) ตามตัวกรองปัจจุบัน
          </button>
        </div>

        {/* Filters Widget row - Grid splits beautifully */}
        <div className="space-y-4">
          
          {/* Main Select Row 1: Period selectors (Date Mode and Picker) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
            
            {/* 1. Date Mode select */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">ช่วงเวลาของข้อมูลประวัติ</label>
              <div className="flex bg-slate-200/60 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => { setDateMode('เจาะจงวัน'); setCurrentPage(1); }}
                  className={`flex-1 text-center py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${dateMode === 'เจาะจงวัน' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 text-xs'}`}
                >
                  ค้นรายวัน
                </button>
                <button
                  type="button"
                  onClick={() => { setDateMode('เจาะจงเดือน'); setCurrentPage(1); }}
                  className={`flex-1 text-center py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${dateMode === 'เจาะจงเดือน' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 text-xs'}`}
                >
                  ค้นรายเดือน
                </button>
                <button
                  type="button"
                  onClick={() => { setDateMode('ทั้งหมด'); setCurrentPage(1); }}
                  className={`flex-1 text-center py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${dateMode === 'ทั้งหมด' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 text-xs'}`}
                >
                  ทั้งหมด
                </button>
              </div>
            </div>

            {/* 2. Target specific picker selection */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">ระยะเวลาที่ระบุตรวจสอบ</label>
              {dateMode === 'เจาะจงวัน' && (
                <select
                  value={selectedTargetDate}
                  onChange={(e) => { setSelectedTargetDate(e.target.value); setCurrentPage(1); }}
                  className="w-full p-2.5 bg-white border border-slate-200 outline-none focus:border-indigo-500 rounded-xl text-xs font-bold text-slate-800"
                >
                  {availableDates.map(d => (
                    <option key={d} value={d}>วันที่ {formatThaiDateStrShort(d)} ({entries.filter(e => e.date === d).length} คน)</option>
                  ))}
                </select>
              )}
              {dateMode === 'เจาะจงเดือน' && (
                <select
                  value={selectedTargetMonth}
                  onChange={(e) => { setSelectedTargetMonth(e.target.value); setCurrentPage(1); }}
                  className="w-full p-2.5 bg-white border border-slate-200 outline-none focus:border-indigo-500 rounded-xl text-xs font-bold text-slate-800"
                >
                  {availableMonths.map(m => (
                    <option key={m} value={m}>เดือน {formatThaiMonthStr(m)} ({entries.filter(e => e.date.startsWith(m)).length} คน)</option>
                  ))}
                </select>
              )}
              {dateMode === 'ทั้งหมด' && (
                <div className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-500 text-center">
                  แสดงข้อมูลสะสมทั้งหมด ({entries.length} แถวประวัติ)
                </div>
              )}
            </div>

            {/* 3. Keyword Search */}
            <div className="relative">
              <label className="block text-[10px] font-bold text-slate-500 mb-1">คำค้นหาหลัก (คิว, บทบาท, ช่องทาง)</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหา เช่น ม.4, บรรณารักษ์, Kiosk..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="pl-9 w-full p-2.5 bg-white border border-slate-200 outline-none focus:border-indigo-500 rounded-xl text-xs font-semibold"
                />
              </div>
            </div>

          </div>

          {/* Row 2: Demographics filter controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
            {/* Gender filter */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">ตัวกรอง "ระบุเพศผู้เข้าใช้"</label>
              <select
                value={genderFilter}
                onChange={(e) => { setGenderFilter(e.target.value as any); setCurrentPage(1); }}
                className="w-full p-2.5 bg-white border border-slate-200 outline-none focus:border-indigo-500 rounded-xl text-xs font-semibold"
              >
                <option value="ทั้งหมด">ทั้งหมด (ชาย + หญิง)</option>
                <option value="ชาย">ชาย (Male)</option>
                <option value="หญิง">หญิง (Female)</option>
              </select>
            </div>

            {/* Role filter */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">ตัวกรอง "ประเภทบุคคล / ระดับชั้น"</label>
              <select
                value={roleFilter}
                onChange={(e) => { setRoleFilter(e.target.value as any); setCurrentPage(1); }}
                className="w-full p-2.5 bg-white border border-slate-200 outline-none focus:border-indigo-500 rounded-xl text-xs font-semibold"
              >
                <option value="ทั้งหมด">ทั้งหมด (ทุกระดับชั้น/บุคลากร)</option>
                {rolesList.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>

            {/* Channel filter */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">ตัวกรอง "ช่องทางการบันทึกเข้าระบบ"</label>
              <select
                value={channelFilter}
                onChange={(e) => { setChannelFilter(e.target.value as any); setCurrentPage(1); }}
                className="w-full p-2.5 bg-white border border-slate-200 outline-none focus:border-indigo-500 rounded-xl text-xs font-semibold"
              >
                <option value="ทั้งหมด">ทั้งหมด (Kiosk + คีย์บรรณารักษ์ + กลุ่มBulk)</option>
                <option value="Kiosk">ลงชื่อเข้าใช้บริการ (Kiosk Touch)</option>
                <option value="Librarian">คีย์บวกโดยบรรณารักษ์ (+1)</option>
                <option value="Bulk">บันทึกแบบรายกลุ่ม (Bulk Entry)</option>
              </select>
            </div>
          </div>

        </div>

        {/* Quantities indicator banner */}
        <div className="mt-4 flex justify-between items-center text-xs text-slate-500" id="filter-results-info">
          <span>พบผลลัพธ์ประวัติตรงตามเงื่อนไข: <strong className="text-slate-900 underline font-extrabold">{totalItems}</strong> คน ในผลคัดกรอง (ฐานข้อมูลรวม {entries.length} แถวสถิติ)</span>
          {(genderFilter !== 'ทั้งหมด' || roleFilter !== 'ทั้งหมด' || channelFilter !== 'ทั้งหมด' || searchTerm !== '' || dateMode !== 'ทั้งหมด') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setGenderFilter('ทั้งหมด');
                setRoleFilter('ทั้งหมด');
                setChannelFilter('ทั้งหมด');
                setDateMode('ทั้งหมด');
                setCurrentPage(1);
              }}
              className="text-indigo-600 hover:underline cursor-pointer font-bold text-[11px]"
            >
              ล้างตัวกรองและแสดงทั้งหมดคู่กัน
            </button>
          )}
        </div>
      </div>

      {/* Logs Table Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse" id="logs-history-table">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="p-4 text-xs font-bold text-slate-500 text-center w-24">ลำดับคิว</th>
                <th className="p-4 text-xs font-bold text-slate-750">วันที่ / วันสแกน</th>
                <th className="p-4 text-xs font-bold text-slate-750">ช่วงเวลาเข้าใช้งาน</th>
                <th className="p-4 text-xs font-bold text-slate-750">ระบุเพศบุคคล</th>
                <th className="p-4 text-xs font-bold text-slate-750">บทบาท / ระดับชั้น</th>
                <th className="p-4 text-xs font-bold text-slate-750">ช่องทางผ่านพอร์ทัล</th>
                <th className="p-4 text-xs font-bold text-slate-500 text-center w-28">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedEntries.length > 0 ? (
                paginatedEntries.map((entry) => {
                  const badge = getChannelBadge(entry.channel);
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Queue */}
                      <td className="p-4 text-center font-bold font-mono">
                        <span className="bg-indigo-50 text-indigo-750 px-2 py-1 rounded-lg text-[11px] font-black">
                          #{entry.queue}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="p-4">
                        <div className="text-slate-800 font-semibold">{formatThaiDateStrShort(entry.date)}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{entry.date}</div>
                      </td>

                      {/* Time */}
                      <td className="p-4">
                        <div className="font-bold text-slate-800 font-mono text-sm">{entry.time} น.</div>
                      </td>

                      {/* Gender */}
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 font-black ${entry.gender === 'ชาย' ? 'text-sky-600' : 'text-pink-500'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${entry.gender === 'ชาย' ? 'bg-sky-500' : 'bg-pink-500'}`}></span>
                          {entry.gender}
                        </span>
                      </td>

                      {/* Role */}
                      <td className="p-4">
                        <div>
                          <strong className="text-slate-800 text-sm font-bold">{entry.role}</strong>
                          <span className="text-[10px] text-slate-400 block font-medium">({entry.role.startsWith('ม.') ? `ระดับมัธยมปีที่ ${entry.role.replace('ม.', '')}` : entry.role})</span>
                        </div>
                      </td>

                      {/* Channel */}
                      <td className="p-4">
                        <span className={`px-2.5 py-1 text-[10px] font-bold border rounded-lg ${badge.color}`}>
                          {badge.label}
                        </span>
                      </td>

                      {/* Trash action */}
                      <td className="p-4 text-center">
                        <button
                          onClick={() => {
                            onDeleteEntry(entry.id, `ลำดับคิว #${entry.queue} ของวันที่ ${formatThaiDateStrShort(entry.date)} (เพศ${entry.gender} : ${entry.role})`);
                          }}
                          className="p-1 px-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-150 hover:border-rose-200 text-rose-600 rounded-lg transition-colors cursor-pointer"
                          title="ลบสถิติรายการนี้"
                          id={`delete-entry-${entry.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-slate-400">
                    <FileText className="w-10 h-10 mx-auto text-slate-200 mb-2" />
                    ไม่มีข้อมูลผู้ใช้งานที่บันทึกไว้ในสับเซตและวันที่ตัวกรองที่เลือก
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Widget footer bar */}
        {totalPages > 1 && (
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-slate-500">แสดงผลสถิติแถวที่ {startIndex + 1} - {Math.min(startIndex + itemsPerPage, totalItems)} จากแถวคัดกรองทั้งหมด {totalItems} แถว</span>
            
            <div className="flex gap-1 overflow-x-auto max-w-full">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-xs font-bold transition cursor-pointer"
              >
                ย้อนกลับ
              </button>
              
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  // Only display up to some range around current page if totalPages is massive
                  if (totalPages > 6 && Math.abs(page - currentPage) > 2 && page !== 1 && page !== totalPages) {
                    if (page === 2 || page === totalPages - 1) {
                      return <span key={page} className="px-1 text-slate-400 self-center">...</span>;
                    }
                    return null;
                  }
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center ${page === currentPage ? 'bg-indigo-600 text-white shadow-sm' : 'border border-slate-200 bg-white hover:bg-slate-50'}`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-xs font-bold transition cursor-pointer"
              >
                ถัดไป
              </button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
