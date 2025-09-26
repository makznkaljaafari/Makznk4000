
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { Account } from '../../types';
import { useLocalization } from '../../hooks/useLocalization';
import { Search, X } from 'lucide-react';

const AccountSearchModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSelectAccount: (account: Account) => void;
}> = ({ isOpen, onClose, onSelectAccount }) => {
    const { t } = useLocalization();
    const { chartOfAccounts } = useAppStore();
    const [searchTerm, setSearchTerm] = useState('');
    const modalRef = useRef<HTMLDivElement>(null);

    const [position, setPosition] = useState({ x: 0, y: 0 });
    const dragInfoRef = useRef<{ isDragging: boolean, startX: number, startY: number, startElemX: number, startElemY: number } | null>(null);
    const [size, setSize] = useState({ width: 0, height: 0 });
    const resizeInfoRef = useRef<{ isResizing: boolean, startX: number, startY: number, startWidth: number, startHeight: number } | null>(null);

    useEffect(() => {
        if (isOpen) {
            setPosition({ x: 0, y: 0 });
            const initialWidth = Math.min(window.innerWidth * 0.9, 800);
            const initialHeight = Math.min(window.innerHeight * 0.9, 600);
            setSize({ width: initialWidth, height: initialHeight });
            setSearchTerm('');
        }
    }, [isOpen]);
    
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
                    width: Math.max(newWidth, 500),
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

    const filteredAccounts = useMemo(() => {
        if (!searchTerm) return chartOfAccounts.filter(a => a.isActive);
        const lower = searchTerm.toLowerCase();
        return chartOfAccounts.filter(a =>
            a.isActive &&
            (a.name.toLowerCase().includes(lower) || a.id.includes(lower))
        );
    }, [searchTerm, chartOfAccounts]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" role="dialog" aria-modal="true">
            <div
                ref={modalRef}
                className="bg-card border border-border rounded-lg shadow-xl flex flex-col relative"
                style={{
                  transform: `translate(${position.x}px, ${position.y}px)`,
                  width: size.width ? `${size.width}px` : undefined,
                  height: size.height ? `${size.height}px` : undefined,
                }}
            >
                <header onMouseDown={onDragMouseDown} className="p-4 border-b border-border flex justify-between items-center flex-shrink-0 cursor-grab active:cursor-grabbing">
                    <h2 className="text-xl font-bold">{t('search_account')}</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-muted-foreground hover:bg-accent cursor-pointer"><X size={24} /></button>
                </header>
                <div className="p-4 flex-shrink-0">
                    <div className="relative">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={t('search_account') + '...'}
                            className="w-full p-2 ps-10 border border-input rounded-md bg-background focus:ring-2 focus:ring-ring"
                            autoFocus
                        />
                        <Search className="absolute top-1/2 start-3 transform -translate-y-1/2 text-muted-foreground" size={20} />
                    </div>
                </div>
                <div className="flex-grow overflow-y-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground uppercase bg-muted/50 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-3">{t('account_id')}</th>
                                <th className="px-6 py-3">{t('account_name')}</th>
                                <th className="px-6 py-3">{t('account_type')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredAccounts.map(acc => (
                                <tr key={acc.id} onClick={() => { onSelectAccount(acc); onClose(); }} className="hover:bg-accent cursor-pointer">
                                    <td className="px-6 py-4 font-mono">{acc.id}</td>
                                    <td className="px-6 py-4 font-medium">{acc.name}</td>
                                    <td className="px-6 py-4">{t(acc.type)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <footer className="p-4 bg-muted/50 border-t border-border flex justify-end gap-3 flex-shrink-0">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80">{t('close')}</button>
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
export default AccountSearchModal;
