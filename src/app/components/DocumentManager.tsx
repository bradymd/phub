import { useState, useEffect } from 'react';
import { X, Plus, Trash, Download, Upload, FileText } from 'lucide-react';

interface Document {
  id: string;
  name: string;
  category: string;
  uploadDate: string;
  size: string;
  fileType: string;
}

interface DocumentManagerProps {
  category: string;
  onClose: () => void;
}

export function DocumentManager({ category, onClose }: DocumentManagerProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [newDocName, setNewDocName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(`documents_${category}`);
    if (stored) {
      setDocuments(JSON.parse(stored));
    }
  }, [category]);

  const saveDocuments = (docs: Document[]) => {
    localStorage.setItem(`documents_${category}`, JSON.stringify(docs));
    setDocuments(docs);
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-gray-900">{category}</h2>
            <p className="text-sm text-gray-500 mt-1">Manage your {category.toLowerCase()} documents</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

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
