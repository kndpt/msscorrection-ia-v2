# MSS Correction IA

Serveur de correction automatique de manuscrits littéraires via IA (OpenAI GPT-4).

## 🏗️ Architecture

Serveur NestJS TypeScript avec 4 modules principaux :

- **DocumentModule** : Extraction du texte DOCX (via mammoth) et découpage en chunks optimisés
- **StorageModule** : Stockage local des fichiers et résultats
- **AiModule** : Interface avec OpenAI pour la détection de fautes
- **CorrectionModule** : Orchestration du processus complet en mode asynchrone

### Pattern "Fire & Forget"

Le serveur répond **immédiatement** au client (202 Accepted) puis traite le manuscrit en arrière-plan. Cela permet de gérer des corrections qui peuvent prendre plusieurs heures sans bloquer le client.

```
Client → POST /correction/start → Réponse immédiate (202)
                                        ↓
                                Background processing
                                        ↓
                                Notification (TODO)
```

## 📦 Installation

```bash
# Installer les dépendances
npm install

# Copier le fichier d'environnement
cp .env.example .env

# Configurer votre clé API OpenAI dans .env
# OPENAI_API_KEY=sk-...
```

## 🚀 Démarrage

```bash
# Développement
npm run start:dev

# Production
npm run build
npm run start:prod
```

Le serveur démarre sur `http://localhost:3000`

## 🔧 Utilisation

### 1. Envoyer un manuscrit pour correction

```bash
curl -X POST http://localhost:3000/correction/start \
  -F "file=@votre-roman.docx"
```

Réponse immédiate :

```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "started",
  "message": "Le serveur travaille sur votre manuscrit. La correction peut prendre plusieurs heures."
}
```

### 2. Consulter les résultats

Les résultats sont stockés dans `storage/{jobId}/corrections.json`

Format des corrections :

```json
{
  "corrections": [
    {
      "position": 1234,
      "original": "sa voiture",
      "correction": "ça voiture",
      "type": "orthographe",
      "explication": "Confusion entre 'sa' (possessif) et 'ça' (démonstratif)"
    }
  ]
}
```

## 🧪 Tests

```bash
# Tests unitaires
npm run test

# Tests e2e
npm run test:e2e

# Coverage
npm run test:cov
```

## 📚 Structure du Projet

```
src/
├── modules/
│   ├── document/       # Extraction et découpage DOCX
│   ├── storage/        # Stockage filesystem
│   ├── ai/             # Interface OpenAI
│   └── correction/     # Orchestration
├── common/
│   ├── types/          # Types TypeScript partagés
│   └── utils/          # Utilitaires
└── main.ts
```

## ⚙️ Configuration

Variables d'environnement (`.env`) :

```bash
# OpenAI
OPENAI_API_KEY=sk-...

# Application
PORT=3000
NODE_ENV=development

# Storage
STORAGE_PATH=./storage
```

## 🔮 Roadmap

### Phase 2 : Notifications (À venir)

- [ ] Envoi d'email de fin de traitement
- [ ] Webhook vers un service externe
- [ ] Endpoint GET /correction/{jobId}/status

### Phase 3 : Analyse de style (À venir)

- [ ] Module StyleAnalysisModule
- [ ] Détection de la patte artistique de l'auteur
- [ ] Contexte stylistique pour les corrections

## 🛠️ Stack Technique

- **Backend** : NestJS 10.x + TypeScript
- **Extraction DOCX** : mammoth
- **IA** : OpenAI API (GPT-4o-mini)
- **Stockage** : Filesystem local

Pas de Redis, BullMQ, PostgreSQL → Projet indépendant et léger

## 📝 Commits

Format : `<type>(<scope>): <subject>`

Exemples :

- `feat(correction): implement fire-and-forget pattern`
- `fix(ai): adjust token limit for large manuscripts`
- `docs(readme): add deployment instructions`

## 🚢 Déploiement (Railway)

```bash
# Railway démarre automatiquement avec
npm run start:prod

# Assurer la persistance du dossier /storage si besoin
```

## 📄 License

Propriétaire - MSS Correction IA
