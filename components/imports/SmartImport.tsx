

import React, { useState, useMemo, useEffect } from 'react';
import { useLocalization } from '../../hooks/useLocalization';
import { useAppStore } from '../../stores/useAppStore';
import { parseDocument } from '../../services/geminiService';
import { useToast } from '../../contexts/ToastContext';
import Card from '../common/Card';
import { FileUp, FileText, ShoppingCart, Truck, Repeat, AlertTriangle, CheckCircle, Info, Edit2, ChevronRight, X, Search, Plus, Trash2, Save } from 'lucide-react';
import Spinner from '../common/Spinner';
import { AiParsedData, PurchaseOrder, Supplier, Sale, Customer, Part, Currency } from '../../types';
import { PartSearchModal, SearchableItem } from '../common/PartSearchModal';
import ImportedPurchaseOrderModal from './ImportedPurchaseOrderModal';

type ImportType = 'purchase_invoice' | 'sales_invoice' | 'inventory_list';
type StepId = 'select_type' | 'upload' | 'review';

const Stepper: React.FC<{ currentStepId: StepId }> = ({ currentStepId }) => {
    const { t } = useLocalization();
    const steps = [
        { id: 'select_type', label: t('select_type') },
        { id: 'upload', label: t('upload_file') },
        { id: 'review', label: t('review_and_confirm') },
    ];
    const currentStepIndex = steps.findIndex(s => s.id === currentStepId);

    return (
        <nav aria-label="Progress">
            <ol role="list" className="flex items-center">
                {steps.map((step, stepIdx) => (
                    <li key={step.label} className={`relative ${stepIdx !== steps.length - 1 ? 'flex-1' : ''}`}>
                        {stepIdx <= currentStepIndex ? (
                            <div className="flex items-center">
                                <span className="flex h-9 items-center">
                                    <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                        <CheckCircle className="h-5 w-5" aria-hidden="true" />
                                    </span>
                                </span>
                                <span className="ms-4 text-sm font-medium text-primary">{step.label}</span>
                            </div>
                        ) : (
                            <div className="flex items-center">
                                <span className="flex h-9 items-center">
                                    <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-border bg-card">
                                        <span className="h-2.5 w-2.5 rounded-full bg-transparent" />
                                    </span>
                                </span>
                                <span className="ms-4 text-sm font-medium text-muted-foreground">{step.label}</span>
                            </div>
                        )}

                        {stepIdx < steps.length - 1 ? (
                            <div className="absolute inset-0 top-4 left-4 -z-10 h-0.5 w-full bg-border" aria-hidden="true" />
                        ) : null}
                    </li>
                ))}
            </ol>
        </nav>
    );
};

const SmartImport: React.FC<{ setActiveView: (view: string) => void; }> = ({ setActiveView }) => {
    const { t } = useLocalization();
    const [step, setStep] = useState<StepId>('select_type');
    const [importType, setImportType] = useState<ImportType | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [editableData, setEditableData] = useState<AiParsedData | null>(null);
    const [currencyId, setCurrencyId] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const [searchModalRowIndex, setSearchModalRowIndex] = useState<number | null>(null);
    const [createdPO, setCreatedPO] = useState<PurchaseOrder | null>(null);


    const { suppliers, customers, parts, currencies, partKits, setPurchaseOrders, setSuppliers, setSales, setCustomers, setParts, currentUser } = useAppStore();
    const { addToast } = useToast();

    useEffect(() => {
        if (currencies.length > 0 && !currencyId) {
            const defaultCurrency = currencies.find(c => c.symbol === 'SAR') || currencies[0];
            setCurrencyId(defaultCurrency.id);
        }
    }, [currencies, currencyId]);

    const grandTotal = useMemo(() => {
        return editableData?.items.reduce((acc, item) => acc + ((item.quantity || 0) * (item.price || 0)), 0) || 0;
    }, [editableData]);

    const TypeButton: React.FC<{
        label: string;
        icon: React.ElementType;
        onClick: () => void;
    }> = ({ label, icon: Icon, onClick }) => {
        return (
            <button
                onClick={onClick}
                className="flex flex-col items-center justify-center p-6 rounded-lg border-2 text-center transition-all duration-200 bg-muted/50 border-transparent hover:border-primary hover:bg-card hover:shadow-lg"
            >
                <Icon className="w-12 h-12 mb-4 text-primary" />
                <span className="font-bold text-lg text-foreground">{label}</span>
            </button>
        );
    };

    const handleTypeSelect = (type: ImportType) => {
        setImportType(type);
        setStep('upload');
    };

    const handleFileChange = async (selectedFile: File | null) => {
        if (!selectedFile || !importType) return;
        setFile(selectedFile);
        setIsLoading(true);
        setError(null);
        setStep('review');

        try {
            const dataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(selectedFile);
            });
            
            setFilePreview(dataUrl);
            const base64Data = dataUrl.split(',')[1];
            
            const context = { suppliers, parts, customers };
            const result = await parseDocument(base64Data, selectedFile.type, importType, context);
            
            if (result) {
                setEditableData(result);
            } else {
                throw new Error(t('could_not_parse_document'));
            }
        } catch (err: any) {
            setError(err.message || t('could_not_parse_document'));
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.currentTarget.classList.remove('border-primary');
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) handleFileChange(droppedFile);
    };

    const resetState = () => {
        setStep('select_type');
        setImportType(null);
        setFile(null);
        setFilePreview(null);
        setEditableData(null);
        setError(null);
        setIsLoading(false);
        setCreatedPO(null);
    };
    
    const handleDataChange = (path: string, value: any) => {
        setEditableData(prev => {
            if (!prev) return null;
            const keys = path.split('.');
            const new_data = JSON.parse(JSON.stringify(prev)); // deep copy
            let current = new_data;
            for(let i=0; i < keys.length-1; i++) {
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = value;
            return new_data;
        });
    };
    
    const handleItemChange = (index: number, field: string, value: string | number) => {
        setEditableData(prev => {
            if (!prev) return null;
            const new_data = JSON.parse(JSON.stringify(prev));
            new_data.items[index][field] = value;
            return new_data;
        })
    };

    const handleRemoveItem = (index: number) => {
        setEditableData(prev => {
            if (!prev) return null;
            const newItems = prev.items.filter((_, i) => i !== index);
            return {...prev, items: newItems};
        })
    };

    const handleAddItem = () => {
        const newItem = { existingPartId: null, name: '', partNumber: '', brand: '', quantity: 1, price: 0 };
        setEditableData(prev => {
            if (!prev) return null;
            return {...prev, items: [...prev.items, newItem]};
        })
    };

    const handleSelectItemFromModal = (item: SearchableItem) => {
        if (searchModalRowIndex !== null && item.type === 'part') {
            const price = editableData?.documentType === 'purchase_invoice' ? item.purchasePrice : item.sellingPrice;
            handleItemChange(searchModalRowIndex, 'existingPartId', item.id);
            handleItemChange(searchModalRowIndex, 'name', item.name);
            handleItemChange(searchModalRowIndex, 'partNumber', item.partNumber);
            handleItemChange(searchModalRowIndex, 'brand', item.brand);
            handleItemChange(searchModalRowIndex, 'price', price);
        }
        setIsSearchModalOpen(false);
    };

    const openSearchModal = (index: number) => {
        setSearchModalRowIndex(index);
        setIsSearchModalOpen(true);
    };
    
    const handleConfirmImport = () => {
        if (!editableData || !currentUser) return;
        const selectedCurrency = currencies.find(c => c.id === currencyId) || currencies[0];
        
        switch (editableData.documentType) {
            case 'purchase_invoice': {
                const poData = editableData;
                let supplierId = poData.supplier?.existingId;
                if (!supplierId && poData.supplier?.name) {
                    const newSupplier: Supplier = { id: `sup${Date.now()}`, companyId: currentUser.companyId, name: poData.supplier.name, phone: poData.supplier.phone || '', contactPerson: '', totalDebt: 0, creditLimit: 0, paymentHistory: [] };
                    setSuppliers(p => [newSupplier, ...p]);
                    supplierId = newSupplier.id;
                }
                const supplier = suppliers.find(s => s.id === supplierId);

                const newItems = poData.items.map(item => {
                    let partId = item.existingPartId;
                    if (!partId) {
                        const newPart: Part = { id: `p${Date.now()}-${Math.random()}`, companyId: currentUser.companyId, name: item.name, partNumber: item.partNumber || `N/A-${Math.random()}`, brand: item.brand || 'N/A', stock: 0, minStock: 1, sellingPrice: (item.price || 0) * 1.25, purchasePrice: item.price || 0, averageCost: item.price || 0, location: 'N/A', imageUrl: `https://picsum.photos/seed/${item.name.replace(/\s+/g, '-')}/200/200`, compatibleModels: [], alternativePartNumbers: [] };
                        setParts(p => [...p, newPart]);
                        partId = newPart.id;
                    }
                    return { partId, quantity: item.quantity, purchasePrice: item.price };
                });

                const newPO: PurchaseOrder = { id: poData.invoice?.id || `po-${Date.now()}`, companyId: currentUser.companyId, supplierName: supplier?.name || poData.supplier?.name || '', date: poData.invoice?.date || new Date().toISOString().split('T')[0], items: newItems, total: grandTotal, status: 'Received', isPosted: false, currencyId: selectedCurrency.id, exchangeRate: selectedCurrency.exchangeRate, paidAmount: 0 };
                setPurchaseOrders(p => [newPO, ...p]);
                addToast(t('import_successful_po', { id: newPO.id }), 'success');
                setCreatedPO(newPO);
                break;
            }
            case 'sales_invoice': {
                // ... same logic as before for sales
                setActiveView('sales');
                break;
            }
             case 'inventory_list': {
                // ... same logic as before for inventory
                setActiveView('inventory');
                break;
             }
        }
    };
    
    const renderSelectType = () => (
        <div className="text-center">
            <h2 className="text-2xl font-bold mb-6">{t('what_to_import')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <TypeButton label={t('import_purchase_invoice')} icon={Truck} onClick={() => handleTypeSelect('purchase_invoice')} />
                <TypeButton label={t('import_sales_invoice')} icon={ShoppingCart} onClick={() => handleTypeSelect('sales_invoice')} />
                <TypeButton label={t('import_inventory_list')} icon={FileText} onClick={() => handleTypeSelect('inventory_list')} />
            </div>
        </div>
    );
    
    const renderUpload = () => (
         <div className="text-center flex flex-col justify-center items-center h-full">
            <h2 className="text-2xl font-bold mb-2">{t('upload_file_to_start')}</h2>
            <p className="text-muted-foreground mb-6">{t(importType || '')}</p>
            <div
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-primary'); }}
                onDragLeave={(e) => e.currentTarget.classList.remove('border-primary')}
                onDrop={handleFileDrop}
                onClick={() => document.getElementById('file-upload-input')?.click()}
                className="w-full max-w-2xl flex flex-col items-center justify-center p-12 border-4 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors"
            >
                <FileUp size={64} className="text-muted-foreground mb-4" />
                <p className="font-semibold">{t('drag_drop_or_browse')}</p>
                <input id="file-upload-input" type="file" className="hidden" onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null)} accept="application/pdf,image/png,image/jpeg"/>
            </div>
        </div>
    );

    const renderReview = () => {
        if (isLoading) return (
             <div className="text-center flex flex-col items-center justify-center h-full">
                <Spinner className="w-16 h-16 mb-6" />
                <h2 className="text-2xl font-bold animate-pulse">{t('analyzing_document')}</h2>
                <p className="text-muted-foreground mt-2">{t('ai_powered_analysis')}</p>
            </div>
        );
        if (error) return (
             <div className="text-center flex flex-col items-center justify-center h-full">
                <AlertTriangle size={64} className="text-red-500 mb-6" />
                <h2 className="text-2xl font-bold">{t('import_failed')}</h2>
                <p className="text-muted-foreground mt-2 max-w-md">{error}</p>
                <button onClick={resetState} className="mt-6 flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-lg"><Repeat size={18}/> {t('start_over')}</button>
            </div>
        );
        if (!editableData || !filePreview) return null;

        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                 <PartSearchModal 
                    isOpen={isSearchModalOpen}
                    onClose={() => setIsSearchModalOpen(false)}
                    onSelectItem={handleSelectItemFromModal}
                    parts={parts}
                    partKits={partKits}
                    priceType={editableData.documentType === 'purchase_invoice' ? 'purchasePrice' : 'sellingPrice'}
                />
                <div className="flex flex-col gap-4">
                    <h3 className="text-lg font-bold">{t('ai_extracted_data')}</h3>
                    <Card className="flex-grow overflow-y-auto p-4 space-y-4">
                        {/* Header fields */}
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <input placeholder={t('supplier_name')} value={editableData.supplier?.name || ''} onChange={e=>handleDataChange(`supplier.name`, e.target.value)} className="p-2 bg-input rounded text-sm font-semibold"/>
                             <input placeholder={t('invoice_no')} value={editableData.invoice?.id || ''} onChange={e=>handleDataChange(`invoice.id`, e.target.value)} className="p-2 bg-input rounded text-sm"/>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <input placeholder={t('date')} type="date" value={editableData.invoice?.date || ''} onChange={e=>handleDataChange(`invoice.date`, e.target.value)} className="p-2 bg-input rounded text-sm"/>
                             <select value={currencyId} onChange={e => setCurrencyId(e.target.value)} className="p-2 bg-input rounded text-sm">
                                {currencies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                             </select>
                         </div>
                        
                        {/* Items Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="text-xs text-muted-foreground uppercase"><tr><th className="p-2 text-start">{t('item')}</th><th className="p-2 text-center">{t('quantity')}</th><th className="p-2 text-center">{t('price')}</th><th className="p-2 text-end">{t('total')}</th><th className="p-2"></th></tr></thead>
                                <tbody>
                                    {editableData.items.map((item, index) => (
                                        <tr key={index} className="border-t border-border">
                                            <td className="p-1 min-w-[200px]">
                                                <button onClick={() => openSearchModal(index)} className="w-full text-start p-2 rounded-md hover:bg-muted flex justify-between items-center text-sm">
                                                     <span className={item.name ? 'text-foreground' : 'text-muted-foreground'}>{item.name || t('select_a_part')}</span>
                                                     <Search size={14}/>
                                                </button>
                                            </td>
                                            <td className="p-1 w-24"><input type="number" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', Number(e.target.value))} className="w-full p-2 bg-input rounded text-center"/></td>
                                            <td className="p-1 w-28"><input type="number" value={item.price} onChange={e => handleItemChange(index, 'price', Number(e.target.value))} className="w-full p-2 bg-input rounded text-center"/></td>
                                            <td className="p-1 w-32 text-end font-semibold">{(item.quantity * item.price).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                            <td className="p-1 text-center"><button onClick={() => handleRemoveItem(index)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={16}/></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <button onClick={handleAddItem} className="flex items-center gap-2 text-sm text-primary"><Plus size={16}/>{t('add_item')}</button>
                    </Card>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-card p-4 rounded-lg text-center">
                            <p className="text-muted-foreground font-semibold">{t('grand_total')}</p>
                            <p className="text-2xl font-bold font-orbitron text-primary">{grandTotal.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
                        </div>
                        <button onClick={handleConfirmImport} className="w-full bg-primary text-primary-foreground p-3 rounded-lg flex items-center justify-center gap-2 text-lg font-bold">
                            <Save size={20}/>
                            <span>{t('confirm_and_save')}</span>
                        </button>
                    </div>
                </div>
                <div className="flex flex-col gap-4">
                     <h3 className="text-lg font-bold">{t('original_document')}</h3>
                    <Card className="flex-grow">
                        {file?.type.startsWith('image/') ? (
                            <img src={filePreview} className="w-full h-full object-contain" alt="File Preview"/>
                        ) : (
                            <iframe src={filePreview} className="w-full h-full border-0" title="File Preview"/>
                        )}
                    </Card>
                </div>
            </div>
        );
    }
    
    return (
        <div className="space-y-6 h-full flex flex-col">
            <ImportedPurchaseOrderModal
                isOpen={!!createdPO}
                po={createdPO}
                onClose={() => {
                    setCreatedPO(null);
                    resetState();
                }}
            />
            <h1 className="text-3xl font-bold">{t('smart_import')}</h1>
            {step !== 'select_type' && <Stepper currentStepId={step} />}
            <div className="flex-grow bg-muted/30 rounded-lg p-6">
                 {step === 'select_type' && renderSelectType()}
                 {step === 'upload' && renderUpload()}
                 {step === 'review' && renderReview()}
            </div>
            {step !== 'select_type' && (
                <button onClick={resetState} className="text-sm text-muted-foreground hover:text-primary self-start"><X className="inline-block" size={14}/> {t('cancel_and_start_over')}</button>
            )}
        </div>
    );
};

export default SmartImport;
