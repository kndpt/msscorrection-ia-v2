import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiService } from './ai.service';
import { TokenUsageService } from './token-usage.service';
import { AiConfigService } from './config/ai-config.service';
import { OpenAiClientService } from './openai-client.service';
import { CorrectionValidatorService } from './validators/correction-validator.service';

@Module({
  imports: [ConfigModule],
  providers: [
    AiService,
    TokenUsageService,
    AiConfigService,
    OpenAiClientService,
    CorrectionValidatorService,
  ],
  exports: [AiService, TokenUsageService],
})
export class AiModule {}
