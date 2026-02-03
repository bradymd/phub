import { LucideIcon } from 'lucide-react';
import { ChevronRight, AlertCircle, Calendar } from 'lucide-react';
import { PanelColor } from '../../config/panels';

interface CategoryCardProps {
  title: string;
  icon: LucideIcon;
  description: string;
  onClick: () => void;
  overdue?: number;
  dueSoon?: number;
  color?: PanelColor;
  isHidden?: boolean;
}

// Map panel colors to actual hex values (avoids Tailwind purge issues)
const colorValues: Record<PanelColor, string> = {
  amber: '#f59e0b',
  indigo: '#6366f1',
  blue: '#3b82f6',
  rose: '#f43f5e',
  teal: '#14b8a6',
  sky: '#0ea5e9',
  slate: '#64748b',
  emerald: '#10b981',
  orange: '#f97316',
  cyan: '#06b6d4',
  purple: '#a855f7',
  green: '#22c55e',
  pink: '#ec4899',
};

// Gradient values for panels - light to dark matching panel headers
const gradientValues: Record<PanelColor, string> = {
  amber: 'linear-gradient(to right, #f59e0b, #b45309)',   // amber-500 to amber-700
  indigo: 'linear-gradient(to right, #6366f1, #4338ca)',  // indigo-500 to indigo-700
  blue: 'linear-gradient(to right, #3b82f6, #1d4ed8)',    // blue-500 to blue-700
  rose: 'linear-gradient(to right, #f43f5e, #be123c)',    // rose-500 to rose-700
  teal: 'linear-gradient(to right, #14b8a6, #0f766e)',    // teal-500 to teal-700
  sky: 'linear-gradient(to right, #0ea5e9, #0369a1)',     // sky-500 to sky-700
  slate: 'linear-gradient(to right, #475569, #1e293b)',   // slate-600 to slate-800
  emerald: 'linear-gradient(to right, #10b981, #047857)', // emerald-500 to emerald-700
  orange: 'linear-gradient(to right, #f97316, #c2410c)', // orange-500 to orange-700
  cyan: 'linear-gradient(to right, #06b6d4, #0e7490)',    // cyan-500 to cyan-700
  purple: 'linear-gradient(to right, #a855f7, #7c3aed)',  // purple-500 to purple-700
  green: 'linear-gradient(to right, #22c55e, #15803d)',   // green-500 to green-700
  pink: 'linear-gradient(to right, #ec4899, #be185d)',    // pink-500 to pink-700
};

export function CategoryCard({ title, icon: Icon, description, onClick, overdue = 0, dueSoon = 0, color = 'blue', isHidden = false }: CategoryCardProps) {
  const hasReminders = overdue > 0 || dueSoon > 0;

  return (
    <button
      onClick={onClick}
      className="w-full h-full bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 text-left group overflow-hidden flex flex-col"
    >
      <div className="p-6 flex-1">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg ${overdue > 0 ? 'bg-red-50 text-red-600' : dueSoon > 0 ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="text-gray-900">{title}</h3>
              {isHidden && (
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                  Hidden
                </span>
              )}
              {hasReminders && (
                <div className="flex items-center gap-1">
                  {overdue > 0 && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                      <AlertCircle className="w-3 h-3" />
                      {overdue}
                    </span>
                  )}
                  {dueSoon > 0 && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                      <Calendar className="w-3 h-3" />
                      {dueSoon}
                    </span>
                  )}
                </div>
              )}
            </div>
            <p className="text-gray-500 text-sm">{description}</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
        </div>
      </div>
      {/* Bottom accent bar */}
      <div
        className="h-1 flex-shrink-0"
        style={{ background: gradientValues[color] }}
      />
    </button>
  );
}
