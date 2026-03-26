import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-warm-900/20 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div
        className={`
          relative bg-white rounded-card shadow-lifted
          w-full ${sizeClasses[size]}
          max-h-[85vh] overflow-y-auto
          animate-in zoom-in-95 fade-in duration-200
        `}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-blush-100">
            <h2 className="text-lg font-bold text-warm-700">{title}</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-blush-100 text-warm-400 hover:text-warm-600 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
