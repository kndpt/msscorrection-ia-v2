import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { DocumentService } from '../document/document.service';
import { StorageService } from '../storage/storage.service';
import { AiService } from '../ai/ai.service';
import { TokenUsageService } from '../ai/token-usage.service';
import { DocumentMetadata } from '../../common/types';
import { processWithConcurrency } from '../../common/utils/concurrency.util';
import { processChunk, verifyCorrectionsInBatches } from './chunk-processor';

@Injectable()
export class CorrectionService {
  private readonly logger = new Logger(CorrectionService.name);

  constructor(
    private documentService: DocumentService,
    private storageService: StorageService,
    private aiService: AiService,
    private tokenUsageService: TokenUsageService,
  ) {}

  /**
   * Génère un ID unique pour le job
   */
  generateJobId(): string {
    return uuidv4();
  }

  /**
   * Processus de correction complet en background
   * Cette méthode est appelée SANS await dans le controller
   * Elle tourne en arrière-plan et ne bloque pas la réponse HTTP
   */
  async processBackground(
    file: Express.Multer.File,
    jobId: string,
  ): Promise<void> {
    this.logger.log(`🔥 Début du traitement background pour job ${jobId}`);
    const startTime = Date.now();

    try {
      // 1. Métadonnées initiales
      const metadata: DocumentMetadata = {
        jobId,
        filename: file.originalname,
        uploadedAt: new Date(),
        fileSize: file.size,
      };

      // 2. Extraire le texte du DOCX
      this.logger.log('Étape 1/4: Extraction du texte...');
      const text = await this.documentService.extractText(file.buffer);
      metadata.totalCharacters = text.length;

      // 3. Découper le texte en chunks
      this.logger.log('Étape 2/4: Découpage en chunks...');
      const chunks = this.documentService.splitIntoChunks(text);
      metadata.totalChunks = chunks.length;

      // 4. Correction parallélisée (pool de 20)
      this.logger.log(`Étape 3/4: Correction de ${chunks.length} chunks...`);
      const results = await processWithConcurrency(
        chunks.map((chunk) => () => processChunk(chunk, this.aiService, this.logger)),
        20,
      );

      const allCorrections = results.flatMap((r) => r.corrections);
      const verifiedCorrections = await verifyCorrectionsInBatches(
        allCorrections,
        this.aiService,
        this.logger,
      );

      // 5. Sauvegarder les résultats complets
      this.logger.log('Étape 4/4: Sauvegarde Firestore...');
      metadata.processingTimeSeconds = parseFloat(((Date.now() - startTime) / 1000).toFixed(1));

      const { promptTokens, completionTokens, totalTokens } = this.tokenUsageService.getTotalUsage();
      metadata.totalPromptTokens = promptTokens;
      metadata.totalCompletionTokens = completionTokens;
      metadata.totalTokens = totalTokens;

      await this.storageService.saveCorrections(jobId, verifiedCorrections, metadata);



      // 7. TODO: Notification de fin (à implémenter plus tard)
      this.logger.log(`✅ Traitement terminé avec succès pour job ${jobId}`);
      this.logger.log(`   - Durée totale: ${metadata.processingTimeSeconds}s`);
      this.logger.log(`   - ${chunks.length} chunks traités`);
      this.logger.log(
        `   - ${verifiedCorrections.length} corrections trouvées`,
      );
      this.logger.log(
        `   - ${verifiedCorrections.filter((c) => c.verified === false).length} faux positifs marqués`,
      );
      this.logger.log(
        `   - Tokens: ${metadata.totalTokens} (In: ${metadata.totalPromptTokens}, Out: ${metadata.totalCompletionTokens})`,
      );

      // Reset du compteur pour le prochain job (si singleton global)
      // Idéalement on gérerait par scope, mais ici reset est safe car séquentiel par job ou via new instance
      this.tokenUsageService.reset();
    } catch (error) {
      // Gestion des erreurs critiques
      this.logger.error(
        `❌ Échec du traitement background pour job ${jobId}`,
        error,
      );

      // TODO: Envoyer une notification d'erreur (email, Slack, Sentry, etc.)
      // Pour l'instant, on se contente de logger
    }
  }
}
