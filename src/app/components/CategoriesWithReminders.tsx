import { LucideIcon } from 'lucide-react';
import { CategoryCard } from './CategoryCard';
import { useReminders } from '../../hooks/useReminders';

interface Panel {
  id: string;
  title: string;
  icon: LucideIcon;
  description: string;
}

interface CategoriesWithRemindersProps {
  categories: Panel[];
  viewMode: 'grid' | 'list';
  isCategoryVisible: (id: string) => boolean;
  onCategoryClick: (id: string) => void;
}

export function CategoriesWithReminders({
  categories,
  viewMode,
  isCategoryVisible,
  onCategoryClick,
}: CategoriesWithRemindersProps) {
  const reminders = useReminders();

  const getRemindersForPanel = (panelId: string) => {
    switch (panelId) {
      case 'property':
        return reminders.property;
      case 'vehicles':
        return reminders.vehicles;
      case 'health':
        return reminders.health;
      default:
        return { overdue: 0, dueSoon: 0 };
    }
  };

  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.filter(cat => isCategoryVisible(cat.id)).map((category) => {
          const panelReminders = getRemindersForPanel(category.id);
          return (
            <CategoryCard
              key={category.id}
              title={category.title}
              icon={category.icon}
              description={category.description}
              onClick={() => onCategoryClick(category.id)}
              overdue={panelReminders.overdue}
              dueSoon={panelReminders.dueSoon}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
      {categories.filter(cat => isCategoryVisible(cat.id)).map((category) => {
        const Icon = category.icon;
        const panelReminders = getRemindersForPanel(category.id);
        const hasReminders = panelReminders.overdue > 0 || panelReminders.dueSoon > 0;

        return (
          <button
            key={category.id}
            onClick={() => onCategoryClick(category.id)}
            className="w-full px-6 py-3 hover:bg-gray-50 transition-colors text-left flex items-center justify-between group"
          >
            <div className="flex items-center gap-3 flex-1">
              <div className={`p-2 rounded-lg ${
                panelReminders.overdue > 0
                  ? 'bg-red-50 text-red-600'
                  : panelReminders.dueSoon > 0
                  ? 'bg-orange-50 text-orange-600'
                  : 'bg-blue-50 text-blue-600'
              }`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-gray-900 font-medium">{category.title}</span>
              <span className="text-gray-500 text-sm">{category.description}</span>
              {hasReminders && (
                <div className="flex items-center gap-1 ml-2">
                  {panelReminders.overdue > 0 && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                      {panelReminders.overdue} overdue
                    </span>
                  )}
                  {panelReminders.dueSoon > 0 && (
                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                      {panelReminders.dueSoon} due soon
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="text-gray-400 group-hover:text-blue-600 transition-colors">→</div>
          </button>
        );
      })}
    </div>
  );
}
