import { Body, Controller, Get, Param } from '@nestjs/common';
import type { BodyDateInterface } from '../services/interfaces/github.interfaces';
import { GithubService } from './github.service';

@Controller('api/github')
export class GithubController {
  constructor(private readonly githubService: GithubService) {}

  @Get(':org')
  async getProjectsByOrg(@Param('org') org: string, @Body() body?: BodyDateInterface) {
    const data = await this.githubService.getEvidencesByOrg(org, body);
    return data;
  }
}
