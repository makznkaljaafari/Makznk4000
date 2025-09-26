import React, { useState, useEffect, useRef } from 'react';
import { Part } from '../../types';
import { useLocalization } from '../../hooks/useLocalization';
import { Sparkles, Save, ArrowLeft, Upload } from 'lucide-react';
import { getPricingSuggestion } from '../../services/geminiService';
import { useAppStore } from '../../stores/useAppStore';
import { useToast } from '../../contexts/ToastContext';
import Card from '../common/Card';
import Spinner from '../common/Spinner';
import { createPart } from '../../services/databaseService';

const FormField: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({ label, children, className = '' }) => (
    <div className={className}>
        <label className="block text-sm font-medium text-muted-foreground mb-1">{label}</label>
        {children}
    </div>
);

const TagInput: React.FC<{ value: string[]; onChange: (value: string[]) => void; placeholder: string; }> = ({ value, onChange, placeholder }) => {
    const [inputValue, setInputValue] = useState('');

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === ',' || e.key === 'Enter') {
            e.preventDefault();
            const newTag = inputValue.trim();
            if (newTag && !value.includes(newTag)) {
                onChange([...value, newTag]);
            }
            setInputValue('');
        }
    };

    const removeTag = (tagToRemove: string) => {
        onChange(value.filter(tag => tag !== tagToRemove));
    };

    return (
        <div>
            <div className="flex flex-wrap gap-2 mb-2 min-h-[24px]">
                {value.map(tag => (
                    <span key={tag} className="flex items-center gap-1 bg-secondary text-secondary-foreground text-xs font-medium px-2 py-1 rounded-full">
                        {tag}
                        <button onClick={() => removeTag(tag)} className="text-muted-foreground hover:text-foreground">&times;</button>
                    </span>
                ))}
            </div>
            <input
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="w-full p-2 bg-input rounded-md text-sm"
            />
        </div>
    );
};


const CreatePartForm: React.FC<{ setActiveTab: (tab: string) => void }> = ({ setActiveTab }) => {
    const { t } = useLocalization();
    const { sales, currentUser, addPart } = useAppStore();
    const { addToast } = useToast();
    
    const [part, setPart] = useState<Omit<Part, 'id' | 'companyId' | 'stock'>>({
        name: '', partNumber: '', brand: '', category: '', unit: '', minStock: 10, sellingPrice: 0,
        purchasePrice: 0, averageCost: 0, location: '', imageUrl: '', compatibleModels: [],
        notes: '', size: '', alternativePartNumbers: []
    });

    const [isSuggestingPrice, setIsSuggestingPrice] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setPart(p => ({ ...p, [name]: (e.target.type === 'number') ? parseFloat(value) || 0 : value }));
    };
    
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPart(p => ({...p, imageUrl: reader.result as string}));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        if (!currentUser) return;
        if (!part.name || !part.partNumber) {
            addToast(t('error_missing_fields'), 'error');
            return;
        }

        setIsSaving(true);
        try {
            const partToCreate: Omit<Part, 'id'> = { 
                ...part, 
                companyId: currentUser.companyId, 
                stock: 0,
                imageUrl: part.imageUrl || `https://picsum.photos/seed/${part.name.replace(/\s+/g, '-')}/200/200`
            };
            const newPartFromDB = await createPart(partToCreate);
            addPart(newPartFromDB);
            addToast(t('item_added_success'), 'success');
            setActiveTab('list');
        } catch (error) {
            console.error("Failed to save part:", error);
            addToast(error instanceof Error ? error.message : t('failed_to_save_item'), 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSuggestPrice = async () => {
        if (!part.name || !part.purchasePrice || part.purchasePrice <= 0) {
            addToast(t('error_provide_name_and_purchase_price'), 'warning');
            return;
        }
        setIsSuggestingPrice(true);
        try {
            const suggestion = await getPricingSuggestion(part as Part, sales);
            if (suggestion) {
                setPart(p => ({ ...p, sellingPrice: suggestion.suggestedPrice }));
                addToast(`${t('suggestion')}: ${suggestion.reason}`, 'info');
            } else {
                addToast(t('failed_to_get_pricing_suggestion'), 'error');
            }
        } catch (error) {
            addToast(t((error as Error).message), 'error');
        } finally {
            setIsSuggestingPrice(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">{t('add_new_item')}</h2>
                <div className="flex gap-2">
                    <button onClick={() => setActiveTab('list')} className="flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-lg">
                        <ArrowLeft size={16}/> {t('back_to_list')}
                    </button>
                    <button onClick={handleSave} disabled={isSaving} className="flex items-center justify-center gap-2 w-28 bg-primary text-primary-foreground px-4 py-2 rounded-lg disabled:opacity-70">
                        {isSaving ? <Spinner className="w-5 h-5" /> : <Save size={18} />}
                        <span>{t('save')}</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <div className="p-4">
                            <h3 className="font-bold mb-4">{t('basic_information')}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField label={t('part_name')}><input name="name" value={part.name} onChange={handleChange} className="w-full p-2 bg-input rounded-md" /></FormField>
                                <FormField label={t('part_number')}><input name="partNumber" value={part.partNumber} onChange={handleChange} className="w-full p-2 bg-input rounded-md" /></FormField>
                                <FormField label={t('brand')}><input name="brand" value={part.brand} onChange={handleChange} className="w-full p-2 bg-input rounded-md" /></FormField>
                                <FormField label={t('category')}><input name="category" value={part.category} onChange={handleChange} className="w-full p-2 bg-input rounded-md" /></FormField>
                                <FormField label={t('unit')}><input name="unit" value={part.unit} onChange={handleChange} className="w-full p-2 bg-input rounded-md" /></FormField>
                                <FormField label={t('location')}><input name="location" value={part.location} onChange={handleChange} className="w-full p-2 bg-input rounded-md" /></FormField>
                            </div>
                        </div>
                    </Card>
                     <Card>
                        <div className="p-4">
                             <h3 className="font-bold mb-4">{t('pricing_and_stock')}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField label={t('purchase_price')}><input name="purchasePrice" type="number" value={part.purchasePrice} onChange={handleChange} className="w-full p-2 bg-input rounded-md" /></FormField>
                                <FormField label={t('selling_price')}>
                                     <div className="relative">
                                        <input name="sellingPrice" type="number" value={part.sellingPrice} onChange={handleChange} className="w-full p-2 bg-input rounded-md pe-10" />
                                        <button onClick={handleSuggestPrice} disabled={isSuggestingPrice} className="absolute end-2 top-1/2 -translate-y-1/2 p-1 text-primary rounded-full hover:bg-primary/10 disabled:cursor-not-allowed" title={t('ai_pricing_agent')}>
                                            {isSuggestingPrice ? <Spinner className="w-5 h-5" /> : <Sparkles size={18} />}
                                        </button>
                                    </div>
                                </FormField>
                                <FormField label={t('min_stock')}><input name="minStock" type="number" value={part.minStock} onChange={handleChange} className="w-full p-2 bg-input rounded-md" /></FormField>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Right Column */}
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <div className="p-4">
                            <h3 className="font-bold mb-4">{t('part_image')}</h3>
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full aspect-square bg-input rounded-lg flex items-center justify-center cursor-pointer border-2 border-dashed border-transparent hover:border-primary"
                            >
                                <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                                {part.imageUrl ? (
                                    <img src={part.imageUrl} alt="Part Preview" className="w-full h-full object-cover rounded-lg"/>
                                ) : (
                                    <div className="text-center text-muted-foreground">
                                        <Upload size={48} className="mx-auto"/>
                                        <p className="text-sm mt-2">{t('upload_image_prompt')}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                     <Card>
                        <div className="p-4">
                            <h3 className="font-bold mb-4">{t('additional_details')}</h3>
                            <div className="space-y-4">
                                 <FormField label={t('size')}><input name="size" value={part.size} onChange={handleChange} className="w-full p-2 bg-input rounded-md" /></FormField>
                                <FormField label={t('compatible_models')}><TagInput value={part.compatibleModels} onChange={v => setPart(p => ({...p, compatibleModels: v}))} placeholder={t('compatible_models_placeholder')} /></FormField>
                                <FormField label={t('alternative_part_numbers')}><TagInput value={part.alternativePartNumbers} onChange={v => setPart(p => ({...p, alternativePartNumbers: v}))} placeholder={t('alternative_part_numbers_placeholder')} /></FormField>
                                <FormField label={t('notes')}><textarea name="notes" value={part.notes} onChange={handleChange} rows={3} className="w-full p-2 bg-input rounded-md"/></FormField>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default CreatePartForm;
