import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

export interface CreateAdminNoteInput {
  targetType: string;
  targetId: string;
  authorAdminId: string;
  noteText: string;
  isPinned?: boolean;
}

@Injectable()
export class AdminNotesService {
  constructor(private readonly prisma: PrismaService) {}

  async createNote(input: CreateAdminNoteInput) {
    return this.prisma.adminNote.create({
      data: {
        targetType: input.targetType,
        targetId: input.targetId,
        authorAdminId: input.authorAdminId,
        noteText: input.noteText,
        isPinned: input.isPinned || false,
      },
      include: {
        authorAdmin: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
        },
      },
    });
  }

  async getNotesForTarget(targetType: string, targetId: string) {
    return this.prisma.adminNote.findMany({
      where: { targetType, targetId },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      include: {
        authorAdmin: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
        },
      },
    });
  }

  async togglePin(noteId: string) {
    const note = await this.prisma.adminNote.findUnique({ where: { id: noteId } });
    if (!note) throw new NotFoundException('Note not found');

    return this.prisma.adminNote.update({
      where: { id: noteId },
      data: { isPinned: !note.isPinned },
    });
  }

  async deleteNote(noteId: string) {
    const note = await this.prisma.adminNote.findUnique({ where: { id: noteId } });
    if (!note) throw new NotFoundException('Note not found');

    return this.prisma.adminNote.delete({ where: { id: noteId } });
  }
}
