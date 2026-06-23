import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface Project {
  id: string;
  name: string;
  location: string;
  startDate: string;
  endDate: string;
  clientName?: string;
  contractorName?: string;
  status: string;
  createdAt: string;
}

@Injectable()
export class ProjectService {
  private readonly dbPath: string;

  constructor() {
    this.dbPath = path.resolve(__dirname, '../../../../data/projects.json');
  }

  private async ensureDbExists() {
    try {
      await fs.mkdir(path.dirname(this.dbPath), { recursive: true });
      await fs.access(this.dbPath);
    } catch {
      await fs.writeFile(this.dbPath, JSON.stringify([], null, 2), 'utf-8');
    }
  }

  async findAll(): Promise<Project[]> {
    await this.ensureDbExists();
    const data = await fs.readFile(this.dbPath, 'utf-8');
    return JSON.parse(data);
  }

  async findOne(id: string): Promise<Project> {
    const projects = await this.findAll();
    const project = projects.find(p => p.id === id);
    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    return project;
  }

  async create(dto: { name: string; location: string; startDate: string; endDate: string; clientName?: string; contractorName?: string }): Promise<Project> {
    if (!dto.name) {
      throw new BadRequestException('Project name is required');
    }

    const projects = await this.findAll();
    
    // Generate sequential ID like DA1, DA2... (uppercase letters and numbers after)
    let count = projects.length + 1;
    let slug = `DA${count}`;
    while (projects.some(p => p.id === slug)) {
      count++;
      slug = `DA${count}`;
    }

    const newProject: Project = {
      id: slug,
      name: dto.name,
      location: dto.location || 'Chưa cập nhật',
      startDate: dto.startDate || '',
      endDate: dto.endDate || '',
      clientName: dto.clientName || 'Chưa cập nhật',
      contractorName: dto.contractorName || 'Chưa cập nhật',
      status: 'Đang thực hiện',
      createdAt: new Date().toISOString(),
    };

    projects.push(newProject);
    await fs.writeFile(this.dbPath, JSON.stringify(projects, null, 2), 'utf-8');

    // Create folders
    const rootDataPath = path.resolve(__dirname, '../../../../data');
    await fs.mkdir(path.join(rootDataPath, 'master', slug), { recursive: true });
    await fs.mkdir(path.join(rootDataPath, 'exports', slug, 'quotes'), { recursive: true });
    await fs.mkdir(path.join(rootDataPath, 'exports', slug, 'progress'), { recursive: true });
    await fs.mkdir(path.join(rootDataPath, 'exports', slug, 'payments'), { recursive: true });
    await fs.mkdir(path.join(rootDataPath, 'exports', slug, 'profit'), { recursive: true });

    return newProject;
  }
}
