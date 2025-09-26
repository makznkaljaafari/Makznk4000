

import React, { useState, useMemo } from 'react';
import { useLocalization } from '../../hooks/useLocalization';
import { useAppStore } from '../../stores/useAppStore';
import { analyzeInventoryHealth } from '../../services/geminiService';
import { InventoryAnalysisResult, InventoryAnalysisItem, Part } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import Card from '../common/Card';
import Spinner from '../common/Spinner';
import { Sparkles, TrendingUp, TrendingDown, PackageX, PackageCheck, BarChart, DollarSign, Zap } from 'lucide-react';

const AnalysisPartCard: React.FC<{ item: InventoryAnalysisItem }> = ({ item }) => {
    const { t } = useLocalization();
    const { parts } = useAppStore();
    const part = parts.find(p => p.id === item.partId);

    if (!part) {
        return (
            <div className="p-2 bg-muted rounded-md text-sm text-muted-foreground">
                {t('part_not_found')}: {item.partId}
            </div>
        );
    }

    return (
        <div className="p-2 bg-background/50 rounded-lg flex items-center gap-3 border border-border">
            <img src={part.imageUrl} alt={part.name} className="w-10 h-10 rounded-md object-cover" />
            <div className="flex-grow">
                <p className="font-semibold text-sm text-foreground">{part.name}</p>
                <p className="text-xs text-muted-foreground">{item.reason}</p>
            </div>
        </div>
    );
};

const AnalysisSection: React.FC<{ title: string; icon: React.ReactNode; items: InventoryAnalysisItem[]; }> = ({ title, icon, items }) => {
    const { t } = useLocalization();
    return (
        <Card>
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2">{icon} {title}</h3>
            {items.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {items.map(item => <AnalysisPartCard key={item.partId} item={item} />)}
                </div>
            ) : (
                <p className="text-sm text-muted-foreground text-center py-4">{t('no_items_in_category')}</p>
            )}
        </Card>
    );
};


const InventoryAnalysis: React.FC = () => {
    const { t } = useLocalization();
    const { addToast } = useToast();
    const { parts, sales, purchaseOrders } = useAppStore();
    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<{ analysis: InventoryAnalysisResult; plan: string; } | null>(null);

    const handleGenerateAnalysis = async () => {
        setIsLoading(true);
        setAnalysisResult(null);
        try {
            const result = await analyzeInventoryHealth(parts, sales, purchaseOrders);
            if (result) {
                setAnalysisResult(result);
            } else {
                throw new Error(t('analysis_error'));
            }
        } catch (error) {
            addToast((error as Error).message, 'error');
        } finally {
            setIsLoading(false);
        }
    };
    
    const formattedPlan = useMemo(() => {
        if (!analysisResult?.plan) return '';
        return analysisResult.plan
            .replace(/\*\*(.*?)\*\*/g, '<strong class="text-primary">$1</strong>')
            .replace(/^- (.*$)/gm, '<li class="ms-4">$1</li>');
    }, [analysisResult]);

    if (isLoading) {
        return (
            <Card className="flex-grow flex flex-col items-center justify-center text-center p-8">
                <Spinner className="w-16 h-16 mb-6" />
                <h2 className="text-2xl font-bold animate-pulse">{t('analysis_in_progress')}</h2>
            </Card>
        );
    }
    
    if (analysisResult) {
        return (
             <div className="h-full overflow-y-auto space-y-6">
                 <Card>
                    <h3 className="text-xl font-bold mb-2 flex items-center gap-2"><BarChart size={20}/> {t('inventory_health_summary')}</h3>
                    <p className="text-muted-foreground">{analysisResult.analysis.summary}</p>
                </Card>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnalysisSection title={t('fast_moving_items_report')} icon={<TrendingUp size={20} className="text-green-500"/>} items={analysisResult.analysis.fastMovingItems}/>
                    <AnalysisSection title={t('slow_moving_items_report')} icon={<TrendingDown size={20} className="text-yellow-500"/>} items={analysisResult.analysis.slowMovingItems}/>
                    <AnalysisSection title={t('dead_stock_report')} icon={<PackageX size={20} className="text-red-500"/>} items={analysisResult.analysis.deadStockItems}/>
                    <AnalysisSection title={t('overstocked_items_report')} icon={<PackageCheck size={20} className="text-blue-500"/>} items={analysisResult.analysis.overstockedItems}/>
                    <AnalysisSection title={t('most_profitable')} icon={<DollarSign size={20} className="text-green-500"/>} items={analysisResult.analysis.profitability.mostProfitable}/>
                    <AnalysisSection title={t('least_profitable')} icon={<DollarSign size={20} className="text-red-500"/>} items={analysisResult.analysis.profitability.leastProfitable}/>
                </div>
                <Card className="bg-primary/5 border-primary/20">
                    <h3 className="text-xl font-bold mb-2 flex items-center gap-2"><Zap size={20}/> {t('improvement_plan')}</h3>
                    <div className="prose prose-sm dark:prose-invert max-w-none text-foreground" dangerouslySetInnerHTML={{ __html: formattedPlan }}></div>
                </Card>
             </div>
        )
    }

    return (
        <Card className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <Sparkles size={40} className="text-primary" />
            </div>
            <h2 className="text-2xl font-bold">{t('ai_inventory_analysis')}</h2>
            <p className="text-muted-foreground mt-2 mb-8 max-w-lg">{t('ai_inventory_analysis_desc')}</p>
            <button
                onClick={handleGenerateAnalysis}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg text-lg font-bold shadow-lg hover:bg-primary/90 transition-transform hover:scale-105"
            >
                <Sparkles size={20} />
                <span>{t('start_analysis')}</span>
            </button>
        </Card>
    );
};

export default InventoryAnalysis;