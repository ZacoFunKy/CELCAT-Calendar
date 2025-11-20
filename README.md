# 📅 API Convertisseur Celcat vers ICS

[![CI/CD](https://github.com/ZacoFunKy/CELCAT-Calendar/actions/workflows/ci.yml/badge.svg)](https://github.com/ZacoFunKy/CELCAT-Calendar/actions/workflows/ci.yml)

Ce projet est une API construite avec **Next.js** qui permet de récupérer, nettoyer et transformer les emplois du temps universitaires (format Celcat) en un flux de calendrier standardisé **ICS**. 

Il est conçu pour être compatible avec Google Calendar, Apple Calendar et Outlook, en résolvant les problèmes courants d'affichage (doublons, formatage illisible, gestion des vacances).

## ✨ Fonctionnalités

- **Nettoyage intelligent** : Reformate les titres des cours (CM, TD, TP, Examens) pour une lecture rapide.
- **Filtrage** : Supprime les événements indésirables via une *blacklist* configurable.
- **Gestion des vacances** : 
  - Affiche les vacances sous forme de bandeau "Toute la journée" (All Day) pour ne pas encombrer la vue semaine.
  - Option pour masquer complètement les vacances via un paramètre d'URL.
- **Détection des salles** : Extrait et nettoie les informations de lieu (Amphi, Salles, Bâtiments).
- **Performance** : Utilise le cache de Next.js (revalidation toutes les heures) pour réduire la charge sur les serveurs de l'université.

## 🚀 Comment l'utiliser

L'API expose une route principale qui génère le fichier `.ics` à la volée.

### Endpoint
`GET /api/calendar` (ou le chemin où vous avez placé le fichier route.js)

### Paramètres

| Paramètre | Requis | Description | Exemple |
| :--- | :---: | :--- | :--- |
| `group` | ✅ | L'identifiant (ou les identifiants) du groupe Celcat. | `g2568` |
| `holidays`| ❌ | `true` pour afficher les vacances, `false` (défaut) pour les masquer. | `true` |

### Exemples d'URL

**1. Récupérer l'emploi du temps d'un groupe :**

https://celcat-calendar.vercel.app/

**2. Récupérer plusieurs groupes fusionnés (ex: CM + TD) :**

https://celcat-calendar.vercel.app/api/calendar.ics?group=5CYG500S%20-%20G2&holidays=false

**3. Inclure les vacances dans le calendrier :**

https://celcat-calendar.vercel.app/api/calendar.ics?group=5CYG500S%20-%20G2&holidays=true

## 🛠️ Installation et Développement

1. **Cloner le projet**
   ```bash
   git clone [https://github.com/votre-pseudo/votre-projet.git](https://github.com/votre-pseudo/votre-projet.git)
   cd votre-projet
   npm install
   ```
2. **Installer les dépendances**
    ```bash
    npm install
    # ou
    pnpm install
    ```
3. **Lancer le serveur de développement**
    ```bash
    npm run dev
    ```
4. **Tester**

    Ouvrez votre navigateur sur http://localhost:3000/api/calendar?group=VOTRE_GROUPE

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
## 📦 Déploiement

Ce projet est optimisé pour être déployé sur Vercel (recommandé pour Next.js).

1. Poussez votre code sur GitHub.

2. Importez le projet sur Vercel.

3. Votre API est en ligne !
