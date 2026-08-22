import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export interface ParticipantStatus {
  fighterMaster: string;
  masterReview: string;
  frames: Record<string, string>;
}

export interface GeneratorStatus {
  version: number;
  currentPhase: string;
  generationEnabled: boolean;
  note: string;
  participants: Record<string, ParticipantStatus>;
}

export class StateManager {
  private statusPath: string;
  private status: GeneratorStatus;
  private lastTouchedId: string | null = null;

  constructor(baseDir: string) {
    this.statusPath = path.join(baseDir, 'status.json');
    const raw = fs.readFileSync(this.statusPath, 'utf8').replace(/^\uFEFF/, '');
    this.status = JSON.parse(raw);
  }

  getStatus(): GeneratorStatus {
    return this.status;
  }

  getParticipantStatus(id: string): ParticipantStatus | undefined {
    return this.status.participants[id];
  }

  updateParticipantMasterStatus(id: string, newStatus: string) {
    if (this.status.participants[id]) {
      this.lastTouchedId = id;
      this.status.participants[id].fighterMaster = newStatus;
      this.save();
    }
  }

  updateParticipantFrameStatus(id: string, frame: string, newStatus: string) {
    if (this.status.participants[id]) {
      this.lastTouchedId = id;
      this.status.participants[id].frames[frame] = newStatus;
      this.save();
    }
  }
  
  approveMaster(id: string, baseDir?: string) {
    if (this.status.participants[id]) {
      this.lastTouchedId = id;
      this.status.participants[id].fighterMaster = 'approved';
      this.status.participants[id].masterReview = 'approved';

      if (baseDir) {
        this.copyApprovedMasterToIdle01(id, baseDir);
      }

      // Update frames that were blocked_until_master_approved
      const frames = this.status.participants[id].frames;
      for (const frame of Object.keys(frames)) {
        if (frames[frame] === 'blocked_until_master_approved') {
          frames[frame] = 'pending';
        }
      }
      this.save();
    }
  }

  private copyApprovedMasterToIdle01(id: string, baseDir: string) {
    const participantsPath = path.join(baseDir, 'participants.json');
    if (!fs.existsSync(participantsPath)) return;

    const config = JSON.parse(fs.readFileSync(participantsPath, 'utf8'));
    const participant = config.participants?.find((p: { id: string }) => p.id === id);
    if (!participant?.fighterOutputDir) return;

    const masterSource = path.join(baseDir, 'output', 'masters', id, 'fighter_master.png');
    if (!fs.existsSync(masterSource)) {
      console.log(`[!] Cannot copy idle_01: master not found at ${masterSource}`);
      return;
    }

    const idle01Dest = path.join(baseDir, '..', '..', participant.fighterOutputDir, 'idle_01.png');
    fs.mkdirSync(path.dirname(idle01Dest), { recursive: true });
    fs.copyFileSync(masterSource, idle01Dest);
    console.log(`[+] Copied approved master to ${idle01Dest}`);
  }

  rejectMaster(id: string) {
    if (this.status.participants[id]) {
      this.lastTouchedId = id;
      this.status.participants[id].fighterMaster = 'rejected';
      this.status.participants[id].masterReview = 'rejected';
      this.save();
    }
  }

  save() {
    let retries = 5;
    while(retries > 0) {
      try {
        // Preserve concurrent updates from other generator processes.
        try {
          const diskRaw = fs.readFileSync(this.statusPath, 'utf8').replace(/^\uFEFF/, '');
          const disk = JSON.parse(diskRaw) as GeneratorStatus;
          if (disk?.participants) {
            for (const id of Object.keys(disk.participants)) {
              if (id !== this.lastTouchedId && disk.participants[id]) {
                this.status.participants[id] = disk.participants[id];
              }
            }
            if (disk.note) this.status.note = disk.note;
            if (disk.currentPhase) this.status.currentPhase = disk.currentPhase;
            this.status.generationEnabled = disk.generationEnabled;
          }
        } catch {
          /* keep in-memory snapshot if disk is mid-write */
        }
        fs.writeFileSync(this.statusPath, JSON.stringify(this.status, null, 2));
        break;
      } catch (e) {
        retries--;
        if (retries === 0) throw e;
        execSync('ping 127.0.0.1 -n 2 > nul');
      }
    }
  }
}
