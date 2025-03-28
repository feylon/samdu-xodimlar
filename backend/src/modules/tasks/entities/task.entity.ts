import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { TaskPriority, TaskStatus, TaskType } from '../../../common/enums';
import { Department } from '../../departments/entities/department.entity';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'tasks' })
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Index()
  @Column({ type: 'uuid' })
  assigneeId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assigneeId' })
  assignee: User;

  @Index()
  @Column({ type: 'uuid' })
  departmentId: string;

  @ManyToOne(() => Department, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'departmentId' })
  department: Department;

  @Column({ type: 'uuid' })
  createdBy: string;

  @Column({ type: 'enum', enum: TaskType, default: TaskType.REGULAR })
  type: TaskType;

  @Column({ type: 'enum', enum: TaskPriority, default: TaskPriority.MEDIUM })
  priority: TaskPriority;

  @Index()
  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.ASSIGNED })
  status: TaskStatus;

  @Column({ type: 'date', nullable: true })
  dueDate: string | null;

  @Column({ type: 'smallint', default: 10 })
  maxPoints: number;

  @Column({ type: 'smallint', nullable: true })
  awardedPoints: number | null;

  @Column({ type: 'text', nullable: true })
  employeeComment: string | null;

  @Column({ type: 'text', nullable: true })
  reviewComment: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  submittedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  verifiedBy: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  verifiedAt: Date | null;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  attachmentFileIds: string[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
