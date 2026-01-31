import { useState, useEffect } from 'react';
import { X, Plus, Trash, Download, Upload, FileText, Key, Edit, Search } from 'lucide-react';
import { useStorage } from '../../contexts/StorageContext';
import { PdfJsViewer } from './PdfJsViewer';
import { formatDate } from '../../utils/locale';

interface Document {
  id: string;
  name: string;
  category: string;
  uploadDate: string;
  size: number; // Size in bytes
  fileType: string; // MIME type
  fileData?: string; // Base64 encoded file content (will be encrypted)
  thumbnail?: string; // Base64 thumbnail for images
}

interface DocumentManagerSecureProps {
  category: string;
  onClose: () => void;
}

export function DocumentManagerSecure({ category, onClose }: DocumentManagerSecureProps) {
  const storage = useStorage();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [newDocName, setNewDocName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [viewingDoc, setViewingDoc] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Storage key based on category
  const storageKey = `documents_${category}`;

  useEffect(() => {
    loadDocuments();
  }, [category]);

  // Scroll to top when add or edit form opens
  useEffect(() => {
    if (showAddForm || editingDoc) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [showAddForm, editingDoc]);

  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await storage.get<Document>(storageKey);
      setDocuments(data);
    } catch (err) {
      setError('Failed to load documents');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const createThumbnail = (file: File): Promise<string | undefined> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        resolve(undefined);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxSize = 200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxSize) {
              height *= maxSize / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width *= maxSize / height;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = () => resolve(undefined);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(file);
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const addDocument = async () => {
    if (!newDocName.trim() || !selectedFile) {
      setError('Please provide a name and select a file');
      return;
    }

    try {
      setError('');
      setIsLoading(true);

      const fileData = await readFileAsBase64(selectedFile);
      const thumbnail = await createThumbnail(selectedFile);

      const newDoc: Document = {
        id: Date.now().toString(),
        name: newDocName,
        category,
        uploadDate: formatDate(new Date()),
        size: selectedFile.size,
        fileType: selectedFile.type,
        fileData,
        thumbnail
      };

      await storage.add(storageKey, newDoc);
      await loadDocuments();
      setNewDocName('');
      setSelectedFile(null);
      setShowAddForm(false);
    } catch (err) {
      setError('Failed to add document');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateDocument = async () => {
    if (!editingDoc || !editingDoc.name.trim()) return;

    try {
      setError('');
      await storage.update(storageKey, editingDoc.id, editingDoc);
      await loadDocuments();
      setEditingDoc(null);
      setShowEditForm(false);
    } catch (err) {
      setError('Failed to update document');
      console.error(err);
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      setError('');
      await storage.delete(storageKey, id);
      await loadDocuments();
    } catch (err) {
      setError('Failed to delete document');
      console.error(err);
    }
  };

  const startEdit = (doc: Document) => {
    setEditingDoc({ ...doc });
    setShowEditForm(true);
  };

  const downloadDocument = (doc: Document) => {
    if (!doc.fileData) {
      setError('No file data available for download');
      return;
    }

    try {
      const link = document.createElement('a');
      link.href = doc.fileData;
      const extension = doc.fileType.split('/')[1] || 'bin';
      link.download = `${doc.name}.${extension}`;
      link.click();
    } catch (err) {
      setError('Failed to download document');
      console.error(err);
    }
  };

  // Filter documents based on search query
  const filteredDocuments = documents.filter(doc => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      doc.name.toLowerCase().includes(query) ||
      doc.fileType.toLowerCase().includes(query)
    );
  });

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Decrypting your documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-xl relative">
                <FileText className="w-6 h-6" />
                <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-1">
                  <Key className="w-3 h-3 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-gray-900 flex items-center gap-2">
                  {category}
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">Encrypted</span>
                </h2>
                <p className="text-sm text-gray-500 mt-1">Manage your {category.toLowerCase()} documents</p>
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

        {/* Search Bar */}
        <div className="px-6 pt-4 pb-2 border-b border-gray-200 bg-gray-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
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
            Showing <span className="font-semibold">{filteredDocuments.length}</span> of <span className="font-semibold">{documents.length}</span> documents
            {searchQuery && <span className="text-blue-600 ml-1">• Searching for "{searchQuery}"</span>}
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          {showAddForm ? (
            <div className="mb-6 p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border-2 border-blue-200">
              <h3 className="mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" />
                Add New Document
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Document Name</label>
                  <input
                    type="text"
                    value={newDocName}
                    onChange={(e) => setNewDocName(e.target.value)}
                    placeholder="e.g., Birth Certificate, House Deed..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select File</label>
                  <div className="flex items-center gap-3">
                    <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer bg-white">
                      <Upload className="w-5 h-5 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {selectedFile ? selectedFile.name : 'Choose a file...'}
                      </span>
                      <input
                        type="file"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        accept="image/*,.pdf"
                        className="hidden"
                      />
                    </label>
                  </div>
                  {selectedFile && (
                    <div className="mt-2 text-xs text-gray-500">
                      Size: {formatFileSize(selectedFile.size)} • Type: {selectedFile.type}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={addDocument}
                    disabled={!newDocName.trim() || !selectedFile}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Upload Document
                  </button>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setNewDocName('');
                      setSelectedFile(null);
                    }}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : showEditForm && editingDoc ? (
            <div className="mb-6 p-4 bg-gradient-to-br from-green-50 to-blue-50 rounded-xl border-2 border-green-200">
              <h3 className="mb-3 flex items-center gap-2">
                <Edit className="w-5 h-5 text-green-600" />
                Edit Document
              </h3>
              <input
                type="text"
                value={editingDoc.name}
                onChange={(e) => setEditingDoc({ ...editingDoc, name: e.target.value })}
                placeholder="Document name..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3 bg-white"
                onKeyDown={(e) => e.key === 'Enter' && updateDocument()}
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={updateDocument}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => {
                    setShowEditForm(false);
                    setEditingDoc(null);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full mb-6 p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 text-gray-600 hover:text-blue-600"
            >
              <Upload className="w-5 h-5" />
              Upload New Document
            </button>
          )}

          <div className="space-y-3">
            {filteredDocuments.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{documents.length === 0 ? 'No documents yet' : 'No documents match your search'}</p>
              </div>
            ) : (
              filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group"
                >
                  <div
                    className="flex items-center gap-3 flex-1 cursor-pointer"
                    onClick={() => doc.fileData && setViewingDoc(doc)}
                  >
                    {doc.thumbnail ? (
                      <img
                        src={doc.thumbnail}
                        alt={doc.name}
                        className="w-12 h-12 rounded-lg object-cover border-2 border-blue-200"
                      />
                    ) : (
                      <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                        <FileText className="w-5 h-5" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-gray-900 group-hover:text-blue-600 transition-colors">{doc.name}</p>
                      <p className="text-sm text-gray-500">
                        {doc.uploadDate} • {formatFileSize(doc.size)} • {doc.fileType.split('/')[1]?.toUpperCase() || 'File'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => downloadDocument(doc)}
                      disabled={!doc.fileData}
                      className="p-2 hover:bg-white rounded-lg transition-colors text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => startEdit(doc)}
                      className="p-2 hover:bg-white rounded-lg transition-colors text-blue-600"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteDocument(doc.id)}
                      className="p-2 hover:bg-white rounded-lg transition-colors text-red-600"
                      title="Delete"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Document Viewer Modal */}
      {viewingDoc && viewingDoc.fileData && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="font-semibold text-gray-900">{viewingDoc.name}</h3>
                <p className="text-sm text-gray-500">
                  {formatFileSize(viewingDoc.size)} • {viewingDoc.fileType}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadDocument(viewingDoc)}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-600"
                  title="Download"
                >
                  <Download className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewingDoc(null)}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-gray-100 flex items-center justify-center p-4">
              {viewingDoc.fileType.startsWith('image/') ? (
                <img
                  src={viewingDoc.fileData}
                  alt={viewingDoc.name}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                />
              ) : viewingDoc.fileType === 'application/pdf' ? (
                <PdfJsViewer
                  src={viewingDoc.fileData || ''}
                  title={viewingDoc.name}
                />
              ) : (
                <div className="text-center text-gray-500">
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Preview not available for this file type</p>
                  <button
                    onClick={() => downloadDocument(viewingDoc)}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Download to view
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
