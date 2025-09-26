import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { ToastMessage } from '../../contexts/ToastContext';

interface ToastProps extends ToastMessage {
  onDismiss: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 5000); // Auto-dismiss after 5 seconds

    return () => {
      clearTimeout(timer);
    };
  }, [onDismiss]);

  const typeStyles = {
    success: {
      icon: <CheckCircle className="text-green-500" size={24} />,
      barClass: 'bg-green-500',
    },
    error: {
      icon: <AlertCircle className="text-red-500" size={24} />,
      barClass: 'bg-red-500',
    },
    info: {
      icon: <Info className="text-blue-500" size={24} />,
      barClass: 'bg-blue-500',
    },
    warning: {
      icon: <AlertTriangle className="text-yellow-500" size={24} />,
      barClass: 'bg-yellow-500',
    },
  };

  const { icon, barClass } = typeStyles[type];

  return (
    <div
      className="bg-card text-card-foreground rounded-lg shadow-2xl w-full overflow-hidden animate-in slide-in-from-top-5"
      role="alert"
    >
      <div className="flex items-start p-4">
        <div className="flex-shrink-0">{icon}</div>
        <div className="ms-3 flex-1 pt-0.5">
          <p className="text-sm font-medium text-foreground">{message}</p>
        </div>
        <div className="ms-4 flex-shrink-0 flex">
          <button
            onClick={onDismiss}
            className="rounded-md inline-flex text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <span className="sr-only">Close</span>
            <X size={20} />
          </button>
        </div>
      </div>
      <div className={`h-1 ${barClass} w-full`}></div>
    </div>
  );
};

export default Toast;
