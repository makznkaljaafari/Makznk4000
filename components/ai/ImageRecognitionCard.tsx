import React, { useRef } from 'react';
import Card from '../common/Card';
import Spinner from '../common/Spinner';
import { useLocalization } from '../../hooks/useLocalization';
import { Part } from '../../types';
import { Camera } from 'lucide-react';

interface ImageRecognitionCardProps {
    onIdentify: () => void;
    isLoading: boolean;
    imagePreview: string | null;
    onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    identificationResult: { bestMatch: Part | null, description: string } | null;
}

const ImageRecognitionCard: React.FC<ImageRecognitionCardProps> = ({
    onIdentify,
    isLoading,
    imagePreview,
    onImageUpload,
    identificationResult
}) => {
    const { t } = useLocalization();
    const imageInputRef = useRef<HTMLInputElement>(null);

    return (
        <Card className="flex flex-col">
            <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Camera size={24} />
                </div>
                <div>
                    <h3 className="text-lg font-bold">{t('image_recognition')}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{t('image_recognition_desc')}</p>
                </div>
            </div>
            <div className="mt-4 flex-grow">
                <input type="file" accept="image/*" capture="environment" ref={imageInputRef} onChange={onImageUpload} className="hidden" />
                <button onClick={() => imageInputRef.current?.click()} className="w-full border-2 border-dashed border-border rounded-lg p-4 text-center text-muted-foreground hover:border-primary transition-colors">
                    {imagePreview ? <img src={imagePreview} alt="Preview" className="w-24 h-24 mx-auto rounded-md object-cover" loading="lazy"/> : <span>{t('upload_image')}</span>}
                </button>
                {identificationResult && (
                    <div className="mt-2 text-sm">
                        <p>{identificationResult.description}</p>
                        {identificationResult.bestMatch ? (
                            <div className="mt-1 p-2 bg-green-500/10 text-green-700 dark:text-green-300 rounded-md">
                                <p className="font-bold">{t('best_match_from_inventory')}</p>
                                <p>{identificationResult.bestMatch.name} ({identificationResult.bestMatch.partNumber})</p>
                            </div>
                        ) : <p className="text-yellow-500">{t('no_match_found')}</p>}
                    </div>
                )}
            </div>
            <div className="mt-4">
                <button onClick={onIdentify} disabled={isLoading || !imagePreview} className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition-colors disabled:bg-muted disabled:text-muted-foreground flex items-center justify-center gap-2">
                    {isLoading && <Spinner className="w-5 h-5 border-white" />}
                    <span>{isLoading ? t('loading') : t('identify_part')}</span>
                </button>
            </div>
        </Card>
    );
};

export default ImageRecognitionCard;
