program privacybrowser_credentials_v1.aleo;

record Credential:
    owner as address.private;
    credential_id as field.private;
    encrypted_site as field.private;
    encrypted_username as field.private;
    encrypted_password as field.private;
    encrypted_notes as field.private;
    created_at as u64.private;
    updated_at as u64.private;

mapping credential_count:
    key as address.public;
    value as u32.public;

function store_credential:
    input r0 as field.private;
    input r1 as field.private;
    input r2 as field.private;
    input r3 as field.private;
    input r4 as field.private;
    input r5 as u64.private;
    cast self.caller r0 r1 r2 r3 r4 r5 r5 into r6 as Credential.record;
    async store_credential self.caller into r7;
    output r6 as Credential.record;
    output r7 as privacybrowser_credentials_v1.aleo/store_credential.future;

finalize store_credential:
    input r0 as address.public;
    get.or_use credential_count[r0] 0u32 into r1;
    add r1 1u32 into r2;
    set r2 into credential_count[r0];

function delete_credential:
    input r0 as Credential.record;
    assert.eq r0.owner self.caller;
    async delete_credential self.caller into r1;
    output r1 as privacybrowser_credentials_v1.aleo/delete_credential.future;

finalize delete_credential:
    input r0 as address.public;
    get.or_use credential_count[r0] 0u32 into r1;
    gt r1 0u32 into r2;
    sub r1 1u32 into r3;
    ternary r2 r3 0u32 into r4;
    set r4 into credential_count[r0];

function update_credential:
    input r0 as Credential.record;
    input r1 as field.private;
    input r2 as field.private;
    input r3 as field.private;
    input r4 as field.private;
    input r5 as u64.private;
    assert.eq r0.owner self.caller;
    cast self.caller r0.credential_id r1 r2 r3 r4 r0.created_at r5 into r6 as Credential.record;
    output r6 as Credential.record;

function update_password:
    input r0 as Credential.record;
    input r1 as field.private;
    input r2 as u64.private;
    assert.eq r0.owner self.caller;
    cast self.caller r0.credential_id r0.encrypted_site r0.encrypted_username r1 r0.encrypted_notes r0.created_at r2 into r3 as Credential.record;
    output r3 as Credential.record;

function emergency_transfer:
    input r0 as Credential.record;
    input r1 as address.private;
    assert.eq r0.owner self.caller;
    cast r1 r0.credential_id r0.encrypted_site r0.encrypted_username r0.encrypted_password r0.encrypted_notes r0.created_at r0.updated_at into r2 as Credential.record;
    async emergency_transfer self.caller r1 into r3;
    output r2 as Credential.record;
    output r3 as privacybrowser_credentials_v1.aleo/emergency_transfer.future;

finalize emergency_transfer:
    input r0 as address.public;
    input r1 as address.public;
    get.or_use credential_count[r0] 0u32 into r2;
    gt r2 0u32 into r3;
    sub r2 1u32 into r4;
    ternary r3 r4 0u32 into r5;
    set r5 into credential_count[r0];
    get.or_use credential_count[r1] 0u32 into r6;
    add r6 1u32 into r7;
    set r7 into credential_count[r1];

constructor:
    assert.eq edition 0u16;
