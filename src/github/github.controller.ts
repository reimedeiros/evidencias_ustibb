import { Controller, Get, Param } from '@nestjs/common';
import { GithubService } from './github.service';

@Controller('api/github')
export class GithubController {
  constructor(private readonly githubService: GithubService) { }

  @Get(':org')
  async getProjectsByOrg(@Param('org') org: string) {
    console.log(org);
    const data = await this.githubService.getProjectsByOrg(org);
  }
}
