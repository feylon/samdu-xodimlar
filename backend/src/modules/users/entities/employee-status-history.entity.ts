import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { EmployeeStatus } from '../../../common/enums';
import { User } from './user.entity';

@Entity({ name: 'employee_status_history' })
export class EmployeeStatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'enum', enum: EmployeeStatus })
  fromStatus: EmployeeStatus;

  @Column({ type: 'enum', enum: EmployeeStatus })
  toStatus: EmployeeStatus;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ type: 'text', nullable: true })
  medicalReason: string | null;

  @Column({ type: 'date', nullable: true })
  startDate: string | null;

  @Column({ type: 'date', nullable: true })
  endDate: string | null;

  @Column({ type: 'uuid' })
  changedBy: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
