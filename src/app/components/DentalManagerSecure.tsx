import { useState, useEffect } from 'react';
import { X, Plus, Trash, Smile, Calendar, Edit2, FileText, Search, AlertCircle, Upload, Eye, EyeOff, Download, User, Building, Phone, MapPin, Printer, Grid3x3, List, CheckCircle } from 'lucide-react';
import { useStorage, useDocumentService, useDataVersion } from '../../contexts/StorageContext';
import { PdfJsViewer } from './PdfJsViewer';
import { DocumentReference } from '../../services/document-service';

interface DentalPractice {
  id: string;
  name: string;
  address?: string;
  phone?: string;
}

interface DentalRecord {
  id: string;
  surgeryName: string;
  surgeryAddress?: string;
  surgeryPhone?: string;
  practitionerName: string;
  practitionerType: 'dentist' | 'hygienist';
  patientName: string;
  date: string;
  time?: string;
  type: 'checkup' | 'hygienist' | 'treatment' | 'emergency' | 'consultation' | 'other';
  description?: string;
  cost: number;
  paymentMethod?: 'plan' | 'direct' | 'insurance' | 'nhs';
  nextAppointmentDate?: string;
  nextAppointmentTime?: string;
  documents?: DocumentReference[];
  notes?: string;
}

interface DentalManagerSecureProps {
  onClose: () => void;
}

const emptyRecord: Omit<DentalRecord, 'id'> = {
  surgeryName: '',
  surgeryAddress: '',
  surgeryPhone: '',
  practitionerName: '',
  practitionerType: 'dentist',
  patientName: '',
  date: '',
  time: '',
  type: 'checkup',
  description: '',
  cost: 0,
  paymentMethod: 'plan',
  nextAppointmentDate: '',
  nextAppointmentTime: '',
  documents: [],
  notes: ''
};

const isPastDate = (dateStr: string): boolean => {
  if (!dateStr) return false;
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
};

const isDueSoon = (dateStr: string): boolean => {
  if (!dateStr) return false;
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thirtyDays = new Date(today);
  thirtyDays.setDate(today.getDate() + 30);
  return date >= today && date <= thirtyDays;
};

const formatDateUK = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
};

const formatTime = (timeStr?: string): string => {
  if (!timeStr) return '';
  return timeStr;
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2
  }).format(amount);
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'checkup': return 'bg-blue-100 text-blue-700';
    case 'hygienist': return 'bg-teal-100 text-teal-700';
    case 'treatment': return 'bg-purple-100 text-purple-700';
    case 'emergency': return 'bg-red-100 text-red-700';
    case 'consultation': return 'bg-amber-100 text-amber-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'checkup': return 'Checkup';
    case 'hygienist': return 'Hygienist';
    case 'treatment': return 'Treatment';
    case 'emergency': return 'Emergency';
    case 'consultation': return 'Consultation';
    default: return 'Other';
  }
};

const getPaymentLabel = (method?: string) => {
  switch (method) {
    case 'plan': return 'Dental Plan';
    case 'direct': return 'Direct Payment';
    case 'insurance': return 'Insurance';
    case 'nhs': return 'NHS';
    default: return 'Not specified';
  }
};

// Separate RecordForm component to prevent re-render issues
interface RecordFormProps {
  record: Omit<DentalRecord, 'id'> | DentalRecord;
  onFieldChange: (field: string, value: any) => void;
  onSave: () => void;
  onCancel: () => void;
  onFileUpload: (file: File) => void;
  onRemoveDocument: (index: number) => void;
  isEditing: boolean;
  savedPatients: string[];
  savedPractices: DentalPractice[];
}

function RecordForm({
  record,
  onFieldChange,
  onSave,
  onCancel,
  onFileUpload,
  onRemoveDocument,
  isEditing,
  savedPatients,
  savedPractices
}: RecordFormProps) {
  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white p-6 rounded-t-2xl sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Smile className="w-6 h-6" />
              {isEditing ? 'Edit Dental Record' : 'Add Dental Record'}
            </h2>
            <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Patient & Appointment */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Appointment Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Patient Name *</label>
                <input
                  type="text"
                  list="patient-names"
                  value={record.patientName}
                  onChange={(e) => onFieldChange('patientName', e.target.value)}
                  placeholder="Who is the appointment for?"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
                <datalist id="patient-names">
                  {savedPatients.map(name => <option key={name} value={name} />)}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input
                  type="date"
                  value={record.date}
                  onChange={(e) => onFieldChange('date', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <input
                  type="time"
                  value={record.time || ''}
                  onChange={(e) => onFieldChange('time', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Appointment Type</label>
                <select
                  value={record.type}
                  onChange={(e) => onFieldChange('type', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="checkup">Checkup</option>
                  <option value="hygienist">Hygienist</option>
                  <option value="treatment">Treatment</option>
                  <option value="emergency">Emergency</option>
                  <option value="consultation">Consultation</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Next Appointment Date</label>
                <input
                  type="date"
                  value={record.nextAppointmentDate || ''}
                  onChange={(e) => onFieldChange('nextAppointmentDate', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Next Appointment Time</label>
                <input
                  type="time"
                  value={record.nextAppointmentTime || ''}
                  onChange={(e) => onFieldChange('nextAppointmentTime', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={record.description || ''}
                onChange={(e) => onFieldChange('description', e.target.value)}
                placeholder="e.g., Filling lower right molar, Scale and polish..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
          </div>

          {/* Practice & Practitioner */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Practice & Practitioner
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Surgery/Practice Name</label>
                <input
                  type="text"
                  list="practice-names"
                  value={record.surgeryName}
                  onChange={(e) => {
                    const value = e.target.value;
                    onFieldChange('surgeryName', value);
                    // Auto-fill from saved practice
                    const practice = savedPractices.find(p => p.name === value);
                    if (practice) {
                      if (practice.address) onFieldChange('surgeryAddress', practice.address);
                      if (practice.phone) onFieldChange('surgeryPhone', practice.phone);
                    }
                  }}
                  placeholder="Dental surgery name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
                <datalist id="practice-names">
                  {savedPractices.map(p => <option key={p.id} value={p.name} />)}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={record.surgeryPhone || ''}
                  onChange={(e) => onFieldChange('surgeryPhone', e.target.value)}
                  placeholder="Surgery phone number"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={record.surgeryAddress || ''}
                  onChange={(e) => onFieldChange('surgeryAddress', e.target.value)}
                  placeholder="Surgery address"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Practitioner Name</label>
                <input
                  type="text"
                  value={record.practitionerName}
                  onChange={(e) => onFieldChange('practitionerName', e.target.value)}
                  placeholder="Dentist or hygienist name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Practitioner Type</label>
                <select
                  value={record.practitionerType}
                  onChange={(e) => onFieldChange('practitionerType', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="dentist">Dentist</option>
                  <option value="hygienist">Hygienist</option>
                </select>
              </div>
            </div>
          </div>

          {/* Costs */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Payment</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cost (£)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={record.cost ?? ''}
                  onChange={(e) => onFieldChange('cost', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                  placeholder="0.00"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <select
                  value={record.paymentMethod || 'plan'}
                  onChange={(e) => onFieldChange('paymentMethod', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="plan">Dental Plan</option>
                  <option value="direct">Direct Payment</option>
                  <option value="insurance">Insurance</option>
                  <option value="nhs">NHS</option>
                </select>
              </div>
            </div>
          </div>

          {/* Documents */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Documents</h3>
            {(record.documents || []).length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {(record.documents || []).map((doc, idx) => (
                  <div key={idx} className="flex items-center gap-1 px-3 py-1.5 bg-teal-100 text-teal-700 rounded-lg text-sm">
                    <FileText className="w-3 h-3" />
                    <span className="truncate max-w-[150px]">{doc.filename}</span>
                    <button
                      onClick={() => onRemoveDocument(idx)}
                      className="p-1 hover:bg-teal-200 rounded transition-colors"
                    >
                      <Trash className="w-3 h-3 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <label className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-teal-400 cursor-pointer transition-colors w-fit">
              <Upload className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">Upload receipt or document</span>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onFileUpload(file);
                  e.target.value = '';
                }}
              />
            </label>
          </div>

          {/* Notes */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Notes</h3>
            <textarea
              value={record.notes || ''}
              onChange={(e) => onFieldChange('notes', e.target.value)}
              placeholder="Any additional notes about this appointment..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              {isEditing ? 'Save Changes' : 'Add Record'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Separate ViewModal component
interface ViewModalProps {
  record: DentalRecord;
  onClose: () => void;
  onEdit: () => void;
  onPrint: () => void;
  onViewDocument: (doc: DocumentReference) => void;
  onMarkComplete: () => void;
}

function ViewModal({ record, onClose, onEdit, onPrint, onViewDocument, onMarkComplete }: ViewModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white p-6 rounded-t-2xl sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">{record.patientName}</h2>
              <p className="text-white/80 text-sm mt-1">
                {getTypeLabel(record.type)} - {formatDateUK(record.date)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onPrint} className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Print">
                <Printer className="w-5 h-5" />
              </button>
              <button onClick={onEdit} className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Edit">
                <Edit2 className="w-5 h-5" />
              </button>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Appointment Details */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Appointment Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Patient</p>
                <p className="font-medium flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  {record.patientName}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Date & Time</p>
                <p className="font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  {formatDateUK(record.date)}{record.time && ` at ${record.time}`}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Type</p>
                <span className={`inline-block px-2 py-1 rounded-lg text-sm ${getTypeColor(record.type)}`}>
                  {getTypeLabel(record.type)}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Practitioner</p>
                <p className="font-medium">
                  {record.practitionerName || 'Not specified'}
                  {record.practitionerName && (
                    <span className="text-gray-500 text-sm ml-1">({record.practitionerType})</span>
                  )}
                </p>
              </div>
            </div>
            {record.description && (
              <div className="mt-4">
                <p className="text-sm text-gray-500">Description</p>
                <p className="mt-1">{record.description}</p>
              </div>
            )}
          </div>

          {/* Practice Details */}
          {(record.surgeryName || record.surgeryAddress || record.surgeryPhone) && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Practice Details
              </h3>
              <div className="space-y-2">
                {record.surgeryName && (
                  <p className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-gray-400" />
                    {record.surgeryName}
                  </p>
                )}
                {record.surgeryAddress && (
                  <p className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    {record.surgeryAddress}
                  </p>
                )}
                {record.surgeryPhone && (
                  <p className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    {record.surgeryPhone}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Payment */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Payment</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Cost</p>
                <p className="font-medium text-lg">{formatCurrency(record.cost)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Payment Method</p>
                <p className="font-medium">{getPaymentLabel(record.paymentMethod)}</p>
              </div>
            </div>
          </div>

          {/* Next Appointment */}
          {record.nextAppointmentDate && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                  Next Appointment
                </h3>
                <button
                  onClick={onMarkComplete}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200 transition-colors"
                  title="Mark appointment as complete"
                >
                  <CheckCircle className="w-3 h-3" />
                  Mark as complete
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="font-medium">
                  {formatDateUK(record.nextAppointmentDate)}{record.nextAppointmentTime && ` at ${record.nextAppointmentTime}`}
                </span>
                {isDueSoon(record.nextAppointmentDate) && (
                  <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                    Coming up
                  </span>
                )}
                {isPastDate(record.nextAppointmentDate) && (
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                    Overdue
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Documents */}
          {record.documents && record.documents.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Documents</h3>
              <div className="flex flex-wrap gap-2">
                {record.documents.map((doc, idx) => (
                  <button
                    key={idx}
                    onClick={() => onViewDocument(doc)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-teal-100 text-teal-700 rounded-lg hover:bg-teal-200 transition-colors text-sm"
                  >
                    <FileText className="w-3 h-3" />
                    {doc.filename}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {record.notes && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Notes</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{record.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function DentalManagerSecure({ onClose }: DentalManagerSecureProps) {
  const storage = useStorage();
  const documentService = useDocumentService();
  const { notifyDataChange } = useDataVersion();
  const [records, setRecords] = useState<DentalRecord[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DentalRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [newRecord, setNewRecord] = useState<Omit<DentalRecord, 'id'>>({ ...emptyRecord });
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingDocument, setViewingDocument] = useState<{ docRef: DocumentReference; dataUrl: string; blobUrl: string } | null>(null);
  const [loadingDocument, setLoadingDocument] = useState(false);
  const [showSummary, setShowSummary] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [savedPractices, setSavedPractices] = useState<DentalPractice[]>([]);
  const [savedPatients, setSavedPatients] = useState<string[]>([]);

  useEffect(() => {
    loadRecords();
  }, []);

  useEffect(() => {
    const practices: DentalPractice[] = [];
    const patients = new Set<string>();
    const practiceNames = new Set<string>();

    records.forEach(record => {
      if (record.surgeryName && !practiceNames.has(record.surgeryName)) {
        practiceNames.add(record.surgeryName);
        practices.push({
          id: record.surgeryName,
          name: record.surgeryName,
          address: record.surgeryAddress,
          phone: record.surgeryPhone
        });
      }
      if (record.patientName) {
        patients.add(record.patientName);
      }
    });

    setSavedPractices(practices);
    setSavedPatients([...patients]);
  }, [records]);

  const loadRecords = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await storage.get<DentalRecord>('dental_records');
      setRecords(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(`Failed to load dental records: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewRecordFieldChange = (field: string, value: any) => {
    setNewRecord(prev => ({ ...prev, [field]: value }));
  };

  const handleEditRecordFieldChange = (field: string, value: any) => {
    if (editingRecord) {
      setEditingRecord(prev => prev ? { ...prev, [field]: value } : null);
    }
  };

  const addRecord = async () => {
    if (!newRecord.date || !newRecord.patientName.trim()) {
      setError('Date and patient name are required');
      return;
    }

    try {
      setError('');
      const record: DentalRecord = {
        id: Date.now().toString(),
        ...newRecord
      };

      await storage.add('dental_records', record);
      await loadRecords();
      notifyDataChange();
      setNewRecord({ ...emptyRecord });
      setShowAddForm(false);
    } catch (err) {
      setError('Failed to add record');
    }
  };

  const updateRecord = async () => {
    if (!editingRecord || !editingRecord.date || !editingRecord.patientName.trim()) {
      setError('Date and patient name are required');
      return;
    }

    try {
      setError('');
      await storage.update('dental_records', editingRecord.id, editingRecord);
      await loadRecords();
      notifyDataChange();
      setEditingRecord(null);
    } catch (err) {
      setError('Failed to update record');
    }
  };

  const deleteRecord = async (id: string) => {
    if (!confirm('Are you sure you want to delete this dental record?')) return;

    try {
      setError('');
      const record = records.find(r => r.id === id);
      if (record && record.documents && record.documents.length > 0) {
        await documentService.deleteDocuments('dental', record.documents);
      }
      await storage.delete('dental_records', id);
      await loadRecords();
      notifyDataChange();
      if (expandedRecord === id) setExpandedRecord(null);
    } catch (err) {
      setError('Failed to delete record');
    }
  };

  const markNextAppointmentComplete = async (id: string) => {
    try {
      setError('');
      const record = records.find(r => r.id === id);
      if (!record) return;
      await storage.update('dental_records', id, { ...record, nextAppointmentDate: '', nextAppointmentTime: '' });
      await loadRecords();
      notifyDataChange();
    } catch (err) {
      setError('Failed to mark appointment complete');
    }
  };

  const startEdit = (record: DentalRecord) => {
    setEditingRecord({ ...record });
    setExpandedRecord(null);
  };

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
      const dataUrl = await documentService.loadDocument('dental', docRef);
      const blobUrl = dataUrlToBlobUrl(dataUrl);
      setViewingDocument({ docRef, dataUrl, blobUrl });
    } catch (err) {
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
      const dataUrl = await documentService.loadDocument('dental', docRef);
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
    }
  };

  const handleFileUpload = async (file: File, isEditing: boolean) => {
    try {
      setError('');
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result as string;
          const uploadDate = new Date().toISOString();
          const docRef = await documentService.saveDocument('dental', file.name, base64, uploadDate);

          if (isEditing && editingRecord) {
            setEditingRecord(prev => prev ? {
              ...prev,
              documents: [...(prev.documents || []), docRef]
            } : null);
          } else {
            setNewRecord(prev => ({
              ...prev,
              documents: [...(prev.documents || []), docRef]
            }));
          }
        } catch (err) {
          setError('Failed to save document');
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Failed to upload document');
    }
  };

  const removeDocument = async (index: number, isEditing: boolean) => {
    try {
      setError('');

      if (isEditing && editingRecord) {
        const docs = [...(editingRecord.documents || [])];
        const docToRemove = docs[index];
        if (docToRemove) {
          await documentService.deleteDocument('dental', docToRemove);
        }
        docs.splice(index, 1);
        setEditingRecord(prev => prev ? { ...prev, documents: docs } : null);
      } else {
        const docs = [...(newRecord.documents || [])];
        const docToRemove = docs[index];
        if (docToRemove) {
          await documentService.deleteDocument('dental', docToRemove);
        }
        docs.splice(index, 1);
        setNewRecord(prev => ({ ...prev, documents: docs }));
      }
    } catch (err) {
      setError('Failed to remove document');
    }
  };

  const handlePrint = (record: DentalRecord) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Dental Record - ${record.patientName}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
          h1 { color: #1e293b; border-bottom: 2px solid #14b8a6; padding-bottom: 10px; }
          h2 { color: #475569; margin-top: 20px; }
          .section { margin-bottom: 20px; }
          .label { font-weight: bold; color: #64748b; }
          .value { margin-left: 10px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>Dental Record</h1>
        <div class="section">
          <h2>Appointment Details</h2>
          <div class="grid">
            <div><span class="label">Patient:</span><span class="value">${record.patientName}</span></div>
            <div><span class="label">Date:</span><span class="value">${formatDateUK(record.date)}${record.time ? ` at ${record.time}` : ''}</span></div>
            <div><span class="label">Type:</span><span class="value">${getTypeLabel(record.type)}</span></div>
            <div><span class="label">Practitioner:</span><span class="value">${record.practitionerName} (${record.practitionerType})</span></div>
          </div>
        </div>
        <div class="section">
          <h2>Practice Details</h2>
          <div><span class="label">Surgery:</span><span class="value">${record.surgeryName}</span></div>
          ${record.surgeryAddress ? `<div><span class="label">Address:</span><span class="value">${record.surgeryAddress}</span></div>` : ''}
          ${record.surgeryPhone ? `<div><span class="label">Phone:</span><span class="value">${record.surgeryPhone}</span></div>` : ''}
        </div>
        ${record.description ? `<div class="section"><h2>Description</h2><p>${record.description}</p></div>` : ''}
        <div class="section">
          <h2>Payment</h2>
          <div><span class="label">Cost:</span><span class="value">${formatCurrency(record.cost)}</span></div>
          <div><span class="label">Payment Method:</span><span class="value">${getPaymentLabel(record.paymentMethod)}</span></div>
        </div>
        ${record.nextAppointmentDate ? `<div class="section"><h2>Next Appointment</h2><div><span class="label">Date:</span><span class="value">${formatDateUK(record.nextAppointmentDate)}${record.nextAppointmentTime ? ` at ${record.nextAppointmentTime}` : ''}</span></div></div>` : ''}
        ${record.notes ? `<div class="section"><h2>Notes</h2><p>${record.notes}</p></div>` : ''}
        <div style="margin-top: 40px; font-size: 12px; color: #94a3b8;">
          Printed from Personal Hub on ${new Date().toLocaleDateString('en-GB')}
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Sort: future appointments first (soonest at top), then past appointments (most recent first)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sortedRecords = [...records].sort((a, b) => {
    const dateA = new Date(a.date + 'T00:00:00');
    const dateB = new Date(b.date + 'T00:00:00');
    const aIsFuture = dateA >= today;
    const bIsFuture = dateB >= today;

    // Future appointments come first
    if (aIsFuture && !bIsFuture) return -1;
    if (!aIsFuture && bIsFuture) return 1;

    // Both future: sort ascending (soonest first)
    if (aIsFuture && bIsFuture) {
      return dateA.getTime() - dateB.getTime();
    }

    // Both past: sort descending (most recent first)
    return dateB.getTime() - dateA.getTime();
  });

  const filteredRecords = sortedRecords.filter(record => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      record.patientName.toLowerCase().includes(query) ||
      record.surgeryName.toLowerCase().includes(query) ||
      record.practitionerName.toLowerCase().includes(query) ||
      record.type.toLowerCase().includes(query) ||
      (record.description?.toLowerCase().includes(query) || false) ||
      (record.notes?.toLowerCase().includes(query) || false) ||
      record.date.includes(query)
    );
  });

  const totalCost = records.reduce((sum, r) => sum + (r.cost || 0), 0);
  const upcomingAppointments = records.filter(r => r.nextAppointmentDate && isDueSoon(r.nextAppointmentDate)).length;
  const overdueAppointments = records.filter(r => r.nextAppointmentDate && isPastDate(r.nextAppointmentDate)).length;
  const uniquePatients = new Set(records.map(r => r.patientName)).size;

  const expandedRecordData = expandedRecord ? records.find(r => r.id === expandedRecord) : null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 overflow-hidden">
      <div className="absolute inset-2 bg-white rounded-2xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white p-6 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smile className="w-8 h-8" />
              <div>
                <h2 className="text-2xl font-bold">Dental Records</h2>
                <p className="text-white/80 text-sm">Track appointments, treatments, and costs for your family</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/60" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search records..."
                  className="pl-9 pr-4 py-2 bg-white/20 text-white placeholder-white/60 rounded-lg border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 w-48"
                />
              </div>

              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white/30' : 'hover:bg-white/10'}`}
                title="Grid view"
              >
                <Grid3x3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white/30' : 'hover:bg-white/10'}`}
                title="List view"
              >
                <List className="w-5 h-5" />
              </button>

              <button
                onClick={() => setShowSummary(!showSummary)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title={showSummary ? 'Hide summary' : 'Show summary'}
              >
                {showSummary ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>

              <div className="w-px h-8 bg-white/30 mx-1" />

              <button
                onClick={() => {
                  setNewRecord({ ...emptyRecord });
                  setShowAddForm(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-white text-teal-700 rounded-lg hover:bg-white/90 transition-colors font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Record
              </button>

              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0 p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
            </div>
          ) : (
            <>
              {showSummary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-4 border border-teal-100">
                    <p className="text-sm text-teal-600 font-medium">Total Records</p>
                    <p className="text-2xl font-bold text-teal-700">{records.length}</p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                    <p className="text-sm text-blue-600 font-medium">Family Members</p>
                    <p className="text-2xl font-bold text-blue-700">{uniquePatients}</p>
                  </div>
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100">
                    <p className="text-sm text-amber-600 font-medium">Total Spent</p>
                    <p className="text-2xl font-bold text-amber-700">{formatCurrency(totalCost)}</p>
                  </div>
                  <div className={`rounded-xl p-4 border ${
                    overdueAppointments > 0
                      ? 'bg-gradient-to-br from-red-50 to-pink-50 border-red-100'
                      : upcomingAppointments > 0
                      ? 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-100'
                      : 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-100'
                  }`}>
                    <p className={`text-sm font-medium ${
                      overdueAppointments > 0 ? 'text-red-600' : upcomingAppointments > 0 ? 'text-orange-600' : 'text-green-600'
                    }`}>
                      {overdueAppointments > 0 ? 'Overdue' : upcomingAppointments > 0 ? 'Upcoming' : 'Appointments'}
                    </p>
                    <p className={`text-2xl font-bold ${
                      overdueAppointments > 0 ? 'text-red-700' : upcomingAppointments > 0 ? 'text-orange-700' : 'text-green-700'
                    }`}>
                      {overdueAppointments > 0 ? overdueAppointments : upcomingAppointments > 0 ? upcomingAppointments : 'All clear'}
                    </p>
                  </div>
                </div>
              )}

              {filteredRecords.length === 0 ? (
                <div className="text-center py-12">
                  <Smile className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">
                    {searchQuery ? 'No matching records' : 'No dental records yet'}
                  </h3>
                  <p className="text-gray-500 mb-6">
                    {searchQuery ? 'Try adjusting your search' : 'Add your first dental appointment to get started'}
                  </p>
                  {!searchQuery && (
                    <button
                      onClick={() => {
                        setNewRecord({ ...emptyRecord });
                        setShowAddForm(true);
                      }}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                      Add First Record
                    </button>
                  )}
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredRecords.map((record) => (
                    <div
                      key={record.id}
                      className="bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => setExpandedRecord(record.id)}
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-900">{record.patientName}</h3>
                            <p className="text-sm text-gray-500">{formatDateUK(record.date)}{record.time && ` ${record.time}`}</p>
                          </div>
                          <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getTypeColor(record.type)}`}>
                            {getTypeLabel(record.type)}
                          </span>
                        </div>

                        {record.description && (
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{record.description}</p>
                        )}

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">{record.surgeryName || 'No surgery'}</span>
                          <span className="font-medium text-teal-600">{formatCurrency(record.cost)}</span>
                        </div>

                        {record.nextAppointmentDate && (
                          <div className="mt-3 pt-3 border-t flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">Next: {formatDateUK(record.nextAppointmentDate)}</span>
                            {isDueSoon(record.nextAppointmentDate) && (
                              <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">Soon</span>
                            )}
                            {isPastDate(record.nextAppointmentDate) && (
                              <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs">Overdue</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredRecords.map((record) => (
                    <div
                      key={record.id}
                      className="bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow"
                    >
                      <div
                        className="p-4 flex items-center gap-4 cursor-pointer"
                        onClick={() => setExpandedRecord(record.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-semibold text-gray-900">{record.patientName}</h3>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(record.type)}`}>
                              {getTypeLabel(record.type)}
                            </span>
                            {record.nextAppointmentDate && isDueSoon(record.nextAppointmentDate) && (
                              <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium">Upcoming</span>
                            )}
                            {record.nextAppointmentDate && isPastDate(record.nextAppointmentDate) && (
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">Overdue</span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDateUK(record.date)}{record.time && ` ${record.time}`}
                            </span>
                            {record.surgeryName && (
                              <span className="flex items-center gap-1">
                                <Building className="w-3 h-3" />
                                {record.surgeryName}
                              </span>
                            )}
                            {record.practitionerName && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {record.practitionerName}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <p className="font-semibold text-teal-600">{formatCurrency(record.cost)}</p>
                          <p className="text-xs text-gray-500">{getPaymentLabel(record.paymentMethod)}</p>
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startEdit(record);
                            }}
                            className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteRecord(record.id);
                            }}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Add Form Modal */}
        {showAddForm && (
          <RecordForm
            record={newRecord}
            onFieldChange={handleNewRecordFieldChange}
            onSave={addRecord}
            onCancel={() => setShowAddForm(false)}
            onFileUpload={(file) => handleFileUpload(file, false)}
            onRemoveDocument={(idx) => removeDocument(idx, false)}
            isEditing={false}
            savedPatients={savedPatients}
            savedPractices={savedPractices}
          />
        )}

        {/* Edit Form Modal */}
        {editingRecord && (
          <RecordForm
            record={editingRecord}
            onFieldChange={handleEditRecordFieldChange}
            onSave={updateRecord}
            onCancel={() => setEditingRecord(null)}
            onFileUpload={(file) => handleFileUpload(file, true)}
            onRemoveDocument={(idx) => removeDocument(idx, true)}
            isEditing={true}
            savedPatients={savedPatients}
            savedPractices={savedPractices}
          />
        )}

        {/* View Modal */}
        {expandedRecordData && (
          <ViewModal
            record={expandedRecordData}
            onClose={() => setExpandedRecord(null)}
            onEdit={() => {
              setExpandedRecord(null);
              startEdit(expandedRecordData);
            }}
            onPrint={() => handlePrint(expandedRecordData)}
            onViewDocument={viewFile}
            onMarkComplete={() => {
              markNextAppointmentComplete(expandedRecordData.id);
              setExpandedRecord(null);
            }}
          />
        )}

        {/* Document Viewer */}
        {viewingDocument && (
          <div className="fixed inset-0 z-[70] bg-black/90 flex flex-col">
            <div className="bg-[#1a1a1a] text-white p-4 flex items-center justify-between flex-shrink-0">
              <h3 className="font-medium truncate max-w-md">{viewingDocument.docRef.filename}</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadFile(viewingDocument.docRef)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  title="Download"
                >
                  <Download className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    if (viewingDocument.blobUrl) URL.revokeObjectURL(viewingDocument.blobUrl);
                    setViewingDocument(null);
                  }}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              {viewingDocument.docRef.mimeType?.startsWith('image/') ? (
                <div className="h-full flex items-center justify-center p-4">
                  <img
                    src={viewingDocument.dataUrl}
                    alt={viewingDocument.docRef.filename}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              ) : viewingDocument.docRef.mimeType === 'application/pdf' ? (
                <PdfJsViewer url={viewingDocument.blobUrl} filename={viewingDocument.docRef.filename} />
              ) : (
                <div className="h-full flex items-center justify-center text-white">
                  <div className="text-center">
                    <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>Preview not available for this file type</p>
                    <button
                      onClick={() => downloadFile(viewingDocument.docRef)}
                      className="mt-4 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                    >
                      Download to view
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {loadingDocument && (
          <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center">
            <div className="bg-white rounded-xl p-6 flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600" />
              <span>Loading document...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
