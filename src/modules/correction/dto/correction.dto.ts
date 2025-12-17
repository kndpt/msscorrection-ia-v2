export class StartCorrectionDto {
  file: Express.Multer.File;
}

export class CorrectionStatusDto {
  jobId: string;
  status: 'started' | 'processing' | 'completed' | 'error';
  message: string;
}
