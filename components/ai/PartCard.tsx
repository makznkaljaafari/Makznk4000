import React from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { Archive } from 'lucide-react';
import { useLocalization } from '../../hooks/useLocalization';

interface PartCardProps {
    partId: string;
    setActiveView: (view: string) => void;
}

const PartCard: React.FC<PartCardProps> = ({ partId, setActiveView }) => {
    const { t } = useLocalization();
    const { parts, setFocusedItem } = useAppStore(state => ({
        parts: state.parts,
        setFocusedItem: state.setFocusedItem
    }));
    
    const part = parts.find(p => p.id === partId);

    if (!part) {
        return <div className="my-2 p-2 bg-red-500/10 text-red-500 text-xs rounded-md">Part ID "{partId}" not found in inventory.</div>;
    }
    
    const handleViewClick = () => {
        setFocusedItem({ type: 'part', id: part.id });
        setActiveView('inventory');
    };

    return (
        <div className="my-2 bg-primary/10 border border-primary/20 rounded-lg overflow-hidden">
            <div className="flex items-center gap-3 p-2">
                <img src={part.imageUrl} alt={part.name} className="w-12 h-12 rounded-md object-cover flex-shrink-0" loading="lazy" />
                <div className="flex-grow">
                    <p className="font-bold text-sm text-primary-foreground">{part.name}</p>
                    <p className="text-xs text-muted-foreground">{part.partNumber}</p>
                </div>
                <div className="flex-shrink-0 text-center">
                     <p className="font-bold text-lg">{part.stock}</p>
                     <p className="text-xs text-muted-foreground">{t('in_stock')}</p>
                </div>
            </div>
            <button
                onClick={handleViewClick}
                className="w-full text-center bg-primary/20 hover:bg-primary/30 text-primary-foreground text-xs font-bold py-1 transition-colors"
            >
                {t('view_details')}
            </button>
        </div>
    );
};

export default PartCard;
