import React, { useState, useEffect } from 'react';

interface SavedAddress {
  id: string;
  name: string;
  address: string;
  createdAt: number;
  lastUsed?: number;
}

interface AddressBookProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAddress: (address: string) => void;
}

export const AddressBook: React.FC<AddressBookProps> = ({
  isOpen,
  onClose,
  onSelectAddress,
}) => {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Load addresses from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('aleo_address_book');
    if (saved) {
      try {
        setAddresses(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load address book:', e);
      }
    }
  }, [isOpen]);

  // Save addresses to localStorage
  const saveAddresses = (newAddresses: SavedAddress[]) => {
    localStorage.setItem('aleo_address_book', JSON.stringify(newAddresses));
    setAddresses(newAddresses);
  };

  // Validate Aleo address
  const isValidAleoAddress = (address: string): boolean => {
    return address.startsWith('aleo1') && address.length === 63;
  };

  // Add new address
  const handleAddAddress = () => {
    setError('');

    if (!newName.trim()) {
      setError('Please enter a name');
      return;
    }

    if (!isValidAleoAddress(newAddress)) {
      setError('Invalid Aleo address. Must start with "aleo1" and be 63 characters.');
      return;
    }

    // Check for duplicate
    if (addresses.some(a => a.address === newAddress)) {
      setError('This address is already in your address book');
      return;
    }

    const newEntry: SavedAddress = {
      id: Date.now().toString(),
      name: newName.trim(),
      address: newAddress,
      createdAt: Date.now(),
    };

    saveAddresses([newEntry, ...addresses]);
    setNewName('');
    setNewAddress('');
    setIsAddingNew(false);
  };

  // Delete address
  const handleDeleteAddress = (id: string) => {
    saveAddresses(addresses.filter(a => a.id !== id));
  };

  // Select address
  const handleSelectAddress = (address: string) => {
    // Update last used
    const updated = addresses.map(a =>
      a.address === address ? { ...a, lastUsed: Date.now() } : a
    );
    saveAddresses(updated);
    onSelectAddress(address);
    onClose();
  };

  // Filter addresses by search
  const filteredAddresses = addresses.filter(
    a =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Truncate address for display
  const truncateAddress = (address: string) => {
    return `${address.slice(0, 10)}...${address.slice(-8)}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-[#111118] border border-[#27272a] rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#27272a]">
          <h2 className="text-lg font-semibold text-[#e4e4e7]">Address Book</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#27272a] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-[#27272a]">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search addresses..."
              className="w-full h-10 pl-10 pr-4 bg-[#0a0a0f] border border-[#27272a] rounded-lg text-[#e4e4e7] placeholder-[#71717a] focus:outline-none focus:border-[#00d4aa]"
            />
          </div>
        </div>

        {/* Add New Form */}
        {isAddingNew ? (
          <div className="p-4 border-b border-[#27272a] bg-[#0a0a0f]">
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-[#a1a1aa] mb-1">Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., My Exchange"
                  className="w-full h-10 px-3 bg-[#111118] border border-[#27272a] rounded-lg text-[#e4e4e7] placeholder-[#71717a] focus:outline-none focus:border-[#00d4aa]"
                />
              </div>
              <div>
                <label className="block text-sm text-[#a1a1aa] mb-1">Aleo Address</label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="aleo1..."
                  className="w-full h-10 px-3 bg-[#111118] border border-[#27272a] rounded-lg text-[#e4e4e7] placeholder-[#71717a] focus:outline-none focus:border-[#00d4aa] font-mono text-sm"
                />
              </div>
              {error && (
                <p className="text-sm text-[#ef4444]">{error}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleAddAddress}
                  className="flex-1 h-10 bg-[#00d4aa] text-[#0a0a0f] font-medium rounded-lg hover:bg-[#00f5c4] transition-colors"
                >
                  Save Address
                </button>
                <button
                  onClick={() => {
                    setIsAddingNew(false);
                    setNewName('');
                    setNewAddress('');
                    setError('');
                  }}
                  className="px-4 h-10 bg-[#27272a] text-[#e4e4e7] rounded-lg hover:bg-[#3f3f46] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 border-b border-[#27272a]">
            <button
              onClick={() => setIsAddingNew(true)}
              className="w-full h-10 flex items-center justify-center gap-2 bg-[#1a1a24] border border-dashed border-[#27272a] rounded-lg text-[#a1a1aa] hover:text-[#e4e4e7] hover:border-[#00d4aa] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add New Address
            </button>
          </div>
        )}

        {/* Address List */}
        <div className="max-h-64 overflow-y-auto">
          {filteredAddresses.length === 0 ? (
            <div className="p-8 text-center text-[#71717a]">
              {searchQuery
                ? 'No addresses found'
                : 'No saved addresses yet'}
            </div>
          ) : (
            <div className="divide-y divide-[#27272a]">
              {filteredAddresses.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[#1a1a24] cursor-pointer group"
                  onClick={() => handleSelectAddress(entry.address)}
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00d4aa] to-[#00a885] flex items-center justify-center text-[#0a0a0f] font-bold">
                    {entry.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[#e4e4e7]">{entry.name}</div>
                    <div className="text-sm text-[#71717a] font-mono">
                      {truncateAddress(entry.address)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(entry.address);
                      }}
                      className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#27272a] transition-colors"
                      title="Copy address"
                    >
                      <svg className="w-4 h-4 text-[#a1a1aa]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteAddress(entry.id);
                      }}
                      className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#ef4444]/20 transition-colors"
                      title="Delete"
                    >
                      <svg className="w-4 h-4 text-[#ef4444]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[#27272a] bg-[#0a0a0f]">
          <p className="text-xs text-[#71717a] text-center">
            {addresses.length} saved address{addresses.length !== 1 ? 'es' : ''}
          </p>
        </div>
      </div>
    </div>
  );
};
