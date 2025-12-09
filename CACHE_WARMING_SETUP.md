# Cache Warming - Configuration

## Problème Vercel Hobby

Vercel gratuit limite les cron jobs à **1 fois par jour maximum**.

## Solutions

### Option 1: Cron Vercel (1x/jour) - DÉJÀ CONFIGURÉ ✅

Le `vercel.json` est configuré pour 6h du matin :
```json
"schedule": "0 6 * * *"
```

Configuration dans Vercel Dashboard:
1. Settings → Cron Jobs → Add Cron Job
2. Path: `/api/calendar.ics/warm-cache`
3. Schedule: `0 6 * * *` (6h du matin)
4. Headers: `Authorization: Bearer YOUR_CRON_SECRET`

### Option 2: GitHub Actions (toutes les 2h) - GRATUIT ILLIMITÉ 🎉

Un workflow `.github/workflows/cache-warming.yml` a été créé qui appelle ton endpoint toutes les 2 heures.

**Configuration requise** :

1. Va sur GitHub → Ton repo → Settings → Secrets and variables → Actions
2. Ajoute un secret : 
   - Name: `CRON_SECRET`
   - Value: La même valeur que dans Vercel (ton CRON_SECRET)

3. Le workflow se lancera automatiquement toutes les 2 heures
4. Tu peux aussi le lancer manuellement : Actions → Cache Warming → Run workflow

**Avantages** :
- ✅ Gratuit et illimité
- ✅ Toutes les 2 heures (au lieu d'1x/jour)
- ✅ Logs visibles dans GitHub Actions
- ✅ Lancement manuel possible

### Option 3: Upgrade Vercel Pro

Si tu veux rester 100% sur Vercel :
- Prix : $20/mois
- Permet crons illimités
- Change le schedule dans `vercel.json` vers `0 */2 * * *`

## Recommandation

**Utilise GitHub Actions** (Option 2) : c'est gratuit, plus fréquent, et tu gardes Vercel gratuit ! 🚀

Le cache sera warmé toutes les 2h au lieu d'1x par jour, améliorant encore les performances.
