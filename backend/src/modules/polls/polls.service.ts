import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { NotificationType, UserRole } from '../../common/enums';
import { ErrorCodes } from '../../common/errors/error-codes';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { DepartmentScopeService } from '../departments/department-scope.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreatePollDto } from './dto/create-poll.dto';
import { Poll, PollDocument } from './schemas/poll.schema';

@Injectable()
export class PollsService {
  constructor(
    @InjectModel(Poll.name) private readonly pollModel: Model<PollDocument>,
    private readonly scopeService: DepartmentScopeService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(dto: CreatePollDto, actor: AuthenticatedUser) {
    if (dto.departmentId) {
      await this.scopeService.assertManagesDepartment(actor, dto.departmentId);
    } else if (actor.role === UserRole.DEPARTMENT_HEAD) {
      throw new ForbiddenException(ErrorCodes.FORBIDDEN_SCOPE);
    }
    const poll = await this.pollModel.create({
      title: dto.title,
      description: dto.description ?? null,
      options: dto.options.map((label, index) => ({ index, label })),
      departmentId: dto.departmentId ?? null,
      createdBy: actor.id,
      createdByName: actor.fullName,
      isAnonymous: dto.isAnonymous ?? false,
      closesAt: dto.closesAt ? new Date(dto.closesAt) : null,
    });
    if (dto.departmentId) {
      const members = await this.scopeService.departmentMemberIds(dto.departmentId);
      await this.notificationsService.notifyMany(
        members.filter((id) => id !== actor.id),
        {
          type: NotificationType.POLL_CREATED,
          title: 'Yangi so\'rovnoma',
          body: poll.title,
          data: { pollId: String(poll._id), departmentId: dto.departmentId },
        },
      );
    }
    return this.serialize(poll, actor);
  }

  async list(pagination: PaginationDto, actor: AuthenticatedUser, departmentId?: string, activeOnly = false) {
    const filter: Record<string, unknown> = {};
    const visible = await this.scopeService.visibleDepartmentIds(actor);
    if (visible) filter.$or = [{ departmentId: null }, { departmentId: { $in: visible } }];
    if (departmentId) filter.departmentId = departmentId;
    if (activeOnly) filter.closedAt = null;
    const [items, total] = await Promise.all([
      this.pollModel.find(filter).sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.limit),
      this.pollModel.countDocuments(filter),
    ]);
    return { items: items.map((poll) => this.serialize(poll, actor)), total, page: pagination.page, limit: pagination.limit };
  }

  async getOne(id: string, actor: AuthenticatedUser) {
    const poll = await this.findOrFail(id);
    if (poll.departmentId) await this.scopeService.assertCanViewDepartment(actor, poll.departmentId);
    return this.serialize(poll, actor);
  }

  async vote(id: string, optionIndex: number, actor: AuthenticatedUser) {
    const poll = await this.findOrFail(id);
    if (poll.departmentId) await this.scopeService.assertCanViewDepartment(actor, poll.departmentId);
    if (this.isClosed(poll)) throw new BadRequestException(ErrorCodes.POLL_CLOSED);
    if (!poll.options.some((option) => option.index === optionIndex)) throw new BadRequestException(ErrorCodes.POLL_INVALID_OPTION);
    if (poll.votes.some((vote) => vote.userId === actor.id)) throw new BadRequestException(ErrorCodes.POLL_ALREADY_VOTED);
    poll.votes.push({ userId: actor.id, optionIndex, votedAt: new Date() });
    await poll.save();
    return this.serialize(poll, actor);
  }

  async close(id: string, actor: AuthenticatedUser) {
    const poll = await this.findOrFail(id);
    await this.assertCanManage(poll, actor);
    poll.closedAt = new Date();
    await poll.save();
    return this.serialize(poll, actor);
  }

  async remove(id: string, actor: AuthenticatedUser) {
    const poll = await this.findOrFail(id);
    await this.assertCanManage(poll, actor);
    await poll.deleteOne();
    return { success: true };
  }

  countActive(departmentIds: string[] | null): Promise<number> {
    const filter: Record<string, unknown> = { closedAt: null };
    if (departmentIds) filter.$or = [{ departmentId: null }, { departmentId: { $in: departmentIds } }];
    return this.pollModel.countDocuments(filter);
  }

  private async findOrFail(id: string): Promise<PollDocument> {
    const poll = await this.pollModel.findById(id).catch(() => null);
    if (!poll) throw new NotFoundException(ErrorCodes.POLL_NOT_FOUND);
    return poll;
  }

  private async assertCanManage(poll: PollDocument, actor: AuthenticatedUser) {
    if (actor.role === UserRole.SUPERADMIN || actor.role === UserRole.HR || poll.createdBy === actor.id) return;
    if (poll.departmentId) await this.scopeService.assertManagesDepartment(actor, poll.departmentId);
    else throw new ForbiddenException(ErrorCodes.FORBIDDEN_SCOPE);
  }

  private isClosed(poll: Poll): boolean {
    if (poll.closedAt) return true;
    return Boolean(poll.closesAt && poll.closesAt.getTime() < Date.now());
  }

  private serialize(poll: PollDocument, actor: AuthenticatedUser) {
    const closed = this.isClosed(poll);
    const canSeeResults = closed || poll.createdBy === actor.id || actor.role === UserRole.HR || actor.role === UserRole.SUPERADMIN || actor.role === UserRole.DEPARTMENT_HEAD;
    const myVote = poll.votes.find((vote) => vote.userId === actor.id);
    const counts = poll.options.map((option) => ({
      index: option.index,
      label: option.label,
      votes: canSeeResults || myVote ? poll.votes.filter((vote) => vote.optionIndex === option.index).length : null,
      voters: !poll.isAnonymous && canSeeResults ? poll.votes.filter((vote) => vote.optionIndex === option.index).map((vote) => vote.userId) : undefined,
    }));
    return {
      id: String(poll._id),
      title: poll.title,
      description: poll.description,
      departmentId: poll.departmentId,
      createdBy: poll.createdBy,
      createdByName: poll.createdByName,
      isAnonymous: poll.isAnonymous,
      closesAt: poll.closesAt,
      closedAt: poll.closedAt,
      isClosed: closed,
      totalVotes: poll.votes.length,
      myVote: myVote?.optionIndex ?? null,
      options: counts,
      createdAt: poll.createdAt,
      updatedAt: poll.updatedAt,
    };
  }
}
