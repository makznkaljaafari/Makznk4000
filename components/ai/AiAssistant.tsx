
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat, GenerateContentResponse, Part as ContentPart } from "@google/genai";
import { Sparkles, X, Send, Bot, User, Globe, MessageSquare, Search as SearchIcon } from 'lucide-react';
import { useLocalization } from '../../hooks/useLocalization';
import Card from '../common/Card';
import Spinner from '../common/Spinner';
import { useAppStore } from '../../stores/useAppStore';
import { Part, AlternativeSuggestion, Customer, Sale } from '../../types';
import PartCard from './PartCard';
import { findAlternativeParts, suggestCollectionAction, parseInvoiceCommand, generateReportFromCommand } from '../../services/geminiService';


// Define message structure
interface AiMessage {
    role: 'user' | 'model';
    parts: ContentPart[];
    sources?: any[];
}

// Create a dynamic system instruction for app-related queries
const createAppSystemInstruction = (parts: Part[]): string => {
    const partsList = parts.map(p => 
        `- ${p.name} (رقم: ${p.partNumber}, ماركة: ${p.brand}, متوفر: ${p.stock}, ID: ${p.id})`
    ).join('\n');

    return `أنت "مساعد"، مساعد ذكي وخارق وخبير في قطع غيار السيارات. هدفك هو دعم المستخدمين في متجر لقطع غيار السيارات.
- **اسمك:** مساعد.
- **خبرتك:** متخصص في جميع أنواع السيارات وقطع غيارها، بما في ذلك أرقام القطع الأصلية (OEM) والبديلة، والمواصفات الفنية، وطرق عمل القطع.
- **لهجتك:** تتحدث العربية بطلاقة، وتفهم المصطلحات العامية لقطع السيارات (مثل: طرمبة، فحمات، بواجي، كويلات، رديتر، دبرياج).

**قواعد صارمة يجب اتباعها:**

1.  **عندما يسأل المستخدم عن رقم قطعة لسيارة معينة (مثال: "رقم فلتر زيت كامري 2021"):**
    *   **ابحث بدقة:** استخدم معرفتك وبحث جوجل للعثور على رقم القطعة الأصلي (OEM).
    *   **ابحث عن بدائل:** اعثر على أرقام القطع البديلة من شركات أخرى (Aftermarket) إن وجدت.
    *   **اذكر المواصفات:** إذا كانت للقطعة مواصفات هامة (مثل مقاس، حجم، نوع)، قم بذكرها بوضوح.
    *   **تحقق من المخزون:** قارن النتائج بقائمة المخزون المتوفرة أدناه. إذا وجدت تطابقاً في رقم القطعة أو الاسم، أبلغ المستخدم بتوفرها في المخزون.
    *   **التنسيق:** قدم إجابتك بشكل منظم وواضح، مثلاً في قائمة نقطية.

2.  **عندما يسأل المستخدم عن كيفية عمل قطعة (مثال: "كيف تعمل طرمبة البنزين؟"):**
    *   **اشرح بالتفصيل:** قدم شرحًا واضحًا ومبسطًا لوظيفة القطعة، وأهميتها في السيارة، وكيفية عملها خطوة بخطوة.

3.  **عندما تستخدم بحث جوجل:**
    *   **اذكر المصادر:** يجب عليك دائمًا إدراج روابط المصادر التي استخدمتها في نهاية إجابتك تحت عنوان "مصادر من الويب".

4.  **عندما تذكر قطعة موجودة في المخزون:**
    *   **يجب** عليك تضمين معرف القطعة بالتنسيق التالي: \`[PART:part_id_here]\`. مثال: 'نعم، هذه القطعة متوفرة لدينا: [PART:p001]'. لا تضف أي نص داخل القوسين سوى المعرف.

**قائمة المخزون الحالية للرجوع إليها:**
${partsList}
`;
};

// System instruction for web search queries
const webSystemInstruction = 'أنت مساعد بحث ويب مفيد وودود. هدفك هو تقديم إجابات دقيقة وموجزة لأسئلة المستخدم بناءً على نتائج بحث جوجل. قم دائمًا بذكر مصادرك.';


const parseMessageText = (text: string, setActiveView: (view: string) => void) => {
    const partRegex = /\[PART:([\w-]+)\]/g;
    const parts = text.split(partRegex);

    return parts.map((part, index) => {
        if (index % 2 === 1) { // This is a part ID
            return <PartCard key={`${part}-${index}`} partId={part} setActiveView={setActiveView} />;
        } else {
            // Simple markdown for bold and lists
            const bolded = part.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            const listed = bolded.replace(/^\s*-\s/gm, '• ').replace(/^\s*\*\s/gm, '• ');
            return <span key={index} dangerouslySetInnerHTML={{ __html: listed }} />;
        }
    });
};


const AiAssistant: React.FC<{ setActiveView: (view: string) => void }> = ({ setActiveView }) => {
    const { t } = useLocalization();
    const { parts, sales, customers, aiAppMessages, setAiAppMessages, aiWebMessages, setAiWebMessages, isAiAssistantOpen, aiAssistantContext, openAiAssistant, closeAiAssistant, setFormPrefill, setSalesActiveTab } = useAppStore();
    
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'app' | 'web'>('app');
    const [appChat, setAppChat] = useState<Chat | null>(null);
    const [webChat, setWebChat] = useState<Chat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initialize Chat instances
    useEffect(() => {
        try {
            const API_KEY = process.env.API_KEY;
            if (!API_KEY) {
                console.warn("API_KEY for Gemini not set.");
                return;
            }
            const ai = new GoogleGenAI({ apiKey: API_KEY });
            
            // App Chat
            const appSystemInstruction = createAppSystemInstruction(parts);
            const appHistory = aiAppMessages.map(({sources, ...rest}) => rest); // remove sources
            const newAppChat = ai.chats.create({
                model: 'gemini-2.5-flash',
                config: { systemInstruction: appSystemInstruction, tools: [{ googleSearch: {} }] },
                history: appHistory
            });
            setAppChat(newAppChat);

            // Web Chat
            const webHistory = aiWebMessages.map(({sources, ...rest}) => rest); // remove sources
            const newWebChat = ai.chats.create({
                model: 'gemini-2.5-flash',
                config: { systemInstruction: webSystemInstruction, tools: [{ googleSearch: {} }] },
                history: webHistory
            });
            setWebChat(newWebChat);

        } catch (error) {
            console.error("Failed to initialize AI Assistant:", error);
        }
    }, [parts, aiAppMessages, aiWebMessages]);
    
    const sendInput = async (text: string) => {
        if (!text.trim() || isLoading) return;

        const userMessage: AiMessage = { role: 'user', parts: [{ text }] };
        const setMessages = activeTab === 'app' ? setAiAppMessages : setAiWebMessages;
        
        setIsLoading(true);
        setMessages(prev => [...prev, userMessage]);

        // App-specific commands
        if (activeTab === 'app') {
            // Check for invoice creation command
            const invoiceData = await parseInvoiceCommand(text);
            if (invoiceData) {
                setFormPrefill({ form: 'sale', data: invoiceData });
                setActiveView('sales');
                setSalesActiveTab('create');
                
                const modelMessage: AiMessage = { role: 'model', parts: [{ text: t('ai_prefilled_invoice') }] };
                setMessages(prev => [...prev, modelMessage]);
                setIsLoading(false);
                return;
            }
            
            // Check for report command
            const reportKeywords = ['تقرير', 'ملخص', 'report', 'summary', 'أعطني', 'كم مبيعات'];
            if (reportKeywords.some(keyword => text.toLowerCase().includes(keyword))) {
                const thinkingMessage: AiMessage = { role: 'model', parts: [{ text: t('ai_generating_report') }] };
                setMessages(prev => [...prev, thinkingMessage]);
                
                try {
                    const reportText = await generateReportFromCommand(text, sales, customers, parts);
                    const reportMessage: AiMessage = { role: 'model', parts: [{ text: reportText || t('failed_to_generate_report') }] };
                    setMessages(prev => [...prev.slice(0, -1), reportMessage]);
                } catch (error) {
                    const errorMessage: AiMessage = { role: 'model', parts: [{ text: (error as Error).message || t('failed_to_generate_report') }] };
                     setMessages(prev => [...prev.slice(0, -1), errorMessage]);
                }
                
                setIsLoading(false);
                return;
            }
        }
        
        const chat = activeTab === 'app' ? appChat : webChat;
        if (!chat) {
             setIsLoading(false);
             return;
        }

        try {
            const responseStream = await chat.sendMessageStream({ message: text });
            
            let modelResponse: AiMessage = { role: 'model', parts: [{ text: '' }], sources: [] };
            setMessages(prev => [...prev, modelResponse]);

            let finalResponse: GenerateContentResponse | undefined;
            let combinedText = '';

            for await (const chunk of responseStream) {
                finalResponse = chunk;
                if (chunk.text) {
                     combinedText += chunk.text;
                     setMessages(prev => prev.map((msg, index) => {
                        if (index === prev.length - 1 && msg.role === 'model') {
                           const lastPart = msg.parts[msg.parts.length -1];
                           if(lastPart && 'text' in lastPart){
                               lastPart.text = combinedText;
                           }
                           return {...msg};
                        }
                        return msg;
                    }));
                }
            }
            
            const sources = finalResponse?.candidates?.[0]?.groundingMetadata?.groundingChunks;
            if (sources && sources.length > 0) {
                 setMessages(prev => prev.map((msg, index) => {
                    if (index === prev.length - 1 && msg.role === 'model') {
                        return { ...msg, sources };
                    }
                    return msg;
                }));
            }

        } catch (error) {
            console.error("Error sending message to Gemini:", error);
            const errorMessage: AiMessage = { role: 'model', parts: [{ text: t('error_ai_assistant') }] };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleInitialAction = async (context: { prompt: string | null; payload?: any }) => {
        const { prompt, payload } = context;
        if (prompt) {
            const userMessage: AiMessage = { role: 'user', parts: [{ text: prompt }] };
            setAiAppMessages(prev => [...prev, userMessage]);
        }
        
        setIsLoading(true);

        if (payload?.type === 'find_alternatives') {
            try {
                const results = await findAlternativeParts(payload.data, parts);
                let responseText = '';
                if (results && results.length > 0) {
                    responseText = t('found_alternatives_for_you') + '\n';
                    results.forEach(alt => {
                        responseText += `[PART:${alt.partId}] - ${alt.reason}\n`;
                    });
                } else {
                    responseText = t('no_alternatives_found');
                }
                const modelMessage: AiMessage = { role: 'model', parts: [{ text: responseText }] };
                setAiAppMessages(prev => [...prev, modelMessage]);

            } catch (error) {
                const errorMessage: AiMessage = { role: 'model', parts: [{ text: t('failed_to_find_alternatives') }] };
                setAiAppMessages(prev => [...prev, errorMessage]);
            }
        } else if (payload?.type === 'suggest_collection_message') {
            const customer = payload.data as Customer;
            try {
                const overdueInvoices = sales.filter(s => 
                    s.customerName === customer.name &&
                    s.type === 'credit' &&
                    s.paidAmount < s.total &&
                    s.dueDate && new Date(s.dueDate) < new Date()
                );
    
                const result = await suggestCollectionAction(customer, overdueInvoices);
    
                let responseText = `${t('musaid_suggestion_for_collection', {customerName: customer.name})}\n\n`;
                if (result) {
                    responseText += `**${t('musaid_suggestion_method')}:** ${t(result.method)}\n`;
                    responseText += `**${t('musaid_suggestion_reason')}:** ${result.reason}\n\n`;
                    responseText += `**${t('musaid_suggested_message')}:**\n> ${result.message.replace(/\n/g, '\n> ')}`;
                } else {
                    responseText = t('no_suggestion_available');
                }
                
                const modelMessage: AiMessage = { role: 'model', parts: [{ text: responseText }] };
                setAiAppMessages(prev => [...prev, modelMessage]);
    
            } catch (error) {
                const errorMessage: AiMessage = { role: 'model', parts: [{ text: t('failed_to_get_ai_suggestion') }] };
                setAiAppMessages(prev => [...prev, errorMessage]);
            }
        }
        
        setIsLoading(false);
        useAppStore.setState({ aiAssistantContext: null });
    };


    // Auto-run action from context
    useEffect(() => {
        if (isAiAssistantOpen && aiAssistantContext) {
            setActiveTab('app'); // Default to app tab for programmatic actions
            handleInitialAction(aiAssistantContext);
        }
    }, [isAiAssistantOpen, aiAssistantContext]);


    // Scroll to bottom on new message
    useEffect(() => {
        if(isAiAssistantOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [aiAppMessages, aiWebMessages, isLoading, isAiAssistantOpen]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const currentInput = inputValue;
        setInputValue('');
        sendInput(currentInput);
    };
    
    const handleSuggestedPromptClick = (prompt: string) => {
        sendInput(prompt);
    };

    const currentMessages = activeTab === 'app' ? aiAppMessages : aiWebMessages;
    const placeholderText = activeTab === 'app' ? t('ask_musaid_anything') : t('search_the_web');
    
    const appSuggestedPrompts = [
        t('do_we_have_part_x'),
        t('search_for_part_y'),
        t('explain_how_z_works'),
    ];

    const webSuggestedPrompts = [
        t('best_engine_oils'),
        t('explain_oxygen_sensor'),
        t('latest_toyota_models')
    ];

    const suggestedPrompts = activeTab === 'app' ? appSuggestedPrompts : webSuggestedPrompts;

    return (
        <div className="fixed bottom-6 end-6 z-50">
            {isAiAssistantOpen && (
                <Card className="w-[calc(100vw-3rem)] max-w-lg h-[70vh] flex flex-col shadow-2xl mb-4 border-2 border-primary/20">
                    <header className="p-4 border-b border-border flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <Bot size={24} className="text-primary" />
                            <h2 className="text-lg font-bold">{t('ai_assistant')}</h2>
                        </div>
                        <button onClick={closeAiAssistant} className="p-1 rounded-full text-muted-foreground hover:bg-accent">
                            <X size={24} />
                        </button>
                    </header>

                    <div className="p-2 border-b border-border flex items-center gap-2">
                        <button 
                            onClick={() => setActiveTab('app')}
                            className={`flex items-center justify-center gap-2 px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors w-full ${activeTab === 'app' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-secondary'}`}
                        >
                             <MessageSquare size={16}/>
                             {t('app_assistant')}
                        </button>
                        <button
                            onClick={() => setActiveTab('web')}
                            className={`flex items-center justify-center gap-2 px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors w-full ${activeTab === 'web' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-secondary'}`}
                        >
                            <SearchIcon size={16}/>
                            {t('web_search')}
                        </button>
                    </div>

                    <div className="flex-1 p-4 overflow-y-auto space-y-4">
                        {currentMessages.length === 0 && !aiAssistantContext && (
                            <div className="text-center p-4">
                                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4"><Sparkles size={32} className="text-primary"/></div>
                                <h3 className="font-bold text-lg">{t('welcome_musaid')}</h3>
                                <p className="text-muted-foreground text-sm">{t('how_can_i_help')}</p>
                                <div className="mt-4 space-y-2">
                                    {suggestedPrompts.map((prompt, i) => (
                                        <button key={i} onClick={() => handleSuggestedPromptClick(prompt)} className="w-full text-sm p-2 bg-muted hover:bg-muted/80 rounded-lg text-start">
                                            {prompt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {currentMessages.map((msg, index) => (
                            <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                                {msg.role === 'model' && <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0"><Bot size={20} className="text-primary"/></div>}
                                <div className={`max-w-sm md:max-w-md rounded-2xl p-3 ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-ee-none' : 'bg-muted rounded-es-none'}`}>
                                    <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                                      {msg.parts.map((part, i) => 'text' in part ? parseMessageText(part.text, setActiveView) : '').flat()}
                                    </div>
                                    {msg.sources && msg.sources.length > 0 && (
                                        <div className="mt-3 pt-2 border-t border-border/50">
                                            <h4 className="text-xs font-bold flex items-center gap-1 mb-1"><Globe size={12}/>{t('sources_from_web')}:</h4>
                                            <ul className="space-y-1">
                                                {msg.sources.map((source, i) => (
                                                    <li key={i}>
                                                        <a href={source.web.uri} target="_blank" rel="noopener noreferrer" className="text-xs text-primary/80 hover:underline break-all">
                                                          {source.web.title || source.web.uri}
                                                        </a>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                                {msg.role === 'user' && <div className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center flex-shrink-0"><User size={20}/></div>}
                            </div>
                        ))}
                        {isLoading && currentMessages[currentMessages.length - 1]?.role !== 'model' && (
                             <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0"><Bot size={20} className="text-primary"/></div>
                                <div className="max-w-sm md:max-w-md rounded-2xl p-3 bg-muted rounded-es-none">
                                    <Spinner className="w-5 h-5" />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={handleSendMessage} className="p-4 border-t border-border">
                        <div className="relative">
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder={placeholderText}
                                className="w-full p-3 pe-12 bg-input rounded-lg focus:ring-2 focus:ring-ring"
                                disabled={isLoading}
                            />
                            <button type="submit" disabled={isLoading || !inputValue.trim()} className="absolute end-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-primary text-primary-foreground disabled:bg-muted disabled:text-muted-foreground">
                                <Send size={20} />
                            </button>
                        </div>
                    </form>
                </Card>
            )}

            <button
                onClick={() => isAiAssistantOpen ? closeAiAssistant() : openAiAssistant()}
                className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-transform hover:scale-110"
                aria-label={t('ai_assistant')}
            >
                <Sparkles size={32} />
            </button>
        </div>
    );
};

export default AiAssistant;
