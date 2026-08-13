import { Injectable, Logger } from '@nestjs/common';
import { MembersService } from './members.service';

@Injectable()
export class StudentImportService {
  private readonly logger = new Logger(StudentImportService.name);

  constructor(
    
    private readonly membersService: MembersService
  ) {}

  /**
   * Mock implementation of CSV import processing.
   * Real implementation would use BullMQ (@Process) for huge files.
   */
  async processCsvImport(orgId: string, inviterId: string, csvContent: string) {
    const lines = csvContent.split('\n').filter((l) => l.trim().length > 0);
    // Expecting header: Name,Email
    if (lines.length < 2) return { success: 0, failed: 0 };

    const results = {
      imported: 0,
      skipped: 0,
      failed: 0,
    };

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]!.split(',');
      if (line.length >= 2) {
        
        const email = line[1]!.trim();

        try {
          await this.membersService.inviteMember(orgId, email, 'STUDENT', inviterId);
          results.imported++;
        } catch (error) {
          // Could be conflict (already member / pending)
          this.logger.warn(`Failed to import ${email}: ${error}`);
          if ((error as any).status === 409) results.skipped++;
          else results.failed++;
        }
      } else {
        results.failed++;
      }
    }

    return results;
  }
}
