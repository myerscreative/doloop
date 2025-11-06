'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { getAllLoops, deleteLoop, addLoop } from '@/lib/loopStorage';
import { supabase, getCurrentUser } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import Toast from '@/components/ui/Toast';
import { useToast } from '@/lib/useToast';

export default function Home() {
  const router = useRouter();
  const pathname = usePathname();
  const [allLoops, setAllLoops] = useState([]);
  const { toast, showToast, hideToast } = useToast();
  const carouselRef = useRef(null);

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

  const handleTryLoop = async (template) => {
    const user = await getCurrentUser();
    if (!user) {
      showToast('Please log in to create loops', 'error');
      return;
    }

    const { data: loop } = await supabase
      .from('loops')
      .insert({
        name: template.name,
        owner_id: user.id,
        color: template.color,
        reset_rule: template.name.includes('Morning') || template.name.includes('Workday') ? 'daily' : 'manual',
      })
      .select()
      .single();

    await supabase.from('tasks').insert(
      template.tasks.map((t, i) => ({
        loop_id: loop.id,
        description: t,
        order: i,
        is_recurring: true,
        status: 'pending',
      }))
    );

    showToast(`Created "${template.name}" from template`, 'success');
    loadLoops();
    router.push(`/loops/${loop.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="flex justify-between items-center px-5 pt-6 pb-2">
        <span className="text-xs text-gray-500">Wednesday, November 5</span>
      </div>

      {/* Search + CTA */}
      <div className="flex items-center px-5 mb-6">
        <div className="flex-1 mr-3">
          <div className="bg-white rounded-xl px-4 py-3 text-gray-700">
            🔍 Search loops and tasks...
          </div>
        </div>
        <button
          onClick={() => router.push('/loops/create')}
          className="bg-yellow-400 px-5 py-3 rounded-xl"
        >
          <span className="text-black font-semibold">+ Create a new Loop</span>
        </button>
      </div>

      {/* Greeting */}
      <div className="px-5 mb-6">
        <h1 className="text-2xl font-bold">Good Morning, Robert! 👋</h1>
        <p className="text-gray-600 mt-1">Today, {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* All Loops Title */}
      <h2 className="px-5 font-bold text-lg mb-4">All Loops</h2>

      {/* Template Prompt */}
      <div className="px-5 mb-4">
        <p className="text-center text-gray-700">Ready to loop your day? Pick a starter:</p>
      </div>

      {/* Horizontal Carousel */}
      <div
        ref={carouselRef}
        className="flex overflow-x-auto snap-x snap-mandatory pb-4 px-5"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {templateLoops.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1, duration: 0.3 }}
            className="mr-4 flex-shrink-0"
          >
            <button
              onClick={() => handleTryLoop(item)}
              className="w-[300px] bg-white rounded-3xl p-5 shadow-lg hover:shadow-xl transition-shadow text-left"
            >
              <div className="flex items-center mb-3">
                <span className="text-3xl mr-2">{item.icon}</span>
                <span className="font-bold text-lg">{item.name}</span>
              </div>

              {item.tasks.map((task, i) => (
                <div key={i} className="flex items-center my-1">
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300 mr-3" />
                  <span className="text-gray-700">{task}</span>
                </div>
              ))}

              <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div style={{ width: `${item.progress}%`, backgroundColor: item.color }} className="h-full rounded-full" />
              </div>

              <div className="mt-3 h-10 bg-purple-600 rounded-full flex justify-center items-center">
                <span className="text-white text-center font-semibold">Try This Loop</span>
              </div>
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
