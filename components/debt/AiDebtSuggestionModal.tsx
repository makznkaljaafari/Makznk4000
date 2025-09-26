
import React, { useState, useEffect } from 'react';
import { useLocalization } from '../../hooks/useLocalization';
import { useAppStore } from '../../stores/useAppStore';
import { Customer, Sale } from '../../types';
import Card from '../common/Card';
import Spinner from '../common/Spinner';
import { X, Sparkles, Copy, Mail, MessageSquare, Phone } from 'lucide-react';
import { suggestCollectionAction } from '../../services/geminiService';
import { useToast } from '../../contexts/ToastContext';

interface AiDebtSuggestionModalProps {
    isOpen: boolean;
    onClose: () => void;
    customer: Customer | null;
}

const AiDebtSuggestionModal: React.FC<AiDebtSuggestionModalProps> = ({ isOpen, onClose, customer }) => {
    const { t } = useLocalization();
    const { addToast } = useToast();
    const { sales } = useAppStore();
    const [isLoading, setIsLoading] = useState(false);
    const [suggestion, setSuggestion] = useState<{ method: 'email' | 'whatsapp' | 'call', message: string; reason: string } | null>(null);

    useEffect(() => {
        if (isOpen && customer) {
            const fetchSuggestion = async () => {
                setIsLoading(true);
                setSuggestion(null);
                try {
                    const overdueInvoices = sales.filter(s => 
                        s.customerName === customer.name &&
                        s.type === 'credit' &&
                        s.paidAmount < s.total &&
                        s.dueDate && new Date(s.dueDate) < new Date()
                    );
                    const result = await suggestCollectionAction(customer, overdueInvoices);
                    setSuggestion(result);
                } catch (error) {
                    addToast(t((error as Error).message), 'error');
                } finally {
                    setIsLoading(false);
                }
            };
            fetchSuggestion();
        }
    }, [isOpen, customer, sales, addToast, t]);
    
    if (!isOpen) return null;

    const handleCopy = () => {
        if (suggestion?.message) {
            navigator.clipboard.writeText(suggestion.message);
            addToast(t('message_copied'), 'success');
        }
    };

    const getIcon = () => {
        switch (suggestion?.method) {
            case 'email': return <Mail size={24} />;
            case 'whatsapp': return <MessageSquare size={24} />;
            case 'call': return <Phone size={24} />;
            default: return null;
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <Card className="w-full max-w-lg m-4" onClick={e => e.stopPropagation()}>
                 <header className="p-4 border-b border-border flex justify-between items-center">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Sparkles className="text-primary" />
                        {t('ai_debt_suggestion')}
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-full text-muted-foreground hover:bg-accent"><X size={24} /></button>
                </header>
                <div className="p-6 min-h-[300px] flex flex-col justify-center">
                    {isLoading && <div className="flex justify-center"><Spinner className="w-12 h-12" /></div>}
                    {!isLoading && suggestion && (
                        <div className="space-y-4 animate-in fade-in">
                            <div>
                                <h3 className="text-sm font-semibold text-muted-foreground">{t('recommended_method')}</h3>
                                <div className="flex items-center gap-2 text-lg font-bold text-primary">
                                    {getIcon()}
                                    <span>{t(suggestion.method)}</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">{suggestion.reason}</p>
                            </div>
                            <div className="p-4 bg-muted/50 rounded-lg max-h-48 overflow-y-auto">
                                <p className="text-sm whitespace-pre-wrap">{suggestion.message}</p>
                            </div>
                        </div>
                    )}
                     {!isLoading && !suggestion && <p className="text-center text-muted-foreground">{t('no_suggestion_available')}</p>}
                </div>
                 <footer className="p-4 bg-muted/50 border-t border-border flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80">{t('close')}</button>
                    <button onClick={handleCopy} disabled={!suggestion?.message} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50">
                        <Copy size={16}/> {t('copy_message')}
                    </button>
                </footer>
            </Card>
        </div>
    );
};

export default AiDebtSuggestionModal;
