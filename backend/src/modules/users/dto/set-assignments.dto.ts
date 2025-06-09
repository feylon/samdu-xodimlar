import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, ValidateNested } from 'class-validator';
import { AssignmentInputDto } from './create-employee.dto';

export class SetAssignmentsDto {
  @ApiProperty({ type: [AssignmentInputDto] })
  @IsArray()
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => AssignmentInputDto)
  assignments: AssignmentInputDto[];
}
