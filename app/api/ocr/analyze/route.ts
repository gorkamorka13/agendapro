import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Role } from '@prisma/client';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Prompt spécialisé pour l'extraction de tickets de caisse
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
  if (session?.user?.role !== Role.ADMIN) {
    return new NextResponse('Accès refusé', { status: 403 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new NextResponse('Clé API Gemini manquante dans les variables d\'environnement', { status: 500 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new NextResponse('Aucun fichier fourni', { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelParams = {
      inlineData: {
        data: buffer.toString('base64'),
        mimeType: file.type
      }
    };

    // Liste des modèles à essayer par ordre de préférence (Précision/Vitesse)
    const modelsToTry = [
      { name: "gemini-2.5-flash", version: "v1beta" as const },
      { name: "gemini-2.0-flash", version: "v1beta" as const },
      { name: "gemini-2.0-flash-001", version: "v1beta" as const }
    ];

    let result;
    let lastError;
    let successfulModel = '';

    for (const modelCfg of modelsToTry) {
      try {
        console.log(`Tentative d'analyse avec ${modelCfg.name}...`);
        const model = genAI.getGenerativeModel({
          model: modelCfg.name,
          generationConfig: {
            responseMimeType: "application/json",
          }
        }, { apiVersion: modelCfg.version });

        result = await model.generateContent([SYSTEM_PROMPT, modelParams]);
        successfulModel = modelCfg.name;
        // Si on arrive ici, l'analyse a réussi
        break;
      } catch (error: any) {
        lastError = error;
        if (error.status === 404 || error.message?.includes('404')) {
          console.warn(`${modelCfg.name} non trouvé, passage au modèle suivant...`);
          continue;
        }
        // Pour les autres types d'erreurs (quota, auth), on arrête tout de suite
        throw error;
      }
    }

    if (!result) {
      throw lastError || new Error("Aucun modèle Gemini n'a pu traiter la requête.");
    }

    const text = result.response.text();
    const usage = result.response.usageMetadata;

    // Enregistrer l'utilisation en base de données de manière asynchrone (pas besoin d'attendre pour répondre)
    const { prisma } = await import('@/lib/prisma');
    let globalTotal = 0;

    // @ts-ignore
    if (prisma.aiUsage && usage) {
      // @ts-ignore
      await prisma.aiUsage.create({
        data: {
          model: successfulModel,
          promptTokens: usage.promptTokenCount,
          candidatesTokens: usage.candidatesTokenCount,
          totalTokens: usage.totalTokenCount,
          feature: "OCR"
        }
      }).catch(err => console.error("Erreur enregistrement usage IA:", err));

      // Calculer le total cumulé pour l'afficher
      // @ts-ignore
      const totalUsage = await prisma.aiUsage.aggregate({
        _sum: { totalTokens: true }
      });
      globalTotal = totalUsage._sum.totalTokens || 0;
    }

    // Nettoyer le texte au cas où Gemini ajouterait des balises ```json
    const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
      const parsedData = JSON.parse(jsonString);
      // Ajouter le nom du modèle et les jetons aux données retournées
      parsedData.model = successfulModel;
      parsedData.usage = usage ? {
        prompt: usage.promptTokenCount,
        candidates: usage.candidatesTokenCount,
        total: usage.totalTokenCount,
        globalTotal
      } : null;

      return NextResponse.json(parsedData);
    } catch (parseError) {
      console.error("Erreur de parsing JSON Gemini:", text);
      return new NextResponse('Réponse de l\'IA invalide', { status: 500 });
    }

  } catch (error: any) {
    console.error("Erreur Gemini OCR:", error);

    // Gestion spécifique du quota (429 Too Many Requests)
    if (error.status === 429 || error.message?.includes('429')) {
      return new NextResponse('Quota IA dépassé ou trop de requêtes. Veuillez patienter 30 secondes avant de réessayer.', { status: 429 });
    }

    return new NextResponse(error.message || 'Erreur lors de l\'analyse par l\'IA', { status: 500 });
  }
}
