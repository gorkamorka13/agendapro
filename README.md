# Agenda Pro - Intelligence de Gestion pour le Maintien à Domicile

**Version 0.0.3**

Une plateforme web premium de pointe dédiée à la planification et à la gestion financière pour les services d'aide à la personne. Ce système orchestre les interventions, le suivi du temps, la gestion des frais opérationnels et le calcul automatisé de la paie.

## 🎯 Vision & Objectifs

**Agenda Pro** transforme la complexité logistique du maintien à domicile en une expérience fluide et prévisible. L'application unifie les besoins des administrateurs et des intervenants dans une interface moderne, hautement réactive et visuellement riche.

### Fonctionnalités Clés

#### 📅 **Gestion de Calendrier Intelligente**
- Interface visuelle haute performance (FullCalendar).
- Planification multi-vues : Mois, Semaine, Jour.
- **Détection de Conflits** : Alertes intelligentes en cas de chevauchement d'interventions.
- **Annulations Visuelles** : Nouveau statut **"Annulé"** avec hachurage sombre dynamique sur la couleur de l'intervenant.
- **Gestion Planning (Batch Management)** : Mode de sélection multiple pour administrateurs permettant de supprimer, annuler ou valider plusieurs interventions/rendez-vous simultanément.
- **Drag & Drop** : Déplacement et redimensionnement des événements directement sur le calendrier (administrateurs uniquement).
- **Interventions Récurrentes** : Support complet des interventions répétitives avec gestion de séries.
- **Recherche Avancée** : Recherche de rendez-vous par objet, lieu ou **nom de l'intervenant**.
- Mode Smartphone optimisé : Boutons administratifs (Sauvegarde BDD, Export) désormais accessibles sur mobile.
- Personnalisation visuelle : Couleurs par intervenant avec adaptation automatique du contraste du texte (noir/blanc).

#### 🗂️ **Gestion des Rendez-vous (CRUD Complet)**
- Système dédié pour les activités hors-interventions (Réunions, formations, etc.).
- **Interface Manager** : Liste complète des rendez-vous avec recherche multidimensionnelle (objet, lieu, intervenant).
- **Cycle de Vie** : Création, modification et suppression simplifiées via une interface unifiée.
- Suivi du statut : **Planifié**, **Réalisé** (Pleine couleur) et **Annulé** (Hachuré).
- **Modification des Interventions Complétées** : Les administrateurs peuvent modifier les interventions et rendez-vous déjà réalisés.

#### 👥 Administration & Utilisateurs
- **Rôles Unifiés** : Gestion des Administrateurs, Intervenants et **Visiteurs**.
- **Rôle Visiteur** : Accès en lecture seule au calendrier uniquement. Interface simplifiée (tarifs et couleurs masqués).
- **Gestion Premium** : Attribution de couleurs personnalisées par intervenant.
- **Permissions Granulaires** : Contrôle d'accès basé sur les rôles pour l'édition des tarifs horaires et frais de déplacement.
- **Outils Maintenance** : Bouton de sauvegarde de la base de données intégré à l'interface de gestion du planning.
- **Export Base de Données** : Export JSON complet de toutes les données de l'application.

#### 📊 **Synthèse & Analytics Premium (Ex-Rapports)**
- Panneaux de bord unifiés pour Administrateurs et Intervenants sous l'onglet **Synthèse**.
- **Mode Personnel vs Équipe** : Redirection intelligente des administrateurs vers leur propre synthèse par défaut.
- **Sélecteur de Période Unifié** : Système intelligent de sélection Année/Mois basé sur l'activité réelle.
- **Visualisation de Données** : Graphiques d'activité quotidiens et répartition par patient/activité.
- **Graphiques Financiers** : Évolution du salaire net avec visualisation des tendances.
- **Export PDF & Excel** : Génération de rapports HD numérotés et exports tableurs pour la comptabilité.
- **Inclusion de Justificatifs** : Option d'inclure les images de reçus dans les exports PDF.

#### 🧾 **Gestion des Dépenses & OCR IA**
- **Analyse par IA (Gemini 2.0 Flash)** : Extraction automatique des données depuis les photos de justificatifs (Marchand, Montant, TVA, Date, Catégorie).
- **Double Date** : Distinction entre la date d'achat (ticket) et la date de saisie dans le système.
- **Stratégie de Stockage Hybride** : Bascule automatique entre **Vercel Blob** (Cloud production) et le système de fichiers local (WAMP/Dev).
- **Moniteur de Stockage** : Indicateur en temps réel de l'utilisation du quota Cloud (250 Mo gratuit) dans l'interface.
- **Protection des Saisies** : L'IA ne modifie pas les dates ou montants déjà saisis manuellement par l'utilisateur.
- **Visionneuse de Reçus** : Lightbox intégrée pour visualiser les justificatifs en plein écran.

#### 🎨 **Interface Utilisateur Moderne**
- **En-tête Dynamique** : Icônes personnalisées pour chaque page.
- **Modales Responsives** : Optimisées pour le mode paysage sur smartphones.
- **Design System Cohérent** : Tailwind CSS avec thème sombre/clair et micro-animations Lucide.
- **Accessibilité Tactile** : Boutons d'action visibles sur mobile sans besoin de survol.
- **Typographie Standardisée** : Police en gras uniforme pour tous les éléments de sélection.

## 🛠️ Stack Technologique

### Frontend
- **Framework**: [Next.js 15.5.12](https://nextjs.org) (App Router) avec Turbopack
- **React**: 19.2.4
- **Intelligence Artificielle**: Google Generative AI (Gemini 2.0 Flash) pour l'OCR
- **State Management**: TanStack Query (React Query) v5
- **UI Components**: Lucide React pour les icônes
- **Styling**: Tailwind CSS 3.4
- **Thèmes**: next-themes pour le mode sombre/clair
- **Calendrier**: FullCalendar 6.1
- **Graphiques**: Recharts 2.12
- **Stockage Cloud**: [Vercel Blob](https://vercel.com/storage/blob) 2.0

### Backend & Data
- **Runtime**: Node.js 20+
- **Base de données**: PostgreSQL (Neon.tech en production)
- **ORM**: Prisma 6.19
- **Authentification**: NextAuth.js v4.24
- **Validation**: Zod 4.3

### Génération de Documents
- **PDF**: jsPDF 3.0 avec jspdf-autotable
- **Excel**: XLSX 0.18
- **Capture d'écran**: html2canvas 1.4

## 🚀 Installation & Déploiement

### Prérequis
- Node.js (v20+)
- Instance PostgreSQL
- Clé API Google Gemini (pour l'OCR)
- Vercel Blob Token (pour le stockage cloud)

### Configuration Rapide
1. **Dépôt**
   ```bash
   git clone [url-du-depot]
   cd agendapro
   ```
2. **Dépendances**
   ```bash
   npm install
   ```
3. **Environnement** (`.env.local`)
   ```env
   DATABASE_URL="postgresql://..."
   GOOGLE_GENAI_API_KEY="..."
   BLOB_READ_WRITE_TOKEN="..." # Optionnel en local
   NEXTAUTH_SECRET="..."
   ```
4. **Base de Données**
   ```bash
   npx prisma generate
   npx prisma db sync  # Script de diagnostic et synchronisation intelligent
   ```
5. **Démarrage**
   ```bash
   npm run dev
   ```

### 🛠️ Maintenance & Diagnostic
L'application inclut un outil de synchronisation de base de données intelligent :
```bash
npm run db:sync
```
Ce script détecte les différences entre votre code (schema.prisma) et votre base de données, et aide à corriger les erreurs d'énumérations ou de colonnes manquantes.

### 🌍 Mise en Production
L'application est optimisée pour Vercel. Consultez **[Vercel_Blob_Setup.md](./Vercel_Blob_Setup.md)** pour configurer le stockage d'images cloud permanent.

---
**AGENDA PRO** - © Michel ESPARSA
*Gestion Intelligente d'Interventions*
