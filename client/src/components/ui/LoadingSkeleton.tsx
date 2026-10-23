import React from 'react';
import { cn } from '../../utils/cn';

export const LoadingSkeleton: React.FC<{ className?: string; count?: number }> = ({
  className,
  count = 1,
}) => {
  return (
    <div className="space-y-3 w-full animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn('h-10 bg-pearl-200/80 rounded-lg', className)}
        />
      ))}
    </div>
  );
};
