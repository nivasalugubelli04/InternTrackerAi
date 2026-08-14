import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/services/ai.service';
import { EntitlementService, BILLING_FEATURES } from '../billing/services/entitlement.service';
import PDFDocument = require('pdfkit');

export interface ResumeSectionContent {
  personalInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    links?: string[];
  };
  summary?: string;
  education?: Array<{
    degree?: string;
    college?: string;
    cgpa?: string;
    startDate?: string;
    endDate?: string;
  }>;
  skills?: string[] | Record<string, string[]>;
  projects?: Array<{
    name: string;
    description: string;
    technologies?: string[];
    contribution?: string;
    impact?: string;
  }>;
  experience?: Array<{
    role: string;
    company: string;
    description: string | string[];
    startDate?: string;
    endDate?: string;
  }>;
  certifications?: string[];
  achievements?: string[];
  links?: string[];
}

@Injectable()
export class ResumeStudioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly entitlementService: EntitlementService,
  ) {}

  /**
   * Helper to convert structured content JSON to raw text for LLM ingestion.
   */
  private contentJsonToText(content: any): string {
    if (!content) return '';
    let text = '';
    
    if (content.personalInfo) {
      const pi = content.personalInfo;
      text += `${pi.name || ''}\n${pi.email || ''} | ${pi.phone || ''}\n${(pi.links || []).join(' | ')}\n\n`;
    }
    if (content.summary) {
      text += `Professional Summary:\n${content.summary}\n\n`;
    }
    if (content.education && Array.isArray(content.education)) {
      text += `Education:\n`;
      content.education.forEach((edu: any) => {
        text += `- ${edu.degree || ''} at ${edu.college || ''} (CGPA: ${edu.cgpa || ''})\n`;
      });
      text += '\n';
    }
    if (content.skills) {
      text += `Skills:\n`;
      if (Array.isArray(content.skills)) {
        text += content.skills.join(', ') + '\n';
      } else {
        for (const [cat, sks] of Object.entries(content.skills)) {
          if (Array.isArray(sks)) {
            text += `${cat}: ${sks.join(', ')}\n`;
          }
        }
      }
      text += '\n';
    }
    if (content.projects && Array.isArray(content.projects)) {
      text += `Projects:\n`;
      content.projects.forEach((proj: any) => {
        text += `- ${proj.name || ''}: ${proj.description || ''}\n  Technologies: ${(proj.technologies || []).join(', ')}\n`;
        if (proj.contribution) text += `  Contribution: ${proj.contribution}\n`;
        if (proj.impact) text += `  Impact: ${proj.impact}\n`;
      });
      text += '\n';
    }
    if (content.experience && Array.isArray(content.experience)) {
      text += `Experience:\n`;
      content.experience.forEach((exp: any) => {
        text += `- ${exp.role || ''} at ${exp.company || ''}\n`;
        if (Array.isArray(exp.description)) {
          exp.description.forEach((d: string) => {
            text += `  • ${d}\n`;
          });
        } else if (exp.description) {
          text += `  ${exp.description}\n`;
        }
      });
      text += '\n';
    }
    if (content.certifications && Array.isArray(content.certifications)) {
      text += `Certifications:\n${content.certifications.map((c: string) => `- ${c}`).join('\n')}\n\n`;
    }
    if (content.achievements && Array.isArray(content.achievements)) {
      text += `Achievements:\n${content.achievements.map((a: string) => `- ${a}`).join('\n')}\n\n`;
    }
    if (content.links && Array.isArray(content.links)) {
      text += `Links:\n${content.links.join('\n')}\n\n`;
    }
    
    return text.trim();
  }

  async getResumes(userId: string) {
    return this.prisma.resumeDocument.findMany({
      where: { userId, isArchived: false },
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async createResume(userId: string, data: any) {
    return this.prisma.resumeDocument.create({
      data: {
        userId,
        name: data.name || 'Untitled Resume',
        targetRole: data.targetRole,
        targetCompany: data.targetCompany,
        versions: {
          create: {
            versionName: 'Initial Version',
            contentJson: data.contentJson || {},
          }
        }
      },
      include: { versions: true }
    });
  }

  async getResume(userId: string, id: string) {
    const resume = await this.prisma.resumeDocument.findFirst({
      where: { id, userId },
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
        },
      }
    });
    if (!resume) throw new NotFoundException('Resume not found');
    return resume;
  }

  async updateResume(userId: string, id: string, data: any) {
    const resume = await this.prisma.resumeDocument.findFirst({
      where: { id, userId },
      include: { versions: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    if (!resume) throw new NotFoundException('Resume not found');

    // If update includes contentJson, update the latest version
    if (data.contentJson && resume.versions && resume.versions.length > 0) {
      const latestVer = resume.versions[0];
      if (latestVer) {
        await this.prisma.resumeVersion.update({
          where: { id: latestVer.id },
          data: {
            contentJson: data.contentJson,
          },
        });
      }
    }

    return this.prisma.resumeDocument.update({
      where: { id, userId },
      data: {
        name: data.name !== undefined ? data.name : resume.name,
        targetRole: data.targetRole !== undefined ? data.targetRole : resume.targetRole,
        targetCompany: data.targetCompany !== undefined ? data.targetCompany : resume.targetCompany,
        isArchived: data.isArchived !== undefined ? data.isArchived : resume.isArchived,
      }
    });
  }

  async deleteResume(userId: string, id: string) {
    const resume = await this.prisma.resumeDocument.findFirst({
      where: { id, userId }
    });
    if (!resume) throw new NotFoundException('Resume not found');

    return this.prisma.resumeDocument.delete({
      where: { id, userId }
    });
  }

  /**
   * Helper to resolve latest version or verify version belongs to document & user
   */
  private async resolveVersion(userId: string, docId: string, versionId?: string): Promise<any> {
    const doc = await this.prisma.resumeDocument.findFirst({
      where: { id: docId, userId },
      include: { versions: { orderBy: { createdAt: 'desc' } } }
    });
    if (!doc) throw new NotFoundException('Resume document not found');

    if (versionId) {
      const ver = doc.versions.find(v => v.id === versionId);
      if (!ver) throw new NotFoundException('Specified resume version not found');
      return ver;
    }

    if (doc.versions.length === 0) {
      throw new BadRequestException('Resume document has no versions');
    }
    const latest = doc.versions[0];
    if (!latest) throw new BadRequestException('Resume document has no versions');
    return latest;
  }

  /**
   * AI resume quality score breakdown and suggestions.
   */
  async analyzeResume(userId: string, id: string, jobId?: string, versionId?: string) {
    // 1. Enforce usage limits
    await this.entitlementService.enforceUsage(userId, BILLING_FEATURES.RESUME_ANALYSIS);

    // 2. Resolve target version
    const version = await this.resolveVersion(userId, id, versionId);

    // 3. Prepare texts
    const resumeText = this.contentJsonToText(version.contentJson);
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    
    let jobDescription = '';
    if (jobId) {
      const job = await this.prisma.jobPosting.findUnique({ where: { id: jobId } });
      if (job) {
        jobDescription = job.description || '';
      }
    }

    // 4. Call LLM Service
    const aiResult = await this.aiService.optimizeResumeText(
      userId,
      resumeText,
      profile || {},
      jobDescription,
      jobId ? 'Align & Analyze against specific job' : 'General Resume Quality Check'
    );

    // 5. Save Analysis Result
    const analysis = await this.prisma.resumeAnalysis.create({
      data: {
        resumeVersionId: version.id,
        jobId: jobId || null,
        overallScore: Math.round(aiResult.qualityScore || 0),
        scoreBreakdown: aiResult.scoreBreakdown || {},
        missingKeywords: aiResult.missingKeywords || [],
        matchedKeywords: aiResult.matchedKeywords || [],
        analysisJson: aiResult,
      }
    });

    // 6. Update version with scores
    await this.prisma.resumeVersion.update({
      where: { id: version.id },
      data: {
        qualityScore: Math.round(aiResult.qualityScore || 0),
        atsScore: Math.round(aiResult.scoreBreakdown?.ats || 0),
      }
    });

    // 7. Auto-populate suggestions in suggestion table if any are generated
    if (aiResult.suggestions && Array.isArray(aiResult.suggestions)) {
      await this.prisma.resumeSuggestion.deleteMany({
        where: { resumeVersionId: version.id, status: 'PENDING' }
      });

      for (const sug of aiResult.suggestions) {
        await this.prisma.resumeSuggestion.create({
          data: {
            resumeVersionId: version.id,
            sectionType: sug.sectionType || 'GENERAL',
            originalText: sug.originalText || '',
            suggestedText: sug.suggestedText || '',
            reason: sug.reason || '',
            status: 'PENDING',
          }
        });
      }
    }

    return analysis;
  }

  /**
   * Suggests optimization changes for specific sections or elements without changing the version immediately.
   */
  async optimizeResume(userId: string, id: string, data: any) {
    // 1. Enforce usage limits
    await this.entitlementService.enforceUsage(userId, BILLING_FEATURES.RESUME_OPTIMIZATION);

    // 2. Resolve target version
    const version = await this.resolveVersion(userId, id, data.versionId);

    // 3. Prepare prompt info
    const resumeText = this.contentJsonToText(version.contentJson);
    const profile = await this.prisma.profile.findUnique({ where: { userId } });

    let jobDescription = '';
    if (data.jobId) {
      const job = await this.prisma.jobPosting.findUnique({ where: { id: data.jobId } });
      if (job) jobDescription = job.description || '';
    }

    // 4. Request optimization suggestion
    const aiResult = await this.aiService.optimizeResumeText(
      userId,
      resumeText,
      profile || {},
      jobDescription,
      data.requestType || `Optimize bullet point or section: ${data.sectionType}`
    );

    // 5. Create Resume Suggestions in Database
    const suggestions = [];
    if (aiResult.suggestions && Array.isArray(aiResult.suggestions)) {
      for (const sug of aiResult.suggestions) {
        const suggestion = await this.prisma.resumeSuggestion.create({
          data: {
            resumeVersionId: version.id,
            sectionType: sug.sectionType || data.sectionType || 'GENERAL',
            originalText: sug.originalText || data.originalText || '',
            suggestedText: sug.suggestedText || '',
            reason: sug.reason || 'AI optimized for role/clarity',
            status: 'PENDING',
          }
        });
        suggestions.push(suggestion);
      }
    }

    return {
      message: 'Optimization suggestions generated successfully',
      suggestions,
    };
  }

  /**
   * Approves a generated suggestion and applies the changes to the resume content.
   */
  async approveSuggestion(userId: string, _docId: string, suggestionId: string) {
    // 1. Verify ownership of suggestion
    const suggestion = await this.prisma.resumeSuggestion.findUnique({
      where: { id: suggestionId },
      include: {
        resumeVersion: {
          include: { resumeDocument: true }
        }
      }
    });

    if (!suggestion || suggestion.resumeVersion.resumeDocument.userId !== userId) {
      throw new NotFoundException('Suggestion not found');
    }

    if (suggestion.status !== 'PENDING') {
      throw new BadRequestException(`Suggestion is already ${suggestion.status}`);
    }

    // 2. Apply content modification
    const content = JSON.parse(JSON.stringify(suggestion.resumeVersion.contentJson)) as any;
    const type = suggestion.sectionType.toUpperCase();

    if (type === 'SUMMARY' || type === 'PROFESSIONAL SUMMARY') {
      content.summary = suggestion.suggestedText;
    } else if (type === 'EXPERIENCE' && content.experience) {
      // Replace original text bullet/paragraph matching originalText
      content.experience = content.experience.map((exp: any) => {
        if (Array.isArray(exp.description)) {
          exp.description = exp.description.map((d: string) => 
            d.trim() === suggestion.originalText?.trim() ? suggestion.suggestedText : d
          );
        } else if (exp.description && exp.description.trim() === suggestion.originalText?.trim()) {
          exp.description = suggestion.suggestedText;
        }
        return exp;
      });
    } else if (type === 'PROJECTS' && content.projects) {
      content.projects = content.projects.map((proj: any) => {
        if (proj.description && proj.description.trim() === suggestion.originalText?.trim()) {
          proj.description = suggestion.suggestedText;
        }
        return proj;
      });
    } else {
      // General fallback or specific mapping
      if (!content.generalSuggestions) content.generalSuggestions = [];
      content.generalSuggestions.push(suggestion.suggestedText);
    }

    // 3. Save applied version content
    await this.prisma.resumeVersion.update({
      where: { id: suggestion.resumeVersionId },
      data: { contentJson: content }
    });

    // 4. Update suggestion status
    return this.prisma.resumeSuggestion.update({
      where: { id: suggestionId },
      data: { status: 'ACCEPTED' }
    });
  }

  /**
   * Rejects a generated suggestion.
   */
  async rejectSuggestion(userId: string, suggestionId: string) {
    const suggestion = await this.prisma.resumeSuggestion.findUnique({
      where: { id: suggestionId },
      include: {
        resumeVersion: {
          include: { resumeDocument: true }
        }
      }
    });

    if (!suggestion || suggestion.resumeVersion.resumeDocument.userId !== userId) {
      throw new NotFoundException('Suggestion not found');
    }

    return this.prisma.resumeSuggestion.update({
      where: { id: suggestionId },
      data: { status: 'REJECTED' }
    });
  }

  async compareResume(userId: string, id: string, jobId: string) {
    return this.analyzeResume(userId, id, jobId);
  }

  async createVersion(userId: string, id: string, data: any) {
    const document = await this.getResume(userId, id);
    const latestVersion = document.versions[0];
    
    return this.prisma.resumeVersion.create({
      data: {
        resumeDocumentId: id,
        versionName: data.versionName || `Version ${document.versions.length + 1}`,
        contentJson: data.contentJson || latestVersion?.contentJson || {},
      }
    });
  }

  async getHistory(userId: string, id: string) {
    const document = await this.prisma.resumeDocument.findFirst({
      where: { id, userId },
      include: {
        versions: {
          include: {
            analyses: { orderBy: { createdAt: 'desc' } },
            suggestions: { orderBy: { createdAt: 'desc' } }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!document) throw new NotFoundException('Resume document not found');
    return document;
  }

  async exportResume(userId: string, id: string, format: string) {
    const document = await this.getResume(userId, id);
    return {
      message: `Resume ${document.name} exported as ${format}`,
      downloadUrl: `/api/v1/resumes/${id}/download?format=${format.toLowerCase()}`
    };
  }

  /**
   * PDF document builder logic using PDFKit
   */
  async buildPdf(contentJson: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // Header section (Name, contact details)
        const pi = contentJson.personalInfo || {};
        doc.fontSize(20).font('Helvetica-Bold').text(pi.name || 'Untitled Resume', { align: 'center' });
        doc.fontSize(10).font('Helvetica').text(`${pi.email || ''} | ${pi.phone || ''}`, { align: 'center' });
        if (pi.links && pi.links.length > 0) {
          doc.text(pi.links.join(' | '), { align: 'center' });
        }
        doc.moveDown();

        // Summary
        if (contentJson.summary) {
          doc.fontSize(12).font('Helvetica-Bold').text('Professional Summary');
          doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
          doc.moveDown(0.2);
          doc.fontSize(10).font('Helvetica').text(contentJson.summary);
          doc.moveDown();
        }

        // Education
        if (contentJson.education && contentJson.education.length > 0) {
          doc.fontSize(12).font('Helvetica-Bold').text('Education');
          doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
          doc.moveDown(0.2);
          contentJson.education.forEach((edu: any) => {
            doc.fontSize(10).font('Helvetica-Bold').text(`${edu.degree || ''} — ${edu.college || ''}`);
            if (edu.cgpa) {
              doc.fontSize(9).font('Helvetica').text(`CGPA/Score: ${edu.cgpa}`);
            }
            doc.moveDown(0.5);
          });
          doc.moveDown();
        }

        // Skills
        if (contentJson.skills) {
          doc.fontSize(12).font('Helvetica-Bold').text('Skills');
          doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
          doc.moveDown(0.2);
          if (Array.isArray(contentJson.skills)) {
            doc.fontSize(10).font('Helvetica').text(contentJson.skills.join(', '));
          } else {
            for (const [cat, sks] of Object.entries(contentJson.skills)) {
              if (Array.isArray(sks) && sks.length > 0) {
                doc.fontSize(10).font('Helvetica-Bold').text(`${cat}: `, { continued: true })
                  .font('Helvetica').text(sks.join(', '));
              }
            }
          }
          doc.moveDown();
        }

        // Experience
        if (contentJson.experience && contentJson.experience.length > 0) {
          doc.fontSize(12).font('Helvetica-Bold').text('Experience');
          doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
          doc.moveDown(0.2);
          contentJson.experience.forEach((exp: any) => {
            doc.fontSize(10).font('Helvetica-Bold').text(`${exp.role || ''} at ${exp.company || ''}`);
            if (Array.isArray(exp.description)) {
              exp.description.forEach((bullet: string) => {
                doc.fontSize(9).font('Helvetica').text(`• ${bullet}`, { indent: 15 });
              });
            } else if (exp.description) {
              doc.fontSize(9).font('Helvetica').text(exp.description);
            }
            doc.moveDown(0.5);
          });
          doc.moveDown();
        }

        // Projects
        if (contentJson.projects && contentJson.projects.length > 0) {
          doc.fontSize(12).font('Helvetica-Bold').text('Projects');
          doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
          doc.moveDown(0.2);
          contentJson.projects.forEach((proj: any) => {
            doc.fontSize(10).font('Helvetica-Bold').text(`${proj.name || ''}`);
            doc.fontSize(9).font('Helvetica').text(proj.description || '');
            if (proj.technologies && proj.technologies.length > 0) {
              doc.fontSize(9).font('Helvetica-Bold').text('Technologies: ', { continued: true })
                .font('Helvetica').text(proj.technologies.join(', '));
            }
            doc.moveDown(0.5);
          });
          doc.moveDown();
        }

        // Certifications
        if (contentJson.certifications && contentJson.certifications.length > 0) {
          doc.fontSize(12).font('Helvetica-Bold').text('Certifications');
          doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
          doc.moveDown(0.2);
          contentJson.certifications.forEach((cert: string) => {
            doc.fontSize(10).font('Helvetica').text(`• ${cert}`, { indent: 15 });
          });
          doc.moveDown();
        }

        // Achievements
        if (contentJson.achievements && contentJson.achievements.length > 0) {
          doc.fontSize(12).font('Helvetica-Bold').text('Achievements');
          doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
          doc.moveDown(0.2);
          contentJson.achievements.forEach((ach: string) => {
            doc.fontSize(10).font('Helvetica').text(`• ${ach}`, { indent: 15 });
          });
          doc.moveDown();
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
