import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-semibold text-warm-600 pl-1"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-warm-400">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`
              w-full rounded-pill border border-blush-200 bg-white
              px-5 py-2.5 text-sm text-warm-700
              placeholder:text-warm-300
              focus:outline-none focus:ring-2 focus:ring-blush-300 focus:border-transparent
              transition-all duration-200
              ${icon ? 'pl-11' : ''}
              ${error ? 'border-red-300 focus:ring-red-300' : ''}
              ${className}
            `}
            {...props}
          />
        </div>
        {error && (
          <p className="text-xs text-red-500 pl-1">{error}</p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
