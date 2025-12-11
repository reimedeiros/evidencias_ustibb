import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GithubModule } from './github/github.module';
import { GithubApiService } from './services/github-api/github-api.service';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot(), GithubModule, HttpModule],
  controllers: [AppController],
  providers: [AppService, GithubApiService],
})
export class AppModule {}
