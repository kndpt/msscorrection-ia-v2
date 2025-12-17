export interface TextChunk {
  index: number;
  text: string;
  startPosition: number;
  endPosition: number;
}

export interface Correction {
  position: number;
  original: string;
  correction: string;
  type: 'orthographe' | 'grammaire' | 'ponctuation' | 'syntaxe';
  explication: string;
  verified?: boolean; // true = vraie correction, false = faux positif, undefined = non vérifié
  chunkIndex?: number;
}

export interface CorrectionResult {
  jobId: string;
  status: 'started' | 'processing' | 'completed' | 'error';
  totalChunks?: number;
  processedChunks?: number;
  corrections?: Correction[];
  error?: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface CorrectionResponse {
  corrections: Correction[];
  usage: TokenUsage;
}

export interface DocumentMetadata {
  jobId: string;
  filename: string;
  uploadedAt: Date;
  fileSize: number;
  totalCharacters?: number;
  totalChunks?: number;
  totalPromptTokens?: number;
  totalCompletionTokens?: number;
  totalTokens?: number;
  processingTimeSeconds?: number;
}
