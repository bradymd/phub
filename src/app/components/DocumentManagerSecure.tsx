import { useState, useEffect } from 'react';
import { X, Plus, Trash, Download, Upload, FileText, Key } from 'lucide-react';
import { encrypt, decrypt } from '../../utils/crypto';

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
  masterPassword: string;
}

export function DocumentManagerSecure({ category, onClose, masterPassword }: DocumentManagerSecureProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [newDocName, setNewDocName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDocuments();
  }, [category]);

  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      const stored = localStorage.getItem(`documents_${category}_encrypted`);
      if (stored) {
        const encryptedData = JSON.parse(stored);
        const decryptedDocs: Document[] = [];

        for (const encryptedDoc of encryptedData) {
          try {
            const decryptedJson = await decrypt(encryptedDoc.data, masterPassword);
            const doc = JSON.parse(decryptedJson);
            decryptedDocs.push(doc);
          } catch (err) {
            console.error('Failed to decrypt document:', err);
          }
        }

        setDocuments(decryptedDocs);
      }
    } catch (err) {
      setError('Failed to load encrypted documents');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const saveDocuments = async (docs: Document[]) => {
    try {
      const encryptedDocs = [];

      for (const doc of docs) {
        const docJson = JSON.stringify(doc);
        const encryptedData = await encrypt(docJson, masterPassword);
        encryptedDocs.push({
          id: doc.id,
          data: encryptedData
        });
      }

      localStorage.setItem(`documents_${category}_encrypted`, JSON.stringify(encryptedDocs));
      setDocuments(docs);
    } catch (err) {
      setError('Failed to save encrypted documents');
      console.error(err);
    }
  };

  const addDocument = () => {
    if (!newDocName.trim()) return;

    const newDoc: Document = {
      id: Date.now().toString(),
      name: newDocName,
      category,
      uploadDate: new Date().toLocaleDateString(),
      size: '2.4 MB',
      fileType: 'PDF'
    };

    saveDocuments([...documents, newDoc]);
    setNewDocName('');
    setShowAddForm(false);
  };

  const deleteDocument = (id: string) => {
    saveDocuments(documents.filter(doc => doc.id !== id));
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
            <div className="mb-6 p-4 bg-gray-50 rounded-xl">
              <h3 className="mb-3">Add New Document</h3>
              <input
                type="text"
                value={newDocName}
                onChange={(e) => setNewDocName(e.target.value)}
                placeholder="Document name..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3"
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
