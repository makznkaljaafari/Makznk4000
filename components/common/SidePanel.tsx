import React from 'react';
import { X } from 'lucide-react';
import { useAppContext } from '../../contexts/AppContext';

interface SidePanelProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

const SidePanel: React.FC<SidePanelProps> = ({ isOpen, onClose, title, children }) => {
    const { language } = useAppContext();

    return (
        <>
            {/* Overlay */}
            <div
                className={`fixed inset-0 bg-black bg-opacity-50 z-[55] transition-opacity duration-300 ${
                    isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                onClick={onClose}
            ></div>

            {/* Panel */}
            <div
                className={`fixed top-0 bottom-0 shadow-2xl z-[60] w-full max-w-md bg-card border-border transition-transform duration-300 ease-in-out
                ${language === 'ar' ? 'left-0 border-l' : 'right-0 border-r'}
                ${isOpen ? 'transform-none' : (language === 'ar' ? '-translate-x-full' : 'translate-x-full')}
                `}
                role="dialog"
                aria-modal="true"
                aria-labelledby="side-panel-title"
            >
                <div className="flex flex-col h-full">
                    <header className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
                        <h2 id="side-panel-title" className="text-xl font-bold text-foreground">
                            {title}
                        </h2>
                        <button 
                            onClick={onClose} 
                            className="p-2 rounded-full text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            aria-label="Close panel"
                        >
                            <X size={24} />
                        </button>
                    </header>
                    <div className="flex-grow p-6 overflow-y-auto">
                        {children}
                    </div>
                </div>
            </div>
        </>
    );
};

export default SidePanel;