# Agenda Pro - Intelligence de Gestion pour le Maintien à Domicile

Une plateforme web premium de pointe dédiée à la planification et à la gestion financière pour les services d'aide à la personne. Ce système orchestre les interventions, le suivi du temps, la gestion des frais opérationnels et le calcul automatisé de la paie.

## 🎯 Vision & Objectifs

**Agenda Pro** transforme la complexité logistique du maintien à domicile en une expérience fluide et prévisible. L'application unifie les besoins des administrateurs et des intervenants dans une interface moderne, hautement réactive et visuellement riche.

### Fonctionnalités Clés

#### 📅 **Gestion de Calendrier Intelligente**
- Interface visuelle haute performance (FullCalendar).
- Planification multi-vues : Mois, Semaine, Jour.
- **Détection de Conflits** : Alertes intelligentes en cas de chevauchement d'interventions.
- **Annulations Visuelles** : Nouveau statut **"Annulé"** avec hachurage sombre dynamique sur la couleur de l'intervenant.
- Mode Smartphone optimisé avec polices de caractères agrandies pour le terrain.
- Personnalisation visuelle : Couleurs par intervenant avec adaptation automatique du contraste du texte (noir/blanc).

#### 🗂️ **Gestion des Rendez-vous (CRUD Complet)**
- Système dédié pour les activités hors-interventions (Réunions, formations, etc.).
- **Interface Manager** : Liste complète des rendez-vous avec recherche et filtrage.
- **Cycle de Vie** : Création, modification et suppression simplifiées via une interface unifiée.
- Suivi du statut : **Planifié**, **Réalisé** (Pleine couleur) et **Annulé** (Hachuré).

#### 👥 Administration & Utilisateurs
- **Rôles Unifiés** : Gestion des Administrateurs, Intervenants et **Visiteurs**.
- **Rôle Visiteur** : Accès en lecture seule au calendrier uniquement. Interface simplifiée (tarifs et couleurs masqués).
- **Gestion Premium** : Attribution de couleurs personnalisées. Les visiteurs ont une couleur gris clair (`#cbd5e1`) fixe pour une visibilité optimale.
- **Sécurité Critique** : Protection native du compte `admin` principal contre la suppression ou la rétrogradation.
- **Contrôle d'Annulation** : Seuls les administrateurs peuvent marquer une intervention comme annulée.

#### 📊 **Synthèse & Analytics Premium (Ex-Rapports)**
- Panneaux de bord unifiés pour Administrateurs et Intervenants sous l'onglet **Synthèse**.
- **Sélecteur de Période Unifié** : Système intelligent de sélection Année/Mois basé sur l'activité réelle.
- **Visualisation de Données** : Graphiques d'activité quotidiens et répartition par patient/activité (Recharts).
- **Exclusion des Annulations** : Les interventions hachurées sont automatiquement exclues des calculs financiers et horaires.
- **Synthèse Financière Haute Précision** :
  - Distinction entre frais de déplacement **réalisés** et **prévisionnels**.
  - Calcul de la paie en temps réel.
  - Indicateur d'**Impact sur la Trésorerie** (Paies + Dépenses).
- **Export PDF Professionnel** : Version haute définition avec en-têtes Slate, logos et pieds de page numérotés.

#### 🧾 **Gestion des Dépenses de Fonctionnement**
- Enregistrement complet des frais opérationnels.
- Association des dépenses aux intervenants ou compte global.
- Workflow de validation : Toutes les dépenses sont certifiées par l'administrateur.
- Suivi historique détaillé avec motifs et montants précis.

## 🛠️ Stack Technologique (Stable)

### Frontend
- **Framework**: [Next.js 14.2.14](https://nextjs.org) (App Router)
- **Logique UI**: React 18.3.1 (Choisi pour une compatibilité maximale avec les bibliothèques de graphiques)
- **Styling**: Tailwind CSS & Design System HSL sur-mesure.
- **Graphiques**: Recharts (Modern SVG Charts)
- **Icônes**: Lucide React
- **Export**: jsPDF & html2canvas

### Backend & Data
- **Runtime**: Node.js
- **Base de données**: PostgreSQL
- **ORM**: Prisma 6 (Gestion relationnelle avancée avec suppression en cascade)
- **Authentification**: NextAuth.js v4 (Sessions sécurisées)

## 🚀 Installation & Déploiement

### Prérequis
- Node.js (v20+)
- Instance PostgreSQL

### Configuration Rapid
1. **Dépôt**
   ```bash
   git clone [url-du-depot]
   cd agendapro
   ```
2. **Dépendances**
   ```bash
   npm install
   ```
3. **Environnement** (`.env`)
   ```env
   DATABASE_URL="postgresql://user:pass@localhost:5432/agendapro"
   NEXTAUTH_SECRET="..."
   NEXTAUTH_URL="http://localhost:3000"
   ```
4. **Base de Données**
   ```bash
   npx prisma generate
   npx prisma migrate dev
   npx prisma db seed
   ```
5. **Démarrage**
   ```bash
   npm run dev
   ```

### 🛠️ Maintenance & Diagnostic
En cas de désynchronisation de la base de données (ex: erreur d'enum), un script de diagnostic est disponible :
```bash
node scripts/check-db-sync.js
```
Consultez **[README_DATABASE_DEBUG.md](./README_DATABASE_DEBUG.md)** pour plus de détails.

### 🌍 Mise en Production
Pour déployer les mises à jour sur Vercel et Neon (Base de données), consultez le guide dédié :
👉 **[DEPLOYMENT.md](./DEPLOYMENT.md)**

## 🔐 Sécurité & Intégrité
- Hachage BCrypt pour tous les mots de passe.
- Protection contre les conflits d'horaires.
- Cascade Deletion : La suppression d'un patient ou utilisateur nettoie proprement toutes les données liées.
- Contrôle d'accès strict niveau API.

---
**AGENDA PRO** - © Michel ESPARSA
*Gestion Intelligente d'Interventions*
