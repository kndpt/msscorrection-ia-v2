import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { join } from 'path';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    if (admin.apps.length) return;

    const serviceAccountPath = this.configService.get<string>(
      'FIREBASE_SERVICE_ACCOUNT_PATH',
    );

    if (!serviceAccountPath) {
      return this.logger.warn('FIREBASE_SERVICE_ACCOUNT_PATH non configuré');
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const serviceAccount = require(join(process.cwd(), serviceAccountPath));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    this.logger.log('Firebase Admin initialisé');
  }

  get firestore() {
    return admin.firestore();
  }
}

