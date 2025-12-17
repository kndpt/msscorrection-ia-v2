import { Logger } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { Correction } from '../../common/types';
import { processWithConcurrency } from '../../common/utils/concurrency.util';

export interface ChunkData {
  text: string;
  index: number;
  startPosition: number;
}

export interface ChunkResult {
  corrections: Correction[];
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Traite un chunk de texte : correction + nettoyage + ajustement des positions
 */
export async function processChunk(
  chunk: ChunkData,
  aiService: AiService,
  logger: Logger,
): Promise<ChunkResult> {
  const label = `[CHUNK ${chunk.index + 1}]`;
  logger.log(`${label} Début correction...`);

  try {
    const { corrections, usage } = await aiService.correctChunk(
      chunk.text,
      chunk.index + 1,
    );

    const cleanCorrections = corrections.filter(
      (c) => c.original !== c.correction && c.correction?.trim(),
    );

    logger.log(`${label} Terminé: ${cleanCorrections.length} corrections`);

    return {
      corrections: cleanCorrections.map((correction) => ({
        ...correction,
        position: correction.position + chunk.startPosition,
        chunkIndex: chunk.index + 1,
      })),
      usage,
    };
  } catch (error) {
    logger.error(`${label} Erreur lors de la correction`, error);
    return {
      corrections: [],
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    };
  }
}

/**
 * Groupe les corrections par lots et les vérifie en parallèle
 */
export async function verifyCorrectionsInBatches(
  corrections: Correction[],
  aiService: AiService,
  logger: Logger,
  itemsPerCall = 15,
  concurrency = 10,
): Promise<Correction[]> {
  if (corrections.length === 0) return [];

  logger.log(
    `Vérification de ${corrections.length} corrections pour faux positifs...`,
  );

  // Grouper les corrections par lots
  const groups: Correction[][] = [];
  for (let i = 0; i < corrections.length; i += itemsPerCall) {
    groups.push(corrections.slice(i, i + itemsPerCall));
  }

  // Traiter les groupes avec concurrence limitée
  const results = await processWithConcurrency(
    groups.map((group) => () => aiService.verifyCorrections(group)),
    concurrency,
  );

  const verified = results.flat();
  const falsePositivesCount = verified.filter(
    (c: Correction) => c.verified === false,
  ).length;

  logger.log(
    `Vérification terminée: ${falsePositivesCount} faux positifs détectés`,
  );

  return verified;
}
