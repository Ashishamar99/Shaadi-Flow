import type { ReactNode } from 'react';

type BadgeVariant = 'blush' | 'mint' | 'warm' | 'red' | 'amber' | 'blue';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  blush: 'bg-blush-100 text-blush-600',
  mint: 'bg-mint-100 text-mint-600',
  warm: 'bg-warm-100 text-warm-600',
  red: 'bg-red-50 text-red-600',
  amber: 'bg-amber-50 text-amber-700',
  blue: 'bg-blue-50 text-blue-600',
};

export function Badge({ children, variant = 'blush', className = '' }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center px-3 py-0.5 rounded-pill
        text-xs font-semibold
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}

const rsvpBadgeMap: Record<string, { variant: BadgeVariant; label: string }> = {
  not_invited: { variant: 'warm', label: 'Not Invited' },
  invited: { variant: 'blue', label: 'Invited' },
  pending: { variant: 'amber', label: 'RSVP Pending' },
  confirmed: { variant: 'mint', label: 'Confirmed' },
  declined: { variant: 'red', label: 'Declined' },
};

export function RsvpBadge({ status }: { status: string }) {
  const config = rsvpBadgeMap[status] ?? { variant: 'warm' as const, label: status };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

const priorityBadgeMap: Record<string, { variant: BadgeVariant; label: string }> = {
  vip: { variant: 'blush', label: 'VIP' },
  normal: { variant: 'warm', label: 'Normal' },
  optional: { variant: 'warm', label: 'Optional' },
};

export function PriorityBadge({ priority }: { priority: string }) {
  const config = priorityBadgeMap[priority] ?? { variant: 'warm' as const, label: priority };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
