import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuid } from 'uuid';
import { ClientType } from '../../common/enums';
import { ErrorCodes } from '../../common/errors/error-codes';
import { RequestMeta } from '../../common/utils/request-meta.util';
import { sha256 } from '../../common/utils/token.util';
import { LoginHistory, LoginHistoryDocument } from './schemas/login-history.schema';
import { Session, SessionDocument } from './schemas/session.schema';

export interface CreateSessionInput {
  userId: string;
  client: ClientType;
  meta: RequestMeta;
  refreshToken: string;
  expiresAt: Date;
  deviceName?: string;
  platform?: string;
  pushToken?: string;
}

export interface LoginAttemptInput {
  userId: string | null;
  login: string;
  success: boolean;
  failureReason?: string;
  client: ClientType;
  meta: RequestMeta;
  sessionId?: string;
}

@Injectable()
export class SessionsService {
  constructor(
    @InjectModel(Session.name) private readonly sessionModel: Model<SessionDocument>,
    @InjectModel(LoginHistory.name) private readonly loginHistoryModel: Model<LoginHistoryDocument>,
  ) {}

  async create(input: CreateSessionInput): Promise<SessionDocument> {
    return this.sessionModel.create({
      sessionId: uuid(),
      userId: input.userId,
      client: input.client,
      refreshTokenHash: sha256(input.refreshToken),
      ip: input.meta.ip,
      userAgent: input.meta.userAgent,
      device: input.meta.device,
      browser: input.meta.browser,
      os: input.meta.os,
      deviceName: input.deviceName ?? null,
      platform: input.platform ?? null,
      pushToken: input.pushToken ?? null,
      expiresAt: input.expiresAt,
      lastActiveAt: new Date(),
    });
  }

  findActive(sessionId: string): Promise<SessionDocument | null> {
    return this.sessionModel.findOne({ sessionId, revokedAt: null, expiresAt: { $gt: new Date() } });
  }

  async touch(sessionId: string): Promise<void> {
    await this.sessionModel.updateOne({ sessionId }, { $set: { lastActiveAt: new Date() } });
  }

  async rotateRefreshToken(sessionId: string, newRefreshToken: string, expiresAt: Date): Promise<void> {
    await this.sessionModel.updateOne(
      { sessionId },
      { $set: { refreshTokenHash: sha256(newRefreshToken), expiresAt, lastActiveAt: new Date() } },
    );
  }

  matchesRefreshToken(session: Session, refreshToken: string): boolean {
    return session.refreshTokenHash === sha256(refreshToken);
  }

  async revoke(sessionId: string, reason: string): Promise<SessionDocument | null> {
    return this.sessionModel.findOneAndUpdate(
      { sessionId, revokedAt: null },
      { $set: { revokedAt: new Date(), revokedReason: reason } },
      { new: true },
    );
  }

  async revokeOwned(userId: string, sessionId: string, reason: string): Promise<SessionDocument> {
    const session = await this.sessionModel.findOne({ sessionId, userId });
    if (!session) throw new NotFoundException(ErrorCodes.SESSION_NOT_FOUND);
    if (!session.revokedAt) {
      session.revokedAt = new Date();
      session.revokedReason = reason;
      await session.save();
    }
    return session;
  }

  async revokeAllForUser(userId: string, reason: string, exceptSessionId?: string): Promise<string[]> {
    const filter: Record<string, unknown> = { userId, revokedAt: null };
    if (exceptSessionId) filter.sessionId = { $ne: exceptSessionId };
    const sessions = await this.sessionModel.find(filter).select('sessionId');
    await this.sessionModel.updateMany(filter, { $set: { revokedAt: new Date(), revokedReason: reason } });
    return sessions.map((session) => session.sessionId);
  }

  listActiveForUser(userId: string) {
    return this.sessionModel
      .find({ userId, revokedAt: null, expiresAt: { $gt: new Date() } })
      .sort({ lastActiveAt: -1 })
      .lean();
  }

  listActive(filter: { userId?: string; client?: ClientType }, page: number, limit: number) {
    const query: Record<string, unknown> = { revokedAt: null, expiresAt: { $gt: new Date() } };
    if (filter.userId) query.userId = filter.userId;
    if (filter.client) query.client = filter.client;
    return Promise.all([
      this.sessionModel.find(query).sort({ lastActiveAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      this.sessionModel.countDocuments(query),
    ]).then(([items, total]) => ({ items: items.map((item) => this.serializeSession(item)), total, page, limit }));
  }

  countActive(userId?: string): Promise<number> {
    const query: Record<string, unknown> = { revokedAt: null, expiresAt: { $gt: new Date() } };
    if (userId) query.userId = userId;
    return this.sessionModel.countDocuments(query);
  }

  async recordLoginAttempt(input: LoginAttemptInput): Promise<void> {
    await this.loginHistoryModel.create({
      userId: input.userId,
      login: input.login,
      success: input.success,
      failureReason: input.failureReason ?? null,
      client: input.client,
      ip: input.meta.ip,
      userAgent: input.meta.userAgent,
      device: input.meta.device,
      browser: input.meta.browser,
      os: input.meta.os,
      sessionId: input.sessionId ?? null,
    });
  }

  async loginHistory(filter: { userId?: string; login?: string; success?: boolean }, page: number, limit: number) {
    const query: Record<string, unknown> = {};
    if (filter.userId) query.userId = filter.userId;
    if (filter.login) query.login = filter.login;
    if (filter.success !== undefined) query.success = filter.success;
    const [items, total] = await Promise.all([
      this.loginHistoryModel.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      this.loginHistoryModel.countDocuments(query),
    ]);
    return {
      items: items.map((item) => ({ id: String(item._id), ...item, _id: undefined, __v: undefined })),
      total,
      page,
      limit,
    };
  }

  countLoginsSince(since: Date): Promise<number> {
    return this.loginHistoryModel.countDocuments({ success: true, createdAt: { $gte: since } });
  }

  countFailedLoginsSince(since: Date): Promise<number> {
    return this.loginHistoryModel.countDocuments({ success: false, createdAt: { $gte: since } });
  }

  serializeSession(session: Session & { _id?: unknown }, currentSessionId?: string) {
    return {
      id: session.sessionId,
      userId: session.userId,
      client: session.client,
      ip: session.ip,
      userAgent: session.userAgent,
      device: session.device,
      browser: session.browser,
      os: session.os,
      deviceName: session.deviceName,
      platform: session.platform,
      createdAt: session.createdAt,
      lastActiveAt: session.lastActiveAt,
      expiresAt: session.expiresAt,
      isCurrent: currentSessionId ? session.sessionId === currentSessionId : undefined,
    };
  }
}
