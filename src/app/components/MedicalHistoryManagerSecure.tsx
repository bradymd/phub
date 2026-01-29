import { useState, useEffect } from 'react';
import { X, Plus, Trash, Heart, Calendar, Edit2, Key, FileText, ExternalLink, Hospital, Stethoscope, Search, AlertCircle, Upload, Eye, EyeOff, Download, User, Building, Shield, Phone, MapPin, CreditCard, ChevronDown, ChevronUp } from 'lucide-react';
import { useStorage, useDocumentService } from '../../contexts/StorageContext';
import { DocumentReference } from '../../services/document-service';

interface HealthcareProvider {
  id: string;
  type: 'nhs_gp' | 'nhs_surgery' | 'private_gp' | 'private_specialist' | 'insurance';
  name: string;
  role?: string; // e.g., "GP", "Cardiologist", "Surgeon"
  practiceName?: string; // Surgery/Clinic name
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  // NHS specific
  nhsNumber?: string; // Patient's NHS number (only for NHS GP)
  surgeryNHSCode?: string; // Surgery NHS code
  // Private specific
  registrationNumber?: string; // GMC number for doctors
  consultationFee?: number;
  // Insurance specific
  policyNumber?: string;
  membershipNumber?: string;
  groupNumber?: string;
  coverageDetails?: string;
  renewalDate?: string;
  // Common
  notes?: string;
  documents?: DocumentReference[];
}

interface MedicalRecord {
  id: string;
  date: string;
  type: 'consultation' | 'test' | 'procedure' | 'prescription' | 'scan' | 'other';
  specialty: string; // e.g., Cardiology, Gastroenterology, Orthopedics
  provider: string; // Doctor name or hospital
  condition: string;
  medicalSummary?: string; // Critical information for emergency/quick reference
  notes: string;
  treatment: string;
  outcome: string;
  attachments: string[]; // Legacy: Filenames only (for backwards compatibility)
  documents?: DocumentReference[]; // Document references (stored separately, loaded on-demand)
}

interface MedicalProfile {
  nhsNumber?: string;
  bloodType?: string;
  allergies?: string;
  chronicConditions?: string;
  currentMedications?: string;
  emergencyContact?: string;
  providers?: HealthcareProvider[];
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
  medicalSummary: '',
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

  // Medical Profile state
  const [medicalProfile, setMedicalProfile] = useState<MedicalProfile>({});
  const [editingProfile, setEditingProfile] = useState(false);
  const [showProviders, setShowProviders] = useState(false);
  const [editingProvider, setEditingProvider] = useState<HealthcareProvider | null>(null);
  const [addingProvider, setAddingProvider] = useState(false);
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [expandedNHSInfo, setExpandedNHSInfo] = useState(true);

  useEffect(() => {
    loadRecords();
    loadMedicalProfile();
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

  const loadMedicalProfile = async () => {
    try {
      const profiles = await storage.get<MedicalProfile>('medical_profile');
      if (profiles.length > 0) {
        setMedicalProfile(profiles[0]);
      }
    } catch (err) {
      console.error('Error loading medical profile:', err);
    }
  };

  const saveMedicalProfile = async (profile: MedicalProfile) => {
    try {
      const profiles = await storage.get<MedicalProfile>('medical_profile');
      if (profiles.length > 0) {
        await storage.update('medical_profile', profiles[0].id as string, profile);
      } else {
        await storage.add('medical_profile', { ...profile, id: Date.now().toString() });
      }
      setMedicalProfile(profile);
      setEditingProfile(false);
    } catch (err) {
      setError('Failed to save medical profile');
      console.error(err);
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
                onClick={() => setShowProviders(!showProviders)}
                className="flex items-center gap-2 px-3 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <Stethoscope className="w-4 h-4" />
                Providers
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

        {/* Healthcare Providers Section */}
        {showProviders && (
          <div className="px-6 py-4 bg-blue-50 border-b border-blue-200 max-h-[60vh] overflow-y-auto">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-blue-600" />
                  Healthcare Providers & NHS Details
                </h3>
                <button
                  onClick={() => setAddingProvider(true)}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Add Provider
                </button>
              </div>

              {/* NHS Number and Basic Info */}
              <div className="bg-white rounded-lg p-4 mb-3">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => !editingProfile && setExpandedNHSInfo(!expandedNHSInfo)}
                >
                  <h4 className="font-medium text-gray-700 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-600" />
                    NHS & Medical Information
                  </h4>
                  <div className="flex items-center gap-2">
                    {!editingProfile ? (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingProfile(true);
                            setExpandedNHSInfo(true);
                          }}
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          <Edit2 className="w-3 h-3 inline mr-1" />
                          Edit
                        </button>
                        {expandedNHSInfo ?
                          <ChevronUp className="w-4 h-4 text-gray-400" /> :
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        }
                      </>
                    ) : (
                      <div className="flex gap-2">
                      <button
                        onClick={() => saveMedicalProfile(medicalProfile)}
                        className="text-sm text-green-600 hover:text-green-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingProfile(false);
                          loadMedicalProfile();
                        }}
                        className="text-sm text-gray-600 hover:text-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>

                {expandedNHSInfo && (
                  <>
                    {editingProfile ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">NHS Number</label>
                      <input
                        type="text"
                        value={medicalProfile.nhsNumber || ''}
                        onChange={(e) => setMedicalProfile({ ...medicalProfile, nhsNumber: e.target.value })}
                        placeholder="000-000-0000"
                        className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Blood Type</label>
                      <input
                        type="text"
                        value={medicalProfile.bloodType || ''}
                        onChange={(e) => setMedicalProfile({ ...medicalProfile, bloodType: e.target.value })}
                        placeholder="e.g., O+"
                        className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Emergency Contact</label>
                      <input
                        type="text"
                        value={medicalProfile.emergencyContact || ''}
                        onChange={(e) => setMedicalProfile({ ...medicalProfile, emergencyContact: e.target.value })}
                        placeholder="Name & Phone"
                        className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-xs text-gray-500 mb-1">Allergies</label>
                      <input
                        type="text"
                        value={medicalProfile.allergies || ''}
                        onChange={(e) => setMedicalProfile({ ...medicalProfile, allergies: e.target.value })}
                        placeholder="List any allergies"
                        className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-xs text-gray-500 mb-1">Chronic Conditions</label>
                      <input
                        type="text"
                        value={medicalProfile.chronicConditions || ''}
                        onChange={(e) => setMedicalProfile({ ...medicalProfile, chronicConditions: e.target.value })}
                        placeholder="List chronic conditions"
                        className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-xs text-gray-500 mb-1">Current Medications</label>
                      <textarea
                        value={medicalProfile.currentMedications || ''}
                        onChange={(e) => setMedicalProfile({ ...medicalProfile, currentMedications: e.target.value })}
                        placeholder="List current medications and dosages"
                        className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                        rows={2}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-sm">
                    {medicalProfile.nhsNumber && (
                      <p><span className="text-gray-500">NHS Number:</span> <span className="font-medium">{medicalProfile.nhsNumber}</span></p>
                    )}
                    {medicalProfile.bloodType && (
                      <p><span className="text-gray-500">Blood Type:</span> {medicalProfile.bloodType}</p>
                    )}
                    {medicalProfile.allergies && (
                      <p><span className="text-gray-500">Allergies:</span> {medicalProfile.allergies}</p>
                    )}
                    {medicalProfile.chronicConditions && (
                      <p><span className="text-gray-500">Chronic Conditions:</span> {medicalProfile.chronicConditions}</p>
                    )}
                    {medicalProfile.currentMedications && (
                      <p><span className="text-gray-500">Current Medications:</span> {medicalProfile.currentMedications}</p>
                    )}
                    {medicalProfile.emergencyContact && (
                      <p><span className="text-gray-500">Emergency Contact:</span> {medicalProfile.emergencyContact}</p>
                    )}
                    {!medicalProfile.nhsNumber && !medicalProfile.bloodType && (
                      <p className="text-gray-400 italic">No medical information added yet</p>
                    )}
                  </div>
                    )}
                  </>
                )}
              </div>

              {/* Providers List */}
              {medicalProfile.providers && medicalProfile.providers.length > 0 && (
                <div className="space-y-2">
                  {medicalProfile.providers.map((provider) => (
                    <div key={provider.id} className="bg-white rounded-lg p-3 border border-gray-200">
                      <div
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => setExpandedProvider(expandedProvider === provider.id ? null : provider.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            provider.type === 'nhs_gp' || provider.type === 'nhs_surgery' ? 'bg-blue-100 text-blue-600' :
                            provider.type === 'insurance' ? 'bg-green-100 text-green-600' :
                            'bg-purple-100 text-purple-600'
                          }`}>
                            {provider.type === 'insurance' ? <Shield className="w-4 h-4" /> :
                             provider.type === 'nhs_surgery' ? <Building className="w-4 h-4" /> :
                             <User className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{provider.name}</p>
                            <p className="text-xs text-gray-500">
                              {provider.type === 'nhs_gp' ? 'NHS GP' :
                               provider.type === 'nhs_surgery' ? 'NHS Surgery' :
                               provider.type === 'private_gp' ? 'Private GP' :
                               provider.type === 'private_specialist' ? `Private ${provider.role || 'Specialist'}` :
                               'Health Insurance'}
                              {provider.practiceName && ` • ${provider.practiceName}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingProvider(provider);
                            }}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            <Edit2 className="w-3 h-3 text-gray-500" />
                          </button>
                          {expandedProvider === provider.id ?
                            <ChevronUp className="w-4 h-4 text-gray-400" /> :
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          }
                        </div>
                      </div>

                      {expandedProvider === provider.id && (
                        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2 text-sm">
                          {provider.address && (
                            <p className="flex items-start gap-2">
                              <MapPin className="w-3 h-3 text-gray-400 mt-0.5" />
                              <span className="text-gray-600">{provider.address}</span>
                            </p>
                          )}
                          {provider.phone && (
                            <p className="flex items-center gap-2">
                              <Phone className="w-3 h-3 text-gray-400" />
                              <span className="text-gray-600">{provider.phone}</span>
                            </p>
                          )}
                          {provider.policyNumber && (
                            <p><span className="text-gray-500">Policy:</span> {provider.policyNumber}</p>
                          )}
                          {provider.membershipNumber && (
                            <p><span className="text-gray-500">Membership:</span> {provider.membershipNumber}</p>
                          )}
                          {provider.registrationNumber && (
                            <p><span className="text-gray-500">GMC Number:</span> {provider.registrationNumber}</p>
                          )}
                          {provider.consultationFee && (
                            <p><span className="text-gray-500">Consultation Fee:</span> £{provider.consultationFee}</p>
                          )}
                          {provider.renewalDate && (
                            <p><span className="text-gray-500">Renewal:</span> {new Date(provider.renewalDate).toLocaleDateString('en-GB')}</p>
                          )}
                          {provider.notes && (
                            <p className="text-gray-600 italic">{provider.notes}</p>
                          )}
                          <div className="mt-2">
                            <div className="flex flex-wrap gap-2">
                              {provider.documents && provider.documents.map((doc, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => viewFile(doc)}
                                  className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-xs"
                                >
                                  <FileText className="w-3 h-3" />
                                  {doc.filename}
                                </button>
                              ))}
                              <label className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 cursor-pointer text-xs">
                                <Upload className="w-3 h-3" />
                                Add Document
                                <input
                                  type="file"
                                  accept="image/*,.pdf"
                                  onChange={async (e) => {
                                    if (e.target.files?.[0]) {
                                      const docRef = await documentService.uploadDocument(e.target.files[0]);
                                      const updatedProvider = {
                                        ...provider,
                                        documents: [...(provider.documents || []), docRef]
                                      };
                                      const updatedProfile = {
                                        ...medicalProfile,
                                        providers: medicalProfile.providers?.map(p =>
                                          p.id === provider.id ? updatedProvider : p
                                        ) || []
                                      };
                                      await saveMedicalProfile(updatedProfile);
                                    }
                                  }}
                                  className="hidden"
                                />
                              </label>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Medical Summary
                    <span className="text-xs text-gray-500 ml-2">(Critical information for emergency/quick reference)</span>
                  </label>
                  <textarea
                    value={newRecord.medicalSummary}
                    onChange={(e) => setNewRecord({ ...newRecord, medicalSummary: e.target.value })}
                    placeholder="Important medical information, conditions, or medications that should be communicated..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                    rows={2}
                  />
                </div>
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
                                {record.medicalSummary && (
                                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <p className="text-gray-700 font-medium mb-1 flex items-center gap-1">
                                      <AlertCircle className="w-4 h-4 text-yellow-600" />
                                      Medical Summary:
                                    </p>
                                    <p className="text-gray-700 whitespace-pre-line">{record.medicalSummary}</p>
                                  </div>
                                )}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Medical Summary
                  <span className="text-xs text-gray-500 ml-2">(Critical information for emergency/quick reference)</span>
                </label>
                <textarea
                  value={editingRecord.medicalSummary || ''}
                  onChange={(e) => setEditingRecord({ ...editingRecord, medicalSummary: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows={2}
                  placeholder="Important medical information, conditions, or medications that should be communicated..."
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

      {/* Add Provider Modal */}
      {addingProvider && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Add Healthcare Provider</h3>
              <button
                onClick={() => setAddingProvider(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const newProvider: HealthcareProvider = {
                id: Date.now().toString(),
                type: 'nhs_gp',
                name: '',
                ...Object.fromEntries(new FormData(e.currentTarget))
              } as HealthcareProvider;

              const updatedProfile = {
                ...medicalProfile,
                providers: [...(medicalProfile.providers || []), newProvider]
              };
              saveMedicalProfile(updatedProfile);
              setAddingProvider(false);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Provider Type *</label>
                  <select name="type" className="w-full px-3 py-2 border border-gray-300 rounded-lg" required>
                    <option value="nhs_gp">NHS GP</option>
                    <option value="nhs_surgery">NHS Surgery</option>
                    <option value="private_gp">Private GP</option>
                    <option value="private_specialist">Private Specialist</option>
                    <option value="insurance">Health Insurance</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                    <input
                      type="text"
                      name="name"
                      placeholder="Dr. Name / Surgery / Company"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Practice/Clinic</label>
                    <input
                      type="text"
                      name="practiceName"
                      placeholder="Practice or clinic name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <textarea
                    name="address"
                    placeholder="Full address"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      placeholder="Contact number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      name="email"
                      placeholder="Email address"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Policy/Membership Number</label>
                    <input
                      type="text"
                      name="policyNumber"
                      placeholder="For insurance or NHS number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">GMC/Registration Number</label>
                    <input
                      type="text"
                      name="registrationNumber"
                      placeholder="Professional registration"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    name="notes"
                    placeholder="Additional information"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    rows={2}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setAddingProvider(false)}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add Provider
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Provider Modal */}
      {editingProvider && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Edit Healthcare Provider</h3>
              <button
                onClick={() => setEditingProvider(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Provider Type *</label>
                <select
                  value={editingProvider.type}
                  onChange={(e) => setEditingProvider({...editingProvider, type: e.target.value as HealthcareProvider['type']})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="nhs_gp">NHS GP</option>
                  <option value="nhs_surgery">NHS Surgery</option>
                  <option value="private_gp">Private GP</option>
                  <option value="private_specialist">Private Specialist</option>
                  <option value="insurance">Health Insurance</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={editingProvider.name || ''}
                    onChange={(e) => setEditingProvider({...editingProvider, name: e.target.value})}
                    placeholder="Dr. Name / Surgery / Company"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {editingProvider.type === 'private_specialist' ? 'Specialty' : 'Practice/Clinic'}
                  </label>
                  <input
                    type="text"
                    value={editingProvider.type === 'private_specialist' ? editingProvider.role || '' : editingProvider.practiceName || ''}
                    onChange={(e) => {
                      if (editingProvider.type === 'private_specialist') {
                        setEditingProvider({...editingProvider, role: e.target.value});
                      } else {
                        setEditingProvider({...editingProvider, practiceName: e.target.value});
                      }
                    }}
                    placeholder={editingProvider.type === 'private_specialist' ? "e.g., Cardiologist" : "Practice or clinic name"}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  value={editingProvider.address || ''}
                  onChange={(e) => setEditingProvider({...editingProvider, address: e.target.value})}
                  placeholder="Full address"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={editingProvider.phone || ''}
                    onChange={(e) => setEditingProvider({...editingProvider, phone: e.target.value})}
                    placeholder="Contact number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editingProvider.email || ''}
                    onChange={(e) => setEditingProvider({...editingProvider, email: e.target.value})}
                    placeholder="Email address"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Insurance specific fields */}
              {editingProvider.type === 'insurance' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Policy Number</label>
                    <input
                      type="text"
                      value={editingProvider.policyNumber || ''}
                      onChange={(e) => setEditingProvider({...editingProvider, policyNumber: e.target.value})}
                      placeholder="Policy number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Membership Number</label>
                    <input
                      type="text"
                      value={editingProvider.membershipNumber || ''}
                      onChange={(e) => setEditingProvider({...editingProvider, membershipNumber: e.target.value})}
                      placeholder="Membership number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Group Number</label>
                    <input
                      type="text"
                      value={editingProvider.groupNumber || ''}
                      onChange={(e) => setEditingProvider({...editingProvider, groupNumber: e.target.value})}
                      placeholder="Group number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Renewal Date</label>
                    <input
                      type="date"
                      value={editingProvider.renewalDate || ''}
                      onChange={(e) => setEditingProvider({...editingProvider, renewalDate: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              )}

              {/* NHS Surgery specific */}
              {editingProvider.type === 'nhs_surgery' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Surgery NHS Code</label>
                  <input
                    type="text"
                    value={editingProvider.surgeryNHSCode || ''}
                    onChange={(e) => setEditingProvider({...editingProvider, surgeryNHSCode: e.target.value})}
                    placeholder="NHS surgery code"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              )}

              {/* Private provider specific */}
              {(editingProvider.type === 'private_gp' || editingProvider.type === 'private_specialist') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">GMC Registration Number</label>
                    <input
                      type="text"
                      value={editingProvider.registrationNumber || ''}
                      onChange={(e) => setEditingProvider({...editingProvider, registrationNumber: e.target.value})}
                      placeholder="GMC number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Consultation Fee (£)</label>
                    <input
                      type="number"
                      value={editingProvider.consultationFee || ''}
                      onChange={(e) => setEditingProvider({...editingProvider, consultationFee: parseFloat(e.target.value) || 0})}
                      placeholder="0.00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                <input
                  type="url"
                  value={editingProvider.website || ''}
                  onChange={(e) => setEditingProvider({...editingProvider, website: e.target.value})}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={editingProvider.notes || ''}
                  onChange={(e) => setEditingProvider({...editingProvider, notes: e.target.value})}
                  placeholder="Additional information"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={2}
                />
              </div>

              {/* Documents Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Documents</label>
                <div className="flex flex-wrap gap-2">
                  {editingProvider.documents && editingProvider.documents.map((doc, idx) => (
                    <div key={idx} className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                      <FileText className="w-3 h-3" />
                      <span>{doc.filename}</span>
                      <button
                        type="button"
                        onClick={async () => {
                          await documentService.removeDocument(doc);
                          setEditingProvider({
                            ...editingProvider,
                            documents: editingProvider.documents?.filter((d, i) => i !== idx)
                          });
                        }}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <label className="flex items-center gap-1 px-3 py-1 bg-white border border-gray-300 rounded cursor-pointer hover:bg-gray-50 text-sm">
                    <Upload className="w-3 h-3 text-gray-500" />
                    <span className="text-gray-600">Add Document</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={async (e) => {
                        if (e.target.files?.[0]) {
                          const docRef = await documentService.uploadDocument(e.target.files[0]);
                          setEditingProvider({
                            ...editingProvider,
                            documents: [...(editingProvider.documents || []), docRef]
                          });
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">Upload insurance cards, membership documents, invoices, etc.</p>
              </div>

              <div className="flex justify-between gap-2 pt-4">
                <button
                  onClick={async () => {
                    if (confirm('Are you sure you want to delete this provider?')) {
                      const updatedProfile = {
                        ...medicalProfile,
                        providers: medicalProfile.providers?.filter(p => p.id !== editingProvider.id) || []
                      };
                      await saveMedicalProfile(updatedProfile);
                      setEditingProvider(null);
                    }
                  }}
                  className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
                >
                  Delete Provider
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingProvider(null)}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const updatedProfile = {
                        ...medicalProfile,
                        providers: medicalProfile.providers?.map(p =>
                          p.id === editingProvider.id ? editingProvider : p
                        ) || []
                      };
                      saveMedicalProfile(updatedProfile);
                      setEditingProvider(null);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
