import React from 'react';
import Card from './Card';

const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <Card className={`animate-pulse ${className}`}>
        <div className="h-5 bg-muted rounded w-3/4 mb-4"></div>
        <div className="h-8 bg-muted rounded w-1/2"></div>
    </Card>
  );
};

export default CardSkeleton;