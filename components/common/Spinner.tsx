
import React from 'react';

const Spinner: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={`animate-spin rounded-full h-8 w-8 border-b-2 border-primary ${className}`}
    ></div>
  );
};

export default Spinner;