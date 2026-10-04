import { BaseStepResponseDto } from './base-response.dto';
import { Technicien } from '../../../../shared/models';

export interface StepAssignationResponseDto extends BaseStepResponseDto {
  techniciens?: Technicien[];
}
