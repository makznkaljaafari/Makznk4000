import React from 'react';
import { useLocalization } from '../../hooks/useLocalization';
import { DynamicPricingSuggestion } from '../../types';
import Spinner from '../common/Spinner';
import { Sparkles, Percent } from 'lucide-react';

interface AiPricingSuggestionProps {
    suggestion: DynamicPricingSuggestion | null;
    isLoading: boolean;
    onApply: (discount: number) => void;
}

const AiPricingSuggestion: React.FC<AiPricingSuggestionProps> = ({ suggestion, isLoading, onApply }) => {
    const { t } = useLocalization();

    if (isLoading) {
        return (
            <div className="p-3 bg-muted/50 rounded-lg flex items-center justify-center gap-2 text-sm text-muted-foreground animate-pulse">
                <Spinner className="w-4 h-4" />
                <span>{t('musaid_is_thinking')}...</span>
            </div>
        );
    }
    
    if (!suggestion || suggestion.discountPercentage <= 0) {
        return null;
    }

    return (
        <div className="p-3 bg-primary/10 rounded-lg flex items-center justify-between gap-4 border-l-4 border-primary/50 animate-in fade-in">
            <div className="flex items-center gap-3">
                 <Sparkles className="text-primary flex-shrink-0" size={20}/>
                 <p className="text-sm text-foreground font-medium">{suggestion.reason}</p>
            </div>
            <button
                onClick={() => onApply(suggestion.discountPercentage)}
                className="flex-shrink-0 flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition-colors text-sm font-bold"
            >
                <Percent size={16}/>
                <span>{t('apply_discount')} {suggestion.discountPercentage}%</span>
            </button>
        </div>
    );
};

export default AiPricingSuggestion;
