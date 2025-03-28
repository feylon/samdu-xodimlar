import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity({ name: 'monthly_kpi_summaries' })
@Unique(['userId', 'year', 'month'])
export class MonthlyKpiSummary {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'smallint' })
  year: number;

  @Column({ type: 'smallint' })
  month: number;

  @Column({ type: 'integer', default: 0 })
  totalPoints: number;

  @Column({ type: 'integer', default: 0 })
  taskPoints: number;

  @Column({ type: 'integer', default: 0 })
  bonusPoints: number;

  @Column({ type: 'integer', default: 0 })
  reportPoints: number;

  @Column({ type: 'integer', default: 0 })
  manualPoints: number;

  @Column({ type: 'integer', default: 0 })
  tasksAssigned: number;

  @Column({ type: 'integer', default: 0 })
  tasksVerified: number;

  @Column({ type: 'integer', default: 0 })
  reportsSubmitted: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  averageReportRating: string;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  attendanceRatio: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
