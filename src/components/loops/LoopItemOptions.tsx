'use client';

import { useState } from 'react';
import React from 'react';
import { LoopItem } from '@/types/loop';
import { motion } from 'framer-motion';
import Image from 'next/image';

interface LoopItemOptionsProps {
  item: LoopItem;
  onUpdate: (updatedItem: LoopItem) => void;
  onClose: () => void;
  onDelete?: (itemId: string) => void;
  loopColor?: string;
  loopName?: string;
}

export function LoopItemOptions({ item, onUpdate, onClose, onDelete, loopColor = '#FFB800', loopName }: LoopItemOptionsProps) {
  const [editedItem, setEditedItem] = useState<LoopItem>(item);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [newSubTaskName, setNewSubTaskName] = useState('');
  const [showSubTaskInput, setShowSubTaskInput] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('');
  const dateInputRef = React.useRef<HTMLInputElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const imageInputRef = React.useRef<HTMLInputElement>(null);

  const handleSave = () => {
    onUpdate(editedItem);
    onClose();
  };

  const handleAddSubTask = () => {
    if (!newSubTaskName.trim()) return;
    
    const newSubTask = {
      id: Date.now().toString(),
      title: newSubTaskName.trim(),
      completed: false,
      order: editedItem.subTasks?.length || 0,
    };
    
    const updatedItem = {
      ...editedItem,
      subTasks: [...(editedItem.subTasks || []), newSubTask],
    };
    
    setEditedItem(updatedItem);
    setNewSubTaskName('');
    setShowSubTaskInput(false);
    onUpdate(updatedItem);
  };

  const LoopIcon = () => (
    <svg
      width="64"
      height="64"
      viewBox="0 0 444.25 444.25"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ fill: loopColor }}
    >
      <path d="M239.72,111.74l30.57-25.47c-12.11-9.89-24.22-19.79-36.33-29.68,11.16,1,78.57,8.2,124.27,67.79,4.09,5.34,43.27,54.72,35,126.27-2.14,18.49-6.5,33.53-10.41,43.86l17.72,11.08-72.81,27.39c-4.65-25.62-8.64-51.32-12.63-76.79,7.09,3.77,12.18,6.65,19.72,10.63,8.64-34.78,3.99-81.08-20.16-109.21-31.65-36.88-62.25-42.53-74.95-45.85Z"/>
      <path d="M311.88,310.36c2.15,13.09,4.29,26.18,6.44,39.27,14.67-5.41,29.34-10.83,44.01-16.24-6.53,9.11-46.94,63.55-121.47,72.69-6.68.82-69.1,9.52-126.56-33.91-14.85-11.22-25.6-22.62-32.51-31.23-6.18,3.22-12.36,6.43-18.54,9.65,4.45-25.55,8.89-51.09,13.34-76.64,24.44,8.99,48.61,18.6,72.58,28.09-6.84,4.2-11.91,7.13-19.17,11.59,25.59,25.09,67.84,44.57,104.34,38.04,47.84-8.56,68.23-32.06,77.54-41.32Z"/>
      <path d="M104.99,274.14c-12.41-4.7-24.81-9.39-37.22-14.09-2.66,15.41-5.32,30.82-7.98,46.23-4.62-10.22-31.5-72.45-2.1-141.54,2.63-6.19,26.36-64.59,92.73-92.57,17.15-7.23,32.39-10.83,43.31-12.51.31-6.96.62-13.92.93-20.88,19.89,16.64,39.77,33.28,59.66,49.92-20.02,16.65-40.44,32.76-60.66,48.76-.21-8.02-.21-13.88-.44-22.4-34.53,9.58-72.56,36.4-85.18,71.26-16.55,45.7-6.42,75.12-3.07,87.81Z"/>
    </svg>
  );

  return (
    <motion.div
      className="fixed inset-0 bg-white z-50 overflow-y-auto"
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
    >
      {/* Yellow Header Bar */}
      <div className="h-16 bg-yellow-500" />

      <div className="max-w-md mx-auto px-4 py-6 pb-20">
        {/* Loop Icon - Centered */}
        <div className="flex justify-center mb-4">
          <LoopIcon />
        </div>

        {/* Loop Name - Centered under icon */}
        {loopName && (
          <div className="text-center mb-6">
            <p className="text-sm text-gray-600 mb-1">Loop Name:</p>
            <p className="text-2xl font-bold text-gray-900">{loopName}</p>
          </div>
        )}

        {/* Navigation - Back, Save, Cancel */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onClose}
            className="text-yellow-500 hover:text-yellow-600 font-medium flex items-center gap-2"
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
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="text-gray-600 hover:text-gray-800 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="text-yellow-500 hover:text-yellow-600 font-medium"
            >
              Save
            </button>
          </div>
        </div>

        {/* Item Title with Checkbox */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex-shrink-0" />
          <div className="flex-1 flex items-center gap-2">
            <span className="text-gray-700">Item/Step:</span>
            {editedItem.title ? (
              <input
                type="text"
                value={editedItem.title}
                onChange={(e) => setEditedItem({ ...editedItem, title: e.target.value })}
                onBlur={() => onUpdate(editedItem)}
                placeholder="Enter item name"
                className="flex-1 font-bold text-gray-900 border-none outline-none bg-transparent"
              />
            ) : (
              <input
                type="text"
                value={editedItem.title}
                onChange={(e) => setEditedItem({ ...editedItem, title: e.target.value })}
                onBlur={() => onUpdate(editedItem)}
                placeholder="Enter item/step name"
                className="flex-1 text-gray-900 border-none outline-none bg-transparent"
              />
            )}
          </div>
        </div>

        {/* Add Sub-step */}
        <div className="mb-6">
          <button 
            onClick={() => setShowSubTaskInput(!showSubTaskInput)}
            className="flex items-center gap-3 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 46.01 27.47" className="flex-shrink-0 text-gray-700">
              <rect x=".38" y=".38" width="45.26" height="9.59" rx="4.29" ry="4.29" stroke="currentColor" strokeWidth=".75" fill="none" />
              <rect x="12.08" y="17.5" width="33.55" height="9.59" rx="4.29" ry="4.29" stroke="currentColor" strokeWidth=".75" fill="none" />
              <rect x="5.59" y="10.07" width="2.44" height="12.82" stroke="currentColor" strokeWidth=".75" fill="none" />
              <rect x="5.85" y="20.7" width="13.03" height="2.2" stroke="currentColor" strokeWidth=".75" fill="none" />
            </svg>
            <span className="font-medium">Add a sub-step</span>
          </button>
          
          {/* Sub-task Input */}
          {showSubTaskInput && (
            <div className="mt-3 ml-9 flex items-center gap-2">
              <input
                type="text"
                value={newSubTaskName}
                onChange={(e) => setNewSubTaskName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddSubTask();
                  }
                }}
                placeholder="Enter sub-step name"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 text-gray-900"
                autoFocus
              />
              <button
                onClick={handleAddSubTask}
                disabled={!newSubTaskName.trim()}
                className={`px-4 py-2 rounded-lg font-medium ${
                  newSubTaskName.trim()
                    ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Add
              </button>
            </div>
          )}
          
          {/* Display Existing Sub-tasks */}
          {editedItem.subTasks && editedItem.subTasks.length > 0 && (
            <div className="mt-3 ml-9 space-y-2">
              {editedItem.subTasks.map((subTask) => (
                <div key={subTask.id} className="flex items-center gap-2 text-sm text-gray-700">
                  <div className="w-4 h-4 rounded-full border border-gray-400 flex-shrink-0" />
                  <span>{subTask.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Options List */}
        <div className="divide-y divide-gray-200">
          {/* Set as Loop item or one time task
              - Loop item (isRecurring=true): Stays in the loop when reset, always appears
              - One-time item (isRecurring=false): Appears only once, removed when loop is reset
              - One-time with due date: Shows with due date, only appears on that date, disappears after
          */}
          <div className="py-4 first:pt-0">
            <div className="flex items-center gap-3">
              <span className="text-gray-700">Select item type:</span>
              <button
                onClick={() => {
                  const updatedItem = { ...editedItem, isRecurring: true };
                  setEditedItem(updatedItem);
                  onUpdate(updatedItem);
                }}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 444.25 444.25"
                  fill="none"
                  className={editedItem.isRecurring ? 'fill-gray-700' : 'fill-gray-300'}
                >
                  <path d="M239.72,111.74l30.57-25.47c-12.11-9.89-24.22-19.79-36.33-29.68,11.16,1,78.57,8.2,124.27,67.79,4.09,5.34,43.27,54.72,35,126.27-2.14,18.49-6.5,33.53-10.41,43.86l17.72,11.08-72.81,27.39c-4.65-25.62-8.64-51.32-12.63-76.79,7.09,3.77,12.18,6.65,19.72,10.63,8.64-34.78,3.99-81.08-20.16-109.21-31.65-36.88-62.25-42.53-74.95-45.85Z"/>
                  <path d="M311.88,310.36c2.15,13.09,4.29,26.18,6.44,39.27,14.67-5.41,29.34-10.83,44.01-16.24-6.53,9.11-46.94,63.55-121.47,72.69-6.68.82-69.1,9.52-126.56-33.91-14.85-11.22-25.6-22.62-32.51-31.23-6.18,3.22-12.36,6.43-18.54,9.65,4.45-25.55,8.89-51.09,13.34-76.64,24.44,8.99,48.61,18.6,72.58,28.09-6.84,4.2-11.91,7.13-19.17,11.59,25.59,25.09,67.84,44.57,104.34,38.04,47.84-8.56,68.23-32.06,77.54-41.32Z"/>
                  <path d="M104.99,274.14c-12.41-4.7-24.81-9.39-37.22-14.09-2.66,15.41-5.32,30.82-7.98,46.23-4.62-10.22-31.5-72.45-2.1-141.54,2.63-6.19,26.36-64.59,92.73-92.57,17.15-7.23,32.39-10.83,43.31-12.51.31-6.96.62-13.92.93-20.88,19.89,16.64,39.77,33.28,59.66,49.92-20.02,16.65-40.44,32.76-60.66,48.76-.21-8.02-.21-13.88-.44-22.4-34.53,9.58-72.56,36.4-85.18,71.26-16.55,45.7-6.42,75.12-3.07,87.81Z"/>
                </svg>
                <span className={editedItem.isRecurring ? 'text-gray-700' : 'text-gray-400'}>Loop item</span>
              </button>
              <button
                onClick={() => {
                  const updatedItem = { ...editedItem, isRecurring: false };
                  setEditedItem(updatedItem);
                  onUpdate(updatedItem);
                }}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className={!editedItem.isRecurring ? 'text-gray-700' : 'text-gray-300'}>
                  <path d="M 5 12 L 19 12 M 15 8 L 19 12 L 15 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className={!editedItem.isRecurring ? 'text-gray-700' : 'text-gray-400'}>One-time item</span>
              </button>
            </div>
          </div>

          {/* Add Due Date */}
          <div className="py-4">
            <button
              onClick={() => dateInputRef.current?.showPicker()}
              className="flex items-center gap-3 w-full text-left hover:bg-gray-50 transition-colors"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 text-gray-700">
                <rect x="4" y="5" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
                <path d="M 8 3 L 8 7 M 16 3 L 16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M 4 9 L 20 9" stroke="currentColor" strokeWidth="2" />
              </svg>
              <span className="text-gray-700">
                {editedItem.dueDate 
                  ? new Date(editedItem.dueDate + 'T00:00:00').toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })
                  : 'Add Due Date'
                }
              </span>
              <input
                ref={dateInputRef}
                type="date"
                value={editedItem.dueDate || ''}
                onChange={(e) => {
                  const updatedItem = { ...editedItem, dueDate: e.target.value };
                  setEditedItem(updatedItem);
                  onUpdate(updatedItem);
                }}
                className="opacity-0 w-0 h-0 absolute pointer-events-none"
              />
            </button>
            {editedItem.dueDate && (
              <button
                onClick={() => {
                  const updatedItem = { ...editedItem, dueDate: undefined };
                  setEditedItem(updatedItem);
                  onUpdate(updatedItem);
                }}
                className="ml-9 text-sm text-gray-500 hover:text-gray-700"
              >
                Remove
              </button>
            )}
          </div>

          {/* Assign to */}
          <div className="py-4">
            <button
              onClick={() => setEditingField(editingField === 'assignedTo' ? null : 'assignedTo')}
              className="flex items-center gap-3 w-full text-left hover:bg-gray-50 transition-colors"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 text-gray-700">
                <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="2" />
                <path d="M 6 20 C 6 16 8 14 12 14 C 16 14 18 16 18 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className="text-gray-700">Assign to</span>
            </button>
            {editingField === 'assignedTo' && (
              <div className="mt-3 ml-9">
                <input
                  type="email"
                  value={editedItem.assignedTo || ''}
                  onChange={(e) => setEditedItem({ ...editedItem, assignedTo: e.target.value })}
                  onBlur={() => {
                    onUpdate(editedItem);
                    setEditingField(null);
                  }}
                  placeholder="Enter email address or search contacts"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 text-gray-900"
                  autoFocus
                />
              </div>
            )}
          </div>

          {/* Add Tag */}
          <div className="py-4">
            <button
              onClick={() => setEditingField(editingField === 'tags' ? null : 'tags')}
              className="flex items-center gap-3 w-full text-left hover:bg-gray-50 transition-colors"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 text-gray-700">
                <path d="M 20 12 L 12 20 L 4 12 L 4 4 L 12 4 L 20 12 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                <circle cx="8" cy="8" r="1" fill="currentColor" />
              </svg>
              <span className="text-gray-700">Add Tag</span>
            </button>
            <div className="mt-3 ml-9">
              {editingField === 'tags' && (
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && newTagName.trim()) {
                        const updatedItem = {
                          ...editedItem,
                          tags: [...(editedItem.tags || []), newTagName.trim()],
                        };
                        setEditedItem(updatedItem);
                        onUpdate(updatedItem);
                        setNewTagName('');
                      }
                    }}
                    placeholder="Type tag and press Enter"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 text-gray-900"
                    autoFocus
                  />
                </div>
              )}
              {editedItem.tags && editedItem.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {editedItem.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                    >
                      {tag}
                      <button
                        onClick={() => {
                          const updatedItem = {
                            ...editedItem,
                            tags: editedItem.tags?.filter((_, i) => i !== index),
                          };
                          setEditedItem(updatedItem);
                          onUpdate(updatedItem);
                        }}
                        className="hover:text-gray-900"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Attach File */}
          <div className="py-4">
            <button
              onClick={() => setEditingField(editingField === 'attachments' ? null : 'attachments')}
              className="flex items-center gap-3 w-full text-left hover:bg-gray-50 transition-colors"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 text-gray-700">
                <path d="M 12 15 L 12 6 C 12 4 13 3 15 3 C 17 3 18 4 18 6 L 18 16 C 18 19 16 21 13 21 C 10 21 8 19 8 16 L 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className="text-gray-700">Attach File</span>
            </button>
            <div className="mt-3 ml-9">
              {editingField === 'attachments' && (
                <div className="flex flex-col gap-2 mb-3">
                  <input
                    type="text"
                    value={newAttachmentUrl}
                    onChange={(e) => setNewAttachmentUrl(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && newAttachmentUrl.trim()) {
                        const newAttachment = {
                          id: Date.now().toString(),
                          name: newAttachmentUrl.split('/').pop() || 'File',
                          url: newAttachmentUrl.trim(),
                        };
                        const updatedItem = {
                          ...editedItem,
                          attachments: [...(editedItem.attachments || []), newAttachment],
                        };
                        setEditedItem(updatedItem);
                        onUpdate(updatedItem);
                        setNewAttachmentUrl('');
                      }
                    }}
                    placeholder="Enter file URL and press Enter"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 text-gray-900"
                    autoFocus
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Or browse files...
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) {
                        Array.from(files).forEach(file => {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            const newAttachment = {
                              id: Date.now().toString() + Math.random(),
                              name: file.name,
                              url: reader.result as string,
                              type: file.type,
                              size: file.size,
                            };
                            const updatedItem = {
                              ...editedItem,
                              attachments: [...(editedItem.attachments || []), newAttachment],
                            };
                            setEditedItem(updatedItem);
                            onUpdate(updatedItem);
                          };
                          reader.readAsDataURL(file);
                        });
                      }
                    }}
                    className="hidden"
                  />
                </div>
              )}
              {editedItem.attachments && editedItem.attachments.length > 0 && (
                <div className="space-y-2">
                  {editedItem.attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg"
                    >
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 flex-1 truncate"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
                          <path d="M 12 15 L 12 6 C 12 4 13 3 15 3 C 17 3 18 4 18 6 L 18 16 C 18 19 16 21 13 21 C 10 21 8 19 8 16 L 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        <span className="truncate">{attachment.name}</span>
                        {attachment.size && (
                          <span className="text-xs text-gray-500">
                            ({Math.round(attachment.size / 1024)}KB)
                          </span>
                        )}
                      </a>
                      <button
                        onClick={() => {
                          const updatedItem = {
                            ...editedItem,
                            attachments: editedItem.attachments?.filter(a => a.id !== attachment.id),
                          };
                          setEditedItem(updatedItem);
                          onUpdate(updatedItem);
                        }}
                        className="text-gray-400 hover:text-gray-600 ml-2"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Attach image */}
          <div className="py-4">
            <button
              onClick={() => imageInputRef.current?.click()}
              className="flex items-center gap-3 w-full text-left hover:bg-gray-50 transition-colors"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 text-gray-700">
                <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
                <circle cx="8" cy="10" r="1.5" fill="currentColor" />
                <path d="M 3 17 L 8 12 L 11 15 L 15 11 L 21 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-gray-700">
                {editedItem.imageUrl ? 'Change image' : 'Attach image'}
              </span>
            </button>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    const imageUrl = reader.result as string;
                    const updatedItem = { ...editedItem, imageUrl };
                    setEditedItem(updatedItem);
                    onUpdate(updatedItem);
                  };
                  reader.readAsDataURL(file);
                }
              }}
              className="hidden"
            />
            {editedItem.imageUrl && (
              <div className="mt-3 ml-9">
                <div className="relative inline-block">
                  <a
                    href={editedItem.imageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <img
                      src={editedItem.imageUrl}
                      alt="Attached"
                      className="w-24 h-24 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                    />
                  </a>
                  <button
                    onClick={() => {
                      const updatedItem = { ...editedItem, imageUrl: undefined };
                      setEditedItem(updatedItem);
                      onUpdate(updatedItem);
                    }}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full hover:bg-red-600 flex items-center justify-center shadow-md"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Add Note */}
          <div className="py-4">
            <button
              onClick={() => setEditingField(editingField === 'notes' ? null : 'notes')}
              className="flex items-center gap-3 w-full text-left hover:bg-gray-50 transition-colors"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 text-gray-700">
                <path d="M 5 4 L 5 18 L 8 21 L 19 21 L 19 4 L 5 4 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                <path d="M 9 10 L 15 10 M 9 14 L 13 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M 8 18 L 8 21 L 5 18" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              </svg>
              <span className="text-gray-700">Add Note</span>
            </button>
            <div className="mt-3 ml-9">
              {editingField === 'notes' ? (
                <textarea
                  value={editedItem.notes || ''}
                  onChange={(e) => setEditedItem({ ...editedItem, notes: e.target.value })}
                  onBlur={() => {
                    onUpdate(editedItem);
                    setEditingField(null);
                  }}
                  placeholder="Add notes..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 text-gray-900"
                  autoFocus
                />
              ) : (
                editedItem.notes && (
                  <div className="px-4 py-2 bg-gray-50 rounded-lg text-sm text-gray-700 whitespace-pre-wrap">
                    {editedItem.notes}
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* Delete Button */}
        {onDelete && (
          <div className="flex justify-end mt-8">
            <button
              onClick={() => {
                onDelete(item.id);
                onClose();
              }}
              className="text-red-600 hover:text-red-700 font-medium"
            >
              Delete Item/Step
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default LoopItemOptions;

