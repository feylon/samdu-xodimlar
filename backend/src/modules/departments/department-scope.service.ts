import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { UserRole } from '../../common/enums';
import { ErrorCodes } from '../../common/errors/error-codes';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { DepartmentAssignment } from './entities/department-assignment.entity';
import { Department } from './entities/department.entity';

@Injectable()
export class DepartmentScopeService {
  constructor(
    @InjectRepository(Department) private readonly departmentRepository: Repository<Department>,
    @InjectRepository(DepartmentAssignment) private readonly assignmentRepository: Repository<DepartmentAssignment>,
  ) {}

  async managedDepartmentIds(headUserId: string): Promise<string[]> {
    const departments = await this.departmentRepository.find({ where: { headUserId, isActive: true }, select: { id: true } });
    return departments.map((department) => department.id);
  }

  async memberDepartmentIds(userId: string): Promise<string[]> {
    const assignments = await this.assignmentRepository.find({ where: { userId, isActive: true }, select: { departmentId: true } });
    return [...new Set(assignments.map((assignment) => assignment.departmentId))];
  }

  async managedUserIds(headUserId: string): Promise<string[]> {
    const departmentIds = await this.managedDepartmentIds(headUserId);
    if (departmentIds.length === 0) return [];
    const assignments = await this.assignmentRepository.find({
      where: { departmentId: In(departmentIds), isActive: true },
      select: { userId: true },
    });
    return [...new Set(assignments.map((assignment) => assignment.userId))];
  }

  async departmentMemberIds(departmentId: string): Promise<string[]> {
    const assignments = await this.assignmentRepository.find({ where: { departmentId, isActive: true }, select: { userId: true } });
    return [...new Set(assignments.map((assignment) => assignment.userId))];
  }

  async isUserInDepartment(userId: string, departmentId: string): Promise<boolean> {
    const count = await this.assignmentRepository.count({ where: { userId, departmentId, isActive: true } });
    return count > 0;
  }

  async managesDepartment(headUserId: string, departmentId: string): Promise<boolean> {
    const count = await this.departmentRepository.count({ where: { id: departmentId, headUserId, isActive: true } });
    return count > 0;
  }

  async assertManagesDepartment(actor: AuthenticatedUser, departmentId: string): Promise<void> {
    if (actor.role === UserRole.SUPERADMIN || actor.role === UserRole.HR) return;
    if (actor.role === UserRole.DEPARTMENT_HEAD && (await this.managesDepartment(actor.id, departmentId))) return;
    throw new ForbiddenException(ErrorCodes.FORBIDDEN_SCOPE);
  }

  async assertManagesUser(actor: AuthenticatedUser, userId: string): Promise<void> {
    if (actor.role === UserRole.SUPERADMIN || actor.role === UserRole.HR) return;
    if (actor.role === UserRole.DEPARTMENT_HEAD) {
      const managed = await this.managedUserIds(actor.id);
      if (managed.includes(userId)) return;
    }
    throw new ForbiddenException(ErrorCodes.FORBIDDEN_SCOPE);
  }

  async assertCanViewUser(actor: AuthenticatedUser, userId: string): Promise<void> {
    if (actor.id === userId) return;
    await this.assertManagesUser(actor, userId);
  }

  async assertCanViewDepartment(actor: AuthenticatedUser, departmentId: string): Promise<void> {
    if (actor.role === UserRole.SUPERADMIN || actor.role === UserRole.HR) return;
    if (actor.role === UserRole.DEPARTMENT_HEAD && (await this.managesDepartment(actor.id, departmentId))) return;
    if (await this.isUserInDepartment(actor.id, departmentId)) return;
    throw new ForbiddenException(ErrorCodes.FORBIDDEN_SCOPE);
  }

  async primaryDepartmentId(userId: string): Promise<string | null> {
    const assignment = await this.assignmentRepository.findOne({
      where: { userId, isActive: true },
      order: { rate: 'DESC', createdAt: 'ASC' },
    });
    return assignment?.departmentId ?? null;
  }

  async visibleDepartmentIds(actor: AuthenticatedUser): Promise<string[] | null> {
    if (actor.role === UserRole.SUPERADMIN || actor.role === UserRole.HR) return null;
    const managed = actor.role === UserRole.DEPARTMENT_HEAD ? await this.managedDepartmentIds(actor.id) : [];
    const member = await this.memberDepartmentIds(actor.id);
    return [...new Set([...managed, ...member])];
  }
}
