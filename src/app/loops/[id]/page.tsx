'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import { Loop, LoopItem, LOOP_LIBRARY_COLORS } from '@/types/loop';
import { getLoopById, updateLoop } from '@/lib/loopStorage';
import { reloop, resetLoop } from '@/lib/loopUtils';
import { motion, AnimatePresence } from 'framer-motion';
import LoopItemOptions from '@/components/loops/LoopItemOptions';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Toast from '@/components/ui/Toast';
import { useToast } from '@/lib/useToast';

// Color options for loop customization
const colors = [
  { name: 'Yellow', value: '#FFB800' },
  { name: 'Red', value: '#F44336' },
  { name: 'Green', value: '#4CAF50' },
  { name: 'Blue', value: '#2196F3' },
  { name: 'Dark Blue', value: '#1976D2' },
  { name: 'Purple', value: '#9C27B0' },
  { name: 'Magenta', value: '#E91E63' },
  { name: 'Peach', value: '#FFAB91' },
  { name: 'Light Pink', value: '#F8BBD0' },
  { name: 'Light Green', value: '#A5D6A7' },
  { name: 'Light Blue', value: '#90CAF9' },
  { name: 'Light Purple', value: '#CE93D8' },
  { name: 'Light Lavender', value: '#E1BEE7' },
  { name: 'Light Pink 2', value: '#F48FB1' },
];

// Helper function to get color for a loop
function getLoopColor(loop: Loop): string {
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
}

export default function LoopDetailPage() {
  const router = useRouter();
  const params = useParams();
  const loopId = params?.id as string;
  const [loop, setLoop] = useState<Loop | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<LoopItem | null>(null);
  const [reloopDialog, setReloopDialog] = useState(false);
  const [resetDialog, setResetDialog] = useState(false);
  const [showColorSelector, setShowColorSelector] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  const handleToggleItem = (itemId: string) => {
    if (!loop || !loop.items) return;
    
    const updatedItems = loop.items.map(item =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    
    const completedCount = updatedItems.filter(item => item.completed).length;
    
    const updatedLoop: Loop = {
      ...loop,
      items: updatedItems,
      completedTasks: completedCount,
      updatedAt: new Date(),
    };
    
    // Update in localStorage using new updateLoop function
    updateLoop(updatedLoop);
    setLoop(updatedLoop);
  };

  const handleReloop = () => {
    if (!loop || !loop.items) return;
    
    const recurringCount = loop.items.filter(item => item.isRecurring).length;
    if (recurringCount === 0) {
      showToast('No recurring tasks in this loop. Add recurring tasks to use the Reloop feature!', 'info');
      return;
    }
    
    setReloopDialog(true);
  };

  const handleReloopConfirm = () => {
    if (!loop || !loop.items) return;
    
    // Use the new reloop function from loopUtils
    const reloopedLoop = reloop(loop);
    
    // Update in localStorage
    updateLoop(reloopedLoop);
    setLoop(reloopedLoop);
    showToast('Loop reset successfully!', 'success');
    setReloopDialog(false);
  };

  const handleReloopCancel = () => {
    setReloopDialog(false);
  };

  const handleResetLoop = () => {
    if (!loop || !loop.items || loop.items.length === 0) {
      showToast('No tasks to reset', 'info');
      return;
    }
    
    setResetDialog(true);
  };

  const handleResetConfirm = () => {
    if (!loop || !loop.items) return;
    
    // Reset all tasks
    const resetLoopResult = resetLoop(loop);
    
    // Update in localStorage
    updateLoop(resetLoopResult);
    setLoop(resetLoopResult);
    showToast('Loop reset successfully!', 'success');
    setResetDialog(false);
  };

  const handleResetCancel = () => {
    setResetDialog(false);
  };

  const handleUpdateItem = (updatedItem: LoopItem) => {
    if (!loop || !loop.items) return;
    
    const updatedItems = loop.items.map(item =>
      item.id === updatedItem.id ? updatedItem : item
    );
    
    const completedCount = updatedItems.filter(item => item.completed).length;
    
    const updatedLoop: Loop = {
      ...loop,
      items: updatedItems,
      completedTasks: completedCount,
      updatedAt: new Date(),
    };
    
    // Update in localStorage using new updateLoop function
    updateLoop(updatedLoop);
    setLoop(updatedLoop);
  };

  const handleDeleteItem = (itemId: string) => {
    if (!loop || !loop.items) return;
    
    const updatedItems = loop.items.filter(item => item.id !== itemId);
    const completedCount = updatedItems.filter(item => item.completed).length;
    
    const updatedLoop: Loop = {
      ...loop,
      items: updatedItems,
      totalTasks: updatedItems.length,
      completedTasks: completedCount,
      updatedAt: new Date(),
    };
    
    updateLoop(updatedLoop);
    setLoop(updatedLoop);
    showToast('Item deleted', 'success');
  };

  const handleItemClick = (item: LoopItem, e: React.MouseEvent) => {
    // If clicking on checkbox area, toggle completion
    const target = e.target as HTMLElement;
    if (target.closest('button')) {
      handleToggleItem(item.id);
    } else {
      // Otherwise, open options modal
      setEditingItem(item);
    }
  };

  const handleColorChange = (newColor: string) => {
    if (!loop) return;
    
    const updatedLoop: Loop = {
      ...loop,
      color: newColor,
      updatedAt: new Date(),
    };
    
    updateLoop(updatedLoop);
    setLoop(updatedLoop);
    setShowColorSelector(false);
    showToast('Loop color updated!', 'success');
  };

  useEffect(() => {
    if (!loopId) return;

    // Get loop from storage using new getLoopById function
    const foundLoop = getLoopById(loopId);

    if (foundLoop) {
      setLoop(foundLoop);
    }
    setLoading(false);
  }, [loopId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
        <Header userName="Robert" />
        <main className="max-w-[450px] mx-auto px-4 py-8">
          <div className="text-center py-16">Loading...</div>
        </main>
      </div>
    );
  }

  if (!loop) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
        <Header userName="Robert" />
        <main className="max-w-[450px] mx-auto px-4 py-8">
          <div className="text-center py-16">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Loop not found</h2>
            <button
              onClick={() => router.push('/')}
              className="text-blue-600 hover:underline"
            >
              Go back home
            </button>
          </div>
        </main>
      </div>
    );
  }

  const LoopIcon = ({ color }: { color: string }) => (
    <svg
      width="64"
      height="64"
      viewBox="0 0 444.25 444.25"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M239.72,111.74l30.57-25.47c-12.11-9.89-24.22-19.79-36.33-29.68,11.16,1,78.57,8.2,124.27,67.79,4.09,5.34,43.27,54.72,35,126.27-2.14,18.49-6.5,33.53-10.41,43.86l17.72,11.08-72.81,27.39c-4.65-25.62-8.64-51.32-12.63-76.79,7.09,3.77,12.18,6.65,19.72,10.63,8.64-34.78,3.99-81.08-20.16-109.21-31.65-36.88-62.25-42.53-74.95-45.85Z"
        fill={color}
      />
      <path
        d="M311.88,310.36c2.15,13.09,4.29,26.18,6.44,39.27,14.67-5.41,29.34-10.83,44.01-16.24-6.53,9.11-46.94,63.55-121.47,72.69-6.68.82-69.1,9.52-126.56-33.91-14.85-11.22-25.6-22.62-32.51-31.23-6.18,3.22-12.36,6.43-18.54,9.65,4.45-25.55,8.89-51.09,13.34-76.64,24.44,8.99,48.61,18.6,72.58,28.09-6.84,4.2-11.91,7.13-19.17,11.59,25.59,25.09,67.84,44.57,104.34,38.04,47.84-8.56,68.23-32.06,77.54-41.32Z"
        fill={color}
      />
      <path
        d="M104.99,274.14c-12.41-4.7-24.81-9.39-37.22-14.09-2.66,15.41-5.32,30.82-7.98,46.23-4.62-10.22-31.5-72.45-2.1-141.54,2.63-6.19,26.36-64.59,92.73-92.57,17.15-7.23,32.39-10.83,43.31-12.51.31-6.96.62-13.92.93-20.88,19.89,16.64,39.77,33.28,59.66,49.92-20.02,16.65-40.44,32.76-60.66,48.76-.21-8.02-.21-13.88-.44-22.4-34.53,9.58-72.56,36.4-85.18,71.26-16.55,45.7-6.42,75.12-3.07,87.81Z"
        fill={color}
      />
    </svg>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <Header userName="Robert" />
      <main className="max-w-[450px] mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="mb-6 text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
          aria-label="Go back"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M 12 4 L 6 10 L 12 16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back
        </button>

        {/* Single Card - Loop and Tasks */}
        <motion.div
          className="bg-white rounded-xl shadow-sm p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Reset Loop - Top Right */}
          {loop.items && loop.items.length > 0 && (
            <div className="flex justify-end mb-4">
              <button
                onClick={handleResetLoop}
                className="text-sm font-medium text-gray-400 hover:text-gray-600 hover:underline transition-colors"
                aria-label="Reset loop"
              >
                Reset Loop
              </button>
            </div>
          )}

          {/* Loop Icon - Centered */}
          <div className="flex justify-center mb-4">
            <button
              onClick={() => setShowColorSelector(true)}
              className="cursor-pointer hover:opacity-80 transition-opacity"
              aria-label="Change loop color"
            >
              <LoopIcon color={getLoopColor(loop)} />
            </button>
          </div>

          {/* Loop Name with Favorite Star - Centered */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <h1 className="text-2xl font-bold text-gray-900">{loop.title}</h1>
            <button
              onClick={() => {
                const updatedLoop = { ...loop, isFavorite: !loop.isFavorite };
                updateLoop(updatedLoop);
                setLoop(updatedLoop);
              }}
              className="text-yellow-400 hover:scale-110 transition-transform"
              aria-label={loop.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              {loop.isFavorite ? (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              ) : (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              )}
            </button>
          </div>
          {loop.items && loop.items.length > 0 ? (
            <>
              <div className="divide-y divide-gray-200">
                {loop.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 py-3 hover:bg-gray-50 transition-colors cursor-pointer first:pt-0 last:pb-0"
                    onClick={(e) => handleItemClick(item, e)}
                  >
                    <button
                      className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                        item.completed
                          ? 'bg-gray-500'
                          : 'border-2 border-gray-300'
                      }`}
                      role="checkbox"
                      aria-checked={item.completed}
                      aria-label={`Mark "${item.title}" as ${item.completed ? 'incomplete' : 'complete'}`}
                    >
                    </button>
                    <div className="flex-1 flex items-center gap-1.5">
                      <span
                        className={`${
                          item.completed
                            ? 'line-through text-gray-400'
                            : 'text-gray-900'
                        }`}
                      >
                        {item.title}
                      </span>
                      {/* Icons showing item options - right next to item name */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {item.assignedTo && (
                          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" className="text-gray-700">
                            <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="2" />
                            <path d="M 6 20 C 6 16 8 14 12 14 C 16 14 18 16 18 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        )}
                        {item.isRecurring === true ? (
                          <svg
                            width="21"
                            height="21"
                            viewBox="0 0 444.25 444.25"
                            className="fill-gray-700"
                          >
                            <path d="M239.72,111.74l30.57-25.47c-12.11-9.89-24.22-19.79-36.33-29.68,11.16,1,78.57,8.2,124.27,67.79,4.09,5.34,43.27,54.72,35,126.27-2.14,18.49-6.5,33.53-10.41,43.86l17.72,11.08-72.81,27.39c-4.65-25.62-8.64-51.32-12.63-76.79,7.09,3.77,12.18,6.65,19.72,10.63,8.64-34.78,3.99-81.08-20.16-109.21-31.65-36.88-62.25-42.53-74.95-45.85Z"/>
                            <path d="M311.88,310.36c2.15,13.09,4.29,26.18,6.44,39.27,14.67-5.41,29.34-10.83,44.01-16.24-6.53,9.11-46.94,63.55-121.47,72.69-6.68.82-69.1,9.52-126.56-33.91-14.85-11.22-25.6-22.62-32.51-31.23-6.18,3.22-12.36,6.43-18.54,9.65,4.45-25.55,8.89-51.09,13.34-76.64,24.44,8.99,48.61,18.6,72.58,28.09-6.84,4.2-11.91,7.13-19.17,11.59,25.59,25.09,67.84,44.57,104.34,38.04,47.84-8.56,68.23-32.06,77.54-41.32Z"/>
                            <path d="M104.99,274.14c-12.41-4.7-24.81-9.39-37.22-14.09-2.66,15.41-5.32,30.82-7.98,46.23-4.62-10.22-31.5-72.45-2.1-141.54,2.63-6.19,26.36-64.59,92.73-92.57,17.15-7.23,32.39-10.83,43.31-12.51.31-6.96.62-13.92.93-20.88,19.89,16.64,39.77,33.28,59.66,49.92-20.02,16.65-40.44,32.76-60.66,48.76-.21-8.02-.21-13.88-.44-22.4-34.53,9.58-72.56,36.4-85.18,71.26-16.55,45.7-6.42,75.12-3.07,87.81Z"/>
                          </svg>
                        ) : item.isRecurring === false && (
                          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" className="text-gray-700">
                            <path d="M 5 12 L 19 12 M 15 8 L 19 12 L 15 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                        {item.imageUrl && (
                          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" className="text-gray-700">
                            <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
                            <circle cx="8" cy="10" r="1.5" fill="currentColor" />
                            <path d="M 3 17 L 8 12 L 11 15 L 15 11 L 21 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                        {item.notes && (
                          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" className="text-gray-700">
                            <path d="M 5 4 L 5 18 L 8 21 L 19 21 L 19 4 L 5 4 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                            <path d="M 9 10 L 15 10 M 9 14 L 13 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <path d="M 8 18 L 8 21 L 5 18" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                          </svg>
                        )}
                        {item.tags && item.tags.length > 0 && (
                          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" className="text-gray-700">
                            <path d="M 20 12 L 12 20 L 4 12 L 4 4 L 12 4 L 20 12 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                            <circle cx="8" cy="8" r="1" fill="currentColor" />
                          </svg>
                        )}
                        {item.attachments && item.attachments.length > 0 && (
                          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" className="text-gray-700">
                            <path d="M 12 15 L 12 6 C 12 4 13 3 15 3 C 17 3 18 4 18 6 L 18 16 C 18 19 16 21 13 21 C 10 21 8 19 8 16 L 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        )}
                        {item.dueDate && (
                          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" className="text-gray-700">
                            <rect x="4" y="5" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
                            <path d="M 8 3 L 8 7 M 16 3 L 16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <path d="M 4 9 L 20 9" stroke="currentColor" strokeWidth="2" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Add Step/Item Button */}
              <div className="border-t border-gray-200 pt-3 mt-3">
                <button
                  onClick={() => {
                    const newItem: LoopItem = {
                      id: Date.now().toString(),
                      title: '',
                      completed: false,
                      order: loop.items?.length || 0,
                      isRecurring: true,
                    };
                    setEditingItem(newItem);
                  }}
                  className="flex items-center gap-3 py-3 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors w-full"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-gray-600">
                    <path d="M 12 6 L 12 18 M 6 12 L 18 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <span>Add a Step/Item</span>
                </button>
              </div>
            </>
          ) : (
            <p className="text-gray-600 text-sm">
              No tasks yet. Add tasks when creating or editing this loop.
            </p>
          )}
        </motion.div>
      </main>

      {/* Item Options Modal */}
      <AnimatePresence>
        {editingItem && (
          <LoopItemOptions
            item={editingItem}
            onUpdate={handleUpdateItem}
            onClose={() => setEditingItem(null)}
            onDelete={handleDeleteItem}
            loopColor={getLoopColor(loop)}
            loopName={loop.title}
          />
        )}
      </AnimatePresence>

      {/* Color Selector Modal */}
      <AnimatePresence>
        {showColorSelector && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowColorSelector(false)}
          >
            <motion.div
              className="bg-white rounded-2xl p-6 max-w-[450px] w-full"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">Change Loop Color</h2>
              
              {/* Color Grid */}
              <div className="mb-6">
                <div className="grid grid-cols-7 gap-3 mb-3">
                  {colors.slice(0, 7).map((color) => (
                    <button
                      key={color.value}
                      onClick={() => handleColorChange(color.value)}
                      className={`w-12 h-12 rounded-full transition-all ${
                        getLoopColor(loop) === color.value
                          ? 'ring-4 ring-gray-400 ring-offset-2'
                          : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: color.value }}
                      aria-label={`Select ${color.name} color`}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-3">
                  {colors.slice(7).map((color) => (
                    <button
                      key={color.value}
                      onClick={() => handleColorChange(color.value)}
                      className={`w-12 h-12 rounded-full transition-all ${
                        getLoopColor(loop) === color.value
                          ? 'ring-4 ring-gray-400 ring-offset-2'
                          : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: color.value }}
                      aria-label={`Select ${color.name} color`}
                    />
                  ))}
                </div>
              </div>

              {/* Cancel Button */}
              <button
                onClick={() => setShowColorSelector(false)}
                className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reloop Confirmation Dialog */}
      {loop && (
        <ConfirmDialog
          isOpen={reloopDialog}
          title="Reloop Loop"
          message={`Reloop "${loop.title}"? This will reset ${loop.items?.filter(item => item.isRecurring).length || 0} recurring task${(loop.items?.filter(item => item.isRecurring).length || 0) > 1 ? 's' : ''} while keeping one-time tasks completed.`}
          confirmText="Reloop"
          cancelText="Cancel"
          onConfirm={handleReloopConfirm}
          onCancel={handleReloopCancel}
        />
      )}

      {/* Reset Loop Confirmation Dialog */}
      {loop && (
        <ConfirmDialog
          isOpen={resetDialog}
          title="Reset Loop"
          message={`Reset "${loop.title}"? This will uncheck all ${loop.items?.length || 0} task${(loop.items?.length || 0) > 1 ? 's' : ''} and start fresh.`}
          confirmText="Reset"
          cancelText="Cancel"
          onConfirm={handleResetConfirm}
          onCancel={handleResetCancel}
        />
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

