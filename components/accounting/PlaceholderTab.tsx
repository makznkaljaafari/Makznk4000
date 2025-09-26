import React from 'react';
import Card from '../common/Card';
import { useLocalization } from '../../hooks/useLocalization';

const PlaceholderTab: React.FC<{ title: string }> = ({ title }) => {
  const { t } = useLocalization();
  return (
    <Card className="h-full flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-muted-foreground">{title}</h2>
        <p className="mt-2 text-muted-foreground">{t('feature_coming_soon')}</p>
      </div>
    </Card>
  );
};

export default PlaceholderTab;
