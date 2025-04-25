import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotificationType } from '../../common/enums';
import { ErrorCodes } from '../../common/errors/error-codes';
import { NotificationsGateway } from './notifications.gateway';
import { Notification, NotificationDocument } from './schemas/notification.schema';

export interface NotifyInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name) private readonly notificationModel: Model<NotificationDocument>,
    private readonly gateway: NotificationsGateway,
  ) {}

  async notify(input: NotifyInput): Promise<NotificationDocument> {
    const created = await this.notificationModel.create({
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data ?? {},
    });
    this.gateway.emitToUser(input.userId, 'notification', this.serialize(created));
    const unread = await this.countUnread(input.userId);
    this.gateway.emitToUser(input.userId, 'notification.unread', { count: unread });
    return created;
  }

  async notifyMany(userIds: string[], payload: Omit<NotifyInput, 'userId'>): Promise<void> {
    await Promise.all([...new Set(userIds)].map((userId) => this.notify({ ...payload, userId })));
  }

  emitSecurityAlert(userId: string, payload: Record<string, unknown>) {
    this.gateway.emitToUser(userId, 'security.alert', payload);
  }

  emitSessionTerminated(sessionId: string, reason: string) {
    this.gateway.emitToSession(sessionId, 'session.terminated', { reason });
  }

  async list(userId: string, unreadOnly: boolean, page: number, limit: number) {
    const filter: Record<string, unknown> = { userId };
    if (unreadOnly) filter.readAt = null;
    const [items, total] = await Promise.all([
      this.notificationModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      this.notificationModel.countDocuments(filter),
    ]);
    return { items: items.map((item) => this.serialize(item)), total, page, limit };
  }

  countUnread(userId: string): Promise<number> {
    return this.notificationModel.countDocuments({ userId, readAt: null });
  }

  async markRead(userId: string, id: string) {
    const updated = await this.notificationModel.findOneAndUpdate(
      { _id: id, userId },
      { $set: { readAt: new Date() } },
      { new: true },
    );
    if (!updated) throw new NotFoundException(ErrorCodes.NOTIFICATION_NOT_FOUND);
    return this.serialize(updated);
  }

  async markAllRead(userId: string) {
    const result = await this.notificationModel.updateMany({ userId, readAt: null }, { $set: { readAt: new Date() } });
    return { updated: result.modifiedCount };
  }

  private serialize(document: NotificationDocument | (Notification & { _id: unknown })) {
    const plain = 'toObject' in document ? document.toObject() : document;
    return {
      id: String(plain._id),
      userId: plain.userId,
      type: plain.type,
      title: plain.title,
      body: plain.body,
      data: plain.data,
      readAt: plain.readAt,
      createdAt: plain.createdAt,
    };
  }
}
