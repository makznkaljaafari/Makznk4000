
import { GoogleGenAI, GenerateContentResponse, FunctionDeclaration, Type } from "@google/genai";
import { Part, Customer, Sale, AiPrediction, VehicleInfo, PartSearchAgentParams, AiParsedData, Supplier, PurchaseOrder, UpsellSuggestion, DynamicPricingSuggestion, AlternativeSuggestion, AiReportAnalysis, InvoiceAnalysisResult, InventoryAnalysisResult } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // In a real app, you'd handle this more gracefully.
  // For this example, we'll rely on the environment variable being set.
  console.warn("API_KEY environment variable not set. AI features will not work.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });
const model = "gemini-2.5-flash";

const parseJsonResponse = <T,>(text: string): T | null => {
    let jsonStr = text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
        jsonStr = match[2].trim();
    }
    try {
        return JSON.parse(jsonStr) as T;
    } catch (e) {
        console.error("Failed to parse JSON response:", e, "Original text:", text);
        return null;
    }
};


export const generatePurchaseRecommendations = async (sales: Sale[], inventory: Part[]): Promise<AiPrediction[] | null> => {
    const prompt = `
    Based on the following sales data and current inventory levels, provide purchase recommendations for a car parts store.
    Analyze the sales frequency and volume. Also consider items with low stock compared to their minimum stock level.
    Provide a concise reason for each recommendation.

    Sales Data:
    ${JSON.stringify(sales, null, 2)}

    Current Inventory:
    ${JSON.stringify(inventory.map(p => ({ id: p.id, name: p.name, stock: p.stock, minStock: p.minStock })), null, 2)}

    Respond with a JSON array of objects, where each object has the following structure: { "partId": string, "partName": string, "recommendedQuantity": number, "reason": string }.
    Do not include items that do not need reordering.
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    
    return parseJsonResponse<AiPrediction[]>(response.text);

  } catch (error) {
    console.error("Error generating purchase recommendations:", error);
    throw new Error('failed_to_get_ai_recommendations');
  }
};

export const identifyPartFromImage = async (base64Image: string, inventory: Part[]): Promise<{ bestMatch: Part | null, description: string } | null> => {
  const imagePart = {
    inlineData: {
      mimeType: 'image/jpeg',
      data: base64Image,
    },
  };

  const textPart = {
    text: `
      Identify the car part in this image. 
      Then, find the best match for this part from the following inventory list.
      
      Inventory List:
      ${JSON.stringify(inventory.map(p => ({ id: p.id, name: p.name, brand: p.brand, partNumber: p.partNumber })), null, 2)}

      Respond in JSON format with the following structure: 
      { 
        "description": "A brief description of the identified part in the image.",
        "bestMatchPartId": "The 'id' of the best matching part from the inventory list, or null if no good match is found."
      }
    `,
  };

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model,
      contents: [{ parts: [imagePart, textPart] }],
      config: { responseMimeType: "application/json" }
    });
    
    const result = parseJsonResponse<{ description: string; bestMatchPartId: string | null; }>(response.text);

    if (result) {
      const bestMatch = inventory.find(p => p.id === result.bestMatchPartId) || null;
      return { bestMatch, description: result.description };
    }
    return null;

  } catch (error) {
    console.error("Error identifying part from image:", error);
    throw new Error('failed_to_identify_part');
  }
};


export const assessCustomerCreditRisk = async (customer: Customer): Promise<{ riskLevel: string; recommendation: string; } | null> => {
    const prompt = `
    Analyze the payment history of the following customer to assess their credit risk for a car parts store.
    Consider their total debt, credit limit, and the timeliness of their payments versus their purchases.

    Customer Data:
    - Name: ${customer.name}
    - Total Debt: ${customer.totalDebt} SAR
    - Credit Limit: ${customer.creditLimit} SAR
    - Payment History: ${JSON.stringify(customer.paymentHistory, null, 2)}

    Respond in JSON format with the following structure: 
    {
      "riskLevel": "Low" | "Medium" | "High",
      "recommendation": "A brief, actionable recommendation for dealing with this customer's credit."
    }
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    return parseJsonResponse<{ riskLevel: string; recommendation: string; }>(response.text);

  } catch (error) {
    console.error("Error assessing customer credit risk:", error);
    throw new Error('failed_to_assess_risk');
  }
};

export const findPartsFromSmartSearch = async (query: string, inventory: Part[]): Promise<Part[] | null> => {
    const prompt = `
    A user is searching for a car part using a natural language query. Your task is to find the most relevant parts from the inventory list.
    The user's query might be in Arabic, English, or a mix, and could be a description rather than a specific name.

    User Query: "${query}"

    Inventory List:
    ${JSON.stringify(inventory.map(p => ({ id: p.id, name: p.name, brand: p.brand, partNumber: p.partNumber, compatibleModels: p.compatibleModels })), null, 2)}
    
    Analyze the query and return a JSON object containing a single key "matchingPartIds", which is an array of the 'id' strings of all matching parts from the inventory. The array should be ordered by relevance, with the most relevant part ID first. If no parts match, return an empty array.
  `;
  try {
    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: "application/json" },
    });
    const result = parseJsonResponse<{ matchingPartIds: string[] }>(response.text);
    if (result && Array.isArray(result.matchingPartIds)) {
        return result.matchingPartIds.map(id => inventory.find(p => p.id === id)).filter(p => p) as Part[];
    }
    return [];

  } catch (error) {
    console.error("Error with smart search:", error);
    throw new Error('failed_to_perform_smart_search');
  }
}

export const decodeVin = async (vin: string): Promise<VehicleInfo | null> => {
  const prompt = `
    You are an expert automotive VIN decoder.
    Decode the following Vehicle Identification Number (VIN) and provide the vehicle's details.
    Also, provide a list of general automotive categories relevant to this vehicle.

    VIN: "${vin}"

    Respond ONLY with a JSON object with the following structure. Do not add any other text or explanations.
    {
      "make": "string",
      "model": "string",
      "year": "number",
      "engine": "string",
      "trim": "string",
      "categories": ["Engine", "Transmission", "Brakes", "Suspension", "Exhaust", "Body", "Electrical", "Filters"]
    }
    If the VIN is invalid or cannot be decoded, respond with a JSON object where all values are null except for categories which should be an empty array.
  `;
  try {
    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: "application/json" },
    });
    return parseJsonResponse<VehicleInfo>(response.text);
  } catch(error) {
    console.error("Error decoding VIN:", error);
    throw new Error('failed_to_decode_vin');
  }
};

export const searchForPartWithGoogle = async (searchParams: PartSearchAgentParams): Promise<{ text: string; sources: any[] } | null> => {
    const prompt = `
        You are an expert car part search assistant. Your goal is to find information and purchasing options for a specific car part using Google Search.
        
        Here are the details provided by the user:
        - Part Description: ${searchParams.description}
        - Part Number: ${searchParams.partNumber || 'N/A'}
        - Size: ${searchParams.size || 'N/A'}
        - Vehicle VIN: ${searchParams.vin || 'N/A'}
        - Car Make/Name: ${searchParams.carName || 'N/A'}
        - Car Model/Year: ${searchParams.model || 'N/A'}
        - Vehicle Origin: ${searchParams.origin || 'N/A'}
        - Engine Size: ${searchParams.engineSize || 'N/A'}
        - Transmission Type: ${searchParams.transmission || 'N/A'}
        - Fuel Type: ${searchParams.fuelType || 'N/A'}

        Based on these details, please provide a summary of your findings, including potential part names, compatible alternatives, and where it might be purchased.
        Prioritize results from well-known auto part suppliers or forums.
    `;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
           model: "gemini-2.5-flash",
           contents: prompt,
           config: {
             tools: [{googleSearch: {}}],
           },
        });

        const text = response.text;
        const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        
        return { text, sources };

    } catch (error) {
        console.error("Error searching for part with Google:", error);
        throw new Error('failed_to_search_with_google');
    }
};

// FIX: Add missing generateDashboardInsights function
export const generateDashboardInsights = async (
    { sales, parts, customers }: { sales: Sale[]; parts: Part[]; customers: Customer[] }
): Promise<string[] | null> => {
    const prompt = `
        You are an expert business analyst for a car parts store in Saudi Arabia.
        Analyze the provided sales, inventory, and customer data to generate 2-3 concise, actionable insights in Arabic for the dashboard.
        Focus on identifying important trends, opportunities, or potential issues. For example:
        - "قطعة 'فلتر زيت' تباع بسرعة ولكن مخزونها منخفض."
        - "العميل 'ورشة الاتحاد' يقترب من حده الائتماني."
        - "مبيعات ماركة 'تويوتا' زادت هذا الشهر."

        Sales Data (sample):
        ${JSON.stringify(sales.slice(0, 20).map(s => ({ total: s.total, date: s.date, items: s.items.length })), null, 2)}

        Inventory Data (sample):
        ${JSON.stringify(parts.slice(0, 20).map(p => ({ name: p.name, stock: p.stock, minStock: p.minStock, sellingPrice: p.sellingPrice })), null, 2)}

        Customer Data (sample):
        ${JSON.stringify(customers.slice(0, 20).map(c => ({ name: c.name, totalDebt: c.totalDebt, creditLimit: c.creditLimit })), null, 2)}

        Respond ONLY with a valid JSON array of strings, where each string is an insight in Arabic.
        Example: ["القطعة 'فلتر هواء' الأكثر مبيعًا هذا الأسبوع.", "تنبيه: 5 أصناف مخزونها أقل من الحد الأدنى."]
    `;
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model,
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        return parseJsonResponse<string[]>(response.text);
    } catch (error) {
        console.error("Error generating dashboard insights:", error);
        return null;
    }
};


export const parsePartInfoFromSpeech = async (transcript: string): Promise<Partial<Part> | null> => {
    const prompt = `You are a smart assistant for an auto parts inventory system. Your task is to parse a spoken sentence and extract structured information for a new part. The user might speak in Arabic or a mix of Arabic and English. Extract the following fields: 'name', 'partNumber', 'brand', 'sellingPrice' (as a number), 'purchasePrice' (as a number), 'minStock' (as a number), 'size', 'unit', 'notes', and 'alternativePartNumbers' (as an array of strings). The user's speech is: "${transcript}". Respond ONLY with a JSON object containing the extracted fields. If a field is not mentioned, omit it from the JSON. For 'alternativePartNumbers', if the user says multiple numbers, put them in an array.`;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model,
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        return parseJsonResponse<Partial<Part>>(response.text);
    } catch (error) {
        console.error("Error parsing part info from speech:", error);
        throw new Error('failed_to_parse_speech');
    }
};

const getPurchaseInvoicePrompt = (context: { suppliers: Supplier[]; parts: Part[] }) => `
    Context for matching:
    - Existing Suppliers: ${JSON.stringify(context.suppliers.map(s => ({id: s.id, name: s.name})))}
    - Existing Parts: ${JSON.stringify(context.parts.map(p => ({id: p.id, name: p.name, partNumber: p.partNumber, brand: p.brand})))}

    Follow these rules precisely:
    1.  **Supplier Matching**: Find the best match for the supplier name in the invoice from the "Existing Suppliers" list. If a strong match is found, use its 'id'. If not, set 'existingId' to null and extract the new supplier's name and phone number.
    2.  **Item Matching**: For each line item in the invoice, find the best match from the "Existing Parts" list based on name, part number, and brand. If a strong match is found, use its 'id' for 'existingPartId'. If not, set 'existingPartId' to null.
    3.  **Data Extraction**: Extract all fields as accurately as possible. For new items, extract name, part number, brand, quantity, price, and total.
    4.  **Data Types**: All quantity, price, and summary fields MUST be numbers (e.g., 150.50, not "150.50 SAR").
    5.  **Date Format**: The invoice date MUST be in YYYY-MM-DD format.

    JSON Response Structure:
    {
      "documentType": "purchase_invoice",
      "supplier": { "existingId": "The 'id' of a matching supplier, or null.", "name": "The extracted supplier name.", "phone": "The extracted supplier phone number." },
      "invoice": { "id": "The invoice number.", "date": "YYYY-MM-DD", "type": "credit" },
      "items": [ { "existingPartId": "The 'id' of the best matching part, or null.", "name": "Item name/description.", "partNumber": "Item part number.", "brand": "Item brand.", "quantity": number, "price": number, "total": number } ],
      "summary": { "subtotal": number | null, "tax": number | null, "grandTotal": number }
    }
`;

const getSalesInvoicePrompt = (context: { customers: Customer[]; parts: Part[] }) => `
    Context for matching:
    - Existing Customers: ${JSON.stringify(context.customers.map(c => ({id: c.id, name: c.name})))}
    - Existing Parts: ${JSON.stringify(context.parts.map(p => ({id: p.id, name: p.name, partNumber: p.partNumber, brand: p.brand})))}

    Follow these rules precisely:
    1.  **Customer Matching**: Find the best match for the customer name in the invoice from the "Existing Customers" list. If a strong match is found, use its 'id'. If no customer is mentioned or it's a cash sale, set 'existingId' to null and 'name' to 'Cash Sale'. If a new customer name is found, set 'existingId' to null and extract their name.
    2.  **Item Matching**: For each line item, find the best match from the "Existing Parts" list based on name and part number. If a strong match is found, use its 'id'. If not, set 'existingPartId' to null.
    3.  **Data Extraction**: Extract all fields accurately. For new items, extract name, part number, brand, quantity, price, and total.
    4.  **Data Types**: All quantity, price, and summary fields MUST be numbers.
    5.  **Date Format**: The invoice date MUST be in YYYY-MM-DD format.

    JSON Response Structure:
    {
      "documentType": "sales_invoice",
      "customer": { "existingId": "The 'id' of a matching customer, or null.", "name": "The extracted customer name or 'Cash Sale'.", "phone": "The extracted customer phone number." },
      "invoice": { "id": "The invoice number.", "date": "YYYY-MM-DD", "type": "cash" or "credit" },
      "items": [ { "existingPartId": "The 'id' of the best matching part, or null.", "name": "Item name/description.", "partNumber": "Item part number.", "brand": "Item brand.", "quantity": number, "price": number, "total": number } ],
      "summary": { "subtotal": number | null, "tax": number | null, "grandTotal": number }
    }
`;

const getInventoryListPrompt = () => `
    Follow these rules precisely:
    1.  **Item Extraction**: Extract every single item from the list.
    2.  **Field Extraction**: For each item, extract 'name', 'partNumber', 'brand', 'quantity', 'purchasePrice', and 'sellingPrice'. If a field is not available, set its value to null.
    3.  **Quantity Default**: If quantity is not mentioned for an item, assume it is 1.
    4.  **Price Handling**: The list might contain one or two price columns. Identify them as 'purchasePrice' or 'sellingPrice' based on context (e.g., column headers like 'Cost', 'Buy', 'Sell', 'Retail'). If only one price is present, try to infer its type, otherwise use it for both.

    JSON Response Structure:
    {
      "documentType": "inventory_list",
      "items": [
        {
          "existingPartId": null,
          "name": "Item name/description.",
          "partNumber": "The part number, if available.",
          "brand": "The brand, if available.",
          "quantity": "The quantity as a number, default to 1 if not present.",
          "purchasePrice": "The purchase price as a number, if available.",
          "sellingPrice": "The selling price as a number, if available."
        }
      ]
    }
`;

export const parseDocument = async (
    fileContentBase64: string,
    fileType: string,
    importType: 'purchase_invoice' | 'sales_invoice' | 'inventory_list',
    context: { suppliers?: Supplier[]; parts?: Part[]; customers?: Customer[] }
): Promise<AiParsedData | null> => {
    const filePart = {
        inlineData: {
            mimeType: fileType,
            data: fileContentBase64,
        },
    };

    let promptText = '';
    switch (importType) {
        case 'purchase_invoice':
            promptText = getPurchaseInvoicePrompt(context as { suppliers: Supplier[]; parts: Part[] });
            break;
        case 'sales_invoice':
            promptText = getSalesInvoicePrompt(context as { customers: Customer[]; parts: Part[] });
            break;
        case 'inventory_list':
            promptText = getInventoryListPrompt();
            break;
        default:
            throw new Error('Unsupported import type');
    }
    
    const textPart = { text: promptText };
    const systemInstruction = "You are an expert data extraction assistant for an inventory management system. Your primary function is to analyze documents (invoices, lists) and convert them into a structured JSON format according to the user's instructions. You must be extremely accurate and only return a single, valid JSON object with no additional text or markdown formatting."

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model,
            contents: [{ parts: [filePart, textPart] }],
            config: {
                systemInstruction,
                responseMimeType: "application/json"
            }
        });
        
        return parseJsonResponse<AiParsedData>(response.text);

    } catch (error) {
        console.error("Error parsing document with AI:", error);
        throw new Error('could_not_parse_document');
    }
};

export const getPricingSuggestion = async (part: Omit<Part, 'id' | 'stock'>, allSales: Sale[]): Promise<{ suggestedPrice: number; reason: string; } | null> => {
    const prompt = `
    Analyze the following car part details and recent sales data to suggest an optimal selling price.
    
    Part Details:
    - Name: ${part.name}
    - Part Number: ${part.partNumber}
    - Brand: ${part.brand}
    - Purchase Price: ${part.purchasePrice} SAR
    - Minimum Stock Level: ${part.minStock}

    Recent Sales of similar parts (for market context):
    ${JSON.stringify(allSales.slice(0, 20), null, 2)}

    Consider the following factors:
    1.  A healthy profit margin over the purchase price (typically 30-70% for car parts).
    2.  Brand reputation (premium brands like Toyota can command higher prices).
    3.  Market demand inferred from sales data.
    4.  The price should be a "psychologically friendly" number (e.g., 99, 145, instead of 101.32).

    Respond in JSON format with the following structure:
    {
      "suggestedPrice": number, // The suggested selling price as a round number or ending in 5 or 9.
      "reason": "A brief explanation in one sentence in the same language as the part name."
    }
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    
    return parseJsonResponse<{ suggestedPrice: number; reason: string; }>(response.text);

  } catch (error) {
    console.error("Error generating pricing suggestion:", error);
    throw new Error('failed_to_get_pricing_suggestion');
  }
};

export const suggestSupplierForPart = async (part: Part, purchaseOrders: PurchaseOrder[]): Promise<{ supplierName: string; reason: string; } | null> => {
    const relevantPOs = purchaseOrders
        .filter(po => po.items.some(item => item.partId === part.id))
        .map(po => ({
            supplierName: po.supplierName,
            date: po.date,
            price: po.items.find(item => item.partId === part.id)?.purchasePrice
        }));

    if (relevantPOs.length === 0) {
        return null;
    }

    const prompt = `
    Based on the following purchase history for the part "${part.name}" (Part No: ${part.partNumber}), recommend the best supplier to reorder from.
    Consider the most recent orders and the best price.

    Purchase History:
    ${JSON.stringify(relevantPOs.slice(-10), null, 2)}

    Respond ONLY with a JSON object with the following structure:
    {
      "supplierName": "The name of the recommended supplier.",
      "reason": "A brief explanation in Arabic for your recommendation (e.g., 'أفضل سعر حديث')."
    }
    `;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model,
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        return parseJsonResponse<{ supplierName: string; reason: string; }>(response.text);
    } catch (error) {
        console.error("Error suggesting supplier:", error);
        throw new Error('failed_to_suggest_supplier');
    }
};


export const generateUpsellRecommendations = async (
    invoiceItems: { partId: string; name: string; quantity: number }[],
    inventory: Part[]
): Promise<UpsellSuggestion[] | null> => {
    const invoiceContent = invoiceItems.map(item => `${item.name} (Qty: ${item.quantity})`).join(', ');
    const inventoryList = inventory
        .filter(p => !invoiceItems.some(item => item.partId === p.id)) // Exclude items already in cart
        .map(p => ({ id: p.id, name: p.name, brand: p.brand, stock: p.stock, description: p.notes || '' }));

    const prompt = `
        You are "مساعد", an expert car parts salesman. Based on the items currently in the sales invoice, suggest up to 3 complementary parts from the inventory list that are commonly sold together.
        For example, if the invoice has brake pads, suggest brake discs or brake fluid. Provide a short, compelling reason for each suggestion in Arabic.

        Current Invoice Items:
        ${invoiceContent}

        Available Inventory (do not suggest items already in the invoice):
        ${JSON.stringify(inventoryList)}

        Respond with a JSON array of objects with this exact structure: { "partId": string, "reason": "The reason for the suggestion in Arabic." }.
        If there are no good suggestions, return an empty array.
    `;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model,
            contents: prompt,
            config: { responseMimeType: "application/json", thinkingConfig: { thinkingBudget: 0 } }
        });

        return parseJsonResponse<UpsellSuggestion[]>(response.text);
    } catch (error) {
        console.error("Error generating upsell recommendations:", error);
        throw new Error('failed_to_get_ai_upsell_recommendations');
    }
};

export const getDynamicPricingSuggestion = async (customer: Customer): Promise<DynamicPricingSuggestion | null> => {
    const prompt = `
        You are "مساعد", an expert pricing analyst for a car parts store.
        Analyze the following customer's data to suggest a special discount percentage.
        Consider their tier (VIP, workshop, distributor are more important), total debt vs credit limit, and payment history.
        Provide a concise, compelling reason in Arabic. The goal is to build loyalty without giving away too much profit. A typical discount is between 3% and 10% for good customers.

        Customer Data:
        - Name: ${customer.name}
        - Tier: ${customer.tier}
        - Total Debt: ${customer.totalDebt}
        - Credit Limit: ${customer.creditLimit}
        - Payment History (last 5): ${JSON.stringify(customer.paymentHistory.slice(-5), null, 2)}

        Respond ONLY with a JSON object with this exact structure: { "discountPercentage": number, "reason": "The reason in Arabic." }.
        If no special discount is warranted, return a discountPercentage of 0. The discount must be a whole number.
    `;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model,
            contents: prompt,
            config: { 
                responseMimeType: "application/json",
                temperature: 0.2
            }
        });

        return parseJsonResponse<DynamicPricingSuggestion>(response.text);
    } catch (error) {
        console.error("Error generating dynamic pricing suggestion:", error);
        throw new Error('failed_to_get_dynamic_pricing_suggestion');
    }
};


export const findAlternativeParts = async (
    outOfStockPart: Part,
    inventory: Part[]
): Promise<AlternativeSuggestion[] | null> => {
    // Exclude the part itself and any parts with zero stock from the search space
    const availableInventory = inventory.filter(p => p.id !== outOfStockPart.id && p.stock > 0);

    const prompt = `
        You are "مساعد", an expert car parts salesman. A customer needs the following part which is out of stock:
        - Name: ${outOfStockPart.name}
        - Part Number: ${outOfStockPart.partNumber}
        - Brand: ${outOfStockPart.brand}
        - Compatible Models: ${outOfStockPart.compatibleModels.join(', ')}
        - Known Alternatives: ${outOfStockPart.alternativePartNumbers.join(', ')}

        From the inventory list below, find up to 3 suitable alternative parts.
        Prioritize parts listed in "Known Alternatives". Then, consider compatible models, brand, and category. Provide a short, compelling reason for each suggestion in Arabic.

        Available Inventory:
        ${JSON.stringify(availableInventory.map(p => ({ id: p.id, name: p.name, partNumber: p.partNumber, brand: p.brand, compatibleModels: p.compatibleModels, stock: p.stock })))}

        Respond with a JSON array of objects with this exact structure: { "partId": string, "reason": "The reason for the suggestion in Arabic." }.
        If there are no good suggestions, return an empty array.
    `;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model,
            contents: prompt,
            config: { 
                responseMimeType: "application/json",
                temperature: 0.3 
            }
        });

        return parseJsonResponse<AlternativeSuggestion[]>(response.text);
    } catch (error) {
        console.error("Error finding alternative parts:", error);
        throw new Error('failed_to_find_alternatives');
    }
};

export const generateSalesPitch = async (part: Part): Promise<string | null> => {
    const prompt = `
        You are an expert car parts salesperson in an automotive store in Saudi Arabia. Your goal is to generate a short, persuasive, and friendly sales pitch in Arabic for a specific car part to help a salesperson convince a customer.

        The pitch should:
        - Be concise (2-3 sentences).
        - Highlight the part's quality and brand reputation.
        - Mention a key benefit (e.g., performance, longevity, safety).
        - Be reassuring and build trust.
        - Use a friendly and professional tone.

        Part Details:
        - Name: ${part.name}
        - Brand: ${part.brand}
        - Notes: ${part.notes || 'جودة عالية'}
        - Compatible Models: ${part.compatibleModels.join(', ')}

        Generate only the sales pitch text, with no extra formatting or explanations.
    `;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                temperature: 0.7,
                thinkingConfig: { thinkingBudget: 0 }
            }
        });

        return response.text;
    } catch (error) {
        console.error("Error generating sales pitch:", error);
        throw new Error('failed_to_generate_pitch');
    }
};

export const analyzeReportData = async (
    reportData: object[],
    reportName: string,
): Promise<AiReportAnalysis | null> => {
    const sampleData = reportData.slice(0, 50);

    const prompt = `
        You are a data analyst. The user has generated a report named "${reportName}".
        Based on the following JSON data from the report, provide a brief, insightful summary and list 2-3 key insights or interesting patterns you observe.
        The response should be in Arabic.

        Report Data (sample):
        ${JSON.stringify(sampleData, null, 2)}

        Respond ONLY with a valid JSON object with the following structure. Do not add any other text, explanations, or markdown formatting.
        {
          "summary": "A one or two-sentence summary of the data in Arabic.",
          "insights": [
            "First key insight in Arabic.",
            "Second key insight in Arabic.",
            "Third key insight in Arabic."
          ]
        }
    `;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model,
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });

        return parseJsonResponse<AiReportAnalysis>(response.text);

    } catch (error) {
        console.error("Error analyzing report data:", error);
        throw new Error('failed_to_analyze_report');
    }
};

export const analyzeInvoices = async (sales: Sale[], parts: Part[], customers: Customer[]): Promise<InvoiceAnalysisResult | null> => {
    const prompt = `
    You are an expert business analyst for a car parts store in Saudi Arabia. Your task is to provide a detailed analysis of the sales data provided.
    
    Context:
    - The currency is Saudi Riyal (SAR).
    - The data includes sales records, part details (including cost), and customer information.

    Sales Data:
    ${JSON.stringify(sales.slice(0, 50), null, 2)} 

    Parts Data (for cost and context):
    ${JSON.stringify(parts.map(p => ({ id: p.id, name: p.name, purchasePrice: p.purchasePrice, stock: p.stock })), null, 2)}

    Customers Data:
    ${JSON.stringify(customers.map(c => ({ id: c.id, name: c.name, tier: c.tier })), null, 2)}

    Please provide your analysis ONLY in JSON format with the following structure. All text should be in Arabic.
    {
      "summary": "A concise, high-level summary of the overall sales performance in one or two sentences.",
      "keyInsights": [
        "A bullet point list of 3-5 interesting and actionable insights. For example, mention profit margin trends, fast-moving items, or specific customer behaviors.",
        "..."
      ],
      "topProducts": [
        { "name": "Part Name", "quantity": "Total quantity sold", "revenue": "Total revenue from this part" },
        "..."
      ],
      "topCustomers": [
        { "name": "Customer Name", "revenue": "Total revenue from this customer" },
        "..."
      ],
      "opportunities": [
        "A bullet point list of 2-3 specific recommendations or opportunities. For example, suggest a promotion for a slow-moving item, recommend re-stocking a popular item, or suggest engaging with a high-value customer.",
        "..."
      ]
    }
    `;
    
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model,
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });

        return parseJsonResponse<InvoiceAnalysisResult>(response.text);

    } catch (error) {
        console.error("Error analyzing invoices:", error);
        throw new Error('failed_to_generate_analysis');
    }
};

export const suggestCollectionAction = async (customer: Customer, overdueInvoices: Sale[]): Promise<{ method: 'email' | 'whatsapp' | 'call', message: string, reason: string } | null> => {
    const prompt = `
        You are "مساعد", a financial assistant for a car parts store. Your goal is to suggest the best way to contact a customer about their overdue invoices.

        Analyze the following customer data:
        - Name: ${customer.name}
        - Tier: ${customer.tier || 'Regular'}
        - Total Debt: ${customer.totalDebt} SAR
        - Credit Limit: ${customer.creditLimit} SAR
        - Overdue Invoices: ${JSON.stringify(overdueInvoices.map(inv => ({ id: inv.id, total: inv.total, dueDate: inv.dueDate })))}
        - Payment History (last 5): ${JSON.stringify(customer.paymentHistory.slice(-5))}
        
        Rules:
        1.  Analyze the customer's value (tier, purchase history) and payment behavior (timeliness).
        2.  Based on the analysis, choose the best communication method: 'whatsapp' (for a friendly, quick reminder), 'email' (for a more formal reminder), or 'call' (for high-value customers or very late payments).
        3.  Generate a concise, professional, and appropriate message in Arabic for the chosen method. The message should mention the total overdue amount.
        4.  Provide a short reason in Arabic for your choice of method.

        Respond ONLY with a valid JSON object with this exact structure:
        {
          "method": "whatsapp" | "email" | "call",
          "message": "The suggested message in Arabic.",
          "reason": "The reason for your suggestion in Arabic."
        }
    `;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model,
            contents: prompt,
            config: { 
                responseMimeType: "application/json",
                temperature: 0.4
            }
        });
        return parseJsonResponse<{ method: 'email' | 'whatsapp' | 'call', message: string, reason: string }>(response.text);
    } catch (error) {
        console.error("Error suggesting collection action:", error);
        throw new Error('failed_to_get_ai_suggestion');
    }
};

export const analyzeInventoryHealth = async (
    inventory: Part[], 
    sales: Sale[], 
    purchases: PurchaseOrder[]
): Promise<{ analysis: InventoryAnalysisResult; plan: string; } | null> => {
    const today = new Date();
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(today.getDate() - 90);

    const relevantSales = sales.filter(s => new Date(s.date) > ninetyDaysAgo);

    const prompt = `
    You are an expert inventory management analyst for a car parts store in Saudi Arabia. Your task is to provide a detailed analysis of the provided inventory, sales, and purchase data, and then create a comprehensive improvement plan.

    **Instructions:**
    1.  Analyze the provided data thoroughly.
    2.  Respond with a single JSON object. This object must have two top-level keys: "analysis" and "plan".
    3.  The "analysis" key should contain a JSON object matching the provided schema.
    4.  The "plan" key should contain a string with a step-by-step improvement plan formatted using Markdown (using - for lists and ** for bold). The plan should be actionable, clear, and in Arabic.
    5.  All textual analysis, reasons, and the plan must be in Arabic.
    6.  Base your analysis on a 90-day period. Today's date is ${today.toISOString().split('T')[0]}.

    **Analysis Schema for the "analysis" object:**
    {
      "summary": "string (A brief 2-3 sentence summary of the inventory health in Arabic.)",
      "slowMovingItems": [ { "partId": "string", "reason": "string (Why it's slow-moving, in Arabic)" } ],
      "fastMovingItems": [ { "partId": "string", "reason": "string (Why it's fast-moving, in Arabic)" } ],
      "overstockedItems": [ { "partId": "string", "reason": "string (e.g., 'Stock is 5x the 90-day sales', in Arabic)" } ],
      "deadStockItems": [ { "partId": "string", "reason": "string (e.g., 'No sales in over 90 days', in Arabic)" } ],
      "profitability": {
        "mostProfitable": [ { "partId": "string", "reason": "string (e.g., 'High margin and good volume', in Arabic)" } ],
        "leastProfitable": [ { "partId": "string", "reason": "string (e.g., 'Low margin or negative profit', in Arabic)" } ]
      }
    }

    **Data Provided:**
    
    Current Inventory:
    ${JSON.stringify(inventory.map(p => ({ id: p.id, name: p.name, stock: p.stock, purchasePrice: p.purchasePrice, sellingPrice: p.sellingPrice })), null, 2)}

    Sales in the last 90 days:
    ${JSON.stringify(relevantSales.map(s => ({ items: s.items.map(i => ({ partId: i.partId, quantity: i.quantity, price: i.price})), total: s.total, date: s.date })), null, 2)}
    
    All Purchase Orders:
    ${JSON.stringify(purchases.map(p => ({ items: p.items.map(i => ({ partId: i.partId, quantity: i.quantity, purchasePrice: i.purchasePrice})), date: p.date })), null, 2)}
    `;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });

        const result = parseJsonResponse<{ analysis: InventoryAnalysisResult; plan: string; }>(response.text);
        return result;

    } catch (error) {
        console.error("Error analyzing inventory health:", error);
        throw new Error('failed_to_analyze_inventory');
    }
};

const createInvoiceFunctionDeclaration: FunctionDeclaration = {
  name: 'create_invoice',
  description: 'Parses a user command to create a sales invoice for a car parts store.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      customerName: {
        type: Type.STRING,
        description: 'The name of the customer for the invoice.',
      },
      items: {
        type: Type.ARRAY,
        description: 'A list of items to be included in the invoice.',
        items: {
          type: Type.OBJECT,
          properties: {
            partName: {
              type: Type.STRING,
              description: 'The name or description of the car part.',
            },
            quantity: {
              type: Type.NUMBER,
              description: 'The quantity of the part being sold.',
            },
            price: {
              type: Type.NUMBER,
              description: 'The unit price for one item of the part.',
            },
          },
          required: ['partName', 'quantity', 'price'],
        },
      },
    },
    required: ['customerName', 'items'],
  },
};

export const parseInvoiceCommand = async (command: string): Promise<{ customerName: string; items: { partName: string; quantity: number; price: number }[] } | null> => {
    try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: command,
          config: {
            tools: [{functionDeclarations: [createInvoiceFunctionDeclaration]}],
          },
        });

        const functionCall = response.functionCalls?.[0];
        if (functionCall && functionCall.name === 'create_invoice') {
            return functionCall.args as any;
        }
        return null;
    } catch (error) {
        console.error("Error parsing invoice command:", error);
        return null;
    }
};

export const generateReportFromCommand = async (
    command: string,
    sales: Sale[],
    customers: Customer[],
    parts: Part[]
): Promise<string | null> => {
    const salesSample = sales.slice(0, 50).map(s => ({ customerName: s.customerName, total: s.total, date: s.date, itemCount: s.items.length }));
    const customerSample = customers.slice(0, 20).map(c => ({ name: c.name, totalDebt: c.totalDebt }));
    const partsSample = parts.slice(0, 50).map(p => ({ name: p.name, stock: p.stock, sellingPrice: p.sellingPrice }));

    const prompt = `
        You are "مساعد", an expert business data analyst for a car parts store in Saudi Arabia. Your task is to analyze the provided data based on a user's natural language request and provide a concise summary report in Arabic.

        **User's Request:** "${command}"

        **Available Data:**

        1.  **Sales Data (sample):**
            ${JSON.stringify(salesSample, null, 2)}

        2.  **Customers Data (sample):**
            ${JSON.stringify(customerSample, null, 2)}
            
        3.  **Inventory Data (sample):**
            ${JSON.stringify(partsSample, null, 2)}

        **Instructions:**
        1.  Understand the user's request (e.g., "top customers this month", "sales report last week", "low stock items").
        2.  Analyze the provided JSON data to answer the request. You must perform calculations like summing totals, filtering by date, and finding top items based on the data.
        3.  Generate a clear, well-formatted response in Arabic. Use bullet points and bold text to make it easy to read.
        4.  If the request cannot be answered with the given data, politely state that.
        5.  Do not make up information. Base your entire response on the provided data.
    `;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                temperature: 0.3,
            }
        });
        
        return response.text;

    } catch (error) {
        console.error("Error generating report from command:", error);
        throw new Error('failed_to_generate_report');
    }
};
