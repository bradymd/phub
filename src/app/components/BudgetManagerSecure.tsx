import { useState, useEffect } from 'react';
import { X, Plus, Trash, Receipt, TrendingDown, TrendingUp, Calendar, Edit2, Search, DollarSign, Eye, EyeOff } from 'lucide-react';
import { useStorage } from '../../contexts/StorageContext';

interface BudgetItem {
  id: string;
  name: string;
  type: 'income' | 'expense'; // NEW: Income or expense
  category: 'housing' | 'utilities' | 'insurance' | 'subscriptions' | 'transport' | 'food' | 'entertainment' | 'healthcare' | 'charity' | 'salary' | 'investments' | 'other';
  frequency: 'monthly' | 'annual' | 'variable' | 'one-off';
  amount: string; // Amount per frequency
  monthlyAmount: string; // Calculated monthly amount (annual/12, monthly/variable as-is, one-off shown separately)
  paymentDate: string; // Day of month or date for one-off
  notes: string;
}

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

  useEffect(() => {
    loadItems();
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

  const formatCurrency = (value: string) => {
    if (!value) return '£0.00';
    const num = parseFloat(value.replace(/,/g, ''));
    return isNaN(num) ? value : `£${num.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'housing':
        return 'Housing';
      case 'utilities':
        return 'Utilities';
      case 'insurance':
        return 'Insurance';
      case 'subscriptions':
        return 'Subscriptions';
      case 'transport':
        return 'Transport';
      case 'food':
        return 'Food & Groceries';
      case 'entertainment':
        return 'Entertainment';
      case 'healthcare':
        return 'Healthcare';
      case 'charity':
        return 'Charity';
      case 'salary':
        return 'Salary/Wages';
      case 'investments':
        return 'Investments/Dividends';
      default:
        return 'Other';
    }
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
  const recurringItems = filteredItems.filter(i => i.frequency !== 'one-off');
  const oneOffItems = filteredItems.filter(i => i.frequency === 'one-off');

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

        <div className="flex-1 overflow-y-auto p-3 budget-content-area">
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
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value as any })}
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  >
                    {newItem.type === 'income' ? (
                      <>
                        <option value="salary">Salary/Wages</option>
                        <option value="investments">Investments/Dividends</option>
                        <option value="other">Other Income</option>
                      </>
                    ) : (
                      <>
                        <option value="housing">Housing (Rent/Mortgage)</option>
                        <option value="utilities">Utilities (Gas/Electric/Water)</option>
                        <option value="insurance">Insurance</option>
                        <option value="subscriptions">Subscriptions</option>
                        <option value="transport">Transport</option>
                        <option value="food">Food & Groceries</option>
                        <option value="entertainment">Entertainment</option>
                        <option value="healthcare">Healthcare</option>
                        <option value="charity">Charity</option>
                        <option value="other">Other</option>
                      </>
                    )}
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
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Recurring Expenses</h3>
                  <div className="space-y-1">
                    {recurringItems.map((item) => (
                      <div
                        key={item.id}
                        className={`rounded px-2 py-1 border ${getCategoryColor(item.category, item.type || 'expense')} hover:shadow-sm transition-all`}
                      >
                        {editingItem?.id === item.id ? (
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
                                  onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value as any })}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                                >
                                  {(editingItem.type || 'expense') === 'income' ? (
                                    <>
                                      <option value="salary">Salary/Wages</option>
                                      <option value="investments">Investments/Dividends</option>
                                      <option value="other">Other Income</option>
                                    </>
                                  ) : (
                                    <>
                                      <option value="housing">Housing (Rent/Mortgage)</option>
                                      <option value="utilities">Utilities (Gas/Electric/Water)</option>
                                      <option value="insurance">Insurance</option>
                                      <option value="subscriptions">Subscriptions</option>
                                      <option value="transport">Transport</option>
                                      <option value="food">Food & Groceries</option>
                                      <option value="entertainment">Entertainment</option>
                                      <option value="healthcare">Healthcare</option>
                                      <option value="charity">Charity</option>
                                      <option value="other">Other</option>
                                    </>
                                  )}
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
                        ) : (
                          <div className="flex items-center justify-between gap-2 py-0.5">
                            <div className="flex-1 flex items-center gap-2 min-w-0">
                              <h3 className="font-semibold text-gray-900 text-xs truncate" style={{ minWidth: '140px', maxWidth: '180px' }} title={item.name}>
                                {item.type === 'income' ? '💰 ' : '💸 '}{item.name}
                              </h3>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${item.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-white'}`}>
                                {getCategoryLabel(item.category)}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-white text-gray-600 flex-shrink-0">
                                {getFrequencyLabel(item.frequency)}
                              </span>
                              {item.paymentDate && (
                                <span className="text-[10px] text-gray-600 flex-shrink-0">
                                  Due: {item.paymentDate}
                                </span>
                              )}
                              {item.notes && (
                                <span className="text-[10px] text-gray-500 italic truncate max-w-[120px]" title={item.notes}>
                                  {item.notes}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <div className="text-right">
                                <p className={`text-xs font-bold ${item.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                  {item.type === 'income' ? '+' : ''}{formatCurrency(item.monthlyAmount)}/mo
                                </p>
                                {item.frequency === 'annual' && (
                                  <p className="text-[10px] text-gray-500">
                                    ({formatCurrency(item.amount)}/yr)
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={() => setEditingItem(item)}
                                className="p-1 hover:bg-white rounded transition-colors"
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
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {oneOffItems.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">One-off Expenses</h3>
                  <div className="space-y-1">
                    {oneOffItems.map((item) => (
                      <div
                        key={item.id}
                        className={`rounded px-2 py-1 border ${getCategoryColor(item.category, item.type || 'expense')} hover:shadow-sm transition-all`}
                      >
                        {editingItem?.id === item.id ? (
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
                                  onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value as any })}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                                >
                                  <option value="housing">Housing</option>
                                  <option value="utilities">Utilities</option>
                                  <option value="insurance">Insurance</option>
                                  <option value="subscriptions">Subscriptions</option>
                                  <option value="transport">Transport</option>
                                  <option value="food">Food & Groceries</option>
                                  <option value="entertainment">Entertainment</option>
                                  <option value="healthcare">Healthcare</option>
                                  <option value="charity">Charity</option>
                                  <option value="other">Other</option>
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
                        ) : (
                          <div className="flex items-center justify-between gap-2 py-0.5">
                            <div className="flex-1 flex items-center gap-2 min-w-0">
                              <h3 className="font-semibold text-gray-900 text-xs truncate" style={{ minWidth: '140px', maxWidth: '180px' }} title={item.name}>
                                {item.type === 'income' ? '💰 ' : '💸 '}{item.name}
                              </h3>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${item.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-white'}`}>
                                {getCategoryLabel(item.category)}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-white text-gray-600 flex-shrink-0">
                                One-off
                              </span>
                              {item.paymentDate && (
                                <span className="text-[10px] text-gray-600 flex-shrink-0">
                                  Date: {item.paymentDate}
                                </span>
                              )}
                              {item.notes && (
                                <span className="text-[10px] text-gray-500 italic truncate max-w-[120px]" title={item.notes}>
                                  {item.notes}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <p className={`text-xs font-bold ${item.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                {item.type === 'income' ? '+' : ''}{formatCurrency(item.amount)}
                              </p>
                              <button
                                onClick={() => setEditingItem(item)}
                                className="p-1 hover:bg-white rounded transition-colors"
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
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
