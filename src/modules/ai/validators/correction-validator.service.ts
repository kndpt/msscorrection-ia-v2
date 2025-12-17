import { Injectable } from '@nestjs/common';
import { Correction } from '../../../common/types';
import { AiConfigService } from '../config/ai-config.service';

@Injectable()
export class CorrectionValidatorService {
  constructor(private aiConfig: AiConfigService) {}

  hasLongCorrections(corrections: Correction[]): boolean {
    return corrections.some(
      (c) => c.correction.split(' ').length > this.aiConfig.maxCorrectionWords,
    );
  }
}
