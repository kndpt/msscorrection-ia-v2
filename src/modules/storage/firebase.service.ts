import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    if (admin.apps.length) return;

    const serviceAccountBase64 = this.configService.get<string>(
      'FIREBASE_SERVICE_ACCOUNT_JSON',
    );

    if (!serviceAccountBase64) {
      return this.logger.warn('FIREBASE_SERVICE_ACCOUNT_JSON non configuré');
    }

    try {
      const serviceAccount = JSON.parse(
        Buffer.from(serviceAccountBase64, 'base64').toString('utf-8'),
      );
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      this.logger.log('Firebase Admin initialisé');
    } catch (error) {
      this.logger.error(
        'Erreur lors du parsing du service account Firebase',
        error,
      );
    }
  }

  get firestore() {
    return admin.firestore();
  }
}
