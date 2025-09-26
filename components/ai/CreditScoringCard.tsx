
import React from 'react';
import Card from '../common/Card';
import Spinner from '../common/Spinner';
import { useLocalization } from '../../hooks/useLocalization';
import { Customer } from '../../types';
import { UserCheck } from 'lucide-react';

interface CreditScoringCardProps {
    onAssessRisk: () => void;
    isLoading: boolean;
    selectedCustomer: string;
    setSelectedCustomer: (id: string) => void;
    customers: Customer[];
    creditRisk: { riskLevel: string, recommendation: string } | null;
}

const CreditScoringCard: React.FC<CreditScoringCardProps> = ({
    onAssessRisk,
    isLoading,
    selectedCustomer,
    setSelectedCustomer,
    customers,
    creditRisk
}) => {
    const { t } = useLocalization();
    
    const getRiskColor = (level: string) => {
        switch(level.toLowerCase()) {
            case 'low': return 'text-green-500';
            case 'medium': return 'text-yellow-500';
            case 'high': return 'text-red-500';
            default: return 'text-gray-500';
        }
    }

    return (
        <Card className="flex flex-col">
            <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <UserCheck size={24} />
                </div>
                <div>
                    <h3 className="text-lg font-bold">{t('credit_scoring')}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{t('credit_scoring_desc')}</p>
                </div>
            </div>
            <div className="mt-4 flex-grow">
                <select value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)} className="w-full bg-input border border-border rounded-lg p-2">
                    <option value="" disabled>{t('select_customer')}</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {creditRisk && (
                    <div className="mt-2 text-sm p-2 bg-muted/50 rounded-md">
                        <p className="font-bold">{t('risk_level')}: <span className={getRiskColor(creditRisk.riskLevel)}>{creditRisk.riskLevel}</span></p>
                        <p className="text-xs mt-1 text-muted-foreground">{creditRisk.recommendation}</p>
                    </div>
                )}
            </div>
            <div className="mt-4">
                <button onClick={onAssessRisk} disabled={isLoading || !selectedCustomer} className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition-colors disabled:bg-muted disabled:text-muted-foreground flex items-center justify-center gap-2">
                    {isLoading && <Spinner className="w-5 h-5 border-white" />}
                    <span>{isLoading ? t('loading') : t('assess_risk')}</span>
                </button>
            </div>
        </Card>
    );
};

export default CreditScoringCard;
