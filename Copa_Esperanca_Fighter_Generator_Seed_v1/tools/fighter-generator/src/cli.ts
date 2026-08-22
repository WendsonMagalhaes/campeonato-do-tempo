import { Command } from 'commander';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

import { Orchestrator } from './orchestrator.js';
import { GeminiImageProvider } from './provider/GeminiImageProvider.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseDir = path.join(__dirname, '..');

dotenv.config({ path: path.join(baseDir, '.env') });

const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyBa73BGiERH6JnIAAXlkKaAJk_zQYp3pUU';

const program = new Command();

program
  .name('fighters')
  .description('Copa Esperança - Fighter Generator')
  .version('1.0.0');

function getOrchestrator() {
  const provider = new GeminiImageProvider(apiKey || '');
  return new Orchestrator(baseDir, provider);
}

program
  .command('status')
  .description('Show current generation status')
  .action(() => {
    const orchestrator = getOrchestrator();
    const state = orchestrator.getStateManager().getStatus();
    const all = orchestrator.getParticipantsManager().getAll();
    let ready = 0, generated = 0, approved = 0, missing = 0, review = 0;

    for (const p of all) {
      const s = state.participants[p.id];
      if (s) {
        if (s.fighterMaster === 'blocked_missing_source') missing++;
        else if (s.fighterMaster === 'pending') ready++;
        else if (s.fighterMaster === 'generated') generated++;
        else if (s.fighterMaster === 'generated_needs_background_review') review++;
        else if (s.fighterMaster === 'approved') approved++;
      }
    }

    console.log(`\n=== FIGHTER GENERATOR STATUS ===`);
    console.log(`Total Participants: ${all.length}`);
    console.log(`Missing Sources: ${missing}`);
    console.log(`Ready for Master: ${ready}`);
    console.log(`Masters Generated: ${generated}`);
    console.log(`Masters Needs Background Review: ${review}`);
    console.log(`Masters Approved: ${approved}`);
    console.log(`Generation Enabled: ${process.env.GENERATION_ENABLED === 'true'}`);
  });

program
  .command('dry-run')
  .description('Run a dry-run for pending masters')
  .action(async () => {
    const orchestrator = getOrchestrator();
    console.log(`\nStarting DRY RUN for masters...`);
    await orchestrator.generateMasters(undefined, true);
  });

program
  .command('generate-master')
  .description('Generate fighter master for a specific participant')
  .requiredOption('--participant <id>', 'Participant ID')
  .option('--dry-run', 'Run without calling API', false)
  .option('--force', 'Regenerate even if master already generated or approved', false)
  .option('--custom-prompt <prompt>', 'Custom prompt to append/override')
  .action(async (options) => {
    if (process.env.GENERATION_ENABLED !== 'true' && !options.dryRun) {
        console.error('Error: GENERATION_ENABLED is not set to true. Aborting actual generation.');
        process.exit(1);
    }
    const orchestrator = getOrchestrator();
    await orchestrator.generateMaster(options.participant, options.dryRun, options.force, options.customPrompt);
  });

program
  .command('generate-masters')
  .description('Generate fighter masters for ready participants')
  .option('--limit <number>', 'Max number of participants to generate')
  .option('--dry-run', 'Run without calling API', false)
  .action(async (options) => {
    if (process.env.GENERATION_ENABLED !== 'true' && !options.dryRun) {
        console.error('Error: GENERATION_ENABLED is not set to true. Aborting actual generation.');
        process.exit(1);
    }
    const orchestrator = getOrchestrator();
    const limit = options.limit ? parseInt(options.limit) : undefined;
    await orchestrator.generateMasters(limit, options.dryRun);
  });

program
  .command('contact-sheet')
  .description('Generate a contact sheet of all generated masters for QA or frames for a participant')
  .option('--participant <id>', 'Generate a frame contact sheet for this specific participant')
  .option('--dry-run', 'Run without generating actual image', false)
  .action(async (options) => {
    const orchestrator = getOrchestrator();
    await orchestrator.generateContactSheet(options.participant, options.dryRun);
  });

program
  .command('approve-master')
  .description('Approve a generated master')
  .requiredOption('--participant <id>', 'Participant ID')
  .action((options) => {
    const orchestrator = getOrchestrator();
    orchestrator.getStateManager().approveMaster(options.participant, baseDir);
    console.log(`Master approved for ${options.participant}.`);
  });

program
  .command('reject-master')
  .description('Reject a generated master')
  .requiredOption('--participant <id>', 'Participant ID')
  .action((options) => {
    const orchestrator = getOrchestrator();
    orchestrator.getStateManager().rejectMaster(options.participant);
    console.log(`Master rejected for ${options.participant}.`);
  });

program
  .command('generate-frame')
  .description('Generate a derived frame for an approved master')
  .requiredOption('--participant <id>', 'Participant ID')
  .requiredOption('--frame <name>', 'Frame name (e.g., attack, hurt)')
  .option('--dry-run', 'Run without calling API', false)
  .option('--force', 'Regenerate even if frame already generated or approved', false)
  .option('--custom-prompt <prompt>', 'Custom prompt to append/override')
  .action(async (options) => {
    if (process.env.GENERATION_ENABLED !== 'true' && !options.dryRun) {
        console.error('Error: GENERATION_ENABLED is not set to true. Aborting actual generation.');
        process.exit(1);
    }
    const orchestrator = getOrchestrator();
    await orchestrator.generateFrame(options.participant, options.frame, options.dryRun, options.force, options.customPrompt);
  });

program
  .command('generate-frames')
  .description('Generate all derived frames for an approved master (sequential, excludes idle_01)')
  .requiredOption('--participant <id>', 'Participant ID')
  .option('--dry-run', 'Run without calling API', false)
  .option('--force', 'Regenerate even if frames already generated or approved', false)
  .option('--custom-prompt <prompt>', 'Custom prompt to append/override')
  .action(async (options) => {
    if (process.env.GENERATION_ENABLED !== 'true' && !options.dryRun) {
        console.error('Error: GENERATION_ENABLED is not set to true. Aborting actual generation.');
        process.exit(1);
    }
    const orchestrator = getOrchestrator();
    await orchestrator.generateFrames(options.participant, options.dryRun, options.force, options.customPrompt);
  });

program
  .command('test-auth')
  .description('Test API key and model connectivity without generating anything')
  .action(async () => {
    if (!apiKey) {
      console.error('[-] Error: GEMINI_API_KEY environment variable is not set.');
      process.exit(1);
    }
    const model = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image';
    console.log(`[*] Testing connectivity for model: ${model}...`);
    try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: apiKey });
        const modelInfo = await ai.models.get({ model: model });
        console.log(`[+] SUCCESS!`);
        console.log(`    Model Name: ${modelInfo.name}`);
        console.log(`    Display Name: ${modelInfo.displayName}`);
        console.log(`    Supported Actions: ${modelInfo.supportedActions?.join(', ')}`);
    } catch (err: any) {
        console.error(`[-] FAILED: ${err.message || err}`);
    }
  });

program.parse(process.argv);
