import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CorrectionModule } from './modules/correction/correction.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Rend ConfigService disponible partout
      envFilePath: '.env',
    }),
    CorrectionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
