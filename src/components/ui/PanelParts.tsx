import { ReactNode } from 'react';
import { Edit2, Trash, Download, Eye, FileText, X, ChevronDown, ChevronUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// =============================================================================
// Shared Panel Components
// =============================================================================
// These components enforce consistent look and feel across all panels.
// Each panel still controls its own layout and logic, but uses these
// building blocks for visual consistency.
// =============================================================================

// -----------------------------------------------------------------------------
// Row Actions - Edit/Delete/Download/View buttons
// -----------------------------------------------------------------------------
interface RowActionsProps {
  onEdit?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
  onDownload?: (e: React.MouseEvent) => void;
  onView?: (e: React.MouseEvent) => void;
  size?: 'sm' | 'md';
}

export function RowActions({ onEdit, onDelete, onDownload, onView, size = 'md' }: RowActionsProps) {
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  const buttonSize = size === 'sm' ? 'p-1.5' : 'p-2';

  const handleClick = (handler?: (e: React.MouseEvent) => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    handler?.(e);
  };

  return (
    <div className="flex items-center gap-1">
      {onView && (
        <button
          onClick={handleClick(onView)}
          className={`${buttonSize} hover:bg-white rounded-lg transition-colors text-gray-600`}
          title="View"
        >
          <Eye className={iconSize} />
        </button>
      )}
      {onDownload && (
        <button
          onClick={handleClick(onDownload)}
          className={`${buttonSize} hover:bg-white rounded-lg transition-colors text-green-600`}
          title="Download"
        >
          <Download className={iconSize} />
        </button>
      )}
      {onEdit && (
        <button
          onClick={handleClick(onEdit)}
          className={`${buttonSize} hover:bg-white rounded-lg transition-colors text-blue-600`}
          title="Edit"
        >
          <Edit2 className={iconSize} />
        </button>
      )}
      {onDelete && (
        <button
          onClick={handleClick(onDelete)}
          className={`${buttonSize} hover:bg-white rounded-lg transition-colors text-red-600`}
          title="Delete"
        >
          <Trash className={iconSize} />
        </button>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Type Badge - Colored category badges
// -----------------------------------------------------------------------------
type BadgeColor = 'purple' | 'green' | 'blue' | 'orange' | 'red' | 'cyan' | 'pink' | 'gray' | 'amber' | 'indigo';

interface TypeBadgeProps {
  color: BadgeColor;
  children: ReactNode;
  size?: 'sm' | 'md';
}

const badgeColors: Record<BadgeColor, string> = {
  purple: 'bg-purple-100 text-purple-700',
  green: 'bg-green-100 text-green-700',
  blue: 'bg-blue-100 text-blue-700',
  orange: 'bg-orange-100 text-orange-700',
  red: 'bg-red-100 text-red-700',
  cyan: 'bg-cyan-100 text-cyan-700',
  pink: 'bg-pink-100 text-pink-700',
  gray: 'bg-gray-100 text-gray-700',
  amber: 'bg-amber-100 text-amber-700',
  indigo: 'bg-indigo-100 text-indigo-700',
};

export function TypeBadge({ color, children, size = 'sm' }: TypeBadgeProps) {
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';
  return (
    <span className={`inline-block rounded ${sizeClass} ${badgeColors[color]}`}>
      {children}
    </span>
  );
}

// -----------------------------------------------------------------------------
// Document Chip - Clickable document pills
// -----------------------------------------------------------------------------
interface DocumentChipProps {
  filename: string;
  onClick?: () => void;
  onDelete?: (e: React.MouseEvent) => void;
  color?: 'blue' | 'green' | 'amber';
}

const chipColors = {
  blue: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
  green: 'bg-green-100 text-green-700 hover:bg-green-200',
  amber: 'bg-amber-100 text-amber-700 hover:bg-amber-200',
};

export function DocumentChip({ filename, onClick, onDelete, color = 'blue' }: DocumentChipProps) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={onClick}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-xs ${chipColors[color]}`}
      >
        <FileText className="w-3 h-3" />
        {filename}
      </button>
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(e);
          }}
          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
          title="Remove document"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// List Row - Standard list item structure
// -----------------------------------------------------------------------------
interface ListRowProps {
  icon: LucideIcon;
  iconColor?: 'purple' | 'green' | 'blue' | 'orange' | 'red' | 'cyan' | 'pink' | 'gray' | 'amber' | 'indigo';
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  onClick?: () => void;
  highlighted?: boolean;
  highlightColor?: 'red' | 'orange' | 'yellow';
}

const iconBgColors: Record<string, string> = {
  purple: 'bg-purple-50 text-purple-600',
  green: 'bg-green-50 text-green-600',
  blue: 'bg-blue-50 text-blue-600',
  orange: 'bg-orange-50 text-orange-600',
  red: 'bg-red-50 text-red-600',
  cyan: 'bg-cyan-50 text-cyan-600',
  pink: 'bg-pink-50 text-pink-600',
  gray: 'bg-gray-50 text-gray-600',
  amber: 'bg-amber-50 text-amber-600',
  indigo: 'bg-indigo-50 text-indigo-600',
};

const highlightColors = {
  red: 'bg-red-50',
  orange: 'bg-orange-50',
  yellow: 'bg-yellow-50',
};

export function ListRow({
  icon: Icon,
  iconColor = 'blue',
  title,
  subtitle,
  badge,
  meta,
  actions,
  onClick,
  highlighted,
  highlightColor = 'orange'
}: ListRowProps) {
  return (
    <div
      onClick={onClick}
      className={`px-6 py-3 hover:bg-gray-50 transition-colors flex items-center justify-between group ${
        onClick ? 'cursor-pointer' : ''
      } ${highlighted ? highlightColors[highlightColor] : ''}`}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={`p-2 rounded-lg flex-shrink-0 ${iconBgColors[iconColor]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-gray-900 font-medium truncate">{title}</h3>
            {badge}
          </div>
          {(subtitle || meta) && (
            <div className="flex items-center gap-4 text-sm text-gray-500 mt-0.5">
              {subtitle && <span className="truncate">{subtitle}</span>}
              {meta}
            </div>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-1 flex-shrink-0 ml-4">
          {actions}
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Card - Standard card for grid view
// -----------------------------------------------------------------------------
interface CardProps {
  icon: LucideIcon;
  iconColor?: 'purple' | 'green' | 'blue' | 'orange' | 'red' | 'cyan' | 'pink' | 'gray' | 'amber' | 'indigo';
  title: string;
  badge?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  onClick?: () => void;
  highlighted?: boolean;
  highlightColor?: 'red' | 'orange' | 'yellow';
}

export function Card({
  icon: Icon,
  iconColor = 'blue',
  title,
  badge,
  children,
  actions,
  onClick,
  highlighted,
  highlightColor = 'orange'
}: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all ${
        onClick ? 'cursor-pointer' : ''
      } ${highlighted ? `border-l-4 ${highlightColor === 'red' ? 'border-l-red-500 bg-red-50' : highlightColor === 'orange' ? 'border-l-orange-500 bg-orange-50' : 'border-l-yellow-500 bg-yellow-50'}` : ''}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${iconBgColors[iconColor]}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{title}</h3>
            {badge && <div className="mt-1">{badge}</div>}
          </div>
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Section Header - Collapsible section within a panel
// -----------------------------------------------------------------------------
interface SectionHeaderProps {
  title: string;
  icon?: LucideIcon;
  count?: number;
  badge?: ReactNode;
  isOpen?: boolean;
  onToggle?: () => void;
  actions?: ReactNode;
}

export function SectionHeader({
  title,
  icon: Icon,
  count,
  badge,
  isOpen = true,
  onToggle,
  actions
}: SectionHeaderProps) {
  return (
    <div
      className={`flex items-center justify-between py-3 ${onToggle ? 'cursor-pointer' : ''}`}
      onClick={onToggle}
    >
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-5 h-5 text-gray-600" />}
        <h3 className="font-semibold text-gray-800">{title}</h3>
        {count !== undefined && (
          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
            {count}
          </span>
        )}
        {badge}
        {onToggle && (
          isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </div>
      {actions && (
        <div onClick={(e) => e.stopPropagation()}>
          {actions}
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Empty State - When a list is empty
// -----------------------------------------------------------------------------
interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      <Icon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
      <h3 className="text-gray-500 font-medium">{title}</h3>
      {description && <p className="text-gray-400 text-sm mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Form Field - Consistent form input wrapper
// -----------------------------------------------------------------------------
interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}

export function FormField({ label, required, error, children }: FormFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Panel Header - Top bar of a panel
// -----------------------------------------------------------------------------
interface PanelHeaderProps {
  title: string;
  icon: LucideIcon;
  onClose: () => void;
  actions?: ReactNode;
}

export function PanelHeader({ title, icon: Icon, onClose, actions }: PanelHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl text-white shadow-lg">
          <Icon className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        {actions}
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Add Button - Consistent "Add new" button
// -----------------------------------------------------------------------------
interface AddButtonProps {
  onClick: () => void;
  children: ReactNode;
}

export function AddButton({ onClick, children }: AddButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
    >
      {children}
    </button>
  );
}

// -----------------------------------------------------------------------------
// Search Input - Consistent search box
// -----------------------------------------------------------------------------
interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchInput({ value, onChange, placeholder = 'Search...' }: SearchInputProps) {
  return (
    <div className="relative">
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full md:w-64 pl-4 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
      />
    </div>
  );
}

// -----------------------------------------------------------------------------
// Detail Row - Key-value display in detail views
// -----------------------------------------------------------------------------
interface DetailRowProps {
  label: string;
  value?: string | number | null;
  icon?: LucideIcon;
}

export function DetailRow({ label, value, icon: Icon }: DetailRowProps) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start gap-3 py-2">
      {Icon && <Icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />}
      <div>
        <dt className="text-xs text-gray-500">{label}</dt>
        <dd className="text-gray-900">{value}</dd>
      </div>
    </div>
  );
}
