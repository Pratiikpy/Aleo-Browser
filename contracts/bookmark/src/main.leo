// AleoBrowser Private Bookmarks Contract
// Enables users to store encrypted bookmarks privately on the Aleo blockchain

program bookmark_v1.aleo {

    // ============================================
    // Records
    // ============================================

    // Private bookmark record - only visible to the owner
    record Bookmark {
        owner: address,
        bookmark_id: field,
        encrypted_url: field,
        encrypted_title: field,
        created_at: u32,
    }

    // ============================================
    // Mappings
    // ============================================

    // Tracks the number of bookmarks per user (public counter)
    mapping bookmark_count: address => u32;

    // Non-upgradable constructor
    @noupgrade
    async constructor() {}

    // ============================================
    // Transitions
    // ============================================

    // Add a new private bookmark
    // The encrypted_url and encrypted_title should be pre-encrypted client-side
    // before being passed to this transition
    async transition add_bookmark(
        bookmark_id: field,
        encrypted_url: field,
        encrypted_title: field,
        created_at: u32
    ) -> (Bookmark, Future) {
        // Create a new bookmark record owned by the caller
        let new_bookmark: Bookmark = Bookmark {
            owner: self.caller,
            bookmark_id: bookmark_id,
            encrypted_url: encrypted_url,
            encrypted_title: encrypted_title,
            created_at: created_at,
        };

        // Return the bookmark record and finalize future
        return (new_bookmark, finalize_add_bookmark(self.caller));
    }

    // Finalize: increment the bookmark count for the user
    async function finalize_add_bookmark(caller: address) {
        // Get current count or default to 0
        let current_count: u32 = Mapping::get_or_use(bookmark_count, caller, 0u32);

        // Increment and store the new count
        Mapping::set(bookmark_count, caller, current_count + 1u32);
    }

    // Delete an existing bookmark
    // The bookmark record is consumed (destroyed) by this transition
    async transition delete_bookmark(bookmark: Bookmark) -> Future {
        // Verify the caller owns this bookmark
        assert_eq(bookmark.owner, self.caller);

        // The record is consumed by being passed as input and not returned
        // Return finalize future to decrement the count
        return finalize_delete_bookmark(self.caller);
    }

    // Finalize: decrement the bookmark count for the user
    async function finalize_delete_bookmark(caller: address) {
        // Get current count
        let current_count: u32 = Mapping::get_or_use(bookmark_count, caller, 0u32);

        // Decrement count (with underflow protection)
        let new_count: u32 = current_count > 0u32 ? current_count - 1u32 : 0u32;

        Mapping::set(bookmark_count, caller, new_count);
    }

    // Update an existing bookmark with new encrypted content
    // Consumes the old record and creates a new one with the same bookmark_id
    transition update_bookmark(
        old_bookmark: Bookmark,
        new_encrypted_url: field,
        new_encrypted_title: field,
        new_created_at: u32
    ) -> Bookmark {
        // Verify the caller owns this bookmark
        assert_eq(old_bookmark.owner, self.caller);

        // Create a new bookmark with updated content but same ID
        let updated_bookmark: Bookmark = Bookmark {
            owner: self.caller,
            bookmark_id: old_bookmark.bookmark_id,
            encrypted_url: new_encrypted_url,
            encrypted_title: new_encrypted_title,
            created_at: new_created_at,
        };

        // Return the updated bookmark
        // Note: No finalize needed as bookmark count doesn't change
        return updated_bookmark;
    }

    // ============================================
    // Helper Transitions
    // ============================================

    // Transfer a bookmark to another user
    // Useful for sharing bookmarks privately
    async transition transfer_bookmark(
        bookmark: Bookmark,
        recipient: address
    ) -> (Bookmark, Future) {
        // Verify the caller owns this bookmark
        assert_eq(bookmark.owner, self.caller);

        // Create a new bookmark owned by the recipient
        let transferred_bookmark: Bookmark = Bookmark {
            owner: recipient,
            bookmark_id: bookmark.bookmark_id,
            encrypted_url: bookmark.encrypted_url,
            encrypted_title: bookmark.encrypted_title,
            created_at: bookmark.created_at,
        };

        return (transferred_bookmark, finalize_transfer_bookmark(self.caller, recipient));
    }

    // Finalize: update bookmark counts for both sender and recipient
    async function finalize_transfer_bookmark(sender: address, recipient: address) {
        // Decrement sender's count
        let sender_count: u32 = Mapping::get_or_use(bookmark_count, sender, 0u32);
        let new_sender_count: u32 = sender_count > 0u32 ? sender_count - 1u32 : 0u32;
        Mapping::set(bookmark_count, sender, new_sender_count);

        // Increment recipient's count
        let recipient_count: u32 = Mapping::get_or_use(bookmark_count, recipient, 0u32);
        Mapping::set(bookmark_count, recipient, recipient_count + 1u32);
    }
}
