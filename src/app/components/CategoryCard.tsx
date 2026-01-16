import { LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';

interface CategoryCardProps {
  title: string;
  icon: LucideIcon;
  description: string;
  onClick: () => void;
}

export function CategoryCard({ title, icon: Icon, description, onClick }: CategoryCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all border border-gray-100 text-left group"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Icon className="w-6 h-6" />
            </div>
            <h3 className="text-gray-900">{title}</h3>
          </div>
          <p className="text-gray-500 text-sm">{description}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
      </div>
    </button>
  );
}
