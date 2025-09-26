
import React, { useState } from 'react';
import { useLocalization } from '../../hooks/useLocalization';
import { useAppStore } from '../../stores/useAppStore';
import { analyzeInvoices } from '../../services/geminiService';
import { InvoiceAnalysisResult } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import Card from '../common/Card';
import Spinner from '../common/Spinner';
import { Sparkles, BarChart, Users, Package, TrendingUp } from 'lucide-react';

const SalesAnalysis: React.FC = () => {
    const { t } = useLocalization();
    const { addToast } = useToast();
    const { sales, parts, customers } = useAppStore();
    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<InvoiceAnalysisResult | null>(null);

    const handleGenerateAnalysis = async () => {
        setIsLoading(true);
        setAnalysisResult(null);
        try {
            const result = await analyzeInvoices(sales, parts, customers);
            if (result) {
                setAnalysisResult(result);
            } else {
                throw new Error(t('failed_to_generate_analysis'));
            }
        } catch (error) {
            addToast((error as Error).message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const renderReport = () => {
        if (!analysisResult) return null;
        
        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <Card>
                    <h3 className="text-xl font-bold mb-2 flex items-center gap-2"><BarChart size={20}/> {t('overall_summary')}</h3>
                    <p className="text-muted-foreground">{analysisResult.summary}</p>
                </Card>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Sparkles size={20}/> {t('key_insights')}</h3>
                        <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                            {analysisResult.keyInsights.map((insight, index) => <li key={index}>{insight}</li>)}
                        </ul>
                    </Card>
                    <Card>
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><TrendingUp size={20}/> {t('opportunities_and_recommendations')}</h3>
                        <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                            {analysisResult.opportunities.map((opp, index) => <li key={index}>{opp}</li>)}
                        </ul>
                    </Card>
                    <Card>
                         <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Package size={20}/> {t('top_selling_products_by_revenue')}</h3>
                         <div className="space-y-3">
                            {analysisResult.topProducts.map((product, index) => (
                                <div key={index} className="flex justify-between items-center text-sm">
                                    <span className="font-medium">{product.name}</span>
                                    <div className="text-right">
                                        <p className="font-bold text-primary">{product.revenue.toLocaleString()} {t('saudi_riyal')}</p>
                                        <p className="text-xs text-muted-foreground">{t('quantity_sold')}: {product.quantity}</p>
                                    </div>
                                </div>
                            ))}
                         </div>
                    </Card>
                    <Card>
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Users size={20}/> {t('top_customers_by_revenue')}</h3>
                         <div className="space-y-3">
                            {analysisResult.topCustomers.map((customer, index) => (
                                 <div key={index} className="flex justify-between items-center text-sm">
                                    <span className="font-medium">{customer.name}</span>
                                     <p className="font-bold text-primary">{customer.revenue.toLocaleString()} {t('saudi_riyal')}</p>
                                </div>
                            ))}
                         </div>
                    </Card>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col gap-4">
            {!analysisResult && !isLoading && (
                 <Card className="flex-grow flex flex-col items-center justify-center text-center p-8">
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                        <Sparkles size={40} className="text-primary"/>
                    </div>
                    <h2 className="text-2xl font-bold">{t('ai_powered_sales_analysis')}</h2>
                    <p className="text-muted-foreground mt-2 mb-8 max-w-lg">{t('ai_analysis_desc')}</p>
                    <button 
                        onClick={handleGenerateAnalysis}
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg text-lg font-bold shadow-lg hover:bg-primary/90 transition-transform hover:scale-105"
                    >
                        <Sparkles size={20}/>
                        <span>{t('generate_ai_analysis')}</span>
                    </button>
                </Card>
            )}
            
            {isLoading && (
                 <Card className="flex-grow flex flex-col items-center justify-center text-center p-8">
                    <Spinner className="w-16 h-16 mb-6"/>
                    <h2 className="text-2xl font-bold animate-pulse">{t('analysis_in_progress')}</h2>
                </Card>
            )}
            
            <div className="overflow-y-auto">
                 {renderReport()}
            </div>
        </div>
    );
};

export default SalesAnalysis;
