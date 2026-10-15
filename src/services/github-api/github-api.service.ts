import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class GithubApiService {
  constructor(private readonly httpService: HttpService) {}

  async getData(url: string) {
    const response = this.httpService.get(url, {
      headers: {
        Authorization: 'Bearer ' + process.env['GITHUB_TOKEN'],
      },
    });

    const { data } = await firstValueFrom(response);

    return data;
  }
}
