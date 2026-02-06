import { useState, useEffect } from 'react';
import { X, Plus, Trash, PiggyBank, TrendingUp, Building2, Edit2, Search, ExternalLink, Eye, EyeOff, Grid3x3, List } from 'lucide-react';
import { useStorage } from '../../contexts/StorageContext';

interface Pension {
  id: string;
  name: string;
  pensionType: 'DB' | 'DC'; // Defined Benefit or Defined Contribution
  potValue: string; // Current pot value (DC only)
  annuityEstimate: string; // Annual income estimate
  spousePension: string; // Annual income for spouse if member dies
  source: string; // Employer/provider
  accountNumber: string; // Policy/account number
  website: string; // Website URL for online access
  notes: string;
}

interface PensionManagerSecureProps {
  onClose: () => void;
}

const emptyPension = {
  name: '',
  pensionType: 'DC' as const,
  potValue: '',
  annuityEstimate: '',
  spousePension: '',
  source: '',
  accountNumber: '',
  website: '',
  notes: ''
};

export function PensionManagerSecure({ onClose }: PensionManagerSecureProps) {
  const storage = useStorage();
  const [pensions, setPensions] = useState<Pension[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPension, setEditingPension] = useState<Pension | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [newPension, setNewPension] = useState(emptyPension);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSummary, setShowSummary] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [viewingDetails, setViewingDetails] = useState<Pension | null>(null);

  useEffect(() => {
    loadPensions();
  }, []);

  useEffect(() => {
    if (showAddForm) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [showAddForm]);

  const loadPensions = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await storage.get<Pension>('pensions');
      setPensions(data);
    } catch (err) {
      setError('Failed to load data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const addPension = async () => {
    if (!newPension.name.trim()) return;

    try {
      setError('');
      const pension: Pension = {
        id: Date.now().toString(),
        ...newPension
      };

      await storage.add('pensions', pension);
      await loadPensions();
      setNewPension(emptyPension);
      setShowAddForm(false);
    } catch (err) {
      setError('Failed to add pension');
      console.error(err);
    }
  };

  const updatePension = async () => {
    if (!editingPension || !editingPension.name.trim()) return;

    try {
      setError('');
      await storage.update('pensions', editingPension.id, editingPension);
      // Update local state directly to preserve scroll position
      setPensions(prev => prev.map(p => p.id === editingPension.id ? editingPension : p));
      setEditingPension(null);
    } catch (err) {
      setError('Failed to update pension');
      console.error(err);
    }
  };

  const deletePension = async (id: string) => {
    try {
      setError('');
      await storage.delete('pensions', id);
      await loadPensions();
    } catch (err) {
      setError('Failed to delete pension');
      console.error(err);
    }
  };

  const formatCurrency = (value: string) => {
    if (!value) return '£0';
    const num = parseFloat(value.replace(/,/g, ''));
    return isNaN(num) ? value : `£${num.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Sort by annuity estimate (highest first)
  const sortedPensions = [...pensions].sort((a, b) => {
    const aAnnuity = parseFloat(a.annuityEstimate.replace(/,/g, '')) || 0;
    const bAnnuity = parseFloat(b.annuityEstimate.replace(/,/g, '')) || 0;
    return bAnnuity - aAnnuity;
  });

  // Filter based on search query
  const filteredPensions = sortedPensions.filter(pension => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      pension.name.toLowerCase().includes(query) ||
      pension.source.toLowerCase().includes(query) ||
      pension.pensionType.toLowerCase().includes(query) ||
      pension.accountNumber.toLowerCase().includes(query) ||
      pension.notes.toLowerCase().includes(query)
    );
  });

  // Calculate totals
  const totalPotValue = filteredPensions.reduce((sum, p) => {
    if (p.pensionType === 'DC' && p.potValue) {
      const value = parseFloat(p.potValue.replace(/,/g, ''));
      return sum + (isNaN(value) ? 0 : value);
    }
    return sum;
  }, 0);

  const totalAnnuity = filteredPensions.reduce((sum, p) => {
    const value = parseFloat(p.annuityEstimate.replace(/,/g, ''));
    return sum + (isNaN(value) ? 0 : value);
  }, 0);

  const totalSpousePension = filteredPensions.reduce((sum, p) => {
    if (p.spousePension) {
      const value = parseFloat(p.spousePension.replace(/,/g, ''));
      return sum + (isNaN(value) ? 0 : value);
    }
    return sum;
  }, 0);

  const dbCount = filteredPensions.filter(p => p.pensionType === 'DB').length;
  const dcCount = filteredPensions.filter(p => p.pensionType === 'DC').length;

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Decrypting your pension data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-500 to-green-700 text-white rounded-t-2xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-shrink-0">
              <PiggyBank className="w-6 h-6" />
              <h2 className="text-xl font-semibold">Pension Manager</h2>
            </div>
            <div className="flex-1 max-w-md relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search pensions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setShowSummary(!showSummary)}
                className="p-2 hover:bg-green-700 rounded-lg transition-colors"
                title={showSummary ? "Hide summary" : "Show summary"}
              >
                {showSummary ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white text-green-600'
                    : 'hover:bg-green-700'
                }`}
                title="Grid view"
              >
                <Grid3x3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white text-green-600'
                    : 'hover:bg-green-700'
                }`}
                title="List view"
              >
                <List className="w-5 h-5" />
              </button>
              <div className="w-px h-8 bg-white/30 mx-1"></div>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-2 px-4 py-2 bg-white text-green-600 rounded-lg hover:bg-green-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-green-700 rounded-lg transition-colors"
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

        {showSummary && (
          <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                  <PiggyBank className="w-5 h-5" />
                </div>
                <p className="text-sm text-gray-600">Total Pensions</p>
              </div>
              <p className="text-2xl font-semibold text-gray-900">{filteredPensions.length}</p>
              <p className="text-xs text-gray-500 mt-1">{dbCount} DB / {dcCount} DC</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <p className="text-sm text-gray-600">DC Pot Value</p>
              </div>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(totalPotValue.toString())}
              </p>
              <p className="text-xs text-gray-500 mt-1">Defined Contribution</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                  <Building2 className="w-5 h-5" />
                </div>
                <p className="text-sm text-gray-600">Annual Income Est.</p>
              </div>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(totalAnnuity.toString())}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {formatCurrency((totalAnnuity / 12).toString())} / month
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                  <Building2 className="w-5 h-5" />
                </div>
                <p className="text-sm text-gray-600">Spouse Pension</p>
              </div>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(totalSpousePension.toString())}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {formatCurrency((totalSpousePension / 12).toString())} / month
              </p>
            </div>
          </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          {showAddForm && (
            <div className="mb-6 p-6 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Add Pension</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={newPension.name}
                    onChange={(e) => setNewPension({ ...newPension, name: e.target.value })}
                    placeholder="Pension fund name..."
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  />
                  <select
                    value={newPension.pensionType}
                    onChange={(e) => setNewPension({ ...newPension, pensionType: e.target.value as 'DB' | 'DC' })}
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="DC">DC - Defined Contribution</option>
                    <option value="DB">DB - Defined Benefit</option>
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={newPension.potValue}
                    onChange={(e) => setNewPension({ ...newPension, potValue: e.target.value })}
                    placeholder={newPension.pensionType === 'DC' ? 'Current pot value (£)...' : 'N/A for DB pensions'}
                    disabled={newPension.pensionType === 'DB'}
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white disabled:bg-gray-100"
                  />
                  <input
                    type="text"
                    value={newPension.annuityEstimate}
                    onChange={(e) => setNewPension({ ...newPension, annuityEstimate: e.target.value })}
                    placeholder="Annual income estimate (£)..."
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={newPension.spousePension}
                    onChange={(e) => setNewPension({ ...newPension, spousePension: e.target.value })}
                    placeholder="Spouse pension (£/year) - optional..."
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  />
                  <div></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={newPension.source}
                    onChange={(e) => setNewPension({ ...newPension, source: e.target.value })}
                    placeholder="Employer/provider..."
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  />
                  <input
                    type="text"
                    value={newPension.accountNumber}
                    onChange={(e) => setNewPension({ ...newPension, accountNumber: e.target.value })}
                    placeholder="Account/policy number (optional)..."
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  />
                </div>
                <input
                  type="text"
                  value={newPension.website}
                  onChange={(e) => setNewPension({ ...newPension, website: e.target.value })}
                  placeholder="Website URL (e.g., https://example.com) - optional..."
                  className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                />
                <textarea
                  value={newPension.notes}
                  onChange={(e) => setNewPension({ ...newPension, notes: e.target.value })}
                  placeholder="Notes (optional)..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white resize-y min-h-[60px]"
                  rows={3}
                />
                <div className="flex gap-2">
                  <button
                    onClick={addPension}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Add Pension
                  </button>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setNewPension(emptyPension);
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {filteredPensions.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <PiggyBank className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No pensions yet</p>
              <p className="text-sm mt-2">Start tracking your retirement savings</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="space-y-4">
              {filteredPensions.map((pension) => (
                <div
                  key={pension.id}
                  onClick={() => setViewingDetails(pension)}
                  className={`rounded-xl p-5 hover:bg-gray-100 transition-colors cursor-pointer ${
                    pension.pensionType === 'DB'
                      ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200'
                      : 'bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200'
                  }`}
                >
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-gray-900 text-lg">{pension.name}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              pension.pensionType === 'DB'
                                ? 'bg-green-200 text-green-800'
                                : 'bg-blue-200 text-blue-800'
                            }`}>
                              {pension.pensionType}
                            </span>
                          </div>
                          {pension.source && (
                            <p className="text-sm text-gray-600 mb-2">
                              <Building2 className="w-4 h-4 inline mr-1" />
                              {pension.source}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingPension(pension);
                            }}
                            className="p-2 hover:bg-white rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deletePension(pension.id);
                            }}
                            className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                          >
                            <Trash className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {pension.pensionType === 'DC' && pension.potValue && (
                          <div className="bg-white rounded-lg p-3">
                            <p className="text-xs text-gray-500 mb-1">Current Pot Value</p>
                            <p className="text-lg font-semibold text-blue-600">
                              {formatCurrency(pension.potValue)}
                            </p>
                          </div>
                        )}
                        {pension.annuityEstimate && (
                          <div className="bg-white rounded-lg p-3">
                            <p className="text-xs text-gray-500 mb-1">Annual Income Est.</p>
                            <p className="text-lg font-semibold text-green-600">
                              {formatCurrency(pension.annuityEstimate)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatCurrency((parseFloat(pension.annuityEstimate.replace(/,/g, '')) / 12).toString())} / month
                            </p>
                          </div>
                        )}
                        {pension.spousePension && (
                          <div className="bg-white rounded-lg p-3">
                            <p className="text-xs text-gray-500 mb-1">Spouse Pension</p>
                            <p className="text-lg font-semibold text-purple-600">
                              {formatCurrency(pension.spousePension)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatCurrency((parseFloat(pension.spousePension.replace(/,/g, '')) / 12).toString())} / month
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                </div>
              ))}
            </div>
          ) : (
            /* List View - Tabular */
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Table Header */}
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 grid grid-cols-12 gap-4 font-medium text-sm text-gray-700">
                <div className="col-span-4">Pension</div>
                <div className="col-span-2 text-right">Annual Income</div>
                <div className="col-span-2 text-right">Monthly</div>
                <div className="col-span-2 text-right">Spouse Pension</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-gray-100">
                {filteredPensions.map((pension) => (
                  <div
                    key={pension.id}
                    onClick={() => setViewingDetails(pension)}
                    className="px-6 py-3 hover:bg-gray-50 transition-colors cursor-pointer grid grid-cols-12 gap-4 items-center group"
                  >
                    {/* Pension Name/Type/Source */}
                    <div className="col-span-4 flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-lg flex-shrink-0 ${
                        pension.pensionType === 'DB'
                          ? 'bg-green-100 text-green-600'
                          : 'bg-blue-100 text-blue-600'
                      }`}>
                        <PiggyBank className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="text-gray-900 font-medium truncate">{pension.name}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${
                            pension.pensionType === 'DB'
                              ? 'bg-green-200 text-green-800'
                              : 'bg-blue-200 text-blue-800'
                          }`}>
                            {pension.pensionType}
                          </span>
                        </div>
                        {pension.source && (
                          <div className="flex items-center gap-1 text-sm text-gray-500 truncate">
                            <Building2 className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{pension.source}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Annual Income */}
                    <div className="col-span-2 text-right">
                      {pension.annuityEstimate ? (
                        <span className="text-green-600 font-semibold">
                          {formatCurrency(pension.annuityEstimate)}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </div>

                    {/* Monthly */}
                    <div className="col-span-2 text-right">
                      {pension.annuityEstimate ? (
                        <span className="text-gray-600 text-sm">
                          {formatCurrency((parseFloat(pension.annuityEstimate.replace(/,/g, '')) / 12).toString())}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </div>

                    {/* Spouse Pension */}
                    <div className="col-span-2 text-right">
                      {pension.spousePension ? (
                        <span className="text-purple-600 font-semibold">
                          {formatCurrency(pension.spousePension)}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="col-span-2 flex items-center justify-end gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingPension(pension);
                        }}
                        className="p-2 hover:bg-white rounded-lg transition-colors text-gray-600"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePension(pension.id);
                        }}
                        className="p-2 hover:bg-red-100 rounded-lg transition-colors text-red-600"
                        title="Delete"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pension Details Modal */}
      {viewingDetails && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <PiggyBank className="w-5 h-5 text-green-600" />
                Pension Details
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
                <label className="block text-sm font-medium text-gray-500 mb-1">Pension Fund Name</label>
                <div className="flex items-center gap-2">
                  <p className="text-lg text-gray-900 font-medium">{viewingDetails.name}</p>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    viewingDetails.pensionType === 'DB'
                      ? 'bg-green-200 text-green-800'
                      : 'bg-blue-200 text-blue-800'
                  }`}>
                    {viewingDetails.pensionType === 'DB' ? 'DB - Defined Benefit' : 'DC - Defined Contribution'}
                  </span>
                </div>
              </div>

              {viewingDetails.source && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Employer/Provider</label>
                  <div className="flex items-center gap-2 text-gray-900">
                    <Building2 className="w-4 h-4 text-green-600" />
                    <p>{viewingDetails.source}</p>
                  </div>
                </div>
              )}

              {viewingDetails.accountNumber && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Account/Policy Number</label>
                  <p className="text-gray-900">{viewingDetails.accountNumber}</p>
                </div>
              )}

              {viewingDetails.pensionType === 'DC' && viewingDetails.potValue && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Current Pot Value</label>
                  <p className="text-2xl font-semibold text-blue-600">{formatCurrency(viewingDetails.potValue)}</p>
                </div>
              )}

              {viewingDetails.annuityEstimate && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Annual Income Estimate</label>
                  <p className="text-2xl font-semibold text-green-600">{formatCurrency(viewingDetails.annuityEstimate)}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {formatCurrency((parseFloat(viewingDetails.annuityEstimate.replace(/,/g, '')) / 12).toString())} per month
                  </p>
                </div>
              )}

              {viewingDetails.spousePension && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Spouse Pension</label>
                  <p className="text-2xl font-semibold text-purple-600">{formatCurrency(viewingDetails.spousePension)}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {formatCurrency((parseFloat(viewingDetails.spousePension.replace(/,/g, '')) / 12).toString())} per month
                  </p>
                </div>
              )}

              {viewingDetails.website && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Website</label>
                  <a
                    href={viewingDetails.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {viewingDetails.website}
                  </a>
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
                    setEditingPension({ ...viewingDetails });
                    setViewingDetails(null);
                  }}
                  className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  <Edit2 className="w-4 h-4" />
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

      {/* Edit Modal */}
      {editingPension && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Edit Pension</h2>
              <button
                onClick={() => setEditingPension(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pension Fund Name</label>
                  <input
                    type="text"
                    value={editingPension.name}
                    onChange={(e) => setEditingPension({ ...editingPension, name: e.target.value })}
                    placeholder="Pension fund name..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pension Type</label>
                  <select
                    value={editingPension.pensionType}
                    onChange={(e) => setEditingPension({ ...editingPension, pensionType: e.target.value as 'DB' | 'DC' })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="DC">DC - Defined Contribution</option>
                    <option value="DB">DB - Defined Benefit</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Pot Value (£)</label>
                  <input
                    type="text"
                    value={editingPension.potValue}
                    onChange={(e) => setEditingPension({ ...editingPension, potValue: e.target.value })}
                    placeholder={editingPension.pensionType === 'DC' ? 'Current pot value (£)...' : 'N/A for DB pensions'}
                    disabled={editingPension.pensionType === 'DB'}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white disabled:bg-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Annual Income Estimate (£)</label>
                  <input
                    type="text"
                    value={editingPension.annuityEstimate}
                    onChange={(e) => setEditingPension({ ...editingPension, annuityEstimate: e.target.value })}
                    placeholder="Annual income estimate (£)..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Spouse Pension (£/year)</label>
                  <input
                    type="text"
                    value={editingPension.spousePension}
                    onChange={(e) => setEditingPension({ ...editingPension, spousePension: e.target.value })}
                    placeholder="Spouse pension (£/year) - optional..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employer/Provider</label>
                  <input
                    type="text"
                    value={editingPension.source}
                    onChange={(e) => setEditingPension({ ...editingPension, source: e.target.value })}
                    placeholder="Employer/provider..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account/Policy Number</label>
                  <input
                    type="text"
                    value={editingPension.accountNumber}
                    onChange={(e) => setEditingPension({ ...editingPension, accountNumber: e.target.value })}
                    placeholder="Account/policy number (optional)..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
                <input
                  type="text"
                  value={editingPension.website}
                  onChange={(e) => setEditingPension({ ...editingPension, website: e.target.value })}
                  placeholder="Website URL (e.g., https://example.com) - optional..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={editingPension.notes}
                  onChange={(e) => setEditingPension({ ...editingPension, notes: e.target.value })}
                  placeholder="Notes (optional)..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white resize-y min-h-[80px] focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows={3}
                />
              </div>
              <div className="flex gap-2 pt-4 border-t">
                <button
                  onClick={updatePension}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setEditingPension(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
