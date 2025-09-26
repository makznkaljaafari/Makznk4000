import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Part, PartKit } from '../../types';
import { useLocalization } from '../../hooks/useLocalization';
import { Search, X, Camera, ScanBarcode } from 'lucide-react';
import Spinner from './Spinner';
import { identifyPartFromImage, findPartsFromSmartSearch } from '../../services/geminiService';
import { useToast } from '../../contexts/ToastContext';
import BarcodeScanner from './BarcodeScanner';

export type SearchableItem = (Part & { type: 'part' }) | (PartKit & { type: 'kit', totalPrice: number });

export const PartSearchModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSelectItem: (item: SearchableItem) => void;
  parts: Part[];
  partKits: PartKit[];
  priceType: 'sellingPrice' | 'purchasePrice';
}> = ({ isOpen, onClose, onSelectItem, parts, partKits, priceType }) => {
    const { t, lang } = useLocalization();
    const { addToast } = useToast();
    const modalRef = useRef<HTMLDivElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [isImageLoading, setIsImageLoading] = useState(false);
    const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);

    const [position, setPosition] = useState({ x: 0, y: 0 });
    const dragInfoRef = useRef<{ isDragging: boolean, startX: number, startY: number, startElemX: number, startElemY: number } | null>(null);
    const [size, setSize] = useState({ width: 0, height: 0 });
    const resizeInfoRef = useRef<{ isResizing: boolean, startX: number, startY: number, startWidth: number, startHeight: number } | null>(null);

    const partsMap = useMemo(() => new Map<string, Part>(parts.map(p => [p.id, p])), [parts]);

    const allItems = useMemo<SearchableItem[]>(() => {
        const partItems: SearchableItem[] = parts.map(p => ({ ...p, type: 'part' }));
        const kitItems: SearchableItem[] = partKits.map(kit => {
            const totalPrice = kit.items.reduce((sum, item) => {
                const part = partsMap.get(item.partId);
                const price = priceType === 'sellingPrice' ? (part?.sellingPrice || 0) : (part?.purchasePrice || 0);
                return sum + (price * item.quantity);
            }, 0);
            return { ...kit, type: 'kit', totalPrice };
        });
        return [...partItems, ...kitItems];
    }, [parts, partKits, priceType, partsMap]);
    
    const [filteredItems, setFilteredItems] = useState<SearchableItem[]>(allItems);

    const performSearch = useCallback(async (query: string) => {
        if (!query.trim()) {
            setFilteredItems(allItems);
            setIsSearching(false);
            return;
        }
        setIsSearching(true);
        try {
            const results = await findPartsFromSmartSearch(query, parts);
            if (results) {
                const foundPartIds = new Set(results.map(p => p.id));
                const partItems: SearchableItem[] = results.map(p => ({ ...p, type: 'part' }));
                const kitItems = allItems.filter(item => 
                    item.type === 'kit' && 
                    item.name.toLowerCase().includes(query.toLowerCase())
                );
                setFilteredItems([...kitItems, ...partItems]);
            } else {
                 setFilteredItems([]);
            }
        } catch (e) {
            addToast(t((e as Error).message), 'error');
            const lowerCaseSearchTerm = query.toLowerCase();
            const localFiltered = allItems.filter(item => {
                 if (item.type === 'part') {
                    return item.name.toLowerCase().includes(lowerCaseSearchTerm) || item.partNumber.toLowerCase().includes(lowerCaseSearchTerm);
                } else { 
                    return item.name.toLowerCase().includes(lowerCaseSearchTerm);
                }
            });
            setFilteredItems(localFiltered);
        } finally {
            setIsSearching(false);
        }
    }, [allItems, parts, t, addToast]);

    useEffect(() => {
        if (!isOpen) return;

        const handler = setTimeout(() => {
            performSearch(searchTerm);
        }, 500); // 500ms debounce

        return () => {
            clearTimeout(handler);
        };
    }, [searchTerm, isOpen, performSearch]);

    useEffect(() => {
        if (isOpen) {
            setPosition({ x: 0, y: 0 }); 
            const initialWidth = Math.min(window.innerWidth * 0.9, 1536);
            const initialHeight = Math.min(window.innerHeight * 0.9, 800);
            setSize({ width: initialWidth, height: initialHeight });
            setSearchTerm('');
            setFilteredItems(allItems);
        }
    }, [isOpen, allItems]);
    

    const onDragMouseDown = useCallback((e: React.MouseEvent) => {
        if (e.button !== 0) return;
        dragInfoRef.current = {
            isDragging: true,
            startX: e.clientX,
            startY: e.clientY,
            startElemX: position.x,
            startElemY: position.y,
        };
        document.body.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
        e.preventDefault();
    }, [position]);

    const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
        if (e.button !== 0 || !modalRef.current) return;
        e.preventDefault();
        e.stopPropagation();

        const rect = modalRef.current.getBoundingClientRect();
        resizeInfoRef.current = {
            isResizing: true,
            startX: e.clientX,
            startY: e.clientY,
            startWidth: rect.width,
            startHeight: rect.height,
        };
        document.body.style.cursor = 'nwse-resize';
        document.body.style.userSelect = 'none';
    }, []);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (dragInfoRef.current?.isDragging) {
                const dx = e.clientX - dragInfoRef.current.startX;
                const dy = e.clientY - dragInfoRef.current.startY;
                setPosition({
                    x: dragInfoRef.current.startElemX + dx,
                    y: dragInfoRef.current.startElemY + dy,
                });
            } else if (resizeInfoRef.current?.isResizing) {
                const dx = e.clientX - resizeInfoRef.current.startX;
                const dy = e.clientY - resizeInfoRef.current.startY;
                const newWidth = resizeInfoRef.current.startWidth + dx;
                const newHeight = resizeInfoRef.current.startHeight + dy;
                setSize({
                    width: Math.max(newWidth, 600),
                    height: Math.max(newHeight, 400),
                });
            }
        };

        const handleMouseUp = () => {
             if (dragInfoRef.current?.isDragging || resizeInfoRef.current?.isResizing) {
                if (dragInfoRef.current) dragInfoRef.current.isDragging = false;
                if (resizeInfoRef.current) resizeInfoRef.current.isResizing = false;
                document.body.style.cursor = 'default';
                document.body.style.userSelect = 'auto';
            }
        };

        if (isOpen) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            if (dragInfoRef.current?.isDragging || resizeInfoRef.current?.isResizing) {
                document.body.style.cursor = 'default';
                document.body.style.userSelect = 'auto';
            }
        };
    }, [isOpen]);
    
    const handleImageSearch = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setIsImageLoading(true);
            const reader = new FileReader();
            reader.onloadend = async () => {
                try {
                    const base64Image = (reader.result as string).split(',')[1];
                    const result = await identifyPartFromImage(base64Image, parts);
                    if (result && result.description) {
                        addToast(`${t('part_identification_result')}: ${result.description}`, 'info');
                        setSearchTerm(result.description);
                    } else {
                        addToast(t('no_match_found'), 'warning');
                    }
                } catch (error) {
                    addToast(t((error as Error).message) || 'failed_to_identify_part', 'error');
                } finally {
                    setIsImageLoading(false);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSelect = (item: SearchableItem) => {
        onSelectItem(item);
        onClose();
    };
    
    const handleBarcodeScan = (scannedValue: string) => {
        setSearchTerm(scannedValue);
        setIsBarcodeScannerOpen(false);
    };

    if (!isOpen) return null;

    const priceHeader = t(priceType === 'sellingPrice' ? 'selling_price' : 'purchase_price');

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" role="dialog" aria-modal="true">
            <BarcodeScanner isOpen={isBarcodeScannerOpen} onClose={() => setIsBarcodeScannerOpen(false)} onScan={handleBarcodeScan} />
            <div 
                ref={modalRef}
                className="bg-card text-card-foreground border border-border rounded-lg shadow-xl flex flex-col relative"
                style={{
                  transform: `translate(${position.x}px, ${position.y}px)`,
                  width: size.width ? `${size.width}px` : undefined,
                  height: size.height ? `${size.height}px` : undefined,
                }}
            >
                <header onMouseDown={onDragMouseDown} className="p-4 border-b border-border flex justify-between items-center flex-shrink-0 cursor-grab active:cursor-grabbing">
                    <h2 className="text-xl font-bold">{t('search_part')}</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-muted-foreground hover:bg-accent cursor-pointer"><X size={24} /></button>
                </header>
                <div className="p-4 flex-shrink-0">
                    <div className="relative">
                        <input 
                            type="text"
                            placeholder={`${t('search_inventory')}...`}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full p-2 ps-10 pe-24 border border-input rounded-md bg-background focus:ring-2 focus:ring-ring"
                            autoFocus
                        />
                         <div className="absolute top-1/2 start-3 transform -translate-y-1/2 text-muted-foreground">
                            {isSearching ? <Spinner className="w-5 h-5"/> : <Search size={20} />}
                        </div>
                         <div className="absolute top-1/2 end-3 transform -translate-y-1/2 flex items-center gap-2">
                             <button onClick={() => setIsBarcodeScannerOpen(true)} title={t('scan_barcode')} className="p-1 rounded-full text-muted-foreground hover:text-primary transition-colors">
                                 <ScanBarcode size={20} />
                             </button>
                             <input type="file" accept="image/*" capture="environment" ref={imageInputRef} onChange={handleImageSearch} className="hidden" />
                             <button onClick={() => imageInputRef.current?.click()} disabled={isImageLoading} className="p-1 rounded-full text-muted-foreground hover:text-primary transition-colors disabled:opacity-50">
                                 {isImageLoading ? <Spinner className="w-5 h-5"/> : <Camera size={20} />}
                             </button>
                        </div>
                    </div>
                </div>
                <div className="flex-grow overflow-y-auto">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="text-xs text-muted-foreground uppercase bg-muted/50 sticky top-0 z-10">
                            <tr>
                                <th scope="col" className="px-4 py-3 border-r border-border">{t('serial_number')}</th>
                                <th scope="col" className="px-6 py-3 border-r border-border">{t('part_name')}</th>
                                <th scope="col" className="px-6 py-3 border-r border-border">{t('part_number')}</th>
                                <th scope="col" className="px-6 py-3 border-r border-border">{t('brand')}</th>
                                <th scope="col" className="px-6 py-3 border-r border-border">{t('stock')}</th>
                                <th scope="col" className="px-6 py-3 border-r border-border">{priceHeader}</th>
                                <th scope="col" className="px-6 py-3 text-center">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.map((item, index) => (
                                <tr key={item.id} className="border-b border-border hover:bg-accent">
                                    <td className="px-4 py-4 text-center border-r border-border">{index + 1}</td>
                                    <td className="px-6 py-4 font-medium text-foreground whitespace-nowrap border-r border-border">
                                        <div className="flex items-center gap-3">
                                            {item.type === 'part' ? (
                                                <img src={item.imageUrl} alt={item.name} className="w-10 h-10 rounded-md object-cover" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center text-primary font-bold">KIT</div>
                                            )}
                                            <div>
                                                <span>{item.name}</span>
                                                {item.type === 'kit' && <span className="ms-2 text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{t('item_kit')}</span>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 border-r border-border">{item.type === 'part' ? item.partNumber : '---'}</td>
                                    <td className="px-6 py-4 border-r border-border">{item.type === 'part' ? item.brand : t('item_kit')}</td>
                                    <td className={`px-6 py-4 font-bold border-r border-border ${item.type === 'part' && item.stock <= item.minStock ? 'text-red-500' : 'text-green-500'}`}>{item.type === 'part' ? item.stock : '---'}</td>
                                    <td className="px-6 py-4 border-r border-border">
                                        {item.type === 'part' ? `${item[priceType].toLocaleString('en-US')} ${lang === 'ar' ? 'р.с' : 'SAR'}` : `${item.totalPrice.toLocaleString('en-US')} ${lang === 'ar' ? 'р.с' : 'SAR'}`}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button onClick={() => handleSelect(item)} className="bg-primary text-primary-foreground px-3 py-1 rounded-md text-xs font-bold hover:bg-primary/90 transition-colors">{t('select')}</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {!isSearching && filteredItems.length === 0 && <div className="p-6 text-center text-muted-foreground">{t('no_match_found')}</div>}
                </div>
                <footer className="p-4 border-t border-border flex justify-end flex-shrink-0">
                    <button onClick={onClose} className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg hover:bg-secondary/80 transition-colors">{t('close')}</button>
                </footer>
                <div
                    onMouseDown={onResizeMouseDown}
                    className="absolute bottom-0 end-0 w-5 h-5 cursor-nwse-resize z-30 text-gray-400 dark:text-gray-600 flex items-end justify-end p-0.5"
                    title={t('resize')}
                >
                    <svg viewBox="0 0 3 3" fill="currentColor" className="w-full h-full">
                        <circle cx="0.5" cy="2.5" r="0.5" />
                        <circle cx="1.5" cy="1.5" r="0.5" />
                        <circle cx="2.5" cy="0.5" r="0.5" />
                        <circle cx="2.5" cy="2.5" r="0.5" />
                    </svg>
                </div>
            </div>
        </div>
    );
};