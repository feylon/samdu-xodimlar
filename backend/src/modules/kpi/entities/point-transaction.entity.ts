import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { PointSource } from '../../../common/enums';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'point_transactions' })
@Index(['userId', 'year', 'month'])
export class PointTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid', nullable: true })
  departmentId: string | null;

  @Column({ type: 'smallint' })
  points: number;

  @Column({ type: 'enum', enum: PointSource })
  source: PointSource;

  @Column({ type: 'varchar', length: 64, nullable: true })
  referenceId: string | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ type: 'smallint' })
  year: number;

  @Column({ type: 'smallint' })
  month: number;

  @Column({ type: 'uuid' })
  createdBy: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
