
import React from 'react';
import { useLocalization } from '../../hooks/useLocalization';
import { X, Sparkles } from 'lucide-react';
import Card from '../common/Card';
import Spinner from '../common/Spinner';

interface SalesPitchModalProps {
    isOpen: boolean;
    onClose: () => void;
    isLoading: boolean;
    content: string | null;
    partName: string | null;
}

const SalesPitchModal: React.FC<SalesPitchModalProps> = ({ isOpen, onClose, isLoading, content, partName }) => {
    const { t } = useLocalization();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4" onClick={onClose}>
            <Card className="w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center pb-4 border-b border-border">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Sparkles className="text-primary" />
                        {t('sales_pitch_for')} {partName}
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-full text-muted-foreground hover:bg-accent">
                        <X size={24} />
                    </button>
                </header>

                <div className="p-6 min-h-[150px] flex items-center justify-center">
                    {isLoading ? (
                        <Spinner className="w-10 h-10" />
                    ) : (
                        <p className="text-lg text-center leading-relaxed text-foreground">
                            {content}
                        </p>
                    )}
                </div>

                <footer className="pt-4 border-t border-border flex justify-end">
                    <button onClick={onClose} className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg hover:bg-muted">
                        {t('close')}
                    </button>
                </footer>
            </Card>
        </div>
    );
};

export default SalesPitchModal;
