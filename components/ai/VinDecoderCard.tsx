

import React from 'react';
import Card from '../common/Card';
import Spinner from '../common/Spinner';
import { useLocalization } from '../../hooks/useLocalization';
import { VehicleInfo } from '../../types';
import { Scan } from 'lucide-react';

interface VinDecoderCardProps {
    onDecodeVin: () => void;
    isLoading: boolean;
    vin: string;
    setVin: (vin: string) => void;
    vehicleInfo: VehicleInfo | null;
    setActiveView: (view: string) => void;
}

const VinDecoderCard: React.FC<VinDecoderCardProps> = ({
    onDecodeVin,
    isLoading,
    vin,
    setVin,
    vehicleInfo,
    setActiveView,
}) => {
    const { t } = useLocalization();

    return (
        <Card className="flex flex-col">
            <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Scan size={24} />
                </div>
                <div>
                    <h3 className="text-lg font-bold">{t('vin_decoder')}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{t('vin_decoder_desc')}</p>
                </div>
            </div>
            <div className="mt-4 flex-grow">
                <input 
                    type="text"
                    value={vin}
                    onChange={e => setVin(e.target.value)}
                    placeholder={t('vin_placeholder')}
                    maxLength={17}
                    className="w-full uppercase text-center font-mono tracking-widest bg-input border border-border rounded-lg p-2"
                />
                {vehicleInfo && (
                    <div className="mt-2 text-sm p-2 bg-muted/50 rounded-md space-y-1">
                        <h4 className="font-bold">{t('vehicle_details')}</h4>
                        {vehicleInfo.make ? (
                            <>
                            <p><strong>{t('make')}:</strong> {vehicleInfo.make}</p>
                            <p><strong>{t('model')}:</strong> {vehicleInfo.model}</p>
                            <p><strong>{t('year')}:</strong> {vehicleInfo.year}</p>
                            <p><strong>{t('engine')}:</strong> {vehicleInfo.engine || 'N/A'}</p>
                            <p><strong>{t('trim')}:</strong> {vehicleInfo.trim || 'N/A'}</p>
                            {vehicleInfo.categories && vehicleInfo.categories.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-border">
                                    <h5 className="font-bold text-xs uppercase text-muted-foreground mb-2">{t('category')}</h5>
                                    <div className="flex flex-wrap gap-2">
                                        {vehicleInfo.categories.map(cat => (
                                            <span 
                                                key={cat} 
                                                className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-xs"
                                            >
                                                {cat}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            </>
                        ) : (
                            <p className="text-yellow-500">{t('invalid_vin_or_not_found')}</p>
                        )}
                    </div>
                )}
            </div>
            <div className="mt-4">
                <button onClick={onDecodeVin} disabled={isLoading || vin.trim().length !== 17} className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition-colors disabled:bg-muted disabled:text-muted-foreground flex items-center justify-center gap-2">
                    {isLoading && <Spinner className="w-5 h-5 border-white" />}
                    <span>{isLoading ? t('loading') : t('decode_vin')}</span>
                </button>
            </div>
        </Card>
    );
};

export default VinDecoderCard;
