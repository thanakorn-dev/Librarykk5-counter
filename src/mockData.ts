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
  const today = getTodayDateString();
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
  
  // Target 145 entries for today
  const entriesCount = 138;
  
  // Distribute over opening hours (7:00 to 17:59)
  // peak hours: Lunch break (11:00 - 13:00) and after school (15:00 - 17:00)
  for (let i = 0; i < entriesCount; i++) {
    const role = randomChoice(weightedRoles);
    
    // Some minor gender distribution skewing
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
    
    // unique timestamp
    const timestampStr = `${today}T${timeString}:00`;
    
    entries.push({
      id: `mock-${i}-${Math.random().toString(36).substring(2, 7)}`,
      queue: 0, // will be sorted and assigned hereafter
      timestamp: timestampStr,
      date: today,
      time: timeString,
      gender,
      role,
      channel,
    });
  }

  // Sort by time to make queue logical
  entries.sort((a, b) => {
    return a.time.localeCompare(b.time);
  });

  // Assign correct queue order numbers
  entries.forEach((entry, idx) => {
    entry.queue = idx + 1;
  });

  return entries;
}
