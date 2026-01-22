program bookmark_v1.aleo;

record Bookmark:
    owner as address.private;
    bookmark_id as field.private;
    encrypted_url as field.private;
    encrypted_title as field.private;
    created_at as u32.private;

mapping bookmark_count:
    key as address.public;
    value as u32.public;

function add_bookmark:
    input r0 as field.private;
    input r1 as field.private;
    input r2 as field.private;
    input r3 as u32.private;
    cast self.caller r0 r1 r2 r3 into r4 as Bookmark.record;
    async add_bookmark self.caller into r5;
    output r4 as Bookmark.record;
    output r5 as bookmark_v1.aleo/add_bookmark.future;

finalize add_bookmark:
    input r0 as address.public;
    get.or_use bookmark_count[r0] 0u32 into r1;
    add r1 1u32 into r2;
    set r2 into bookmark_count[r0];

function delete_bookmark:
    input r0 as Bookmark.record;
    assert.eq r0.owner self.caller;
    async delete_bookmark self.caller into r1;
    output r1 as bookmark_v1.aleo/delete_bookmark.future;

finalize delete_bookmark:
    input r0 as address.public;
    get.or_use bookmark_count[r0] 0u32 into r1;
    gt r1 0u32 into r2;
    sub r1 1u32 into r3;
    ternary r2 r3 0u32 into r4;
    set r4 into bookmark_count[r0];

function update_bookmark:
    input r0 as Bookmark.record;
    input r1 as field.private;
    input r2 as field.private;
    input r3 as u32.private;
    assert.eq r0.owner self.caller;
    cast self.caller r0.bookmark_id r1 r2 r3 into r4 as Bookmark.record;
    output r4 as Bookmark.record;

function transfer_bookmark:
    input r0 as Bookmark.record;
    input r1 as address.private;
    assert.eq r0.owner self.caller;
    cast r1 r0.bookmark_id r0.encrypted_url r0.encrypted_title r0.created_at into r2 as Bookmark.record;
    async transfer_bookmark self.caller r1 into r3;
    output r2 as Bookmark.record;
    output r3 as bookmark_v1.aleo/transfer_bookmark.future;

finalize transfer_bookmark:
    input r0 as address.public;
    input r1 as address.public;
    get.or_use bookmark_count[r0] 0u32 into r2;
    gt r2 0u32 into r3;
    sub r2 1u32 into r4;
    ternary r3 r4 0u32 into r5;
    set r5 into bookmark_count[r0];
    get.or_use bookmark_count[r1] 0u32 into r6;
    add r6 1u32 into r7;
    set r7 into bookmark_count[r1];

constructor:
    assert.eq edition 0u16;
