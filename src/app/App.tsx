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
  Upload,
  HardDrive,
  Grid3x3,
  List,
  Lock,
  X,
  AlertCircle,
  Settings,
  Eye,
  EyeOff
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
import { StorageProvider, useChangePassword } from '../contexts/StorageContext';
import { ImportWizard } from './components/ImportWizard';
import { BackupManager } from './components/BackupManager';
import { PasswordChangeModal } from './components/PasswordChangeModal';

type ModalType = 'certificates' | 'education' | 'health' | 'finance' | 'pensions' | 'budget' | 'photos' | 'contacts' | 'websites' | 'employment' | 'ai' | 'backup' | null;

export default function App() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [masterPassword, setMasterPassword] = useState('');
  const [hasMasterPassword, setHasMasterPassword] = useState(false);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [importChecked, setImportChecked] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showCategorySettings, setShowCategorySettings] = useState(false);
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(() => {
    // Load hidden categories from localStorage
    const saved = localStorage.getItem('hidden_categories');
    return saved ? new Set(JSON.parse(saved)) : new Set();
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

  // Toggle category visibility
  const toggleCategoryVisibility = (categoryId: string) => {
    setHiddenCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      // Save to localStorage
      localStorage.setItem('hidden_categories', JSON.stringify([...newSet]));
      return newSet;
    });
  };

  const isCategoryVisible = (categoryId: string) => !hiddenCategories.has(categoryId);

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
      description: 'Birth certificate, marriage license, and other official documents'
    },
    {
      id: 'education' as const,
      title: 'Education',
      icon: GraduationCap,
      description: 'Diplomas, transcripts, and educational records'
    },
    {
      id: 'employment' as const,
      title: 'Employment',
      icon: Briefcase,
      description: 'Work history, roles, responsibilities, and pension tracking'
    },
    {
      id: 'health' as const,
      title: 'Health',
      icon: Heart,
      description: 'Medical records, insurance, and health documents'
    },
    {
      id: 'finance' as const,
      title: 'Finance',
      icon: Wallet,
      description: 'Savings and financial accounts'
    },
    {
      id: 'pensions' as const,
      title: 'Pensions',
      icon: PiggyBank,
      description: 'Retirement savings, DB and DC pension funds'
    },
    {
      id: 'budget' as const,
      title: 'Budget',
      icon: Receipt,
      description: 'Monthly expenses, bills, and direct debits'
    },
    {
      id: 'photos' as const,
      title: 'Photos',
      icon: Camera,
      description: 'Personal photos and cherished memories'
    },
    {
      id: 'contacts' as const,
      title: 'Contacts',
      icon: Users,
      description: 'Important people in your life'
    },
    {
      id: 'websites' as const,
      title: 'Websites',
      icon: Store,
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
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
                title="Grid view"
              >
                <Grid3x3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
                title="List view"
              >
                <List className="w-5 h-5" />
              </button>
              <div className="w-px h-8 bg-gray-300 mx-2"></div>
              <button
                onClick={() => setShowCategorySettings(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition-colors shadow-md border border-gray-200"
                title="Customize which panels are visible"
              >
                <Settings className="w-4 h-4" />
                Panel Settings
              </button>
              <button
                onClick={() => setShowPasswordChange(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition-colors shadow-md border border-gray-200"
                title="Change master password"
              >
                <Lock className="w-4 h-4" />
                Change Password
              </button>
              <button
                onClick={() => setActiveModal('backup')}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-colors shadow-md"
                title="Backup & Restore your encrypted data"
              >
                <HardDrive className="w-4 h-4" />
                Backup & Restore
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
          </button>
        </div>

        {/* Categories Grid or List */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.filter(cat => isCategoryVisible(cat.id)).map((category) => (
              <CategoryCard
                key={category.id}
                title={category.title}
                icon={category.icon}
                description={category.description}
                onClick={() => setActiveModal(category.id)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
            {categories.filter(cat => isCategoryVisible(cat.id)).map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.id}
                  onClick={() => setActiveModal(category.id)}
                  className="w-full px-6 py-3 hover:bg-gray-50 transition-colors text-left flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-gray-900 font-medium">{category.title}</span>
                    <span className="text-gray-500 text-sm">{category.description}</span>
                  </div>
                  <div className="text-gray-400 group-hover:text-blue-600 transition-colors">→</div>
                </button>
              );
            })}
          </div>
        )}

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
      {activeModal === 'backup' && (
        <BackupManager onClose={handleModalClose} />
      )}
      {showPasswordChange && (
        <PasswordChangeModal
          onClose={() => setShowPasswordChange(false)}
          currentPassword={masterPassword}
        />
      )}

      {/* Category Settings Modal */}
      {showCategorySettings && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[80vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Settings className="w-6 h-6 text-blue-600" />
                Panel Visibility Settings
              </h2>
              <button
                onClick={() => setShowCategorySettings(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Info */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                Hide panels you don't need to declutter your dashboard. You can always show them again later.
              </p>
            </div>

            {/* Category List */}
            <div className="space-y-2">
              {categories.map((category) => {
                const Icon = category.icon;
                const isVisible = isCategoryVisible(category.id);

                return (
                  <button
                    key={category.id}
                    onClick={() => toggleCategoryVisibility(category.id)}
                    className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between ${
                      isVisible
                        ? 'border-blue-200 bg-blue-50 hover:bg-blue-100'
                        : 'border-gray-200 bg-gray-50 hover:bg-gray-100 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isVisible ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-500'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <p className={`font-medium ${isVisible ? 'text-gray-900' : 'text-gray-500'}`}>
                          {category.title}
                        </p>
                        <p className="text-sm text-gray-500">{category.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isVisible ? (
                        <>
                          <Eye className="w-5 h-5 text-blue-600" />
                          <span className="text-sm font-medium text-blue-600">Visible</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-5 h-5 text-gray-400" />
                          <span className="text-sm font-medium text-gray-500">Hidden</span>
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowCategorySettings(false)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </StorageProvider>
  );
}