
import React from 'react';
import { useLocalization } from '../../hooks/useLocalization';
import { UpsellSuggestion, Part } from '../../types';
import { useAppStore } from '../../stores/useAppStore';
import Card from '../common/Card';
import Spinner from '../common/Spinner';
import { Sparkles, PlusCircle } from 'lucide-react';

interface AiUpsellSuggestionsProps {
    suggestions: UpsellSuggestion[] | null;
    isLoading: boolean;
    onAddSuggestion: (partId: string) => void;
}

const AiUpsellSuggestions: React.FC<AiUpsellSuggestionsProps> = ({ suggestions, isLoading, onAddSuggestion }) => {
    const { t } = useLocalization();
    const { parts } = useAppStore();
    const partsMap = React.useMemo(() => new Map(parts.map(p => [p.id, p])), [parts]);

    const hasVisibleSuggestions = suggestions && suggestions.length > 0;

    return (
        <Card className="h-full">
            <div className="flex items-center gap-2 mb-4">
                <Sparkles className="text-primary" />
                <h3 className="text-lg font-bold">{t('musaid_suggests')}</h3>
            </div>
            <div className="space-y-3 min-h-[150px] max-h-[150px] overflow-y-auto pr-2">
                {isLoading && (
                    <div className="flex items-center justify-center h-full">
                        <Spinner />
                    </div>
                )}
                {!isLoading && hasVisibleSuggestions && suggestions.map(suggestion => {
                    const part = partsMap.get(suggestion.partId) as Part | undefined;
                    if (!part) return null;

                    return (
                        <div key={part.id} className="p-2 bg-muted/50 rounded-lg flex items-center gap-3">
                            <img src={part.imageUrl} alt={part.name} className="w-12 h-12 object-cover rounded-md" />
                            <div className="flex-grow">
                                <p className="font-semibold text-sm">{part.name}</p>
                                <p className="text-xs text-muted-foreground">{suggestion.reason}</p>
                            </div>
                            <button 
                                onClick={() => onAddSuggestion(part.id)}
                                className="flex-shrink-0 p-2 text-primary hover:text-primary/80 transition-transform hover:scale-110"
                                title={t('add_to_invoice')}
                            >
                                <PlusCircle size={24} />
                            </button>
                        </div>
                    );
                })}
                 {!isLoading && !hasVisibleSuggestions && (
                     <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                        <p>{t('no_suggestions_available')}</p>
                    </div>
                 )}
            </div>
        </Card>
    );
};

export default AiUpsellSuggestions;
