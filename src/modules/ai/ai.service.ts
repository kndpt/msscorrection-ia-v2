import { Injectable, Logger } from '@nestjs/common';
import { Correction, CorrectionResponse } from '../../common/types';
import { AiConfigService } from './config/ai-config.service';
import { OpenAiClientService } from './openai-client.service';
import { CorrectionValidatorService } from './validators/correction-validator.service';
import { withRetry } from './utils/retry.util';
import {
  buildCorrectionSystemPrompt,
  getCorrectionFewShotExample,
} from './prompts/correction-prompts';
import { buildVerificationSystemPrompt } from './prompts/verification-prompts';

interface CorrectChunkResponse {
  corrections: Correction[];
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private aiConfig: AiConfigService,
    private openaiClient: OpenAiClientService,
    private validator: CorrectionValidatorService,
  ) {}

  async correctChunk(
    text: string,
    chunkIndex: number,
    styleGuide?: string,
  ): Promise<CorrectionResponse> {
    const prefix = `[CHUNK ${chunkIndex}]`;
    this.logger.log(
      `${prefix} Correction d'un chunk de ${text.length} caractères...`,
    );

    const startTime = Date.now();
    const fewShot = getCorrectionFewShotExample();
    let retryFeedback: string | undefined;

    try {
      const { usage, response } = await withRetry(
        async () => {
          const systemPrompt = buildCorrectionSystemPrompt(
            styleGuide,
            retryFeedback,
          );

          const result = await this.openaiClient.createCompletion(
            [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: fewShot.user },
              { role: 'assistant', content: fewShot.assistant },
              { role: 'user', content: text },
            ],
            { responseFormat: 'json_object' },
          );

          const content = result.completion.choices[0]?.message?.content;
          if (!content) {
            throw new Error('Aucune réponse de OpenAI');
          }

          const response: CorrectChunkResponse = JSON.parse(content);

          if (this.validator.hasLongCorrections(response.corrections)) {
            retryFeedback = `ATTENTION: Une précédente réponse a été rejetée car certaines corrections dépassaient la limite de ${this.aiConfig.maxCorrectionWords} mots.
RAPPEL IMPÉRATIF: Chaque correction doit faire STRICTEMENT entre 3 et 6 mots. C'est une contrainte technique bloquante.`;
            throw new Error(
              `Correction trop longue (>${this.aiConfig.maxCorrectionWords} mots) détectée`,
            );
          }

          return {
            completion: result.completion,
            usage: result.usage,
            response,
          };
        },
        {
          maxRetries: this.aiConfig.maxRetries,
          delayMs: this.aiConfig.retryDelayMs,
          timeoutMs: this.aiConfig.timeoutMs,
          onRetry: (attempt, error) =>
            this.logger.warn(
              `${prefix} Tentative ${attempt}/${this.aiConfig.maxRetries} échouée (${error.message}), nouvel essai...`,
            ),
        },
      );

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      this.logger.log(
        `${prefix} ${response.corrections.length} corrections trouvées (${duration}s) - Tokens: ${usage.totalTokens} (In: ${usage.promptTokens}, Out: ${usage.completionTokens})`,
      );

      return { corrections: response.corrections, usage };
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      this.logger.error(
        `${prefix} Échec après ${this.aiConfig.maxRetries} tentatives (${duration}s)`,
        error,
      );
      return {
        corrections: [],
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      };
    }
  }

  async verifyCorrections(corrections: Correction[]): Promise<Correction[]> {
    if (corrections.length === 0) return [];

    const chunkIndices = Array.from(
      new Set(
        corrections.map((c) => c.chunkIndex).filter((i) => i !== undefined),
      ),
    ).sort((a, b) => a - b);
    const chunkLabel =
      chunkIndices.length > 0 ? `[CHUNKS ${chunkIndices.join(', ')}]` : '';

    this.logger.log(
      `${chunkLabel} Vérification de ${corrections.length} corrections pour faux positifs...`,
    );

    const correctionsToVerify = corrections.map((c, idx) => ({
      id: idx,
      original: c.original,
      correction: c.correction,
      type: c.type,
      explication: c.explication,
    }));

    const startTime = Date.now();

    try {
      const { completion, usage } = await withRetry(
        () =>
          this.openaiClient.createCompletion(
            [
              { role: 'system', content: buildVerificationSystemPrompt() },
              {
                role: 'user',
                content: JSON.stringify({ corrections: correctionsToVerify }),
              },
            ],
            { responseFormat: 'json_object' },
          ),
        {
          maxRetries: this.aiConfig.maxRetries,
          delayMs: this.aiConfig.retryDelayMs,
          onRetry: (attempt) =>
            this.logger.warn(
              `Tentative vérification ${attempt}/${this.aiConfig.maxRetries} échouée, nouvel essai...`,
            ),
        },
      );

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        this.logger.warn(
          'Aucune réponse de vérification, marque tout comme vérifié',
        );
        return corrections.map((c) => ({ ...c, verified: true }));
      }

      const response = JSON.parse(content) as {
        results: Array<{ id: number; valid: boolean; reason?: string }>;
      };

      const verifiedCorrections = corrections.map((correction, idx) => {
        const verification = response.results.find((r) => r.id === idx);
        return {
          ...correction,
          verified: verification?.valid ?? true,
        };
      });

      const falsePositives = verifiedCorrections.filter(
        (c) => !c.verified,
      ).length;
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      this.logger.log(
        `Vérification terminée: ${falsePositives} faux positifs détectés (${duration}s) - Tokens: ${usage.totalTokens}`,
      );

      return verifiedCorrections;
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      this.logger.error(
        `Erreur lors de la vérification des corrections après ${this.aiConfig.maxRetries} tentatives (${duration}s)`,
        error,
      );
      return corrections.map((c) => ({ ...c, verified: true }));
    }
  }
}
