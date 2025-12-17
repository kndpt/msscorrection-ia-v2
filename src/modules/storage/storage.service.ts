import { Injectable, Logger } from '@nestjs/common';
import { DocumentMetadata, Correction } from '../../common/types';
import { FirebaseService } from './firebase.service';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(private firebaseService: FirebaseService) {}

  /**
   * Sauvegarde le résultat complet dans Firestore
   */
  async saveCorrections(
    jobId: string,
    corrections: Correction[],
    metadata: DocumentMetadata,
  ): Promise<void> {
    try {
      await this.firebaseService.firestore
        .collection('ai-documents-v2')
        .doc(jobId)
        .set({
          ...metadata,
          corrections,
          uploadedAt: metadata.uploadedAt?.toISOString() || new Date().toISOString(),
        });
      this.logger.log(`Firestore: document ${jobId} sauvegardé dans ai-documents-v2`);
    } catch (error) {
      this.logger.error(`Erreur Firestore: ${error}`);
    }
  }

  // On garde ces méthodes vides ou minimales pour ne pas casser CorrectionService
  // mais on supprime toute la logique filesystem.
  async saveOriginalFile(): Promise<void> {}
  async saveMetadata(): Promise<void> {}
}
