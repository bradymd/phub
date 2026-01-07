import { useState, useEffect } from 'react';
import { X, Plus, Trash, Download, Upload, FileText, Key, Edit } from 'lucide-react';
import { useStorage } from '../../contexts/StorageContext';

interface Document {
  id: string;
  name: string;
  category: string;
  uploadDate: string;
  size: string;
  fileType: string;
}

interface DocumentManagerSecureProps {
  category: string;
  onClose: () => void;
}

export function DocumentManagerSecure({ category, onClose }: DocumentManagerSecureProps) {
  const storage = useStorage();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [newDocName, setNewDocName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Storage key based on category
  const storageKey = `documents_${category}`;

  useEffect(() => {
    loadDocuments();
  }, [category]);

  // Scroll to top when add or edit form opens
  useEffect(() => {
    if (showAddForm || editingDocument) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [showAddForm, editingDocument]);

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

  const addDocument = async () => {
    if (!newDocName.trim()) return;

    try {
      setError('');
      const newDoc: Document = {
        id: Date.now().toString(),
        name: newDocName,
        category,
        uploadDate: new Date().toLocaleDateString(),
        size: '2.4 MB',
        fileType: 'PDF'
      };

      await storage.add(storageKey, newDoc);
      await loadDocuments();
      setNewDocName('');
      setShowAddForm(false);
    } catch (err) {
      setError('Failed to add document');
      console.error(err);
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

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          {showAddForm ? (
            <div className="mb-6 p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border-2 border-blue-200">
              <h3 className="mb-3">Add New Document</h3>
              <input
                type="text"
                value={newDocName}
                onChange={(e) => setNewDocName(e.target.value)}
                placeholder="Document name..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3 bg-white"
                onKeyDown={(e) => e.key === 'Enter' && addDocument()}
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={addDocument}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Document
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
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
            {documents.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No documents yet</p>
              </div>
            ) : (
              documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-gray-900">{doc.name}</p>
                      <p className="text-sm text-gray-500">
                        {doc.uploadDate} • {doc.size} • {doc.fileType}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-white rounded-lg transition-colors text-gray-600">
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => startEdit(doc)}
                      className="p-2 hover:bg-white rounded-lg transition-colors text-blue-600"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteDocument(doc.id)}
                      className="p-2 hover:bg-white rounded-lg transition-colors text-red-600"
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
    </div>
  );
}
