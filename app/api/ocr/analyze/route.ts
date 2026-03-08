// Fichier: app/api/ocr/analyze/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { aiUsage } from '@/lib/db/schema';
import { sum } from 'drizzle-orm';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Role } from '@/types';

const SYSTEM_PROMPT = `Tu es un expert en analyse de tickets de caisse.
Analyse l'image fournie et extrais les informations suivantes avec la plus haute précision.
Recherche spécifiquement le "Total TTC" payé par le client.
Ignore les sous-totaux ou les montants avant remise.

Réponds UNIQUEMENT au format JSON pur sans balises Markdown :
{
  "amount": number (ex: 45.50, utilise le point pour les décimales),
  "date": "YYYY-MM-DD" (format ISO),
  "merchant": "string" (nom de l'enseigne),
  "tax": number (montant total de la TVA si présent, sinon null),
  "category": "string" (catégorie suggérée : Essence, Restauration, Fournitures, Bureau, etc.),
  "paymentMethod": "string" (Carte, Espèces, Chèque, etc.),
  "currency": "string" (ex: EUR, USD)
}`;

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if ((session?.user?.role as Role) !== 'ADMIN') {
    return new NextResponse('Accès refusé', { status: 403 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new NextResponse("Clé API Gemini manquante", { status: 500 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) return new NextResponse('Aucun fichier fourni', { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelParams = { inlineData: { data: buffer.toString('base64'), mimeType: file.type } };

    const modelsToTry = [
      { name: 'gemini-2.5-flash', version: 'v1beta' as const },
      { name: 'gemini-2.0-flash', version: 'v1beta' as const },
      { name: 'gemini-2.0-flash-001', version: 'v1beta' as const },
    ];

    let result: any;
    let lastError: any;
    let successfulModel = '';

    for (const cfg of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({ model: cfg.name, generationConfig: { responseMimeType: 'application/json' } }, { apiVersion: cfg.version });
        result = await model.generateContent([SYSTEM_PROMPT, modelParams]);
        successfulModel = cfg.name;
        break;
      } catch (err: any) {
        lastError = err;
        if (err.status === 404 || err.message?.includes('404')) continue;
        throw err;
      }
    }

    if (!result) throw lastError || new Error("Aucun modèle disponible");

    const text = result.response.text();
    const usage = result.response.usageMetadata;

    let globalTotal = 0;
    if (usage) {
      // Fire-and-forget AI usage tracking (no await to not block response)
      db.insert(aiUsage).values({
        model: successfulModel,
        promptTokens: usage.promptTokenCount,
        candidatesTokens: usage.candidatesTokenCount,
        totalTokens: usage.totalTokenCount,
        feature: 'OCR',
      }).catch(err => console.error('Erreur enregistrement AI usage:', err));

      // Async total calc
      const [totalRow] = await db.select({ total: sum(aiUsage.totalTokens) }).from(aiUsage);
      globalTotal = Number(totalRow?.total ?? 0);
    }

    const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(jsonString);
    parsedData.model = successfulModel;
    parsedData.usage = usage ? { prompt: usage.promptTokenCount, candidates: usage.candidatesTokenCount, total: usage.totalTokenCount, globalTotal } : null;

    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error('Erreur OCR:', error);
    if (error.status === 429 || error.message?.includes('429')) {
      return new NextResponse('Quota IA dépassé. Veuillez patienter 30 secondes.', { status: 429 });
    }
    return new NextResponse(error.message || "Erreur IA", { status: 500 });
  }
}
