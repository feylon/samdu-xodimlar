import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ClientType } from '../../../common/enums';

@Schema({ collection: 'login_history', timestamps: { createdAt: true, updatedAt: false } })
export class LoginHistory {
  @Prop({ type: String, index: true, default: null })
  userId: string | null;

  @Prop({ required: true, index: true })
  login: string;

  @Prop({ required: true })
  success: boolean;

  @Prop({ type: String, default: null })
  failureReason: string | null;

  @Prop({ required: true, enum: ClientType })
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
  sessionId: string | null;

  createdAt: Date;
}

export type LoginHistoryDocument = HydratedDocument<LoginHistory>;
export const LoginHistorySchema = SchemaFactory.createForClass(LoginHistory);
LoginHistorySchema.index({ createdAt: -1 });
