
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title }) => {
  return (
    <div className={`bg-secondary shadow-lg rounded-lg p-6 ${className}`}>
      {title && <h2 className="text-xl font-semibold text-text-main mb-4">{title}</h2>}
      {children}
    </div>
  );
};
    