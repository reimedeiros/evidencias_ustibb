import { Injectable } from '@nestjs/common';
import { GithubApiService } from 'src/services/github-api/github-api.service';

@Injectable()
export class GithubService {
    constructor(private readonly githubApiServce: GithubApiService) {}
    async getProjectsByOrg(org: string) {

    }
}
