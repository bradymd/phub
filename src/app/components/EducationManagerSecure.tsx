import { useState, useEffect } from 'react';
import { X, Plus, Trash, GraduationCap, Calendar, Edit2, Award, Key, FileText, ExternalLink, Upload, Search, Eye, EyeOff, Grid3x3, List, ImagePlus, Download } from 'lucide-react';
import { useStorage, useDocumentService } from '../../contexts/StorageContext';
import { PdfJsViewer } from './PdfJsViewer';
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [newRecord, setNewRecord] = useState(emptyRecord);
  const [viewingDocument, setViewingDocument] = useState<{ docRef: DocumentReference; dataUrl: string; blobUrl: string } | null>(null);
  const [loadingDocument, setLoadingDocument] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSummary, setShowSummary] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [viewingDetails, setViewingDetails] = useState<EducationRecord | null>(null);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

  useEffect(() => {
    loadRecords();
  }, []);

  // Load thumbnails for all records that have them
  useEffect(() => {
    async function loadThumbnails() {
      const thumbMap: Record<string, string> = {};
      for (const record of records) {
        if (record.documents) {
          for (const doc of record.documents) {
            if (doc.thumbnailPath && !thumbnails[doc.id]) {
              try {
                const dataUrl = await documentService.loadThumbnail('education', doc.thumbnailPath);
                if (dataUrl) {
                  thumbMap[doc.id] = dataUrl;
                }
              } catch {}
            }
          }
        }
      }
      if (Object.keys(thumbMap).length > 0) {
        setThumbnails(prev => ({ ...prev, ...thumbMap }));
      }
    }
    if (records.length > 0) {
      loadThumbnails();
    }
  }, [records]);

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
    } catch (err) {
      setError('Failed to delete record');
      console.error(err);
    }
  };

  const startEdit = (record: EducationRecord) => {
    setEditingRecord({ ...record });
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
      const dataUrl = await documentService.loadDocument('education', docRef);
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
      // Load and decrypt the document
      const dataUrl = await documentService.loadDocument('education', docRef);

      // Extract MIME type and base64 data from data URL
      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        setError('Invalid file data format');
        return;
      }

      const mimeType = match[1];
      const base64Data = match[2];

      // Convert base64 to binary
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Create blob and download
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
      setError(`Failed to download: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error('Download error:', err);
    }
  };

  const regenerateThumb = async (docRef: DocumentReference, record: EducationRecord) => {
    try {
      setError('');
      const updatedRef = await documentService.regenerateThumbnail('education', docRef);

      // Update the record's documents array with the new reference
      const updatedDocs = (record.documents || []).map(d =>
        d.id === docRef.id ? updatedRef : d
      );
      const updatedRecord = { ...record, documents: updatedDocs };
      await storage.update('education_records', record.id, updatedRecord);

      // Update local state
      setRecords(prev => prev.map(r => r.id === record.id ? updatedRecord : r));

      // Load the new thumbnail
      if (updatedRef.thumbnailPath) {
        const dataUrl = await documentService.loadThumbnail('education', updatedRef.thumbnailPath);
        if (dataUrl) {
          setThumbnails(prev => ({ ...prev, [docRef.id]: dataUrl }));
        }
      }
    } catch (err) {
      setError(`Failed to generate thumbnail: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const filteredRecords = records.filter(record => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      record.qualification.toLowerCase().includes(query) ||
      record.institution.toLowerCase().includes(query) ||
      record.year.toLowerCase().includes(query) ||
      record.grade.toLowerCase().includes(query) ||
      record.notes.toLowerCase().includes(query)
    );
  });

  const counts = {
    degrees: filteredRecords.filter(r => r.type === 'degree').length,
    certifications: filteredRecords.filter(r => r.type === 'certification').length,
    training: filteredRecords.filter(r => r.type === 'training').length,
    total: filteredRecords.length
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
    <div className="fixed inset-0 bg-black/50 z-50 overflow-hidden">
      <div className="absolute inset-2 bg-white rounded-2xl flex flex-col shadow-2xl">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-500 to-purple-700 text-white rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 text-white rounded-xl relative">
                <GraduationCap className="w-6 h-6" />
                <div className="absolute -top-1 -right-1 bg-white/30 rounded-full p-1">
                  <Key className="w-3 h-3 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-white flex items-center gap-2 text-xl font-semibold">
                  Education & Training
                </h2>
                <p className="text-sm text-white/80 mt-1">Track your qualifications, certifications, and training</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent w-48"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
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
                className="p-2 bg-white/90 rounded-lg hover:bg-white transition-colors text-purple-600"
                title={showSummary ? "Hide summary" : "Show summary"}
              >
                {showSummary ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-2 px-4 py-2 bg-white text-purple-600 rounded-lg hover:bg-white/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-purple-700 rounded-lg transition-colors"
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
        )}

        <div className="flex-1 overflow-y-auto min-h-0 p-6" style={{ willChange: 'transform', transform: 'translateZ(0)' }}>
          {showAddForm && (
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
          )}

          {filteredRecords.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No education records yet</p>
              <p className="text-sm mt-2">Start tracking your qualifications and training</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="space-y-4">
              {filteredRecords.map((record) => (
                <div
                  key={record.id}
                  onClick={() => setViewingDetails(record)}
                  className="bg-gray-50 rounded-xl overflow-hidden hover:bg-gray-100 transition-colors cursor-pointer"
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

                            {/* Display documents with thumbnails */}
                            {record.documents && record.documents.length > 0 && (
                              <div className="mb-2">
                                <div className="flex flex-wrap gap-2">
                                  {record.documents.map((doc, idx) => (
                                    thumbnails[doc.id] ? (
                                      <img
                                        key={idx}
                                        src={thumbnails[doc.id]}
                                        alt={doc.filename}
                                        title={doc.filename}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          viewFile(doc);
                                        }}
                                        className="w-16 h-16 object-cover rounded-lg border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                                      />
                                    ) : (
                                      <div key={idx} className="flex items-center gap-1">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            viewFile(doc);
                                          }}
                                          className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors text-xs"
                                        >
                                          <FileText className="w-3 h-3" />
                                          {doc.filename}
                                        </button>
                                        {(doc.mimeType?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|tif|tiff)$/i.test(doc.filename)) && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              regenerateThumb(doc, record);
                                            }}
                                            title="Generate thumbnail"
                                            className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                                          >
                                            <ImagePlus className="w-3 h-3" />
                                          </button>
                                        )}
                                      </div>
                                    )
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
                        {record.documents && record.documents.length > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadFile(record.documents[0]);
                            }}
                            className="p-2 hover:bg-white rounded-lg transition-colors text-green-600"
                            title="Download document"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEdit(record);
                          }}
                          className="p-2 hover:bg-white rounded-lg transition-colors text-blue-600"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteRecord(record.id);
                          }}
                          className="p-2 hover:bg-white rounded-lg transition-colors text-red-600"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* List View */
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
              {filteredRecords.map((record) => (
                <div
                  key={record.id}
                  onClick={() => setViewingDetails(record)}
                  className="px-6 py-3 hover:bg-gray-50 transition-colors cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-2 rounded-lg bg-purple-50 text-purple-600 flex-shrink-0">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-gray-900 font-medium truncate">{record.qualification}</h3>
                        <span className={`inline-block px-2 py-0.5 rounded text-xs flex-shrink-0 ${
                          record.type === 'degree' ? 'bg-purple-100 text-purple-700' :
                          record.type === 'certification' ? 'bg-green-100 text-green-700' :
                          record.type === 'training' ? 'bg-orange-100 text-orange-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {record.type === 'a-level' ? 'A-Level' :
                           record.type === 'o-level' ? 'O-Level' :
                           record.type.charAt(0).toUpperCase() + record.type.slice(1)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-0.5">
                        <span className="truncate">{record.institution}</span>
                        {record.year && (
                          <span className="flex items-center gap-1 flex-shrink-0">
                            <Calendar className="w-3 h-3" />
                            {record.year}
                          </span>
                        )}
                        {record.grade && (
                          <span className="flex-shrink-0">Grade: {record.grade}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-4">
                    {record.documents && record.documents.length > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadFile(record.documents[0]);
                        }}
                        className="p-2 hover:bg-white rounded-lg transition-colors text-green-600"
                        title="Download document"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(record);
                      }}
                      className="p-2 hover:bg-white rounded-lg transition-colors text-blue-600"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteRecord(record.id);
                      }}
                      className="p-2 hover:bg-white rounded-lg transition-colors text-red-600"
                      title="Delete"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
          <PdfJsViewer
            src={viewingDocument.blobUrl}
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

      {/* Education Details Modal */}
      {viewingDetails && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4" onClick={() => setViewingDetails(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-purple-600" />
                Education Record Details
              </h3>
              <button
                onClick={() => setViewingDetails(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Qualification</label>
                <p className="text-gray-900 bg-gray-50 px-4 py-2 rounded-lg">{viewingDetails.qualification}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Institution/Provider</label>
                <p className="text-gray-900 bg-gray-50 px-4 py-2 rounded-lg">{viewingDetails.institution}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <p className="text-gray-900 bg-gray-50 px-4 py-2 rounded-lg">{viewingDetails.year || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grade/Result</label>
                  <p className="text-gray-900 bg-gray-50 px-4 py-2 rounded-lg">{viewingDetails.grade || '-'}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <p className={`inline-block px-3 py-1 rounded-lg text-sm ${
                  viewingDetails.type === 'degree' ? 'bg-purple-100 text-purple-700' :
                  viewingDetails.type === 'certification' ? 'bg-green-100 text-green-700' :
                  viewingDetails.type === 'training' ? 'bg-orange-100 text-orange-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {viewingDetails.type === 'a-level' ? 'A-Level' :
                   viewingDetails.type === 'o-level' ? 'O-Level' :
                   viewingDetails.type.charAt(0).toUpperCase() + viewingDetails.type.slice(1)}
                </p>
              </div>

              {viewingDetails.documents && viewingDetails.documents.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Attached Documents</label>
                  <div className="flex flex-wrap gap-2">
                    {viewingDetails.documents.map((doc, idx) => (
                      <button
                        key={idx}
                        onClick={() => viewFile(doc)}
                        className="flex items-center gap-1 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                      >
                        <FileText className="w-4 h-4" />
                        {doc.filename}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {viewingDetails.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <p className="text-gray-900 bg-gray-50 px-4 py-3 rounded-lg whitespace-pre-wrap">{viewingDetails.notes}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setViewingDetails(null);
                    startEdit(viewingDetails);
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
