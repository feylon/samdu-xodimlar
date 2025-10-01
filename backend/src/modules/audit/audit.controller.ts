import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ClientType, UserRole } from '../../common/enums';
import { LoginHistoryQueryDto } from '../auth/dto/login-history-query.dto';
import { SessionsService } from '../sessions/sessions.service';
import { AuditService } from './audit.service';
import { AuditQueryDto } from './dto/audit-query.dto';

@ApiTags('Audit (Superadmin)')
@ApiBearerAuth()
@Roles(UserRole.SUPERADMIN)
@Controller('audit')
export class AuditController {
  constructor(
    private readonly auditService: AuditService,
    private readonly sessionsService: SessionsService,
  ) {}

  @Get('logs')
  @ApiOperation({ summary: 'System-wide action log with employee ID filter' })
  logs(@Query() query: AuditQueryDto) {
    return this.auditService.list(
      {
        actorId: query.userId,
        action: query.action,
        entity: query.entity,
        entityId: query.entityId,
        method: query.method,
        from: query.from,
        to: query.to,
        onlyErrors: query.onlyErrors,
      },
      query.page,
      query.limit,
    );
  }

  @Get('login-history')
  @ApiOperation({ summary: 'Login history of all users' })
  loginHistory(@Query() query: LoginHistoryQueryDto) {
    return this.sessionsService.loginHistory({ userId: query.userId, login: query.login, success: query.success }, query.page, query.limit);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'All active sessions across the organization' })
  sessions(@Query() query: PaginationDto, @Query('userId') userId?: string, @Query('client') client?: ClientType) {
    return this.sessionsService.listActive({ userId: userId || undefined, client: client || undefined }, query.page, query.limit);
  }
}
