import { useState, useEffect } from 'react';
import { X, Plus, Trash, Briefcase, Calendar, Edit, FileText, Key } from 'lucide-react';
import { encrypt, decrypt } from '../../utils/crypto';

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
  masterPassword: string;
}

export function EmploymentManagerSecure({ onClose, masterPassword }: EmploymentManagerSecureProps) {
  const [records, setRecords] = useState<EmploymentRecord[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [newRecord, setNewRecord] = useState({
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
  });

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    try {
      setIsLoading(true);
      const stored = localStorage.getItem('employment_records_encrypted');
      if (stored) {
        const encryptedData = JSON.parse(stored);
        const decryptedRecords: EmploymentRecord[] = [];

        for (const encryptedRecord of encryptedData) {
          try {
            const decryptedJson = await decrypt(encryptedRecord.data, masterPassword);
            const record = JSON.parse(decryptedJson);
            decryptedRecords.push(record);
          } catch (err) {
            console.error('Failed to decrypt employment record:', err);
          }
        }

        setRecords(decryptedRecords);
      }
    } catch (err) {
      setError('Failed to load encrypted data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const saveRecords = async (newRecords: EmploymentRecord[]) => {
    try {
      const encryptedRecords = [];

      for (const record of newRecords) {
        const recordJson = JSON.stringify(record);
        const encryptedData = await encrypt(recordJson, masterPassword);
        encryptedRecords.push({
          id: record.id,
          data: encryptedData
        });
      }

      localStorage.setItem('employment_records_encrypted', JSON.stringify(encryptedRecords));
      setRecords(newRecords);
    } catch (err) {
      setError('Failed to save encrypted data');
      console.error(err);
    }
  };

  const addRecord = () => {
    if (!newRecord.company.trim() || !newRecord.jobTitle.trim()) return;

    const record: EmploymentRecord = {
      id: Date.now().toString(),
      ...newRecord
    };

    saveRecords([record, ...records]);
    setNewRecord({
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
      employmentType: 'full-time'
    });
    setShowAddForm(false);
  };

  const deleteRecord = (id: string) => {
    saveRecords(records.filter(record => record.id !== id));
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-green-600 to-indigo-600 text-white rounded-xl relative">
                <Briefcase className="w-6 h-6" />
                <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-1">
                  <Key className="w-3 h-3 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-gray-900 flex items-center gap-2">
                  Employment History
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">Encrypted</span>
                </h2>
                <p className="text-sm text-gray-500 mt-1">Track your career journey, roles, and pension details</p>
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

        <div className="flex-1 overflow-y-auto p-6">
          {showAddForm ? (
            <div className="mb-6 p-6 bg-gray-50 rounded-xl">
              <h3 className="mb-4">Add Employment Record</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={newRecord.company}
                    onChange={(e) => setNewRecord({ ...newRecord, company: e.target.value })}
                    placeholder="Company name..."
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="text"
                    value={newRecord.jobTitle}
                    onChange={(e) => setNewRecord({ ...newRecord, jobTitle: e.target.value })}
                    placeholder="Job title..."
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="text"
                    value={newRecord.location}
                    onChange={(e) => setNewRecord({ ...newRecord, location: e.target.value })}
                    placeholder="Location..."
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <select
                    value={newRecord.employmentType}
                    onChange={(e) => setNewRecord({ ...newRecord, employmentType: e.target.value as any })}
                    className="px-4 py-2 border border-gray-300 rounded-lg"
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">End Date</label>
                    <input
                      type="date"
                      value={newRecord.endDate}
                      onChange={(e) => setNewRecord({ ...newRecord, endDate: e.target.value })}
                      disabled={newRecord.current}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  rows={4}
                />

                <textarea
                  value={newRecord.achievements}
                  onChange={(e) => setNewRecord({ ...newRecord, achievements: e.target.value })}
                  placeholder="Key achievements..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={newRecord.salary}
                    onChange={(e) => setNewRecord({ ...newRecord, salary: e.target.value })}
                    placeholder="Salary (optional)..."
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="text"
                    value={newRecord.pensionScheme}
                    onChange={(e) => setNewRecord({ ...newRecord, pensionScheme: e.target.value })}
                    placeholder="Pension scheme (optional)..."
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={addRecord}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Add Record
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
              className="w-full mb-6 p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 text-gray-600 hover:text-indigo-600"
            >
              <Plus className="w-5 h-5" />
              Add Employment Record
            </button>
          )}

          <div className="space-y-4">
            {records.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No employment records yet</p>
                <p className="text-sm mt-2">Start building your career history</p>
              </div>
            ) : (
              records.map((record) => (
                <div
                  key={record.id}
                  className="bg-gray-50 rounded-xl overflow-hidden hover:bg-gray-100 transition-colors"
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-start gap-3">
                          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
                            <Briefcase className="w-6 h-6" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-gray-900 mb-1">{record.jobTitle}</h3>
                            <p className="text-gray-700">{record.company}</p>
                            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                <span>
                                  {record.startDate} - {record.current ? 'Present' : record.endDate}
                                </span>
                              </div>
                              {(record.startDate || record.endDate) && (
                                <span className="text-indigo-600">
                                  • {calculateDuration(record.startDate, record.endDate, record.current)}
                                </span>
                              )}
                              {record.current && (
                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                                  Current
                                </span>
                              )}
                            </div>
                            {record.location && (
                              <p className="text-sm text-gray-500 mt-1">{record.location}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setExpandedRecord(expandedRecord === record.id ? null : record.id)}
                          className="p-2 hover:bg-white rounded-lg transition-colors text-gray-600"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteRecord(record.id)}
                          className="p-2 hover:bg-white rounded-lg transition-colors text-red-600"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {expandedRecord === record.id && (
                      <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                        {record.responsibilities && (
                          <div>
                            <p className="text-sm text-gray-500 mb-1">Responsibilities:</p>
                            <p className="text-sm text-gray-700 whitespace-pre-line">{record.responsibilities}</p>
                          </div>
                        )}
                        {record.achievements && (
                          <div>
                            <p className="text-sm text-gray-500 mb-1">Key Achievements:</p>
                            <p className="text-sm text-gray-700 whitespace-pre-line">{record.achievements}</p>
                          </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {record.salary && (
                            <div>
                              <p className="text-sm text-gray-500 mb-1">Salary:</p>
                              <p className="text-sm text-gray-700">{record.salary}</p>
                            </div>
                          )}
                          {record.pensionScheme && (
                            <div>
                              <p className="text-sm text-gray-500 mb-1">Pension Scheme:</p>
                              <p className="text-sm text-gray-700">{record.pensionScheme}</p>
                            </div>
                          )}
                        </div>
                        <div className="pt-2">
                          <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded">
                            {record.employmentType.charAt(0).toUpperCase() + record.employmentType.slice(1)}
                          </span>
                        </div>
                      </div>
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
