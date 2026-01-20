import { useState, useEffect } from 'react';
import { X, Plus, Trash, Receipt, TrendingDown, TrendingUp, Calendar, Edit2, Search, DollarSign, Eye, EyeOff, ArrowUpDown, ArrowUp, ArrowDown, Tag } from 'lucide-react';
import { useStorage } from '../../contexts/StorageContext';

interface BudgetItem {
  id: string;
  name: string;
  type: 'income' | 'expense';
  category: string; // Changed to string to allow custom categories
  frequency: 'monthly' | 'annual' | 'variable' | 'one-off';
  amount: string;
  monthlyAmount: string;
  paymentDate: string;
  notes: string;
}

interface CustomCategory {
  id: string;
  name: string;
  type: 'income' | 'expense';
}

// Default built-in categories
const DEFAULT_EXPENSE_CATEGORIES = [
  { id: 'housing', name: 'Housing (Rent/Mortgage)' },
  { id: 'utilities', name: 'Utilities (Gas/Electric/Water)' },
  { id: 'insurance', name: 'Insurance' },
  { id: 'subscriptions', name: 'Subscriptions' },
  { id: 'transport', name: 'Transport' },
  { id: 'food', name: 'Food & Groceries' },
  { id: 'eating-out', name: 'Eating Out (Restaurants/Cafes)' },
  { id: 'entertainment', name: 'Entertainment' },
  { id: 'healthcare', name: 'Healthcare' },
  { id: 'charity', name: 'Charity' },
  { id: 'personal-care', name: 'Personal Care (Gym/Beauty)' },
  { id: 'shopping', name: 'Shopping (Clothes/Gadgets)' },
  { id: 'other', name: 'Other' }
];

const DEFAULT_INCOME_CATEGORIES = [
  { id: 'salary', name: 'Salary/Wages' },
  { id: 'investments', name: 'Investments/Dividends' },
  { id: 'other', name: 'Other Income' }
];

interface BudgetManagerSecureProps {
  onClose: () => void;
}

const emptyItem: Omit<BudgetItem, 'id' | 'monthlyAmount'> = {
  name: '',
  type: 'expense',
  category: 'utilities',
  frequency: 'monthly',
  amount: '',
  paymentDate: '',
  notes: ''
};

export function BudgetManagerSecure({ onClose }: BudgetManagerSecureProps) {
  const storage = useStorage();
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [newItem, setNewItem] = useState(emptyItem);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showSummary, setShowSummary] = useState(true);
  const [sortField, setSortField] = useState<'name' | 'category' | 'frequency' | 'amount'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState<'income' | 'expense'>('expense');

  useEffect(() => {
    loadItems();
    loadCustomCategories();
  }, []);

  useEffect(() => {
    if (showAddForm) {
      // Scroll the modal content area to top
      const contentArea = document.querySelector('.budget-content-area');
      if (contentArea) {
        contentArea.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [showAddForm]);

  const calculateMonthlyAmount = (amount: string, frequency: string): string => {
    if (!amount) return '0';
    const num = parseFloat(amount.replace(/,/g, ''));
    if (isNaN(num)) return '0';

    if (frequency === 'annual') {
      return (num / 12).toFixed(2);
    }
    return num.toFixed(2);
  };

  const loadItems = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await storage.get<BudgetItem>('budget_items');
      setItems(data);
    } catch (err) {
      setError('Failed to load data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCustomCategories = async () => {
    try {
      const data = await storage.get<CustomCategory>('custom_categories');
      console.log('Loaded custom categories:', data);
      setCustomCategories(data);
    } catch (err) {
      console.error('Failed to load custom categories:', err);
      setCustomCategories([]);
    }
  };

  const saveCustomCategories = async (categories: CustomCategory[]) => {
    try {
      // Add id property to each category if not present (for storage compatibility)
      const categoriesWithIds = categories.map(cat => ({
        ...cat,
        id: cat.id || `custom-${Date.now()}-${Math.random()}`
      }));
      await storage.save('custom_categories', categoriesWithIds);
      setCustomCategories(categoriesWithIds);
    } catch (err) {
      setError('Failed to save custom categories');
      console.error(err);
    }
  };

  const addCustomCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      const newCategory: CustomCategory = {
        id: `custom-${Date.now()}`,
        name: newCategoryName.trim(),
        type: newCategoryType
      };

      await saveCustomCategories([...customCategories, newCategory]);
      setNewCategoryName('');

      // Force reload from storage to ensure sync
      await loadCustomCategories();

      // Success feedback
      console.log('Custom category added successfully:', newCategory.name);
    } catch (err) {
      console.error('Failed to add custom category:', err);
      setError('Failed to add custom category: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const deleteCustomCategory = async (id: string) => {
    if (!window.confirm('Delete this category? Budget items using it will show as "Other".')) return;

    try {
      const updated = customCategories.filter(c => c.id !== id);
      await saveCustomCategories(updated);

      // Force reload from storage to ensure sync
      await loadCustomCategories();
    } catch (err) {
      console.error('Failed to delete custom category:', err);
      setError('Failed to delete custom category');
    }
  };

  // Get all categories for a type (default + custom)
  const getAllCategories = (type: 'income' | 'expense') => {
    const defaults = type === 'income' ? DEFAULT_INCOME_CATEGORIES : DEFAULT_EXPENSE_CATEGORIES;
    const custom = customCategories.filter(c => c.type === type);
    return [...defaults, ...custom.map(c => ({ id: c.id, name: c.name }))];
  };

  const addItem = async () => {
    if (!newItem.name.trim()) return;

    try {
      setError('');
      const monthlyAmount = calculateMonthlyAmount(newItem.amount, newItem.frequency);
      const item: BudgetItem = {
        id: Date.now().toString(),
        ...newItem,
        monthlyAmount
      };

      await storage.add('budget_items', item);
      await loadItems();
      setNewItem(emptyItem);
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
      const monthlyAmount = calculateMonthlyAmount(editingItem.amount, editingItem.frequency);
      const updatedItem = { ...editingItem, monthlyAmount };

      await storage.update('budget_items', editingItem.id, updatedItem);
      await loadItems();
      setEditingItem(null);
    } catch (err) {
      setError('Failed to update item');
      console.error(err);
    }
  };

  const deleteItem = async (id: string) => {
    try {
      setError('');
      await storage.delete('budget_items', id);
      await loadItems();
    } catch (err) {
      setError('Failed to delete item');
      console.error(err);
    }
  };

  const handleEditItem = (item: BudgetItem) => {
    console.log('Opening edit for item:', item.name);
    console.log('Category value:', item.category, 'Type:', typeof item.category);
    console.log('Category label:', getCategoryLabel(item.category));
    setEditingItem(item);
  };

  const formatCurrency = (value: string) => {
    if (!value) return '£0.00';
    const num = parseFloat(value.replace(/,/g, ''));
    return isNaN(num) ? value : `£${num.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getCategoryLabel = (category: string) => {
    // Check custom categories first
    const custom = customCategories.find(c => c.id === category);
    if (custom) return custom.name;

    // Fall back to defaults
    const allDefaults = [...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES];
    const defaultCat = allDefaults.find(c => c.id === category);
    if (defaultCat) {
      // Return shorter name for default categories
      return defaultCat.name.replace(/\s*\(.*?\)\s*/g, '').trim();
    }

    // Debug: log unmatched categories
    console.warn('Category not found:', category, 'Type:', typeof category);
    return 'Other';
  };

  const getCategoryColor = (category: string, type?: 'income' | 'expense') => {
    // Use neutral colors for all categories - let the emoji and amount color signal income vs expense
    return 'bg-gray-50 border-gray-200';
  };

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case 'monthly':
        return 'Monthly';
      case 'annual':
        return 'Annual';
      case 'variable':
        return 'Variable/Est.';
      case 'one-off':
        return 'One-off';
      default:
        return frequency;
    }
  };

  const filteredItems = items.filter(item => {
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        item.name.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        getCategoryLabel(item.category).toLowerCase().includes(query) ||
        item.notes.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Filter by category (handle type:category format)
    if (selectedCategory !== 'all') {
      const categoryKey = `${item.type || 'expense'}:${item.category}`;
      if (categoryKey !== selectedCategory) {
        return false;
      }
    }

    return true;
  });

  // Calculate summary totals from ALL items (not filtered)
  const allRecurringItems = items.filter(i => i.frequency !== 'one-off');
  const allIncomeItems = allRecurringItems.filter(i => i.type === 'income');
  const allExpenseItems = allRecurringItems.filter(i => i.type === 'expense' || !i.type);

  const totalMonthlyIncome = allIncomeItems.reduce((sum, item) => {
    const value = parseFloat(item.monthlyAmount || '0');
    return sum + (isNaN(value) ? 0 : value);
  }, 0);

  const totalMonthlyExpenses = allExpenseItems.reduce((sum, item) => {
    const value = parseFloat(item.monthlyAmount || '0');
    return sum + (isNaN(value) ? 0 : value);
  }, 0);

  const netMonthly = totalMonthlyIncome - totalMonthlyExpenses;
  const netAnnual = netMonthly * 12;

  // Calculate category totals from ALL recurring items (for filter buttons)
  const categoryTotals = allRecurringItems.reduce((acc, item) => {
    const monthly = parseFloat(item.monthlyAmount || '0');
    if (!isNaN(monthly) && monthly > 0) {
      const key = `${item.type || 'expense'}:${item.category}`;
      acc[key] = (acc[key] || 0) + monthly;
    }
    return acc;
  }, {} as Record<string, number>);

  // Sort categories by total (highest first)
  const sortedCategories = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a);

  // Separate filtered items for display (one-off from recurring)
  let recurringItems = filteredItems.filter(i => i.frequency !== 'one-off');
  let oneOffItems = filteredItems.filter(i => i.frequency === 'one-off');

  // Sort recurring items
  const handleSort = (field: 'name' | 'category' | 'frequency' | 'amount') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  recurringItems = [...recurringItems].sort((a, b) => {
    let comparison = 0;

    if (sortField === 'name') {
      comparison = a.name.localeCompare(b.name);
    } else if (sortField === 'category') {
      comparison = getCategoryLabel(a.category).localeCompare(getCategoryLabel(b.category));
    } else if (sortField === 'frequency') {
      comparison = a.frequency.localeCompare(b.frequency);
    } else if (sortField === 'amount') {
      const aAmount = parseFloat(a.monthlyAmount || '0');
      const bAmount = parseFloat(b.monthlyAmount || '0');
      comparison = aAmount - bAmount;
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Decrypting your budget data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 overflow-hidden">
      <div className="absolute inset-2 bg-white rounded-2xl flex flex-col shadow-2xl">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <Receipt className="w-6 h-6" />
            <h2 className="text-xl font-semibold">Budget & Expenses</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSummary(!showSummary)}
              className="flex items-center gap-2 px-3 py-2 bg-white/90 text-red-600 rounded-lg hover:bg-white transition-colors"
              title={showSummary ? 'Hide summary cards' : 'Show summary cards'}
            >
              {showSummary ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setShowCategoryManager(!showCategoryManager)}
              className="flex items-center gap-2 px-3 py-2 bg-white/90 text-red-600 rounded-lg hover:bg-white transition-colors"
              title="Manage custom categories"
            >
              <Tag className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-red-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {showSummary && (
        <div className="px-6 py-3 bg-gradient-to-br from-red-50 to-orange-50 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="bg-gradient-to-br from-green-600 to-emerald-600 text-white rounded-lg p-3 shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 rounded-lg">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <p className="text-sm text-white/90">Monthly Income</p>
              </div>
              <p className="text-3xl font-bold">
                {formatCurrency(totalMonthlyIncome.toString())}
              </p>
              <p className="text-xs text-white/80 mt-1">{allIncomeItems.length} income items</p>
            </div>
            <div className="bg-gradient-to-br from-red-600 to-orange-600 text-white rounded-lg p-3 shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 rounded-lg">
                  <TrendingDown className="w-5 h-5" />
                </div>
                <p className="text-sm text-white/90">Monthly Expenses</p>
              </div>
              <p className="text-3xl font-bold">
                {formatCurrency(totalMonthlyExpenses.toString())}
              </p>
              <p className="text-xs text-white/80 mt-1">{allExpenseItems.length} expense items</p>
            </div>
            <div className={`bg-gradient-to-br ${netMonthly >= 0 ? 'from-blue-600 to-indigo-600' : 'from-red-600 to-pink-600'} text-white rounded-lg p-3 shadow-lg`}>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 rounded-lg">
                  <DollarSign className="w-5 h-5" />
                </div>
                <p className="text-sm text-white/90">Net Monthly</p>
              </div>
              <p className="text-3xl font-bold">
                {netMonthly >= 0 ? '+' : ''}{formatCurrency(netMonthly.toString())}
              </p>
              <p className="text-xs text-white/80 mt-1">{netMonthly >= 0 ? 'Surplus' : 'Deficit'}</p>
            </div>
            <div className={`rounded-xl p-4 shadow-sm ${netAnnual >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'} border`}>
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 ${netAnnual >= 0 ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'} rounded-lg`}>
                  <Calendar className="w-5 h-5" />
                </div>
                <p className="text-sm text-gray-600">Net Annual</p>
              </div>
              <p className={`text-2xl font-semibold ${netAnnual >= 0 ? 'text-blue-900' : 'text-red-900'}`}>
                {netAnnual >= 0 ? '+' : ''}{formatCurrency(netAnnual.toString())}
              </p>
              <p className="text-xs text-gray-500 mt-1">{netAnnual >= 0 ? 'Surplus' : 'Deficit'} per year</p>
            </div>
          </div>
        </div>
        )}

        <div className="px-6 pt-4 pb-2 border-b border-gray-200">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search expenses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {sortedCategories.length > 0 && (
              <div className="w-64">
                <select
                  id="category-filter"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="all">All Categories</option>
                  {sortedCategories.map(([categoryKey, total]) => {
                    const [type, category] = categoryKey.split(':');
                    const prefix = type === 'income' ? '💰 Income/' : '💸 Expense/';
                    return (
                      <option key={categoryKey} value={categoryKey}>
                        {prefix}{getCategoryLabel(category)} ({formatCurrency(total.toString())}/month)
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
          </div>
        </div>

        {sortedCategories.length > 0 && !showAddForm && (
          <div className="px-6 py-2 bg-gray-50 border-b border-gray-200">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Spending by Category (click to filter)</p>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {sortedCategories.map(([categoryKey, total]) => {
                const [type, category] = categoryKey.split(':');
                const isIncome = type === 'income';
                const prefix = isIncome ? '💰 ' : '💸 ';
                return (
                  <button
                    key={categoryKey}
                    onClick={() => setSelectedCategory(selectedCategory === categoryKey ? 'all' : categoryKey)}
                    className={`flex-shrink-0 px-2 py-1 rounded border ${getCategoryColor(category, type as 'income' | 'expense')} flex items-center gap-2 transition-all hover:shadow-md hover:scale-105 ${
                      selectedCategory === categoryKey ? `ring-2 ${isIncome ? 'ring-green-500' : 'ring-red-500'} ring-offset-1` : ''
                    }`}
                    title={`Click to ${selectedCategory === categoryKey ? 'show all' : 'filter by ' + prefix + getCategoryLabel(category)}`}
                  >
                    <span className="text-xs font-medium text-gray-700">{prefix}{getCategoryLabel(category)}</span>
                    <span className={`text-xs font-bold ${isIncome ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(total.toString())}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="p-3 budget-content-area">
          {showAddForm && (
            <div className={`mb-6 p-6 rounded-xl border-2 ${newItem.type === 'income' ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200' : 'bg-gradient-to-br from-red-50 to-orange-50 border-red-200'}`}>
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Add Budget Item</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <select
                    value={newItem.type}
                    onChange={(e) => setNewItem({ ...newItem, type: e.target.value as 'income' | 'expense', category: e.target.value === 'income' ? 'salary' : 'utilities' })}
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white font-medium"
                  >
                    <option value="expense">💸 Expense</option>
                    <option value="income">💰 Income</option>
                  </select>
                  <input
                    type="text"
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    placeholder={newItem.type === 'income' ? 'Income name (e.g., Salary, Dividends)...' : 'Expense name (e.g., Electricity, Netflix)...'}
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white md:col-span-2"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <select
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  >
                    {getAllCategories(newItem.type).map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  <select
                    value={newItem.frequency}
                    onChange={(e) => setNewItem({ ...newItem, frequency: e.target.value as any })}
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="monthly">Monthly (Fixed)</option>
                    <option value="annual">Annual (Fixed)</option>
                    <option value="variable">Variable/Estimated</option>
                    <option value="one-off">One-off</option>
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={newItem.amount}
                    onChange={(e) => setNewItem({ ...newItem, amount: e.target.value })}
                    placeholder="Amount (£)..."
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  />
                  <input
                    type="text"
                    value={newItem.paymentDate}
                    onChange={(e) => setNewItem({ ...newItem, paymentDate: e.target.value })}
                    placeholder={newItem.frequency === 'one-off' ? 'Date (e.g., 15 Jan 2026)' : 'Day of month (e.g., 15)'}
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  />
                </div>
                <textarea
                  value={newItem.notes}
                  onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                  placeholder="Notes (optional)..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white resize-none"
                  rows={2}
                />
                <div className="flex gap-2">
                  <button
                    onClick={addItem}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Add Item
                  </button>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setNewItem(emptyItem);
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No expenses yet</p>
              <p className="text-sm mt-2">Start tracking your monthly costs and bills</p>
            </div>
          ) : (
            <>
              {recurringItems.length > 0 && (
                <div className="mb-4">
                  <div className="overflow-x-auto -mx-3 px-3">
                    <table className="w-full text-xs min-w-[600px]">
                      <thead className="sticky top-0 bg-white z-10">
                        <tr className="border-b-2 border-gray-300">
                          <th className="text-left py-2 px-2 font-semibold text-gray-700">
                            <button
                              onClick={() => handleSort('name')}
                              className="flex items-center gap-1 hover:text-gray-900"
                            >
                              Name
                              {sortField === 'name' ? (
                                sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 opacity-30" />
                              )}
                            </button>
                          </th>
                          <th className="text-left py-2 px-2 font-semibold text-gray-700">
                            <button
                              onClick={() => handleSort('category')}
                              className="flex items-center gap-1 hover:text-gray-900"
                            >
                              Category
                              {sortField === 'category' ? (
                                sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 opacity-30" />
                              )}
                            </button>
                          </th>
                          <th className="text-left py-2 px-2 font-semibold text-gray-700">
                            <button
                              onClick={() => handleSort('frequency')}
                              className="flex items-center gap-1 hover:text-gray-900"
                            >
                              Frequency
                              {sortField === 'frequency' ? (
                                sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 opacity-30" />
                              )}
                            </button>
                          </th>
                          <th className="text-right py-2 px-2 font-semibold text-gray-700">
                            <button
                              onClick={() => handleSort('amount')}
                              className="flex items-center gap-1 hover:text-gray-900 ml-auto"
                            >
                              Amount
                              {sortField === 'amount' ? (
                                sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 opacity-30" />
                              )}
                            </button>
                          </th>
                          <th className="text-center py-2 px-2 font-semibold text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                    {recurringItems.map((item) => (
                      editingItem?.id === item.id ? (
                        <tr key={item.id} className="border-b border-gray-200">
                          <td colSpan={5} className="py-3 px-2">
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                <select
                                  value={editingItem.type || 'expense'}
                                  onChange={(e) => setEditingItem({ ...editingItem, type: e.target.value as 'income' | 'expense', category: e.target.value === 'income' ? 'salary' : 'utilities' })}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white font-medium"
                                >
                                  <option value="expense">💸 Expense</option>
                                  <option value="income">💰 Income</option>
                                </select>
                              </div>
                              <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">{editingItem.type === 'income' ? 'Income' : 'Expense'} Name</label>
                                <input
                                  type="text"
                                  value={editingItem.name}
                                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                                  placeholder={editingItem.type === 'income' ? 'Income name...' : 'Expense name...'}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                <select
                                  value={editingItem.category}
                                  onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                                >
                                  {getAllCategories(editingItem.type || 'expense').map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                                <select
                                  value={editingItem.frequency}
                                  onChange={(e) => setEditingItem({ ...editingItem, frequency: e.target.value as any })}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                                >
                                  <option value="monthly">Monthly (Fixed)</option>
                                  <option value="annual">Annual (Fixed)</option>
                                  <option value="variable">Variable/Estimated</option>
                                  <option value="one-off">One-off</option>
                                </select>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                                <select
                                  value={editingItem.frequency}
                                  onChange={(e) => setEditingItem({ ...editingItem, frequency: e.target.value as any })}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                                >
                                  <option value="monthly">Monthly (Fixed)</option>
                                  <option value="annual">Annual (Fixed)</option>
                                  <option value="variable">Variable/Estimated</option>
                                  <option value="one-off">One-off</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (£)</label>
                                <input
                                  type="text"
                                  value={editingItem.amount}
                                  onChange={(e) => setEditingItem({ ...editingItem, amount: e.target.value })}
                                  placeholder="Amount..."
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
                                <input
                                  type="text"
                                  value={editingItem.paymentDate}
                                  onChange={(e) => setEditingItem({ ...editingItem, paymentDate: e.target.value })}
                                  placeholder={editingItem.frequency === 'one-off' ? 'Date' : 'Day of month'}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                              <textarea
                                value={editingItem.notes}
                                onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })}
                                placeholder="Notes..."
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white resize-none"
                                rows={2}
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={updateItem}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                              >
                                Save Changes
                              </button>
                              <button
                                onClick={() => setEditingItem(null)}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                          </td>
                        </tr>
                      ) : (
                        <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="py-1.5 px-2">
                            <div className="flex items-center gap-1">
                              <span>{item.type === 'income' ? '💰' : '💸'}</span>
                              <span className="truncate" title={item.name}>{item.name}</span>
                            </div>
                            {item.notes && (
                              <div className="text-[10px] text-gray-500 italic truncate" title={item.notes}>
                                {item.notes}
                              </div>
                            )}
                          </td>
                          <td className="py-1.5 px-2">
                            {getCategoryLabel(item.category)}
                          </td>
                          <td className="py-1.5 px-2">
                            <div>{getFrequencyLabel(item.frequency)}</div>
                            {item.paymentDate && (
                              <div className="text-[10px] text-gray-500">Due: {item.paymentDate}</div>
                            )}
                          </td>
                          <td className="py-1.5 px-2 text-right">
                            <div className={`font-bold ${item.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                              {item.type === 'income' ? '+' : ''}{formatCurrency(item.monthlyAmount)}/mo
                            </div>
                            {item.frequency === 'annual' && (
                              <div className="text-[10px] text-gray-500">
                                ({formatCurrency(item.amount)}/yr)
                              </div>
                            )}
                          </td>
                          <td className="py-1.5 px-2">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleEditItem(item)}
                                className="p-1 hover:bg-gray-200 rounded transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-gray-600" />
                              </button>
                              <button
                                onClick={() => deleteItem(item.id)}
                                className="p-1 hover:bg-red-100 rounded transition-colors"
                                title="Delete"
                              >
                                <Trash className="w-3.5 h-3.5 text-red-600" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {oneOffItems.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">One-off Items</h3>
                  <div className="overflow-x-auto -mx-3 px-3">
                    <table className="w-full text-xs min-w-[600px]">
                      <tbody>
                    {oneOffItems.map((item) => (
                      editingItem?.id === item.id ? (
                        <tr key={item.id} className="border-b border-gray-200">
                          <td colSpan={5} className="py-3 px-2">
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Expense Name</label>
                                <input
                                  type="text"
                                  value={editingItem.name}
                                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                                  placeholder="Expense name..."
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                <select
                                  value={editingItem.category}
                                  onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                                >
                                  {getAllCategories(editingItem.type || 'expense').map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                                <select
                                  value={editingItem.frequency}
                                  onChange={(e) => setEditingItem({ ...editingItem, frequency: e.target.value as any })}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                                >
                                  <option value="monthly">Monthly (Fixed)</option>
                                  <option value="annual">Annual (Fixed)</option>
                                  <option value="variable">Variable/Estimated</option>
                                  <option value="one-off">One-off</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (£)</label>
                                <input
                                  type="text"
                                  value={editingItem.amount}
                                  onChange={(e) => setEditingItem({ ...editingItem, amount: e.target.value })}
                                  placeholder="Amount..."
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                <input
                                  type="text"
                                  value={editingItem.paymentDate}
                                  onChange={(e) => setEditingItem({ ...editingItem, paymentDate: e.target.value })}
                                  placeholder="Date"
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                              <textarea
                                value={editingItem.notes}
                                onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })}
                                placeholder="Notes..."
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white resize-none"
                                rows={2}
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={updateItem}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                              >
                                Save Changes
                              </button>
                              <button
                                onClick={() => setEditingItem(null)}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                          </td>
                        </tr>
                      ) : (
                        <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="py-1.5 px-2 w-1/3">
                            <div className="flex items-center gap-1">
                              <span>{item.type === 'income' ? '💰' : '💸'}</span>
                              <span className="truncate" title={item.name}>{item.name}</span>
                            </div>
                            {item.notes && (
                              <div className="text-[10px] text-gray-500 italic truncate" title={item.notes}>
                                {item.notes}
                              </div>
                            )}
                          </td>
                          <td className="py-1.5 px-2">
                            {getCategoryLabel(item.category)}
                          </td>
                          <td className="py-1.5 px-2">
                            <div>One-off</div>
                            {item.paymentDate && (
                              <div className="text-[10px] text-gray-500">Date: {item.paymentDate}</div>
                            )}
                          </td>
                          <td className="py-1.5 px-2 text-right">
                            <div className={`font-bold ${item.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                              {item.type === 'income' ? '+' : ''}{formatCurrency(item.amount)}
                            </div>
                          </td>
                          <td className="py-1.5 px-2">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleEditItem(item)}
                                className="p-1 hover:bg-gray-200 rounded transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-gray-600" />
                              </button>
                              <button
                                onClick={() => deleteItem(item.id)}
                                className="p-1 hover:bg-red-100 rounded transition-colors"
                                title="Delete"
                              >
                                <Trash className="w-3.5 h-3.5 text-red-600" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        </div>

        {/* Category Manager Modal */}
        {showCategoryManager && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <Tag className="w-5 h-5 text-red-600" />
                  Manage Categories
                </h3>
                <button
                  onClick={() => setShowCategoryManager(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Add New Category */}
              <div className="mb-6 p-4 bg-gradient-to-br from-red-50 to-orange-50 rounded-xl border-2 border-red-200">
                <h4 className="font-semibold mb-3 text-gray-900">Add Custom Category</h4>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Category name (e.g., 'Pet Care', 'Education')"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-white"
                      onKeyPress={(e) => e.key === 'Enter' && addCustomCategory()}
                    />
                    <select
                      value={newCategoryType}
                      onChange={(e) => setNewCategoryType(e.target.value as 'income' | 'expense')}
                      className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                    >
                      <option value="expense">💸 Expense</option>
                      <option value="income">💰 Income</option>
                    </select>
                  </div>
                  <button
                    onClick={addCustomCategory}
                    disabled={!newCategoryName.trim()}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    Add Category
                  </button>
                </div>
              </div>

              {/* Custom Categories List */}
              <div>
                <h4 className="font-semibold mb-3 text-gray-900">Your Custom Categories</h4>
                {customCategories.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Tag className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No custom categories yet</p>
                    <p className="text-sm mt-1">Add categories that fit your budget needs</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {customCategories.map(cat => (
                      <div
                        key={cat.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{cat.type === 'income' ? '💰' : '💸'}</span>
                          <div>
                            <p className="font-medium text-gray-900">{cat.name}</p>
                            <p className="text-xs text-gray-500">{cat.type === 'income' ? 'Income' : 'Expense'}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteCustomCategory(cat.id)}
                          className="p-2 hover:bg-red-100 rounded-lg transition-colors text-red-600"
                          title="Delete category"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                <strong>Note:</strong> Default categories (Housing, Utilities, etc.) cannot be deleted.
                If you delete a custom category, budget items using it will show as "Other".
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
