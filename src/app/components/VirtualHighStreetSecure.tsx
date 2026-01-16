import { useState, useEffect } from 'react';
import { X, Plus, Trash, Eye, EyeOff, Store, Grid3x3, List, Download, Upload, Key, RefreshCw, Copy, Check, Edit, Search, Filter, CheckSquare, Square, ArrowUpDown } from 'lucide-react';
import { generatePassword, calculatePasswordStrength, getPasswordStrengthLabel, getPasswordStrengthColor } from '../../utils/crypto';
import { useStorage } from '../../contexts/StorageContext';

interface WebsiteEntry {
  id: string;
  name: string;
  url: string;
  username: string;
  password: string; // Will be encrypted when stored
  category: string;
  color: string;
  favicon: string;
  notes: string;
}

interface VirtualHighStreetSecureProps {
  onClose: () => void;
}

const categories = [
  { id: 'banking', name: 'Banking & Finance', color: '#10B981' },
  { id: 'shopping', name: 'Shopping', color: '#F59E0B' },
  { id: 'social', name: 'Social Media', color: '#3B82F6' },
  { id: 'utilities', name: 'Utilities & Bills', color: '#8B5CF6' },
  { id: 'entertainment', name: 'Entertainment', color: '#EC4899' },
  { id: 'health', name: 'Health & Wellness', color: '#EF4444' },
  { id: 'news', name: 'News & Media', color: '#06B6D4' },
  { id: 'transport', name: 'Transport & Travel', color: '#14B8A6' },
  { id: 'other', name: 'Other', color: '#6B7280' }
];

const websiteExamples = [
  { name: 'Monzo', category: 'banking', domain: 'monzo.com' },
  { name: 'Tesco', category: 'shopping', domain: 'tesco.com' },
  { name: 'Facebook', category: 'social', domain: 'facebook.com' },
  { name: 'Netflix', category: 'entertainment', domain: 'netflix.com' },
  { name: 'Amazon', category: 'shopping', domain: 'amazon.co.uk' }
];

export function VirtualHighStreetSecure({ onClose }: VirtualHighStreetSecureProps) {
  const storage = useStorage();
  const [entries, setEntries] = useState<WebsiteEntry[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  // showEditForm removed - now using modal for editing
  const [editingEntry, setEditingEntry] = useState<WebsiteEntry | null>(null);
  const [viewMode, setViewMode] = useState<'street' | 'list'>('street');
  const [selectedEntry, setSelectedEntry] = useState<WebsiteEntry | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'date-asc' | 'date-desc'>('name-asc');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [newEntry, setNewEntry] = useState({
    name: '',
    url: '',
    username: '',
    password: '',
    category: 'other',
    notes: ''
  });

  const passwordStrength = calculatePasswordStrength(editingEntry ? editingEntry.password : newEntry.password);

  useEffect(() => {
    loadEntries();
  }, []);

  // Scroll to top when add form opens (edit is now in modal)
  useEffect(() => {
    if (showAddForm) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [showAddForm]);

  const loadEntries = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await storage.get<WebsiteEntry>('virtual_street');

      // Defensive: ensure we always set a valid array
      if (Array.isArray(data)) {
        setEntries(data);
        console.log(`Loaded ${data.length} websites`);
      } else {
        console.error('Storage returned non-array:', typeof data, data);
        setEntries([]);
        setError('Data format error - please try re-importing');
      }
    } catch (err) {
      console.error('Failed to load virtual street:', err);
      setError(`Failed to load data: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setEntries([]); // Set empty array as fallback
    } finally {
      setIsLoading(false);
    }
  };

  const getFavicon = (url: string) => {
    try {
      const domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    } catch {
      return '';
    }
  };

  const addEntry = async () => {
    if (!newEntry.name.trim() || !newEntry.url.trim()) return;

    try {
      setError('');
      const category = categories.find(c => c.id === newEntry.category);
      const entry: WebsiteEntry = {
        id: Date.now().toString(),
        ...newEntry,
        color: category?.color || '#6B7280',
        favicon: getFavicon(newEntry.url)
      };

      await storage.add('virtual_street', entry);
      await loadEntries(); // Refresh list
      setNewEntry({ name: '', url: '', username: '', password: '', category: 'other', notes: '' });
      setShowAddForm(false);
    } catch (err) {
      setError('Failed to add entry');
      console.error(err);
    }
  };

  const updateEntry = async () => {
    if (!editingEntry || !editingEntry.name.trim() || !editingEntry.url.trim()) return;

    try {
      setError('');
      const category = categories.find(c => c.id === editingEntry.category);
      const updatedEntry: WebsiteEntry = {
        ...editingEntry,
        color: category?.color || '#6B7280',
        favicon: getFavicon(editingEntry.url)
      };

      await storage.update('virtual_street', editingEntry.id, updatedEntry);
      await loadEntries(); // Refresh list
      setEditingEntry(null); // This closes the modal
    } catch (err) {
      setError('Failed to update entry');
      console.error(err);
    }
  };

  const deleteEntry = async (id: string, fromModal: boolean = false) => {
    try {
      setError('');

      await storage.delete('virtual_street', id);

      // Instead of reloading, just remove from state - preserves scroll position perfectly
      setEntries(prevEntries => prevEntries.filter(entry => entry.id !== id));

      setSelectedEntry(null);

      if (fromModal) {
        setEditingEntry(null); // Close modal
      }
    } catch (err) {
      setError('Failed to delete entry');
      console.error(err);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredEntries.map(e => e.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;

    const confirmed = window.confirm(
      `Delete ${selectedIds.size} selected websites? This cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setError('');

      // Delete all selected entries from storage
      for (const id of selectedIds) {
        await storage.delete('virtual_street', id);
      }

      // Remove from state - preserves scroll position
      setEntries(prevEntries => prevEntries.filter(entry => !selectedIds.has(entry.id)));

      // Clear selection and exit selection mode
      setSelectedIds(new Set());
      setSelectionMode(false);
    } catch (err) {
      setError('Failed to delete selected entries');
      console.error(err);
    }
  };

  const cleanupEmptyEntries = async () => {
    // Find entries with no meaningful data (empty name AND empty url)
    const emptyEntries = entries.filter(entry =>
      (!entry.name || entry.name.trim() === '') &&
      (!entry.url || entry.url.trim() === '')
    );

    if (emptyEntries.length === 0) {
      alert('No empty entries found!');
      return;
    }

    const confirmed = window.confirm(
      `Found ${emptyEntries.length} empty entries (no name and no URL). Delete them all?`
    );

    if (!confirmed) return;

    try {
      setError('');

      // Delete all empty entries from storage
      for (const entry of emptyEntries) {
        await storage.delete('virtual_street', entry.id);
      }

      // Remove from state - preserves scroll position
      setEntries(prevEntries => prevEntries.filter(entry =>
        entry.name.trim() !== '' || entry.url.trim() !== ''
      ));

      alert(`Successfully deleted ${emptyEntries.length} empty entries!`);
    } catch (err) {
      setError('Failed to delete empty entries');
      console.error(err);
    }
  };

  const startEdit = (entry: WebsiteEntry) => {
    setEditingEntry({ ...entry });
    setSelectedEntry(null); // Close detail modal when opening edit modal
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const generateNewPassword = () => {
    const newPassword = generatePassword(16);
    if (editingEntry) {
      setEditingEntry({ ...editingEntry, password: newPassword });
    } else {
      setNewEntry({ ...newEntry, password: newPassword });
    }
  };

  const exportData = async () => {
    try {
      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        entries: entries
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `virtual-high-street-backup-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to export data');
      console.error(err);
    }
  };

  const importData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setError('');
      const text = await file.text();
      const importedData = JSON.parse(text);

      if (importedData.entries && Array.isArray(importedData.entries)) {
        await storage.save('virtual_street', importedData.entries);
        await loadEntries(); // Refresh list
        alert(`Successfully imported ${importedData.entries.length} entries!`);
      } else {
        setError('Invalid backup file format');
      }
    } catch (err) {
      setError('Failed to import data');
      console.error(err);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  // Filter and sort entries based on search, category, and sort option
  const filteredEntries = (Array.isArray(entries) ? entries : [])
    .filter(entry => {
      // Category filter
      if (filterCategory !== 'all' && entry.category !== filterCategory) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          entry.name.toLowerCase().includes(query) ||
          entry.url.toLowerCase().includes(query) ||
          entry.username.toLowerCase().includes(query) ||
          entry.notes.toLowerCase().includes(query)
        );
      }

      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
        case 'name-desc':
          return b.name.toLowerCase().localeCompare(a.name.toLowerCase());
        case 'date-asc':
          return parseInt(a.id) - parseInt(b.id); // Older first (smaller ID)
        case 'date-desc':
          return parseInt(b.id) - parseInt(a.id); // Newer first (larger ID)
        default:
          return 0;
      }
    });

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Decrypting your data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-xl relative">
                <Store className="w-6 h-6" />
                <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-1">
                  <Key className="w-3 h-3 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-gray-900 flex items-center gap-2">
                  My Virtual High Street
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">Encrypted</span>
                </h2>
                <p className="text-sm text-gray-500 mt-1">Your online life organized and secured</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={exportData}
                className="p-2 bg-white text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2 px-3"
                title="Export backup"
              >
                <Download className="w-4 h-4" />
                <span className="text-sm">Export</span>
              </button>
              <label className="p-2 bg-white text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2 px-3 cursor-pointer">
                <Upload className="w-4 h-4" />
                <span className="text-sm">Import</span>
                <input type="file" accept=".json" onChange={importData} className="hidden" />
              </label>
              <div className="w-px h-8 bg-gray-300 mx-2"></div>
              <button
                onClick={() => setViewMode('street')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'street'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Grid3x3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                <List className="w-5 h-5" />
              </button>
              <div className="w-px h-8 bg-gray-300 mx-2"></div>
              <button
                onClick={() => {
                  setSelectionMode(!selectionMode);
                  if (selectionMode) {
                    setSelectedIds(new Set()); // Clear selection when exiting
                  }
                }}
                className={`p-2 rounded-lg transition-colors flex items-center gap-2 px-3 ${
                  selectionMode
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
                title={selectionMode ? 'Exit selection mode' : 'Select multiple'}
              >
                <CheckSquare className="w-4 h-4" />
                <span className="text-sm">{selectionMode ? 'Done' : 'Select'}</span>
              </button>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                title="Add website"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">Add</span>
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white rounded-lg transition-colors ml-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Search/Filter Bar OR Selection Controls */}
        <div className="px-6 pt-4 pb-2 border-b border-gray-200 bg-gray-50">
          {selectionMode ? (
            /* Selection Controls */
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={selectAll}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                  >
                    Select All
                  </button>
                  <button
                    onClick={deselectAll}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                  >
                    Deselect All
                  </button>
                </div>
                {selectedIds.size > 0 && (
                  <button
                    onClick={deleteSelected}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                  >
                    <Trash className="w-4 h-4" />
                    Delete {selectedIds.size} Selected
                  </button>
                )}
              </div>
              <div className="text-sm text-gray-600">
                {selectedIds.size === 0 ? (
                  'Click on items to select them'
                ) : (
                  <span>
                    <span className="font-semibold text-purple-600">{selectedIds.size}</span> of{' '}
                    <span className="font-semibold">{filteredEntries.length}</span> selected
                  </span>
                )}
              </div>
            </div>
          ) : (
            /* Normal Search and Filter */
            <>
              <div className="flex flex-col md:flex-row gap-3">
                {/* Search Input */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search websites, usernames, urls..."
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      title="Clear search"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Category Filter */}
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="pl-9 pr-8 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white appearance-none cursor-pointer"
                  >
                    <option value="all">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                {/* Sort Dropdown */}
                <div className="relative">
                  <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="pl-9 pr-8 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white appearance-none cursor-pointer"
                  >
                    <option value="name-asc">A → Z</option>
                    <option value="name-desc">Z → A</option>
                    <option value="date-desc">Newest First</option>
                    <option value="date-asc">Oldest First</option>
                  </select>
                </div>
              </div>

              {/* Results Count */}
              <div className="mt-2 text-sm text-gray-600">
                Showing <span className="font-semibold">{filteredEntries.length}</span> of <span className="font-semibold">{entries.length}</span> websites
                {searchQuery && <span className="text-blue-600 ml-1">• Searching for "{searchQuery}"</span>}
                {filterCategory !== 'all' && <span className="text-blue-600 ml-1">• {categories.find(c => c.id === filterCategory)?.name}</span>}
              </div>
            </>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {showAddForm && (
            <div className="mb-6 p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border-2 border-blue-200">
              <h3 className="mb-4 flex items-center gap-2">
                <Store className="w-5 h-5 text-blue-600" />
                Add New Website
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  value={newEntry.name}
                  onChange={(e) => setNewEntry({ ...newEntry, name: e.target.value })}
                  placeholder="Website name (e.g., Monzo, Tesco)..."
                  className="px-4 py-3 border border-gray-300 rounded-lg bg-white"
                />
                <input
                  type="url"
                  value={newEntry.url}
                  onChange={(e) => setNewEntry({ ...newEntry, url: e.target.value })}
                  placeholder="Website URL (e.g., monzo.com)..."
                  className="px-4 py-3 border border-gray-300 rounded-lg bg-white"
                />
                <select
                  value={newEntry.category}
                  onChange={(e) => setNewEntry({ ...newEntry, category: e.target.value })}
                  className="px-4 py-3 border border-gray-300 rounded-lg bg-white"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newEntry.username}
                  onChange={(e) => setNewEntry({ ...newEntry, username: e.target.value })}
                  placeholder="Username/Email (optional)..."
                  className="px-4 py-3 border border-gray-300 rounded-lg bg-white"
                />
                <div className="relative">
                  <input
                    type="text"
                    value={newEntry.password}
                    onChange={(e) => setNewEntry({ ...newEntry, password: e.target.value })}
                    placeholder="Password (optional)..."
                    className="px-4 py-3 border border-gray-300 rounded-lg bg-white w-full pr-12"
                  />
                  <button
                    type="button"
                    onClick={generateNewPassword}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Generate strong password"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
                <input
                  type="text"
                  value={newEntry.notes}
                  onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })}
                  placeholder="Notes (optional)..."
                  className="px-4 py-3 border border-gray-300 rounded-lg bg-white"
                />
              </div>

              {newEntry.password && (
                <div className="mt-3 space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Password Strength:</span>
                    <span style={{ color: getPasswordStrengthColor(passwordStrength) }} className="font-medium">
                      {getPasswordStrengthLabel(passwordStrength)}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${(passwordStrength / 4) * 100}%`,
                        backgroundColor: getPasswordStrengthColor(passwordStrength),
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={addEntry}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add to High Street
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {entries.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-block p-6 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl mb-4">
                <Store className="w-16 h-16 text-blue-600" />
              </div>
              <h3 className="text-gray-900 mb-2">Your High Street is Empty</h3>
              <p className="text-gray-500 mb-6">Start adding your favorite websites to create your virtual high street</p>
              <div className="max-w-md mx-auto text-left bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-600 mb-2">Popular examples:</p>
                <div className="flex flex-wrap gap-2">
                  {websiteExamples.map((example, idx) => (
                    <span key={idx} className="text-xs px-3 py-1 bg-white rounded-full text-gray-700 border border-gray-200">
                      {example.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : viewMode === 'street' ? (
            <div>
              {categories.map(category => {
                const categoryEntries = filteredEntries.filter(e => e.category === category.id);
                if (categoryEntries.length === 0) return null;

                return (
                  <div key={category.id} className="mb-8">
                    <h3 className="mb-4 flex items-center gap-2 text-gray-700">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      {category.name}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {categoryEntries.map((entry) => (
                        <div
                          key={entry.id}
                          onClick={() => selectionMode ? toggleSelection(entry.id) : setSelectedEntry(entry)}
                          className="group relative cursor-pointer"
                        >
                          <div
                            className={`aspect-square rounded-2xl p-6 flex flex-col items-center justify-center gap-3 shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1 ${
                              selectionMode && selectedIds.has(entry.id) ? 'ring-4 ring-purple-500' : ''
                            }`}
                            style={{
                              backgroundColor: `${entry.color}15`,
                              borderColor: entry.color,
                              borderWidth: '2px'
                            }}
                          >
                            {entry.favicon ? (
                              <img
                                src={entry.favicon}
                                alt={entry.name}
                                className="w-16 h-16 rounded-xl"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                            ) : null}
                            <div
                              className={`w-16 h-16 rounded-xl flex items-center justify-center text-white text-xl ${entry.favicon ? 'hidden' : ''}`}
                              style={{ backgroundColor: entry.color }}
                            >
                              {getInitials(entry.name)}
                            </div>
                            <div className="text-center">
                              <p className="font-medium text-gray-900 text-sm line-clamp-2">{entry.name}</p>
                            </div>
                          </div>
                          {selectionMode ? (
                            <div className="absolute -top-2 -right-2">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                selectedIds.has(entry.id) ? 'bg-purple-600 text-white' : 'bg-white border-2 border-gray-300 text-gray-400'
                              }`}>
                                {selectedIds.has(entry.id) ? (
                                  <Check className="w-5 h-5" />
                                ) : (
                                  <Square className="w-5 h-5" />
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm(`Delete ${entry.name}? This cannot be undone.`)) {
                                    deleteEntry(entry.id);
                                  }
                                }}
                                className="p-2 bg-red-600 text-white rounded-lg shadow-lg hover:bg-red-700"
                              >
                                <Trash className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredEntries.map((entry) => (
                <div
                  key={entry.id}
                  onClick={() => selectionMode ? toggleSelection(entry.id) : setSelectedEntry(entry)}
                  className={`px-3 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer ${
                    selectionMode && selectedIds.has(entry.id) ? 'ring-2 ring-purple-500 bg-purple-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {selectionMode && (
                      <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${
                        selectedIds.has(entry.id) ? 'bg-purple-600 text-white' : 'bg-white border-2 border-gray-300 text-gray-400'
                      }`}>
                        {selectedIds.has(entry.id) ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </div>
                    )}
                    {entry.favicon ? (
                      <img
                        src={entry.favicon}
                        alt={entry.name}
                        className="w-8 h-8 rounded flex-shrink-0"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div
                        className="w-8 h-8 rounded flex items-center justify-center text-white text-xs flex-shrink-0"
                        style={{ backgroundColor: entry.color }}
                      >
                        {getInitials(entry.name)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0 flex items-center gap-4">
                      <span className="font-medium text-gray-900 truncate" style={{ minWidth: '200px', maxWidth: '200px' }}>
                        {entry.name}
                      </span>
                      <span className="text-sm text-gray-500 truncate flex-1">
                        {entry.url}
                      </span>
                      {entry.username && (
                        <span className="text-xs text-gray-400 truncate" style={{ maxWidth: '150px' }}>
                          {entry.username}
                        </span>
                      )}
                    </div>
                    {!selectionMode && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEdit(entry);
                          }}
                          className="p-1.5 hover:bg-white rounded transition-colors text-blue-600"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Delete ${entry.name}?`)) {
                              deleteEntry(entry.id);
                            }
                          }}
                          className="p-1.5 hover:bg-white rounded transition-colors text-red-600"
                          title="Delete"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                {selectedEntry.favicon ? (
                  <img
                    src={selectedEntry.favicon}
                    alt={selectedEntry.name}
                    className="w-12 h-12 rounded-xl"
                  />
                ) : (
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg"
                    style={{ backgroundColor: selectedEntry.color }}
                  >
                    {getInitials(selectedEntry.name)}
                  </div>
                )}
                <h3 className="text-gray-900">{selectedEntry.name}</h3>
              </div>
              <button
                onClick={() => setSelectedEntry(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Website</p>
                <a
                  href={selectedEntry.url.startsWith('http') ? selectedEntry.url : `https://${selectedEntry.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline break-all"
                >
                  {selectedEntry.url}
                </a>
              </div>

              {selectedEntry.username && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Username</p>
                  <div className="flex items-center gap-2">
                    <p className="text-gray-900 flex-1">{selectedEntry.username}</p>
                    <button
                      onClick={() => copyToClipboard(selectedEntry.username, `modal-${selectedEntry.id}-user`)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                      title="Copy username"
                    >
                      {copiedId === `modal-${selectedEntry.id}-user` ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {selectedEntry.password && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Password</p>
                  <div className="flex items-center gap-2">
                    <code className="text-gray-900 font-mono flex-1">
                      {visiblePasswords.has(selectedEntry.id) ? selectedEntry.password : '••••••••'}
                    </code>
                    <button
                      onClick={() => togglePasswordVisibility(selectedEntry.id)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                      title="Toggle visibility"
                    >
                      {visiblePasswords.has(selectedEntry.id) ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => copyToClipboard(selectedEntry.password, `modal-${selectedEntry.id}-pass`)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                      title="Copy password"
                    >
                      {copiedId === `modal-${selectedEntry.id}-pass` ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {selectedEntry.notes && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Notes</p>
                  <p className="text-gray-700">{selectedEntry.notes}</p>
                </div>
              )}

              <div className="pt-4 border-t border-gray-200 space-y-2">
                <button
                  onClick={() => startEdit(selectedEntry)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit Website
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this website? This cannot be undone.')) {
                      deleteEntry(selectedEntry.id, true); // Close detail modal and preserve scroll
                    }
                  }}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash className="w-4 h-4" />
                  Delete Website
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingEntry && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Edit className="w-5 h-5 text-green-600" />
                Edit Website
              </h3>
              <button
                onClick={() => setEditingEntry(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website Name</label>
                  <input
                    type="text"
                    value={editingEntry.name}
                    onChange={(e) => setEditingEntry({ ...editingEntry, name: e.target.value })}
                    placeholder="Website name (e.g., Monzo, Tesco)..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
                  <input
                    type="url"
                    value={editingEntry.url}
                    onChange={(e) => setEditingEntry({ ...editingEntry, url: e.target.value })}
                    placeholder="Website URL (e.g., monzo.com)..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={editingEntry.category}
                    onChange={(e) => setEditingEntry({ ...editingEntry, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username/Email</label>
                  <input
                    type="text"
                    value={editingEntry.username}
                    onChange={(e) => setEditingEntry({ ...editingEntry, username: e.target.value })}
                    placeholder="Username/Email (optional)..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    type="text"
                    value={editingEntry.password}
                    onChange={(e) => setEditingEntry({ ...editingEntry, password: e.target.value })}
                    placeholder="Password (optional)..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white pr-12 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={generateNewPassword}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Generate strong password"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
                {editingEntry.password && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Password Strength:</span>
                      <span style={{ color: getPasswordStrengthColor(passwordStrength) }} className="font-medium">
                        {getPasswordStrengthLabel(passwordStrength)}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all duration-300"
                        style={{
                          width: `${(passwordStrength / 4) * 100}%`,
                          backgroundColor: getPasswordStrengthColor(passwordStrength),
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={editingEntry.notes}
                  onChange={(e) => setEditingEntry({ ...editingEntry, notes: e.target.value })}
                  placeholder="Notes (optional)..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <button
                    onClick={updateEntry}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => setEditingEntry(null)}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this website? This cannot be undone.')) {
                      deleteEntry(editingEntry.id, true); // true = from modal, will close modal and preserve scroll
                    }
                  }}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <Trash className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
