'use client';

import { useState, useEffect, Suspense } from 'react';
import Header from '@/components/layout/Header';
import { motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { addLoop } from '@/lib/loopStorage';
import { Loop } from '@/types/loop';
import Toast from '@/components/ui/Toast';
import { useToast } from '@/lib/useToast';

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

interface LoopItem {
  id: string;
  title: string;
  completed: boolean;
  isLoop: boolean; // Can this item be a sub-loop?
}

function CreateLoopPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedColor, setSelectedColor] = useState<string>(colors[3].value); // Default to Blue
  const [loopName, setLoopName] = useState('');
  const [loopType, setLoopType] = useState<'daily' | 'work' | 'personal'>('daily');
  const [step, setStep] = useState<'setup' | 'items'>('setup');
  const [items, setItems] = useState<LoopItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  // Check if we're editing an existing loop
  useEffect(() => {
    const name = searchParams.get('name');
    const color = searchParams.get('color');
    if (name) {
      setLoopName(name);
      setStep('items');
    }
    if (color && colors.some(c => c.value === color)) {
      setSelectedColor(color);
    }
  }, [searchParams]);

  const handleSave = () => {
    if (!loopName.trim()) {
      showToast('Please enter a loop name', 'error');
      return;
    }
    
    // Navigate to items step
    setStep('items');
  };

  const handleCancel = () => {
    router.push('/');
  };

  const handleFinish = () => {
    if (!loopName.trim()) {
      showToast('Please enter a loop name', 'error');
      return;
    }
    
    try {
      // Create the new loop
      const newLoop: Loop = {
        id: Date.now().toString(),
        title: loopName,
        type: loopType,
        status: 'active',
        totalTasks: items.length,
        completedTasks: items.filter(item => item.completed).length,
        createdAt: new Date(),
        updatedAt: new Date(),
        currentStreak: 0,
        longestStreak: 0,
        completionHistory: [],
        isFavorite: isFavorite,
        color: selectedColor,
        items: items.map((item, index) => ({
          id: item.id,
          title: item.title,
          completed: item.completed,
          order: index,
          isRecurring: true, // Default to loop item
        })),
      };

      // Save to localStorage
      addLoop(newLoop);

      // Navigate to home page with a refresh parameter to force reload
      showToast(`Loop "${loopName}" created successfully!`, 'success');
      router.push('/?refresh=true');
      router.refresh();
    } catch (error) {
      showToast(`Error saving loop: ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
  };

  const handleAddItem = () => {
    if (newItemName.trim()) {
      setItems([
        ...items,
        {
          id: Date.now().toString(),
          title: newItemName.trim(),
          completed: false,
          isLoop: false,
        },
      ]);
      setNewItemName('');
    }
  };

  const handleToggleItem = (itemId: string) => {
    setItems(
      items.map((item) =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const LoopIcon = ({ color }: { color: string }) => (
    <svg
      width="96"
      height="96"
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

  if (step === 'setup') {
    return (
      <div className="min-h-screen bg-white">
        <Header userName="Robert" />
        <main className="max-w-[450px] mx-auto px-4 py-8 relative">
          {/* Navigation */}
          <div className="flex justify-between items-center mb-8">
            <button
              onClick={handleCancel}
              className="text-blue-600 font-medium"
            >
              Cancel
            </button>
            <h1 className="text-xl font-bold text-gray-900">New DoLoop</h1>
            <button
              onClick={handleSave}
              disabled={!loopName.trim()}
              className={`font-medium ${
                loopName.trim()
                  ? 'text-blue-600'
                  : 'text-gray-400 cursor-not-allowed'
              }`}
            >
              Save
            </button>
          </div>

          {/* Loop Icon */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <LoopIcon color={selectedColor} />
            </div>
          </div>

          {/* Color Palette */}
          <div className="mb-8">
            <div className="grid grid-cols-7 gap-3 mb-3">
              {colors.slice(0, 7).map((color) => (
                <button
                  key={color.value}
                  onClick={() => setSelectedColor(color.value)}
                  className={`w-12 h-12 rounded-full transition-all ${
                    selectedColor === color.value
                      ? 'ring-4 ring-gray-400 ring-offset-2'
                      : ''
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
                  onClick={() => setSelectedColor(color.value)}
                  className={`w-12 h-12 rounded-full transition-all ${
                    selectedColor === color.value
                      ? 'ring-4 ring-gray-400 ring-offset-2'
                      : ''
                  }`}
                  style={{ backgroundColor: color.value }}
                  aria-label={`Select ${color.name} color`}
                />
              ))}
            </div>
          </div>

          {/* Name Input */}
          <div className="mb-6">
            <input
              type="text"
              value={loopName}
              onChange={(e) => setLoopName(e.target.value)}
              placeholder="Name your loop"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg text-gray-900 bg-gray-50 text-center"
              autoFocus
            />
          </div>

          {/* Favorites Toggle - Bottom Right */}
          <button
            onClick={() => setIsFavorite(!isFavorite)}
            className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-2 rounded-lg transition-all hover:bg-gray-100 border border-gray-200 bg-white shadow-sm"
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <svg
              className={`w-5 h-5 transition-colors ${isFavorite ? 'text-yellow-500' : 'text-gray-400'}`}
              fill={isFavorite ? 'currentColor' : 'none'}
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
            <span className={`text-xs font-medium ${isFavorite ? 'text-gray-900' : 'text-gray-500'}`}>
              Favorites
            </span>
          </button>
        </main>
      </div>
    );
  }

  // Items step - Loop detail page
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <Header userName="Robert" />
      <main className="max-w-[450px] mx-auto px-4 py-8">
        {/* Yellow Header Bar */}
        <div
          className="h-2 mb-6 rounded"
          style={{ backgroundColor: '#FFB800' }}
        />

        {/* Loop Header */}
        <div className="bg-gray-100 rounded-xl p-6 mb-6 text-center">
          <div className="flex justify-center mb-4">
            <LoopIcon color={selectedColor} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{loopName}</h1>
        </div>

        {/* Loop Items */}
        <div className="bg-white rounded-xl shadow-sm mb-4">
          {items.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p className="mb-4">No items yet</p>
              <p className="text-sm">Add your first loop step below</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center px-4 py-3 hover:bg-gray-50"
                >
                  <button
                    onClick={() => handleToggleItem(item.id)}
                    className={`w-6 h-6 rounded-full border-2 mr-3 flex-shrink-0 ${
                      item.completed
                        ? 'bg-yellow-500 border-yellow-500'
                        : 'border-gray-300'
                    }`}
                    role="checkbox"
                    aria-checked={item.completed}
                    aria-label={`Mark "${item.title}" as ${item.completed ? 'incomplete' : 'complete'}`}
                  >
                    {item.completed && (
                      <svg
                        className="w-full h-full text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </button>
                  <span
                    className={`flex-1 ${
                      item.completed
                        ? 'line-through text-gray-400'
                        : 'text-gray-900'
                    }`}
                  >
                    {item.title}
                  </span>
                  <button className="text-gray-400 hover:text-gray-600 ml-2">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M 10 4 Q 4 4, 4 10 Q 4 16, 10 16 Q 16 16, 16 10 Q 16 4, 10 4"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        fill="none"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Step Input */}
        <div className="bg-gray-100 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAddItem();
                }
              }}
              placeholder="e.g., Water"
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
              autoFocus
            />
            <button
              onClick={handleAddItem}
              disabled={!newItemName.trim()}
              className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                newItemName.trim()
                  ? 'bg-yellow-500 hover:bg-yellow-600'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M 10 4 L 10 16 M 4 10 L 16 10"
                  stroke="black"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Add Step Button */}
        <button
          onClick={() => setNewItemName('')}
          className="w-full bg-gray-100 hover:bg-gray-200 rounded-xl py-3 px-4 flex items-center gap-2 text-gray-700 font-medium transition-colors"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M 10 4 L 10 16 M 4 10 L 16 10"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <span>Add a Loop Step</span>
        </button>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8">
          <button
            onClick={() => setStep('setup')}
            className="text-blue-600 font-medium"
          >
            Back
          </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleFinish();
              }}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700"
              type="button"
              aria-label="Finish creating loop"
            >
              Done
            </button>
        </div>
      </main>

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

export default function CreateLoopPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    }>
      <CreateLoopPageContent />
    </Suspense>
  );
}
