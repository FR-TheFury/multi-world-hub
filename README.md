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

# Configurer les variables d'environnement
cp .env.example .env
# Ajouter vos clés Supabase dans .env

# Lancer le serveur de développement
npm run dev
```

## 🗄️ Configuration de la base de données

1. Créer un projet Supabase
2. Exécuter les migrations dans `supabase/migrations/`
3. Exécuter les scripts de workflow dans `scripts/` :
   - `insert-jde-workflow.sql`
   - `insert-jdmo-complete-workflow.sql`
   - `insert-dbcs-simple-workflow.sql`

## 🚀 Déploiement

Le projet est configuré pour être déployé sur GitHub Pages.

```bash
# Build de production
npm run build

# Preview du build
npm run preview
```

### GitHub Pages

Le déploiement automatique sur GitHub Pages se fait via GitHub Actions à chaque push sur la branche `main`.

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
