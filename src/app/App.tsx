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
  Briefcase
} from 'lucide-react';
import { CategoryCard } from './components/CategoryCard';
import { DocumentManager } from './components/DocumentManager';
import { FinanceManager } from './components/FinanceManager';
import { PhotoGallery } from './components/PhotoGallery';
import { ContactsManager } from './components/ContactsManager';
import { VirtualHighStreetSecure } from './components/VirtualHighStreetSecure';
import { AIOverview } from './components/AIOverview';
import { EmploymentManager } from './components/EmploymentManager';
import MasterPasswordSetup from './components/MasterPasswordSetup';
import MasterPasswordUnlock from './components/MasterPasswordUnlock';

type ModalType = 'certificates' | 'education' | 'health' | 'finance' | 'photos' | 'contacts' | 'websites' | 'employment' | 'ai' | null;

export default function App() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [masterPassword, setMasterPassword] = useState('');
  const [hasMasterPassword, setHasMasterPassword] = useState(false);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [counts, setCounts] = useState({
    certificates: 0,
    education: 0,
    health: 0,
    finance: 0,
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

  // Update counts when modals close
  const handleModalClose = () => {
    const certificates = JSON.parse(localStorage.getItem('documents_Certificates') || '[]');
    const education = JSON.parse(localStorage.getItem('documents_Education') || '[]');
    const health = JSON.parse(localStorage.getItem('documents_Health') || '[]');
    const finance = JSON.parse(localStorage.getItem('finance_items') || '[]');
    const photos = JSON.parse(localStorage.getItem('photos') || '[]');
    const contacts = JSON.parse(localStorage.getItem('contacts') || '[]');
    const websites = JSON.parse(localStorage.getItem('virtual_street_encrypted') || '[]');
    const employment = JSON.parse(localStorage.getItem('employment_records') || '[]');

    setCounts({
      certificates: certificates.length,
      education: education.length,
      health: health.length,
      finance: finance.length,
      photos: photos.length,
      contacts: contacts.length,
      websites: websites.length,
      employment: employment.length
    });

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
      description: 'Pensions, savings, and financial accounts'
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-xl shadow-lg">
              <LayoutDashboard className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-gray-900">My Personal Hub</h1>
              <p className="text-gray-600">Your secure space for life's important information</p>
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
          <p>All data is encrypted and stored locally in your browser. Passwords are protected with AES-256 encryption.</p>
        </div>
      </div>

      {/* Modals */}
      {activeModal === 'certificates' && (
        <DocumentManager category="Certificates" onClose={handleModalClose} />
      )}
      {activeModal === 'education' && (
        <DocumentManager category="Education" onClose={handleModalClose} />
      )}
      {activeModal === 'health' && (
        <DocumentManager category="Health" onClose={handleModalClose} />
      )}
      {activeModal === 'finance' && (
        <FinanceManager onClose={handleModalClose} />
      )}
      {activeModal === 'photos' && (
        <PhotoGallery onClose={handleModalClose} />
      )}
      {activeModal === 'contacts' && (
        <ContactsManager onClose={handleModalClose} />
      )}
      {activeModal === 'websites' && (
        <VirtualHighStreetSecure onClose={handleModalClose} masterPassword={masterPassword} />
      )}
      {activeModal === 'ai' && (
        <AIOverview onClose={handleModalClose} />
      )}
      {activeModal === 'employment' && (
        <EmploymentManager onClose={handleModalClose} />
      )}
    </div>
  );
}