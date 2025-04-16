import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ collection: 'daily_reports', timestamps: true })
export class DailyReport {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  userFullName: string;

  @Prop({ required: true, index: true })
  departmentId: string;

  @Prop({ required: true, index: true })
  date: string;

  @Prop({ required: true })
  content: string;

  @Prop({ type: [String], default: [] })
  completedTaskIds: string[];

  @Prop({ type: [String], default: [] })
  attachmentFileIds: string[];

  @Prop({ type: Number, default: null })
  rating: number | null;

  @Prop({ type: String, default: null })
  ratingComment: string | null;

  @Prop({ type: String, default: null })
  ratedBy: string | null;

  @Prop({ type: Date, default: null })
  ratedAt: Date | null;

  @Prop({ default: 0 })
  pointsAwarded: number;

  @Prop({ type: Date, default: null })
  submittedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export type DailyReportDocument = HydratedDocument<DailyReport>;
export const DailyReportSchema = SchemaFactory.createForClass(DailyReport);
DailyReportSchema.index({ userId: 1, date: 1 }, { unique: true });
DailyReportSchema.index({ departmentId: 1, date: -1 });
