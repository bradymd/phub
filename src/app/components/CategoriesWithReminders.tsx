import { useState, useEffect, useRef } from 'react';
import { LucideIcon } from 'lucide-react';
import { CategoryCard } from './CategoryCard';
import { useReminders } from '../../hooks/useReminders';
import { usePanelUsage } from '../../hooks/usePanelUsage';
import { PanelColor } from '../../config/panels';

interface Panel {
  id: string;
  title: string;
  icon: LucideIcon;
  description: string;
  color: PanelColor;
}

interface CategoriesWithRemindersProps {
  categories: Panel[];
  viewMode: 'grid' | 'list';
  isCategoryVisible: (id: string) => boolean;
  onCategoryClick: (id: string) => void;
  searchActive?: boolean;
}

export function CategoriesWithReminders({
  categories,
  viewMode,
  isCategoryVisible,
  onCategoryClick,
  searchActive = false,
}: CategoriesWithRemindersProps) {
  const reminders = useReminders();
  const { recordPanelAccess, getUsageScore, isLoaded } = usePanelUsage();

  // Store the initial sort order so it doesn't change during the session
  const [sortedOrder, setSortedOrder] = useState<string[]>([]);
  const hasSortedWithReminders = useRef(false);

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
      case 'holidayplans':
        return reminders.holidayplans;
      default:
        return { overdue: 0, dueSoon: 0 };
    }
  };

  // Check if a panel has active reminders (overdue or due soon)
  const panelHasReminders = (panelId: string) => {
    const r = getRemindersForPanel(panelId);
    return r.overdue > 0 || r.dueSoon > 0;
  };

  // A panel should be shown if:
  // - Search is active (show ALL panels)
  // - It's explicitly visible
  // - It has reminders
  const shouldShowPanel = (panelId: string) => {
    return searchActive || isCategoryVisible(panelId) || panelHasReminders(panelId);
  };

  // Check if reminders have loaded (any panel has non-zero values)
  const remindersLoaded =
    reminders.property.overdue > 0 || reminders.property.dueSoon > 0 ||
    reminders.vehicles.overdue > 0 || reminders.vehicles.dueSoon > 0 ||
    reminders.health.overdue > 0 || reminders.health.dueSoon > 0 ||
    reminders.dental.overdue > 0 || reminders.dental.dueSoon > 0 ||
    reminders.pets.overdue > 0 || reminders.pets.dueSoon > 0 ||
    reminders.holidayplans.overdue > 0 || reminders.holidayplans.dueSoon > 0;

  // Compute sort order once when both usage data AND reminders are loaded
  useEffect(() => {
    if (!isLoaded || categories.length === 0) return;

    // Sort once initially, then re-sort once when reminders load (if they have data)
    const shouldSort = sortedOrder.length === 0 || (remindersLoaded && !hasSortedWithReminders.current);

    if (!shouldSort) return;

    if (remindersLoaded) {
      hasSortedWithReminders.current = true;
    }

    const sorted = [...categories]
      .filter(cat => shouldShowPanel(cat.id))
      .sort((a, b) => {
        const remindersA = getRemindersForPanel(a.id);
        const remindersB = getRemindersForPanel(b.id);

        // Priority 1: Overdue items
        if (remindersA.overdue !== remindersB.overdue) {
          return remindersB.overdue - remindersA.overdue;
        }

        // Priority 2: Due soon items
        if (remindersA.dueSoon !== remindersB.dueSoon) {
          return remindersB.dueSoon - remindersA.dueSoon;
        }

        // Priority 3: Usage frequency
        const usageA = getUsageScore(a.id);
        const usageB = getUsageScore(b.id);
        if (usageA !== usageB) {
          return usageB - usageA;
        }

        // Final fallback: alphabetical
        return a.title.localeCompare(b.title);
      })
      .map(cat => cat.id);

    setSortedOrder(sorted);
  }, [isLoaded, categories, remindersLoaded]);

  // Handle click: record usage (for next session) and call the parent handler
  const handleCategoryClick = (id: string) => {
    // Record usage for next session's sort order
    recordPanelAccess(id);
    // Open the panel
    onCategoryClick(id);
  };

  // Use the stable sort order, but handle visibility changes
  // Include panels with reminders even if they're hidden
  const visibleCategories = categories.filter(cat => shouldShowPanel(cat.id));

  // If we have a cached sort order, use it; otherwise fall back to default order
  const sortedCategories = sortedOrder.length > 0
    ? sortedOrder
        .map(id => visibleCategories.find(cat => cat.id === id))
        .filter((cat): cat is Panel => cat !== undefined)
        // Add any new panels that weren't in the original sort order
        .concat(visibleCategories.filter(cat => !sortedOrder.includes(cat.id)))
    : visibleCategories;

  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedCategories.map((category) => {
          const panelReminders = getRemindersForPanel(category.id);
          const isHidden = !isCategoryVisible(category.id) && !panelHasReminders(category.id);
          return (
            <CategoryCard
              key={category.id}
              title={category.title}
              icon={category.icon}
              description={category.description}
              onClick={() => handleCategoryClick(category.id)}
              overdue={panelReminders.overdue}
              dueSoon={panelReminders.dueSoon}
              color={category.color}
              isHidden={searchActive && isHidden}
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
