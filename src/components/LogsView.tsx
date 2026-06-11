import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Search, Filter, Download, Trash2, Calendar, FileText, CheckCircle } from 'lucide-react';
import { LibraryEntry, UserRole, Gender } from '../types';

interface LogsViewProps {
  entries: LibraryEntry[];
  onDeleteEntry: (id: string) => void;
}

export default function LogsView({ entries, onDeleteEntry }: LogsViewProps) {
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

  // 1. Filtered and searched data
  const filteredEntries = entries.filter((entry) => {
    // Search keyword search matches
    const roleMatch = entry.role.toLowerCase().includes(searchTerm.toLowerCase());
    const queueMatch = entry.queue.toString() === searchTerm.trim();
    const channelMatch = entry.channel.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSearch = searchTerm === '' || roleMatch || queueMatch || channelMatch;

    // Filters matches
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
    const today = new Date().toISOString().split('T')[0];
    const reportTitleDate = new Date().toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Sheet 1: statistics overview calculations
    const maleCount = entries.filter(e => e.gender === 'ชาย').length;
    const femaleCount = entries.filter(e => e.gender === 'หญิง').length;
    const totalCount = entries.length;
    const malePct = totalCount > 0 ? Math.round((maleCount / totalCount) * 100) : 0;
    const femalePct = totalCount > 0 ? Math.round((femaleCount / totalCount) * 100) : 0;

    const roleCounts = rolesList.reduce((acc, curr) => {
      acc[curr] = entries.filter(e => e.role === curr).length;
      return acc;
    }, {} as Record<UserRole, number>);

    // Construct Sheet 1 data as 2D Array of Arrays (for visual padding and summary tables)
    const sheet1Data = [
      ["รายงานสรุปสถิติผู้เข้าใช้บริการห้องสมุดประจำวัน (สรุปผล)"],
      ["ศูนย์วิทยบริการ โรงเรียนบ้านไผ่ จังหวัดขอนแก่น สพม.25"],
      [`ข้อมูลประมวลผล ณ วันที่: ${reportTitleDate}`],
      [],
      ["ตารางที่ 1: สรุปความถี่ตามเพศผู้เข้าใช้งาน"],
      ["เพศ", "จำนวนผู้ใช้งาน (คน)", "อัตราส่วนร้อยละ (%)"],
      ["ชาย (Male)", maleCount, `${malePct}%`],
      ["หญิง (Female)", femaleCount, `${femalePct}%`],
      ["ยอดผู้เข้าใช้บริการรวมทั้งหมด", totalCount, "100%"],
      [],
      ["ตารางที่ 2: สรุปความถี่จัดตามบทบาทและระดับชั้นการศึกษา"],
      ["ประเภทบุคลากร / ระดับชั้น", "จำนวนผู้ใช้งาน (คน)", "คิดเป็นสัดส่วน (%)"],
      ...rolesList.map(role => {
        const count = roleCounts[role];
        const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
        return [role, count, `${pct}%`];
      }),
      ["รวมสะสมทั้งสิ้น", totalCount, "100%"],
      [],
      [`* ส่งออกโดยเจ้าหน้าที่ศูนย์วิทยบริการ โรงเรียนบ้านไผ่ เมื่อปี 2026`]
    ];

    // Sheet 2: Raw data records
    const sheet2Data = [
      ["ตารางสถิติจำนวนคนเข้าใช้บริการห้องสมุด (ข้อมูลประวัติตามลำดับคิวและช่องทางบันทึก)"],
      ["ศูนย์วิทยบริการ โรงเรียนบ้านไผ่ จังหวัดขอนแก่น สพม.25"],
      [],
      ["ลำดับคิวกดบัตร", "วันที่จดบันทึก", "ช่วงเวลาสแกน", "เพศของบุคคล", "ประเภท / ระดับชั้น", "ช่องทางการบันทึกเข้าระบบ"],
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
    // Add column width config for beautiful padding
    ws1['!cols'] = [
      { wch: 32 }, // Col A
      { wch: 22 }, // Col B
      { wch: 22 }  // Col C
    ];
    XLSX.utils.book_append_sheet(wb, ws1, "สรุปสถิติประจำวัน");

    // Sheet 2 setup
    const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);
    ws2['!cols'] = [
      { wch: 16 }, // Queue
      { wch: 18 }, // Date
      { wch: 16 }, // Time
      { wch: 14 }, // Gender
      { wch: 24 }, // Role
      { wch: 34 }  // Channel text
    ];
    XLSX.utils.book_append_sheet(wb, ws2, "ตารางสถิติอย่างละเอียด");

    // Trigger Excel download
    XLSX.writeFile(wb, `รายงานสถิติห้องสมุด_โรงเรียนบ้านไผ่_${today}.xlsx`);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-4 space-y-6" id="logs-container">
      
      {/* Search and Filters Header block */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-500" />
              รายงานข้อมูลและประวัติผู้เข้าใช้บริการวันนี้
            </h3>
            <p className="text-slate-500 text-xs mt-0.5">ลบเฉพาะบันทึกที่บันทึกปริมาณผิดพลาด หรือกรองข้อมูลสดเพื่อส่งคู่มือเอ็กเซลด่วน</p>
          </div>
          
          <button
            onClick={handleExportExcel}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/10 cursor-pointer transition transform active:scale-95"
            id="logs-export-excel"
            title="ดาวน์โหลดโครงสร้าง Microsoft Excel .xlsx 2 แผ่นงาน"
          >
            <Download className="w-4 h-4" />
            ดาวน์โหลดเข้า Excel (.xlsx) 2 แผ่นงาน
          </button>
        </div>

        {/* Filters Widget row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
          
          {/* Keyword search input */}
          <div className="relative">
            <label className="block text-[10px] font-bold text-slate-500 mb-1">คำค้นหา (ลำดับคิว, บทบาท, ช่องทาง)</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="พิมพ์สิ่งที่ค้นหา..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="pl-9 w-full p-2.5 bg-white border border-slate-200 outline-none focus:border-indigo-500 rounded-xl text-xs font-medium"
              />
            </div>
          </div>

          {/* Gender filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">ตัวกรอง "เพศ"</label>
            <select
              value={genderFilter}
              onChange={(e) => { setGenderFilter(e.target.value as any); setCurrentPage(1); }}
              className="w-full p-2.5 bg-white border border-slate-200 outline-none focus:border-indigo-500 rounded-xl text-xs font-medium"
            >
              <option value="ทั้งหมด">ทั้งหมด (ทุกเพศ)</option>
              <option value="ชาย">ชาย</option>
              <option value="หญิง">หญิง</option>
            </select>
          </div>

          {/* Role filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">ตัวกรอง "ระดับชั้น/ประเภทผู้ใช้"</label>
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value as any); setCurrentPage(1); }}
              className="w-full p-2.5 bg-white border border-slate-200 outline-none focus:border-indigo-500 rounded-xl text-xs font-medium"
            >
              <option value="ทั้งหมด">ทั้งหมด (ทุกสถานะ)</option>
              {rolesList.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>

          {/* Channel filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">ตัวกรอง "ช่องทางจัดเก็บ"</label>
            <select
              value={channelFilter}
              onChange={(e) => { setChannelFilter(e.target.value as any); setCurrentPage(1); }}
              className="w-full p-2.5 bg-white border border-slate-200 outline-none focus:border-indigo-500 rounded-xl text-xs font-medium"
            >
              <option value="ทั้งหมด">ทั้งหมด (Kiosk + บรรณารักษ์ + บันทึกกลุ่ม)</option>
              <option value="Kiosk">ลงชื่อเข้าใช้บริการ (Kiosk)</option>
              <option value="Librarian">บรรณารักษ์ (+1 ด่วน)</option>
              <option value="Bulk">บันทึกแบบกลุ่ม (Bulk)</option>
            </select>
          </div>

        </div>

        {/* Quantities indicator banner */}
        <div className="mt-3 flex justify-between items-center text-xs text-slate-500" id="filter-results-info">
          <span>พบผลลัพธ์การคัดกรอง: <strong className="text-slate-800 underline">{totalItems}</strong> คน จากทั้งหมด <strong className="text-slate-800">{entries.length}</strong> คน</span>
          {(genderFilter !== 'ทั้งหมด' || roleFilter !== 'ทั้งหมด' || channelFilter !== 'ทั้งหมด' || searchTerm !== '') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setGenderFilter('ทั้งหมด');
                setRoleFilter('ทั้งหมด');
                setChannelFilter('ทั้งหมด');
                setCurrentPage(1);
              }}
              className="text-indigo-600 hover:underline cursor-pointer font-bold text-[11px]"
            >
              ล้างตัวกรองทั้งหมด
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
                <th className="p-4 text-xs font-bold text-slate-700">วันที่ / เวลา</th>
                <th className="p-4 text-xs font-bold text-slate-700">ระบุเพศ</th>
                <th className="p-4 text-xs font-bold text-slate-700">ประเภท / ระดับชั้น</th>
                <th className="p-4 text-xs font-bold text-slate-700">ช่องทางการบันทึกเข้าระบบ</th>
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
                        <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-lg text-[11px]">
                          #{entry.queue}
                        </span>
                      </td>

                      {/* Time and date */}
                      <td className="p-4">
                        <div className="font-semibold text-slate-800">{entry.time} น.</div>
                        <div className="text-[10px] text-slate-400 font-medium">{entry.date}</div>
                      </td>

                      {/* Gender */}
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 font-extrabold ${entry.gender === 'ชาย' ? 'text-sky-600' : 'text-pink-500'}`}>
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
                            if (confirm(`คุณต้องการลบลำดับคิว #${entry.queue} (เพศ${entry.gender} : ${entry.role}) ใช่หรือไม่?`)) {
                              onDeleteEntry(entry.id);
                            }
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
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    <FileText className="w-10 h-10 mx-auto text-slate-200 mb-2" />
                    ไม่มีข้อมูลผู้ใช้งานที่ตรงตามเงื่อนไขตัวกรอง
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Widget footer bar */}
        {totalPages > 1 && (
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">แสดงผลจากข้อมูลลำดับที่ {startIndex + 1} - {Math.min(startIndex + itemsPerPage, totalItems)} จากท้ายตัวกรอง {totalItems} แถว</span>
            
            <div className="flex gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-xs font-bold transition cursor-pointer"
              >
                ย้อนกลับ
              </button>
              
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center ${page === currentPage ? 'bg-indigo-600 text-white' : 'border border-slate-200 bg-white hover:bg-slate-50'}`}
                  >
                    {page}
                  </button>
                ))}
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
