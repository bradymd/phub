import { useState, useEffect } from 'react';
import { X, Plus, Trash, FolderPlus, Upload, FileText, Image as ImageIcon, Key, Edit, Search, File, AlertTriangle, HardDrive } from 'lucide-react';
import { useStorage } from '../../contexts/StorageContext';
import { PdfJsViewer } from './PdfJsViewer';
import { formatDate } from '../../utils/locale';

interface StoredFile {
  id: string;
  name: string;
  description: string;
  category: string;
  uploadDate: string;
  size: number;
  fileType: string;
  fileData?: string;
  thumbnail?: string;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

interface FilesManagerSecureProps {
  onClose: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const STORAGE_WARNING_THRESHOLD = 500 * 1024 * 1024; // 500MB

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'misc', name: 'Misc', color: 'gray' },
  { id: 'receipts', name: 'Receipts', color: 'green' },
  { id: 'photos', name: 'Photos', color: 'purple' },
];

const CATEGORY_COLORS: Record<string, string> = {
  gray: 'bg-gray-100 text-gray-700 border-gray-300',
  green: 'bg-green-100 text-green-700 border-green-300',
  purple: 'bg-purple-100 text-purple-700 border-purple-300',
  blue: 'bg-blue-100 text-blue-700 border-blue-300',
  red: 'bg-red-100 text-red-700 border-red-300',
  yellow: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  pink: 'bg-pink-100 text-pink-700 border-pink-300',
  indigo: 'bg-indigo-100 text-indigo-700 border-indigo-300',
};

export function FilesManagerSecure({ onClose }: FilesManagerSecureProps) {
  const storage = useStorage();
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingFile, setEditingFile] = useState<StoredFile | null>(null);
  const [viewingFile, setViewingFile] = useState<StoredFile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // New file form
  const [newFileName, setNewFileName] = useState('');
  const [newFileDescription, setNewFileDescription] = useState('');
  const [newFileCategory, setNewFileCategory] = useState('misc');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // New category form
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('blue');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (showAddForm || editingFile) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [showAddForm, editingFile]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError('');
      const filesData = await storage.get<StoredFile>('user_files');
      setFiles(filesData);

      // Load categories
      const categoriesData = await storage.get<Category>('file_categories');
      if (categoriesData.length > 0) {
        setCategories(categoriesData);
      } else {
        // Save default categories
        for (const cat of DEFAULT_CATEGORIES) {
          await storage.add('file_categories', cat);
        }
      }
    } catch (err) {
      setError('Failed to load files');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const getTotalStorage = (): number => {
    return files.reduce((total, file) => total + file.size, 0);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
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

  const addFile = async () => {
    if (!selectedFile) {
      setError('Please select a file');
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(`File too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}`);
      return;
    }

    try {
      setError('');
      setIsLoading(true);

      const fileData = await readFileAsBase64(selectedFile);
      const thumbnail = await createThumbnail(selectedFile);

      const newFile: StoredFile = {
        id: Date.now().toString(),
        name: newFileName || selectedFile.name,
        description: newFileDescription,
        category: newFileCategory,
        uploadDate: formatDate(new Date()),
        size: selectedFile.size,
        fileType: selectedFile.type,
        fileData,
        thumbnail
      };

      await storage.add('user_files', newFile);
      await loadData();

      // Reset form
      setNewFileName('');
      setNewFileDescription('');
      setSelectedFile(null);
      setShowAddForm(false);
    } catch (err) {
      setError('Failed to add file');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateFile = async () => {
    if (!editingFile) return;

    try {
      setError('');
      await storage.update('user_files', editingFile.id, editingFile);
      await loadData();
      setEditingFile(null);
      setShowEditForm(false);
    } catch (err) {
      setError('Failed to update file');
      console.error(err);
    }
  };

  const deleteFile = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return;

    try {
      setError('');
      await storage.delete('user_files', id);
      await loadData();
    } catch (err) {
      setError('Failed to delete file');
      console.error(err);
    }
  };

  const addCategory = async () => {
    if (!newCategoryName.trim()) {
      setError('Please enter a category name');
      return;
    }

    try {
      setError('');
      const newCat: Category = {
        id: newCategoryName.toLowerCase().replace(/\s+/g, '-'),
        name: newCategoryName,
        color: newCategoryColor
      };

      await storage.add('file_categories', newCat);
      setCategories([...categories, newCat]);
      setNewCategoryName('');
      setShowAddCategory(false);
    } catch (err) {
      setError('Failed to add category');
      console.error(err);
    }
  };

  const deleteCategory = async (catId: string) => {
    // Check if category has files
    const filesInCategory = files.filter(f => f.category === catId);
    if (filesInCategory.length > 0) {
      setError(`Cannot delete category with ${filesInCategory.length} files. Move or delete files first.`);
      return;
    }

    if (!window.confirm('Are you sure you want to delete this category?')) return;

    try {
      setError('');
      await storage.delete('file_categories', catId);
      setCategories(categories.filter(c => c.id !== catId));
      if (selectedCategory === catId) {
        setSelectedCategory(null);
      }
    } catch (err) {
      setError('Failed to delete category');
      console.error(err);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <ImageIcon className="w-8 h-8 text-purple-600" />;
    if (fileType === 'application/pdf') return <FileText className="w-8 h-8 text-red-600" />;
    return <File className="w-8 h-8 text-gray-600" />;
  };

  const filteredFiles = files.filter(file => {
    const matchesCategory = !selectedCategory || file.category === selectedCategory;
    const matchesSearch = !searchQuery ||
      file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const totalStorage = getTotalStorage();
  const storageWarning = totalStorage > STORAGE_WARNING_THRESHOLD;

  if (isLoading && files.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your files...</p>
        </div>
      </div>
    );
  }

  // File viewer modal
  if (viewingFile) {
    const isImage = viewingFile.fileType.startsWith('image/');
    const isPdf = viewingFile.fileType === 'application/pdf';

    return (
      <div className="fixed inset-0 bg-black/90 flex flex-col z-50">
        <div className="flex items-center justify-between p-4 bg-black/50">
          <div className="text-white">
            <h3 className="font-medium">{viewingFile.name}</h3>
            <p className="text-sm text-gray-400">{viewingFile.description}</p>
          </div>
          <button
            onClick={() => setViewingFile(null)}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
          {isImage && viewingFile.fileData && (
            <img
              src={viewingFile.fileData}
              alt={viewingFile.name}
              className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
            />
          )}
          {isPdf && viewingFile.fileData && (
            <div className="w-full h-full">
              <PdfJsViewer src={viewingFile.fileData} title={viewingFile.name} />
            </div>
          )}
          {!isImage && !isPdf && (
            <div className="text-center text-white">
              <File className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Preview not available for this file type</p>
              <p className="text-sm text-gray-400 mt-2">{viewingFile.fileType}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-purple-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-700 text-white rounded-xl relative">
                <FolderPlus className="w-6 h-6" />
                <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-1">
                  <Key className="w-3 h-3 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-gray-900 flex items-center gap-2">
                  My Files
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">Encrypted</span>
                </h2>
                <p className="text-sm text-gray-500 mt-1">Organize your files in custom categories</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Storage indicator */}
          <div className="mt-4 flex items-center gap-2 text-sm">
            <HardDrive className={`w-4 h-4 ${storageWarning ? 'text-amber-600' : 'text-gray-500'}`} />
            <span className={storageWarning ? 'text-amber-600' : 'text-gray-500'}>
              {formatFileSize(totalStorage)} used
            </span>
            {storageWarning && (
              <span className="flex items-center gap-1 text-amber-600">
                <AlertTriangle className="w-4 h-4" />
                Storage getting large
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          {/* Categories bar */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === null
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({files.length})
            </button>
            {categories.map(cat => {
              const count = files.filter(f => f.category === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    selectedCategory === cat.id
                      ? 'bg-purple-600 text-white'
                      : `${CATEGORY_COLORS[cat.color]} border`
                  }`}
                >
                  {cat.name} ({count})
                  {count === 0 && selectedCategory !== cat.id && (
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteCategory(cat.id); }}
                      className="hover:text-red-600"
                      title="Delete empty category"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </button>
              );
            })}
            <button
              onClick={() => setShowAddCategory(true)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Category
            </button>
          </div>

          {/* Add category form */}
          {showAddCategory && (
            <div className="mb-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
              <h3 className="text-sm font-medium text-gray-700 mb-3">New Category</h3>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Category name..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <select
                  value={newCategoryColor}
                  onChange={(e) => setNewCategoryColor(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  {Object.keys(CATEGORY_COLORS).map(color => (
                    <option key={color} value={color}>{color}</option>
                  ))}
                </select>
                <button
                  onClick={addCategory}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                >
                  Add
                </button>
                <button
                  onClick={() => setShowAddCategory(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          {/* Add file form */}
          {showAddForm ? (
            <div className="mb-6 p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border-2 border-purple-200">
              <h3 className="mb-3 font-medium">Upload New File</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">File (max {formatFileSize(MAX_FILE_SIZE)})</label>
                  <input
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setSelectedFile(file);
                        if (!newFileName) setNewFileName(file.name);
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  />
                  {selectedFile && selectedFile.size > MAX_FILE_SIZE && (
                    <p className="text-red-600 text-sm mt-1">
                      File too large ({formatFileSize(selectedFile.size)})
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Name</label>
                  <input
                    type="text"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    placeholder="File name..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Description</label>
                  <textarea
                    value={newFileDescription}
                    onChange={(e) => setNewFileDescription(e.target.value)}
                    placeholder="Brief description..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Category</label>
                  <select
                    value={newFileCategory}
                    onChange={(e) => setNewFileCategory(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={addFile}
                    disabled={!selectedFile || selectedFile.size > MAX_FILE_SIZE}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Upload File
                  </button>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setSelectedFile(null);
                      setNewFileName('');
                      setNewFileDescription('');
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : showEditForm && editingFile ? (
            <div className="mb-6 p-4 bg-gradient-to-br from-green-50 to-blue-50 rounded-xl border-2 border-green-200">
              <h3 className="mb-3 font-medium flex items-center gap-2">
                <Edit className="w-5 h-5 text-green-600" />
                Edit File
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Name</label>
                  <input
                    type="text"
                    value={editingFile.name}
                    onChange={(e) => setEditingFile({ ...editingFile, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Description</label>
                  <textarea
                    value={editingFile.description}
                    onChange={(e) => setEditingFile({ ...editingFile, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Category</label>
                  <select
                    value={editingFile.category}
                    onChange={(e) => setEditingFile({ ...editingFile, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={updateFile}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={() => {
                        setShowEditForm(false);
                        setEditingFile(null);
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      deleteFile(editingFile.id);
                      setShowEditForm(false);
                      setEditingFile(null);
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                  >
                    <Trash className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full mb-6 p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-all flex items-center justify-center gap-2 text-gray-600 hover:text-purple-600"
            >
              <Upload className="w-5 h-5" />
              Upload New File
            </button>
          )}

          {/* Files grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredFiles.length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-400">
                <FolderPlus className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{selectedCategory ? 'No files in this category' : 'No files yet'}</p>
                <p className="text-sm mt-1">Upload files to get started</p>
              </div>
            ) : (
              filteredFiles.map((file) => {
                const category = categories.find(c => c.id === file.category);
                const isImage = file.fileType.startsWith('image/');

                return (
                  <div
                    key={file.id}
                    className="group relative bg-gray-100 rounded-xl overflow-hidden aspect-square cursor-pointer hover:ring-2 hover:ring-purple-400 transition-all"
                    onClick={() => setViewingFile(file)}
                  >
                    {/* Thumbnail or icon */}
                    {isImage && file.thumbnail ? (
                      <img
                        src={file.thumbnail}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-50">
                        {getFileIcon(file.fileType)}
                      </div>
                    )}

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <p className="text-white text-sm font-medium truncate">{file.name}</p>
                        {file.description && (
                          <p className="text-white/80 text-xs truncate">{file.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          {category && (
                            <span className={`text-xs px-2 py-0.5 rounded ${CATEGORY_COLORS[category.color]}`}>
                              {category.name}
                            </span>
                          )}
                          <span className="text-white/60 text-xs">{formatFileSize(file.size)}</span>
                        </div>
                      </div>
                      <div className="absolute top-2 right-2 flex gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingFile(file); setShowEditForm(true); }}
                          className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteFile(file.id); }}
                          className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Category badge (always visible) */}
                    {category && (
                      <div className="absolute top-2 left-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${CATEGORY_COLORS[category.color]}`}>
                          {category.name}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
