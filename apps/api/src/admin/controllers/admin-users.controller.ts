import { Controller, Get, Param, Patch, Post, Body, Query, UseGuards, Req } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { RateLimitProfile } from '../../common/decorators/rate-limit.decorator';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { CreateUserNoteDto, SuspendUserDto, RestoreUserDto } from '../dto/admin-action.dto';
import { UpdateUserStatusDto } from '../dto/update-user.dto';
import { AdminPermission } from '../enums/admin-permission.enum';
import { PermissionGuard } from '../guards/permission.guard';
import { AdminAuditService } from '../services/admin-audit.service';
import { AdminNotesService } from '../services/admin-notes.service';
import { AdminUsersService } from '../services/admin-users.service';

@Controller('v1/admin/users')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@RateLimitProfile('admin')
export class AdminUsersController {
  constructor(
    private readonly usersService: AdminUsersService,
    private readonly auditService: AdminAuditService,
    private readonly notesService: AdminNotesService,
  ) {}

  @Get()
  @RequirePermission(AdminPermission.USER_VIEW)
  async getUsers(
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @Query('search') search?: string,
  ) {
    return this.usersService.findAll(Number(page), Number(limit), search ? { search } : undefined);
  }

  @Get(':id')
  @RequirePermission(AdminPermission.USER_VIEW)
  async getUser(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id/status')
  @RequirePermission(AdminPermission.USER_SUSPEND)
  async updateStatus(@Req() req: any, @Param('id') id: string, @Body() body: UpdateUserStatusDto) {
    const result = await this.usersService.updateStatus(id, body.isActive);

    void this.auditService.logAction(
      req.user.id,
      body.isActive ? 'ENABLE_USER' : 'DISABLE_USER',
      'USER',
      id,
      undefined,
      req.ip,
    );

    return result;
  }

  @Post(':id/suspend')
  @RequirePermission(AdminPermission.USER_SUSPEND)
  async suspendUser(@Req() req: any, @Param('id') id: string, @Body() body: SuspendUserDto) {
    const result = await this.usersService.updateStatus(id, false);

    void this.auditService.logAction(
      req.user.id,
      'SUSPEND_USER',
      'USER',
      id,
      { reason: body.reason },
      req.ip,
    );

    return {
      success: true,
      message: `User ${id} suspended. Reason: ${body.reason}`,
      user: result,
    };
  }

  @Post(':id/restore')
  @RequirePermission(AdminPermission.USER_RESTORE)
  async restoreUser(@Req() req: any, @Param('id') id: string, @Body() body: RestoreUserDto) {
    const result = await this.usersService.updateStatus(id, true);

    void this.auditService.logAction(
      req.user.id,
      'RESTORE_USER',
      'USER',
      id,
      { reason: body.reason },
      req.ip,
    );

    return {
      success: true,
      message: `User ${id} restored. Reason: ${body.reason}`,
      user: result,
    };
  }

  @Patch(':id/reset-lock')
  @RequirePermission(AdminPermission.USER_MANAGE)
  async resetLock(@Req() req: any, @Param('id') id: string) {
    const result = await this.usersService.resetLoginAttempts(id);

    void this.auditService.logAction(req.user.id, 'RESET_USER_LOCK', 'USER', id, undefined, req.ip);

    return result;
  }

  @Post(':id/notes')
  @RequirePermission(AdminPermission.USER_NOTE_CREATE)
  async addNote(@Req() req: any, @Param('id') userId: string, @Body() body: CreateUserNoteDto) {
    const note = await this.notesService.createNote({
      targetType: 'USER',
      targetId: userId,
      authorAdminId: req.user.id,
      noteText: body.noteText,
      isPinned: body.isPinned ?? false,
    });

    void this.auditService.logAction(
      req.user.id,
      'CREATE_ADMIN_NOTE',
      'USER',
      userId,
      { noteId: note.id },
      req.ip,
    );

    return note;
  }

  @Get(':id/notes')
  @RequirePermission(AdminPermission.USER_NOTE_VIEW)
  async getNotes(@Param('id') userId: string) {
    return this.notesService.getNotesForTarget('USER', userId);
  }
}
