import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = React.memo(({ children, className = '', ...props }) => {
  return (
    <div
      className={`bg-card text-card-foreground rounded-xl border border-border shadow-sm p-4 sm:p-6 transition-all duration-300 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});

export default Card;
