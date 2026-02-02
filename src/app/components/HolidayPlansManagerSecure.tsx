import { useState, useEffect } from 'react';
import {
  Plane, Plus, Calendar, MapPin, Users, Hotel, Car, Train, Ship, Bus,
  Ticket, FileText, StickyNote, Clock, DollarSign, Hash, Upload, Edit2, X, Printer
} from 'lucide-react';
import { useStorage, useDocumentService } from '../../contexts/StorageContext';
import { PdfJsViewer } from './PdfJsViewer';
import { DocumentReference } from '../../services/document-service';
import {
  PanelHeader, RowActions, TypeBadge, DocumentChip, Card, SectionHeader,
  EmptyState, FormField, AddButton, SearchInput, DetailRow, ListRow
} from '../../components/ui/PanelParts';

// =============================================================================
// Types
// =============================================================================

interface Traveler {
  id: string;
  name: string;
  notes?: string;
}

interface Accommodation {
  id: string;
  name: string;
  address?: string;
  checkIn: string;
  checkOut: string;
  cost?: number;
  confirmationNumber?: string;
  notes?: string;
  documents?: DocumentReference[];
}

interface TravelLeg {
  id: string;
  type: 'outbound' | 'return' | 'internal';
  mode: 'flight' | 'train' | 'car' | 'bus' | 'ferry' | 'other';
  from: string;
  to: string;
  departureDate: string;
  departureTime?: string;
  arrivalDate?: string;
  arrivalTime?: string;
  carrier?: string;
  bookingReference?: string;
  cost?: number;
  notes?: string;
  documents?: DocumentReference[];
}

interface Activity {
  id: string;
  name: string;
  date?: string;
  time?: string;
  location?: string;
  cost?: number;
  bookingReference?: string;
  notes?: string;
  documents?: DocumentReference[];
}

interface HolidayPlan {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  travelers: Traveler[];
  accommodation: Accommodation[];
  travel: TravelLeg[];
  activities: Activity[];
  notes?: string;
  documents?: DocumentReference[];
}

interface HolidayPlansManagerSecureProps {
  onClose: () => void;
}

// =============================================================================
// Helpers
// =============================================================================

const formatDateUK = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatCurrency = (amount: number | undefined): string => {
  if (amount === undefined || amount === null) return '';
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
};

const getTravelIcon = (mode: TravelLeg['mode']) => {
  switch (mode) {
    case 'flight': return Plane;
    case 'train': return Train;
    case 'car': return Car;
    case 'bus': return Bus;
    case 'ferry': return Ship;
    default: return Car;
  }
};

const getTravelTypeColor = (type: TravelLeg['type']): 'green' | 'blue' | 'orange' => {
  switch (type) {
    case 'outbound': return 'green';
    case 'return': return 'blue';
    case 'internal': return 'orange';
  }
};

const emptyHoliday: Omit<HolidayPlan, 'id'> = {
  name: '',
  startDate: '',
  endDate: '',
  travelers: [],
  accommodation: [],
  travel: [],
  activities: [],
  notes: '',
  documents: []
};

// =============================================================================
// Component
// =============================================================================

export function HolidayPlansManagerSecure({ onClose }: HolidayPlansManagerSecureProps) {
  const storage = useStorage();
  const documentService = useDocumentService();

  // State
  const [holidays, setHolidays] = useState<HolidayPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<HolidayPlan | null>(null);
  const [viewingHoliday, setViewingHoliday] = useState<HolidayPlan | null>(null);
  const [newHoliday, setNewHoliday] = useState<Omit<HolidayPlan, 'id'>>(emptyHoliday);

  // Section visibility for viewing
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    travelers: true,
    accommodation: true,
    travel: true,
    activities: true,
    documents: true
  });

  // Document viewing
  const [viewingDocument, setViewingDocument] = useState<{ docRef: DocumentReference; dataUrl: string; blobUrl: string } | null>(null);

  // Sub-item editing
  const [editingTraveler, setEditingTraveler] = useState<Traveler | null>(null);
  const [editingAccommodation, setEditingAccommodation] = useState<Accommodation | null>(null);
  const [editingTravel, setEditingTravel] = useState<TravelLeg | null>(null);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  // =============================================================================
  // Data Loading
  // =============================================================================

  useEffect(() => {
    loadHolidays();
  }, []);

  const loadHolidays = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await storage.get<HolidayPlan>('holiday_plans');
      // Sort by start date, most recent first
      data.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
      setHolidays(data);
    } catch (err) {
      setError('Failed to load holiday plans');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // =============================================================================
  // CRUD Operations
  // =============================================================================

  const addHoliday = async () => {
    if (!newHoliday.name.trim() || !newHoliday.startDate || !newHoliday.endDate) {
      setError('Please provide a name and dates');
      return;
    }

    try {
      setError('');
      const holiday: HolidayPlan = {
        id: Date.now().toString(),
        ...newHoliday
      };
      await storage.add('holiday_plans', holiday);
      await loadHolidays();
      setNewHoliday(emptyHoliday);
      setShowAddForm(false);
    } catch (err) {
      setError('Failed to add holiday');
      console.error(err);
    }
  };

  const updateHoliday = async (holiday: HolidayPlan) => {
    try {
      setError('');
      await storage.update('holiday_plans', holiday.id, holiday);
      await loadHolidays();
      // Update viewing state if we're viewing this holiday
      if (viewingHoliday?.id === holiday.id) {
        setViewingHoliday(holiday);
      }
    } catch (err) {
      setError('Failed to update holiday');
      console.error(err);
    }
  };

  const deleteHoliday = async (id: string) => {
    if (!confirm('Delete this holiday plan? This cannot be undone.')) return;

    try {
      setError('');
      const holiday = holidays.find(h => h.id === id);

      // Delete all associated documents
      if (holiday) {
        const allDocs: DocumentReference[] = [
          ...(holiday.documents || []),
          ...holiday.accommodation.flatMap(a => a.documents || []),
          ...holiday.travel.flatMap(t => t.documents || []),
          ...holiday.activities.flatMap(a => a.documents || [])
        ];
        if (allDocs.length > 0) {
          await documentService.deleteDocuments('holiday_plans', allDocs);
        }
      }

      await storage.delete('holiday_plans', id);
      await loadHolidays();
      if (viewingHoliday?.id === id) setViewingHoliday(null);
    } catch (err) {
      setError('Failed to delete holiday');
      console.error(err);
    }
  };

  // =============================================================================
  // Document Handling
  // =============================================================================

  const handleFileUpload = async (
    file: File,
    holiday: HolidayPlan,
    target: 'holiday' | 'accommodation' | 'travel' | 'activity',
    targetId?: string
  ) => {
    try {
      setError('');
      const docRef = await documentService.saveDocument('holiday_plans', file);

      const updatedHoliday = { ...holiday };

      if (target === 'holiday') {
        updatedHoliday.documents = [...(updatedHoliday.documents || []), docRef];
      } else if (target === 'accommodation' && targetId) {
        const idx = updatedHoliday.accommodation.findIndex(a => a.id === targetId);
        if (idx >= 0) {
          updatedHoliday.accommodation[idx].documents = [
            ...(updatedHoliday.accommodation[idx].documents || []),
            docRef
          ];
        }
      } else if (target === 'travel' && targetId) {
        const idx = updatedHoliday.travel.findIndex(t => t.id === targetId);
        if (idx >= 0) {
          updatedHoliday.travel[idx].documents = [
            ...(updatedHoliday.travel[idx].documents || []),
            docRef
          ];
        }
      } else if (target === 'activity' && targetId) {
        const idx = updatedHoliday.activities.findIndex(a => a.id === targetId);
        if (idx >= 0) {
          updatedHoliday.activities[idx].documents = [
            ...(updatedHoliday.activities[idx].documents || []),
            docRef
          ];
        }
      }

      await updateHoliday(updatedHoliday);
    } catch (err) {
      setError('Failed to upload document');
      console.error(err);
    }
  };

  const viewDocument = async (docRef: DocumentReference) => {
    try {
      const dataUrl = await documentService.loadDocument('holiday_plans', docRef.storagePath);
      if (dataUrl) {
        // Convert to blob URL for large files
        const [header, base64] = dataUrl.split(',');
        const mimeType = header.match(/:(.*?);/)?.[1] || 'application/pdf';
        const binary = atob(base64);
        const array = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
        const blob = new Blob([array], { type: mimeType });
        const blobUrl = URL.createObjectURL(blob);
        setViewingDocument({ docRef, dataUrl, blobUrl });
      }
    } catch (err) {
      setError('Failed to load document');
      console.error(err);
    }
  };

  const downloadDocument = async (docRef: DocumentReference) => {
    try {
      const dataUrl = await documentService.loadDocument('holiday_plans', docRef.storagePath);
      if (dataUrl) {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = docRef.filename;
        link.click();
      }
    } catch (err) {
      setError('Failed to download document');
      console.error(err);
    }
  };

  // =============================================================================
  // Sub-item CRUD helpers
  // =============================================================================

  const addTraveler = (holiday: HolidayPlan, traveler: Omit<Traveler, 'id'>) => {
    const updated = {
      ...holiday,
      travelers: [...holiday.travelers, { ...traveler, id: Date.now().toString() }]
    };
    updateHoliday(updated);
  };

  const updateTraveler = (holiday: HolidayPlan, traveler: Traveler) => {
    const updated = {
      ...holiday,
      travelers: holiday.travelers.map(t => t.id === traveler.id ? traveler : t)
    };
    updateHoliday(updated);
  };

  const deleteTraveler = (holiday: HolidayPlan, travelerId: string) => {
    const updated = {
      ...holiday,
      travelers: holiday.travelers.filter(t => t.id !== travelerId)
    };
    updateHoliday(updated);
  };

  const addAccommodation = (holiday: HolidayPlan, acc: Omit<Accommodation, 'id'>) => {
    const updated = {
      ...holiday,
      accommodation: [...holiday.accommodation, { ...acc, id: Date.now().toString() }]
    };
    updateHoliday(updated);
  };

  const updateAccommodation = (holiday: HolidayPlan, acc: Accommodation) => {
    const updated = {
      ...holiday,
      accommodation: holiday.accommodation.map(a => a.id === acc.id ? acc : a)
    };
    updateHoliday(updated);
  };

  const deleteAccommodation = async (holiday: HolidayPlan, accId: string) => {
    const acc = holiday.accommodation.find(a => a.id === accId);
    if (acc?.documents?.length) {
      await documentService.deleteDocuments('holiday_plans', acc.documents);
    }
    const updated = {
      ...holiday,
      accommodation: holiday.accommodation.filter(a => a.id !== accId)
    };
    updateHoliday(updated);
  };

  const addTravel = (holiday: HolidayPlan, travel: Omit<TravelLeg, 'id'>) => {
    const updated = {
      ...holiday,
      travel: [...holiday.travel, { ...travel, id: Date.now().toString() }]
    };
    updateHoliday(updated);
  };

  const updateTravel = (holiday: HolidayPlan, travel: TravelLeg) => {
    const updated = {
      ...holiday,
      travel: holiday.travel.map(t => t.id === travel.id ? travel : t)
    };
    updateHoliday(updated);
  };

  const deleteTravel = async (holiday: HolidayPlan, travelId: string) => {
    const travel = holiday.travel.find(t => t.id === travelId);
    if (travel?.documents?.length) {
      await documentService.deleteDocuments('holiday_plans', travel.documents);
    }
    const updated = {
      ...holiday,
      travel: holiday.travel.filter(t => t.id !== travelId)
    };
    updateHoliday(updated);
  };

  const addActivity = (holiday: HolidayPlan, activity: Omit<Activity, 'id'>) => {
    const updated = {
      ...holiday,
      activities: [...holiday.activities, { ...activity, id: Date.now().toString() }]
    };
    updateHoliday(updated);
  };

  const updateActivity = (holiday: HolidayPlan, activity: Activity) => {
    const updated = {
      ...holiday,
      activities: holiday.activities.map(a => a.id === activity.id ? activity : a)
    };
    updateHoliday(updated);
  };

  const deleteActivity = async (holiday: HolidayPlan, activityId: string) => {
    const activity = holiday.activities.find(a => a.id === activityId);
    if (activity?.documents?.length) {
      await documentService.deleteDocuments('holiday_plans', activity.documents);
    }
    const updated = {
      ...holiday,
      activities: holiday.activities.filter(a => a.id !== activityId)
    };
    updateHoliday(updated);
  };

  const deleteHolidayDocument = async (holiday: HolidayPlan, docId: string) => {
    const doc = holiday.documents?.find(d => d.id === docId);
    if (doc) {
      await documentService.deleteDocuments('holiday_plans', [doc]);
    }
    const updated = {
      ...holiday,
      documents: (holiday.documents || []).filter(d => d.id !== docId)
    };
    updateHoliday(updated);
  };

  // =============================================================================
  // Filtering
  // =============================================================================

  const filteredHolidays = holidays.filter(h =>
    h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.travelers.some(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Calculate total cost for a holiday
  const calculateTotalCost = (holiday: HolidayPlan): number => {
    const accCost = holiday.accommodation.reduce((sum, a) => sum + (a.cost || 0), 0);
    const travelCost = holiday.travel.reduce((sum, t) => sum + (t.cost || 0), 0);
    const activityCost = holiday.activities.reduce((sum, a) => sum + (a.cost || 0), 0);
    return accCost + travelCost + activityCost;
  };

  // =============================================================================
  // Toggle section
  // =============================================================================

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // =============================================================================
  // Print summary
  // =============================================================================

  const printHolidaySummary = (holiday: HolidayPlan) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${holiday.name} - Trip Summary</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 10px; }
          h2 { color: #374151; margin-top: 24px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
          .dates { color: #6b7280; font-size: 14px; margin-bottom: 20px; }
          .section { margin-bottom: 24px; }
          .item { padding: 12px; background: #f9fafb; border-radius: 8px; margin-bottom: 8px; }
          .item-title { font-weight: bold; color: #111827; }
          .item-details { color: #6b7280; font-size: 13px; margin-top: 4px; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
          .badge-outbound { background: #dcfce7; color: #166534; }
          .badge-return { background: #dbeafe; color: #1e40af; }
          .badge-internal { background: #ffedd5; color: #c2410c; }
          .cost { color: #059669; font-weight: bold; }
          .total { font-size: 18px; color: #059669; font-weight: bold; margin-top: 20px; padding: 12px; background: #ecfdf5; border-radius: 8px; }
          .notes { font-style: italic; color: #6b7280; margin-top: 8px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>${holiday.name}</h1>
        <p class="dates">${formatDateUK(holiday.startDate)} - ${formatDateUK(holiday.endDate)}</p>

        ${holiday.travelers.length > 0 ? `
          <div class="section">
            <h2>Travelers</h2>
            ${holiday.travelers.map(t => `
              <div class="item">
                <div class="item-title">${t.name}</div>
                ${t.notes ? `<div class="notes">${t.notes}</div>` : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${holiday.travel.length > 0 ? `
          <div class="section">
            <h2>Travel</h2>
            ${holiday.travel.map(t => `
              <div class="item">
                <div class="item-title">
                  ${t.from} → ${t.to}
                  <span class="badge badge-${t.type}">${t.type}</span>
                </div>
                <div class="item-details">
                  ${formatDateUK(t.departureDate)}${t.departureTime ? ` at ${t.departureTime}` : ''}
                  ${t.carrier ? ` • ${t.carrier}` : ''}
                  ${t.bookingReference ? ` • Ref: ${t.bookingReference}` : ''}
                  ${t.cost ? ` • <span class="cost">${formatCurrency(t.cost)}</span>` : ''}
                </div>
                ${t.notes ? `<div class="notes">${t.notes}</div>` : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${holiday.accommodation.length > 0 ? `
          <div class="section">
            <h2>Accommodation</h2>
            ${holiday.accommodation.map(a => `
              <div class="item">
                <div class="item-title">${a.name}</div>
                <div class="item-details">
                  ${a.address ? `${a.address} • ` : ''}
                  ${formatDateUK(a.checkIn)} - ${formatDateUK(a.checkOut)}
                  ${a.confirmationNumber ? ` • Ref: ${a.confirmationNumber}` : ''}
                  ${a.cost ? ` • <span class="cost">${formatCurrency(a.cost)}</span>` : ''}
                </div>
                ${a.notes ? `<div class="notes">${a.notes}</div>` : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${holiday.activities.length > 0 ? `
          <div class="section">
            <h2>Things to Do</h2>
            ${holiday.activities.map(a => `
              <div class="item">
                <div class="item-title">${a.name}</div>
                <div class="item-details">
                  ${a.date ? formatDateUK(a.date) : ''}${a.time ? ` at ${a.time}` : ''}
                  ${a.location ? ` • ${a.location}` : ''}
                  ${a.bookingReference ? ` • Ref: ${a.bookingReference}` : ''}
                  ${a.cost ? ` • <span class="cost">${formatCurrency(a.cost)}</span>` : ''}
                </div>
                ${a.notes ? `<div class="notes">${a.notes}</div>` : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${holiday.notes ? `
          <div class="section">
            <h2>Notes</h2>
            <p>${holiday.notes}</p>
          </div>
        ` : ''}

        ${calculateTotalCost(holiday) > 0 ? `
          <div class="total">Total Cost: ${formatCurrency(calculateTotalCost(holiday))}</div>
        ` : ''}
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  // =============================================================================
  // Render
  // =============================================================================

  // Loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading holiday plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 overflow-hidden">
      <div className="absolute inset-2 bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
        <PanelHeader
          title="Holiday Plans"
          icon={Plane}
          onClose={onClose}
          actions={
            <AddButton onClick={() => setShowAddForm(true)}>
              <Plus className="w-4 h-4" />
              New Holiday
            </AddButton>
          }
        />

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Search - only show when there are holidays */}
        {holidays.length > 0 && (
          <div className="mb-6">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search holidays..."
            />
          </div>
        )}

        {/* Add Form */}
        {showAddForm && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">New Holiday Plan</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Holiday Name" required>
                <input
                  type="text"
                  value={newHoliday.name}
                  onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
                  placeholder="e.g., Italy Summer 2026"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Start Date" required>
                  <input
                    type="date"
                    value={newHoliday.startDate}
                    onChange={(e) => setNewHoliday({ ...newHoliday, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </FormField>
                <FormField label="End Date" required>
                  <input
                    type="date"
                    value={newHoliday.endDate}
                    onChange={(e) => setNewHoliday({ ...newHoliday, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </FormField>
              </div>
              <div className="md:col-span-2">
                <FormField label="Notes">
                  <textarea
                    value={newHoliday.notes || ''}
                    onChange={(e) => setNewHoliday({ ...newHoliday, notes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </FormField>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => { setShowAddForm(false); setNewHoliday(emptyHoliday); }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addHoliday}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Holiday
              </button>
            </div>
          </div>
        )}

        {/* Holiday List */}
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : filteredHolidays.length === 0 ? (
          <EmptyState
            icon={Plane}
            title="No holiday plans yet"
            description="Click 'New Holiday' above to start planning"
          />
        ) : (
          <div className="space-y-4">
            {filteredHolidays.map((holiday) => (
              <Card
                key={holiday.id}
                icon={Plane}
                iconColor="blue"
                title={holiday.name}
                badge={
                  <div className="flex items-center gap-2 mt-1">
                    <TypeBadge color="cyan">
                      {formatDateUK(holiday.startDate)} - {formatDateUK(holiday.endDate)}
                    </TypeBadge>
                    {holiday.travelers.length > 0 && (
                      <TypeBadge color="purple">
                        {holiday.travelers.length} traveler{holiday.travelers.length !== 1 ? 's' : ''}
                      </TypeBadge>
                    )}
                  </div>
                }
                actions={
                  <RowActions
                    onEdit={() => setViewingHoliday(holiday)}
                    onDelete={() => deleteHoliday(holiday.id)}
                  />
                }
                onClick={() => setViewingHoliday(holiday)}
              >
                <div className="mt-2 text-sm text-gray-600 space-y-1">
                  {holiday.accommodation.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Hotel className="w-4 h-4 text-gray-400" />
                      <span>{holiday.accommodation.length} accommodation{holiday.accommodation.length !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                  {holiday.travel.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Plane className="w-4 h-4 text-gray-400" />
                      <span>{holiday.travel.length} travel leg{holiday.travel.length !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                  {holiday.activities.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Ticket className="w-4 h-4 text-gray-400" />
                      <span>{holiday.activities.length} activit{holiday.activities.length !== 1 ? 'ies' : 'y'}</span>
                    </div>
                  )}
                  {calculateTotalCost(holiday) > 0 && (
                    <div className="flex items-center gap-2 font-medium text-green-600">
                      <DollarSign className="w-4 h-4" />
                      <span>Total: {formatCurrency(calculateTotalCost(holiday))}</span>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Holiday Management Modal - main screen for viewing/editing a holiday */}
        {viewingHoliday && (
          <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl my-8">
              {/* Header */}
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-t-xl">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-bold">{viewingHoliday.name}</h2>
                      <button
                        onClick={() => setEditingHoliday(viewingHoliday)}
                        className="p-1 hover:bg-white/20 rounded transition-colors"
                        title="Edit name, dates & notes"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => printHolidaySummary(viewingHoliday)}
                        className="p-1 hover:bg-white/20 rounded transition-colors"
                        title="Print summary"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-white/90">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {formatDateUK(viewingHoliday.startDate)} - {formatDateUK(viewingHoliday.endDate)}
                      </span>
                    </div>
                    {calculateTotalCost(viewingHoliday) > 0 && (
                      <div className="flex items-center gap-2 mt-1">
                        <DollarSign className="w-4 h-4" />
                        <span className="font-medium">
                          Total Cost: {formatCurrency(calculateTotalCost(viewingHoliday))}
                        </span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setViewingHoliday(null)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                {/* Travelers Section */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4">
                    <SectionHeader
                      title="Travelers"
                      icon={Users}
                      count={viewingHoliday.travelers.length}
                      isOpen={openSections.travelers}
                      onToggle={() => toggleSection('travelers')}
                      actions={
                        <button
                          onClick={() => setEditingTraveler({ id: '', name: '', notes: '' })}
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          + Add
                        </button>
                      }
                    />
                  </div>
                  {openSections.travelers && (
                    <div className="divide-y divide-gray-100">
                      {viewingHoliday.travelers.length === 0 ? (
                        <div className="p-4 text-gray-500 text-sm text-center">No travelers added</div>
                      ) : (
                        viewingHoliday.travelers.map((traveler) => (
                          <ListRow
                            key={traveler.id}
                            icon={Users}
                            iconColor="purple"
                            title={traveler.name}
                            subtitle={traveler.notes}
                            actions={
                              <RowActions
                                size="sm"
                                onEdit={() => setEditingTraveler(traveler)}
                                onDelete={() => deleteTraveler(viewingHoliday, traveler.id)}
                              />
                            }
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Travel Section */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4">
                    <SectionHeader
                      title="Travel"
                      icon={Plane}
                      count={viewingHoliday.travel.length}
                      isOpen={openSections.travel}
                      onToggle={() => toggleSection('travel')}
                      actions={
                        <button
                          onClick={() => setEditingTravel({
                            id: '', type: 'outbound', mode: 'flight', from: '', to: '',
                            departureDate: '', documents: []
                          })}
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          + Add
                        </button>
                      }
                    />
                  </div>
                  {openSections.travel && (
                    <div className="divide-y divide-gray-100">
                      {viewingHoliday.travel.length === 0 ? (
                        <div className="p-4 text-gray-500 text-sm text-center">No travel added</div>
                      ) : (
                        viewingHoliday.travel.map((travel) => {
                          const TravelIcon = getTravelIcon(travel.mode);
                          return (
                            <div key={travel.id} className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3">
                                  <div className={`p-2 rounded-lg ${
                                    travel.type === 'outbound' ? 'bg-green-50 text-green-600' :
                                    travel.type === 'return' ? 'bg-blue-50 text-blue-600' :
                                    'bg-orange-50 text-orange-600'
                                  }`}>
                                    <TravelIcon className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-medium text-gray-900">
                                        {travel.from} → {travel.to}
                                      </h4>
                                      <TypeBadge color={getTravelTypeColor(travel.type)}>
                                        {travel.type}
                                      </TypeBadge>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-600">
                                      <span className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {formatDateUK(travel.departureDate)}
                                        {travel.departureTime && ` at ${travel.departureTime}`}
                                      </span>
                                      {travel.carrier && (
                                        <span>{travel.carrier}</span>
                                      )}
                                      {travel.cost && (
                                        <span className="text-green-600 font-medium">
                                          {formatCurrency(travel.cost)}
                                        </span>
                                      )}
                                      {travel.bookingReference && (
                                        <span className="flex items-center gap-1">
                                          <Hash className="w-3 h-3" />
                                          {travel.bookingReference}
                                        </span>
                                      )}
                                    </div>
                                    {travel.notes && (
                                      <p className="text-sm text-gray-500 mt-2">{travel.notes}</p>
                                    )}
                                    {travel.documents && travel.documents.length > 0 && (
                                      <div className="flex flex-wrap gap-2 mt-2">
                                        {travel.documents.map((doc) => (
                                          <DocumentChip
                                            key={doc.id}
                                            filename={doc.filename}
                                            onClick={() => viewDocument(doc)}
                                          />
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <RowActions
                                  size="sm"
                                  onEdit={() => setEditingTravel(travel)}
                                  onDelete={() => deleteTravel(viewingHoliday, travel.id)}
                                />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* Accommodation Section */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4">
                    <SectionHeader
                      title="Accommodation"
                      icon={Hotel}
                      count={viewingHoliday.accommodation.length}
                      isOpen={openSections.accommodation}
                      onToggle={() => toggleSection('accommodation')}
                      actions={
                        <button
                          onClick={() => setEditingAccommodation({
                            id: '', name: '', checkIn: '', checkOut: '', documents: []
                          })}
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          + Add
                        </button>
                      }
                    />
                  </div>
                  {openSections.accommodation && (
                    <div className="divide-y divide-gray-100">
                      {viewingHoliday.accommodation.length === 0 ? (
                        <div className="p-4 text-gray-500 text-sm text-center">No accommodation added</div>
                      ) : (
                        viewingHoliday.accommodation.map((acc) => (
                          <div key={acc.id} className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900">{acc.name}</h4>
                                {acc.address && (
                                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                    <MapPin className="w-3 h-3" />
                                    {acc.address}
                                  </p>
                                )}
                                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-600">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {formatDateUK(acc.checkIn)} - {formatDateUK(acc.checkOut)}
                                  </span>
                                  {acc.cost && (
                                    <span className="text-green-600 font-medium">
                                      {formatCurrency(acc.cost)}
                                    </span>
                                  )}
                                  {acc.confirmationNumber && (
                                    <span className="flex items-center gap-1">
                                      <Hash className="w-3 h-3" />
                                      {acc.confirmationNumber}
                                    </span>
                                  )}
                                </div>
                                {acc.notes && (
                                  <p className="text-sm text-gray-500 mt-2">{acc.notes}</p>
                                )}
                                {acc.documents && acc.documents.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {acc.documents.map((doc) => (
                                      <DocumentChip
                                        key={doc.id}
                                        filename={doc.filename}
                                        onClick={() => viewDocument(doc)}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                              <RowActions
                                size="sm"
                                onEdit={() => setEditingAccommodation(acc)}
                                onDelete={() => deleteAccommodation(viewingHoliday, acc.id)}
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Activities Section */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4">
                    <SectionHeader
                      title="Things to Do"
                      icon={Ticket}
                      count={viewingHoliday.activities.length}
                      isOpen={openSections.activities}
                      onToggle={() => toggleSection('activities')}
                      actions={
                        <button
                          onClick={() => setEditingActivity({
                            id: '', name: '', documents: []
                          })}
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          + Add
                        </button>
                      }
                    />
                  </div>
                  {openSections.activities && (
                    <div className="divide-y divide-gray-100">
                      {viewingHoliday.activities.length === 0 ? (
                        <div className="p-4 text-gray-500 text-sm text-center">No activities added</div>
                      ) : (
                        viewingHoliday.activities.map((activity) => (
                          <div key={activity.id} className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900">{activity.name}</h4>
                                <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-600">
                                  {activity.date && (
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      {formatDateUK(activity.date)}
                                      {activity.time && ` at ${activity.time}`}
                                    </span>
                                  )}
                                  {activity.location && (
                                    <span className="flex items-center gap-1">
                                      <MapPin className="w-3 h-3" />
                                      {activity.location}
                                    </span>
                                  )}
                                  {activity.cost && (
                                    <span className="text-green-600 font-medium">
                                      {formatCurrency(activity.cost)}
                                    </span>
                                  )}
                                  {activity.bookingReference && (
                                    <span className="flex items-center gap-1">
                                      <Hash className="w-3 h-3" />
                                      {activity.bookingReference}
                                    </span>
                                  )}
                                </div>
                                {activity.notes && (
                                  <p className="text-sm text-gray-500 mt-2">{activity.notes}</p>
                                )}
                                {activity.documents && activity.documents.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {activity.documents.map((doc) => (
                                      <DocumentChip
                                        key={doc.id}
                                        filename={doc.filename}
                                        onClick={() => viewDocument(doc)}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                              <RowActions
                                size="sm"
                                onEdit={() => setEditingActivity(activity)}
                                onDelete={() => deleteActivity(viewingHoliday, activity.id)}
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* General Notes & Documents */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4">
                    <SectionHeader
                      title="Notes & Documents"
                      icon={StickyNote}
                      isOpen={openSections.documents}
                      onToggle={() => toggleSection('documents')}
                      actions={
                        <button
                          onClick={() => setEditingHoliday(viewingHoliday)}
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          Edit Notes
                        </button>
                      }
                    />
                  </div>
                  {openSections.documents && (
                    <div className="p-4">
                      {viewingHoliday.notes ? (
                        <p className="text-gray-700 whitespace-pre-wrap">{viewingHoliday.notes}</p>
                      ) : (
                        <p className="text-gray-400 text-sm italic">No notes added</p>
                      )}
                      <div className="mt-3">
                        {viewingHoliday.documents && viewingHoliday.documents.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {viewingHoliday.documents.map((doc) => (
                              <DocumentChip
                                key={doc.id}
                                filename={doc.filename}
                                onClick={() => viewDocument(doc)}
                                onDelete={() => deleteHolidayDocument(viewingHoliday, doc.id)}
                              />
                            ))}
                          </div>
                        )}
                        <label className="inline-flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-colors">
                          <Upload className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-600">Add document</span>
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(file, viewingHoliday, 'holiday');
                              e.target.value = '';
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-200 flex justify-end">
                <button
                  onClick={() => setViewingHoliday(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Holiday Modal */}
        {editingHoliday && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800">Edit Holiday</h2>
              </div>
              <div className="p-6 space-y-4">
                <FormField label="Holiday Name" required>
                  <input
                    type="text"
                    value={editingHoliday.name}
                    onChange={(e) => setEditingHoliday({ ...editingHoliday, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </FormField>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Start Date" required>
                    <input
                      type="date"
                      value={editingHoliday.startDate}
                      onChange={(e) => setEditingHoliday({ ...editingHoliday, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  </FormField>
                  <FormField label="End Date" required>
                    <input
                      type="date"
                      value={editingHoliday.endDate}
                      onChange={(e) => setEditingHoliday({ ...editingHoliday, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  </FormField>
                </div>
                <FormField label="Notes">
                  <textarea
                    value={editingHoliday.notes || ''}
                    onChange={(e) => setEditingHoliday({ ...editingHoliday, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </FormField>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Documents</label>
                  {editingHoliday.documents && editingHoliday.documents.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {editingHoliday.documents.map((doc) => (
                        <DocumentChip
                          key={doc.id}
                          filename={doc.filename}
                          onClick={() => viewDocument(doc)}
                          onDelete={() => {
                            setEditingHoliday({
                              ...editingHoliday,
                              documents: editingHoliday.documents?.filter(d => d.id !== doc.id)
                            });
                            documentService.deleteDocuments('holiday_plans', [doc]);
                          }}
                        />
                      ))}
                    </div>
                  )}
                  <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-colors">
                    <Upload className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Upload document</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, editingHoliday, 'holiday');
                        e.target.value = '';
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
              <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
                <button
                  onClick={() => setEditingHoliday(null)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    updateHoliday(editingHoliday);
                    setEditingHoliday(null);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Traveler Modal */}
        {editingTraveler && viewingHoliday && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800">
                  {editingTraveler.id ? 'Edit Traveler' : 'Add Traveler'}
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <FormField label="Name" required>
                  <input
                    type="text"
                    value={editingTraveler.name}
                    onChange={(e) => setEditingTraveler({ ...editingTraveler, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </FormField>
                <FormField label="Notes">
                  <textarea
                    value={editingTraveler.notes || ''}
                    onChange={(e) => setEditingTraveler({ ...editingTraveler, notes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </FormField>
              </div>
              <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
                <button
                  onClick={() => setEditingTraveler(null)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (editingTraveler.name.trim()) {
                      if (editingTraveler.id) {
                        updateTraveler(viewingHoliday, editingTraveler);
                      } else {
                        addTraveler(viewingHoliday, editingTraveler);
                      }
                      setEditingTraveler(null);
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingTraveler.id ? 'Save' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Accommodation Modal */}
        {editingAccommodation && viewingHoliday && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800">
                  {editingAccommodation.id ? 'Edit Accommodation' : 'Add Accommodation'}
                </h2>
              </div>
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                <FormField label="Name" required>
                  <input
                    type="text"
                    value={editingAccommodation.name}
                    onChange={(e) => setEditingAccommodation({ ...editingAccommodation, name: e.target.value })}
                    placeholder="e.g., Hotel Roma"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </FormField>
                <FormField label="Address">
                  <input
                    type="text"
                    value={editingAccommodation.address || ''}
                    onChange={(e) => setEditingAccommodation({ ...editingAccommodation, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </FormField>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Check In" required>
                    <input
                      type="date"
                      value={editingAccommodation.checkIn}
                      onChange={(e) => setEditingAccommodation({ ...editingAccommodation, checkIn: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  </FormField>
                  <FormField label="Check Out" required>
                    <input
                      type="date"
                      value={editingAccommodation.checkOut}
                      onChange={(e) => setEditingAccommodation({ ...editingAccommodation, checkOut: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  </FormField>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Cost (£)">
                    <input
                      type="number"
                      value={editingAccommodation.cost || ''}
                      onChange={(e) => setEditingAccommodation({ ...editingAccommodation, cost: e.target.value ? parseFloat(e.target.value) : undefined })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  </FormField>
                  <FormField label="Confirmation #">
                    <input
                      type="text"
                      value={editingAccommodation.confirmationNumber || ''}
                      onChange={(e) => setEditingAccommodation({ ...editingAccommodation, confirmationNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  </FormField>
                </div>
                <FormField label="Notes">
                  <textarea
                    value={editingAccommodation.notes || ''}
                    onChange={(e) => setEditingAccommodation({ ...editingAccommodation, notes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </FormField>
                {editingAccommodation.id && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Documents</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {editingAccommodation.documents?.map((doc) => (
                        <DocumentChip
                          key={doc.id}
                          filename={doc.filename}
                          onClick={() => viewDocument(doc)}
                        />
                      ))}
                    </div>
                    <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer w-fit">
                      <Upload className="w-4 h-4" />
                      Upload Document
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileUpload(file, viewingHoliday, 'accommodation', editingAccommodation.id);
                          }
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
                <button
                  onClick={() => setEditingAccommodation(null)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (editingAccommodation.name.trim() && editingAccommodation.checkIn && editingAccommodation.checkOut) {
                      if (editingAccommodation.id) {
                        updateAccommodation(viewingHoliday, editingAccommodation);
                      } else {
                        addAccommodation(viewingHoliday, editingAccommodation);
                      }
                      setEditingAccommodation(null);
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingAccommodation.id ? 'Save' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Travel Modal */}
        {editingTravel && viewingHoliday && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800">
                  {editingTravel.id ? 'Edit Travel' : 'Add Travel'}
                </h2>
              </div>
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Type" required>
                    <select
                      value={editingTravel.type}
                      onChange={(e) => setEditingTravel({ ...editingTravel, type: e.target.value as TravelLeg['type'] })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    >
                      <option value="outbound">Outbound</option>
                      <option value="return">Return</option>
                      <option value="internal">Internal</option>
                    </select>
                  </FormField>
                  <FormField label="Mode" required>
                    <select
                      value={editingTravel.mode}
                      onChange={(e) => setEditingTravel({ ...editingTravel, mode: e.target.value as TravelLeg['mode'] })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    >
                      <option value="flight">Flight</option>
                      <option value="train">Train</option>
                      <option value="car">Car</option>
                      <option value="bus">Bus</option>
                      <option value="ferry">Ferry</option>
                      <option value="other">Other</option>
                    </select>
                  </FormField>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="From" required>
                    <input
                      type="text"
                      value={editingTravel.from}
                      onChange={(e) => setEditingTravel({ ...editingTravel, from: e.target.value })}
                      placeholder="e.g., London Heathrow"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  </FormField>
                  <FormField label="To" required>
                    <input
                      type="text"
                      value={editingTravel.to}
                      onChange={(e) => setEditingTravel({ ...editingTravel, to: e.target.value })}
                      placeholder="e.g., Rome Fiumicino"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  </FormField>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Departure Date" required>
                    <input
                      type="date"
                      value={editingTravel.departureDate}
                      onChange={(e) => setEditingTravel({ ...editingTravel, departureDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  </FormField>
                  <FormField label="Departure Time">
                    <input
                      type="time"
                      value={editingTravel.departureTime || ''}
                      onChange={(e) => setEditingTravel({ ...editingTravel, departureTime: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  </FormField>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Carrier">
                    <input
                      type="text"
                      value={editingTravel.carrier || ''}
                      onChange={(e) => setEditingTravel({ ...editingTravel, carrier: e.target.value })}
                      placeholder="e.g., British Airways"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  </FormField>
                  <FormField label="Booking Reference">
                    <input
                      type="text"
                      value={editingTravel.bookingReference || ''}
                      onChange={(e) => setEditingTravel({ ...editingTravel, bookingReference: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  </FormField>
                </div>
                <FormField label="Cost (£)">
                  <input
                    type="number"
                    value={editingTravel.cost || ''}
                    onChange={(e) => setEditingTravel({ ...editingTravel, cost: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </FormField>
                <FormField label="Notes">
                  <textarea
                    value={editingTravel.notes || ''}
                    onChange={(e) => setEditingTravel({ ...editingTravel, notes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </FormField>
                {editingTravel.id && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Documents</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {editingTravel.documents?.map((doc) => (
                        <DocumentChip
                          key={doc.id}
                          filename={doc.filename}
                          onClick={() => viewDocument(doc)}
                        />
                      ))}
                    </div>
                    <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer w-fit">
                      <Upload className="w-4 h-4" />
                      Upload Document
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileUpload(file, viewingHoliday, 'travel', editingTravel.id);
                          }
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
                <button
                  onClick={() => setEditingTravel(null)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (editingTravel.from.trim() && editingTravel.to.trim() && editingTravel.departureDate) {
                      if (editingTravel.id) {
                        updateTravel(viewingHoliday, editingTravel);
                      } else {
                        addTravel(viewingHoliday, editingTravel);
                      }
                      setEditingTravel(null);
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingTravel.id ? 'Save' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Activity Modal */}
        {editingActivity && viewingHoliday && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800">
                  {editingActivity.id ? 'Edit Activity' : 'Add Activity'}
                </h2>
              </div>
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                <FormField label="Activity Name" required>
                  <input
                    type="text"
                    value={editingActivity.name}
                    onChange={(e) => setEditingActivity({ ...editingActivity, name: e.target.value })}
                    placeholder="e.g., Colosseum Tour"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </FormField>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Date">
                    <input
                      type="date"
                      value={editingActivity.date || ''}
                      onChange={(e) => setEditingActivity({ ...editingActivity, date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  </FormField>
                  <FormField label="Time">
                    <input
                      type="time"
                      value={editingActivity.time || ''}
                      onChange={(e) => setEditingActivity({ ...editingActivity, time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  </FormField>
                </div>
                <FormField label="Location">
                  <input
                    type="text"
                    value={editingActivity.location || ''}
                    onChange={(e) => setEditingActivity({ ...editingActivity, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </FormField>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Cost (£)">
                    <input
                      type="number"
                      value={editingActivity.cost || ''}
                      onChange={(e) => setEditingActivity({ ...editingActivity, cost: e.target.value ? parseFloat(e.target.value) : undefined })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  </FormField>
                  <FormField label="Booking Reference">
                    <input
                      type="text"
                      value={editingActivity.bookingReference || ''}
                      onChange={(e) => setEditingActivity({ ...editingActivity, bookingReference: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  </FormField>
                </div>
                <FormField label="Notes">
                  <textarea
                    value={editingActivity.notes || ''}
                    onChange={(e) => setEditingActivity({ ...editingActivity, notes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </FormField>
                {editingActivity.id && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Documents</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {editingActivity.documents?.map((doc) => (
                        <DocumentChip
                          key={doc.id}
                          filename={doc.filename}
                          onClick={() => viewDocument(doc)}
                        />
                      ))}
                    </div>
                    <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer w-fit">
                      <Upload className="w-4 h-4" />
                      Upload Document
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileUpload(file, viewingHoliday, 'activity', editingActivity.id);
                          }
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
                <button
                  onClick={() => setEditingActivity(null)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (editingActivity.name.trim()) {
                      if (editingActivity.id) {
                        updateActivity(viewingHoliday, editingActivity);
                      } else {
                        addActivity(viewingHoliday, editingActivity);
                      }
                      setEditingActivity(null);
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingActivity.id ? 'Save' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Document Viewer */}
        {viewingDocument && (
          <div className="fixed inset-0 bg-black/90 flex flex-col z-[70]">
            <div className="flex items-center justify-between p-4 bg-[#1a1a1a]">
              <span className="text-white font-medium">{viewingDocument.docRef.filename}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadDocument(viewingDocument.docRef)}
                  className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <FileText className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    URL.revokeObjectURL(viewingDocument.blobUrl);
                    setViewingDocument(null);
                  }}
                  className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto min-h-0">
              {viewingDocument.docRef.mimeType?.startsWith('image/') ? (
                <div className="flex items-center justify-center p-4 h-full">
                  <img
                    src={viewingDocument.dataUrl}
                    alt={viewingDocument.docRef.filename}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              ) : viewingDocument.docRef.mimeType === 'application/pdf' ? (
                <PdfJsViewer fileUrl={viewingDocument.blobUrl} />
              ) : (
                <div className="flex items-center justify-center h-full text-white">
                  <p>Preview not available for this file type</p>
                </div>
              )}
            </div>
          </div>
        )}
          </div>
        </div>
      </div>
    </div>
  );
}
