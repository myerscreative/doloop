'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import LoopCard from '@/components/loops/LoopCard';
import { LoopType, Loop, LOOP_LIBRARY_COLORS } from '@/types/loop';
import { motion } from 'framer-motion';
import { getAllLoops, deleteLoop } from '@/lib/loopStorage';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import SearchBar from '@/components/ui/SearchBar';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Toast from '@/components/ui/Toast';
import { useToast } from '@/lib/useToast';

export default function Home() {
  const router = useRouter();
  const pathname = usePathname();
  const [filter, setFilter] = useState<LoopType | 'all' | 'favorites'>('all');
  const [allLoops, setAllLoops] = useState<Loop[]>([]);
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; loopId: string | null; loopTitle: string }>({
    isOpen: false,
    loopId: null,
    loopTitle: '',
  });
  const { toast, showToast, hideToast } = useToast();

  // Function to load loops
  const loadLoops = () => {
    const storedLoops = getAllLoops();
    // Only show user-created loops (no mock data mixing)
    setAllLoops(storedLoops);
  };

  // Load loops from storage on mount and when pathname changes
  useEffect(() => {
    loadLoops();
  }, [pathname]);
  
  // Also reload when window gets focus (user comes back to tab)
  useEffect(() => {
    const handleFocus = () => {
      loadLoops();
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);
  
  // Listen for storage changes from other tabs (multi-tab sync)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'doloop-loops') {
        loadLoops();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const filteredLoops = filter === 'all' 
    ? allLoops 
    : filter === 'favorites'
    ? allLoops.filter(loop => loop.isFavorite)
    : allLoops.filter(loop => loop.type === filter);
  
  const handleLoopClick = (loopId: string) => {
    router.push(`/loops/${loopId}`);
  };
  
  const handleDeleteClick = (loopId: string, loopTitle: string) => {
    setDeleteDialog({ isOpen: true, loopId, loopTitle });
  };

  const handleDeleteConfirm = () => {
    if (deleteDialog.loopId) {
      deleteLoop(deleteDialog.loopId);
      loadLoops();
      showToast(`Loop "${deleteDialog.loopTitle}" deleted`, 'success');
      setDeleteDialog({ isOpen: false, loopId: null, loopTitle: '' });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ isOpen: false, loopId: null, loopTitle: '' });
  };
  
  const handleDeleteLoop = (loopId: string) => {
    const loop = allLoops.find(l => l.id === loopId);
    if (loop) {
      handleDeleteClick(loopId, loop.title);
    }
  };
  
  // Helper function to get color for a loop
  const getLoopColor = (loop: Loop): string => {
    if (loop.color) {
      return loop.color;
    }
    if (loop.isFavorite) {
      return LOOP_LIBRARY_COLORS[0];
    }
    switch (loop.type) {
      case 'daily':
        return LOOP_LIBRARY_COLORS[0];
      case 'personal':
        return LOOP_LIBRARY_COLORS[1];
      case 'work':
        return LOOP_LIBRARY_COLORS[2];
      default:
        return LOOP_LIBRARY_COLORS[3];
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      {/* Header */}
      <Header userName="Robert" />
      
      {/* Main Content */}
      <main className="max-w-[450px] mx-auto px-4 md:px-6 py-4 md:py-8">
        <div className="flex flex-col gap-8">
          <div className="flex-1 min-w-0">
            {/* Search Bar and Create Button - Side by Side */}
            <div className="flex gap-4 mb-6">
              <div className="flex-[2]">
                <SearchBar loops={allLoops} onSelect={handleLoopClick} />
              </div>
              <div className="flex-1 flex items-center">
                <button
                  onClick={() => router.push('/loops/create')}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-3 md:py-4 px-4 md:px-6 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm md:text-base"
                  aria-label="Create a new loop"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="flex-shrink-0"
                  >
                    <path
                      d="M 12 5 L 12 19 M 5 12 L 19 12"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="hidden sm:inline">Create a new Loop</span>
                  <span className="sm:hidden">New Loop</span>
                </button>
              </div>
            </div>
            
            {/* Favorites Section */}
            <motion.div
              className="mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <h2 className="text-lg font-bold text-gray-900 mb-4">Favorites</h2>
              {allLoops.filter(loop => loop.isFavorite).length > 0 ? (
                <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
                  {allLoops.filter(loop => loop.isFavorite).map((loop) => (
                    <div
                      key={loop.id}
                      onClick={() => handleLoopClick(loop.id)}
                      className="py-3 px-4 hover:bg-gray-50 cursor-pointer transition-colors flex items-center gap-3 group"
                    >
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 444.25 444.25"
                        className="flex-shrink-0"
                        style={{ fill: getLoopColor(loop) }}
                      >
                        <path d="M239.72,111.74l30.57-25.47c-12.11-9.89-24.22-19.79-36.33-29.68,11.16,1,78.57,8.2,124.27,67.79,4.09,5.34,43.27,54.72,35,126.27-2.14,18.49-6.5,33.53-10.41,43.86l17.72,11.08-72.81,27.39c-4.65-25.62-8.64-51.32-12.63-76.79,7.09,3.77,12.18,6.65,19.72,10.63,8.64-34.78,3.99-81.08-20.16-109.21-31.65-36.88-62.25-42.53-74.95-45.85Z"/>
                        <path d="M311.88,310.36c2.15,13.09,4.29,26.18,6.44,39.27,14.67-5.41,29.34-10.83,44.01-16.24-6.53,9.11-46.94,63.55-121.47,72.69-6.68.82-69.1,9.52-126.56-33.91-14.85-11.22-25.6-22.62-32.51-31.23-6.18,3.22-12.36,6.43-18.54,9.65,4.45-25.55,8.89-51.09,13.34-76.64,24.44,8.99,48.61,18.6,72.58,28.09-6.84,4.2-11.91,7.13-19.17,11.59,25.59,25.09,67.84,44.57,104.34,38.04,47.84-8.56,68.23-32.06,77.54-41.32Z"/>
                        <path d="M104.99,274.14c-12.41-4.7-24.81-9.39-37.22-14.09-2.66,15.41-5.32,30.82-7.98,46.23-4.62-10.22-31.5-72.45-2.1-141.54,2.63-6.19,26.36-64.59,92.73-92.57,17.15-7.23,32.39-10.83,43.31-12.51.31-6.96.62-13.92.93-20.88,19.89,16.64,39.77,33.28,59.66,49.92-20.02,16.65-40.44,32.76-60.66,48.76-.21-8.02-.21-13.88-.44-22.4-34.53,9.58-72.56,36.4-85.18,71.26-16.55,45.7-6.42,75.12-3.07,87.81Z"/>
                      </svg>
                      <div className="text-gray-900 flex-1">{loop.title}</div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(loop.id, loop.title);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 p-1 hover:bg-red-100 rounded text-red-600"
                        aria-label={`Delete loop "${loop.title}"`}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M 4 4 L 12 12 M 12 4 L 4 12"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">
                  <p className="text-sm">No favorite loops yet. Mark a loop as favorite when creating it!</p>
                </div>
              )}
            </motion.div>
            
            {/* My Loops Section */}
            <motion.div
              className="mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.5 }}
            >
              <h2 className="text-lg font-bold text-gray-900 mb-4">My Loops</h2>
              <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
                <div className="py-3 px-4 hover:bg-gray-50 cursor-pointer transition-colors">
                  <div className="text-gray-900">My Day</div>
                </div>
                <div className="py-3 px-4 hover:bg-gray-50 cursor-pointer transition-colors">
                  <div className="text-gray-900">Important</div>
                </div>
                <div className="py-3 px-4 hover:bg-gray-50 cursor-pointer transition-colors">
                  <div className="text-gray-900">Planned</div>
                </div>
                <div className="py-3 px-4 hover:bg-gray-50 cursor-pointer transition-colors">
                  <div className="text-gray-900">Assigned to me</div>
                </div>
              </div>
            </motion.div>
            
            {/* Loop Library Section */}
            <motion.div
              className="mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <h2 className="text-lg font-bold text-gray-900 mb-4">Loop Library</h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setFilter('favorites')}
                  className={`py-4 px-4 rounded-xl font-medium transition-all text-center ${
                    filter === 'favorites'
                      ? 'text-white opacity-80'
                      : 'text-white opacity-100 shadow-md hover:opacity-100'
                  }`}
                  style={{ backgroundColor: LOOP_LIBRARY_COLORS[0] }}
                >
                  Favorites
                </button>
                <button
                  onClick={() => setFilter('personal')}
                  className={`py-4 px-4 rounded-xl font-medium transition-all text-center ${
                    filter === 'personal'
                      ? 'text-white opacity-80'
                      : 'text-white opacity-100 shadow-md hover:opacity-100'
                  }`}
                  style={{ backgroundColor: LOOP_LIBRARY_COLORS[1] }}
                >
                  Personal
                </button>
                <button
                  onClick={() => setFilter('work')}
                  className={`py-4 px-4 rounded-xl font-medium transition-all text-center ${
                    filter === 'work'
                      ? 'text-white opacity-80'
                      : 'text-white opacity-100 shadow-md hover:opacity-100'
                  }`}
                  style={{ backgroundColor: LOOP_LIBRARY_COLORS[2] }}
                >
                  Work
                </button>
                <button
                  className="py-4 px-4 rounded-xl font-medium transition-all text-center text-white opacity-100 shadow-md hover:opacity-100"
                  style={{ backgroundColor: LOOP_LIBRARY_COLORS[3] }}
                >
                  Shared
                </button>
                <button
                  onClick={() => router.push('/library')}
                  className="py-4 px-4 rounded-xl border-2 border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all flex items-center justify-center col-span-2"
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-gray-400"
                  >
                    <path
                      d="M 12 5 L 12 19 M 5 12 L 19 12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="ml-2 text-gray-600 font-medium">Manage Folders</span>
                </button>
              </div>
            </motion.div>
            
            {/* Filtered Loops List */}
            {filteredLoops.length > 0 && (
              <motion.div
                className="mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                <h2 className="text-lg font-bold text-gray-900 mb-4">
                  {filter === 'all' ? 'All Loops' : filter === 'favorites' ? 'Favorites' : filter === 'daily' ? 'Daily' : filter === 'work' ? 'Work' : 'Personal'}
                </h2>
                <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
                  {filteredLoops.map((loop) => (
                    <LoopCard 
                      key={loop.id} 
                      loop={loop} 
                      onClick={handleLoopClick}
                      onDelete={handleDeleteLoop}
                    />
                  ))}
                </div>
              </motion.div>
            )}
        
            {/* Empty State */}
            {filteredLoops.length === 0 && (
              <motion.div
                className="text-center py-16"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <div className="text-6xl mb-4">🔄</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No loops found
                </h3>
                <p className="text-gray-600">
                  Create your first loop to get started!
                </p>
              </motion.div>
            )}
          </div>
        </div>
      </main>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="Delete Loop"
        message={`Are you sure you want to delete "${deleteDialog.loopTitle}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </div>
  );
}
