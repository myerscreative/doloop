'use client';

import { motion } from 'framer-motion';
import { Loop, LOOP_LIBRARY_COLORS } from '@/types/loop';

interface LoopCardProps {
  loop: Loop;
  onClick?: (loopId: string) => void;
  onDelete?: (loopId: string) => void;
  className?: string;
}

// Helper function to get color for a loop based on its category
function getLoopColor(loop: Loop): string {
  // Use stored color if available
  if (loop.color) {
    return loop.color;
  }
  
  // Fall back to category-based colors
  if (loop.isFavorite) {
    return LOOP_LIBRARY_COLORS[0]; // Orange-yellow for favorites
  }
  
  switch (loop.type) {
    case 'daily':
      return LOOP_LIBRARY_COLORS[0]; // Orange-yellow for daily
    case 'personal':
      return LOOP_LIBRARY_COLORS[1]; // Pink
    case 'work':
      return LOOP_LIBRARY_COLORS[2]; // Cyan
    default:
      return LOOP_LIBRARY_COLORS[3]; // Purple (for other types)
  }
}

export function LoopCard({ loop, onClick, onDelete, className = '' }: LoopCardProps) {
  const handleClick = () => {
    if (onClick) {
      onClick(loop.id);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering onClick
    if (onDelete) {
      onDelete(loop.id);
    }
  };
  
  const cardColor = getLoopColor(loop);
  
  return (
    <motion.div
      className={`py-2 px-4 hover:bg-gray-50 cursor-pointer transition-colors flex items-center justify-between group ${className}`}
      onClick={handleClick}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center gap-3 flex-1">
        <svg
          width="16"
          height="16"
          viewBox="0 0 444.25 444.25"
          className="flex-shrink-0"
          style={{ fill: cardColor }}
        >
          <path d="M239.72,111.74l30.57-25.47c-12.11-9.89-24.22-19.79-36.33-29.68,11.16,1,78.57,8.2,124.27,67.79,4.09,5.34,43.27,54.72,35,126.27-2.14,18.49-6.5,33.53-10.41,43.86l17.72,11.08-72.81,27.39c-4.65-25.62-8.64-51.32-12.63-76.79,7.09,3.77,12.18,6.65,19.72,10.63,8.64-34.78,3.99-81.08-20.16-109.21-31.65-36.88-62.25-42.53-74.95-45.85Z"/>
          <path d="M311.88,310.36c2.15,13.09,4.29,26.18,6.44,39.27,14.67-5.41,29.34-10.83,44.01-16.24-6.53,9.11-46.94,63.55-121.47,72.69-6.68.82-69.1,9.52-126.56-33.91-14.85-11.22-25.6-22.62-32.51-31.23-6.18,3.22-12.36,6.43-18.54,9.65,4.45-25.55,8.89-51.09,13.34-76.64,24.44,8.99,48.61,18.6,72.58,28.09-6.84,4.2-11.91,7.13-19.17,11.59,25.59,25.09,67.84,44.57,104.34,38.04,47.84-8.56,68.23-32.06,77.54-41.32Z"/>
          <path d="M104.99,274.14c-12.41-4.7-24.81-9.39-37.22-14.09-2.66,15.41-5.32,30.82-7.98,46.23-4.62-10.22-31.5-72.45-2.1-141.54,2.63-6.19,26.36-64.59,92.73-92.57,17.15-7.23,32.39-10.83,43.31-12.51.31-6.96.62-13.92.93-20.88,19.89,16.64,39.77,33.28,59.66,49.92-20.02,16.65-40.44,32.76-60.66,48.76-.21-8.02-.21-13.88-.44-22.4-34.53,9.58-72.56,36.4-85.18,71.26-16.55,45.7-6.42,75.12-3.07,87.81Z"/>
          <rect x="210.78" y="146.63" width="18.61" height="164.81"/>
          <rect x="210.78" y="146.63" width="18.61" height="164.81" transform="translate(449.12 8.96) rotate(90)"/>
        </svg>
        <div className="text-gray-900">{loop.title}</div>
      </div>
      {onDelete && (
        <button
          onClick={handleDelete}
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
      )}
    </motion.div>
  );
}

export default LoopCard;

