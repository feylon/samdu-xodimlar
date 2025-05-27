import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { UserRole } from '../../common/enums';
import { ErrorCodes } from '../../common/errors/error-codes';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { todayIsoDate } from '../../common/utils/date.util';
import { User } from '../users/entities/user.entity';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { DepartmentAssignment } from './entities/department-assignment.entity';
import { Department } from './entities/department.entity';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department) private readonly departmentRepository: Repository<Department>,
    @InjectRepository(DepartmentAssignment) private readonly assignmentRepository: Repository<DepartmentAssignment>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  async list(includeInactive = false, restrictToIds?: string[] | null) {
    const where: Record<string, unknown> = {};
    if (!includeInactive) where.isActive = true;
    if (restrictToIds) {
      if (restrictToIds.length === 0) return [];
      where.id = In(restrictToIds);
    }
    const departments = await this.departmentRepository.find({ where, relations: { head: true }, order: { name: 'ASC' } });
    const counts = await this.assignmentRepository
      .createQueryBuilder('assignment')
      .select('assignment.departmentId', 'departmentId')
      .addSelect('COUNT(DISTINCT assignment.userId)', 'members')
      .addSelect('COALESCE(SUM(assignment.rate), 0)', 'totalRate')
      .where('assignment.isActive = true')
      .groupBy('assignment.departmentId')
      .getRawMany<{ departmentId: string; members: string; totalRate: string }>();
    const countMap = new Map(counts.map((row) => [row.departmentId, row]));
    return departments.map((department) => this.serialize(department, countMap.get(department.id)));
  }

  async findOrFail(id: string): Promise<Department> {
    const department = await this.departmentRepository.findOne({ where: { id }, relations: { head: true } });
    if (!department) throw new NotFoundException(ErrorCodes.DEPARTMENT_NOT_FOUND);
    return department;
  }

  async getDetailed(id: string) {
    const department = await this.findOrFail(id);
    const assignments = await this.assignmentRepository.find({
      where: { departmentId: id, isActive: true },
      relations: { user: true },
      order: { createdAt: 'ASC' },
    });
    return {
      ...this.serialize(department),
      members: assignments.map((assignment) => ({
        assignmentId: assignment.id,
        userId: assignment.userId,
        fullName: assignment.user?.fullName,
        login: assignment.user?.login,
        position: assignment.user?.position,
        photoFileId: assignment.user?.photoFileId,
        status: assignment.user?.status,
        role: assignment.user?.role,
        rate: assignment.rate,
        startDate: assignment.startDate,
        isHead: department.headUserId === assignment.userId,
      })),
    };
  }

  async create(dto: CreateDepartmentDto, actor: AuthenticatedUser) {
    await this.assertCodeFree(dto.code);
    const department = await this.departmentRepository.save(
      this.departmentRepository.create({ name: dto.name, code: dto.code, description: dto.description ?? null }),
    );
    if (dto.headUserId) await this.setHead(department.id, dto.headUserId, actor);
    return this.getDetailed(department.id);
  }

  async update(id: string, dto: UpdateDepartmentDto) {
    const department = await this.findOrFail(id);
    if (dto.code && dto.code !== department.code) await this.assertCodeFree(dto.code);
    Object.assign(department, {
      name: dto.name ?? department.name,
      code: dto.code ?? department.code,
      description: dto.description ?? department.description,
      isActive: dto.isActive ?? department.isActive,
    });
    await this.departmentRepository.save(department);
    return this.getDetailed(id);
  }

  async setHead(id: string, userId: string | null | undefined, actor: AuthenticatedUser) {
    const department = await this.findOrFail(id);
    const previousHeadId = department.headUserId;
    await this.dataSource.transaction(async (manager) => {
      const departments = manager.getRepository(Department);
      const users = manager.getRepository(User);
      const assignments = manager.getRepository(DepartmentAssignment);
      if (userId) {
        const user = await users.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException(ErrorCodes.USER_NOT_FOUND);
        if (user.role === UserRole.EMPLOYEE) {
          user.role = UserRole.DEPARTMENT_HEAD;
          await users.save(user);
        }
        const existing = await assignments.findOne({ where: { userId, departmentId: id, isActive: true } });
        if (!existing) {
          const otherRates = await assignments.find({ where: { userId, isActive: true } });
          const used = otherRates.reduce((sum, item) => sum + item.rate, 0);
          const available = Math.max(0, 100 - used);
          if (available >= 25) {
            await assignments.save(
              assignments.create({
                userId,
                departmentId: id,
                rate: Math.min(100, Math.floor(available / 25) * 25),
                isActive: true,
                startDate: todayIsoDate(),
                assignedBy: actor.id,
              }),
            );
          }
        }
      }
      department.headUserId = userId ?? null;
      await departments.save(department);
      if (previousHeadId && previousHeadId !== userId) {
        const stillHeads = await departments.count({ where: { headUserId: previousHeadId, isActive: true } });
        if (stillHeads === 0) {
          await users.update({ id: previousHeadId, role: UserRole.DEPARTMENT_HEAD }, { role: UserRole.EMPLOYEE });
        }
      }
    });
    return this.getDetailed(id);
  }

  private async assertCodeFree(code: string) {
    const existing = await this.departmentRepository.findOne({ where: { code } });
    if (existing) throw new ConflictException(ErrorCodes.DEPARTMENT_CODE_TAKEN);
  }

  private serialize(department: Department, stats?: { members: string; totalRate: string }) {
    return {
      id: department.id,
      name: department.name,
      code: department.code,
      description: department.description,
      isActive: department.isActive,
      headUserId: department.headUserId,
      head: department.head
        ? { id: department.head.id, fullName: department.head.fullName, login: department.head.login, photoFileId: department.head.photoFileId }
        : null,
      memberCount: Number(stats?.members ?? 0),
      totalRate: Number(stats?.totalRate ?? 0),
      createdAt: department.createdAt,
      updatedAt: department.updatedAt,
    };
  }
}
