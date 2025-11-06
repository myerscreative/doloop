'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { getAllLoops, deleteLoop, addLoop } from '@/lib/loopStorage';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { Loop, LoopType } from '@/types/loop';
import Toast from '@/components/ui/Toast';
import { useToast } from '@/lib/useToast';

interface TemplateLoop {
  id: string;
  name: string;
  icon: string;
  color: string;
  tasks: string[];
  progress: number;
}

export default function Home() {
  const router = useRouter();
  const pathname = usePathname();
  const [allLoops, setAllLoops] = useState<Loop[]>([]);
  const { toast, showToast, hideToast } = useToast();
  const carouselRef = useRef<HTMLDivElement>(null);

  // Function to load loops
  const loadLoops = () => {
    const storedLoops = getAllLoops();
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

  // Carousel auto-advance
  useEffect(() => {
    const interval = setInterval(() => {
      if (carouselRef.current) {
        const scrollLeft = carouselRef.current.scrollLeft;
        const cardWidth = 300 + 16; // width + margin
        const nextScroll = scrollLeft + cardWidth;
        const maxScroll = carouselRef.current.scrollWidth - carouselRef.current.clientWidth;
        carouselRef.current.scrollTo({
          left: nextScroll > maxScroll ? 0 : nextScroll,
          behavior: 'smooth'
        });
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const templateLoops = [
    {
      id: 't1',
      name: 'Morning Routine',
      icon: '☕',
      color: '#FBBF24',
      tasks: ['Drink water', 'Meditate 5 min', 'Make bed'],
      progress: 0,
    },
    {
      id: 't2',
      name: 'Workday Prep',
      icon: '💼',
      color: '#60A5FA',
      tasks: ['Pack lunch', 'Check emails', 'Grab keys'],
      progress: 0,
    },
    {
      id: 't3',
      name: 'Camping Trip',
      icon: '🏕️',
      color: '#34D399',
      tasks: ['Pack tent', 'Fill water', 'Check stove'],
      progress: 0,
    },
  ];

  const handleTryLoop = (template: TemplateLoop) => {
    // Generate unique ID
    const loopId = `loop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Determine loop type from template name
    let loopType: LoopType = 'personal';
    if (template.name.includes('Morning') || template.name.includes('Workday')) {
      loopType = 'daily';
    } else if (template.name.includes('Work') || template.name.includes('Standup')) {
      loopType = 'work';
    }
    
    // Create loop items from template tasks
    const loopItems = template.tasks.map((taskTitle: string, index: number) => ({
      id: `item-${Date.now()}-${index}`,
      title: taskTitle,
      completed: false,
      order: index,
      isRecurring: true,
    }));
    
    // Create the new loop object
    const newLoop: Loop = {
      id: loopId,
      title: template.name,
      description: `Template: ${template.name}`,
      type: loopType,
      status: 'active',
      color: template.color,
      totalTasks: template.tasks.length,
      completedTasks: 0,
      currentStreak: 0,
      longestStreak: 0,
      completionHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      items: loopItems,
      isFavorite: false,
    };
    
    // Save to localStorage
    addLoop(newLoop);
    
    // UI feedback and navigation
    showToast(`Created "${template.name}" from template`, 'success');
    loadLoops();
    router.push(`/loops/${loopId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="max-w-[80vw] mx-auto">
        <div className="flex justify-between items-center px-5 pt-6 pb-2">
          <span className="text-xs text-gray-500">Wednesday, November 5</span>
        </div>

        {/* Search + CTA */}
        <div className="flex items-center px-5 mb-6">
          <div className="flex-1 mr-3">
            <div className="bg-white rounded-xl px-4 py-3 text-gray-500">
              🔍 Search loops and tasks...
            </div>
          </div>
          <button
            onClick={() => router.push('/loops/create')}
            className="bg-yellow-400 hover:bg-yellow-500 px-5 py-3 rounded-xl transition-colors"
          >
            <span className="text-black font-semibold">+ Create a new Loop</span>
          </button>
        </div>
      </div>

      {/* Greeting */}
      <div className="px-5 mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Good Morning, Robert! 👋</h1>
        <p className="text-gray-600 mt-1">Today, {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* All Loops Title */}
      <h2 className="px-5 font-bold text-lg mb-4 text-center text-gray-900">All Loops</h2>

      {/* Template Prompt */}
      <div className="px-5 mb-6">
        <p className="text-center text-gray-600">Ready to loop your day? Pick a starter:</p>
      </div>

      {/* Horizontal Carousel */}
      <div
        ref={carouselRef}
        className="flex overflow-x-auto snap-x snap-mandatory pb-4 px-5 justify-center"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {templateLoops.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1, duration: 0.3 }}
            className="mr-4 flex-shrink-0 snap-center"
          >
            <button
              onClick={() => handleTryLoop(item)}
              className="w-[300px] bg-white rounded-3xl p-5 shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="flex items-center justify-center mb-3">
                <span className="text-3xl mr-2">{item.icon}</span>
                <span className="font-bold text-lg text-gray-900">{item.name}</span>
              </div>

              <div className="space-y-2 mb-4">
                {item.tasks.map((task, i) => (
                  <div key={i} className="flex items-center">
                    <div className="w-5 h-5 rounded-full border-2 border-gray-300 mr-3 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">{task}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div style={{ width: `${item.progress}%`, backgroundColor: item.color }} className="h-full rounded-full" />
              </div>

              <button className="w-full mt-3 py-2.5 bg-purple-600 hover:bg-purple-700 rounded-full transition-colors">
                <span className="text-white font-semibold">Try This Loop</span>
              </button>
            </button>
          </motion.div>
        ))}
      </div>

      {/* Hide folders & empty state when no user loops */}
      {allLoops.length > 0 && (
        <div className="mt-8 px-5">
          <h3 className="font-semibold mb-3">My Lists</h3>
          {/* Render existing folders */}
          <div className="space-y-2">
            <button className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-gray-600">
                  <path d="M 3 9 L 12 3 L 21 9 L 21 20 L 15 20 L 15 14 L 9 14 L 9 20 L 3 20 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                </svg>
                <span className="text-gray-700 font-medium">All Lists</span>
              </div>
              <span className="text-gray-500 text-sm">{allLoops.length}</span>
            </button>
            {/* Add other folder buttons similarly */}
          </div>
        </div>
      )}

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
