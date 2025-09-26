import React, { useState, useMemo } from 'react';
import { useLocalization } from '../../hooks/useLocalization';
import { useAppStore } from '../../stores/useAppStore';
import { Part } from '../../types';
import Card from '../common/Card';
import { Search, ShoppingCart } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

const ProductCard: React.FC<{ part: Part }> = ({ part }) => {
    const { t, lang } = useLocalization();
    const { addToast } = useToast();
    const { addToCart } = useAppStore();
    const isAvailable = part.stock > 0;
    
    const handleAddToCart = () => {
        if (addToCart(part, 1)) {
            addToast(`${part.name} ${t('added_to_cart')}`, 'success');
        } else {
            addToast(t('error_insufficient_stock', { stock: part.stock }), 'error');
        }
    };

    return (
        <Card className="flex flex-col overflow-hidden transition-transform hover:scale-105 hover:shadow-xl">
            <div className="relative">
                <img src={part.imageUrl} alt={part.name} className="w-full h-48 object-cover" loading="lazy" />
                <span className={`absolute top-2 right-2 px-2 py-1 text-xs font-bold rounded-full text-white ${isAvailable ? 'bg-green-500' : 'bg-red-500'}`}>
                    {isAvailable ? t('available') : t('out_of_stock')}
                </span>
            </div>
            <div className="p-4 flex flex-col flex-grow">
                <h3 className="font-bold text-lg flex-grow">{part.name}</h3>
                <p className="text-sm text-muted-foreground font-mono">{part.partNumber}</p>
                <div className="mt-4 flex justify-between items-center">
                    <span className="text-xl font-bold text-primary">{part.sellingPrice.toLocaleString('en-US')} <span className="text-sm">{lang === 'ar' ? 'р.с' : 'SAR'}</span></span>
                    <span className="text-sm text-muted-foreground">{t('stock')}: {part.stock}</span>
                </div>
            </div>
            <button
                onClick={handleAddToCart}
                disabled={!isAvailable}
                className="w-full flex items-center justify-center gap-2 p-3 bg-primary/90 text-primary-foreground font-bold hover:bg-primary transition-colors disabled:bg-muted disabled:cursor-not-allowed"
            >
                <ShoppingCart size={16} />
                {t('add_to_cart')}
            </button>
        </Card>
    );
};

const PortalProductCatalog: React.FC = () => {
    const { t } = useLocalization();
    const { parts } = useAppStore();
    const [searchTerm, setSearchTerm] = useState('');

    const filteredParts = useMemo(() => {
        if (!searchTerm.trim()) {
            return parts;
        }
        const lowerCaseSearch = searchTerm.toLowerCase();
        return parts.filter(p => 
            p.name.toLowerCase().includes(lowerCaseSearch) ||
            p.partNumber.toLowerCase().includes(lowerCaseSearch) ||
            p.brand.toLowerCase().includes(lowerCaseSearch)
        );
    }, [parts, searchTerm]);

    return (
        <div className="space-y-6">
            <div className="relative">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder={t('search_for_products')}
                    className="w-full p-3 pl-10 bg-card border border-border rounded-lg shadow-sm focus:ring-2 focus:ring-primary"
                />
                <Search className="absolute top-1/2 left-3 transform -translate-y-1/2 text-muted-foreground" size={20} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {filteredParts.map(part => (
                    <ProductCard key={part.id} part={part} />
                ))}
            </div>
             {filteredParts.length === 0 && (
                <div className="col-span-full text-center py-16">
                    <p className="text-muted-foreground">{t('no_match_found')}</p>
                </div>
            )}
        </div>
    );
};

export default PortalProductCatalog;
