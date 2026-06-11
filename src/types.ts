export type Gender = 'ชาย' | 'หญิง';

export type UserRole =
  | 'ม.1'
  | 'ม.2'
  | 'ม.3'
  | 'ม.4'
  | 'ม.5'
  | 'ม.6'
  | 'ครู'
  | 'ผู้บริหาร'
  | 'เจ้าหน้าที่'
  | 'บุคคลภายนอก';

export interface LibraryEntry {
  id: string;
  queue: number;      // Queue number of the day
  timestamp: string;  // Date and time string
  date: string;       // YYYY-MM-DD
  time: string;       // HH:mm:ss or HH:mm
  gender: Gender;
  role: UserRole;
  channel: 'Kiosk' | 'Librarian' | 'Bulk';
}

export interface HourlyStat {
  hourString: string; // e.g. "07:00", "08:00", ...
  count: number;
}
