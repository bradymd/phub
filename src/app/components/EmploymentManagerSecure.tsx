import { useState, useEffect } from 'react';
import { X, Plus, Trash, Briefcase, Calendar, Edit2, FileText, Key, ChevronDown, ChevronUp, Search, Eye, EyeOff, Grid3x3, List, Building2 } from 'lucide-react';
import { useStorage } from '../../contexts/StorageContext';

interface EmploymentRecord {
  id: string;
  company: string;
  jobTitle: string;
  startDate: string;
  endDate: string;
  current: boolean;
  responsibilities: string;
  achievements: string;
  salary: string;
  pensionScheme: string;
  location: string;
  employmentType: 'full-time' | 'part-time' | 'contract' | 'freelance';
}

interface EmploymentManagerSecureProps {
  onClose: () => void;
}

const emptyRecord = {
  company: '',
  jobTitle: '',
  startDate: '',
  endDate: '',
  current: false,
  responsibilities: '',
  achievements: '',
  salary: '',
  pensionScheme: '',
  location: '',
  employmentType: 'full-time' as const
};

export function EmploymentManagerSecure({ onClose }: EmploymentManagerSecureProps) {
  const storage = useStorage();
  const [records, setRecords] = useState<EmploymentRecord[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<EmploymentRecord | null>(null);
  const [viewingDetails, setViewingDetails] = useState<EmploymentRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [newRecord, setNewRecord] = useState(emptyRecord);
  const [showSummary, setShowSummary] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    loadRecords();
  }, []);

  // Scroll to top when add form opens (edit is now in modal)
  useEffect(() => {
    if (showAddForm) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [showAddForm]);

  const loadRecords = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await storage.get<EmploymentRecord>('employment_records');
      setRecords(data);
    } catch (err) {
      setError('Failed to load data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const addRecord = async () => {
    if (!newRecord.company.trim() || !newRecord.jobTitle.trim()) return;

    try {
      setError('');
      const record: EmploymentRecord = {
        id: Date.now().toString(),
        ...newRecord
      };

      await storage.add('employment_records', record);
      await loadRecords();
      setNewRecord(emptyRecord);
      setShowAddForm(false);
    } catch (err) {
      setError('Failed to add record');
      console.error(err);
    }
  };

  const updateRecord = async () => {
    if (!editingRecord || !editingRecord.company.trim() || !editingRecord.jobTitle.trim()) return;

    try {
      setError('');
      await storage.update('employment_records', editingRecord.id, editingRecord);
      await loadRecords();
      setEditingRecord(null);
    } catch (err) {
      setError('Failed to update record');
      console.error(err);
    }
  };

  const deleteRecord = async (id: string) => {
    try {
      setError('');
      await storage.delete('employment_records', id);
      await loadRecords();
    } catch (err) {
      setError('Failed to delete record');
      console.error(err);
    }
  };

  const calculateDuration = (startDate: string, endDate: string, current: boolean) => {
    if (!startDate) return '';

    const start = new Date(startDate);
    const end = current ? new Date() : new Date(endDate || new Date());

    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;

    if (years === 0) return `${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`;
    if (remainingMonths === 0) return `${years} year${years !== 1 ? 's' : ''}`;
    return `${years} year${years !== 1 ? 's' : ''}, ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`;
  };

  const generateCV = () => {
    let cv = '=== CURRICULUM VITAE ===\n\n';
    cv += 'EMPLOYMENT HISTORY\n\n';

    records.forEach((record, index) => {
      cv += `${index + 1}. ${record.jobTitle} at ${record.company}\n`;
      cv += `   ${record.startDate} - ${record.current ? 'Present' : record.endDate}\n`;
      if (record.location) cv += `   Location: ${record.location}\n`;
      cv += `   Employment Type: ${record.employmentType.charAt(0).toUpperCase() + record.employmentType.slice(1)}\n`;
      if (record.responsibilities) {
        cv += `\n   Responsibilities:\n   ${record.responsibilities}\n`;
      }
      if (record.achievements) {
        cv += `\n   Key Achievements:\n   ${record.achievements}\n`;
      }
      cv += '\n';
    });

    const blob = new Blob([cv], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my-cv.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter records based on search query
  const filteredRecords = records.filter(record => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      record.company.toLowerCase().includes(query) ||
      record.jobTitle.toLowerCase().includes(query) ||
      record.location.toLowerCase().includes(query) ||
      record.responsibilities.toLowerCase().includes(query) ||
      record.achievements.toLowerCase().includes(query) ||
      record.employmentType.toLowerCase().includes(query)
    );
  });

  const totalYearsWorked = records.reduce((total, record) => {
    if (!record.startDate) return total;
    const start = new Date(record.startDate);
    const end = record.current ? new Date() : new Date(record.endDate || new Date());
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    return total + months;
  }, 0);

  const totalYears = Math.floor(totalYearsWorked / 12);
  const totalMonths = totalYearsWorked % 12;

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Decrypting your employment data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 overflow-hidden">
      <div className="absolute inset-2 bg-white rounded-2xl flex flex-col shadow-2xl">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-600 to-indigo-600 text-white rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 text-white rounded-xl relative">
                <Briefcase className="w-6 h-6" />
                <div className="absolute -top-1 -right-1 bg-white/30 rounded-full p-1">
                  <Key className="w-3 h-3 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-white flex items-center gap-2 text-xl font-semibold">
                  Employment History
                </h2>
                <p className="text-sm text-white/80 mt-1">Track your career journey, roles, and pension details</p>
              </div>
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
          <div className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                  <Briefcase className="w-5 h-5" />
                </div>
                <p className="text-sm text-gray-600">Total Positions</p>
              </div>
              <p className="text-gray-900">{records.length}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <Calendar className="w-5 h-5" />
                </div>
                <p className="text-sm text-gray-600">Total Experience</p>
              </div>
              <p className="text-gray-900">
                {totalYears > 0 && `${totalYears}y `}
                {totalMonths > 0 && `${totalMonths}m`}
                {totalYears === 0 && totalMonths === 0 && '0m'}
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                  <FileText className="w-5 h-5" />
                </div>
                <p className="text-sm text-gray-600">CV Export</p>
              </div>
              <button
                onClick={generateCV}
                disabled={records.length === 0}
                className="text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                Download CV
              </button>
            </div>
          </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="px-6 pt-4 pb-2 border-b border-gray-200 bg-gray-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by company, job title, location, responsibilities..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
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
          <div className="mt-2 text-sm text-gray-600">
            Showing <span className="font-semibold">{filteredRecords.length}</span> of <span className="font-semibold">{records.length}</span> employment records
            {searchQuery && <span className="text-indigo-600 ml-1">• Searching for "{searchQuery}"</span>}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 p-6" style={{ willChange: 'transform', transform: 'translateZ(0)' }}>
          {showAddForm && (
            <div className="mb-6 p-6 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Add Employment Record</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={newRecord.company}
                    onChange={(e) => setNewRecord({ ...newRecord, company: e.target.value })}
                    placeholder="Company name..."
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  />
                  <input
                    type="text"
                    value={newRecord.jobTitle}
                    onChange={(e) => setNewRecord({ ...newRecord, jobTitle: e.target.value })}
                    placeholder="Job title..."
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  />
                  <input
                    type="text"
                    value={newRecord.location}
                    onChange={(e) => setNewRecord({ ...newRecord, location: e.target.value })}
                    placeholder="Location..."
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  />
                  <select
                    value={newRecord.employmentType}
                    onChange={(e) => setNewRecord({ ...newRecord, employmentType: e.target.value as any })}
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="full-time">Full-time</option>
                    <option value="part-time">Part-time</option>
                    <option value="contract">Contract</option>
                    <option value="freelance">Freelance</option>
                  </select>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={newRecord.startDate}
                      onChange={(e) => setNewRecord({ ...newRecord, startDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">End Date</label>
                    <input
                      type="date"
                      value={newRecord.endDate}
                      onChange={(e) => setNewRecord({ ...newRecord, endDate: e.target.value })}
                      disabled={newRecord.current}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white disabled:bg-gray-100"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={newRecord.current}
                    onChange={(e) => setNewRecord({ ...newRecord, current: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-gray-700">I currently work here</span>
                </label>

                <textarea
                  value={newRecord.responsibilities}
                  onChange={(e) => setNewRecord({ ...newRecord, responsibilities: e.target.value })}
                  placeholder="Roles and responsibilities..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  rows={4}
                />

                <textarea
                  value={newRecord.achievements}
                  onChange={(e) => setNewRecord({ ...newRecord, achievements: e.target.value })}
                  placeholder="Key achievements..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  rows={3}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={newRecord.salary}
                    onChange={(e) => setNewRecord({ ...newRecord, salary: e.target.value })}
                    placeholder="Salary (optional)..."
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  />
                  <input
                    type="text"
                    value={newRecord.pensionScheme}
                    onChange={(e) => setNewRecord({ ...newRecord, pensionScheme: e.target.value })}
                    placeholder="Pension scheme (optional)..."
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={addRecord}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Add Record
                  </button>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setNewRecord(emptyRecord);
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full mb-6 p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 text-gray-600 hover:text-indigo-600"
            >
              <Plus className="w-5 h-5" />
              Add Employment Record
            </button>
          )}

          {filteredRecords.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>{records.length === 0 ? 'No employment records yet' : 'No employment records match your search'}</p>
              {records.length === 0 && <p className="text-sm mt-2">Start building your career history</p>}
            </div>
          ) : viewMode === 'list' ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 grid grid-cols-12 gap-4 font-medium text-sm text-gray-700">
                <div className="col-span-4">Position & Company</div>
                <div className="col-span-3">Dates & Duration</div>
                <div className="col-span-2">Location</div>
                <div className="col-span-2">Type</div>
                <div className="col-span-1 text-right">Actions</div>
              </div>

              <div className="divide-y divide-gray-100">
                {filteredRecords.map((record) => (
                  <div
                    key={record.id}
                    onClick={() => setViewingDetails(record)}
                    className="px-6 py-3 hover:bg-gray-50 transition-colors cursor-pointer grid grid-cols-12 gap-4 items-center group"
                  >
                    <div className="col-span-4 flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-lg flex-shrink-0 ${
                        record.current
                          ? 'bg-green-100 text-green-600'
                          : 'bg-indigo-100 text-indigo-600'
                      }`}>
                        <Briefcase className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="text-gray-900 font-medium truncate">{record.jobTitle}</h3>
                          {record.current && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-200 text-green-800 flex-shrink-0">
                              Current
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-500 truncate">
                          <Building2 className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{record.company}</span>
                        </div>
                      </div>
                    </div>

                    <div className="col-span-3">
                      <p className="text-sm text-gray-700">
                        {record.startDate} - {record.current ? 'Present' : record.endDate}
                      </p>
                      {(record.startDate || record.endDate) && (
                        <p className="text-xs text-indigo-600">
                          {calculateDuration(record.startDate, record.endDate, record.current)}
                        </p>
                      )}
                    </div>

                    <div className="col-span-2">
                      <p className="text-sm text-gray-700">{record.location || '—'}</p>
                    </div>

                    <div className="col-span-2">
                      <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded">
                        {record.employmentType.charAt(0).toUpperCase() + record.employmentType.slice(1)}
                      </span>
                    </div>

                    <div className="col-span-1 flex items-center justify-end gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingRecord({ ...record });
                        }}
                        className="p-2 hover:bg-white rounded-lg transition-colors text-gray-600"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteRecord(record.id);
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
          ) : (
            <div className="space-y-4">
              {filteredRecords.map((record) => (
                <div
                  key={record.id}
                  onClick={() => setViewingDetails(record)}
                  className={`rounded-xl p-5 transition-colors cursor-pointer ${
                    record.current
                      ? 'bg-gradient-to-br from-green-50 to-indigo-50 border-2 border-green-200 hover:bg-green-100'
                      : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-indigo-200 hover:bg-blue-100'
                  }`}
                >
                  {editingRecord?.id === record.id ? (
                    <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                          <input
                            type="text"
                            value={editingRecord.company}
                            onChange={(e) => setEditingRecord({ ...editingRecord, company: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                          <input
                            type="text"
                            value={editingRecord.jobTitle}
                            onChange={(e) => setEditingRecord({ ...editingRecord, jobTitle: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                          <input
                            type="text"
                            value={editingRecord.location}
                            onChange={(e) => setEditingRecord({ ...editingRecord, location: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Employment Type</label>
                          <select
                            value={editingRecord.employmentType}
                            onChange={(e) => setEditingRecord({ ...editingRecord, employmentType: e.target.value as any })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                          >
                            <option value="full-time">Full-time</option>
                            <option value="part-time">Part-time</option>
                            <option value="contract">Contract</option>
                            <option value="freelance">Freelance</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                          <input
                            type="date"
                            value={editingRecord.startDate}
                            onChange={(e) => setEditingRecord({ ...editingRecord, startDate: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                          <input
                            type="date"
                            value={editingRecord.endDate}
                            onChange={(e) => setEditingRecord({ ...editingRecord, endDate: e.target.value })}
                            disabled={editingRecord.current}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white disabled:bg-gray-100"
                          />
                        </div>
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={editingRecord.current}
                          onChange={(e) => setEditingRecord({ ...editingRecord, current: e.target.checked })}
                          className="rounded"
                        />
                        <span className="text-gray-700">I currently work here</span>
                      </label>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Responsibilities</label>
                        <textarea
                          value={editingRecord.responsibilities}
                          onChange={(e) => setEditingRecord({ ...editingRecord, responsibilities: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                          rows={4}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Key Achievements</label>
                        <textarea
                          value={editingRecord.achievements}
                          onChange={(e) => setEditingRecord({ ...editingRecord, achievements: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                          rows={3}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Salary (optional)</label>
                          <input
                            type="text"
                            value={editingRecord.salary}
                            onChange={(e) => setEditingRecord({ ...editingRecord, salary: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Pension Scheme (optional)</label>
                          <input
                            type="text"
                            value={editingRecord.pensionScheme}
                            onChange={(e) => setEditingRecord({ ...editingRecord, pensionScheme: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={updateRecord}
                          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          Save Changes
                        </button>
                        <button
                          onClick={() => setEditingRecord(null)}
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
                            <h3 className="font-semibold text-gray-900 text-lg">{record.jobTitle}</h3>
                            {record.current && (
                              <span className="px-2 py-1 bg-green-200 text-green-800 rounded text-xs font-semibold">
                                Current
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            <Building2 className="w-4 h-4 inline mr-1" />
                            {record.company}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingRecord({ ...record });
                            }}
                            className="p-2 hover:bg-white rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteRecord(record.id);
                            }}
                            className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                          >
                            <Trash className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white rounded-lg p-3">
                          <p className="text-xs text-gray-500 mb-1">Duration</p>
                          <p className="text-sm font-semibold text-indigo-600">
                            {calculateDuration(record.startDate, record.endDate, record.current)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {record.startDate} - {record.current ? 'Present' : record.endDate}
                          </p>
                        </div>
                        {record.location && (
                          <div className="bg-white rounded-lg p-3">
                            <p className="text-xs text-gray-500 mb-1">Location</p>
                            <p className="text-sm font-semibold text-gray-700">{record.location}</p>
                          </div>
                        )}
                        <div className="bg-white rounded-lg p-3">
                          <p className="text-xs text-gray-500 mb-1">Employment Type</p>
                          <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded">
                            {record.employmentType.charAt(0).toUpperCase() + record.employmentType.slice(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Employment Details Modal */}
      {viewingDetails && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-indigo-600" />
                Employment Details
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
                <label className="block text-sm font-medium text-gray-500 mb-1">Job Title</label>
                <div className="flex items-center gap-2">
                  <p className="text-lg text-gray-900 font-medium">{viewingDetails.jobTitle}</p>
                  {viewingDetails.current && (
                    <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-200 text-green-800">
                      Current Position
                    </span>
                  )}
                </div>
              </div>

              {viewingDetails.company && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Company</label>
                  <div className="flex items-center gap-2 text-gray-900">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    <p>{viewingDetails.company}</p>
                  </div>
                </div>
              )}

              {viewingDetails.location && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Location</label>
                  <p className="text-gray-900">{viewingDetails.location}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Employment Type</label>
                <span className="text-xs px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded font-medium">
                  {viewingDetails.employmentType.charAt(0).toUpperCase() + viewingDetails.employmentType.slice(1)}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Duration</label>
                <p className="text-gray-900">
                  {viewingDetails.startDate} - {viewingDetails.current ? 'Present' : viewingDetails.endDate}
                </p>
                {(viewingDetails.startDate || viewingDetails.endDate) && (
                  <p className="text-sm text-indigo-600 mt-1">
                    {calculateDuration(viewingDetails.startDate, viewingDetails.endDate, viewingDetails.current)}
                  </p>
                )}
              </div>

              {viewingDetails.responsibilities && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Responsibilities</label>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-gray-700 whitespace-pre-wrap">{viewingDetails.responsibilities}</p>
                  </div>
                </div>
              )}

              {viewingDetails.achievements && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Key Achievements</label>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-gray-700 whitespace-pre-wrap">{viewingDetails.achievements}</p>
                  </div>
                </div>
              )}

              {viewingDetails.salary && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Salary</label>
                  <p className="text-gray-900">{viewingDetails.salary}</p>
                </div>
              )}

              {viewingDetails.pensionScheme && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Pension Scheme</label>
                  <p className="text-gray-900">{viewingDetails.pensionScheme}</p>
                </div>
              )}

              <div className="flex items-center gap-3 pt-4 border-t">
                <button
                  onClick={() => {
                    setEditingRecord({ ...viewingDetails });
                    setViewingDetails(null);
                  }}
                  className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
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

      {/* Edit Modal - shows when editing from list view */}
      {editingRecord && viewMode === 'list' && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Edit Employment Record</h2>
              <button
                onClick={() => setEditingRecord(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                  <input
                    type="text"
                    value={editingRecord.company}
                    onChange={(e) => setEditingRecord({ ...editingRecord, company: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                  <input
                    type="text"
                    value={editingRecord.jobTitle}
                    onChange={(e) => setEditingRecord({ ...editingRecord, jobTitle: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={editingRecord.location}
                    onChange={(e) => setEditingRecord({ ...editingRecord, location: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employment Type</label>
                  <select
                    value={editingRecord.employmentType}
                    onChange={(e) => setEditingRecord({ ...editingRecord, employmentType: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="full-time">Full-time</option>
                    <option value="part-time">Part-time</option>
                    <option value="contract">Contract</option>
                    <option value="freelance">Freelance</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={editingRecord.startDate}
                    onChange={(e) => setEditingRecord({ ...editingRecord, startDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={editingRecord.endDate}
                    onChange={(e) => setEditingRecord({ ...editingRecord, endDate: e.target.value })}
                    disabled={editingRecord.current}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white disabled:bg-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editingRecord.current}
                  onChange={(e) => setEditingRecord({ ...editingRecord, current: e.target.checked })}
                  className="rounded"
                />
                <span className="text-gray-700">I currently work here</span>
              </label>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Responsibilities</label>
                <textarea
                  value={editingRecord.responsibilities}
                  onChange={(e) => setEditingRecord({ ...editingRecord, responsibilities: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows={4}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Key Achievements</label>
                <textarea
                  value={editingRecord.achievements}
                  onChange={(e) => setEditingRecord({ ...editingRecord, achievements: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Salary (optional)</label>
                  <input
                    type="text"
                    value={editingRecord.salary}
                    onChange={(e) => setEditingRecord({ ...editingRecord, salary: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pension Scheme (optional)</label>
                  <input
                    type="text"
                    value={editingRecord.pensionScheme}
                    onChange={(e) => setEditingRecord({ ...editingRecord, pensionScheme: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-4 border-t">
                <button
                  onClick={updateRecord}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setEditingRecord(null)}
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
