import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { FirebaseService } from './firebase.service';

@Module({
  providers: [StorageService, FirebaseService],
  exports: [StorageService, FirebaseService],
})
export class StorageModule {}
