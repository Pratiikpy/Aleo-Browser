// AleoBrowser Private Credentials Contract
// Enables users to store encrypted passwords/credentials privately on Aleo
// ZK-encrypted password manager functionality

program privacybrowser_credentials_v1.aleo {

    // ============================================
    // Records
    // ============================================

    // Private credential record - only visible to the owner
    // All sensitive data is pre-encrypted client-side before storage
    record Credential {
        owner: address,
        credential_id: field,
        encrypted_site: field,      // Website/service domain
        encrypted_username: field,  // Login username/email
        encrypted_password: field,  // Login password
        encrypted_notes: field,     // Optional notes (2FA backup codes, etc.)
        created_at: u64,
        updated_at: u64,
    }

    // ============================================
    // Mappings
    // ============================================

    // Tracks the number of credentials per user (public counter)
    mapping credential_count: address => u32;

    // Non-upgradable constructor
    @noupgrade
    async constructor() {}

    // ============================================
    // Transitions
    // ============================================

    // Store a new credential
    // All fields should be pre-encrypted client-side using the user's encryption key
    async transition store_credential(
        credential_id: field,
        encrypted_site: field,
        encrypted_username: field,
        encrypted_password: field,
        encrypted_notes: field,
        created_at: u64
    ) -> (Credential, Future) {
        // Create a new credential record owned by the caller
        let new_credential: Credential = Credential {
            owner: self.caller,
            credential_id: credential_id,
            encrypted_site: encrypted_site,
            encrypted_username: encrypted_username,
            encrypted_password: encrypted_password,
            encrypted_notes: encrypted_notes,
            created_at: created_at,
            updated_at: created_at,
        };

        // Return the credential record and finalize future
        return (new_credential, finalize_store_credential(self.caller));
    }

    // Finalize: increment the credential count for the user
    async function finalize_store_credential(caller: address) {
        // Get current count or default to 0
        let current_count: u32 = Mapping::get_or_use(credential_count, caller, 0u32);

        // Increment and store the new count
        Mapping::set(credential_count, caller, current_count + 1u32);
    }

    // Delete a credential permanently
    // The credential record is consumed (destroyed) by this transition
    async transition delete_credential(cred: Credential) -> Future {
        // Verify the caller owns this credential
        assert_eq(cred.owner, self.caller);

        // The record is consumed by being passed as input and not returned
        // Return finalize future to decrement the count
        return finalize_delete_credential(self.caller);
    }

    // Finalize: decrement the credential count for the user
    async function finalize_delete_credential(caller: address) {
        // Get current count
        let current_count: u32 = Mapping::get_or_use(credential_count, caller, 0u32);

        // Decrement count (with underflow protection)
        let new_count: u32 = current_count > 0u32 ? current_count - 1u32 : 0u32;

        Mapping::set(credential_count, caller, new_count);
    }

    // Update an existing credential
    // Useful for password changes or updating notes
    transition update_credential(
        old_credential: Credential,
        new_encrypted_site: field,
        new_encrypted_username: field,
        new_encrypted_password: field,
        new_encrypted_notes: field,
        updated_at: u64
    ) -> Credential {
        // Verify the caller owns this credential
        assert_eq(old_credential.owner, self.caller);

        // Create an updated credential with same ID
        let updated_credential: Credential = Credential {
            owner: self.caller,
            credential_id: old_credential.credential_id,
            encrypted_site: new_encrypted_site,
            encrypted_username: new_encrypted_username,
            encrypted_password: new_encrypted_password,
            encrypted_notes: new_encrypted_notes,
            created_at: old_credential.created_at,
            updated_at: updated_at,
        };

        // Return the updated credential
        return updated_credential;
    }

    // Update only the password field
    // More efficient for simple password changes
    transition update_password(
        old_credential: Credential,
        new_encrypted_password: field,
        updated_at: u64
    ) -> Credential {
        // Verify the caller owns this credential
        assert_eq(old_credential.owner, self.caller);

        // Create credential with only password changed
        let updated_credential: Credential = Credential {
            owner: self.caller,
            credential_id: old_credential.credential_id,
            encrypted_site: old_credential.encrypted_site,
            encrypted_username: old_credential.encrypted_username,
            encrypted_password: new_encrypted_password,
            encrypted_notes: old_credential.encrypted_notes,
            created_at: old_credential.created_at,
            updated_at: updated_at,
        };

        return updated_credential;
    }

    // ============================================
    // Emergency Access
    // ============================================

    // Transfer credential to a trusted contact (emergency access)
    // Useful for estate planning or emergency situations
    async transition emergency_transfer(
        cred: Credential,
        trusted_contact: address
    ) -> (Credential, Future) {
        // Verify the caller owns this credential
        assert_eq(cred.owner, self.caller);

        // Create a new credential owned by the trusted contact
        let transferred_credential: Credential = Credential {
            owner: trusted_contact,
            credential_id: cred.credential_id,
            encrypted_site: cred.encrypted_site,
            encrypted_username: cred.encrypted_username,
            encrypted_password: cred.encrypted_password,
            encrypted_notes: cred.encrypted_notes,
            created_at: cred.created_at,
            updated_at: cred.updated_at,
        };

        return (transferred_credential, finalize_emergency_transfer(self.caller, trusted_contact));
    }

    // Finalize: update credential counts for transfer
    async function finalize_emergency_transfer(sender: address, recipient: address) {
        // Decrement sender's count
        let sender_count: u32 = Mapping::get_or_use(credential_count, sender, 0u32);
        let new_sender_count: u32 = sender_count > 0u32 ? sender_count - 1u32 : 0u32;
        Mapping::set(credential_count, sender, new_sender_count);

        // Increment recipient's count
        let recipient_count: u32 = Mapping::get_or_use(credential_count, recipient, 0u32);
        Mapping::set(credential_count, recipient, recipient_count + 1u32);
    }
}
