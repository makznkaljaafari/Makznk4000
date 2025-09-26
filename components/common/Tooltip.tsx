import React, { useState } from 'react';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
}

const Tooltip: React.FC<TooltipProps> = ({ text, children }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div
      className="relative flex items-center group"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs p-2 bg-popover text-popover-foreground text-xs rounded-md shadow-lg z-10 border border-border transition-opacity duration-300 pointer-events-none ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
        {text}
      </div>
    </div>
  );
};

export default Tooltip;
