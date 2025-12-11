import { Body, Controller, Get, Param } from '@nestjs/common';
import { GithubService } from './github.service';
import type { BodyDateInterface } from '../services/interfaces/github.interfaces';

@Controller('api/github')
export class GithubController {
  constructor(private readonly githubService: GithubService) { }

  @Get(':org')
  async getProjectsByOrg(@Param('org') org: string, @Body() body?: BodyDateInterface) {
    const data = await this.githubService.getEvidencesByOrg(org, body);
    return data;
  }
}
