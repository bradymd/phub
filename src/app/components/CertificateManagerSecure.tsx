import { useState, useEffect } from 'react';
import { X, Plus, Trash, Award, Calendar, Edit2, Key, FileText, AlertCircle, ExternalLink, Search, Upload, Download, Eye, Grid3x3, List } from 'lucide-react';
import { useStorage } from '../../contexts/StorageContext';

interface Certificate {
  id: string;
  name: string;
  type: 'birth' | 'marriage' | 'driving' | 'passport' | 'qualification' | 'professional' | 'other';
  issueDate: string;
  expiryDate: string;
  issuingAuthority: string;
  referenceNumber: string;
  notes: string;
  filename: string; // Optional reference to local file (legacy)
  fileData?: string; // Base64 encoded PDF data
  thumbnailData?: string; // Base64 encoded thumbnail image
  documentPath?: string; // Path to document in public folder
}

// Available certificate documents (LEGACY - kept for existing certificates only)
const availableCertificateDocuments = [
  { value: '', label: 'No document' },
  { value: 'documents/certificates/BCS Chartered Member 2004.pdf', label: 'BCS Chartered Member 2004' },
  { value: 'documents/certificates/BCS Member 1999.pdf', label: 'BCS Member 1999' },
  { value: 'documents/certificates/Clarinet Grade 4.pdf', label: 'Clarinet Grade 4' },
  { value: 'documents/certificates/Violin Certificates to grade 2.pdf', label: 'Violin Certificates to Grade 2' },
  { value: 'documents/certificates/Nominet fabio.org.uk 2003.pdf', label: 'Nominet Domain Registration 2003' },
];

// Format date from YYYY-MM-DD to DD/MM/YYYY for UK display
const formatDateUK = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00'); // Add time to avoid timezone issues
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// Parse date from DD/MM/YYYY to YYYY-MM-DD for storage
const parseDateUK = (dateStr: string): string => {
  if (!dateStr) return '';
  // Handle both DD/MM/YYYY and YYYY-MM-DD formats
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }
  return dateStr; // Already in YYYY-MM-DD format
};

interface CertificateManagerSecureProps {
  onClose: () => void;
}

const emptyRecord = {
  name: '',
  type: 'other' as const,
  issueDate: '',
  expiryDate: '',
  issuingAuthority: '',
  referenceNumber: '',
  notes: '',
  filename: ''
};

export function CertificateManagerSecure({ onClose }: CertificateManagerSecureProps) {
  const storage = useStorage();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCertificate, setEditingCertificate] = useState<Certificate | null>(null);
  const [viewingCertificate, setViewingCertificate] = useState<Certificate | null>(null);
  const [viewingBlobUrl, setViewingBlobUrl] = useState<string | null>(null);
  const [viewingDetails, setViewingDetails] = useState<Certificate | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [newCertificate, setNewCertificate] = useState(emptyRecord);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    loadCertificates();
  }, []);

  // Scroll to top when add form opens (edit is now in modal)
  useEffect(() => {
    if (showAddForm) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [showAddForm]);

  const loadCertificates = async () => {
    try {
      setIsLoading(true);
      setError('');
      console.log('Loading certificates from documents_certificates...');
      const data = await storage.get<Certificate>('documents_certificates');
      console.log(`Loaded ${data.length} certificates`);
      setCertificates(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(`Failed to load certificates: ${errorMsg}`);
      console.error('Error loading certificates:', err);
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

  const addCertificate = async () => {
    if (!newCertificate.name.trim()) {
      setError('Please provide a certificate name');
      return;
    }

    try {
      setError('');
      setIsLoading(true);

      // Use fileData from handleFileUpload if it was already set
      const certificate: Certificate = {
        id: Date.now().toString(),
        ...newCertificate
      };

      console.log('Saving certificate:', {
        name: certificate.name,
        hasFileData: !!certificate.fileData,
        fileDataLength: certificate.fileData?.length || 0,
        hasThumbnail: !!certificate.thumbnailData,
        filename: certificate.filename
      });

      await storage.add('documents_certificates', certificate);
      await loadCertificates();
      setNewCertificate(emptyRecord);
      setSelectedFile(null);
      setShowAddForm(false);
    } catch (err) {
      setError('Failed to add certificate');
      console.error('Add certificate error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateCertificate = async () => {
    if (!editingCertificate || !editingCertificate.name.trim()) return;

    try {
      setError('');
      await storage.update('documents_certificates', editingCertificate.id, editingCertificate);
      await loadCertificates();
      setEditingCertificate(null);
    } catch (err) {
      setError('Failed to update certificate');
      console.error(err);
    }
  };

  const deleteCertificate = async (id: string) => {
    try {
      setError('');
      await storage.delete('documents_certificates', id);
      await loadCertificates();
    } catch (err) {
      setError('Failed to delete certificate');
      console.error(err);
    }
  };

  const startEdit = (certificate: Certificate) => {
    setEditingCertificate({ ...certificate });
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

  const viewFile = (certificate: Certificate) => {
    // Clean up any existing blob URL
    if (viewingBlobUrl) {
      URL.revokeObjectURL(viewingBlobUrl);
      setViewingBlobUrl(null);
    }

    // Create blob URL for PDFs with fileData (data URLs)
    if (certificate.fileData?.includes('application/pdf')) {
      const blobUrl = dataUrlToBlobUrl(certificate.fileData);
      setViewingBlobUrl(blobUrl);
    }

    setViewingCertificate(certificate);
  };

  const downloadFile = (certificate: Certificate) => {
    if (!certificate.fileData) {
      setError('No file data available for download');
      return;
    }

    try {
      // Extract MIME type and base64 data from data URL
      const match = certificate.fileData.match(/^data:([^;]+);base64,(.+)$/);
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
      a.download = certificate.filename || `${certificate.name}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download file');
      console.error('Download error:', err);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, isEditing: boolean = false) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';

    if (!isImage && !isPdf) {
      setError('Please upload an image or PDF file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setError('File size must be less than 10MB');
      return;
    }

    try {
      setError('');

      // Convert file to base64
      const base64 = await fileToBase64(file);

      // Generate thumbnail only for images (PDFs will show icon)
      let thumbnail: string | undefined;
      if (isImage) {
        thumbnail = await createThumbnail(file);
      }

      // Update the appropriate state
      if (isEditing && editingCertificate) {
        setEditingCertificate({
          ...editingCertificate,
          fileData: base64,
          thumbnailData: thumbnail,
          filename: file.name
        });
      } else {
        setNewCertificate({
          ...newCertificate,
          fileData: base64,
          thumbnailData: thumbnail,
          filename: file.name
        });
      }
    } catch (err) {
      setError('Failed to process file');
      console.error('File upload error:', err);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'birth':
        return 'bg-pink-100 text-pink-700';
      case 'marriage':
        return 'bg-rose-100 text-rose-700';
      case 'driving':
        return 'bg-blue-100 text-blue-700';
      case 'passport':
        return 'bg-indigo-100 text-indigo-700';
      case 'qualification':
        return 'bg-purple-100 text-purple-700';
      case 'professional':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'birth':
        return 'Birth Certificate';
      case 'marriage':
        return 'Marriage Certificate';
      case 'driving':
        return 'Driving License';
      case 'passport':
        return 'Passport';
      case 'qualification':
        return 'Qualification';
      case 'professional':
        return 'Professional';
      default:
        return 'Other';
    }
  };

  const isExpiringSoon = (expiryDate: string) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const now = new Date();
    const threeMonths = new Date();
    threeMonths.setMonth(threeMonths.getMonth() + 3);
    return expiry > now && expiry <= threeMonths;
  };

  const isExpired = (expiryDate: string) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  // Filter certificates based on search query
  const filteredCertificates = certificates.filter(cert => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      cert.name.toLowerCase().includes(query) ||
      cert.type.toLowerCase().includes(query) ||
      cert.issuingAuthority.toLowerCase().includes(query) ||
      cert.referenceNumber.toLowerCase().includes(query) ||
      cert.notes.toLowerCase().includes(query) ||
      getTypeLabel(cert.type).toLowerCase().includes(query)
    );
  });

  const counts = {
    total: filteredCertificates.length,
    expiring: filteredCertificates.filter(c => isExpiringSoon(c.expiryDate)).length,
    expired: filteredCertificates.filter(c => isExpired(c.expiryDate)).length
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Decrypting your certificates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 overflow-hidden">
      <div className="absolute inset-2 bg-white rounded-2xl flex flex-col shadow-2xl">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 text-white rounded-xl relative">
                <Award className="w-6 h-6" />
                <div className="absolute -top-1 -right-1 bg-white/30 rounded-full p-1">
                  <Key className="w-3 h-3 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-white flex items-center gap-2 text-xl font-semibold">
                  Certificates
                </h2>
                <p className="text-sm text-white/80 mt-1">Manage your important certificates and documents</p>
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
                  className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-48"
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
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-white/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
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

        <div className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <Award className="w-5 h-5" />
                </div>
                <p className="text-sm text-gray-600">Total Certificates</p>
              </div>
              <p className="text-gray-900">{counts.total}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                  <Calendar className="w-5 h-5" />
                </div>
                <p className="text-sm text-gray-600">Expiring Soon</p>
              </div>
              <p className="text-gray-900">{counts.expiring}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <p className="text-sm text-gray-600">Expired</p>
              </div>
              <p className="text-gray-900">{counts.expired}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 p-6" style={{ willChange: 'transform', transform: 'translateZ(0)' }}>
          {showAddForm && (
            <div className="mb-6 p-6 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200">
              <h3 className="mb-4 flex items-center gap-2">Add Certificate</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={newCertificate.name}
                    onChange={(e) => setNewCertificate({ ...newCertificate, name: e.target.value })}
                    placeholder="Certificate name..."
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  />
                  <select
                    value={newCertificate.type}
                    onChange={(e) => setNewCertificate({ ...newCertificate, type: e.target.value as any })}
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="birth">Birth Certificate</option>
                    <option value="marriage">Marriage Certificate</option>
                    <option value="driving">Driving License</option>
                    <option value="passport">Passport</option>
                    <option value="qualification">Qualification</option>
                    <option value="professional">Professional</option>
                    <option value="other">Other</option>
                  </select>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Issue Date (type or use calendar)</label>
                    <input
                      type="date"
                      value={newCertificate.issueDate}
                      onChange={(e) => setNewCertificate({ ...newCertificate, issueDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Expiry Date (type or use calendar)</label>
                    <input
                      type="date"
                      value={newCertificate.expiryDate}
                      onChange={(e) => setNewCertificate({ ...newCertificate, expiryDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                    />
                  </div>
                  <input
                    type="text"
                    value={newCertificate.issuingAuthority}
                    onChange={(e) => setNewCertificate({ ...newCertificate, issuingAuthority: e.target.value })}
                    placeholder="Issuing authority..."
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  />
                  <input
                    type="text"
                    value={newCertificate.referenceNumber}
                    onChange={(e) => setNewCertificate({ ...newCertificate, referenceNumber: e.target.value })}
                    placeholder="Reference/Certificate number..."
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  />
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Upload Certificate (Image or PDF)</label>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => handleFileUpload(e, false)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {newCertificate.filename && (
                      <p className="text-xs text-gray-500 mt-1">
                        Selected: {newCertificate.filename}
                        {newCertificate.thumbnailData && ' (image preview available)'}
                      </p>
                    )}
                  </div>
                </div>
                <textarea
                  value={newCertificate.notes}
                  onChange={(e) => setNewCertificate({ ...newCertificate, notes: e.target.value })}
                  placeholder="Additional notes (optional)..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  rows={2}
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={addCertificate}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add Certificate
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

          {certificates.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Award className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No certificates yet</p>
              <p className="text-sm mt-2">Start tracking your important documents</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="space-y-4">
              {filteredCertificates.map((cert) => (
                <div
                  key={cert.id}
                  onClick={() => setViewingDetails(cert)}
                  className={`bg-gray-50 rounded-xl p-5 hover:bg-gray-100 transition-colors cursor-pointer ${
                    isExpired(cert.expiryDate) ? 'border-2 border-red-200' :
                    isExpiringSoon(cert.expiryDate) ? 'border-2 border-orange-200' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        {(() => {
                          // Show image thumbnail for uploaded images
                          if (cert.thumbnailData && cert.thumbnailData.startsWith('data:image')) {
                            return (
                              <img
                                src={cert.thumbnailData}
                                alt={cert.name}
                                className="w-24 h-auto rounded-lg shadow-md border border-gray-200 object-cover cursor-pointer hover:shadow-lg transition-shadow"
                                onClick={() => setViewingCertificate(cert)}
                                title="Click to view certificate"
                              />
                            );
                          }

                          // Show PDF icon for uploaded PDFs
                          if (cert.fileData && cert.fileData.includes('application/pdf')) {
                            return (
                              <div
                                className="w-24 h-32 bg-red-50 border-2 border-red-200 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:shadow-lg transition-shadow"
                                onClick={() => setViewingCertificate(cert)}
                                title="Click to view PDF"
                              >
                                <FileText className="w-12 h-12 text-red-600 mb-1" />
                                <span className="text-xs text-red-600 font-medium">PDF</span>
                              </div>
                            );
                          }

                          // Show library document thumbnails
                          if (cert.documentPath) {
                            const thumbnailPath = cert.documentPath
                              .replace('documents/', 'thumbnails/')
                              .replace(/\.pdf$/, '.jpg');
                            return (
                              <img
                                src={`/${thumbnailPath}`}
                                alt={cert.name}
                                className="w-24 h-auto rounded-lg shadow-md border border-gray-200 object-cover cursor-pointer hover:shadow-lg transition-shadow"
                                onClick={() => setViewingCertificate(cert)}
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const iconDiv = e.currentTarget.nextElementSibling;
                                  if (iconDiv) iconDiv.classList.remove('hidden');
                                }}
                                title="Click to view full certificate"
                              />
                            );
                          }

                          // Default: no thumbnail
                          return null;
                        })()}
                        <div className={`p-3 bg-blue-100 text-blue-600 rounded-lg ${(cert.thumbnailData && cert.thumbnailData.startsWith('data:image')) || cert.fileData || cert.documentPath ? 'hidden' : ''}`}>
                          <Award className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-gray-900">{cert.name}</h3>
                            {cert.documentPath && (
                              <button
                                onClick={() => setViewingCertificate(cert)}
                                className="p-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors"
                                title="View certificate document"
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                            )}
                            {isExpired(cert.expiryDate) && (
                              <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Expired
                              </span>
                            )}
                            {isExpiringSoon(cert.expiryDate) && !isExpired(cert.expiryDate) && (
                              <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Expiring Soon
                              </span>
                            )}
                          </div>
                          <span className={`inline-block px-2 py-1 rounded text-xs mb-2 ${getTypeColor(cert.type)}`}>
                            {getTypeLabel(cert.type)}
                          </span>
                          <div className="space-y-1 text-sm text-gray-600">
                            {cert.issuingAuthority && (
                              <p><span className="text-gray-500">Issued by:</span> {cert.issuingAuthority}</p>
                            )}
                            {cert.referenceNumber && (
                              <p><span className="text-gray-500">Reference:</span> {cert.referenceNumber}</p>
                            )}
                            {cert.issueDate && (
                              <p className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span className="text-gray-500">Issued:</span> {formatDateUK(cert.issueDate)}
                              </p>
                            )}
                            {cert.expiryDate && (
                              <p className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span className="text-gray-500">Expires:</span> {formatDateUK(cert.expiryDate)}
                              </p>
                            )}
                            {cert.filename && (cert.fileData || cert.documentPath) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  viewFile(cert);
                                }}
                                className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors text-xs"
                              >
                                <FileText className="w-3 h-3" />
                                {cert.filename}
                              </button>
                            )}
                            {cert.notes && (
                              <p className="mt-2 text-gray-600 italic">{cert.notes}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {cert.fileData && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadFile(cert);
                          }}
                          className="p-2 hover:bg-white rounded-lg transition-colors text-green-600"
                          title="Download certificate"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(cert);
                        }}
                        className="p-2 hover:bg-white rounded-lg transition-colors text-blue-600"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteCertificate(cert.id);
                        }}
                        className="p-2 hover:bg-white rounded-lg transition-colors text-red-600"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* List View */
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
              {filteredCertificates.map((cert) => (
                <div
                  key={cert.id}
                  onClick={() => setViewingDetails(cert)}
                  className={`px-6 py-3 hover:bg-gray-50 transition-colors cursor-pointer flex items-center justify-between group ${
                    isExpired(cert.expiryDate) ? 'bg-red-50' :
                    isExpiringSoon(cert.expiryDate) ? 'bg-orange-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-2 rounded-lg bg-blue-50 text-blue-600 flex-shrink-0">
                      <Award className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-gray-900 font-medium truncate">{cert.name}</h3>
                        <span className={`inline-block px-2 py-0.5 rounded text-xs flex-shrink-0 ${getTypeColor(cert.type)}`}>
                          {getTypeLabel(cert.type)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-0.5">
                        {cert.issuingAuthority && (
                          <span className="truncate">{cert.issuingAuthority}</span>
                        )}
                        {cert.issueDate && (
                          <span className="flex items-center gap-1 flex-shrink-0">
                            <Calendar className="w-3 h-3" />
                            {formatDateUK(cert.issueDate)}
                          </span>
                        )}
                        {cert.expiryDate && (
                          <span className="flex items-center gap-1 flex-shrink-0">
                            {isExpired(cert.expiryDate) ? (
                              <span className="text-red-600 font-medium flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Expired {formatDateUK(cert.expiryDate)}
                              </span>
                            ) : isExpiringSoon(cert.expiryDate) ? (
                              <span className="text-orange-600 font-medium flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Expires {formatDateUK(cert.expiryDate)}
                              </span>
                            ) : (
                              <>
                                <Calendar className="w-3 h-3" />
                                {formatDateUK(cert.expiryDate)}
                              </>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-4">
                    {cert.fileData && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadFile(cert);
                        }}
                        className="p-2 hover:bg-white rounded-lg transition-colors text-green-600"
                        title="Download certificate"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(cert);
                      }}
                      className="p-2 hover:bg-white rounded-lg transition-colors text-blue-600"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteCertificate(cert.id);
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
      {editingCertificate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-green-600" />
                Edit Certificate
              </h3>
              <button
                onClick={() => setEditingCertificate(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Certificate Name</label>
                  <input
                    type="text"
                    value={editingCertificate.name}
                    onChange={(e) => setEditingCertificate({ ...editingCertificate, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={editingCertificate.type}
                    onChange={(e) => setEditingCertificate({ ...editingCertificate, type: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="birth">Birth Certificate</option>
                    <option value="marriage">Marriage Certificate</option>
                    <option value="driving">Driving License</option>
                    <option value="passport">Passport</option>
                    <option value="qualification">Qualification</option>
                    <option value="professional">Professional</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date (type or use calendar)</label>
                  <input
                    type="date"
                    value={editingCertificate.issueDate}
                    onChange={(e) => setEditingCertificate({ ...editingCertificate, issueDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date (type or use calendar)</label>
                  <input
                    type="date"
                    value={editingCertificate.expiryDate}
                    onChange={(e) => setEditingCertificate({ ...editingCertificate, expiryDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Issuing Authority</label>
                  <input
                    type="text"
                    value={editingCertificate.issuingAuthority}
                    onChange={(e) => setEditingCertificate({ ...editingCertificate, issuingAuthority: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reference Number</label>
                  <input
                    type="text"
                    value={editingCertificate.referenceNumber}
                    onChange={(e) => setEditingCertificate({ ...editingCertificate, referenceNumber: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Upload Certificate (Image or PDF)</label>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleFileUpload(e, true)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {editingCertificate.filename && (
                    <p className="text-xs text-gray-500 mt-1">Current: {editingCertificate.filename}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea
                  value={editingCertificate.notes}
                  onChange={(e) => setEditingCertificate({ ...editingCertificate, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this certificate?')) {
                    deleteCertificate(editingCertificate.id);
                    setEditingCertificate(null);
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingCertificate(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={updateCertificate}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Certificate Viewer Modal */}
      {viewingCertificate && (viewingCertificate.fileData || viewingCertificate.documentPath) && (
        <div className="fixed inset-0 bg-black/90 flex flex-col z-[60]">
          <div className="p-4 flex justify-between items-center bg-[#1a1a1a]">
            <h3 className="text-white font-medium truncate mr-4">{viewingCertificate.name}</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const link = document.createElement('a');
                  if (viewingCertificate.fileData) {
                    link.href = viewingCertificate.fileData;
                    const extension = viewingCertificate.fileData.includes('application/pdf') ? 'pdf' : 'jpg';
                    link.download = `${viewingCertificate.name}.${extension}`;
                  } else if (viewingCertificate.documentPath) {
                    link.href = `/${viewingCertificate.documentPath}`;
                    link.download = viewingCertificate.name;
                  }
                  link.click();
                }}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="Download"
              >
                <Download className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={() => {
                  if (viewingBlobUrl) {
                    URL.revokeObjectURL(viewingBlobUrl);
                    setViewingBlobUrl(null);
                  }
                  setViewingCertificate(null);
                }}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="Close"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
          {(() => {
            // Determine the source - either uploaded fileData or library documentPath
            // Use blob URL for PDFs when available (better rendering for large files)
            const isImage = viewingCertificate.fileData?.startsWith('data:image/') || viewingCertificate.documentPath?.endsWith('.jpg') || viewingCertificate.documentPath?.endsWith('.png');
            const isPdf = viewingCertificate.fileData?.includes('application/pdf') || viewingCertificate.documentPath?.endsWith('.pdf');
            const src = isPdf && viewingBlobUrl ? viewingBlobUrl : (viewingCertificate.fileData || `/${viewingCertificate.documentPath}`);

            if (isImage) {
              return (
                <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
                  <img
                    src={viewingCertificate.fileData || `/${viewingCertificate.documentPath}`}
                    alt={viewingCertificate.name}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              );
            } else if (isPdf) {
              return (
                <iframe
                  src={src}
                  className="flex-1 border-0"
                  title={viewingCertificate.name}
                />
              );
            } else {
              return (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center text-white">
                    <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>Preview not available for this file type</p>
                    <button
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = viewingCertificate.fileData || `/${viewingCertificate.documentPath}`;
                        link.download = viewingCertificate.name;
                        link.click();
                      }}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Download to view
                    </button>
                  </div>
                </div>
              );
            }
          })()}
        </div>
      )}

      {/* Certificate Details Modal */}
      {viewingDetails && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4" onClick={() => setViewingDetails(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-blue-600" />
                Certificate Details
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <p className="text-gray-900 bg-gray-50 px-4 py-2 rounded-lg">{viewingDetails.name}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <p className={`inline-block px-3 py-1 rounded-lg text-sm ${getTypeColor(viewingDetails.type)}`}>
                  {getTypeLabel(viewingDetails.type)}
                </p>
              </div>

              {viewingDetails.issuingAuthority && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Issuing Authority</label>
                  <p className="text-gray-900 bg-gray-50 px-4 py-2 rounded-lg">{viewingDetails.issuingAuthority}</p>
                </div>
              )}

              {viewingDetails.referenceNumber && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reference Number</label>
                  <p className="text-gray-900 bg-gray-50 px-4 py-2 rounded-lg">{viewingDetails.referenceNumber}</p>
                </div>
              )}

              {viewingDetails.issueDate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date</label>
                  <p className="text-gray-900 bg-gray-50 px-4 py-2 rounded-lg flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    {formatDateUK(viewingDetails.issueDate)}
                  </p>
                </div>
              )}

              {viewingDetails.expiryDate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                  <div className="flex items-center gap-2">
                    <p className="text-gray-900 bg-gray-50 px-4 py-2 rounded-lg flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      {formatDateUK(viewingDetails.expiryDate)}
                    </p>
                    {isExpired(viewingDetails.expiryDate) && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Expired
                      </span>
                    )}
                    {isExpiringSoon(viewingDetails.expiryDate) && !isExpired(viewingDetails.expiryDate) && (
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Expiring Soon
                      </span>
                    )}
                  </div>
                </div>
              )}

              {viewingDetails.filename && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Filename</label>
                  <p className="text-gray-900 bg-gray-50 px-4 py-2 rounded-lg flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    {viewingDetails.filename}
                  </p>
                </div>
              )}

              {viewingDetails.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <p className="text-gray-900 bg-gray-50 px-4 py-3 rounded-lg whitespace-pre-wrap">{viewingDetails.notes}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                {(viewingDetails.fileData || viewingDetails.documentPath) && (
                  <button
                    onClick={() => {
                      setViewingDetails(null);
                      viewFile(viewingDetails);
                    }}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    View Certificate
                  </button>
                )}
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
