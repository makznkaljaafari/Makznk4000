
import React from 'react';
import { useLocalization } from '../../hooks/useLocalization';
import Card from '../common/Card';
import { X, Sparkles, Check } from 'lucide-react';
import { Part } from '../../types';

interface AiPriceSuggestionModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: { part: Part; suggestion: { suggestedPrice: number; reason: string; } } | null;
    onApply: (partId: string, newPrice: number) => void;
}

const AiPriceSuggestionModal: React.FC<AiPriceSuggestionModalProps> = ({ isOpen, onClose, data, onApply }) => {
    const { t, lang } = useLocalization();

    if (!isOpen || !data) return null;

    const { part, suggestion } = data;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4" onClick={onClose}>
            <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                <header className="flex justify-between items-center pb-4 border-b border-border">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Sparkles className="text-primary" />
                        {t('ai_price_suggestion')}
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-full text-muted-foreground hover:bg-accent"><X size={24} /></button>
                </header>

                <div className="p-6 space-y-4">
                    <div className="text-center">
                        <p className="text-sm text-muted-foreground">{t('suggested_selling_price')} for "{part.name}"</p>
                        <p className="text-5xl font-bold text-primary font-orbitron my-2">
                            {suggestion.suggestedPrice.toLocaleString('en-US')}
                             <span className="text-2xl ms-2">{lang === 'ar' ? 'р.с' : 'SAR'}</span>
                        </p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm font-semibold mb-1">{t('reason')}:</p>
                        <p className="text-sm text-muted-foreground">{suggestion.reason}</p>
                    </div>
                </div>

                <footer className="p-4 bg-muted/50 border-t border-border flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80">{t('cancel')}</button>
                    <button
                        onClick={() => onApply(part.id, suggestion.suggestedPrice)}
                        className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2"
                    >
                        <Check size={18} />
                        {t('apply_price')}
                    </button>
                </footer>
            </Card>
        </div>
    );
};

export default AiPriceSuggestionModal;
