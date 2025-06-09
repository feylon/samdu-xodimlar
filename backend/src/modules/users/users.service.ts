import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, In, Repository } from 'typeorm';
import { EmployeeStatus, NotificationType, UserRole } from '../../common/enums';
import { ErrorCodes } from '../../common/errors/error-codes';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { todayIsoDate } from '../../common/utils/date.util';
import { hashPassword } from '../../common/utils/password.util';
import { DepartmentAssignment } from '../departments/entities/department-assignment.entity';
import { Department } from '../departments/entities/department.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { SessionsService } from '../sessions/sessions.service';
import { ChangeStatusDto } from './dto/change-status.dto';
import { AssignmentInputDto, CreateEmployeeDto } from './dto/create-employee.dto';
import { CreateHrDto } from './dto/create-hr.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { TransferEmployeeDto } from './dto/transfer-employee.dto';
import { UpdateCredentialsDto } from './dto/update-credentials.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeeStatusHistory } from './entities/employee-status-history.entity';
import { User } from './entities/user.entity';

export interface PublicUser {
  id: string;
  login: string;
  role: UserRole;
  fullName: string;
  pinfl: string | null;
  phone: string | null;
  email: string | null;
  position: string | null;
  baseSalary: number;
  photoFileId: string | null;
  passportFileIds: string[];
  status: EmployeeStatus;
  hireDate: string | null;
  terminatedAt: string | null;
  birthDate: string | null;
  address: string | null;
  mustChangePassword: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const PRIVILEGED_ROLES: UserRole[] = [UserRole.SUPERADMIN, UserRole.HR];

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(EmployeeStatusHistory) private readonly statusHistoryRepository: Repository<EmployeeStatusHistory>,
    @InjectRepository(DepartmentAssignment) private readonly assignmentRepository: Repository<DepartmentAssignment>,
    @InjectRepository(Department) private readonly departmentRepository: Repository<Department>,
    private readonly dataSource: DataSource,
    private readonly sessionsService: SessionsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  toPublic(user: User): PublicUser {
    return {
      id: user.id,
      login: user.login,
      role: user.role,
      fullName: user.fullName,
      pinfl: user.pinfl,
      phone: user.phone,
      email: user.email,
      position: user.position,
      baseSalary: Number(user.baseSalary ?? 0),
      photoFileId: user.photoFileId,
      passportFileIds: user.passportFileIds ?? [],
      status: user.status,
      hireDate: user.hireDate,
      terminatedAt: user.terminatedAt,
      birthDate: user.birthDate,
      address: user.address,
      mustChangePassword: user.mustChangePassword,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  findByLoginWithPassword(login: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('LOWER(user.login) = LOWER(:login)', { login })
      .getOne();
  }

  findByIdOrNull(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findByIdOrFail(id: string): Promise<User> {
    const user = await this.findByIdOrNull(id);
    if (!user) throw new NotFoundException(ErrorCodes.USER_NOT_FOUND);
    return user;
  }

  findManyByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.userRepository.find({ where: { id: In(ids) } });
  }

  async markLogin(id: string): Promise<void> {
    await this.userRepository.update({ id }, { lastLoginAt: new Date() });
  }

  async setPasswordHash(id: string, passwordHash: string, mustChangePassword: boolean): Promise<void> {
    await this.userRepository.update({ id }, { passwordHash, mustChangePassword });
  }

  async activeAssignments(userId: string) {
    const assignments = await this.assignmentRepository.find({
      where: { userId, isActive: true },
      relations: { department: true },
      order: { createdAt: 'ASC' },
    });
    return assignments.map((assignment) => ({
      id: assignment.id,
      departmentId: assignment.departmentId,
      departmentName: assignment.department?.name,
      departmentCode: assignment.department?.code,
      rate: assignment.rate,
      startDate: assignment.startDate,
      isHead: assignment.department?.headUserId === userId,
    }));
  }

  async list(query: ListUsersDto, restrictToRoles?: UserRole[], restrictToDepartmentIds?: string[]) {
    const builder = this.userRepository.createQueryBuilder('user');
    if (query.search) {
      builder.andWhere(
        new Brackets((qb) => {
          qb.where('user.fullName ILIKE :search', { search: `%${query.search}%` })
            .orWhere('user.login ILIKE :search', { search: `%${query.search}%` })
            .orWhere('user.pinfl ILIKE :search', { search: `%${query.search}%` })
            .orWhere('user.position ILIKE :search', { search: `%${query.search}%` });
        }),
      );
    }
    if (query.role) builder.andWhere('user.role = :role', { role: query.role });
    if (restrictToRoles) builder.andWhere('user.role IN (:...restrictToRoles)', { restrictToRoles });
    if (query.status) builder.andWhere('user.status = :status', { status: query.status });
    if (query.departmentId || restrictToDepartmentIds) {
      const departmentIds = query.departmentId
        ? restrictToDepartmentIds
          ? restrictToDepartmentIds.filter((id) => id === query.departmentId)
          : [query.departmentId]
        : (restrictToDepartmentIds ?? []);
      if (departmentIds.length === 0) return { items: [], total: 0, page: query.page, limit: query.limit };
      builder.andWhere(
        `user.id IN (SELECT a."userId" FROM department_assignments a WHERE a."isActive" = true AND a."departmentId" IN (:...departmentIds))`,
        { departmentIds },
      );
    }
    builder.orderBy(`user.${query.sortBy}`, query.sortOrder).addOrderBy('user.createdAt', 'DESC');
    builder.skip(query.skip).take(query.limit);
    const [users, total] = await builder.getManyAndCount();
    const assignments = users.length
      ? await this.assignmentRepository.find({
          where: { userId: In(users.map((user) => user.id)), isActive: true },
          relations: { department: true },
        })
      : [];
    const grouped = new Map<string, Array<{ departmentId: string; departmentName: string; rate: number }>>();
    for (const assignment of assignments) {
      const list = grouped.get(assignment.userId) ?? [];
      list.push({ departmentId: assignment.departmentId, departmentName: assignment.department?.name, rate: assignment.rate });
      grouped.set(assignment.userId, list);
    }
    return {
      items: users.map((user) => ({ ...this.toPublic(user), assignments: grouped.get(user.id) ?? [] })),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async getDetailed(id: string) {
    const user = await this.findByIdOrFail(id);
    const [assignments, statusHistory] = await Promise.all([
      this.activeAssignments(id),
      this.statusHistoryRepository.find({ where: { userId: id }, order: { createdAt: 'DESC' }, take: 50 }),
    ]);
    return { ...this.toPublic(user), assignments, statusHistory };
  }

  async createHr(dto: CreateHrDto): Promise<PublicUser> {
    await this.assertLoginFree(dto.login);
    const user = this.userRepository.create({
      login: dto.login,
      passwordHash: await hashPassword(dto.password),
      role: UserRole.HR,
      fullName: dto.fullName,
      phone: dto.phone ?? null,
      email: dto.email ?? null,
      position: dto.position ?? "Xodimlar bo'limi",
      hireDate: todayIsoDate(),
      mustChangePassword: true,
    });
    return this.toPublic(await this.userRepository.save(user));
  }

  async createEmployee(dto: CreateEmployeeDto, actor: AuthenticatedUser) {
    await this.assertLoginFree(dto.login);
    if (dto.pinfl) await this.assertPinflFree(dto.pinfl);
    if (dto.assignments?.length) {
      this.assertRateWithinLimit(dto.assignments);
      await this.assertDepartmentsExist(dto.assignments.map((item) => item.departmentId));
    }
    const created = await this.dataSource.transaction(async (manager) => {
      const user = await manager.getRepository(User).save(
        manager.getRepository(User).create({
          login: dto.login,
          passwordHash: await hashPassword(dto.password),
          role: UserRole.EMPLOYEE,
          fullName: dto.fullName,
          pinfl: dto.pinfl ?? null,
          phone: dto.phone ?? null,
          email: dto.email ?? null,
          position: dto.position ?? null,
          baseSalary: String(dto.baseSalary ?? 0),
          photoFileId: dto.photoFileId ?? null,
          passportFileIds: dto.passportFileIds ?? [],
          hireDate: dto.hireDate ?? todayIsoDate(),
          birthDate: dto.birthDate ?? null,
          address: dto.address ?? null,
          mustChangePassword: true,
        }),
      );
      for (const assignment of dto.assignments ?? []) {
        await manager.getRepository(DepartmentAssignment).save(
          manager.getRepository(DepartmentAssignment).create({
            userId: user.id,
            departmentId: assignment.departmentId,
            rate: assignment.rate,
            isActive: true,
            startDate: dto.hireDate ?? todayIsoDate(),
            assignedBy: actor.id,
          }),
        );
      }
      return user;
    });
    return this.getDetailed(created.id);
  }

  async updatePersonalData(id: string, dto: UpdateEmployeeDto, actor: AuthenticatedUser) {
    const user = await this.findByIdOrFail(id);
    this.assertCanEditPersonalData(user, actor);
    if (dto.pinfl && dto.pinfl !== user.pinfl) await this.assertPinflFree(dto.pinfl);
    Object.assign(user, {
      fullName: dto.fullName ?? user.fullName,
      pinfl: dto.pinfl ?? user.pinfl,
      phone: dto.phone ?? user.phone,
      email: dto.email ?? user.email,
      position: dto.position ?? user.position,
      baseSalary: dto.baseSalary !== undefined ? String(dto.baseSalary) : user.baseSalary,
      photoFileId: dto.photoFileId ?? user.photoFileId,
      passportFileIds: dto.passportFileIds ?? user.passportFileIds,
      hireDate: dto.hireDate ?? user.hireDate,
      birthDate: dto.birthDate ?? user.birthDate,
      address: dto.address ?? user.address,
    });
    await this.userRepository.save(user);
    return this.getDetailed(id);
  }

  async updateCredentials(id: string, dto: UpdateCredentialsDto, actor: AuthenticatedUser) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.id = :id', { id })
      .getOne();
    if (!user) throw new NotFoundException(ErrorCodes.USER_NOT_FOUND);
    if (actor.role !== UserRole.SUPERADMIN) throw new ForbiddenException(ErrorCodes.FORBIDDEN_ROLE);
    if (dto.login && dto.login.toLowerCase() !== user.login.toLowerCase()) {
      await this.assertLoginFree(dto.login);
      user.login = dto.login;
    }
    if (dto.password) {
      user.passwordHash = await hashPassword(dto.password);
      user.mustChangePassword = dto.mustChangePassword ?? true;
    } else if (dto.mustChangePassword !== undefined) {
      user.mustChangePassword = dto.mustChangePassword;
    }
    await this.userRepository.save(user);
    let terminatedSessions = 0;
    if (dto.terminateSessions !== false) {
      const revoked = await this.sessionsService.revokeAllForUser(user.id, 'CREDENTIALS_RESET_BY_ADMIN');
      revoked.forEach((sessionId) => this.notificationsService.emitSessionTerminated(sessionId, 'CREDENTIALS_RESET_BY_ADMIN'));
      terminatedSessions = revoked.length;
    }
    return { ...this.toPublic(user), terminatedSessions };
  }

  async lookup(query: string, limit = 10) {
    const users = await this.userRepository
      .createQueryBuilder('user')
      .where('CAST(user.id AS text) = :exact', { exact: query })
      .orWhere('user.login ILIKE :like', { like: `%${query}%` })
      .orWhere('user.fullName ILIKE :like', { like: `%${query}%` })
      .orWhere('user.pinfl ILIKE :like', { like: `%${query}%` })
      .orderBy('user.fullName', 'ASC')
      .take(limit)
      .getMany();
    return users.map((user) => this.toPublic(user));
  }

  async changeStatus(id: string, dto: ChangeStatusDto, actor: AuthenticatedUser) {
    const user = await this.findByIdOrFail(id);
    this.assertCanEditPersonalData(user, actor);
    if (dto.status === EmployeeStatus.SICK_LEAVE && !dto.medicalReason) {
      throw new BadRequestException(ErrorCodes.VALIDATION_FAILED);
    }
    if (user.status === dto.status) throw new BadRequestException(ErrorCodes.STATUS_INVALID_TRANSITION);
    if (user.status === EmployeeStatus.TERMINATED && dto.status !== EmployeeStatus.ACTIVE) {
      throw new BadRequestException(ErrorCodes.STATUS_INVALID_TRANSITION);
    }
    const previous = user.status;
    await this.dataSource.transaction(async (manager) => {
      user.status = dto.status;
      user.terminatedAt = dto.status === EmployeeStatus.TERMINATED ? (dto.startDate ?? todayIsoDate()) : null;
      await manager.getRepository(User).save(user);
      await manager.getRepository(EmployeeStatusHistory).save(
        manager.getRepository(EmployeeStatusHistory).create({
          userId: user.id,
          fromStatus: previous,
          toStatus: dto.status,
          reason: dto.reason ?? null,
          medicalReason: dto.medicalReason ?? null,
          startDate: dto.startDate ?? todayIsoDate(),
          endDate: dto.endDate ?? null,
          changedBy: actor.id,
        }),
      );
      if (dto.status === EmployeeStatus.TERMINATED) {
        await manager
          .getRepository(DepartmentAssignment)
          .update({ userId: user.id, isActive: true }, { isActive: false, endDate: todayIsoDate() });
      }
    });
    if ([EmployeeStatus.TERMINATED, EmployeeStatus.BLOCKED].includes(dto.status)) {
      const revoked = await this.sessionsService.revokeAllForUser(user.id, `STATUS_${dto.status}`);
      revoked.forEach((sessionId) => this.notificationsService.emitSessionTerminated(sessionId, `STATUS_${dto.status}`));
    } else {
      await this.notificationsService.notify({
        userId: user.id,
        type: NotificationType.STATUS_CHANGED,
        title: 'Holat o\'zgardi',
        body: `Sizning holatingiz ${previous} dan ${dto.status} ga o'zgartirildi.`,
        data: { from: previous, to: dto.status, startDate: dto.startDate, endDate: dto.endDate },
      });
    }
    return this.getDetailed(id);
  }

  async setAssignments(id: string, inputs: AssignmentInputDto[], actor: AuthenticatedUser) {
    const user = await this.findByIdOrFail(id);
    this.assertCanEditPersonalData(user, actor);
    this.assertRateWithinLimit(inputs);
    await this.assertDepartmentsExist(inputs.map((item) => item.departmentId));
    await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(DepartmentAssignment);
      const current = await repository.find({ where: { userId: id, isActive: true } });
      const incoming = new Map(inputs.map((item) => [item.departmentId, item.rate]));
      for (const assignment of current) {
        const nextRate = incoming.get(assignment.departmentId);
        if (nextRate === undefined) {
          assignment.isActive = false;
          assignment.endDate = todayIsoDate();
          await repository.save(assignment);
        } else if (nextRate !== assignment.rate) {
          assignment.rate = nextRate;
          await repository.save(assignment);
        }
        incoming.delete(assignment.departmentId);
      }
      for (const [departmentId, rate] of incoming.entries()) {
        await repository.save(
          repository.create({ userId: id, departmentId, rate, isActive: true, startDate: todayIsoDate(), assignedBy: actor.id }),
        );
      }
    });
    return this.getDetailed(id);
  }

  async transfer(id: string, dto: TransferEmployeeDto, actor: AuthenticatedUser) {
    const user = await this.findByIdOrFail(id);
    this.assertCanEditPersonalData(user, actor);
    const source = await this.assignmentRepository.findOne({ where: { userId: id, departmentId: dto.fromDepartmentId, isActive: true } });
    if (!source) throw new NotFoundException(ErrorCodes.ASSIGNMENT_NOT_FOUND);
    await this.assertDepartmentsExist([dto.toDepartmentId]);
    const others = await this.assignmentRepository.find({ where: { userId: id, isActive: true } });
    const nextRate = dto.rate ?? source.rate;
    const existingTargetRate = others.find((item) => item.departmentId === dto.toDepartmentId)?.rate ?? 0;
    const untouchedRate = others
      .filter((item) => item.id !== source.id && item.departmentId !== dto.toDepartmentId)
      .reduce((sum, item) => sum + item.rate, 0);
    const mergedTargetRate = existingTargetRate + nextRate;
    if (untouchedRate + mergedTargetRate > 100) throw new BadRequestException(ErrorCodes.RATE_EXCEEDS_LIMIT);
    await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(DepartmentAssignment);
      source.isActive = false;
      source.endDate = todayIsoDate();
      await repository.save(source);
      const existingTarget = others.find((item) => item.departmentId === dto.toDepartmentId);
      if (existingTarget) {
        existingTarget.rate = mergedTargetRate;
        await repository.save(existingTarget);
      } else {
        await repository.save(
          repository.create({ userId: id, departmentId: dto.toDepartmentId, rate: nextRate, isActive: true, startDate: todayIsoDate(), assignedBy: actor.id }),
        );
      }
      await manager.getRepository(EmployeeStatusHistory).save(
        manager.getRepository(EmployeeStatusHistory).create({
          userId: id,
          fromStatus: user.status,
          toStatus: user.status,
          reason: dto.reason ?? `Transfer ${dto.fromDepartmentId} -> ${dto.toDepartmentId}`,
          startDate: todayIsoDate(),
          changedBy: actor.id,
        }),
      );
    });
    await this.notificationsService.notify({
      userId: id,
      type: NotificationType.STATUS_CHANGED,
      title: 'Bo\'lim o\'zgardi',
      body: 'Siz boshqa bo\'limga o\'tkazildingiz.',
      data: { fromDepartmentId: dto.fromDepartmentId, toDepartmentId: dto.toDepartmentId, rate: mergedTargetRate },
    });
    return this.getDetailed(id);
  }

  statusHistory(id: string) {
    return this.statusHistoryRepository.find({ where: { userId: id }, order: { createdAt: 'DESC' } });
  }

  countByStatus(): Promise<Array<{ status: EmployeeStatus; count: string }>> {
    return this.userRepository
      .createQueryBuilder('user')
      .select('user.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('user.role IN (:...roles)', { roles: [UserRole.EMPLOYEE, UserRole.DEPARTMENT_HEAD] })
      .groupBy('user.status')
      .getRawMany();
  }

  countHiredBetween(start: string, end: string): Promise<number> {
    return this.userRepository
      .createQueryBuilder('user')
      .where('user.hireDate BETWEEN :start AND :end', { start, end })
      .andWhere('user.role IN (:...roles)', { roles: [UserRole.EMPLOYEE, UserRole.DEPARTMENT_HEAD] })
      .getCount();
  }

  countTerminatedBetween(start: string, end: string): Promise<number> {
    return this.userRepository
      .createQueryBuilder('user')
      .where('user.terminatedAt BETWEEN :start AND :end', { start, end })
      .getCount();
  }

  private assertCanEditPersonalData(target: User, actor: AuthenticatedUser) {
    if (actor.role === UserRole.SUPERADMIN) return;
    if (actor.role === UserRole.HR && !PRIVILEGED_ROLES.includes(target.role)) return;
    throw new ForbiddenException(ErrorCodes.HR_EDIT_ONLY_SUPERADMIN);
  }

  private assertRateWithinLimit(assignments: AssignmentInputDto[]) {
    const unique = new Set(assignments.map((item) => item.departmentId));
    if (unique.size !== assignments.length) throw new BadRequestException(ErrorCodes.VALIDATION_FAILED);
    const total = assignments.reduce((sum, item) => sum + item.rate, 0);
    if (total > 100) throw new BadRequestException(ErrorCodes.RATE_EXCEEDS_LIMIT);
  }

  private async assertDepartmentsExist(ids: string[]) {
    const unique = [...new Set(ids)];
    const count = await this.departmentRepository.count({ where: { id: In(unique), isActive: true } });
    if (count !== unique.length) throw new NotFoundException(ErrorCodes.DEPARTMENT_NOT_FOUND);
  }

  private async assertLoginFree(login: string) {
    const existing = await this.userRepository
      .createQueryBuilder('user')
      .where('LOWER(user.login) = LOWER(:login)', { login })
      .getOne();
    if (existing) throw new ConflictException(ErrorCodes.LOGIN_TAKEN);
  }

  private async assertPinflFree(pinfl: string) {
    const existing = await this.userRepository.findOne({ where: { pinfl } });
    if (existing) throw new ConflictException(ErrorCodes.PINFL_TAKEN);
  }
}
