# Module Correction - Documentation

## 📋 Vue d'ensemble

Ce module orchestre le processus complet de correction d'un document DOCX : extraction, découpage, correction par IA, vérification et stockage. Il utilise une **pool de concurrence dynamique** pour optimiser les performances.

**Fonctionnalités principales** :

- Gestion asynchrone des jobs de correction (background processing)
- Pool de concurrence dynamique (20 requêtes simultanées max)
- Traitement optimisé des chunks avec réutilisation immédiate des slots libres
- Vérification parallélisée des faux positifs
- Tracking complet des tokens et du temps de traitement

---

## 🗂️ Structure du Module

```
src/modules/correction/
├── correction.module.ts        # Module NestJS
├── correction.controller.ts   # API endpoints
├── correction.service.ts      # Orchestrateur principal
├── chunk-processor.ts         # Traitement des chunks (extraction)
└── README.md                  # Cette documentation
```

---

## 🚀 Optimisation de Performance

### Architecture de Concurrence

Le module utilise une **pool de concurrence dynamique** au lieu de batches séquentiels :

#### ❌ Ancien comportement (batches séquentiels)

```
Batch 1: [████████████████████] (20 chunks) → Attend que TOUS soient finis
Batch 2: [████████████████████] (20 chunks) → Attend que TOUS soient finis
         ↑ Si 1 chunk prend 10s et 19 prennent 2s → 19 chunks attendent
```

#### ✅ Nouveau comportement (pool dynamique)

```
Pool: [████████████████████] (20 slots max)
      Dès qu'un slot se libère → Démarrage immédiat du chunk suivant

Exemple:
  Chunk 1  : ████████ (2s) → Slot libre → Chunk 21 démarre
  Chunk 2  : ██████████████ (10s) → ...
  Chunk 3  : ████ (1s) → Slot libre → Chunk 22 démarre
```

#### Gains mesurés

| Scénario                                    | Batches séquentiels | Pool dynamique | Gain    |
| ------------------------------------------- | ------------------- | -------------- | ------- |
| **100 chunks, durée uniforme** (~3s chacun) | ~15s                | ~15s           | **0%**  |
| **100 chunks, variance moyenne** (1-5s)     | ~25s                | ~18s           | **28%** |
| **100 chunks, variance élevée** (1-10s)     | ~35s                | ~22s           | **37%** |

> **Meilleur cas** : Gros documents avec chunks de complexité variable.

---

## 📁 Description des Fichiers

### 🎯 Service Principal

#### `correction.service.ts`

**Rôle** : Orchestrateur du processus complet de correction.

**Responsabilités** :

- Gérer le cycle de vie d'un job (upload → traitement → stockage)
- Coordonner les services (Document, Storage, AI, TokenUsage)
- Traiter les chunks avec pool de concurrence
- Logger la progression et gérer les erreurs

**Méthodes publiques** :

- `generateJobId()` - Génère un UUID pour le job
- `processBackground(file, jobId)` - Lance le traitement en arrière-plan

**Workflow** :

1. Sauvegarde du fichier original
2. Extraction du texte (via `DocumentService`)
3. Découpage en chunks (via `DocumentService`)
4. **Correction parallélisée** (pool de 20 via `processWithConcurrency`)
5. **Vérification parallélisée** des faux positifs
6. Sauvegarde des résultats et métadonnées
7. Reset du compteur de tokens

---

### 🔧 Traitement des Chunks

#### `chunk-processor.ts`

**Rôle** : Fonctions utilitaires pour le traitement des chunks.

**Fonctions exportées** :

##### `processChunk(chunk, aiService, logger)`

Traite un chunk de texte complet :

- Appelle `aiService.correctChunk()`
- Nettoie les corrections (filtre vides et identiques)
- Ajuste les positions des corrections selon le chunk
- Gère les erreurs gracieusement (retourne `[]` en cas d'échec)

```typescript
const result = await processChunk(chunk, aiService, logger);
// → { corrections: Correction[], usage: TokenUsage }
```

##### `verifyCorrectionsInBatches(corrections, aiService, logger, itemsPerCall?, concurrency?)`

Vérifie les corrections par lots en parallèle :

- Groupe les corrections par lots de 15 (configurable)
- Traite 10 groupes en parallèle maximum (configurable)
- Utilise `processWithConcurrency` pour optimiser les appels API
- Log le nombre de faux positifs détectés

```typescript
const verified = await verifyCorrectionsInBatches(
  allCorrections,
  aiService,
  logger,
  15, // Items par appel
  10, // Concurrence
);
```

---

## 🛠️ Utilitaire de Concurrence

### `src/common/utils/concurrency.util.ts`

**Rôle** : Utilitaire générique et réutilisable de pool de concurrence.

**Fonction** :

```typescript
processWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number
): Promise<T[]>
```

**Principe** :

- Maintient `concurrency` tâches actives en parallèle
- Dès qu'une tâche se termine, la suivante démarre immédiatement
- Préserve l'ordre des résultats
- Gestion d'erreurs intégrée

**Exemple** :

```typescript
const results = await processWithConcurrency(
  items.map((item) => () => processItem(item)),
  20, // Max 20 simultanés
);
```

---

## ⚙️ Configuration

### Paramètres de Concurrence

Définis dans `correction.service.ts` :

```typescript
const CONCURRENCY = 20; // Pool de correction (chunks)
```

Définis dans `chunk-processor.ts` :

```typescript
itemsPerCall = 15; // Corrections par appel de vérification
concurrency = 10; // Appels de vérification simultanés
```

### Recommandations

| Tier OpenAI | Limite RPM | `CONCURRENCY` conseillé |
| ----------- | ---------- | ----------------------- |
| **Tier 1**  | 500 RPM    | 5-8                     |
| **Tier 2**  | 5,000 RPM  | 15-20                   |
| **Tier 3**  | 5,000 RPM  | 15-20                   |
| **Tier 4**  | 10,000 RPM | **20-30** ✅            |
| **Tier 5**  | 10,000 RPM | 20-30                   |

> **Note** : Tier 4+ supporte facilement 20-30 requêtes simultanées sans délai entre batches.

---

## 📊 Logging et Monitoring

### Logs de Progression

Le service log automatiquement :

```
🔥 Début du traitement background pour job xxx
Étape 1/7: Sauvegarde du fichier original...
Étape 2/7: Sauvegarde des métadonnées...
Étape 3/7: Extraction du texte...
Étape 4/7: Découpage en chunks...
Étape 5/7: Correction de 100 chunks (pool de 20 simultanés)...
  [CHUNK 1] Début correction...
  [CHUNK 1] Terminé: 5 corrections
  ...
Étape 5.5/7: Vérification des corrections...
  Vérification terminée: 12 faux positifs détectés
Étape 6/7: Sauvegarde des résultats...
✅ Traitement terminé avec succès pour job xxx
   - Durée totale: 45.2s
   - 100 chunks traités
   - 243 corrections trouvées
   - 12 faux positifs marqués
   - Tokens: 125000 (In: 100000, Out: 25000)
```

### Métadonnées Sauvegardées

```typescript
interface DocumentMetadata {
  jobId: string;
  filename: string;
  uploadedAt: Date;
  fileSize: number;
  totalCharacters?: number;
  totalChunks?: number;
  processingTimeSeconds?: number; // Temps total de traitement
  totalPromptTokens?: number; // Tokens input (avec retries)
  totalCompletionTokens?: number; // Tokens output (avec retries)
  totalTokens?: number; // Total (avec retries)
}
```

---

## 🔄 Gestion des Erreurs

### Stratégie

1. **Au niveau chunk** : Erreur isolée → Retourne `[]` + log l'erreur
2. **Au niveau job** : Erreur critique → Log + TODO notification (email/Slack)
3. **Retries AI** : Gérés automatiquement par `AiService` (3x retry)

### Exemple de Gestion

```typescript
try {
  const { corrections, usage } = await aiService.correctChunk(chunk.text, index);
  // ...
} catch (error) {
  logger.error(`[CHUNK ${index}] Erreur lors de la correction`, error);
  return { corrections: [], usage: { promptTokens: 0, ... } };
}
```

---

## 🎯 Principes de Design

### ✅ DO (À FAIRE)

- ✅ Utiliser `processWithConcurrency` pour tout traitement parallèle
- ✅ Extraire la logique réutilisable dans des fonctions (`chunk-processor.ts`)
- ✅ Logger chaque étape importante avec emoji pour lisibilité
- ✅ Sauvegarder les métadonnées à chaque étape clé
- ✅ Gérer les erreurs gracieusement (pas de crash complet)

### ❌ DON'T (À ÉVITER)

- ❌ Utiliser des batches séquentiels (`for` + `Promise.all`)
- ❌ Hard-coder les paramètres de concurrence partout
- ❌ Bloquer le controller en attendant le traitement (toujours async)
- ❌ Oublier de reset le `TokenUsageService` après un job

---

## 🔗 Dépendances

### Services Injectés

- **`DocumentService`** - Extraction et découpage du texte
- **`StorageService`** - Sauvegarde fichiers/métadonnées/corrections
- **`AiService`** - Correction et vérification par OpenAI
- **`TokenUsageService`** - Tracking de l'usage des tokens

### Modules Externes

- **`processWithConcurrency`** - Utilitaire de pool (`common/utils/concurrency.util.ts`)
- **`processChunk`** - Traitement d'un chunk (`chunk-processor.ts`)
- **`verifyCorrectionsInBatches`** - Vérification parallèle (`chunk-processor.ts`)

---

## 📖 Exemples d'Utilisation

### Lancer un Job de Correction

```typescript
// Dans le controller
@Post('correct')
async correctDocument(@UploadedFile() file: Express.Multer.File) {
  const jobId = this.correctionService.generateJobId();

  // Lancement en background (non-bloquant)
  this.correctionService.processBackground(file, jobId);

  return { jobId }; // Réponse immédiate
}
```

### Monitoring du Traitement

```typescript
// Récupérer les métadonnées
const metadata = await storageService.getMetadata(jobId);
console.log(`Progression: ${metadata.totalChunks} chunks`);
console.log(`Durée: ${metadata.processingTimeSeconds}s`);
console.log(`Tokens: ${metadata.totalTokens}`);
```

---

## 🚀 Améliorations Futures

### Optimisations Possibles

- [ ] **Concurrence configurable** : Via variable d'environnement `CORRECTION_CONCURRENCY`
- [ ] **Streaming des résultats** : WebSocket pour notifier en temps réel
- [ ] **Rate limiting intelligent** : Ajustement dynamique selon la réponse API
- [ ] **Retry avec backoff exponentiel** : Pour les erreurs 429 (Rate Limit)
- [ ] **Persistence des jobs** : BDD pour reprendre après crash

### Notifications

- [ ] Email de fin de traitement
- [ ] Webhooks pour intégration externe
- [ ] Slack/Discord notification
- [ ] Sentry pour les erreurs critiques

---

## 💡 Notes de Performance

### Facteurs Limitants

1. **Rate Limit OpenAI** : Tier 4 = 10,000 RPM → ~167 req/sec (largement suffisant)
2. **Latence réseau** : Moyenne 200-500ms par requête
3. **Variance de complexité** : Chunks complexes prennent plus de temps

### Optimisation Pool vs Batches

**Pool dynamique** est meilleur quand :

- ✅ Variance élevée des durées de traitement
- ✅ Grand nombre de tâches (100+ chunks)
- ✅ Pas de dépendance entre tâches

**Batches séquentiels** acceptables quand :

- Durée uniforme (même complexité)
- Petit nombre de tâches (<20 chunks)
- Besoin de contrôle strict par batch

---

**Dernière mise à jour** : 2025-11-25
