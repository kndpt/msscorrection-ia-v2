# Module AI - Documentation

## 📋 Vue d'ensemble

Ce module gère toutes les interactions avec OpenAI pour la correction de texte littéraire. Il est conçu selon les principes SOLID avec une séparation claire des responsabilités.

**Fonctionnalités principales** :

- Correction de chunks de texte via GPT-4
- Vérification des corrections pour détecter les faux positifs
- Tracking de l'usage des tokens
- Gestion automatique des retries et timeouts
- Configuration centralisée via variables d'environnement

---

## 🗂️ Structure du Module

```
src/modules/ai/
├── config/                         # Configuration centralisée
│   ├── ai-config.interface.ts      # Interface de configuration
│   └── ai-config.service.ts        # Service de configuration
├── prompts/                        # Prompts externalisés
│   ├── correction-prompts.ts       # Prompts pour la correction
│   └── verification-prompts.ts     # Prompts pour la vérification
├── utils/                          # Utilitaires réutilisables
│   └── retry.util.ts               # Logique de retry générique
├── validators/                     # Validation métier
│   └── correction-validator.service.ts  # Validation des corrections
├── ai.module.ts                    # Module NestJS
├── ai.service.ts                   # Service principal (orchestrateur)
├── openai-client.service.ts        # Wrapper OpenAI
├── token-usage.service.ts          # Tracking des tokens
└── README.md                       # Cette documentation
```

---

## 📁 Description des Fichiers

### 🎯 Service Principal

#### `ai.service.ts`

**Rôle** : Orchestrateur de haut niveau qui coordonne les autres services.

**Responsabilités** :

- Exposer les méthodes publiques `correctChunk()` et `verifyCorrections()`
- Orchestrer les appels aux services spécialisés
- Gérer le logging et les erreurs de haut niveau
- **Ne contient AUCUNE logique impérative** (retry, validation, prompts)

**Dépendances injectées** :

- `AiConfigService` - Configuration
- `OpenAiClientService` - Appels OpenAI
- `CorrectionValidatorService` - Validation

**Quand modifier** :

- Ajouter une nouvelle méthode publique (ex: `summarizeText()`)
- Changer le flow d'orchestration global
- Ajouter du logging/monitoring spécifique

---

### ⚙️ Configuration

#### `config/ai-config.service.ts`

**Rôle** : Centralise TOUS les paramètres configurables du module.

**Paramètres gérés** :

```typescript
{
  model: string; // Modèle OpenAI (défaut: 'gpt-4.1')
  temperature: number; // Température (défaut: 0.1)
  timeoutMs: number; // Timeout des appels (défaut: 60000)
  maxRetries: number; // Nombre de tentatives (défaut: 3)
  retryDelayMs: number; // Délai entre retries (défaut: 1000)
  maxCorrectionWords: number; // Limite de mots (défaut: 18)
}
```

**Variables d'environnement** :

- `OPENAI_MODEL`
- `OPENAI_TEMPERATURE`
- `OPENAI_TIMEOUT_MS`
- `OPENAI_MAX_RETRIES`
- `OPENAI_RETRY_DELAY_MS`
- `AI_MAX_CORRECTION_WORDS`

**Quand modifier** :

- ✅ Ajouter un nouveau paramètre configurable
- ✅ Changer les valeurs par défaut
- ❌ Ne JAMAIS mettre de logique métier ici

#### `config/ai-config.interface.ts`

**Rôle** : Définit le contrat de configuration.

**Quand modifier** :

- Ajouter une propriété de configuration
- Toujours en sync avec `ai-config.service.ts`

---

### 🤖 Wrapper OpenAI

#### `openai-client.service.ts`

**Rôle** : Encapsule TOUS les appels à l'API OpenAI.

**Responsabilités** :

- Initialiser le client OpenAI
- Exposer `createCompletion()` avec interface simplifiée
- Appliquer automatiquement la configuration (modèle, température)
- Logger automatiquement l'usage des tokens via `TokenUsageService`

**Quand modifier** :

- ✅ Ajouter un nouveau type d'appel OpenAI (embeddings, etc.)
- ✅ Changer le format des messages/options
- ✅ Ajouter du retry au niveau HTTP
- ❌ Ne PAS mettre de logique métier (prompts, validation)

**Exemple** :

```typescript
const { completion, usage } = await this.openaiClient.createCompletion(
  [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ],
  { responseFormat: 'json_object' },
);
```

---

### 📝 Prompts Externalisés

#### `prompts/correction-prompts.ts`

**Rôle** : Contient TOUS les prompts pour la correction de texte.

**Fonctions exportées** :

- `buildCorrectionSystemPrompt(styleGuide?: string)` - Construit le prompt système
- `getCorrectionFewShotExample()` - Retourne l'exemple few-shot

**Quand modifier** :

- ✅ Améliorer les prompts de correction
- ✅ Ajouter des règles de correction
- ✅ Modifier l'exemple few-shot
- ✅ Changer le format JSON de sortie

**Avantages** :

- Modification des prompts SANS toucher au code métier
- Testable indépendamment
- Facile à versioner/A/B tester

#### `prompts/verification-prompts.ts`

**Rôle** : Contient les prompts pour la vérification des faux positifs.

**Fonctions exportées** :

- `buildVerificationSystemPrompt()` - Prompt de vérification

**Quand modifier** :

- ✅ Améliorer la détection de faux positifs
- ✅ Ajouter des critères de validation

---

### ✅ Validation

#### `validators/correction-validator.service.ts`

**Rôle** : Valide la qualité des corrections retournées par OpenAI.

**Méthodes** :

- `hasLongCorrections(corrections)` - Vérifie qu'aucune correction ne dépasse la limite de mots

**Quand modifier** :

- ✅ Ajouter de nouvelles règles de validation
- ✅ Exemples : détecter corrections vides, duplicatas, etc.

**Exemple d'extension** :

```typescript
hasDuplicates(corrections: Correction[]): boolean {
  const seen = new Set();
  return corrections.some(c => {
    const key = `${c.original}-${c.correction}`;
    if (seen.has(key)) return true;
    seen.add(key);
    return false;
  });
}
```

---

### 🔄 Utilitaires

#### `utils/retry.util.ts`

**Rôle** : Logique de retry GÉNÉRIQUE et réutilisable.

**Fonction exportée** :

```typescript
withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions
): Promise<T>
```

**Options** :

- `maxRetries` - Nombre de tentatives
- `delayMs` - Délai entre tentatives
- `timeoutMs` - Timeout optionnel
- `onRetry` - Callback appelé à chaque retry

**Quand modifier** :

- ✅ Ajouter un backoff exponentiel
- ✅ Ajouter des filtres d'erreurs (retry only on specific errors)
- ✅ Réutiliser dans d'autres modules (totalement découplé de l'AI)

**Exemple d'utilisation** :

```typescript
const result = await withRetry(() => this.someApiCall(), {
  maxRetries: 3,
  delayMs: 1000,
  timeoutMs: 5000,
  onRetry: (attempt) => console.log(`Retry ${attempt}`),
});
```

---

### 📊 Tracking

#### `token-usage.service.ts`

**Rôle** : Service de tracking de l'utilisation des tokens OpenAI.

**Méthodes** :

- `addUsage(usage)` - Enregistre l'usage d'un appel
- `getTotal()` - Retourne le total cumulé

**Quand modifier** :

- ✅ Ajouter des statistiques (coût estimé, etc.)
- ✅ Persister les données (BDD, logs, etc.)

---

### 🔧 Module NestJS

#### `ai.module.ts`

**Rôle** : Configure le module NestJS et enregistre tous les providers.

**Providers enregistrés** :

- `AiService`
- `TokenUsageService`
- `AiConfigService`
- `OpenAiClientService`
- `CorrectionValidatorService`

**Exports** :

- `AiService` - Service principal utilisé par d'autres modules
- `TokenUsageService` - Accessible pour monitoring

**Quand modifier** :

- ✅ Ajouter un nouveau service au module
- ✅ Exporter un service pour d'autres modules

---

## 🛠️ Guide de Modification

### ✏️ Modifier les prompts de correction

**Fichier** : `prompts/correction-prompts.ts`

```typescript
export function buildCorrectionSystemPrompt(styleGuide?: string): string {
  let prompt = `Éditeur littéraire expert...`;

  // Ajouter une nouvelle règle
  prompt += `\n7. Nouvelle règle ici`;

  return prompt;
}
```

### 🔧 Ajouter un paramètre configurable

**1. Interface** (`config/ai-config.interface.ts`) :

```typescript
export interface AiConfig {
  // ... existant
  newParameter: number;
}
```

**2. Service** (`config/ai-config.service.ts`) :

```typescript
constructor(private configService: ConfigService) {
  // ... existant
  this.newParameter = parseInt(
    this.configService.get('AI_NEW_PARAMETER', '42'),
  );
}
```

**3. Variable d'env** (`.env`) :

```bash
AI_NEW_PARAMETER=42
```

### 📦 Ajouter une nouvelle méthode publique

**Fichier** : `ai.service.ts`

```typescript
async newAiFeature(input: string): Promise<Result> {
  // Utiliser les services injectés
  const config = this.aiConfig.someParam;

  const { completion } = await withRetry(
    () => this.openaiClient.createCompletion([...]),
    {
      maxRetries: this.aiConfig.maxRetries,
      delayMs: this.aiConfig.retryDelayMs,
    }
  );

  return result;
}
```

### ✅ Ajouter une validation

**Fichier** : `validators/correction-validator.service.ts`

```typescript
validateSomething(corrections: Correction[]): boolean {
  return corrections.every(c => {
    // Votre logique de validation
    return c.original !== c.correction;
  });
}
```

---

## 🌍 Variables d'Environnement

### Configuration de base

```bash
# OBLIGATOIRE
OPENAI_API_KEY=sk-...

# OPTIONNEL (valeurs par défaut indiquées)
OPENAI_MODEL=gpt-4.1              # Modèle OpenAI
OPENAI_TEMPERATURE=0.1            # Température (0-1)
OPENAI_TIMEOUT_MS=60000           # Timeout en ms
OPENAI_MAX_RETRIES=3              # Nombre de retries
OPENAI_RETRY_DELAY_MS=1000        # Délai entre retries
AI_MAX_CORRECTION_WORDS=18        # Limite de mots par correction
```

---

## 📖 Exemples d'Utilisation

### Injection dans un autre module

```typescript
import { AiService } from './modules/ai/ai.service';

@Injectable()
export class MyService {
  constructor(private aiService: AiService) {}

  async processText(text: string) {
    const result = await this.aiService.correctChunk(text, 0, 'Style moderne');

    console.log(`${result.corrections.length} corrections`);
    console.log(`Tokens utilisés: ${result.usage.totalTokens}`);
  }
}
```

### Vérification avec détection de faux positifs

```typescript
async processWithVerification(text: string) {
  // 1. Correction
  const { corrections } = await this.aiService.correctChunk(text, 0);

  // 2. Vérification
  const verified = await this.aiService.verifyCorrections(corrections);

  // 3. Filtrer les vrais positifs
  const validCorrections = verified.filter(c => c.verified === true);

  console.log(`${validCorrections.length}/${corrections.length} corrections validées`);
}
```

---

## 🎯 Principes de Design

### ✅ DO (À FAIRE)

- ✅ Séparer les responsabilités (1 fichier = 1 rôle)
- ✅ Utiliser l'injection de dépendances
- ✅ Externaliser les prompts et la configuration
- ✅ Créer des utilitaires réutilisables
- ✅ Logger les informations importantes
- ✅ Gérer les erreurs gracefully (pas de throw si possible)

### ❌ DON'T (À ÉVITER)

- ❌ Mettre de la logique métier dans `ai.service.ts` (orchestrateur seulement)
- ❌ Hard-coder des valeurs (utiliser `AiConfigService`)
- ❌ Dupliquer la logique de retry (utiliser `withRetry()`)
- ❌ Mettre des prompts dans le code TypeScript (utiliser `prompts/`)
- ❌ Accéder directement au client OpenAI (utiliser `OpenAiClientService`)

---

## 🚀 Optimisation de Performance

Ce module AI est conçu pour être utilisé efficacement dans des contextes de **haute concurrence**.

### Traitement Parallélisé

Le **Module Correction** (`src/modules/correction/`) utilise une **pool de concurrence dynamique** pour optimiser le traitement de gros documents :

- ✅ **20 requêtes simultanées** maximum (configurable)
- ✅ **Réutilisation immédiate** des slots dès qu'une requête se termine
- ✅ **Gain de performance** : 20-40% sur gros documents vs batches séquentiels

📖 **Voir** : [Module Correction - Documentation](../correction/README.md) pour plus de détails sur l'architecture de concurrence.

### Recommandations

| Tier OpenAI | RPM Limit | Concurrence conseillée |
| ----------- | --------- | ---------------------- |
| Tier 1-3    | 500-5,000 | 5-15                   |
| **Tier 4+** | 10,000+   | **20-30** ✅           |

---
