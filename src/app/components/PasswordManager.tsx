import { useState, useEffect } from 'react';
import { X, Plus, Trash, Eye, EyeOff, Lock, Link as LinkIcon, Grid3x3, List, Store } from 'lucide-react';

interface PasswordEntry {
  id: string;
  website: string;
  url: string;
  username: string;
  password: string;
  notes: string;
  dateAdded: string;
  category: string;
  color: string;
}

interface PasswordManagerProps {
  onClose: () => void;
}

export function PasswordManager({ onClose }: PasswordManagerProps) {
  const [entries, setEntries] = useState<PasswordEntry[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'street' | 'list'>('street');
  const [newEntry, setNewEntry] = useState({
    website: '',
    url: '',
    username: '',
    password: '',
    notes: '',
    category: 'other',
    color: '#3B82F6'
  });

  useEffect(() => {
    const stored = localStorage.getItem('passwords');
    if (stored) {
      setEntries(JSON.parse(stored));
    }
  }, []);

  const saveEntries = (newEntries: PasswordEntry[]) => {
    localStorage.setItem('passwords', JSON.stringify(newEntries));
    setEntries(newEntries);
  };

  const addEntry = () => {
    if (!newEntry.website.trim() || !newEntry.username.trim()) return;
    
    const entry: PasswordEntry = {
      id: Date.now().toString(),
      ...newEntry,
      dateAdded: new Date().toLocaleDateString()
    };
    
    saveEntries([...entries, entry]);
    setNewEntry({ website: '', url: '', username: '', password: '', notes: '', category: 'other', color: '#3B82F6' });
    setShowAddForm(false);
  };

  const deleteEntry = (id: string) => {
    saveEntries(entries.filter(entry => entry.id !== id));
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-gray-900">Password Manager</h2>
            <p className="text-sm text-gray-500 mt-1">Securely store your website credentials and links</p>
            <p className="text-xs text-amber-600 mt-2">⚠️ For demo purposes only - use a proper password manager for real data</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {showAddForm ? (
            <div className="mb-6 p-4 bg-gray-50 rounded-xl">
              <h3 className="mb-3">Add New Entry</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={newEntry.website}
                  onChange={(e) => setNewEntry({ ...newEntry, website: e.target.value })}
                  placeholder="Website name..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="url"
                  value={newEntry.url}
                  onChange={(e) => setNewEntry({ ...newEntry, url: e.target.value })}
                  placeholder="URL (https://...)..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="text"
                  value={newEntry.username}
                  onChange={(e) => setNewEntry({ ...newEntry, username: e.target.value })}
                  placeholder="Username/Email..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="password"
                  value={newEntry.password}
                  onChange={(e) => setNewEntry({ ...newEntry, password: e.target.value })}
                  placeholder="Password..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <textarea
                  value={newEntry.notes}
                  onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })}
                  placeholder="Notes..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  rows={2}
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={addEntry}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add Entry
                  </button>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full mb-6 p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 text-gray-600 hover:text-blue-600"
            >
              <Plus className="w-5 h-5" />
              Add New Password
            </button>
          )}

          <div className="space-y-3">
            {entries.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Lock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No passwords stored yet</p>
              </div>
            ) : (
              entries.map((entry) => (
                <div
                  key={entry.id}
                  className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                        <Lock className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-gray-900">{entry.website}</h3>
                        {entry.url && (
                          <a
                            href={entry.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <LinkIcon className="w-3 h-3" />
                            {entry.url}
                          </a>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteEntry(entry.id)}
                      className="p-2 hover:bg-white rounded-lg transition-colors text-red-600"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-2 ml-11">
                    <div className="text-sm">
                      <span className="text-gray-500">Username: </span>
                      <span className="text-gray-900">{entry.username}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Password: </span>
                      <code className="text-sm text-gray-900 font-mono">
                        {visiblePasswords.has(entry.id) ? entry.password : '••••••••'}
                      </code>
                      <button
                        onClick={() => togglePasswordVisibility(entry.id)}
                        className="p-1 hover:bg-white rounded transition-colors text-gray-600"
                      >
                        {visiblePasswords.has(entry.id) ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {entry.notes && (
                      <p className="text-sm text-gray-500 mt-2 pt-2 border-t border-gray-200 whitespace-pre-wrap">
                        {entry.notes}
                      </p>
                    )}
                    <p className="text-xs text-gray-400">Added: {entry.dateAdded}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}