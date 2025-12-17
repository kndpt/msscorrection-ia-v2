import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiConfig } from './ai-config.interface';

@Injectable()
export class AiConfigService implements AiConfig {
  readonly model: string;
  readonly temperature: number;
  readonly timeoutMs: number;
  readonly maxRetries: number;
  readonly retryDelayMs: number;
  readonly maxCorrectionWords: number;

  constructor(private configService: ConfigService) {
    this.model = this.configService.get('OPENAI_MODEL', 'gpt-4.1');
    this.temperature = parseFloat(
      this.configService.get('OPENAI_TEMPERATURE', '0.1'),
    );
    this.timeoutMs = parseInt(
      this.configService.get('OPENAI_TIMEOUT_MS', '60000'),
    );
    this.maxRetries = parseInt(
      this.configService.get('OPENAI_MAX_RETRIES', '3'),
    );
    this.retryDelayMs = parseInt(
      this.configService.get('OPENAI_RETRY_DELAY_MS', '1000'),
    );
    this.maxCorrectionWords = parseInt(
      this.configService.get('AI_MAX_CORRECTION_WORDS', '18'),
    );
  }
}
