import React from 'react';
import Card from '../common/Card';
import Spinner from '../common/Spinner';
import { useLocalization } from '../../hooks/useLocalization';
import { Sparkles, RefreshCw, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';

interface AiInsightsCardProps {
    insights: string[] | null;
    isLoading: boolean;
    onRefresh: () => void;
}

const AiInsightsCard: React.FC<AiInsightsCardProps> = ({ insights, isLoading, onRefresh }) => {
    const { t } = useLocalization();

    const getInsightIcon = (insightText: string) => {
        const lowerText = insightText.toLowerCase();
        if (lowerText.includes('نفاد') || lowerText.includes('منخفض') || lowerText.includes('اقترب')) {
            return <AlertTriangle size={18} className="text-amber-500 flex-shrink-0" />;
        }
        if (lowerText.includes('أعلى') || lowerText.includes('زيادة')) {
            return <TrendingUp size={18} className="text-green-500 flex-shrink-0" />;
        }
        return <CheckCircle size={18} className="text-blue-500 flex-shrink-0" />;
    };

    return (
        <Card className="bg-primary/5 border-primary/20">
            <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-bold flex items-center gap-2 text-primary">
                    <Sparkles size={20} />
                    {t('ai_insights')}
                </h2>
                <button onClick={onRefresh} disabled={isLoading} className="p-1.5 rounded-full text-muted-foreground hover:bg-accent disabled:opacity-50">
                    <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                </button>
            </div>
            <div className="space-y-3">
                {isLoading && (
                    <div className="flex items-center justify-center p-4">
                        <Spinner />
                    </div>
                )}
                {!isLoading && insights && insights.length > 0 && (
                    insights.map((insight, index) => (
                        <div key={index} className="flex items-start gap-3 p-2 bg-background/50 rounded-md">
                            {getInsightIcon(insight)}
                            <p className="text-sm text-foreground">{insight}</p>
                        </div>
                    ))
                )}
                {!isLoading && (!insights || insights.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center p-4">{t('no_insights_found')}</p>
                )}
            </div>
        </Card>
    );
};

export default AiInsightsCard;
