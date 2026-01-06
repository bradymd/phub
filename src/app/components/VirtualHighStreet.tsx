import { useState, useEffect } from 'react';
import { X, Plus, Trash, Eye, EyeOff, Store, Grid3x3, List, Edit } from 'lucide-react';

interface WebsiteEntry {
  id: string;
  name: string;
  url: string;
  username: string;
  password: string;
  category: string;
  color: string;
  favicon: string;
  notes: string;
}

interface VirtualHighStreetProps {
  onClose: () => void;
}

const categories = [
  { id: 'banking', name: 'Banking & Finance', color: '#10B981' },
  { id: 'shopping', name: 'Shopping', color: '#F59E0B' },
  { id: 'social', name: 'Social Media', color: '#3B82F6' },
  { id: 'utilities', name: 'Utilities & Bills', color: '#8B5CF6' },
  { id: 'entertainment', name: 'Entertainment', color: '#EC4899' },
  { id: 'health', name: 'Health & Wellness', color: '#EF4444' },
  { id: 'other', name: 'Other', color: '#6B7280' }
];

const websiteExamples = [
  { name: 'Monzo', category: 'banking', domain: 'monzo.com' },
  { name: 'Tesco', category: 'shopping', domain: 'tesco.com' },
  { name: 'Facebook', category: 'social', domain: 'facebook.com' },
  { name: 'Netflix', category: 'entertainment', domain: 'netflix.com' },
  { name: 'Amazon', category: 'shopping', domain: 'amazon.co.uk' }
];

export function VirtualHighStreet({ onClose }: VirtualHighStreetProps) {
  const [entries, setEntries] = useState<WebsiteEntry[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [viewMode, setViewMode] = useState<'street' | 'list'>('street');
  const [selectedEntry, setSelectedEntry] = useState<WebsiteEntry | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [newEntry, setNewEntry] = useState({
    name: '',
    url: '',
    username: '',
    password: '',
    category: 'other',
    notes: ''
  });

  useEffect(() => {
    const stored = localStorage.getItem('virtual_street');
    if (stored) {
      setEntries(JSON.parse(stored));
    }
  }, []);

  const saveEntries = (newEntries: WebsiteEntry[]) => {
    localStorage.setItem('virtual_street', JSON.stringify(newEntries));
    setEntries(newEntries);
  };

  const getFavicon = (url: string) => {
    try {
      const domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    } catch {
      return '';
    }
  };

  const addEntry = () => {
    if (!newEntry.name.trim() || !newEntry.url.trim()) return;
    
    const category = categories.find(c => c.id === newEntry.category);
    const entry: WebsiteEntry = {
      id: Date.now().toString(),
      ...newEntry,
      color: category?.color || '#6B7280',
      favicon: getFavicon(newEntry.url)
    };
    
    saveEntries([...entries, entry]);
    setNewEntry({ name: '', url: '', username: '', password: '', category: 'other', notes: '' });
    setShowAddForm(false);
  };

  const deleteEntry = (id: string) => {
    saveEntries(entries.filter(entry => entry.id !== id));
    setSelectedEntry(null);
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

  const getInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-xl">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-gray-900">My Virtual High Street</h2>
                <p className="text-sm text-gray-500 mt-1">Your online life organized like a high street</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
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
              <button
                onClick={onClose}
                className="p-2 hover:bg-white rounded-lg transition-colors ml-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {showAddForm ? (
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
                <input
                  type="password"
                  value={newEntry.password}
                  onChange={(e) => setNewEntry({ ...newEntry, password: e.target.value })}
                  placeholder="Password (optional)..."
                  className="px-4 py-3 border border-gray-300 rounded-lg bg-white"
                />
                <input
                  type="text"
                  value={newEntry.notes}
                  onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })}
                  placeholder="Notes (optional)..."
                  className="px-4 py-3 border border-gray-300 rounded-lg bg-white"
                />
              </div>
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
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full mb-6 p-6 border-2 border-dashed border-gray-300 rounded-2xl hover:border-blue-400 hover:bg-blue-50 transition-all flex items-center justify-center gap-3 text-gray-600 hover:text-blue-600 group"
            >
              <div className="p-3 bg-blue-100 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Plus className="w-6 h-6" />
              </div>
              <div className="text-left">
                <p className="font-medium">Add New Shop to Your High Street</p>
                <p className="text-sm text-gray-500">Add websites like Monzo, Tesco, Facebook, etc.</p>
              </div>
            </button>
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
                const categoryEntries = entries.filter(e => e.category === category.id);
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
                        <button
                          key={entry.id}
                          onClick={() => setSelectedEntry(entry)}
                          className="group relative"
                        >
                          <div 
                            className="aspect-square rounded-2xl p-6 flex flex-col items-center justify-center gap-3 shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1"
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
                          <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteEntry(entry.id);
                              }}
                              className="p-2 bg-red-600 text-white rounded-lg shadow-lg hover:bg-red-700"
                            >
                              <Trash className="w-4 h-4" />
                            </button>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      {entry.favicon ? (
                        <img 
                          src={entry.favicon} 
                          alt={entry.name}
                          className="w-12 h-12 rounded-lg"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div 
                          className="w-12 h-12 rounded-lg flex items-center justify-center text-white"
                          style={{ backgroundColor: entry.color }}
                        >
                          {getInitials(entry.name)}
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="text-gray-900">{entry.name}</h3>
                        <a
                          href={entry.url.startsWith('http') ? entry.url : `https://${entry.url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {entry.url}
                        </a>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteEntry(entry.id)}
                      className="p-2 hover:bg-white rounded-lg transition-colors text-red-600"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                  {(entry.username || entry.password) && (
                    <div className="mt-3 ml-15 space-y-2 pt-3 border-t border-gray-200">
                      {entry.username && (
                        <div className="text-sm">
                          <span className="text-gray-500">Username: </span>
                          <span className="text-gray-900">{entry.username}</span>
                        </div>
                      )}
                      {entry.password && (
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
                      )}
                    </div>
                  )}
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
                  <p className="text-gray-900">{selectedEntry.username}</p>
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
                    >
                      {visiblePasswords.has(selectedEntry.id) ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
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

              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={() => deleteEntry(selectedEntry.id)}
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
    </div>
  );
}
