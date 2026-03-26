import { forwardRef, type TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={textareaId}
            className="text-sm font-semibold text-warm-600 pl-1"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={`
            w-full rounded-card border border-blush-200 bg-white
            px-5 py-3 text-sm text-warm-700
            placeholder:text-warm-300
            focus:outline-none focus:ring-2 focus:ring-blush-300 focus:border-transparent
            transition-all duration-200 resize-y min-h-[80px]
            ${error ? 'border-red-300 focus:ring-red-300' : ''}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="text-xs text-red-500 pl-1">{error}</p>
        )}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';
