import { useState, useEffect } from 'react';
import { X, Plus, Trash, DollarSign, PiggyBank, CreditCard } from 'lucide-react';

interface FinanceItem {
  id: string;
  name: string;
  type: 'pension' | 'savings' | 'other';
  amount: string;
  description: string;
  date: string;
}

interface FinanceManagerProps {
  onClose: () => void;
}

export function FinanceManager({ onClose }: FinanceManagerProps) {
  const [items, setItems] = useState<FinanceItem[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    type: 'savings' as 'pension' | 'savings' | 'other',
    amount: '',
    description: ''
  });

  useEffect(() => {
    const stored = localStorage.getItem('finance_items');
    if (stored) {
      setItems(JSON.parse(stored));
    }
  }, []);

  const saveItems = (newItems: FinanceItem[]) => {
    localStorage.setItem('finance_items', JSON.stringify(newItems));
    setItems(newItems);
  };

  const addItem = () => {
    if (!newItem.name.trim()) return;
    
    const item: FinanceItem = {
      id: Date.now().toString(),
      ...newItem,
      date: new Date().toLocaleDateString()
    };
    
    saveItems([...items, item]);
    setNewItem({ name: '', type: 'savings', amount: '', description: '' });
    setShowAddForm(false);
  };

  const deleteItem = (id: string) => {
    saveItems(items.filter(item => item.id !== id));
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-gray-900">Finance</h2>
            <p className="text-sm text-gray-500 mt-1">Track your savings, pensions, and financial accounts</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

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
            <div className="mb-6 p-4 bg-gray-50 rounded-xl">
              <h3 className="mb-3">Add New Item</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder="Account name..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <select
                  value={newItem.type}
                  onChange={(e) => setNewItem({ ...newItem, type: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="text"
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  placeholder="Description (optional)..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="p-2 hover:bg-white rounded-lg transition-colors text-red-600"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
