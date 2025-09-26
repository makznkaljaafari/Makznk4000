import React, { useState, useEffect, useRef } from 'react';
import { X, CameraOff } from 'lucide-react';
import { useLocalization } from '../../hooks/useLocalization';
import { useToast } from '../../contexts/ToastContext';

interface BarcodeScannerProps {
    isOpen: boolean;
    onClose: () => void;
    onScan: (scannedValue: string) => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ isOpen, onClose, onScan }) => {
    const { t } = useLocalization();
    const { addToast } = useToast();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    // Check for BarcodeDetector support
    const isBarcodeDetectorSupported = 'BarcodeDetector' in window;

    useEffect(() => {
        if (!isOpen) {
            // Stop camera stream when modal is closed
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
                setStream(null);
            }
            return;
        }
        
        if (!isBarcodeDetectorSupported) {
            setError(t('barcode_not_supported'));
            addToast(t('barcode_not_supported'), 'error');
            return;
        }

        let animationFrameId: number;
        const barcodeDetector = new (window as any).BarcodeDetector({ formats: ['code_128', 'ean_13', 'qr_code'] });

        const detectBarcode = async () => {
            if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
                try {
                    const barcodes = await barcodeDetector.detect(videoRef.current);
                    if (barcodes.length > 0) {
                        onScan(barcodes[0].rawValue);
                        onClose();
                    } else {
                        animationFrameId = requestAnimationFrame(detectBarcode);
                    }
                } catch (err) {
                    console.error('Barcode detection failed:', err);
                    animationFrameId = requestAnimationFrame(detectBarcode);
                }
            } else {
                animationFrameId = requestAnimationFrame(detectBarcode);
            }
        };

        const startCamera = async () => {
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                setStream(mediaStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                    videoRef.current.play();
                    animationFrameId = requestAnimationFrame(detectBarcode);
                }
            } catch (err) {
                console.error("Camera access error:", err);
                setError(t('no_camera_access'));
                addToast(t('no_camera_access'), 'error');
            }
        };

        startCamera();

        return () => {
            cancelAnimationFrame(animationFrameId);
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [isOpen, onScan, onClose, t, addToast, isBarcodeDetectorSupported, stream]);


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-[100] flex flex-col justify-center items-center" onClick={onClose}>
            <div className="relative w-full max-w-lg h-auto aspect-video bg-black rounded-lg overflow-hidden" onClick={e => e.stopPropagation()}>
                <video ref={videoRef} className="w-full h-full object-cover" playsInline />
                
                {/* Scan box overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-3/4 h-1/2 border-4 border-dashed border-primary/70 rounded-lg shadow-lg"/>
                </div>

                {error && (
                    <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white p-4">
                        <CameraOff size={48} className="mb-4 text-red-500" />
                        <p className="text-lg font-bold">{error}</p>
                    </div>
                )}
            </div>
             <button onClick={onClose} className="absolute top-4 end-4 p-2 bg-white/20 rounded-full text-white hover:bg-white/40">
                <X size={24}/>
            </button>
             <p className="mt-4 text-white font-semibold">{t('scan_item_barcode')}</p>
        </div>
    );
};

export default BarcodeScanner;
