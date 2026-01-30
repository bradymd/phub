import { LucideIcon } from 'lucide-react';
import { CategoryCard } from './CategoryCard';
import { useReminders } from '../../hooks/useReminders';
import { usePanelUsage } from '../../hooks/usePanelUsage';

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
  const { recordPanelAccess, getUsageScore } = usePanelUsage();

  const getRemindersForPanel = (panelId: string) => {
    switch (panelId) {
      case 'property':
        return reminders.property;
      case 'vehicles':
        return reminders.vehicles;
      case 'health':
        return reminders.health;
      case 'dental':
        return reminders.dental;
      case 'pets':
        return reminders.pets;
      default:
        return { overdue: 0, dueSoon: 0 };
    }
  };

  // Handle click: record usage and call the parent handler
  const handleCategoryClick = (id: string) => {
    recordPanelAccess(id);
    onCategoryClick(id);
  };

  // Sort categories: alerts first (overdue, then due soon), then by usage frequency
  const sortedCategories = [...categories]
    .filter(cat => isCategoryVisible(cat.id))
    .sort((a, b) => {
      const remindersA = getRemindersForPanel(a.id);
      const remindersB = getRemindersForPanel(b.id);

      // Priority 1: Overdue items (higher overdue count = higher priority)
      if (remindersA.overdue !== remindersB.overdue) {
        return remindersB.overdue - remindersA.overdue;
      }

      // Priority 2: Due soon items (higher due soon count = higher priority)
      if (remindersA.dueSoon !== remindersB.dueSoon) {
        return remindersB.dueSoon - remindersA.dueSoon;
      }

      // Priority 3: Usage frequency (higher score = higher priority)
      const usageA = getUsageScore(a.id);
      const usageB = getUsageScore(b.id);
      if (usageA !== usageB) {
        return usageB - usageA;
      }

      // Final fallback: alphabetical by title
      return a.title.localeCompare(b.title);
    });

  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedCategories.map((category) => {
          const panelReminders = getRemindersForPanel(category.id);
          return (
            <CategoryCard
              key={category.id}
              title={category.title}
              icon={category.icon}
              description={category.description}
              onClick={() => handleCategoryClick(category.id)}
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
      {sortedCategories.map((category) => {
        const Icon = category.icon;
        const panelReminders = getRemindersForPanel(category.id);
        const hasReminders = panelReminders.overdue > 0 || panelReminders.dueSoon > 0;

        return (
          <button
            key={category.id}
            onClick={() => handleCategoryClick(category.id)}
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
