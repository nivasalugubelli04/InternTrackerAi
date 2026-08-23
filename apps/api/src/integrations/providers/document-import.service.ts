import { Injectable, Logger } from '@nestjs/common';
import { IntegrationProviderType } from '@prisma/client';
import {
  IntegrationProvider,
  ProviderManifest,
  SyncResult,
  RawExternalItem,
} from '../interfaces/integration-provider.interface';

@Injectable()
export class DocumentImportService implements IntegrationProvider {
  private readonly logger = new Logger(DocumentImportService.name);

  getManifest(): ProviderManifest {
    return {
      provider: IntegrationProviderType.DOCUMENT_IMPORT,
      name: 'Document & Certificate Import',
      category: 'DOCUMENT',
      dataRequested: [
        'User-uploaded Resume/CV content',
        'Course certificates and credentials',
        'Project documentation files',
      ],
      purpose:
        'To extract verified skills, education history, and project evidence without overwriting existing profile data.',
      syncFrequency: 'On document upload',
      permissions: ['read:documents'],
      whatItWillNotDo: [
        'Automatically overwrite existing profile or resume data',
        'Share uploaded documents with unverified third parties',
        'Scan local system files outside explicitly uploaded documents',
      ],
    };
  }

  async authorize(
    userId: string,
    _params: { code?: string; redirectUri?: string; customData?: Record<string, any> },
  ) {
    this.logger.log(`Authorizing Document Import provider for user ${userId}`);

    return {
      accessToken: 'doc_import_internal_token',
      scopes: ['read:documents'],
      profileJson: {
        documentTypesSupported: ['PDF', 'DOCX', 'TXT'],
        connectedAt: new Date().toISOString(),
      },
    };
  }

  async sync(
    userId: string,
    _credentials: { accessToken: string; refreshToken?: string },
    options?: Record<string, any>,
  ): Promise<SyncResult> {
    this.logger.log(`Syncing Document Import data for user ${userId}`);

    const docText = (options?.['documentText'] as string) || 'AWS Certified Solutions Architect & React/Node.js Developer';
    const fileName = (options?.['fileName'] as string) || 'AWS_Certification_2026.pdf';

    const records: RawExternalItem[] = [
      {
        externalId: `doc-${Date.now()}`,
        recordType: 'DOCUMENT_SUMMARY',
        rawJson: {
          fileName,
          textLength: docText.length,
          snippet: docText.substring(0, 100),
        },
        normalizedJson: {
          title: `Imported Document — ${fileName}`,
          documentType: fileName.includes('Cert') ? 'CERTIFICATE' : 'RESUME',
          extractedSkills: ['AWS', 'Solutions Architect', 'React', 'Node.js'],
          summary: docText,
        },
      },
    ];

    return {
      itemsScanned: records.length,
      itemsImported: records.length,
      itemsPendingReview: records.length,
      records,
    };
  }
}
