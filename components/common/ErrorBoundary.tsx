

import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';
import Card from './Card';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

// A simple translation function for the component itself since hooks can't be used in class components
const t = (key: string, lang: 'ar' | 'en') => {
    const translations = {
        ar: {
            error_boundary_title: "عفوًا! حدث خطأ ما",
            error_boundary_message: "واجهنا خطأ غير متوقع. يمكنك محاولة تحديث الصفحة أو العودة لاحقًا.",
            try_again: "حاول مرة أخرى"
        },
        en: {
            error_boundary_title: "Oops! Something Went Wrong",
            error_boundary_message: "We encountered an unexpected error. You can try refreshing the page or come back later.",
            try_again: "Try Again"
        }
    };
    return translations[lang][key as keyof typeof translations[typeof lang]] || key;
}

class ErrorBoundary extends React.Component<Props, State> {
  // FIX: Added constructor to initialize state. This resolves errors where `this.state` and `this.props` were not accessible on the component instance.
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  public static getDerivedStateFromError(_: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
        const lang = document.documentElement.lang === 'ar' ? 'ar' : 'en';
        const dir = lang === 'ar' ? 'rtl' : 'ltr';

        return (
            <div dir={dir} className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 font-sans">
                <Card className="max-w-md w-full text-center">
                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/20">
                        <AlertTriangle className="h-10 w-10 text-red-600 dark:text-red-400" />
                    </div>
                    <h1 className="mt-4 text-2xl font-bold text-destructive">
                        {t('error_boundary_title', lang)}
                    </h1>
                    <p className="mt-2 text-muted-foreground">
                        {t('error_boundary_message', lang)}
                    </p>
                    <button
                        onClick={this.handleReset}
                        className="mt-6 inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-lg shadow hover:bg-primary/90 transition-colors"
                    >
                        <RotateCw size={18} />
                        <span>{t('try_again', lang)}</span>
                    </button>
                </Card>
            </div>
        );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;