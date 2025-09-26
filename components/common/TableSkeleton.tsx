import React from 'react';

const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div className="space-y-3 animate-pulse">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="bg-muted/50 h-12 rounded-lg w-full"></div>
      ))}
    </div>
  );
};
export default TableSkeleton;