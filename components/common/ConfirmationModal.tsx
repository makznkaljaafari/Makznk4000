import React from 'react';
import { useLocalization } from '../../hooks/useLocalization';
import { X, AlertTriangle } from 'lucide-react';
import Card from './Card';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message, confirmText, cancelText }) => {
  const { t } = useLocalization();

  if (!isOpen) return null;

  const titleId = "confirmation-modal-title";
  const messageId = "confirmation-modal-message";

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4" 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={messageId}
    >
      <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex">
          <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 sm:mx-0 sm:h-10 sm:w-10">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" aria-hidden="true" />
          </div>
          <div className="mt-3 text-center sm:mt-0 sm:ms-4 sm:text-start">
            <h3 className="text-lg leading-6 font-bold text-foreground" id={titleId}>
              {title}
            </h3>
            <div className="mt-2">
              <p className="text-sm text-muted-foreground" id={messageId}>
                {message}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
          <button
            type="button"
            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ms-3 sm:w-auto sm:text-sm"
            onClick={() => { onConfirm(); onClose(); }}
          >
            {confirmText || t('confirm')}
          </button>
          <button
            type="button"
            className="mt-3 w-full inline-flex justify-center rounded-md border border-input shadow-sm px-4 py-2 bg-background text-base font-medium text-foreground hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:mt-0 sm:w-auto sm:text-sm"
            onClick={onClose}
          >
            {cancelText || t('cancel')}
          </button>
        </div>
      </Card>
    </div>
  );
};
export default ConfirmationModal;
