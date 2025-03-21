import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EmployeeStatus, UserRole } from '../../../common/enums';
import { DepartmentAssignment } from '../../departments/entities/department-assignment.entity';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  login: string;

  @Column({ type: 'varchar', length: 255, select: false })
  passwordHash: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.EMPLOYEE })
  role: UserRole;

  @Column({ type: 'varchar', length: 200 })
  fullName: string;

  @Index({ unique: true, where: '"pinfl" IS NOT NULL' })
  @Column({ type: 'varchar', length: 14, nullable: true })
  pinfl: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  position: string | null;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  baseSalary: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  photoFileId: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  passportFileIds: string[];

  @Column({ type: 'enum', enum: EmployeeStatus, default: EmployeeStatus.ACTIVE })
  status: EmployeeStatus;

  @Column({ type: 'date', nullable: true })
  hireDate: string | null;

  @Column({ type: 'date', nullable: true })
  terminatedAt: string | null;

  @Column({ type: 'date', nullable: true })
  birthDate: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ type: 'boolean', default: false })
  mustChangePassword: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  lastLoginAt: Date | null;

  @OneToMany(() => DepartmentAssignment, (assignment) => assignment.user)
  assignments: DepartmentAssignment[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
