import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { LibraryEntry, Gender, UserRole } from '../types';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Initialize auth state listener.
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      // Check if we already have the token cached in memory
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // If logged in but token not in memory, user must authenticate via popup
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Start sign-in flow
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Google.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

let cachedSheetName = 'Sheet1';
const FILE_NAME = 'Library Counter Data (โรงเรียนบ้านไผ่)';

// Helper to handle and format HTTP errors from Google API
const handleResponseError = async (res: Response, fallbackMessage: string): Promise<never> => {
  let errMsg = fallbackMessage;
  try {
    const errJson = await res.json();
    if (errJson.error && errJson.error.message) {
      errMsg = `${fallbackMessage} - ${errJson.error.message}`;
    } else {
      errMsg = `${fallbackMessage} - ${JSON.stringify(errJson)}`;
    }
  } catch (_) {
    try {
      const text = await res.text();
      if (text) {
        errMsg = `${fallbackMessage} - ${text}`;
      }
    } catch (_) {}
  }
  throw new Error(errMsg);
};

// Find or create spreadsheet in Google Drive
export const getOrCreateSpreadsheet = async (token: string): Promise<string> => {
  // 1. Search for existing spreadsheet in Drive
  const query = encodeURIComponent(`name='${FILE_NAME}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`);
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`;
  
  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!searchRes.ok) {
    await handleResponseError(searchRes, 'ค้นหาไฟล์ใน Google Drive ไม่สำเร็จ');
  }
  
  const searchResult = await searchRes.json();
  if (searchResult.files && searchResult.files.length > 0) {
    const sheetId = searchResult.files[0].id; // Return existing spreadsheet ID
    
    // Dynamically retrieve the first sheet title (default language localized sheet)
    const sheetDetailsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties.title`;
    const detailsRes = await fetch(sheetDetailsUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (detailsRes.ok) {
      const details = await detailsRes.json();
      if (details.sheets && details.sheets.length > 0) {
        cachedSheetName = details.sheets[0].properties.title || 'Sheet1';
      }
    }
    return sheetId;
  }
  
  // 2. Not found, so create a new spreadsheet
  const createUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
  const createRes = await fetch(createUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        title: FILE_NAME
      }
    })
  });
  
  if (!createRes.ok) {
    await handleResponseError(createRes, 'สร้างไฟล์ Google Sheet ใหม่ไม่สำเร็จ');
  }
  
  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;
  
  // Populate default sheet title from the newly created sheet metadata
  if (sheetData.sheets && sheetData.sheets.length > 0) {
    cachedSheetName = sheetData.sheets[0].properties.title || 'Sheet1';
  }
  
  // 3. Write default header row to the dynamic sheet name
  const headerUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(cachedSheetName)}!A1:H1:append?valueInputOption=USER_ENTERED`;
  const headerRes = await fetch(headerUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      values: [
        ['id', 'queue', 'timestamp', 'date', 'time', 'gender', 'role', 'channel']
      ]
    })
  });
  
  if (!headerRes.ok) {
    await handleResponseError(headerRes, 'สร้างแถวหัวตาราง (Header Row) ไม่สำเร็จ');
  }
  
  return spreadsheetId;
};

// Fetch all entry rows from Google Sheet
export const fetchEntriesFromSheet = async (token: string, spreadsheetId: string): Promise<LibraryEntry[]> => {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(cachedSheetName)}!A2:H`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!res.ok) {
    await handleResponseError(res, 'ดึงข้อมูลประวัติเข้าจาก Google Sheet ไม่สำเร็จ');
  }
  
  const data = await res.json();
  if (!data.values) {
    return [];
  }
  
  // Parse rows back into LibraryEntry object structure
  return data.values.map((row: any[]): LibraryEntry => ({
    id: row[0] || '',
    queue: parseInt(row[1], 10) || 0,
    timestamp: row[2] || '',
    date: row[3] || '',
    time: row[4] || '',
    gender: (row[5] as Gender) || 'ชาย',
    role: (row[6] as UserRole) || 'ม.1',
    channel: (row[7] as 'Kiosk' | 'Librarian' | 'Bulk') || 'Kiosk'
  }));
};

// Append a list of entries to the Google Sheet
export const appendEntriesToSheet = async (
  token: string,
  spreadsheetId: string,
  entries: LibraryEntry[]
): Promise<void> => {
  // Use simple sheetName for insertion to search for dynamic append start range and avoid path colons
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(cachedSheetName)}!A1:append?valueInputOption=USER_ENTERED`;
  const values = entries.map(entry => [
    entry.id,
    entry.queue,
    entry.timestamp,
    entry.date,
    entry.time,
    entry.gender,
    entry.role,
    entry.channel
  ]);
  
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
      range: `${cachedSheetName}!A1`,
      majorDimension: 'ROWS',
      values 
    })
  });
  
  if (!res.ok) {
    await handleResponseError(res, 'การบันทึกแถวใหม่แบบเรียลไทม์ขัดข้อง');
  }
};

// Rewrite the entire spreadsheet content (used for deleting or full overrides)
export const rewriteEntriesToSheet = async (
  token: string,
  spreadsheetId: string,
  entries: LibraryEntry[]
): Promise<void> => {
  // Clear any existing content first
  const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(cachedSheetName)}!A2:H:clear`;
  const clearRes = await fetch(clearUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!clearRes.ok) {
    await handleResponseError(clearRes, 'การสั่งล้างข้อมูลเก่าขัดข้อง');
  }

  // If we are clearing to empty, we can stop here
  if (entries.length === 0) {
    return;
  }

  // Write new values
  const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(cachedSheetName)}!A2:H?valueInputOption=USER_ENTERED`;
  const values = entries.map(entry => [
    entry.id,
    entry.queue,
    entry.timestamp,
    entry.date,
    entry.time,
    entry.gender,
    entry.role,
    entry.channel
  ]);

  const res = await fetch(writeUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
      range: `${cachedSheetName}!A2:H`,
      majorDimension: 'ROWS',
      values 
    })
  });

  if (!res.ok) {
    await handleResponseError(res, 'การอัพเดทเขียนข้อมูลทดแทนขัดข้อง');
  }
};
