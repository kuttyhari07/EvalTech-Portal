import React from 'react';
import { cn } from '../../utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, leftIcon, rightIcon, id, ...props }, ref) => {
    const inputId = id || props.name || Math.random().toString(36).substring(2, 9);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-midnight-700">
            {label}
          </label>
        )}
        <div className="relative rounded-lg shadow-subtle">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-midnight-600">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              'w-full rounded-lg border border-pearl-300 bg-white px-3.5 py-2.5 text-sm text-midnight-900 placeholder:text-midnight-600/60 focus:border-indigo-brand focus:outline-none focus:ring-2 focus:ring-indigo-brand/20 transition-all duration-150 disabled:bg-pearl-100 disabled:cursor-not-allowed',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              error && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-midnight-600">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="text-xs font-medium text-rose-600 animate-fadeIn">{error}</p>}
        {helperText && !error && <p className="text-xs text-midnight-600">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
