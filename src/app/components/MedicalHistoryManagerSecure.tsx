import { useState, useEffect } from 'react';
import { X, Plus, Trash, Heart, Calendar, Edit2, Key, FileText, ExternalLink, Hospital, Stethoscope, Search, AlertCircle, Upload, Eye, EyeOff, Download } from 'lucide-react';
import { useStorage, useDocumentService } from '../../contexts/StorageContext';
import { DocumentReference } from '../../services/document-service';

interface MedicalRecord {
  id: string;
  date: string;
  type: 'consultation' | 'test' | 'procedure' | 'prescription' | 'scan' | 'other';
  specialty: string; // e.g., Cardiology, Gastroenterology, Orthopedics
  provider: string; // Doctor name or hospital
  condition: string;
  notes: string;
  treatment: string;
  outcome: string;
  attachments: string[]; // Legacy: Filenames only (for backwards compatibility)
  documents?: DocumentReference[]; // Document references (stored separately, loaded on-demand)
}

interface MedicalHistoryManagerSecureProps {
  onClose: () => void;
}

const emptyRecord = {
  date: '',
  type: 'consultation' as const,
  specialty: '',
  provider: '',
  condition: '',
  notes: '',
  treatment: '',
  outcome: '',
  attachments: [],
  documents: []
};

export function MedicalHistoryManagerSecure({ onClose }: MedicalHistoryManagerSecureProps) {
  const storage = useStorage();
  const documentService = useDocumentService();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MedicalRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [newRecord, setNewRecord] = useState(emptyRecord);
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingDocument, setViewingDocument] = useState<{ docRef: DocumentReference; dataUrl: string; blobUrl: string } | null>(null);
  const [loadingDocument, setLoadingDocument] = useState(false);
  const [showSummary, setShowSummary] = useState(true);

  useEffect(() => {
    loadRecords();
  }, []);

  useEffect(() => {
    if (showAddForm) {
      // Save scroll position before scrolling to top
      const scrollableDiv = document.querySelector('.medical-history-list');
      if (scrollableDiv) {
        setScrollPosition(scrollableDiv.scrollTop);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Restore scroll position when closing add form
      const scrollableDiv = document.querySelector('.medical-history-list');
      if (scrollableDiv && scrollPosition > 0) {
        scrollableDiv.scrollTop = scrollPosition;
      }
    }
  }, [showAddForm]);

  useEffect(() => {
    if (editingRecord) {
      // Save scroll position when opening edit modal
      const scrollableDiv = document.querySelector('.medical-history-list');
      if (scrollableDiv) {
        setScrollPosition(scrollableDiv.scrollTop);
      }
    } else if (scrollPosition > 0) {
      // Restore scroll position when closing edit modal
      setTimeout(() => {
        const scrollableDiv = document.querySelector('.medical-history-list');
        if (scrollableDiv) {
          scrollableDiv.scrollTop = scrollPosition;
        }
      }, 0);
    }
  }, [editingRecord]);

  const loadRecords = async () => {
    try {
      setIsLoading(true);
      setError('');
      console.log('Loading medical records from medical_history...');
      const data = await storage.get<MedicalRecord>('medical_history');
      console.log(`Loaded ${data.length} medical records`);

      // Debug: Check what attachments look like
      const recordsWithAttachments = data.filter(r => r.attachments && r.attachments.length > 0);
      if (recordsWithAttachments.length > 0) {
        console.log(`Found ${recordsWithAttachments.length} records with attachments`);
        console.log('Sample attachment data:', recordsWithAttachments[0].attachments[0]?.substring(0, 100));
      }

      setRecords(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(`Failed to load medical records: ${errorMsg}`);
      console.error('Error loading medical records:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const addRecord = async () => {
    if (!newRecord.date || !newRecord.condition.trim()) return;

    try {
      setError('');
      const record: MedicalRecord = {
        id: Date.now().toString(),
        ...newRecord
      };

      await storage.add('medical_history', record);
      await loadRecords();
      setNewRecord(emptyRecord);
      setShowAddForm(false);
    } catch (err) {
      setError('Failed to add record');
      console.error(err);
    }
  };

  const updateRecord = async () => {
    if (!editingRecord || !editingRecord.date || !editingRecord.condition.trim()) return;

    try {
      setError('');
      await storage.update('medical_history', editingRecord.id, editingRecord);
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
        await documentService.deleteDocuments('medical', record.documents);
      }

      // Delete the record
      await storage.delete('medical_history', id);
      await loadRecords();
      if (expandedRecord === id) setExpandedRecord(null);
    } catch (err) {
      setError('Failed to delete record');
      console.error(err);
    }
  };

  const startEdit = (record: MedicalRecord) => {
    setEditingRecord({ ...record });
    setExpandedRecord(null);
  };

  const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const byteCharacters = atob(base64.split(',')[1] || base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  };

  // Convert data URL to Blob URL for better iframe rendering (especially for large PDFs)
  const dataUrlToBlobUrl = (dataUrl: string): string => {
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      console.error('Invalid data URL format');
      return dataUrl;
    }
    const mimeType = match[1];
    const base64Data = match[2];
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: mimeType });
    return URL.createObjectURL(blob);
  };

  const viewFile = async (docRef: DocumentReference) => {
    if (!docRef) {
      console.error('No document reference available');
      setError('Document reference is missing');
      return;
    }

    // Clean up any existing blob URL
    if (viewingDocument?.blobUrl) {
      URL.revokeObjectURL(viewingDocument.blobUrl);
    }

    try {
      setLoadingDocument(true);
      setError('');

      // Load document on-demand from separate encrypted file
      const dataUrl = await documentService.loadDocument('medical', docRef);
      const blobUrl = dataUrlToBlobUrl(dataUrl);

      setViewingDocument({ docRef, dataUrl, blobUrl });
    } catch (err) {
      console.error('Failed to load document:', err);
      setError(`Failed to load document: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoadingDocument(false);
    }
  };

  const downloadFile = async (docRef: DocumentReference) => {
    if (!docRef) {
      setError('Document reference is missing');
      return;
    }

    try {
      setError('');
      const dataUrl = await documentService.loadDocument('medical', docRef);
      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        setError('Invalid file data format');
        return;
      }

      const mimeType = match[1];
      const base64Data = match[2];
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = docRef.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download file');
      console.error('Download error:', err);
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
          const docRef = await documentService.saveDocument('medical', file.name, base64, uploadDate);

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
          await documentService.deleteDocument('medical', docToRemove);
        }

        docs.splice(index, 1);
        setEditingRecord({ ...editingRecord, documents: docs });
      } else {
        const docs = [...(newRecord.documents || [])];
        const docToRemove = docs[index];

        // Delete the document file
        if (docToRemove) {
          await documentService.deleteDocument('medical', docToRemove);
        }

        docs.splice(index, 1);
        setNewRecord({ ...newRecord, documents: docs });
      }
    } catch (err) {
      console.error('Failed to remove document:', err);
      setError('Failed to remove document');
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'consultation':
        return 'bg-blue-100 text-blue-700';
      case 'test':
        return 'bg-purple-100 text-purple-700';
      case 'procedure':
        return 'bg-red-100 text-red-700';
      case 'prescription':
        return 'bg-green-100 text-green-700';
      case 'scan':
        return 'bg-indigo-100 text-indigo-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'consultation':
        return 'Consultation';
      case 'test':
        return 'Test';
      case 'procedure':
        return 'Procedure';
      case 'prescription':
        return 'Prescription';
      case 'scan':
        return 'Scan';
      default:
        return 'Other';
    }
  };

  const sortedRecords = [...records].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  // Filter records based on search query
  const filteredRecords = sortedRecords.filter(record => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      record.condition.toLowerCase().includes(query) ||
      record.notes.toLowerCase().includes(query) ||
      record.specialty.toLowerCase().includes(query) ||
      record.provider.toLowerCase().includes(query) ||
      record.type.toLowerCase().includes(query) ||
      record.treatment.toLowerCase().includes(query) ||
      record.outcome.toLowerCase().includes(query) ||
      record.date.includes(query)
    );
  });

  // Extract facility from provider string
  const extractFacility = (provider: string): string => {
    if (!provider) return '';

    // Map known patterns to facilities
    if (provider.includes('Spire Harpenden')) return 'Spire Harpenden';
    if (provider.includes('Bishops Wood')) return 'Bishops Wood Hospital';
    if (provider.includes('OSD Healthcare') || provider.includes('OSD')) return 'OSD Healthcare';
    if (provider.includes('West Hertfordshire Hospitals NHS Trust')) return 'West Hertfordshire Hospitals NHS Trust';
    if (provider.includes('AXA')) return 'AXA Health Insurance';
    if (provider.includes('Lincoln House')) return 'Lincoln House Surgery';
    if (provider.includes('Doctors Laboratory') || provider.includes('TDL')) return 'The Doctors Laboratory';
    if (provider.includes('Kardia') || provider.includes('Home')) return 'Home Monitoring';
    if (provider.includes('NHS')) return 'NHS';

    // For individual consultants, extract their organization if mentioned after a dash
    const parts = provider.split(' - ');
    if (parts.length > 1) {
      // Return the part after the dash (organization/facility)
      return parts[1].trim();
    }

    // Generic fallback
    if (provider.includes('Hospital') || provider.includes('Imaging')) return 'Hospital Services';
    if (provider.includes('GP')) return 'GP Services';

    return 'Other';
  };

  const specialties = [...new Set(filteredRecords.map(r => r.specialty).filter(Boolean))];
  const facilities = [...new Set(filteredRecords.map(r => extractFacility(r.provider)).filter(Boolean))];

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Decrypting your medical history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 overflow-hidden">
      <div className="absolute inset-2 bg-white rounded-2xl flex flex-col shadow-2xl">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-red-50 to-pink-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-red-600 to-pink-600 text-white rounded-xl relative">
                <Heart className="w-6 h-6" />
                <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-1">
                  <Key className="w-3 h-3 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-gray-900 flex items-center gap-2">
                  Medical History
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">Encrypted</span>
                </h2>
                <p className="text-sm text-gray-500 mt-1">Track consultations, tests, treatments, and medical records</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSummary(!showSummary)}
                className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg hover:bg-red-50 transition-colors"
                title={showSummary ? 'Hide summary cards' : 'Show summary cards'}
              >
                {showSummary ? <EyeOff className="w-4 h-4 text-red-600" /> : <Eye className="w-4 h-4 text-red-600" />}
              </button>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-2 px-4 py-2 bg-white text-red-600 rounded-lg hover:bg-red-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Record
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white rounded-lg transition-colors"
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
        <div className="px-6 py-3 bg-gradient-to-br from-red-50 to-pink-50 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                  <Heart className="w-5 h-5" />
                </div>
                <p className="text-sm text-gray-600">Total Records</p>
              </div>
              <p className="text-gray-900">{filteredRecords.length}</p>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <p className="text-sm text-gray-600">Specialties</p>
              </div>
              <p className="text-gray-900">{specialties.length}</p>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <Hospital className="w-5 h-5" />
                </div>
                <p className="text-sm text-gray-600">Facilities</p>
              </div>
              <p className="text-gray-900">{facilities.length}</p>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                  <FileText className="w-5 h-5" />
                </div>
                <p className="text-sm text-gray-600">Attachments</p>
              </div>
              <p className="text-gray-900">{filteredRecords.reduce((sum, r) => sum + ((r.documents?.length || 0) + (r.attachments?.length || 0)), 0)}</p>
            </div>
          </div>
        </div>
        )}

        <div className="px-6 py-3 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search medical records..."
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
        </div>

        <div className="flex-1 overflow-y-auto p-6 medical-history-list">
          {showAddForm && (
            <div className="mb-6 p-6 rounded-xl bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-200">
              <h3 className="mb-4">Add Medical Record</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={newRecord.date}
                      onChange={(e) => setNewRecord({ ...newRecord, date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      value={newRecord.type}
                      onChange={(e) => setNewRecord({ ...newRecord, type: e.target.value as any })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                    >
                      <option value="consultation">Consultation</option>
                      <option value="test">Test</option>
                      <option value="procedure">Procedure</option>
                      <option value="prescription">Prescription</option>
                      <option value="scan">Scan</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <input
                    type="text"
                    value={newRecord.specialty}
                    onChange={(e) => setNewRecord({ ...newRecord, specialty: e.target.value })}
                    placeholder="Specialty (e.g., Cardiology)..."
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  />
                  <input
                    type="text"
                    value={newRecord.provider}
                    onChange={(e) => setNewRecord({ ...newRecord, provider: e.target.value })}
                    placeholder="Doctor/Hospital..."
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  />
                </div>
                <input
                  type="text"
                  value={newRecord.condition}
                  onChange={(e) => setNewRecord({ ...newRecord, condition: e.target.value })}
                  placeholder="Condition/Reason for visit..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                />
                <textarea
                  value={newRecord.notes}
                  onChange={(e) => setNewRecord({ ...newRecord, notes: e.target.value })}
                  placeholder="Notes..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  rows={3}
                />
                <input
                  type="text"
                  value={newRecord.treatment}
                  onChange={(e) => setNewRecord({ ...newRecord, treatment: e.target.value })}
                  placeholder="Treatment/Medication..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                />
                <input
                  type="text"
                  value={newRecord.outcome}
                  onChange={(e) => setNewRecord({ ...newRecord, outcome: e.target.value })}
                  placeholder="Outcome..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                />

                {/* Document upload section */}
                <div className="space-y-2">
                  {newRecord.documents && newRecord.documents.length > 0 && (
                    <div className="space-y-2">
                      {newRecord.documents.map((doc, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-green-50 p-2 rounded">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-green-600" />
                            <span className="text-sm">{doc.filename}</span>
                          </div>
                          <button
                            onClick={() => removeDocument(idx, false)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

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

                <div className="flex items-center gap-2">
                  <button
                    onClick={addRecord}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
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
          )}

          <div className="space-y-4">
            {sortedRecords.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Heart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No medical records yet</p>
                <p className="text-sm mt-2">Start tracking your medical history</p>
              </div>
            ) : (
              filteredRecords.map((record) => (
                <div
                  key={record.id}
                  className="bg-gray-50 rounded-xl overflow-hidden hover:bg-gray-100 transition-colors"
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-start gap-3">
                          <div className="p-3 bg-red-100 text-red-600 rounded-lg">
                            <Heart className="w-6 h-6" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-gray-900">{record.condition}</h3>
                              <span className={`inline-block px-2 py-1 rounded text-xs ${getTypeColor(record.type)}`}>
                                {getTypeLabel(record.type)}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                <span>{record.date}</span>
                              </div>
                              {record.specialty && (
                                <span className="text-purple-600">• {record.specialty}</span>
                              )}
                              {record.provider && (
                                <span className="text-blue-600">• {record.provider}</span>
                              )}
                            </div>
                            {expandedRecord === record.id && (
                              <div className="mt-4 space-y-3 text-sm">
                                {record.notes && (
                                  <div>
                                    <p className="text-gray-500 font-medium mb-1">Notes:</p>
                                    <p className="text-gray-700 whitespace-pre-line">{record.notes}</p>
                                  </div>
                                )}
                                {record.treatment && (
                                  <div>
                                    <p className="text-gray-500 font-medium mb-1">Treatment:</p>
                                    <p className="text-gray-700">{record.treatment}</p>
                                  </div>
                                )}
                                {record.outcome && (
                                  <div>
                                    <p className="text-gray-500 font-medium mb-1">Outcome:</p>
                                    <p className="text-gray-700">{record.outcome}</p>
                                  </div>
                                )}
                                {/* New documents with embedded data */}
                                {record.documents && record.documents.length > 0 && (
                                  <div>
                                    <p className="text-gray-500 font-medium mb-2">Documents:</p>
                                    <div className="flex flex-wrap gap-2">
                                      {record.documents.map((doc, idx) => (
                                        <button
                                          key={idx}
                                          onClick={() => {
                                            console.log('CLICK HANDLER FIRED for:', doc.filename);
                                            viewFile(doc);
                                          }}
                                          className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors text-xs"
                                        >
                                          <FileText className="w-3 h-3" />
                                          {doc.filename}
                                          <ExternalLink className="w-3 h-3" />
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Legacy attachments (filename only - needs re-upload) */}
                                {record.attachments && record.attachments.length > 0 && (!record.documents || record.documents.length === 0) && (
                                  <div>
                                    <p className="text-gray-500 font-medium mb-2">Legacy Attachments (document data missing):</p>
                                    <div className="flex flex-wrap gap-2">
                                      {record.attachments.map((file, idx) => (
                                        <div
                                          key={idx}
                                          className="flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 rounded text-xs"
                                          title="Document needs to be re-uploaded"
                                        >
                                          <FileText className="w-3 h-3" />
                                          {file}
                                          <AlertCircle className="w-3 h-3" />
                                        </div>
                                      ))}
                                    </div>
                                    <p className="text-xs text-amber-600 mt-1">Click Edit to re-upload these documents</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setExpandedRecord(expandedRecord === record.id ? null : record.id)}
                          className="p-2 hover:bg-white rounded-lg transition-colors text-gray-600"
                          title="View details"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
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
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-green-600" />
                Edit Medical Record
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={editingRecord.date}
                    onChange={(e) => setEditingRecord({ ...editingRecord, date: e.target.value })}
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
                    <option value="consultation">Consultation</option>
                    <option value="test">Test</option>
                    <option value="procedure">Procedure</option>
                    <option value="prescription">Prescription</option>
                    <option value="scan">Scan</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Specialty</label>
                  <input
                    type="text"
                    value={editingRecord.specialty}
                    onChange={(e) => setEditingRecord({ ...editingRecord, specialty: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Doctor/Hospital</label>
                  <input
                    type="text"
                    value={editingRecord.provider}
                    onChange={(e) => setEditingRecord({ ...editingRecord, provider: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Condition/Reason</label>
                <input
                  type="text"
                  value={editingRecord.condition}
                  onChange={(e) => setEditingRecord({ ...editingRecord, condition: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={editingRecord.notes}
                  onChange={(e) => setEditingRecord({ ...editingRecord, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows={4}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Treatment/Medication</label>
                <input
                  type="text"
                  value={editingRecord.treatment}
                  onChange={(e) => setEditingRecord({ ...editingRecord, treatment: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Outcome</label>
                <input
                  type="text"
                  value={editingRecord.outcome}
                  onChange={(e) => setEditingRecord({ ...editingRecord, outcome: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* Document upload section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Documents</label>

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
            </div>

            <div className="flex items-center justify-between gap-2 mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this medical record?')) {
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

      {/* PDF Viewer Modal */}
      {viewingDocument && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.9)',
            zIndex: 10000,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div className="p-4 flex justify-between items-center bg-[#1a1a1a]">
            <h3 className="text-white font-medium truncate mr-4">{viewingDocument.docRef.filename}</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => downloadFile(viewingDocument.docRef)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="Download"
              >
                <Download className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={() => {
                  if (viewingDocument.blobUrl) {
                    URL.revokeObjectURL(viewingDocument.blobUrl);
                  }
                  setViewingDocument(null);
                }}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="Close"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
          <iframe
            src={viewingDocument.blobUrl}
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
