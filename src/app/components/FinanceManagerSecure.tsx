import { useState, useEffect } from 'react';
import { X, Plus, Trash, DollarSign, PiggyBank, CreditCard, Key, Edit } from 'lucide-react';
import { useStorage } from '../../contexts/StorageContext';

interface FinanceItem {
  id: string;
  name: string;
  type: 'pension' | 'savings' | 'other';
  amount: string;
  description: string;
  date: string;
}

interface FinanceManagerSecureProps {
  onClose: () => void;
}

export function FinanceManagerSecure({ onClose }: FinanceManagerSecureProps) {
  const storage = useStorage();
  const [items, setItems] = useState<FinanceItem[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingItem, setEditingItem] = useState<FinanceItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [newItem, setNewItem] = useState({
    name: '',
    type: 'savings' as 'pension' | 'savings' | 'other',
    amount: '',
    description: ''
  });

  useEffect(() => {
    loadItems();
  }, []);

  // Scroll to top when add or edit form opens
  useEffect(() => {
    if (showAddForm || editingItem) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [showAddForm, editingItem]);

  const loadItems = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await storage.get<FinanceItem>('finance_items');
      setItems(data);
    } catch (err) {
      setError('Failed to load data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const addItem = async () => {
    if (!newItem.name.trim()) return;

    try {
      setError('');
      const item: FinanceItem = {
        id: Date.now().toString(),
        ...newItem,
        date: new Date().toLocaleDateString()
      };

      await storage.add('finance_items', item);
      await loadItems();
      setNewItem({ name: '', type: 'savings', amount: '', description: '' });
      setShowAddForm(false);
    } catch (err) {
      setError('Failed to add item');
      console.error(err);
    }
  };

  const updateItem = async () => {
    if (!editingItem || !editingItem.name.trim()) return;

    try {
      setError('');
      await storage.update('finance_items', editingItem.id, editingItem);
      await loadItems();
      setEditingItem(null);
      setShowEditForm(false);
    } catch (err) {
      setError('Failed to update item');
      console.error(err);
    }
  };

  const deleteItem = async (id: string) => {
    try {
      setError('');
      await storage.delete('finance_items', id);
      await loadItems();
    } catch (err) {
      setError('Failed to delete item');
      console.error(err);
    }
  };

  const startEdit = (item: FinanceItem) => {
    setEditingItem({ ...item });
    setShowEditForm(true);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'pension': return CreditCard;
      case 'savings': return PiggyBank;
      default: return DollarSign;
    }
  };

  const totalSavings = items
    .filter(item => item.type === 'savings')
    .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  const totalPensions = items
    .filter(item => item.type === 'pension')
    .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Decrypting your financial data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-green-600 to-blue-600 text-white rounded-xl relative">
                <DollarSign className="w-6 h-6" />
                <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-1">
                  <Key className="w-3 h-3 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-gray-900 flex items-center gap-2">
                  Finance
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">Encrypted</span>
                </h2>
                <p className="text-sm text-gray-500 mt-1">Track your savings, pensions, and financial accounts</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                  <PiggyBank className="w-5 h-5" />
                </div>
                <p className="text-sm text-gray-600">Total Savings</p>
              </div>
              <p className="text-gray-900">${totalSavings.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <CreditCard className="w-5 h-5" />
                </div>
                <p className="text-sm text-gray-600">Total Pensions</p>
              </div>
              <p className="text-gray-900">${totalPensions.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {showAddForm ? (
            <div className="mb-6 p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border-2 border-blue-200">
              <h3 className="mb-3">Add New Item</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder="Account name..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                />
                <select
                  value={newItem.type}
                  onChange={(e) => setNewItem({ ...newItem, type: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                >
                  <option value="savings">Savings</option>
                  <option value="pension">Pension</option>
                  <option value="other">Other</option>
                </select>
                <input
                  type="number"
                  value={newItem.amount}
                  onChange={(e) => setNewItem({ ...newItem, amount: e.target.value })}
                  placeholder="Amount..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                />
                <input
                  type="text"
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  placeholder="Description (optional)..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={addItem}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add Item
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
          ) : showEditForm && editingItem ? (
            <div className="mb-6 p-4 bg-gradient-to-br from-green-50 to-blue-50 rounded-xl border-2 border-green-200">
              <h3 className="mb-3 flex items-center gap-2">
                <Edit className="w-5 h-5 text-green-600" />
                Edit Item
              </h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  placeholder="Account name..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                />
                <select
                  value={editingItem.type}
                  onChange={(e) => setEditingItem({ ...editingItem, type: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                >
                  <option value="savings">Savings</option>
                  <option value="pension">Pension</option>
                  <option value="other">Other</option>
                </select>
                <input
                  type="number"
                  value={editingItem.amount}
                  onChange={(e) => setEditingItem({ ...editingItem, amount: e.target.value })}
                  placeholder="Amount..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                />
                <input
                  type="text"
                  value={editingItem.description}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  placeholder="Description (optional)..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                />
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={updateItem}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={() => {
                        setShowEditForm(false);
                        setEditingItem(null);
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this item? This cannot be undone.')) {
                        deleteItem(editingItem.id);
                        setShowEditForm(false);
                        setEditingItem(null);
                      }
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                  >
                    <Trash className="w-4 h-4" />
                    Delete
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
              Add Financial Account
            </button>
          )}

          <div className="space-y-3">
            {items.map((item) => {
              const Icon = getIcon(item.type);
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-500">
                        {item.type.charAt(0).toUpperCase() + item.type.slice(1)} • ${parseFloat(item.amount).toLocaleString()}
                      </p>
                      {item.description && (
                        <p className="text-sm text-gray-400 mt-1">{item.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEdit(item)}
                      className="p-2 hover:bg-white rounded-lg transition-colors text-blue-600"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="p-2 hover:bg-white rounded-lg transition-colors text-red-600"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
