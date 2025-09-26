



import React, { useState, useRef, useEffect } from 'react';
import { useLocalization } from '../../hooks/useLocalization';
import { useAppStore } from '../../stores/useAppStore';
import { AiPrediction, Part, Customer, VehicleInfo, PartSearchAgentParams } from '../../types';
import GoogleSearchAgentModal from './common/GoogleSearchAgentModal';
import { useToast } from '../../contexts/ToastContext';
import { generatePurchaseRecommendations, identifyPartFromImage, assessCustomerCreditRisk, decodeVin, searchForPartWithGoogle } from '../../services/geminiService';

import DemandForecastingCard from './ai/DemandForecastingCard';
import ImageRecognitionCard from './ai/ImageRecognitionCard';
import CreditScoringCard from './ai/CreditScoringCard';
import VinDecoderCard from './ai/VinDecoderCard';
import PartSearchAgentCard from './ai/PartSearchAgentCard';


const AiFeatures: React.FC<{ setActiveView: (view: string) => void; }> = ({ setActiveView }) => {
  const { t } = useLocalization();
  const { sales, parts, customers } = useAppStore();
  const { addToast } = useToast();

  const [recommendations, setRecommendations] = useState<AiPrediction[] | null>(null);
  const [isRecLoading, setIsRecLoading] = useState(false);
  
  const [identificationResult, setIdentificationResult] = useState<{bestMatch: Part | null, description: string} | null>(null);
  const [isIdentLoading, setIsIdentLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [creditRisk, setCreditRisk] = useState<{ riskLevel: string, recommendation: string} | null>(null);
  const [isRiskLoading, setIsRiskLoading] = useState(false);

  const [vin, setVin] = useState('');
  const [vehicleInfo, setVehicleInfo] = useState<VehicleInfo | null>(null);
  const [isVinLoading, setIsVinLoading] = useState(false);

  const [searchAgentForm, setSearchAgentForm] = useState<PartSearchAgentParams>({
    description: '', partNumber: '', size: '', vin: '', carName: '', model: '', origin: '', engineSize: '', transmission: '', fuelType: ''
  });
  const [searchAgentResult, setSearchAgentResult] = useState<{ text: string; sources: any[] } | null>(null);
  const [isSearchAgentLoading, setIsSearchAgentLoading] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  
  const handleSearchAgentFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setSearchAgentForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSearchAgent = async () => {
      // FIX: Cast value to string before calling trim to avoid type errors.
      if (Object.values(searchAgentForm).every(v => String(v).trim() === '')) {
          addToast(t('fill_at_least_one_field'), 'warning');
          return;
      }
      setIsSearchModalOpen(true);
      setIsSearchAgentLoading(true);
      setSearchAgentResult(null);
      try {
        const result = await searchForPartWithGoogle(searchAgentForm);
        setSearchAgentResult(result);
      } catch (error) {
        addToast(t((error as Error).message), 'error');
        setIsSearchModalOpen(false);
      } finally {
        setIsSearchAgentLoading(false);
      }
  };

  useEffect(() => {
    if (!selectedCustomer && customers.length > 0) {
      setSelectedCustomer(customers[0].id);
    }
  }, [customers, selectedCustomer]);
  
  const handleGenerateRecommendations = async () => {
    setIsRecLoading(true);
    setRecommendations(null);
    try {
        const result = await generatePurchaseRecommendations(sales, parts);
        setRecommendations(result);
    } catch(error) {
        addToast(t((error as Error).message), 'error');
    } finally {
        setIsRecLoading(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleIdentifyPart = async () => {
      if (!imagePreview) return;
      setIsIdentLoading(true);
      setIdentificationResult(null);
      try {
        const base64Image = imagePreview.split(',')[1];
        const result = await identifyPartFromImage(base64Image, parts);
        setIdentificationResult(result);
      } catch (error) {
         addToast(t((error as Error).message), 'error');
      } finally {
        setIsIdentLoading(false);
      }
  }

  const handleAssessRisk = async () => {
      const customer = customers.find(c => c.id === selectedCustomer);
      if(!customer) return;
      setIsRiskLoading(true);
      setCreditRisk(null);
      try {
        const result = await assessCustomerCreditRisk(customer);
        setCreditRisk(result);
      } catch(error) {
        addToast(t((error as Error).message), 'error');
      } finally {
        setIsRiskLoading(false);
      }
  }
   const handleDecodeVin = async () => {
    if (!vin.trim() || vin.trim().length !== 17) return;
    setIsVinLoading(true);
    setVehicleInfo(null);
    try {
        const result = await decodeVin(vin.trim().toUpperCase());
        setVehicleInfo(result);
    } catch (error) {
        addToast(t((error as Error).message), 'error');
    } finally {
        setIsVinLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t('ai_features')}</h1>
      <p className="text-muted-foreground">{t('ai_tools_for_growth')}</p>

       <GoogleSearchAgentModal
            isOpen={isSearchModalOpen}
            onClose={() => setIsSearchModalOpen(false)}
            isLoading={isSearchAgentLoading}
            result={searchAgentResult}
        />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DemandForecastingCard
          onGenerate={handleGenerateRecommendations}
          isLoading={isRecLoading}
          recommendations={recommendations}
        />

        <ImageRecognitionCard
          onIdentify={handleIdentifyPart}
          isLoading={isIdentLoading}
          imagePreview={imagePreview}
          onImageUpload={handleImageUpload}
          identificationResult={identificationResult}
        />
        
        <CreditScoringCard
          onAssessRisk={handleAssessRisk}
          isLoading={isRiskLoading}
          selectedCustomer={selectedCustomer}
          setSelectedCustomer={setSelectedCustomer}
          customers={customers}
          creditRisk={creditRisk}
        />

        <VinDecoderCard
          onDecodeVin={handleDecodeVin}
          isLoading={isVinLoading}
          vin={vin}
          setVin={setVin}
          vehicleInfo={vehicleInfo}
          setActiveView={() => {}}
        />

        <PartSearchAgentCard
          onSearch={handleSearchAgent}
          isLoading={isSearchAgentLoading}
          formState={searchAgentForm}
          onFormChange={handleSearchAgentFormChange}
        />
      </div>
    </div>
  );
};

export default AiFeatures;