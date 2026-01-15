import { useState, useEffect } from 'react';
import { X, Plus, Trash, GraduationCap, Calendar, Edit2, Award, Key, ChevronDown, ChevronUp, FileText, ExternalLink, Upload } from 'lucide-react';
import { useStorage, useDocumentService } from '../../contexts/StorageContext';
import { DocumentReference } from '../../services/document-service';

interface EducationRecord {
  id: string;
  qualification: string;
  institution: string;
  year: string;
  grade: string;
  type: 'degree' | 'a-level' | 'o-level' | 'certification' | 'training';
  notes: string;
  documentPaths?: string[]; // Legacy: Filenames only
  documents?: DocumentReference[]; // Document references (stored separately, loaded on-demand)
}

interface EducationManagerSecureProps {
  onClose: () => void;
}

const emptyRecord = {
  qualification: '',
  institution: '',
  year: '',
  grade: '',
  type: 'certification' as const,
  notes: '',
  documents: [] as DocumentReference[]
};

// Note: availableDocuments array removed - documents are now stored as references
// and loaded on-demand from separate encrypted files

export function EducationManagerSecure({ onClose }: EducationManagerSecureProps) {
  const storage = useStorage();
  const documentService = useDocumentService();
  const [records, setRecords] = useState<EducationRecord[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<EducationRecord | null>(null);
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [newRecord, setNewRecord] = useState(emptyRecord);
  const [viewingDocument, setViewingDocument] = useState<{ docRef: DocumentReference; dataUrl: string } | null>(null);
  const [loadingDocument, setLoadingDocument] = useState(false);

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
      const data = await storage.get<EducationRecord>('education_records');
      setRecords(data);
    } catch (err) {
      setError('Failed to load data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const addRecord = async () => {
    if (!newRecord.qualification.trim() || !newRecord.institution.trim()) return;

    try {
      setError('');
      const record: EducationRecord = {
        id: Date.now().toString(),
        ...newRecord
      };

      await storage.add('education_records', record);
      await loadRecords();
      setNewRecord(emptyRecord);
      setShowAddForm(false);
    } catch (err) {
      setError('Failed to add record');
      console.error(err);
    }
  };

  const updateRecord = async () => {
    if (!editingRecord || !editingRecord.qualification.trim() || !editingRecord.institution.trim()) return;

    try {
      setError('');
      await storage.update('education_records', editingRecord.id, editingRecord);
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

      // Find the record to get its documents
      const record = records.find(r => r.id === id);

      // Delete associated document files
      if (record && record.documents && record.documents.length > 0) {
        await documentService.deleteDocuments('education', record.documents);
      }

      // Delete the record
      await storage.delete('education_records', id);
      await loadRecords();
      if (expandedRecord === id) setExpandedRecord(null);
    } catch (err) {
      setError('Failed to delete record');
      console.error(err);
    }
  };

  const startEdit = (record: EducationRecord) => {
    setEditingRecord({ ...record });
    setExpandedRecord(null);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'degree':
        return 'bg-purple-100 text-purple-700';
      case 'a-level':
        return 'bg-blue-100 text-blue-700';
      case 'o-level':
        return 'bg-cyan-100 text-cyan-700';
      case 'certification':
        return 'bg-green-100 text-green-700';
      case 'training':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'degree':
        return 'Degree';
      case 'a-level':
        return 'A-Level';
      case 'o-level':
        return 'O-Level';
      case 'certification':
        return 'Certification';
      case 'training':
        return 'Training';
      default:
        return type;
    }
  };

  const handleFileUpload = async (file: File, isEditing: boolean) => {
    try {
      setError('');

      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result as string;
          const uploadDate = new Date().toISOString();

          // Save document to separate encrypted file
          const docRef = await documentService.saveDocument('education', file.name, base64, uploadDate);

          if (isEditing && editingRecord) {
            setEditingRecord({
              ...editingRecord,
              documents: [...(editingRecord.documents || []), docRef]
            });
          } else {
            setNewRecord({
              ...newRecord,
              documents: [...(newRecord.documents || []), docRef]
            });
          }
        } catch (err) {
          console.error('Failed to save document:', err);
          setError('Failed to save document');
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Failed to upload file:', err);
      setError('Failed to upload document');
    }
  };

  const removeDocument = async (index: number, isEditing: boolean) => {
    try {
      setError('');

      if (isEditing && editingRecord) {
        const docs = [...(editingRecord.documents || [])];
        const docToRemove = docs[index];

        // Delete the document file
        if (docToRemove) {
          await documentService.deleteDocument('education', docToRemove);
        }

        docs.splice(index, 1);
        setEditingRecord({ ...editingRecord, documents: docs });
      } else {
        const docs = [...(newRecord.documents || [])];
        const docToRemove = docs[index];

        // Delete the document file
        if (docToRemove) {
          await documentService.deleteDocument('education', docToRemove);
        }

        docs.splice(index, 1);
        setNewRecord({ ...newRecord, documents: docs });
      }
    } catch (err) {
      console.error('Failed to remove document:', err);
      setError('Failed to remove document');
    }
  };

  const viewFile = async (docRef: DocumentReference) => {
    if (!docRef) {
      console.error('No document reference available');
      setError('Document reference is missing');
      return;
    }

    try {
      setLoadingDocument(true);
      setError('');

      // Load document on-demand from separate encrypted file
      const dataUrl = await documentService.loadDocument('education', docRef);

      setViewingDocument({ docRef, dataUrl });
    } catch (err) {
      console.error('Failed to load document:', err);
      setError(`Failed to load document: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoadingDocument(false);
    }
  };

  const counts = {
    degrees: records.filter(r => r.type === 'degree').length,
    certifications: records.filter(r => r.type === 'certification').length,
    training: records.filter(r => r.type === 'training').length,
    total: records.length
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Decrypting your education data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-purple-600 to-blue-600 text-white rounded-xl relative">
                <GraduationCap className="w-6 h-6" />
                <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-1">
                  <Key className="w-3 h-3 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-gray-900 flex items-center gap-2">
                  Education & Training
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">Encrypted</span>
                </h2>
                <p className="text-sm text-gray-500 mt-1">Track your qualifications, certifications, and training</p>
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

        <div className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <p className="text-sm text-gray-600">Degrees</p>
              </div>
              <p className="text-gray-900">{counts.degrees}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                  <Award className="w-5 h-5" />
                </div>
                <p className="text-sm text-gray-600">Certifications</p>
              </div>
              <p className="text-gray-900">{counts.certifications}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                  <Calendar className="w-5 h-5" />
                </div>
                <p className="text-sm text-gray-600">Training Courses</p>
              </div>
              <p className="text-gray-900">{counts.training}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                  <Award className="w-5 h-5" />
                </div>
                <p className="text-sm text-gray-600">Total Records</p>
              </div>
              <p className="text-gray-900">{counts.total}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {showAddForm ? (
            <div className="mb-6 p-6 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200">
              <h3 className="mb-4 flex items-center gap-2">Add Education Record</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={newRecord.qualification}
                    onChange={(e) => setNewRecord({ ...newRecord, qualification: e.target.value })}
                    placeholder="Qualification name..."
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  />
                  <input
                    type="text"
                    value={newRecord.institution}
                    onChange={(e) => setNewRecord({ ...newRecord, institution: e.target.value })}
                    placeholder="Institution/Provider..."
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  />
                  <input
                    type="text"
                    value={newRecord.year}
                    onChange={(e) => setNewRecord({ ...newRecord, year: e.target.value })}
                    placeholder="Year (e.g., 2020)..."
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  />
                  <input
                    type="text"
                    value={newRecord.grade}
                    onChange={(e) => setNewRecord({ ...newRecord, grade: e.target.value })}
                    placeholder="Grade/Result (optional)..."
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  />
                  <select
                    value={newRecord.type}
                    onChange={(e) => setNewRecord({ ...newRecord, type: e.target.value as any })}
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="degree">Degree</option>
                    <option value="a-level">A-Level</option>
                    <option value="o-level">O-Level</option>
                    <option value="certification">Certification</option>
                    <option value="training">Training</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Documents (optional)</label>

                  {/* Show existing documents */}
                  {newRecord.documents && newRecord.documents.length > 0 && (
                    <div className="mb-3 space-y-2">
                      {newRecord.documents.map((doc, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-green-50 p-2 rounded">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-green-600" />
                            <span className="text-sm">{doc.filename}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeDocument(idx, false)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Upload new document */}
                  <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-green-500 hover:bg-green-50 transition-colors">
                    <Upload className="w-4 h-4" />
                    <span className="text-sm">Upload Document (PDF)</span>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, false);
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
                <textarea
                  value={newRecord.notes}
                  onChange={(e) => setNewRecord({ ...newRecord, notes: e.target.value })}
                  placeholder="Additional notes (optional)..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  rows={3}
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={addRecord}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
              className="w-full mb-6 p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-all flex items-center justify-center gap-2 text-gray-600 hover:text-purple-600"
            >
              <Plus className="w-5 h-5" />
              Add Education Record
            </button>
          )}

          <div className="space-y-4">
            {records.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No education records yet</p>
                <p className="text-sm mt-2">Start tracking your qualifications and training</p>
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
                          <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
                            <GraduationCap className="w-6 h-6" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-gray-900 mb-1">{record.qualification}</h3>
                            <p className="text-gray-700 mb-2">{record.institution}</p>

                            {/* Display new embedded documents */}
                            {record.documents && record.documents.length > 0 && (
                              <div className="mb-2">
                                <div className="flex flex-wrap gap-2">
                                  {record.documents.map((doc, idx) => (
                                    <button
                                      key={idx}
                                      onClick={() => viewFile(doc)}
                                      className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors text-xs"
                                    >
                                      <FileText className="w-3 h-3" />
                                      {doc.filename}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Show legacy attachment warning if no documents */}
                            {record.documentPaths && record.documentPaths.length > 0 && (!record.documents || record.documents.length === 0) && (
                              <div className="mb-2">
                                <p className="text-xs text-amber-600 mb-1">Legacy attachments (document data missing):</p>
                                <div className="flex flex-wrap gap-2">
                                  {record.documentPaths.map((path, idx) => (
                                    <div key={idx} className="flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 rounded text-xs">
                                      <FileText className="w-3 h-3" />
                                      {path.split('/').pop()}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-600">
                              {record.year && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  <span>{record.year}</span>
                                </div>
                              )}
                              {record.grade && (
                                <span className="text-purple-600">• {record.grade}</span>
                              )}
                              <span className={`px-2 py-1 rounded text-xs ${getTypeColor(record.type)}`}>
                                {getTypeLabel(record.type)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {record.notes && (
                          <button
                            onClick={() => setExpandedRecord(expandedRecord === record.id ? null : record.id)}
                            className="p-2 hover:bg-white rounded-lg transition-colors text-gray-600"
                            title="View notes"
                          >
                            {expandedRecord === record.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        )}
                        <button
                          onClick={() => startEdit(record)}
                          className="p-2 hover:bg-white rounded-lg transition-colors text-blue-600"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteRecord(record.id)}
                          className="p-2 hover:bg-white rounded-lg transition-colors text-red-600"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {expandedRecord === record.id && record.notes && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-sm text-gray-500 mb-1">Notes:</p>
                        <p className="text-sm text-gray-700 whitespace-pre-line">{record.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingRecord && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-green-600" />
                Edit Education Record
              </h3>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Qualification</label>
                  <input
                    type="text"
                    value={editingRecord.qualification}
                    onChange={(e) => setEditingRecord({ ...editingRecord, qualification: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Institution/Provider</label>
                  <input
                    type="text"
                    value={editingRecord.institution}
                    onChange={(e) => setEditingRecord({ ...editingRecord, institution: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <input
                    type="text"
                    value={editingRecord.year}
                    onChange={(e) => setEditingRecord({ ...editingRecord, year: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grade/Result (optional)</label>
                  <input
                    type="text"
                    value={editingRecord.grade}
                    onChange={(e) => setEditingRecord({ ...editingRecord, grade: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={editingRecord.type}
                    onChange={(e) => setEditingRecord({ ...editingRecord, type: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="degree">Degree</option>
                    <option value="a-level">A-Level</option>
                    <option value="o-level">O-Level</option>
                    <option value="certification">Certification</option>
                    <option value="training">Training</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Documents (optional)</label>

                {/* Show existing documents */}
                {editingRecord.documents && editingRecord.documents.length > 0 && (
                  <div className="mb-3 space-y-2">
                    {editingRecord.documents.map((doc, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-green-50 p-2 rounded">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-green-600" />
                          <span className="text-sm">{doc.filename}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeDocument(idx, true)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload new document */}
                <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-green-500 hover:bg-green-50 transition-colors">
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">Upload Document (PDF)</span>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, true);
                    }}
                    className="hidden"
                  />
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea
                  value={editingRecord.notes}
                  onChange={(e) => setEditingRecord({ ...editingRecord, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this education record?')) {
                    deleteRecord(editingRecord.id);
                    setEditingRecord(null);
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={updateRecord}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {viewingDocument && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.9)',
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            padding: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#1a1a1a'
          }}>
            <h3 style={{ color: 'white', margin: 0 }}>{viewingDocument.docRef.filename}</h3>
            <button
              onClick={() => setViewingDocument(null)}
              style={{
                padding: '8px 16px',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Close
            </button>
          </div>
          <iframe
            src={viewingDocument.dataUrl}
            style={{ flex: 1, border: 'none', width: '100%' }}
            title={viewingDocument.docRef.filename}
          />
        </div>
      )}

      {/* Loading Document Modal */}
      {loadingDocument && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
            <span>Loading document...</span>
          </div>
        </div>
      )}
    </div>
  );
}
