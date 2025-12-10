import { Module } from '@nestjs/common';
import { GithubService } from './github.service';
import { GithubController } from './github.controller';
import { GithubApiService } from 'src/services/github-api/github-api.service';

@Module({
  imports: [],
  controllers: [GithubController],
  providers: [GithubService, GithubApiService],
})
export class GithubModule {}
