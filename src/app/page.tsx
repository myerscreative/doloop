'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import LoopCard from '@/components/loops/LoopCard';
import { LoopType, Loop, LOOP_LIBRARY_COLORS } from '@/types/loop';
import { motion } from 'framer-motion';
import { getAllLoops, deleteLoop, addLoop } from '@/lib/loopStorage';
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
  
  const favoriteLoops = allLoops.filter(l => l.isFavorite);
  const personalLoops = allLoops.filter(l => l.type === 'personal');
  const workLoops = allLoops.filter(l => l.type === 'work');
  const dailyLoops = allLoops.filter(l => l.type === 'daily');

  const templateLoops = [
    { id: '1', name: 'Morning Routine', color: '#FBBF24', icon: '☕', tasks: ['Drink water', 'Meditate 5 min', 'Make bed'], autoReloop: 'daily' },
    { id: '2', name: 'Workday Prep', color: '#60A5FA', icon: '💼', tasks: ['Pack lunch', 'Check emails', 'Grab keys'], autoReloop: 'daily' },
    { id: '3', name: 'Camping Trip', color: '#34D399', icon: '🏕️', tasks: ['Pack tent', 'Fill water', 'Check stove'], autoReloop: 'manual' },
  ];

  const handleTryLoop = (template) => {
    const newId = Date.now().toString();
    const newLoop = {
      id: newId,
      title: template.name,
      type: template.autoReloop === 'daily' ? 'daily' : 'personal',
      status: 'active',
      totalTasks: template.tasks.length,
      completedTasks: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      currentStreak: 0,
      longestStreak: 0,
      completionHistory: [],
      isFavorite: false,
      color: template.color,
      items: template.tasks.map((title, order) => ({
        id: `${newId}-${order}`,
        title,
        completed: false,
        order,
      })),
    };
    addLoop(newLoop);
    showToast(`Created "${template.name}" from template`, 'success');
    loadLoops();
    router.push(`/loops/${newId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      {/* Header */}
      <Header userName="Robert" />
      
      <div className="flex">
        {/* Left Sidebar */}
        <aside className="w-80 bg-white border-r border-gray-200 min-h-screen p-6">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">My Lists</h2>
              <button
                className="text-gray-400 hover:text-gray-600"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M 8 4 L 8 8 L 4 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M 16 4 L 16 8 L 20 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            {/* Navigation Items */}
            <div className="space-y-1">
              <button
                onClick={() => setFilter('all')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                  filter === 'all' ? 'bg-gray-100' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-gray-600">
                    <path d="M 3 9 L 12 3 L 21 9 L 21 20 L 15 20 L 15 14 L 9 14 L 9 20 L 3 20 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                  </svg>
                  <span className="text-gray-700 font-medium">All Lists</span>
                </div>
                <span className="text-gray-500 text-sm">{allLoops.length}</span>
              </button>

              <button
                onClick={() => setFilter('favorites')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                  filter === 'favorites' ? 'bg-gray-100' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-400">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  <span className="text-gray-700 font-medium">Favorites</span>
                </div>
                <span className="text-gray-500 text-sm">{favoriteLoops.length}</span>
              </button>

              <button
                onClick={() => setFilter('personal')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                  filter === 'personal' ? 'bg-gray-100' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded border-2 border-purple-500"></div>
                  <span className="text-gray-700 font-medium">Personal</span>
                </div>
                <span className="text-gray-500 text-sm">{personalLoops.length}</span>
              </button>

              <button
                onClick={() => setFilter('work')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                  filter === 'work' ? 'bg-gray-100' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded border-2 border-blue-500"></div>
                  <span className="text-gray-700 font-medium">Work</span>
                </div>
                <span className="text-gray-500 text-sm">{workLoops.length}</span>
              </button>

              <button
                onClick={() => setFilter('daily')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                  filter === 'daily' ? 'bg-gray-100' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded border-2 border-orange-500"></div>
                  <span className="text-gray-700 font-medium">Daily</span>
                </div>
                <span className="text-gray-500 text-sm">{dailyLoops.length}</span>
              </button>
            </div>

            {/* Create New List Button */}
            <button
              onClick={() => router.push('/loops/create')}
              className="w-full mt-4 flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-600">
                  <path d="M 12 6 L 12 18 M 6 12 L 18 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span className="text-gray-600 text-sm font-medium">Create new list</span>
              </div>
              <span className="text-gray-400 text-xs">⌘L</span>
            </button>
          </div>

          {/* Library Section */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Loop Library</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setFilter('favorites')}
                className={`py-3 px-3 rounded-lg font-medium transition-all text-center text-sm ${
                  filter === 'favorites'
                    ? 'text-white opacity-90'
                    : 'text-white opacity-100 hover:opacity-90'
                }`}
                style={{ backgroundColor: LOOP_LIBRARY_COLORS[0] }}
              >
                Favorites
              </button>
              <button
                onClick={() => setFilter('personal')}
                className={`py-3 px-3 rounded-lg font-medium transition-all text-center text-sm ${
                  filter === 'personal'
                    ? 'text-white opacity-90'
                    : 'text-white opacity-100 hover:opacity-90'
                }`}
                style={{ backgroundColor: LOOP_LIBRARY_COLORS[1] }}
              >
                Personal
              </button>
              <button
                onClick={() => setFilter('work')}
                className={`py-3 px-3 rounded-lg font-medium transition-all text-center text-sm ${
                  filter === 'work'
                    ? 'text-white opacity-90'
                    : 'text-white opacity-100 hover:opacity-90'
                }`}
                style={{ backgroundColor: LOOP_LIBRARY_COLORS[2] }}
              >
                Work
              </button>
              <button
                className="py-3 px-3 rounded-lg font-medium transition-all text-center text-sm text-white opacity-100 hover:opacity-90"
                style={{ backgroundColor: LOOP_LIBRARY_COLORS[3] }}
              >
                Shared
              </button>
            </div>
            <button
              onClick={() => router.push('/library')}
              className="w-full mt-3 py-3 px-3 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
            >
              <svg
                width="16"
                height="16"
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
              <span className="text-gray-600 text-sm font-medium">Manage Folders</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 max-w-[940px] mx-auto px-8 py-8">
          <div className="flex flex-col gap-8">
            <div className="flex-1 min-w-0">
              {/* Search Bar and Create Button - Side by Side */}
              <div className="flex gap-4 mb-8">
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
            
            {/* Header with greeting */}
            <motion.div
              className="mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
            >
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Good Morning, Robert! 👋
              </h1>
              <p className="text-gray-600">
                Today, {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </motion.div>
            
            {/* Filtered Loops List */}
            <motion.div
              className="mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {filter === 'all' ? 'All Loops' : filter === 'favorites' ? 'Favorites' : filter === 'daily' ? 'Daily' : filter === 'work' ? 'Work' : 'Personal'}
              </h2>
              {filteredLoops.length > 0 ? (
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
              ) : (
                allLoops.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="bg-white rounded-xl shadow-sm p-6"
                  >
                    <p className="text-center text-gray-600 mb-6 font-medium">
                      Ready to loop your day? Pick a starter:
                    </p>
                    <div className="flex overflow-x-auto snap-x snap-mandatory space-x-4 pb-4 -mx-6 px-6">
                      {templateLoops.map((item) => (
                        <div
                          key={item.id}
                          className="snap-center flex-shrink-0 w-[300px] h-[200px] rounded-2xl shadow-md overflow-hidden text-white"
                          style={{ backgroundColor: item.color }}
                        >
                          <div className="p-4 h-full flex flex-col justify-between">
                            <div>
                              <div className="flex items-center mb-3">
                                <span className="text-3xl mr-2">{item.icon}</span>
                                <h3 className="font-bold text-xl">{item.name}</h3>
                              </div>
                              <div className="space-y-2 mb-4">
                                {item.tasks.slice(0, 3).map((task, idx) => (
                                  <div key={idx} className="flex items-center">
                                    <div className="w-5 h-5 rounded-full border-2 border-white mr-2 flex-shrink-0" />
                                    <span>{task}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div>
                              <div className="bg-white/30 rounded-full h-2 mb-3">
                                <div className="bg-white rounded-full h-2 w-0" />
                              </div>
                              <button
                                onClick={() => handleTryLoop(item)}
                                className="w-full bg-[#6D28D9] hover:bg-[#5B21B6] text-white py-2 rounded-lg font-medium transition-colors"
                              >
                                Try This Loop
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                    <div className="text-gray-400 mb-4">
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" className="mx-auto mb-4">
                        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
                        <path d="M 12 8 L 12 12 L 15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No {filter === 'favorites' ? 'favorite' : filter} loops yet
                    </h3>
                    <p className="text-gray-500 mb-6">
                      Create one to get started!
                    </p>
                    <button
                      onClick={() => router.push('/loops/create')}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                    >
                      Create Loop
                    </button>
                  </div>
                )
              )}
            </motion.div>
            </div>
          </div>
        </main>
      </div>

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
