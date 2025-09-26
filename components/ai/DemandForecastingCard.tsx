
import React from 'react';
import Card from '../common/Card';
import Spinner from '../common/Spinner';
import { useLocalization } from '../../hooks/useLocalization';
import { AiPrediction } from '../../types';
import { BarChart2 } from 'lucide-react';

interface DemandForecastingCardProps {
    onGenerate: () => void;
    isLoading: boolean;
    recommendations: AiPrediction[] | null;
}

const DemandForecastingCard: React.FC<DemandForecastingCardProps> = ({ onGenerate, isLoading, recommendations }) => {
    const { t } = useLocalization();

    return (
        <Card className="flex flex-col">
            <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <BarChart2 size={24} />
                </div>
                <div>
                    <h3 className="text-lg font-bold">{t('demand_forecasting')}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{t('demand_forecasting_desc')}</p>
                </div>
            </div>
            <div className="mt-4 flex-grow">
                 {recommendations && (
                    <div className="space-y-2 text-sm max-h-60 overflow-y-auto p-2 bg-muted/50 rounded-md">
                        {recommendations.length > 0 ? recommendations.map(rec => (
                            <div key={rec.partId}>
                            <p className="font-bold">{rec.partName} - {t('stock')}: {rec.recommendedQuantity}</p>
                            <p className="text-xs text-muted-foreground">{rec.reason}</p>
                            </div>
                        )) : <p>{t('no_recommendations')}</p>}
                    </div>
                )}
            </div>
            <div className="mt-4">
                <button onClick={onGenerate} disabled={isLoading} className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition-colors disabled:bg-muted disabled:text-muted-foreground flex items-center justify-center gap-2">
                    {isLoading && <Spinner className="w-5 h-5 border-white" />}
                    <span>{isLoading ? t('loading') : t('generate_recommendations')}</span>
                </button>
            </div>
        </Card>
    );
};

export default DemandForecastingCard;
