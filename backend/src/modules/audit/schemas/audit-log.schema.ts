import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ collection: 'audit_logs', timestamps: { createdAt: true, updatedAt: false } })
export class AuditLog {
  @Prop({ type: String, index: true, default: null })
  actorId: string | null;

  @Prop({ type: String, default: null })
  actorLogin: string | null;

  @Prop({ type: String, default: null })
  actorRole: string | null;

  @Prop({ required: true, index: true })
  action: string;

  @Prop({ required: true })
  method: string;

  @Prop({ required: true })
  path: string;

  @Prop({ type: String, default: null, index: true })
  entity: string | null;

  @Prop({ type: String, default: null, index: true })
  entityId: string | null;

  @Prop({ required: true })
  statusCode: number;

  @Prop({ default: 0 })
  durationMs: number;

  @Prop({ default: 'unknown' })
  ip: string;

  @Prop({ default: 'unknown' })
  userAgent: string;

  @Prop({ type: Object, default: null })
  payload: Record<string, unknown> | null;

  @Prop({ type: Object, default: null })
  query: Record<string, unknown> | null;

  @Prop({ type: String, default: null })
  errorMessage: string | null;

  createdAt: Date;
}

export type AuditLogDocument = HydratedDocument<AuditLog>;
export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ actorId: 1, createdAt: -1 });
