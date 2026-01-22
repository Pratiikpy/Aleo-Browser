import { create } from 'zustand';

export interface EncryptedData {
  encrypted: string;
  iv: string;
  authTag: string;
  salt: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  syncedToAleo: boolean;
  syncStatus?: 'local' | 'syncing' | 'on-chain' | 'failed';
  txHash?: string;
  // Encryption data (stored locally for decryption)
  encryptedData?: {
    title: EncryptedData;
    content: EncryptedData;
    tags: EncryptedData;
  };
  isEncrypted?: boolean;
}

interface NotesState {
  notes: Note[];
  isLoading: boolean;
  selectedNoteId: string | null;
  searchQuery: string;
}

interface NotesActions {
  loadNotes: () => Promise<void>;
  addNote: (note: { title: string; content: string; tags?: string[] }) => Promise<Note | null>;
  updateNote: (id: string, updates: Partial<Note>) => Promise<boolean>;
  deleteNote: (id: string) => Promise<boolean>;
  syncToAleo: (noteId: string) => Promise<{ success: boolean; txHash?: string; error?: string }>;
  setSelectedNote: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  getFilteredNotes: () => Note[];
}

type NotesStore = NotesState & NotesActions;

export const useNotesStore = create<NotesStore>((set, get) => ({
  // State
  notes: [],
  isLoading: false,
  selectedNoteId: null,
  searchQuery: '',

  // Actions
  loadNotes: async () => {
    set({ isLoading: true });
    try {
      const notes = await window.electron.notes.getAll();
      set({ notes: notes || [], isLoading: false });
    } catch (error) {
      console.error('Failed to load notes:', error);
      set({ notes: [], isLoading: false });
    }
  },

  addNote: async (note) => {
    try {
      const result = await window.electron.notes.add(note);
      if (result.success && result.note) {
        // Note will start syncing in background, add with initial status
        const newNote = {
          ...result.note,
          syncStatus: result.note.syncStatus || 'syncing' as const,
        };
        set((state) => ({
          notes: [newNote, ...state.notes],
        }));

        // Poll for sync status updates (background sync takes time)
        setTimeout(async () => {
          const notes = await window.electron.notes.getAll();
          set({ notes: notes || [] });
        }, 5000);

        // Poll again after 30 seconds
        setTimeout(async () => {
          const notes = await window.electron.notes.getAll();
          set({ notes: notes || [] });
        }, 30000);

        return result.note;
      }
      return null;
    } catch (error) {
      console.error('Failed to add note:', error);
      return null;
    }
  },

  updateNote: async (id, updates) => {
    try {
      const result = await window.electron.notes.update(id, updates);
      if (result.success) {
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === id
              ? { ...note, ...updates, updatedAt: Date.now(), syncedToAleo: false }
              : note
          ),
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to update note:', error);
      return false;
    }
  },

  deleteNote: async (id) => {
    try {
      const result = await window.electron.notes.delete(id);
      if (result.success) {
        set((state) => ({
          notes: state.notes.filter((note) => note.id !== id),
          selectedNoteId: state.selectedNoteId === id ? null : state.selectedNoteId,
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to delete note:', error);
      return false;
    }
  },

  syncToAleo: async (noteId) => {
    try {
      const result = await window.electron.notes.syncToAleo(noteId);
      if (result.success) {
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === noteId ? { ...note, syncedToAleo: true } : note
          ),
        }));
      }
      return result;
    } catch (error) {
      console.error('Failed to sync note to Aleo:', error);
      return { success: false, error: 'Sync failed' };
    }
  },

  setSelectedNote: (id) => {
    set({ selectedNoteId: id });
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },

  getFilteredNotes: () => {
    const { notes, searchQuery } = get();
    if (!searchQuery.trim()) return notes;

    const query = searchQuery.toLowerCase();
    return notes.filter(
      (note) =>
        note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query) ||
        note.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  },
}));
