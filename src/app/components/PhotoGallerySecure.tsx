import { useState, useEffect } from 'react';
import { X, Plus, Trash, Image as ImageIcon, Key } from 'lucide-react';
import { encrypt, decrypt } from '../../utils/crypto';

interface Photo {
  id: string;
  name: string;
  date: string;
  url: string;
  description: string;
}

interface PhotoGallerySecureProps {
  onClose: () => void;
  masterPassword: string;
}

export function PhotoGallerySecure({ onClose, masterPassword }: PhotoGallerySecureProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [newPhoto, setNewPhoto] = useState({ name: '', description: '', url: '' });

  useEffect(() => {
    loadPhotos();
  }, []);

  const loadPhotos = async () => {
    try {
      setIsLoading(true);
      const stored = localStorage.getItem('photos_encrypted');
      if (stored) {
        const encryptedData = JSON.parse(stored);
        const decryptedPhotos: Photo[] = [];

        for (const encryptedPhoto of encryptedData) {
          try {
            const decryptedJson = await decrypt(encryptedPhoto.data, masterPassword);
            const photo = JSON.parse(decryptedJson);
            decryptedPhotos.push(photo);
          } catch (err) {
            console.error('Failed to decrypt photo:', err);
          }
        }

        setPhotos(decryptedPhotos);
      }
    } catch (err) {
      setError('Failed to load encrypted data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const savePhotos = async (newPhotos: Photo[]) => {
    try {
      const encryptedPhotos = [];

      for (const photo of newPhotos) {
        const photoJson = JSON.stringify(photo);
        const encryptedData = await encrypt(photoJson, masterPassword);
        encryptedPhotos.push({
          id: photo.id,
          data: encryptedData
        });
      }

      localStorage.setItem('photos_encrypted', JSON.stringify(encryptedPhotos));
      setPhotos(newPhotos);
    } catch (err) {
      setError('Failed to save encrypted data');
      console.error(err);
    }
  };

  const addPhoto = () => {
    if (!newPhoto.name.trim()) return;

    const photo: Photo = {
      id: Date.now().toString(),
      ...newPhoto,
      url: newPhoto.url || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
      date: new Date().toLocaleDateString()
    };

    savePhotos([...photos, photo]);
    setNewPhoto({ name: '', description: '', url: '' });
    setShowAddForm(false);
  };

  const deletePhoto = (id: string) => {
    savePhotos(photos.filter(photo => photo.id !== id));
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Decrypting your photos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-purple-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-green-600 to-purple-600 text-white rounded-xl relative">
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
                <p className="text-sm text-gray-500 mt-1">Organize your personal photos and memories</p>
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
              <h3 className="mb-3">Add New Photo</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={newPhoto.name}
                  onChange={(e) => setNewPhoto({ ...newPhoto, name: e.target.value })}
                  placeholder="Photo name..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="text"
                  value={newPhoto.url}
                  onChange={(e) => setNewPhoto({ ...newPhoto, url: e.target.value })}
                  placeholder="Photo URL (optional)..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="text"
                  value={newPhoto.description}
                  onChange={(e) => setNewPhoto({ ...newPhoto, description: e.target.value })}
                  placeholder="Description..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full mb-6 p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 text-gray-600 hover:text-blue-600"
            >
              <Plus className="w-5 h-5" />
              Add New Photo
            </button>
          )}

          {photos.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No photos yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((photo) => (
                <div key={photo.id} className="group relative">
                  <div className="aspect-square rounded-xl overflow-hidden bg-gray-100">
                    <img
                      src={photo.url}
                      alt={photo.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="mt-2">
                    <p className="text-sm text-gray-900 truncate">{photo.name}</p>
                    <p className="text-xs text-gray-500">{photo.date}</p>
                    {photo.description && (
                      <p className="text-xs text-gray-400 truncate mt-1">{photo.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => deletePhoto(photo.id)}
                    className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
