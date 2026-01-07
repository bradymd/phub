import { useState, useEffect } from 'react';
import { X, Plus, Trash, Image as ImageIcon, Key, Edit } from 'lucide-react';
import { useStorage } from '../../contexts/StorageContext';

interface Photo {
  id: string;
  name: string;
  date: string;
  url: string;
  description: string;
}

interface PhotoGallerySecureProps {
  onClose: () => void;
}

export function PhotoGallerySecure({ onClose }: PhotoGallerySecureProps) {
  const storage = useStorage();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [newPhoto, setNewPhoto] = useState({ name: '', description: '', url: '' });

  useEffect(() => {
    loadPhotos();
  }, []);

  // Scroll to top when add or edit form opens
  useEffect(() => {
    if (showAddForm || editingPhoto) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [showAddForm, editingPhoto]);

  const loadPhotos = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await storage.get<Photo>('photos');
      setPhotos(data);
    } catch (err) {
      setError('Failed to load data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const addPhoto = async () => {
    if (!newPhoto.name.trim()) return;

    try {
      setError('');
      const photo: Photo = {
        id: Date.now().toString(),
        ...newPhoto,
        url: newPhoto.url || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
        date: new Date().toLocaleDateString()
      };

      await storage.add('photos', photo);
      await loadPhotos();
      setNewPhoto({ name: '', description: '', url: '' });
      setShowAddForm(false);
    } catch (err) {
      setError('Failed to add photo');
      console.error(err);
    }
  };

  const updatePhoto = async () => {
    if (!editingPhoto || !editingPhoto.name.trim()) return;

    try {
      setError('');
      await storage.update('photos', editingPhoto.id, editingPhoto);
      await loadPhotos();
      setEditingPhoto(null);
      setShowEditForm(false);
    } catch (err) {
      setError('Failed to update photo');
      console.error(err);
    }
  };

  const deletePhoto = async (id: string) => {
    try {
      setError('');
      await storage.delete('photos', id);
      await loadPhotos();
    } catch (err) {
      setError('Failed to delete photo');
      console.error(err);
    }
  };

  const startEdit = (photo: Photo) => {
    setEditingPhoto({ ...photo });
    setShowEditForm(true);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Decrypting your photos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-xl relative">
                <ImageIcon className="w-6 h-6" />
                <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-1">
                  <Key className="w-3 h-3 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-gray-900 flex items-center gap-2">
                  Photo Gallery
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">Encrypted</span>
                </h2>
                <p className="text-sm text-gray-500 mt-1">Store and organize your photos securely</p>
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
              <h3 className="mb-3">Add New Photo</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={newPhoto.name}
                  onChange={(e) => setNewPhoto({ ...newPhoto, name: e.target.value })}
                  placeholder="Photo name..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                />
                <input
                  type="url"
                  value={newPhoto.url}
                  onChange={(e) => setNewPhoto({ ...newPhoto, url: e.target.value })}
                  placeholder="Photo URL..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                />
                <textarea
                  value={newPhoto.description}
                  onChange={(e) => setNewPhoto({ ...newPhoto, description: e.target.value })}
                  placeholder="Description..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  rows={3}
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={addPhoto}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add Photo
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
          ) : showEditForm && editingPhoto ? (
            <div className="mb-6 p-4 bg-gradient-to-br from-green-50 to-blue-50 rounded-xl border-2 border-green-200">
              <h3 className="mb-3 flex items-center gap-2">
                <Edit className="w-5 h-5 text-green-600" />
                Edit Photo
              </h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={editingPhoto.name}
                  onChange={(e) => setEditingPhoto({ ...editingPhoto, name: e.target.value })}
                  placeholder="Photo name..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                />
                <input
                  type="url"
                  value={editingPhoto.url}
                  onChange={(e) => setEditingPhoto({ ...editingPhoto, url: e.target.value })}
                  placeholder="Photo URL..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                />
                <textarea
                  value={editingPhoto.description}
                  onChange={(e) => setEditingPhoto({ ...editingPhoto, description: e.target.value })}
                  placeholder="Description..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  rows={3}
                />
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={updatePhoto}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={() => {
                        setShowEditForm(false);
                        setEditingPhoto(null);
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this photo? This cannot be undone.')) {
                        deletePhoto(editingPhoto.id);
                        setShowEditForm(false);
                        setEditingPhoto(null);
                      }
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
              <Plus className="w-5 h-5" />
              Add New Photo
            </button>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-400">
                <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No photos yet</p>
              </div>
            ) : (
              photos.map((photo) => (
                <div
                  key={photo.id}
                  className="group relative bg-gray-100 rounded-xl overflow-hidden aspect-square"
                >
                  <img
                    src={photo.url}
                    alt={photo.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-white text-sm font-medium">{photo.name}</p>
                      {photo.description && (
                        <p className="text-white/80 text-xs mt-1">{photo.description}</p>
                      )}
                      <p className="text-white/60 text-xs mt-1">{photo.date}</p>
                    </div>
                    <div className="absolute top-2 right-2 flex gap-2">
                      <button
                        onClick={() => startEdit(photo)}
                        className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deletePhoto(photo.id)}
                        className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
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
