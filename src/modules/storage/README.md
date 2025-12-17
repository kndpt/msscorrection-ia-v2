# Module Storage

Persistance des résultats de correction dans **Firebase Firestore**.

## Architecture

```
storage/
├── firebase.service.ts   # Init Firebase Admin SDK
└── storage.service.ts    # Sauvegarde vers Firestore
```

## Configuration

Variable d'environnement requise :

```bash
FIREBASE_SERVICE_ACCOUNT_PATH=./src/modules/storage/config/your-service-account.json
```

## Utilisation

```typescript
await storageService.saveCorrections(jobId, corrections, metadata);
```

→ Crée un document dans la collection `ai-documents-v2` avec l'ID `jobId`.

## Structure du Document

```json
{
  "filename": "roman.docx",
  "uploadedAt": "2025-12-17T...",
  "fileSize": 123456,
  "totalChunks": 25,
  "totalTokens": 125000,
  "processingTimeSeconds": 45.2,
  "corrections": [...]
}
```
