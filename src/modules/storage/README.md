# Module Storage

Persistance des résultats de correction dans **Firebase Firestore**.

## Architecture

```
storage/
├── firebase.service.ts   # Init Firebase Admin SDK
└── storage.service.ts    # Sauvegarde vers Firestore
```

## Configuration

Variable d'environnement requise (service account encodé en Base64) :

```bash
# Générer le Base64 depuis votre fichier JSON :
base64 -i your-service-account.json

# Ajouter dans .env ou Railway :
FIREBASE_SERVICE_ACCOUNT_JSON=eyJ0eXBlIjoic2VydmljZV9hY2NvdW50Ii...
```

> ⚠️ Ne jamais commiter le fichier JSON du service account dans le repo.

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
