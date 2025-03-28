import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';
import { PayrollStatus } from '../../../common/enums';
import { User } from '../../users/entities/user.entity';

export interface PayrollBreakdown {
  baseSalary: number;
  totalRate: number;
  workingDays: number;
  presentDays: number;
  attendanceRatio: number;
  attendanceAmount: number;
  taskPoints: number;
  bonusPoints: number;
  reportPoints: number;
  manualPoints: number;
  pointValue: number;
  pointsAmount: number;
  teamPerformanceRatio: number;
  teamBonusAmount: number;
  teamPointsAmount: number;
  isDepartmentHead: boolean;
  departments: Array<{ departmentId: string; departmentName: string; rate: number }>;
}

@Entity({ name: 'payroll_records' })
@Unique(['userId', 'year', 'month'])
export class PayrollRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'smallint' })
  year: number;

  @Column({ type: 'smallint' })
  month: number;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  baseAmount: string;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  attendanceAmount: string;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  bonusAmount: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  deductionAmount: string;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  totalAmount: string;

  @Column({ type: 'varchar', length: 8, default: 'UZS' })
  currency: string;

  @Index()
  @Column({ type: 'enum', enum: PayrollStatus, default: PayrollStatus.CALCULATED })
  status: PayrollStatus;

  @Column({ type: 'jsonb' })
  breakdown: PayrollBreakdown;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: 'uuid' })
  calculatedBy: string;

  @Column({ type: 'timestamptz' })
  calculatedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  paidBy: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  paidAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
