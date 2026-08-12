import { NotFoundException } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';

import { ResumeService } from './resume.service';

const mockPrismaService = {
  resume: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
  },
};

describe('ResumeService', () => {
  let service: ResumeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResumeService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<ResumeService>(ResumeService);
    jest.clearAllMocks();
  });

  describe('findByUserId', () => {
    it('should return null if resume not found', async () => {
      mockPrismaService.resume.findUnique.mockResolvedValueOnce(null);
      const result = await service.findByUserId('userId');
      expect(result).toBeNull();
    });

    it('should return resume', async () => {
      mockPrismaService.resume.findUnique.mockResolvedValueOnce({ id: 'r1' });
      const result = await service.findByUserId('userId');
      expect(result).toEqual({ id: 'r1' });
    });
  });

  describe('upload', () => {
    it('should upsert resume', async () => {
      mockPrismaService.resume.upsert.mockResolvedValueOnce({ id: 'r1' });
      const result = await service.upload('userId', {
        fileName: 'resume.pdf',
        fileUrl: 'url',
        fileSize: 100,
        mimeType: 'application/pdf',
      });
      expect(result).toEqual({ id: 'r1' });
      expect(mockPrismaService.resume.upsert).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should throw NotFoundException if resume not found', async () => {
      mockPrismaService.resume.findUnique.mockResolvedValueOnce(null);
      await expect(service.delete('userId')).rejects.toThrow(NotFoundException);
    });

    it('should delete resume', async () => {
      mockPrismaService.resume.findUnique.mockResolvedValueOnce({ id: 'r1' });
      mockPrismaService.resume.delete.mockResolvedValueOnce({ id: 'r1' });
      await service.delete('userId');
      expect(mockPrismaService.resume.delete).toHaveBeenCalledWith({
        where: { userId: 'userId' },
      });
    });
  });
});
