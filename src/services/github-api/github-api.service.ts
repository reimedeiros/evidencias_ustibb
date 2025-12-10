import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class GithubApiService {
    constructor(private readonly httpService: HttpService) { }

    async getProjectsByOrg(org: string) {
        const URL = `${process.env['API_GITHUB']}/orgs/bbvinet/repos`;
        const { data } = await firstValueFrom(this.httpService.get(URL));

        return data;
    }
}
