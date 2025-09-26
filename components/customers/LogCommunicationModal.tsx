
import React, { useState } from 'react';
import { useLocalization } from '../../hooks/useLocalization';
import { X, Save } from 'lucide-react';
import { CommunicationLog } from '../../types';

interface LogCommunicationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (type: CommunicationLog['type'], content: string) => void;
}

const LogCommunicationModal: React.FC<LogCommunicationModalProps> = ({ isOpen, onClose, onSave }) => {
    const { t } = useLocalization();
    const [type, setType] = useState<CommunicationLog['type']>('call');
    const [content, setContent] = useState('');

    const handleSave = () => {
        if (!content.trim()) return;
        onSave(type, content);
        setContent('');
        setType('call');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[65] flex justify-center items-center p-4">
            <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-md m-4">
                <header className="p-4 border-b border-border flex justify-between items-center">
                    <h2 className="text-xl font-bold">{t('log_communication')}</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-muted-foreground hover:bg-accent"><X size={24} /></button>
                </header>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground">{t('log_type')}</label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value as CommunicationLog['type'])}
                            className="mt-1 block w-full bg-background border border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm"
                        >
                            <option value="call">{t('call')}</option>
                            <option value="visit">{t('visit')}</option>
                            <option value="email">{t('email')}</option>
                            <option value="whatsapp">{t('whatsapp')}</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground">{t('content_notes')}</label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            rows={4}
                            className="mt-1 block w-full bg-background border border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm"
                        />
                    </div>
                </div>
                <footer className="p-4 bg-muted/50 border-t border-border flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80">{t('cancel')}</button>
                    <button onClick={handleSave} disabled={!content.trim()} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50">
                        <Save size={16}/> {t('save_log')}
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default LogCommunicationModal;
