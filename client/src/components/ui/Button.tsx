import React from 'react';
import { cn } from '../../utils/cn';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'electric';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  leftIcon,
  rightIcon,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2.5 gap-2',
    lg: 'text-base px-6 py-3.5 gap-2.5 font-semibold',
  };

  const variantStyles = {
    primary:
      'bg-indigo-brand hover:bg-indigo-dark text-white shadow-sm hover:shadow-card focus:ring-indigo-brand active:scale-[0.98]',
    secondary:
      'bg-midnight-800 hover:bg-midnight-700 text-pearl-100 border border-midnight-700 focus:ring-midnight-600',
    outline:
      'bg-transparent hover:bg-pearl-100 text-midnight-800 border border-pearl-300 focus:ring-indigo-brand',
    ghost:
      'bg-transparent hover:bg-pearl-100 text-midnight-700 hover:text-midnight-900 focus:ring-pearl-200',
    danger:
      'bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500 active:scale-[0.98]',
    electric:
      'bg-gradient-to-r from-indigo-brand via-electric-violet to-electric-blue text-white shadow-glow hover:opacity-95 focus:ring-electric-violet active:scale-[0.98]',
  };

  return (
    <button
      className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <>
          {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};
