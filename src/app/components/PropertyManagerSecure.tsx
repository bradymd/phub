import { useState, useEffect } from 'react';
import { X, Plus, Trash, Home, Calendar, Edit2, FileText, Search, Eye, EyeOff, Grid3x3, List, Download, AlertCircle, Phone, Shield, Wrench, Upload, Globe, Zap, Droplets, Wifi, Building2, CheckCircle } from 'lucide-react';
import { useStorage, useDocumentService } from '../../contexts/StorageContext';
import { DocumentReference } from '../../services/document-service';

// Maintenance item for recurring annual checks
interface MaintenanceItem {
  id: string;
  name: string; // e.g., "Gas Inspection", "Air Conditioning Check", "Burglar Alarm"
  company: string;
  contactDetails: string;
  annualCost: number;
  lastDate: string;
  nextDueDate: string;
  notes: string;
  documents?: DocumentReference[];
}

// Utility provider
interface Utility {
  id: string;
  type: 'water' | 'energy' | 'broadband' | 'other';
  company: string;
  contactDetails: string;
  monthlyCost: number;
  websiteUrl: string;
  accountNumber: string;
  notes: string;
}

interface Property {
  id: string;
  // Basic info
  address: string;
  postcode: string;
  propertyType: 'house' | 'flat' | 'bungalow' | 'other';
  movedInDate: string;

  // Finance
  financeType: 'mortgage' | 'rental' | 'owned';
  monthlyPayment: number;
  lender: string; // Mortgage provider or landlord
  financeEndDate: string;
  financeDocuments?: DocumentReference[]; // Deeds, mortgage docs, rental agreements

  // Insurance
  insuranceCompany: string;
  insurancePolicyNumber: string;
  insuranceAnnualCost: number;
  insuranceRenewalDate: string;
  insuranceNotes: string;
  insuranceDocuments?: DocumentReference[];

  // Council Tax
  councilTaxBand: string;
  councilTaxAnnualCost: number;
  councilTaxAuthority: string;
  councilTaxAccountNumber: string;
  councilTaxDocuments?: DocumentReference[];

  // Maintenance items (flexible list)
  maintenanceItems: MaintenanceItem[];

  // Utilities
  utilities: Utility[];

  notes: string;
}

interface PropertyManagerSecureProps {
  onClose: () => void;
}

const emptyProperty: Omit<Property, 'id'> = {
  address: '',
  postcode: '',
  propertyType: 'house',
  movedInDate: '',
  financeType: 'mortgage',
  monthlyPayment: 0,
  lender: '',
  financeEndDate: '',
  financeDocuments: [],
  insuranceCompany: '',
  insurancePolicyNumber: '',
  insuranceAnnualCost: 0,
  insuranceRenewalDate: '',
  insuranceNotes: '',
  insuranceDocuments: [],
  councilTaxBand: '',
  councilTaxAnnualCost: 0,
  councilTaxAuthority: '',
  councilTaxAccountNumber: '',
  councilTaxDocuments: [],
  maintenanceItems: [],
  utilities: [],
  notes: ''
};

const emptyMaintenanceItem: Omit<MaintenanceItem, 'id'> = {
  name: '',
  company: '',
  contactDetails: '',
  annualCost: 0,
  lastDate: '',
  nextDueDate: '',
  notes: '',
  documents: []
};

const emptyUtility: Omit<Utility, 'id'> = {
  type: 'energy',
  company: '',
  contactDetails: '',
  monthlyCost: 0,
  websiteUrl: '',
  accountNumber: '',
  notes: ''
};

// Format date from YYYY-MM-DD to DD/MM/YYYY for UK display
const formatDateUK = (dateStr: string): string => {
  if (!dateStr) return '';

  // Handle YYYY-MM-DD format (standard HTML date input format)
  if (dateStr.includes('-')) {
    const [year, month, day] = dateStr.split('-');
    if (year && month && day && year.length === 4) {
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }
  }

  // Handle slash format - assume DD/MM/YYYY (UK format)
  if (dateStr.includes('/')) {
    return dateStr;
  }

  // Fallback: return as-is
  return dateStr;
};

// Convert DD/MM/YYYY to YYYY-MM-DD for date input
const toInputDate = (dateStr: string): string => {
  if (!dateStr) return '';

  // Already in YYYY-MM-DD format
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateStr;
  }

  // Convert from DD/MM/YYYY
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  return '';
};

// Convert YYYY-MM-DD from date input to YYYY-MM-DD for storage (keeping ISO format)
const fromInputDate = (dateStr: string): string => {
  if (!dateStr) return '';

  // Input is YYYY-MM-DD - keep it in this format!
  // We're now storing dates in ISO format (YYYY-MM-DD) for consistency
  if (dateStr.includes('-')) {
    return dateStr; // Keep in YYYY-MM-DD format
  }

  // If it's already in DD/MM/YYYY, convert to YYYY-MM-DD
  if (dateStr.includes('/')) {
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return dateStr;
};

// Check if a date is in the past
const isPastDate = (dateStr: string): boolean => {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
};

// Check if date is within 30 days
const isDueSoon = (dateStr: string): boolean => {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const today = new Date();
  const thirtyDays = new Date();
  thirtyDays.setDate(today.getDate() + 30);
  return date >= today && date <= thirtyDays;
};

export function PropertyManagerSecure({ onClose }: PropertyManagerSecureProps) {
  const storage = useStorage();
  const documentService = useDocumentService();
  const [properties, setProperties] = useState<Property[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [newProperty, setNewProperty] = useState(emptyProperty);
  const [viewingDocument, setViewingDocument] = useState<{ docRef: DocumentReference; dataUrl: string; blobUrl: string } | null>(null);
  const [loadingDocument, setLoadingDocument] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSummary, setShowSummary] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [viewingDetails, setViewingDetails] = useState<Property | null>(null);

  // Maintenance item form state
  const [newMaintenanceItem, setNewMaintenanceItem] = useState(emptyMaintenanceItem);
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [editingMaintenanceItem, setEditingMaintenanceItem] = useState<MaintenanceItem | null>(null);

  // Utility form state
  const [newUtility, setNewUtility] = useState(emptyUtility);
  const [showUtilityForm, setShowUtilityForm] = useState(false);
  const [editingUtility, setEditingUtility] = useState<Utility | null>(null);

  useEffect(() => {
    loadProperties();
  }, []);

  useEffect(() => {
    if (showAddForm) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [showAddForm]);

  const loadProperties = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await storage.get<Property>('properties');
      setProperties(data);
    } catch (err) {
      setError('Failed to load properties');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const saveProperty = async () => {
    if (!newProperty.address) {
      setError('Address is required');
      return;
    }

    try {
      setError('');
      const property: Property = {
        ...newProperty,
        id: `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        maintenanceItems: newProperty.maintenanceItems || [],
        utilities: newProperty.utilities || []
      };
      await storage.add('properties', property);
      setProperties([...properties, property]);
      setNewProperty(emptyProperty);
      setShowAddForm(false);
    } catch (err) {
      setError('Failed to save property');
      console.error(err);
    }
  };

  const updateProperty = async () => {
    if (!editingProperty) return;

    try {
      setError('');
      await storage.update('properties', editingProperty.id, editingProperty);
      setProperties(properties.map(p => p.id === editingProperty.id ? editingProperty : p));
      setEditingProperty(null);
    } catch (err) {
      setError('Failed to update property');
      console.error(err);
    }
  };

  const deleteProperty = async (id: string) => {
    if (!confirm('Are you sure you want to delete this property? This will also delete all associated documents.')) {
      return;
    }

    try {
      setError('');
      const property = properties.find(p => p.id === id);
      if (property) {
        // Delete all associated documents
        const allDocs = [
          ...(property.financeDocuments || []),
          ...(property.insuranceDocuments || []),
          ...(property.councilTaxDocuments || []),
          ...(property.maintenanceItems || []).flatMap(m => m.documents || [])
        ];
        if (allDocs.length > 0) {
          await documentService.deleteDocuments('certificates', allDocs);
        }
      }
      await storage.remove('properties', id);
      setProperties(properties.filter(p => p.id !== id));
      setEditingProperty(null);
      setViewingDetails(null);
    } catch (err) {
      setError('Failed to delete property');
      console.error(err);
    }
  };

  // Maintenance item functions
  const addMaintenanceItem = (propertyId: string) => {
    if (!newMaintenanceItem.name) {
      setError('Maintenance item name is required');
      return;
    }

    const item: MaintenanceItem = {
      ...newMaintenanceItem,
      id: `maint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    if (editingProperty && editingProperty.id === propertyId) {
      setEditingProperty({
        ...editingProperty,
        maintenanceItems: [...(editingProperty.maintenanceItems || []), item]
      });
    }

    setNewMaintenanceItem(emptyMaintenanceItem);
    setShowMaintenanceForm(false);
  };

  const updateMaintenanceItem = (propertyId: string, updatedItem: MaintenanceItem) => {
    if (editingProperty && editingProperty.id === propertyId) {
      setEditingProperty({
        ...editingProperty,
        maintenanceItems: editingProperty.maintenanceItems.map(m =>
          m.id === updatedItem.id ? updatedItem : m
        )
      });
    }
    setEditingMaintenanceItem(null);
  };

  const deleteMaintenanceItem = async (propertyId: string, itemId: string) => {
    if (!confirm('Delete this maintenance item?')) return;

    if (editingProperty && editingProperty.id === propertyId) {
      const item = editingProperty.maintenanceItems.find(m => m.id === itemId);
      if (item?.documents?.length) {
        await documentService.deleteDocuments('certificates', item.documents);
      }
      setEditingProperty({
        ...editingProperty,
        maintenanceItems: editingProperty.maintenanceItems.filter(m => m.id !== itemId)
      });
    }
  };

  // Utility functions
  const addUtility = (propertyId: string) => {
    if (!newUtility.company) {
      setError('Company name is required');
      return;
    }

    const utility: Utility = {
      ...newUtility,
      id: `util_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    if (editingProperty && editingProperty.id === propertyId) {
      setEditingProperty({
        ...editingProperty,
        utilities: [...(editingProperty.utilities || []), utility]
      });
    }

    setNewUtility(emptyUtility);
    setShowUtilityForm(false);
  };

  const updateUtility = (propertyId: string, updatedUtility: Utility) => {
    if (editingProperty && editingProperty.id === propertyId) {
      setEditingProperty({
        ...editingProperty,
        utilities: editingProperty.utilities.map(u =>
          u.id === updatedUtility.id ? updatedUtility : u
        )
      });
    }
    setEditingUtility(null);
  };

  const deleteUtility = (propertyId: string, utilityId: string) => {
    if (!confirm('Delete this utility?')) return;

    if (editingProperty && editingProperty.id === propertyId) {
      setEditingProperty({
        ...editingProperty,
        utilities: editingProperty.utilities.filter(u => u.id !== utilityId)
      });
    }
  };

  // Document handling
  const dataUrlToBlobUrl = (dataUrl: string): string => {
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return dataUrl;
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
      setError('Document reference is missing');
      return;
    }

    if (viewingDocument?.blobUrl) {
      URL.revokeObjectURL(viewingDocument.blobUrl);
    }

    try {
      setLoadingDocument(true);
      setError('');
      const dataUrl = await documentService.loadDocument('certificates', docRef);
      const blobUrl = dataUrlToBlobUrl(dataUrl);
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
      setError('Failed to download file');
      console.error('Download error:', err);
    }
  };

  // Generic document upload handler
  const handleDocumentUpload = async (
    file: File,
    docType: 'finance' | 'insurance' | 'councilTax' | 'maintenance',
    maintenanceItemId?: string
  ) => {
    if (!file || !editingProperty) return;

    try {
      setError('');
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result as string;
          const docRef = await documentService.saveDocument('certificates', file.name, base64);

          if (docType === 'finance') {
            setEditingProperty({
              ...editingProperty,
              financeDocuments: [...(editingProperty.financeDocuments || []), docRef]
            });
          } else if (docType === 'insurance') {
            setEditingProperty({
              ...editingProperty,
              insuranceDocuments: [...(editingProperty.insuranceDocuments || []), docRef]
            });
          } else if (docType === 'councilTax') {
            setEditingProperty({
              ...editingProperty,
              councilTaxDocuments: [...(editingProperty.councilTaxDocuments || []), docRef]
            });
          } else if (docType === 'maintenance' && maintenanceItemId) {
            setEditingProperty({
              ...editingProperty,
              maintenanceItems: editingProperty.maintenanceItems.map(m =>
                m.id === maintenanceItemId
                  ? { ...m, documents: [...(m.documents || []), docRef] }
                  : m
              )
            });
          }
        } catch (err) {
          setError('Failed to upload document');
          console.error(err);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Failed to read file');
      console.error(err);
    }
  };

  const removeDocument = async (
    docRef: DocumentReference,
    docType: 'finance' | 'insurance' | 'councilTax' | 'maintenance',
    maintenanceItemId?: string
  ) => {
    if (!editingProperty) return;

    try {
      await documentService.deleteDocument('certificates', docRef);

      if (docType === 'finance') {
        setEditingProperty({
          ...editingProperty,
          financeDocuments: (editingProperty.financeDocuments || []).filter(d => d.id !== docRef.id)
        });
      } else if (docType === 'insurance') {
        setEditingProperty({
          ...editingProperty,
          insuranceDocuments: (editingProperty.insuranceDocuments || []).filter(d => d.id !== docRef.id)
        });
      } else if (docType === 'councilTax') {
        setEditingProperty({
          ...editingProperty,
          councilTaxDocuments: (editingProperty.councilTaxDocuments || []).filter(d => d.id !== docRef.id)
        });
      } else if (docType === 'maintenance' && maintenanceItemId) {
        setEditingProperty({
          ...editingProperty,
          maintenanceItems: editingProperty.maintenanceItems.map(m =>
            m.id === maintenanceItemId
              ? { ...m, documents: (m.documents || []).filter(d => d.id !== docRef.id) }
              : m
          )
        });
      }
    } catch (err) {
      setError('Failed to remove document');
      console.error(err);
    }
  };

  // Get utility type icon
  const getUtilityIcon = (type: string) => {
    switch (type) {
      case 'water': return <Droplets className="w-4 h-4 text-blue-500" />;
      case 'energy': return <Zap className="w-4 h-4 text-yellow-500" />;
      case 'broadband': return <Wifi className="w-4 h-4 text-purple-500" />;
      default: return <Building2 className="w-4 h-4 text-gray-500" />;
    }
  };

  const getUtilityTypeLabel = (type: string) => {
    switch (type) {
      case 'water': return 'Water';
      case 'energy': return 'Energy';
      case 'broadband': return 'Broadband';
      default: return 'Other';
    }
  };

  // Calculate summary counts
  const counts = {
    total: properties.length,
    mortgaged: properties.filter(p => p.financeType === 'mortgage').length,
    rented: properties.filter(p => p.financeType === 'rental').length,
    owned: properties.filter(p => p.financeType === 'owned').length,
    totalMonthlyPayments: properties.reduce((sum, p) => sum + (p.monthlyPayment || 0), 0),
    totalInsurance: properties.reduce((sum, p) => sum + (p.insuranceAnnualCost || 0), 0),
    totalCouncilTax: properties.reduce((sum, p) => sum + (p.councilTaxAnnualCost || 0), 0),
    maintenanceDueSoon: properties.reduce((count, p) =>
      count + (p.maintenanceItems || []).filter(m => isDueSoon(m.nextDueDate)).length, 0
    ),
    maintenanceOverdue: properties.reduce((count, p) =>
      count + (p.maintenanceItems || []).filter(m => isPastDate(m.nextDueDate)).length, 0
    )
  };

  // Filter properties
  const filteredProperties = properties.filter(property => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      property.address.toLowerCase().includes(query) ||
      property.postcode.toLowerCase().includes(query) ||
      property.lender.toLowerCase().includes(query)
    );
  });

  // Document list component - colored clickable chips matching other panels
  const DocumentList = ({
    documents,
    docType,
    maintenanceItemId,
    canEdit = true
  }: {
    documents: DocumentReference[];
    docType: 'finance' | 'insurance' | 'councilTax' | 'maintenance';
    maintenanceItemId?: string;
    canEdit?: boolean;
  }) => {
    const colorClasses = {
      finance: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
      insurance: 'bg-green-100 text-green-700 hover:bg-green-200',
      councilTax: 'bg-amber-100 text-amber-700 hover:bg-amber-200',
      maintenance: 'bg-purple-100 text-purple-700 hover:bg-purple-200'
    };

    return (
      <div className="flex flex-wrap gap-2">
        {documents.map((doc) => (
          <div key={doc.id} className="flex items-center gap-1">
            <button
              onClick={() => viewFile(doc)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${colorClasses[docType]}`}
            >
              <FileText className="w-3 h-3" />
              <span className="truncate max-w-[200px]">{doc.filename}</span>
            </button>
            {canEdit && (
              <button
                onClick={() => removeDocument(doc, docType, maintenanceItemId)}
                className="p-1 text-red-500 hover:bg-red-50 rounded"
                title="Remove"
              >
                <Trash className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Upload button component
  const UploadButton = ({
    onUpload,
    label = "Upload document"
  }: {
    onUpload: (file: File) => void;
    label?: string;
  }) => (
    <label className="flex items-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-slate-400 hover:bg-gray-50 cursor-pointer transition-colors">
      <Upload className="w-4 h-4 text-gray-500" />
      <span className="text-sm text-gray-600">{label}</span>
      <input
        type="file"
        accept="image/*,.pdf"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = '';
        }}
        className="hidden"
      />
    </label>
  );

  return (
    <div className="fixed inset-0 bg-black/60 z-50 overflow-hidden">
      <div className="absolute inset-2 bg-white rounded-2xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-600 to-slate-800 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <Home className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-white flex items-center gap-2">
                  Property Maintenance
                  <span className="text-xs px-2 py-1 bg-green-500/30 text-green-100 rounded-full">Encrypted</span>
                </h2>
                <p className="text-sm text-slate-200 mt-1">Manage your properties, mortgages, insurance, and maintenance</p>
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
                onClick={() => {
                  setNewProperty(emptyProperty);
                  setShowAddForm(true);
                }}
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

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto min-h-0 p-6" style={{ willChange: 'transform', transform: 'translateZ(0)' }}>
          {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-300 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            {error}
            <button onClick={() => setError('')} className="ml-auto">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Summary Section */}
        {showSummary && properties.length > 0 && (
          <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Overview</h3>
              <button
                onClick={() => setShowSummary(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <EyeOff className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-emerald-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Properties</p>
                <p className="text-2xl font-semibold text-gray-900">{counts.total}</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Monthly Payments</p>
                <p className="text-2xl font-semibold text-gray-900">£{counts.totalMonthlyPayments.toLocaleString()}</p>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Annual Insurance</p>
                <p className="text-2xl font-semibold text-gray-900">£{counts.totalInsurance.toLocaleString()}</p>
              </div>
              <div className="bg-amber-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Annual Council Tax</p>
                <p className="text-2xl font-semibold text-gray-900">£{counts.totalCouncilTax.toLocaleString()}</p>
              </div>
            </div>
            {(counts.maintenanceOverdue > 0 || counts.maintenanceDueSoon > 0) && (
              <div className="mt-4 flex gap-4">
                {counts.maintenanceOverdue > 0 && (
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">{counts.maintenanceOverdue} overdue maintenance items</span>
                  </div>
                )}
                {counts.maintenanceDueSoon > 0 && (
                  <div className="flex items-center gap-2 text-orange-600">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm font-medium">{counts.maintenanceDueSoon} due within 30 days</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Add Property Form */}
        {showAddForm && (
          <div className="mb-6 bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Home className="w-5 h-5 text-emerald-600" />
              Add New Property
            </h3>

            <div className="space-y-6">
              {/* Basic Info */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4" /> Property Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Address *</label>
                    <input
                      type="text"
                      value={newProperty.address}
                      onChange={(e) => setNewProperty({ ...newProperty, address: e.target.value })}
                      placeholder="Full address..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Postcode</label>
                    <input
                      type="text"
                      value={newProperty.postcode}
                      onChange={(e) => setNewProperty({ ...newProperty, postcode: e.target.value.toUpperCase() })}
                      placeholder="e.g., SW1A 1AA"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Property Type</label>
                    <select
                      value={newProperty.propertyType}
                      onChange={(e) => setNewProperty({ ...newProperty, propertyType: e.target.value as Property['propertyType'] })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    >
                      <option value="house">House</option>
                      <option value="flat">Flat</option>
                      <option value="bungalow">Bungalow</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Moved In Date</label>
                    <input
                      type="date"
                      value={newProperty.movedInDate}
                      onChange={(e) => setNewProperty({ ...newProperty, movedInDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Finance */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="text-sm font-medium text-blue-900 mb-3">Finance</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Finance Type</label>
                    <select
                      value={newProperty.financeType}
                      onChange={(e) => setNewProperty({ ...newProperty, financeType: e.target.value as Property['financeType'] })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    >
                      <option value="mortgage">Mortgage</option>
                      <option value="rental">Rental</option>
                      <option value="owned">Owned Outright</option>
                    </select>
                  </div>
                  {newProperty.financeType !== 'owned' && (
                    <>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Monthly Payment (£)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={newProperty.monthlyPayment ?? ''}
                          onChange={(e) => setNewProperty({ ...newProperty, monthlyPayment: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          placeholder="0 if paid off"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">
                          {newProperty.financeType === 'mortgage' ? 'Lender' : 'Landlord'}
                        </label>
                        <input
                          type="text"
                          value={newProperty.lender}
                          onChange={(e) => setNewProperty({ ...newProperty, lender: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm text-gray-600 mb-1">Notes</label>
                <textarea
                  value={newProperty.notes}
                  onChange={(e) => setNewProperty({ ...newProperty, notes: e.target.value })}
                  placeholder="Any additional notes..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={saveProperty}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Save Property
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewProperty(emptyProperty);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Property List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        ) : filteredProperties.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <Home className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? 'No properties found' : 'No properties yet'}
            </h3>
            <p className="text-gray-500 mb-4">
              {searchQuery ? 'Try a different search term' : 'Add your first property to get started'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <Plus className="w-4 h-4 inline mr-2" />
                Add Property
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Property</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Type</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Monthly</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Moved In</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProperties.map((property) => (
                  <tr
                    key={property.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setViewingDetails(property)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Home className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{property.address}</p>
                          <p className="text-sm text-gray-500">{property.postcode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        property.financeType === 'mortgage' ? 'bg-blue-100 text-blue-700' :
                        property.financeType === 'rental' ? 'bg-orange-100 text-orange-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {property.financeType.charAt(0).toUpperCase() + property.financeType.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {property.monthlyPayment > 0 ? `£${property.monthlyPayment.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {property.movedInDate ? formatDateUK(property.movedInDate) : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {(property.maintenanceItems || []).some(m => isPastDate(m.nextDueDate)) ? (
                        <span className="text-red-600"><AlertCircle className="w-4 h-4 inline" /></span>
                      ) : (property.maintenanceItems || []).some(m => isDueSoon(m.nextDueDate)) ? (
                        <span className="text-orange-500"><Calendar className="w-4 h-4 inline" /></span>
                      ) : (
                        <span className="text-green-600"><CheckCircle className="w-4 h-4 inline" /></span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingProperty(property);
                          }}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProperty(property.id);
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Property</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Type</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Monthly</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Moved In</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProperties.map((property) => (
                  <tr
                    key={property.id}
                    className="hover:bg-blue-50 cursor-pointer"
                    onClick={() => setViewingDetails(property)}
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{property.address}</p>
                        <p className="text-sm text-gray-500">{property.postcode}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        property.financeType === 'mortgage' ? 'bg-blue-100 text-blue-700' :
                        property.financeType === 'rental' ? 'bg-orange-100 text-orange-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {property.financeType.charAt(0).toUpperCase() + property.financeType.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {property.monthlyPayment > 0 ? `£${property.monthlyPayment.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {property.movedInDate ? formatDateUK(property.movedInDate) : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {(property.maintenanceItems || []).some(m => isPastDate(m.nextDueDate)) ? (
                        <span className="text-red-600"><AlertCircle className="w-4 h-4 inline" /></span>
                      ) : (property.maintenanceItems || []).some(m => isDueSoon(m.nextDueDate)) ? (
                        <span className="text-orange-500"><Calendar className="w-4 h-4 inline" /></span>
                      ) : (
                        <span className="text-green-600"><CheckCircle className="w-4 h-4 inline" /></span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingProperty(property);
                          }}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProperty(property.id);
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* View Details Modal */}
      {viewingDetails && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <Home className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{viewingDetails.address}</h3>
                  <p className="text-sm text-gray-500">{viewingDetails.postcode}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditingProperty(viewingDetails);
                    setViewingDetails(null);
                  }}
                  className="px-3 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => setViewingDetails(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Property Type</label>
                  <p className="text-sm font-medium capitalize">{viewingDetails.propertyType}</p>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Finance Type</label>
                  <p className="text-sm font-medium capitalize">{viewingDetails.financeType}</p>
                </div>
                {viewingDetails.movedInDate && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Moved In</label>
                    <p className="text-sm font-medium">{formatDateUK(viewingDetails.movedInDate)}</p>
                  </div>
                )}
                {viewingDetails.monthlyPayment > 0 && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Monthly Payment</label>
                    <p className="text-sm font-medium">£{viewingDetails.monthlyPayment.toLocaleString()}</p>
                  </div>
                )}
              </div>

              {/* Finance/Ownership Section */}
              {(viewingDetails.lender || (viewingDetails.financeDocuments?.length || 0) > 0 || viewingDetails.financeEndDate) && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-900 mb-3 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    {viewingDetails.financeType === 'mortgage' ? 'Mortgage Details' :
                     viewingDetails.financeType === 'rental' ? 'Rental Details' : 'Ownership Documents'}
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-2">
                    {viewingDetails.lender && (
                      <div>
                        <span className="text-gray-600">
                          {viewingDetails.financeType === 'mortgage' ? 'Lender:' :
                           viewingDetails.financeType === 'rental' ? 'Landlord:' : 'Previous Lender:'}
                        </span>
                        <p className="font-medium">{viewingDetails.lender}</p>
                      </div>
                    )}
                    {viewingDetails.financeEndDate && (
                      <div>
                        <span className="text-gray-600">
                          {viewingDetails.financeType === 'owned' ? 'Paid Off:' : 'End Date:'}
                        </span>
                        <p className="font-medium">{formatDateUK(viewingDetails.financeEndDate)}</p>
                      </div>
                    )}
                  </div>
                  {viewingDetails.financeDocuments && viewingDetails.financeDocuments.length > 0 && (
                    <DocumentList documents={viewingDetails.financeDocuments} docType="finance" canEdit={false} />
                  )}
                </div>
              )}

              {/* Insurance Section */}
              {(viewingDetails.insuranceCompany || viewingDetails.insuranceAnnualCost > 0 || viewingDetails.insurancePolicyNumber || viewingDetails.insuranceNotes || (viewingDetails.insuranceDocuments?.length || 0) > 0) && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="text-sm font-medium text-green-900 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4" /> Insurance
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {viewingDetails.insuranceCompany && (
                      <div>
                        <span className="text-gray-600">Company:</span>
                        <p className="font-medium">{viewingDetails.insuranceCompany}</p>
                      </div>
                    )}
                    {viewingDetails.insurancePolicyNumber && (
                      <div>
                        <span className="text-gray-600">Policy Number:</span>
                        <p className="font-medium">{viewingDetails.insurancePolicyNumber}</p>
                      </div>
                    )}
                    {viewingDetails.insuranceAnnualCost > 0 && (
                      <div>
                        <span className="text-gray-600">Annual Cost:</span>
                        <p className="font-medium">£{viewingDetails.insuranceAnnualCost.toLocaleString()}</p>
                      </div>
                    )}
                    {viewingDetails.insuranceRenewalDate && (
                      <div>
                        <span className="text-gray-600">Renewal:</span>
                        <p className={`font-medium ${isPastDate(viewingDetails.insuranceRenewalDate) ? 'text-red-600' : isDueSoon(viewingDetails.insuranceRenewalDate) ? 'text-orange-600' : ''}`}>
                          {formatDateUK(viewingDetails.insuranceRenewalDate)}
                        </p>
                      </div>
                    )}
                  </div>
                  {viewingDetails.insuranceNotes && (
                    <div className="mt-3">
                      <span className="text-gray-600 text-sm">Notes:</span>
                      <p className="text-sm mt-1 bg-white/50 p-2 rounded">{viewingDetails.insuranceNotes}</p>
                    </div>
                  )}
                  {viewingDetails.insuranceDocuments && viewingDetails.insuranceDocuments.length > 0 && (
                    <div className="mt-3">
                      <DocumentList documents={viewingDetails.insuranceDocuments} docType="insurance" canEdit={false} />
                    </div>
                  )}
                </div>
              )}

              {/* Council Tax Section */}
              {(viewingDetails.councilTaxBand || viewingDetails.councilTaxAnnualCost > 0) && (
                <div className="p-4 bg-amber-50 rounded-lg">
                  <h4 className="text-sm font-medium text-amber-900 mb-3 flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> Council Tax
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {viewingDetails.councilTaxBand && (
                      <div>
                        <span className="text-gray-600">Band:</span>
                        <p className="font-medium">{viewingDetails.councilTaxBand}</p>
                      </div>
                    )}
                    {viewingDetails.councilTaxAnnualCost > 0 && (
                      <div>
                        <span className="text-gray-600">Annual Cost:</span>
                        <p className="font-medium">£{viewingDetails.councilTaxAnnualCost.toLocaleString()}</p>
                      </div>
                    )}
                    {viewingDetails.councilTaxAuthority && (
                      <div>
                        <span className="text-gray-600">Authority:</span>
                        <p className="font-medium">{viewingDetails.councilTaxAuthority}</p>
                      </div>
                    )}
                  </div>
                  {viewingDetails.councilTaxDocuments && viewingDetails.councilTaxDocuments.length > 0 && (
                    <div className="mt-3">
                      <DocumentList documents={viewingDetails.councilTaxDocuments} docType="councilTax" canEdit={false} />
                    </div>
                  )}
                </div>
              )}

              {/* Maintenance Items */}
              {viewingDetails.maintenanceItems && viewingDetails.maintenanceItems.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <Wrench className="w-4 h-4" /> Annual Maintenance
                  </h4>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-gray-600">Item</th>
                          <th className="px-4 py-2 text-left text-gray-600">Company</th>
                          <th className="px-4 py-2 text-right text-gray-600">Cost</th>
                          <th className="px-4 py-2 text-left text-gray-600">Next Due</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {viewingDetails.maintenanceItems.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 font-medium">{item.name}</td>
                            <td className="px-4 py-2">{item.company || '-'}</td>
                            <td className="px-4 py-2 text-right">£{item.annualCost.toFixed(2)}</td>
                            <td className="px-4 py-2">
                              <span className={`${isPastDate(item.nextDueDate) ? 'text-red-600 font-medium' : isDueSoon(item.nextDueDate) ? 'text-orange-600' : ''}`}>
                                {item.nextDueDate ? formatDateUK(item.nextDueDate) : '-'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Utilities */}
              {viewingDetails.utilities && viewingDetails.utilities.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4" /> Utilities
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {viewingDetails.utilities.map((utility) => (
                      <div key={utility.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2 mb-2">
                          {getUtilityIcon(utility.type)}
                          <span className="font-medium">{utility.company}</span>
                          <span className="text-xs text-gray-500 ml-auto">{getUtilityTypeLabel(utility.type)}</span>
                        </div>
                        <div className="text-sm space-y-1">
                          <p>Monthly: <span className="font-medium">£{utility.monthlyCost.toFixed(2)}</span></p>
                          {utility.websiteUrl && (
                            <a
                              href={utility.websiteUrl.startsWith('http') ? utility.websiteUrl : `https://${utility.websiteUrl}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Globe className="w-3 h-3" />
                              Website
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {viewingDetails.notes && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Notes</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">{viewingDetails.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingProperty && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-emerald-600" />
                Edit Property
              </h3>
              <button
                onClick={() => setEditingProperty(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4" /> Property Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Address *</label>
                    <input
                      type="text"
                      value={editingProperty.address}
                      onChange={(e) => setEditingProperty({ ...editingProperty, address: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Postcode</label>
                    <input
                      type="text"
                      value={editingProperty.postcode}
                      onChange={(e) => setEditingProperty({ ...editingProperty, postcode: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Property Type</label>
                    <select
                      value={editingProperty.propertyType}
                      onChange={(e) => setEditingProperty({ ...editingProperty, propertyType: e.target.value as Property['propertyType'] })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    >
                      <option value="house">House</option>
                      <option value="flat">Flat</option>
                      <option value="bungalow">Bungalow</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Moved In Date</label>
                    <input
                      type="date"
                      value={editingProperty.movedInDate}
                      onChange={(e) => setEditingProperty({ ...editingProperty, movedInDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Finance Section */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="text-sm font-medium text-blue-900 mb-3">Finance</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Finance Type</label>
                    <select
                      value={editingProperty.financeType}
                      onChange={(e) => setEditingProperty({ ...editingProperty, financeType: e.target.value as Property['financeType'] })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                    >
                      <option value="mortgage">Mortgage</option>
                      <option value="rental">Rental</option>
                      <option value="owned">Owned Outright</option>
                    </select>
                  </div>
                  {editingProperty.financeType !== 'owned' && (
                    <>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Monthly Payment (£)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editingProperty.monthlyPayment ?? ''}
                          onChange={(e) => setEditingProperty({ ...editingProperty, monthlyPayment: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          placeholder="0 if paid off"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">
                          {editingProperty.financeType === 'mortgage' ? 'Lender' : 'Landlord'}
                        </label>
                        <input
                          type="text"
                          value={editingProperty.lender}
                          onChange={(e) => setEditingProperty({ ...editingProperty, lender: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">End Date</label>
                        <input
                          type="date"
                          value={editingProperty.financeEndDate}
                          onChange={(e) => setEditingProperty({ ...editingProperty, financeEndDate: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </>
                  )}
                </div>
                <div className="mt-4">
                  <label className="block text-sm text-gray-600 mb-2">Documents (Deeds, Mortgage/Rental Agreement)</label>
                  {editingProperty.financeDocuments && editingProperty.financeDocuments.length > 0 && (
                    <div className="mb-3">
                      <DocumentList documents={editingProperty.financeDocuments} docType="finance" />
                    </div>
                  )}
                  <UploadButton onUpload={(file) => handleDocumentUpload(file, 'finance')} />
                </div>
              </div>

              {/* Insurance Section */}
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="text-sm font-medium text-green-900 mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Insurance
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Insurance Company</label>
                    <input
                      type="text"
                      value={editingProperty.insuranceCompany}
                      onChange={(e) => setEditingProperty({ ...editingProperty, insuranceCompany: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Policy Number</label>
                    <input
                      type="text"
                      value={editingProperty.insurancePolicyNumber}
                      onChange={(e) => setEditingProperty({ ...editingProperty, insurancePolicyNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Annual Cost (£)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingProperty.insuranceAnnualCost || ''}
                      onChange={(e) => setEditingProperty({ ...editingProperty, insuranceAnnualCost: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Renewal Date</label>
                    <input
                      type="date"
                      value={editingProperty.insuranceRenewalDate}
                      onChange={(e) => setEditingProperty({ ...editingProperty, insuranceRenewalDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Notes</label>
                    <textarea
                      value={editingProperty.insuranceNotes}
                      onChange={(e) => setEditingProperty({ ...editingProperty, insuranceNotes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      rows={2}
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm text-gray-600 mb-2">Insurance Documents</label>
                  {editingProperty.insuranceDocuments && editingProperty.insuranceDocuments.length > 0 && (
                    <div className="mb-3">
                      <DocumentList documents={editingProperty.insuranceDocuments} docType="insurance" />
                    </div>
                  )}
                  <UploadButton onUpload={(file) => handleDocumentUpload(file, 'insurance')} />
                </div>
              </div>

              {/* Council Tax Section */}
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <h4 className="text-sm font-medium text-amber-900 mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4" /> Council Tax
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Council Tax Band</label>
                    <input
                      type="text"
                      value={editingProperty.councilTaxBand}
                      onChange={(e) => setEditingProperty({ ...editingProperty, councilTaxBand: e.target.value.toUpperCase() })}
                      placeholder="e.g., D"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Annual Cost (£)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingProperty.councilTaxAnnualCost || ''}
                      onChange={(e) => setEditingProperty({ ...editingProperty, councilTaxAnnualCost: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Local Authority</label>
                    <input
                      type="text"
                      value={editingProperty.councilTaxAuthority}
                      onChange={(e) => setEditingProperty({ ...editingProperty, councilTaxAuthority: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Account Number</label>
                    <input
                      type="text"
                      value={editingProperty.councilTaxAccountNumber}
                      onChange={(e) => setEditingProperty({ ...editingProperty, councilTaxAccountNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm text-gray-600 mb-2">Council Tax Documents</label>
                  {editingProperty.councilTaxDocuments && editingProperty.councilTaxDocuments.length > 0 && (
                    <div className="mb-3">
                      <DocumentList documents={editingProperty.councilTaxDocuments} docType="councilTax" />
                    </div>
                  )}
                  <UploadButton onUpload={(file) => handleDocumentUpload(file, 'councilTax')} />
                </div>
              </div>

              {/* Annual Maintenance Section */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Wrench className="w-4 h-4" /> Annual Maintenance
                  </h4>
                  <button
                    onClick={() => setShowMaintenanceForm(!showMaintenanceForm)}
                    className="flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Item
                  </button>
                </div>

                {showMaintenanceForm && (
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Item Name *</label>
                        <input
                          type="text"
                          value={newMaintenanceItem.name}
                          onChange={(e) => setNewMaintenanceItem({ ...newMaintenanceItem, name: e.target.value })}
                          placeholder="e.g., Gas Safety Check"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Company</label>
                        <input
                          type="text"
                          value={newMaintenanceItem.company}
                          onChange={(e) => setNewMaintenanceItem({ ...newMaintenanceItem, company: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Contact Details</label>
                        <input
                          type="text"
                          value={newMaintenanceItem.contactDetails}
                          onChange={(e) => setNewMaintenanceItem({ ...newMaintenanceItem, contactDetails: e.target.value })}
                          placeholder="Phone or email"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Annual Cost (£)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={newMaintenanceItem.annualCost || ''}
                          onChange={(e) => setNewMaintenanceItem({ ...newMaintenanceItem, annualCost: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Last Done</label>
                        <input
                          type="date"
                          value={newMaintenanceItem.lastDate}
                          onChange={(e) => setNewMaintenanceItem({ ...newMaintenanceItem, lastDate: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Next Due Date</label>
                        <input
                          type="date"
                          value={newMaintenanceItem.nextDueDate}
                          onChange={(e) => setNewMaintenanceItem({ ...newMaintenanceItem, nextDueDate: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm text-gray-600 mb-1">Notes</label>
                        <textarea
                          value={newMaintenanceItem.notes}
                          onChange={(e) => setNewMaintenanceItem({ ...newMaintenanceItem, notes: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          rows={2}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => addMaintenanceItem(editingProperty.id)}
                        className="px-3 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => {
                          setShowMaintenanceForm(false);
                          setNewMaintenanceItem(emptyMaintenanceItem);
                        }}
                        className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {editingProperty.maintenanceItems && editingProperty.maintenanceItems.length > 0 ? (
                  <div className="space-y-3">
                    {editingProperty.maintenanceItems.map((item) => (
                      <div key={item.id} className="p-3 bg-white border border-gray-200 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h5 className="font-medium text-gray-900">{item.name}</h5>
                              {isPastDate(item.nextDueDate) && (
                                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded">Overdue</span>
                              )}
                              {isDueSoon(item.nextDueDate) && !isPastDate(item.nextDueDate) && (
                                <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded">Due Soon</span>
                              )}
                            </div>
                            <div className="text-sm text-gray-600 mt-1 space-y-0.5">
                              {item.company && <p>Company: {item.company}</p>}
                              {item.contactDetails && <p>Contact: {item.contactDetails}</p>}
                              <p>Cost: £{item.annualCost.toFixed(2)} | Next due: {item.nextDueDate ? formatDateUK(item.nextDueDate) : 'Not set'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setEditingMaintenanceItem(item)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteMaintenanceItem(editingProperty.id, item.id)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                              title="Delete"
                            >
                              <Trash className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        {item.documents && item.documents.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-gray-100">
                            <DocumentList documents={item.documents} docType="maintenance" maintenanceItemId={item.id} />
                          </div>
                        )}
                        <div className="mt-2">
                          <UploadButton
                            onUpload={(file) => handleDocumentUpload(file, 'maintenance', item.id)}
                            label="Add certificate/document"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No maintenance items added yet</p>
                )}
              </div>

              {/* Utilities Section */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Zap className="w-4 h-4" /> Utilities
                  </h4>
                  <button
                    onClick={() => setShowUtilityForm(!showUtilityForm)}
                    className="flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Utility
                  </button>
                </div>

                {showUtilityForm && (
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Type</label>
                        <select
                          value={newUtility.type}
                          onChange={(e) => setNewUtility({ ...newUtility, type: e.target.value as Utility['type'] })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                        >
                          <option value="energy">Energy</option>
                          <option value="water">Water</option>
                          <option value="broadband">Broadband</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Company *</label>
                        <input
                          type="text"
                          value={newUtility.company}
                          onChange={(e) => setNewUtility({ ...newUtility, company: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Monthly Cost (£)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={newUtility.monthlyCost || ''}
                          onChange={(e) => setNewUtility({ ...newUtility, monthlyCost: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Account Number</label>
                        <input
                          type="text"
                          value={newUtility.accountNumber}
                          onChange={(e) => setNewUtility({ ...newUtility, accountNumber: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Website URL</label>
                        <input
                          type="text"
                          value={newUtility.websiteUrl}
                          onChange={(e) => setNewUtility({ ...newUtility, websiteUrl: e.target.value })}
                          placeholder="https://..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Contact Details</label>
                        <input
                          type="text"
                          value={newUtility.contactDetails}
                          onChange={(e) => setNewUtility({ ...newUtility, contactDetails: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm text-gray-600 mb-1">Notes</label>
                        <textarea
                          value={newUtility.notes}
                          onChange={(e) => setNewUtility({ ...newUtility, notes: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          rows={2}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => addUtility(editingProperty.id)}
                        className="px-3 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => {
                          setShowUtilityForm(false);
                          setNewUtility(emptyUtility);
                        }}
                        className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {editingProperty.utilities && editingProperty.utilities.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {editingProperty.utilities.map((utility) => (
                      <div key={utility.id} className="p-3 bg-white border border-gray-200 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            {getUtilityIcon(utility.type)}
                            <div>
                              <h5 className="font-medium text-gray-900">{utility.company}</h5>
                              <p className="text-xs text-gray-500">{getUtilityTypeLabel(utility.type)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setEditingUtility(utility)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                              title="Edit"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => deleteUtility(editingProperty.id, utility.id)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded"
                              title="Delete"
                            >
                              <Trash className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 mt-2 space-y-0.5">
                          <p>Monthly: £{utility.monthlyCost.toFixed(2)}</p>
                          {utility.websiteUrl && (
                            <a
                              href={utility.websiteUrl.startsWith('http') ? utility.websiteUrl : `https://${utility.websiteUrl}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <Globe className="w-3 h-3" />
                              Website
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No utilities added yet</p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm text-gray-600 mb-1">General Notes</label>
                <textarea
                  value={editingProperty.notes}
                  onChange={(e) => setEditingProperty({ ...editingProperty, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <button
                  onClick={updateProperty}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => deleteProperty(editingProperty.id)}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                >
                  Delete
                </button>
                <button
                  onClick={() => setEditingProperty(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {viewingDocument && (
        <div className="fixed inset-0 bg-black/90 flex flex-col z-[100]">
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
            className="flex-1 border-0"
            title={viewingDocument.docRef.filename}
          />
        </div>
      )}

      {/* Loading Document Modal */}
      {loadingDocument && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
            <span>Loading document...</span>
          </div>
        </div>
      )}

      {/* Edit Maintenance Item Modal */}
      {editingMaintenanceItem && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[80] p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Edit Maintenance Item</h3>
              <button onClick={() => setEditingMaintenanceItem(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Item Name</label>
                  <input
                    type="text"
                    value={editingMaintenanceItem.name}
                    onChange={(e) => setEditingMaintenanceItem({ ...editingMaintenanceItem, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Company</label>
                  <input
                    type="text"
                    value={editingMaintenanceItem.company}
                    onChange={(e) => setEditingMaintenanceItem({ ...editingMaintenanceItem, company: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Contact</label>
                  <input
                    type="text"
                    value={editingMaintenanceItem.contactDetails}
                    onChange={(e) => setEditingMaintenanceItem({ ...editingMaintenanceItem, contactDetails: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Annual Cost (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingMaintenanceItem.annualCost || ''}
                    onChange={(e) => setEditingMaintenanceItem({ ...editingMaintenanceItem, annualCost: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Last Done</label>
                  <input
                    type="date"
                    value={editingMaintenanceItem.lastDate}
                    onChange={(e) => setEditingMaintenanceItem({ ...editingMaintenanceItem, lastDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Next Due</label>
                  <input
                    type="date"
                    value={editingMaintenanceItem.nextDueDate}
                    onChange={(e) => setEditingMaintenanceItem({ ...editingMaintenanceItem, nextDueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Notes</label>
                <textarea
                  value={editingMaintenanceItem.notes}
                  onChange={(e) => setEditingMaintenanceItem({ ...editingMaintenanceItem, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={2}
                />
              </div>

              {/* Documents */}
              <div>
                <label className="block text-sm text-gray-600 mb-2">Documents/Certificates</label>
                {editingMaintenanceItem.documents && editingMaintenanceItem.documents.length > 0 && (
                  <div className="mb-2">
                    <DocumentList
                      documents={editingMaintenanceItem.documents}
                      docType="maintenance"
                      canEdit={true}
                    />
                  </div>
                )}
                <UploadButton
                  onUpload={(file) => handleDocumentUpload(file, 'maintenance', editingMaintenanceItem.id)}
                  label="Add certificate/document"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (editingProperty) {
                      updateMaintenanceItem(editingProperty.id, editingMaintenanceItem);
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingMaintenanceItem(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Utility Modal */}
      {editingUtility && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[80] p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Edit Utility</h3>
              <button onClick={() => setEditingUtility(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Type</label>
                  <select
                    value={editingUtility.type}
                    onChange={(e) => setEditingUtility({ ...editingUtility, type: e.target.value as Utility['type'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="energy">Energy</option>
                    <option value="water">Water</option>
                    <option value="broadband">Broadband</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Company</label>
                  <input
                    type="text"
                    value={editingUtility.company}
                    onChange={(e) => setEditingUtility({ ...editingUtility, company: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Monthly Cost (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingUtility.monthlyCost || ''}
                    onChange={(e) => setEditingUtility({ ...editingUtility, monthlyCost: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Account Number</label>
                  <input
                    type="text"
                    value={editingUtility.accountNumber}
                    onChange={(e) => setEditingUtility({ ...editingUtility, accountNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Website URL</label>
                  <input
                    type="text"
                    value={editingUtility.websiteUrl}
                    onChange={(e) => setEditingUtility({ ...editingUtility, websiteUrl: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Contact</label>
                  <input
                    type="text"
                    value={editingUtility.contactDetails}
                    onChange={(e) => setEditingUtility({ ...editingUtility, contactDetails: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Notes</label>
                <textarea
                  value={editingUtility.notes}
                  onChange={(e) => setEditingUtility({ ...editingUtility, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (editingProperty) {
                      updateUtility(editingProperty.id, editingUtility);
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingUtility(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}

export default PropertyManagerSecure;
