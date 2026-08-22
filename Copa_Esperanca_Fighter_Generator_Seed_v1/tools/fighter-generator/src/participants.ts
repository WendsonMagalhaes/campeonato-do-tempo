import * as fs from 'fs';
import * as path from 'path';

export interface Participant {
  id: string;
  displayName: string;
  sourceStatus: string;
  sourceCard: string | null;
  faceMaster: string | null;
  fighterOutputDir: string;
  templateProfile: string | null;
  templateProfileStatus: string;
  fighterMasterStatus: string;
  framesStatus: string;
}

export interface ParticipantsConfig {
  version: number;
  expectedRosterSize: number;
  sourceReadyCount: number;
  missingSourceCount: number;
  missingSources: string[];
  rules: Record<string, any>;
  participants: Participant[];
}

export class ParticipantsManager {
  private configPath: string;
  private config: ParticipantsConfig;

  constructor(baseDir: string) {
    this.configPath = path.join(baseDir, 'participants.json');
    this.config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
  }

  getAll(): Participant[] {
    return this.config.participants;
  }

  get(id: string): Participant | undefined {
    return this.config.participants.find(p => p.id === id);
  }
}
