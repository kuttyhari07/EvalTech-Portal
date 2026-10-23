import React from 'react';
import { Button } from './Button';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-pearl-200 rounded-2xl bg-white/60">
      <div className="w-14 h-14 rounded-2xl bg-pearl-100 flex items-center justify-center text-midnight-600 mb-4 shadow-subtle">
        {icon || <Inbox className="w-7 h-7" />}
      </div>
      <h4 className="text-base font-bold text-midnight-900 tracking-tight">{title}</h4>
      <p className="text-xs text-midnight-600 max-w-sm mt-1 mb-6 leading-relaxed">
        {description}
      </p>
      {actionText && onAction && (
        <Button variant="primary" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
};
