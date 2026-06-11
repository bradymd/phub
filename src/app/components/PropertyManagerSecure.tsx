import { useState, useEffect } from 'react';
import { X, Plus, Trash, Home, Calendar, Edit2, FileText, Search, Eye, EyeOff, Grid3x3, List, Download, AlertCircle, Phone, Shield, Wrench, Upload, Globe, Zap, Droplets, Wifi, Building2, CheckCircle, ChevronDown, ChevronUp, Printer } from 'lucide-react';
import { useStorage, useDocumentService, useDataVersion } from '../../contexts/StorageContext';
import { PdfJsViewer } from './PdfJsViewer';
import { DocumentReference } from '../../services/document-service';
import { printRecord, formatDate, formatCurrency } from '../../utils/print';
import { formatDateUK, isPastDate, isDueSoon } from '../../utils/dates';
import { dataUrlToBlobUrl, downloadDataUrl } from '../../utils/blob';
import { PanelBanner } from '../../components/ui/PanelParts';

// A single completed occurrence of a recurring maintenance item (rolling history)
interface ServiceRecord {
  id: string;
  date: string;   // date the service was carried out
  company?: string; // who carried it out (prefilled from the item's usual company)
  cost: number;   // cost for this occurrence
  paid: boolean;  // whether this occurrence has been paid for
  notes?: string;
  documents?: DocumentReference[]; // receipts etc. for this visit
}

// Maintenance item for recurring annual checks
interface MaintenanceItem {
  id: string;
  name: string; // e.g., "Gas Inspection", "Air Conditioning Check", "Burglar Alarm"
  company: string;
  contactDetails: string;
  annualCost: number;
  lastDate: string;     // most recent service date (kept in sync with newest serviceHistory row)
  nextDueDate: string;  // when the next occurrence is due
  notes: string;
  serviceHistory?: ServiceRecord[]; // rolling log of past occurrences, newest first
  documents?: DocumentReference[];
}

// Maintenance history entry for completed work (similar to vehicle service history)
interface MaintenanceHistoryEntry {
  id: string;
  date: string;
  // repair/improvement/service/inspection are legacy values from an earlier
  // version of this form - stored data may still contain them
  type: 'decorator' | 'plumber' | 'electrician' | 'builder' | 'gardener' | 'cleaner' | 'gutters' | 'roofing' | 'other'
    | 'repair' | 'improvement' | 'service' | 'inspection';
  description: string;
  cost: number;
  company: string;
  contractor?: string; // legacy name for company
  contactDetails?: string;
  notes?: string;
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

  // Maintenance items (flexible list for recurring checks)
  maintenanceItems: MaintenanceItem[];

  // Maintenance history (completed work log)
  maintenanceHistory?: MaintenanceHistoryEntry[];

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
  serviceHistory: [],
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

const emptyMaintenanceHistoryEntry: Omit<MaintenanceHistoryEntry, 'id'> = {
  date: '',
  type: 'other',
  description: '',
  cost: 0,
  company: '',
  contactDetails: '',
  notes: '',
  documents: []
};

const maintenanceTypeLabels: Record<MaintenanceHistoryEntry['type'], string> = {
  decorator: 'Decorator',
  plumber: 'Plumber',
  electrician: 'Electrician',
  builder: 'Builder',
  gardener: 'Gardener',
  cleaner: 'Cleaner',
  gutters: 'Gutters',
  roofing: 'Roofing',
  other: 'Other',
  // legacy values
  repair: 'Repair',
  improvement: 'Improvement',
  service: 'Service',
  inspection: 'Inspection'
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

// A maintenance item is "awaiting payment" if any logged service occurrence is unpaid
const hasUnpaidService = (item: MaintenanceItem): boolean =>
  (item.serviceHistory || []).some(s => !s.paid);

// Add one year to an ISO date string (yyyy-mm-dd); returns '' if input empty
const addOneYear = (dateStr: string): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split('T')[0];
};

// Today as yyyy-mm-dd (for date input defaults)
const todayISO = (): string => new Date().toISOString().split('T')[0];

// Entry date is today or in the future (a forthcoming job)
const isFutureDate = (dateStr: string): boolean => {
  if (!dateStr) return false;
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date >= today;
};

// Entry is more than a month in the past — old history, grey it out
const isOldPast = (dateStr: string): boolean => {
  if (!dateStr) return false;
  const date = new Date(dateStr + 'T00:00:00');
  const oneMonthAgo = new Date();
  oneMonthAgo.setHours(0, 0, 0, 0);
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  return date < oneMonthAgo;
};

export function PropertyManagerSecure({ onClose }: PropertyManagerSecureProps) {
  const storage = useStorage();
  const documentService = useDocumentService();
  const { notifyDataChange } = useDataVersion();
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
  const [viewingMaintenanceItem, setViewingMaintenanceItem] = useState<MaintenanceItem | null>(null);

  // "Add service record" dialog state — records a completed visit and rolls the dates forward
  const [servicingItem, setServicingItem] = useState<{ propertyId: string; item: MaintenanceItem } | null>(null);
  const [serviceForm, setServiceForm] = useState({ date: '', company: '', cost: 0, paid: false, nextDueDate: '', notes: '', documents: [] as DocumentReference[] });

  // Utility form state
  const [newUtility, setNewUtility] = useState(emptyUtility);
  const [showUtilityForm, setShowUtilityForm] = useState(false);
  const [editingUtility, setEditingUtility] = useState<Utility | null>(null);

  // Maintenance history form state
  const [newMaintenanceHistory, setNewMaintenanceHistory] = useState(emptyMaintenanceHistoryEntry);
  const [showMaintenanceHistoryForm, setShowMaintenanceHistoryForm] = useState(false);
  const [editingMaintenanceHistory, setEditingMaintenanceHistory] = useState<MaintenanceHistoryEntry | null>(null);
  const [viewingMaintenanceHistory, setViewingMaintenanceHistory] = useState<MaintenanceHistoryEntry | null>(null);

  // Track when editing a maintenance item/history from the view modal (not the property edit form)
  const [editingFromView, setEditingFromView] = useState(false);

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
      notifyDataChange();
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
      notifyDataChange();
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
          ...(property.maintenanceItems || []).flatMap(m => m.documents || []),
          ...(property.maintenanceItems || []).flatMap(m => (m.serviceHistory || []).flatMap(rec => rec.documents || []))
        ];
        if (allDocs.length > 0) {
          await documentService.deleteDocuments('certificates', allDocs);
        }
      }
      await storage.delete('properties', id);
      setProperties(properties.filter(p => p.id !== id));
      notifyDataChange();
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

  const updateMaintenanceItem = async (propertyId: string, updatedItem: MaintenanceItem) => {
    if (editingFromView) {
      // Editing from the view modal — persist directly to storage
      try {
        const property = properties.find(p => p.id === propertyId);
        if (!property) return;
        const updatedProperty: Property = {
          ...property,
          maintenanceItems: property.maintenanceItems.map(m =>
            m.id === updatedItem.id ? updatedItem : m
          )
        };
        await storage.update('properties', propertyId, updatedProperty);
        setProperties(properties.map(p => p.id === propertyId ? updatedProperty : p));
        notifyDataChange();
        setViewingDetails(updatedProperty);
        setEditingProperty(null);
        setEditingMaintenanceItem(null);
        setEditingFromView(false);
      } catch (err) {
        setError('Failed to update maintenance item');
        console.error(err);
      }
    } else {
      // Editing from the property edit form — in-memory only until property is saved
      if (editingProperty && editingProperty.id === propertyId) {
        setEditingProperty({
          ...editingProperty,
          maintenanceItems: editingProperty.maintenanceItems.map(m =>
            m.id === updatedItem.id ? updatedItem : m
          )
        });
      }
      setEditingMaintenanceItem(null);
    }
  };

  const deleteMaintenanceItem = async (propertyId: string, itemId: string) => {
    if (!confirm('Delete this maintenance item?')) return;

    if (editingProperty && editingProperty.id === propertyId) {
      const item = editingProperty.maintenanceItems.find(m => m.id === itemId);
      const itemDocs = [
        ...(item?.documents || []),
        ...(item?.serviceHistory || []).flatMap(rec => rec.documents || [])
      ];
      if (itemDocs.length) {
        await documentService.deleteDocuments('certificates', itemDocs);
      }
      setEditingProperty({
        ...editingProperty,
        maintenanceItems: editingProperty.maintenanceItems.filter(m => m.id !== itemId)
      });
    }
  };

  // Persist a single maintenance item to storage and keep any open views/forms in sync.
  // Used by the rolling-history actions (mark serviced, toggle paid, delete record).
  const persistMaintenanceItem = async (propertyId: string, updatedItem: MaintenanceItem) => {
    const property = properties.find(p => p.id === propertyId);
    if (!property) return;
    const updatedProperty: Property = {
      ...property,
      maintenanceItems: (property.maintenanceItems || []).map(m =>
        m.id === updatedItem.id ? updatedItem : m
      )
    };
    try {
      await storage.update('properties', propertyId, updatedProperty);
      setProperties(properties.map(p => p.id === propertyId ? updatedProperty : p));
      notifyDataChange();
      setViewingDetails(prev => prev && prev.id === propertyId ? updatedProperty : prev);
      setEditingProperty(prev => prev && prev.id === propertyId
        ? { ...prev, maintenanceItems: prev.maintenanceItems.map(m => m.id === updatedItem.id ? updatedItem : m) }
        : prev);
      setViewingMaintenanceItem(prev => prev && prev.id === updatedItem.id ? updatedItem : prev);
      setEditingMaintenanceItem(prev => prev && prev.id === updatedItem.id ? updatedItem : prev);
    } catch (err) {
      setError('Failed to update maintenance item');
      console.error(err);
    }
  };

  // Open the "Add service record" dialog, pre-filling sensible defaults
  // (today, the item's usual company, annual cost, +1yr next due)
  const openServiceDialog = (propertyId: string, item: MaintenanceItem) => {
    const date = todayISO();
    setServiceForm({
      date,
      company: item.company || '',
      cost: item.annualCost || 0,
      paid: false,
      nextDueDate: addOneYear(date),
      notes: '',
      documents: []
    });
    setServicingItem({ propertyId, item });
  };

  // Record a completed occurrence: append to history, roll lastDate/nextDueDate forward
  const markServiced = async () => {
    if (!servicingItem) return;
    const { propertyId, item } = servicingItem;
    const record: ServiceRecord = {
      id: `svc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      date: serviceForm.date || todayISO(),
      company: serviceForm.company.trim() || undefined,
      cost: serviceForm.cost || 0,
      paid: serviceForm.paid,
      notes: serviceForm.notes || undefined,
      documents: serviceForm.documents.length ? serviceForm.documents : undefined
    };
    const history = [record, ...(item.serviceHistory || [])]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const updatedItem: MaintenanceItem = {
      ...item,
      serviceHistory: history,
      lastDate: history[0].date,
      nextDueDate: serviceForm.nextDueDate || item.nextDueDate
    };
    await persistMaintenanceItem(propertyId, updatedItem);
    setServicingItem(null);
  };

  // Upload a receipt while filling in the Add-service-record dialog
  const handleServiceFormUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setError('Please upload an image or PDF file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      const docRef = await documentService.saveDocument('certificates', file.name, dataUrl);
      setServiceForm(prev => ({ ...prev, documents: [...prev.documents, docRef] }));
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const removeServiceFormDocument = async (docRef: DocumentReference) => {
    await documentService.deleteDocument('certificates', docRef);
    setServiceForm(prev => ({ ...prev, documents: prev.documents.filter(d => d.id !== docRef.id) }));
  };

  // Cancelling the dialog must delete any receipts already uploaded,
  // or they'd be orphaned files (integrity warnings)
  const cancelServiceDialog = async () => {
    if (serviceForm.documents.length) {
      await documentService.deleteDocuments('certificates', serviceForm.documents);
    }
    setServicingItem(null);
  };

  // Attach a receipt to an already-logged visit (e.g. invoice arrived later)
  const addDocumentToServiceRecord = async (
    propertyId: string,
    item: MaintenanceItem,
    recordId: string,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setError('Please upload an image or PDF file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      const docRef = await documentService.saveDocument('certificates', file.name, dataUrl);
      const updatedItem: MaintenanceItem = {
        ...item,
        serviceHistory: (item.serviceHistory || []).map(rec =>
          rec.id === recordId ? { ...rec, documents: [...(rec.documents || []), docRef] } : rec
        )
      };
      await persistMaintenanceItem(propertyId, updatedItem);
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const deleteServiceRecordDocument = async (
    propertyId: string,
    item: MaintenanceItem,
    recordId: string,
    docRef: DocumentReference
  ) => {
    await documentService.deleteDocument('certificates', docRef);
    const updatedItem: MaintenanceItem = {
      ...item,
      serviceHistory: (item.serviceHistory || []).map(rec =>
        rec.id === recordId ? { ...rec, documents: (rec.documents || []).filter(d => d.id !== docRef.id) } : rec
      )
    };
    await persistMaintenanceItem(propertyId, updatedItem);
  };

  // Toggle the paid flag on one occurrence in an item's history
  const toggleServicePaid = async (propertyId: string, item: MaintenanceItem, recordId: string) => {
    const updatedItem: MaintenanceItem = {
      ...item,
      serviceHistory: (item.serviceHistory || []).map(s =>
        s.id === recordId ? { ...s, paid: !s.paid } : s
      )
    };
    await persistMaintenanceItem(propertyId, updatedItem);
  };

  // Remove one occurrence from an item's history (re-derives lastDate from what remains)
  const deleteServiceRecord = async (propertyId: string, item: MaintenanceItem, recordId: string) => {
    if (!confirm('Delete this service record?')) return;
    const record = (item.serviceHistory || []).find(s => s.id === recordId);
    if (record?.documents?.length) {
      await documentService.deleteDocuments('certificates', record.documents);
    }
    const history = (item.serviceHistory || []).filter(s => s.id !== recordId);
    const updatedItem: MaintenanceItem = {
      ...item,
      serviceHistory: history,
      lastDate: history.length ? history[0].date : ''
    };
    await persistMaintenanceItem(propertyId, updatedItem);
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

  // Maintenance history functions
  const addMaintenanceHistoryEntry = (propertyId: string) => {
    if (!newMaintenanceHistory.description) {
      setError('Description is required');
      return;
    }

    const entry: MaintenanceHistoryEntry = {
      ...newMaintenanceHistory,
      id: `mhist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    if (editingProperty && editingProperty.id === propertyId) {
      const sortedHistory = [...(editingProperty.maintenanceHistory || []), entry]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setEditingProperty({
        ...editingProperty,
        maintenanceHistory: sortedHistory
      });
    }

    setNewMaintenanceHistory(emptyMaintenanceHistoryEntry);
    setShowMaintenanceHistoryForm(false);
  };

  const updateMaintenanceHistoryEntry = async (propertyId: string, updatedEntry: MaintenanceHistoryEntry) => {
    if (editingFromView) {
      // Editing from the view modal — persist directly to storage
      try {
        const property = properties.find(p => p.id === propertyId);
        if (!property) return;
        const sortedHistory = (property.maintenanceHistory || []).map(e =>
          e.id === updatedEntry.id ? updatedEntry : e
        ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const updatedProperty: Property = {
          ...property,
          maintenanceHistory: sortedHistory
        };
        await storage.update('properties', propertyId, updatedProperty);
        setProperties(properties.map(p => p.id === propertyId ? updatedProperty : p));
        notifyDataChange();
        setViewingDetails(updatedProperty);
        setEditingProperty(null);
        setEditingMaintenanceHistory(null);
        setEditingFromView(false);
      } catch (err) {
        setError('Failed to update maintenance entry');
        console.error(err);
      }
    } else {
      // Editing from the property edit form — in-memory only until property is saved
      if (editingProperty && editingProperty.id === propertyId) {
        const sortedHistory = editingProperty.maintenanceHistory?.map(e =>
          e.id === updatedEntry.id ? updatedEntry : e
        ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) || [];
        setEditingProperty({
          ...editingProperty,
          maintenanceHistory: sortedHistory
        });
      }
      setEditingMaintenanceHistory(null);
    }
  };

  const deleteMaintenanceHistoryEntry = async (propertyId: string, entryId: string) => {
    if (!confirm('Delete this maintenance entry?')) return;

    if (editingProperty && editingProperty.id === propertyId) {
      const entry = editingProperty.maintenanceHistory?.find(e => e.id === entryId);
      if (entry?.documents?.length) {
        await documentService.deleteDocuments('certificates', entry.documents);
      }
      setEditingProperty({
        ...editingProperty,
        maintenanceHistory: editingProperty.maintenanceHistory?.filter(e => e.id !== entryId) || []
      });
    }
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
      if (!downloadDataUrl(dataUrl, docRef.filename)) {
        setError('Invalid file data format');
        return;
      }
    } catch (err) {
      setError('Failed to download file');
      console.error('Download error:', err);
    }
  };

  // Generic document upload handler
  const handleDocumentUpload = async (
    file: File,
    docType: 'finance' | 'insurance' | 'councilTax' | 'maintenance' | 'maintenanceHistory',
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
            if (editingMaintenanceItem && editingMaintenanceItem.id === maintenanceItemId) {
              setEditingMaintenanceItem({
                ...editingMaintenanceItem,
                documents: [...(editingMaintenanceItem.documents || []), docRef]
              });
            }
          } else if (docType === 'maintenanceHistory' && maintenanceItemId) {
            setEditingProperty({
              ...editingProperty,
              maintenanceHistory: (editingProperty.maintenanceHistory || []).map(e =>
                e.id === maintenanceItemId
                  ? { ...e, documents: [...(e.documents || []), docRef] }
                  : e
              )
            });
            if (editingMaintenanceHistory && editingMaintenanceHistory.id === maintenanceItemId) {
              setEditingMaintenanceHistory({
                ...editingMaintenanceHistory,
                documents: [...(editingMaintenanceHistory.documents || []), docRef]
              });
            }
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
    docType: 'finance' | 'insurance' | 'councilTax' | 'maintenance' | 'maintenanceHistory',
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
        if (editingMaintenanceItem && editingMaintenanceItem.id === maintenanceItemId) {
          setEditingMaintenanceItem({
            ...editingMaintenanceItem,
            documents: (editingMaintenanceItem.documents || []).filter(d => d.id !== docRef.id)
          });
        }
      } else if (docType === 'maintenanceHistory' && maintenanceItemId) {
        setEditingProperty({
          ...editingProperty,
          maintenanceHistory: (editingProperty.maintenanceHistory || []).map(e =>
            e.id === maintenanceItemId
              ? { ...e, documents: (e.documents || []).filter(d => d.id !== docRef.id) }
              : e
          )
        });
        if (editingMaintenanceHistory && editingMaintenanceHistory.id === maintenanceItemId) {
          setEditingMaintenanceHistory({
            ...editingMaintenanceHistory,
            documents: (editingMaintenanceHistory.documents || []).filter(d => d.id !== docRef.id)
          });
        }
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
    ),
    maintenanceUnpaid: properties.reduce((count, p) =>
      count + (p.maintenanceItems || []).filter(m => hasUnpaidService(m)).length, 0
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
    docType: 'finance' | 'insurance' | 'councilTax' | 'maintenance' | 'maintenanceHistory';
    maintenanceItemId?: string;
    canEdit?: boolean;
  }) => {
    const colorClasses = {
      finance: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
      insurance: 'bg-green-100 text-green-700 hover:bg-green-200',
      councilTax: 'bg-amber-100 text-amber-700 hover:bg-amber-200',
      maintenance: 'bg-purple-100 text-purple-700 hover:bg-purple-200',
      maintenanceHistory: 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200'
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
        <PanelBanner
          title="Property Maintenance"
          subtitle="Manage your properties, mortgages, insurance, and maintenance"
          icon={Home}
          search={{ value: searchQuery, onChange: setSearchQuery }}
          view={{ mode: viewMode, onChange: setViewMode }}
          summary={{ shown: showSummary, onToggle: () => setShowSummary(!showSummary) }}
          onAdd={() => {
            setNewProperty(emptyProperty);
            setShowAddForm(true);
          }}
          onClose={onClose}
        />

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
            {(counts.maintenanceOverdue > 0 || counts.maintenanceDueSoon > 0 || counts.maintenanceUnpaid > 0) && (
              <div className="mt-4 flex flex-wrap gap-4">
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
                {counts.maintenanceUnpaid > 0 && (
                  <div className="flex items-center gap-2 text-amber-600">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">{counts.maintenanceUnpaid} awaiting payment</span>
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
                        <span className="text-red-600" title="Overdue maintenance"><AlertCircle className="w-4 h-4 inline" /></span>
                      ) : (property.maintenanceItems || []).some(m => isDueSoon(m.nextDueDate)) ? (
                        <span className="text-orange-500" title="Maintenance due soon"><Calendar className="w-4 h-4 inline" /></span>
                      ) : (property.maintenanceItems || []).some(m => hasUnpaidService(m)) ? (
                        <span className="text-amber-600" title="Awaiting payment"><AlertCircle className="w-4 h-4 inline" /></span>
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
                            deleteProperty(property.id);
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
                        <span className="text-red-600" title="Overdue maintenance"><AlertCircle className="w-4 h-4 inline" /></span>
                      ) : (property.maintenanceItems || []).some(m => isDueSoon(m.nextDueDate)) ? (
                        <span className="text-orange-500" title="Maintenance due soon"><Calendar className="w-4 h-4 inline" /></span>
                      ) : (property.maintenanceItems || []).some(m => hasUnpaidService(m)) ? (
                        <span className="text-amber-600" title="Awaiting payment"><AlertCircle className="w-4 h-4 inline" /></span>
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
                            deleteProperty(property.id);
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
                    const sections = [
                      {
                        title: 'Property Details',
                        fields: [
                          { label: 'Address', value: viewingDetails.address },
                          { label: 'Postcode', value: viewingDetails.postcode },
                          { label: 'Property Type', value: viewingDetails.propertyType },
                          { label: 'Finance Type', value: viewingDetails.financeType },
                          { label: 'Moved In', value: formatDate(viewingDetails.movedInDate) },
                          { label: 'Monthly Payment', value: viewingDetails.monthlyPayment > 0 ? formatCurrency(viewingDetails.monthlyPayment) : undefined },
                          { label: 'Lender/Landlord', value: viewingDetails.lender },
                          { label: 'Finance End Date', value: formatDate(viewingDetails.financeEndDate) },
                        ]
                      },
                      {
                        title: 'Insurance',
                        fields: [
                          { label: 'Company', value: viewingDetails.insuranceCompany },
                          { label: 'Policy Number', value: viewingDetails.insurancePolicyNumber },
                          { label: 'Annual Cost', value: viewingDetails.insuranceAnnualCost > 0 ? formatCurrency(viewingDetails.insuranceAnnualCost) : undefined },
                          { label: 'Renewal Date', value: formatDate(viewingDetails.insuranceRenewalDate) },
                        ]
                      },
                      {
                        title: 'Council Tax',
                        fields: [
                          { label: 'Band', value: viewingDetails.councilTaxBand },
                          { label: 'Annual Cost', value: viewingDetails.councilTaxAnnualCost > 0 ? formatCurrency(viewingDetails.councilTaxAnnualCost) : undefined },
                          { label: 'Authority', value: viewingDetails.councilTaxAuthority },
                          { label: 'Account Number', value: viewingDetails.councilTaxAccountNumber },
                        ]
                      },
                    ];

                    // Add Maintenance Items
                    if (viewingDetails.maintenanceItems && viewingDetails.maintenanceItems.length > 0) {
                      viewingDetails.maintenanceItems.forEach((item) => {
                        sections.push({
                          title: `Maintenance: ${item.name}`,
                          fields: [
                            { label: 'Company', value: item.company },
                            { label: 'Contact Details', value: item.contactDetails },
                            { label: 'Annual Cost', value: item.annualCost > 0 ? formatCurrency(item.annualCost) : undefined },
                            { label: 'Last Service', value: formatDate(item.lastDate) },
                            { label: 'Next Due', value: formatDate(item.nextDueDate) },
                            { label: 'Notes', value: item.notes },
                          ]
                        });
                      });
                    }

                    // Add Maintenance History
                    if (viewingDetails.maintenanceHistory && viewingDetails.maintenanceHistory.length > 0) {
                      viewingDetails.maintenanceHistory.forEach((entry) => {
                        sections.push({
                          title: `Work: ${entry.description} (${formatDate(entry.date)})`,
                          fields: [
                            { label: 'Date', value: formatDate(entry.date) },
                            { label: 'Type', value: maintenanceTypeLabels[entry.type] || entry.type },
                            { label: 'Contractor', value: entry.company || entry.contractor },
                            { label: 'Cost', value: formatCurrency(entry.cost) },
                            { label: 'Notes', value: entry.notes },
                          ]
                        });
                      });
                    }

                    // Add Utilities
                    if (viewingDetails.utilities && viewingDetails.utilities.length > 0) {
                      viewingDetails.utilities.forEach((utility) => {
                        sections.push({
                          title: `Utility: ${utility.company} (${getUtilityTypeLabel(utility.type)})`,
                          fields: [
                            { label: 'Type', value: getUtilityTypeLabel(utility.type) },
                            { label: 'Company', value: utility.company },
                            { label: 'Account Number', value: utility.accountNumber },
                            { label: 'Monthly Cost', value: utility.monthlyCost > 0 ? formatCurrency(utility.monthlyCost) : undefined },
                            { label: 'Contact Details', value: utility.contactDetails },
                            { label: 'Website', value: utility.websiteUrl },
                            { label: 'Notes', value: utility.notes },
                          ]
                        });
                      });
                    }

                    printRecord(
                      viewingDetails.address,
                      viewingDetails.postcode,
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
                          <th className="px-4 py-2 text-left text-gray-600">Last Done</th>
                          <th className="px-4 py-2 text-left text-gray-600">Next Due</th>
                          <th className="px-4 py-2 text-center text-gray-600">Docs</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {viewingDetails.maintenanceItems.map((item) => (
                          <tr
                            key={item.id}
                            className="hover:bg-purple-50 cursor-pointer"
                            onClick={() => setViewingMaintenanceItem(item)}
                          >
                            <td className="px-4 py-2 font-medium">
                              {item.name}
                              {hasUnpaidService(item) && (
                                <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs rounded align-middle">Awaiting payment</span>
                              )}
                            </td>
                            <td className="px-4 py-2">{item.company || '-'}</td>
                            <td className="px-4 py-2 text-right">£{item.annualCost.toFixed(2)}</td>
                            <td className="px-4 py-2 text-gray-600">
                              {item.lastDate ? formatDateUK(item.lastDate) : '-'}
                            </td>
                            <td className="px-4 py-2">
                              <span className={`${isPastDate(item.nextDueDate) ? 'text-red-600 font-medium' : isDueSoon(item.nextDueDate) ? 'text-orange-600' : ''}`}>
                                {item.nextDueDate ? formatDateUK(item.nextDueDate) : '-'}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-center">
                              {item.documents && item.documents.length > 0 ? (
                                <span className="text-xs text-gray-600 flex items-center justify-center gap-1">
                                  <FileText className="w-3 h-3" />
                                  {item.documents.length}
                                </span>
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Maintenance History */}
              {viewingDetails.maintenanceHistory && viewingDetails.maintenanceHistory.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <Wrench className="w-4 h-4" /> Other Maintenance
                  </h4>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-gray-600">Date</th>
                          <th className="px-4 py-2 text-left text-gray-600">Type</th>
                          <th className="px-4 py-2 text-left text-gray-600">Description</th>
                          <th className="px-4 py-2 text-left text-gray-600">Contractor</th>
                          <th className="px-4 py-2 text-right text-gray-600">Cost</th>
                          <th className="px-4 py-2 text-center text-gray-600">Docs</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {viewingDetails.maintenanceHistory.map((entry) => {
                          const isFuture = isFutureDate(entry.date);
                          const isOld = isOldPast(entry.date);
                          return (
                          <tr
                            key={entry.id}
                            className={`cursor-pointer ${isFuture ? 'bg-teal-50/60 hover:bg-teal-100' : isOld ? 'opacity-50 hover:bg-cyan-50' : 'hover:bg-cyan-50'}`}
                            onClick={() => setViewingMaintenanceHistory(entry)}
                          >
                            <td className="px-4 py-2 whitespace-nowrap">
                              {entry.date ? formatDateUK(entry.date) : '-'}
                              {isFuture && (
                                <span className="ml-2 px-1.5 py-0.5 bg-teal-100 text-teal-700 text-xs rounded">Upcoming</span>
                              )}
                            </td>
                            <td className="px-4 py-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                entry.type === 'repair' ? 'bg-red-100 text-red-700' :
                                entry.type === 'improvement' ? 'bg-green-100 text-green-700' :
                                entry.type === 'service' ? 'bg-blue-100 text-blue-700' :
                                entry.type === 'inspection' ? 'bg-purple-100 text-purple-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {maintenanceTypeLabels[entry.type] || entry.type}
                              </span>
                            </td>
                            <td className="px-4 py-2 font-medium">{entry.description}</td>
                            <td className="px-4 py-2">{entry.company || entry.contractor || '-'}</td>
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
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td colSpan={4} className="px-4 py-2 text-right font-medium text-gray-600">Total spent:</td>
                          <td className="px-4 py-2 text-right font-medium">£{viewingDetails.maintenanceHistory.filter(e => !isFutureDate(e.date)).reduce((sum, e) => sum + e.cost, 0).toFixed(2)}</td>
                          <td></td>
                        </tr>
                        {viewingDetails.maintenanceHistory.some(e => isFutureDate(e.date)) && (
                          <tr>
                            <td colSpan={4} className="px-4 py-2 text-right font-medium text-teal-600">Upcoming:</td>
                            <td className="px-4 py-2 text-right font-medium text-teal-700">£{viewingDetails.maintenanceHistory.filter(e => isFutureDate(e.date)).reduce((sum, e) => sum + e.cost, 0).toFixed(2)}</td>
                            <td></td>
                          </tr>
                        )}
                      </tfoot>
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

            {/* Footer Actions */}
            <div className="flex gap-2 p-6 border-t bg-gray-50">
              <button
                onClick={() => {
                  setEditingProperty(viewingDetails);
                  setViewingDetails(null);
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
                              {hasUnpaidService(item) && (
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded">Awaiting payment</span>
                              )}
                            </div>
                            <div className="text-sm text-gray-600 mt-1 space-y-0.5">
                              {item.company && <p>Company: {item.company}</p>}
                              {item.contactDetails && <p>Contact: {item.contactDetails}</p>}
                              <p>Cost: £{item.annualCost.toFixed(2)} | Next due: {item.nextDueDate ? formatDateUK(item.nextDueDate) : 'Not set'}</p>
                              {item.lastDate && <p>Last done: {formatDateUK(item.lastDate)}{item.serviceHistory?.[0]?.company ? ` by ${item.serviceHistory[0].company}` : ''}{item.serviceHistory && item.serviceHistory.length > 0 ? ` · ${item.serviceHistory.length} service${item.serviceHistory.length === 1 ? '' : 's'} logged` : ''}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openServiceDialog(editingProperty.id, item)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"
                              title="Add service record"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
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

              {/* Property Maintenance History Section */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Wrench className="w-4 h-4" /> Other Maintenance
                  </h4>
                  <button
                    onClick={() => setShowMaintenanceHistoryForm(!showMaintenanceHistoryForm)}
                    className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Work
                  </button>
                </div>

                {showMaintenanceHistoryForm && (
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Date *</label>
                        <input
                          type="date"
                          value={newMaintenanceHistory.date}
                          onChange={(e) => setNewMaintenanceHistory({ ...newMaintenanceHistory, date: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Type</label>
                        <select
                          value={newMaintenanceHistory.type}
                          onChange={(e) => setNewMaintenanceHistory({ ...newMaintenanceHistory, type: e.target.value as MaintenanceHistoryEntry['type'] })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                        >
                          <option value="decorator">Decorator</option>
                          <option value="plumber">Plumber</option>
                          <option value="electrician">Electrician</option>
                          <option value="builder">Builder</option>
                          <option value="gardener">Gardener</option>
                          <option value="cleaner">Cleaner</option>
                          <option value="gutters">Gutters</option>
                          <option value="roofing">Roofing</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm text-gray-600 mb-1">Description *</label>
                        <input
                          type="text"
                          value={newMaintenanceHistory.description}
                          onChange={(e) => setNewMaintenanceHistory({ ...newMaintenanceHistory, description: e.target.value })}
                          placeholder="e.g., Painted living room and hallway"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Cost (£)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={newMaintenanceHistory.cost || ''}
                          onChange={(e) => setNewMaintenanceHistory({ ...newMaintenanceHistory, cost: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Company/Person</label>
                        <input
                          type="text"
                          value={newMaintenanceHistory.company}
                          onChange={(e) => setNewMaintenanceHistory({ ...newMaintenanceHistory, company: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Contact Details</label>
                        <input
                          type="text"
                          value={newMaintenanceHistory.contactDetails || ''}
                          onChange={(e) => setNewMaintenanceHistory({ ...newMaintenanceHistory, contactDetails: e.target.value })}
                          placeholder="Phone or email"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm text-gray-600 mb-1">Notes</label>
                        <textarea
                          value={newMaintenanceHistory.notes || ''}
                          onChange={(e) => setNewMaintenanceHistory({ ...newMaintenanceHistory, notes: e.target.value })}
                          rows={3}
                          placeholder="Any additional notes about the work done..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                      <button
                        onClick={() => {
                          setShowMaintenanceHistoryForm(false);
                          setNewMaintenanceHistory(emptyMaintenanceHistoryEntry);
                        }}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => addMaintenanceHistoryEntry(editingProperty.id)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                      >
                        Add Work Record
                      </button>
                    </div>
                  </div>
                )}

                {editingProperty.maintenanceHistory && editingProperty.maintenanceHistory.length > 0 ? (
                  <div className="space-y-3">
                    {editingProperty.maintenanceHistory.map((entry) => {
                      const isFuture = isFutureDate(entry.date);
                      const isOld = isOldPast(entry.date);
                      return (
                      <div key={entry.id} className={`rounded-lg p-3 border ${isFuture ? 'bg-teal-50 border-teal-300 ring-1 ring-teal-200' : isOld ? 'bg-blue-50 border-blue-200 opacity-60' : 'bg-blue-50 border-blue-200'}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900">{entry.description}</span>
                              <span className="px-2 py-0.5 bg-blue-200 text-blue-800 text-xs rounded">
                                {maintenanceTypeLabels[entry.type]}
                              </span>
                              {isFuture && (
                                <span className="px-2 py-0.5 bg-teal-100 text-teal-700 text-xs rounded font-medium">Upcoming</span>
                              )}
                            </div>
                            <div className="text-sm text-gray-600 space-y-0.5">
                              <p>Date: {formatDateUK(entry.date)} | Cost: £{entry.cost.toFixed(2)}</p>
                              {entry.company && <p>Company: {entry.company}</p>}
                              {entry.contactDetails && <p>Contact: {entry.contactDetails}</p>}
                              {entry.notes && <p className="text-gray-500 italic whitespace-pre-wrap">{entry.notes}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setViewingMaintenanceHistory(entry)}
                              className="p-1.5 text-gray-600 hover:bg-blue-100 rounded"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingMaintenanceHistory(entry)}
                              className="p-1.5 text-blue-600 hover:bg-blue-100 rounded"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteMaintenanceHistoryEntry(editingProperty.id, entry.id)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                              title="Delete"
                            >
                              <Trash className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        {entry.documents && entry.documents.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-blue-200">
                            <DocumentList documents={entry.documents} docType="maintenanceHistory" maintenanceItemId={entry.id} />
                          </div>
                        )}
                        <div className="mt-2">
                          <UploadButton
                            onUpload={(file) => handleDocumentUpload(file, 'maintenanceHistory', entry.id)}
                            label="Add receipt/invoice"
                          />
                        </div>
                      </div>
                      );
                    })}
                    <div className="text-right text-sm font-medium text-gray-700">
                      Total spent: £{editingProperty.maintenanceHistory.filter(e => !isFutureDate(e.date)).reduce((sum, e) => sum + e.cost, 0).toFixed(2)}
                      {editingProperty.maintenanceHistory.some(e => isFutureDate(e.date)) && (
                        <span className="ml-3 text-teal-700">Upcoming: £{editingProperty.maintenanceHistory.filter(e => isFutureDate(e.date)).reduce((sum, e) => sum + e.cost, 0).toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">Nothing logged yet</p>
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
          <PdfJsViewer
            src={viewingDocument.blobUrl}
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
              <button onClick={() => { setEditingMaintenanceItem(null); if (editingFromView) { setEditingFromView(false); setEditingProperty(null); } }} className="p-2 hover:bg-gray-100 rounded-lg">
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
                      maintenanceItemId={editingMaintenanceItem.id}
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
                  onClick={() => { setEditingMaintenanceItem(null); if (editingFromView) { setEditingFromView(false); setEditingProperty(null); } }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Maintenance History Entry Modal */}
      {editingMaintenanceHistory && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[80] p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Edit Maintenance Entry</h3>
              <button onClick={() => { setEditingMaintenanceHistory(null); if (editingFromView) { setEditingFromView(false); setEditingProperty(null); } }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Date</label>
                  <input
                    type="date"
                    value={editingMaintenanceHistory.date}
                    onChange={(e) => setEditingMaintenanceHistory({ ...editingMaintenanceHistory, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Type</label>
                  <select
                    value={editingMaintenanceHistory.type}
                    onChange={(e) => setEditingMaintenanceHistory({ ...editingMaintenanceHistory, type: e.target.value as MaintenanceHistoryEntry['type'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="decorator">Decorator</option>
                    <option value="plumber">Plumber</option>
                    <option value="electrician">Electrician</option>
                    <option value="builder">Builder</option>
                    <option value="gardener">Gardener</option>
                    <option value="cleaner">Cleaner</option>
                    <option value="gutters">Gutters</option>
                    <option value="roofing">Roofing</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Description</label>
                <input
                  type="text"
                  value={editingMaintenanceHistory.description}
                  onChange={(e) => setEditingMaintenanceHistory({ ...editingMaintenanceHistory, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Cost (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingMaintenanceHistory.cost || ''}
                    onChange={(e) => setEditingMaintenanceHistory({ ...editingMaintenanceHistory, cost: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Company/Person</label>
                  <input
                    type="text"
                    value={editingMaintenanceHistory.company}
                    onChange={(e) => setEditingMaintenanceHistory({ ...editingMaintenanceHistory, company: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-gray-600 mb-1">Contact Details</label>
                  <input
                    type="text"
                    value={editingMaintenanceHistory.contactDetails || ''}
                    onChange={(e) => setEditingMaintenanceHistory({ ...editingMaintenanceHistory, contactDetails: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Notes</label>
                <textarea
                  value={editingMaintenanceHistory.notes || ''}
                  onChange={(e) => setEditingMaintenanceHistory({ ...editingMaintenanceHistory, notes: e.target.value })}
                  rows={3}
                  placeholder="Any additional notes about the work done..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
                />
              </div>

              {/* Documents */}
              <div>
                <label className="block text-sm text-gray-600 mb-2">Receipts/Invoices</label>
                {editingMaintenanceHistory.documents && editingMaintenanceHistory.documents.length > 0 && (
                  <div className="mb-2">
                    <DocumentList
                      documents={editingMaintenanceHistory.documents}
                      docType="maintenanceHistory"
                      maintenanceItemId={editingMaintenanceHistory.id}
                      canEdit={true}
                    />
                  </div>
                )}
                <UploadButton
                  onUpload={(file) => handleDocumentUpload(file, 'maintenanceHistory', editingMaintenanceHistory.id)}
                  label="Add receipt/invoice"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (editingProperty) {
                      updateMaintenanceHistoryEntry(editingProperty.id, editingMaintenanceHistory);
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  onClick={() => { setEditingMaintenanceHistory(null); if (editingFromView) { setEditingFromView(false); setEditingProperty(null); } }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Maintenance History Entry Modal */}
      {viewingMaintenanceHistory && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[80] p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Wrench className="w-5 h-5 text-blue-600" />
                {viewingMaintenanceHistory.description}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    printRecord(
                      viewingMaintenanceHistory.description,
                      viewingMaintenanceHistory.company || undefined,
                      [
                        {
                          title: 'Work Details',
                          fields: [
                            { label: 'Date', value: formatDate(viewingMaintenanceHistory.date) },
                            { label: 'Type', value: maintenanceTypeLabels[viewingMaintenanceHistory.type] },
                            { label: 'Cost', value: formatCurrency(viewingMaintenanceHistory.cost) },
                            { label: 'Company/Person', value: viewingMaintenanceHistory.company },
                            { label: 'Contact Details', value: viewingMaintenanceHistory.contactDetails },
                          ]
                        }
                      ],
                      viewingMaintenanceHistory.notes
                    );
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Print"
                >
                  <Printer className="w-5 h-5 text-gray-600" />
                </button>
                <button
                  onClick={() => setViewingMaintenanceHistory(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {/* Type badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                {maintenanceTypeLabels[viewingMaintenanceHistory.type]}
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-500 text-xs mb-1">Date</p>
                  <p className="font-medium">{formatDateUK(viewingMaintenanceHistory.date)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-500 text-xs mb-1">Cost</p>
                  <p className="font-medium">£{viewingMaintenanceHistory.cost.toFixed(2)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-500 text-xs mb-1">Company/Person</p>
                  <p className="font-medium">{viewingMaintenanceHistory.company || '-'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-500 text-xs mb-1">Contact Details</p>
                  <p className="font-medium">{viewingMaintenanceHistory.contactDetails || '-'}</p>
                </div>
              </div>

              {/* Notes */}
              {viewingMaintenanceHistory.notes && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-500 text-xs mb-1">Notes</p>
                  <p className="text-sm whitespace-pre-wrap">{viewingMaintenanceHistory.notes}</p>
                </div>
              )}

              {/* Documents */}
              {viewingMaintenanceHistory.documents && viewingMaintenanceHistory.documents.length > 0 && (
                <div>
                  <p className="text-gray-500 text-xs mb-2">Documents ({viewingMaintenanceHistory.documents.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {viewingMaintenanceHistory.documents.map((doc) => (
                      <button
                        key={doc.id}
                        onClick={() => viewFile(doc)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 text-sm"
                      >
                        <FileText className="w-3 h-3" />
                        {doc.filename}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <button
                  onClick={() => {
                    if (viewingDetails && !editingProperty) {
                      setEditingProperty(viewingDetails);
                    }
                    setEditingFromView(true);
                    setEditingMaintenanceHistory(viewingMaintenanceHistory);
                    setViewingMaintenanceHistory(null);
                  }}
                  className="flex-1 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 flex items-center justify-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => setViewingMaintenanceHistory(null)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Maintenance Item Modal */}
      {viewingMaintenanceItem && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[80] p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Wrench className="w-5 h-5 text-purple-600" />
                {viewingMaintenanceItem.name}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    printRecord(
                      viewingMaintenanceItem.name,
                      viewingMaintenanceItem.company || undefined,
                      [
                        {
                          title: 'Details',
                          fields: [
                            { label: 'Company', value: viewingMaintenanceItem.company },
                            { label: 'Contact Details', value: viewingMaintenanceItem.contactDetails },
                            { label: 'Annual Cost', value: formatCurrency(viewingMaintenanceItem.annualCost) },
                            { label: 'Last Service Date', value: formatDate(viewingMaintenanceItem.lastDate) },
                            { label: 'Next Due Date', value: formatDate(viewingMaintenanceItem.nextDueDate) },
                          ]
                        },
                        ...((viewingMaintenanceItem.serviceHistory && viewingMaintenanceItem.serviceHistory.length > 0) ? [{
                          title: 'Service History',
                          fields: viewingMaintenanceItem.serviceHistory.map(s => ({
                            label: formatDate(s.date),
                            value: `${formatCurrency(s.cost)} — ${s.paid ? 'Paid' : 'Awaiting payment'}${s.notes ? ` (${s.notes})` : ''}`
                          }))
                        }] : [])
                      ],
                      viewingMaintenanceItem.notes
                    );
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Print"
                >
                  <Printer className="w-5 h-5 text-gray-600" />
                </button>
                <button
                  onClick={() => setViewingMaintenanceItem(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {/* Status badges — time-based and payment are independent */}
              <div className="flex flex-wrap items-center gap-2">
                {viewingMaintenanceItem.nextDueDate && (
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${
                  isPastDate(viewingMaintenanceItem.nextDueDate)
                    ? 'bg-red-100 text-red-700'
                    : isDueSoon(viewingMaintenanceItem.nextDueDate)
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-green-100 text-green-700'
                }`}>
                  <AlertCircle className="w-4 h-4" />
                  {isPastDate(viewingMaintenanceItem.nextDueDate)
                    ? 'Overdue'
                    : isDueSoon(viewingMaintenanceItem.nextDueDate)
                    ? 'Due Soon'
                    : 'Up to Date'}
                </div>
                )}
                {hasUnpaidService(viewingMaintenanceItem) && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-100 text-amber-700">
                    <AlertCircle className="w-4 h-4" />
                    Awaiting payment
                  </div>
                )}
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-500 text-xs mb-1">Company</p>
                  <p className="font-medium">{viewingMaintenanceItem.company || '-'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-500 text-xs mb-1">Annual Cost</p>
                  <p className="font-medium">£{viewingMaintenanceItem.annualCost.toFixed(2)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-500 text-xs mb-1">Last Service</p>
                  <p className="font-medium">{viewingMaintenanceItem.lastDate ? formatDateUK(viewingMaintenanceItem.lastDate) : '-'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-500 text-xs mb-1">Next Due</p>
                  <p className={`font-medium ${
                    isPastDate(viewingMaintenanceItem.nextDueDate)
                      ? 'text-red-600'
                      : isDueSoon(viewingMaintenanceItem.nextDueDate)
                      ? 'text-orange-600'
                      : ''
                  }`}>
                    {viewingMaintenanceItem.nextDueDate ? formatDateUK(viewingMaintenanceItem.nextDueDate) : '-'}
                  </p>
                </div>
              </div>

              {/* Contact Details */}
              {viewingMaintenanceItem.contactDetails && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-gray-500 text-xs mb-1 flex items-center gap-1">
                    <Phone className="w-3 h-3" /> Contact Details
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{viewingMaintenanceItem.contactDetails}</p>
                </div>
              )}

              {/* Notes */}
              {viewingMaintenanceItem.notes && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-500 text-xs mb-1">Notes</p>
                  <p className="text-sm whitespace-pre-wrap">{viewingMaintenanceItem.notes}</p>
                </div>
              )}

              {/* Service History — rolling log of past occurrences */}
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-500 text-xs">
                    Service History{viewingMaintenanceItem.serviceHistory && viewingMaintenanceItem.serviceHistory.length > 0 ? ` (${viewingMaintenanceItem.serviceHistory.length})` : ''}
                  </p>
                  {viewingDetails && (
                    <button
                      onClick={() => openServiceDialog(viewingDetails.id, viewingMaintenanceItem)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-xs"
                    >
                      <CheckCircle className="w-3 h-3" /> Add service record
                    </button>
                  )}
                </div>
                {viewingMaintenanceItem.serviceHistory && viewingMaintenanceItem.serviceHistory.length > 0 ? (
                  <div className="space-y-1.5">
                    {viewingMaintenanceItem.serviceHistory.map((s) => (
                      <div key={s.id} className="bg-gray-50 rounded-lg px-3 py-2 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="font-medium whitespace-nowrap">{formatDateUK(s.date)}</span>
                            {s.company && <span className="text-gray-600 whitespace-nowrap truncate">{s.company}</span>}
                            <span className="text-gray-600 whitespace-nowrap">£{s.cost.toFixed(2)}</span>
                            {s.notes && <span className="text-gray-400 text-xs truncate">{s.notes}</span>}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {viewingDetails && (
                              <button
                                onClick={() => toggleServicePaid(viewingDetails.id, viewingMaintenanceItem, s.id)}
                                className={`px-2 py-0.5 text-xs rounded ${s.paid ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}
                                title="Toggle paid status"
                              >
                                {s.paid ? 'Paid' : 'Unpaid'}
                              </button>
                            )}
                            {viewingDetails && (
                              <label className="p-1 text-gray-400 hover:text-blue-600 cursor-pointer" title="Attach receipt">
                                <Upload className="w-3.5 h-3.5" />
                                <input
                                  type="file"
                                  accept="image/*,.pdf"
                                  onChange={(e) => addDocumentToServiceRecord(viewingDetails.id, viewingMaintenanceItem, s.id, e)}
                                  className="hidden"
                                />
                              </label>
                            )}
                            {viewingDetails && (
                              <button
                                onClick={() => deleteServiceRecord(viewingDetails.id, viewingMaintenanceItem, s.id)}
                                className="p-1 text-red-400 hover:text-red-600"
                                title="Delete record"
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                        {s.documents && s.documents.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {s.documents.map((doc) => (
                              <span key={doc.id} className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                                <button onClick={() => viewFile(doc)} className="flex items-center gap-1 hover:underline">
                                  <FileText className="w-3 h-3" />
                                  {doc.filename}
                                </button>
                                {viewingDetails && (
                                  <button
                                    onClick={() => deleteServiceRecordDocument(viewingDetails.id, viewingMaintenanceItem, s.id, doc)}
                                    className="p-0.5 hover:bg-blue-200 rounded"
                                    title="Remove receipt"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">No visits logged yet — use "Add service record" after each visit.</p>
                )}
              </div>

              {/* Documents */}
              {viewingMaintenanceItem.documents && viewingMaintenanceItem.documents.length > 0 && (
                <div>
                  <p className="text-gray-500 text-xs mb-2">Documents ({viewingMaintenanceItem.documents.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {viewingMaintenanceItem.documents.map((doc) => (
                      <button
                        key={doc.id}
                        onClick={() => viewFile(doc)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 text-sm"
                      >
                        <FileText className="w-3 h-3" />
                        {doc.filename}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <button
                  onClick={() => {
                    if (viewingDetails && !editingProperty) {
                      setEditingProperty(viewingDetails);
                    }
                    setEditingFromView(true);
                    setEditingMaintenanceItem(viewingMaintenanceItem);
                    setViewingMaintenanceItem(null);
                  }}
                  className="flex-1 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 flex items-center justify-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => setViewingMaintenanceItem(null)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mark Serviced Dialog — logs a completed occurrence and rolls the dates forward */}
      {servicingItem && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[90] p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                Add service record
              </h3>
              <button onClick={cancelServiceDialog} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">{servicingItem.item.name}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Done by</label>
                <input
                  type="text"
                  value={serviceForm.company}
                  onChange={(e) => setServiceForm({ ...serviceForm, company: e.target.value })}
                  placeholder="Company / person who did the work"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Date done</label>
                  <input
                    type="date"
                    value={serviceForm.date}
                    onChange={(e) => setServiceForm({ ...serviceForm, date: e.target.value, nextDueDate: addOneYear(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Cost (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={serviceForm.cost || ''}
                    onChange={(e) => setServiceForm({ ...serviceForm, cost: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Next due</label>
                  <input
                    type="date"
                    value={serviceForm.nextDueDate}
                    onChange={(e) => setServiceForm({ ...serviceForm, nextDueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <p className="text-xs text-gray-400 mt-1">Defaults to one year on</p>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer pb-2">
                    <input
                      type="checkbox"
                      checked={serviceForm.paid}
                      onChange={(e) => setServiceForm({ ...serviceForm, paid: e.target.checked })}
                      className="w-4 h-4"
                    />
                    Already paid
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Notes (optional)</label>
                <input
                  type="text"
                  value={serviceForm.notes}
                  onChange={(e) => setServiceForm({ ...serviceForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Receipts / documents (optional)</label>
                {serviceForm.documents.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {serviceForm.documents.map((doc) => (
                      <span key={doc.id} className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                        <FileText className="w-3 h-3" />
                        {doc.filename}
                        <button
                          onClick={() => removeServiceFormDocument(doc)}
                          className="p-0.5 hover:bg-blue-200 rounded"
                          title="Remove"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <label className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 w-fit text-sm">
                  <Upload className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">Upload receipt</span>
                  <input type="file" accept="image/*,.pdf" onChange={handleServiceFormUpload} className="hidden" />
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={markServiced}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  Add record
                </button>
                <button
                  onClick={cancelServiceDialog}
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
