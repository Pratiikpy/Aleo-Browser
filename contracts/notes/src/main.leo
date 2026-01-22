// AleoBrowser Private Notes Contract
// Enables users to store encrypted notes privately on the Aleo blockchain

program privacybrowser_notes_v1.aleo {

    // ============================================
    // Records
    // ============================================

    // Private note record - only visible to the owner
    record Note {
        owner: address,
        note_id: field,
        encrypted_title: field,
        encrypted_content: field,
        encrypted_tags: field,     // Optional tags for organization
        created_at: u64,
        updated_at: u64,
    }

    // ============================================
    // Mappings
    // ============================================

    // Tracks the number of notes per user (public counter)
    mapping note_count: address => u32;

    // Non-upgradable constructor
    @noupgrade
    async constructor() {}

    // ============================================
    // Transitions
    // ============================================

    // Add a new private note
    // All content fields should be pre-encrypted client-side
    async transition add_note(
        note_id: field,
        encrypted_title: field,
        encrypted_content: field,
        encrypted_tags: field,
        created_at: u64
    ) -> (Note, Future) {
        // Create a new note record owned by the caller
        let new_note: Note = Note {
            owner: self.caller,
            note_id: note_id,
            encrypted_title: encrypted_title,
            encrypted_content: encrypted_content,
            encrypted_tags: encrypted_tags,
            created_at: created_at,
            updated_at: created_at,
        };

        // Return the note record and finalize future
        return (new_note, finalize_add_note(self.caller));
    }

    // Finalize: increment the note count for the user
    async function finalize_add_note(caller: address) {
        // Get current count or default to 0
        let current_count: u32 = Mapping::get_or_use(note_count, caller, 0u32);

        // Increment and store the new count
        Mapping::set(note_count, caller, current_count + 1u32);
    }

    // Delete an existing note
    // The note record is consumed (destroyed) by this transition
    async transition delete_note(note: Note) -> Future {
        // Verify the caller owns this note
        assert_eq(note.owner, self.caller);

        // The record is consumed by being passed as input and not returned
        // Return finalize future to decrement the count
        return finalize_delete_note(self.caller);
    }

    // Finalize: decrement the note count for the user
    async function finalize_delete_note(caller: address) {
        // Get current count
        let current_count: u32 = Mapping::get_or_use(note_count, caller, 0u32);

        // Decrement count (with underflow protection)
        let new_count: u32 = current_count > 0u32 ? current_count - 1u32 : 0u32;

        Mapping::set(note_count, caller, new_count);
    }

    // Update an existing note with new encrypted content
    // Consumes the old record and creates a new one with the same note_id
    transition update_note(
        old_note: Note,
        new_encrypted_title: field,
        new_encrypted_content: field,
        new_encrypted_tags: field,
        updated_at: u64
    ) -> Note {
        // Verify the caller owns this note
        assert_eq(old_note.owner, self.caller);

        // Create a new note with updated content but same ID
        let updated_note: Note = Note {
            owner: self.caller,
            note_id: old_note.note_id,
            encrypted_title: new_encrypted_title,
            encrypted_content: new_encrypted_content,
            encrypted_tags: new_encrypted_tags,
            created_at: old_note.created_at,
            updated_at: updated_at,
        };

        // Return the updated note
        // Note: No finalize needed as note count doesn't change
        return updated_note;
    }

    // ============================================
    // Helper Transitions
    // ============================================

    // Transfer a note to another user
    // Useful for sharing notes privately
    async transition transfer_note(
        note: Note,
        recipient: address
    ) -> (Note, Future) {
        // Verify the caller owns this note
        assert_eq(note.owner, self.caller);

        // Create a new note owned by the recipient
        let transferred_note: Note = Note {
            owner: recipient,
            note_id: note.note_id,
            encrypted_title: note.encrypted_title,
            encrypted_content: note.encrypted_content,
            encrypted_tags: note.encrypted_tags,
            created_at: note.created_at,
            updated_at: note.updated_at,
        };

        return (transferred_note, finalize_transfer_note(self.caller, recipient));
    }

    // Finalize: update note counts for both sender and recipient
    async function finalize_transfer_note(sender: address, recipient: address) {
        // Decrement sender's count
        let sender_count: u32 = Mapping::get_or_use(note_count, sender, 0u32);
        let new_sender_count: u32 = sender_count > 0u32 ? sender_count - 1u32 : 0u32;
        Mapping::set(note_count, sender, new_sender_count);

        // Increment recipient's count
        let recipient_count: u32 = Mapping::get_or_use(note_count, recipient, 0u32);
        Mapping::set(note_count, recipient, recipient_count + 1u32);
    }

    // Archive a note (creates a copy with archive flag in tags)
    // The original is consumed, a new archived version is returned
    transition archive_note(
        note: Note,
        archived_tags: field,
        archived_at: u64
    ) -> Note {
        // Verify the caller owns this note
        assert_eq(note.owner, self.caller);

        // Create an archived copy
        let archived_note: Note = Note {
            owner: self.caller,
            note_id: note.note_id,
            encrypted_title: note.encrypted_title,
            encrypted_content: note.encrypted_content,
            encrypted_tags: archived_tags,
            created_at: note.created_at,
            updated_at: archived_at,
        };

        return archived_note;
    }
}
