# Agenda Pro - Intelligence de Gestion pour le Maintien à Domicile

**Version 0.0.10**

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
- Mode Smartphone optimisé : Boutons administratifs accessibles sur mobile.
- Personnalisation visuelle : Couleurs par intervenant avec adaptation automatique du contraste du texte (noir/blanc).

#### 🗂️ **Gestion des Rendez-vous & CRM Patient**
- **CRM Patient** : Gestion complète des fiches patients (informations de contact, adresses).
- **Historique Client** : Liste triable de toutes les interventions passées pour chaque patient.
- **Rapports PDF Patient** : Génération de relevés d'interventions HD numérotés et téléchargeables par patient.
- **Interface Manager** : Liste complète des rendez-vous avec recherche multidimensionnelle.
- **Modification des Interventions** : Les administrateurs peuvent modifier les interventions et rendez-vous déjà réalisés.

#### 👥 Administration & Utilisateurs
- **Rôles Unifiés** : Gestion des Administrateurs, Intervenants et **Visiteurs** (lecture seule).
- **Gestion Premium** : Attribution de couleurs personnalisées par intervenant.
- **Permissions Granulaires** : Contrôle d'accès basé sur les rôles pour l'édition des tarifs et frais.
- **Outils Maintenance** : Système de sauvegarde et export JSON complet de la base de données.

#### 📊 **Synthèse & Analytics Premium**
- Panneaux de bord unifiés sous l'onglet **Synthèse**.
- **Visualisation de Données** : Graphiques quotidiens et répartition par patient/activité via Recharts.
- **Graphiques Financiers** : Évolution du salaire net avec visualisation des tendances.
- **Exports Professionnels** : Génération de rapports PDF et Excel pour la comptabilité.

#### 🧾 **Gestion des Dépenses & OCR IA**
- **Analyse par IA (Gemini 2.5)** : Extraction automatique des données depuis les photos de justificatifs (Marchand, Montant, TVA, Date, Catégorie).
- **Stockage Hybride** : Utilisation de **Cloudflare R2** pour le stockage permanent.
- **Visionneuse de Reçus** : Lightbox intégrée pour visualiser les justificatifs.

#### 🎨 **Interface Premium (Framer Motion)**
- **Transitions Luxueuses** : Transitions de page fluides ("Slide & Fade").
- **Glassmorphism** : Effets de transparence dépolie et flou d'arrière-plan (`backdrop-blur`) sur les modales.
- **Animations Contextuelles** : Barres d'actions et modales avec physique de ressort (`spring`).

## 🛠️ Stack Technologique

### Frontend
- **Framework**: [Next.js 15.5.x](https://nextjs.org) (App Router)
- **Runtime**: Cloudflare Workers / Edge Runtime
- **Animations**: Framer Motion 12
- **Intelligence Artificielle**: Google Generative AI (Gemini 2.5)
- **State Management**: TanStack Query v5
- **UI Components**: Lucide React
- **Styling**: Tailwind CSS 3.4

### Backend & Data
- **Base de données**: PostgreSQL (Neon.tech)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/) (avec Proxy d'initialisation lazy-load)
- **Authentification**: NextAuth.js v4.24 (compatible Edge)
- **Stockage Cloud**: [Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/)

## 🚀 Installation & Déploiement

### Prérequis
- Node.js (v20+)
- Instance PostgreSQL (Neon recommandé)
- Clé API Google Gemini (OCR)
- Compte Cloudflare (R2, Pages & Workers)

### Configuration (`.env.local`)
```env
DATABASE_URL="postgresql://..."
GEMINI_API_KEY="..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"

# R2 Configuration
R2_ACCOUNT_ID="..."
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET="agendapro-storage"
NEXT_PUBLIC_STORAGE_TYPE="r2"
```

### 🌍 Déploiement Cloudflare
L'application est optimisée pour le runtime Edge :
- **Variables & Secrets** : Assurez-vous d'utiliser `wrangler secret put` pour les données sensibles.
- **Build & Deploy** :
  ```bash
  npm run cf:deploy
  ```

---
**AGENDA PRO** - © Michel ESPARSA
*Gestion Intelligente & Expérience Premium*
