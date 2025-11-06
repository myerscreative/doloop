import { Loop, LibraryFolder } from '@/types/loop';

const STORAGE_KEY = 'doloop-loops';
const FOLDERS_STORAGE_KEY = 'doloop-library-folders';

export function getStoredLoops(): Loop[] {
  if (typeof window === 'undefined') return [];
  
  const stored = localStorage.getItem(STORAGE_KEY);
  
  if (stored) {
    try {
      const loops = JSON.parse(stored);
      
      // Convert date strings back to Date objects
      const convertedLoops = loops.map((loop: any) => {
        try {
          const createdAt = loop.createdAt ? new Date(loop.createdAt) : new Date();
          const updatedAt = loop.updatedAt ? new Date(loop.updatedAt) : new Date();
          const lastCompletedAt = loop.lastCompletedAt ? new Date(loop.lastCompletedAt) : undefined;
          
          // Validate dates
          if (isNaN(createdAt.getTime()) || isNaN(updatedAt.getTime())) {
            console.error('Invalid date for loop:', loop.id);
            return null;
          }
          
          return {
            ...loop,
            createdAt,
            updatedAt,
            lastCompletedAt: lastCompletedAt && !isNaN(lastCompletedAt.getTime()) ? lastCompletedAt : undefined,
          };
        } catch (e) {
          console.error('Error converting dates for loop:', loop.id, e);
          return null;
        }
      }).filter((loop: any) => loop !== null);
      
      return convertedLoops;
    } catch (e) {
      console.error('Error parsing stored loops:', e);
      return [];
    }
  }
  return [];
}

export function saveLoops(loops: Loop[]): void {
  if (typeof window === 'undefined') {
    console.error('saveLoops - window is undefined, cannot save');
    return;
  }
  
  try {
    // Convert Date objects to ISO strings for storage
    const serializedLoops = loops.map(loop => {
      try {
        // Ensure dates are valid before serializing
        const createdAt = loop.createdAt instanceof Date && !isNaN(loop.createdAt.getTime()) 
          ? loop.createdAt.toISOString() 
          : new Date().toISOString();
        const updatedAt = loop.updatedAt instanceof Date && !isNaN(loop.updatedAt.getTime())
          ? loop.updatedAt.toISOString()
          : new Date().toISOString();
        const lastCompletedAt = loop.lastCompletedAt && loop.lastCompletedAt instanceof Date && !isNaN(loop.lastCompletedAt.getTime())
          ? loop.lastCompletedAt.toISOString()
          : undefined;
        
        return {
          ...loop,
          createdAt,
          updatedAt,
          lastCompletedAt,
        };
      } catch (e) {
        console.error('saveLoops - Error serializing loop:', loop.id, e);
        // Return a safe fallback instead of throwing
        return {
          ...loop,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastCompletedAt: undefined,
        };
      }
    });
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializedLoops));
  } catch (e) {
    console.error('Error saving loops:', e);
  }
}

export function addLoop(loop: Loop): void {
  const loops = getStoredLoops();
  loops.push(loop);
  saveLoops(loops);
}

export function getAllLoops(): Loop[] {
  return getStoredLoops();
}

export function deleteLoop(loopId: string): void {
  const loops = getStoredLoops();
  const filteredLoops = loops.filter(loop => loop.id !== loopId);
  saveLoops(filteredLoops);
}

export function updateLoop(updatedLoop: Loop): void {
  const loops = getStoredLoops();
  const updatedLoops = loops.map(loop => 
    loop.id === updatedLoop.id ? updatedLoop : loop
  );
  saveLoops(updatedLoops);
}

export function getLoopById(loopId: string): Loop | undefined {
  const loops = getStoredLoops();
  return loops.find(loop => loop.id === loopId);
}

// Library Folder Management

const DEFAULT_FOLDERS: LibraryFolder[] = [
  { id: 'favorites', name: 'Favorites', color: '#FEC041', order: 0, isDefault: true, filterType: 'favorites' },
  { id: 'personal', name: 'Personal', color: '#FE356C', order: 1, isDefault: true, filterType: 'personal' },
  { id: 'work', name: 'Work', color: '#0CB6CC', order: 2, isDefault: true, filterType: 'work' },
  { id: 'shared', name: 'Shared', color: '#7952B4', order: 3, isDefault: true, filterType: 'shared' },
];

export function getStoredFolders(): LibraryFolder[] {
  if (typeof window === 'undefined') return DEFAULT_FOLDERS;
  
  const stored = localStorage.getItem(FOLDERS_STORAGE_KEY);
  
  if (stored) {
    try {
      const folders = JSON.parse(stored);
      return folders;
    } catch (e) {
      console.error('Error parsing stored folders:', e);
      return DEFAULT_FOLDERS;
    }
  }
  
  // Initialize with default folders
  saveFolders(DEFAULT_FOLDERS);
  return DEFAULT_FOLDERS;
}

export function saveFolders(folders: LibraryFolder[]): void {
  if (typeof window === 'undefined') {
    console.error('saveFolders - window is undefined, cannot save');
    return;
  }
  
  try {
    localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(folders));
  } catch (e) {
    console.error('Error saving folders:', e);
  }
}

export function addFolder(folder: LibraryFolder): void {
  const folders = getStoredFolders();
  folders.push(folder);
  saveFolders(folders);
}

export function updateFolder(updatedFolder: LibraryFolder): void {
  const folders = getStoredFolders();
  const updatedFolders = folders.map(folder => 
    folder.id === updatedFolder.id ? updatedFolder : folder
  );
  saveFolders(updatedFolders);
}

export function deleteFolder(folderId: string): void {
  const folders = getStoredFolders();
  // Don't allow deleting default folders
  const filteredFolders = folders.filter(folder => folder.id !== folderId || folder.isDefault);
  saveFolders(filteredFolders);
}

export function reorderFolders(reorderedFolders: LibraryFolder[]): void {
  // Update the order property based on array position
  const foldersWithUpdatedOrder = reorderedFolders.map((folder, index) => ({
    ...folder,
    order: index,
  }));
  saveFolders(foldersWithUpdatedOrder);
}

// Date Helper Functions for Auto-Reloop

/**
 * Get today's date as an ISO date string (YYYY-MM-DD)
 */
export function getToday(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

/**
 * Get the start of the current week (Monday) as an ISO date string (YYYY-MM-DD)
 * Week starts on Monday as specified in Phase 2 requirements
 */
export function getWeekStart(): string {
  const today = new Date();
  const day = today.getDay();
  // Adjust for Sunday (0) to be 7, then calculate days until Monday
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  return monday.toISOString().split('T')[0];
}

