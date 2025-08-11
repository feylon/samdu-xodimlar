import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { NotificationType, PointSource, TaskPriority, TaskStatus, TaskType, UserRole } from '../../common/enums';
import { ErrorCodes } from '../../common/errors/error-codes';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { APP_TIMEZONE } from '../../common/utils/date.util';
import { DepartmentScopeService } from '../departments/department-scope.service';
import { KpiService } from '../kpi/kpi.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { SubmitTaskStatusDto } from './dto/submit-task-status.dto';
import { TaskQueryDto } from './dto/task-query.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { VerifyTaskDto } from './dto/verify-task.dto';
import { Task } from './entities/task.entity';

const OPEN_STATUSES = [TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS, TaskStatus.REJECTED];
const REVIEW_STATUSES = [TaskStatus.COMPLETED, TaskStatus.PARTIALLY_COMPLETED];

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task) private readonly repository: Repository<Task>,
    private readonly scopeService: DepartmentScopeService,
    private readonly kpiService: KpiService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateTaskDto, actor: AuthenticatedUser) {
    await this.scopeService.assertManagesDepartment(actor, dto.departmentId);
    if (!(await this.scopeService.isUserInDepartment(dto.assigneeId, dto.departmentId))) {
      throw new ForbiddenException(ErrorCodes.FORBIDDEN_SCOPE);
    }
    const task = await this.repository.save(
      this.repository.create({
        title: dto.title,
        description: dto.description ?? null,
        assigneeId: dto.assigneeId,
        departmentId: dto.departmentId,
        createdBy: actor.id,
        type: dto.type ?? TaskType.REGULAR,
        priority: dto.priority ?? TaskPriority.MEDIUM,
        dueDate: dto.dueDate ?? null,
        maxPoints: dto.maxPoints ?? 10,
        attachmentFileIds: dto.attachmentFileIds ?? [],
      }),
    );
    await this.notificationsService.notify({
      userId: dto.assigneeId,
      type: NotificationType.TASK_ASSIGNED,
      title: task.type === TaskType.BONUS ? 'Yangi bonus vazifa' : 'Yangi vazifa',
      body: `${task.title}${task.dueDate ? ` · muddat ${task.dueDate}` : ''}`,
      data: { taskId: task.id, type: task.type, priority: task.priority },
    });
    return this.getOne(task.id, actor);
  }

  async update(id: string, dto: UpdateTaskDto, actor: AuthenticatedUser) {
    const task = await this.findOrFail(id);
    await this.scopeService.assertManagesDepartment(actor, task.departmentId);
    if (task.status === TaskStatus.VERIFIED) throw new BadRequestException(ErrorCodes.TASK_ALREADY_VERIFIED);
    if (dto.assigneeId && dto.assigneeId !== task.assigneeId) {
      if (!(await this.scopeService.isUserInDepartment(dto.assigneeId, task.departmentId))) {
        throw new ForbiddenException(ErrorCodes.FORBIDDEN_SCOPE);
      }
    }
    Object.assign(task, {
      title: dto.title ?? task.title,
      description: dto.description ?? task.description,
      assigneeId: dto.assigneeId ?? task.assigneeId,
      type: dto.type ?? task.type,
      priority: dto.priority ?? task.priority,
      dueDate: dto.dueDate ?? task.dueDate,
      maxPoints: dto.maxPoints ?? task.maxPoints,
      attachmentFileIds: dto.attachmentFileIds ?? task.attachmentFileIds,
    });
    await this.repository.save(task);
    return this.getOne(id, actor);
  }

  async remove(id: string, actor: AuthenticatedUser) {
    const task = await this.findOrFail(id);
    await this.scopeService.assertManagesDepartment(actor, task.departmentId);
    if (task.status === TaskStatus.VERIFIED) throw new BadRequestException(ErrorCodes.TASK_ALREADY_VERIFIED);
    await this.repository.remove(task);
    return { success: true };
  }

  async submitStatus(id: string, dto: SubmitTaskStatusDto, actor: AuthenticatedUser) {
    const task = await this.findOrFail(id);
    if (task.assigneeId !== actor.id) throw new ForbiddenException(ErrorCodes.FORBIDDEN_SCOPE);
    if (task.status === TaskStatus.VERIFIED) throw new BadRequestException(ErrorCodes.TASK_ALREADY_VERIFIED);
    if (dto.status === TaskStatus.IN_PROGRESS && !OPEN_STATUSES.includes(task.status)) {
      throw new BadRequestException(ErrorCodes.TASK_INVALID_TRANSITION);
    }
    task.status = dto.status;
    task.employeeComment = dto.comment ?? task.employeeComment;
    task.submittedAt = REVIEW_STATUSES.includes(dto.status) ? new Date() : task.submittedAt;
    await this.repository.save(task);
    if (REVIEW_STATUSES.includes(dto.status)) {
      await this.notificationsService.notify({
        userId: task.createdBy,
        type: NotificationType.TASK_STATUS_CHANGED,
        title: 'Vazifa tekshiruvga topshirildi',
        body: `${actor.fullName}: "${task.title}" → ${dto.status}`,
        data: { taskId: task.id, status: dto.status, assigneeId: task.assigneeId },
      });
    }
    return this.getOne(id, actor);
  }

  async verify(id: string, dto: VerifyTaskDto, actor: AuthenticatedUser) {
    const task = await this.findOrFail(id);
    await this.scopeService.assertManagesDepartment(actor, task.departmentId);
    if (task.status === TaskStatus.VERIFIED) throw new BadRequestException(ErrorCodes.TASK_ALREADY_VERIFIED);
    if (!REVIEW_STATUSES.includes(task.status)) throw new BadRequestException(ErrorCodes.TASK_INVALID_TRANSITION);
    const previousStatus = task.status;
    if (dto.verdict === TaskStatus.REJECTED) {
      task.status = TaskStatus.REJECTED;
      task.reviewComment = dto.comment ?? null;
      task.verifiedBy = actor.id;
      task.verifiedAt = new Date();
      await this.repository.save(task);
      await this.notificationsService.notify({
        userId: task.assigneeId,
        type: NotificationType.TASK_VERIFIED,
        title: 'Vazifa qaytarildi',
        body: `"${task.title}" qayta ishlash uchun qaytarildi.${dto.comment ? ` Izoh: ${dto.comment}` : ''}`,
        data: { taskId: task.id, verdict: TaskStatus.REJECTED },
      });
      return this.getOne(id, actor);
    }
    const defaultPoints = previousStatus === TaskStatus.COMPLETED ? task.maxPoints : Math.floor(task.maxPoints / 2);
    const points = Math.min(task.maxPoints, dto.points ?? defaultPoints);
    task.status = TaskStatus.VERIFIED;
    task.awardedPoints = points;
    task.reviewComment = dto.comment ?? null;
    task.verifiedBy = actor.id;
    task.verifiedAt = new Date();
    await this.repository.save(task);
    if (points > 0) {
      await this.kpiService.award({
        userId: task.assigneeId,
        departmentId: task.departmentId,
        points,
        source: task.type === TaskType.BONUS ? PointSource.BONUS_TASK : PointSource.TASK,
        referenceId: task.id,
        reason: task.title,
        createdBy: actor.id,
      });
    }
    await this.notificationsService.notify({
      userId: task.assigneeId,
      type: NotificationType.TASK_VERIFIED,
      title: 'Vazifa tasdiqlandi',
      body: `"${task.title}" tasdiqlandi, +${points} ball.`,
      data: { taskId: task.id, verdict: TaskStatus.VERIFIED, points },
    });
    return this.getOne(id, actor);
  }

  async getOne(id: string, actor: AuthenticatedUser) {
    const task = await this.repository.findOne({ where: { id }, relations: { assignee: true, department: true } });
    if (!task) throw new NotFoundException(ErrorCodes.TASK_NOT_FOUND);
    if (task.assigneeId !== actor.id) await this.scopeService.assertCanViewDepartment(actor, task.departmentId);
    return this.serialize(task);
  }

  async list(query: TaskQueryDto, actor: AuthenticatedUser) {
    const builder = this.repository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .leftJoinAndSelect('task.department', 'department');
    if (actor.role === UserRole.EMPLOYEE) {
      builder.andWhere('task.assigneeId = :self', { self: actor.id });
    } else if (actor.role === UserRole.DEPARTMENT_HEAD) {
      const managed = await this.scopeService.managedDepartmentIds(actor.id);
      builder.andWhere(
        new Brackets((qb) => {
          qb.where('task.assigneeId = :self', { self: actor.id });
          if (managed.length) qb.orWhere('task.departmentId IN (:...managed)', { managed });
        }),
      );
    }
    if (query.departmentId) builder.andWhere('task.departmentId = :departmentId', { departmentId: query.departmentId });
    if (query.assigneeId) builder.andWhere('task.assigneeId = :assigneeId', { assigneeId: query.assigneeId });
    if (query.status) builder.andWhere('task.status = :status', { status: query.status });
    if (query.type) builder.andWhere('task.type = :type', { type: query.type });
    if (query.priority) builder.andWhere('task.priority = :priority', { priority: query.priority });
    if (query.search) builder.andWhere('(task.title ILIKE :search OR task.description ILIKE :search)', { search: `%${query.search}%` });
    if (query.from) builder.andWhere(`(task.createdAt AT TIME ZONE '${APP_TIMEZONE}')::date >= :from`, { from: query.from });
    if (query.to) builder.andWhere(`(task.createdAt AT TIME ZONE '${APP_TIMEZONE}')::date <= :to`, { to: query.to });
    builder.orderBy(`task.${query.sortBy}`, query.sortOrder, 'NULLS LAST').skip(query.skip).take(query.limit);
    const [items, total] = await builder.getManyAndCount();
    return { items: items.map((task) => this.serialize(task)), total, page: query.page, limit: query.limit };
  }

  async statusCounts(departmentIds: string[] | null, assigneeId?: string) {
    const builder = this.repository.createQueryBuilder('task').select('task.status', 'status').addSelect('COUNT(*)', 'count').groupBy('task.status');
    if (departmentIds) {
      if (departmentIds.length === 0) return {};
      builder.andWhere('task.departmentId IN (:...departmentIds)', { departmentIds });
    }
    if (assigneeId) builder.andWhere('task.assigneeId = :assigneeId', { assigneeId });
    const rows = await builder.getRawMany<{ status: TaskStatus; count: string }>();
    return Object.fromEntries(rows.map((row) => [row.status, Number(row.count)]));
  }

  async pendingReview(departmentIds: string[]) {
    if (departmentIds.length === 0) return [];
    const tasks = await this.repository.find({
      where: departmentIds.map((departmentId) => ({ departmentId })),
      relations: { assignee: true, department: true },
      order: { submittedAt: 'ASC' },
    });
    return tasks.filter((task) => REVIEW_STATUSES.includes(task.status)).map((task) => this.serialize(task));
  }

  async overdueCount(departmentIds: string[] | null, assigneeId?: string, today?: string) {
    const builder = this.repository
      .createQueryBuilder('task')
      .where('task.dueDate < :today', { today })
      .andWhere('task.status IN (:...open)', { open: OPEN_STATUSES });
    if (departmentIds) {
      if (departmentIds.length === 0) return 0;
      builder.andWhere('task.departmentId IN (:...departmentIds)', { departmentIds });
    }
    if (assigneeId) builder.andWhere('task.assigneeId = :assigneeId', { assigneeId });
    return builder.getCount();
  }

  private async findOrFail(id: string): Promise<Task> {
    const task = await this.repository.findOne({ where: { id } });
    if (!task) throw new NotFoundException(ErrorCodes.TASK_NOT_FOUND);
    return task;
  }

  private serialize(task: Task) {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      assigneeId: task.assigneeId,
      assignee: task.assignee
        ? { id: task.assignee.id, fullName: task.assignee.fullName, position: task.assignee.position, photoFileId: task.assignee.photoFileId }
        : null,
      departmentId: task.departmentId,
      departmentName: task.department?.name,
      createdBy: task.createdBy,
      type: task.type,
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate,
      maxPoints: task.maxPoints,
      awardedPoints: task.awardedPoints,
      employeeComment: task.employeeComment,
      reviewComment: task.reviewComment,
      submittedAt: task.submittedAt,
      verifiedBy: task.verifiedBy,
      verifiedAt: task.verifiedAt,
      attachmentFileIds: task.attachmentFileIds,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }
}
