'use client';

import { motion } from 'framer-motion';
import { getGreeting } from '@/lib/loopUtils';
import DoLoopLogo from '@/components/ui/DoLoopLogo';

interface HeaderProps {
  userName?: string;
  theme?: 'minimal' | 'playful' | 'professional';
  className?: string;
}

export function Header({ userName = 'there', theme = 'minimal', className = '' }: HeaderProps) {
  const greeting = getGreeting();
  const today = new Date();
  
  // Format date: "Thursday, October 30"
  // Use safe date formatting that works in all environments
  const formattedDate = typeof window !== 'undefined' 
    ? today.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
    : today.toISOString().split('T')[0]; // Fallback for SSR
  
  return (
    <motion.header
      className={`bg-white border-b border-gray-200 ${className}`}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-7xl mx-auto px-4 py-1.5">
        <div className="flex items-center justify-between">
          {/* Left side - Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="scale-50"
          >
            <DoLoopLogo 
              theme={theme}
              size="sm"
              animated={true}
              headerLight={false}
            />
          </motion.div>
          
          {/* Right side - Date */}
          <motion.p
            className="text-gray-600 text-sm md:text-base"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            {formattedDate}
          </motion.p>
        </div>
      </div>
    </motion.header>
  );
}

export default Header;

