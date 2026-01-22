import React, { useState, useEffect } from 'react';
import { Note } from '../../stores/notesStore';

interface NoteEditorProps {
  isOpen: boolean;
  note: Note | null;
  onSave: (data: { title: string; content: string; tags: string[] }) => void;
  onClose: () => void;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({ isOpen, note, onSave, onClose }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (note) {
        setTitle(note.title);
        setContent(note.content);
        setTags(note.tags || []);
      } else {
        setTitle('');
        setContent('');
        setTags([]);
      }
      setTagInput('');
    }
  }, [isOpen, note]);

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSave = () => {
    if (!title.trim() && !content.trim()) {
      alert('Please add a title or content');
      return;
    }
    onSave({
      title: title.trim() || 'Untitled',
      content: content.trim(),
      tags,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 bg-[#111118] border border-[#27272a] rounded-xl shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#27272a] flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#e4e4e7]">
            {note ? 'Edit Note' : 'New Note'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-[#27272a] flex items-center justify-center transition-colors"
          >
            <svg className="w-5 h-5 text-[#71717a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Title Input */}
          <div>
            <label className="block text-sm font-medium text-[#a1a1aa] mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title..."
              className="w-full h-10 px-4 bg-[#0a0a0f] border border-[#27272a] rounded-lg text-[#e4e4e7] placeholder-[#52525b] focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Content Input */}
          <div>
            <label className="block text-sm font-medium text-[#a1a1aa] mb-2">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your private note here..."
              rows={10}
              className="w-full px-4 py-3 bg-[#0a0a0f] border border-[#27272a] rounded-lg text-[#e4e4e7] placeholder-[#52525b] focus:outline-none focus:border-purple-500 resize-none"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-[#a1a1aa] mb-2">Tags</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag, i) => (
                <span
                  key={i}
                  className="px-3 py-1 text-sm rounded-full bg-purple-500/20 text-purple-400 flex items-center gap-1"
                >
                  #{tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 hover:text-purple-200"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add tag..."
                className="flex-1 h-9 px-3 bg-[#0a0a0f] border border-[#27272a] rounded-lg text-sm text-[#e4e4e7] placeholder-[#52525b] focus:outline-none focus:border-purple-500"
              />
              <button
                onClick={handleAddTag}
                disabled={!tagInput.trim()}
                className="px-4 h-9 rounded-lg bg-[#1a1a24] hover:bg-[#27272a] text-[#a1a1aa] text-sm transition-colors disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#27272a] flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 h-10 rounded-lg bg-[#1a1a24] hover:bg-[#27272a] text-[#a1a1aa] font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 h-10 rounded-lg bg-purple-500 hover:bg-purple-600 text-white font-medium transition-colors"
          >
            {note ? 'Save Changes' : 'Create Note'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NoteEditor;
