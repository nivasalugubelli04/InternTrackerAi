import { Module } from '@nestjs/common';
import { PrivacyController } from './controllers/privacy.controller';
import { PrivacyService } from './services/privacy.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PrivacyController],
  providers: [PrivacyService],
  exports: [PrivacyService],
})
export class PrivacyModule {}
