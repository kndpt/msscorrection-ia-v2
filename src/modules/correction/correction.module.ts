import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CorrectionService } from './correction.service';
import { DocumentModule } from '../document/document.module';
import { StorageModule } from '../storage/storage.module';
import { AiModule } from '../ai/ai.module';
import { CorrectionController } from './correction.controller';

@Module({
  imports: [ConfigModule, DocumentModule, StorageModule, AiModule],
  controllers: [CorrectionController],
  providers: [CorrectionService],
})
export class CorrectionModule {}
