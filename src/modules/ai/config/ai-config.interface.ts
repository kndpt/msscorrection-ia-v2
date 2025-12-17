export interface AiConfig {
  model: string;
  temperature: number;
  timeoutMs: number;
  maxRetries: number;
  retryDelayMs: number;
  maxCorrectionWords: number;
}
