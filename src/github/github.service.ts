import { Injectable } from '@nestjs/common';
import fs from 'fs';
import { GithubApiService } from '../services/github-api/github-api.service';
import { BodyDateInterface } from '../services/interfaces/github.interfaces';
import { artifacts } from './utils/artifacts';
import { IBranch } from './interfaces/iBranch.interface';

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
          if (!status || !filename) {
            artifacts[artifacts.length - 1].artifacts.push(projectData.filename || '');
            continue;
          }

          const item = `${project.nameProject}/${projectData.filename}#${hash};${project.message}`;

          if (!project.message.toLowerCase().includes("merge") &&
            !project.message.toLowerCase().includes("ci") &&
            !projectData.filename.toLocaleLowerCase().includes('ci')
          ) {
            if (status === 'modified') {
              bucket.modified.add(item);
            } else if (status === 'added') {
              bucket.added.add(item);
            }
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

    for (const projectData of returnData) {
      projectData.data.added.forEach(data => {
        const filename = data.split('#').shift() as string;
        const codeIndex = this.getCodeItem(filename, true);
        if (codeIndex) {
          const index = artifacts.findIndex(artifact => artifact.item === codeIndex);
          artifacts[index].artifacts.push(data);
        } else {
          artifacts[artifacts.length - 1].artifacts.push(data);
        }
      });

      projectData.data.modified.forEach(data => {
        const filename = data.split('#').shift() as string;
        const codeIndex = this.getCodeItem(filename, false);
        if (codeIndex) {
          const index = artifacts.findIndex(artifact => artifact.item === codeIndex);
          artifacts[index].artifacts.push(data);
        } else {
          artifacts[artifacts.length - 1].artifacts.push(data);
        }
      });
    }

    artifacts.forEach((artifact) => {
      const output = artifact.artifacts.join('\n');
      fs.writeFile(`./entrega/${artifact.item}.csv`, output, (err) => {
        if (err) {
          console.error(err);
        }
      });
      artifact.artifacts = [];
    });

    return returnData;

  }

  private getCodeItem(fileName: string, newfile: boolean) {
    const fileArr = fileName.split('.');
    const extension = fileArr[fileArr.length - 1];

    if (!extension) {
      return newfile ? '5.10.7' : '5.10.8';
    }

    const isTestExtension = fileArr[fileArr.length - 2] === 'spec';
    const isTestJava = fileArr[fileArr.length - 1] === 'java' && fileArr[0].endsWith('Test');
    switch (extension) {
      case 'ts':
      case 'js':
        if (isTestExtension || isTestJava) {
          return newfile ? '5.10.18' : '5.10.21';
        } else {
          return newfile ? '5.10.5' : '5.10.6';
        }
      case 'scss':
      case 'css':
      case 'sass':
        return newfile ? '5.10.3' : '5.10.4';
      case 'html':
        return newfile ? '5.10.1' : '5.10.2';
      case 'json':
      case 'template':
      case 'md':
        return newfile ? '5.10.7' : '5.10.8';
      case 'yml':
      case 'yaml':
        return '5.7.25';
      case 'sh':
        return newfile ? '5.15.1' : '5.15.2';
      default:
        break;
    }
  }

  private async getProjectsByOrg() {
    const namespaces: string[] = [];
    const URL = `${process.env['API_GITHUB']}/orgs/bbvinet/repos`;
    const projects = await this.githubApiServce.getData(URL);

    for (const project of projects) {
      namespaces.push(project.name)
    }
    return namespaces;
  }

  private async getBranchesByOrgAndProject(org: string, project: string) {
    let branches: IBranch[] = [];
    const branchesArray: string[] = [];
    let page = 1;

    while (true) {
      const URL = `${process.env['API_GITHUB']}/repos/${org}/${project}/branches?per_page=100&page=${page}`;
      const getBranches = await this.githubApiServce.getData(URL);
      branches = branches.concat(getBranches);
      if (getBranches.length === 0) {
        break;
      }
      page++;
    }

    for (const branch of branches) {
      const ignoredBranches = ['main', 'release', 'feat/desenv'];
      if (!branchesArray.includes(branch.name) && !ignoredBranches.some(ignored => branch.name.includes(ignored))) {
      const ignoredBranches = ['main', 'release', 'feat/desenv'];
      if (!branchesArray.includes(branch.name) && !ignoredBranches.some(ignored => branch.name.includes(ignored))) {
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
    const dataCommits: { nameProject: string, commit: string, message: string }[] = [];
    const { since, until } = this.getMonthBoundsUTC(body?.dayStart, body?.dayEnd, body?.monthStart, body?.monthEnd);

    const projects = await this.getProjectsByOrg();

    const URL_USER = `${process.env['API_GITHUB']}/user`;
    const { login } = await this.githubApiServce.getData(URL_USER);

    for (const project of projects) {
      const branches = await this.getBranchesByOrgAndProject(org, project);
      for (const branch of branches) {
        const encodedBranchName = encodeURIComponent(branch);
        const URL = `${process.env['API_GITHUB']}/repos/${org}/${project}/commits?sha=${encodedBranchName}&author=${login}&since=${since}T00:00:00.000Z&until=${until}T23:59:59.999Z&per_page=1000`;
        const commits = await this.githubApiServce.getData(URL);
        for (const commit of commits) {
          dataCommits.push({ nameProject: project, commit: commit.sha, message: commit.commit.message })
        }
      }
    }

    return dataCommits;
  }
}
