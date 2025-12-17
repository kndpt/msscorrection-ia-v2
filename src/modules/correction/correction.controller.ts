import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CorrectionStatusDto } from './dto/correction.dto';
import { CorrectionService } from './correction.service';

@Controller('correction')
export class CorrectionController {
  constructor(private readonly correctionService: CorrectionService) {}

  /**
   * Endpoint POST /correction/start
   * Reçoit un fichier DOCX et lance la correction en background
   * IMPORTANT: Fire & Forget - pas de 'await' sur processBackground
   */
  @Post('start')
  @HttpCode(HttpStatus.ACCEPTED) // 202 Accepted
  @UseInterceptors(FileInterceptor('file'))
  async startCorrection(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<CorrectionStatusDto> {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    if (
      file.mimetype !==
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      throw new BadRequestException('Le fichier doit être au format DOCX');
    }

    // Génération du jobId
    const jobId = this.correctionService.generateJobId();

    // FIRE & FORGET - Pas de 'await' ici !
    // Le client reçoit immédiatement une réponse 202 Accepted
    this.correctionService
      .processBackground(file, jobId)
      .catch((err: Error) => {
        console.error('CRITICAL BACKGROUND ERROR:', err);
      });

    return {
      jobId,
      status: 'started',
      message:
        'Le serveur travaille sur votre manuscrit. La correction peut prendre plusieurs heures.',
    };
  }
}
