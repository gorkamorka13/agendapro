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
      throw new Error(errorText || 'Erreur lors de l\'analyse IA');
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
      model: data.model || null
    };

  } catch (error) {
    console.error("Gemini AI Analysis failed:", error);
    toast.error("L'IA n'a pas pu analyser le ticket. Veuillez saisir les données manuellement.");
    return { amount: null, date: null, merchant: null, tax: null, category: null, paymentMethod: null, currency: null, model: null };
  }
}
