import { useState, useEffect } from 'react';
import { X, Plus, Trash, Car, Calendar, Edit2, FileText, Search, Eye, EyeOff, Grid3x3, List, Download, AlertCircle, Phone, Shield, Wrench, Upload, Printer } from 'lucide-react';
import { useStorage, useDocumentService } from '../../contexts/StorageContext';
import { PdfJsViewer } from './PdfJsViewer';
import { DocumentReference } from '../../services/document-service';
import { printRecord, formatDate, formatCurrency } from '../../utils/print';

interface ServiceEntry {
  id: string;
  date: string;
  mileage: number;
  type: 'service' | 'mot' | 'repair' | 'tyres' | 'other';
  description: string;
  cost: number;
  garage: string;
  nextServiceDate?: string;
  nextServiceMileage?: number;
  documents?: DocumentReference[];
}

interface MOTRecord {
  id: string;
  testDate: string;
  expiryDate: string;
  testCentre: string;
  mileage: number;
  result: 'pass' | 'fail';
  advisories?: string;
  certificate?: DocumentReference;
  receipt?: DocumentReference;
  otherDocuments?: DocumentReference[];
}

interface Vehicle {
  id: string;
  // Basic info
  registration: string;
  make: string;
  model: string;
  year: string;
  color: string;
  fuelType: 'petrol' | 'diesel' | 'electric' | 'hybrid' | 'other';
  // Purchase info
  purchaseDate: string;
  purchasePrice: number;
  purchasedFrom: string;
  ownership: 'owned' | 'financed' | 'leased';
  monthlyPayment: number;
  financeEndDate: string;
  financeDocuments?: DocumentReference[];
  // Insurance
  insurer: string;
  insurancePolicyNumber: string;
  insuranceRenewalDate: string;
  insuranceType: 'comprehensive' | 'third_party' | 'third_party_fire_theft' | '';
  insuredDrivers: string;
  insuranceDocuments?: DocumentReference[];
  // Key contacts
  breakdownProvider: string;
  breakdownMembershipNumber: string;
  breakdownContact: string;
  recoveryContact: string;
  breakdownDocuments?: DocumentReference[];
  // Important dates
  motDueDate: string;
  taxDueDate: string;
  // MOT History
  motHistory?: MOTRecord[];
  // Current status
  currentMileage: number;
  // Documents (legacy - for backwards compatibility)
  documents?: DocumentReference[];
  // Service history
  serviceHistory: ServiceEntry[];
  notes: string;
}

interface VehicleManagerSecureProps {
  onClose: () => void;
}

const emptyVehicle: Omit<Vehicle, 'id'> = {
  registration: '',
  make: '',
  model: '',
  year: '',
  color: '',
  fuelType: 'petrol',
  purchaseDate: '',
  purchasePrice: 0,
  purchasedFrom: '',
  ownership: 'owned',
  monthlyPayment: 0,
  financeEndDate: '',
  financeDocuments: [],
  insurer: '',
  insurancePolicyNumber: '',
  insuranceRenewalDate: '',
  insuranceType: '',
  insuredDrivers: '',
  insuranceDocuments: [],
  breakdownProvider: '',
  breakdownMembershipNumber: '',
  breakdownContact: '',
  recoveryContact: '',
  breakdownDocuments: [],
  motDueDate: '',
  taxDueDate: '',
  motHistory: [],
  currentMileage: 0,
  documents: [],
  serviceHistory: [],
  notes: ''
};

const emptyServiceEntry: Omit<ServiceEntry, 'id'> = {
  date: '',
  mileage: 0,
  type: 'service',
  description: '',
  cost: 0,
  nextServiceDate: '',
  nextServiceMileage: 0,
  documents: [],
  garage: ''
};

// Format date from YYYY-MM-DD to DD/MM/YYYY for UK display
const formatDateUK = (dateStr: string): string => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return dateStr;
  return `${day}/${month}/${year}`;
};

// Check if a date is in the past
const isPastDate = (dateStr: string): boolean => {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
};

// Check if a date is within the next 30 days
const isDueSoon = (dateStr: string): boolean => {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const today = new Date();
  const thirtyDaysLater = new Date();
  thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
  today.setHours(0, 0, 0, 0);
  return date >= today && date <= thirtyDaysLater;
};

export function VehicleManagerSecure({ onClose }: VehicleManagerSecureProps) {
  const storage = useStorage();
  const documentService = useDocumentService();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [newVehicle, setNewVehicle] = useState(emptyVehicle);
  const [viewingDocument, setViewingDocument] = useState<{ docRef: DocumentReference; dataUrl: string; blobUrl: string } | null>(null);
  const [loadingDocument, setLoadingDocument] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSummary, setShowSummary] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [viewingDetails, setViewingDetails] = useState<Vehicle | null>(null);
  const [newServiceEntry, setNewServiceEntry] = useState(emptyServiceEntry);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingServiceEntry, setEditingServiceEntry] = useState<ServiceEntry | null>(null);
  const [viewingServiceEntry, setViewingServiceEntry] = useState<ServiceEntry | null>(null);

  useEffect(() => {
    loadVehicles();
  }, []);

  useEffect(() => {
    if (showAddForm) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [showAddForm]);

  const loadVehicles = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await storage.get<Vehicle>('vehicles');
      setVehicles(data);
    } catch (err) {
      setError('Failed to load vehicles');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const addVehicle = async () => {
    if (!newVehicle.registration.trim()) {
      setError('Registration plate is required');
      return;
    }

    try {
      setError('');
      const vehicle: Vehicle = {
        ...newVehicle,
        id: `vehicle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        serviceHistory: []
      };

      await storage.add('vehicles', vehicle);
      await loadVehicles();
      setNewVehicle(emptyVehicle);
      setShowAddForm(false);
    } catch (err) {
      setError('Failed to add vehicle');
      console.error(err);
    }
  };

  const updateVehicle = async () => {
    if (!editingVehicle || !editingVehicle.registration.trim()) return;

    try {
      setError('');
      await storage.update('vehicles', editingVehicle.id, editingVehicle);
      await loadVehicles();
      setEditingVehicle(null);
    } catch (err) {
      setError('Failed to update vehicle');
      console.error(err);
    }
  };

  const deleteVehicle = async (id: string) => {
    if (!confirm('Delete this vehicle and all its records?')) return;

    try {
      setError('');
      const vehicle = vehicles.find(v => v.id === id);
      if (vehicle) {
        // Delete all document types
        const allDocs = [
          ...(vehicle.documents || []),
          ...(vehicle.insuranceDocuments || []),
          ...(vehicle.breakdownDocuments || []),
          ...(vehicle.financeDocuments || [])
        ];
        if (allDocs.length > 0) {
          await documentService.deleteDocuments('certificates', allDocs);
        }
      }
      await storage.delete('vehicles', id);
      await loadVehicles();
    } catch (err) {
      setError('Failed to delete vehicle');
      console.error(err);
    }
  };

  const addServiceEntry = async (vehicleId: string) => {
    if (!newServiceEntry.date || !newServiceEntry.description) {
      setError('Date and description are required');
      return;
    }

    try {
      setError('');
      const vehicle = vehicles.find(v => v.id === vehicleId);
      if (!vehicle) return;

      const entry: ServiceEntry = {
        ...newServiceEntry,
        id: `service_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

      const updatedVehicle = {
        ...vehicle,
        serviceHistory: [...(vehicle.serviceHistory || []), entry].sort((a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
        )
      };

      await storage.update('vehicles', vehicleId, updatedVehicle);
      await loadVehicles();
      setNewServiceEntry(emptyServiceEntry);
      setShowServiceForm(false);

      if (viewingDetails?.id === vehicleId) {
        setViewingDetails(updatedVehicle);
      }
      if (editingVehicle?.id === vehicleId) {
        setEditingVehicle(updatedVehicle);
      }
    } catch (err) {
      setError('Failed to add service entry');
      console.error(err);
    }
  };

  const updateServiceEntry = async (vehicleId: string, updatedEntry: ServiceEntry) => {
    if (!updatedEntry.date || !updatedEntry.description) {
      setError('Date and description are required');
      return;
    }

    try {
      setError('');
      const vehicle = vehicles.find(v => v.id === vehicleId);
      if (!vehicle) return;

      const updatedVehicle = {
        ...vehicle,
        serviceHistory: vehicle.serviceHistory.map(e =>
          e.id === updatedEntry.id ? updatedEntry : e
        ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      };

      await storage.update('vehicles', vehicleId, updatedVehicle);
      await loadVehicles();
      setEditingServiceEntry(null);
      setViewingServiceEntry(null);

      if (viewingDetails?.id === vehicleId) {
        setViewingDetails(updatedVehicle);
      }
      if (editingVehicle?.id === vehicleId) {
        setEditingVehicle(updatedVehicle);
      }
    } catch (err) {
      setError('Failed to update service entry');
      console.error(err);
    }
  };

  const deleteServiceEntry = async (vehicleId: string, entryId: string) => {
    try {
      setError('');
      const vehicle = vehicles.find(v => v.id === vehicleId);
      if (!vehicle) return;

      const updatedVehicle = {
        ...vehicle,
        serviceHistory: vehicle.serviceHistory.filter(e => e.id !== entryId)
      };

      await storage.update('vehicles', vehicleId, updatedVehicle);
      await loadVehicles();

      if (viewingDetails?.id === vehicleId) {
        setViewingDetails(updatedVehicle);
      }
      if (editingVehicle?.id === vehicleId) {
        setEditingVehicle(updatedVehicle);
      }
    } catch (err) {
      setError('Failed to delete service entry');
      console.error(err);
    }
  };

  // Convert data URL to Blob URL for better iframe/object rendering (especially for large PDFs)
  const dataUrlToBlobUrl = (dataUrl: string): string => {
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      console.error('Invalid data URL format');
      return dataUrl; // Fallback to data URL
    }
    const mimeType = match[1];
    const base64Data = match[2];

    // Convert base64 to binary
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Create blob and URL
    const blob = new Blob([bytes], { type: mimeType });
    return URL.createObjectURL(blob);
  };

  const viewFile = async (docRef: DocumentReference) => {
    if (!docRef) {
      setError('Document reference is missing');
      return;
    }

    // Clean up any existing blob URL before loading new document
    if (viewingDocument?.blobUrl) {
      URL.revokeObjectURL(viewingDocument.blobUrl);
    }

    try {
      setLoadingDocument(true);
      setError('');
      console.log('Loading document:', docRef.filename, 'ID:', docRef.id);
      const dataUrl = await documentService.loadDocument('certificates', docRef);
      console.log('Loaded dataUrl length:', dataUrl.length, 'Type:', dataUrl.substring(0, 30));

      // Convert to Blob URL for better rendering (especially large PDFs)
      const blobUrl = dataUrlToBlobUrl(dataUrl);
      console.log('Created blob URL:', blobUrl);

      setViewingDocument({ docRef, dataUrl, blobUrl });
    } catch (err) {
      setError(`Failed to load document: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error('Error loading document:', err);
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
      const dataUrl = await documentService.loadDocument('certificates', docRef);

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
      setError(`Failed to download: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  type DocumentField = 'documents' | 'insuranceDocuments' | 'breakdownDocuments' | 'financeDocuments';

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    isEditing: boolean = false,
    docField: DocumentField = 'documents'
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';

    if (!isImage && !isPdf) {
      setError('Please upload an image or PDF file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    try {
      setError('');

      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;

        const docRef = await documentService.saveDocument(
          'certificates',
          file.name,
          dataUrl
        );

        if (isEditing && editingVehicle) {
          const updatedDocs = [...(editingVehicle[docField] || []), docRef];
          setEditingVehicle({ ...editingVehicle, [docField]: updatedDocs });
        } else {
          const updatedDocs = [...(newVehicle[docField] || []), docRef];
          setNewVehicle({ ...newVehicle, [docField]: updatedDocs });
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Failed to upload document');
      console.error(err);
    }

    event.target.value = '';
  };

  const removeDocument = async (docRef: DocumentReference, isEditing: boolean, docField: DocumentField = 'documents') => {
    try {
      await documentService.deleteDocument('certificates', docRef);

      if (isEditing && editingVehicle) {
        const updatedDocs = (editingVehicle[docField] || []).filter(d => d.id !== docRef.id);
        setEditingVehicle({ ...editingVehicle, [docField]: updatedDocs });
      } else {
        const updatedDocs = (newVehicle[docField] || []).filter(d => d.id !== docRef.id);
        setNewVehicle({ ...newVehicle, [docField]: updatedDocs });
      }
    } catch (err) {
      setError('Failed to remove document');
      console.error(err);
    }
  };

  // Handle file upload for service entry documents
  const handleServiceDocumentUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';

    if (!isImage && !isPdf) {
      setError('Please upload an image or PDF file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    try {
      setError('');

      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;

        const docRef = await documentService.saveDocument(
          'certificates',
          file.name,
          dataUrl
        );

        const updatedDocs = [...(newServiceEntry.documents || []), docRef];
        setNewServiceEntry({ ...newServiceEntry, documents: updatedDocs });
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Failed to upload document');
      console.error(err);
    }

    event.target.value = '';
  };

  // Remove document from service entry (new entry)
  const removeServiceDocument = async (docRef: DocumentReference) => {
    try {
      await documentService.deleteDocument('certificates', docRef);
      const updatedDocs = (newServiceEntry.documents || []).filter(d => d.id !== docRef.id);
      setNewServiceEntry({ ...newServiceEntry, documents: updatedDocs });
    } catch (err) {
      setError('Failed to remove document');
      console.error(err);
    }
  };

  // Handle file upload for editing service entry documents
  const handleEditServiceDocumentUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !editingServiceEntry) return;

    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';

    if (!isImage && !isPdf) {
      setError('Please upload an image or PDF file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    try {
      setError('');

      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;

        const docRef = await documentService.saveDocument(
          'certificates',
          file.name,
          dataUrl
        );

        const updatedDocs = [...(editingServiceEntry.documents || []), docRef];
        setEditingServiceEntry({ ...editingServiceEntry, documents: updatedDocs });
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Failed to upload document');
      console.error(err);
    }

    event.target.value = '';
  };

  // Remove document from editing service entry
  const removeEditServiceDocument = async (docRef: DocumentReference) => {
    if (!editingServiceEntry) return;

    try {
      await documentService.deleteDocument('certificates', docRef);
      const updatedDocs = (editingServiceEntry.documents || []).filter(d => d.id !== docRef.id);
      setEditingServiceEntry({ ...editingServiceEntry, documents: updatedDocs });
    } catch (err) {
      setError('Failed to remove document');
      console.error(err);
    }
  };

  const filteredVehicles = vehicles.filter(vehicle => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      vehicle.registration.toLowerCase().includes(query) ||
      vehicle.make.toLowerCase().includes(query) ||
      vehicle.model.toLowerCase().includes(query) ||
      vehicle.insurer.toLowerCase().includes(query)
    );
  });

  // Calculate summary stats
  const counts = {
    total: vehicles.length,
    motDue: vehicles.filter(v => isDueSoon(v.motDueDate) || isPastDate(v.motDueDate)).length,
    insuranceDue: vehicles.filter(v => isDueSoon(v.insuranceRenewalDate) || isPastDate(v.insuranceRenewalDate)).length,
    totalServiceCost: vehicles.reduce((sum, v) =>
      sum + (v.serviceHistory || []).reduce((s, e) => s + (e.cost || 0), 0), 0
    )
  };

  const getOwnershipLabel = (ownership: string) => {
    switch (ownership) {
      case 'owned': return 'Owned';
      case 'financed': return 'Financed';
      case 'leased': return 'Leased';
      default: return ownership;
    }
  };

  const getFuelLabel = (fuel: string) => {
    switch (fuel) {
      case 'petrol': return 'Petrol';
      case 'diesel': return 'Diesel';
      case 'electric': return 'Electric';
      case 'hybrid': return 'Hybrid';
      default: return fuel;
    }
  };

  const getServiceTypeLabel = (type: string) => {
    switch (type) {
      case 'service': return 'Service';
      case 'mot': return 'MOT';
      case 'repair': return 'Repair';
      case 'tyres': return 'Tyres';
      default: return 'Other';
    }
  };

  const startEdit = (vehicle: Vehicle) => {
    setEditingVehicle({ ...vehicle });
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8 shadow-2xl">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading vehicles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 overflow-hidden">
      <div className="absolute inset-2 bg-white rounded-2xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-600 to-slate-800 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <Car className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-white flex items-center gap-2">
                  Vehicles
                  <span className="text-xs px-2 py-1 bg-green-500/30 text-green-100 rounded-full">Encrypted</span>
                </h2>
                <p className="text-sm text-slate-200 mt-1">Track your vehicles, insurance, MOT and service history</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-300 w-48 focus:outline-none focus:ring-2 focus:ring-white/30"
                />
              </div>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white text-slate-700'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
                title="Grid view"
              >
                <Grid3x3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white text-slate-700'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
                title="List view"
              >
                <List className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowSummary(!showSummary)}
                className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                title={showSummary ? "Hide summary" : "Show summary"}
              >
                {showSummary ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <div className="w-px h-8 bg-white/30 mx-1"></div>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
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

        {/* Summary Cards */}
        {showSummary && (
          <div className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                    <Car className="w-5 h-5" />
                  </div>
                  <p className="text-sm text-gray-600">Total Vehicles</p>
                </div>
                <p className="text-2xl font-semibold text-gray-900">{counts.total}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${counts.motDue > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                    <FileText className="w-5 h-5" />
                  </div>
                  <p className="text-sm text-gray-600">MOT Due</p>
                </div>
                <p className={`text-2xl font-semibold ${counts.motDue > 0 ? 'text-red-600' : 'text-gray-900'}`}>{counts.motDue}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${counts.insuranceDue > 0 ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                    <Shield className="w-5 h-5" />
                  </div>
                  <p className="text-sm text-gray-600">Insurance Due</p>
                </div>
                <p className={`text-2xl font-semibold ${counts.insuranceDue > 0 ? 'text-orange-600' : 'text-gray-900'}`}>{counts.insuranceDue}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <p className="text-sm text-gray-600">Total Service Costs</p>
                </div>
                <p className="text-2xl font-semibold text-gray-900">£{counts.totalServiceCost.toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto min-h-0 p-6" style={{ willChange: 'transform', transform: 'translateZ(0)' }}>
          {/* Add Form */}
          {showAddForm && (
            <div className="mb-6 p-6 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-200">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Car className="w-5 h-5 text-slate-600" />
                Add Vehicle
              </h3>

              {/* Basic Info */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Basic Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    type="text"
                    value={newVehicle.registration}
                    onChange={(e) => setNewVehicle({ ...newVehicle, registration: e.target.value.toUpperCase() })}
                    placeholder="Registration plate *"
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  />
                  <input
                    type="text"
                    value={newVehicle.make}
                    onChange={(e) => setNewVehicle({ ...newVehicle, make: e.target.value })}
                    placeholder="Make (e.g., Ford)"
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  />
                  <input
                    type="text"
                    value={newVehicle.model}
                    onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                    placeholder="Model (e.g., Focus)"
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  />
                  <input
                    type="text"
                    value={newVehicle.year}
                    onChange={(e) => setNewVehicle({ ...newVehicle, year: e.target.value })}
                    placeholder="Year"
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  />
                  <input
                    type="text"
                    value={newVehicle.color}
                    onChange={(e) => setNewVehicle({ ...newVehicle, color: e.target.value })}
                    placeholder="Color"
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  />
                  <select
                    value={newVehicle.fuelType}
                    onChange={(e) => setNewVehicle({ ...newVehicle, fuelType: e.target.value as Vehicle['fuelType'] })}
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="petrol">Petrol</option>
                    <option value="diesel">Diesel</option>
                    <option value="electric">Electric</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* Purchase Info */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Purchase Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Purchase Date</label>
                    <input
                      type="date"
                      value={newVehicle.purchaseDate}
                      onChange={(e) => setNewVehicle({ ...newVehicle, purchaseDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Purchase Price (£)</label>
                    <input
                      type="number"
                      value={newVehicle.purchasePrice || ''}
                      onChange={(e) => setNewVehicle({ ...newVehicle, purchasePrice: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                    />
                  </div>
                  <input
                    type="text"
                    value={newVehicle.purchasedFrom}
                    onChange={(e) => setNewVehicle({ ...newVehicle, purchasedFrom: e.target.value })}
                    placeholder="Purchased/Leased from"
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  />
                  <select
                    value={newVehicle.ownership}
                    onChange={(e) => setNewVehicle({ ...newVehicle, ownership: e.target.value as Vehicle['ownership'] })}
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="owned">Owned</option>
                    <option value="financed">Financed</option>
                    <option value="leased">Leased</option>
                  </select>
                  {(newVehicle.ownership === 'financed' || newVehicle.ownership === 'leased') && (
                    <>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Monthly Payment (£)</label>
                        <input
                          type="number"
                          value={newVehicle.monthlyPayment || ''}
                          onChange={(e) => setNewVehicle({ ...newVehicle, monthlyPayment: parseFloat(e.target.value) || 0 })}
                          placeholder="0"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Finance End Date</label>
                        <input
                          type="date"
                          value={newVehicle.financeEndDate}
                          onChange={(e) => setNewVehicle({ ...newVehicle, financeEndDate: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                        />
                      </div>
                    </>
                  )}
                </div>
                {/* Finance Documents */}
                {(newVehicle.ownership === 'financed' || newVehicle.ownership === 'leased') && (
                  <div className="mt-3">
                    <label className="block text-xs text-gray-500 mb-2">Finance Documents</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {(newVehicle.financeDocuments || []).map((doc, idx) => (
                        <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg">
                          <FileText className="w-4 h-4" />
                          <span className="text-sm">{doc.filename}</span>
                          <button
                            onClick={() => removeDocument(doc, false, 'financeDocuments')}
                            className="p-1 hover:bg-purple-200 rounded"
                            title="Remove document"
                          >
                            <Trash className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <label className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 w-fit">
                      <Upload className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Upload finance document</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => handleFileUpload(e, false, 'financeDocuments')}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Insurance */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Insurance</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    type="text"
                    value={newVehicle.insurer}
                    onChange={(e) => setNewVehicle({ ...newVehicle, insurer: e.target.value })}
                    placeholder="Insurer"
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  />
                  <input
                    type="text"
                    value={newVehicle.insurancePolicyNumber}
                    onChange={(e) => setNewVehicle({ ...newVehicle, insurancePolicyNumber: e.target.value })}
                    placeholder="Policy number"
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  />
                  <select
                    value={newVehicle.insuranceType}
                    onChange={(e) => setNewVehicle({ ...newVehicle, insuranceType: e.target.value as Vehicle['insuranceType'] })}
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="">Select cover type...</option>
                    <option value="comprehensive">Comprehensive</option>
                    <option value="third_party_fire_theft">Third Party Fire & Theft</option>
                    <option value="third_party">Third Party Only</option>
                  </select>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Renewal Date</label>
                    <input
                      type="date"
                      value={newVehicle.insuranceRenewalDate}
                      onChange={(e) => setNewVehicle({ ...newVehicle, insuranceRenewalDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      value={newVehicle.insuredDrivers}
                      onChange={(e) => setNewVehicle({ ...newVehicle, insuredDrivers: e.target.value })}
                      placeholder="Insured drivers (e.g., John Smith, Jane Smith)"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                    />
                  </div>
                </div>
                {/* Insurance Documents */}
                <div className="mt-3">
                  <label className="block text-xs text-gray-500 mb-2">Insurance Documents</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(newVehicle.insuranceDocuments || []).map((doc, idx) => (
                      <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg">
                        <FileText className="w-4 h-4" />
                        <span className="text-sm">{doc.filename}</span>
                        <button
                          onClick={() => removeDocument(doc, false, 'insuranceDocuments')}
                          className="p-1 hover:bg-blue-200 rounded"
                          title="Remove document"
                        >
                          <Trash className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 w-fit">
                    <Upload className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Upload insurance document</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => handleFileUpload(e, false, 'insuranceDocuments')}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Contacts */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Breakdown & Recovery</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={newVehicle.breakdownProvider}
                    onChange={(e) => setNewVehicle({ ...newVehicle, breakdownProvider: e.target.value })}
                    placeholder="Breakdown provider (e.g., AA, RAC)"
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  />
                  <input
                    type="text"
                    value={newVehicle.breakdownMembershipNumber}
                    onChange={(e) => setNewVehicle({ ...newVehicle, breakdownMembershipNumber: e.target.value })}
                    placeholder="Membership number"
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  />
                  <input
                    type="text"
                    value={newVehicle.breakdownContact}
                    onChange={(e) => setNewVehicle({ ...newVehicle, breakdownContact: e.target.value })}
                    placeholder="Breakdown contact number"
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  />
                  <input
                    type="text"
                    value={newVehicle.recoveryContact}
                    onChange={(e) => setNewVehicle({ ...newVehicle, recoveryContact: e.target.value })}
                    placeholder="Recovery contact number"
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  />
                </div>
                {/* Breakdown Documents */}
                <div className="mt-3">
                  <label className="block text-xs text-gray-500 mb-2">Breakdown/Recovery Documents</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(newVehicle.breakdownDocuments || []).map((doc, idx) => (
                      <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-orange-100 text-orange-700 rounded-lg">
                        <FileText className="w-4 h-4" />
                        <span className="text-sm">{doc.filename}</span>
                        <button
                          onClick={() => removeDocument(doc, false, 'breakdownDocuments')}
                          className="p-1 hover:bg-orange-200 rounded"
                          title="Remove document"
                        >
                          <Trash className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 w-fit">
                    <Upload className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Upload breakdown document</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => handleFileUpload(e, false, 'breakdownDocuments')}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Key Dates */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Key Dates</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">MOT Due Date</label>
                    <input
                      type="date"
                      value={newVehicle.motDueDate}
                      onChange={(e) => setNewVehicle({ ...newVehicle, motDueDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Tax Due Date</label>
                    <input
                      type="date"
                      value={newVehicle.taxDueDate}
                      onChange={(e) => setNewVehicle({ ...newVehicle, taxDueDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Current Mileage</label>
                    <input
                      type="number"
                      value={newVehicle.currentMileage || ''}
                      onChange={(e) => setNewVehicle({ ...newVehicle, currentMileage: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="mb-4">
                <textarea
                  value={newVehicle.notes}
                  onChange={(e) => setNewVehicle({ ...newVehicle, notes: e.target.value })}
                  placeholder="Notes..."
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={addVehicle}
                  className="px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                >
                  Add Vehicle
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewVehicle(emptyVehicle);
                  }}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Vehicle List */}
          {vehicles.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Car className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No vehicles yet</p>
              <p className="text-sm mt-2">Add your first vehicle to get started</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="space-y-4">
              {filteredVehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  onClick={() => setViewingDetails(vehicle)}
                  className={`bg-gray-50 rounded-xl p-5 hover:bg-gray-100 transition-colors cursor-pointer ${
                    isPastDate(vehicle.motDueDate) || isPastDate(vehicle.insuranceRenewalDate) ? 'border-2 border-red-200' :
                    isDueSoon(vehicle.motDueDate) || isDueSoon(vehicle.insuranceRenewalDate) ? 'border-2 border-orange-200' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="p-3 bg-slate-200 text-slate-700 rounded-lg">
                        <Car className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-lg font-semibold text-gray-900">{vehicle.registration}</h3>
                          <span className="text-gray-600">{vehicle.make} {vehicle.model} {vehicle.year}</span>
                          {/* Warnings */}
                          {isPastDate(vehicle.motDueDate) && (
                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> MOT Expired
                            </span>
                          )}
                          {isDueSoon(vehicle.motDueDate) && !isPastDate(vehicle.motDueDate) && (
                            <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> MOT Due Soon
                            </span>
                          )}
                          {isPastDate(vehicle.insuranceRenewalDate) && (
                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> Insurance Expired
                            </span>
                          )}
                          {isDueSoon(vehicle.insuranceRenewalDate) && !isPastDate(vehicle.insuranceRenewalDate) && (
                            <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> Insurance Due Soon
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs">
                            {getFuelLabel(vehicle.fuelType)}
                          </span>
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                            {getOwnershipLabel(vehicle.ownership)}
                          </span>
                          {vehicle.insurer && <span>Insurer: {vehicle.insurer}</span>}
                          {vehicle.motDueDate && <span>MOT: {formatDateUK(vehicle.motDueDate)}</span>}
                          {vehicle.currentMileage > 0 && <span>{vehicle.currentMileage.toLocaleString()} miles</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(vehicle);
                        }}
                        className="p-2 hover:bg-white rounded-lg transition-colors text-blue-600"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteVehicle(vehicle.id);
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
              {filteredVehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  onClick={() => setViewingDetails(vehicle)}
                  className={`px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer flex items-center justify-between ${
                    isPastDate(vehicle.motDueDate) || isPastDate(vehicle.insuranceRenewalDate) ? 'bg-red-50' :
                    isDueSoon(vehicle.motDueDate) || isDueSoon(vehicle.insuranceRenewalDate) ? 'bg-orange-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                      <Car className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{vehicle.registration}</h3>
                        <span className="text-gray-600">{vehicle.make} {vehicle.model}</span>
                        {isPastDate(vehicle.motDueDate) && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> MOT Expired
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                        {vehicle.insurer && <span>{vehicle.insurer}</span>}
                        {vehicle.motDueDate && <span>MOT: {formatDateUK(vehicle.motDueDate)}</span>}
                        {vehicle.currentMileage > 0 && <span>{vehicle.currentMileage.toLocaleString()} miles</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(vehicle);
                      }}
                      className="p-2 hover:bg-white rounded-lg transition-colors text-blue-600"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteVehicle(vehicle.id);
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
      {editingVehicle && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-slate-600" />
                Edit Vehicle - {editingVehicle.registration}
              </h3>
              <button
                onClick={() => setEditingVehicle(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Same form fields as Add, but with editingVehicle */}
            <div className="space-y-4">
              {/* Basic Info */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Basic Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    type="text"
                    value={editingVehicle.registration}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, registration: e.target.value.toUpperCase() })}
                    placeholder="Registration plate *"
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  />
                  <input
                    type="text"
                    value={editingVehicle.make}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, make: e.target.value })}
                    placeholder="Make"
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  />
                  <input
                    type="text"
                    value={editingVehicle.model}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, model: e.target.value })}
                    placeholder="Model"
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  />
                  <input
                    type="text"
                    value={editingVehicle.year}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, year: e.target.value })}
                    placeholder="Year"
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  />
                  <input
                    type="text"
                    value={editingVehicle.color}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, color: e.target.value })}
                    placeholder="Color"
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  />
                  <select
                    value={editingVehicle.fuelType}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, fuelType: e.target.value as Vehicle['fuelType'] })}
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="petrol">Petrol</option>
                    <option value="diesel">Diesel</option>
                    <option value="electric">Electric</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* Purchase Info */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Purchase Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Purchase Date</label>
                    <input
                      type="date"
                      value={editingVehicle.purchaseDate}
                      onChange={(e) => setEditingVehicle({ ...editingVehicle, purchaseDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Purchase Price (£)</label>
                    <input
                      type="number"
                      value={editingVehicle.purchasePrice || ''}
                      onChange={(e) => setEditingVehicle({ ...editingVehicle, purchasePrice: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                    />
                  </div>
                  <input
                    type="text"
                    value={editingVehicle.purchasedFrom}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, purchasedFrom: e.target.value })}
                    placeholder="Purchased/Leased from"
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  />
                  <select
                    value={editingVehicle.ownership}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, ownership: e.target.value as Vehicle['ownership'] })}
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="owned">Owned</option>
                    <option value="financed">Financed</option>
                    <option value="leased">Leased</option>
                  </select>
                  {(editingVehicle.ownership === 'financed' || editingVehicle.ownership === 'leased') && (
                    <>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Monthly Payment (£)</label>
                        <input
                          type="number"
                          value={editingVehicle.monthlyPayment || ''}
                          onChange={(e) => setEditingVehicle({ ...editingVehicle, monthlyPayment: parseFloat(e.target.value) || 0 })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Finance End Date</label>
                        <input
                          type="date"
                          value={editingVehicle.financeEndDate}
                          onChange={(e) => setEditingVehicle({ ...editingVehicle, financeEndDate: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                        />
                      </div>
                    </>
                  )}
                </div>
                {/* Finance Documents */}
                {(editingVehicle.ownership === 'financed' || editingVehicle.ownership === 'leased') && (
                  <div className="mt-3">
                    <label className="block text-xs text-gray-500 mb-2">Finance Documents</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {(editingVehicle.financeDocuments || []).map((doc, idx) => (
                        <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg">
                          <FileText className="w-4 h-4" />
                          <button
                            onClick={() => viewFile(doc)}
                            className="text-sm hover:underline"
                          >
                            {doc.filename}
                          </button>
                          <button
                            onClick={() => removeDocument(doc, true, 'financeDocuments')}
                            className="p-1 hover:bg-purple-200 rounded"
                            title="Remove document"
                          >
                            <Trash className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <label className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 w-fit">
                      <Upload className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Upload finance document</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => handleFileUpload(e, true, 'financeDocuments')}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Insurance */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Insurance</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    type="text"
                    value={editingVehicle.insurer}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, insurer: e.target.value })}
                    placeholder="Insurer"
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  />
                  <input
                    type="text"
                    value={editingVehicle.insurancePolicyNumber}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, insurancePolicyNumber: e.target.value })}
                    placeholder="Policy number"
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  />
                  <select
                    value={editingVehicle.insuranceType || ''}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, insuranceType: e.target.value as Vehicle['insuranceType'] })}
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="">Select cover type...</option>
                    <option value="comprehensive">Comprehensive</option>
                    <option value="third_party_fire_theft">Third Party Fire & Theft</option>
                    <option value="third_party">Third Party Only</option>
                  </select>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Renewal Date</label>
                    <input
                      type="date"
                      value={editingVehicle.insuranceRenewalDate}
                      onChange={(e) => setEditingVehicle({ ...editingVehicle, insuranceRenewalDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      value={editingVehicle.insuredDrivers || ''}
                      onChange={(e) => setEditingVehicle({ ...editingVehicle, insuredDrivers: e.target.value })}
                      placeholder="Insured drivers (e.g., John Smith, Jane Smith)"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                    />
                  </div>
                </div>
                {/* Insurance Documents */}
                <div className="mt-3">
                  <label className="block text-xs text-gray-500 mb-2">Insurance Documents</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(editingVehicle.insuranceDocuments || []).map((doc, idx) => (
                      <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg">
                        <FileText className="w-4 h-4" />
                        <button
                          onClick={() => viewFile(doc)}
                          className="text-sm hover:underline"
                        >
                          {doc.filename}
                        </button>
                        <button
                          onClick={() => removeDocument(doc, true, 'insuranceDocuments')}
                          className="p-1 hover:bg-blue-200 rounded"
                          title="Remove document"
                        >
                          <Trash className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 w-fit">
                    <Upload className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Upload insurance document</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => handleFileUpload(e, true, 'insuranceDocuments')}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Contacts */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Breakdown & Recovery</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={editingVehicle.breakdownProvider}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, breakdownProvider: e.target.value })}
                    placeholder="Breakdown provider"
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  />
                  <input
                    type="text"
                    value={editingVehicle.breakdownMembershipNumber}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, breakdownMembershipNumber: e.target.value })}
                    placeholder="Membership number"
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  />
                  <input
                    type="text"
                    value={editingVehicle.breakdownContact}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, breakdownContact: e.target.value })}
                    placeholder="Breakdown contact"
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  />
                  <input
                    type="text"
                    value={editingVehicle.recoveryContact}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, recoveryContact: e.target.value })}
                    placeholder="Recovery contact"
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  />
                </div>
                {/* Breakdown Documents */}
                <div className="mt-3">
                  <label className="block text-xs text-gray-500 mb-2">Breakdown/Recovery Documents</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(editingVehicle.breakdownDocuments || []).map((doc, idx) => (
                      <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-orange-100 text-orange-700 rounded-lg">
                        <FileText className="w-4 h-4" />
                        <button
                          onClick={() => viewFile(doc)}
                          className="text-sm hover:underline"
                        >
                          {doc.filename}
                        </button>
                        <button
                          onClick={() => removeDocument(doc, true, 'breakdownDocuments')}
                          className="p-1 hover:bg-orange-200 rounded"
                          title="Remove document"
                        >
                          <Trash className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 w-fit">
                    <Upload className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Upload breakdown document</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => handleFileUpload(e, true, 'breakdownDocuments')}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Key Dates */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Key Dates</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">MOT Due Date</label>
                    <input
                      type="date"
                      value={editingVehicle.motDueDate}
                      onChange={(e) => setEditingVehicle({ ...editingVehicle, motDueDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Tax Due Date</label>
                    <input
                      type="date"
                      value={editingVehicle.taxDueDate}
                      onChange={(e) => setEditingVehicle({ ...editingVehicle, taxDueDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Current Mileage</label>
                    <input
                      type="number"
                      value={editingVehicle.currentMileage || ''}
                      onChange={(e) => setEditingVehicle({ ...editingVehicle, currentMileage: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* MOT History */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">MOT History</h4>

                {/* Add New MOT Record Button */}
                <button
                  type="button"
                  onClick={() => {
                    const newMOT: MOTRecord = {
                      id: Date.now().toString(),
                      testDate: new Date().toISOString().split('T')[0],
                      expiryDate: '',
                      testCentre: '',
                      mileage: editingVehicle.currentMileage || 0,
                      result: 'pass',
                      advisories: ''
                    };
                    setEditingVehicle({
                      ...editingVehicle,
                      motHistory: [newMOT, ...(editingVehicle.motHistory || [])]
                    });
                  }}
                  className="mb-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add MOT Record
                </button>

                {/* MOT Records List */}
                {editingVehicle.motHistory && editingVehicle.motHistory.length > 0 && (
                  <div className="space-y-4">
                    {editingVehicle.motHistory.map((mot, index) => (
                      <div key={mot.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-medium text-sm">
                            MOT Record {index === 0 ? '(Current)' : `#${editingVehicle.motHistory!.length - index}`}
                          </h5>
                          <button
                            type="button"
                            onClick={async () => {
                              // Remove MOT record and its documents
                              if (mot.certificate) {
                                await documentService.deleteDocument('certificates', mot.certificate);
                              }
                              if (mot.receipt) {
                                await documentService.deleteDocument('certificates', mot.receipt);
                              }
                              if (mot.otherDocuments) {
                                for (const doc of mot.otherDocuments) {
                                  await documentService.deleteDocument('certificates', doc);
                                }
                              }
                              setEditingVehicle({
                                ...editingVehicle,
                                motHistory: editingVehicle.motHistory!.filter(m => m.id !== mot.id)
                              });
                            }}
                            className="p-1 hover:bg-red-100 rounded text-red-600"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Test Date</label>
                            <input
                              type="date"
                              value={mot.testDate}
                              onChange={(e) => {
                                const updated = [...editingVehicle.motHistory!];
                                updated[index] = { ...mot, testDate: e.target.value };
                                setEditingVehicle({ ...editingVehicle, motHistory: updated });
                              }}
                              className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Expiry Date</label>
                            <input
                              type="date"
                              value={mot.expiryDate}
                              onChange={(e) => {
                                const updated = [...editingVehicle.motHistory!];
                                updated[index] = { ...mot, expiryDate: e.target.value };
                                // Also update the main MOT due date if this is the current MOT
                                if (index === 0) {
                                  setEditingVehicle({
                                    ...editingVehicle,
                                    motHistory: updated,
                                    motDueDate: e.target.value
                                  });
                                } else {
                                  setEditingVehicle({ ...editingVehicle, motHistory: updated });
                                }
                              }}
                              className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Result</label>
                            <select
                              value={mot.result}
                              onChange={(e) => {
                                const updated = [...editingVehicle.motHistory!];
                                updated[index] = { ...mot, result: e.target.value as 'pass' | 'fail' };
                                setEditingVehicle({ ...editingVehicle, motHistory: updated });
                              }}
                              className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm bg-white"
                            >
                              <option value="pass">Pass</option>
                              <option value="fail">Fail</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Test Centre</label>
                            <input
                              type="text"
                              value={mot.testCentre}
                              onChange={(e) => {
                                const updated = [...editingVehicle.motHistory!];
                                updated[index] = { ...mot, testCentre: e.target.value };
                                setEditingVehicle({ ...editingVehicle, motHistory: updated });
                              }}
                              className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                              placeholder="Test centre name"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Mileage</label>
                            <input
                              type="number"
                              value={mot.mileage || ''}
                              onChange={(e) => {
                                const updated = [...editingVehicle.motHistory!];
                                updated[index] = { ...mot, mileage: parseInt(e.target.value) || 0 };
                                setEditingVehicle({ ...editingVehicle, motHistory: updated });
                              }}
                              className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                              placeholder="0"
                            />
                          </div>
                        </div>

                        <div className="mb-3">
                          <label className="block text-xs text-gray-500 mb-1">Advisories/Notes</label>
                          <textarea
                            value={mot.advisories || ''}
                            onChange={(e) => {
                              const updated = [...editingVehicle.motHistory!];
                              updated[index] = { ...mot, advisories: e.target.value };
                              setEditingVehicle({ ...editingVehicle, motHistory: updated });
                            }}
                            className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                            rows={2}
                            placeholder="Any advisories or notes from the MOT test"
                          />
                        </div>

                        {/* MOT Documents */}
                        <div className="space-y-2">
                          {/* Certificate */}
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">MOT Certificate</label>
                            {mot.certificate ? (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => viewFile(mot.certificate!)}
                                  className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm"
                                >
                                  <FileText className="w-3 h-3" />
                                  {mot.certificate.filename}
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await documentService.deleteDocument('certificates', mot.certificate!);
                                    const updated = [...editingVehicle.motHistory!];
                                    updated[index] = { ...mot, certificate: undefined };
                                    setEditingVehicle({ ...editingVehicle, motHistory: updated });
                                  }}
                                  className="p-1 hover:bg-red-100 rounded text-red-600"
                                >
                                  <Trash className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <label className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 w-fit text-sm">
                                <Upload className="w-3 h-3 text-gray-500" />
                                <span className="text-gray-600">Upload certificate</span>
                                <input
                                  type="file"
                                  accept="image/*,.pdf"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const reader = new FileReader();
                                      reader.onload = async (event) => {
                                        const dataUrl = event.target?.result as string;
                                        const docRef = await documentService.saveDocument(
                                          'certificates',
                                          file.name,
                                          dataUrl
                                        );
                                        const updated = [...editingVehicle.motHistory!];
                                        updated[index] = { ...mot, certificate: docRef };
                                        setEditingVehicle({ ...editingVehicle, motHistory: updated });
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                    e.target.value = '';
                                  }}
                                  className="hidden"
                                />
                              </label>
                            )}
                          </div>

                          {/* Receipt */}
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Receipt</label>
                            {mot.receipt ? (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => viewFile(mot.receipt!)}
                                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm"
                                >
                                  <FileText className="w-3 h-3" />
                                  {mot.receipt.filename}
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await documentService.deleteDocument('certificates', mot.receipt!);
                                    const updated = [...editingVehicle.motHistory!];
                                    updated[index] = { ...mot, receipt: undefined };
                                    setEditingVehicle({ ...editingVehicle, motHistory: updated });
                                  }}
                                  className="p-1 hover:bg-red-100 rounded text-red-600"
                                >
                                  <Trash className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <label className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 w-fit text-sm">
                                <Upload className="w-3 h-3 text-gray-500" />
                                <span className="text-gray-600">Upload receipt</span>
                                <input
                                  type="file"
                                  accept="image/*,.pdf"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const reader = new FileReader();
                                      reader.onload = async (event) => {
                                        const dataUrl = event.target?.result as string;
                                        const docRef = await documentService.saveDocument(
                                          'certificates',
                                          file.name,
                                          dataUrl
                                        );
                                        const updated = [...editingVehicle.motHistory!];
                                        updated[index] = { ...mot, receipt: docRef };
                                        setEditingVehicle({ ...editingVehicle, motHistory: updated });
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                    e.target.value = '';
                                  }}
                                  className="hidden"
                                />
                              </label>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <textarea
                  value={editingVehicle.notes}
                  onChange={(e) => setEditingVehicle({ ...editingVehicle, notes: e.target.value })}
                  placeholder="Notes..."
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                />
              </div>

              {/* Service History */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-700">Service History</h4>
                  <button
                    onClick={() => setShowServiceForm(!showServiceForm)}
                    className="flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm"
                  >
                    <Plus className="w-3 h-3" />
                    Add Entry
                  </button>
                </div>

                {showServiceForm && (
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                    {error && (
                      <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                        {error}
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Date *</label>
                        <input
                          type="date"
                          value={newServiceEntry.date}
                          onChange={(e) => setNewServiceEntry({ ...newServiceEntry, date: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Mileage</label>
                        <input
                          type="number"
                          value={newServiceEntry.mileage || ''}
                          onChange={(e) => setNewServiceEntry({ ...newServiceEntry, mileage: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Type</label>
                        <select
                          value={newServiceEntry.type}
                          onChange={(e) => setNewServiceEntry({ ...newServiceEntry, type: e.target.value as ServiceEntry['type'] })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                        >
                          <option value="service">Service</option>
                          <option value="mot">MOT</option>
                          <option value="repair">Repair</option>
                          <option value="tyres">Tyres</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs text-gray-500 mb-1">Description *</label>
                        <input
                          type="text"
                          value={newServiceEntry.description}
                          onChange={(e) => setNewServiceEntry({ ...newServiceEntry, description: e.target.value })}
                          placeholder="Description..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Cost (£)</label>
                        <input
                          type="number"
                          value={newServiceEntry.cost || ''}
                          onChange={(e) => setNewServiceEntry({ ...newServiceEntry, cost: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs text-gray-500 mb-1">Garage</label>
                        <input
                          type="text"
                          value={newServiceEntry.garage}
                          onChange={(e) => setNewServiceEntry({ ...newServiceEntry, garage: e.target.value })}
                          placeholder="Garage name..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                        />
                      </div>
                    </div>

                    <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <h5 className="text-xs font-medium text-blue-900 mb-2">Next Service Reminder (Optional)</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Next Service Date</label>
                          <input
                            type="date"
                            value={newServiceEntry.nextServiceDate || ''}
                            onChange={(e) => setNewServiceEntry({ ...newServiceEntry, nextServiceDate: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Next Service Mileage</label>
                          <input
                            type="number"
                            value={newServiceEntry.nextServiceMileage || ''}
                            onChange={(e) => setNewServiceEntry({ ...newServiceEntry, nextServiceMileage: parseInt(e.target.value) || 0 })}
                            placeholder="e.g., 75000"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Service Documents */}
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <h5 className="text-xs font-medium text-gray-700 mb-2">Service Documents (Optional)</h5>
                      <p className="text-xs text-gray-500 mb-3">Upload receipts, invoices, or service records</p>

                      {newServiceEntry.documents && newServiceEntry.documents.length > 0 && (
                        <div className="space-y-2 mb-3">
                          {newServiceEntry.documents.map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between bg-white p-2 rounded border border-gray-200">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <FileText className="w-4 h-4 text-slate-600 flex-shrink-0" />
                                <span className="text-xs text-gray-700 truncate">{doc.filename}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => viewFile(doc)}
                                  className="p-1 text-slate-600 hover:bg-slate-100 rounded"
                                  title="View document"
                                >
                                  <Eye className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => removeServiceDocument(doc)}
                                  className="p-1 text-red-500 hover:bg-red-50 rounded"
                                  title="Remove document"
                                >
                                  <Trash className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <label className="flex items-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-slate-400 hover:bg-gray-100 cursor-pointer transition-colors">
                        <Upload className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">Upload service document</span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={handleServiceDocumentUpload}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => addServiceEntry(editingVehicle.id)}
                        className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 text-sm"
                      >
                        Add Entry
                      </button>
                      <button
                        onClick={() => {
                          setShowServiceForm(false);
                          setNewServiceEntry(emptyServiceEntry);
                        }}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {editingVehicle.serviceHistory && editingVehicle.serviceHistory.length > 0 ? (
                  <div className="border border-gray-200 rounded-lg overflow-hidden overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-gray-600">Date</th>
                          <th className="px-4 py-2 text-left text-gray-600">Type</th>
                          <th className="px-4 py-2 text-left text-gray-600">Description</th>
                          <th className="px-4 py-2 text-right text-gray-600">Cost</th>
                          <th className="px-4 py-2 text-center text-gray-600">Docs</th>
                          <th className="px-4 py-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {editingVehicle.serviceHistory.map((entry) => (
                          <tr key={entry.id} className="hover:bg-blue-50 cursor-pointer" onClick={() => setEditingServiceEntry(entry)}>
                            <td className="px-4 py-2">{formatDateUK(entry.date)}</td>
                            <td className="px-4 py-2">
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                entry.type === 'mot' ? 'bg-blue-100 text-blue-700' :
                                entry.type === 'service' ? 'bg-green-100 text-green-700' :
                                entry.type === 'repair' ? 'bg-orange-100 text-orange-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {getServiceTypeLabel(entry.type)}
                              </span>
                            </td>
                            <td className="px-4 py-2">{entry.description}</td>
                            <td className="px-4 py-2 text-right">£{entry.cost.toFixed(2)}</td>
                            <td className="px-4 py-2 text-center">
                              {entry.documents && entry.documents.length > 0 ? (
                                <span className="text-xs text-gray-600 flex items-center justify-center gap-1">
                                  <FileText className="w-3 h-3" />
                                  {entry.documents.length}
                                </span>
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => deleteServiceEntry(editingVehicle.id, entry.id)}
                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                                title="Delete service"
                              >
                                <Trash className="w-3 h-3" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td colSpan={3} className="px-4 py-2 text-right font-medium">Total:</td>
                          <td className="px-4 py-2 text-right font-medium">
                            £{editingVehicle.serviceHistory.reduce((sum, e) => sum + e.cost, 0).toFixed(2)}
                          </td>
                          <td colSpan={2}></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No service history recorded</p>
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-6 pt-4 border-t">
              <button
                onClick={updateVehicle}
                className="px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                Save Changes
              </button>
              <button
                onClick={() => setEditingVehicle(null)}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewingDetails && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-slate-100 text-slate-600 rounded-xl">
                  <Car className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{viewingDetails.registration}</h3>
                  <p className="text-gray-600">{viewingDetails.make} {viewingDetails.model} {viewingDetails.year}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const sections = [
                      {
                        title: 'Vehicle Details',
                        fields: [
                          { label: 'Registration', value: viewingDetails.registration },
                          { label: 'Make', value: viewingDetails.make },
                          { label: 'Model', value: viewingDetails.model },
                          { label: 'Year', value: viewingDetails.year },
                          { label: 'Color', value: viewingDetails.color },
                          { label: 'Fuel Type', value: getFuelLabel(viewingDetails.fuelType) },
                          { label: 'Ownership', value: getOwnershipLabel(viewingDetails.ownership) },
                          { label: 'Current Mileage', value: viewingDetails.currentMileage > 0 ? `${viewingDetails.currentMileage.toLocaleString()} miles` : undefined },
                        ]
                      },
                      {
                        title: 'Important Dates',
                        fields: [
                          { label: 'MOT Due', value: viewingDetails.motDueDate ? formatDateUK(viewingDetails.motDueDate) : undefined },
                          { label: 'Tax Due', value: viewingDetails.taxDueDate ? formatDateUK(viewingDetails.taxDueDate) : undefined },
                          { label: 'Insurance Renewal', value: viewingDetails.insuranceRenewalDate ? formatDateUK(viewingDetails.insuranceRenewalDate) : undefined },
                        ]
                      },
                      {
                        title: 'Insurance',
                        fields: [
                          { label: 'Insurer', value: viewingDetails.insurer },
                          { label: 'Policy Number', value: viewingDetails.insurancePolicyNumber },
                          { label: 'Annual Premium', value: viewingDetails.insuranceAnnualCost > 0 ? formatCurrency(viewingDetails.insuranceAnnualCost) : undefined },
                        ]
                      },
                      {
                        title: 'Purchase Information',
                        fields: [
                          { label: 'Purchase Date', value: viewingDetails.purchaseDate ? formatDateUK(viewingDetails.purchaseDate) : undefined },
                          { label: 'Purchase Price', value: viewingDetails.purchasePrice > 0 ? formatCurrency(viewingDetails.purchasePrice) : undefined },
                          { label: 'Purchased From', value: viewingDetails.purchasedFrom },
                          { label: 'Monthly Payment', value: viewingDetails.monthlyPayment > 0 ? formatCurrency(viewingDetails.monthlyPayment) : undefined },
                          { label: 'Finance End Date', value: viewingDetails.financeEndDate ? formatDateUK(viewingDetails.financeEndDate) : undefined },
                        ]
                      },
                      {
                        title: 'Breakdown & Recovery',
                        fields: [
                          { label: 'Provider', value: viewingDetails.breakdownProvider },
                          { label: 'Membership Number', value: viewingDetails.breakdownMembershipNumber },
                          { label: 'Contact Number', value: viewingDetails.breakdownContact },
                        ]
                      },
                    ];

                    // Add MOT History
                    if (viewingDetails.motHistory && viewingDetails.motHistory.length > 0) {
                      viewingDetails.motHistory.forEach((mot, index) => {
                        sections.push({
                          title: index === 0 ? 'MOT History (Current)' : `MOT History #${viewingDetails.motHistory!.length - index}`,
                          fields: [
                            { label: 'Test Date', value: formatDateUK(mot.testDate) },
                            { label: 'Expiry Date', value: formatDateUK(mot.expiryDate) },
                            { label: 'Result', value: mot.result === 'pass' ? 'PASS' : 'FAIL' },
                            { label: 'Test Centre', value: mot.testCentre },
                            { label: 'Mileage', value: mot.mileage > 0 ? `${mot.mileage.toLocaleString()} miles` : undefined },
                            { label: 'Advisories', value: mot.advisories },
                          ]
                        });
                      });
                    }

                    // Add Service History
                    if (viewingDetails.serviceHistory && viewingDetails.serviceHistory.length > 0) {
                      viewingDetails.serviceHistory.forEach((entry, index) => {
                        sections.push({
                          title: `Service Record #${index + 1}`,
                          fields: [
                            { label: 'Date', value: formatDateUK(entry.date) },
                            { label: 'Type', value: getServiceTypeLabel(entry.type) },
                            { label: 'Description', value: entry.description },
                            { label: 'Cost', value: formatCurrency(entry.cost) },
                            { label: 'Mileage', value: entry.mileage > 0 ? `${entry.mileage.toLocaleString()} miles` : undefined },
                            { label: 'Garage', value: entry.garage },
                            { label: 'Next Service Date', value: entry.nextServiceDate ? formatDateUK(entry.nextServiceDate) : undefined },
                            { label: 'Next Service Mileage', value: entry.nextServiceMileage && entry.nextServiceMileage > 0 ? `${entry.nextServiceMileage.toLocaleString()} miles` : undefined },
                          ]
                        });
                      });
                    }

                    printRecord(
                      `${viewingDetails.registration} - ${viewingDetails.make} ${viewingDetails.model}`,
                      `${viewingDetails.year} ${viewingDetails.color || ''}`.trim(),
                      sections,
                      viewingDetails.notes
                    );
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Print"
                >
                  <Printer className="w-5 h-5 text-gray-600" />
                </button>
                <button
                  onClick={() => setViewingDetails(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                {/* Basic Info */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Vehicle Details</h4>
                  <div className="space-y-2 text-sm">
                    {viewingDetails.color && <p><span className="text-gray-500">Color:</span> {viewingDetails.color}</p>}
                    <p><span className="text-gray-500">Fuel:</span> {getFuelLabel(viewingDetails.fuelType)}</p>
                    <p><span className="text-gray-500">Ownership:</span> {getOwnershipLabel(viewingDetails.ownership)}</p>
                    {viewingDetails.currentMileage > 0 && (
                      <p><span className="text-gray-500">Mileage:</span> {viewingDetails.currentMileage.toLocaleString()} miles</p>
                    )}
                  </div>
                </div>

                {/* Purchase Info */}
                {(viewingDetails.purchaseDate || viewingDetails.purchasePrice > 0 || viewingDetails.financeDocuments?.length) && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Purchase Information</h4>
                    <div className="space-y-2 text-sm">
                      {viewingDetails.purchaseDate && <p><span className="text-gray-500">Date:</span> {formatDateUK(viewingDetails.purchaseDate)}</p>}
                      {viewingDetails.purchasePrice > 0 && <p><span className="text-gray-500">Price:</span> £{viewingDetails.purchasePrice.toLocaleString()}</p>}
                      {viewingDetails.purchasedFrom && <p><span className="text-gray-500">From:</span> {viewingDetails.purchasedFrom}</p>}
                      {viewingDetails.monthlyPayment > 0 && <p><span className="text-gray-500">Monthly:</span> £{viewingDetails.monthlyPayment}</p>}
                      {viewingDetails.financeEndDate && <p><span className="text-gray-500">Finance ends:</span> {formatDateUK(viewingDetails.financeEndDate)}</p>}
                    </div>
                    {viewingDetails.financeDocuments && viewingDetails.financeDocuments.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {viewingDetails.financeDocuments.map((doc, idx) => (
                          <button
                            key={idx}
                            onClick={() => viewFile(doc)}
                            className="flex items-center gap-2 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 text-xs"
                          >
                            <FileText className="w-3 h-3" />
                            {doc.filename}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Key Dates */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Key Dates</h4>
                  <div className="space-y-2 text-sm">
                    {viewingDetails.motDueDate && (
                      <p className={isPastDate(viewingDetails.motDueDate) ? 'text-red-600 font-medium' : isDueSoon(viewingDetails.motDueDate) ? 'text-orange-600' : ''}>
                        <span className="text-gray-500">MOT Due:</span> {formatDateUK(viewingDetails.motDueDate)}
                        {isPastDate(viewingDetails.motDueDate) && ' (EXPIRED)'}
                      </p>
                    )}
                    {viewingDetails.taxDueDate && (
                      <p className={isPastDate(viewingDetails.taxDueDate) ? 'text-red-600 font-medium' : isDueSoon(viewingDetails.taxDueDate) ? 'text-orange-600' : ''}>
                        <span className="text-gray-500">Tax Due:</span> {formatDateUK(viewingDetails.taxDueDate)}
                      </p>
                    )}
                    {viewingDetails.insuranceRenewalDate && (
                      <p className={isPastDate(viewingDetails.insuranceRenewalDate) ? 'text-red-600 font-medium' : isDueSoon(viewingDetails.insuranceRenewalDate) ? 'text-orange-600' : ''}>
                        <span className="text-gray-500">Insurance:</span> {formatDateUK(viewingDetails.insuranceRenewalDate)}
                        {isPastDate(viewingDetails.insuranceRenewalDate) && ' (EXPIRED)'}
                      </p>
                    )}
                  </div>
                </div>

                {/* MOT History */}
                {viewingDetails.motHistory && viewingDetails.motHistory.length > 0 && (
                  <div className="bg-emerald-50 rounded-xl p-4">
                    <h4 className="text-sm font-medium text-emerald-700 mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4" /> MOT History
                    </h4>
                    <div className="space-y-3">
                      {viewingDetails.motHistory.map((mot, index) => (
                        <div key={mot.id} className={`p-3 rounded-lg ${index === 0 ? 'bg-white border-2 border-emerald-200' : 'bg-gray-50 border border-gray-200'}`}>
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  {formatDateUK(mot.testDate)}
                                </span>
                                {index === 0 && (
                                  <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded">Current</span>
                                )}
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  mot.result === 'pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                }`}>
                                  {mot.result === 'pass' ? 'PASS' : 'FAIL'}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                Expires: {formatDateUK(mot.expiryDate)}
                                {mot.testCentre && ` • ${mot.testCentre}`}
                                {mot.mileage > 0 && ` • ${mot.mileage.toLocaleString()} miles`}
                              </p>
                            </div>
                          </div>

                          {mot.advisories && (
                            <div className="text-xs text-gray-600 mb-2 p-2 bg-yellow-50 rounded">
                              <span className="font-medium">Advisories:</span> {mot.advisories}
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2">
                            {mot.certificate && (
                              <button
                                onClick={() => viewFile(mot.certificate!)}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-xs"
                              >
                                <FileText className="w-3 h-3" />
                                Certificate
                              </button>
                            )}
                            {mot.receipt && (
                              <button
                                onClick={() => viewFile(mot.receipt!)}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-xs"
                              >
                                <FileText className="w-3 h-3" />
                                Receipt
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                {/* Insurance */}
                {(viewingDetails.insurer || viewingDetails.insuranceDocuments?.length) && (
                  <div className="bg-blue-50 rounded-xl p-4">
                    <h4 className="text-sm font-medium text-blue-700 mb-3 flex items-center gap-2">
                      <Shield className="w-4 h-4" /> Insurance
                    </h4>
                    <div className="space-y-2 text-sm">
                      {viewingDetails.insurer && <p><span className="text-gray-500">Insurer:</span> {viewingDetails.insurer}</p>}
                      {viewingDetails.insurancePolicyNumber && <p><span className="text-gray-500">Policy:</span> {viewingDetails.insurancePolicyNumber}</p>}
                      {viewingDetails.insuranceType && (
                        <p><span className="text-gray-500">Cover:</span> {
                          viewingDetails.insuranceType === 'comprehensive' ? 'Comprehensive' :
                          viewingDetails.insuranceType === 'third_party_fire_theft' ? 'Third Party Fire & Theft' :
                          viewingDetails.insuranceType === 'third_party' ? 'Third Party Only' : viewingDetails.insuranceType
                        }</p>
                      )}
                      {viewingDetails.insuredDrivers && <p><span className="text-gray-500">Insured:</span> {viewingDetails.insuredDrivers}</p>}
                      {viewingDetails.insuranceRenewalDate && (
                        <p className={isPastDate(viewingDetails.insuranceRenewalDate) ? 'text-red-600 font-medium' : isDueSoon(viewingDetails.insuranceRenewalDate) ? 'text-orange-600' : ''}>
                          <span className="text-gray-500">Renewal:</span> {formatDateUK(viewingDetails.insuranceRenewalDate)}
                          {isPastDate(viewingDetails.insuranceRenewalDate) && ' (EXPIRED)'}
                          {isDueSoon(viewingDetails.insuranceRenewalDate) && !isPastDate(viewingDetails.insuranceRenewalDate) && ' (Due Soon)'}
                        </p>
                      )}
                    </div>
                    {viewingDetails.insuranceDocuments && viewingDetails.insuranceDocuments.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {viewingDetails.insuranceDocuments.map((doc, idx) => (
                          <button
                            key={idx}
                            onClick={() => viewFile(doc)}
                            className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-xs"
                          >
                            <FileText className="w-3 h-3" />
                            {doc.filename}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Contacts */}
                {(viewingDetails.breakdownProvider || viewingDetails.breakdownContact || viewingDetails.recoveryContact || viewingDetails.breakdownDocuments?.length) && (
                  <div className="bg-orange-50 rounded-xl p-4">
                    <h4 className="text-sm font-medium text-orange-700 mb-3 flex items-center gap-2">
                      <Phone className="w-4 h-4" /> Breakdown & Recovery
                    </h4>
                    <div className="space-y-2 text-sm">
                      {viewingDetails.breakdownProvider && <p><span className="text-gray-500">Provider:</span> {viewingDetails.breakdownProvider}</p>}
                      {viewingDetails.breakdownMembershipNumber && <p><span className="text-gray-500">Membership:</span> {viewingDetails.breakdownMembershipNumber}</p>}
                      {viewingDetails.breakdownContact && <p><span className="text-gray-500">Contact:</span> {viewingDetails.breakdownContact}</p>}
                      {viewingDetails.recoveryContact && <p><span className="text-gray-500">Recovery:</span> {viewingDetails.recoveryContact}</p>}
                    </div>
                    {viewingDetails.breakdownDocuments && viewingDetails.breakdownDocuments.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {viewingDetails.breakdownDocuments.map((doc, idx) => (
                          <button
                            key={idx}
                            onClick={() => viewFile(doc)}
                            className="flex items-center gap-2 px-3 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 text-xs"
                          >
                            <FileText className="w-3 h-3" />
                            {doc.filename}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>

            {/* Service History */}
            {viewingDetails.serviceHistory && viewingDetails.serviceHistory.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <Wrench className="w-4 h-4" /> Service History
                </h4>
                <div className="border border-gray-200 rounded-lg overflow-hidden overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-gray-600">Date</th>
                        <th className="px-4 py-2 text-left text-gray-600">Type</th>
                        <th className="px-4 py-2 text-left text-gray-600">Description</th>
                        <th className="px-4 py-2 text-right text-gray-600">Cost</th>
                        <th className="px-4 py-2 text-center text-gray-600">Docs</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {viewingDetails.serviceHistory.map((entry) => (
                        <tr key={entry.id} className="hover:bg-blue-50 cursor-pointer" onClick={() => setViewingServiceEntry(entry)}>
                          <td className="px-4 py-2">{formatDateUK(entry.date)}</td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              entry.type === 'mot' ? 'bg-blue-100 text-blue-700' :
                              entry.type === 'service' ? 'bg-green-100 text-green-700' :
                              entry.type === 'repair' ? 'bg-orange-100 text-orange-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {getServiceTypeLabel(entry.type)}
                            </span>
                          </td>
                          <td className="px-4 py-2">{entry.description}</td>
                          <td className="px-4 py-2 text-right">£{entry.cost.toFixed(2)}</td>
                          <td className="px-4 py-2 text-center">
                            {entry.documents && entry.documents.length > 0 ? (
                              <span className="text-xs text-gray-600 flex items-center justify-center gap-1">
                                <FileText className="w-3 h-3" />
                                {entry.documents.length}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={3} className="px-4 py-2 text-right font-medium">Total:</td>
                        <td className="px-4 py-2 text-right font-medium">
                          £{viewingDetails.serviceHistory.reduce((sum, e) => sum + e.cost, 0).toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Notes */}
            {viewingDetails.notes && (
              <div className="mt-6 bg-gray-50 rounded-xl p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Notes</h4>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{viewingDetails.notes}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 mt-6 pt-4 border-t">
              <button
                onClick={() => {
                  setViewingDetails(null);
                  startEdit(viewingDetails);
                }}
                className="flex-1 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={() => setViewingDetails(null)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
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

      {/* View/Edit Service Entry Modal */}
      {(viewingServiceEntry || editingServiceEntry) && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                {editingServiceEntry ? 'Edit Service Record' : 'Service Record Details'}
              </h3>
              <button
                onClick={() => {
                  setEditingServiceEntry(null);
                  setViewingServiceEntry(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && editingServiceEntry && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {editingServiceEntry ? (
                /* Edit Mode */
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                      <input
                        type="date"
                        value={editingServiceEntry.date}
                        onChange={(e) => setEditingServiceEntry({ ...editingServiceEntry, date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mileage</label>
                      <input
                        type="number"
                        value={editingServiceEntry.mileage || ''}
                        onChange={(e) => setEditingServiceEntry({ ...editingServiceEntry, mileage: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select
                        value={editingServiceEntry.type}
                        onChange={(e) => setEditingServiceEntry({ ...editingServiceEntry, type: e.target.value as ServiceEntry['type'] })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                      >
                        <option value="service">Service</option>
                        <option value="mot">MOT</option>
                        <option value="repair">Repair</option>
                        <option value="tyres">Tyres</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                      <input
                        type="text"
                        value={editingServiceEntry.description}
                        onChange={(e) => setEditingServiceEntry({ ...editingServiceEntry, description: e.target.value })}
                        placeholder="Description..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cost (£)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editingServiceEntry.cost || ''}
                        onChange={(e) => setEditingServiceEntry({ ...editingServiceEntry, cost: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Garage</label>
                    <input
                      type="text"
                      value={editingServiceEntry.garage}
                      onChange={(e) => setEditingServiceEntry({ ...editingServiceEntry, garage: e.target.value })}
                      placeholder="Garage name..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                    />
                  </div>

                  {/* Next Service Reminder */}
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h5 className="text-sm font-medium text-blue-900 mb-3">Next Service Reminder (Optional)</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Next Service Date</label>
                        <input
                          type="date"
                          value={editingServiceEntry.nextServiceDate || ''}
                          onChange={(e) => setEditingServiceEntry({ ...editingServiceEntry, nextServiceDate: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Next Service Mileage</label>
                        <input
                          type="number"
                          value={editingServiceEntry.nextServiceMileage || ''}
                          onChange={(e) => setEditingServiceEntry({ ...editingServiceEntry, nextServiceMileage: parseInt(e.target.value) || 0 })}
                          placeholder="e.g., 75000"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Service Documents */}
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h5 className="text-sm font-medium text-gray-700 mb-3">Service Documents</h5>

                    {editingServiceEntry.documents && editingServiceEntry.documents.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {editingServiceEntry.documents.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between bg-white p-3 rounded border border-gray-200">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <FileText className="w-4 h-4 text-slate-600 flex-shrink-0" />
                              <span className="text-sm text-gray-700 truncate">{doc.filename}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => viewFile(doc)}
                                className="p-1.5 text-slate-600 hover:bg-slate-100 rounded"
                                title="View document"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => removeEditServiceDocument(doc)}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                                title="Remove document"
                              >
                                <Trash className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <label className="flex items-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-slate-400 hover:bg-gray-100 cursor-pointer transition-colors">
                      <Upload className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Upload service document</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleEditServiceDocumentUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="flex gap-2 pt-4 border-t">
                    <button
                      onClick={() => {
                        if (editingVehicle) {
                          updateServiceEntry(editingVehicle.id, editingServiceEntry);
                        } else if (viewingDetails) {
                          updateServiceEntry(viewingDetails.id, editingServiceEntry);
                        }
                      }}
                      className="flex-1 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={() => setEditingServiceEntry(null)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : viewingServiceEntry ? (
                /* View Mode */
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Date</label>
                      <p className="text-sm font-medium">{formatDateUK(viewingServiceEntry.date)}</p>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Type</label>
                      <p className="text-sm font-medium">{getServiceTypeLabel(viewingServiceEntry.type)}</p>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Mileage</label>
                      <p className="text-sm font-medium">{viewingServiceEntry.mileage > 0 ? viewingServiceEntry.mileage.toLocaleString() : '-'}</p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs text-gray-500 mb-1">Description</label>
                      <p className="text-sm font-medium">{viewingServiceEntry.description}</p>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Cost</label>
                      <p className="text-sm font-medium">£{viewingServiceEntry.cost.toFixed(2)}</p>
                    </div>
                    {viewingServiceEntry.garage && (
                      <div className="md:col-span-2">
                        <label className="block text-xs text-gray-500 mb-1">Garage</label>
                        <p className="text-sm font-medium">{viewingServiceEntry.garage}</p>
                      </div>
                    )}
                  </div>

                  {(viewingServiceEntry.nextServiceDate || viewingServiceEntry.nextServiceMileage) && (
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h5 className="text-sm font-medium text-blue-900 mb-2">Next Service Due</h5>
                      <div className="space-y-1">
                        {viewingServiceEntry.nextServiceDate && (
                          <p className="text-sm text-gray-700">Date: {formatDateUK(viewingServiceEntry.nextServiceDate)}</p>
                        )}
                        {viewingServiceEntry.nextServiceMileage && viewingServiceEntry.nextServiceMileage > 0 && (
                          <p className="text-sm text-gray-700">Mileage: {viewingServiceEntry.nextServiceMileage.toLocaleString()} miles</p>
                        )}
                      </div>
                    </div>
                  )}

                  {viewingServiceEntry.documents && viewingServiceEntry.documents.length > 0 && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h5 className="text-sm font-medium text-gray-700 mb-3">Documents ({viewingServiceEntry.documents.length})</h5>
                      <div className="space-y-2">
                        {viewingServiceEntry.documents.map((doc) => (
                          <button
                            key={doc.id}
                            onClick={() => viewFile(doc)}
                            className="w-full flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                          >
                            <FileText className="w-4 h-4 text-slate-600 flex-shrink-0" />
                            <span className="text-sm text-gray-700 flex-1 truncate">{doc.filename}</span>
                            <Eye className="w-4 h-4 text-gray-400" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4 border-t">
                    <button
                      onClick={() => {
                        setEditingServiceEntry(viewingServiceEntry);
                        setViewingServiceEntry(null);
                      }}
                      className="flex-1 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => setViewingServiceEntry(null)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Loading Document Overlay */}
      {loadingDocument && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[80]">
          <div className="bg-white rounded-xl p-6 shadow-xl">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-green-500 border-t-transparent mx-auto"></div>
            <p className="mt-3 text-gray-600">Loading document...</p>
          </div>
        </div>
      )}
    </div>
  );
}
