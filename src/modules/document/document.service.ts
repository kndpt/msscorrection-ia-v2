import { Injectable, Logger } from '@nestjs/common';
import * as mammoth from 'mammoth';
import { TextChunk } from '../../common/types';

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);
  private readonly MAX_TOKENS_PER_CHUNK = 1000; // 800-1200 tokens recommandés (milieu de plage)
  private readonly CHARS_PER_TOKEN = 4; // Estimation moyenne
  private readonly OVERLAP_SENTENCES = 3; // ~50-100 tokens d'overlap

  /**
   * Extrait le texte d'un fichier DOCX
   */
  async extractText(buffer: Buffer): Promise<string> {
    this.logger.log('Extraction du texte depuis le fichier DOCX...');

    try {
      const result = await mammoth.extractRawText({ buffer });

      if (result.messages.length > 0) {
        this.logger.warn('Messages mammoth:', result.messages);
      }

      this.logger.log(`Texte extrait: ${result.value.length} caractères`);
      return result.value;
    } catch (error) {
      this.logger.error("Erreur lors de l'extraction du texte", error);
      throw new Error("Impossible d'extraire le texte du fichier DOCX");
    }
  }

  /**
   * Découpe le texte en chunks optimisés pour l'API OpenAI
   * Stratégie: 1000 tokens (~750 mots) + overlap 50-100 tokens
   * Évite: Output limit, laziness LLM, dégradation attention
   */
  splitIntoChunks(text: string): TextChunk[] {
    this.logger.log('Découpage du texte en chunks...');

    const maxCharsPerChunk = this.MAX_TOKENS_PER_CHUNK * this.CHARS_PER_TOKEN;
    const paragraphs = text.split(/\n\n+/); // Découpe sur les doubles sauts de ligne

    const chunks: TextChunk[] = [];
    let currentChunk = '';
    let currentPosition = 0;
    let chunkIndex = 0;
    let previousOverlap = ''; // Pour stocker les 3 dernières phrases du chunk précédent

    for (const paragraph of paragraphs) {
      // Si ajouter ce paragraphe dépasse la limite
      if (
        currentChunk.length + paragraph.length > maxCharsPerChunk &&
        currentChunk.length > 0
      ) {
        // Sauvegarder le chunk actuel
        chunks.push({
          index: chunkIndex,
          text: currentChunk.trim(),
          startPosition: currentPosition,
          endPosition: currentPosition + currentChunk.length,
        });

        // Extraire les dernières phrases pour l'overlap (~50-100 tokens)
        previousOverlap = this.extractLastSentences(
          currentChunk,
          this.OVERLAP_SENTENCES,
        );

        chunkIndex++;
        currentPosition += currentChunk.length;

        // Commencer le nouveau chunk avec l'overlap du précédent
        currentChunk = previousOverlap;
      }

      // Ajouter le paragraphe au chunk actuel
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }

    // Ajouter le dernier chunk
    if (currentChunk.length > 0) {
      chunks.push({
        index: chunkIndex,
        text: currentChunk.trim(),
        startPosition: currentPosition,
        endPosition: currentPosition + currentChunk.length,
      });
    }

    this.logger.log(`Texte découpé en ${chunks.length} chunks (avec overlap)`);
    return chunks;
  }

  /**
   * Extrait les N dernières phrases d'un texte pour l'overlap
   */
  private extractLastSentences(text: string, count: number): string {
    // Découpe sur les points, points d'interrogation, exclamation
    const sentences = text.split(/[.!?]+\s+/);

    if (sentences.length <= count) {
      return text; // Retourne tout si moins de N phrases
    }

    // Prendre les N dernières phrases
    const lastSentences = sentences.slice(-count).join('. ');
    return lastSentences + (text.endsWith('.') ? '.' : '');
  }

  /**
   * Estime le nombre de tokens dans un texte
   */
  estimateTokens(text: string): number {
    return Math.ceil(text.length / this.CHARS_PER_TOKEN);
  }
}
