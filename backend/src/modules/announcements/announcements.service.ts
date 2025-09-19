import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { NotificationType, UserRole } from '../../common/enums';
import { ErrorCodes } from '../../common/errors/error-codes';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { DepartmentScopeService } from '../departments/department-scope.service';
import { NotificationsService } from '../notifications/notifications.service';
import { User } from '../users/entities/user.entity';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { Announcement } from './entities/announcement.entity';

@Injectable()
export class AnnouncementsService {
  constructor(
    @InjectRepository(Announcement) private readonly repository: Repository<Announcement>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly scopeService: DepartmentScopeService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateAnnouncementDto, actor: AuthenticatedUser) {
    if (dto.departmentId) {
      await this.scopeService.assertManagesDepartment(actor, dto.departmentId);
    } else if (actor.role === UserRole.DEPARTMENT_HEAD) {
      throw new ForbiddenException(ErrorCodes.FORBIDDEN_SCOPE);
    }
    const announcement = await this.repository.save(
      this.repository.create({
        title: dto.title,
        body: dto.body,
        departmentId: dto.departmentId ?? null,
        createdBy: actor.id,
        isPinned: dto.isPinned ?? false,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      }),
    );
    const recipients = dto.departmentId
      ? await this.scopeService.departmentMemberIds(dto.departmentId)
      : (await this.userRepository.find({ select: { id: true } })).map((user) => user.id);
    await this.notificationsService.notifyMany(
      recipients.filter((id) => id !== actor.id),
      {
        type: NotificationType.ANNOUNCEMENT,
        title: 'Yangi e\'lon',
        body: announcement.title,
        data: { announcementId: announcement.id, departmentId: announcement.departmentId },
      },
    );
    return this.getOne(announcement.id, actor);
  }

  async update(id: string, dto: UpdateAnnouncementDto, actor: AuthenticatedUser) {
    const announcement = await this.findOrFail(id);
    await this.assertCanManage(announcement, actor);
    Object.assign(announcement, {
      title: dto.title ?? announcement.title,
      body: dto.body ?? announcement.body,
      isPinned: dto.isPinned ?? announcement.isPinned,
      expiresAt: dto.expiresAt !== undefined ? (dto.expiresAt ? new Date(dto.expiresAt) : null) : announcement.expiresAt,
    });
    await this.repository.save(announcement);
    return this.getOne(id, actor);
  }

  async remove(id: string, actor: AuthenticatedUser) {
    const announcement = await this.findOrFail(id);
    await this.assertCanManage(announcement, actor);
    await this.repository.remove(announcement);
    return { success: true };
  }

  async getOne(id: string, actor: AuthenticatedUser) {
    const announcement = await this.repository.findOne({ where: { id }, relations: { department: true } });
    if (!announcement) throw new NotFoundException(ErrorCodes.ANNOUNCEMENT_NOT_FOUND);
    if (announcement.departmentId) await this.scopeService.assertCanViewDepartment(actor, announcement.departmentId);
    return this.serialize(announcement);
  }

  async list(pagination: PaginationDto, actor: AuthenticatedUser, departmentId?: string, includeExpired = false) {
    const builder = this.repository.createQueryBuilder('announcement').leftJoinAndSelect('announcement.department', 'department');
    const visible = await this.scopeService.visibleDepartmentIds(actor);
    if (visible) {
      builder.andWhere(
        new Brackets((qb) => {
          qb.where('announcement.departmentId IS NULL');
          if (visible.length) qb.orWhere('announcement.departmentId IN (:...visible)', { visible });
        }),
      );
    }
    if (departmentId) builder.andWhere('announcement.departmentId = :departmentId', { departmentId });
    if (!includeExpired) builder.andWhere('(announcement.expiresAt IS NULL OR announcement.expiresAt > NOW())');
    builder.orderBy('announcement.isPinned', 'DESC').addOrderBy('announcement.createdAt', 'DESC').skip(pagination.skip).take(pagination.limit);
    const [items, total] = await builder.getManyAndCount();
    return { items: items.map((item) => this.serialize(item)), total, page: pagination.page, limit: pagination.limit };
  }

  private async findOrFail(id: string): Promise<Announcement> {
    const announcement = await this.repository.findOne({ where: { id } });
    if (!announcement) throw new NotFoundException(ErrorCodes.ANNOUNCEMENT_NOT_FOUND);
    return announcement;
  }

  private async assertCanManage(announcement: Announcement, actor: AuthenticatedUser) {
    if (actor.role === UserRole.SUPERADMIN || actor.role === UserRole.HR) return;
    if (announcement.createdBy === actor.id) return;
    if (announcement.departmentId) await this.scopeService.assertManagesDepartment(actor, announcement.departmentId);
    else throw new ForbiddenException(ErrorCodes.FORBIDDEN_SCOPE);
  }

  private serialize(announcement: Announcement) {
    return {
      id: announcement.id,
      title: announcement.title,
      body: announcement.body,
      departmentId: announcement.departmentId,
      departmentName: announcement.department?.name ?? null,
      createdBy: announcement.createdBy,
      isPinned: announcement.isPinned,
      expiresAt: announcement.expiresAt,
      createdAt: announcement.createdAt,
      updatedAt: announcement.updatedAt,
    };
  }
}
