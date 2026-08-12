import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import type { Resume } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

export interface ResumeUploadData {
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * ResumeService — metadata-only resume management.
 *
 * Phase 2: The actual file bytes are NOT stored here.
 * The mobile client uploads the file and sends us the resulting metadata
 * (name, size, mimeType, and a fileUrl placeholder).
 * Phase 3 will wire this to S3/Cloudinary with signed URLs.
 */
@Injectable()
export class ResumeService {
  private readonly logger = new Logger(ResumeService.name);

  constructor(private readonly prisma: PrismaService) {}

  async upload(userId: string, data: ResumeUploadData): Promise<Resume> {
    this.validateFile(data.mimeType, data.fileSize);

    // Upsert — replaces existing resume metadata
    const resume = await this.prisma.resume.upsert({
      where: { userId },
      create: {
        userId,
        fileName: data.fileName,
        fileUrl: data.fileUrl,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
      },
      update: {
        fileName: data.fileName,
        fileUrl: data.fileUrl,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        uploadedAt: new Date(),
      },
    });

    this.logger.log(
      { userId, fileName: data.fileName, fileSize: data.fileSize },
      'Resume uploaded',
    );
    return resume;
  }

  async findByUserId(userId: string): Promise<Resume | null> {
    return this.prisma.resume.findUnique({ where: { userId } });
  }

  async delete(userId: string): Promise<void> {
    const existing = await this.prisma.resume.findUnique({ where: { userId } });
    if (!existing) throw new NotFoundException('No resume found to delete');

    await this.prisma.resume.delete({ where: { userId } });
    this.logger.log({ userId }, 'Resume deleted');
  }

  private validateFile(mimeType: string, fileSize: number): void {
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new BadRequestException('Only PDF and DOCX files are allowed');
    }
    if (fileSize > MAX_FILE_SIZE) {
      throw new BadRequestException('File size must not exceed 5 MB');
    }
  }
}
