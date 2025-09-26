



import React from 'react';
import Card from '../common/Card';
import Spinner from '../common/Spinner';
import { useLocalization } from '../../hooks/useLocalization';
import { PartSearchAgentParams } from '../../types';
import { Bot } from 'lucide-react';

interface PartSearchAgentCardProps {
    onSearch: () => void;
    isLoading: boolean;
    formState: PartSearchAgentParams;
    onFormChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
}

const PartSearchAgentCard: React.FC<PartSearchAgentCardProps> = ({
    onSearch,
    isLoading,
    formState,
    onFormChange
}) => {
    const { t } = useLocalization();

    return (
        <Card className="flex flex-col md:col-span-2">
            <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Bot size={24} />
                </div>
                <div>
                    <h3 className="text-lg font-bold">{t('car_part_search_agent')}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{t('car_part_search_agent_desc')}</p>
                </div>
            </div>
            <div className="mt-4 flex-grow space-y-4">
                <div>
                    <label className="text-sm font-medium text-muted-foreground">{t('part_description')}</label>
                    <textarea name="description" value={formState.description} onChange={onFormChange} rows={2} className="mt-1 w-full bg-input border border-border rounded-lg p-2 text-sm" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">{t('part_number_optional')}</label>
                        <input type="text" name="partNumber" value={formState.partNumber} onChange={onFormChange} className="mt-1 w-full bg-input border border-border rounded-lg p-2 text-sm" />
                    </div>
                     <div>
                        <label className="text-sm font-medium text-muted-foreground">{t('car_name')}</label>
                        <input type="text" name="carName" value={formState.carName} onChange={onFormChange} className="mt-1 w-full bg-input border border-border rounded-lg p-2 text-sm" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">{t('car_model_year')}</label>
                        <input type="text" name="model" value={formState.model} onChange={onFormChange} className="mt-1 w-full bg-input border border-border rounded-lg p-2 text-sm" />
                    </div>
                     <div>
                        <label className="text-sm font-medium text-muted-foreground">{t('size_optional')}</label>
                        <input type="text" name="size" value={formState.size} onChange={onFormChange} className="mt-1 w-full bg-input border border-border rounded-lg p-2 text-sm" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">{t('engine_size')}</label>
                        <input type="text" name="engineSize" value={formState.engineSize} onChange={onFormChange} className="mt-1 w-full bg-input border border-border rounded-lg p-2 text-sm" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">{t('vin')}</label>
                        <input type="text" name="vin" value={formState.vin} maxLength={17} onChange={onFormChange} className="mt-1 w-full bg-input border border-border rounded-lg p-2 text-sm uppercase font-mono" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">{t('vehicle_origin')}</label>
                        <select name="origin" value={formState.origin} onChange={onFormChange} className="mt-1 w-full bg-input border border-border rounded-lg p-2 text-sm">
                            <option value="">{t('select_origin')}</option>
                            <option value="American">{t('origin_american')}</option>
                            <option value="European">{t('origin_european')}</option>
                            <option value="GCC">{t('origin_gcc')}</option>
                            <option value="Korean">{t('origin_korean')}</option>
                            <option value="Japanese">{t('origin_japanese')}</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">{t('transmission_type')}</label>
                        <select name="transmission" value={formState.transmission} onChange={onFormChange} className="mt-1 w-full bg-input border border-border rounded-lg p-2 text-sm">
                            <option value="">{t('select_transmission')}</option>
                            <option value="Automatic">{t('transmission_auto')}</option>
                            <option value="Manual">{t('transmission_manual')}</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">{t('fuel_type')}</label>
                        <select name="fuelType" value={formState.fuelType} onChange={onFormChange} className="mt-1 w-full bg-input border border-border rounded-lg p-2 text-sm">
                            <option value="">{t('select_fuel')}</option>
                            <option value="Petrol">{t('fuel_petrol')}</option>
                            <option value="Diesel">{t('fuel_diesel')}</option>
                        </select>
                    </div>
                </div>
            </div>
            <div className="mt-4">
                <button onClick={onSearch} disabled={isLoading || Object.values(formState).every(v => String(v).trim() === '')} className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition-colors disabled:bg-muted disabled:text-muted-foreground flex items-center justify-center gap-2">
                    {isLoading && <Spinner className="w-5 h-5 border-white" />}
                    <span>{isLoading ? t('loading') : t('search_with_ai_agent')}</span>
                </button>
            </div>
        </Card>
    );
};

export default PartSearchAgentCard;