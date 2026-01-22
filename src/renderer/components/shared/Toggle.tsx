import React from 'react';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Toggle Switch Component
 *
 * @example
 * <Toggle
 *   checked={isEnabled}
 *   onChange={setIsEnabled}
 *   label="Enable Ad Blocking"
 *   description="Block ads and trackers across all websites"
 * />
 */
export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  className = '',
}) => {
  const toggleId = `toggle-${Math.random().toString(36).substr(2, 9)}`;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (!disabled) {
        onChange(!checked);
      }
    }
  };

  return (
    <div className={`flex items-start justify-between ${className}`}>
      <div className="flex-1 mr-4">
        {label && (
          <label
            htmlFor={toggleId}
            className={`block text-sm font-medium ${
              disabled ? 'text-text-muted' : 'text-text-primary'
            } cursor-pointer`}
          >
            {label}
          </label>
        )}
        {description && (
          <p className="mt-1 text-sm text-text-muted">{description}</p>
        )}
      </div>

      <button
        id={toggleId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label || 'Toggle'}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        onKeyDown={handleKeyDown}
        className={`
          relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent
          transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2
          focus:ring-accent-aleo focus:ring-offset-2 focus:ring-offset-bg-primary
          ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
          ${checked ? 'bg-accent-aleo' : 'bg-bg-elevated'}
        `}
      >
        <span
          aria-hidden="true"
          className={`
            pointer-events-none inline-block h-5 w-5 transform rounded-full
            bg-white shadow ring-0 transition duration-200 ease-in-out
            ${checked ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
    </div>
  );
};
