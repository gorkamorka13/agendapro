import { toast } from 'sonner';

/**
 * Interface pour le résultat de l'analyse IA du ticket
 */
export interface OCRResult {
  amount: number | null;
  date: string | null;
  merchant: string | null;
  tax: number | null;
  category: string | null;
  paymentMethod: string | null;
  currency: string | null;
  model: string | null;
  usage?: {
    prompt: number;
    candidates: number;
    total: number;
    globalTotal: number;
  } | null;
  rawData?: any;
}

/**
 * Analyse un ticket de caisse en utilisant l'API Gemini Vision (Backend)
 */
export async function analyzeReceipt(fileOrUrl: File | string): Promise<OCRResult> {
  try {
    const formData = new FormData();

    if (typeof fileOrUrl === 'string') {
      // Si c'est une URL (ex: chemin relatif /uploads/...), on doit fetch le fichier
      const response = await fetch(fileOrUrl);
      const blob = await response.blob();
      formData.append('file', blob, 'receipt.jpg');
    } else {
      formData.append('file', fileOrUrl);
    }

    const response = await fetch('/api/ocr/analyze', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`OCR API Error (${response.status}):`, errorText);

      if (response.status === 429 || errorText.includes('Quota')) {
        toast.error(errorText || "Quota Gemini dépassé (429). Réessayez dans 30s.");
      } else {
        toast.error(errorText || "L'IA n'a pas pu analyser le ticket.");
      }

      return {
        amount: null, date: null, merchant: null, tax: null,
        category: null, paymentMethod: null, currency: null,
        model: null, usage: null
      };
    }

    const data = await response.json();

    return {
      amount: data.amount || null,
      date: data.date || null,
      merchant: data.merchant || null,
      tax: data.tax || null,
      category: data.category || null,
      paymentMethod: data.paymentMethod || null,
      currency: data.currency || null,
      model: data.model || null,
      usage: data.usage || null,
      rawData: data
    };

  } catch (error: any) {
    console.error("Gemini AI Analysis critical failure:", error);
    toast.error("Erreur de connexion avec l'IA.");
    return { amount: null, date: null, merchant: null, tax: null, category: null, paymentMethod: null, currency: null, model: null, usage: null };
  }
}
