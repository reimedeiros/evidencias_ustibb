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

type EvidenceItem = {
    projects: string;
    data: {
        modified: string[];
        added: string[];
    };
};

@Injectable()
export class GithubService {
    constructor(private readonly githubApiServce: GithubApiService) { }

    async getEvidencesByOrg(org: string, body?: BodyDateInterface) {
        const dataProjects = await this.getCommits(org, body);
        const baseApi = process.env['API_GITHUB'];
        if (!baseApi) {
            throw new Error('API_GITHUB não está definida nas variáveis de ambiente');
        }

        const agg = new Map<string, { modified: Set<string>; added: Set<string> }>();

        const commitPromises = dataProjects.map(async (project) => {
            const url = `${baseApi}/repos/${org}/${project.nameProject}/commits/${project.commit}`;
            const data: GitHubCommitResponse = await this.githubApiServce.getData(url);

            const hash = project.commit.slice(0, 10);

            if (!agg.has(project.nameProject)) {
                agg.set(project.nameProject, {
                    modified: new Set<string>(),
                    added: new Set<string>(),
                });
            }

            const bucket = agg.get(project.nameProject)!;

            if (data.files && Array.isArray(data.files)) {
                for (const projectData of data.files) {
                    if (!projectData) continue;
                    const status = projectData.status;
                    const filename = projectData.filename;
                    if (!status || !filename) continue;

                    const item = `${filename}#${hash}`;

                    if (status === 'modified') {
                        bucket.modified.add(item);
                    } else if (status === 'added') {
                        bucket.added.add(item);
                    }
                }
            }
        });

        await Promise.all(commitPromises);

        const returnData: EvidenceItem[] = Array.from(agg.entries()).map(([projectName, sets]) => ({
            projects: projectName,
            data: {
                modified: Array.from(sets.modified),
                added: Array.from(sets.added),
            },
        }));

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

    private async getBranchesByOrgAndProject(org: string, project: string) {
        const branchesArray: string[] = [];
        const URL = `${process.env['API_GITHUB']}/repos/${org}/${project}/branches`;

        const branches = await this.githubApiServce.getData(URL);

        for (const branch of branches) {
            // console.log('branch = ', branch.name, ' -> includes ? ', branchesArray.includes(branch.name))
            if (!branchesArray.includes(branch.name)) {
                branchesArray.push(branch.name)
            }
        }
        return branchesArray;
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
            const branches = await this.getBranchesByOrgAndProject(org, project);
            for (const branch of branches) {
                const URL = `${process.env['API_GITHUB']}/repos/${org}/${project}/commits?sha=${branch}&author=${login}&since=${since}T00:00:00.000Z&until=${until}T23:59:59.999Z`;
                const commits = await this.githubApiServce.getData(URL);

                for (const commit of commits) {
                    dataCommits.push({ nameProject: project, commit: commit.sha })
                }
            }
        }

        return dataCommits;
    }
}
