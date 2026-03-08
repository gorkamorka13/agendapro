---
name: cloudflare-edge-stability
description: Guide pour assurer la stabilité des applications Next.js sur Cloudflare Pages (Edge Runtime). Couvre l'initialisation DB, les imports dynamiques et la persistence des variables d'environnement.
---

# Cloudflare Edge Stability ⛅️

Cette compétence documente les solutions aux problèmes critiques rencontrés lors du déploiement d'applications Next.js + Drizzle sur le runtime Edge de Cloudflare.

## 🛠️ Problématiques & Solutions

### 1. Initialisation de la Base de Données (Lazy Load)
Le runtime Edge peut échouer si DATABASE_URL n'est pas disponible au moment de l'import du module (Cold Start).
**Solution** : Utiliser un Proxy pour retarder l'initialisation jusqu'à la première requête.

```typescript
// Exemple de Proxy DB transparent
export const db = new Proxy(buildTimeDb, {
  get(target, prop, receiver) {
    if (prop === 'constructor') return target.constructor;
    const activeDb = getRealDb(); // Charge l'URL et crée l'instance seulement ici
    const value = Reflect.get(activeDb, prop, receiver === target ? activeDb : receiver);
    return typeof value === 'function' ? value.bind(activeDb) : value;
  }
});
```

### 2. Compatibilité des Librairies Node.js (Bcrypt, jsPDF)
Certaines librairies utilisent des API Node.js ou DOM incompatibles avec l'Edge Runtime s'ils sont importés au niveau global.
**Solution** : Utiliser des `await import()` dynamiques à l'intérieur des fonctions/handlers.

### 3. Persistance des Environnements (Wrangler Sync)
`wrangler deploy` synchronise les variables d'environnement avec le fichier `wrangler.toml`. Les variables ajoutées via le dashboard sans être dans le TOML sont supprimées.
**Solution** :
- Mettre les variables non-sensibles dans `[vars]` de `wrangler.toml`.
- Mettre les secrets dans la section **Secrets** de Cloudflare via `wrangler secret put`.

## 📋 Checklist de Déploiement Cloudflare

- [ ] Vérifier que `nodejs_compat` est activé dans `wrangler.toml`.
- [ ] Transformer les imports Node-heavy en imports dynamiques.
- [ ] Utiliser la Lazy Initialization pour le client de base de données.
- [ ] Vérifier que les variables d'environnement sont listées dans `wrangler.toml` ou définies comme Secrets.
- [ ] Ajouter `/.open-next/` et `/.wrangler/` au `.gitignore`.

---
*Compétence créée pour garantir la résilience des déploiements Edge.*
