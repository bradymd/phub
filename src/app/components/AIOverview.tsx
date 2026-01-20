import { X, BookOpen, Sparkles, Calendar, FileText, Award, GraduationCap, Heart, Wallet, PiggyBank } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useStorage } from '../../contexts/StorageContext';

interface AIOverviewProps {
  onClose: () => void;
}

interface LifeStage {
  age: number;
  stage: string;
  dataToTrack: string[];
  focus: string;
}

export function AIOverview({ onClose }: AIOverviewProps) {
  const storage = useStorage();
  const [insights, setInsights] = useState({
    documentsCount: 0,
    financialAccounts: 0,
    photosCount: 0,
    contactsCount: 0,
    passwordsCount: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Gather data from encrypted storage
    async function loadInsights() {
      try {
        setIsLoading(true);
        const [certificates, education, medical, finance, photos, contacts, passwords] = await Promise.all([
          storage.get('documents_certificates').catch(() => []),
          storage.get('education_records').catch(() => []),
          storage.get('medical_history').catch(() => []),
          storage.get('finance_items').catch(() => []),
          storage.get('photos').catch(() => []),
          storage.get('contacts').catch(() => []),
          storage.get('virtual_street').catch(() => []),
        ]);

        setInsights({
          documentsCount: certificates.length + education.length + medical.length,
          financialAccounts: finance.length,
          photosCount: photos.length,
          contactsCount: contacts.length,
          passwordsCount: passwords.length
        });
      } catch (err) {
        console.error('Failed to load insights:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadInsights();
  }, [storage]);

  const lifeStages: LifeStage[] = [
    {
      age: 18,
      stage: 'Early Career & Education',
      dataToTrack: [
        'Educational certificates and diplomas',
        'First job offer letters and contracts',
        'Birth certificate and passport',
        'National Insurance number documents',
        'Student loan documents',
        'First bank account and savings records'
      ],
      focus: 'Building your foundation - document your education and early achievements'
    },
    {
      age: 25,
      stage: 'Career Development',
      dataToTrack: [
        'Employment contracts and job history',
        'Professional qualifications and training certificates',
        'CV/Resume with achievements',
        'Pension scheme documents (start tracking early!)',
        'Health records and vaccinations',
        'Budget tracking for income and expenses'
      ],
      focus: 'Establishing your career - keep records of all professional development'
    },
    {
      age: 35,
      stage: 'Growing Responsibilities',
      dataToTrack: [
        'Mortgage documents or rental agreements',
        'Insurance policies (life, home, car)',
        'Marriage certificate or civil partnership documents',
        'Children\'s birth certificates and medical records',
        'Multiple pension schemes from different employers',
        'Investment accounts and ISA records'
      ],
      focus: 'Family and property - document major life events and financial commitments'
    },
    {
      age: 45,
      stage: 'Peak Career & Planning',
      dataToTrack: [
        'Comprehensive pension statements from all sources',
        'Property deeds and equity records',
        'Will and power of attorney documents',
        'Children\'s education records and achievements',
        'Updated health records and regular check-ups',
        'Full budget review including all expenses'
      ],
      focus: 'Mid-career review - consolidate records and plan for retirement'
    },
    {
      age: 55,
      stage: 'Pre-Retirement',
      dataToTrack: [
        'Detailed pension projections and forecasts',
        'State pension entitlement statements',
        'Healthcare plans and insurance',
        'Estate planning documents',
        'Debt reduction tracking',
        'Retirement budget planning'
      ],
      focus: 'Preparing for retirement - ensure all pension and financial records are complete'
    },
    {
      age: 65,
      stage: 'Retirement',
      dataToTrack: [
        'Active pension drawdown records',
        'State pension payments',
        'Healthcare records and prescriptions',
        'Insurance policies (life, health, home)',
        'Bank account statements',
        'Legacy planning documents for family'
      ],
      focus: 'Enjoying retirement - maintain organized records for peace of mind'
    }
  ];

  const gettingStartedTips = [
    {
      icon: Award,
      title: 'Start with Certificates',
      description: 'Birth certificate, passport, marriage certificate, driving license - scan and store these first',
      category: 'Certificates'
    },
    {
      icon: GraduationCap,
      title: 'Document Your Education',
      description: 'Diplomas, degrees, training certificates - build your complete educational history',
      category: 'Education'
    },
    {
      icon: FileText,
      title: 'Build Your CV',
      description: 'Keep a running record of all jobs, roles, achievements, and responsibilities',
      category: 'Employment'
    },
    {
      icon: Heart,
      title: 'Track Health Records',
      description: 'Medical history, vaccinations, prescriptions, test results, insurance policies',
      category: 'Health'
    },
    {
      icon: Wallet,
      title: 'Organize Finances',
      description: 'Bank accounts, savings, investments - keep track of where your money is',
      category: 'Finance'
    },
    {
      icon: PiggyBank,
      title: 'Monitor Pensions',
      description: 'Every job may give you a pension - track them all to know your retirement income',
      category: 'Pensions'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-600 text-white rounded-lg">
                <BookOpen className="w-6 h-6" />
              </div>
              <h2 className="text-gray-900">Life Planning Guide</h2>
            </div>
            <p className="text-sm text-gray-500">What to record at each stage of your life journey</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Current Status */}
          <div className="mb-6">
            <h3 className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Your Digital Life Summary
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="p-4 bg-blue-50 rounded-xl">
                <p className="text-gray-600 text-sm">Documents</p>
                <p className="text-blue-600">{insights.documentsCount}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-xl">
                <p className="text-gray-600 text-sm">Finance</p>
                <p className="text-green-600">{insights.financialAccounts}</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-xl">
                <p className="text-gray-600 text-sm">Photos</p>
                <p className="text-purple-600">{insights.photosCount}</p>
              </div>
              <div className="p-4 bg-orange-50 rounded-xl">
                <p className="text-gray-600 text-sm">Contacts</p>
                <p className="text-orange-600">{insights.contactsCount}</p>
              </div>
              <div className="p-4 bg-red-50 rounded-xl">
                <p className="text-gray-600 text-sm">Passwords</p>
                <p className="text-red-600">{insights.passwordsCount}</p>
              </div>
            </div>
          </div>

          {/* Life Stages Timeline */}
          <div className="mb-6">
            <h3 className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-blue-600" />
              Life Stages & What to Record
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Use this guide to understand what documents and records are important at each stage of life.
              Your PersonalHub helps you organize all of this securely in one place.
            </p>
            <div className="space-y-4">
              {lifeStages.map((stage, index) => (
                <div key={index} className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                  <div className="mb-3">
                    <h4 className="text-lg font-semibold text-gray-900 mb-1">
                      Age {stage.age}+ • {stage.stage}
                    </h4>
                    <p className="text-sm text-blue-700 italic">{stage.focus}</p>
                  </div>
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Important Documents to Keep:</p>
                    <ul className="space-y-1.5">
                      {stage.dataToTrack.map((item, idx) => (
                        <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="text-blue-600 mt-0.5">✓</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Getting Started Guide */}
          <div>
            <h3 className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-blue-600" />
              Getting Started - What to Record
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Use the panels in your PersonalHub to organize these different types of information:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {gettingStartedTips.map((tip, index) => {
                const Icon = tip.icon;
                return (
                  <div key={index} className="p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg flex-shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 mb-1">{tip.title}</h4>
                        <p className="text-sm text-gray-600">{tip.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Important Note */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-sm text-blue-900">
              <strong>Remember:</strong> All your data is encrypted with AES-256-GCM and stored locally on your device.
              Nothing is sent to any server. Use the "Backup & Restore" feature regularly to keep your data safe.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
