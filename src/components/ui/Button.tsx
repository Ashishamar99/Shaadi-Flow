import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  loading?: boolean;
  icon?: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-blush-300 text-warm-700 hover:bg-blush-400 active:bg-blush-500 active:text-white',
  secondary:
    'bg-mint-200 text-warm-700 hover:bg-mint-300 active:bg-mint-400',
  ghost:
    'bg-transparent text-warm-600 hover:bg-blush-100 active:bg-blush-200',
  danger:
    'bg-red-100 text-red-700 hover:bg-red-200 active:bg-red-300',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-4 py-1.5 text-sm',
  md: 'px-6 py-2.5 text-sm',
  lg: 'px-8 py-3 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  loading,
  icon,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2
        rounded-pill font-semibold
        transition-all duration-200 ease-out
        hover:scale-[1.02] hover:shadow-soft
        active:scale-[0.98]
        disabled:opacity-50 disabled:pointer-events-none
        cursor-pointer
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  );
}
