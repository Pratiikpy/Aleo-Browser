program privacybrowser_notes_v1.aleo;

record Note:
    owner as address.private;
    note_id as field.private;
    encrypted_title as field.private;
    encrypted_content as field.private;
    encrypted_tags as field.private;
    created_at as u64.private;
    updated_at as u64.private;

mapping note_count:
    key as address.public;
    value as u32.public;

function add_note:
    input r0 as field.private;
    input r1 as field.private;
    input r2 as field.private;
    input r3 as field.private;
    input r4 as u64.private;
    cast self.caller r0 r1 r2 r3 r4 r4 into r5 as Note.record;
    async add_note self.caller into r6;
    output r5 as Note.record;
    output r6 as privacybrowser_notes_v1.aleo/add_note.future;

finalize add_note:
    input r0 as address.public;
    get.or_use note_count[r0] 0u32 into r1;
    add r1 1u32 into r2;
    set r2 into note_count[r0];

function delete_note:
    input r0 as Note.record;
    assert.eq r0.owner self.caller;
    async delete_note self.caller into r1;
    output r1 as privacybrowser_notes_v1.aleo/delete_note.future;

finalize delete_note:
    input r0 as address.public;
    get.or_use note_count[r0] 0u32 into r1;
    gt r1 0u32 into r2;
    sub r1 1u32 into r3;
    ternary r2 r3 0u32 into r4;
    set r4 into note_count[r0];

function update_note:
    input r0 as Note.record;
    input r1 as field.private;
    input r2 as field.private;
    input r3 as field.private;
    input r4 as u64.private;
    assert.eq r0.owner self.caller;
    cast self.caller r0.note_id r1 r2 r3 r0.created_at r4 into r5 as Note.record;
    output r5 as Note.record;

function transfer_note:
    input r0 as Note.record;
    input r1 as address.private;
    assert.eq r0.owner self.caller;
    cast r1 r0.note_id r0.encrypted_title r0.encrypted_content r0.encrypted_tags r0.created_at r0.updated_at into r2 as Note.record;
    async transfer_note self.caller r1 into r3;
    output r2 as Note.record;
    output r3 as privacybrowser_notes_v1.aleo/transfer_note.future;

finalize transfer_note:
    input r0 as address.public;
    input r1 as address.public;
    get.or_use note_count[r0] 0u32 into r2;
    gt r2 0u32 into r3;
    sub r2 1u32 into r4;
    ternary r3 r4 0u32 into r5;
    set r5 into note_count[r0];
    get.or_use note_count[r1] 0u32 into r6;
    add r6 1u32 into r7;
    set r7 into note_count[r1];

function archive_note:
    input r0 as Note.record;
    input r1 as field.private;
    input r2 as u64.private;
    assert.eq r0.owner self.caller;
    cast self.caller r0.note_id r0.encrypted_title r0.encrypted_content r1 r0.created_at r2 into r3 as Note.record;
    output r3 as Note.record;

constructor:
    assert.eq edition 0u16;
