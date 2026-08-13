import { Injectable, NotFoundException } from '@nestjs/common';
import PDFDocument = require('pdfkit');

import { AiService } from '../ai/services/ai.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ResumeBuilderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  async generateTailoredBulletPoints(userId: string, jobId: string, _experienceId: string) {
    const job = await this.prisma.jobPosting.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    // In a real implementation, we'd fetch the specific experience from the user's profile
    // For now, we'll simulate it
    const prompt = `
      Act as an expert technical resume writer.
      I am applying for the following job:
      Title: ${job.title}
      Company: ${(job as any)?.company?.name || 'Unknown'}
      Description: ${job.description}

      Please write 3 high-impact, ATS-optimized bullet points for my software engineering experience
      that highlight the skills required in this job description. Use the STAR method.
    `;

    const response = await this.aiService.generateCompletion({
      prompt,
      userId,
      useCache: true,
    });

    return { bulletPoints: response.text };
  }

  async buildPdf(resumeData: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        // Generate Resume Content
        doc.fontSize(20).text(resumeData.name || 'John Doe', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(resumeData.email || 'john@example.com', { align: 'center' });
        doc.text(resumeData.phone || '(123) 456-7890', { align: 'center' });

        doc.moveDown();
        doc.fontSize(14).text('Experience', { underline: true });
        doc.moveDown(0.5);

        if (resumeData.experiences && resumeData.experiences.length > 0) {
          resumeData.experiences.forEach((exp: any) => {
            doc.fontSize(12).font('Helvetica-Bold').text(exp.title);
            doc.font('Helvetica').text(exp.company);
            doc.moveDown(0.5);
            exp.bullets?.forEach((bullet: string) => {
              doc.fontSize(10).text(`• ${bullet}`, { indent: 20 });
            });
            doc.moveDown();
          });
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  async createAndSaveResume(userId: string, jobId: string | null, resumeData: any) {
    await this.buildPdf(resumeData);

    // Check if user has an active profileoad pdfBuffer to S3 and get URL. For now, simulate.
    const pdfUrl = `https://storage.interntracker.ai/resumes/${userId}-${Date.now()}.pdf`;

    const generatedResume = await this.prisma.generatedResume.create({
      data: {
        userId,
        jobId,
        name: resumeData.title || 'Generated Resume',
        content: resumeData,
        pdfUrl,
      },
    });

    return generatedResume;
  }

  async getUserResumes(userId: string) {
    return this.prisma.generatedResume.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
