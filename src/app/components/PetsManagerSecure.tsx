import { useState, useEffect } from 'react';
import { X, Plus, Trash, PawPrint, Calendar, Edit2, FileText, Search, AlertCircle, Upload, Eye, EyeOff, Download, Syringe, Stethoscope, Shield, Heart, ChevronDown, ChevronUp, Printer, Grid3x3, List, CheckCircle } from 'lucide-react';
import { useStorage, useDocumentService, useDataVersion } from '../../contexts/StorageContext';
import { PdfJsViewer } from './PdfJsViewer';
import { DocumentReference } from '../../services/document-service';

// Types
interface Vaccination {
  id: string;
  name: string;
  dateGiven: string;
  nextDueDate?: string;
  vetName?: string;
  batchNumber?: string;
  notes?: string;
}

interface VetVisit {
  id: string;
  date: string;
  time?: string;
  reason: string;
  vetPractice?: string;
  vetName?: string;
  diagnosis?: string;
  treatment?: string;
  outcome?: string;
  cost: number;
  followUpDate?: string;
  notes?: string;
  documents?: DocumentReference[];
}

interface PetInsurance {
  provider?: string;
  policyNumber?: string;
  phone?: string;
  coverageType?: string;
  monthlyPremium?: number;
  excess?: number;
  renewalDate?: string;
  notes?: string;
  documents?: DocumentReference[];
}

interface Pet {
  id: string;
  // Basic info
  name: string;
  species: 'dog' | 'cat' | 'bird' | 'rabbit' | 'hamster' | 'fish' | 'reptile' | 'horse' | 'other';
  breed?: string;
  color?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'unknown';
  neutered?: boolean;
  microchipNumber?: string;
  passportNumber?: string;
  adoptionDate?: string;
  // Vet details
  vetPractice?: string;
  vetAddress?: string;
  vetPhone?: string;
  emergencyVetPhone?: string;
  // Health
  weight?: number;
  allergies?: string;
  medicalConditions?: string;
  currentMedications?: string;
  dietNotes?: string;
  // Records
  vaccinations: Vaccination[];
  vetVisits: VetVisit[];
  insurance?: PetInsurance;
  // Documents & Notes
  documents?: DocumentReference[];
  notes?: string;
}

interface PetsManagerSecureProps {
  onClose: () => void;
}

const emptyPet: Omit<Pet, 'id'> = {
  name: '',
  species: 'dog',
  breed: '',
  color: '',
  dateOfBirth: '',
  gender: 'unknown',
  neutered: false,
  microchipNumber: '',
  passportNumber: '',
  adoptionDate: '',
  vetPractice: '',
  vetAddress: '',
  vetPhone: '',
  emergencyVetPhone: '',
  weight: undefined,
  allergies: '',
  medicalConditions: '',
  currentMedications: '',
  dietNotes: '',
  vaccinations: [],
  vetVisits: [],
  insurance: {},
  documents: [],
  notes: ''
};

const emptyVaccination: Omit<Vaccination, 'id'> = {
  name: '',
  dateGiven: '',
  nextDueDate: '',
  vetName: '',
  batchNumber: '',
  notes: ''
};

const emptyVetVisit: Omit<VetVisit, 'id'> = {
  date: '',
  time: '',
  reason: '',
  vetPractice: '',
  vetName: '',
  diagnosis: '',
  treatment: '',
  outcome: '',
  cost: 0,
  followUpDate: '',
  notes: '',
  documents: []
};

// Utility functions
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

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2
  }).format(amount);
};

const getSpeciesLabel = (species: string): string => {
  const labels: Record<string, string> = {
    dog: 'Dog', cat: 'Cat', bird: 'Bird', rabbit: 'Rabbit',
    hamster: 'Hamster', fish: 'Fish', reptile: 'Reptile', horse: 'Horse', other: 'Other'
  };
  return labels[species] || species;
};

const getSpeciesEmoji = (species: string): string => {
  const emojis: Record<string, string> = {
    dog: '🐕', cat: '🐱', bird: '🐦', rabbit: '🐰',
    hamster: '🐹', fish: '🐟', reptile: '🦎', horse: '🐴', other: '🐾'
  };
  return emojis[species] || '🐾';
};

// Pet Form Component
interface PetFormProps {
  pet: Omit<Pet, 'id'> | Pet;
  onFieldChange: (field: string, value: any) => void;
  onSave: () => void;
  onCancel: () => void;
  onFileUpload: (file: File) => void;
  onRemoveDocument: (index: number) => void;
  onInsuranceFileUpload: (file: File) => void;
  onRemoveInsuranceDocument: (index: number) => void;
  isEditing: boolean;
}

function PetForm({ pet, onFieldChange, onSave, onCancel, onFileUpload, onRemoveDocument, onInsuranceFileUpload, onRemoveInsuranceDocument, isEditing }: PetFormProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'health' | 'vet' | 'insurance'>('basic');

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="bg-gradient-to-r from-amber-500 to-amber-700 text-white p-6 rounded-t-2xl sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <PawPrint className="w-6 h-6" />
              {isEditing ? `Edit ${pet.name || 'Pet'}` : 'Add New Pet'}
            </h2>
            <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* Tabs */}
          <div className="flex gap-2 mt-4">
            {(['basic', 'health', 'vet', 'insurance'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab ? 'bg-white text-amber-600' : 'bg-white/20 hover:bg-white/30'
                }`}
              >
                {tab === 'basic' ? 'Basic Info' : tab === 'health' ? 'Health' : tab === 'vet' ? 'Vet Details' : 'Insurance'}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pet Name *</label>
                  <input
                    type="text"
                    value={pet.name}
                    onChange={(e) => onFieldChange('name', e.target.value)}
                    placeholder="e.g., Max, Bella"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Species *</label>
                  <select
                    value={pet.species}
                    onChange={(e) => onFieldChange('species', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="dog">Dog</option>
                    <option value="cat">Cat</option>
                    <option value="bird">Bird</option>
                    <option value="rabbit">Rabbit</option>
                    <option value="hamster">Hamster</option>
                    <option value="fish">Fish</option>
                    <option value="reptile">Reptile</option>
                    <option value="horse">Horse</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Breed</label>
                  <input
                    type="text"
                    value={pet.breed || ''}
                    onChange={(e) => onFieldChange('breed', e.target.value)}
                    placeholder="e.g., Labrador, Persian"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color/Markings</label>
                  <input
                    type="text"
                    value={pet.color || ''}
                    onChange={(e) => onFieldChange('color', e.target.value)}
                    placeholder="e.g., Golden, Black & White"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={pet.dateOfBirth || ''}
                    onChange={(e) => onFieldChange('dateOfBirth', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select
                    value={pet.gender || 'unknown'}
                    onChange={(e) => onFieldChange('gender', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adoption/Acquisition Date</label>
                  <input
                    type="date"
                    value={pet.adoptionDate || ''}
                    onChange={(e) => onFieldChange('adoptionDate', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pet.neutered || false}
                      onChange={(e) => onFieldChange('neutered', e.target.checked)}
                      className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Neutered/Spayed</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Microchip Number</label>
                  <input
                    type="text"
                    value={pet.microchipNumber || ''}
                    onChange={(e) => onFieldChange('microchipNumber', e.target.value)}
                    placeholder="15-digit microchip number"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pet Passport Number</label>
                  <input
                    type="text"
                    value={pet.passportNumber || ''}
                    onChange={(e) => onFieldChange('passportNumber', e.target.value)}
                    placeholder="For international travel"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={pet.notes || ''}
                  onChange={(e) => onFieldChange('notes', e.target.value)}
                  placeholder="Any additional notes about your pet..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
            </div>
          )}

          {/* Health Tab */}
          {activeTab === 'health' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={pet.weight ?? ''}
                    onChange={(e) => onFieldChange('weight', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                    placeholder="Current weight"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Allergies</label>
                <textarea
                  value={pet.allergies || ''}
                  onChange={(e) => onFieldChange('allergies', e.target.value)}
                  placeholder="Known allergies..."
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Medical Conditions</label>
                <textarea
                  value={pet.medicalConditions || ''}
                  onChange={(e) => onFieldChange('medicalConditions', e.target.value)}
                  placeholder="Ongoing medical conditions..."
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Medications</label>
                <textarea
                  value={pet.currentMedications || ''}
                  onChange={(e) => onFieldChange('currentMedications', e.target.value)}
                  placeholder="Current medications and dosages..."
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Diet & Feeding Notes</label>
                <textarea
                  value={pet.dietNotes || ''}
                  onChange={(e) => onFieldChange('dietNotes', e.target.value)}
                  placeholder="Food brand, feeding schedule, dietary requirements..."
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
            </div>
          )}

          {/* Vet Details Tab */}
          {activeTab === 'vet' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vet Practice Name</label>
                  <input
                    type="text"
                    value={pet.vetPractice || ''}
                    onChange={(e) => onFieldChange('vetPractice', e.target.value)}
                    placeholder="e.g., Valley Vets"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={pet.vetPhone || ''}
                    onChange={(e) => onFieldChange('vetPhone', e.target.value)}
                    placeholder="Vet phone number"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={pet.vetAddress || ''}
                  onChange={(e) => onFieldChange('vetAddress', e.target.value)}
                  placeholder="Vet practice address"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Vet Phone</label>
                <input
                  type="tel"
                  value={pet.emergencyVetPhone || ''}
                  onChange={(e) => onFieldChange('emergencyVetPhone', e.target.value)}
                  placeholder="24-hour emergency vet number"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              {/* Documents */}
              <div className="pt-4 border-t">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Documents</h3>
                {(pet.documents || []).length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {(pet.documents || []).map((doc, idx) => (
                      <div key={idx} className="flex items-center gap-1 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-sm">
                        <FileText className="w-3 h-3" />
                        <span className="truncate max-w-[150px]">{doc.filename}</span>
                        <button onClick={() => onRemoveDocument(idx)} className="p-1 hover:bg-amber-200 rounded transition-colors">
                          <Trash className="w-3 h-3 text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <label className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-amber-400 cursor-pointer transition-colors w-fit">
                  <Upload className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Upload document</span>
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
            </div>
          )}

          {/* Insurance Tab */}
          {activeTab === 'insurance' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Insurance Provider</label>
                  <input
                    type="text"
                    value={pet.insurance?.provider || ''}
                    onChange={(e) => onFieldChange('insurance', { ...pet.insurance, provider: e.target.value })}
                    placeholder="e.g., PetPlan, More Than"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Policy Number</label>
                  <input
                    type="text"
                    value={pet.insurance?.policyNumber || ''}
                    onChange={(e) => onFieldChange('insurance', { ...pet.insurance, policyNumber: e.target.value })}
                    placeholder="Policy number"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={pet.insurance?.phone || ''}
                    onChange={(e) => onFieldChange('insurance', { ...pet.insurance, phone: e.target.value })}
                    placeholder="Claims phone number"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Coverage Type</label>
                  <input
                    type="text"
                    value={pet.insurance?.coverageType || ''}
                    onChange={(e) => onFieldChange('insurance', { ...pet.insurance, coverageType: e.target.value })}
                    placeholder="e.g., Lifetime, Annual"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Premium (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={pet.insurance?.monthlyPremium ?? ''}
                    onChange={(e) => onFieldChange('insurance', { ...pet.insurance, monthlyPremium: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
                    placeholder="0.00"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Excess (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={pet.insurance?.excess ?? ''}
                    onChange={(e) => onFieldChange('insurance', { ...pet.insurance, excess: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
                    placeholder="0.00"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Renewal Date</label>
                  <input
                    type="date"
                    value={pet.insurance?.renewalDate || ''}
                    onChange={(e) => onFieldChange('insurance', { ...pet.insurance, renewalDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={pet.insurance?.notes || ''}
                  onChange={(e) => onFieldChange('insurance', { ...pet.insurance, notes: e.target.value })}
                  placeholder="Coverage details, exclusions..."
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              {/* Insurance Documents */}
              <div className="pt-4 border-t">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Documents</h3>
                {(pet.insurance?.documents || []).length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {(pet.insurance?.documents || []).map((doc, idx) => (
                      <div key={idx} className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm">
                        <FileText className="w-3 h-3" />
                        <span className="truncate max-w-[150px]">{doc.filename}</span>
                        <button onClick={() => onRemoveInsuranceDocument(idx)} className="p-1 hover:bg-green-200 rounded transition-colors">
                          <Trash className="w-3 h-3 text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <label className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-400 cursor-pointer transition-colors w-fit">
                  <Upload className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Upload policy document</span>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onInsuranceFileUpload(file);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6 mt-6 border-t">
            <button onClick={onCancel} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              Cancel
            </button>
            <button onClick={onSave} className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors">
              {isEditing ? 'Save Changes' : 'Add Pet'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Vaccination Form Component
interface VaccinationFormProps {
  vaccination: Omit<Vaccination, 'id'> | Vaccination;
  onFieldChange: (field: string, value: any) => void;
  onSave: () => void;
  onCancel: () => void;
  isEditing: boolean;
}

function VaccinationForm({ vaccination, onFieldChange, onSave, onCancel, isEditing }: VaccinationFormProps) {
  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl">
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Syringe className="w-5 h-5" />
              {isEditing ? 'Edit Vaccination' : 'Add Vaccination'}
            </h3>
            <button onClick={onCancel} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vaccination Name *</label>
            <input
              type="text"
              value={vaccination.name}
              onChange={(e) => onFieldChange('name', e.target.value)}
              placeholder="e.g., Rabies, Distemper, Flea Treatment"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Given *</label>
              <input
                type="date"
                value={vaccination.dateGiven}
                onChange={(e) => onFieldChange('dateGiven', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Next Due Date</label>
              <input
                type="date"
                value={vaccination.nextDueDate || ''}
                onChange={(e) => onFieldChange('nextDueDate', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vet Name</label>
              <input
                type="text"
                value={vaccination.vetName || ''}
                onChange={(e) => onFieldChange('vetName', e.target.value)}
                placeholder="Administering vet"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Batch Number</label>
              <input
                type="text"
                value={vaccination.batchNumber || ''}
                onChange={(e) => onFieldChange('batchNumber', e.target.value)}
                placeholder="Vaccine batch #"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <input
              type="text"
              value={vaccination.notes || ''}
              onChange={(e) => onFieldChange('notes', e.target.value)}
              placeholder="Any reactions, notes..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button onClick={onCancel} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              Cancel
            </button>
            <button onClick={onSave} className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
              {isEditing ? 'Save' : 'Add'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Vet Visit Form Component
interface VetVisitFormProps {
  visit: Omit<VetVisit, 'id'> | VetVisit;
  onFieldChange: (field: string, value: any) => void;
  onSave: () => void;
  onCancel: () => void;
  onFileUpload: (file: File) => void;
  onRemoveDocument: (index: number) => void;
  isEditing: boolean;
}

function VetVisitForm({ visit, onFieldChange, onSave, onCancel, onFileUpload, onRemoveDocument, isEditing }: VetVisitFormProps) {
  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white p-4 rounded-t-2xl sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Stethoscope className="w-5 h-5" />
              {isEditing ? 'Edit Vet Visit' : 'Add Vet Visit'}
            </h3>
            <button onClick={onCancel} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input
                type="date"
                value={visit.date}
                onChange={(e) => onFieldChange('date', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
              <input
                type="time"
                value={visit.time || ''}
                onChange={(e) => onFieldChange('time', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Visit *</label>
            <input
              type="text"
              value={visit.reason}
              onChange={(e) => onFieldChange('reason', e.target.value)}
              placeholder="e.g., Annual checkup, Limping, Vaccination"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vet Practice</label>
              <input
                type="text"
                value={visit.vetPractice || ''}
                onChange={(e) => onFieldChange('vetPractice', e.target.value)}
                placeholder="Practice name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vet Name</label>
              <input
                type="text"
                value={visit.vetName || ''}
                onChange={(e) => onFieldChange('vetName', e.target.value)}
                placeholder="Treating vet"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis</label>
            <input
              type="text"
              value={visit.diagnosis || ''}
              onChange={(e) => onFieldChange('diagnosis', e.target.value)}
              placeholder="What was diagnosed"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Treatment</label>
            <textarea
              value={visit.treatment || ''}
              onChange={(e) => onFieldChange('treatment', e.target.value)}
              placeholder="Treatment provided..."
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Outcome</label>
              <input
                type="text"
                value={visit.outcome || ''}
                onChange={(e) => onFieldChange('outcome', e.target.value)}
                placeholder="e.g., Recovered, Ongoing"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cost (£)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={visit.cost ?? ''}
                onChange={(e) => onFieldChange('cost', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                placeholder="0.00"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Follow-up Date</label>
            <input
              type="date"
              value={visit.followUpDate || ''}
              onChange={(e) => onFieldChange('followUpDate', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={visit.notes || ''}
              onChange={(e) => onFieldChange('notes', e.target.value)}
              placeholder="Additional notes..."
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Documents */}
          <div className="pt-4 border-t">
            <label className="block text-sm font-medium text-gray-700 mb-2">Documents</label>
            {(visit.documents || []).length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {(visit.documents || []).map((doc, idx) => (
                  <div key={idx} className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm">
                    <FileText className="w-3 h-3" />
                    <span className="truncate max-w-[150px]">{doc.filename}</span>
                    <button onClick={() => onRemoveDocument(idx)} className="p-1 hover:bg-blue-200 rounded transition-colors">
                      <Trash className="w-3 h-3 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <label className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 cursor-pointer transition-colors w-fit">
              <Upload className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">Upload invoice or notes</span>
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

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button onClick={onCancel} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              Cancel
            </button>
            <button onClick={onSave} className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
              {isEditing ? 'Save' : 'Add Visit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Component
export function PetsManagerSecure({ onClose }: PetsManagerSecureProps) {
  const storage = useStorage();
  const documentService = useDocumentService();
  const { notifyDataChange } = useDataVersion();
  const [pets, setPets] = useState<Pet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSummary, setShowSummary] = useState(true);

  // Pet form state
  const [showAddPet, setShowAddPet] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [newPet, setNewPet] = useState<Omit<Pet, 'id'>>({ ...emptyPet });

  // Selected pet view
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<'vaccinations' | 'visits' | null>('vaccinations');

  // Vaccination form state
  const [showAddVaccination, setShowAddVaccination] = useState(false);
  const [editingVaccination, setEditingVaccination] = useState<{ petId: string; vaccination: Vaccination } | null>(null);
  const [newVaccination, setNewVaccination] = useState<Omit<Vaccination, 'id'>>({ ...emptyVaccination });

  // Vet visit form state
  const [showAddVisit, setShowAddVisit] = useState(false);
  const [editingVisit, setEditingVisit] = useState<{ petId: string; visit: VetVisit } | null>(null);
  const [newVisit, setNewVisit] = useState<Omit<VetVisit, 'id'>>({ ...emptyVetVisit });

  // Document viewer
  const [viewingDocument, setViewingDocument] = useState<{ docRef: DocumentReference; dataUrl: string; blobUrl: string } | null>(null);
  const [loadingDocument, setLoadingDocument] = useState(false);

  useEffect(() => {
    loadPets();
  }, []);

  const loadPets = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await storage.get<Pet>('pets');
      setPets(data);
    } catch (err) {
      setError(`Failed to load pets: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Pet CRUD
  const handleNewPetFieldChange = (field: string, value: any) => {
    setNewPet(prev => ({ ...prev, [field]: value }));
  };

  const handleEditPetFieldChange = (field: string, value: any) => {
    if (editingPet) {
      setEditingPet(prev => prev ? { ...prev, [field]: value } : null);
    }
  };

  const addPet = async () => {
    if (!newPet.name.trim()) {
      setError('Pet name is required');
      return;
    }
    try {
      setError('');
      const pet: Pet = { id: Date.now().toString(), ...newPet };
      await storage.add('pets', pet);
      await loadPets();
      notifyDataChange();
      setNewPet({ ...emptyPet });
      setShowAddPet(false);
    } catch (err) {
      setError('Failed to add pet');
    }
  };

  const updatePet = async () => {
    if (!editingPet || !editingPet.name.trim()) {
      setError('Pet name is required');
      return;
    }
    try {
      setError('');
      await storage.update('pets', editingPet.id, editingPet);
      await loadPets();
      notifyDataChange();
      setEditingPet(null);
    } catch (err) {
      setError('Failed to update pet');
    }
  };

  const deletePet = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pet and all their records?')) return;
    try {
      setError('');
      const pet = pets.find(p => p.id === id);
      if (pet?.documents?.length) {
        await documentService.deleteDocuments('pets', pet.documents);
      }
      // Delete visit documents too
      for (const visit of pet?.vetVisits || []) {
        if (visit.documents?.length) {
          await documentService.deleteDocuments('pets', visit.documents);
        }
      }
      await storage.delete('pets', id);
      await loadPets();
      notifyDataChange();
      if (selectedPetId === id) setSelectedPetId(null);
    } catch (err) {
      setError('Failed to delete pet');
    }
  };

  // Vaccination CRUD
  const handleNewVaccinationFieldChange = (field: string, value: any) => {
    setNewVaccination(prev => ({ ...prev, [field]: value }));
  };

  const handleEditVaccinationFieldChange = (field: string, value: any) => {
    if (editingVaccination) {
      setEditingVaccination(prev => prev ? { ...prev, vaccination: { ...prev.vaccination, [field]: value } } : null);
    }
  };

  const addVaccination = async () => {
    if (!selectedPetId || !newVaccination.name.trim() || !newVaccination.dateGiven) {
      setError('Vaccination name and date are required');
      return;
    }
    try {
      setError('');
      const pet = pets.find(p => p.id === selectedPetId);
      if (!pet) return;
      const vaccination: Vaccination = { id: Date.now().toString(), ...newVaccination };
      const updatedPet = { ...pet, vaccinations: [...pet.vaccinations, vaccination] };
      await storage.update('pets', pet.id, updatedPet);
      await loadPets();
      notifyDataChange();
      setNewVaccination({ ...emptyVaccination });
      setShowAddVaccination(false);
    } catch (err) {
      setError('Failed to add vaccination');
    }
  };

  const updateVaccination = async () => {
    if (!editingVaccination) return;
    try {
      setError('');
      const pet = pets.find(p => p.id === editingVaccination.petId);
      if (!pet) return;
      const updatedVaccinations = pet.vaccinations.map(v =>
        v.id === editingVaccination.vaccination.id ? editingVaccination.vaccination : v
      );
      await storage.update('pets', pet.id, { ...pet, vaccinations: updatedVaccinations });
      await loadPets();
      notifyDataChange();
      setEditingVaccination(null);
    } catch (err) {
      setError('Failed to update vaccination');
    }
  };

  const deleteVaccination = async (petId: string, vaccinationId: string) => {
    if (!confirm('Delete this vaccination record?')) return;
    try {
      setError('');
      const pet = pets.find(p => p.id === petId);
      if (!pet) return;
      const updatedVaccinations = pet.vaccinations.filter(v => v.id !== vaccinationId);
      await storage.update('pets', pet.id, { ...pet, vaccinations: updatedVaccinations });
      await loadPets();
      notifyDataChange();
    } catch (err) {
      setError('Failed to delete vaccination');
    }
  };

  // Vet Visit CRUD
  const handleNewVisitFieldChange = (field: string, value: any) => {
    setNewVisit(prev => ({ ...prev, [field]: value }));
  };

  const handleEditVisitFieldChange = (field: string, value: any) => {
    if (editingVisit) {
      setEditingVisit(prev => prev ? { ...prev, visit: { ...prev.visit, [field]: value } } : null);
    }
  };

  const addVisit = async () => {
    if (!selectedPetId || !newVisit.date || !newVisit.reason.trim()) {
      setError('Date and reason are required');
      return;
    }
    try {
      setError('');
      const pet = pets.find(p => p.id === selectedPetId);
      if (!pet) return;
      const visit: VetVisit = { id: Date.now().toString(), ...newVisit };
      const updatedPet = { ...pet, vetVisits: [...pet.vetVisits, visit] };
      await storage.update('pets', pet.id, updatedPet);
      await loadPets();
      notifyDataChange();
      setNewVisit({ ...emptyVetVisit });
      setShowAddVisit(false);
    } catch (err) {
      setError('Failed to add vet visit');
    }
  };

  const updateVisit = async () => {
    if (!editingVisit) return;
    try {
      setError('');
      const pet = pets.find(p => p.id === editingVisit.petId);
      if (!pet) return;
      const updatedVisits = pet.vetVisits.map(v =>
        v.id === editingVisit.visit.id ? editingVisit.visit : v
      );
      await storage.update('pets', pet.id, { ...pet, vetVisits: updatedVisits });
      await loadPets();
      notifyDataChange();
      setEditingVisit(null);
    } catch (err) {
      setError('Failed to update vet visit');
    }
  };

  const deleteVisit = async (petId: string, visitId: string) => {
    if (!confirm('Delete this vet visit record?')) return;
    try {
      setError('');
      const pet = pets.find(p => p.id === petId);
      if (!pet) return;
      const visit = pet.vetVisits.find(v => v.id === visitId);
      if (visit?.documents?.length) {
        await documentService.deleteDocuments('pets', visit.documents);
      }
      const updatedVisits = pet.vetVisits.filter(v => v.id !== visitId);
      await storage.update('pets', pet.id, { ...pet, vetVisits: updatedVisits });
      await loadPets();
      notifyDataChange();
    } catch (err) {
      setError('Failed to delete vet visit');
    }
  };

  const markFollowUpComplete = async (petId: string, visitId: string) => {
    try {
      setError('');
      const pet = pets.find(p => p.id === petId);
      if (!pet) return;
      const updatedVisits = pet.vetVisits.map(v =>
        v.id === visitId ? { ...v, followUpDate: '' } : v
      );
      await storage.update('pets', pet.id, { ...pet, vetVisits: updatedVisits });
      await loadPets();
      notifyDataChange();
    } catch (err) {
      setError('Failed to mark follow-up complete');
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
    return URL.createObjectURL(new Blob([bytes], { type: mimeType }));
  };

  const viewFile = async (docRef: DocumentReference) => {
    if (viewingDocument?.blobUrl) URL.revokeObjectURL(viewingDocument.blobUrl);
    try {
      setLoadingDocument(true);
      setError('');
      const dataUrl = await documentService.loadDocument('pets', docRef);
      const blobUrl = dataUrlToBlobUrl(dataUrl);
      setViewingDocument({ docRef, dataUrl, blobUrl });
    } catch (err) {
      setError(`Failed to load document: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoadingDocument(false);
    }
  };

  const downloadFile = async (docRef: DocumentReference) => {
    try {
      const dataUrl = await documentService.loadDocument('pets', docRef);
      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) return;
      const binaryString = atob(match[2]);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
      const blob = new Blob([bytes], { type: match[1] });
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

  const handlePetFileUpload = async (file: File, isEditing: boolean) => {
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const docRef = await documentService.saveDocument('pets', file.name, reader.result as string, new Date().toISOString());
        if (isEditing && editingPet) {
          setEditingPet(prev => prev ? { ...prev, documents: [...(prev.documents || []), docRef] } : null);
        } else {
          setNewPet(prev => ({ ...prev, documents: [...(prev.documents || []), docRef] }));
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Failed to upload document');
    }
  };

  const removePetDocument = async (index: number, isEditing: boolean) => {
    try {
      if (isEditing && editingPet) {
        const docs = [...(editingPet.documents || [])];
        if (docs[index]) await documentService.deleteDocument('pets', docs[index]);
        docs.splice(index, 1);
        setEditingPet(prev => prev ? { ...prev, documents: docs } : null);
      } else {
        const docs = [...(newPet.documents || [])];
        if (docs[index]) await documentService.deleteDocument('pets', docs[index]);
        docs.splice(index, 1);
        setNewPet(prev => ({ ...prev, documents: docs }));
      }
    } catch (err) {
      setError('Failed to remove document');
    }
  };

  const handleInsuranceFileUpload = async (file: File, isEditing: boolean) => {
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const docRef = await documentService.saveDocument('pets', file.name, reader.result as string, new Date().toISOString());
        if (isEditing && editingPet) {
          setEditingPet(prev => prev ? {
            ...prev,
            insurance: { ...prev.insurance, documents: [...(prev.insurance?.documents || []), docRef] }
          } : null);
        } else {
          setNewPet(prev => ({
            ...prev,
            insurance: { ...prev.insurance, documents: [...(prev.insurance?.documents || []), docRef] }
          }));
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Failed to upload document');
    }
  };

  const removeInsuranceDocument = async (index: number, isEditing: boolean) => {
    try {
      if (isEditing && editingPet) {
        const docs = [...(editingPet.insurance?.documents || [])];
        if (docs[index]) await documentService.deleteDocument('pets', docs[index]);
        docs.splice(index, 1);
        setEditingPet(prev => prev ? { ...prev, insurance: { ...prev.insurance, documents: docs } } : null);
      } else {
        const docs = [...(newPet.insurance?.documents || [])];
        if (docs[index]) await documentService.deleteDocument('pets', docs[index]);
        docs.splice(index, 1);
        setNewPet(prev => ({ ...prev, insurance: { ...prev.insurance, documents: docs } }));
      }
    } catch (err) {
      setError('Failed to remove document');
    }
  };

  const handleVisitFileUpload = async (file: File, isEditing: boolean) => {
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const docRef = await documentService.saveDocument('pets', file.name, reader.result as string, new Date().toISOString());
        if (isEditing && editingVisit) {
          setEditingVisit(prev => prev ? { ...prev, visit: { ...prev.visit, documents: [...(prev.visit.documents || []), docRef] } } : null);
        } else {
          setNewVisit(prev => ({ ...prev, documents: [...(prev.documents || []), docRef] }));
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Failed to upload document');
    }
  };

  const removeVisitDocument = async (index: number, isEditing: boolean) => {
    try {
      if (isEditing && editingVisit) {
        const docs = [...(editingVisit.visit.documents || [])];
        if (docs[index]) await documentService.deleteDocument('pets', docs[index]);
        docs.splice(index, 1);
        setEditingVisit(prev => prev ? { ...prev, visit: { ...prev.visit, documents: docs } } : null);
      } else {
        const docs = [...(newVisit.documents || [])];
        if (docs[index]) await documentService.deleteDocument('pets', docs[index]);
        docs.splice(index, 1);
        setNewVisit(prev => ({ ...prev, documents: docs }));
      }
    } catch (err) {
      setError('Failed to remove document');
    }
  };

  // Filter pets
  const filteredPets = pets.filter(pet => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return pet.name.toLowerCase().includes(q) ||
      pet.breed?.toLowerCase().includes(q) ||
      pet.species.toLowerCase().includes(q);
  });

  // Get selected pet
  const selectedPet = selectedPetId ? pets.find(p => p.id === selectedPetId) : null;

  // Calculate reminders
  const getUpcomingReminders = () => {
    const reminders: { pet: Pet; type: string; date: string; label: string }[] = [];
    pets.forEach(pet => {
      // Vaccination due dates
      pet.vaccinations.forEach(v => {
        if (v.nextDueDate) {
          if (isPastDate(v.nextDueDate)) {
            reminders.push({ pet, type: 'overdue', date: v.nextDueDate, label: `${v.name} booster overdue` });
          } else if (isDueSoon(v.nextDueDate)) {
            reminders.push({ pet, type: 'due', date: v.nextDueDate, label: `${v.name} booster due` });
          }
        }
      });
      // Insurance renewal
      if (pet.insurance?.renewalDate) {
        if (isPastDate(pet.insurance.renewalDate)) {
          reminders.push({ pet, type: 'overdue', date: pet.insurance.renewalDate, label: 'Insurance renewal overdue' });
        } else if (isDueSoon(pet.insurance.renewalDate)) {
          reminders.push({ pet, type: 'due', date: pet.insurance.renewalDate, label: 'Insurance renewal due' });
        }
      }
      // Follow-up appointments
      pet.vetVisits.forEach(v => {
        if (v.followUpDate) {
          if (isPastDate(v.followUpDate)) {
            reminders.push({ pet, type: 'overdue', date: v.followUpDate, label: 'Follow-up appointment overdue' });
          } else if (isDueSoon(v.followUpDate)) {
            reminders.push({ pet, type: 'due', date: v.followUpDate, label: 'Follow-up appointment due' });
          }
        }
      });
    });
    return reminders.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const reminders = getUpcomingReminders();
  const overdueCount = reminders.filter(r => r.type === 'overdue').length;
  const dueCount = reminders.filter(r => r.type === 'due').length;
  const totalVetCosts = pets.reduce((sum, pet) => sum + pet.vetVisits.reduce((s, v) => s + (v.cost || 0), 0), 0);

  // Helper to get section alert counts for a specific pet
  const getSectionAlerts = (pet: Pet) => {
    const vaccinations = { overdue: 0, dueSoon: 0 };
    const vetVisits = { overdue: 0, dueSoon: 0 };
    const insurance = { overdue: false, dueSoon: false };

    pet.vaccinations.forEach(v => {
      if (v.nextDueDate) {
        if (isPastDate(v.nextDueDate)) vaccinations.overdue++;
        else if (isDueSoon(v.nextDueDate)) vaccinations.dueSoon++;
      }
    });

    pet.vetVisits.forEach(v => {
      if (v.followUpDate) {
        if (isPastDate(v.followUpDate)) vetVisits.overdue++;
        else if (isDueSoon(v.followUpDate)) vetVisits.dueSoon++;
      }
    });

    if (pet.insurance?.renewalDate) {
      if (isPastDate(pet.insurance.renewalDate)) insurance.overdue = true;
      else if (isDueSoon(pet.insurance.renewalDate)) insurance.dueSoon = true;
    }

    return { vaccinations, vetVisits, insurance };
  };

  const sectionAlerts = selectedPet ? getSectionAlerts(selectedPet) : null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 overflow-hidden">
      <div className="absolute inset-2 bg-white rounded-2xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-700 text-white p-6 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <PawPrint className="w-8 h-8" />
              <div>
                <h2 className="text-2xl font-bold">Pets</h2>
                <p className="text-white/80 text-sm">Pet records, vet visits, vaccinations & insurance</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/60" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search pets..."
                  className="pl-9 pr-4 py-2 bg-white/20 text-white placeholder-white/60 rounded-lg border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 w-48"
                />
              </div>
              <button
                onClick={() => setShowSummary(!showSummary)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title={showSummary ? 'Hide summary' : 'Show summary'}
              >
                {showSummary ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
              <div className="w-px h-8 bg-white/30 mx-1" />
              <button
                onClick={() => { setNewPet({ ...emptyPet }); setShowAddPet(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-white text-amber-600 rounded-lg hover:bg-white/90 transition-colors font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Pet
              </button>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left side - Pet list */}
          <div className={`${selectedPet ? 'w-1/3 border-r' : 'w-full'} flex flex-col`}>
            <div className="flex-1 overflow-y-auto p-4">
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
                </div>
              ) : (
                <>
                  {/* Summary */}
                  {showSummary && !selectedPet && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-3 border border-amber-100">
                        <p className="text-xs text-amber-600 font-medium">Total Pets</p>
                        <p className="text-xl font-bold text-amber-700">{pets.length}</p>
                      </div>
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3 border border-blue-100">
                        <p className="text-xs text-blue-600 font-medium">Total Vet Costs</p>
                        <p className="text-xl font-bold text-blue-700">{formatCurrency(totalVetCosts)}</p>
                      </div>
                      <div className={`rounded-xl p-3 border ${overdueCount > 0 ? 'bg-gradient-to-br from-red-50 to-pink-50 border-red-100' : 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-100'}`}>
                        <p className={`text-xs font-medium ${overdueCount > 0 ? 'text-red-600' : 'text-green-600'}`}>Overdue</p>
                        <p className={`text-xl font-bold ${overdueCount > 0 ? 'text-red-700' : 'text-green-700'}`}>{overdueCount || 'None'}</p>
                      </div>
                      <div className={`rounded-xl p-3 border ${dueCount > 0 ? 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-100' : 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-100'}`}>
                        <p className={`text-xs font-medium ${dueCount > 0 ? 'text-orange-600' : 'text-green-600'}`}>Due Soon</p>
                        <p className={`text-xl font-bold ${dueCount > 0 ? 'text-orange-700' : 'text-green-700'}`}>{dueCount || 'None'}</p>
                      </div>
                    </div>
                  )}

                  {/* Pet list */}
                  {filteredPets.length === 0 ? (
                    <div className="text-center py-12">
                      <PawPrint className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                      <h3 className="text-lg font-medium text-gray-600 mb-2">
                        {searchQuery ? 'No matching pets' : 'No pets yet'}
                      </h3>
                      <p className="text-gray-500 mb-6">
                        {searchQuery ? 'Try adjusting your search' : 'Add your first pet to get started'}
                      </p>
                      {!searchQuery && (
                        <button
                          onClick={() => { setNewPet({ ...emptyPet }); setShowAddPet(true); }}
                          className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                        >
                          <Plus className="w-5 h-5" />
                          Add First Pet
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredPets.map(pet => {
                        const petReminders = reminders.filter(r => r.pet.id === pet.id);
                        const hasOverdue = petReminders.some(r => r.type === 'overdue');
                        const hasDue = petReminders.some(r => r.type === 'due');

                        return (
                          <div
                            key={pet.id}
                            onClick={() => setSelectedPetId(pet.id)}
                            className={`p-4 rounded-xl border cursor-pointer transition-all ${
                              selectedPetId === pet.id
                                ? 'border-amber-400 bg-amber-50 shadow-md'
                                : 'border-gray-200 hover:border-amber-300 hover:shadow-sm'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-3xl">{getSpeciesEmoji(pet.species)}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-gray-900">{pet.name}</h3>
                                  {hasOverdue && <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">Overdue</span>}
                                  {!hasOverdue && hasDue && <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium">Due soon</span>}
                                </div>
                                <p className="text-sm text-gray-500">
                                  {pet.breed ? `${pet.breed} ` : ''}{getSpeciesLabel(pet.species)}
                                  {pet.dateOfBirth && ` • Born ${formatDateUK(pet.dateOfBirth)}`}
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setEditingPet({ ...pet }); }}
                                  className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); deletePet(pet.id); }}
                                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Right side - Pet details */}
          {selectedPet && (
            <div className="flex-1 overflow-y-auto p-6">
              {/* Pet header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <span className="text-5xl">{getSpeciesEmoji(selectedPet.species)}</span>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedPet.name}</h2>
                    <p className="text-gray-500">
                      {selectedPet.breed ? `${selectedPet.breed} ` : ''}{getSpeciesLabel(selectedPet.species)}
                      {selectedPet.gender && selectedPet.gender !== 'unknown' && ` • ${selectedPet.gender === 'male' ? 'Male' : 'Female'}`}
                      {selectedPet.neutered && ' • Neutered'}
                    </p>
                    {selectedPet.dateOfBirth && (
                      <p className="text-sm text-gray-400">Born: {formatDateUK(selectedPet.dateOfBirth)}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPetId(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Quick info cards */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                {selectedPet.microchipNumber && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Microchip</p>
                    <p className="font-mono text-sm">{selectedPet.microchipNumber}</p>
                  </div>
                )}
                {selectedPet.weight && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Weight</p>
                    <p className="font-medium">{selectedPet.weight} kg</p>
                  </div>
                )}
                {selectedPet.vetPractice && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Vet</p>
                    <p className="font-medium text-sm truncate">{selectedPet.vetPractice}</p>
                    {selectedPet.vetPhone && <p className="text-xs text-gray-400">{selectedPet.vetPhone}</p>}
                  </div>
                )}
                {selectedPet.insurance?.provider && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Insurance</p>
                    <p className="font-medium text-sm">{selectedPet.insurance.provider}</p>
                    {selectedPet.insurance.renewalDate && (
                      <p className={`text-xs ${isPastDate(selectedPet.insurance.renewalDate) ? 'text-red-500' : isDueSoon(selectedPet.insurance.renewalDate) ? 'text-orange-500' : 'text-gray-400'}`}>
                        Renews: {formatDateUK(selectedPet.insurance.renewalDate)}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Vaccinations section */}
              <div className="mb-6">
                <button
                  onClick={() => setExpandedSection(expandedSection === 'vaccinations' ? null : 'vaccinations')}
                  className="w-full flex items-center justify-between p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Syringe className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-800">Vaccinations</span>
                    <span className="text-sm text-green-600">({selectedPet.vaccinations.length})</span>
                    {sectionAlerts && sectionAlerts.vaccinations.overdue > 0 && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                        {sectionAlerts.vaccinations.overdue} overdue
                      </span>
                    )}
                    {sectionAlerts && sectionAlerts.vaccinations.dueSoon > 0 && (
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                        {sectionAlerts.vaccinations.dueSoon} due soon
                      </span>
                    )}
                  </div>
                  {expandedSection === 'vaccinations' ? <ChevronUp className="w-5 h-5 text-green-600" /> : <ChevronDown className="w-5 h-5 text-green-600" />}
                </button>

                {expandedSection === 'vaccinations' && (
                  <div className="mt-3 space-y-2">
                    {selectedPet.vaccinations.length === 0 ? (
                      <p className="text-sm text-gray-500 py-4 text-center">No vaccinations recorded</p>
                    ) : (
                      selectedPet.vaccinations
                        .sort((a, b) => new Date(b.dateGiven).getTime() - new Date(a.dateGiven).getTime())
                        .map(vax => (
                          <div key={vax.id} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                            <div>
                              <p className="font-medium">{vax.name}</p>
                              <p className="text-sm text-gray-500">Given: {formatDateUK(vax.dateGiven)}</p>
                              {vax.nextDueDate && (
                                <p className={`text-sm ${isPastDate(vax.nextDueDate) ? 'text-red-500 font-medium' : isDueSoon(vax.nextDueDate) ? 'text-orange-500' : 'text-gray-400'}`}>
                                  Next due: {formatDateUK(vax.nextDueDate)}
                                  {isPastDate(vax.nextDueDate) && ' (Overdue!)'}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setEditingVaccination({ petId: selectedPet.id, vaccination: { ...vax } })}
                                className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteVaccination(selectedPet.id, vax.id)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))
                    )}
                    <button
                      onClick={() => { setNewVaccination({ ...emptyVaccination }); setShowAddVaccination(true); }}
                      className="w-full py-2 border-2 border-dashed border-green-300 text-green-600 rounded-lg hover:bg-green-50 transition-colors text-sm font-medium"
                    >
                      + Add Vaccination
                    </button>
                  </div>
                )}
              </div>

              {/* Vet visits section */}
              <div className="mb-6">
                <button
                  onClick={() => setExpandedSection(expandedSection === 'visits' ? null : 'visits')}
                  className="w-full flex items-center justify-between p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Stethoscope className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-blue-800">Vet Visits</span>
                    <span className="text-sm text-blue-600">({selectedPet.vetVisits.length})</span>
                    {sectionAlerts && sectionAlerts.vetVisits.overdue > 0 && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                        {sectionAlerts.vetVisits.overdue} overdue
                      </span>
                    )}
                    {sectionAlerts && sectionAlerts.vetVisits.dueSoon > 0 && (
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                        {sectionAlerts.vetVisits.dueSoon} due soon
                      </span>
                    )}
                  </div>
                  {expandedSection === 'visits' ? <ChevronUp className="w-5 h-5 text-blue-600" /> : <ChevronDown className="w-5 h-5 text-blue-600" />}
                </button>

                {expandedSection === 'visits' && (
                  <div className="mt-3 space-y-2">
                    {selectedPet.vetVisits.length === 0 ? (
                      <p className="text-sm text-gray-500 py-4 text-center">No vet visits recorded</p>
                    ) : (
                      selectedPet.vetVisits
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map(visit => (
                          <div key={visit.id} className="p-3 bg-white border rounded-lg">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-medium">{visit.reason}</p>
                                  {visit.cost > 0 && <span className="text-sm text-blue-600 font-medium">{formatCurrency(visit.cost)}</span>}
                                </div>
                                <p className="text-sm text-gray-500">
                                  {formatDateUK(visit.date)}{visit.time && ` at ${visit.time}`}
                                  {visit.vetPractice && ` • ${visit.vetPractice}`}
                                </p>
                                {visit.diagnosis && <p className="text-sm text-gray-600 mt-1">Diagnosis: {visit.diagnosis}</p>}
                                {visit.treatment && <p className="text-sm text-gray-600">Treatment: {visit.treatment}</p>}
                                {visit.followUpDate && (
                                  <div className={`flex items-center gap-2 text-sm mt-1 ${isPastDate(visit.followUpDate) ? 'text-red-500' : isDueSoon(visit.followUpDate) ? 'text-orange-500' : 'text-gray-400'}`}>
                                    <span>Follow-up: {formatDateUK(visit.followUpDate)}</span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        markFollowUpComplete(selectedPet.id, visit.id);
                                      }}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200 transition-colors"
                                      title="Mark follow-up as complete"
                                    >
                                      <CheckCircle className="w-3 h-3" />
                                      Mark as complete
                                    </button>
                                  </div>
                                )}
                                {visit.documents && visit.documents.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {visit.documents.map((doc, idx) => (
                                      <button
                                        key={idx}
                                        onClick={() => viewFile(doc)}
                                        className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                                      >
                                        <FileText className="w-3 h-3" />
                                        {doc.filename}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-1 ml-2">
                                <button
                                  onClick={() => setEditingVisit({ petId: selectedPet.id, visit: { ...visit } })}
                                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => deleteVisit(selectedPet.id, visit.id)}
                                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                    )}
                    <button
                      onClick={() => { setNewVisit({ ...emptyVetVisit }); setShowAddVisit(true); }}
                      className="w-full py-2 border-2 border-dashed border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium"
                    >
                      + Add Vet Visit
                    </button>
                  </div>
                )}
              </div>

              {/* Insurance section */}
              {selectedPet.insurance && (selectedPet.insurance.provider || selectedPet.insurance.policyNumber || (selectedPet.insurance.documents && selectedPet.insurance.documents.length > 0)) && (
                <div className="mb-6">
                  <button
                    onClick={() => setExpandedSection(expandedSection === 'insurance' ? null : 'insurance')}
                    className="w-full flex items-center justify-between p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-purple-600" />
                      <span className="font-medium text-purple-800">Insurance</span>
                      {sectionAlerts && sectionAlerts.insurance.overdue && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                          overdue
                        </span>
                      )}
                      {sectionAlerts && sectionAlerts.insurance.dueSoon && (
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                          due soon
                        </span>
                      )}
                      {selectedPet.insurance.renewalDate && (
                        <span className={`text-sm ${isPastDate(selectedPet.insurance.renewalDate) ? 'text-red-500 font-medium' : isDueSoon(selectedPet.insurance.renewalDate) ? 'text-orange-500' : 'text-purple-500'}`}>
                          (Renews: {formatDateUK(selectedPet.insurance.renewalDate)})
                        </span>
                      )}
                    </div>
                    {expandedSection === 'insurance' ? <ChevronUp className="w-5 h-5 text-purple-600" /> : <ChevronDown className="w-5 h-5 text-purple-600" />}
                  </button>

                  {expandedSection === 'insurance' && (
                    <div className="mt-3 p-4 bg-white border rounded-lg">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {selectedPet.insurance.provider && (
                          <div>
                            <p className="text-xs text-gray-500">Provider</p>
                            <p className="font-medium">{selectedPet.insurance.provider}</p>
                          </div>
                        )}
                        {selectedPet.insurance.policyNumber && (
                          <div>
                            <p className="text-xs text-gray-500">Policy Number</p>
                            <p className="font-mono">{selectedPet.insurance.policyNumber}</p>
                          </div>
                        )}
                        {selectedPet.insurance.phone && (
                          <div>
                            <p className="text-xs text-gray-500">Phone</p>
                            <p>{selectedPet.insurance.phone}</p>
                          </div>
                        )}
                        {selectedPet.insurance.coverageType && (
                          <div>
                            <p className="text-xs text-gray-500">Coverage Type</p>
                            <p>{selectedPet.insurance.coverageType}</p>
                          </div>
                        )}
                        {selectedPet.insurance.monthlyPremium !== undefined && selectedPet.insurance.monthlyPremium > 0 && (
                          <div>
                            <p className="text-xs text-gray-500">Monthly Premium</p>
                            <p className="font-medium text-purple-600">{formatCurrency(selectedPet.insurance.monthlyPremium)}</p>
                          </div>
                        )}
                        {selectedPet.insurance.excess !== undefined && selectedPet.insurance.excess > 0 && (
                          <div>
                            <p className="text-xs text-gray-500">Excess</p>
                            <p>{formatCurrency(selectedPet.insurance.excess)}</p>
                          </div>
                        )}
                        {selectedPet.insurance.renewalDate && (
                          <div>
                            <p className="text-xs text-gray-500">Renewal Date</p>
                            <p className={isPastDate(selectedPet.insurance.renewalDate) ? 'text-red-500 font-medium' : isDueSoon(selectedPet.insurance.renewalDate) ? 'text-orange-500' : ''}>
                              {formatDateUK(selectedPet.insurance.renewalDate)}
                              {isPastDate(selectedPet.insurance.renewalDate) && ' (Overdue!)'}
                            </p>
                          </div>
                        )}
                      </div>
                      {selectedPet.insurance.notes && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs text-gray-500">Notes</p>
                          <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedPet.insurance.notes}</p>
                        </div>
                      )}
                      {selectedPet.insurance.documents && selectedPet.insurance.documents.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs text-gray-500 mb-2">Documents</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedPet.insurance.documents.map((doc, idx) => (
                              <button
                                key={idx}
                                onClick={() => viewFile(doc)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm"
                              >
                                <FileText className="w-3 h-3" />
                                {doc.filename}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Health notes */}
              {(selectedPet.allergies || selectedPet.medicalConditions || selectedPet.currentMedications || selectedPet.dietNotes) && (
                <div className="mb-6 p-4 bg-rose-50 rounded-xl">
                  <h3 className="font-medium text-rose-800 flex items-center gap-2 mb-3">
                    <Heart className="w-4 h-4" />
                    Health Notes
                  </h3>
                  <div className="space-y-2 text-sm">
                    {selectedPet.allergies && <p><span className="text-rose-600 font-medium">Allergies:</span> {selectedPet.allergies}</p>}
                    {selectedPet.medicalConditions && <p><span className="text-rose-600 font-medium">Conditions:</span> {selectedPet.medicalConditions}</p>}
                    {selectedPet.currentMedications && <p><span className="text-rose-600 font-medium">Medications:</span> {selectedPet.currentMedications}</p>}
                    {selectedPet.dietNotes && <p><span className="text-rose-600 font-medium">Diet:</span> {selectedPet.dietNotes}</p>}
                  </div>
                </div>
              )}

              {/* Documents */}
              {selectedPet.documents && selectedPet.documents.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-medium text-gray-700 mb-2">Documents</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedPet.documents.map((doc, idx) => (
                      <button
                        key={idx}
                        onClick={() => viewFile(doc)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors text-sm"
                      >
                        <FileText className="w-3 h-3" />
                        {doc.filename}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedPet.notes && (
                <div className="p-4 bg-gray-50 rounded-xl">
                  <h3 className="font-medium text-gray-700 mb-2">Notes</h3>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedPet.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modals */}
        {showAddPet && (
          <PetForm
            pet={newPet}
            onFieldChange={handleNewPetFieldChange}
            onSave={addPet}
            onCancel={() => setShowAddPet(false)}
            onFileUpload={(f) => handlePetFileUpload(f, false)}
            onRemoveDocument={(i) => removePetDocument(i, false)}
            onInsuranceFileUpload={(f) => handleInsuranceFileUpload(f, false)}
            onRemoveInsuranceDocument={(i) => removeInsuranceDocument(i, false)}
            isEditing={false}
          />
        )}

        {editingPet && (
          <PetForm
            pet={editingPet}
            onFieldChange={handleEditPetFieldChange}
            onSave={updatePet}
            onCancel={() => setEditingPet(null)}
            onFileUpload={(f) => handlePetFileUpload(f, true)}
            onRemoveDocument={(i) => removePetDocument(i, true)}
            onInsuranceFileUpload={(f) => handleInsuranceFileUpload(f, true)}
            onRemoveInsuranceDocument={(i) => removeInsuranceDocument(i, true)}
            isEditing={true}
          />
        )}

        {showAddVaccination && (
          <VaccinationForm
            vaccination={newVaccination}
            onFieldChange={handleNewVaccinationFieldChange}
            onSave={addVaccination}
            onCancel={() => setShowAddVaccination(false)}
            isEditing={false}
          />
        )}

        {editingVaccination && (
          <VaccinationForm
            vaccination={editingVaccination.vaccination}
            onFieldChange={handleEditVaccinationFieldChange}
            onSave={updateVaccination}
            onCancel={() => setEditingVaccination(null)}
            isEditing={true}
          />
        )}

        {showAddVisit && (
          <VetVisitForm
            visit={newVisit}
            onFieldChange={handleNewVisitFieldChange}
            onSave={addVisit}
            onCancel={() => setShowAddVisit(false)}
            onFileUpload={(f) => handleVisitFileUpload(f, false)}
            onRemoveDocument={(i) => removeVisitDocument(i, false)}
            isEditing={false}
          />
        )}

        {editingVisit && (
          <VetVisitForm
            visit={editingVisit.visit}
            onFieldChange={handleEditVisitFieldChange}
            onSave={updateVisit}
            onCancel={() => setEditingVisit(null)}
            onFileUpload={(f) => handleVisitFileUpload(f, true)}
            onRemoveDocument={(i) => removeVisitDocument(i, true)}
            isEditing={true}
          />
        )}

        {/* Document Viewer */}
        {viewingDocument && (
          <div className="fixed inset-0 z-[80] bg-black/90 flex flex-col">
            <div className="bg-[#1a1a1a] text-white p-4 flex items-center justify-between flex-shrink-0">
              <h3 className="font-medium truncate max-w-md">{viewingDocument.docRef.filename}</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => downloadFile(viewingDocument.docRef)} className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Download">
                  <Download className="w-5 h-5" />
                </button>
                <button onClick={() => { if (viewingDocument.blobUrl) URL.revokeObjectURL(viewingDocument.blobUrl); setViewingDocument(null); }} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              {viewingDocument.docRef.mimeType?.startsWith('image/') ? (
                <div className="h-full flex items-center justify-center p-4">
                  <img src={viewingDocument.dataUrl} alt={viewingDocument.docRef.filename} className="max-w-full max-h-full object-contain" />
                </div>
              ) : viewingDocument.docRef.mimeType === 'application/pdf' ? (
                <PdfJsViewer url={viewingDocument.blobUrl} filename={viewingDocument.docRef.filename} />
              ) : (
                <div className="h-full flex items-center justify-center text-white">
                  <div className="text-center">
                    <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>Preview not available</p>
                    <button onClick={() => downloadFile(viewingDocument.docRef)} className="mt-4 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg">
                      Download to view
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {loadingDocument && (
          <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center">
            <div className="bg-white rounded-xl p-6 flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500" />
              <span>Loading document...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
