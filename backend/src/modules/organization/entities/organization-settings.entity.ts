import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'organization_settings' })
export class OrganizationSettings {
  @PrimaryColumn({ type: 'smallint', default: 1 })
  id: number;

  @Column({ type: 'varchar', length: 200, default: 'Xodimlar HRMS' })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  logoFileId: string | null;

  @Column({ type: 'varchar', length: 16, default: '#1d4ed8' })
  primaryColor: string;

  @Column({ type: 'varchar', length: 8, default: 'UZS' })
  currency: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 10000 })
  pointValue: string;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 20 })
  headTeamBonusRate: string;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 10 })
  headPointShareRate: string;

  @Column({ type: 'smallint', default: 17 })
  reportDeadlineHour: number;

  @Column({ type: 'smallint', default: 5 })
  reportMaxPoints: number;

  @Column({ type: 'varchar', length: 64, default: 'Asia/Tashkent' })
  timezone: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
