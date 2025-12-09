# 📅 CELCAT Calendar - Emploi du Temps Universitaire

[![CI/CD](https://github.com/ZacoFunKy/CELCAT-Calendar/actions/workflows/ci.yml/badge.svg)](https://github.com/ZacoFunKy/CELCAT-Calendar/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Application web complète pour transformer les emplois du temps CELCAT en calendriers personnalisés et accessibles. Construit avec **Next.js 16**, **React 19**, et une architecture modulaire pour une maintenance simplifiée.

> **🎯 Production-ready**: Conçu pour fonctionner de manière autonome avec un minimum de supervision.

## 📖 Documentation

| Document | Description |
|----------|-------------|
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | 🏗️ Architecture technique détaillée et diagrammes |
| **[MAINTENANCE.md](./MAINTENANCE.md)** | 🔧 Guide de maintenance et dépannage |
| **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)** | 🚀 Guide de migration vers la nouvelle architecture |
| **[CACHE_WARMING_SETUP.md](./CACHE_WARMING_SETUP.md)** | ⚡ Configuration du préchauffage de cache |

## ✨ Fonctionnalités Principales

### Pour les Utilisateurs
- ✅ **Dashboard Intuitif**: Interface moderne pour gérer groupes et préférences
- 🎨 **Personnalisation Complète**: Couleurs, types d'événements, renommage, masquage
- 📱 **Multi-plateforme**: Compatible Google Calendar, Apple Calendar, Outlook
- 🔔 **Notifications** (optionnel): Alertes en cas de changement d'emploi du temps
- 🔐 **Authentification Sécurisée**: NextAuth.js avec tokens API uniques

### Pour les Administrateurs
- ⚡ **Performance Optimale**: Cache à 2 niveaux (Memory + Redis) avec stale-while-revalidate
- 📊 **Monitoring Intégré**: Health checks, métriques cache, statistiques d'usage
- 🔄 **Haute Disponibilité**: Circuit breaker, retry automatique, fallback sur cache stale
- 🚀 **Zero-Downtime**: Préchauffage cache via cron, CDN edge caching
- 📝 **Logs Structurés**: Niveaux configurables (debug/info/warn/error)
- 🛡️ **Rate Limiting**: Protection contre abus (IP + token based)

### Architecture Moderne
- 🏗️ **Modulaire**: Configuration centralisée, services découplés, erreurs structurées
- 🧪 **Testable**: Tests unitaires, e2e, performance avec Jest
- 📚 **Documenté**: JSDoc complet, architecture détaillée, guides de maintenance
- 🔧 **Maintenable**: "Set and forget" - fonctionne de manière autonome

## 🚀 Démarrage Rapide

### Prérequis
- Node.js 20+ et npm
- Compte MongoDB (gratuit sur [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))
- (Optionnel) Redis pour cache L2 (gratuit sur [Upstash](https://upstash.com))

### Installation

1. **Cloner le projet**
   ```bash
   git clone https://github.com/ZacoFunKy/CELCAT-Calendar.git
   cd CELCAT-Calendar
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Configuration**
   
   Créer un fichier `.env.local` à la racine :
   ```env
   # Base de données (REQUIS)
   MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/celcat
   
   # NextAuth (REQUIS)
   NEXTAUTH_SECRET=GENERATE_RANDOM_STRING_HERE
   NEXTAUTH_URL=http://localhost:3000
   
   # CELCAT API (Par défaut: Bordeaux)
   CELCAT_URL=https://celcat.u-bordeaux.fr/Calendar/Home/GetCalendarData
   
   # Cache Redis (OPTIONNEL mais recommandé)
   REDIS_URL=redis://default:password@host:port
   
   # Logging (OPTIONNEL)
   LOG_LEVEL=warn  # debug|info|warn|error
   ```

4. **Lancer en développement**
   ```bash
   npm run dev
   ```
   
   Ouvrir [http://localhost:3000](http://localhost:3000)

5. **Créer un compte et tester**
   - S'inscrire via `/register`
   - Configurer groupes dans le dashboard
   - Récupérer lien ICS et l'ajouter à votre calendrier

### Déploiement Production (Vercel)

1. **Fork le projet** sur GitHub

2. **Connecter à Vercel**
   - Aller sur [vercel.com](https://vercel.com)
   - "Import Project" → Sélectionner votre fork
   
3. **Configurer les variables d'environnement**
   ```env
   MONGODB_URI=mongodb+srv://...
   NEXTAUTH_SECRET=...
   NEXTAUTH_URL=https://your-domain.vercel.app
   REDIS_URL=redis://...  # Optionnel
   ```

4. **Deploy** 
   - Vercel déploie automatiquement
   - URL: `https://your-project.vercel.app`

5. **Configurer le cron** (Préchauffage cache)
   - Voir [CACHE_WARMING_SETUP.md](./CACHE_WARMING_SETUP.md)

### Variables d'Environnement Complètes

Voir [ARCHITECTURE.md](./ARCHITECTURE.md#variables-denvironnement-requises) pour la liste complète avec descriptions.

## 🧪 Tests et Qualité

Ce projet utilise Jest pour les tests automatisés et GitHub Actions pour l'intégration continue.

### Lancer les tests

```bash
# Exécuter tous les tests
npm test

# Exécuter les tests avec couverture
npm run test:coverage

# Exécuter les tests en mode watch
npm run test:watch
```

### Tests inclus

- **Tests de format ICS** : Validation RFC 5545, structure du calendrier, encodage des caractères
- **Tests d'API** : Validation des paramètres, gestion des erreurs, retry logic
- **Tests de traitement d'événements** : Formatage, filtrage, nettoyage HTML, extraction de localisation
- **Tests de cache** : Headers de cache, revalidation

### CI/CD

Le projet utilise GitHub Actions pour :
- ✅ Exécuter les tests sur Node.js 18.x et 20.x
- ✅ Vérifier le linting du code
- ✅ Valider le build Next.js
- ✅ Valider le format ICS généré

Les workflows s'exécutent automatiquement sur les PRs et les pushs vers les branches `main` et `develop`.

## ⚙️ Configuration

Le fichier principal contient un objet CONFIG au début du script que vous pouvez adapter :
```javascript
const CONFIG = {
  celcatUrl: '[https://celcat.u-bordeaux.fr/](https://celcat.u-bordeaux.fr/)...', // URL source
  timezone: 'Europe/Paris',
  blacklist: ['DSPEG'], // Mots clés à exclure
  // ...
};
```

### Variables d'environnement

- `ADMIN_API_KEY`: Clé API pour l'accès administrateur au dashboard et aux statistiques
- `NOTIFICATION_WEBHOOK_URL`: URL de webhook pour recevoir les notifications de changements d'emploi du temps (optionnel)
- `CELCAT_URL`: URL de l'API Celcat (par défaut: https://celcat.u-bordeaux.fr/Calendar/Home/GetCalendarData)
- `CACHE_TTL`: Durée du cache en secondes (par défaut: 3600)
- `LOG_LEVEL`: Niveau de log (error, warn, info)

## 📊 Dashboard Administrateur

Un dashboard administrateur est disponible à l'adresse `/admin/dashboard` pour:
- Visualiser les statistiques d'utilisation
- Voir les groupes les plus demandés
- Monitorer les performances de l'API
- Accéder aux logs détaillés

Pour y accéder, définissez la variable `ADMIN_API_KEY` et utilisez cette clé pour vous authentifier.

## 🔔 Notifications Push

Le système détecte automatiquement les changements dans les emplois du temps et envoie des notifications:
- Notifications via les logs de l'application
- Support des webhooks pour intégrations externes (Slack, Discord, etc.)
- Configuration via `NOTIFICATION_WEBHOOK_URL`

Pour tester les notifications: `POST /api/notifications/test` (nécessite authentification admin)
## 📦 Déploiement

Ce projet est optimisé pour être déployé sur Vercel (recommandé pour Next.js).

1. Poussez votre code sur GitHub.

2. Importez le projet sur Vercel.

3. Votre API est en ligne !
