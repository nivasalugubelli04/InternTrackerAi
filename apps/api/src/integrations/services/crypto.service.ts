import { Injectable, Logger } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

@Injectable()
export class CryptoService {
  private readonly logger = new Logger(CryptoService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor() {
    const masterSecret =
      process.env['ENCRYPTION_SECRET'] ||
      process.env['JWT_SECRET'] ||
      'intern-tracker-ai-phase-44-master-secret-key-32b';

    // Derive a consistent 32-byte (256-bit) key using scrypt
    this.key = scryptSync(masterSecret, 'salt-intern-tracker-phase-44', 32);
  }

  /**
   * Encrypts plaintext into a formatted string: "iv:authTag:encryptedData"
   */
  encrypt(plaintext: string): string {
    if (!plaintext) return '';
    try {
      const iv = randomBytes(16);
      const cipher = createCipheriv(this.algorithm, this.key, iv);

      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag().toString('hex');
      return `${iv.toString('hex')}:${authTag}:${encrypted}`;
    } catch (err: any) {
      this.logger.error(`Encryption failed: ${err.message}`, err.stack);
      throw new Error('Failed to encrypt sensitive data.');
    }
  }

  /**
   * Decrypts formatted string "iv:authTag:encryptedData" back to plaintext.
   */
  decrypt(cipherText: string): string {
    if (!cipherText) return '';
    try {
      const parts = cipherText.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid cipher text format');
      }

      const [ivHex, authTagHex, encryptedHex] = parts;
      const iv = Buffer.from(ivHex!, 'hex');
      const authTag = Buffer.from(authTagHex!, 'hex');

      const decipher = createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encryptedHex!, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (err: any) {
      this.logger.error(`Decryption failed: ${err.message}`, err.stack);
      throw new Error('Failed to decrypt sensitive credential.');
    }
  }
}
