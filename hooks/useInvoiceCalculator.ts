import { useState, useMemo, useCallback } from 'react';
import { Part, PartKit } from '../types';

export interface FormInvoiceItem {
  id: number;
  type: 'part' | 'kit';
  partId?: string;
  kitId?: string;
  kitItems?: { partId: string; name: string; quantityPerKit: number; price: number }[];
  name: string;
  unit: string;
  quantity: number;
  price: number;
  discountPercent: number;
  discountAmount: number;
  notes: string;
  total: number;
}

const getEmptyRow = (): FormInvoiceItem => ({
  id: Date.now() + Math.random(),
  type: 'part',
  partId: '',
  name: '',
  unit: 'item',
  quantity: 1,
  price: 0,
  discountPercent: 0,
  discountAmount: 0,
  notes: '',
  total: 0,
});

export const useInvoiceCalculator = (initialItems: FormInvoiceItem[] = [getEmptyRow()], taxRate: number = 0.15, riyalValuePerPoint: number = 0) => {
    const [items, setItems] = useState<FormInvoiceItem[]>(initialItems);
    const [loyaltyPointsToUse, setLoyaltyPointsToUse] = useState(0);

    const updateItem = useCallback((index: number, newValues: Partial<FormInvoiceItem>) => {
        setItems(prevItems => {
            const newItems = [...prevItems];
            let item = { ...newItems[index], ...newValues };
            
            const quantity = Number(item.quantity) || 0;
            const price = Number(item.price) || 0;
            const grossTotal = quantity * price;

            if (grossTotal > 0) {
                 if (newValues.discountPercent !== undefined) {
                    const discountPercent = Math.max(0, Math.min(100, Number(newValues.discountPercent) || 0));
                    item.discountPercent = discountPercent;
                    item.discountAmount = parseFloat((grossTotal * (discountPercent / 100)).toFixed(2));
                } else if (newValues.discountAmount !== undefined) {
                    const discountAmount = Math.max(0, Number(newValues.discountAmount) || 0);
                    item.discountAmount = discountAmount;
                    item.discountPercent = parseFloat(((discountAmount / grossTotal) * 100).toFixed(2));
                }
            } else {
                 item.discountAmount = 0;
                 item.discountPercent = 0;
            }
           
            item.total = grossTotal - item.discountAmount;
            newItems[index] = item;
            
            return newItems;
        });
    }, []);
    
    const addItem = () => {
        setItems(prev => [...prev, getEmptyRow()]);
    };
    
    const addFilledItem = (prefill: Partial<FormInvoiceItem>) => {
        const newRow = { ...getEmptyRow(), ...prefill, type: 'part' as const };
        if (prefill?.price !== undefined && prefill?.quantity !== undefined) {
            const quantity = Number(prefill.quantity) || 0;
            const price = Number(prefill.price) || 0;
            const grossTotal = quantity * price;
            const discountAmount = Number(prefill.discountAmount) || 0;
            newRow.total = grossTotal - discountAmount;
        }
        setItems(prev => [...prev, newRow]);
    };
    
    const addKit = (kit: PartKit, kitComponents: { partId: string; name: string; quantityPerKit: number; price: number }[]) => {
        const kitPrice = kitComponents.reduce((sum, item) => sum + (item.price * item.quantityPerKit), 0);
        const newRow: FormInvoiceItem = {
            ...getEmptyRow(),
            type: 'kit',
            kitId: kit.id,
            name: kit.name,
            kitItems: kitComponents,
            quantity: 1,
            price: kitPrice,
            total: kitPrice,
            unit: 'kit',
        };
        setItems(prev => [...prev.filter(i => i.partId || i.kitId), newRow]);
    };

    const removeItem = (id: number) => {
        setItems(prev => {
            const newItems = prev.filter(item => item.id !== id);
            if (newItems.length > 0) {
                return newItems;
            }
            return [getEmptyRow()];
        });
    };

    const removeItems = (ids: number[]) => {
        setItems(prev => {
            const newItems = prev.filter(item => !ids.includes(item.id));
            if (newItems.length > 0) {
                return newItems;
            }
            return [getEmptyRow()];
        });
    };
    
    const copyItems = (ids: number[]) => {
        setItems(prev => {
            const itemsToCopy = prev.filter(item => ids.includes(item.id));
            const newCopiedItems = itemsToCopy.map(item => ({ ...item, id: Date.now() + Math.random() }));
            return [...prev, ...newCopiedItems];
        });
    };
    
    const selectPartForRow = (index: number, part: Part, price: number) => {
        updateItem(index, {
            type: 'part',
            partId: part.id,
            name: part.name,
            price: price,
            unit: 'item',
            quantity: 1,
            discountPercent: 0,
            discountAmount: 0,
            notes: ''
        });
    };

    const resetItems = () => {
        setItems([getEmptyRow()]);
        setLoyaltyPointsToUse(0);
    };

    const totals = useMemo(() => {
        const VAT_RATE = taxRate;
        const validItems = items.filter(i => (i.partId || i.kitId) && i.quantity > 0);
        
        const subtotal = validItems.reduce((acc, item) => acc + (item.quantity * item.price), 0);
        const totalDiscount = validItems.reduce((acc, item) => acc + item.discountAmount, 0);

        const netTotal = subtotal - totalDiscount;
        const vat = netTotal * VAT_RATE;
        
        const loyaltyDiscount = loyaltyPointsToUse * riyalValuePerPoint;
        const grandTotal = Math.max(0, netTotal + vat - loyaltyDiscount);

        return { subtotal, totalDiscount, netTotal, vat, grandTotal, loyaltyDiscount };
    }, [items, taxRate, loyaltyPointsToUse, riyalValuePerPoint]);
    
    const actions = {
        addItem,
        addFilledItem,
        addKit,
        removeItem,
        updateItem,
        selectPartForRow,
        resetItems,
        setLoyaltyPointsToUse,
        removeItems,
        copyItems,
    };
    
    return [items, actions, totals, loyaltyPointsToUse] as const;
};