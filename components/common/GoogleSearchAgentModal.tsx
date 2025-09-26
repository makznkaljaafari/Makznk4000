import React from 'react';
import { X } from 'lucide-react';
import { useLocalization } from '../../hooks/useLocalization';
import Spinner from './Spinner';
import Card from './Card';

interface GoogleSearchAgentModalProps {
    isOpen: boolean;
    onClose: () => void;
    isLoading: boolean;
    result: { text: string; sources: any[] } | null;
}

const GoogleSearchAgentModal: React.FC<GoogleSearchAgentModalProps> = ({ isOpen, onClose, isLoading, result }) => {
    const { t } = useLocalization();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <Card className="w-full max-w-4xl h-[90vh] flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
                <header className="flex justify-between items-center pb-4 border-b border-border">
                    <h2 className="text-2xl font-bold">{t('ai_search_results_title')}</h2>
                    <button onClick={onClose} className="p-2 rounded-full text-muted-foreground hover:bg-accent"><X size={24} /></button>
                </header>

                <div className="flex-grow overflow-y-auto p-2">
                    {isLoading ? (
                        <div className="w-full h-full flex items-center justify-center">
                            <Spinner className="w-12 h-12" />
                        </div>
                    ) : result ? (
                        <div>
                            <h3 className="text-lg font-semibold mb-2">{t('summary_from_ai')}</h3>
                            <div className="prose prose-sm dark:prose-invert max-w-none bg-muted/50 p-4 rounded-md text-foreground">
                                <p>{result.text || t('no_results_found')}</p>
                            </div>

                            {result.sources && result.sources.length > 0 && (
                                <div className="mt-6">
                                    <h3 className="text-lg font-semibold mb-2">{t('sources')}</h3>
                                    <ul className="space-y-3">
                                        {result.sources.map((source, index) => (
                                            <li key={index} className="bg-muted/50 p-3 rounded-lg border border-border">
                                                <a
                                                    href={source.web.uri}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        window.open(source.web.uri, '_blank', 'noopener,noreferrer');
                                                    }}
                                                    className="font-semibold text-primary hover:underline break-words"
                                                >
                                                    {source.web.title || source.web.uri}
                                                </a>
                                                <p className="text-xs text-muted-foreground mt-1 break-all">{source.web.uri}</p>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ) : (
                         <div className="w-full h-full flex items-center justify-center">
                            <p className="text-muted-foreground">{t('no_results_found')}</p>
                        </div>
                    )}
                </div>

                <footer className="pt-4 border-t border-border flex justify-end">
                    <button onClick={onClose} className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg shadow hover:bg-secondary/80 transition-colors">
                        {t('close')}
                    </button>
                </footer>
            </Card>
        </div>
    );
};

export default GoogleSearchAgentModal;
