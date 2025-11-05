'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import LoopCard from '@/components/loops/LoopCard';
import { mockLoops } from '@/lib/mockData';
import { LibraryFolder } from '@/types/loop';
import { motion, Reorder } from 'framer-motion';
import { getStoredFolders, addFolder, reorderFolders } from '@/lib/loopStorage';
import { Plus } from 'lucide-react';

export default function LibraryPage() {
  const [folders, setFolders] = useState<LibraryFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<LibraryFolder | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  
  // Load folders from storage on mount
  useEffect(() => {
    const storedFolders = getStoredFolders();
    setFolders(storedFolders);
    if (storedFolders.length > 0) {
      setSelectedFolder(storedFolders[0]);
    }
  }, []);
  
  const handleLoopClick = (loopId: string) => {
    // TODO: Navigate to loop detail page
  };
  
  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    
    const colors = ['#FEC041', '#FE356C', '#0CB6CC', '#7952B4', '#9C27B0', '#FF9800', '#4CAF50'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    const newFolder: LibraryFolder = {
      id: `folder-${Date.now()}`,
      name: newFolderName.trim(),
      color: randomColor,
      order: folders.length,
      isDefault: false,
    };
    
    addFolder(newFolder);
    setFolders([...folders, newFolder]);
    setNewFolderName('');
    setIsCreatingFolder(false);
  };
  
  const handleReorder = (reorderedFolders: LibraryFolder[]) => {
    setFolders(reorderedFolders);
    reorderFolders(reorderedFolders);
  };
  
  // Filter loops based on selected folder
  const getFilteredLoops = () => {
    if (!selectedFolder) return [];
    
    switch (selectedFolder.filterType) {
      case 'favorites':
        return mockLoops.filter(loop => loop.isFavorite);
      case 'personal':
        return mockLoops.filter(loop => loop.type === 'personal');
      case 'work':
        return mockLoops.filter(loop => loop.type === 'work');
      case 'daily':
        return mockLoops.filter(loop => loop.type === 'daily');
      case 'shared':
        return []; // Empty for now
      case 'all':
        return mockLoops;
      default:
        return mockLoops;
    }
  };
  
  const currentLoops = getFilteredLoops();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      {/* Header */}
      <Header userName="Robert" />
      
      {/* Main Content */}
      <main className="max-w-[450px] mx-auto px-4 md:px-6 py-4 md:py-8">
        {/* Page Title */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Loop Library</h1>
          <p className="text-gray-600">Browse loops by category</p>
        </motion.div>
        
        {/* Folder Grid with Drag & Drop */}
        <motion.div
          className="mb-8 grid grid-cols-2 gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Reorder.Group
            axis="y"
            values={folders}
            onReorder={handleReorder}
            className="contents"
          >
            {folders.map((folder) => (
              <Reorder.Item
                key={folder.id}
                value={folder}
                className="cursor-grab active:cursor-grabbing"
              >
                <button
                  onClick={() => setSelectedFolder(folder)}
                  style={{
                    backgroundColor: selectedFolder?.id === folder.id ? folder.color : undefined,
                  }}
                  className={`w-full py-4 px-4 rounded-xl font-medium transition-all text-left ${
                    selectedFolder?.id === folder.id
                      ? 'text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {folder.name}
                </button>
              </Reorder.Item>
            ))}
          </Reorder.Group>
          
          {/* Add New Folder Button */}
          <motion.button
            onClick={() => setIsCreatingFolder(true)}
            className="py-4 px-4 rounded-xl border-2 border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all flex items-center justify-center"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus className="w-8 h-8 text-gray-400" />
          </motion.button>
        </motion.div>
        
        {/* Create Folder Dialog */}
        {isCreatingFolder && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setIsCreatingFolder(false)}
          >
            <motion.div
              className="bg-white rounded-xl p-6 max-w-[450px] w-full"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4">Create New Folder</h3>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateFolder();
                  if (e.key === 'Escape') setIsCreatingFolder(false);
                }}
                placeholder="Folder name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setIsCreatingFolder(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateFolder}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
        
        {/* Loops List for Selected Folder */}
        {selectedFolder && currentLoops.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              {selectedFolder.name}
            </h2>
            <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
              {currentLoops.map((loop) => (
                <LoopCard 
                  key={loop.id} 
                  loop={loop} 
                  onClick={handleLoopClick}
                />
              ))}
            </div>
          </motion.div>
        )}
        
        {/* Empty State */}
        {selectedFolder && currentLoops.length === 0 && (
          <motion.div
            className="text-center py-16 bg-white rounded-xl shadow-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No loops in this folder
            </h3>
            <p className="text-gray-600">
              {selectedFolder.filterType === 'shared' 
                ? 'No shared loops yet'
                : 'Select a different folder or create your first loop'}
            </p>
          </motion.div>
        )}
      </main>
    </div>
  );
}

