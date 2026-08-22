import sharp from 'sharp';
import { StateManager } from './state.js';
import { ParticipantsManager, Participant } from './participants.js';
import { Logger } from './utils/log.js';
import { ImageGenerationProvider } from './provider/ImageGenerationProvider.js';
import * as path from 'path';
import * as fs from 'fs';
import { legsAppearDuplicated } from './utils/walkLegAnalysis.js';

const DERIVED_FRAMES = ['idle_02', 'walk_01', 'walk_02', 'attack', 'hurt', 'victory', 'lying'] as const;

const FRAME_SKIP_STATUSES = new Set(['generated', 'generated_needs_background_review', 'approved']);

/** Dinarte is the canonical pose reference set. */
const LOCKED_POSE_REFERENCE_PARTICIPANT = 'dinarte';

/** These participants are closed and locked from regeneration unless bypassed in code. */
const LOCKED_PARTICIPANTS = new Set([
  'dinarte',
  'adriel',
  'david',
  'fatinha',
  'livia',
  'monalisa',
  'samara',
  'joao',
  'neto',
  'rhussiana',
  'ricardo',
  'manasses',
  'radja',
  'jailson',
  'leandro',
  'wendson',
  'wesley',
  'lailson',
  'lailson2',
  'joemerson',
  'tiago',
  'leonardo',
  'erikson',
  'ryan',
  'alexandre',
  'ana',
  'fernando',
  'marconi',
  'caio',
  'daniel',
  'evellyn',
  'fabio',
  'izaias',
  'hiago',
  'kelvin',
]);

const WALK_POSE_FRAMES = new Set(['walk_01', 'walk_02']);

export class Orchestrator {
  private baseDir: string;
  private state: StateManager;
  private participants: ParticipantsManager;
  private logger: Logger;
  private provider: ImageGenerationProvider;

  constructor(baseDir: string, provider: ImageGenerationProvider) {
    this.baseDir = baseDir;
    this.state = new StateManager(baseDir);
    this.participants = new ParticipantsManager(baseDir);
    this.logger = new Logger(baseDir);
    this.provider = provider;
  }

  getParticipantsManager() {
    return this.participants;
  }
  
  getStateManager() {
    return this.state;
  }

  resolveArmReference(frame: string, participantId: string): string | undefined {
    // Arm-swing refs are for Fatinha/Lívia clutch cycles — using walk frames as
    // "arm reference" for male fighters (Leandro/etc.) re-injects muscular shading.
    if (participantId !== 'fatinha' && participantId !== 'livia') {
      return undefined;
    }
    if (frame === 'idle_02') {
      const walk02Path = path.join(this.baseDir, 'output', 'frames', participantId, 'walk_02.png');
      if (fs.existsSync(walk02Path)) {
        return walk02Path;
      }
    } else if (frame === 'walk_02') {
      const walk01Path = path.join(this.baseDir, 'output', 'frames', participantId, 'walk_01.png');
      if (fs.existsSync(walk01Path)) {
        return walk01Path;
      }
    }
    return undefined;
  }

  resolveWalk01LegHint(participantId: string): string | undefined {
    const walk01Path = path.join(this.baseDir, 'output', 'frames', participantId, 'walk_01.png');
    if (fs.existsSync(walk01Path)) {
      return walk01Path;
    }
    return undefined;
  }

  resolvePoseReference(frame: string, participantId?: string): string | undefined {
    if (participantId === 'fatinha' && frame === 'walk_01') {
      const customWalk01 = path.join(this.baseDir, 'templates', 'custom', 'fatinha_walk_01_ref.png');
      if (fs.existsSync(customWalk01)) {
        return customWalk01;
      }
    }
    
    if (participantId === 'fatinha' && frame === 'walk_02') {
      const customWalk02 = path.join(this.baseDir, 'templates', 'custom', 'fatinha_walk_02_ref.png');
      if (fs.existsSync(customWalk02)) {
        return customWalk02;
      }
    }

    if (participantId === LOCKED_POSE_REFERENCE_PARTICIPANT) {
      return undefined;
    }

    // Always prefer Dinarte canonical poses for non-fatinha participants.
    // (Legacy attack-as-walk_02 hack removed — it broke Dinarte pose locking.)

    if (
      !WALK_POSE_FRAMES.has(frame) &&
      frame !== 'lying' &&
      frame !== 'hurt' &&
      frame !== 'attack' &&
      frame !== 'idle_02' &&
      frame !== 'victory' &&
      !(
        (participantId === 'alexandre' ||
          participantId === 'caio' ||
          participantId === 'evellyn' ||
          participantId === 'daniel' ||
          participantId === 'fabio' ||
          participantId === 'hiago' ||
          participantId === 'kelvin') &&
        frame === 'idle_01'
      )
    ) {
      return undefined;
    }
    const referencePath = path.join(
      this.baseDir,
      'output',
      'frames',
      LOCKED_POSE_REFERENCE_PARTICIPANT,
      `${frame}.png`
    );
    if (fs.existsSync(referencePath)) {
      return referencePath;
    }
    return undefined;
  }

  isLockedParticipant(participantId: string): boolean {
    return participantId === LOCKED_POSE_REFERENCE_PARTICIPANT;
  }

  isClosedParticipant(participantId: string): boolean {
    return LOCKED_PARTICIPANTS.has(participantId);
  }

  /**
   * Rhussiana body-soften edit (RHUSSIANA_BODY_SOFTEN=true): keep EXACT pose/clothes/scale;
   * change ONLY body type to soft fuller (gordinha) + bare hands from body_master.
   */
  private resolveRhussianaBodySoftenConfig(
    participantId: string,
    outputPath: string
  ): {
    rhussianaBodySoften: boolean;
    editBaseImage?: string;
    bodyTypeReferenceImage?: string;
  } {
    if (participantId !== 'rhussiana' || process.env.RHUSSIANA_BODY_SOFTEN !== 'true') {
      return { rhussianaBodySoften: false };
    }
    if (!fs.existsSync(outputPath)) {
      console.log(`[!] Rhussiana body-soften requested but no existing image at ${outputPath}`);
      return { rhussianaBodySoften: false };
    }

    const isMaster = path.basename(outputPath) === 'fighter_master.png';
    const backupName = isMaster
      ? 'fighter_master.pre_body_soften_backup.png'
      : `${path.basename(outputPath, '.png')}.pre_body_soften_backup.png`;
    const editBaseImage = path.join(path.dirname(outputPath), backupName);
    fs.copyFileSync(outputPath, editBaseImage);

    const bodyTypeReferenceImage = path.join(
      this.baseDir,
      '..',
      '..',
      'assets',
      'participants',
      'rhussiana',
      'body_master.png'
    );
    console.log(`    - RHUSSIANA BODY-SOFTEN edit: base=${editBaseImage}`);
    console.log(`    - Body type reference: ${bodyTypeReferenceImage}`);
    return { rhussianaBodySoften: true, editBaseImage, bodyTypeReferenceImage };
  }

  /**
   * Leandro smooth-arms edit (LEANDRO_SMOOTH_ARMS=true): keep EXACT pose/clothes/hair/scale;
   * change ONLY arms to SMOOTH non-muscular using body_master.
   */
  private resolveLeandroSmoothArmsConfig(
    participantId: string,
    outputPath: string
  ): {
    leandroSmoothArms: boolean;
    editBaseImage?: string;
    bodyTypeReferenceImage?: string;
    hairReferenceImage?: string;
  } {
    const smoothArmsEnabled =
      process.env.LEANDRO_SMOOTH_ARMS === 'true' ||
      process.env.SMOOTH_ARMS_EDIT === 'true' ||
      process.env.LEONARDO_STYLE_EDIT === 'true';
    if (
      (participantId !== 'leandro' &&
        participantId !== 'ricardo' &&
        participantId !== 'manasses' &&
        participantId !== 'leonardo') ||
      !smoothArmsEnabled
    ) {
      return { leandroSmoothArms: false };
    }
    if (participantId === 'leonardo' && process.env.LEONARDO_STYLE_EDIT !== 'true') {
      return { leandroSmoothArms: false };
    }
    // Lying edits with body_master frequently produce standing+lying collages — skip.
    if (path.basename(outputPath).toLowerCase().startsWith('lying')) {
      console.log(`[!] Skipping SMOOTH_ARMS edit for lying (collage risk). Use full lying regen instead.`);
      return { leandroSmoothArms: false };
    }
    if (!fs.existsSync(outputPath)) {
      console.log(`[!] Smooth-arms requested but no existing image at ${outputPath}`);
      return { leandroSmoothArms: false };
    }

    const isMaster = path.basename(outputPath) === 'fighter_master.png';
    const backupName = isMaster
      ? 'fighter_master.pre_smooth_arms_backup.png'
      : `${path.basename(outputPath, '.png')}.pre_smooth_arms_backup.png`;
    const editBaseImage = path.join(path.dirname(outputPath), backupName);
    fs.copyFileSync(outputPath, editBaseImage);

    // body_master is portrait-only (no usable arms). Do NOT attach Dinarte as a
    // "negative" muscle example — image models often copy the ripped arms instead.
    const hairReferenceImage = path.join(
      this.baseDir,
      '..',
      '..',
      'assets',
      'participants',
      participantId,
      'fighter',
      'idle_01.png'
    );
    const idleOut = path.join(this.baseDir, 'output', 'frames', participantId, 'idle_01.png');
    console.log(`    - ${participantId.toUpperCase()} SMOOTH-ARMS edit: base=${editBaseImage}`);
    return {
      leandroSmoothArms: true,
      editBaseImage,
      bodyTypeReferenceImage: undefined,
      hairReferenceImage: fs.existsSync(idleOut)
        ? idleOut
        : fs.existsSync(hairReferenceImage)
          ? hairReferenceImage
          : undefined,
    };
  }

  /**
   * Rhussiana belly-flatten edit (RHUSSIANA_BELLY_FLATTEN=true): keep EXACT pose/clothes/scale;
   * reduce ONLY an overly round/protruding midsection — still soft/gordinha, not muscular.
   */
  private resolveRhussianaBellyFlattenConfig(
    participantId: string,
    outputPath: string
  ): {
    rhussianaBellyFlatten: boolean;
    editBaseImage?: string;
  } {
    if (participantId !== 'rhussiana' || process.env.RHUSSIANA_BELLY_FLATTEN !== 'true') {
      return { rhussianaBellyFlatten: false };
    }
    if (!fs.existsSync(outputPath)) {
      console.log(`[!] Rhussiana belly-flatten requested but no existing image at ${outputPath}`);
      return { rhussianaBellyFlatten: false };
    }

    const isMaster = path.basename(outputPath) === 'fighter_master.png';
    const backupName = isMaster
      ? 'fighter_master.pre_belly_flatten_backup.png'
      : `${path.basename(outputPath, '.png')}.pre_belly_flatten_backup.png`;
    const editBaseImage = path.join(path.dirname(outputPath), backupName);
    fs.copyFileSync(outputPath, editBaseImage);

    console.log(`    - RHUSSIANA BELLY-FLATTEN edit: base=${editBaseImage}`);
    return { rhussianaBellyFlatten: true, editBaseImage };
  }

  /**
   * Scale lock: idle_01 as height/footprint for Rhussiana walk_01/attack,
   * Neto/Leandro/Ricardo walks, and Joemerson walk_01/attack QA.
   */
  private resolveRhussianaWalkScaleRef(
    participantId: string,
    frameName: string
  ): string | undefined {
    const netoWalk = participantId === 'neto' && (frameName === 'walk_01' || frameName === 'walk_02');
    const leandroWalk =
      participantId === 'leandro' && (frameName === 'walk_01' || frameName === 'walk_02');
    const ricardoWalk =
      participantId === 'ricardo' && (frameName === 'walk_01' || frameName === 'walk_02');
    const rhussianaWalk = participantId === 'rhussiana' && frameName === 'walk_01';
    const rhussianaAttack = participantId === 'rhussiana' && frameName === 'attack';
    const joemersonScale =
      participantId === 'joemerson' &&
      (frameName === 'walk_01' || frameName === 'attack' || frameName === 'victory');
    const leonardoScale =
      participantId === 'leonardo' &&
      (frameName === 'walk_01' ||
        frameName === 'walk_02' ||
        frameName === 'attack' ||
        frameName === 'victory' ||
        frameName === 'hurt');
    const tiagoScale =
      participantId === 'tiago' &&
      (frameName === 'walk_01' ||
        frameName === 'walk_02' ||
        frameName === 'attack' ||
        frameName === 'victory' ||
        frameName === 'hurt' ||
        frameName === 'idle_02');
    const eriksonScale =
      participantId === 'erikson' &&
      (frameName === 'walk_01' ||
        frameName === 'walk_02' ||
        frameName === 'victory' ||
        frameName === 'idle_02');
    const fernandoScale =
      participantId === 'fernando' &&
      (frameName === 'walk_01' ||
        frameName === 'walk_02' ||
        frameName === 'attack' ||
        frameName === 'hurt' ||
        frameName === 'idle_02');
    const ryanScale =
      participantId === 'ryan' &&
      (frameName === 'walk_01' ||
        frameName === 'walk_02' ||
        frameName === 'attack' ||
        frameName === 'victory' ||
        frameName === 'hurt' ||
        frameName === 'idle_02');
    const alexandreScale =
      participantId === 'alexandre' &&
      (frameName === 'walk_01' ||
        frameName === 'walk_02' ||
        frameName === 'idle_02');
    const anaScale =
      participantId === 'ana' &&
      (frameName === 'walk_01' ||
        frameName === 'walk_02' ||
        frameName === 'attack' ||
        frameName === 'victory' ||
        frameName === 'hurt' ||
        frameName === 'idle_02' ||
        frameName === 'lying');
    const caioScale =
      participantId === 'caio' &&
      (frameName === 'walk_01' ||
        frameName === 'walk_02' ||
        frameName === 'attack' ||
        frameName === 'hurt' ||
        frameName === 'idle_02');
    const evellynScale =
      participantId === 'evellyn' &&
      (frameName === 'walk_01' ||
        frameName === 'walk_02' ||
        frameName === 'attack' ||
        frameName === 'victory' ||
        frameName === 'hurt' ||
        frameName === 'idle_02' ||
        frameName === 'lying');
    const danielScale =
      participantId === 'daniel' &&
      (frameName === 'walk_01' ||
        frameName === 'walk_02' ||
        frameName === 'attack' ||
        frameName === 'victory' ||
        frameName === 'hurt' ||
        frameName === 'idle_02' ||
        frameName === 'lying');
    const fabioScale =
      participantId === 'fabio' &&
      (frameName === 'walk_01' ||
        frameName === 'walk_02' ||
        frameName === 'attack' ||
        frameName === 'victory' ||
        frameName === 'hurt' ||
        frameName === 'idle_02');
    const hiagoScale =
      participantId === 'hiago' &&
      (frameName === 'walk_01' ||
        frameName === 'walk_02' ||
        frameName === 'attack' ||
        frameName === 'victory' ||
        frameName === 'hurt' ||
        frameName === 'idle_02' ||
        frameName === 'lying');
    const kelvinScale =
      participantId === 'kelvin' &&
      (frameName === 'walk_01' ||
        frameName === 'walk_02' ||
        frameName === 'attack' ||
        frameName === 'victory' ||
        frameName === 'hurt' ||
        frameName === 'idle_02' ||
        frameName === 'lying');
    if (
      !netoWalk &&
      !leandroWalk &&
      !ricardoWalk &&
      !rhussianaWalk &&
      !rhussianaAttack &&
      !joemersonScale &&
      !leonardoScale &&
      !tiagoScale &&
      !eriksonScale &&
      !fernandoScale &&
      !ryanScale &&
      !alexandreScale &&
      !anaScale &&
      !caioScale &&
      !evellynScale &&
      !danielScale &&
      !fabioScale &&
      !hiagoScale &&
      !kelvinScale
    )
      return undefined;
    const idle01 = path.join(this.baseDir, 'output', 'frames', participantId, 'idle_01.png');
    if (fs.existsSync(idle01)) {
      console.log(`    - ${participantId} ${frameName} scale/identity ref: ${idle01}`);
      return idle01;
    }
    const assetsIdle = path.join(
      this.baseDir,
      '..',
      '..',
      'assets',
      'participants',
      participantId,
      'fighter',
      'idle_01.png'
    );
    if (fs.existsSync(assetsIdle)) {
      console.log(`    - ${participantId} ${frameName} scale/identity ref (assets): ${assetsIdle}`);
      return assetsIdle;
    }
    return undefined;
  }

  /**
   * Lívia hair-only edit (LIVIA_HAIR_ONLY=true): keep EXACT pose/body/clothes/scale;
   * change ONLY hair to match idle_01 ombre. Narrower than LIVIA_SURGICAL_QA.
   */
  private resolveLiviaHairOnlyConfig(
    participantId: string,
    outputPath: string
  ): {
    liviaHairOnly: boolean;
    editBaseImage?: string;
    hairReferenceImage?: string;
  } {
    if (participantId !== 'livia' || process.env.LIVIA_HAIR_ONLY !== 'true') {
      return { liviaHairOnly: false };
    }
    if (!fs.existsSync(outputPath)) {
      console.log(`[!] Lívia hair-only requested but no existing image at ${outputPath}`);
      return { liviaHairOnly: false };
    }

    const isMaster = path.basename(outputPath) === 'fighter_master.png';
    const backupName = isMaster
      ? 'fighter_master.pre_hair_only_backup.png'
      : `${path.basename(outputPath, '.png')}.pre_hair_only_backup.png`;
    const editBaseImage = path.join(path.dirname(outputPath), backupName);
    fs.copyFileSync(outputPath, editBaseImage);

    const hairReferenceImage = path.join(this.baseDir, 'output', 'frames', 'livia', 'idle_01.png');
    console.log(`    - LIVIA HAIR-ONLY edit: base=${editBaseImage}`);
    console.log(`    - Hair reference (idle_01): ${hairReferenceImage}`);
    return { liviaHairOnly: true, editBaseImage, hairReferenceImage };
  }

  /**
   * Radja hair-only edit (RADJA_HAIR_ONLY=true): keep EXACT pose/body/clothes/wraps;
   * change ONLY hair to match idle_01 deep black.
   */
  private resolveRadjaHairOnlyConfig(
    participantId: string,
    outputPath: string
  ): {
    radjaHairOnly: boolean;
    editBaseImage?: string;
    hairReferenceImage?: string;
  } {
    if (participantId !== 'radja' || process.env.RADJA_HAIR_ONLY !== 'true') {
      return { radjaHairOnly: false };
    }
    if (!fs.existsSync(outputPath)) {
      console.log(`[!] Radja hair-only requested but no existing image at ${outputPath}`);
      return { radjaHairOnly: false };
    }

    const isMaster = path.basename(outputPath) === 'fighter_master.png';
    const backupName = isMaster
      ? 'fighter_master.pre_hair_only_backup.png'
      : `${path.basename(outputPath, '.png')}.pre_hair_only_backup.png`;
    const editBaseImage = path.join(path.dirname(outputPath), backupName);
    fs.copyFileSync(outputPath, editBaseImage);

    const hairReferenceImage = path.join(this.baseDir, 'output', 'frames', 'radja', 'idle_01.png');
    console.log(`    - RADJA HAIR-ONLY edit: base=${editBaseImage}`);
    console.log(`    - Hair reference (idle_01): ${hairReferenceImage}`);
    return { radjaHairOnly: true, editBaseImage, hairReferenceImage };
  }

  /**
   * Erikson watch laterality (ERIKSON_WATCH_LOCK=true): pose-locked.
   * walk_01/walk_02 → move black watch to LEFT wrist.
   * attack/lying → remove watch from visible RIGHT wrist (left arm hidden).
   */
  private resolveEriksonWatchLockConfig(
    participantId: string,
    frame: string,
    outputPath: string
  ): {
    eriksonWatchLock: boolean;
    editBaseImage?: string;
    watchReferenceImage?: string;
    eriksonWatchMode?: 'move_left' | 'remove_right';
  } {
    const allowed = new Set(['walk_01', 'walk_02', 'attack', 'lying']);
    if (participantId !== 'erikson' || process.env.ERIKSON_WATCH_LOCK !== 'true' || !allowed.has(frame)) {
      return { eriksonWatchLock: false };
    }
    if (!fs.existsSync(outputPath)) {
      console.log('[!] Erikson watch-lock requested but no existing image at ' + outputPath);
      return { eriksonWatchLock: false };
    }

    const backupName = path.basename(outputPath, '.png') + '.pre_watch_lock_backup.png';
    const editBaseImage = path.join(path.dirname(outputPath), backupName);
    fs.copyFileSync(outputPath, editBaseImage);

    const envMode = process.env.ERIKSON_WATCH_MODE;
    const eriksonWatchMode: 'move_left' | 'remove_right' =
      envMode === 'remove_right'
        ? 'remove_right'
        : envMode === 'move_left' || envMode === 'add_left'
          ? 'move_left'
          : frame === 'attack' || frame === 'lying'
            ? 'remove_right'
            : 'move_left';

    let watchReferenceImage: string | undefined;
    if (eriksonWatchMode === 'move_left') {
      const idle02 = path.join(this.baseDir, 'output', 'frames', 'erikson', 'idle_02.png');
      const idle01 = path.join(this.baseDir, 'output', 'frames', 'erikson', 'idle_01.png');
      const hurt = path.join(this.baseDir, 'output', 'frames', 'erikson', 'hurt.png');
      watchReferenceImage = fs.existsSync(idle02)
        ? idle02
        : fs.existsSync(hurt)
          ? hurt
          : fs.existsSync(idle01)
            ? idle01
            : undefined;
    }

    console.log('    - ERIKSON WATCH-LOCK edit (' + eriksonWatchMode + '): base=' + editBaseImage);
    if (watchReferenceImage) console.log('    - Watch reference: ' + watchReferenceImage);
    return { eriksonWatchLock: true, editBaseImage, watchReferenceImage, eriksonWatchMode };
  }

  private resolveRadjaWrapLockConfig(
    participantId: string,
    outputPath: string
  ): {
    radjaWrapLock: boolean;
    editBaseImage?: string;
    wrapReferenceImage?: string;
  } {
    if (participantId !== 'radja' || process.env.RADJA_WRAP_LOCK !== 'true') {
      return { radjaWrapLock: false };
    }
    if (!fs.existsSync(outputPath)) {
      console.log(`[!] Radja wrap-lock requested but no existing image at ${outputPath}`);
      return { radjaWrapLock: false };
    }

    const isMaster = path.basename(outputPath) === 'fighter_master.png';
    const backupName = isMaster
      ? 'fighter_master.pre_wrap_lock_backup.png'
      : `${path.basename(outputPath, '.png')}.pre_wrap_lock_backup.png`;
    const editBaseImage = path.join(path.dirname(outputPath), backupName);
    fs.copyFileSync(outputPath, editBaseImage);

    const wrapReferenceImage = path.join(this.baseDir, 'output', 'frames', 'radja', 'idle_01.png');
    console.log(`    - RADJA WRAP-LOCK edit: base=${editBaseImage}`);
    console.log(`    - Wrap reference (idle_01): ${wrapReferenceImage}`);
    return { radjaWrapLock: true, editBaseImage, wrapReferenceImage };
  }

  /**
   * Radja jacket-lock edit (RADJA_JACKET_LOCK=true): keep EXACT pose/body/hair/wraps;
   * match purple jacket drape (falling off shoulders) to idle_01.
   */
  private resolveRadjaJacketLockConfig(
    participantId: string,
    outputPath: string
  ): {
    radjaJacketLock: boolean;
    editBaseImage?: string;
    jacketReferenceImage?: string;
  } {
    if (participantId !== 'radja' || process.env.RADJA_JACKET_LOCK !== 'true') {
      return { radjaJacketLock: false };
    }
    if (!fs.existsSync(outputPath)) {
      console.log(`[!] Radja jacket-lock requested but no existing image at ${outputPath}`);
      return { radjaJacketLock: false };
    }

    const isMaster = path.basename(outputPath) === 'fighter_master.png';
    const backupName = isMaster
      ? 'fighter_master.pre_jacket_lock_backup.png'
      : `${path.basename(outputPath, '.png')}.pre_jacket_lock_backup.png`;
    const editBaseImage = path.join(path.dirname(outputPath), backupName);
    fs.copyFileSync(outputPath, editBaseImage);

    const jacketReferenceImage = path.join(this.baseDir, 'output', 'frames', 'radja', 'idle_01.png');
    console.log(`    - RADJA JACKET-LOCK edit: base=${editBaseImage}`);
    console.log(`    - Jacket drape reference (idle_01): ${jacketReferenceImage}`);
    return { radjaJacketLock: true, editBaseImage, jacketReferenceImage };
  }

  /**
   * Izaias jacket-color lock (IZAIAS_JACKET_COLOR_LOCK=true): keep EXACT pose/body/chain/hands/shoes;
   * match navy puffer jacket COLOR to idle_01.
   */
  private resolveIzaiasJacketColorLockConfig(
    participantId: string,
    outputPath: string
  ): {
    izaiasJacketColorLock: boolean;
    editBaseImage?: string;
    jacketReferenceImage?: string;
  } {
    if (participantId !== 'izaias' || process.env.IZAIAS_JACKET_COLOR_LOCK !== 'true') {
      return { izaiasJacketColorLock: false };
    }
    if (!fs.existsSync(outputPath)) {
      console.log(`[!] Izaias jacket-color lock requested but no existing image at ${outputPath}`);
      return { izaiasJacketColorLock: false };
    }

    const backupName = `${path.basename(outputPath, '.png')}.pre_jacket_color_backup.png`;
    const editBaseImage = path.join(path.dirname(outputPath), backupName);
    fs.copyFileSync(outputPath, editBaseImage);

    const jacketReferenceImage = path.join(this.baseDir, 'output', 'frames', 'izaias', 'idle_01.png');
    console.log(`    - IZAIAS JACKET-COLOR LOCK edit: base=${editBaseImage}`);
    console.log(`    - Jacket color reference (idle_01): ${jacketReferenceImage}`);
    return { izaiasJacketColorLock: true, editBaseImage, jacketReferenceImage };
  }

  /**
   * Lívia QA surgical edit (LIVIA_SURGICAL_QA=true): keep pose/identity,
   * enforce red sandals + silver clutch + gaze + scale/hair match to idle_01.
   */
  private resolveLiviaSurgicalConfig(
    participantId: string,
    outputPath: string,
    frameName?: string
  ): {
    liviaSurgical: boolean;
    editBaseImage?: string;
    scaleReferenceImage?: string;
  } {
    if (participantId !== 'livia' || process.env.LIVIA_SURGICAL_QA !== 'true') {
      return { liviaSurgical: false };
    }
    if (!fs.existsSync(outputPath)) {
      console.log(`[!] Lívia surgical QA requested but no existing image at ${outputPath}`);
      return { liviaSurgical: false };
    }

    const isMaster = path.basename(outputPath) === 'fighter_master.png';
    const backupName = isMaster
      ? 'fighter_master.pre_surgical_backup.png'
      : `${path.basename(outputPath, '.png')}.pre_surgical_backup.png`;
    const editBaseImage = path.join(path.dirname(outputPath), backupName);
    fs.copyFileSync(outputPath, editBaseImage);

    // Prefer idle_01 as canonical height/footprint for scale/hair consistency QA.
    // Fall back to Dinarte pose frame for attack/victory when idle_01 is missing.
    let scaleReferenceImage: string | undefined;
    const scaleFrames = new Set(['walk_01', 'hurt', 'victory', 'attack', 'lying']);
    if (frameName && scaleFrames.has(frameName)) {
      const idle01 = path.join(this.baseDir, 'output', 'frames', 'livia', 'idle_01.png');
      if (fs.existsSync(idle01)) {
        scaleReferenceImage = idle01;
      } else if (frameName === 'attack' || frameName === 'victory') {
        const dinarteFrame = path.join(this.baseDir, 'output', 'frames', 'dinarte', `${frameName}.png`);
        if (fs.existsSync(dinarteFrame)) {
          scaleReferenceImage = dinarteFrame;
        }
      }
    }

    console.log(`    - LIVIA SURGICAL QA edit: base=${editBaseImage}`);
    if (scaleReferenceImage) {
      console.log(`    - Scale/hair reference: ${scaleReferenceImage}`);
    }
    return { liviaSurgical: true, editBaseImage, scaleReferenceImage };
  }

  /** Shoe-only edit mode (Fatinha black flats / Samara white sneakers / Lívia red sandals). */
  private resolveShoeOnlyConfig(
    participantId: string,
    outputPath: string
  ): {
    shoeOnly: boolean;
    editBaseImage?: string;
    shoeReferenceImage?: string;
    shoeEditStyle?: 'black_flats' | 'white_sneakers' | 'red_sandals';
  } {
    const fatinhaShoe = participantId === 'fatinha' && process.env.FATINHA_SHOE_ONLY === 'true';
    const samaraShoe = participantId === 'samara' && process.env.SAMARA_SHOE_ONLY === 'true';
    const liviaShoe = participantId === 'livia' && process.env.LIVIA_SHOE_ONLY === 'true';
    if (!fatinhaShoe && !samaraShoe && !liviaShoe) {
      return { shoeOnly: false };
    }
    if (!fs.existsSync(outputPath)) {
      console.log(`[!] Shoe-only requested but no existing image at ${outputPath}`);
      return { shoeOnly: false };
    }

    const isMaster = path.basename(outputPath) === 'fighter_master.png';
    const backupName = isMaster
      ? 'fighter_master.pre_shoe_backup.png'
      : `${path.basename(outputPath, '.png')}.pre_shoe_backup.png`;
    const editBaseImage = path.join(path.dirname(outputPath), backupName);
    fs.copyFileSync(outputPath, editBaseImage);

    if (liviaShoe) {
      const shoeReferenceImage = path.join(this.baseDir, 'output', 'frames', 'livia', 'idle_01.png');
      console.log(`    - SHOE-ONLY edit (red sandals): base=${editBaseImage}`);
      console.log(`    - Shoe reference (idle_01): ${shoeReferenceImage}`);
      return {
        shoeOnly: true,
        editBaseImage,
        shoeReferenceImage,
        shoeEditStyle: 'red_sandals',
      };
    }

    if (samaraShoe) {
      console.log(`    - SHOE-ONLY edit (white sneakers): base=${editBaseImage}`);
      return {
        shoeOnly: true,
        editBaseImage,
        shoeEditStyle: 'white_sneakers',
      };
    }

    const shoeReferenceImage = path.join(this.baseDir, 'output', 'frames', participantId, 'hurt.png');
    console.log(`    - SHOE-ONLY edit (black flats): base=${editBaseImage}`);
    console.log(`    - Shoe reference: ${shoeReferenceImage}`);
    return {
      shoeOnly: true,
      editBaseImage,
      shoeReferenceImage,
      shoeEditStyle: 'black_flats',
    };
  }

  /** Samara lying ghost-limb surgical fix (SAMARA_LYING_GHOST_FIX=true). */
  private resolveGhostLimbFixConfig(
    participantId: string,
    frame: string,
    outputPath: string
  ): { ghostLimbFix: boolean; editBaseImage?: string } {
    if (
      participantId !== 'samara' ||
      frame !== 'lying' ||
      process.env.SAMARA_LYING_GHOST_FIX !== 'true'
    ) {
      return { ghostLimbFix: false };
    }
    if (!fs.existsSync(outputPath)) {
      console.log(`[!] Ghost-limb fix requested but no lying frame at ${outputPath}`);
      return { ghostLimbFix: false };
    }
    const editBaseImage = path.join(path.dirname(outputPath), 'lying.pre_ghost_fix_backup.png');
    fs.copyFileSync(outputPath, editBaseImage);
    console.log(`    - GHOST-LIMB fix (lying): base=${editBaseImage}`);
    return { ghostLimbFix: true, editBaseImage };
  }

  /** Copy generated frame PNG into assets/participants/<id>/fighter/. */
  private publishFrameToAssets(participant: Participant, frame: string, sourcePath: string): void {
    if (!fs.existsSync(sourcePath) || !participant.fighterOutputDir) return;
    const dest = path.join(this.baseDir, '..', '..', participant.fighterOutputDir, `${frame}.png`);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(sourcePath, dest);
    console.log(`    - Published to ${dest}`);
  }

  resolveApprovedMaster(participant: Participant): string {
    const idle01Path = path.join(this.baseDir, '..', '..', participant.fighterOutputDir, 'idle_01.png');
    if (fs.existsSync(idle01Path)) {
      return idle01Path;
    }

    const fighterMasterPath = path.join(this.baseDir, 'output', 'masters', participant.id, 'fighter_master.png');
    if (fs.existsSync(fighterMasterPath)) {
      return fighterMasterPath;
    }

    const bodyMasterPath = path.join(this.baseDir, '..', '..', 'assets', 'participants', participant.id, 'body_master.png');
    if (fs.existsSync(bodyMasterPath)) {
      return bodyMasterPath;
    }

    return idle01Path;
  }

  async generateMaster(participantId: string, dryRun: boolean = false, force: boolean = false, customPrompt?: string): Promise<void> {
    const participant = this.participants.get(participantId);
    if (!participant) {
      console.log(`[!] Participant ${participantId} not found.`);
      return;
    }

    const status = this.state.getParticipantStatus(participantId);
    if (!status) {
      console.log(`[!] Status for ${participantId} not found.`);
      return;
    }

    if (this.isClosedParticipant(participantId)) {
      console.log(`[!] Skipping ${participantId}: Participant is closed and locked from regeneration.`);
      return;
    }

    if (status.fighterMaster === 'blocked_missing_source' || participant.sourceStatus === 'missing') {
      console.log(`[!] Skipping ${participantId}: Blocked due to missing source.`);
      return;
    }

    if (!force && status.fighterMaster === 'approved') {
      console.log(`[!] Skipping ${participantId}: Master already approved. Use --force to regenerate.`);
      return;
    }

    if (!force && (status.fighterMaster === 'generated' || status.fighterMaster === 'generated_needs_background_review')) {
      console.log(`[!] Skipping ${participantId}: Master already generated and pending review. Use --force to regenerate.`);
      return;
    }

    if (force && (status.fighterMaster === 'approved' || status.fighterMaster === 'generated' || status.fighterMaster === 'generated_needs_background_review')) {
      console.log(`[!] Warning: Regenerating master for ${participantId} (--force).`);
    }

    const sourceCard = path.join(this.baseDir, '..', '..', participant.sourceCard || '');
    const faceMaster = path.join(this.baseDir, '..', '..', participant.faceMaster || '');
    const templateImage = path.join(this.baseDir, 'templates', 'idle_01.png');
    const promptFile = path.join(this.baseDir, 'prompts', 'fighter_master.md');
    let prompt = fs.existsSync(promptFile) ? fs.readFileSync(promptFile, 'utf8') : '';
    if (customPrompt) {
      prompt = customPrompt + "\n\n" + prompt;
    }
    const outputPath = path.join(this.baseDir, 'output', 'masters', participantId, 'fighter_master.png');

    if (dryRun) {
      console.log(`\n--- DRY RUN: Generate Master for ${participantId} ---`);
      console.log(`- Source: ${sourceCard}`);
      console.log(`- Face Master: ${faceMaster}`);
      console.log(`- Template: ${templateImage}`);
      console.log(`- Prompt length: ${prompt.length} chars`);
      console.log(`- Expected Destination: ${outputPath}`);
      console.log(`- Current State: ${status.fighterMaster}`);
      console.log(`- Action: WOULD EXECUTE`);
      return;
    }

    // Actual Execution
    console.log(`\n[*] Generating Master for ${participantId}...`);
    this.state.updateParticipantMasterStatus(participantId, 'generating');
    
    const startTime = Date.now();
    try {
      const rhussianaCfg = this.resolveRhussianaBodySoftenConfig(participantId, outputPath);
      const leandroCfg = rhussianaCfg.rhussianaBodySoften
        ? { leandroSmoothArms: false as const }
        : this.resolveLeandroSmoothArmsConfig(participantId, outputPath);
      const bellyCfg =
        rhussianaCfg.rhussianaBodySoften || leandroCfg.leandroSmoothArms
          ? { rhussianaBellyFlatten: false as const }
          : this.resolveRhussianaBellyFlattenConfig(participantId, outputPath);
      const hairCfg =
        rhussianaCfg.rhussianaBodySoften ||
        leandroCfg.leandroSmoothArms ||
        bellyCfg.rhussianaBellyFlatten
          ? { liviaHairOnly: false as const }
          : this.resolveLiviaHairOnlyConfig(participantId, outputPath);
      const liviaCfg =
        rhussianaCfg.rhussianaBodySoften ||
        leandroCfg.leandroSmoothArms ||
        bellyCfg.rhussianaBellyFlatten ||
        hairCfg.liviaHairOnly
          ? { liviaSurgical: false as const }
          : this.resolveLiviaSurgicalConfig(participantId, outputPath, 'idle_01');
      const shoeCfg =
        rhussianaCfg.rhussianaBodySoften ||
        leandroCfg.leandroSmoothArms ||
        bellyCfg.rhussianaBellyFlatten ||
        hairCfg.liviaHairOnly ||
        liviaCfg.liviaSurgical
          ? { shoeOnly: false as const }
          : this.resolveShoeOnlyConfig(participantId, outputPath);

      const result = await this.provider.generate({
        participantId,
        sourceImage: sourceCard,
        faceMaster,
        templateImage,
        poseReferenceImage: this.resolvePoseReference('idle_01', participantId),
        frameName: 'idle_01',
        prompt,
        outputWidth: 576,
        outputHeight: 576,
        outputFormat: 'png',
        requireTransparentBackground: true,
        outputPath,
        shoeOnlyEdit: shoeCfg.shoeOnly,
        editBaseImage:
          rhussianaCfg.editBaseImage ??
          leandroCfg.editBaseImage ??
          bellyCfg.editBaseImage ??
          hairCfg.editBaseImage ??
          liviaCfg.editBaseImage ??
          shoeCfg.editBaseImage,
        shoeReferenceImage: shoeCfg.shoeReferenceImage,
        shoeEditStyle: shoeCfg.shoeEditStyle,
        liviaSurgicalEdit: liviaCfg.liviaSurgical,
        liviaHairOnlyEdit: hairCfg.liviaHairOnly,
        hairReferenceImage: leandroCfg.hairReferenceImage ?? hairCfg.hairReferenceImage,
        scaleReferenceImage: liviaCfg.scaleReferenceImage,
        approvedMaster: liviaCfg.liviaSurgical ? outputPath : undefined,
        rhussianaBodySoftenEdit: rhussianaCfg.rhussianaBodySoften,
        bodyTypeReferenceImage:
          rhussianaCfg.bodyTypeReferenceImage ?? leandroCfg.bodyTypeReferenceImage,
        rhussianaBellyFlattenEdit: bellyCfg.rhussianaBellyFlatten,
        leandroSmoothArmsEdit: leandroCfg.leandroSmoothArms,
      });

      const durationMs = Date.now() - startTime;

      if (result.success) {
        const finalStatus = result.needsBackgroundReview ? 'generated_needs_background_review' : 'generated';
        this.state.updateParticipantMasterStatus(participantId, finalStatus);
        this.logger.log({
          participantId,
          job: 'fighter_master',
          frame: 'idle_01',
          provider: 'GeminiImageProvider',
          model: process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image',
          attempt: 1,
          durationMs,
          outputPath: result.outputPath,
          sha256: result.sha256,
          result: finalStatus
        });
        console.log(`[+] Success! Output: ${result.outputPath} (sha256: ${result.sha256})`);
        console.log(`    - Original MIME: ${result.outMimeType} (${result.originalWidth}x${result.originalHeight}) - ${result.rawSize} bytes`);
        console.log(`    - Final Dimensions: ${result.width}x${result.height}`);
        console.log(`    - Alpha Channel Present: ${result.hasAlpha}`);
        if (result.needsBackgroundReview) {
            console.log(`[!] Warning: Alpha channel issues detected. Requires background review.`);
        }
      } else {
        this.state.updateParticipantMasterStatus(participantId, 'failed');
        this.logger.log({
          participantId,
          job: 'fighter_master',
          frame: 'idle_01',
          provider: 'GeminiImageProvider',
          model: process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image',
          attempt: 1,
          durationMs,
          result: 'failed',
          error: result.error
        });
        console.error(`[-] Failed: ${result.error}`);
      }
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      this.state.updateParticipantMasterStatus(participantId, 'failed');
      this.logger.log({
        participantId,
        job: 'fighter_master',
        frame: 'idle_01',
        provider: 'GeminiImageProvider',
        model: process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image',
        attempt: 1,
        durationMs,
        result: 'failed',
        error: String(err)
      });
      console.error(`[-] Exception: ${String(err)}`);
    }
  }

  async generateMasters(limit?: number, dryRun: boolean = false): Promise<void> {
    const all = this.participants.getAll();
    let count = 0;
    
    for (const p of all) {
      if (limit && count >= limit) break;
      
      const status = this.state.getParticipantStatus(p.id);
      if (status && (status.fighterMaster === 'pending' || status.fighterMaster === 'failed')) {
        await this.generateMaster(p.id, dryRun);
        count++;
      }
    }
  }

  async generateFrame(participantId: string, frame: string, dryRun: boolean = false, force: boolean = false, customPrompt?: string): Promise<void> {
    const participant = this.participants.get(participantId);
    if (!participant) return;

    const status = this.state.getParticipantStatus(participantId);
    if (!status) return;

    if (this.isClosedParticipant(participantId)) {
      console.log(`[!] Skipping ${participantId} frame ${frame}: Participant is closed and locked from regeneration.`);
      return;
    }

    if (this.isLockedParticipant(participantId) && !force) {
      console.log(
        `[!] Skipping ${participantId} frame ${frame}: LOCKED pose-reference master set. Use generate-frame --force for explicit single-frame regen only.`
      );
      return;
    }

    if (WALK_POSE_FRAMES.has(frame) && !this.isLockedParticipant(participantId)) {
      const poseRef = this.resolvePoseReference(frame, participantId);
      if (!poseRef) {
        console.log(
          `[!] Skipping ${participantId} frame ${frame}: Dinarte pose reference missing at output/frames/dinarte/${frame}.png`
        );
        return;
      }
    }

    if (status.fighterMaster !== 'approved') {
      console.log(`[!] Skipping frame ${frame} for ${participantId}: Master is not approved.`);
      return;
    }

    const frameStatus = status.frames[frame];
    if (!force && FRAME_SKIP_STATUSES.has(frameStatus)) {
      console.log(`[!] Skipping ${participantId} frame ${frame}: Status is '${frameStatus}'. Use --force to regenerate.`);
      return;
    }

    if (force && frameStatus === 'approved') {
      console.log(`[!] Warning: Regenerating APPROVED frame ${frame} for ${participantId} (--force).`);
    }

    const sourceCard = path.join(this.baseDir, '..', '..', participant.sourceCard || '');
    const faceMaster = path.join(this.baseDir, '..', '..', participant.faceMaster || '');
    const approvedMaster = this.resolveApprovedMaster(participant);
    const templateImage = path.join(this.baseDir, 'templates', `${frame}.png`);
    const promptFile = path.join(this.baseDir, 'prompts', 'frame.md');
    let prompt = fs.existsSync(promptFile) ? fs.readFileSync(promptFile, 'utf8') : '';
    if (customPrompt) {
        prompt = customPrompt + "\n\n" + prompt;
    }
    const outputPath = path.join(this.baseDir, 'output', 'frames', participantId, `${frame}.png`);

    if (!fs.existsSync(approvedMaster)) {
      console.log(`[!] Skipping frame ${frame} for ${participantId}: Approved master not found at ${approvedMaster}`);
      return;
    }

    if (dryRun) {
      console.log(`\n--- DRY RUN: Generate Frame '${frame}' for ${participantId} ---`);
      console.log(`- Approved Master: ${approvedMaster}`);
      console.log(`- Source: ${sourceCard}`);
      console.log(`- Face Master: ${faceMaster}`);
      console.log(`- Template: ${templateImage}`);
      console.log(`- Expected Destination: ${outputPath}`);
      console.log(`- Current State: ${frameStatus}`);
      console.log(`- Action: WOULD EXECUTE`);
      return;
    }

    console.log(`\n[*] Generating Frame '${frame}' for ${participantId}...`);
    this.state.updateParticipantFrameStatus(participantId, frame, 'generating');
    
    const startTime = Date.now();
    try {
      const secondaryTemplateImage = frame === 'idle_02'
        ? path.join(this.baseDir, 'templates', 'idle_01.png')
        : undefined;

      const armReferenceImage = (frame === 'idle_02' || frame === 'walk_02')
        ? this.resolveArmReference(frame, participantId)
        : undefined;

      const walk01LegHintPath = frame === 'walk_02'
        ? this.resolveWalk01LegHint(participantId)
        : undefined;

      if ((frame === 'idle_02' || frame === 'walk_02') && armReferenceImage) {
        console.log(`    - Arm reference: ${armReferenceImage}`);
      }
      if (frame === 'walk_02') {
        if (walk01LegHintPath) {
          console.log(`    - walk_01 leg hint (text only): ${walk01LegHintPath}`);
        }
      }

      let attempt = 1;
      let walk02StrongMode = false;

      const eriksonWatchCfg = this.resolveEriksonWatchLockConfig(participantId, frame, outputPath);
      if (eriksonWatchCfg.eriksonWatchLock) {
        const result = await this.provider.generate({
          participantId,
          sourceImage: sourceCard,
          faceMaster,
          templateImage,
          approvedMaster,
          frameName: frame,
          prompt,
          outputWidth: 576,
          outputHeight: 576,
          outputFormat: 'png',
          requireTransparentBackground: true,
          outputPath,
          editBaseImage: eriksonWatchCfg.editBaseImage,
          eriksonWatchLockEdit: true,
          watchReferenceImage: eriksonWatchCfg.watchReferenceImage,
          eriksonWatchMode: eriksonWatchCfg.eriksonWatchMode,
        });
        const durationMs = Date.now() - startTime;
        if (result.success) {
          const finalStatus = result.needsBackgroundReview ? 'generated_needs_background_review' : 'generated';
          this.state.updateParticipantFrameStatus(participantId, frame, finalStatus);
          this.publishFrameToAssets(participant, frame, outputPath);
          this.logger.log({
            participantId,
            job: 'frame_' + frame,
            frame,
            provider: 'GeminiImageProvider',
            model: process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image',
            attempt: 1,
            durationMs,
            outputPath: result.outputPath,
            sha256: result.sha256,
            result: finalStatus,
          });
          console.log('[+] Success! Output: ' + result.outputPath + ' (sha256: ' + result.sha256 + ')');
        } else {
          this.state.updateParticipantFrameStatus(participantId, frame, 'failed');
          console.error('[-] Failed: ' + result.error);
        }
        return;
      }

      const rhussianaCfg = this.resolveRhussianaBodySoftenConfig(participantId, outputPath);
      const leandroCfg = rhussianaCfg.rhussianaBodySoften
        ? { leandroSmoothArms: false as const }
        : this.resolveLeandroSmoothArmsConfig(participantId, outputPath);
      const bellyCfg =
        rhussianaCfg.rhussianaBodySoften || leandroCfg.leandroSmoothArms
          ? { rhussianaBellyFlatten: false as const }
          : this.resolveRhussianaBellyFlattenConfig(participantId, outputPath);
      const radjaHairCfg =
        rhussianaCfg.rhussianaBodySoften ||
        leandroCfg.leandroSmoothArms ||
        bellyCfg.rhussianaBellyFlatten
          ? { radjaHairOnly: false as const }
          : this.resolveRadjaHairOnlyConfig(participantId, outputPath);
      const radjaJacketCfg =
        rhussianaCfg.rhussianaBodySoften ||
        leandroCfg.leandroSmoothArms ||
        bellyCfg.rhussianaBellyFlatten ||
        radjaHairCfg.radjaHairOnly
          ? { radjaJacketLock: false as const }
          : this.resolveRadjaJacketLockConfig(participantId, outputPath);
      const izaiasJacketCfg =
        rhussianaCfg.rhussianaBodySoften ||
        leandroCfg.leandroSmoothArms ||
        bellyCfg.rhussianaBellyFlatten ||
        radjaHairCfg.radjaHairOnly ||
        radjaJacketCfg.radjaJacketLock
          ? { izaiasJacketColorLock: false as const }
          : this.resolveIzaiasJacketColorLockConfig(participantId, outputPath);
      const radjaWrapCfg =
        rhussianaCfg.rhussianaBodySoften ||
        leandroCfg.leandroSmoothArms ||
        bellyCfg.rhussianaBellyFlatten ||
        radjaHairCfg.radjaHairOnly ||
        radjaJacketCfg.radjaJacketLock ||
        izaiasJacketCfg.izaiasJacketColorLock
          ? { radjaWrapLock: false as const }
          : this.resolveRadjaWrapLockConfig(participantId, outputPath);
      const hairCfg =
        rhussianaCfg.rhussianaBodySoften ||
        leandroCfg.leandroSmoothArms ||
        bellyCfg.rhussianaBellyFlatten ||
        radjaHairCfg.radjaHairOnly ||
        radjaJacketCfg.radjaJacketLock ||
        izaiasJacketCfg.izaiasJacketColorLock ||
        radjaWrapCfg.radjaWrapLock
          ? { liviaHairOnly: false as const }
          : this.resolveLiviaHairOnlyConfig(participantId, outputPath);
      const liviaCfg =
        rhussianaCfg.rhussianaBodySoften ||
        leandroCfg.leandroSmoothArms ||
        bellyCfg.rhussianaBellyFlatten ||
        hairCfg.liviaHairOnly ||
        radjaHairCfg.radjaHairOnly ||
        radjaJacketCfg.radjaJacketLock ||
        izaiasJacketCfg.izaiasJacketColorLock ||
        radjaWrapCfg.radjaWrapLock
          ? { liviaSurgical: false as const }
          : this.resolveLiviaSurgicalConfig(participantId, outputPath, frame);
      const ghostCfg =
        rhussianaCfg.rhussianaBodySoften ||
        leandroCfg.leandroSmoothArms ||
        bellyCfg.rhussianaBellyFlatten ||
        radjaHairCfg.radjaHairOnly ||
        radjaJacketCfg.radjaJacketLock ||
        izaiasJacketCfg.izaiasJacketColorLock ||
        radjaWrapCfg.radjaWrapLock ||
        hairCfg.liviaHairOnly ||
        liviaCfg.liviaSurgical
          ? { ghostLimbFix: false as const }
          : this.resolveGhostLimbFixConfig(participantId, frame, outputPath);
      const shoeCfg =
        rhussianaCfg.rhussianaBodySoften ||
        leandroCfg.leandroSmoothArms ||
        bellyCfg.rhussianaBellyFlatten ||
        radjaHairCfg.radjaHairOnly ||
        radjaJacketCfg.radjaJacketLock ||
        izaiasJacketCfg.izaiasJacketColorLock ||
        radjaWrapCfg.radjaWrapLock ||
        hairCfg.liviaHairOnly ||
        liviaCfg.liviaSurgical ||
        ghostCfg.ghostLimbFix
          ? { shoeOnly: false as const }
          : this.resolveShoeOnlyConfig(participantId, outputPath);

      const rhussianaWalkScale =
        rhussianaCfg.rhussianaBodySoften ||
        leandroCfg.leandroSmoothArms ||
        bellyCfg.rhussianaBellyFlatten
          ? undefined
          : this.resolveRhussianaWalkScaleRef(participantId, frame);

      let result = await this.provider.generate({
        participantId,
        sourceImage: sourceCard,
        faceMaster,
        templateImage,
        approvedMaster,
        poseReferenceImage: this.resolvePoseReference(frame, participantId),
        secondaryTemplateImage,
        armReferenceImage,
        walk01LegHintPath,
        walk02StrongMode,
        frameName: frame,
        prompt,
        outputWidth: 576,
        outputHeight: 576,
        outputFormat: 'png',
        requireTransparentBackground: true,
        outputPath,
        shoeOnlyEdit: shoeCfg.shoeOnly,
        editBaseImage:
          rhussianaCfg.editBaseImage ??
          leandroCfg.editBaseImage ??
          bellyCfg.editBaseImage ??
          radjaHairCfg.editBaseImage ??
          radjaJacketCfg.editBaseImage ??
          izaiasJacketCfg.editBaseImage ??
          radjaWrapCfg.editBaseImage ??
          hairCfg.editBaseImage ??
          liviaCfg.editBaseImage ??
          ghostCfg.editBaseImage ??
          shoeCfg.editBaseImage,
        shoeReferenceImage: shoeCfg.shoeReferenceImage,
        shoeEditStyle: shoeCfg.shoeEditStyle,
        liviaSurgicalEdit: liviaCfg.liviaSurgical,
        liviaHairOnlyEdit: hairCfg.liviaHairOnly,
        radjaHairOnlyEdit: radjaHairCfg.radjaHairOnly,
        radjaJacketLockEdit: radjaJacketCfg.radjaJacketLock,
        izaiasJacketColorLockEdit: izaiasJacketCfg.izaiasJacketColorLock,
        radjaWrapLockEdit: radjaWrapCfg.radjaWrapLock,
        hairReferenceImage:
          leandroCfg.hairReferenceImage ??
          radjaHairCfg.hairReferenceImage ??
          hairCfg.hairReferenceImage,
        wrapReferenceImage: radjaWrapCfg.wrapReferenceImage,
        jacketReferenceImage:
          radjaJacketCfg.jacketReferenceImage ?? izaiasJacketCfg.jacketReferenceImage,
        scaleReferenceImage: liviaCfg.scaleReferenceImage ?? rhussianaWalkScale,
        ghostLimbFix: ghostCfg.ghostLimbFix,
        rhussianaBodySoftenEdit: rhussianaCfg.rhussianaBodySoften,
        bodyTypeReferenceImage:
          rhussianaCfg.bodyTypeReferenceImage ?? leandroCfg.bodyTypeReferenceImage,
        rhussianaBellyFlattenEdit: bellyCfg.rhussianaBellyFlatten,
        leandroSmoothArmsEdit: leandroCfg.leandroSmoothArms,
      });

      const durationMs = Date.now() - startTime;

      if (result.success) {
        const finalStatus = result.needsBackgroundReview ? 'generated_needs_background_review' : 'generated';
        this.state.updateParticipantFrameStatus(participantId, frame, finalStatus);
        this.publishFrameToAssets(participant, frame, outputPath);
        this.logger.log({
          participantId,
          job: `frame_${frame}`,
          frame: frame,
          provider: 'GeminiImageProvider',
          model: process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image',
          attempt,
          durationMs,
          outputPath: result.outputPath,
          sha256: result.sha256,
          result: finalStatus
        });
        console.log(`[+] Success! Output: ${result.outputPath} (sha256: ${result.sha256})`);
        console.log(`    - Original MIME: ${result.outMimeType} (${result.originalWidth}x${result.originalHeight}) - ${result.rawSize} bytes`);
        console.log(`    - Final Dimensions: ${result.width}x${result.height}`);
        console.log(`    - Alpha Channel Present: ${result.hasAlpha}`);
        if (result.needsBackgroundReview) {
            console.log(`[!] Warning: Alpha channel issues detected. Requires background review.`);
        }
      } else {
        this.state.updateParticipantFrameStatus(participantId, frame, 'failed');
        this.logger.log({
          participantId,
          job: `frame_${frame}`,
          frame: frame,
          provider: 'GeminiImageProvider',
          model: process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image',
          attempt,
          durationMs,
          result: 'failed',
          error: result.error
        });
        console.error(`[-] Failed: ${result.error}`);
      }
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      this.state.updateParticipantFrameStatus(participantId, frame, 'failed');
      this.logger.log({
        participantId,
        job: `frame_${frame}`,
        frame: frame,
        provider: 'GeminiImageProvider',
        model: process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image',
        attempt: 1,
        durationMs,
        result: 'failed',
        error: String(err)
      });
      console.error(`[-] Exception: ${String(err)}`);
    }
  }

  async generateFrames(participantId: string, dryRun: boolean = false, force: boolean = false, customPrompt?: string): Promise<void> {
    if (this.isClosedParticipant(participantId)) {
      console.log(`[!] Skipping bulk frame generation for ${participantId}: Participant is closed and locked from regeneration.`);
      return;
    }
    if (this.isLockedParticipant(participantId)) {
      console.log(
        `[!] Skipping bulk frame generation for ${participantId}: LOCKED pose-reference master set. Use generate-frame --participant ${participantId} --frame <name> --force for one frame at a time.`
      );
      return;
    }
    for (const frame of DERIVED_FRAMES) {
      await this.generateFrame(participantId, frame, dryRun, force, customPrompt);
    }
  }

  async generateContactSheet(participantId?: string, dryRun: boolean = false): Promise<void> {
    if (participantId) {
      const outPath = path.join(this.baseDir, 'review', `${participantId}_frames_contact_sheet.png`);
      if (dryRun) {
        console.log(`\n--- DRY RUN: Generate Contact Sheet for ${participantId} ---`);
        console.log(`- Expected Destination: ${outPath}`);
        return;
      }
      console.log(`\n[*] Generating frames contact sheet for ${participantId}...`);
      
      const frames = ['idle_01', ...DERIVED_FRAMES];
      const images: { path: string; name: string }[] = [];
      
      for (const frame of frames) {
        let framePath = path.join(this.baseDir, 'output', 'frames', participantId, `${frame}.png`);
        if (frame === 'idle_01') {
          const p = this.participants.get(participantId);
          if (p) framePath = this.resolveApprovedMaster(p);
        }
        if (fs.existsSync(framePath)) {
          images.push({ path: framePath, name: frame });
        }
      }
      
      if (images.length === 0) {
        console.log(`[!] No frames found for ${participantId}.`);
        return;
      }
      
      fs.mkdirSync(path.join(this.baseDir, 'review'), { recursive: true });
      
      // We will create a simple grid: 4 columns
      const cols = 4;
      const rows = Math.ceil(images.length / cols);
      const thumbSize = 256;
      const padding = 10;
      
      const width = cols * thumbSize + (cols + 1) * padding;
      const height = rows * thumbSize + (rows + 1) * padding;
      
      const composites = await Promise.all(images.map(async (img, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const x = padding + col * (thumbSize + padding);
        const y = padding + row * (thumbSize + padding);
        
        const resized = await sharp(img.path)
          .resize(thumbSize, thumbSize, { fit: 'contain', background: { r: 255, g: 0, b: 255, alpha: 1 } })
          .toBuffer();
          
        return { input: resized, left: x, top: y };
      }));
      
      const tmpOut = `${outPath}.${process.pid}.tmp.png`;
      await sharp({
        create: {
          width,
          height,
          channels: 4,
          background: { r: 50, g: 50, b: 50, alpha: 1 }
        }
      })
      .composite(composites)
      .toFile(tmpOut);
      try {
        fs.renameSync(tmpOut, outPath);
      } catch {
        fs.copyFileSync(tmpOut, outPath);
        try { fs.unlinkSync(tmpOut); } catch { /* ignore */ }
      }
      
      console.log(`[+] Contact sheet generated at ${outPath}`);
      return;
    }

    const outPath = path.join(this.baseDir, 'review', 'master_contact_sheet.png');
    
    if (dryRun) {
      console.log(`\n--- DRY RUN: Generate Contact Sheet ---`);
      console.log(`- Would scan output/masters/*/fighter_master.png`);
      console.log(`- Expected Destination: ${outPath}`);
      return;
    }
    
    console.log(`\n[!] Master contact sheet generation not fully implemented for actual run yet.`);
  }
}
