import { Injectable } from '@nestjs/common';
import { GithubApiService } from '../services/github-api/github-api.service';
import { BodyDateInterface } from '../services/interfaces/github.interfaces';


interface ProjectCommit {
    project: string;
    commit: string; // SHA do commit
}

interface GitHubCommitFile {
    filename: string;
    status: string;
}

interface GitHubCommitResponse {
    files?: GitHubCommitFile[];
}


@Injectable()
export class GithubService {
    constructor(private readonly githubApiServce: GithubApiService) { }
    async getEvidencesByOrg(org: string, body?: BodyDateInterface) {
        const returnData: { modified: string[]; added: string[] } = {
            modified: [],
            added: [],
        };

        const dataProjects = await this.getCommits(org, body);

        const baseApi = process.env['API_GITHUB'];
        if (!baseApi) {
            throw new Error('API_GITHUB não está definida nas variáveis de ambiente');
        }

        const commitPromises = dataProjects.map(async (project) => {
            const url = `${baseApi}/repos/${org}/${project.nameProject}/commits/${project.commit}`;
            const data: GitHubCommitResponse = await this.githubApiServce.getData(url);

            const hash = project.commit.slice(0, 10)

            if (data.files) {
                for (const projectData of data.files) {
                    if (projectData.status && projectData.filename) {
                        const status = projectData.status;
                        const filename = projectData.filename + '#' + hash;
                        if (status === 'modified') {
                            returnData.modified.push(filename);
                        } else if (status === 'added') {
                            returnData.added.push(filename);
                        }
                    }
                }
            }
        });

        await Promise.all(commitPromises);


        return returnData;
    }

    private async getProjectsByOrg(org: string) {
        const nameSpaces: string[] = [];
        const URL = `${process.env['API_GITHUB']}/orgs/bbvinet/repos`;
        const projects = await this.githubApiServce.getData(URL);

        for (const project of projects) {
            nameSpaces.push(project.name)
        }
        return nameSpaces;
    }

    private getMonthBoundsUTC(dayStart?: number, dayEnd?: number, monthStart?: number, monthEnd?: number) {
        const ref = new Date();

        const year = ref.getUTCFullYear();

        const mStart = monthStart ?? ref.getUTCMonth() + 1;
        const mEnd = monthEnd ?? ref.getUTCMonth() + 1;
        const dStart = dayStart ?? 1;
        const dEnd = dayEnd ?? new Date(Date.UTC(year, mEnd + 1, 0)).getUTCDate();

        const dateStart = `${year}-${mStart}-${dStart}`;
        const dateEnd = `${year}-${mEnd}-${dEnd}`

        return {
            since: dateStart,
            until: dateEnd,
        };

    }

    private async getCommits(org: string, body?: BodyDateInterface) {
        const dataCommits: { nameProject: string, commit: string }[] = [];
        const { since, until } = this.getMonthBoundsUTC(body?.dayStart, body?.dayEnd, body?.monthStart, body?.monthEnd);

        const projects = await this.getProjectsByOrg(org);

        const URL_USER = `${process.env['API_GITHUB']}/user`;
        const { login } = await this.githubApiServce.getData(URL_USER);

        for (const project of projects) {
            const URL = `${process.env['API_GITHUB']}/repos/${org}/${project}/commits?author=${login}&since=${since}T00:00:00.000Z&until=${until}T23:59:59.999Z`;
            const commits = await this.githubApiServce.getData(URL);

            for (const commit of commits) {
                dataCommits.push({ nameProject: project, commit: commit.sha })
            }
        }

        return dataCommits;
    }
}
