import React, { useEffect, useState } from 'react';
import { useNotesStore, Note } from '../../stores/notesStore';
import { NoteEditor } from './NoteEditor';

interface NotesPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotesPanel: React.FC<NotesPanelProps> = ({ isOpen, onClose }) => {
  const {
    notes,
    isLoading,
    loadNotes,
    addNote,
    updateNote,
    deleteNote,
    syncToAleo,
    searchQuery,
    setSearchQuery,
    getFilteredNotes,
  } = useNotesStore();

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [syncingNoteId, setSyncingNoteId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadNotes();
    }
  }, [isOpen, loadNotes]);

  const handleCreateNote = () => {
    setEditingNote(null);
    setIsEditorOpen(true);
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setIsEditorOpen(true);
  };

  const handleSaveNote = async (noteData: { title: string; content: string; tags: string[] }) => {
    if (editingNote) {
      await updateNote(editingNote.id, noteData);
    } else {
      await addNote(noteData);
    }
    setIsEditorOpen(false);
    setEditingNote(null);
  };

  const handleDeleteNote = async (id: string) => {
    if (confirm('Are you sure you want to delete this note?')) {
      await deleteNote(id);
    }
  };

  const handleSyncNote = async (noteId: string) => {
    setSyncingNoteId(noteId);
    const result = await syncToAleo(noteId);
    setSyncingNoteId(null);
    if (!result.success) {
      alert(`Sync failed: ${result.error}`);
    }
  };

  const filteredNotes = getFilteredNotes();

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - timestamp;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Sidebar Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-96 bg-[#111118] border-l border-[#27272a] shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-[#27272a]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-[#e4e4e7]">Private Notes</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-[#27272a] flex items-center justify-center transition-colors"
          >
            <svg className="w-5 h-5 text-[#71717a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search and Create */}
        <div className="p-4 space-y-3 border-b border-[#27272a]">
          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52525b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-10 pr-4 bg-[#0a0a0f] border border-[#27272a] rounded-lg text-sm text-[#e4e4e7] placeholder-[#52525b] focus:outline-none focus:border-[#00d4aa]"
            />
          </div>

          {/* Create Button */}
          <button
            onClick={handleCreateNote}
            className="w-full h-10 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 font-medium transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create New Note
          </button>
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ height: 'calc(100vh - 200px)' }}>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
              <p className="text-sm text-[#71717a] mt-3">Loading notes...</p>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-[#1a1a24] flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-[#52525b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-[#e4e4e7] mb-1">No Notes Yet</h3>
              <p className="text-sm text-[#71717a] max-w-xs">
                {searchQuery
                  ? 'No notes match your search'
                  : 'Create your first private note to store securely on the Aleo blockchain'}
              </p>
            </div>
          ) : (
            filteredNotes.map((note) => (
              <div
                key={note.id}
                className="p-4 bg-[#0a0a0f] border border-[#27272a] rounded-lg hover:border-[#3f3f46] transition-colors cursor-pointer"
                onClick={() => handleEditNote(note)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-semibold text-[#e4e4e7] truncate flex-1 mr-2">
                    {note.title || 'Untitled'}
                  </h3>
                  {/* Sync Status Badge */}
                  {note.syncStatus === 'on-chain' || note.syncedToAleo ? (
                    <span className="px-2 py-0.5 text-xs font-medium rounded bg-green-500/10 text-green-400 flex items-center gap-1 flex-shrink-0">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      On-Chain
                    </span>
                  ) : note.syncStatus === 'syncing' ? (
                    <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-500/10 text-blue-400 flex items-center gap-1 flex-shrink-0">
                      <div className="w-3 h-3 border border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                      Syncing
                    </span>
                  ) : note.syncStatus === 'failed' ? (
                    <span className="px-2 py-0.5 text-xs font-medium rounded bg-red-500/10 text-red-400 flex items-center gap-1 flex-shrink-0">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Failed
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-xs font-medium rounded bg-amber-500/10 text-amber-400 flex-shrink-0">
                      Local
                    </span>
                  )}
                </div>

                {/* Preview */}
                <p className="text-xs text-[#71717a] line-clamp-2 mb-2">
                  {note.content || 'No content'}
                </p>

                {/* Tags */}
                {note.tags && note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {note.tags.slice(0, 3).map((tag, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 text-xs rounded bg-[#1a1a24] text-[#a1a1aa]"
                      >
                        #{tag}
                      </span>
                    ))}
                    {note.tags.length > 3 && (
                      <span className="text-xs text-[#52525b]">+{note.tags.length - 3}</span>
                    )}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-[#27272a]/50">
                  <span className="text-xs text-[#52525b]">{formatDate(note.updatedAt)}</span>

                  <div className="flex items-center gap-2">
                    {/* Sync Button - show for local or failed notes */}
                    {!note.syncedToAleo && note.syncStatus !== 'on-chain' && note.syncStatus !== 'syncing' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSyncNote(note.id);
                        }}
                        disabled={syncingNoteId === note.id}
                        className="px-2 py-1 text-xs rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 transition-colors disabled:opacity-50 flex items-center gap-1"
                      >
                        {syncingNoteId === note.id ? (
                          <>
                            <div className="w-3 h-3 border border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                            Syncing...
                          </>
                        ) : note.syncStatus === 'failed' ? (
                          <>
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Retry
                          </>
                        ) : (
                          <>
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                            </svg>
                            Sync
                          </>
                        )}
                      </button>
                    )}

                    {/* Delete Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNote(note.id);
                      }}
                      className="p-1 rounded hover:bg-red-500/20 text-[#71717a] hover:text-red-400 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Info */}
        <div className="px-4 py-3 border-t border-[#27272a] bg-[#0a0a0f]">
          <p className="text-xs text-[#52525b] text-center">
            Notes are encrypted and stored on the Aleo blockchain for privacy
          </p>
        </div>
      </div>

      {/* Note Editor Modal */}
      <NoteEditor
        isOpen={isEditorOpen}
        note={editingNote}
        onSave={handleSaveNote}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingNote(null);
        }}
      />
    </>
  );
};

export default NotesPanel;
