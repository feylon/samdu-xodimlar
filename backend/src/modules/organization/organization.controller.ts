import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public, Roles } from '../../common/decorators';
import { UserRole } from '../../common/enums';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationService } from './organization.service';

@ApiTags('Organization')
@Controller('organization')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Public()
  @Get('public')
  @ApiOperation({ summary: 'Public branding (name, logo, color) used by login screen' })
  getPublic() {
    return this.organizationService.getPublic();
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Full organization settings' })
  getFull() {
    return this.organizationService.getFull();
  }

  @Patch()
  @ApiBearerAuth()
  @Roles(UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Update organization settings and payroll coefficients' })
  update(@Body() dto: UpdateOrganizationDto) {
    return this.organizationService.update(dto);
  }
}
