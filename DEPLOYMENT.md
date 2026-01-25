# Guide de Mise en Production

Ce document explique comment mettre à jour votre application sur Internet (Vercel/Neon) avec les modifications faites localement.

## 1. Mise à jour de la Structure (Schema)

C'est l'étape obligatoire pour que la nouvelle fonctionnalité "Rendez-vous" fonctionne en production. Elle va créer la table `Appointment` sur votre base de données principale.

### Procédure

1.  **Désactiver temporairement l'environnement local**
    Renommez votre fichier `.env.local` pour que Prisma utilise le fichier `.env` (qui contient les accès Production).
    ```powershell
    mv .env.local .env.local.bak
    ```

2.  **Pousser la structure**
    Cette commande va mettre à jour la structure de la base de production sans effacer les données existantes.
    ```powershell
    npx prisma db push
    ```
    ✅ *Prisma vous confirmera que la base est synchronisée.*

3.  **Réactiver l'environnement local**
    Une fois terminé, remettez le fichier en place.
    ```powershell
    mv .env.local.bak .env.local
    ```

## 2. Mise à jour du Contenu (Données)

> [!CAUTION]
> **Attention :** En général, on n'écrase pas les données de production avec les données locales, car cela pourrait supprimer des enregistrements créés par d'autres utilisateurs entre temps.

Cependant, comme la table `Appointment` est **nouvelle**, nous pouvons transférer les rendez-vous que vous avez créés localement vers la production sans risque pour les autres données.

### Script de transfert (Uniquement pour les Rendez-vous)

Si vous souhaitez envoyer vos rendez-vous de test vers la production :

1.  Assurez-vous que `.env.local` est actif (vous êtes en mode local).
2.  Je peux vous créer un petit script spécial pour copier uniquement les rendez-vous vers la production.

## 3. Déploiement du Code (Vercel)

Une fois la base de données prête :

1.  Envoyez vos modifications sur GitHub :
    ```powershell
    git add .
    git commit -m "Ajout fonctionnalité Gestion Rendez-vous"
    git push
    ```
2.  Vercel détectera automatiquement le changement et redéploiera le site.

---

### Résumé des commandes pour mettre à jour la structure (le plus important) :

```powershell
# 1. Passer en mode Prod
mv .env.local .env.local.bak

# 2. Mettre à jour la base
npx prisma db push

# 3. Revenir en mode Dev
mv .env.local.bak .env.local
```
