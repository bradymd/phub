import { useState, useEffect } from 'react';
import { X, Plus, Trash, Mail, Phone, MapPin, Users } from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
}

interface ContactsManagerProps {
  onClose: () => void;
}

export function ContactsManager({ onClose }: ContactsManagerProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newContact, setNewContact] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: ''
  });

  useEffect(() => {
    const stored = localStorage.getItem('contacts');
    if (stored) {
      setContacts(JSON.parse(stored));
    }
  }, []);

  const saveContacts = (newContacts: Contact[]) => {
    localStorage.setItem('contacts', JSON.stringify(newContacts));
    setContacts(newContacts);
  };

  const addContact = () => {
    if (!newContact.name.trim()) return;
    
    const contact: Contact = {
      id: Date.now().toString(),
      ...newContact
    };
    
    saveContacts([...contacts, contact]);
    setNewContact({ name: '', email: '', phone: '', address: '', notes: '' });
    setShowAddForm(false);
  };

  const deleteContact = (id: string) => {
    saveContacts(contacts.filter(contact => contact.id !== id));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-gray-900">Contacts</h2>
            <p className="text-sm text-gray-500 mt-1">Manage your personal and professional contacts</p>
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
              <h3 className="mb-3">Add New Contact</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                  placeholder="Name..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="email"
                  value={newContact.email}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                  placeholder="Email..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="tel"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  placeholder="Phone..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="text"
                  value={newContact.address}
                  onChange={(e) => setNewContact({ ...newContact, address: e.target.value })}
                  placeholder="Address..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <textarea
                  value={newContact.notes}
                  onChange={(e) => setNewContact({ ...newContact, notes: e.target.value })}
                  placeholder="Notes..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full mb-6 p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 text-gray-600 hover:text-blue-600"
            >
              <Plus className="w-5 h-5" />
              Add New Contact
            </button>
          )}

          <div className="space-y-3">
            {contacts.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No contacts yet</p>
              </div>
            ) : (
              contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-gray-900">{contact.name}</h3>
                    <button
                      onClick={() => deleteContact(contact.id)}
                      className="p-2 hover:bg-white rounded-lg transition-colors text-red-600"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {contact.email && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="w-4 h-4" />
                        <span>{contact.email}</span>
                      </div>
                    )}
                    {contact.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4" />
                        <span>{contact.phone}</span>
                      </div>
                    )}
                    {contact.address && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>{contact.address}</span>
                      </div>
                    )}
                    {contact.notes && (
                      <p className="text-sm text-gray-500 mt-2 pt-2 border-t border-gray-200">
                        {contact.notes}
                      </p>
                    )}
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
