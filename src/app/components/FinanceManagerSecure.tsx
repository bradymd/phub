import { useState, useEffect } from 'react';
import { X, Plus, Trash, Wallet, TrendingUp, PiggyBank, Edit2, Search, ExternalLink, Eye, EyeOff, Grid3x3, List } from 'lucide-react';
import { useStorage } from '../../contexts/StorageContext';

interface FinanceAccount {
  id: string;
  name: string;
  type: 'savings' | 'investment-isa' | 'cash-isa' | 'salary-sacrifice' | 'other';
  currentValue: string; // Current value (includes growth)
  contributions: string; // What you put in (for ISAs, counts against allowance)
  taxYear: string; // e.g., "2024-2025", "2025-2026" (for ISAs)
  provider: string;
  accountNumber: string;
  website: string;
  monthlyContribution: string; // For salary sacrifice
  notes: string;
}

interface FinanceManagerSecureProps {
  onClose: () => void;
}

const emptyAccount = {
  name: '',
  type: 'savings' as const,
  currentValue: '',
  contributions: '',
  taxYear: '2025-2026', // Current tax year
  provider: '',
  accountNumber: '',
  website: '',
  monthlyContribution: '',
  notes: ''
};

export function FinanceManagerSecure({ onClose }: FinanceManagerSecureProps) {
  const storage = useStorage();
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<FinanceAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [newAccount, setNewAccount] = useState(emptyAccount);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSummary, setShowSummary] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    if (showAddForm) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [showAddForm]);

  const loadAccounts = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await storage.get<any>('finance_items');

      // Migrate old data format to new format
      const migratedData = data.map((item: any) => ({
        id: item.id,
        name: item.name || '',
        type: item.type || 'savings',
        // Map old field names to new ones
        currentValue: item.currentValue || item.balance || item.amount || '',
        contributions: item.contributions || item.annualContribution || '',
        taxYear: item.taxYear || '2024-2025', // Default for old data
        provider: item.provider || item.description || '',
        accountNumber: item.accountNumber || '',
        website: item.website || '',
        monthlyContribution: item.monthlyContribution || '',
        notes: item.notes || ''
      }));

      setAccounts(migratedData);
    } catch (err) {
      setError('Failed to load data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const addAccount = async () => {
    if (!newAccount.name.trim()) return;

    try {
      setError('');
      const account: FinanceAccount = {
        id: Date.now().toString(),
        ...newAccount
      };

      await storage.add('finance_items', account);
      await loadAccounts();
      setNewAccount(emptyAccount);
      setShowAddForm(false);
    } catch (err) {
      setError('Failed to add account');
      console.error(err);
    }
  };

  const updateAccount = async () => {
    if (!editingAccount || !editingAccount.name.trim()) return;

    try {
      setError('');
      await storage.update('finance_items', editingAccount.id, editingAccount);
      await loadAccounts();
      setEditingAccount(null);
    } catch (err) {
      setError('Failed to update account');
      console.error(err);
    }
  };

  const deleteAccount = async (id: string) => {
    try {
      setError('');
      await storage.delete('finance_items', id);
      await loadAccounts();
    } catch (err) {
      setError('Failed to delete account');
      console.error(err);
    }
  };

  const formatCurrency = (value: string) => {
    if (!value) return '£0.00';
    const num = parseFloat(value.replace(/,/g, ''));
    return isNaN(num) ? value : `£${num.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'savings':
        return 'Savings Account';
      case 'investment-isa':
        return 'Investment ISA';
      case 'cash-isa':
        return 'Cash ISA';
      case 'salary-sacrifice':
        return 'Salary Sacrifice / AVC';
      default:
        return 'Other';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'savings':
        return 'bg-blue-50 border-blue-200';
      case 'investment-isa':
        return 'bg-green-50 border-green-200';
      case 'cash-isa':
        return 'bg-purple-50 border-purple-200';
      case 'salary-sacrifice':
        return 'bg-orange-50 border-orange-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const filteredAccounts = accounts.filter(account => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      account.name.toLowerCase().includes(query) ||
      account.provider.toLowerCase().includes(query) ||
      account.type.toLowerCase().includes(query) ||
      getTypeLabel(account.type).toLowerCase().includes(query) ||
      account.notes.toLowerCase().includes(query)
    );
  });

  const currentTaxYear = '2025-2026'; // April 2025 to April 2026

  const totalValue = filteredAccounts.reduce((sum, a) => {
    if (!a.currentValue) return sum;
    const value = parseFloat(a.currentValue.replace(/,/g, ''));
    return sum + (isNaN(value) ? 0 : value);
  }, 0);

  const totalISAValue = filteredAccounts
    .filter(a => a.type === 'investment-isa' || a.type === 'cash-isa')
    .reduce((sum, a) => {
      if (!a.currentValue) return sum;
      const value = parseFloat(a.currentValue.replace(/,/g, ''));
      return sum + (isNaN(value) ? 0 : value);
    }, 0);

  const currentYearISAContributions = filteredAccounts
    .filter(a => (a.type === 'investment-isa' || a.type === 'cash-isa') && a.taxYear === currentTaxYear)
    .reduce((sum, a) => {
      if (!a.contributions) return sum;
      const value = parseFloat(a.contributions.replace(/,/g, ''));
      return sum + (isNaN(value) ? 0 : value);
    }, 0);

  const isaAllowance = 20000;
  const isaRemaining = isaAllowance - currentYearISAContributions;

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Decrypting your finance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <Wallet className="w-6 h-6" />
            <h2 className="text-xl font-semibold">Banks & Savings Manager</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white/20'
                  : 'hover:bg-white/10'
              }`}
              title="Grid view"
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-white/20'
                  : 'hover:bg-white/10'
              }`}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowSummary(!showSummary)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title={showSummary ? "Hide summary" : "Show summary"}
            >
              {showSummary ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Account
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
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
          <div className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-xl p-4 shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 rounded-lg">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <p className="text-sm text-white/90">Total Net Worth</p>
              </div>
              <p className="text-3xl font-bold">
                {formatCurrency(totalValue.toString())}
              </p>
              <p className="text-xs text-white/80 mt-1">{filteredAccounts.length} accounts</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <Wallet className="w-5 h-5" />
                </div>
                <p className="text-sm text-gray-600">Total ISA Value</p>
              </div>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(totalISAValue.toString())}
              </p>
              <p className="text-xs text-gray-500 mt-1">{filteredAccounts.filter(a => a.type === 'investment-isa' || a.type === 'cash-isa').length} ISAs</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <p className="text-sm text-gray-600">Contributed {currentTaxYear}</p>
              </div>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(currentYearISAContributions.toString())}
              </p>
              <p className="text-xs text-gray-500 mt-1">of £20,000 allowance</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                  <PiggyBank className="w-5 h-5" />
                </div>
                <p className="text-sm text-gray-600">Allowance Remaining</p>
              </div>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(isaRemaining.toString())}
              </p>
              <p className="text-xs text-gray-500 mt-1">{((currentYearISAContributions / isaAllowance) * 100).toFixed(1)}% used</p>
            </div>
          </div>
          </div>
        )}

        <div className="px-6 pt-4 pb-2 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search accounts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {showAddForm && (
            <div className="mb-6 p-6 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Add Account</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={newAccount.name}
                    onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                    placeholder="Account name..."
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  />
                  <select
                    value={newAccount.type}
                    onChange={(e) => setNewAccount({ ...newAccount, type: e.target.value as any })}
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="savings">Savings Account</option>
                    <option value="investment-isa">Investment ISA</option>
                    <option value="cash-isa">Cash ISA</option>
                    <option value="salary-sacrifice">Salary Sacrifice / AVC</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={newAccount.currentValue}
                    onChange={(e) => setNewAccount({ ...newAccount, currentValue: e.target.value })}
                    placeholder="Current value (£)..."
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  />
                  {(newAccount.type === 'investment-isa' || newAccount.type === 'cash-isa') && (
                    <input
                      type="text"
                      value={newAccount.contributions}
                      onChange={(e) => setNewAccount({ ...newAccount, contributions: e.target.value })}
                      placeholder="Contributions (what you put in)..."
                      className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                    />
                  )}
                  {newAccount.type === 'salary-sacrifice' && (
                    <input
                      type="text"
                      value={newAccount.monthlyContribution}
                      onChange={(e) => setNewAccount({ ...newAccount, monthlyContribution: e.target.value })}
                      placeholder="Monthly contribution (£)..."
                      className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                    />
                  )}
                </div>
                {(newAccount.type === 'investment-isa' || newAccount.type === 'cash-isa') && (
                  <select
                    value={newAccount.taxYear}
                    onChange={(e) => setNewAccount({ ...newAccount, taxYear: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="2025-2026">2025-2026 Tax Year (Current)</option>
                    <option value="2024-2025">2024-2025 Tax Year</option>
                    <option value="2023-2024">2023-2024 Tax Year</option>
                    <option value="2022-2023">2022-2023 Tax Year</option>
                    <option value="2021-2022">2021-2022 Tax Year</option>
                  </select>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={newAccount.provider}
                    onChange={(e) => setNewAccount({ ...newAccount, provider: e.target.value })}
                    placeholder="Provider (e.g., Trading212, Barclays)..."
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  />
                  <input
                    type="text"
                    value={newAccount.accountNumber}
                    onChange={(e) => setNewAccount({ ...newAccount, accountNumber: e.target.value })}
                    placeholder="Account number - optional..."
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  />
                </div>
                <input
                  type="text"
                  value={newAccount.website}
                  onChange={(e) => setNewAccount({ ...newAccount, website: e.target.value })}
                  placeholder="Website URL - optional..."
                  className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                />
                <textarea
                  value={newAccount.notes}
                  onChange={(e) => setNewAccount({ ...newAccount, notes: e.target.value })}
                  placeholder="Notes (optional)..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white resize-none"
                  rows={2}
                />
                <div className="flex gap-2">
                  <button
                    onClick={addAccount}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add Account
                  </button>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setNewAccount(emptyAccount);
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          <>
            {/* Grid View */}
            {viewMode === 'grid' && (
              <div className="space-y-4">
                {filteredAccounts.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                <Wallet className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No accounts yet</p>
                <p className="text-sm mt-2">Start tracking your savings and investments</p>
              </div>
            ) : (
              filteredAccounts.map((account) => (
                <div
                  key={account.id}
                  className={`rounded-xl p-5 border-2 ${getTypeColor(account.type)} hover:shadow-md transition-all`}
                >
                  {editingAccount?.id === account.id ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                          <input
                            type="text"
                            value={editingAccount.name}
                            onChange={(e) => setEditingAccount({ ...editingAccount, name: e.target.value })}
                            placeholder="Account name..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
                          <select
                            value={editingAccount.type}
                            onChange={(e) => setEditingAccount({ ...editingAccount, type: e.target.value as any })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                          >
                            <option value="savings">Savings Account</option>
                            <option value="investment-isa">Investment ISA</option>
                            <option value="cash-isa">Cash ISA</option>
                            <option value="salary-sacrifice">Salary Sacrifice / AVC</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Current Value (£)</label>
                          <input
                            type="text"
                            value={editingAccount.currentValue}
                            onChange={(e) => setEditingAccount({ ...editingAccount, currentValue: e.target.value })}
                            placeholder="Current value (£)..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                          />
                        </div>
                        {(editingAccount.type === 'investment-isa' || editingAccount.type === 'cash-isa') && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Contributions (£)</label>
                            <input
                              type="text"
                              value={editingAccount.contributions}
                              onChange={(e) => setEditingAccount({ ...editingAccount, contributions: e.target.value })}
                              placeholder="Contributions (what you put in)..."
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                            />
                          </div>
                        )}
                        {editingAccount.type === 'salary-sacrifice' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Contribution (£)</label>
                            <input
                              type="text"
                              value={editingAccount.monthlyContribution}
                              onChange={(e) => setEditingAccount({ ...editingAccount, monthlyContribution: e.target.value })}
                              placeholder="Monthly contribution (£)..."
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                            />
                          </div>
                        )}
                      </div>
                      {(editingAccount.type === 'investment-isa' || editingAccount.type === 'cash-isa') && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Tax Year</label>
                          <select
                            value={editingAccount.taxYear}
                            onChange={(e) => setEditingAccount({ ...editingAccount, taxYear: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                          >
                            <option value="2025-2026">2025-2026 Tax Year (Current)</option>
                            <option value="2024-2025">2024-2025 Tax Year</option>
                            <option value="2023-2024">2023-2024 Tax Year</option>
                            <option value="2022-2023">2022-2023 Tax Year</option>
                            <option value="2021-2022">2021-2022 Tax Year</option>
                          </select>
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                          <input
                            type="text"
                            value={editingAccount.provider}
                            onChange={(e) => setEditingAccount({ ...editingAccount, provider: e.target.value })}
                            placeholder="Provider..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                          <input
                            type="text"
                            value={editingAccount.accountNumber}
                            onChange={(e) => setEditingAccount({ ...editingAccount, accountNumber: e.target.value })}
                            placeholder="Account number..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
                        <input
                          type="text"
                          value={editingAccount.website}
                          onChange={(e) => setEditingAccount({ ...editingAccount, website: e.target.value })}
                          placeholder="Website URL..."
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <textarea
                          value={editingAccount.notes}
                          onChange={(e) => setEditingAccount({ ...editingAccount, notes: e.target.value })}
                          placeholder="Notes..."
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white resize-none"
                          rows={2}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={updateAccount}
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Save Changes
                        </button>
                        <button
                          onClick={() => setEditingAccount(null)}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-gray-900 text-lg">{account.name}</h3>
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-white">
                              {getTypeLabel(account.type)}
                            </span>
                          </div>
                          {account.provider && (
                            <p className="text-sm text-gray-600 mb-2">{account.provider}</p>
                          )}
                          {account.accountNumber && (
                            <p className="text-xs text-gray-500 mb-2">Account: {account.accountNumber}</p>
                          )}
                          {account.website && (
                            <a
                              href={account.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 mb-2"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Visit website
                            </a>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingAccount(account)}
                            className="p-2 hover:bg-white rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => deleteAccount(account.id)}
                            className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                          >
                            <Trash className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {account.currentValue && (
                          <div className="bg-white rounded-lg p-3">
                            <p className="text-xs text-gray-500 mb-1">Current Value</p>
                            <p className="text-lg font-semibold text-blue-600">
                              {formatCurrency(account.currentValue)}
                            </p>
                          </div>
                        )}
                        {(account.type === 'investment-isa' || account.type === 'cash-isa') && account.contributions && (
                          <div className="bg-white rounded-lg p-3">
                            <p className="text-xs text-gray-500 mb-1">Contributions</p>
                            <p className="text-lg font-semibold text-green-600">
                              {formatCurrency(account.contributions)}
                            </p>
                            {account.taxYear && (
                              <p className="text-xs text-gray-500 mt-1">{account.taxYear}</p>
                            )}
                          </div>
                        )}
                        {account.type === 'salary-sacrifice' && account.monthlyContribution && (
                          <div className="bg-white rounded-lg p-3">
                            <p className="text-xs text-gray-500 mb-1">Monthly Contribution</p>
                            <p className="text-lg font-semibold text-green-600">
                              {formatCurrency(account.monthlyContribution)}
                            </p>
                          </div>
                        )}
                      </div>

                      {account.notes && (
                        <div className="bg-white rounded-lg p-3 mt-3">
                          <p className="text-xs text-gray-500 mb-1">Notes</p>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{account.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
            </div>
          )}

          {/* List/Table View */}
          {viewMode === 'list' && (
            <>
              {/* Edit Modal for List View */}
              {editingAccount && (
                <div className="mb-6 p-6 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200">
                  <h3 className="mb-4 text-lg font-semibold text-gray-900">Edit Account</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                        <input
                          type="text"
                          value={editingAccount.name}
                          onChange={(e) => setEditingAccount({ ...editingAccount, name: e.target.value })}
                          placeholder="Account name..."
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
                        <select
                          value={editingAccount.type}
                          onChange={(e) => setEditingAccount({ ...editingAccount, type: e.target.value as any })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                        >
                          <option value="savings">Savings Account</option>
                          <option value="investment-isa">Investment ISA</option>
                          <option value="cash-isa">Cash ISA</option>
                          <option value="salary-sacrifice">Salary Sacrifice / AVC</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Current Value (£)</label>
                        <input
                          type="text"
                          value={editingAccount.currentValue}
                          onChange={(e) => setEditingAccount({ ...editingAccount, currentValue: e.target.value })}
                          placeholder="Current value (£)..."
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                        />
                      </div>
                      {(editingAccount.type === 'investment-isa' || editingAccount.type === 'cash-isa') && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Contributions (£)</label>
                          <input
                            type="text"
                            value={editingAccount.contributions}
                            onChange={(e) => setEditingAccount({ ...editingAccount, contributions: e.target.value })}
                            placeholder="Contributions (what you put in)..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                          />
                        </div>
                      )}
                      {editingAccount.type === 'salary-sacrifice' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Contribution (£)</label>
                          <input
                            type="text"
                            value={editingAccount.monthlyContribution}
                            onChange={(e) => setEditingAccount({ ...editingAccount, monthlyContribution: e.target.value })}
                            placeholder="Monthly contribution (£)..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                          />
                        </div>
                      )}
                    </div>
                    {(editingAccount.type === 'investment-isa' || editingAccount.type === 'cash-isa') && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tax Year</label>
                        <select
                          value={editingAccount.taxYear}
                          onChange={(e) => setEditingAccount({ ...editingAccount, taxYear: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                        >
                          <option value="2025-2026">2025-2026 Tax Year (Current)</option>
                          <option value="2024-2025">2024-2025 Tax Year</option>
                          <option value="2023-2024">2023-2024 Tax Year</option>
                          <option value="2022-2023">2022-2023 Tax Year</option>
                          <option value="2021-2022">2021-2022 Tax Year</option>
                        </select>
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                        <input
                          type="text"
                          value={editingAccount.provider}
                          onChange={(e) => setEditingAccount({ ...editingAccount, provider: e.target.value })}
                          placeholder="Provider..."
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                        <input
                          type="text"
                          value={editingAccount.accountNumber}
                          onChange={(e) => setEditingAccount({ ...editingAccount, accountNumber: e.target.value })}
                          placeholder="Account number..."
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
                      <input
                        type="text"
                        value={editingAccount.website}
                        onChange={(e) => setEditingAccount({ ...editingAccount, website: e.target.value })}
                        placeholder="Website URL..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                      <textarea
                        value={editingAccount.notes}
                        onChange={(e) => setEditingAccount({ ...editingAccount, notes: e.target.value })}
                        placeholder="Notes..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white resize-none"
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={updateAccount}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={() => setEditingAccount(null)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              {filteredAccounts.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Wallet className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No accounts yet</p>
                  <p className="text-sm mt-2">Start tracking your savings and investments</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Account
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Provider
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Current Value
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredAccounts.map((account) => (
                      <tr
                        key={account.id}
                        onClick={() => setEditingAccount(account)}
                        className="hover:bg-blue-50 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900">{account.name}</p>
                            {account.accountNumber && (
                              <p className="text-xs text-gray-500">Acc: {account.accountNumber}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-gray-100">
                            {getTypeLabel(account.type)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm text-gray-900">{account.provider || '-'}</p>
                            {account.website && (
                              <a
                                href={account.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-1"
                              >
                                <ExternalLink className="w-3 h-3" />
                                Visit
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div>
                            <p className="font-semibold text-blue-600">
                              {formatCurrency(account.currentValue)}
                            </p>
                            {(account.type === 'investment-isa' || account.type === 'cash-isa') && account.contributions && (
                              <p className="text-xs text-gray-500 mt-1">
                                Contrib: {formatCurrency(account.contributions)}
                              </p>
                            )}
                            {account.type === 'salary-sacrifice' && account.monthlyContribution && (
                              <p className="text-xs text-gray-500 mt-1">
                                {formatCurrency(account.monthlyContribution)}/mo
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingAccount(account);
                              }}
                              className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteAccount(account.id);
                              }}
                              className="p-1.5 hover:bg-red-100 rounded transition-colors"
                              title="Delete"
                            >
                              <Trash className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            </>
          )}
          </>
        </div>
      </div>
    </div>
  );
}
