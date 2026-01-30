import { useState, useEffect, useMemo } from 'react';
import {
  X, Plus, Trash2, BookOpen, Calendar, Edit2, Key, ChevronLeft, ChevronRight,
  Home, Gift, Sparkles, Zap, DollarSign, PiggyBank, Settings, Check,
  TrendingDown, AlertCircle, FileText, Download, Eye, EyeOff
} from 'lucide-react';
import { useStorage } from '../../contexts/StorageContext';

// Budget panel data structure (for import)
interface BudgetItem {
  id: string;
  name: string;
  type: 'income' | 'expense';
  category: string;
  frequency: 'monthly' | 'annual' | 'variable' | 'one-off';
  amount: string;
  monthlyAmount: string;
  paymentDate: string;
  notes: string;
}

// Interfaces
interface FixedExpense {
  id: string;
  name: string;
  amount: number;
  category: 'housing' | 'utilities' | 'insurance' | 'subscriptions' | 'debt' | 'other';
}

interface KakeiboExpense {
  id: string;
  date: string;
  description: string;
  amount: number;
  pillar: 'needs' | 'wants' | 'culture' | 'unexpected';
  notes?: string;
}

interface KakeiboMonth {
  id: string;
  year: number;
  month: number;
  income: number;
  fixedExpenses: FixedExpense[];
  savingsGoal: number;
  expenses: KakeiboExpense[];
  reflection: {
    actualSaved: number;
    howSaved: string;
    improvements: string;
    notes: string;
    accountBalance: number;
    completed: boolean;
  };
}

interface KakeiboManagerSecureProps {
  onClose: () => void;
}

// Helper functions
const getCurrentMonthId = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const parseMonthId = (id: string): { year: number; month: number } => {
  const [year, month] = id.split('-').map(Number);
  return { year, month };
};

const formatMonthDisplay = (year: number, month: number) => {
  return new Date(year, month - 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
};

const getNextMonthId = (id: string): string => {
  const { year, month } = parseMonthId(id);
  if (month === 12) {
    return `${year + 1}-01`;
  }
  return `${year}-${String(month + 1).padStart(2, '0')}`;
};

const getPrevMonthId = (id: string): string => {
  const { year, month } = parseMonthId(id);
  if (month === 1) {
    return `${year - 1}-12`;
  }
  return `${year}-${String(month - 1).padStart(2, '0')}`;
};

const calculateAvailableBudget = (month: KakeiboMonth) => {
  const fixedTotal = month.fixedExpenses.reduce((sum, e) => sum + e.amount, 0);
  return month.income - fixedTotal - month.savingsGoal;
};

const getPillarTotals = (expenses: KakeiboExpense[]) => {
  return {
    needs: expenses.filter(e => e.pillar === 'needs').reduce((sum, e) => sum + e.amount, 0),
    wants: expenses.filter(e => e.pillar === 'wants').reduce((sum, e) => sum + e.amount, 0),
    culture: expenses.filter(e => e.pillar === 'culture').reduce((sum, e) => sum + e.amount, 0),
    unexpected: expenses.filter(e => e.pillar === 'unexpected').reduce((sum, e) => sum + e.amount, 0),
  };
};

const getPillarCount = (expenses: KakeiboExpense[], pillar: string) => {
  return expenses.filter(e => e.pillar === pillar).length;
};

const pillarConfig = {
  needs: {
    label: 'Needs',
    japanese: '必要',
    icon: Home,
    color: 'slate',
    bgClass: 'bg-slate-100',
    textClass: 'text-slate-700',
    borderClass: 'border-slate-300',
    progressClass: 'bg-slate-500',
    description: 'Essentials: groceries, transport, household'
  },
  wants: {
    label: 'Wants',
    japanese: '欲しい',
    icon: Gift,
    color: 'pink',
    bgClass: 'bg-pink-100',
    textClass: 'text-pink-700',
    borderClass: 'border-pink-300',
    progressClass: 'bg-pink-500',
    description: 'Nice-to-haves: dining out, hobbies, entertainment'
  },
  culture: {
    label: 'Culture',
    japanese: '文化',
    icon: Sparkles,
    color: 'purple',
    bgClass: 'bg-purple-100',
    textClass: 'text-purple-700',
    borderClass: 'border-purple-300',
    progressClass: 'bg-purple-500',
    description: 'Self-improvement: books, courses, museums'
  },
  unexpected: {
    label: 'Unexpected',
    japanese: '予想外',
    icon: Zap,
    color: 'orange',
    bgClass: 'bg-orange-100',
    textClass: 'text-orange-700',
    borderClass: 'border-orange-300',
    progressClass: 'bg-orange-500',
    description: 'Surprises: repairs, medical, gifts'
  }
};

const fixedExpenseCategories = [
  { value: 'housing', label: 'Housing' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'subscriptions', label: 'Subscriptions' },
  { value: 'debt', label: 'Debt Payments' },
  { value: 'other', label: 'Other' }
];

const emptyMonth = (id: string): KakeiboMonth => {
  const { year, month } = parseMonthId(id);
  return {
    id,
    year,
    month,
    income: 0,
    fixedExpenses: [],
    savingsGoal: 0,
    expenses: [],
    reflection: {
      actualSaved: 0,
      howSaved: '',
      improvements: '',
      notes: '',
      accountBalance: 0,
      completed: false
    }
  };
};

const emptyExpense = (): Omit<KakeiboExpense, 'id'> => ({
  date: new Date().toISOString().split('T')[0],
  description: '',
  amount: 0,
  pillar: 'needs',
  notes: ''
});

const emptyFixedExpense = (): Omit<FixedExpense, 'id'> => ({
  name: '',
  amount: 0,
  category: 'other'
});

export function KakeiboManagerSecure({ onClose }: KakeiboManagerSecureProps) {
  const storage = useStorage();
  const [months, setMonths] = useState<KakeiboMonth[]>([]);
  const [currentMonthId, setCurrentMonthId] = useState(getCurrentMonthId());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal states
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showFixedExpenses, setShowFixedExpenses] = useState(false);
  const [showReflection, setShowReflection] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [showAllExpenses, setShowAllExpenses] = useState(false);
  const [showSummary, setShowSummary] = useState(true);
  const [editingExpense, setEditingExpense] = useState<KakeiboExpense | null>(null);

  // Form states
  const [newExpense, setNewExpense] = useState(emptyExpense());
  const [newFixedExpense, setNewFixedExpense] = useState(emptyFixedExpense());
  const [setupData, setSetupData] = useState({ income: 0, savingsGoal: 0 });
  const [budgetData, setBudgetData] = useState<{ totalIncome: number; fixedExpenses: FixedExpense[] } | null>(null);
  const [isLoadingBudget, setIsLoadingBudget] = useState(false);

  // Reflection form local state (to avoid saving on every keystroke)
  const [reflectionForm, setReflectionForm] = useState({
    actualSaved: 0,
    howSaved: '',
    improvements: '',
    notes: '',
    accountBalance: 0
  });

  const currentMonth = useMemo(() => {
    return months.find(m => m.id === currentMonthId) || emptyMonth(currentMonthId);
  }, [months, currentMonthId]);

  const isCurrentMonthSetup = currentMonth.income > 0;
  const availableBudget = calculateAvailableBudget(currentMonth);
  const pillarTotals = getPillarTotals(currentMonth.expenses);
  const totalSpent = Object.values(pillarTotals).reduce((a, b) => a + b, 0);
  const remaining = availableBudget - totalSpent;
  const projectedSavings = currentMonth.savingsGoal + remaining;
  const isOnTrack = projectedSavings >= currentMonth.savingsGoal;

  useEffect(() => {
    loadData();
  }, []);

  // Reset budget data when setup modal closes
  useEffect(() => {
    if (!showSetup) {
      setBudgetData(null);
    }
  }, [showSetup]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await storage.get<KakeiboMonth>('kakeibo_months');
      setMonths(data);

      // If current month's reflection is completed, show next month
      const calendarMonthId = getCurrentMonthId();
      const calendarMonth = data.find(m => m.id === calendarMonthId);
      if (calendarMonth && calendarMonth.reflection.completed) {
        const nextId = getNextMonthId(calendarMonthId);
        setCurrentMonthId(nextId);
        // Check if next month needs setup
        const nextMonth = data.find(m => m.id === nextId);
        if (!nextMonth || nextMonth.income === 0) {
          setShowSetup(true);
        }
      } else {
        // Check if current month needs setup
        if (!calendarMonth || calendarMonth.income === 0) {
          setShowSetup(true);
        }
      }
    } catch (err) {
      setError('Failed to load data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const saveMonth = async (month: KakeiboMonth) => {
    try {
      setError('');
      const existingIndex = months.findIndex(m => m.id === month.id);

      if (existingIndex >= 0) {
        await storage.update('kakeibo_months', month.id, month);
      } else {
        await storage.add('kakeibo_months', month);
      }

      await loadData();
    } catch (err) {
      setError('Failed to save data');
      console.error(err);
    }
  };

  // Load budget data for import
  const loadBudgetData = async () => {
    try {
      setIsLoadingBudget(true);
      const items = await storage.get<BudgetItem>('budget_items');

      // Exclude only 'variable' frequency - include monthly, annual, and one-off
      // Variable items are what Kakeibo tracks via the four pillars
      const fixedItems = items.filter(item => item.frequency !== 'variable');

      // Calculate total monthly income (excluding one-off income for monthly calculation)
      const incomeItems = fixedItems.filter(item => item.type === 'income' && item.frequency !== 'one-off');
      const totalIncome = incomeItems.reduce((sum, item) => {
        const monthly = parseFloat(item.monthlyAmount || '0');
        return sum + (isNaN(monthly) ? 0 : monthly);
      }, 0);

      // Convert expense items to fixed expenses
      // Include items without type (legacy) or with type === 'expense'
      // For fixed monthly expenses, exclude one-off (those aren't recurring)
      const expenseItems = fixedItems.filter(
        item => (item.type === 'expense' || !item.type) && item.frequency !== 'one-off'
      );

      const fixedExpenses: FixedExpense[] = expenseItems.map(item => {
        // Map budget categories to Kakeibo fixed expense categories
        let category: FixedExpense['category'] = 'other';
        const cat = (item.category || '').toLowerCase();

        if (cat === 'housing' || cat.includes('rent') || cat.includes('mortgage')) {
          category = 'housing';
        } else if (cat === 'utilities' || cat.includes('gas') || cat.includes('electric') || cat.includes('water')) {
          category = 'utilities';
        } else if (cat === 'insurance' || cat.includes('insurance')) {
          category = 'insurance';
        } else if (cat === 'subscriptions' || cat.includes('subscription')) {
          category = 'subscriptions';
        } else if (cat === 'debt' || cat.includes('debt') || cat.includes('loan') || cat.includes('credit')) {
          category = 'debt';
        }

        return {
          id: `imported-${item.id}`,
          name: item.name,
          amount: parseFloat(item.monthlyAmount || '0') || 0,
          category
        };
      });

      setBudgetData({ totalIncome, fixedExpenses });
    } catch (err) {
      console.error('Failed to load budget data:', err);
      setBudgetData(null);
    } finally {
      setIsLoadingBudget(false);
    }
  };

  const handleImportFromBudget = async () => {
    if (!budgetData) return;

    // Update setup data with imported income
    setSetupData(prev => ({ ...prev, income: budgetData.totalIncome }));

    // Import fixed expenses (avoiding duplicates by name)
    const existingNames = new Set(currentMonth.fixedExpenses.map(e => e.name.toLowerCase()));
    const newFixedExpenses = budgetData.fixedExpenses.filter(
      e => !existingNames.has(e.name.toLowerCase())
    );

    if (newFixedExpenses.length > 0) {
      const month = {
        ...currentMonth,
        income: budgetData.totalIncome,
        fixedExpenses: [...currentMonth.fixedExpenses, ...newFixedExpenses]
      };
      await saveMonth(month);
    } else {
      // Just update income if no new fixed expenses
      const month = { ...currentMonth, income: budgetData.totalIncome };
      await saveMonth(month);
    }
  };

  const handleSetupComplete = async () => {
    if (setupData.income <= 0) {
      setError('Please enter your income');
      return;
    }

    const month = {
      ...currentMonth,
      income: setupData.income,
      savingsGoal: setupData.savingsGoal
    };
    await saveMonth(month);
    setShowSetup(false);
  };

  const handleAddExpense = async () => {
    if (!newExpense.description.trim() || newExpense.amount <= 0) {
      setError('Please enter description and amount');
      return;
    }

    const expense: KakeiboExpense = {
      id: Date.now().toString(),
      ...newExpense
    };

    const month = {
      ...currentMonth,
      expenses: [...currentMonth.expenses, expense]
    };

    await saveMonth(month);
    setNewExpense(emptyExpense());
    setShowAddExpense(false);
  };

  const handleUpdateExpense = async () => {
    if (!editingExpense) return;

    const month = {
      ...currentMonth,
      expenses: currentMonth.expenses.map(e =>
        e.id === editingExpense.id ? editingExpense : e
      )
    };

    await saveMonth(month);
    setEditingExpense(null);
  };

  const handleDeleteExpense = async (id: string) => {
    const month = {
      ...currentMonth,
      expenses: currentMonth.expenses.filter(e => e.id !== id)
    };

    await saveMonth(month);
  };

  const handleAddFixedExpense = async () => {
    if (!newFixedExpense.name.trim() || newFixedExpense.amount <= 0) {
      setError('Please enter name and amount');
      return;
    }

    const fixedExpense: FixedExpense = {
      id: Date.now().toString(),
      ...newFixedExpense
    };

    const month = {
      ...currentMonth,
      fixedExpenses: [...currentMonth.fixedExpenses, fixedExpense]
    };

    await saveMonth(month);
    setNewFixedExpense(emptyFixedExpense());
  };

  const handleDeleteFixedExpense = async (id: string) => {
    const month = {
      ...currentMonth,
      fixedExpenses: currentMonth.fixedExpenses.filter(e => e.id !== id)
    };

    await saveMonth(month);
  };

  const handleSaveReflection = async (reflection: KakeiboMonth['reflection']) => {
    const month = {
      ...currentMonth,
      reflection
    };

    await saveMonth(month);
    setShowReflection(false);
  };

  const handleUpdateIncome = async (income: number) => {
    const month = { ...currentMonth, income };
    await saveMonth(month);
  };

  const handleUpdateSavingsGoal = async (savingsGoal: number) => {
    const month = { ...currentMonth, savingsGoal };
    await saveMonth(month);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newId = direction === 'prev'
      ? getPrevMonthId(currentMonthId)
      : getNextMonthId(currentMonthId);
    setCurrentMonthId(newId);

    // Check if this month exists
    const existing = months.find(m => m.id === newId);
    if (!existing && direction === 'next' && newId === getCurrentMonthId()) {
      setShowSetup(true);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
  };

  const recentExpenses = useMemo(() => {
    return [...currentMonth.expenses]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [currentMonth.expenses]);

  const fixedExpensesTotal = currentMonth.fixedExpenses.reduce((sum, e) => sum + e.amount, 0);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Decrypting your Kakeibo data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 overflow-hidden">
      <div className="absolute inset-2 bg-white rounded-2xl flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-rose-600 to-pink-600 text-white rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 text-white rounded-xl relative">
                <BookOpen className="w-6 h-6" />
                <div className="absolute -top-1 -right-1 bg-white/30 rounded-full p-1">
                  <Key className="w-3 h-3 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-white flex items-center gap-2">
                  <span className="font-semibold text-xl">家計簿</span> Kakeibo
                </h2>
                <p className="text-sm text-white/80 mt-1">Mindful Japanese Budgeting</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Month Navigation */}
              <div className="flex items-center gap-2 bg-white/90 rounded-lg px-3 py-2 shadow-sm">
                <button
                  onClick={() => navigateMonth('prev')}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title="Previous month"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <span className="font-medium text-gray-900 min-w-[140px] text-center">
                  {formatMonthDisplay(currentMonth.year, currentMonth.month)}
                </span>
                <button
                  onClick={() => navigateMonth('next')}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title="Next month"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              {isCurrentMonthSetup && (
                <>
                  <button
                    onClick={() => setShowSummary(!showSummary)}
                    className="flex items-center gap-2 px-3 py-2 bg-white/90 text-rose-600 rounded-lg hover:bg-white transition-colors"
                    title={showSummary ? 'Hide summary cards' : 'Show summary cards'}
                  >
                    {showSummary ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setShowAddExpense(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Expense
                  </button>
                </>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-rose-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0" style={{ willChange: 'transform', transform: 'translateZ(0)' }}>
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
            <button onClick={() => setError('')} className="ml-auto">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="p-6">
          {/* Setup Required Banner */}
          {!isCurrentMonthSetup && (
            <div className="mb-6 p-6 bg-gradient-to-r from-rose-100 to-pink-100 rounded-xl border-2 border-rose-200">
              <h3 className="text-lg font-semibold text-rose-900 mb-2">
                Set Up {formatMonthDisplay(currentMonth.year, currentMonth.month)}
              </h3>
              <p className="text-rose-700 mb-4">
                Answer the first Kakeibo question: How much money do you have?
              </p>
              <button
                onClick={() => setShowSetup(true)}
                className="px-6 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
              >
                Start Setup
              </button>
            </div>
          )}

          {/* Summary Cards - Top Row Only */}
          {isCurrentMonthSetup && showSummary && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {/* Income Card */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-green-700">Income</span>
                </div>
                <p className="text-2xl font-bold text-green-900">{formatCurrency(currentMonth.income)}</p>
                <button
                  onClick={() => setShowSetup(true)}
                  className="text-xs text-green-600 hover:text-green-700 mt-1"
                >
                  Edit
                </button>
              </div>

              {/* Fixed Expenses Card */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span className="text-sm text-blue-700">Fixed Expenses</span>
                </div>
                <p className="text-2xl font-bold text-blue-900">{formatCurrency(fixedExpensesTotal)}</p>
                <button
                  onClick={() => setShowFixedExpenses(true)}
                  className="text-xs text-blue-600 hover:text-blue-700 mt-1"
                >
                  Manage ({currentMonth.fixedExpenses.length})
                </button>
              </div>

              {/* Savings Target Card */}
              <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-4 border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <PiggyBank className="w-5 h-5 text-purple-600" />
                  <span className="text-sm text-purple-700">Savings Target</span>
                </div>
                <p className="text-2xl font-bold text-purple-900">{formatCurrency(currentMonth.savingsGoal)}</p>
                <button
                  onClick={() => {
                    setSetupData({ income: currentMonth.income, savingsGoal: currentMonth.savingsGoal });
                    setShowSetup(true);
                  }}
                  className="text-xs text-purple-600 hover:text-purple-700 mt-1"
                >
                  Edit
                </button>
              </div>

              {/* Available Budget Card */}
              <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl p-4 border border-rose-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-5 h-5 text-rose-600" />
                  <span className="text-sm text-rose-700">Available to Spend</span>
                </div>
                <p className="text-2xl font-bold text-rose-900">{formatCurrency(availableBudget)}</p>
                <p className="text-xs text-rose-600 mt-1">After fixed & savings</p>
              </div>
            </div>
          )}

          {/* Four Pillars Section */}
          {isCurrentMonthSetup && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Four Pillars</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {(Object.entries(pillarConfig) as [keyof typeof pillarConfig, typeof pillarConfig.needs][]).map(([key, config]) => {
                  const Icon = config.icon;
                  const total = pillarTotals[key];
                  const count = getPillarCount(currentMonth.expenses, key);
                  const idealBudget = availableBudget / 4;
                  const percentage = idealBudget > 0 ? Math.min((total / idealBudget) * 100, 100) : 0;

                  return (
                    <div
                      key={key}
                      className={`rounded-xl p-4 border-2 ${config.borderClass} ${config.bgClass}`}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`p-2 rounded-lg bg-white`}>
                          <Icon className={`w-5 h-5 ${config.textClass}`} />
                        </div>
                        <div>
                          <p className={`font-semibold ${config.textClass}`}>{config.label}</p>
                          <p className="text-xs text-gray-500">{config.japanese}</p>
                        </div>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 mb-2">
                        {formatCurrency(total)}
                      </p>
                      <div className="w-full h-2 bg-white/60 rounded-full mb-2">
                        <div
                          className={`h-2 rounded-full ${config.progressClass} transition-all`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-600">
                        {count} item{count !== 1 ? 's' : ''}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Monthly Summary - Running Totals */}
          {isCurrentMonthSetup && (
            <div className="mb-6 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Monthly Summary</h3>
                <button
                  onClick={() => {
                    setReflectionForm({
                      actualSaved: currentMonth.reflection.actualSaved || projectedSavings,
                      howSaved: currentMonth.reflection.howSaved || '',
                      improvements: currentMonth.reflection.improvements || '',
                      notes: currentMonth.reflection.notes || '',
                      accountBalance: currentMonth.reflection.accountBalance || 0
                    });
                    setShowReflection(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {currentMonth.reflection.completed ? (
                    <>
                      <Check className="w-4 h-4 text-green-600" />
                      View Reflection
                    </>
                  ) : (
                    <>
                      <Edit2 className="w-4 h-4" />
                      Complete Review
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Total Spent</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(totalSpent)}
                    <span className="text-sm font-normal text-gray-500 ml-1">
                      of {formatCurrency(availableBudget)}
                    </span>
                  </p>
                  <div className="w-full h-2 bg-gray-100 rounded-full mt-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        totalSpent > availableBudget ? 'bg-red-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min((totalSpent / availableBudget) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Remaining</p>
                  <p className={`text-xl font-bold ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(remaining)}
                  </p>
                </div>

                <div className="bg-white rounded-lg p-4">
                  {currentMonth.reflection.completed ? (
                    <>
                      <p className="text-sm text-gray-600 mb-1">Savings</p>
                      <p className={`text-xl font-bold flex items-center gap-2 ${isOnTrack ? 'text-green-600' : 'text-orange-600'}`}>
                        {formatCurrency(projectedSavings)}
                        {isOnTrack ? (
                          <Check className="w-5 h-5" />
                        ) : (
                          <AlertCircle className="w-5 h-5" />
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        Target was {formatCurrency(currentMonth.savingsGoal)}
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm text-gray-600">Savings Target</p>
                        <button
                          onClick={() => {
                            setSetupData({ income: currentMonth.income, savingsGoal: currentMonth.savingsGoal });
                            setShowSetup(true);
                          }}
                          className="text-xs text-rose-600 hover:text-rose-700"
                        >
                          Edit
                        </button>
                      </div>
                      <p className={`text-xl font-bold flex items-center gap-2 ${isOnTrack ? 'text-green-600' : 'text-orange-600'}`}>
                        {formatCurrency(currentMonth.savingsGoal)}
                        {isOnTrack ? (
                          <Check className="w-5 h-5" />
                        ) : (
                          <AlertCircle className="w-5 h-5" />
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        {isOnTrack ? 'On track' : `${formatCurrency(currentMonth.savingsGoal - projectedSavings)} over budget`}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Recent Expenses */}
          {isCurrentMonthSetup && currentMonth.expenses.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recent Expenses</h3>
                {currentMonth.expenses.length > 5 && (
                  <button
                    onClick={() => setShowAllExpenses(true)}
                    className="text-sm text-rose-600 hover:text-rose-700"
                  >
                    View All ({currentMonth.expenses.length})
                  </button>
                )}
              </div>

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {recentExpenses.map((expense) => {
                  const config = pillarConfig[expense.pillar];
                  const Icon = config.icon;

                  return (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between p-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${config.bgClass}`}>
                          <Icon className={`w-4 h-4 ${config.textClass}`} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{expense.description}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(expense.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                            {expense.notes && ` - ${expense.notes}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-1 rounded ${config.bgClass} ${config.textClass}`}>
                          {config.label}
                        </span>
                        <span className="font-semibold text-gray-900">{formatCurrency(expense.amount)}</span>
                        <button
                          onClick={() => setEditingExpense(expense)}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4 text-gray-400" />
                        </button>
                        <button
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="p-1 hover:bg-red-100 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}


          {/* Empty State */}
          {isCurrentMonthSetup && currentMonth.expenses.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No expenses recorded yet</p>
              <p className="text-sm mt-2">Start tracking your mindful spending</p>
              <button
                onClick={() => setShowAddExpense(true)}
                className="mt-4 px-6 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
              >
                Add Your First Expense
              </button>
            </div>
          )}

        </div>
        </div>
      </div>

      {/* Setup Modal */}
      {showSetup && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Monthly Setup
              </h3>
              <button
                onClick={() => setShowSetup(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Import from Budget section */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Download className="w-5 h-5 text-blue-600" />
                    <p className="text-sm text-blue-800 font-medium">Import from Budget Panel</p>
                  </div>
                </div>
                <p className="text-xs text-blue-700 mb-3">
                  Populate income and fixed expenses from your existing Budget data.
                  Variable expenses are not imported - those are tracked in Kakeibo's four pillars.
                </p>

                {budgetData === null ? (
                  <button
                    onClick={loadBudgetData}
                    disabled={isLoadingBudget}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoadingBudget ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Loading...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Check Budget Data
                      </>
                    )}
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="bg-white rounded-lg p-3 text-sm">
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-600">Monthly Income:</span>
                        <span className="font-semibold text-green-600">
                          {formatCurrency(budgetData.totalIncome)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Fixed Expenses:</span>
                        <span className="font-semibold text-gray-900">
                          {budgetData.fixedExpenses.length} items ({formatCurrency(budgetData.fixedExpenses.reduce((s, e) => s + e.amount, 0))})
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={handleImportFromBudget}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Import This Data
                    </button>
                  </div>
                )}
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">or enter manually</span>
                </div>
              </div>

              <div className="p-4 bg-rose-50 rounded-lg border border-rose-200">
                <p className="text-sm text-rose-800 font-medium mb-1">The First Question</p>
                <p className="text-rose-700">How much money do you have this month?</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monthly Income
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">£</span>
                  <input
                    type="number"
                    step="0.01"
                    value={setupData.income || ''}
                    onChange={(e) => setSetupData({ ...setupData, income: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-sm text-purple-800 font-medium mb-1">The Second Question</p>
                <p className="text-purple-700">How much would you like to save?</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Savings Target
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">£</span>
                  <input
                    type="number"
                    step="0.01"
                    value={setupData.savingsGoal || ''}
                    onChange={(e) => setSetupData({ ...setupData, savingsGoal: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSetupComplete}
                  className="flex-1 px-4 py-3 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors font-medium"
                >
                  Save & Continue
                </button>
                <button
                  onClick={() => setShowSetup(false)}
                  className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {showAddExpense && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Add Expense</h3>
              <button
                onClick={() => { setShowAddExpense(false); setNewExpense(emptyExpense()); }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input
                  type="date"
                  value={newExpense.date}
                  onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <input
                  type="text"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  placeholder="What did you buy?"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">£</span>
                  <input
                    type="number"
                    step="0.01"
                    value={newExpense.amount || ''}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Pillar</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(pillarConfig) as [keyof typeof pillarConfig, typeof pillarConfig.needs][]).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <button
                        key={key}
                        onClick={() => setNewExpense({ ...newExpense, pillar: key })}
                        className={`p-3 rounded-lg border-2 transition-all flex items-center gap-2 ${
                          newExpense.pillar === key
                            ? `${config.borderClass} ${config.bgClass}`
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${newExpense.pillar === key ? config.textClass : 'text-gray-400'}`} />
                        <span className={`text-sm font-medium ${newExpense.pillar === key ? config.textClass : 'text-gray-600'}`}>
                          {config.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes <span className="text-gray-400">(optional - why did you buy this?)</span>
                </label>
                <input
                  type="text"
                  value={newExpense.notes}
                  onChange={(e) => setNewExpense({ ...newExpense, notes: e.target.value })}
                  placeholder="Mindful spending reflection..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleAddExpense}
                  className="flex-1 px-4 py-3 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors font-medium"
                >
                  Add Expense
                </button>
                <button
                  onClick={() => { setShowAddExpense(false); setNewExpense(emptyExpense()); }}
                  className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Expense Modal */}
      {editingExpense && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Edit Expense</h3>
              <button
                onClick={() => setEditingExpense(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input
                  type="date"
                  value={editingExpense.date}
                  onChange={(e) => setEditingExpense({ ...editingExpense, date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <input
                  type="text"
                  value={editingExpense.description}
                  onChange={(e) => setEditingExpense({ ...editingExpense, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">£</span>
                  <input
                    type="number"
                    step="0.01"
                    value={editingExpense.amount}
                    onChange={(e) => setEditingExpense({ ...editingExpense, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Pillar</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(pillarConfig) as [keyof typeof pillarConfig, typeof pillarConfig.needs][]).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <button
                        key={key}
                        onClick={() => setEditingExpense({ ...editingExpense, pillar: key })}
                        className={`p-3 rounded-lg border-2 transition-all flex items-center gap-2 ${
                          editingExpense.pillar === key
                            ? `${config.borderClass} ${config.bgClass}`
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${editingExpense.pillar === key ? config.textClass : 'text-gray-400'}`} />
                        <span className={`text-sm font-medium ${editingExpense.pillar === key ? config.textClass : 'text-gray-600'}`}>
                          {config.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <input
                  type="text"
                  value={editingExpense.notes || ''}
                  onChange={(e) => setEditingExpense({ ...editingExpense, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleUpdateExpense}
                  className="flex-1 px-4 py-3 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors font-medium"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setEditingExpense(null)}
                  className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Expenses Modal */}
      {showFixedExpenses && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-600" />
                Fixed Monthly Expenses
              </h3>
              <button
                onClick={() => setShowFixedExpenses(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Add new fixed expense */}
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                <h4 className="text-sm font-semibold text-blue-900 mb-3">Add Fixed Expense</h4>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={newFixedExpense.name}
                    onChange={(e) => setNewFixedExpense({ ...newFixedExpense, name: e.target.value })}
                    placeholder="Expense name (e.g., Rent, Netflix)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">£</span>
                      <input
                        type="number"
                        step="0.01"
                        value={newFixedExpense.amount || ''}
                        onChange={(e) => setNewFixedExpense({ ...newFixedExpense, amount: parseFloat(e.target.value) || 0 })}
                        placeholder="Amount"
                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <select
                      value={newFixedExpense.category}
                      onChange={(e) => setNewFixedExpense({ ...newFixedExpense, category: e.target.value as FixedExpense['category'] })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {fixedExpenseCategories.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={handleAddFixedExpense}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add Expense
                  </button>
                </div>
              </div>

              {/* List of fixed expenses */}
              {currentMonth.fixedExpenses.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No fixed expenses yet</p>
              ) : (
                <div className="space-y-2">
                  {currentMonth.fixedExpenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{expense.name}</p>
                        <p className="text-xs text-gray-500">
                          {fixedExpenseCategories.find(c => c.value === expense.category)?.label}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-gray-900">{formatCurrency(expense.amount)}</span>
                        <button
                          onClick={() => handleDeleteFixedExpense(expense.id)}
                          className="p-1 hover:bg-red-100 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="pt-3 border-t">
                    <div className="flex justify-between font-semibold text-gray-900">
                      <span>Total Fixed Expenses</span>
                      <span>{formatCurrency(fixedExpensesTotal)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reflection Modal */}
      {showReflection && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Monthly Reflection</h3>
              <button
                onClick={() => setShowReflection(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* The Four Questions */}
              <div className="space-y-3">
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm font-medium text-green-800">1. How much money did you have?</p>
                  <p className="text-lg text-green-900">{formatCurrency(currentMonth.income)}</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-sm font-medium text-purple-800">2. How much did you want to save?</p>
                  <p className="text-lg text-purple-900">{formatCurrency(currentMonth.savingsGoal)}</p>
                </div>
                <div className="p-3 bg-rose-50 rounded-lg border border-rose-200">
                  <p className="text-sm font-medium text-rose-800">3. How much did you spend?</p>
                  <p className="text-lg text-rose-900">{formatCurrency(totalSpent + fixedExpensesTotal)}</p>
                  <div className="mt-2 text-sm text-rose-700">
                    <p>Fixed: {formatCurrency(fixedExpensesTotal)}</p>
                    <p>Variable: {formatCurrency(totalSpent)}</p>
                  </div>
                </div>
              </div>

              {/* Spending Breakdown */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Spending by Pillar</h4>
                <div className="space-y-2">
                  {(Object.entries(pillarConfig) as [keyof typeof pillarConfig, typeof pillarConfig.needs][]).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <div key={key} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${config.textClass}`} />
                          <span className="text-sm text-gray-700">{config.label}</span>
                        </div>
                        <span className="font-medium text-gray-900">{formatCurrency(pillarTotals[key])}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actual Savings Section */}
              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-emerald-800">4. How much did you actually save?</p>
                  <div className="text-right">
                    <p className="text-xs text-emerald-600">Projected is</p>
                    <p className="text-lg font-bold text-emerald-700">{formatCurrency(projectedSavings)}</p>
                  </div>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">£</span>
                  <input
                    type="number"
                    step="0.01"
                    value={reflectionForm.actualSaved || ''}
                    onChange={(e) => setReflectionForm({ ...reflectionForm, actualSaved: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                  />
                </div>
              </div>

              {/* How did you save */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">How did you actually save this month?</label>
                <textarea
                  value={reflectionForm.howSaved}
                  onChange={(e) => setReflectionForm({ ...reflectionForm, howSaved: e.target.value })}
                  placeholder="e.g., Cut back on takeaways, found cheaper energy deal, cancelled unused subscription..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  rows={3}
                />
              </div>

              {/* Question 5 - Improvements */}
              <div>
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 mb-3">
                  <p className="text-sm font-medium text-blue-800">5. How can you improve next month?</p>
                </div>
                <textarea
                  value={reflectionForm.improvements}
                  onChange={(e) => setReflectionForm({ ...reflectionForm, improvements: e.target.value })}
                  placeholder="Reflect on your spending habits and what you could do differently..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  rows={3}
                />
              </div>

              {/* Current Account Balance */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Account Balance (end of month)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">£</span>
                  <input
                    type="number"
                    step="0.01"
                    value={reflectionForm.accountBalance || ''}
                    onChange={(e) => setReflectionForm({ ...reflectionForm, accountBalance: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Track your account balance to see money accumulating</p>
              </div>

              {/* Additional Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes</label>
                <textarea
                  value={reflectionForm.notes}
                  onChange={(e) => setReflectionForm({ ...reflectionForm, notes: e.target.value })}
                  placeholder="Any other thoughts about this month..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  rows={2}
                />
              </div>

              <button
                onClick={() => handleSaveReflection({ ...reflectionForm, completed: true })}
                className="w-full px-4 py-3 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                Mark Month as Reviewed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* All Expenses Modal */}
      {showAllExpenses && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                All Expenses - {formatMonthDisplay(currentMonth.year, currentMonth.month)}
              </h3>
              <button
                onClick={() => setShowAllExpenses(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              {[...currentMonth.expenses]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((expense) => {
                  const config = pillarConfig[expense.pillar];
                  const Icon = config.icon;

                  return (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${config.bgClass}`}>
                          <Icon className={`w-4 h-4 ${config.textClass}`} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{expense.description}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(expense.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            {expense.notes && ` - ${expense.notes}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-1 rounded ${config.bgClass} ${config.textClass}`}>
                          {config.label}
                        </span>
                        <span className="font-semibold text-gray-900">{formatCurrency(expense.amount)}</span>
                        <button
                          onClick={() => { setEditingExpense(expense); setShowAllExpenses(false); }}
                          className="p-1 hover:bg-white rounded transition-colors"
                        >
                          <Edit2 className="w-4 h-4 text-gray-400" />
                        </button>
                        <button
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="p-1 hover:bg-red-100 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="mt-4 pt-4 border-t flex justify-between font-semibold text-gray-900">
              <span>Total</span>
              <span>{formatCurrency(totalSpent)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
