export interface GenerationRequest {
  participantId: string;
  sourceImage: string;
  faceMaster: string;
  templateImage: string;
  approvedMaster?: string;
  poseReferenceImage?: string;
  /** idle_01 template for idle_02 contrast payload */
  secondaryTemplateImage?: string;
  /** Arm pose reference for idle_02 only */
  armReferenceImage?: string;
  /** walk_01 path for text-only leg contrast in walk_02 prompt (never sent as image) */
  walk01LegHintPath?: string;
  /** Stronger Dinarte-only payload for walk_02 retry */
  walk02StrongMode?: boolean;
  /**
   * When set with shoeOnlyEdit, the existing frame/master PNG is the primary
   * identity+pose source — change footwear only.
   */
  editBaseImage?: string;
  /** Optional shoe-style reference (e.g. hurt black flats). */
  shoeReferenceImage?: string;
  /** Extremely narrow edit: keep everything identical except footwear. */
  shoeOnlyEdit?: boolean;
  /** Target footwear when shoeOnlyEdit is true. */
  shoeEditStyle?: 'black_flats' | 'white_sneakers' | 'red_sandals';
  /**
   * Lívia QA surgical edit: preserve pose/identity on editBaseImage while
   * enforcing red sandals, silver clutch, gaze, and (for victory) scale.
   */
  liviaSurgicalEdit?: boolean;
  /**
   * Lívia hair-only edit: keep EXACT pose/body/clothes/scale from editBaseImage;
   * change ONLY hair to match hairReferenceImage (idle_01 ombre).
   */
  liviaHairOnlyEdit?: boolean;
  /** Hair color/volume/length reference (idle_01). Used with liviaHairOnlyEdit / radjaHairOnlyEdit. */
  hairReferenceImage?: string;
  /** Optional Dinarte pose/scale reference (victory framing). */
  scaleReferenceImage?: string;
  /** Surgical edit: remove ghost/duplicate legs from existing lying frame. */
  ghostLimbFix?: boolean;
  /**
   * Radja hair-only edit: keep EXACT pose/body/clothes/wraps/scale from editBaseImage;
   * change ONLY hair color/volume to match hairReferenceImage (idle_01 deep black).
   */
  radjaHairOnlyEdit?: boolean;
  /**
   * Radja wrap-lock edit: keep EXACT pose/body/clothes/hair from editBaseImage;
   * add/match white hand wraps from wrapReferenceImage (idle_01). Pose locked.
   */
  radjaWrapLockEdit?: boolean;
  /** Hand-wrap accessory reference (idle_01). Used with radjaWrapLockEdit. */
  wrapReferenceImage?: string;
  /**
   * Radja jacket-lock edit: keep EXACT pose/body/hair/wraps/scale from editBaseImage;
   * match purple jacket drape (falling off shoulders) from jacketReferenceImage (idle_01).
   */
  radjaJacketLockEdit?: boolean;
  /**
   * Izaias jacket-color lock: keep EXACT pose/body/chain/hands/shoes/scale from editBaseImage;
   * match navy puffer jacket COLOR ONLY from jacketReferenceImage (idle_01).
   */
  izaiasJacketColorLockEdit?: boolean;
  /** Jacket drape/color reference (idle_01). Used with radjaJacketLockEdit / izaiasJacketColorLockEdit. */
  jacketReferenceImage?: string;
  /**
   * Rhussiana body-soften edit: keep EXACT pose/clothes/face/scale from editBaseImage;
   * change ONLY body type to soft fuller (gordinha) from bodyTypeReferenceImage + bare hands.
   */
  rhussianaBodySoftenEdit?: boolean;
  /** Soft body type reference (body_master / source). Used with rhussianaBodySoftenEdit. */
  bodyTypeReferenceImage?: string;
  /**
   * Rhussiana belly-flatten edit: keep EXACT pose/clothes/face/scale/limbs from editBaseImage;
   * reduce ONLY an overly round/protruding midsection — still soft/gordinha, not ripped.
   */
  rhussianaBellyFlattenEdit?: boolean;
  /**
   * Leandro smooth-arms edit: keep EXACT pose/clothes/face/hair/scale from editBaseImage;
   * change ONLY arms/shoulders to SMOOTH non-muscular from bodyTypeReferenceImage.
   */
  leandroSmoothArmsEdit?: boolean;
  /**
   * Erikson watch laterality edit: keep EXACT pose/body/clothes from editBaseImage;
   * move watch to LEFT wrist (walks) or remove watch from visible RIGHT wrist (attack/lying).
   */
  eriksonWatchLockEdit?: boolean;
  /** Watch style reference (idle_02 / idle_01 left wrist). Used with eriksonWatchLockEdit move_left. */
  watchReferenceImage?: string;
  /** move_left = walks; remove_right = attack/lying when left arm hidden. */
  eriksonWatchMode?: 'move_left' | 'remove_right';
  frameName?: string;
  prompt: string;
  outputWidth: number;
  outputHeight: number;
  outputFormat: 'png';
  requireTransparentBackground: boolean;
  outputPath?: string;
}

export interface GenerationResult {
  success: boolean;
  error?: string;
  outputPath?: string;
  sha256?: string;
  width?: number;
  height?: number;
  hasAlpha?: boolean;
  needsBackgroundReview?: boolean;
  rawExtension?: string;
  rawSize?: number;
  originalWidth?: number;
  originalHeight?: number;
  outMimeType?: string;
}

export interface ImageGenerationProvider {
  generate(request: GenerationRequest): Promise<GenerationResult>;
}
