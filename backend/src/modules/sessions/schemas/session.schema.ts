import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ClientType } from '../../../common/enums';

@Schema({ collection: 'sessions', timestamps: true })
export class Session {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, unique: true })
  sessionId: string;

  @Prop({ required: true })
  refreshTokenHash: string;

  @Prop({ required: true, enum: ClientType, default: ClientType.WEB })
  client: ClientType;

  @Prop({ default: 'unknown' })
  ip: string;

  @Prop({ default: 'unknown' })
  userAgent: string;

  @Prop({ default: 'unknown' })
  device: string;

  @Prop({ default: 'unknown' })
  browser: string;

  @Prop({ default: 'unknown' })
  os: string;

  @Prop({ type: String, default: null })
  deviceName: string | null;

  @Prop({ type: String, default: null })
  platform: string | null;

  @Prop({ type: String, default: null })
  pushToken: string | null;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: () => new Date() })
  lastActiveAt: Date;

  @Prop({ type: Date, default: null })
  revokedAt: Date | null;

  @Prop({ type: String, default: null })
  revokedReason: string | null;

  createdAt: Date;
  updatedAt: Date;
}

export type SessionDocument = HydratedDocument<Session>;
export const SessionSchema = SchemaFactory.createForClass(Session);
SessionSchema.index({ userId: 1, revokedAt: 1 });
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
