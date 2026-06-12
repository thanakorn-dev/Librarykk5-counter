import { LibraryEntry, UserRole, Gender } from './types';

// Helper to generate a random item from array
const randomChoice = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Generate random time between startHour and endHour
const generateRandomTime = (startHour: number, endHour: number): string => {
  const hour = Math.floor(Math.random() * (endHour - startHour + 1)) + startHour;
  const minute = Math.floor(Math.random() * 60);
  const hourStr = hour.toString().padStart(2, '0');
  const minStr = minute.toString().padStart(2, '0');
  return `${hourStr}:${minStr}`;
};

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function generateInitialEntries(): LibraryEntry[] {
  const entries: LibraryEntry[] = [];
  
  const roles: UserRole[] = [
    'ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6',
    'ครู', 'ผู้บริหาร', 'เจ้าหน้าที่', 'บุคคลภายนอก'
  ];
  
  // Custom probabilities to make the breakdown realistic
  // Students (M.1 - M.6) will be more, then teachers, etc.
  const roleWeights: { role: UserRole; weight: number }[] = [
    { role: 'ม.1', weight: 22 },
    { role: 'ม.2', weight: 25 },
    { role: 'ม.3', weight: 18 },
    { role: 'ม.4', weight: 28 },
    { role: 'ม.5', weight: 20 },
    { role: 'ม.6', weight: 15 },
    { role: 'ครู', weight: 10 },
    { role: 'ผู้บริหาร', weight: 2 },
    { role: 'เจ้าหน้าที่', weight: 4 },
    { role: 'บุคคลภายนอก', weight: 6 },
  ];

  // Flat helper array based on weights to select matching weights
  const weightedRoles: UserRole[] = [];
  roleWeights.forEach(({ role, weight }) => {
    for (let i = 0; i < weight; i++) {
      weightedRoles.push(role);
    }
  });

  const genders: Gender[] = ['ชาย', 'หญิง'];
  const todayStr = getTodayDateString();
  
  // Generate historical data for the last 15 days (highly comprehensive and responsive)
  const dateList: string[] = [];
  for (let i = 15; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    dateList.push(`${year}-${month}-${day}`);
  }
  
  let idxGlobal = 0;
  
  dateList.forEach((dateString) => {
    const isToday = dateString === todayStr;
    // Support around 1,000 users per day (highly realistic and beautifully distributed from 950 to 1,080)
    const entriesCount = isToday ? 1012 : Math.floor(Math.random() * 130) + 950;
    
    const dayEntries: LibraryEntry[] = [];
    
    for (let i = 0; i < entriesCount; i++) {
      const role = randomChoice(weightedRoles);
      const gender = randomChoice(genders);
      
      // Hour generation based on peak times
      let hour = 8;
      const r = Math.random();
      if (r < 0.1) {
        hour = 7; // Early morning standard arrival
      } else if (r < 0.25) {
        hour = 8 + Math.floor(Math.random() * 3); // 8, 9, 10
      } else if (r < 0.65) {
        hour = 11 + Math.floor(Math.random() * 2); // 11, 12 (Lunch break - high peak)
      } else if (r < 0.75) {
        hour = 13 + Math.floor(Math.random() * 2); // 13, 14
      } else if (r < 0.95) {
        hour = 15 + Math.floor(Math.random() * 3); // 15, 16, 17 (After school - high peak)
      } else {
        hour = 18; // library closing hours
      }
      
      const minutes = Math.floor(Math.random() * 60);
      const timeString = `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      
      const channel = Math.random() < 0.65 ? 'Kiosk' : (Math.random() < 0.8 ? 'Librarian' : 'Bulk');
      const timestampStr = `${dateString}T${timeString}:00`;
      
      dayEntries.push({
        id: `mock-${idxGlobal++}-${Math.random().toString(36).substring(2, 7)}`,
        queue: 0, // will be sorted and assigned hereafter
        timestamp: timestampStr,
        date: dateString,
        time: timeString,
        gender,
        role,
        channel,
      });
    }
    
    // Sort by time within the day to assign queue logically
    dayEntries.sort((a, b) => a.time.localeCompare(b.time));
    
    // Assign correct daily queue number
    dayEntries.forEach((entry, idx) => {
      entry.queue = idx + 1;
    });
    
    entries.push(...dayEntries);
  });
  
  return entries;
}
