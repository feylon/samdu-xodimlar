import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ _id: false })
export class PollOption {
  @Prop({ required: true })
  index: number;

  @Prop({ required: true })
  label: string;
}

@Schema({ _id: false })
export class PollVote {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  optionIndex: number;

  @Prop({ default: () => new Date() })
  votedAt: Date;
}

@Schema({ collection: 'polls', timestamps: true })
export class Poll {
  @Prop({ required: true })
  title: string;

  @Prop({ type: String, default: null })
  description: string | null;

  @Prop({ type: [PollOption], required: true })
  options: PollOption[];

  @Prop({ type: String, index: true, default: null })
  departmentId: string | null;

  @Prop({ required: true })
  createdBy: string;

  @Prop({ required: true })
  createdByName: string;

  @Prop({ default: false })
  isAnonymous: boolean;

  @Prop({ type: Date, default: null })
  closesAt: Date | null;

  @Prop({ type: Date, default: null })
  closedAt: Date | null;

  @Prop({ type: [PollVote], default: [] })
  votes: PollVote[];

  createdAt: Date;
  updatedAt: Date;
}

export type PollDocument = HydratedDocument<Poll>;
export const PollSchema = SchemaFactory.createForClass(Poll);
PollSchema.index({ departmentId: 1, createdAt: -1 });
