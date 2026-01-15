import { X, Brain, Sparkles, Calendar } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useStorage } from '../../contexts/StorageContext';

interface AIOverviewProps {
  onClose: () => void;
}

interface LifeStage {
  age: number;
  stage: string;
  milestones: string[];
  priority: string;
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
      age: 20,
      stage: 'Early Career',
      milestones: ['Build emergency fund', 'Start retirement savings', 'Obtain health insurance'],
      priority: 'Education & Career Development'
    },
    {
      age: 30,
      stage: 'Growth Phase',
      milestones: ['Increase retirement contributions', 'Consider home ownership', 'Review insurance needs'],
      priority: 'Wealth Building & Family Planning'
    },
    {
      age: 40,
      stage: 'Peak Earning',
      milestones: ['Maximize retirement savings', 'Estate planning', 'College savings if applicable'],
      priority: 'Financial Security & Legacy'
    },
    {
      age: 50,
      stage: 'Pre-Retirement',
      milestones: ['Catch-up contributions', 'Healthcare planning', 'Debt reduction'],
      priority: 'Retirement Preparation'
    },
    {
      age: 60,
      stage: 'Retirement',
      milestones: ['Finalize retirement plan', 'Medicare enrollment', 'Estate distribution plan'],
      priority: 'Legacy & Enjoyment'
    }
  ];

  const nextSteps = [
    {
      title: 'Organize Health Documents',
      description: 'Digitize and categorize all medical records, insurance policies, and prescriptions',
      priority: 'High'
    },
    {
      title: 'Review Financial Accounts',
      description: 'Ensure all pension and savings accounts are properly documented and beneficiaries are updated',
      priority: 'High'
    },
    {
      title: 'Backup Important Photos',
      description: 'Create digital backups of precious memories in multiple secure locations',
      priority: 'Medium'
    },
    {
      title: 'Update Emergency Contacts',
      description: 'Keep contact information current for family, doctors, and legal representatives',
      priority: 'Medium'
    },
    {
      title: 'Strengthen Password Security',
      description: 'Use a dedicated password manager and enable two-factor authentication',
      priority: 'High'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-purple-50 to-blue-50">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-600 text-white rounded-lg">
                <Brain className="w-6 h-6" />
              </div>
              <h2 className="text-gray-900">AI Life Overview</h2>
            </div>
            <p className="text-sm text-gray-500">Intelligent insights and personalized recommendations</p>
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
              <Calendar className="w-5 h-5 text-purple-600" />
              Life Stages & Planning
            </h3>
            <div className="space-y-4">
              {lifeStages.map((stage, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="text-gray-900">Age {stage.age}+ • {stage.stage}</h4>
                      <p className="text-sm text-purple-600 mt-1">Focus: {stage.priority}</p>
                    </div>
                  </div>
                  <ul className="mt-3 space-y-1">
                    {stage.milestones.map((milestone, idx) => (
                      <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                        <span className="text-purple-600 mt-1">•</span>
                        <span>{milestone}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Next Steps */}
          <div>
            <h3 className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Recommended Next Steps
            </h3>
            <div className="space-y-3">
              {nextSteps.map((step, index) => (
                <div key={index} className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-gray-900">{step.title}</h4>
                        <span className={`text-xs px-2 py-1 rounded ${
                          step.priority === 'High' 
                            ? 'bg-red-100 text-red-700' 
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {step.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{step.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Note */}
          <div className="mt-6 p-4 bg-purple-100 border border-purple-200 rounded-xl">
            <p className="text-sm text-purple-900">
              <strong>AI Insight:</strong> This overview is generated based on your stored information and general life planning principles. 
              As you add more data to your personal hub, these recommendations will become more personalized and actionable.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
