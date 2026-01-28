import React from 'react';

interface DateInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  label?: string;
  required?: boolean;
}

/**
 * A date input component that uses HTML5 date input with calendar picker
 * Now that locale issues are resolved, we can use the native date picker
 */
export function DateInput({
  value,
  onChange,
  placeholder = "DD/MM/YYYY",
  className = "w-full px-3 py-2 border border-gray-300 rounded-lg",
  label,
  required = false
}: DateInputProps) {

  // Ensure value is in YYYY-MM-DD format for HTML5 date input
  const formatForInput = (dateStr: string): string => {
    if (!dateStr) return '';

    // If already in YYYY-MM-DD format, return as-is
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateStr;
    }

    // Convert from DD/MM/YYYY to YYYY-MM-DD if needed
    if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [day, month, year] = dateStr.split('/');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    return '';
  };

  // Handle input changes - store directly in YYYY-MM-DD format
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div>
      {label && (
        <label className="block text-sm text-gray-600 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        type="date"
        value={formatForInput(value)}
        onChange={handleChange}
        className={className}
        required={required}
      />
    </div>
  );
}

export default DateInput;