import { useState, useEffect } from 'react';
import { X, Plus, Trash, Mail, Phone, MapPin, Users, Key, Edit, Search, ArrowUpDown, Grid3x3, List } from 'lucide-react';
import { useStorage } from '../../contexts/StorageContext';

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
}

interface ContactsManagerSecureProps {
  onClose: () => void;
}

export function ContactsManagerSecure({ onClose }: ContactsManagerSecureProps) {
  const storage = useStorage();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  // showEditForm removed - now using modal for editing
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc'>('name-asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [viewingDetails, setViewingDetails] = useState<Contact | null>(null);
  const [newContact, setNewContact] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: ''
  });

  useEffect(() => {
    loadContacts();
  }, []);

  // Scroll to top when add form opens (edit is now in modal)
  useEffect(() => {
    if (showAddForm) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [showAddForm]);

  const loadContacts = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await storage.get<Contact>('contacts');

      // Defensive: ensure we always set a valid array
      if (Array.isArray(data)) {
        setContacts(data);
        console.log(`Loaded ${data.length} contacts`);
      } else {
        console.error('Storage returned non-array:', typeof data, data);
        setContacts([]);
        setError('Data format error - please try re-importing');
      }
    } catch (err) {
      console.error('Failed to load contacts:', err);
      setError(`Failed to load data: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setContacts([]); // Set empty array as fallback
    } finally {
      setIsLoading(false);
    }
  };

  const addContact = async () => {
    if (!newContact.name.trim()) return;

    try {
      setError('');
      const contact: Contact = {
        id: Date.now().toString(),
        ...newContact
      };

      await storage.add('contacts', contact);
      await loadContacts();
      setNewContact({ name: '', email: '', phone: '', address: '', notes: '' });
      setShowAddForm(false);
    } catch (err) {
      setError('Failed to add contact');
      console.error(err);
    }
  };

  const updateContact = async () => {
    if (!editingContact || !editingContact.name.trim()) return;

    try {
      setError('');
      await storage.update('contacts', editingContact.id, editingContact);
      await loadContacts();
      setEditingContact(null); // Close modal
    } catch (err) {
      setError('Failed to update contact');
      console.error(err);
    }
  };

  const deleteContact = async (id: string) => {
    try {
      setError('');
      await storage.delete('contacts', id);
      await loadContacts();
    } catch (err) {
      setError('Failed to delete contact');
      console.error(err);
    }
  };

  const startEdit = (contact: Contact) => {
    setEditingContact({ ...contact });
  };

  // Filter and sort contacts
  const filteredContacts = (Array.isArray(contacts) ? contacts : [])
    .filter(contact => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          String(contact.name || '').toLowerCase().includes(query) ||
          String(contact.email || '').toLowerCase().includes(query) ||
          String(contact.phone || '').toLowerCase().includes(query) ||
          String(contact.address || '').toLowerCase().includes(query) ||
          String(contact.notes || '').toLowerCase().includes(query)
        );
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return String(a.name || '').toLowerCase().localeCompare(String(b.name || '').toLowerCase());
        case 'name-desc':
          return String(b.name || '').toLowerCase().localeCompare(String(a.name || '').toLowerCase());
        default:
          return 0;
      }
    });

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Decrypting your contacts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-green-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-green-500 to-green-700 text-white rounded-xl relative">
                <Users className="w-6 h-6" />
                <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-1">
                  <Key className="w-3 h-3 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-gray-900 flex items-center gap-2">
                  Contacts
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">Encrypted</span>
                </h2>
                <p className="text-sm text-gray-500 mt-1">Manage your personal and professional contacts</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
                title="Grid view"
              >
                <Grid3x3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
                title="List view"
              >
                <List className="w-5 h-5" />
              </button>
              <div className="w-px h-8 bg-gray-300 mx-1"></div>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-2 px-4 py-2 bg-white text-green-600 rounded-lg hover:bg-green-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Search and Sort Bar */}
        <div className="px-6 pt-4 pb-2 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search contacts by name, email, phone, address..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
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

            {/* Sort Dropdown */}
            <div className="relative">
              <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="pl-9 pr-8 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white appearance-none cursor-pointer"
              >
                <option value="name-asc">A → Z</option>
                <option value="name-desc">Z → A</option>
              </select>
            </div>
          </div>

          {/* Results Count */}
          <div className="mt-2 text-sm text-gray-600">
            Showing <span className="font-semibold">{filteredContacts.length}</span> of <span className="font-semibold">{contacts.length}</span> contacts
            {searchQuery && <span className="text-green-600 ml-1">• Searching for "{searchQuery}"</span>}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {showAddForm && (
            <div className="mb-6 p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border-2 border-blue-200">
              <h3 className="mb-3">Add New Contact</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                  placeholder="Name..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                />
                <input
                  type="email"
                  value={newContact.email}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                  placeholder="Email..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                />
                <input
                  type="tel"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  placeholder="Phone..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                />
                <input
                  type="text"
                  value={newContact.address}
                  onChange={(e) => setNewContact({ ...newContact, address: e.target.value })}
                  placeholder="Address..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                />
                <textarea
                  value={newContact.notes}
                  onChange={(e) => setNewContact({ ...newContact, notes: e.target.value })}
                  placeholder="Notes..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  rows={3}
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={addContact}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add Contact
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
          )}

          {filteredContacts.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>{contacts.length === 0 ? 'No contacts yet' : 'No contacts match your search'}</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="space-y-3">
              {filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  onClick={() => setViewingDetails(contact)}
                  className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-gray-900">{contact.name}</h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(contact);
                        }}
                        className="p-2 hover:bg-white rounded-lg transition-colors text-blue-600"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteContact(contact.id);
                        }}
                        className="p-2 hover:bg-white rounded-lg transition-colors text-red-600"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {contact.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4" />
                        <span>{contact.phone}</span>
                      </div>
                    )}
                    {contact.email && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="w-4 h-4" />
                        <span>{contact.email}</span>
                      </div>
                    )}
                    {contact.address && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>{contact.address}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* List View */
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
              {filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  onClick={() => setViewingDetails(contact)}
                  className="px-6 py-3 hover:bg-gray-50 transition-colors cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-2 rounded-lg bg-green-50 text-green-600 flex-shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-gray-900 font-medium truncate">{contact.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-0.5">
                        {contact.phone && (
                          <span className="flex items-center gap-1 flex-shrink-0">
                            <Phone className="w-3 h-3" />
                            {contact.phone}
                          </span>
                        )}
                        {contact.email && (
                          <span className="flex items-center gap-1 truncate">
                            <Mail className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{contact.email}</span>
                          </span>
                        )}
                        {contact.address && (
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{contact.address}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(contact);
                      }}
                      className="p-2 hover:bg-white rounded-lg transition-colors text-blue-600"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteContact(contact.id);
                      }}
                      className="p-2 hover:bg-white rounded-lg transition-colors text-red-600"
                      title="Delete"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                    <div className="text-gray-400 group-hover:text-green-600 transition-colors ml-2">→</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingContact && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <Edit className="w-5 h-5 text-green-600" />
                Edit Contact
              </h3>
              <button
                onClick={() => setEditingContact(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editingContact.name}
                  onChange={(e) => setEditingContact({ ...editingContact, name: e.target.value })}
                  placeholder="Name..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editingContact.email}
                  onChange={(e) => setEditingContact({ ...editingContact, email: e.target.value })}
                  placeholder="Email..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={editingContact.phone}
                  onChange={(e) => setEditingContact({ ...editingContact, phone: e.target.value })}
                  placeholder="Phone..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={editingContact.address}
                  onChange={(e) => setEditingContact({ ...editingContact, address: e.target.value })}
                  placeholder="Address..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={editingContact.notes}
                  onChange={(e) => setEditingContact({ ...editingContact, notes: e.target.value })}
                  placeholder="Notes..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows={4}
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-3">
                  <button
                    onClick={updateContact}
                    className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => setEditingContact(null)}
                    className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this contact? This cannot be undone.')) {
                      deleteContact(editingContact.id);
                      setEditingContact(null);
                    }
                  }}
                  className="px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 font-medium"
                >
                  <Trash className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contact Details Modal */}
      {viewingDetails && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-green-600" />
                Contact Details
              </h3>
              <button
                onClick={() => setViewingDetails(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Name</label>
                <p className="text-lg text-gray-900 font-medium">{viewingDetails.name}</p>
              </div>

              {viewingDetails.phone && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Phone</label>
                  <div className="flex items-center gap-2 text-gray-900">
                    <Phone className="w-4 h-4 text-green-600" />
                    <p>{viewingDetails.phone}</p>
                  </div>
                </div>
              )}

              {viewingDetails.email && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                  <div className="flex items-center gap-2 text-gray-900">
                    <Mail className="w-4 h-4 text-green-600" />
                    <p>{viewingDetails.email}</p>
                  </div>
                </div>
              )}

              {viewingDetails.address && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Address</label>
                  <div className="flex items-center gap-2 text-gray-900">
                    <MapPin className="w-4 h-4 text-green-600" />
                    <p>{viewingDetails.address}</p>
                  </div>
                </div>
              )}

              {viewingDetails.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Notes</label>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-gray-700 whitespace-pre-wrap">{viewingDetails.notes}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 pt-4 border-t">
                <button
                  onClick={() => {
                    setEditingContact({ ...viewingDetails });
                    setViewingDetails(null);
                  }}
                  className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => setViewingDetails(null)}
                  className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
