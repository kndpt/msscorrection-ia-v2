import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { AiConfigService } from './config/ai-config.service';
import { TokenUsageService } from './token-usage.service';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  temperature?: number;
  responseFormat?: 'json_object' | 'text';
}

@Injectable()
export class OpenAiClientService {
  private readonly logger = new Logger(OpenAiClientService.name);
  private readonly client: OpenAI;

  constructor(
    private configService: ConfigService,
    private aiConfig: AiConfigService,
    private tokenUsage: TokenUsageService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY must be defined in environment');
    }
    this.client = new OpenAI({ apiKey });
  }

  async createCompletion(
    messages: ChatMessage[],
    options: ChatCompletionOptions = {},
  ) {
    const completion = await this.client.chat.completions.create({
      model: this.aiConfig.model,
      messages,
      temperature: options.temperature ?? this.aiConfig.temperature,
      ...(options.responseFormat && {
        response_format: { type: options.responseFormat },
      }),
    });

    const usage = {
      promptTokens: completion.usage?.prompt_tokens || 0,
      completionTokens: completion.usage?.completion_tokens || 0,
      totalTokens: completion.usage?.total_tokens || 0,
    };

    this.tokenUsage.addUsage(usage);
    return { completion, usage };
  }
}
