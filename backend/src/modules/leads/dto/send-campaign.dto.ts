import { ArrayMinSize, IsArray, IsNotEmpty, IsString } from 'class-validator';

export class SendCampaignDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  leadIds: string[];

  @IsString()
  @IsNotEmpty()
  planId: string;
}
