import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationSettings } from './entities/organization-settings.entity';

@Injectable()
export class OrganizationService {
  constructor(
    @InjectRepository(OrganizationSettings) private readonly repository: Repository<OrganizationSettings>,
    private readonly configService: ConfigService,
  ) {}

  async get(): Promise<OrganizationSettings> {
    const existing = await this.repository.findOne({ where: { id: 1 } });
    if (existing) return existing;
    return this.repository.save(this.repository.create({ id: 1, name: 'Xodimlar HRMS' }));
  }

  async getPublic() {
    const settings = await this.get();
    const publicUrl = this.configService.get<string>('fileService.publicUrl');
    return {
      name: settings.name,
      description: settings.description,
      logoFileId: settings.logoFileId,
      logoUrl: settings.logoFileId ? `${publicUrl}/files/${settings.logoFileId}/content` : null,
      primaryColor: settings.primaryColor,
      currency: settings.currency,
      timezone: settings.timezone,
    };
  }

  async getFull() {
    const settings = await this.get();
    const publicView = await this.getPublic();
    return {
      ...publicView,
      pointValue: Number(settings.pointValue),
      headTeamBonusRate: Number(settings.headTeamBonusRate),
      headPointShareRate: Number(settings.headPointShareRate),
      reportDeadlineHour: settings.reportDeadlineHour,
      reportMaxPoints: settings.reportMaxPoints,
      updatedAt: settings.updatedAt,
    };
  }

  async update(dto: UpdateOrganizationDto) {
    const settings = await this.get();
    Object.assign(settings, {
      name: dto.name ?? settings.name,
      description: dto.description ?? settings.description,
      logoFileId: dto.logoFileId === undefined ? settings.logoFileId : dto.logoFileId || null,
      primaryColor: dto.primaryColor ?? settings.primaryColor,
      currency: dto.currency ?? settings.currency,
      pointValue: dto.pointValue !== undefined ? String(dto.pointValue) : settings.pointValue,
      headTeamBonusRate: dto.headTeamBonusRate !== undefined ? String(dto.headTeamBonusRate) : settings.headTeamBonusRate,
      headPointShareRate: dto.headPointShareRate !== undefined ? String(dto.headPointShareRate) : settings.headPointShareRate,
      reportDeadlineHour: dto.reportDeadlineHour ?? settings.reportDeadlineHour,
      reportMaxPoints: dto.reportMaxPoints ?? settings.reportMaxPoints,
    });
    await this.repository.save(settings);
    return this.getFull();
  }
}
