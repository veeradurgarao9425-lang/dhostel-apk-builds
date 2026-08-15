import React from 'react';
import clsx from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
}

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> & {
  Header: React.FC<CardHeaderProps>;
  Body: React.FC<CardBodyProps>;
  Footer: React.FC<CardFooterProps>;
} = ({ children, className, padding = 'md' }) => {
  const paddingClasses = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-8',
  };

  return (
    <div
      className={clsx(
        'premium-card',
        paddingClasses[padding],
        className
      )}
    >
      {children}
    </div>
  );
};

Card.Header = ({ children, className }) => (
  <div className={clsx('border-b border-gray-200/50 dark:border-gray-700/50 pb-4 mb-4', className)}>
    {children}
  </div>
);

Card.Body = ({ children, className }) => (
  <div className={className}>{children}</div>
);

Card.Footer = ({ children, className }) => (
  <div className={clsx('border-t border-gray-200/50 dark:border-gray-700/50 pt-4 mt-4', className)}>
    {children}
  </div>
);
