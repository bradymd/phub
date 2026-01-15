import { useState, useEffect } from 'react';
import {
  Award,
  GraduationCap,
  Heart,
  Wallet,
  Camera,
  Users,
  Store,
  Brain,
  LayoutDashboard,
  Briefcase,
  PiggyBank,
  Receipt,
  Download,
  Upload
} from 'lucide-react';
import { CategoryCard } from './components/CategoryCard';
import { DocumentManagerSecure } from './components/DocumentManagerSecure';
import { FinanceManagerSecure } from './components/FinanceManagerSecure';
import { PhotoGallerySecure } from './components/PhotoGallerySecure';
import { ContactsManagerSecure } from './components/ContactsManagerSecure';
import { VirtualHighStreetSecure } from './components/VirtualHighStreetSecure';
import { AIOverview } from './components/AIOverview';
import { EmploymentManagerSecure } from './components/EmploymentManagerSecure';
import { EducationManagerSecure } from './components/EducationManagerSecure';
import { CertificateManagerSecure } from './components/CertificateManagerSecure';
import { MedicalHistoryManagerSecure } from './components/MedicalHistoryManagerSecure';
import { PensionManagerSecure } from './components/PensionManagerSecure';
import { BudgetManagerSecure } from './components/BudgetManagerSecure';
import MasterPasswordSetup from './components/MasterPasswordSetup';
import MasterPasswordUnlock from './components/MasterPasswordUnlock';
import { StorageProvider } from '../contexts/StorageContext';
import { ImportWizard } from './components/ImportWizard';

type ModalType = 'certificates' | 'education' | 'health' | 'finance' | 'pensions' | 'budget' | 'photos' | 'contacts' | 'websites' | 'employment' | 'ai' | null;

export default function App() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [masterPassword, setMasterPassword] = useState('');
  const [hasMasterPassword, setHasMasterPassword] = useState(false);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [importChecked, setImportChecked] = useState(false);
  const [counts, setCounts] = useState({
    certificates: 0,
    education: 0,
    health: 0,
    finance: 0,
    pensions: 0,
    budget: 0,
    photos: 0,
    contacts: 0,
    websites: 0,
    employment: 0
  });

  // Check if user has already set up a master password
  useEffect(() => {
    const hasPassword = localStorage.getItem('master_password_hash');
    setHasMasterPassword(!!hasPassword);
  }, []);

  const handleSetupComplete = (password: string) => {
    setMasterPassword(password);
    setIsUnlocked(true);
    setHasMasterPassword(true);
  };

  const handleUnlockSuccess = (password: string) => {
    setMasterPassword(password);
    setIsUnlocked(true);
  };

  // Check if this is first run in desktop app and needs import
  useEffect(() => {
    const checkFirstRun = async () => {
      if (!isUnlocked || importChecked) return;

      // Only check for import in Tauri desktop app
      const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;
      if (!isTauri) {
        setImportChecked(true);
        return;
      }

      try {
        // Check if any data files exist
        const { exists } = await import('@tauri-apps/plugin-fs');
        const { BaseDirectory } = await import('@tauri-apps/plugin-fs');

        const hasData = await exists('PersonalHub/data/virtual_street.encrypted.json', {
          baseDir: BaseDirectory.Document
        });

        if (!hasData) {
          // First run - show import wizard
          setShowImportWizard(true);
        }
        setImportChecked(true);
      } catch (err) {
        console.error('Error checking first run:', err);
        setImportChecked(true);
      }
    };

    checkFirstRun();
  }, [isUnlocked, importChecked]);

  const handleImportComplete = () => {
    setShowImportWizard(false);
    window.location.reload(); // Reload to show imported data
  };

  // Export all data to a file
  const handleExportData = () => {
    try {
      // Get ALL data from localStorage
      const exportData: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          exportData[key] = localStorage.getItem(key) || '';
        }
      }

      // Add metadata
      const exportPackage = {
        exportDate: new Date().toISOString(),
        version: '1.0',
        data: exportData
      };

      // Create downloadable file
      const blob = new Blob([JSON.stringify(exportPackage, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `personal-hub-backup-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);

      alert('✅ Data exported successfully! Save this file in a safe place.');
    } catch (err) {
      console.error('Export failed:', err);
      alert('❌ Export failed. Check console for details.');
    }
  };

  // Import data from a file
  const handleImportData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      try {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const text = await file.text();
        const importPackage = JSON.parse(text);

        if (!importPackage.data) {
          alert('❌ Invalid backup file format');
          return;
        }

        // Confirm before overwriting
        const confirm = window.confirm(
          '⚠️ This will replace ALL current data with the imported data. Are you sure?\n\n' +
          `Backup from: ${importPackage.exportDate}\n` +
          `Version: ${importPackage.version}`
        );

        if (!confirm) return;

        // Clear existing data
        localStorage.clear();

        // Import all data
        Object.entries(importPackage.data).forEach(([key, value]) => {
          localStorage.setItem(key, value as string);
        });

        alert('✅ Data imported successfully! Refreshing app...');
        window.location.reload();
      } catch (err) {
        console.error('Import failed:', err);
        alert('❌ Import failed. Check console for details.');
      }
    };
    input.click();
  };

  // Update counts when modals close
  const handleModalClose = () => {
    // Don't try to parse encrypted data directly - it will give wrong counts
    // Encrypted data needs to be decrypted first, which happens inside each modal
    // For now, just show 0 until we implement proper count tracking
    // TODO: Have each modal report its count when it closes

    setActiveModal(null);
  };

  // Show setup screen if no master password exists
  if (!hasMasterPassword) {
    return <MasterPasswordSetup onSetupComplete={handleSetupComplete} />;
  }

  // Show unlock screen if password exists but not unlocked
  if (!isUnlocked) {
    return <MasterPasswordUnlock onUnlockSuccess={handleUnlockSuccess} />;
  }

  // Show import wizard on first run (desktop app only)
  if (showImportWizard) {
    return <ImportWizard masterPassword={masterPassword} onImportComplete={handleImportComplete} />;
  }

  const categories = [
    {
      id: 'certificates' as const,
      title: 'Certificates',
      icon: Award,
      count: counts.certificates,
      description: 'Birth certificate, marriage license, and other official documents'
    },
    {
      id: 'education' as const,
      title: 'Education',
      icon: GraduationCap,
      count: counts.education,
      description: 'Diplomas, transcripts, and educational records'
    },
    {
      id: 'employment' as const,
      title: 'Employment',
      icon: Briefcase,
      count: counts.employment,
      description: 'Work history, roles, responsibilities, and pension tracking'
    },
    {
      id: 'health' as const,
      title: 'Health',
      icon: Heart,
      count: counts.health,
      description: 'Medical records, insurance, and health documents'
    },
    {
      id: 'finance' as const,
      title: 'Finance',
      icon: Wallet,
      count: counts.finance,
      description: 'Savings and financial accounts'
    },
    {
      id: 'pensions' as const,
      title: 'Pensions',
      icon: PiggyBank,
      count: counts.pensions,
      description: 'Retirement savings, DB and DC pension funds'
    },
    {
      id: 'budget' as const,
      title: 'Budget',
      icon: Receipt,
      count: counts.budget,
      description: 'Monthly expenses, bills, and direct debits'
    },
    {
      id: 'photos' as const,
      title: 'Photos',
      icon: Camera,
      count: counts.photos,
      description: 'Personal photos and cherished memories'
    },
    {
      id: 'contacts' as const,
      title: 'Contacts',
      icon: Users,
      count: counts.contacts,
      description: 'Important people in your life'
    },
    {
      id: 'websites' as const,
      title: 'Websites',
      icon: Store,
      count: counts.websites,
      description: 'Your virtual high street of favorite websites'
    }
  ];

  return (
    <StorageProvider masterPassword={masterPassword}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-xl shadow-lg">
                <LayoutDashboard className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-gray-900">My Personal Hub</h1>
                <p className="text-gray-600">Your secure space for life's important information</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportData}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md"
                title="Export all data to a backup file"
              >
                <Download className="w-4 h-4" />
                Export Data
              </button>
              <button
                onClick={handleImportData}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                title="Import data from a backup file"
              >
                <Upload className="w-4 h-4" />
                Import Data
              </button>
            </div>
          </div>
        </div>

        {/* AI Overview Card */}
        <div className="mb-6">
          <button
            onClick={() => setActiveModal('ai')}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all text-left group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  <Brain className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-white">AI Life Overview</h2>
                  <p className="text-white/80 text-sm mt-1">
                    Get personalized insights, lifespan planning, and next step recommendations
                  </p>
                </div>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-sm text-white/80">Click to view →</span>
              </div>
            </div>
          </button>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              title={category.title}
              icon={category.icon}
              count={category.count}
              description={category.description}
              onClick={() => setActiveModal(category.id)}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>All data is encrypted with AES-256-GCM and stored locally in your browser. Nothing is sent to any server.</p>
          <p className="mt-2 text-orange-600 font-medium">⚠️ Important: Export your data regularly to back up your information!</p>
        </div>
      </div>

      {/* Modals */}
      {activeModal === 'certificates' && (
        <CertificateManagerSecure onClose={handleModalClose} />
      )}
      {activeModal === 'education' && (
        <EducationManagerSecure onClose={handleModalClose} />
      )}
      {activeModal === 'health' && (
        <MedicalHistoryManagerSecure onClose={handleModalClose} />
      )}
      {activeModal === 'finance' && (
        <FinanceManagerSecure onClose={handleModalClose} />
      )}
      {activeModal === 'pensions' && (
        <PensionManagerSecure onClose={handleModalClose} />
      )}
      {activeModal === 'budget' && (
        <BudgetManagerSecure onClose={handleModalClose} />
      )}
      {activeModal === 'photos' && (
        <PhotoGallerySecure onClose={handleModalClose} />
      )}
      {activeModal === 'contacts' && (
        <ContactsManagerSecure onClose={handleModalClose} />
      )}
      {activeModal === 'websites' && (
        <VirtualHighStreetSecure onClose={handleModalClose} />
      )}
      {activeModal === 'ai' && (
        <AIOverview onClose={handleModalClose} />
      )}
      {activeModal === 'employment' && (
        <EmploymentManagerSecure onClose={handleModalClose} />
      )}
    </div>
    </StorageProvider>
  );
}