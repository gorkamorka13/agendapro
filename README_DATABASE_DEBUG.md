# 🛠️ Guide de Diagnostic : Synchronisation Base de Données & Enums

Ce document explique les problèmes rencontrés lors de l'ajout du rôle `VISITEUR` et fournit les solutions pour éviter que cela ne se reproduise.

## ⚠️ La Problématique
Lorsqu'on ajoute un nouveau champ ou une nouvelle valeur d'énumération (comme `VISITEUR`) dans `schema.prisma`, trois éléments doivent être parfaitement alignés :
1. **Le Schéma Prisma** (`schema.prisma`)
2. **Le Client Prisma Généré** (dans `node_modules/.prisma`)
3. **La Base de Données Réelle** (Postgres/Neon)

### Les causes de l'erreur "Invalid input value for enum Role"
L'erreur survient quand le code (le Client Prisma) connaît la nouvelle valeur, mais la base de données vers laquelle il pointe ne la connaît pas encore.

### 1. Conflit d'Environnement (.env vs .env.local)
C'est la cause principale identifiée. Next.js charge `.env.local` en priorité.
- Si `.env` pointe vers la base A et `.env.local` vers la base B.
- Vous synchronisez la base A, mais le serveur tourne sur la base B.
- Résultat : Le code "croit" que la valeur existe, mais Postgres la rejette.

### 2. Verrouillage des fichiers (EPERM sur Windows)
Sur Windows, le serveur Next.js peut verrouiller les fichiers du moteur Prisma.
- Une commande `npx prisma db push` peut échouer silencieusement ou partiellement si le serveur tourne.

---

## 🚀 Solution : Script de Diagnostic Antigravity
Pour vérifier l'alignement, utilisez le script de diagnostic inclus.

### Comment l'utiliser ?
Exécutez la commande suivante à chaque fois que vous avez un doute sur la synchronisation :
```bash
node scripts/check-db-sync.js
```

Ce script vérifie :
- Quelle URL de base de données est actuellement utilisée par l'environnement.
- Quelles sont les valeurs réelles présentes dans l'énumération `Role` en base.
- Si l'utilisateur `admin` principal est présent.

---

## 🛠️ Protocole de Mise à Jour (Safe Move)
Si vous modifiez `schema.prisma`, suivez TOUJOURS cet ordre :

1. **Arrêtez le serveur dev** (`Ctrl+C`).
2. **Vérifiez vos fichiers `.env` et `.env.local`** (ils doivent avoir la même URL).
3. **Synchronisez la base** :
   ```bash
   npx prisma db push
   ```
4. **Régénérez le client** :
   ```bash
   npx prisma generate
   ```
5. **Relancez le serveur** :
   ```bash
   npm run dev
   ```
