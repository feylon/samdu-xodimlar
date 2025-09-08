import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/decorators';
import { UserRole } from '../../common/enums';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { CalculatePayrollDto } from './dto/calculate-payroll.dto';
import { PayrollQueryDto } from './dto/payroll-query.dto';
import { UpdatePayrollStatusDto } from './dto/update-payroll-status.dto';
import { PayrollService } from './payroll.service';

@ApiTags('Payroll')
@ApiBearerAuth()
@Controller('payroll')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Post('calculate')
  @Roles(UserRole.HR)
  @ApiOperation({ summary: 'Calculate monthly salaries from attendance, points and team performance' })
  calculate(@Body() dto: CalculatePayrollDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.payrollService.calculate(dto, actor);
  }

  @Patch(':id/status')
  @Roles(UserRole.HR)
  @ApiOperation({ summary: 'Move a payroll record to PAID; paid records become immutable' })
  updateStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePayrollStatusDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.payrollService.updateStatus(id, dto, actor);
  }

  @Get()
  @ApiOperation({ summary: 'Payroll records within scope' })
  list(@Query() query: PayrollQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.payrollService.list(query, actor);
  }

  @Get('me')
  @ApiOperation({ summary: 'My payroll history' })
  mine(@CurrentUser() actor: AuthenticatedUser) {
    return this.payrollService.mine(actor);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Payroll record details with breakdown' })
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.payrollService.getOne(id, actor);
  }
}
