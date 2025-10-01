import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema';

export interface AuditEntryInput {
  actorId: string | null;
  actorLogin: string | null;
  actorRole: string | null;
  action: string;
  method: string;
  path: string;
  entity: string | null;
  entityId: string | null;
  statusCode: number;
  durationMs: number;
  ip: string;
  userAgent: string;
  payload: Record<string, unknown> | null;
  query: Record<string, unknown> | null;
  errorMessage: string | null;
}

export interface AuditFilter {
  actorId?: string;
  action?: string;
  entity?: string;
  entityId?: string;
  method?: string;
  from?: string;
  to?: string;
  onlyErrors?: boolean;
}

@Injectable()
export class AuditService {
  constructor(@InjectModel(AuditLog.name) private readonly auditModel: Model<AuditLogDocument>) {}

  async record(entry: AuditEntryInput): Promise<void> {
    await this.auditModel.create(entry);
  }

  async list(filter: AuditFilter, page: number, limit: number) {
    const query: Record<string, unknown> = {};
    if (filter.actorId) query.actorId = filter.actorId;
    if (filter.action) query.action = { $regex: filter.action, $options: 'i' };
    if (filter.entity) query.entity = filter.entity;
    if (filter.entityId) query.entityId = filter.entityId;
    if (filter.method) query.method = filter.method.toUpperCase();
    if (filter.onlyErrors) query.statusCode = { $gte: 400 };
    if (filter.from || filter.to) {
      query.createdAt = {
        ...(filter.from ? { $gte: new Date(filter.from) } : {}),
        ...(filter.to ? { $lte: new Date(`${filter.to}T23:59:59.999Z`) } : {}),
      };
    }
    const [items, total] = await Promise.all([
      this.auditModel.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      this.auditModel.countDocuments(query),
    ]);
    return {
      items: items.map((item) => ({ ...item, id: String(item._id), _id: undefined, __v: undefined })),
      total,
      page,
      limit,
    };
  }

  async actionsSummary(since: Date) {
    return this.auditModel.aggregate<{ _id: string; count: number }>([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$entity', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);
  }

  countSince(since: Date): Promise<number> {
    return this.auditModel.countDocuments({ createdAt: { $gte: since } });
  }

  recentForUser(userId: string, limit: number) {
    return this.auditModel.find({ actorId: userId }).sort({ createdAt: -1 }).limit(limit).lean();
  }
}
