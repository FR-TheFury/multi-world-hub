# Multi-World Hub

Plateforme de gestion multi-monde pour JDE (Juriste Droit de l'Entreprise), JDMO (Juriste Droit de la Maîtrise d'Œuvre) et DBCS (Database/Base de Connaissance et Statistiques).

## 🚀 Fonctionnalités

- **Gestion multi-monde** : Navigation entre JDE, JDMO et DBCS
- **Workflows personnalisés** : Chaque monde dispose de son propre workflow adapté
- **Système de dossiers** : Création, suivi et transfert de dossiers entre mondes
- **Authentification** : Système d'authentification sécurisé avec gestion des rôles
- **Dashboard interactif** : Statistiques et visualisation en temps réel
- **Documents** : Gestion et génération de documents automatiques
- **Notifications** : Système de notifications en temps réel
- **Messagerie** : Communication interne intégrée

## 🛠️ Technologies

- **Frontend** : React 18, TypeScript, Vite
- **Styling** : Tailwind CSS, shadcn/ui
- **Backend** : Supabase (Base de données PostgreSQL, Authentication, Storage, Edge Functions)
- **State Management** : Zustand
- **Routing** : React Router v6
- **Forms** : React Hook Form + Zod
- **Animations** : Framer Motion
- **Charts** : Recharts

## 📦 Installation

```bash
# Cloner le repository
git clone <YOUR_GIT_URL>

# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev
```

> **Note** : Les credentials Supabase sont déjà configurés dans le code (`src/integrations/supabase/client.ts`). Aucune configuration `.env` n'est nécessaire.

## 🗄️ Configuration de la base de données

### 1. Créer un projet Supabase

Créez un compte sur [Supabase](https://supabase.com) et créez un nouveau projet.

### 2. Exécuter les migrations

Exécutez tous les fichiers dans `supabase/migrations/` dans l'ordre chronologique.

### 3. Exécuter les scripts de workflow

Exécutez les scripts dans `scripts/` selon vos besoins :
- `insert-jde-workflow.sql` - Workflow JDE
- `insert-jdmo-complete-workflow.sql` - Workflow JDMO complet (14 étapes)
- `insert-dbcs-simple-workflow.sql` - Workflow DBCS simplifié (archivage)

### 4. Configuration des URLs Supabase (OBLIGATOIRE pour GitHub Pages)

⚠️ **Étape critique** : Pour que l'authentification fonctionne, vous DEVEZ configurer les URLs dans Supabase :

1. Allez sur [Supabase Dashboard](https://supabase.com/dashboard)
2. Sélectionnez votre projet
3. Allez dans **Authentication > URL Configuration**
4. Configurez les URLs suivantes :

**Site URL :**
```
https://fr-thefury.github.io/multi-world-hub/
```

**Redirect URLs** (ajoutez toutes ces URLs, une par ligne) :
```
https://fr-thefury.github.io/multi-world-hub/**
https://fr-thefury.github.io/multi-world-hub/auth
http://localhost:8080/**
http://localhost:8080/auth
```

**Domaine personnalisé** (si applicable) :
```
https://votre-domaine.com/**
https://votre-domaine.com/auth
```

⚠️ Sans cette configuration, vous verrez des erreurs :
- `"requested path is invalid"`
- `"Invalid Refresh Token"`
- Redirections incorrectes vers localhost

## 🚀 Déploiement

### Déploiement local

Le projet est configuré pour être déployé sur GitHub Pages.

```bash
# Build de production
npm run build

# Preview du build
npm run preview
```

### GitHub Pages (Déploiement automatique)

Le projet est configuré pour un déploiement automatique via GitHub Actions.

#### Configuration initiale

1. **Activez GitHub Pages** dans votre repository :
   - Allez dans **Settings > Pages**
   - Source : **GitHub Actions**

2. **Poussez sur la branche `main`** :
   ```bash
   git add .
   git commit -m "Deploy to GitHub Pages"
   git push origin main
   ```

3. **Le workflow GitHub Actions** se déclenche automatiquement et déploie votre site

4. **Votre site sera disponible à** : `https://fr-thefury.github.io/multi-world-hub/`

#### Vérification du déploiement

- Allez dans l'onglet **Actions** de votre repository GitHub
- Vérifiez que le workflow "Deploy to GitHub Pages" s'est exécuté avec succès
- Cliquez sur le déploiement pour voir les détails et l'URL finale

#### Configuration Supabase post-déploiement

⚠️ **N'oubliez pas** de configurer les URLs Supabase comme indiqué dans la section "Configuration de la base de données" ci-dessus, sinon l'authentification ne fonctionnera pas en production !

## 📝 Structure du projet

```
src/
├── components/          # Composants réutilisables
│   ├── admin/          # Composants d'administration
│   ├── dossier/        # Composants liés aux dossiers
│   └── ui/             # Composants UI (shadcn)
├── pages/              # Pages de l'application
│   ├── world/          # Pages spécifiques aux mondes
│   └── superadmin/     # Pages super admin
├── hooks/              # Hooks personnalisés
├── lib/                # Utilitaires et configuration
└── integrations/       # Intégrations (Supabase)

supabase/
├── functions/          # Edge Functions
└── migrations/         # Migrations SQL
```

## 🌐 Mondes

### JDE (Juriste Droit de l'Entreprise)
Gestion juridique d'entreprise avec workflow complet de création, consultation et clôture.

### JDMO (Juriste Droit de la Maîtrise d'Œuvre)
Gestion de projets de construction avec workflow incluant visites, validations et transferts vers DBCS.

### DBCS (Base de Connaissance et Statistiques)
Archivage et statistiques des dossiers clôturés avec indexation et analyse.

## 👥 Rôles utilisateurs

- **Super Admin** : Accès complet à toutes les fonctionnalités
- **Admin** : Gestion des utilisateurs et des workflows
- **User** : Accès aux dossiers et fonctionnalités standard

## 📄 Licence

Ce projet est privé et propriétaire.

## 🤝 Contribution

Les contributions sont les bienvenues. Veuillez créer une issue avant de soumettre une pull request.
