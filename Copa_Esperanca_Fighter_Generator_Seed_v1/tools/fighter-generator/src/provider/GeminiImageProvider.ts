import { ImageGenerationProvider, GenerationRequest, GenerationResult } from './ImageGenerationProvider.js';
import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import * as crypto from 'crypto';
import {
  detectForwardLeg,
  oppositeLeg,
  formatLegHint,
  ForwardLeg,
} from '../utils/walkLegAnalysis.js';

function fileToBase64(filePath: string): string {
  return fs.readFileSync(filePath).toString('base64');
}

function pngPart(filePath: string) {
  return { inlineData: { data: fileToBase64(filePath), mimeType: 'image/png' } };
}

/** Atomic-ish write to reduce Windows file-lock failures when viewers hold the target open. */
function safeWriteFileSync(filePath: string, data: Buffer | string) {
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, data);
  try {
    fs.renameSync(tmp, filePath);
  } catch {
    try {
      fs.copyFileSync(tmp, filePath);
    } finally {
      try {
        fs.unlinkSync(tmp);
      } catch {
        /* ignore */
      }
    }
  }
}

export class GeminiImageProvider implements ImageGenerationProvider {
  private apiKey: string;
  private model: string;
  private ai: GoogleGenAI;

  constructor(apiKey: string, model: string = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image') {
    if (!apiKey) {
      throw new Error('API key is missing.');
    }
    this.apiKey = apiKey;
    this.model = model;
    this.ai = new GoogleGenAI({ apiKey: this.apiKey });
  }

  private buildFatinhaWalkParts(request: GenerationRequest, sourceB64: string, faceB64: string): { parts: any[]; baseRule: string } {
    const parts: any[] = [];
    
    parts.push({ text: 'IMAGE 1 (POSE/SKELETON ONLY): You MUST copy the leg and arm positions from this image. DO NOT copy the clothes, colors, hair, or face from this image. DO NOT copy the blue clothes or cap. This is JUST A SKELETON.' });

    const poseRefB64 = request.poseReferenceImage && fs.existsSync(request.poseReferenceImage)
      ? fileToBase64(request.poseReferenceImage)
      : null;

    if (poseRefB64) {
      parts.push({ inlineData: { data: poseRefB64, mimeType: 'image/png' } });
    } else if (fs.existsSync(request.templateImage)) {
      parts.push({ inlineData: { data: fileToBase64(request.templateImage), mimeType: 'image/png' } });
    }

    parts.push({ text: 'IMAGE 2 (ABSOLUTE IDENTITY SOURCE): This is the EXACT character you must draw. You MUST use her YELLOW clothes, her hair, her face, and her exact colors. DO NOT deviate from this visual identity.' });
    if (request.approvedMaster && fs.existsSync(request.approvedMaster)) {
      parts.push(pngPart(request.approvedMaster));
    }
    
    parts.push({ text: 'Face reference (appearance only):' });
    parts.push({ inlineData: { data: faceB64, mimeType: 'image/png' } });
    parts.push({ text: 'Source card (clothes and colors only):' });
    parts.push({ inlineData: { data: sourceB64, mimeType: 'image/jpeg' } });

    const baseRule = `CRITICAL RULE: Draw the character from Image 2 (Identity) in the exact pose of Image 1 (Skeleton).
DO NOT copy the visual identity (clothes, hair, face) of Image 1. Image 1 is ONLY for the pose.
The character MUST look EXACTLY like Image 2, wearing the same YELLOW outfit (yellow jacket, yellow skirt).
Solid magenta background (#FF00FF).`;

    return { parts, baseRule };
  }

  private buildDefaultParts(request: GenerationRequest, sourceB64: string, faceB64: string, templateB64: string): { parts: any[]; baseRule: string } {
    const parts: any[] = [];
    const hasPoseRef = !!(request.poseReferenceImage && fs.existsSync(request.poseReferenceImage));
    const isRhussiana = request.participantId === 'rhussiana';
    const isRhussianaMaster = isRhussiana && (!request.frameName || request.frameName === 'idle_01');
    const isAna = request.participantId === 'ana';
    const isAnaMaster = isAna && (!request.frameName || request.frameName === 'idle_01');
    const isLeandroMaster =
      request.participantId === 'leandro' && (!request.frameName || request.frameName === 'idle_01');
    const isRicardoMaster =
      request.participantId === 'ricardo' && (!request.frameName || request.frameName === 'idle_01');

    // Ricardo master: NORMAL average body + royal-blue Under Armour tee; smooth arms (NOT Dinarte muscles).
    if (isRicardoMaster) {
      const bodyMasterPath = path.join(path.dirname(request.sourceImage), 'body_master.png');
      const clothesLockPath = path.join(path.dirname(request.sourceImage), 'fighter', 'idle_01.png');
      const seedAssetsDinarteIdle = path.join(
        path.dirname(request.sourceImage),
        '..',
        'dinarte',
        'fighter',
        'idle_01.png'
      );
      const posePath =
        request.poseReferenceImage && fs.existsSync(request.poseReferenceImage)
          ? request.poseReferenceImage
          : fs.existsSync(seedAssetsDinarteIdle)
            ? seedAssetsDinarteIdle
            : request.templateImage;

      parts.push({
        text: 'IMAGE IDENTITY (SMOOTH ARMS + ROYAL BLUE UA TEE — HIGHEST PRIORITY): Ricardo has SMOOTH flat arms with ZERO muscle definition — no biceps, no triceps, no delts, no forearm veins. NORMAL average everyday male build (NOT skinny, NOT buff). Soft cylindrical arms like a non-athlete. Royal-blue crew-neck short-sleeve t-shirt with a large light-blue Under Armour logo centered on the chest. Dark charcoal/black athletic pants. Dark sneakers. Short dark buzz-cut hair. Clean-shaven. Medium tan skin. BARE wrists and BARE hands. FORBIDDEN: bodybuilder physique, Dinarte musculature, black tank top, gloves, watches.',
      });
      parts.push({ inlineData: { data: sourceB64, mimeType: 'image/jpeg' } });
      if (fs.existsSync(bodyMasterPath)) {
        parts.push({
          text: 'IDENTITY LOCK (portrait — face/hair/blue tee/logo): Copy EXACT face, short dark buzz hair, royal-blue tee, light-blue Under Armour logo. Soft non-muscular arm volume only — ZERO muscle shading. Do NOT copy green background, UI, or ghost face.',
        });
        parts.push(pngPart(bodyMasterPath));
        parts.push({ text: 'BODY TYPE LOCK AGAIN (SMOOTH arms — NOT buff fighter arms):' });
        parts.push(pngPart(bodyMasterPath));
      }
      if (fs.existsSync(clothesLockPath)) {
        parts.push({
          text: 'CLOTHES + HAIR LOCK (existing idle_01): Keep EXACT royal-blue UA tee + dark athletic pants + dark sneakers + EXACT same short dark buzz hair. Arms SMOOTH.',
        });
        parts.push(pngPart(clothesLockPath));
      }
      parts.push({ text: 'Face reference:' });
      parts.push({ inlineData: { data: faceB64, mimeType: 'image/png' } });
      parts.push({
        text: 'POSE/SKELETON ONLY: Copy ONLY idle fighting stance limb positions, footprint, and framing. DO NOT copy clothes, gender, or muscular body from this pose ref (Dinarte musculature is FORBIDDEN). Put SMOOTH-armed NORMAL Ricardo into this pose.',
      });
      parts.push(pngPart(posePath));
      parts.push({ text: 'POSE AGAIN (confirm idle footprint — same scale, NOT undersized):' });
      parts.push(pngPart(posePath));

      const baseRule = `RICARDO MASTER (idle_01) CRITICAL:
1) ARMS: SMOOTH / LISOS — ZERO visible muscles (no biceps, triceps, delts, forearm cuts, veins). Soft flat cylindrical arms.
2) BODY: NORMAL average male — NOT skinny, NOT muscular/buff/ripped. Muscular arms are Dinarte-only — NEVER for Ricardo.
3) HANDS/WRISTS: BARE SKIN — NO gloves, NO watches, NO wristbands.
4) OUTFIT: royal-blue crew-neck short-sleeve t-shirt with large light-blue Under Armour logo on chest + dark charcoal/black athletic pants + dark sneakers.
5) HAIR: short dark buzz cut — keep consistent for all future frames. Clean-shaven. Medium tan skin.
6) POSE: idle fighting guard stance matching pose skeleton footprint in 576x576 (~70-80% canvas height).
7) Solid magenta (#FF00FF). EXACTLY ONE character — NO collage, NO contact sheet, NO multi-sprite.`;
      return { parts, baseRule };
    }

    // Leandro master: NORMAL average body (not skinny, not buff) + black tee / dark cargo lock.
    if (isLeandroMaster) {
      const clothesLockPath = path.join(path.dirname(request.sourceImage), 'fighter', 'idle_01.png');
      const seedAssetsDinarteIdle = path.join(
        path.dirname(request.sourceImage),
        '..',
        'dinarte',
        'fighter',
        'idle_01.png'
      );
      const posePath =
        request.poseReferenceImage && fs.existsSync(request.poseReferenceImage)
          ? request.poseReferenceImage
          : fs.existsSync(seedAssetsDinarteIdle)
            ? seedAssetsDinarteIdle
            : request.templateImage;

      // Prefer face + clothes lock over source_card for body: source_card shows muscular arms + watch.
      parts.push({ text: 'Face reference (identity):' });
      parts.push({ inlineData: { data: faceB64, mimeType: 'image/png' } });
      parts.push({
        text: 'SOURCE CARD (clothes/hair colors ONLY — IGNORE arm muscles and IGNORE the watch on the wrist): plain black tee, short dark fade hair. Arms must be SMOOTH — do NOT copy muscular shading from this card.',
      });
      parts.push({ inlineData: { data: sourceB64, mimeType: 'image/jpeg' } });
      if (fs.existsSync(clothesLockPath)) {
        parts.push({
          text: 'CLOTHES + HAIR LOCK (existing idle_01): Keep EXACT black t-shirt + dark cargo pants + black sneakers with white soles + EXACT same short dark fade hair. Remove any watch/wristband. Do NOT copy muscular arm shading — arms must be SMOOTH.',
        });
        parts.push(pngPart(clothesLockPath));
      }
      parts.push({
        text: 'POSE/SKELETON ONLY: Copy ONLY idle fighting stance limb positions (fists UP in guard), footprint, and framing. DO NOT copy clothes, gender, or muscular body from this pose ref (Dinarte musculature is FORBIDDEN). Put SMOOTH-armed NORMAL Leandro into this pose.',
      });
      parts.push(pngPart(posePath));
      parts.push({ text: 'POSE AGAIN (confirm idle fighting guard — fists raised, same scale, NOT undersized):' });
      parts.push(pngPart(posePath));

      const baseRule = `LEANDRO MASTER (idle_01) CRITICAL:
1) ARMS: SMOOTH / LISOS — ZERO visible muscles (no biceps, triceps, delts, forearm cuts, veins). Soft flat cylindrical arms like a non-athlete. Source card muscular arms are WRONG — override them.
2) BODY: NORMAL average male — NOT skinny, NOT muscular/buff/ripped. Muscular arms are Dinarte-only exception — NEVER apply to Leandro.
3) HANDS/WRISTS: BARE SKIN — NO gloves, NO watches, NO wristbands (ignore watch on source card).
4) OUTFIT: plain black crew-neck short-sleeve t-shirt + dark charcoal/black cargo pants + black sneakers with white soles/laces. Optional thin brown belt OK.
5) HAIR: short dark fade / buzz — keep consistent for all future frames.
6) POSE: idle fighting guard stance with fists raised matching pose skeleton footprint in 576x576 (~70-80% canvas height).
7) Solid magenta (#FF00FF). EXACTLY ONE character — NO collage, NO contact sheet, NO multi-sprite.`;
      return { parts, baseRule };
    }

    // Soft body FIRST — fighting templates bias the model toward a muscular physique.
    if (isRhussianaMaster) {
      const bodyMasterPath = path.join(path.dirname(request.sourceImage), 'body_master.png');
      const seedAssetsDinarteIdle = path.join(
        path.dirname(request.sourceImage),
        '..',
        'dinarte',
        'fighter',
        'idle_01.png'
      );
      const posePath =
        request.poseReferenceImage && fs.existsSync(request.poseReferenceImage)
          ? request.poseReferenceImage
          : fs.existsSync(seedAssetsDinarteIdle)
            ? seedAssetsDinarteIdle
            : request.templateImage;

      parts.push({
        text: 'IMAGE IDENTITY (NORMAL BODY + LONGER DRESS — HIGHEST PRIORITY): Rhussiana has a NORMAL average slim body (mais magra / normal body) — NOT plump/gordinha, NOT muscular/buff/ripped. Soft smooth arms with ZERO muscle definition. Flat natural midsection. Black strapless dress with visible ruffle hem (babado) that ends EXACTLY one finger above the knee — NOT a mini/short vulgar skirt. BARE HANDS. Gold earrings/hair clip + GOLD heeled sandals. FORBIDDEN: short mini dress ending mid-thigh; FORBIDDEN: muscular/buffed physique; FORBIDDEN: plump round belly.',
      });
      parts.push({ inlineData: { data: sourceB64, mimeType: 'image/jpeg' } });
      if (fs.existsSync(bodyMasterPath)) {
        parts.push({
          text: 'FACE/HAIR LOCK ONLY from body portrait: keep face and hair. DO NOT copy a plump body if the portrait looks fuller — target NORMAL slim average body. Bare hands.',
        });
        parts.push(pngPart(bodyMasterPath));
      }
      parts.push({ text: 'Face reference:' });
      parts.push({ inlineData: { data: faceB64, mimeType: 'image/png' } });
      parts.push({
        text: 'POSE/SKELETON ONLY: Copy ONLY idle fighting stance limb positions, footprint, and framing. DO NOT copy clothes, gender, or muscular body from this pose ref. Put the NORMAL-slim Rhussiana body + knee-length ruffled dress into this pose.',
      });
      parts.push(pngPart(posePath));
      parts.push({ text: 'POSE AGAIN (confirm idle footprint, not compressed):' });
      parts.push(pngPart(posePath));

      const baseRule = `RHUSSIANA MASTER (idle_01) CRITICAL:
1) BODY: NORMAL average slim (mais magra) — NOT gordinha/plump, NOT muscular/buff. Soft smooth arms/legs — NO muscle definition. Midsection flat/natural. Slimmer thighs than a curvy mini-dress fighter.
2) HANDS: BARE SKIN fists — NO boxing/fighter/fingerless gloves.
3) OUTFIT HARD FAIL: black strapless dress WITH layered babado/ruffle hem. Hem MUST cover most of the thighs and end ONLY ~1 finger width ABOVE the kneecap (almost knee-length). The knees themselves must be clearly VISIBLE below the hem. FORBIDDEN: mini/short mid-thigh dress; FORBIDDEN: hem ending high on the thigh with lots of bare thigh showing.
4) GOLD heeled sandals + gold hair clip/earrings.
5) POSE: idle fighting guard stance matching pose skeleton footprint in 576x576.
6) Solid magenta (#FF00FF). ONE character only.`;
      return { parts, baseRule };
    }

    // Ana master: FEMALE emerald one-shoulder gown + pink glasses + bun (NOT male / NOT Dinarte muscles).
    if (isAnaMaster) {
      const bodyMasterPath = path.join(path.dirname(request.sourceImage), 'body_master.png');
      const seedAssetsDinarteIdle = path.join(
        path.dirname(request.sourceImage),
        '..',
        'dinarte',
        'fighter',
        'idle_01.png'
      );
      const posePath =
        request.poseReferenceImage && fs.existsSync(request.poseReferenceImage)
          ? request.poseReferenceImage
          : fs.existsSync(seedAssetsDinarteIdle)
            ? seedAssetsDinarteIdle
            : request.templateImage;

      parts.push({
        text: 'IMAGE IDENTITY (FEMALE — HIGHEST PRIORITY): Ana is a WOMAN. NORMAL female presentation — soft smooth arms with ZERO muscle definition. NOT male. NOT Dinarte musculature. NOT a bodybuilder. Warm tan/olive skin. Dark hair in a HIGH BUN with two loose wavy strands framing the face. Rose-pink / lavender rounded eyeglasses ALWAYS on. Small gold hoop earrings. EMERALD GREEN one-shoulder gown: strap on her LEFT shoulder, RIGHT shoulder BARE, matching emerald sash/belt knotted at the waist. Long hem near the ankles so feet stay visible. Matching dark/emerald closed-toe heels. BARE HANDS. NO WATCH. FORBIDDEN: black tank, cargo pants, sneakers, red Livia dress, black Rhussiana dress, male body, ripped arms, missing glasses, missing bun.',
      });
      parts.push({ inlineData: { data: sourceB64, mimeType: 'image/jpeg' } });
      if (fs.existsSync(bodyMasterPath)) {
        parts.push({
          text: 'FACE/HAIR/GLASSES/DRESS LOCK from body portrait: copy EXACT face, high bun + face-framing strands, rose-pink glasses, gold hoops, emerald one-shoulder top. Ignore green UI background. Ignore hands-in-pockets photo pose — fighting idle uses raised fists. Soft non-muscular female arms.',
        });
        parts.push(pngPart(bodyMasterPath));
      }
      parts.push({ text: 'Face reference:' });
      parts.push({ inlineData: { data: faceB64, mimeType: 'image/png' } });
      parts.push({
        text: 'POSE/SKELETON ONLY: Copy ONLY idle fighting stance limb positions, footprint, and framing. DO NOT copy clothes, gender, or muscular body from this pose ref. Put FEMALE Ana (emerald gown + glasses + bun) into this pose. Fists raised in guard like the skeleton — NOT hands in pockets.',
      });
      parts.push(pngPart(posePath));
      parts.push({ text: 'POSE AGAIN (confirm idle footprint, fists in guard, same scale, NOT undersized):' });
      parts.push(pngPart(posePath));

      const baseRule = `ANA MASTER (idle_01) CRITICAL:
1) GENDER/BODY: FEMALE — NORMAL female presentation. Soft smooth arms/shoulders. ZERO visible muscle. FORBIDDEN: male body, Dinarte musculature, ripped biceps/delts.
2) FACE: warm tan/olive skin; wide friendly smile; rose-pink rounded glasses ALWAYS; gold hoop earrings.
3) HAIR: dark high bun + two loose wavy strands framing the face. SAME silhouette every future frame.
4) OUTFIT HARD FAIL: EMERALD GREEN one-shoulder gown (strap on LEFT shoulder, RIGHT shoulder BARE) + matching emerald sash/belt knotted at waist. Long hem near ankles. Matching dark/emerald closed-toe heels. FORBIDDEN: red dress, black dress, tank, jeans, sneakers, missing glasses, missing bun.
5) HANDS/WRISTS: BARE SKIN fists — NO boxing gloves, NO watch (source has none).
6) POSE: idle fighting guard matching pose skeleton footprint in 576x576 (~70-80% canvas). Gaze 3/4 RIGHT toward opponent.
7) IGNORE source-card UI (name WEN, stats, green vortex). Solid magenta (#FF00FF). EXACTLY ONE character.`;
      return { parts, baseRule };
    }

    const isAlexandreMaster =
      request.participantId === 'alexandre' && (!request.frameName || request.frameName === 'idle_01');
    if (isAlexandreMaster) {
      const seedAssetsDinarteIdle = path.join(
        path.dirname(request.sourceImage),
        '..',
        'dinarte',
        'fighter',
        'idle_01.png'
      );
      const posePath =
        request.poseReferenceImage && fs.existsSync(request.poseReferenceImage)
          ? request.poseReferenceImage
          : fs.existsSync(seedAssetsDinarteIdle)
            ? seedAssetsDinarteIdle
            : request.templateImage;

      parts.push({
        text: 'IMAGE IDENTITY (CLOTHES/FACE COLORS ONLY — IGNORE PHOTO POSE AND CAMERA STARE): Alexandre = black baseball cap brim forward, thick WHITE-framed sunglasses, salt-and-pepper beard with GREY/WHITE chin, silver chain, black short-sleeve patterned tee, black athletic shorts, black sneakers, dense black tattoo on RIGHT forearm, NO watch, NORMAL smooth non-muscular arms. Source card looks at CAMERA — DO NOT copy that head angle.',
      });
      parts.push({ inlineData: { data: sourceB64, mimeType: 'image/jpeg' } });
      parts.push({ text: 'Face reference (appearance only — ignore photo gaze):' });
      parts.push({ inlineData: { data: faceB64, mimeType: 'image/png' } });
      parts.push({
        text: 'POSE + HEAD ANGLE (Dinarte idle_01 skeleton — HIGHEST PRIORITY): Copy idle fighting stance AND 3/4 head turn toward the RIGHT (opponent). Nose and cap brim point RIGHT. We should see more of the near cheek in 3/4 — NOT a passport/front portrait. FORBIDDEN full-front camera stare. Do NOT copy Dinarte clothes or muscles.',
      });
      parts.push(pngPart(posePath));
      parts.push({ text: 'POSE AGAIN (confirm 3/4 RIGHT gaze + idle guard):' });
      parts.push(pngPart(posePath));
      parts.push({ text: 'POSE A 3RD TIME (HEAD ANGLE LOCK — look RIGHT at opponent, never at camera):' });
      parts.push(pngPart(posePath));

      const baseRule = `ALEXANDRE MASTER (idle_01) CRITICAL:
1) GAZE HARD FAIL: Head in 3/4 profile looking RIGHT at the opponent (Dinarte idle head angle). Nose and cap brim point RIGHT. FORBIDDEN: looking at camera, full-front face, both ears equally visible like a portrait.
2) OUTFIT: black baseball cap, WHITE sunglasses, salt-and-pepper beard, silver chain, black patterned tee, black athletic shorts, black sneakers, RIGHT forearm tattoo, NO watch.
3) ARMS: SMOOTH / LISOS. BODY: NORMAL average lean male — NOT Dinarte muscular.
4) POSE: idle fighting guard matching Dinarte idle skeleton, footprint ~70-80% of 576x576.
5) IGNORE source-card camera pose / thumbs-up / green vortex / WDX UI.
6) Solid magenta (#FF00FF). EXACTLY ONE character.`;
      return { parts, baseRule };
    }

    const isCaioMaster =
      request.participantId === 'caio' && (!request.frameName || request.frameName === 'idle_01');
    if (isCaioMaster) {
      const seedAssetsDinarteIdle = path.join(
        path.dirname(request.sourceImage),
        '..',
        'dinarte',
        'fighter',
        'idle_01.png'
      );
      const posePath =
        request.poseReferenceImage && fs.existsSync(request.poseReferenceImage)
          ? request.poseReferenceImage
          : fs.existsSync(seedAssetsDinarteIdle)
            ? seedAssetsDinarteIdle
            : request.templateImage;
      const bodyMasterPath = path.join(path.dirname(request.sourceImage), 'body_master.png');

      parts.push({
        text: 'IMAGE IDENTITY (CLOTHES/FACE COLORS ONLY — IGNORE PHOTO POSE AND CAMERA STARE): Caio = medium-tan skin, short dark fade hair (textured top, faded sides), groomed short dark beard + mustache, small silver/white stud earring in the RIGHT ear, thin silver chain over a PLAIN black crew-neck short-sleeve t-shirt, dark charcoal jeans, black sneakers with white soles, NO watch, NORMAL smooth non-muscular arms. Source card looks at CAMERA / arms crossed — DO NOT copy that pose or head angle.',
      });
      parts.push({ inlineData: { data: sourceB64, mimeType: 'image/jpeg' } });
      if (fs.existsSync(bodyMasterPath)) {
        parts.push({
          text: 'FACE/HAIR/TEE LOCK from body portrait: copy EXACT face, fade hair, beard, silver chain, RIGHT-ear stud, plain black crew-neck tee. Ignore green UI background. Ignore crossed-arms photo pose — fighting idle uses raised fists. Soft non-muscular arms.',
        });
        parts.push(pngPart(bodyMasterPath));
      }
      parts.push({ text: 'Face reference (appearance only — ignore photo gaze):' });
      parts.push({ inlineData: { data: faceB64, mimeType: 'image/png' } });
      parts.push({
        text: 'POSE + HEAD ANGLE (Dinarte idle_01 skeleton — HIGHEST PRIORITY): Copy idle fighting stance AND 3/4 head turn toward the RIGHT (opponent). Nose points RIGHT. We should see more of the near cheek in 3/4 — NOT a passport/front portrait. FORBIDDEN full-front camera stare. Do NOT copy Dinarte clothes or muscles. Fists raised in guard — NOT arms crossed.',
      });
      parts.push(pngPart(posePath));
      parts.push({ text: 'POSE AGAIN (confirm 3/4 RIGHT gaze + idle guard, same scale, NOT undersized):' });
      parts.push(pngPart(posePath));
      parts.push({ text: 'POSE A 3RD TIME (HEAD ANGLE LOCK — look RIGHT at opponent, never at camera):' });
      parts.push(pngPart(posePath));

      const baseRule = `CAIO MASTER (idle_01) CRITICAL:
1) GAZE HARD FAIL: Head in 3/4 profile looking RIGHT at the opponent (Dinarte idle head angle). Nose points RIGHT. FORBIDDEN: looking at camera, full-front face, both ears equally visible like a portrait.
2) OUTFIT: PLAIN black crew-neck short-sleeve t-shirt + thin silver chain over the collar + small silver stud in RIGHT ear + dark charcoal jeans + black sneakers with white soles. NO watch.
3) FACE: medium-tan skin; short dark fade hair; groomed short dark beard + mustache.
4) ARMS: SMOOTH / LISOS. BODY: NORMAL average lean male — NOT Dinarte muscular. Source-card muscles are WRONG — override them.
5) HANDS/WRISTS: BARE SKIN fists — NO boxing gloves, NO watch (source has none). If a watch were ever visible it MUST be LEFT wrist only.
6) POSE: idle fighting guard matching Dinarte idle skeleton, footprint ~70-80% of 576x576. FORBIDDEN crossed-arms photo pose.
7) IGNORE source-card UI (name WDX, green pagoda, green vortex). Solid magenta (#FF00FF). EXACTLY ONE character.`;
      return { parts, baseRule };
    }

    const isEvellynMaster =
      request.participantId === 'evellyn' && (!request.frameName || request.frameName === 'idle_01');
    if (isEvellynMaster) {
      const bodyMasterPath = path.join(path.dirname(request.sourceImage), 'body_master.png');
      const seedAssetsDinarteIdle = path.join(
        path.dirname(request.sourceImage),
        '..',
        'dinarte',
        'fighter',
        'idle_01.png'
      );
      const posePath =
        request.poseReferenceImage && fs.existsSync(request.poseReferenceImage)
          ? request.poseReferenceImage
          : fs.existsSync(seedAssetsDinarteIdle)
            ? seedAssetsDinarteIdle
            : request.templateImage;

      parts.push({
        text: 'IMAGE IDENTITY (FEMALE — HIGHEST PRIORITY): Evellyn is a WOMAN. NORMAL female presentation — soft smooth arms with ZERO muscle definition. NOT male. NOT Dinarte musculature. NOT a bodybuilder. Medium tan/warm golden skin. LONG STRAIGHT JET-BLACK hair, side-parted, falling over BOTH shoulders down to mid-torso/waist. Dark brown almond eyes, thin arched dark brows, muted rose/mauve lips, gentle closed-mouth smile. PLAIN dark navy / charcoal short-sleeve crew-neck t-shirt (no logo). Dark charcoal pants. Dark low-top sneakers matching the dark outfit. BARE HANDS. NO WATCH. NO jewelry. NO glasses. FORBIDDEN: male body, ripped arms, bun, short hair, emerald Ana gown, red Livia dress, black Rhussiana dress, adding a watch.',
      });
      parts.push({ inlineData: { data: sourceB64, mimeType: 'image/jpeg' } });
      if (fs.existsSync(bodyMasterPath)) {
        parts.push({
          text: 'FACE/HAIR/TEE LOCK from body portrait: copy EXACT face, long straight black hair over both shoulders, dark navy crew-neck tee, tan skin. Ignore green UI background. Ignore hand-on-hip photo pose — fighting idle uses raised fists. Soft non-muscular female arms.',
        });
        parts.push(pngPart(bodyMasterPath));
      }
      parts.push({ text: 'Face reference:' });
      parts.push({ inlineData: { data: faceB64, mimeType: 'image/png' } });
      parts.push({
        text: 'POSE/SKELETON ONLY: Copy ONLY idle fighting stance limb positions, footprint, and framing. DO NOT copy clothes, gender, or muscular body from this pose ref. Put FEMALE Evellyn (long black hair + dark navy tee + charcoal pants) into this pose. Fists raised in guard like the skeleton — NOT hand on hip.',
      });
      parts.push(pngPart(posePath));
      parts.push({ text: 'POSE AGAIN (confirm idle footprint, fists in guard, same scale, NOT undersized):' });
      parts.push(pngPart(posePath));

      const baseRule = `EVELLYN MASTER (idle_01) CRITICAL:
1) GENDER/BODY: FEMALE — NORMAL female presentation. Soft smooth arms/shoulders. ZERO visible muscle. FORBIDDEN: male body, Dinarte musculature, ripped biceps/delts.
2) FACE: medium tan/warm skin; dark almond eyes; thin arched brows; muted rose lips; gentle smile. NO glasses. NO jewelry.
3) HAIR: LONG STRAIGHT JET-BLACK, side-parted, over BOTH shoulders to mid-torso/waist. SAME silhouette every future frame. FORBIDDEN bun, short hair, curly hair.
4) OUTFIT HARD FAIL: PLAIN dark navy/charcoal short-sleeve crew-neck tee (no logo) + dark charcoal pants + dark sneakers. FORBIDDEN: dresses, tank, cargo, adding watch/jewelry/glasses.
5) HANDS/WRISTS: BARE SKIN fists — NO boxing gloves, NO watch (source has none).
6) POSE: idle fighting guard matching pose skeleton footprint in 576x576 (~70-80% canvas). Gaze 3/4 RIGHT toward opponent.
7) IGNORE source-card UI (name WDX, stats, green vortex). Solid magenta (#FF00FF). EXACTLY ONE character.`;
      return { parts, baseRule };
    }

    const isDanielMaster =
      request.participantId === 'daniel' && (!request.frameName || request.frameName === 'idle_01');
    if (isDanielMaster) {
      const seedAssetsDinarteIdle = path.join(
        path.dirname(request.sourceImage),
        '..',
        'dinarte',
        'fighter',
        'idle_01.png'
      );
      const posePath =
        request.poseReferenceImage && fs.existsSync(request.poseReferenceImage)
          ? request.poseReferenceImage
          : fs.existsSync(seedAssetsDinarteIdle)
            ? seedAssetsDinarteIdle
            : request.templateImage;
      const bodyMasterPath = path.join(path.dirname(request.sourceImage), 'body_master.png');

      parts.push({
        text: 'IMAGE IDENTITY (CLOTHES/FACE COLORS ONLY — IGNORE PHOTO POSE AND CAMERA STARE): Daniel = light-tan skin, short dark fade hair (textured top, faded sides), thin dark mustache + small goatee, metal braces on teeth when smiling, WHITE short-sleeve polo, dark blue slim jeans, white slip-on canvas sneakers, dense BLACK SLEEVE TATTOO on the RIGHT arm (shoulder to wrist), chunky GOLD watch on LEFT wrist, keys hanging from RIGHT hip belt loop, NORMAL smooth non-muscular arms. Source card may look at CAMERA / shaka pose — DO NOT copy that pose or head angle. THIS IS DANIEL, NOT DAVID.',
      });
      parts.push({ inlineData: { data: sourceB64, mimeType: 'image/jpeg' } });
      if (fs.existsSync(bodyMasterPath)) {
        parts.push({
          text: 'FACE/HAIR/POLO/TATTOO LOCK from body portrait: copy EXACT face, fade hair, mustache+goatee, braces, WHITE polo, RIGHT-arm sleeve tattoo, gold watch, keys on right hip. Ignore green UI background. Ignore shaka/hands-in-pocket photo pose — fighting idle uses raised fists. Soft non-muscular arms. Gold watch must end on LEFT wrist in the sprite (idle_01 laterality).',
        });
        parts.push(pngPart(bodyMasterPath));
      }
      parts.push({ text: 'Face reference (appearance only — ignore photo gaze):' });
      parts.push({ inlineData: { data: faceB64, mimeType: 'image/png' } });
      parts.push({
        text: 'POSE + HEAD ANGLE (Dinarte idle_01 skeleton — HIGHEST PRIORITY): Copy idle fighting stance AND 3/4 head turn toward the RIGHT (opponent). Nose points RIGHT. We should see more of the near cheek in 3/4 — NOT a passport/front portrait. FORBIDDEN full-front camera stare. Do NOT copy Dinarte clothes or muscles. Fists raised in guard — NOT shaka, NOT hands in pockets.',
      });
      parts.push(pngPart(posePath));
      parts.push({ text: 'POSE AGAIN (confirm 3/4 RIGHT gaze + idle guard, same scale, NOT undersized):' });
      parts.push(pngPart(posePath));
      parts.push({ text: 'POSE A 3RD TIME (HEAD ANGLE LOCK — look RIGHT at opponent, never at camera):' });
      parts.push(pngPart(posePath));

      const danielMasterRule = `DANIEL MASTER (idle_01) CRITICAL:
1) GAZE HARD FAIL: Head in 3/4 profile looking RIGHT at the opponent (Dinarte idle head angle). Nose points RIGHT. FORBIDDEN: looking at camera, full-front face, both ears equally visible like a portrait.
2) OUTFIT: WHITE short-sleeve polo + dark blue slim jeans + white slip-on canvas sneakers. Keys on RIGHT hip belt loop.
3) FACE: light-tan skin; short dark fade hair; thin mustache + small goatee; metal braces visible if mouth open.
4) RIGHT ARM: dense black sleeve tattoo whenever the right arm is visible. NEVER move the tattoo to the left arm.
5) LEFT WRIST: chunky GOLD watch (idle_01 laterality). NEVER put the watch on the right wrist.
6) ARMS: SMOOTH / LISOS. BODY: NORMAL average lean male — NOT Dinarte muscular.
7) POSE: idle fighting guard matching Dinarte idle skeleton, footprint ~70-80% of 576x576. FORBIDDEN source-card shaka / pocket pose.
8) THIS IS DANIEL — NOT DAVID. IGNORE source-card UI (WDX, green vortex). Solid magenta (#FF00FF). EXACTLY ONE character.`;
      return { parts, baseRule: danielMasterRule };
    }

    const isFabioMaster =
      request.participantId === 'fabio' && (!request.frameName || request.frameName === 'idle_01');
    if (isFabioMaster) {
      const seedAssetsDinarteIdle = path.join(
        path.dirname(request.sourceImage),
        '..',
        'dinarte',
        'fighter',
        'idle_01.png'
      );
      const posePath =
        request.poseReferenceImage && fs.existsSync(request.poseReferenceImage)
          ? request.poseReferenceImage
          : fs.existsSync(seedAssetsDinarteIdle)
            ? seedAssetsDinarteIdle
            : request.templateImage;
      const bodyMasterPath = path.join(path.dirname(request.sourceImage), 'body_master.png');

      parts.push({
        text: 'IMAGE IDENTITY (CLOTHES/FACE COLORS ONLY — IGNORE PHOTO POSE AND CAMERA STARE): Fabio = medium-tan/olive skin, short dark fade hair (textured top brushed slightly up, faded sides), thin dark mustache + small neat goatee, NAVY BLUE tailored blazer with lapels over a WHITE button-down shirt with the top buttons OPEN (NO necktie), dark CHEST TATTOO visible in the open collar, matching navy dress pants, bright WHITE sneakers with white laces, silver watch on LEFT wrist, NORMAL smooth non-muscular arms. Source card looks at CAMERA / hand in pocket — DO NOT copy that pose or head angle. THIS IS FABIO, NOT JOAO (Joao has magenta tie + dress shoes) and NOT JAILSON (Jailson has black tee + glasses + jeans).',
      });
      parts.push({ inlineData: { data: sourceB64, mimeType: 'image/jpeg' } });
      if (fs.existsSync(bodyMasterPath)) {
        parts.push({
          text: 'FACE/HAIR/BLAZER/SHIRT/TATTOO LOCK from body portrait: copy EXACT face, fade hair, mustache+goatee, navy blazer, white open-collar shirt, chest tattoo in the V, white sneakers. Ignore green UI background. Ignore hand-in-pocket photo pose — fighting idle uses raised fists. Soft non-muscular arms. Silver watch must end on LEFT wrist in the sprite.',
        });
        parts.push(pngPart(bodyMasterPath));
      }
      parts.push({ text: 'Face reference (appearance only — ignore photo gaze):' });
      parts.push({ inlineData: { data: faceB64, mimeType: 'image/png' } });
      parts.push({
        text: 'POSE + HEAD ANGLE (Dinarte idle_01 skeleton — HIGHEST PRIORITY): Copy idle fighting stance AND 3/4 head turn toward the RIGHT (opponent). Nose points RIGHT. We should see more of the near cheek in 3/4 — NOT a passport/front portrait. FORBIDDEN full-front camera stare. Do NOT copy Dinarte clothes or muscles. Fists raised in guard — NOT hands in pockets.',
      });
      parts.push(pngPart(posePath));
      parts.push({ text: 'POSE AGAIN (confirm 3/4 RIGHT gaze + idle guard, same scale, NOT undersized):' });
      parts.push(pngPart(posePath));
      parts.push({ text: 'POSE A 3RD TIME (HEAD ANGLE LOCK — look RIGHT at opponent, never at camera):' });
      parts.push(pngPart(posePath));

      const fabioMasterRule = `FABIO MASTER (idle_01) CRITICAL:
1) GAZE HARD FAIL: Head in 3/4 profile looking RIGHT at the opponent (Dinarte idle head angle). Nose points RIGHT. FORBIDDEN: looking at camera, full-front face, both ears equally visible like a portrait.
2) OUTFIT: navy blue blazer with lapels + WHITE open-collar dress shirt (NO tie) + navy dress pants + bright WHITE sneakers. Dark chest tattoo visible in the open shirt V.
3) FACE: medium-tan/olive skin; short dark fade hair; thin mustache + small goatee.
4) LEFT WRIST: silver watch (idle_01 laterality). NEVER put the watch on the right wrist.
5) ARMS: SMOOTH / LISOS. BODY: NORMAL average lean male — NOT Dinarte muscular.
6) POSE: idle fighting guard matching Dinarte idle skeleton, footprint ~70-80% of 576x576. FORBIDDEN source-card pocket pose.
7) THIS IS FABIO — NOT Joao (no magenta tie, no dress shoes) and NOT Jailson (no glasses, no black tee, no jeans). IGNORE source-card UI (WDX, green vortex). Solid magenta (#FF00FF). EXACTLY ONE character.`;
      return { parts, baseRule: fabioMasterRule };
    }

    const isHiagoMaster =
      request.participantId === 'hiago' && (!request.frameName || request.frameName === 'idle_01');
    if (isHiagoMaster) {
      const seedAssetsDinarteIdle = path.join(
        path.dirname(request.sourceImage),
        '..',
        'dinarte',
        'fighter',
        'idle_01.png'
      );
      const posePath =
        request.poseReferenceImage && fs.existsSync(request.poseReferenceImage)
          ? request.poseReferenceImage
          : fs.existsSync(seedAssetsDinarteIdle)
            ? seedAssetsDinarteIdle
            : request.templateImage;
      const bodyMasterPath = path.join(path.dirname(request.sourceImage), 'body_master.png');

      parts.push({
        text: 'IMAGE IDENTITY (CLOTHES/FACE COLORS ONLY — IGNORE PHOTO POSE AND CAMERA STARE): Hiago = young male, light-medium tan/olive skin, NO facial hair, thick voluminous dark brown/black wavy-curly hair with a quiff on top and shorter sides, round thick BLACK-rimmed glasses, thin silver/dark chain necklace with a small dark circular pendant, oversized PLAIN black short-sleeve crew-neck t-shirt with small white "TOP" text on the LEFT chest, olive-green cargo jogger pants with large thigh pockets and elastic ankles, black-and-white low-top sneakers (white laces, white side stripe, white soles), dark watch on LEFT wrist, NORMAL smooth non-muscular arms. Source card looks at CAMERA / hand in pocket — DO NOT copy that pose or head angle. THIS IS HIAGO, NOT IZAIAS and NOT CAIO.',
      });
      parts.push({ inlineData: { data: sourceB64, mimeType: 'image/jpeg' } });
      if (fs.existsSync(bodyMasterPath)) {
        parts.push({
          text: 'FACE/HAIR/GLASSES/TEE/CARGO LOCK from body portrait: copy EXACT youthful face, voluminous wavy-curly quiff, round black glasses, thin chain with pendant, black oversized tee with "TOP" mark, olive cargo joggers, black-and-white sneakers. Ignore green UI background. Ignore hand-in-pocket photo pose — fighting idle uses raised fists. Soft non-muscular arms. Watch must end on LEFT wrist in the sprite.',
        });
        parts.push(pngPart(bodyMasterPath));
      }
      parts.push({ text: 'Face reference (appearance only — ignore photo gaze):' });
      parts.push({ inlineData: { data: faceB64, mimeType: 'image/png' } });
      parts.push({
        text: 'POSE + HEAD ANGLE (Dinarte idle_01 skeleton — HIGHEST PRIORITY): Copy idle fighting stance AND 3/4 head turn toward the RIGHT (opponent). Nose points RIGHT. We should see more of the near cheek in 3/4 — NOT a passport/front portrait. FORBIDDEN full-front camera stare. Do NOT copy Dinarte clothes or muscles. Fists raised in guard — NOT hands in pockets.',
      });
      parts.push(pngPart(posePath));
      parts.push({ text: 'POSE AGAIN (confirm 3/4 RIGHT gaze + idle guard, same scale, NOT undersized):' });
      parts.push(pngPart(posePath));
      parts.push({ text: 'POSE A 3RD TIME (HEAD ANGLE LOCK — look RIGHT at opponent, never at camera):' });
      parts.push(pngPart(posePath));

      const hiagoMasterRule = `HIAGO MASTER (idle_01) CRITICAL:
1) GAZE HARD FAIL: Head in 3/4 profile looking RIGHT at the opponent (Dinarte idle head angle). Nose points RIGHT. FORBIDDEN: looking at camera, full-front face, both ears equally visible like a portrait.
2) OUTFIT: oversized black short-sleeve tee with small white "TOP" on LEFT chest + olive-green cargo joggers (thigh pockets, elastic ankles) + black-and-white low-top sneakers with white stripe/soles. Thin chain with small dark pendant. Round thick BLACK-rimmed glasses ALWAYS.
3) FACE/HAIR: young male; light-medium tan skin; NO beard; thick voluminous dark wavy-curly quiff (volume on top, shorter sides).
4) LEFT WRIST: dark/black watch (project laterality). NEVER put the watch on the right wrist.
5) ARMS: SMOOTH / LISOS. BODY: NORMAL average lean young male — NOT Dinarte muscular.
6) POSE: idle fighting guard matching Dinarte idle skeleton, footprint ~70-80% of 576x576. FORBIDDEN source-card pocket pose.
7) THIS IS HIAGO — NOT Izaias (no puffer jacket) and NOT Caio (Hiago has glasses + olive cargo + "TOP" tee, no beard). IGNORE source-card UI (WDX, green vortex, stats). Solid magenta (#FF00FF). EXACTLY ONE character.`;
      return { parts, baseRule: hiagoMasterRule };
    }

    const isKelvinMaster =
      request.participantId === 'kelvin' && (!request.frameName || request.frameName === 'idle_01');
    if (isKelvinMaster) {
      const seedAssetsDinarteIdle = path.join(
        path.dirname(request.sourceImage),
        '..',
        'dinarte',
        'fighter',
        'idle_01.png'
      );
      const posePath =
        request.poseReferenceImage && fs.existsSync(request.poseReferenceImage)
          ? request.poseReferenceImage
          : fs.existsSync(seedAssetsDinarteIdle)
            ? seedAssetsDinarteIdle
            : request.templateImage;
      const bodyMasterPath = path.join(path.dirname(request.sourceImage), 'body_master.png');

      parts.push({
        text: 'IMAGE IDENTITY (CLOTHES/FACE COLORS ONLY — IGNORE PHOTO POSE AND CAMERA STARE): Kelvin = young male, medium-tan / warm-brown skin, NO facial hair, short dark curly/textured hair with a rounded taper fade (denser on top, shorter sides), round thick BLACK-rimmed glasses ALWAYS, white wireless earbuds (AirPods) in BOTH ears, WHITE short-sleeve polo with red AND navy striped collar AND matching striped sleeve cuffs, dark navy/black trousers, white athletic sneakers with red accents (tongue/heel) and dark soles, silver/dark watch on LEFT wrist, NORMAL smooth non-muscular slender arms. Source card looks at CAMERA / left hand in pocket — DO NOT copy that pose or head angle. THIS IS KELVIN, NOT DANIEL (Daniel has no glasses/earbuds, has a right-arm tattoo + gold watch + braces) and NOT HIAGO (Hiago has a black "TOP" tee + olive cargo).',
      });
      parts.push({ inlineData: { data: sourceB64, mimeType: 'image/jpeg' } });
      if (fs.existsSync(bodyMasterPath)) {
        parts.push({
          text: 'FACE/HAIR/GLASSES/POLO/EARBUDS LOCK from body portrait: copy EXACT youthful face, curly taper-fade hair, round black glasses, white earbuds in both ears, WHITE polo with red/navy striped collar and cuffs, dark navy pants, white sneakers with red accents. Ignore green UI background. Ignore hand-in-pocket photo pose — fighting idle uses raised fists. Soft non-muscular arms. Watch must end on LEFT wrist in the sprite.',
        });
        parts.push(pngPart(bodyMasterPath));
      }
      parts.push({ text: 'Face reference (appearance only — ignore photo gaze):' });
      parts.push({ inlineData: { data: faceB64, mimeType: 'image/png' } });
      parts.push({
        text: 'POSE + HEAD ANGLE (Dinarte idle_01 skeleton — HIGHEST PRIORITY): Copy idle fighting stance AND 3/4 head turn toward the RIGHT (opponent). Nose points RIGHT. We should see more of the near cheek in 3/4 — NOT a passport/front portrait. FORBIDDEN full-front camera stare. Do NOT copy Dinarte clothes or muscles. Fists raised in guard — NOT hands in pockets.',
      });
      parts.push(pngPart(posePath));
      parts.push({ text: 'POSE AGAIN (confirm 3/4 RIGHT gaze + idle guard, same scale, NOT undersized):' });
      parts.push(pngPart(posePath));
      parts.push({ text: 'POSE A 3RD TIME (HEAD ANGLE LOCK — look RIGHT at opponent, never at camera):' });
      parts.push(pngPart(posePath));

      const kelvinMasterRule = `KELVIN MASTER (idle_01) CRITICAL:
1) GAZE HARD FAIL: Head in 3/4 profile looking RIGHT at the opponent (Dinarte idle head angle). Nose points RIGHT. FORBIDDEN: looking at camera, full-front face, both ears equally visible like a portrait.
2) OUTFIT: WHITE short-sleeve polo with red AND navy striped collar AND matching striped sleeve cuffs + dark navy/black trousers + white sneakers with red accents. Round thick BLACK-rimmed glasses ALWAYS. White wireless earbuds in BOTH ears ALWAYS.
3) FACE/HAIR: young male; medium-tan/warm-brown skin; NO beard; short dark curly/textured taper fade (volume on top, shorter sides).
4) LEFT WRIST: silver/dark watch (project laterality). NEVER put the watch on the right wrist.
5) ARMS: SMOOTH / LISOS. BODY: NORMAL slender/average lean young male — NOT Dinarte muscular.
6) POSE: idle fighting guard matching Dinarte idle skeleton, footprint ~70-80% of 576x576. FORBIDDEN source-card pocket pose.
7) THIS IS KELVIN — NOT Daniel (Kelvin has glasses + earbuds + striped white polo, NO tattoo, NO braces) and NOT Hiago (no black "TOP" tee, no olive cargo). IGNORE source-card UI (WDX, green vortex, stats). Solid magenta (#FF00FF). EXACTLY ONE character.`;
      return { parts, baseRule: kelvinMasterRule };
    }

    // Dinarte pose refs are skeleton-only — never copy their clothes/identity.
    if (hasPoseRef) {
      parts.push({
        text: 'IMAGE 1 (POSE/SKELETON ONLY): Copy ONLY limb positions, stance, body angle, and framing. DO NOT copy clothes, colors, hair, face, shoes, or gender. This is JUST A SKELETON.',
      });
      parts.push(pngPart(request.poseReferenceImage!));
    } else {
      parts.push({ text: 'IMAGE 1 (Reference): This is the pose you MUST copy.' });
      parts.push({ inlineData: { data: templateB64, mimeType: 'image/png' } });
    }

    if (request.participantId === 'fernando' && request.frameName === 'attack') {
      // NEVER attach idle_01 full body — it contaminates punch with idle guard → ghost extra arm.
      if (hasPoseRef) {
        parts.push({
          text: 'IMAGE 1 AGAIN (Dinarte attack — RIGHT punch fully extended, LEFT fist at waist, EXACTLY TWO ARMS):',
        });
        parts.push(pngPart(request.poseReferenceImage!));
      }
      parts.push({
        text: 'FERNANDO IDENTITY (TEXT LOCK — no idle pose image): black polo with BRIGHT LIME GREEN collar AND green sleeve cuffs; black joggers; black sneakers white soles; curly hair; mustache+goatee; stud earrings; NO watch; SMOOTH arms. Pose MUST be Dinarte attack only. EXACTLY TWO ARMS.',
      });
      parts.push({ text: 'CLOTHES COLOR REF (source card — ignore photo pose):' });
      parts.push({ inlineData: { data: sourceB64, mimeType: 'image/jpeg' } });
      parts.push({ text: 'Face reference:' });
      parts.push({ inlineData: { data: faceB64, mimeType: 'image/png' } });
      if (request.scaleReferenceImage && fs.existsSync(request.scaleReferenceImage)) {
        parts.push({
          text: 'SCALE ONLY (idle_01 — HEIGHT/FOOTPRINT, NOT POSE): Match this EXACT head-to-toe HEIGHT and canvas margins. SAME size as idle_01 — head near the TOP, feet near the BOTTOM. FORBIDDEN tiny character with huge magenta above the head. Do NOT copy idle fists/guard.',
        });
        parts.push(pngPart(request.scaleReferenceImage));
        parts.push({
          text: 'SCALE CONFIRM: SAME character height as idle_01. NOT smaller. NOT zoomed out. Pose stays Dinarte attack.',
        });
        parts.push(pngPart(request.scaleReferenceImage));
      }
      if (hasPoseRef) {
        parts.push({
          text: 'POSE OVERRIDE (CRITICAL): RIGHT arm fully extended punch to the RIGHT. LEFT fist chambered at waist. EXACTLY TWO ARMS. HARD FAIL if idle chest-guard from memory or a third/ghost arm. KEEP idle_01 SCALE (large in frame).',
        });
        parts.push(pngPart(request.poseReferenceImage!));
      }
      const fernandoAttackRule = `CRITICAL ATTACK (FERNANDO): Match IMAGE 1 Dinarte punch EXACTLY.
SCALE HARD LOCK: SAME head-to-toe HEIGHT as idle_01 scale chip (~90% of 576 canvas). Head near top, feet near bottom. HARD FAIL if character is small / lots of empty magenta above the head.
EXACTLY TWO ARMS: RIGHT punch fully extended; LEFT fist at waist/ribs. HARD FAIL third/ghost/phantom arm, extra elbow, idle guard hybrid.
Do NOT copy idle_01 arm pose — scale chip is HEIGHT ONLY.
Outfit: black polo + lime collar/cuffs, black joggers, black sneakers white soles, curly hair, mustache+goatee. SMOOTH arms. NO watch.
Solid magenta (#FF00FF). EXACTLY ONE character.`;
      return { parts, baseRule: fernandoAttackRule };
    }

    if (request.participantId === 'caio' && request.frameName === 'attack') {
      // NEVER attach idle_01 full body — it contaminates punch with idle guard → ghost extra arm.
      if (hasPoseRef) {
        parts.push({
          text: 'IMAGE 1 AGAIN (Dinarte attack — RIGHT punch fully extended, LEFT fist at waist, EXACTLY TWO ARMS):',
        });
        parts.push(pngPart(request.poseReferenceImage!));
      }
      parts.push({
        text: 'CAIO IDENTITY (TEXT LOCK — no idle pose image): PLAIN black crew-neck tee; thin silver chain; RIGHT-ear silver stud; dark charcoal jeans; black sneakers white soles; fade hair; short dark beard; NO watch; SMOOTH arms. Pose MUST be Dinarte attack only. EXACTLY TWO ARMS. Left arm hidden/chambered — OMIT watch (do NOT put a watch on the punching RIGHT wrist).',
      });
      parts.push({ text: 'CLOTHES COLOR REF (source card — ignore photo pose):' });
      parts.push({ inlineData: { data: sourceB64, mimeType: 'image/jpeg' } });
      parts.push({ text: 'Face reference:' });
      parts.push({ inlineData: { data: faceB64, mimeType: 'image/png' } });
      if (request.scaleReferenceImage && fs.existsSync(request.scaleReferenceImage)) {
        parts.push({
          text: 'SCALE ONLY (idle_01 — HEIGHT/FOOTPRINT, NOT POSE): Match this EXACT head-to-toe HEIGHT and canvas margins. SAME size as idle_01 — head near the TOP, feet near the BOTTOM. FORBIDDEN tiny character with huge magenta above the head. Do NOT copy idle fists/guard.',
        });
        parts.push(pngPart(request.scaleReferenceImage));
        parts.push({
          text: 'SCALE CONFIRM: SAME character height as idle_01. NOT smaller. NOT zoomed out. Pose stays Dinarte attack.',
        });
        parts.push(pngPart(request.scaleReferenceImage));
      }
      if (hasPoseRef) {
        parts.push({
          text: 'POSE OVERRIDE (CRITICAL): RIGHT arm fully extended punch to the RIGHT. LEFT fist chambered at waist. EXACTLY TWO ARMS. HARD FAIL if idle chest-guard from memory or a third/ghost arm. KEEP idle_01 SCALE (large in frame). NO watch on the punching RIGHT wrist.',
        });
        parts.push(pngPart(request.poseReferenceImage!));
      }
      const caioAttackRule = `CRITICAL ATTACK (CAIO): Match IMAGE 1 Dinarte punch EXACTLY.
SCALE HARD LOCK: SAME head-to-toe HEIGHT as idle_01 scale chip (~90% of 576 canvas). Head near top, feet near bottom. HARD FAIL if character is small / lots of empty magenta above the head.
EXACTLY TWO ARMS: RIGHT punch fully extended; LEFT fist at waist/ribs. HARD FAIL third/ghost/phantom arm, extra elbow, idle guard hybrid.
Do NOT copy idle_01 arm pose — scale chip is HEIGHT ONLY.
WATCH: left arm is hidden/chambered — OMIT the watch. FORBIDDEN watch on the punching RIGHT wrist.
Outfit: plain black crew-neck tee, silver chain, RIGHT-ear stud, dark charcoal jeans, black sneakers white soles, fade hair, short beard. SMOOTH arms. NO watch.
Solid magenta (#FF00FF). EXACTLY ONE character.`;
      return { parts, baseRule: caioAttackRule };
    }

    if (request.participantId === 'daniel' && request.frameName === 'attack') {
      // NEVER attach idle_01 full body — it contaminates punch with idle guard → ghost extra arm.
      if (hasPoseRef) {
        parts.push({
          text: 'IMAGE 1 AGAIN (Dinarte attack — RIGHT punch fully extended, LEFT fist at waist, EXACTLY TWO ARMS):',
        });
        parts.push(pngPart(request.poseReferenceImage!));
      }
      parts.push({
        text: 'DANIEL IDENTITY (TEXT LOCK — no idle pose image): WHITE short-sleeve polo; dark blue slim jeans; white slip-on canvas sneakers; short dark fade hair; thin mustache + goatee; braces if mouth open; dense BLACK SLEEVE TATTOO on RIGHT punching arm; keys on RIGHT hip; SMOOTH arms. Pose MUST be Dinarte attack only. EXACTLY TWO ARMS. Left arm hidden/chambered — OMIT the gold watch (do NOT put a watch on the punching RIGHT wrist). THIS IS DANIEL, NOT DAVID.',
      });
      parts.push({ text: 'CLOTHES COLOR REF (source card — ignore photo pose):' });
      parts.push({ inlineData: { data: sourceB64, mimeType: 'image/jpeg' } });
      parts.push({ text: 'Face reference:' });
      parts.push({ inlineData: { data: faceB64, mimeType: 'image/png' } });
      if (request.scaleReferenceImage && fs.existsSync(request.scaleReferenceImage)) {
        parts.push({
          text: 'SCALE ONLY (idle_01 — HEIGHT/FOOTPRINT, NOT POSE): Match this EXACT head-to-toe HEIGHT and canvas margins. SAME size as idle_01 — head near the TOP, feet near the BOTTOM. FORBIDDEN tiny character with huge magenta above the head. Do NOT copy idle fists/guard.',
        });
        parts.push(pngPart(request.scaleReferenceImage));
        parts.push({
          text: 'SCALE CONFIRM: SAME character height as idle_01. NOT smaller. NOT zoomed out. Pose stays Dinarte attack.',
        });
        parts.push(pngPart(request.scaleReferenceImage));
      }
      if (hasPoseRef) {
        parts.push({
          text: 'POSE OVERRIDE (CRITICAL): RIGHT arm fully extended punch to the RIGHT (tattoo sleeve visible on this punching arm). LEFT fist chambered at waist. EXACTLY TWO ARMS. HARD FAIL if idle chest-guard from memory or a third/ghost arm. KEEP idle_01 SCALE (large in frame). NO watch on the punching RIGHT wrist.',
        });
        parts.push(pngPart(request.poseReferenceImage!));
      }
      const danielAttackRule = `CRITICAL ATTACK (DANIEL): Match IMAGE 1 Dinarte punch EXACTLY.
SCALE HARD LOCK: SAME head-to-toe HEIGHT as idle_01 scale chip (~90% of 576 canvas). Head near top, feet near bottom. HARD FAIL if character is small / lots of empty magenta above the head.
EXACTLY TWO ARMS: RIGHT punch fully extended; LEFT fist at waist/ribs. HARD FAIL third/ghost/phantom arm, extra elbow, idle guard hybrid.
Do NOT copy idle_01 arm pose — scale chip is HEIGHT ONLY.
WATCH: left arm is hidden/chambered — OMIT the gold watch. FORBIDDEN watch on the punching RIGHT wrist.
Outfit: WHITE polo, dark blue jeans, white slip-on sneakers, RIGHT-arm sleeve tattoo, keys on right hip, fade hair, mustache+goatee. SMOOTH arms.
THIS IS DANIEL — NOT DAVID.
Solid magenta (#FF00FF). EXACTLY ONE character.`;
      return { parts, baseRule: danielAttackRule };
    }

    if (request.participantId === 'evellyn' && request.frameName === 'attack') {
      // NEVER attach idle_01 full body — it contaminates punch with idle guard → ghost extra arm.
      if (hasPoseRef) {
        parts.push({
          text: 'IMAGE 1 AGAIN (Dinarte attack — RIGHT punch fully extended, LEFT fist at waist, EXACTLY TWO ARMS):',
        });
        parts.push(pngPart(request.poseReferenceImage!));
      }
      parts.push({
        text: 'EVELLYN IDENTITY (TEXT LOCK — FEMALE — no idle pose image): WOMAN with long straight jet-black hair over both shoulders to mid-torso; medium tan skin; PLAIN dark navy/charcoal short-sleeve crew-neck tee; dark charcoal pants; dark sneakers; BARE hands; NO watch; NO jewelry; NO glasses; SMOOTH female arms. Pose MUST be Dinarte attack only. EXACTLY TWO ARMS. Left arm hidden/chambered — OMIT watch (do NOT put a watch on the punching RIGHT wrist).',
      });
      parts.push({ text: 'CLOTHES COLOR REF (source card — ignore photo pose):' });
      parts.push({ inlineData: { data: sourceB64, mimeType: 'image/jpeg' } });
      parts.push({ text: 'Face reference:' });
      parts.push({ inlineData: { data: faceB64, mimeType: 'image/png' } });
      if (request.scaleReferenceImage && fs.existsSync(request.scaleReferenceImage)) {
        parts.push({
          text: 'SCALE ONLY (idle_01 — HEIGHT/FOOTPRINT, NOT POSE): Match this EXACT head-to-toe HEIGHT and canvas margins. SAME size as idle_01 — head near the TOP, feet near the BOTTOM. FORBIDDEN tiny character with huge magenta above the head. Do NOT copy idle fists/guard.',
        });
        parts.push(pngPart(request.scaleReferenceImage));
        parts.push({
          text: 'SCALE CONFIRM: SAME character height as idle_01. NOT smaller. NOT zoomed out. Pose stays Dinarte attack.',
        });
        parts.push(pngPart(request.scaleReferenceImage));
      }
      if (hasPoseRef) {
        parts.push({
          text: 'POSE OVERRIDE (CRITICAL): RIGHT arm fully extended punch to the RIGHT. LEFT fist chambered at waist. EXACTLY TWO ARMS. HARD FAIL if idle chest-guard from memory or a third/ghost arm. KEEP idle_01 SCALE (large in frame). NO watch on the punching RIGHT wrist.',
        });
        parts.push(pngPart(request.poseReferenceImage!));
      }
      const evellynAttackRule = `CRITICAL ATTACK (EVELLYN — FEMALE): Match IMAGE 1 Dinarte punch EXACTLY.
GENDER: FEMALE. NORMAL female body. SMOOTH arms ZERO muscles. FORBIDDEN male body / Dinarte musculature.
SCALE HARD LOCK: SAME head-to-toe HEIGHT as idle_01 scale chip (~90% of 576 canvas). Head near top, feet near bottom. HARD FAIL if character is small / lots of empty magenta above the head.
EXACTLY TWO ARMS: RIGHT punch fully extended; LEFT fist at waist/ribs. HARD FAIL third/ghost/phantom arm, extra elbow, idle guard hybrid.
Do NOT copy idle_01 arm pose — scale chip is HEIGHT ONLY.
WATCH: left arm is hidden/chambered — OMIT the watch. FORBIDDEN watch on the punching RIGHT wrist.
Outfit: long straight black hair, dark navy crew-neck tee, dark charcoal pants, dark sneakers. BARE hands. NO watch. NO glasses.
Solid magenta (#FF00FF). EXACTLY ONE character.`;
      return { parts, baseRule: evellynAttackRule };
    }

    if (request.participantId === 'fabio' && request.frameName === 'attack') {
      // NEVER attach idle_01 full body — it contaminates punch with idle guard → ghost extra arm.
      if (hasPoseRef) {
        parts.push({
          text: 'IMAGE 1 AGAIN (Dinarte attack — RIGHT punch fully extended, LEFT fist at waist, EXACTLY TWO ARMS):',
        });
        parts.push(pngPart(request.poseReferenceImage!));
      }
      parts.push({
        text: 'FABIO IDENTITY (TEXT LOCK — no idle pose image): navy blue blazer with lapels; WHITE open-collar dress shirt (NO tie); dark chest tattoo in the open V; matching navy dress pants; bright WHITE sneakers; short dark fade hair; thin mustache + goatee; SMOOTH arms. Pose MUST be Dinarte attack only. EXACTLY TWO ARMS. Left arm hidden/chambered — OMIT the silver watch (do NOT put a watch on the punching RIGHT wrist). THIS IS FABIO, NOT JOAO.',
      });
      parts.push({ text: 'CLOTHES COLOR REF (source card — ignore photo pose):' });
      parts.push({ inlineData: { data: sourceB64, mimeType: 'image/jpeg' } });
      parts.push({ text: 'Face reference:' });
      parts.push({ inlineData: { data: faceB64, mimeType: 'image/png' } });
      if (request.scaleReferenceImage && fs.existsSync(request.scaleReferenceImage)) {
        parts.push({
          text: 'SCALE ONLY (idle_01 — HEIGHT/FOOTPRINT, NOT POSE): Match this EXACT head-to-toe HEIGHT and canvas margins. SAME size as idle_01 — head near the TOP, feet near the BOTTOM. FORBIDDEN tiny character with huge magenta above the head. Do NOT copy idle fists/guard.',
        });
        parts.push(pngPart(request.scaleReferenceImage));
        parts.push({
          text: 'SCALE CONFIRM: SAME character height as idle_01. NOT smaller. NOT zoomed out. Pose stays Dinarte attack.',
        });
        parts.push(pngPart(request.scaleReferenceImage));
      }
      if (hasPoseRef) {
        parts.push({
          text: 'POSE OVERRIDE (CRITICAL): RIGHT arm fully extended punch to the RIGHT. LEFT fist chambered at waist. EXACTLY TWO ARMS. HARD FAIL if idle chest-guard from memory or a third/ghost arm. KEEP idle_01 SCALE (large in frame). NO watch on the punching RIGHT wrist.',
        });
        parts.push(pngPart(request.poseReferenceImage!));
      }
      const fabioAttackRule = `CRITICAL ATTACK (FABIO): Match IMAGE 1 Dinarte punch EXACTLY.
SCALE HARD LOCK: SAME head-to-toe HEIGHT as idle_01 scale chip (~90% of 576 canvas). Head near top, feet near bottom. HARD FAIL if character is small / lots of empty magenta above the head.
EXACTLY TWO ARMS: RIGHT punch fully extended; LEFT fist at waist/ribs. HARD FAIL third/ghost/phantom arm, extra elbow, idle guard hybrid.
Do NOT copy idle_01 arm pose — scale chip is HEIGHT ONLY.
WATCH: left arm is hidden/chambered — OMIT the silver watch. FORBIDDEN watch on the punching RIGHT wrist.
Outfit: navy blazer, white open shirt NO tie, chest tattoo, navy dress pants, WHITE sneakers, fade hair, mustache+goatee. SMOOTH arms.
THIS IS FABIO — NOT Joao (no magenta tie, no dress shoes).
Solid magenta (#FF00FF). EXACTLY ONE character.`;
      return { parts, baseRule: fabioAttackRule };
    }

    if (request.participantId === 'hiago' && request.frameName === 'attack') {
      // NEVER attach idle_01 full body — it contaminates punch with idle guard → ghost extra arm.
      if (hasPoseRef) {
        parts.push({
          text: 'IMAGE 1 AGAIN (Dinarte attack — RIGHT punch fully extended, LEFT fist at waist, EXACTLY TWO ARMS):',
        });
        parts.push(pngPart(request.poseReferenceImage!));
      }
      parts.push({
        text: 'HIAGO IDENTITY (TEXT LOCK — no idle pose image): oversized black short-sleeve tee with small white "TOP" on LEFT chest; olive-green cargo joggers; black-and-white sneakers; round thick BLACK glasses; thin chain with dark pendant; voluminous dark wavy-curly quiff; NO beard; SMOOTH arms. Pose MUST be Dinarte attack only. EXACTLY TWO ARMS. Left arm hidden/chambered — OMIT the watch (do NOT put a watch on the punching RIGHT wrist). THIS IS HIAGO, NOT IZAIAS.',
      });
      parts.push({ text: 'CLOTHES COLOR REF (source card — ignore photo pose):' });
      parts.push({ inlineData: { data: sourceB64, mimeType: 'image/jpeg' } });
      parts.push({ text: 'Face reference:' });
      parts.push({ inlineData: { data: faceB64, mimeType: 'image/png' } });
      if (request.scaleReferenceImage && fs.existsSync(request.scaleReferenceImage)) {
        parts.push({
          text: 'SCALE ONLY (idle_01 — HEIGHT/FOOTPRINT, NOT POSE): Match this EXACT head-to-toe HEIGHT and canvas margins. SAME size as idle_01 — head near the TOP, feet near the BOTTOM. FORBIDDEN tiny character with huge magenta above the head. Do NOT copy idle fists/guard.',
        });
        parts.push(pngPart(request.scaleReferenceImage));
        parts.push({
          text: 'SCALE CONFIRM: SAME character height as idle_01. NOT smaller. NOT zoomed out. Pose stays Dinarte attack.',
        });
        parts.push(pngPart(request.scaleReferenceImage));
      }
      if (hasPoseRef) {
        parts.push({
          text: 'POSE OVERRIDE (CRITICAL): RIGHT arm fully extended punch to the RIGHT. LEFT fist chambered at waist. EXACTLY TWO ARMS. HARD FAIL if idle chest-guard from memory or a third/ghost arm. KEEP idle_01 SCALE (large in frame). NO watch on the punching RIGHT wrist. Keep round black glasses.',
        });
        parts.push(pngPart(request.poseReferenceImage!));
      }
      const hiagoAttackRule = `CRITICAL ATTACK (HIAGO): Match IMAGE 1 Dinarte punch EXACTLY.
SCALE HARD LOCK: SAME head-to-toe HEIGHT as idle_01 scale chip (~90% of 576 canvas). Head near top, feet near bottom. HARD FAIL if character is small / lots of empty magenta above the head.
EXACTLY TWO ARMS: RIGHT punch fully extended; LEFT fist at waist/ribs. HARD FAIL third/ghost/phantom arm, extra elbow, idle guard hybrid.
Do NOT copy idle_01 arm pose — scale chip is HEIGHT ONLY.
WATCH: left arm is hidden/chambered — OMIT the watch. FORBIDDEN watch on the punching RIGHT wrist.
Outfit: oversized black tee with "TOP", olive cargo joggers, black-and-white sneakers, round black glasses, chain+pendant, voluminous curly quiff, NO beard. SMOOTH arms.
THIS IS HIAGO — NOT Izaias (no puffer) and NOT Caio (glasses + olive cargo).
Solid magenta (#FF00FF). EXACTLY ONE character.`;
      return { parts, baseRule: hiagoAttackRule };
    }

    if (request.participantId === 'kelvin' && request.frameName === 'attack') {
      // NEVER attach idle_01 full body — it contaminates punch with idle guard → ghost extra arm.
      if (hasPoseRef) {
        parts.push({
          text: 'IMAGE 1 AGAIN (Dinarte attack — RIGHT punch fully extended, LEFT fist at waist, EXACTLY TWO ARMS):',
        });
        parts.push(pngPart(request.poseReferenceImage!));
      }
      parts.push({
        text: 'KELVIN IDENTITY (TEXT LOCK — no idle pose image): WHITE short-sleeve polo with red AND navy striped collar AND matching striped sleeve cuffs; dark navy/black trousers; white sneakers with red accents; round thick BLACK glasses ALWAYS; white wireless earbuds in BOTH ears; short dark curly taper-fade hair; NO beard; SMOOTH arms. Pose MUST be Dinarte attack only. EXACTLY TWO ARMS. Left arm hidden/chambered — OMIT the watch (do NOT put a watch on the punching RIGHT wrist). THIS IS KELVIN, NOT DANIEL.',
      });
      parts.push({ text: 'CLOTHES COLOR REF (source card — ignore photo pose):' });
      parts.push({ inlineData: { data: sourceB64, mimeType: 'image/jpeg' } });
      parts.push({ text: 'Face reference:' });
      parts.push({ inlineData: { data: faceB64, mimeType: 'image/png' } });
      if (request.scaleReferenceImage && fs.existsSync(request.scaleReferenceImage)) {
        parts.push({
          text: 'SCALE ONLY (idle_01 — HEIGHT/FOOTPRINT, NOT POSE): Match this EXACT head-to-toe HEIGHT and canvas margins. SAME size as idle_01 — head near the TOP, feet near the BOTTOM. FORBIDDEN tiny character with huge magenta above the head. Do NOT copy idle fists/guard.',
        });
        parts.push(pngPart(request.scaleReferenceImage));
        parts.push({
          text: 'SCALE CONFIRM: SAME character height as idle_01. NOT smaller. NOT zoomed out. Pose stays Dinarte attack.',
        });
        parts.push(pngPart(request.scaleReferenceImage));
      }
      if (hasPoseRef) {
        parts.push({
          text: 'POSE OVERRIDE (CRITICAL): RIGHT arm fully extended punch to the RIGHT. LEFT fist chambered at waist. EXACTLY TWO ARMS. HARD FAIL if idle chest-guard from memory or a third/ghost arm. KEEP idle_01 SCALE (large in frame). NO watch on the punching RIGHT wrist. Keep round black glasses and white earbuds.',
        });
        parts.push(pngPart(request.poseReferenceImage!));
      }
      const kelvinAttackRule = `CRITICAL ATTACK (KELVIN): Match IMAGE 1 Dinarte punch EXACTLY.
SCALE HARD LOCK: SAME head-to-toe HEIGHT as idle_01 scale chip (~90% of 576 canvas). Head near top, feet near bottom. HARD FAIL if character is small / lots of empty magenta above the head.
EXACTLY TWO ARMS: RIGHT punch fully extended; LEFT fist at waist/ribs. HARD FAIL third/ghost/phantom arm, extra elbow, idle guard hybrid.
Do NOT copy idle_01 arm pose — scale chip is HEIGHT ONLY.
WATCH: left arm is hidden/chambered — OMIT the watch. FORBIDDEN watch on the punching RIGHT wrist.
Outfit: WHITE polo with red/navy striped collar+cuffs, dark navy pants, white sneakers with red accents, round black glasses, white earbuds both ears, curly taper-fade, NO beard. SMOOTH arms.
THIS IS KELVIN — NOT Daniel (no tattoo, has glasses+earbuds) and NOT Hiago (no black "TOP" tee).
Solid magenta (#FF00FF). EXACTLY ONE character.`;
      return { parts, baseRule: kelvinAttackRule };
    }

    parts.push({
      text: 'IMAGE 2 (ABSOLUTE IDENTITY): Draw this EXACT character. Keep the SAME clothes, shoes, hair, face, skin, and accessories. DO NOT invent a new outfit.',
    });
    if (request.approvedMaster && fs.existsSync(request.approvedMaster)) {
      parts.push(pngPart(request.approvedMaster));
    }
    parts.push({ inlineData: { data: faceB64, mimeType: 'image/png' } });
    parts.push({ inlineData: { data: sourceB64, mimeType: 'image/jpeg' } });

    // Rhussiana / Ana attack: idle_01 as hard scale/footprint lock (pose stays Dinarte attack).
    if (
      (isRhussiana || isAna) &&
      request.frameName === 'attack' &&
      request.scaleReferenceImage &&
      fs.existsSync(request.scaleReferenceImage)
    ) {
      parts.push({
        text: 'SCALE HARD LOCK (idle_01): Match THIS character head-to-toe HEIGHT and canvas MARGINS exactly. Same size as idle_01 — NOT smaller, NOT larger, NOT zoomed. Pose stays IMAGE 1 (attack).',
      });
      parts.push(pngPart(request.scaleReferenceImage));
      parts.push({ text: 'SCALE LOCK AGAIN (same footprint as idle_01):' });
      parts.push(pngPart(request.scaleReferenceImage));
    }

    let baseRule =
      "RULE: Draw Character 2 in the exact pose of Reference 1. Keep Character 2's clothes, face, hair, and shoes identical to the character reference. ARMS SMOOTH (no muscle definition) unless participant is Dinarte. Use a solid #FF00FF background.";
    if (hasPoseRef) {
      baseRule = `CRITICAL: Draw the character from IMAGE 2 in the EXACT pose/skeleton of IMAGE 1.
DO NOT copy IMAGE 1 clothes (no black tank, no cargo pants, no sneakers from the pose ref).
DO NOT copy IMAGE 1 muscular arms — muscular physique is Dinarte-ONLY. Default = SMOOTH non-muscular arms, NORMAL average body.
Keep IMAGE 2 outfit EXACTLY (same dress/top/pants, same shoes, same accessories).
Solid magenta background (#FF00FF).`;
    }
    if (request.frameName === 'attack') {
      if (isRhussiana) {
        baseRule = `CRITICAL ATTACK: Copy IMAGE 1 punch pose EXACTLY (same punching arm extended, same lunge, same body rotation).
Keep IMAGE 2 clothes/shoes/face/hair EXACTLY — black strapless dress with babado, GOLD sandals, NORMAL slim body, BARE HANDS. Never the pose-ref outfit.
HANDS: BARE SKIN ONLY. FORBIDDEN: boxing gloves, fighter gloves, MMA gloves, fingerless combat gloves, hand wraps.
BODY: NORMAL slim average matching idle_01 (NOT plump/gordinha, NOT ripped/muscular).
SCALE HARD LOCK: SAME head-to-toe height/margins as idle_01 scale ref in 576x576 — NOT small, NOT oversized, NOT disproportionate, NOT zoomed. EXACTLY ONE character.
Solid magenta background (#FF00FF).`;
      } else if (isAna) {
        baseRule = `CRITICAL ATTACK (ANA — FEMALE): Copy IMAGE 1 punch pose EXACTLY (RIGHT arm fully extended to the RIGHT, same lunge, same body rotation).
Keep IMAGE 2 identity EXACTLY: FEMALE Ana, emerald green one-shoulder gown (LEFT strap, RIGHT shoulder bare), emerald sash, dark/emerald heels, high bun + face-framing strands, rose-pink glasses, gold hoops, BARE HANDS, NO WATCH.
FORBIDDEN: male body, Dinarte tank/muscles, red Livia dress, black Rhussiana dress, missing glasses, missing bun, boxing gloves, sneakers.
SCALE HARD LOCK: SAME head-to-toe height/margins as idle_01 in 576x576. EXACTLY ONE character.
Solid magenta background (#FF00FF).`;
      } else if (request.participantId === 'joao') {
        baseRule = `CRITICAL ATTACK: Copy IMAGE 1 punch pose EXACTLY (same punching arm extended, same lunge, same body rotation).
Keep IMAGE 2 FULL FORMAL SUIT EXACTLY: charcoal/black suit jacket with lapels, matching suit trousers, dark dress shirt, bright MAGENTA necktie, silver belt buckle, polished dress shoes — same as idle_01.
HANDS: BARE SKIN ONLY. FORBIDDEN: boxing/fighter/MMA/fingerless gloves, hand wraps.
FORBIDDEN: polo, sleeveless, default fighter clothes, missing jacket, missing necktie, undersized tiny character.
SCALE HARD LOCK: SAME head-to-toe height/margins as idle_01 in 576x576 — NOT small, NOT zoomed, NOT disproportionate.
Solid magenta background (#FF00FF). EXACTLY ONE character.`;
      } else if (request.participantId === 'neto') {
        baseRule = `CRITICAL ATTACK: Copy IMAGE 1 punch pose EXACTLY (same punching arm extended, same lunge, same body rotation).
Keep IMAGE 2 clothes EXACTLY: plain tight black short-sleeve tee + medium-blue denim jeans + black sneakers (idle_01). Never the pose-ref outfit.
HANDS: BARE SKIN ONLY on punching hand AND rear hand. FORBIDDEN: any gloves (boxing/fighter/MMA/fingerless/wraps).
SCALE HARD LOCK: SAME head-to-toe height/margins as idle_01 in 576x576 — NOT small, NOT disproportionate.
Solid magenta background (#FF00FF). EXACTLY ONE character.`;
      } else if (request.participantId === 'leandro') {
        baseRule = `CRITICAL ATTACK: Copy IMAGE 1 punch pose EXACTLY (same punching arm extended, same lunge, same body rotation).
Keep IMAGE 2 clothes EXACTLY: plain black crew-neck short-sleeve tee + dark cargo pants + black sneakers with white soles (idle_01). Never the pose-ref outfit.
HANDS/WRISTS: BARE SKIN ONLY on BOTH hands. FORBIDDEN: any gloves (boxing/fighter/MMA/fingerless/wraps), watches, wristbands.
BODY: NORMAL average build matching idle_01 — NOT muscular/buff redesign.
SCALE HARD LOCK: SAME head-to-toe height/margins as idle_01 in 576x576 — NOT small, NOT disproportionate.
Solid magenta background (#FF00FF). EXACTLY ONE character.`;
      } else if (request.participantId === 'ricardo') {
        baseRule = `CRITICAL ATTACK: Copy IMAGE 1 punch pose EXACTLY (same punching arm extended, same lunge, same body rotation).
Keep IMAGE 2 clothes EXACTLY: royal-blue crew-neck tee with light-blue Under Armour logo + dark athletic pants + dark sneakers (idle_01). Never the pose-ref outfit.
HANDS/WRISTS: BARE SKIN ONLY on BOTH hands. FORBIDDEN: any gloves, watches, wristbands.
BODY: NORMAL average build matching idle_01 — SMOOTH arms, NOT muscular/buff redesign.
SCALE HARD LOCK: SAME head-to-toe height/margins as idle_01 in 576x576 — NOT small, NOT disproportionate.
Solid magenta background (#FF00FF). EXACTLY ONE character.`;
      } else if (request.participantId === 'fernando') {
        baseRule = `CRITICAL ATTACK (FERNANDO — Dinarte skeleton HARD LOCK):
EXACTLY TWO ARMS — HARD FAIL if a third/ghost/phantom arm appears (behind torso, extra elbow, extra fist).
PUNCHING ARM = CHARACTER'S RIGHT ARM fully extended straight to the RIGHT (same as IMAGE 1 Dinarte).
REAR/CHAMBERED ARM = CHARACTER'S LEFT ARM pulled back near waist/ribs. BARE wrists, NO watch.
LEGS: copy IMAGE 1 lunge exactly.
Keep IMAGE 2 identity EXACTLY: black polo + BRIGHT LIME GREEN collar AND green sleeve cuffs, black joggers, black sneakers white soles, curly hair, mustache+goatee, stud earrings, SMOOTH non-muscular arms.
FORBIDDEN: idle guard, extra/ghost arm, gloves, Dinarte black tank, collage, wrong scale.
SCALE HARD LOCK: SAME head-to-toe height/margins as idle_01 in 576x576.
Solid magenta background (#FF00FF). EXACTLY ONE character.`;
      } else if (request.participantId === 'caio') {
        baseRule = `CRITICAL ATTACK (CAIO — Dinarte skeleton HARD LOCK):
EXACTLY TWO ARMS — HARD FAIL if a third/ghost/phantom arm appears.
PUNCHING ARM = CHARACTER'S RIGHT ARM fully extended straight to the RIGHT (same as IMAGE 1 Dinarte).
REAR/CHAMBERED ARM = CHARACTER'S LEFT ARM pulled back near waist/ribs. Left arm hidden — OMIT watch. FORBIDDEN watch on punching RIGHT wrist.
LEGS: copy IMAGE 1 lunge exactly.
Keep IMAGE 2 identity EXACTLY: PLAIN black crew-neck tee, thin silver chain, RIGHT-ear silver stud, dark charcoal jeans, black sneakers white soles, fade hair, short dark beard, SMOOTH non-muscular arms, NO watch.
FORBIDDEN: idle guard, extra/ghost arm, gloves, Dinarte black tank, collage, wrong scale, watch on right wrist.
SCALE HARD LOCK: SAME head-to-toe height/margins as idle_01 in 576x576.
Solid magenta background (#FF00FF). EXACTLY ONE character.`;
      } else if (request.participantId === 'tiago') {
        baseRule = `CRITICAL ATTACK (TIAGO — Dinarte skeleton HARD LOCK):
PUNCHING ARM = CHARACTER'S RIGHT ARM fully extended straight to the RIGHT edge of the frame (same as IMAGE 1 Dinarte).
REAR/CHAMBERED ARM = CHARACTER'S LEFT ARM pulled back near waist/ribs — black sports watch stays on THIS left wrist (NOT on the punching fist).
LEGS: copy IMAGE 1 lunge exactly (same forward/back feet as Dinarte attack).
Keep IMAGE 2 identity EXACTLY: charcoal DIESEL allover tee, dark pants, white sneakers, black rectangular glasses, spiky dark hair, SMOOTH non-muscular arms.
FORBIDDEN: left-hand/lead jab punch, watch on the extended punching arm, idle guard, gloves, Dinarte black tank, multi-sprite.
SCALE HARD LOCK: SAME head-to-toe height/margins as idle_01 in 576x576.
Solid magenta background (#FF00FF). EXACTLY ONE character.`;
      } else {
        baseRule = `CRITICAL ATTACK: Copy IMAGE 1 punch pose EXACTLY (same punching arm extended, same lunge, same body rotation).
Keep IMAGE 2 clothes/shoes/face/hair/gloves EXACTLY — never the pose-ref outfit.
If IMAGE 2 has black fingerless gloves, keep those EXACT gloves (NO blue boxing gloves, NO new glove color).
SCALE: Match IMAGE 1 character FOOTPRINT in the 576x576 canvas — same head-to-toe height and margins as Dinarte attack / idle_01. NOT oversized. NOT zoomed in.
Solid magenta background (#FF00FF).`;
      }
    }
    if (request.frameName === 'walk_01') {
      baseRule = `CRITICAL WALK: This MUST be a walking mid-stride (one leg forward, one back), NOT an idle standing pose with both feet planted wide.
Copy IMAGE 1 leg stride and arm swing EXACTLY. Keep IMAGE 2 clothes/shoes/face/hair EXACTLY. NO extra gloves unless the master has gloves.
Solid magenta background (#FF00FF).`;
    }

    return { parts, baseRule };
  }

  /**
   * Dedicated lying/KO builder — ghost/duplicate legs are a frequent failure mode.
   * Do NOT send full idle master as identity image (it contaminates into standing+lying collage).
   */
  private buildLyingParts(
    request: GenerationRequest,
    sourceB64: string,
    faceB64: string,
    templateB64: string
  ): { parts: any[]; baseRule: string } {
    const parts: any[] = [];
    const hasPoseRef = !!(request.poseReferenceImage && fs.existsSync(request.poseReferenceImage));

    parts.push({
      text: 'CRITICAL LYING: Output ONE knocked-down character lying FLAT on the ground (body at baseline bottom of frame). EXACTLY TWO LEGS and EXACTLY TWO FEET. NO levitation. NO floating mid-air. NO standing character. NO collage. NO second sprite.',
    });

    if (hasPoseRef) {
      parts.push({
        text: 'IMAGE 1 (POSE/SKELETON ONLY — Dinarte lying): Copy this EXACT lying skeleton. Legs slightly bent, one shin may cross the other. Ignore clothes/gender.',
      });
      parts.push(pngPart(request.poseReferenceImage!));
      parts.push({ text: 'IMAGE 1 AGAIN (count legs: exactly TWO feet, exactly TWO legs):' });
      parts.push(pngPart(request.poseReferenceImage!));
      parts.push({ text: 'IMAGE 1 A 3RD TIME (horizontal KO only — NO standing pose):' });
      parts.push(pngPart(request.poseReferenceImage!));
    } else {
      parts.push({ text: 'POSE TEMPLATE (lying):' });
      parts.push({ inlineData: { data: templateB64, mimeType: 'image/png' } });
    }

    parts.push({ text: 'Face reference (appearance only — NOT pose):' });
    parts.push({ inlineData: { data: faceB64, mimeType: 'image/png' } });
    if (request.participantId !== 'livia') {
      parts.push({ text: 'Source card (clothes/hair colors ONLY — ignore card pose):' });
      parts.push({ inlineData: { data: sourceB64, mimeType: 'image/jpeg' } });
    }
    if (request.approvedMaster && fs.existsSync(request.approvedMaster)) {
      if (request.participantId === 'daniel' || request.participantId === 'hiago' || request.participantId === 'kelvin') {
        // NEVER attach idle_01 standing body — it contaminates lying into a standing+KO collage.
        if (request.participantId === 'daniel') {
          parts.push({
            text: 'DANIEL IDENTITY (TEXT LOCK — no standing idle image): WHITE short-sleeve polo; dark blue slim jeans; white slip-on canvas sneakers; short dark fade hair; thin mustache + goatee; dense BLACK SLEEVE TATTOO on RIGHT arm if visible; keys on RIGHT hip; SMOOTH arms. THIS IS DANIEL, NOT DAVID. EXACTLY ONE body lying FLAT. HARD FAIL if a standing fighter also appears.',
          });
        } else if (request.participantId === 'kelvin') {
          parts.push({
            text: 'KELVIN IDENTITY (TEXT LOCK — no standing idle image): WHITE polo with red AND navy striped collar+cuffs; dark navy trousers; white sneakers with red accents; round thick BLACK glasses; white earbuds in BOTH ears; short dark curly taper-fade; NO beard; SMOOTH arms. THIS IS KELVIN, NOT DANIEL. EXACTLY ONE body lying FLAT. HARD FAIL if a standing fighter also appears. Left arm hidden — OMIT watch (do NOT put it on the right wrist).',
          });
        } else {
          parts.push({
            text: 'HIAGO IDENTITY (TEXT LOCK — no standing idle image): oversized black tee with small white "TOP"; olive-green cargo joggers; black-and-white sneakers; round thick BLACK glasses; thin chain with pendant; voluminous dark wavy-curly quiff; NO beard; SMOOTH arms. THIS IS HIAGO, NOT IZAIAS. EXACTLY ONE body lying FLAT. HARD FAIL if a standing fighter also appears. Left arm hidden — OMIT watch (do NOT put it on the right wrist).',
          });
        }
      } else if (request.participantId === 'livia') {
        parts.push({
          text: 'CLOTHES COLOR CHIP ONLY (ignore pose — red dress + RED sandals + silver clutch colors only):',
        });
      } else if (request.participantId === 'leandro') {
        parts.push({
          text: 'IDENTITY CHIP (idle_01 — clothes + HAIR + SMOOTH arms ONLY; ignore standing pose): Copy EXACT short dark fade hair, black tee, dark cargo, sneakers. Arms SMOOTH with ZERO muscles. Do NOT invent a new haircut.',
        });
      } else if (request.participantId === 'ricardo') {
        parts.push({
          text: 'IDENTITY CHIP (idle_01 — clothes + HAIR + SMOOTH arms ONLY; ignore standing pose): Copy EXACT short dark buzz hair, royal-blue UA tee with light-blue logo, dark athletic pants, dark sneakers. Arms SMOOTH with ZERO muscles.',
        });
      } else {
        parts.push({
          text: 'CLOTHES COLOR CHIP ONLY (ignore pose/stance — use ONLY for outfit/shoe colors):',
        });
      }
      if (request.participantId !== 'daniel' && request.participantId !== 'hiago' && request.participantId !== 'kelvin') {
        parts.push(pngPart(request.approvedMaster));
      }
      if (request.participantId === 'leandro') {
        parts.push({
          text: 'HAIR LOCK AGAIN (idle_01): Confirm EXACT same hair silhouette/color before drawing lying pose.',
        });
        parts.push(pngPart(request.approvedMaster));
      }
    }

    let baseRule = `CRITICAL LYING / KO: Match IMAGE 1 lying skeleton EXACTLY.
OUTPUT: EXACTLY ONE character LYING on their BACK. FORBIDDEN: standing fighter, second body, collage, grid, two variants, sprite sheet, idle pose, source-card UI.
ANATOMY HARD RULE: EXACTLY TWO LEGS + EXACTLY TWO FEET. NO ghost limbs. NO duplicate legs. NO third shoe.
GROUND PLANE HARD RULE: Character is lying FLAT on the ground. Feet/body rest at the baseline bottom of the frame / ground plane. NO levitation. NO floating mid-air. Body must touch the bottom edge like a KO sprite on the floor.
Solid magenta (#FF00FF).`;
    if (request.participantId === 'samara') {
      baseRule +=
        ' Samara: black hoodie, black pants, gold necklace, WHITE sneakers (tênis branco). Eyes closed. NO blue shoes. lying FLAT on the ground, feet/body at baseline bottom, NO levitation, NO floating.';
    }
    if (request.participantId === 'livia') {
      baseRule +=
        ' Lívia: RED strappy high-heeled sandals (NOT silver). Silver rectangular clutch near hand. Eyes closed. Red one-shoulder ruffled dress. ONE body only.';
    }
    if (request.participantId === 'ana') {
      baseRule +=
        ' Ana HARD LOCK (FEMALE): emerald green one-shoulder gown (LEFT strap, RIGHT shoulder bare) + emerald sash + dark/emerald heels + high bun + face-framing strands + rose-pink glasses ALWAYS + gold hoops (EXACT idle_01). BARE HANDS. NO WATCH. Eyes closed. FEMALE body SMOOTH arms. FORBIDDEN: male body, Dinarte muscles, missing glasses, standing pose, collage.';
    }
    if (request.participantId === 'evellyn') {
      baseRule +=
        ' Evellyn HARD LOCK (FEMALE): long straight jet-black hair over both shoulders to mid-torso + PLAIN dark navy/charcoal crew-neck tee + dark charcoal pants + dark sneakers (EXACT idle_01). BARE HANDS. NO WATCH. NO glasses. NO jewelry. Eyes closed. FEMALE body SMOOTH arms. FORBIDDEN: male body, Dinarte muscles, bun, short hair, standing pose, collage.';
    }
    if (request.participantId === 'daniel') {
      baseRule +=
        ' Daniel HARD LOCK: WHITE polo + dark blue slim jeans + white slip-on sneakers + fade hair + mustache/goatee + RIGHT-arm sleeve tattoo + keys on right hip (EXACT idle_01). Eyes closed. SMOOTH arms. FLAT on ground (head LEFT, feet RIGHT) on baseline — NOT floating. Left arm hidden — OMIT gold watch rather than putting it on the right wrist. THIS IS DANIEL, NOT DAVID.';
    }
    if (request.participantId === 'joao') {
      baseRule +=
        ' João HARD LOCK: FULL formal charcoal/black SUIT jacket with lapels + matching suit trousers + dark dress shirt + bright MAGENTA necktie + silver belt buckle + polished dress shoes (EXACT idle_01). BARE HANDS. Eyes closed. FORBIDDEN: polo, sleeveless, default fighter clothes, gloves, missing jacket, missing necktie.';
    }
    if (request.participantId === 'leandro') {
      baseRule +=
        ' Leandro HARD LOCK: plain black crew-neck tee + dark cargo pants + black sneakers (EXACT idle_01). HAIR LOCK: EXACT same short dark fade/buzz as idle_01 — FORBIDDEN different haircut/color/volume. ARMS SMOOTH (ZERO muscles). BARE HANDS/WRISTS. Eyes closed. SAME scale footprint as idle_01.';
    }
    if (request.participantId === 'ricardo') {
      baseRule +=
        ' Ricardo HARD LOCK: royal-blue crew-neck tee with light-blue Under Armour logo + dark athletic pants + dark sneakers (EXACT idle_01). HAIR LOCK: EXACT same short dark buzz as idle_01. ARMS SMOOTH (ZERO muscles). BARE HANDS. Eyes closed. SAME scale footprint as idle_01.';
    }
    if (request.participantId === 'caio') {
      baseRule +=
        ' Caio HARD LOCK: PLAIN black crew-neck tee + thin silver chain + RIGHT-ear silver stud + dark charcoal jeans + black sneakers white soles (EXACT idle_01). HAIR LOCK: EXACT same short dark fade as idle_01. ARMS SMOOTH. BARE HANDS. NO WATCH (left arm may be hidden — OMIT watch, do NOT put it on the right wrist). Eyes closed. FLAT on ground, head LEFT feet RIGHT, body on baseline. SAME scale footprint as idle_01.';
    }
    if (request.participantId === 'fabio') {
      baseRule +=
        ' Fabio HARD LOCK: navy blue blazer + WHITE open-collar shirt (NO tie) + chest tattoo + navy dress pants + WHITE sneakers (EXACT idle_01). HAIR LOCK: EXACT same short dark fade as idle_01. ARMS SMOOTH. Eyes closed. FLAT on ground, head LEFT feet RIGHT, body on baseline. Left arm may be hidden — OMIT watch, do NOT put it on the right wrist. SAME scale footprint as idle_01. NOT Joao.';
    }
    if (request.participantId === 'hiago') {
      baseRule +=
        ' Hiago HARD LOCK: oversized black tee with white "TOP" + olive-green cargo joggers + black-and-white sneakers + round BLACK glasses + chain with pendant + voluminous wavy-curly quiff (EXACT idle_01). NO beard. ARMS SMOOTH. Eyes closed. FLAT on ground, head LEFT feet RIGHT, body on baseline. Left arm may be hidden — OMIT watch, do NOT put it on the right wrist. SAME scale footprint as idle_01. THIS IS HIAGO, NOT IZAIAS.';
    }
    if (request.participantId === 'kelvin') {
      baseRule +=
        ' Kelvin HARD LOCK: WHITE polo with red AND navy striped collar+cuffs + dark navy trousers + white sneakers with red accents + round BLACK glasses + white earbuds both ears + curly taper-fade (EXACT idle_01). NO beard. ARMS SMOOTH. Eyes closed. FLAT on ground, head LEFT feet RIGHT, body on baseline. Left arm may be hidden — OMIT watch, do NOT put it on the right wrist. SAME scale footprint as idle_01. THIS IS KELVIN, NOT DANIEL.';
    }
    return { parts, baseRule };
  }

  /**
   * Surgical edit: remove ghost/duplicate legs from an existing lying frame.
   * Do NOT attach Dinarte as an image — it causes Samara+Dinarte collages.
   */
  private buildGhostLimbFixParts(request: GenerationRequest): { parts: any[]; baseRule: string } {
    if (!request.editBaseImage || !fs.existsSync(request.editBaseImage)) {
      throw new Error('ghostLimbFix requires editBaseImage (existing lying PNG).');
    }

    const parts: any[] = [];
    parts.push({
      text: 'IMAGE 1 (PRIMARY — KEEP ALMOST EVERYTHING): Exact lying sprite of ONE woman. Keep same face, hair, black hoodie, black pants, gold necklace, white sneakers, arms, head, and magenta background. Fix ONLY extra/ghost legs.',
    });
    parts.push(pngPart(request.editBaseImage));

    const baseRule = `CRITICAL EDIT: Output EXACTLY ONE lying character (Samara only). NO second character. NO Dinarte. NO collage. NO sprite sheet.
Remove ghost/extra/duplicate legs from IMAGE 1.
Result MUST show EXACTLY TWO LEGS and EXACTLY TWO WHITE SNEAKERS (not three).
Clean crossed/bent KO legs like a normal knockout sprite.
Keep everything else identical to IMAGE 1.
Solid magenta background (#FF00FF).`;
    return { parts, baseRule };
  }

  private buildWalk01Parts(
    request: GenerationRequest,
    sourceB64: string,
    faceB64: string,
    templateB64: string
  ): { parts: any[]; baseRule: string } {
    const parts: any[] = [];
    const poseRefB64 = request.poseReferenceImage && fs.existsSync(request.poseReferenceImage)
      ? fileToBase64(request.poseReferenceImage)
      : null;

    parts.push({
      text: 'CRITICAL: walk_01 is a WALKING mid-stride, NOT idle. One leg forward, one back, arms counter-swinging. DO NOT copy idle fist-and-clutch stance.',
    });

    if (poseRefB64) {
      parts.push({ text: 'IMAGE 1 (POSE/SKELETON ONLY — Dinarte walk_01): Copy this EXACT stride. Ignore clothes on this image.' });
      parts.push({ inlineData: { data: poseRefB64, mimeType: 'image/png' } });
      parts.push({ text: 'IMAGE 1 AGAIN (legs must match: front heel down, rear toe push):' });
      parts.push({ inlineData: { data: poseRefB64, mimeType: 'image/png' } });
      parts.push({ text: 'IMAGE 1 A 3RD TIME (confirm walking stride, not idle):' });
      parts.push({ inlineData: { data: poseRefB64, mimeType: 'image/png' } });
    } else {
      parts.push({ text: 'POSE TEMPLATE (walk stride — look at the legs!):' });
      parts.push({ inlineData: { data: templateB64, mimeType: 'image/png' } });
      parts.push({ text: 'POSE TEMPLATE AGAIN:' });
      parts.push({ inlineData: { data: templateB64, mimeType: 'image/png' } });
    }

    // Do NOT send approvedMaster idle sprite as pose — it contaminates walk into idle.
    // Clothes/identity come from source card + face + optional color chip.
    parts.push({ text: 'Face reference (appearance only):' });
    parts.push({ inlineData: { data: faceB64, mimeType: 'image/png' } });
    parts.push({ text: 'Source card / body (clothes, shoes, hair colors ONLY — ignore card pose):' });
    parts.push({ inlineData: { data: sourceB64, mimeType: 'image/jpeg' } });
    if (request.approvedMaster && fs.existsSync(request.approvedMaster)) {
      if (request.participantId === 'leonardo') {
        parts.push({
          text: 'IMAGE STYLE+IDENTITY LOCK (Leonardo idle_01 — HIGHEST PRIORITY AFTER POSE): Copy EXACT art style — same face rendering, same salt-and-pepper hair pixel treatment, same line weight, same shading language, same gray polo with navy collar/cuff stripes, jeans, sneakers. MUST look like the SAME artist as idle_01. Ignore idle pose/limbs. BODY: NORMAL average SMOOTH arms (ZERO buff muscles).',
        });
        parts.push(pngPart(request.approvedMaster));
        parts.push({
          text: 'STYLE LOCK AGAIN (idle_01): Confirm SAME face/hair/clothes rendering language — FORBIDDEN different-artist soft/blurry restyle.',
        });
        parts.push(pngPart(request.approvedMaster));
      } else if (request.participantId === 'fabio') {
        parts.push({
          text: 'IMAGE STYLE+IDENTITY+BODY LOCK (Fabio idle_01 — HIGHEST PRIORITY AFTER POSE): Copy EXACT same character as idle_01. SAME face/hair pixel treatment, SAME line weight, SAME shading. SAME navy blazer cut/lapels/length, SAME open white shirt (no tie), SAME chest tattoo as idle_01 (do not invent a new tattoo), SAME navy dress-pants fabric/color, SAME WHITE sneakers. BODY MASS LOCK: SAME leg thickness (thigh/calf silhouette) and torso width as idle_01 — NOT skinnier, NOT thicker, NOT a different body type. Ignore idle pose/fists/limb angles. SMOOTH non-muscular arms.',
        });
        parts.push(pngPart(request.approvedMaster));
        parts.push({
          text: 'BODY+CLOTHES LOCK AGAIN (idle_01): Confirm SAME artist, SAME navy suit silhouette, SAME pant-leg thickness as idle_01. FORBIDDEN: different-artist restyle, skinny legs, bulky legs, different jacket cut, jeans, dress shoes, magenta tie.',
        });
        parts.push(pngPart(request.approvedMaster));
      } else if (request.participantId === 'hiago') {
        parts.push({
          text: 'IMAGE STYLE+IDENTITY+BODY LOCK (Hiago idle_01 — HIGHEST PRIORITY AFTER POSE): Copy EXACT same character as idle_01. SAME face/glasses/hair pixel treatment, SAME line weight, SAME shading. SAME oversized black tee with "TOP", SAME olive cargo joggers (pockets + elastic ankles), SAME black-and-white sneakers, SAME round black glasses, SAME chain+pendant. BODY MASS LOCK: SAME leg thickness (thigh/calf silhouette) and torso width as idle_01 — NOT skinnier, NOT thicker. Ignore idle pose/fists/limb angles. SMOOTH non-muscular arms. Watch LEFT if left wrist visible.',
        });
        parts.push(pngPart(request.approvedMaster));
        parts.push({
          text: 'BODY+CLOTHES LOCK AGAIN (idle_01): Confirm SAME artist, SAME olive cargo silhouette, SAME pant-leg thickness as idle_01. FORBIDDEN: different-artist restyle, skinny legs, bulky legs, jeans, missing glasses, missing "TOP" tee.',
        });
        parts.push(pngPart(request.approvedMaster));
      } else if (request.participantId === 'kelvin') {
        parts.push({
          text: 'IMAGE STYLE+IDENTITY+BODY LOCK (Kelvin idle_01 — HIGHEST PRIORITY AFTER POSE): Copy EXACT same character as idle_01. SAME face/glasses/hair pixel treatment, SAME line weight, SAME shading. SAME WHITE polo with red/navy striped collar+cuffs, SAME dark navy trousers, SAME white sneakers with red accents, SAME round black glasses, SAME white earbuds in both ears. BODY MASS LOCK: SAME leg thickness (thigh/calf silhouette) and torso width as idle_01 — NOT skinnier, NOT thicker. Ignore idle pose/fists/limb angles. SMOOTH non-muscular arms. Watch LEFT if left wrist visible.',
        });
        parts.push(pngPart(request.approvedMaster));
        parts.push({
          text: 'BODY+CLOTHES LOCK AGAIN (idle_01): Confirm SAME artist, SAME polo+pants silhouette, SAME pant-leg thickness as idle_01. FORBIDDEN: different-artist restyle, skinny legs, bulky legs, missing glasses, missing earbuds, missing collar stripes.',
        });
        parts.push(pngPart(request.approvedMaster));
      } else {
        parts.push({
          text: 'CLOTHES COLOR CHIP ONLY (ignore pose/arms/legs — use ONLY for outfit/shoe/accessory colors from THIS fighter):',
        });
        parts.push(pngPart(request.approvedMaster));
        parts.push({
          text: 'CLOTHES CHIP AGAIN (confirm SAME outfit — NOT another fighter):',
        });
        parts.push(pngPart(request.approvedMaster));
      }
    }

    // Prefer an already-correct sibling walk frame as extra outfit lock (anti Lívia red-dress leak).
    const siblingWalk02 = path.join(
      path.dirname(request.outputPath || ''),
      'walk_02.png'
    );
    // Skip sibling walk_02 outfit lock for João while walks are being suit-corrected
    // (a broken walk_02 without the terno would contaminate walk_01).
    // Skip sibling walk_02 for Leandro while walk_02 may be a broken multi-sprite collage.
    // Skip for Leonardo — walk_02 must not override idle_01 style lock.
    if (
      request.participantId !== 'livia' &&
      request.participantId !== 'fatinha' &&
      request.participantId !== 'joao' &&
      request.participantId !== 'leandro' &&
      request.participantId !== 'ricardo' &&
      request.participantId !== 'leonardo' &&
      request.participantId !== 'alexandre' &&
      request.participantId !== 'caio' &&
      request.participantId !== 'daniel' &&
      request.participantId !== 'fabio' &&
      request.participantId !== 'hiago' &&
      request.participantId !== 'kelvin' &&
      request.outputPath &&
      fs.existsSync(siblingWalk02)
    ) {
      parts.push({
        text: 'OUTFIT LOCK FROM walk_02 (same fighter — copy clothes/shoes/hair ONLY; keep IMAGE 1 walk_01 leg stride):',
      });
      parts.push(pngPart(siblingWalk02));
    }

    // Rhussiana / Neto / Leandro / Leonardo walk_01: idle_01 as SCALE ONLY (pose stays Dinarte walk).
    if (
      (request.participantId === 'rhussiana' ||
        request.participantId === 'neto' ||
        request.participantId === 'leandro' ||
        request.participantId === 'ricardo' ||
        request.participantId === 'leonardo' ||
        request.participantId === 'ryan' ||
        request.participantId === 'ana' ||
        request.participantId === 'alexandre' ||
        request.participantId === 'caio' ||
        request.participantId === 'daniel' ||
        request.participantId === 'fabio' ||
        request.participantId === 'hiago' ||
        request.participantId === 'kelvin') &&
      request.scaleReferenceImage &&
      fs.existsSync(request.scaleReferenceImage)
    ) {
      parts.push({
        text: 'SCALE ONLY (idle_01 — HEIGHT/FOOTPRINT): Match this EXACT character head-to-toe height and canvas margins in 576x576. SAME size as idle_01 — NOT smaller, NOT lower in frame. Do NOT copy idle pose, idle fist guard, idle stance, or idle limb angles from this image.',
      });
      parts.push(pngPart(request.scaleReferenceImage));
      parts.push({
        text: 'SCALE CONFIRM: Head near same vertical position as idle_01. Feet on similar baseline. FORBIDDEN: copying idle fists-up guard. KEEP IMAGE 1 Dinarte WALKING stride.',
      });
      parts.push(pngPart(request.scaleReferenceImage));
      // Reinforce walk pose after scale images so idle does not win.
      if (poseRefB64) {
        parts.push({
          text: 'POSE OVERRIDE (Dinarte walk_01 AGAIN — AFTER scale): Legs MUST be mid-stride walking. Arms counter-swinging DOWN/SIDE — NOT idle raised fists. Copy THIS walk skeleton.',
        });
        parts.push({ inlineData: { data: poseRefB64, mimeType: 'image/png' } });
      }
    }

    // Identity from master/source — never hardcode another fighter's outfit (Lívia red dress was leaking here).
    let baseRule = `CRITICAL WALK_01: Match IMAGE 1 walk stride EXACTLY. FORBIDDEN: idle wide stance, both feet planted flat, fist-at-chest idle pose.
EXACTLY ONE character in a single 576x576 frame. FORBIDDEN: collage, sprite sheet, two figures side-by-side, dual panels.
Keep the EXACT clothes, shoes, gloves/accessories, hair, and face from the clothes chip / source identity.
FORBIDDEN: inventing a different outfit (no forced red dress, no heels unless the master has them, no silver clutch unless the master has it).
SCALE: Match IMAGE 1 character FOOTPRINT in 576x576 — same head-to-toe height/margins as Dinarte walk_01. NOT undersized. NOT tiny with huge empty margins.
Solid magenta background (#FF00FF).`;
    if (request.participantId === 'livia' || request.participantId === 'fatinha') {
      baseRule = `CRITICAL WALK_01: Match IMAGE 1 walk stride EXACTLY. FORBIDDEN: idle wide stance, both feet planted flat, fist-at-chest idle pose.
Keep red one-shoulder dress and heels from source/clothes chip. Solid magenta (#FF00FF).`;
    } else if (request.participantId === 'radja') {
      baseRule = `CRITICAL WALK_01: Match IMAGE 1 (Dinarte) walk stride EXACTLY. EXACTLY ONE character, single 576x576 frame — NO collage / NO dual figures.
IDENTITY LOCK (Radja): voluminous DEEP BLACK curly/coily hair (cool charcoal highlights ONLY — FORBIDDEN warm brown/espresso hair), purple open jacket DRAPED / FALLING OFF the shoulders (casaco caindo nos ombros — NOT pulled up, NOT fully worn on), navy crop top, black pants, brown/silver belt buckle, black sneakers with white soles, ALWAYS white hand wraps on BOTH hands (same as idle_01 — never bare wrists).
FORBIDDEN: jacket worn snug on both shoulders, red dress, red heels, one-shoulder dress, Lívia outfit, silver clutch, Dinarte clothes, inventing a new outfit.
Solid magenta (#FF00FF).`;
    } else if (request.participantId === 'monalisa') {
      baseRule = `CRITICAL WALK_01: Match IMAGE 1 (Dinarte) walk stride EXACTLY. EXACTLY ONE character, single 576x576 frame — NO collage / NO dual figures.
IDENTITY LOCK (Monalisa): long straight black hair, light-grey/white long-sleeve button-down shirt, dark charcoal trousers, gold chain necklace, black sneakers with white soles/laces.
FORBIDDEN: red dress, red heels, one-shoulder dress, Lívia outfit, silver clutch, inventing a new outfit.
SCALE: Match IMAGE 1 FOOTPRINT in 576x576 — same head-to-toe height/margins. NOT undersized.
Solid magenta (#FF00FF).`;
    } else if (request.participantId === 'rhussiana') {
      baseRule = `CRITICAL WALK_01: Match IMAGE 1 (Dinarte) WALKING mid-stride EXACTLY — one leg forward, one back, arms counter-swinging. FORBIDDEN: idle fighting guard, both feet planted flat, fists raised at chest.
EXACTLY ONE character, single 576x576 frame — NO collage / NO dual figures.
IDENTITY LOCK (Rhussiana): black strapless dress WITH babado/ruffle ending one finger above the knee, GOLD heeled sandals, gold hair clip, BARE HANDS. NORMAL slim average body (NOT plump/gordinha, NOT muscular).
FORBIDDEN: boxing gloves, fighter gloves, fingerless combat gloves, mini mid-thigh dress, red dress, silver clutch, inventing gloves, idle pose.
SCALE HARD LOCK: SAME size/height/footprint as idle_01 scale ref — NOT smaller, NOT lower in frame, NOT tiny with huge empty magenta above head.
Solid magenta (#FF00FF).`;
    } else if (request.participantId === 'joao') {
      baseRule = `CRITICAL WALK_01: Match IMAGE 1 (Dinarte) walk stride EXACTLY. FORBIDDEN: idle wide stance, both feet planted flat, fist-at-chest idle pose.
EXACTLY ONE character, single 576x576 frame — NO collage / NO dual figures.
IDENTITY LOCK (João — FORMAL SUIT / TERNO from idle_01): charcoal/black suit jacket with lapels, matching suit trousers, dark dress shirt, bright MAGENTA necktie, thin black belt with silver buckle, polished dress shoes, short dark fade hair, full dark beard, BARE HANDS.
FORBIDDEN: black polo, sleeveless, default fighter clothes, jeans, sneakers, gloves of any kind, missing jacket, missing necktie.
SCALE: SAME head-to-toe height/margins as idle_01 clothes chip. Solid magenta (#FF00FF).`;
    } else if (request.participantId === 'neto') {
      baseRule = `CRITICAL WALK_01: Match IMAGE 1 (Dinarte) walk stride EXACTLY. FORBIDDEN: idle wide stance, both feet planted flat, fist-at-chest idle pose.
EXACTLY ONE character, single 576x576 frame — NO collage / NO dual figures.
IDENTITY LOCK (Neto — from idle_01): plain tight black short-sleeve tee, medium-blue denim jeans (exact idle_01 blue), black sneakers, fade hair, full beard, BARE HANDS on BOTH fists.
FORBIDDEN: gloves of any kind (boxing/fighter/MMA/fingerless), cargo pants, charcoal/gray pants, brown belt, gold necklace.
SCALE HARD LOCK: SAME size/height/footprint as idle_01 — NOT smaller, NOT disproportionate. Solid magenta (#FF00FF).`;
    } else if (request.participantId === 'leandro') {
      baseRule = `CRITICAL WALK_01: Match IMAGE 1 (Dinarte) walk stride EXACTLY. FORBIDDEN: idle wide stance, both feet planted flat, fist-at-chest idle pose.
EXACTLY ONE character, single 576x576 frame — NO collage / NO dual figures / NO miniature multi-sprites.
IDENTITY LOCK (Leandro from idle_01): plain black crew-neck short-sleeve t-shirt, dark charcoal/black cargo pants, black sneakers with white soles, short dark fade hair, BARE HANDS, BARE WRISTS.
BODY: NORMAL average build — NOT skinny, NOT muscular/buff/ripped.
FORBIDDEN: gloves, watches, wristbands, jeans-without-cargo look, polo, multi-character output.
SCALE: SAME head-to-toe height/margins as idle_01 clothes chip. Solid magenta (#FF00FF).`;
    } else if (request.participantId === 'ricardo') {
      baseRule = `CRITICAL WALK_01: Match IMAGE 1 (Dinarte) walk stride EXACTLY. FORBIDDEN: idle wide stance, both feet planted flat, fist-at-chest idle pose.
EXACTLY ONE character, single 576x576 frame — NO collage / NO dual figures / NO miniature multi-sprites.
IDENTITY LOCK (Ricardo from idle_01): royal-blue crew-neck short-sleeve tee with light-blue Under Armour logo on chest, dark charcoal/black athletic pants, dark sneakers, short dark buzz cut, BARE HANDS, BARE WRISTS.
BODY: NORMAL average build — SMOOTH arms, NOT skinny, NOT muscular/buff/ripped.
FORBIDDEN: gloves, watches, Dinarte black tank, multi-character output.
SCALE: SAME head-to-toe height/margins as idle_01 clothes chip. Solid magenta (#FF00FF).`;
    } else if (request.participantId === 'leonardo') {
      baseRule = `CRITICAL WALK_01: Match IMAGE 1 (Dinarte) walk stride EXACTLY — mid-stride walking, arms counter-swinging. FORBIDDEN: idle fists-up guard.
EXACTLY ONE character, single 576x576 frame — NO collage.
STYLE+IDENTITY LOCK (Leonardo idle_01): SAME artist as idle_01 — same face/hair pixel treatment, same line weight, same shading. Light heather-gray polo with TWO thin dark navy stripes on collar AND sleeve cuffs, blue jeans, light sneakers, salt-and-pepper short hair, light stubble.
BODY: NORMAL average — SMOOTH arms ZERO buff muscles (Dinarte musculature FORBIDDEN).
FORBIDDEN: different-artist soft/blurry restyle, muscular arms, wrong haircut.
SCALE: SAME head-to-toe height/margins as idle_01. Solid magenta (#FF00FF).`;
    } else if (request.participantId === 'izaias') {
      baseRule = `CRITICAL WALK_01: Match IMAGE 1 (Dinarte) walk stride EXACTLY. FORBIDDEN: idle wide stance, both feet planted flat, fist-at-chest idle pose.
EXACTLY ONE character, single 576x576 frame — NO collage / NO dual figures.
IDENTITY LOCK (Izaias from idle_01 / walk_02): dark CHARCOAL-NAVY quilted puffer jacket (EXACT same near-black navy as idle_01 — FORBIDDEN bright/electric/light blue tint), white tee, charcoal jeans, EXACTLY ONE silver steel chain, solid black sneakers, BARE HANDS.
JACKET COLOR HARD LOCK: Match idle_01 and walk_02 jacket palette exactly (charcoal-navy). HARD FAIL if jacket is bluer/brighter than idle_01.
FORBIDDEN: gloves, multi-chain, missing chain, blue-tinted jacket, wrong shoes.
SCALE: SAME head-to-toe height/margins as idle_01. Solid magenta (#FF00FF).`;
    } else if (request.participantId === 'ryan') {
      baseRule = `CRITICAL WALK_01: Match IMAGE 1 (Dinarte) walk stride EXACTLY — mid-stride walking, arms counter-swinging. FORBIDDEN: idle fists-up guard.
EXACTLY ONE character, single 576x576 frame — NO collage.
IDENTITY LOCK (Ryan from idle_01): black/navy short-sleeve polo with BRIGHT LIME GREEN collar AND matching lime-green bands on BOTH sleeve cuffs; left-chest "ESPERANÇA DISTRIBUIDORA DE FRIOS" logo; black backpack straps over both shoulders; black pants; black sneakers with thin white soles; short dark hair; dark stubble; BARE wrists (NO watch).
BODY: NORMAL average — SMOOTH arms ZERO buff muscles (Dinarte musculature FORBIDDEN).
FORBIDDEN: Wesley lime-collar polo without logo/backpack, missing green sleeve bands, missing backpack, adding a watch, gloves.
SCALE: SAME head-to-toe height/margins as idle_01. Solid magenta (#FF00FF).`;
    } else if (request.participantId === 'ana') {
      baseRule = `CRITICAL WALK_01 (ANA — FEMALE): Match IMAGE 1 (Dinarte) WALKING mid-stride EXACTLY — one leg forward, one back, arms counter-swinging. FORBIDDEN: idle fighting guard, both feet planted flat, fists raised at chest.
EXACTLY ONE character, single 576x576 frame — NO collage.
IDENTITY LOCK (Ana): FEMALE; emerald green one-shoulder gown (LEFT strap, RIGHT shoulder bare); matching emerald sash/belt; long hem near ankles; dark/emerald closed-toe heels; high bun + two face-framing strands; rose-pink glasses ALWAYS; gold hoop earrings; BARE HANDS; NO WATCH.
BODY: NORMAL female — SMOOTH arms ZERO muscles (Dinarte musculature FORBIDDEN). FORBIDDEN: male body, red dress, black dress, sneakers, missing glasses, missing bun.
SCALE HARD LOCK: SAME size/height/footprint as idle_01. Solid magenta (#FF00FF).`;
    } else if (request.participantId === 'alexandre') {
      baseRule = `CRITICAL WALK_01 (ALEXANDRE): Match IMAGE 1 (Dinarte) WALKING mid-stride EXACTLY — one leg forward, one back, rear heel lifted, arms counter-swinging. FORBIDDEN: idle fighting guard, both feet planted flat, fists raised at chest like idle.
GAZE HARD LOCK: Head 3/4 RIGHT toward opponent (nose/cap brim point RIGHT). FORBIDDEN camera stare / full-front portrait.
EXACTLY ONE character, single 576x576 frame — NO collage.
IDENTITY LOCK: black cap, WHITE sunglasses, salt-and-pepper beard, silver chain, black patterned tee, black athletic shorts, black sneakers, RIGHT forearm tattoo, NO watch, SMOOTH arms.
SCALE: SAME head-to-toe height/margins as idle_01. Solid magenta (#FF00FF).`;
    } else if (request.participantId === 'caio') {
      baseRule = `CRITICAL WALK_01 (CAIO): Match IMAGE 1 (Dinarte) WALKING mid-stride EXACTLY — one leg forward, one back, rear heel lifted, arms counter-swinging. FORBIDDEN: idle fighting guard, both feet planted flat, fists raised at chest like idle.
GAZE HARD LOCK: Head 3/4 RIGHT toward opponent. FORBIDDEN camera stare / full-front portrait.
EXACTLY ONE character, single 576x576 frame — NO collage.
IDENTITY LOCK: PLAIN black crew-neck tee, thin silver chain, RIGHT-ear silver stud, dark charcoal jeans, black sneakers white soles, short dark fade hair, groomed short beard, NO watch, SMOOTH arms.
WATCH: if a watch appears it MUST be LEFT wrist only (same as idle_01). FORBIDDEN watch on right wrist.
SCALE: SAME head-to-toe height/margins as idle_01. Solid magenta (#FF00FF).`;
    } else if (request.participantId === 'evellyn') {
      baseRule = `CRITICAL WALK_01 (EVELLYN — FEMALE): Match IMAGE 1 (Dinarte) WALKING mid-stride EXACTLY — one leg forward, one back, arms counter-swinging. FORBIDDEN: idle fighting guard, both feet planted flat, fists raised at chest.
EXACTLY ONE character, single 576x576 frame — NO collage.
IDENTITY LOCK (Evellyn): FEMALE; long straight jet-black hair over both shoulders to mid-torso; PLAIN dark navy/charcoal short-sleeve crew-neck tee; dark charcoal pants; dark sneakers; BARE HANDS; NO WATCH; NO glasses; NO jewelry.
BODY: NORMAL female — SMOOTH arms ZERO muscles (Dinarte musculature FORBIDDEN). FORBIDDEN: male body, bun, short hair, adding a watch.
SCALE HARD LOCK: SAME size/height/footprint as idle_01. Solid magenta (#FF00FF).`;
    } else if (request.participantId === 'daniel') {
      baseRule = `CRITICAL WALK_01 (DANIEL): Match IMAGE 1 (Dinarte) WALKING mid-stride EXACTLY — one leg forward, one back, rear heel lifted, arms counter-swinging. FORBIDDEN: idle fighting guard, both feet planted flat, fists raised at chest like idle.
GAZE HARD LOCK: Head 3/4 RIGHT toward opponent. FORBIDDEN camera stare / full-front portrait.
EXACTLY ONE character, single 576x576 frame — NO collage.
IDENTITY LOCK: WHITE short-sleeve polo, dark blue slim jeans, white slip-on canvas sneakers, short dark fade hair, thin mustache + goatee, dense BLACK SLEEVE TATTOO on RIGHT arm, chunky GOLD watch on LEFT wrist, keys on RIGHT hip, SMOOTH arms. THIS IS DANIEL, NOT DAVID.
WATCH: LEFT wrist only (same as idle_01). FORBIDDEN watch on right wrist.
SCALE: SAME head-to-toe height/margins as idle_01. Solid magenta (#FF00FF).`;
    } else if (request.participantId === 'fabio') {
      baseRule = `CRITICAL WALK_01 (FABIO): Match IMAGE 1 (Dinarte) WALKING mid-stride EXACTLY — one leg forward, one back, rear heel lifted, arms counter-swinging. FORBIDDEN: idle fighting guard, both feet planted flat, fists raised at chest like idle.
GAZE HARD LOCK: Head 3/4 RIGHT toward opponent. FORBIDDEN camera stare / full-front portrait.
EXACTLY ONE character, single 576x576 frame — NO collage.
STYLE+IDENTITY LOCK (idle_01): SAME character AND artist as idle_01 — same face/hair pixels, same line weight, same shading.
OUTFIT LOCK: navy blue tailored blazer with lapels (SAME cut/length as idle_01), WHITE open-collar dress shirt NO necktie, keep idle_01 chest tattoo (do not invent a new one), matching navy dress pants (SAME fabric/color/width as idle_01), bright WHITE sneakers (SAME as idle_01).
BODY MASS HARD LOCK: SAME leg thickness (thigh/calf) and torso silhouette as idle_01. FORBIDDEN: skinnier legs, thicker legs, different jacket cut, jeans, joggers, dress shoes, magenta tie, Joao look.
WATCH: silver watch on LEFT wrist if the left wrist is visible. FORBIDDEN watch on right wrist.
SCALE: SAME head-to-toe height/margins as idle_01. Solid magenta (#FF00FF).`;
    } else if (request.participantId === 'hiago') {
      baseRule = `CRITICAL WALK_01 (HIAGO): Match IMAGE 1 (Dinarte) WALKING mid-stride EXACTLY — one leg forward, one back, rear heel lifted, arms counter-swinging. FORBIDDEN: idle fighting guard, both feet planted flat, fists raised at chest like idle.
GAZE HARD LOCK: Head 3/4 RIGHT toward opponent. FORBIDDEN camera stare / full-front portrait.
EXACTLY ONE character, single 576x576 frame — NO collage.
STYLE+IDENTITY LOCK (idle_01): SAME character AND artist as idle_01 — same face/glasses/hair pixels, same line weight, same shading.
OUTFIT LOCK: oversized black tee with white "TOP" (SAME as idle_01), olive-green cargo joggers (SAME pockets/color/width as idle_01), black-and-white sneakers, round BLACK glasses ALWAYS, chain with pendant.
BODY MASS HARD LOCK: SAME leg thickness (thigh/calf) and torso silhouette as idle_01. FORBIDDEN: skinnier legs, thicker legs, jeans, missing glasses, missing cargo pockets.
WATCH: dark watch on LEFT wrist if the left wrist is visible. FORBIDDEN watch on right wrist.
SCALE: SAME head-to-toe height/margins as idle_01. Solid magenta (#FF00FF).`;
    } else if (request.participantId === 'kelvin') {
      baseRule = `CRITICAL WALK_01 (KELVIN): Match IMAGE 1 (Dinarte) WALKING mid-stride EXACTLY — one leg forward, one back, rear heel lifted, arms counter-swinging. FORBIDDEN: idle fighting guard, both feet planted flat, fists raised at chest like idle.
GAZE HARD LOCK: Head 3/4 RIGHT toward opponent. FORBIDDEN camera stare / full-front portrait.
EXACTLY ONE character, single 576x576 frame — NO collage.
STYLE+IDENTITY LOCK (idle_01): SAME character AND artist as idle_01 — same face/glasses/hair pixels, same line weight, same shading.
OUTFIT LOCK: WHITE polo with red AND navy striped collar AND matching striped cuffs (SAME as idle_01), dark navy/black trousers (SAME fabric/color/width as idle_01), white sneakers with red accents, round BLACK glasses ALWAYS, white earbuds in BOTH ears.
BODY MASS HARD LOCK: SAME leg thickness (thigh/calf) and torso silhouette as idle_01. FORBIDDEN: skinnier legs, thicker legs, missing glasses, missing earbuds, missing collar stripes, Daniel tattoo.
WATCH: silver/dark watch on LEFT wrist if the left wrist is visible. FORBIDDEN watch on right wrist.
SCALE: SAME head-to-toe height/margins as idle_01. Solid magenta (#FF00FF).`;
    }

    return { parts, baseRule };
  }

  private buildWalk02Parts(
    request: GenerationRequest,
    sourceB64: string,
    faceB64: string,
    templateB64: string
  ): { parts: any[]; baseRule: string } {
    if (request.participantId === 'livia') {
      return this.buildLiviaWalk02Parts(request, sourceB64, faceB64, templateB64);
    }

    const parts: any[] = [];

    const poseRefB64 = request.poseReferenceImage && fs.existsSync(request.poseReferenceImage)
      ? fileToBase64(request.poseReferenceImage)
      : null;

    parts.push({
      text: 'CRITICAL POSE INSTRUCTION: This is the SECOND step of a walk cycle. Copy EXACTLY the pose/skeleton from IMAGE 1 (Dinarte or approved pose reference). Legs and arms must match Image 1. DO NOT copy clothes, hair, or face from Image 1. DO NOT copy idle fist-and-clutch stance.',
    });

    if (poseRefB64) {
      parts.push({ text: 'IMAGE 1 (POSE/SKELETON ONLY — Dinarte walk_02): Copy this exact pose.' });
      parts.push({ inlineData: { data: poseRefB64, mimeType: 'image/png' } });
      parts.push({ text: 'IMAGE 1 AGAIN (confirm legs/arms match):' });
      parts.push({ inlineData: { data: poseRefB64, mimeType: 'image/png' } });
      parts.push({ text: 'IMAGE 1 A 3RD TIME (walking stride — opposite step from walk_01):' });
      parts.push({ inlineData: { data: poseRefB64, mimeType: 'image/png' } });
    } else {
      // Fallback to silhouette template when Dinarte pose is unavailable
      parts.push({ text: 'POSE TEMPLATE (Look closely at the legs!):' });
      parts.push({ inlineData: { data: templateB64, mimeType: 'image/png' } });
      parts.push({ text: 'POSE TEMPLATE AGAIN (Must match this leg stride):' });
      parts.push({ inlineData: { data: templateB64, mimeType: 'image/png' } });
    }

    // Prefer source/face for identity; approved master only as color chip (avoids idle pose bleed),
    // except Fabio walks which need idle_01 style + body-mass lock (QA: walks looked like a different character).
    parts.push({ text: 'Face reference (appearance only):' });
    parts.push({ inlineData: { data: faceB64, mimeType: 'image/png' } });
    parts.push({
      text: 'Source card (CLOTHES/COLORS ONLY — ignore UI, panels, portraits, stats bars, text, green backgrounds):',
    });
    parts.push({ inlineData: { data: sourceB64, mimeType: 'image/jpeg' } });
    if (request.approvedMaster && fs.existsSync(request.approvedMaster)) {
      if (request.participantId === 'fabio') {
        parts.push({
          text: 'IMAGE STYLE+IDENTITY+BODY LOCK (Fabio idle_01 — HIGHEST PRIORITY AFTER POSE): Copy EXACT same character as idle_01. SAME face/hair pixel treatment, SAME line weight, SAME shading. SAME navy blazer cut/lapels/length, SAME open white shirt (no tie), SAME chest tattoo as idle_01, SAME navy dress-pants fabric/color, SAME WHITE sneakers. BODY MASS LOCK: SAME leg thickness (thigh/calf silhouette) and torso width as idle_01 — NOT skinnier, NOT thicker. Ignore idle pose/fists/limb angles. SMOOTH non-muscular arms.',
        });
        parts.push(pngPart(request.approvedMaster));
        parts.push({
          text: 'BODY+CLOTHES LOCK AGAIN (idle_01): Confirm SAME artist, SAME navy suit silhouette, SAME pant-leg thickness as idle_01. FORBIDDEN: different-artist restyle, skinny/thick legs, different jacket cut, jeans, dress shoes, magenta tie.',
        });
        parts.push(pngPart(request.approvedMaster));
      } else if (request.participantId === 'hiago') {
        parts.push({
          text: 'IMAGE STYLE+IDENTITY+BODY LOCK (Hiago idle_01 — HIGHEST PRIORITY AFTER POSE): Copy EXACT same character as idle_01. SAME face/glasses/hair pixel treatment, SAME line weight, SAME shading. SAME oversized black tee with "TOP", SAME olive cargo joggers, SAME black-and-white sneakers, SAME round black glasses, SAME chain+pendant. BODY MASS LOCK: SAME leg thickness (thigh/calf silhouette) and torso width as idle_01 — NOT skinnier, NOT thicker. Ignore idle pose/fists/limb angles. SMOOTH non-muscular arms. Watch LEFT if left wrist visible.',
        });
        parts.push(pngPart(request.approvedMaster));
        parts.push({
          text: 'BODY+CLOTHES LOCK AGAIN (idle_01): Confirm SAME artist, SAME olive cargo silhouette, SAME pant-leg thickness as idle_01. FORBIDDEN: different-artist restyle, skinny/thick legs, jeans, missing glasses.',
        });
        parts.push(pngPart(request.approvedMaster));
      } else if (request.participantId === 'kelvin') {
        parts.push({
          text: 'IMAGE STYLE+IDENTITY+BODY LOCK (Kelvin idle_01 — HIGHEST PRIORITY AFTER POSE): Copy EXACT same character as idle_01. SAME face/glasses/hair pixel treatment, SAME line weight, SAME shading. SAME WHITE polo with red/navy striped collar+cuffs, SAME dark navy trousers, SAME white sneakers with red accents, SAME round black glasses, SAME white earbuds. BODY MASS LOCK: SAME leg thickness (thigh/calf silhouette) and torso width as idle_01 — NOT skinnier, NOT thicker. Ignore idle pose/fists/limb angles. SMOOTH non-muscular arms. Watch LEFT if left wrist visible.',
        });
        parts.push(pngPart(request.approvedMaster));
        parts.push({
          text: 'BODY+CLOTHES LOCK AGAIN (idle_01): Confirm SAME artist, SAME polo+pants silhouette, SAME pant-leg thickness as idle_01. FORBIDDEN: different-artist restyle, skinny/thick legs, missing glasses, missing earbuds.',
        });
        parts.push(pngPart(request.approvedMaster));
      } else {
        parts.push({
          text: 'CLOTHES COLOR CHIP ONLY (ignore pose/arms/legs — dress/shoe/glove colors only):',
        });
        parts.push(pngPart(request.approvedMaster));
      }
    }

    // Neto / Leandro / Ricardo / Tiago walk_02: idle_01 as SCALE ONLY (pose stays Dinarte walk).
    if (
      (request.participantId === 'neto' ||
        request.participantId === 'leandro' ||
        request.participantId === 'ricardo' ||
        request.participantId === 'tiago' ||
        request.participantId === 'ryan' ||
        request.participantId === 'ana' ||
        request.participantId === 'alexandre' ||
        request.participantId === 'caio' ||
        request.participantId === 'evellyn' ||
        request.participantId === 'fabio' ||
        request.participantId === 'hiago' ||
        request.participantId === 'kelvin') &&
      request.scaleReferenceImage &&
      fs.existsSync(request.scaleReferenceImage)
    ) {
      parts.push({
        text: 'SCALE ONLY (idle_01 — HEIGHT/FOOTPRINT): Match this EXACT character head-to-toe height and canvas margins in 576x576. SAME size as idle_01 — NOT smaller, NOT lower in frame. Do NOT copy idle pose or idle limb angles.',
      });
      parts.push(pngPart(request.scaleReferenceImage));
      parts.push({
        text: 'SCALE CONFIRM: Head near same vertical position as idle_01. Feet on similar baseline. KEEP IMAGE 1 Dinarte WALKING stride.',
      });
      parts.push(pngPart(request.scaleReferenceImage));
      if (poseRefB64) {
        parts.push({
          text: 'POSE OVERRIDE (Dinarte walk_02 AGAIN — AFTER scale): Legs MUST be mid-stride walking opposite of walk_01. Copy THIS walk skeleton. FORBIDDEN idle fists-at-chest.',
        });
        parts.push({ inlineData: { data: poseRefB64, mimeType: 'image/png' } });
      }
    }

    // Identity comes from approved master / source — never hardcode another fighter's outfit.
    let baseRule = `CRITICAL: Output ONE full-body fighter sprite on solid magenta (#FF00FF) ONLY.
FORBIDDEN: character-select UI, vs portrait panels, stat bars, text labels, dual panels, green cosmic backgrounds, source-card layouts.
Match IMAGE 1 pose exactly (walk_02 walking stride — opposite step from walk_01). DO NOT copy idle pose.
Keep the EXACT clothes, shoes, gloves/accessories, hair, and face from the clothes chip / source identity.
FORBIDDEN: inventing a different outfit color (no forced red dress, no yellow jacket, no silver clutch unless the master has it).
Solid magenta background (#FF00FF).`;
    if (request.participantId === 'joao') {
      baseRule = `CRITICAL: Output ONE full-body fighter sprite on solid magenta (#FF00FF) ONLY.
Match IMAGE 1 pose exactly (walk_02 walking stride — opposite step from walk_01). DO NOT copy idle pose.
IDENTITY LOCK (João — FORMAL SUIT / TERNO from idle_01): charcoal/black suit jacket with lapels, matching suit trousers, dark dress shirt, bright MAGENTA necktie, thin black belt with silver buckle, polished dress shoes, short dark fade hair, full dark beard, BARE HANDS.
FORBIDDEN: polo, sleeveless, default fighter clothes, jeans, sneakers, gloves, missing jacket, missing necktie, collage/UI.
SCALE: SAME head-to-toe height/margins as idle_01 clothes chip. Solid magenta (#FF00FF).`;
    } else if (request.participantId === 'neto') {
      baseRule = `CRITICAL: Output ONE full-body fighter sprite on solid magenta (#FF00FF) ONLY.
Match IMAGE 1 pose exactly (walk_02 walking stride — opposite step from walk_01). DO NOT copy idle pose.
IDENTITY LOCK (Neto — from idle_01): plain tight black short-sleeve tee, medium-blue denim jeans, black sneakers, fade hair, full beard, BARE HANDS.
FORBIDDEN: gloves, cargo pants, charcoal pants, gold necklace, tiny undersized character, collage/UI.
SCALE HARD LOCK: SAME head-to-toe height/margins as idle_01 (~70-80% canvas) — NOT small, NOT disproportionate. Solid magenta (#FF00FF).`;
    } else if (request.participantId === 'leandro') {
      baseRule = `CRITICAL walk_02 HARD FAIL RULES:
OUTPUT: EXACTLY ONE full-body Leandro sprite filling ~70-80% of a single 576x576 canvas — SAME scale as idle_01 clothes chip.
FORBIDDEN HARD FAIL: contact sheet, collage, sprite sheet, grid, 2+ miniaturized copies side-by-side, three tiny walkers, multi-panel.
Match IMAGE 1 pose exactly (walk_02 walking stride — opposite step from walk_01). DO NOT copy idle pose.
IDENTITY LOCK (Leandro from idle_01): plain black crew-neck short-sleeve t-shirt, dark charcoal/black cargo pants, black sneakers with white soles, short dark fade hair.
HANDS/WRISTS: BARE SKIN — NO gloves, NO watches, NO wristbands.
BODY: NORMAL average build — NOT skinny, NOT muscular/buff/ripped.
Solid magenta background (#FF00FF) ONLY.`;
    } else if (request.participantId === 'ricardo') {
      baseRule = `CRITICAL walk_02 HARD FAIL RULES:
OUTPUT: EXACTLY ONE full-body Ricardo sprite filling ~70-80% of a single 576x576 canvas — SAME scale as idle_01 clothes chip.
FORBIDDEN HARD FAIL: contact sheet, collage, sprite sheet, grid, 2+ miniaturized copies side-by-side, multi-panel.
Match IMAGE 1 pose exactly (walk_02 walking stride — opposite step from walk_01). DO NOT copy idle pose.
IDENTITY LOCK (Ricardo from idle_01): royal-blue crew-neck tee with light-blue Under Armour logo, dark athletic pants, dark sneakers, short dark buzz cut.
HANDS/WRISTS: BARE SKIN — NO gloves, NO watches.
BODY: NORMAL average build — SMOOTH arms, NOT muscular/buff/ripped.
Solid magenta background (#FF00FF) ONLY.`;
    } else if (request.participantId === 'tiago') {
      baseRule = `CRITICAL walk_02 HARD FAIL RULES (TIAGO):
OUTPUT: EXACTLY ONE full-body Tiago sprite filling ~70-80% of a single 576x576 canvas — SAME scale as idle_01.
Match IMAGE 1 (Dinarte walk_02) pose EXACTLY — opposite walking stride from walk_01. Arms COUNTER-SWING with stride. FORBIDDEN: idle fists raised at chest, same legs as walk_01.
IDENTITY LOCK: charcoal DIESEL allover tee, dark pants, white sneakers, black rectangular glasses, spiky dark hair, black sports watch on LEFT wrist, SMOOTH non-muscular arms.
Solid magenta background (#FF00FF) ONLY.`;
    } else if (request.participantId === 'ryan') {
      baseRule = `CRITICAL walk_02 HARD FAIL RULES (RYAN):
OUTPUT: EXACTLY ONE full-body Ryan sprite filling ~70-80% of a single 576x576 canvas — SAME scale as idle_01.
Match IMAGE 1 (Dinarte walk_02) pose EXACTLY — opposite walking stride from walk_01. Arms COUNTER-SWING with stride. FORBIDDEN: idle fists raised at chest, same legs as walk_01.
IDENTITY LOCK: black polo with BRIGHT LIME GREEN collar AND lime-green sleeve bands, ESPERANÇA DISTRIBUIDORA DE FRIOS left-chest logo, black backpack straps, black pants, black sneakers white soles, short dark hair, dark stubble, NO watch, SMOOTH arms.
Solid magenta background (#FF00FF) ONLY.`;
    } else if (request.participantId === 'ana') {
      baseRule = `CRITICAL walk_02 HARD FAIL RULES (ANA — FEMALE):
OUTPUT: EXACTLY ONE full-body FEMALE Ana sprite filling ~70-80% of a single 576x576 canvas — SAME scale as idle_01.
Match IMAGE 1 (Dinarte walk_02) pose EXACTLY — opposite walking stride from walk_01. Arms COUNTER-SWING with stride. FORBIDDEN: idle fists raised at chest, same legs as walk_01.
IDENTITY LOCK: emerald green one-shoulder gown (LEFT strap, RIGHT shoulder bare), emerald sash, dark/emerald heels, high bun + face-framing strands, rose-pink glasses ALWAYS, gold hoops, BARE HANDS, NO WATCH, SMOOTH female arms.
FORBIDDEN: male body, Dinarte muscles, missing glasses, collage, sneakers.
Solid magenta background (#FF00FF) ONLY.`;
    } else if (request.participantId === 'alexandre') {
      baseRule = `CRITICAL walk_02 HARD FAIL RULES (ALEXANDRE):
OUTPUT: EXACTLY ONE full-body Alexandre sprite filling ~70-80% of a single 576x576 canvas — SAME scale as idle_01.
Match IMAGE 1 (Dinarte walk_02) pose EXACTLY — opposite walking stride from walk_01. One leg forward, one back, rear heel lifted, arms COUNTER-SWING. FORBIDDEN: idle fists raised at chest, both feet planted, same pose as idle_01/idle_02.
GAZE HARD LOCK: Head 3/4 RIGHT toward opponent. FORBIDDEN camera stare.
IDENTITY LOCK: black cap, WHITE sunglasses, salt-and-pepper beard, silver chain, black patterned tee, black athletic shorts, black sneakers, RIGHT forearm tattoo, NO watch, SMOOTH arms.
Solid magenta background (#FF00FF) ONLY.`;
    } else if (request.participantId === 'caio') {
      baseRule = `CRITICAL walk_02 HARD FAIL RULES (CAIO):
OUTPUT: EXACTLY ONE full-body Caio sprite filling ~70-80% of a single 576x576 canvas — SAME scale as idle_01.
Match IMAGE 1 (Dinarte walk_02) pose EXACTLY — opposite walking stride from walk_01. One leg forward, one back, rear heel lifted, arms COUNTER-SWING. FORBIDDEN: idle fists raised at chest, both feet planted, same pose as idle_01/idle_02.
GAZE HARD LOCK: Head 3/4 RIGHT toward opponent. FORBIDDEN camera stare.
IDENTITY LOCK: PLAIN black crew-neck tee, thin silver chain, RIGHT-ear silver stud, dark charcoal jeans, black sneakers white soles, fade hair, short dark beard, NO watch, SMOOTH arms.
WATCH: if visible, LEFT wrist only. FORBIDDEN watch on right wrist.
Solid magenta background (#FF00FF) ONLY.`;
    } else if (request.participantId === 'evellyn') {
      baseRule = `CRITICAL walk_02 HARD FAIL RULES (EVELLYN — FEMALE):
OUTPUT: EXACTLY ONE full-body FEMALE Evellyn sprite filling ~70-80% of a single 576x576 canvas — SAME scale as idle_01.
Match IMAGE 1 (Dinarte walk_02) pose EXACTLY — opposite walking stride from walk_01. Arms COUNTER-SWING with stride. FORBIDDEN: idle fists raised at chest, same legs as walk_01.
IDENTITY LOCK: long straight jet-black hair over both shoulders, dark navy/charcoal crew-neck tee, dark charcoal pants, dark sneakers, BARE HANDS, NO WATCH, NO glasses, SMOOTH female arms.
FORBIDDEN: male body, Dinarte muscles, bun, short hair, collage, adding a watch.
Solid magenta background (#FF00FF) ONLY.`;
    } else if (request.participantId === 'daniel') {
      baseRule = `CRITICAL walk_02 HARD FAIL RULES (DANIEL):
OUTPUT: EXACTLY ONE full-body Daniel sprite filling ~70-80% of a single 576x576 canvas — SAME scale as idle_01.
Match IMAGE 1 (Dinarte walk_02) pose EXACTLY — opposite walking stride from walk_01. One leg forward, one back, rear heel lifted, arms COUNTER-SWING. FORBIDDEN: idle fists raised at chest, both feet planted, same pose as idle_01/idle_02.
GAZE HARD LOCK: Head 3/4 RIGHT toward opponent. FORBIDDEN camera stare.
IDENTITY LOCK: WHITE polo, dark blue slim jeans, white slip-on sneakers, fade hair, mustache+goatee, RIGHT-arm sleeve tattoo, GOLD watch LEFT wrist, keys on right hip, SMOOTH arms. THIS IS DANIEL, NOT DAVID.
WATCH: LEFT wrist only. FORBIDDEN watch on right wrist.
Solid magenta background (#FF00FF) ONLY.`;
    } else if (request.participantId === 'fabio') {
      baseRule = `CRITICAL walk_02 HARD FAIL RULES (FABIO):
OUTPUT: EXACTLY ONE full-body Fabio sprite filling ~70-80% of a single 576x576 canvas — SAME scale as idle_01.
Match IMAGE 1 (Dinarte walk_02) pose EXACTLY — opposite walking stride from walk_01. One leg forward, one back, rear heel lifted, arms COUNTER-SWING. FORBIDDEN: idle fists raised at chest, both feet planted, same pose as idle_01/idle_02, same legs as walk_01.
GAZE HARD LOCK: Head 3/4 RIGHT toward opponent. FORBIDDEN camera stare.
STYLE+IDENTITY LOCK (idle_01): SAME character AND artist as idle_01 — same face/hair pixels, same line weight, same shading.
OUTFIT LOCK: navy blue tailored blazer with lapels (SAME cut/length as idle_01), WHITE open-collar dress shirt NO necktie, keep idle_01 chest tattoo, matching navy dress pants (SAME fabric/color/width as idle_01), bright WHITE sneakers.
BODY MASS HARD LOCK: SAME leg thickness (thigh/calf) and torso silhouette as idle_01. FORBIDDEN: skinnier legs, thicker legs, different jacket cut, jeans, joggers, dress shoes, magenta tie, Joao look.
WATCH: silver watch on LEFT wrist if the left wrist is visible. FORBIDDEN watch on right wrist.
Solid magenta background (#FF00FF) ONLY.`;
    } else if (request.participantId === 'hiago') {
      baseRule = `CRITICAL walk_02 HARD FAIL RULES (HIAGO):
OUTPUT: EXACTLY ONE full-body Hiago sprite filling ~70-80% of a single 576x576 canvas — SAME scale as idle_01.
Match IMAGE 1 (Dinarte walk_02) pose EXACTLY — opposite walking stride from walk_01. One leg forward, one back, rear heel lifted, arms COUNTER-SWING. FORBIDDEN: idle fists raised at chest, both feet planted, same pose as idle_01/idle_02, same legs as walk_01.
GAZE HARD LOCK: Head 3/4 RIGHT toward opponent. FORBIDDEN camera stare.
STYLE+IDENTITY LOCK (idle_01): SAME character AND artist as idle_01 — same face/glasses/hair pixels, same line weight, same shading.
OUTFIT LOCK: oversized black tee with white "TOP", olive-green cargo joggers (SAME fabric/color/width as idle_01), black-and-white sneakers, round BLACK glasses ALWAYS, chain with pendant.
BODY MASS HARD LOCK: SAME leg thickness (thigh/calf) and torso silhouette as idle_01. FORBIDDEN: skinnier legs, thicker legs, jeans, missing glasses.
WATCH: dark watch on LEFT wrist if the left wrist is visible. FORBIDDEN watch on right wrist.
Solid magenta background (#FF00FF) ONLY.`;
    } else if (request.participantId === 'kelvin') {
      baseRule = `CRITICAL walk_02 HARD FAIL RULES (KELVIN):
OUTPUT: EXACTLY ONE full-body Kelvin sprite filling ~70-80% of a single 576x576 canvas — SAME scale as idle_01.
Match IMAGE 1 (Dinarte walk_02) pose EXACTLY — opposite walking stride from walk_01. One leg forward, one back, rear heel lifted, arms COUNTER-SWING. FORBIDDEN: idle fists raised at chest, both feet planted, same pose as idle_01/idle_02, same legs as walk_01.
GAZE HARD LOCK: Head 3/4 RIGHT toward opponent. FORBIDDEN camera stare.
STYLE+IDENTITY LOCK (idle_01): SAME character AND artist as idle_01 — same face/glasses/hair pixels, same line weight, same shading.
OUTFIT LOCK: WHITE polo with red AND navy striped collar+cuffs, dark navy trousers (SAME fabric/color/width as idle_01), white sneakers with red accents, round BLACK glasses ALWAYS, white earbuds in BOTH ears.
BODY MASS HARD LOCK: SAME leg thickness (thigh/calf) and torso silhouette as idle_01. FORBIDDEN: skinnier legs, thicker legs, missing glasses, missing earbuds.
WATCH: silver/dark watch on LEFT wrist if the left wrist is visible. FORBIDDEN watch on right wrist.
Solid magenta background (#FF00FF) ONLY.`;
    }

    return { parts, baseRule };
  }

  /**
   * Lívia walk_02: Dinarte for leg stride; walk_01 for arm swing + clutch;
   * idle_01 for identity/shoes. Arms DOWN (not idle guard).
   */
  private buildLiviaWalk02Parts(
    request: GenerationRequest,
    sourceB64: string,
    faceB64: string,
    templateB64: string
  ): { parts: any[]; baseRule: string } {
    const parts: any[] = [];
    const poseRefB64 = request.poseReferenceImage && fs.existsSync(request.poseReferenceImage)
      ? fileToBase64(request.poseReferenceImage)
      : null;

    parts.push({
      text: 'CRITICAL: walk_02 is the OPPOSITE walking stride from walk_01. Legs mid-stride (one forward, one back). Arms DOWN and swinging — NOT idle fist-guard.',
    });

    if (poseRefB64) {
      parts.push({
        text: 'IMAGE 1 (LEG STRIDE ONLY — Dinarte walk_02): Copy ONLY leg positions / opposite step. Ignore Dinarte clothes, face, gender.',
      });
      parts.push({ inlineData: { data: poseRefB64, mimeType: 'image/png' } });
      parts.push({ text: 'IMAGE 1 AGAIN (confirm opposite leg stride from walk_01):' });
      parts.push({ inlineData: { data: poseRefB64, mimeType: 'image/png' } });
    } else {
      parts.push({ text: 'POSE TEMPLATE (leg stride):' });
      parts.push({ inlineData: { data: templateB64, mimeType: 'image/png' } });
    }

    if (request.armReferenceImage && fs.existsSync(request.armReferenceImage)) {
      parts.push({
        text: 'IMAGE ARMS/CLUTCH (Lívia walk_01): Arms DOWN swinging like this walk. Hold the SAME silver rectangular clutch the same way (normal hand size, NOT floating, NOT oversized). Slight OPPOSITE arm swing vs walk_01 for alternating stride. Do NOT copy walk_01 leg positions.',
      });
      parts.push(pngPart(request.armReferenceImage));
    }

    if (request.approvedMaster && fs.existsSync(request.approvedMaster)) {
      parts.push({
        text: 'IMAGE IDENTITY (idle_01): EXACT red one-shoulder dress, EXACT simple RED strappy sandals (toe + ankle strap — NOT gladiator multi-strap), silver clutch style, hair, face, proportions. Do NOT copy idle pose or raised-guard arms.',
      });
      parts.push(pngPart(request.approvedMaster));
    }

    parts.push({ text: 'Face reference:' });
    parts.push({ inlineData: { data: faceB64, mimeType: 'image/png' } });
    parts.push({ text: 'Source card (colors only — ignore card pose):' });
    parts.push({ inlineData: { data: sourceB64, mimeType: 'image/jpeg' } });

    const baseRule = `LÍVIA walk_02:
1) LEGS: Match IMAGE 1 Dinarte walk_02 stride EXACTLY — this MUST be the OPPOSITE step from walk_01. If walk_01 has near-leg forward, walk_02 has far-leg forward (or vice versa). FORBIDDEN: duplicating walk_01 leg positions.
2) ARMS: DOWN and swinging like walk_01 — slight opposite swing. FORBIDDEN: idle raised fists / high guard.
3) CLUTCH: MUST hold silver rectangular clutch like idle_01/walk_01 — normal size, in hand, NOT floating, NOT gigantic.
4) SHOES: EXACT same simple RED strappy high-heeled sandals as idle_01.
5) IDENTITY: Same face, hair, red dress, scale. Gaze RIGHT toward opponent (NOT camera).
Solid magenta (#FF00FF). Keep Lívia identity (lesson from Samara/Fatinha: never lose identity to pose ref).`;

    return { parts, baseRule };
  }

  private buildIdle02Parts(request: GenerationRequest, sourceB64: string, faceB64: string, templateB64: string): { parts: any[]; baseRule: string } {
    if (request.participantId === 'livia') {
      return this.buildLiviaIdle02Parts(request, sourceB64, faceB64, templateB64);
    }

    const parts: any[] = [];

    if (request.secondaryTemplateImage && fs.existsSync(request.secondaryTemplateImage)) {
      parts.push({ text: 'IMAGE A (idle_01 pose - DO NOT COPY): This shows idle_01. You must NOT duplicate this pose.' });
      parts.push(pngPart(request.secondaryTemplateImage));
    }

    const poseRefB64 = request.poseReferenceImage && fs.existsSync(request.poseReferenceImage)
      ? fileToBase64(request.poseReferenceImage)
      : null;

    parts.push({ text: 'IMAGE B (idle_02 pose - COPY THIS): You MUST match Image B pose, NOT Image A.' });
    if (poseRefB64) {
      parts.push({ inlineData: { data: poseRefB64, mimeType: 'image/png' } });
    } else {
      parts.push({ inlineData: { data: templateB64, mimeType: 'image/png' } });
    }

    if (request.approvedMaster && fs.existsSync(request.approvedMaster)) {
      parts.push({ text: 'Character appearance reference (clothes/colors/shoes ONLY, NOT pose):' });
      parts.push(pngPart(request.approvedMaster));
    }

    if (
      (request.participantId === 'fernando' ||
        request.participantId === 'caio' ||
        request.participantId === 'fabio' ||
        request.participantId === 'hiago' ||
        request.participantId === 'kelvin') &&
      request.scaleReferenceImage &&
      fs.existsSync(request.scaleReferenceImage)
    ) {
      parts.push({
        text: 'SCALE ONLY (idle_01 — HEIGHT/FOOTPRINT): Match this EXACT character head-to-toe height and canvas margins. SAME size as idle_01 — NOT smaller, NOT larger, NOT lower in frame. Do NOT copy idle_01 fist height (idle_02 must micro-shift the guard).',
      });
      parts.push(pngPart(request.scaleReferenceImage));
    }

    // Arm reference is Fatinha-era optional; skip when it would contaminate identity (non-fatinha).
    if (
      request.participantId === 'fatinha' &&
      request.armReferenceImage &&
      fs.existsSync(request.armReferenceImage)
    ) {
      parts.push({ text: 'IMAGE C (ARM REFERENCE ONLY): Copy ONLY the arm position from this image. Do NOT copy leg pose, body stance, or stride.' });
      parts.push(pngPart(request.armReferenceImage));
    }

    parts.push({ text: 'Face reference:' });
    parts.push({ inlineData: { data: faceB64, mimeType: 'image/png' } });
    parts.push({ inlineData: { data: sourceB64, mimeType: 'image/jpeg' } });

    const armRule =
      request.participantId === 'fatinha' &&
      request.armReferenceImage &&
      fs.existsSync(request.armReferenceImage)
        ? ' Match idle_02 pose. BUT copy the ARM POSITION from the ARM REFERENCE image (arms only).'
        : ' Match IMAGE B idle_02 pose: micro-variation with a slightly more RESTING hand/arm position (not identical clenched guard to idle_01).';
    let baseRule = `idle_02 must be VISIBLY DIFFERENT from idle_01.${armRule} Do NOT duplicate idle_01. Keep EXACT clothes, face, hair, and shoes from the appearance reference. Use a solid #FF00FF background.`;
    if (request.participantId === 'samara') {
      baseRule +=
        ' Samara: black hoodie, black pants, gold necklace, WHITE sneakers (tênis branco). NO blue sneakers. Only a light hand/arm rest shift vs idle_01.';
    }
    if (request.participantId === 'rhussiana') {
      baseRule +=
        ' Rhussiana: black strapless dress WITH babado ending one finger above the knee, GOLD heeled sandals, gold hair clip, BARE HANDS (NO gloves). NORMAL slim average body matching idle_01 — NOT plump/gordinha, NOT muscular. NO mini mid-thigh dress. NO red dress. NO silver clutch.';
    }
    if (request.participantId === 'ana') {
      baseRule +=
        ' Ana HARD LOCK (FEMALE): SAME emerald green one-shoulder gown (LEFT strap, RIGHT shoulder bare) + emerald sash + dark/emerald heels + high bun + face-framing strands + rose-pink glasses + gold hoops as idle_01. BARE HANDS, NO WATCH. LOW GUARD: BOTH fists at WAIST/HIP (guarda baixa) — idle_01 keeps high chest/chin guard. HARD FAIL if fists stay near chest/chin like idle_01. FEMALE body SMOOTH arms. Gaze RIGHT toward opponent.';
    }
    if (request.participantId === 'radja') {
      baseRule +=
        ' Radja: DEEP BLACK curly hair, purple jacket FALLING OFF / DRAPED on shoulders exactly like idle_01 (casaco caindo nos ombros — NOT pulled up), navy crop, black pants, black sneakers, white hand wraps on BOTH hands.';
    }
    if (request.participantId === 'joao') {
      baseRule +=
        ' João HARD LOCK: FULL formal charcoal/black SUIT jacket with lapels + matching suit trousers + dark dress shirt + bright MAGENTA necktie + silver belt buckle + polished dress shoes (EXACT idle_01). BARE HANDS. FORBIDDEN: polo, sleeveless, default fighter clothes, gloves, missing jacket, missing necktie.';
    }
    if (request.participantId === 'leandro') {
      baseRule +=
        ' Leandro HARD LOCK: plain black crew-neck tee + dark cargo pants + black sneakers with white soles (EXACT idle_01). NORMAL average body (NOT muscular). BARE HANDS + BARE WRISTS. FORBIDDEN: gloves, watches, wristbands, multi-sprite collage.';
    }
    if (request.participantId === 'ricardo') {
      baseRule +=
        ' Ricardo HARD LOCK: royal-blue crew-neck tee with light-blue Under Armour logo + dark athletic pants + dark sneakers (EXACT idle_01). NORMAL average body with SMOOTH arms (NOT muscular). BARE HANDS. Short dark buzz cut. FORBIDDEN: gloves, Dinarte tank, multi-sprite collage.';
    }
    if (request.participantId === 'erikson') {
      baseRule +=
        ' Erikson HARD LOCK: SAME Classic Cars navy tee + jeans + white sneakers + gold chain + studs + black watch LEFT as idle_01. VISIBLE microvariation vs idle_01: raise OR lower the guard fists slightly (1–2cm) — NOT a pixel-clone. GAZE RIGHT toward opponent (3/4) — FORBIDDEN camera stare. SAME art style + scale as idle_01.';
    }
    if (request.participantId === 'fernando') {
      baseRule +=
        ' Fernando HARD LOCK: SAME SCALE as idle_01 (same height/footprint — NOT tiny, NOT oversized). SAME black polo + BRIGHT GREEN collar + green sleeve cuffs + black joggers + black sneakers white soles. NO WATCH. SAME idle/guard FAMILY: EXACTLY TWO ARMS, both fists in fighting guard. Microvariation: slightly LOWER or HIGHER fists vs idle_01 — NOT a broken pose, NOT extra limbs. GAZE RIGHT. SAME curly hair + mustache/goatee + stud earrings. SMOOTH arms.';
    }
    if (request.participantId === 'ryan') {
      baseRule +=
        ' Ryan HARD LOCK: SAME black polo with BRIGHT LIME GREEN collar AND lime-green sleeve bands + ESPERANÇA DISTRIBUIDORA DE FRIOS left-chest logo + black backpack straps + black pants + black sneakers white soles as idle_01. NO watch. VISIBLE microvariation vs idle_01: raise OR lower the guard fists (1–2cm) — NOT a pixel-clone. SAME short dark hair + dark stubble (NOT curly, NOT Fernando). SMOOTH arms.';
    }
    if (request.participantId === 'alexandre') {
      baseRule +=
        ' Alexandre HARD LOCK: SAME black cap + WHITE sunglasses + salt-and-pepper beard + silver chain + black patterned tee + black shorts + black sneakers + RIGHT forearm tattoo as idle_01. NO watch. LOW GUARD: BOTH fists at WAIST/HIP (clearly LOWER than idle_01 chest guard) — NOT a pixel-clone. GAZE 3/4 RIGHT toward opponent. SAME SMOOTH arms.';
    }
    if (request.participantId === 'caio') {
      baseRule +=
        ' Caio HARD LOCK: SAME PLAIN black crew-neck tee + thin silver chain + RIGHT-ear silver stud + dark charcoal jeans + black sneakers white soles + fade hair + short dark beard as idle_01. NO watch. LOW GUARD: BOTH fists at WAIST/HIP (guarda baixa, clearly LOWER than idle_01 chest guard) — NOT a pixel-clone. SAME idle stance / legs / 3/4 RIGHT gaze. SAME SMOOTH arms.';
    }
    if (request.participantId === 'evellyn') {
      baseRule +=
        ' Evellyn HARD LOCK (FEMALE): SAME long straight jet-black hair over both shoulders + PLAIN dark navy/charcoal crew-neck tee + dark charcoal pants + dark sneakers as idle_01. BARE HANDS, NO WATCH, NO glasses. LOW GUARD: BOTH fists at WAIST/HIP (guarda baixa) — idle_01 keeps high chest/chin guard. HARD FAIL if fists stay near chest/chin like idle_01. FEMALE body SMOOTH arms. Gaze RIGHT toward opponent.';
    }
    if (request.participantId === 'daniel') {
      baseRule +=
        ' Daniel HARD LOCK: SAME WHITE polo + dark blue slim jeans + white slip-on sneakers + fade hair + mustache/goatee + RIGHT-arm sleeve tattoo + GOLD watch LEFT wrist + keys on right hip as idle_01. THIS IS DANIEL, NOT DAVID. LOW GUARD: BOTH fists at WAIST/HIP (guarda baixa, clearly LOWER than idle_01 chest guard) — NOT a pixel-clone. SAME idle stance / legs / 3/4 RIGHT gaze. SAME SMOOTH arms.';
    }
    if (request.participantId === 'fabio') {
      baseRule +=
        ' Fabio HARD LOCK: SAME navy blue blazer + WHITE open-collar dress shirt (NO necktie) + chest tattoo in the open V + navy dress pants + bright WHITE sneakers + fade hair + mustache/goatee as idle_01. Silver watch LEFT wrist if visible. LOW GUARD: BOTH fists at WAIST/HIP (guarda baixa, clearly LOWER than idle_01 chest guard) — NOT a pixel-clone. SAME idle stance / legs / 3/4 RIGHT gaze. SAME SMOOTH arms. NOT Joao (no magenta tie, no dress shoes).';
    }
    if (request.participantId === 'hiago') {
      baseRule +=
        ' Hiago HARD LOCK: SAME oversized black tee with white "TOP" + olive-green cargo joggers + black-and-white sneakers + round BLACK glasses + chain with pendant + voluminous wavy-curly quiff as idle_01. NO beard. Dark watch LEFT wrist if visible. LOW GUARD: BOTH fists at WAIST/HIP (guarda baixa, clearly LOWER than idle_01 chest guard) — NOT a pixel-clone. SAME idle stance / legs / 3/4 RIGHT gaze. SAME SMOOTH arms. THIS IS HIAGO, NOT IZAIAS.';
    }
    if (request.participantId === 'kelvin') {
      baseRule +=
        ' Kelvin HARD LOCK: SAME WHITE polo with red AND navy striped collar+cuffs + dark navy trousers + white sneakers with red accents + round BLACK glasses + white earbuds both ears + curly taper-fade as idle_01. NO beard. Watch LEFT wrist if visible. LOW GUARD: BOTH fists at WAIST/HIP (guarda baixa, clearly LOWER than idle_01 chest guard) — NOT a pixel-clone. SAME idle stance / legs / 3/4 RIGHT gaze. SAME SMOOTH arms. THIS IS KELVIN, NOT DANIEL.';
    }
    return { parts, baseRule };
  }

  /**
   * Lívia idle_02: nearly a copy of idle_01 — only a tiny hand micro-variation.
   * Dinarte idle_02 is a HINT for that hand shift only (not a full pose takeover).
   */
  private buildLiviaIdle02Parts(
    request: GenerationRequest,
    sourceB64: string,
    faceB64: string,
    templateB64: string
  ): { parts: any[]; baseRule: string } {
    const parts: any[] = [];

    if (!request.approvedMaster || !fs.existsSync(request.approvedMaster)) {
      throw new Error('Lívia idle_02 requires approvedMaster (idle_01) as primary identity+pose base.');
    }

    parts.push({
      text: 'IMAGE 1 (PRIMARY — idle_01): This is the CANONICAL sprite. idle_02 must be practically a COPY of this image: SAME face, hair, red dress, body scale, stance, RED sandals, and silver clutch held the SAME way (normal hand size at hip/side — NOT floating, NOT oversized). ONLY allowed difference: a VERY SLIGHT hand-position micro-variation for idle animation feel.',
    });
    parts.push(pngPart(request.approvedMaster));
    parts.push({ text: 'IMAGE 1 AGAIN (confirm identity + clutch size/position + shoes lock):' });
    parts.push(pngPart(request.approvedMaster));

    const poseRefB64 = request.poseReferenceImage && fs.existsSync(request.poseReferenceImage)
      ? fileToBase64(request.poseReferenceImage)
      : null;
    if (poseRefB64) {
      parts.push({
        text: 'IMAGE 2 (HINT ONLY — Dinarte idle_02): Use ONLY for a tiny hand/wrist micro-shift vs IMAGE 1. Do NOT copy Dinarte clothes, face, stance width, or make the clutch float/gigantic. Prefer IMAGE 1 over IMAGE 2 for everything except that tiny hand nudge.',
      });
      parts.push({ inlineData: { data: poseRefB64, mimeType: 'image/png' } });
    } else {
      parts.push({ text: 'POSE HINT TEMPLATE (tiny hand shift only — ignore silhouette clothes):' });
      parts.push({ inlineData: { data: templateB64, mimeType: 'image/png' } });
    }

    parts.push({ text: 'Face reference (same person):' });
    parts.push({ inlineData: { data: faceB64, mimeType: 'image/png' } });
    parts.push({ text: 'Source card (colors only — ignore card pose):' });
    parts.push({ inlineData: { data: sourceB64, mimeType: 'image/jpeg' } });

    const baseRule = `LÍVIA idle_02 HARD RULES:
1) Practically a COPY of IMAGE 1 (idle_01). Face/clothes/scale/stance identical.
2) ONLY change: slight hand-position micro-variation (barely visible idle motion).
3) CLUTCH: SAME size and hold logic as idle_01 — held normally in hand/at hip. FORBIDDEN: floating clutch, gigantic clutch, clutch detached from hand.
4) SHOES: EXACT same simple RED strappy high-heeled sandals as idle_01 (toe + ankle strap). FORBIDDEN: silver sandals, gladiator multi-strap.
5) GAZE: look RIGHT toward opponent — NOT at camera.
Solid magenta (#FF00FF).`;

    return { parts, baseRule };
  }

  private buildHurtParts(request: GenerationRequest, sourceB64: string, faceB64: string, templateB64: string): { parts: any[]; baseRule: string } {
    const parts: any[] = [];

    if (request.poseReferenceImage && fs.existsSync(request.poseReferenceImage)) {
      parts.push({ text: 'IMAGE 1 (Dinarte hurt pose reference): Copy this upright recoil pose.' });
      parts.push(pngPart(request.poseReferenceImage));
    }

    parts.push({ text: 'IMAGE 2 (Hurt template pose - COPY THIS): Upright stagger/recoil. Character faces RIGHT.' });
    parts.push({ inlineData: { data: templateB64, mimeType: 'image/png' } });

    if (request.approvedMaster && fs.existsSync(request.approvedMaster)) {
      parts.push({ text: 'IDENTITY REFERENCE (clothes, shoes, hair — NOT pose):' });
      parts.push(pngPart(request.approvedMaster));
    }

    parts.push({ text: 'Character face (appearance only):' });
    parts.push({ inlineData: { data: faceB64, mimeType: 'image/png' } });
    parts.push({ text: 'Character source card (appearance only):' });
    parts.push({ inlineData: { data: sourceB64, mimeType: 'image/jpeg' } });

    const baseRule =
      request.participantId === 'neto'
        ? "Character MUST face RIGHT (same direction as idle_01 - character's right shoulder toward viewer). Upright stagger/recoil hurt pose. NOT lying down. NOT facing left. NO blood. Do NOT mirror or flip the character horizontally. OUTFIT LOCK: plain tight black short-sleeve tee + medium-blue denim jeans EXACT same blue as idle_01 (NOT light wash, NOT gray) + black sneakers. HANDS: BARE SKIN — NO gloves. Keep face/hair from identity. Solid #FF00FF background."
        : request.participantId === 'leandro'
          ? "Character MUST face RIGHT (same direction as idle_01 - character's right shoulder toward viewer). Upright stagger/recoil hurt pose. NOT lying down. NOT facing left. NO blood. Do NOT mirror or flip the character horizontally. OUTFIT LOCK: plain black crew-neck tee + dark cargo pants + black sneakers with white soles (idle_01). HANDS/WRISTS: BARE SKIN — NO gloves, NO watches. BODY: NORMAL average — NOT muscular. Keep face/hair from identity. Solid #FF00FF background."
          : request.participantId === 'ricardo'
            ? "Character MUST face RIGHT (same direction as idle_01 - character's right shoulder toward viewer). Upright stagger/recoil hurt pose. NOT lying down. NOT facing left. NO blood. Do NOT mirror or flip the character horizontally. OUTFIT LOCK: royal-blue crew-neck tee with light-blue Under Armour logo + dark athletic pants + dark sneakers (idle_01). HANDS: BARE SKIN — NO gloves. BODY: NORMAL average with SMOOTH arms — NOT muscular. Keep face/hair from identity. Solid #FF00FF background."
            : request.participantId === 'caio'
              ? "Character MUST face RIGHT (same direction as idle_01 - character's right shoulder toward viewer). Upright stagger/recoil hurt pose. NOT lying down. NOT facing left. NO blood. Do NOT mirror or flip the character horizontally. OUTFIT LOCK: PLAIN black crew-neck tee + thin silver chain + RIGHT-ear silver stud + dark charcoal jeans + black sneakers white soles (idle_01). HANDS: BARE SKIN — NO gloves, NO watch. BODY: NORMAL average with SMOOTH arms — NOT muscular. Keep fade hair + short dark beard. Solid #FF00FF background."
            : request.participantId === 'hiago'
              ? "Character MUST face RIGHT (same direction as idle_01 - character's right shoulder toward viewer). Upright stagger/recoil hurt pose. Must LOOK HIT — grimace, recoil, NOT a neutral idle. NOT lying down. NOT facing left. NO blood. Do NOT mirror or flip the character horizontally. OUTFIT LOCK: oversized black tee with white TOP + olive-green cargo joggers + black-and-white sneakers + round BLACK glasses + chain with pendant (idle_01). Dark watch on LEFT wrist if visible — NEVER on right. BODY: NORMAL average with SMOOTH arms — NOT muscular. Keep voluminous curly quiff, NO beard. Solid #FF00FF background."
            : request.participantId === 'kelvin'
              ? "Character MUST face RIGHT (same direction as idle_01 - character's right shoulder toward viewer). Upright stagger/recoil hurt pose. Must LOOK HIT — grimace, recoil, NOT a neutral idle. NOT lying down. NOT facing left. NO blood. Do NOT mirror or flip the character horizontally. OUTFIT LOCK: WHITE polo with red AND navy striped collar+cuffs + dark navy trousers + white sneakers with red accents + round BLACK glasses + white earbuds both ears (idle_01). Watch on LEFT wrist if visible — NEVER on right. BODY: NORMAL average with SMOOTH arms — NOT muscular. Keep curly taper-fade, NO beard. Solid #FF00FF background."
          : "Character MUST face RIGHT (same direction as idle_01 - character's right shoulder toward viewer). Upright stagger/recoil hurt pose. NOT lying down. NOT facing left. NO blood. Do NOT mirror or flip the character horizontally. Keep EXACT clothes, face, hair, and shoes from the identity reference. Use a solid #FF00FF background.";
    return { parts, baseRule };
  }

  /**
   * Hair-only edit for Radja: IMAGE1 = current frame (pose locked),
   * IMAGE2 = idle_01 (deep black hair color/volume ONLY). No pose/wraps change.
   */
  private buildRadjaHairOnlyEditParts(request: GenerationRequest): { parts: any[]; baseRule: string } {
    if (!request.editBaseImage || !fs.existsSync(request.editBaseImage)) {
      throw new Error('radjaHairOnlyEdit requires editBaseImage (existing frame PNG).');
    }

    const frame = request.frameName || 'hurt';
    const parts: any[] = [];

    parts.push({
      text: 'IMAGE 1 (PRIMARY — KEEP POSE LOCKED): This is the EXACT sprite to preserve. Keep EXACT same pose, limb positions, body, purple open jacket, navy crop top, black pants, belt, black sneakers, white hand wraps, face, scale/footprint, and magenta background. Change ONLY the hair color.',
    });
    parts.push(pngPart(request.editBaseImage));

    if (request.hairReferenceImage && fs.existsSync(request.hairReferenceImage)) {
      parts.push({
        text: 'IMAGE 2 (HAIR ONLY — idle_01): Copy ONLY hair color and curl volume — DEEP BLACK / cool charcoal highlights (NOT warm brown, NOT espresso, NOT auburn). Do NOT copy idle pose, limb angles, stance, clothes, or scale from this image.',
      });
      parts.push(pngPart(request.hairReferenceImage));
    }

    const baseRule = `RADJA HAIR-ONLY EDIT (frame=${frame}):
Keep EXACT same pose, body, purple jacket, navy crop, black pants, sneakers, white hand wraps, face, and scale from IMAGE 1.
Change ONLY hair to match IMAGE 2: DEEP BLACK curly/coily hair with cool grey/charcoal highlights.
FORBIDDEN: warm brown hair, espresso hair, auburn highlights, redesigning outfit, removing hand wraps, pose change.
Solid magenta (#FF00FF).`;

    return { parts, baseRule };
  }

  /**
   * Erikson watch laterality: IMAGE1 = current frame (pose locked).
   * move_left: put black smartwatch on LEFT wrist only (match idle_02).
   * remove_right: erase watch from visible RIGHT wrist (left arm not shown).
   */
  private buildEriksonWatchLockEditParts(request: GenerationRequest): { parts: any[]; baseRule: string } {
    if (!request.editBaseImage || !fs.existsSync(request.editBaseImage)) {
      throw new Error('eriksonWatchLockEdit requires editBaseImage (existing frame PNG).');
    }

    const frame = request.frameName || 'walk_01';
    const mode = request.eriksonWatchMode || 'move_left';
    const parts: any[] = [];

    parts.push({
      text: 'IMAGE 1 (PRIMARY — KEEP POSE LOCKED 100%): This is the EXACT sprite to preserve. Keep EXACT same pose, limb angles, footprint/scale, face, hair, Classic Cars tee, jeans, white sneakers, gold chain, studs, body proportions, and solid magenta background. Change ONLY the wristwatch laterality as instructed.',
    });
    parts.push(pngPart(request.editBaseImage));

    if (mode === 'remove_right') {
      const baseRule = `ERIKSON WATCH-LOCK EDIT (frame=${frame}, mode=remove_right):
Keep EXACT same pose, clothes, face, hair, scale from IMAGE 1 — DO NOT change pose at all.
REMOVE every black wristwatch / smartwatch band from ANY visible wrist. Wrists must be BARE SKIN.
Do NOT add a watch anywhere. Do NOT invent a second arm. Do NOT move limbs.
FORBIDDEN: changing pose, changing clothes, adding watch elsewhere.
Solid magenta (#FF00FF).`;
      return { parts, baseRule };
    }

    if (request.watchReferenceImage && fs.existsSync(request.watchReferenceImage)) {
      parts.push({
        text: 'IMAGE 2 (CORRECT watch placement example): black rectangular smartwatch is on the FORWARD arm — the fist closer to the RIGHT edge of the canvas when facing right. The near arm (closer to the LEFT edge of the canvas) is BARE.',
      });
      parts.push(pngPart(request.watchReferenceImage));
    }

    const baseRule = `ERIKSON WATCH-LOCK EDIT (frame=${frame}, mode=move_left) — CANVAS RULES (ignore ambiguous left/right words):
Keep EXACT same pose, clothes, face, hair, scale from IMAGE 1 — DO NOT change pose. ONE character only.
1) DELETE the black watch from the NEAR arm (the wrist/fist closer to the LEFT edge of the canvas). That wrist = bare skin.
2) DRAW a black rectangular smartwatch on the FORWARD arm (the wrist/fist closer to the RIGHT edge of the canvas / toward the opponent). Match IMAGE 2 watch style.
HARD FAIL: watch still on the left-side-of-canvas arm; no watch on the right-side-of-canvas forward arm.
Solid magenta (#FF00FF).`;
    return { parts, baseRule };
  }

  /**
   * Wrap-lock edit for Radja: IMAGE1 = current frame (pose locked),
   * IMAGE2 = idle_01 (white hand wraps ONLY). Add wraps; keep everything else.
   */
  private buildRadjaWrapLockEditParts(request: GenerationRequest): { parts: any[]; baseRule: string } {
    if (!request.editBaseImage || !fs.existsSync(request.editBaseImage)) {
      throw new Error('radjaWrapLockEdit requires editBaseImage (existing frame PNG).');
    }

    const frame = request.frameName || 'idle_02';
    const parts: any[] = [];

    parts.push({
      text: 'IMAGE 1 (PRIMARY — KEEP POSE LOCKED): This is the EXACT sprite to preserve. Keep EXACT same pose, limb positions, body, purple open jacket, navy crop top, black pants, belt, black sneakers, deep black curly hair, face, scale/footprint, and magenta background. Change ONLY the hands/wrists accessories.',
    });
    parts.push(pngPart(request.editBaseImage));

    if (request.wrapReferenceImage && fs.existsSync(request.wrapReferenceImage)) {
      parts.push({
        text: 'IMAGE 2 (HAND WRAPS ONLY — idle_01): Copy ONLY the white hand wraps / bandagens on BOTH hands (wrists + palms to knuckle base, fingers may show). Do NOT copy idle pose, limb angles, stance, clothes, hair, or scale from this image.',
      });
      parts.push(pngPart(request.wrapReferenceImage));
    }

    const baseRule = `RADJA WRAP-LOCK EDIT (frame=${frame}):
Keep EXACT same pose, body, clothes, hair, face, and scale from IMAGE 1.
ADD white hand wraps on BOTH hands matching IMAGE 2 (idle_01 policy: ALL frames WITH wraps).
FORBIDDEN: bare wrists, bare hands without wraps, changing pose, changing hair color, redesigning outfit.
Solid magenta (#FF00FF).`;

    return { parts, baseRule };
  }

  /**
   * Jacket COLOR lock for Izaias: IMAGE1 = current frame (pose locked),
   * IMAGE2 = idle_01 (navy puffer jacket COLOR ONLY — exact match).
   */
  private buildIzaiasJacketColorLockEditParts(request: GenerationRequest): { parts: any[]; baseRule: string } {
    if (!request.editBaseImage || !fs.existsSync(request.editBaseImage)) {
      throw new Error('izaiasJacketColorLockEdit requires editBaseImage (existing frame PNG).');
    }

    const frame = request.frameName || 'walk_01';
    const parts: any[] = [];

    parts.push({
      text: 'IMAGE 1 (PRIMARY — KEEP POSE LOCKED): This is the EXACT sprite to preserve. Keep EXACT same pose, limb positions, walk stance, face, hair, white tee, charcoal jeans, EXACTLY ONE silver steel chain, BARE hands (no gloves), solid black sneakers, body proportions, scale/footprint, and magenta background. The CURRENT puffer jacket COLOR is WRONG — you MUST recolor it.',
    });
    parts.push(pngPart(request.editBaseImage));

    if (request.jacketReferenceImage && fs.existsSync(request.jacketReferenceImage)) {
      parts.push({
        text: 'IMAGE 2 (CORRECT JACKET COLOR — idle_01 — HIGHEST PRIORITY): Copy the EXACT dark charcoal-navy quilted puffer jacket palette from this image. Target look: near-black navy with subtle cool grey quilt ridges (RGB roughly dark ~28,32,37 — NOT bright blue, NOT sky blue, NOT electric blue). Do NOT copy idle pose, limb angles, stance, face, chain layout, shoes, or scale.',
      });
      parts.push(pngPart(request.jacketReferenceImage));
      parts.push({
        text: 'IMAGE 2 AGAIN (confirm palette): Same deep charcoal-navy open quilted puffer as idle_01. HARD FAIL if jacket looks brighter/bluer than IMAGE 2.',
      });
      parts.push(pngPart(request.jacketReferenceImage));
      parts.push({
        text: 'IMAGE 2 THIRD TIME (color swatch reminder): Recolor EVERY puffer quilt panel on IMAGE 1 to this exact idle_01 navy. Keep jacket shape/folds from IMAGE 1 pose — only the hue/value/saturation of the jacket fabric changes.',
      });
      parts.push(pngPart(request.jacketReferenceImage));
    }

    const baseRule = `IZAIAS JACKET-COLOR LOCK EDIT (frame=${frame}) — COLOR CORRECTION REQUIRED:
Keep EXACT same pose, walk stance, face, hair, white tee, charcoal jeans, EXACTLY ONE silver steel chain, BARE hands, black sneakers, and scale from IMAGE 1.
MUST change puffer jacket COLOR to match IMAGE 2 exactly: deep charcoal-navy (almost black-navy), same as idle_01 / walk_02 — NOT the current too-blue jacket.
FORBIDDEN: keeping the old blue-tinted jacket, bright/light blue panels, changing pose, gloves, changing chain count (must stay EXACTLY 1), changing shoes, redesigning outfit.
Solid magenta (#FF00FF).`;

    return { parts, baseRule };
  }

  /**
   * Jacket-lock edit for Radja: IMAGE1 = current frame (pose locked),
   * IMAGE2 = idle_01 (jacket drape ONLY — falling off shoulders).
   */
  private buildRadjaJacketLockEditParts(request: GenerationRequest): { parts: any[]; baseRule: string } {
    if (!request.editBaseImage || !fs.existsSync(request.editBaseImage)) {
      throw new Error('radjaJacketLockEdit requires editBaseImage (existing frame PNG).');
    }

    const frame = request.frameName || 'idle_02';
    const parts: any[] = [];

    parts.push({
      text: 'IMAGE 1 (PRIMARY — KEEP POSE LOCKED): This is the EXACT sprite to preserve. Keep EXACT same pose, limb positions, body, navy crop top, black pants, belt, black sneakers, deep black curly hair, white hand wraps, face, scale/footprint, and magenta background. Change ONLY how the purple jacket sits on the shoulders.',
    });
    parts.push(pngPart(request.editBaseImage));

    if (request.jacketReferenceImage && fs.existsSync(request.jacketReferenceImage)) {
      parts.push({
        text: 'IMAGE 2 (JACKET DRAPE ONLY — idle_01): Copy ONLY the purple jacket drape — jacket FALLING OFF / DRAPED on the shoulders (casaco caindo nos ombros): collar/lapels slipped down, shoulders and navy crop straps exposed, sleeves bunched toward elbows/forearms. Do NOT copy idle pose, limb angles, stance, hair, wraps, or scale from this image.',
      });
      parts.push(pngPart(request.jacketReferenceImage));
      parts.push({
        text: 'IMAGE 2 AGAIN (confirm jacket falling off shoulders): Same purple open jacket draped OFF the shoulders — NOT worn snug, NOT zipped, NOT pulled up onto both shoulders.',
      });
      parts.push(pngPart(request.jacketReferenceImage));
    }

    const baseRule = `RADJA JACKET-LOCK EDIT (frame=${frame}):
Keep EXACT same pose, body, hair (DEEP BLACK), white hand wraps, navy crop, black pants, sneakers, face, and scale from IMAGE 1.
Change ONLY the purple jacket to match IMAGE 2 drape: FALLING OFF / draped on shoulders (casaco caindo nos ombros) exactly like idle_01.
FORBIDDEN: jacket pulled up / fully on both shoulders, changing pose, removing wraps, warm brown hair, redesigning outfit colors.
Solid magenta (#FF00FF).`;

    return { parts, baseRule };
  }

  /**
   * Rhussiana body-soften edit: IMAGE1 = current frame (pose locked),
   * IMAGE2 = body_master (soft fuller body + bare hands ONLY).
   */
  private buildRhussianaBodySoftenEditParts(request: GenerationRequest): { parts: any[]; baseRule: string } {
    if (!request.editBaseImage || !fs.existsSync(request.editBaseImage)) {
      throw new Error('rhussianaBodySoftenEdit requires editBaseImage (existing frame/master PNG).');
    }

    const frame = request.frameName || 'idle_01';
    const parts: any[] = [];

    parts.push({
      text: 'IMAGE 1 (PRIMARY — KEEP POSE LOCKED): This is the EXACT sprite to preserve. Keep EXACT same pose, limb positions, black strapless dress, GOLD heeled sandals, face, hair style/length, gold hair clip/earrings, character footprint/scale in 576x576, and solid magenta background. Change ONLY body softness and hands (remove gloves).',
    });
    parts.push(pngPart(request.editBaseImage));

    if (request.bodyTypeReferenceImage && fs.existsSync(request.bodyTypeReferenceImage)) {
      parts.push({
        text: 'IMAGE 2 (BODY TYPE ONLY — soft/fuller/gordinha): Copy ONLY the soft plumper body type — soft rounded arms WITHOUT muscle definition, soft shoulders, fuller midsection/hips, soft thighs. BARE hands (no gloves). Do NOT copy IMAGE 2 pose, background, UI, or sitting pose into IMAGE 1.',
      });
      parts.push(pngPart(request.bodyTypeReferenceImage));
      parts.push({
        text: 'IMAGE 2 AGAIN (confirm soft body, not muscular): Soft flesh shading only. FORBIDDEN: ripped abs, shredded delts/biceps/quads, bodybuilder muscle highlights.',
      });
      parts.push(pngPart(request.bodyTypeReferenceImage));
    }

    const baseRule = `RHUSSIANA BODY-SOFTEN EDIT (frame=${frame}) — AGGRESSIVE BODY REPLACEMENT:
Keep EXACT same pose, dress, gold sandals, face, hair, footprint from IMAGE 1.
REPLACE muscular arms/shoulders/legs with soft plumper flesh matching IMAGE 2 (gordinha). Soft rounded arms — NO bicep/delt/quad muscle cuts.
Hands → BARE SKIN (remove any boxing/fighter/fingerless gloves).
If IMAGE 1 looks muscular, FIX IT — do not preserve muscle shading.
FORBIDDEN: keeping ripped physique, inventing gloves, changing pose, redesigning outfit.
Solid magenta (#FF00FF).`;

    return { parts, baseRule };
  }

  /**
   * Leandro smooth-arms edit: IMAGE1 = current frame (pose/clothes/hair locked).
   * body_master is portrait-only (no arms) — do NOT use it as arm reference.
   * Optional negativeRef = Dinarte (muscular arms to AVOID).
   */
  private buildLeandroSmoothArmsEditParts(request: GenerationRequest): { parts: any[]; baseRule: string } {
    if (!request.editBaseImage || !fs.existsSync(request.editBaseImage)) {
      throw new Error('leandroSmoothArmsEdit requires editBaseImage (existing frame/master PNG).');
    }

    const frame = request.frameName || 'idle_01';

    // Leonardo: pose-locked STYLE + NORMAL body restyle from idle_01 (walk_01 QA).
    if (request.participantId === 'leonardo') {
      const parts: any[] = [];
      parts.push({
        text: 'IMAGE 1 (PRIMARY — KEEP EXACT POSE/SKELETON): Preserve EXACT limb positions, stride, head angle, footprint/scale, and magenta background. Do NOT change the walking/fighting pose silhouette.',
      });
      parts.push(pngPart(request.editBaseImage));
      parts.push({ text: 'IMAGE 1 AGAIN (pose lock confirm — limbs must stay identical):' });
      parts.push(pngPart(request.editBaseImage));
      if (request.hairReferenceImage && fs.existsSync(request.hairReferenceImage)) {
        parts.push({
          text: 'IMAGE 2 (STYLE+IDENTITY — idle_01): Copy EXACT art style — face rendering, salt-and-pepper hair pixels, line weight, shading language, gray polo with navy collar/cuff stripes, blue jeans, light sneakers. NORMAL average body with SMOOTH arms (ZERO buff muscles). Ignore idle pose.',
        });
        parts.push(pngPart(request.hairReferenceImage));
        parts.push({
          text: 'STYLE LOCK AGAIN (idle_01): SAME artist as idle_01 — FORBIDDEN different-artist soft/flat restyle. Arms SMOOTH/NORMAL.',
        });
        parts.push(pngPart(request.hairReferenceImage));
      }
      const baseRule = `LEONARDO STYLE-LOCK EDIT (frame=${frame}) — POSE LOCKED:
Keep EXACT pose/limb angles/stride footprint from IMAGE 1.
Restyle face/hair/clothes/line/shading to match IMAGE 2 idle_01 EXACTLY (same artist).
BODY: NORMAL average — SMOOTH arms ZERO muscle definition (erase buff shading).
HAIR: exact idle_01 salt-and-pepper.
OUTFIT: exact idle_01 gray polo + navy stripes + blue jeans + light sneakers.
FORBIDDEN: changing pose, different-artist look, Dinarte musculature, collage.
Solid magenta (#FF00FF). EXACTLY ONE character.`;
      return { parts, baseRule };
    }

    const isRicardo = request.participantId === 'ricardo';
    const isManasses = request.participantId === 'manasses';
    const outfitLock = isRicardo
      ? 'royal-blue crew-neck t-shirt with light-blue Under Armour logo, dark athletic pants, dark sneakers'
      : isManasses
        ? 'dark navy polo shirt with TWO thin bright green stripes on collar AND sleeve cuffs, dark pants, dark belt with silver buckle, dark sneakers with light soles, salt-and-pepper short hair and beard'
        : 'black crew-neck t-shirt, dark cargo pants, black sneakers with white soles';
    const who = isRicardo ? 'RICARDO' : isManasses ? 'MANASSES' : 'LEANDRO';
    const hairLock = isManasses
      ? 'salt-and-pepper short cropped hair and salt-and-pepper beard'
      : 'short dark buzz/fade hair';
    const parts: any[] = [];

    parts.push({
      text: `IMAGE 1 (PRIMARY — KEEP POSE + CLOTHES + HAIR LOCKED): This is the EXACT sprite to preserve. Keep EXACT same pose, limb positions (if fists are raised, KEEP them raised — do NOT drop arms to the sides), ${outfitLock}, face, ${hairLock} silhouette, character footprint/scale in 576x576, and solid magenta background. Change ONLY arm/shoulder/forearm SHADING: erase muscle cuts and repaint soft flat cylindrical arms.`,
    });
    parts.push(pngPart(request.editBaseImage));
    parts.push({ text: 'IMAGE 1 AGAIN (confirm pose/clothes/hair must stay identical — ONLY arm shading changes):' });
    parts.push(pngPart(request.editBaseImage));
    // Intentionally NO muscular negative image — models copy ripped arms from "don't do this" refs.

    if (request.hairReferenceImage && fs.existsSync(request.hairReferenceImage)) {
      parts.push({
        text: `HAIR LOCK (idle_01): Keep EXACT same ${hairLock} as this reference. Do NOT invent a new haircut.`,
      });
      parts.push(pngPart(request.hairReferenceImage));
    }

    const baseRule = `${who} SMOOTH-ARMS EDIT (frame=${frame}) — EXTREME MUSCLE ERASE (POSE LOCKED):
Keep EXACT same pose/limb angles/fist positions from IMAGE 1 — do NOT drop raised fists to the sides.
Keep EXACT ${outfitLock}, face, hair, footprint from IMAGE 1.
CRITICAL FAILURE CONDITION: If ANY viewer can still see a bicep bump, forearm muscle line, or gym-arm contour, you FAILED.
ARMS TARGET LOOK: soft smooth tubes of skin — like a regular office worker who never lifts weights. Almost FLAT arm shading. Soft rounded volume only. NO anatomy textbook muscle groups.
REPAINT BOTH ARMS AND SHOULDERS: overwrite all muscle shading with soft even skin gradients. Delete dark contour lines that carve biceps/triceps/forearms.
Shoulders soft and round — NOT shredded delts.
Hands/wrists BARE (no gloves, no watches).
FORBIDDEN: changing pose, keeping ripped physique, redesigning outfit, changing haircut, changing scale, collage, second character.
Solid magenta (#FF00FF). EXACTLY ONE character.`;

    return { parts, baseRule };
  }

  /**
   * Rhussiana belly-flatten edit: IMAGE1 = current frame (pose locked).
   * Reduce ONLY an overly round/protruding midsection — still soft/gordinha.
   */
  private buildRhussianaBellyFlattenEditParts(request: GenerationRequest): { parts: any[]; baseRule: string } {
    if (!request.editBaseImage || !fs.existsSync(request.editBaseImage)) {
      throw new Error('rhussianaBellyFlattenEdit requires editBaseImage (existing frame/master PNG).');
    }

    const frame = request.frameName || 'idle_01';
    const parts: any[] = [];

    parts.push({
      text: 'IMAGE 1 (PRIMARY — KEEP POSE LOCKED): This is the EXACT sprite to preserve. Keep EXACT same pose, limb angles, feet placement, arms, face, hair, gold clip/earrings, black strapless dress color, GOLD heeled sandals, bare hands, character height/footprint in 576x576, and solid magenta background. Change ONLY the midsection silhouette under the dress.',
    });
    parts.push(pngPart(request.editBaseImage));
    parts.push({
      text: 'IMAGE 1 AGAIN (confirm pose lock): Keep every limb, hand, foot, and head position identical. ONLY change the belly curve.',
    });
    parts.push(pngPart(request.editBaseImage));

    const baseRule = `RHUSSIANA BELLY-FLATTEN EDIT (frame=${frame}) — AGGRESSIVE MIDSECTION FIX:
Keep EXACT same pose, clothes color, face, hair, hands, shoes, and scale from IMAGE 1.
The current belly is TOO ROUND / TOO SPHERICAL / TOO PROTRUDING — FIX IT.
REWRITE the dress front silhouette from bust to hips: FLATTEN the midsection — nearly a soft gentle curve, NOT a big round ball, NOT a C-shaped balloon sticking out.
Result must look like: soft/gordinha arms + soft thighs + soft hips, but tummy is SLIMMER / FLATTER than IMAGE 1 (about 30-40% less protrusion).
FORBIDDEN: keeping the same round spherical belly; ripped abs; athletic slim athletic bodybuilder look; changing pose; adding gloves; redesigning outfit; changing scale.
Solid magenta (#FF00FF).`;

    return { parts, baseRule };
  }

  /**
   * Hair-only edit for Lívia: IMAGE1 = current frame (pose locked),
   * IMAGE2 = idle_01 (hair color/volume/length ONLY). No scale/pose change.
   */
  private buildLiviaHairOnlyEditParts(request: GenerationRequest): { parts: any[]; baseRule: string } {
    if (!request.editBaseImage || !fs.existsSync(request.editBaseImage)) {
      throw new Error('liviaHairOnlyEdit requires editBaseImage (existing frame PNG).');
    }

    const frame = request.frameName || 'hurt';
    const parts: any[] = [];

    parts.push({
      text: 'IMAGE 1 (PRIMARY — KEEP POSE LOCKED): This is the EXACT sprite to preserve. Keep EXACT same pose, limb positions, body, red one-shoulder dress, silver clutch, RED sandals, face, scale/footprint, and magenta background. Change ONLY the hair.',
    });
    parts.push(pngPart(request.editBaseImage));

    if (request.hairReferenceImage && fs.existsSync(request.hairReferenceImage)) {
      parts.push({
        text: 'IMAGE 2 (HAIR ONLY — idle_01): Copy ONLY hair color, volume, and length silhouette — ombre dark roots + honey blonde highlights. Do NOT copy idle pose, limb angles, stance, camera gaze, dress folds, clutch position, or scale from this image.',
      });
      parts.push(pngPart(request.hairReferenceImage));
    }

    const gazeRule =
      frame === 'victory'
        ? 'GAZE: Camera gaze allowed on victory only.'
        : 'GAZE: Keep IMAGE 1 gaze (toward opponent / NOT camera). Do NOT switch to camera gaze.';

    const baseRule = `LÍVIA HAIR-ONLY EDIT (frame=${frame}):
Keep EXACT same pose, body, clothes, clutch, shoes, scale from IMAGE 1.
Change ONLY hair to match IMAGE 2 ombre (dark roots + honey highlights, same volume/length).
NO pose change. NO camera gaze (unless victory). NO scale change. NO redesign.
FOOTWEAR LOCKED: RED strappy sandals. CLUTCH LOCKED: silver rectangular.
Solid magenta (#FF00FF). ${gazeRule}`;

    return { parts, baseRule };
  }

  /**
   * Surgical QA edit for Lívia: preserve pose/identity from existing sprite,
   * enforce RED sandals, silver clutch, gaze, and idle_01 scale/hair match.
   */
  private buildLiviaSurgicalEditParts(request: GenerationRequest): { parts: any[]; baseRule: string } {
    if (!request.editBaseImage || !fs.existsSync(request.editBaseImage)) {
      throw new Error('liviaSurgicalEdit requires editBaseImage (existing frame/master PNG).');
    }

    const frame = request.frameName || 'idle_01';
    const parts: any[] = [];

    parts.push({
      text: 'IMAGE 1 (PRIMARY — KEEP POSE + IDENTITY): This is the EXACT sprite to preserve. Keep the SAME body pose, limb positions, red one-shoulder dress, face, and magenta background. Apply ONLY the QA fixes listed below (scale / hair volume / hair color). Do NOT redesign the character.',
    });
    parts.push(pngPart(request.editBaseImage));

    if (request.approvedMaster && fs.existsSync(request.approvedMaster) && frame !== 'idle_01') {
      parts.push({
        text: 'IMAGE 2 (CANONICAL IDENTITY — idle_01 / master): Match RED strappy high-heeled sandals, silver rectangular clutch, dress color, HAIR color/volume/length (ombre dark roots + honey blonde highlights), face, and CHARACTER HEIGHT/FOOTPRINT from this image. Do NOT copy idle pose into other frames.',
      });
      parts.push(pngPart(request.approvedMaster));
    }

    if (
      request.scaleReferenceImage &&
      fs.existsSync(request.scaleReferenceImage) &&
      ['walk_01', 'hurt', 'victory', 'attack', 'lying'].includes(frame)
    ) {
      parts.push({
        text: `IMAGE SCALE/HAIR REF (idle_01 — HEIGHT + HAIR ONLY): Match this character FOOTPRINT and head-to-toe height inside the 576x576 canvas (same margins above head and below feet). Match hair volume, length, and blonde ombre (dark roots + honey highlights). Do NOT copy idle pose, limb angles, or idle stance into frame ${frame}.`,
      });
      parts.push(pngPart(request.scaleReferenceImage));
    }

    const gazeRule =
      frame === 'victory'
        ? 'GAZE: Looking toward CAMERA / viewer is ALLOWED only on victory. Keep a celebratory camera-facing smile.'
        : frame === 'lying'
          ? 'GAZE: Eyes closed / KO — do NOT look at camera.'
          : 'GAZE: MUST look RIGHT toward the opponent (profile/forward fighting direction). FORBIDDEN: looking at camera, breaking the 4th wall, face turned to viewer.';

    const frameQaFix =
      frame === 'walk_01'
        ? 'QA FIX walk_01: Character is currently SLIGHTLY TOO TALL. SHRINK her so head-to-toe height and canvas footprint MATCH idle_01 exactly. Keep the walk stride/pose. Hair must match idle_01 ombre (dark roots + honey blonde) — do not change pose.'
        : frame === 'hurt'
          ? 'QA FIX hurt: Character is currently SLIGHTLY TOO SMALL and hair is too dense/dark. ENLARGE to match idle_01 height/footprint. REDUCE hair volume slightly and make hair SLIGHTLY MORE BLONDE (same ombre dark roots + honey highlights as idle_01). Keep hurt stagger pose.'
          : frame === 'victory'
            ? 'QA FIX victory: Character is currently SLIGHTLY TOO SMALL with insufficient hair volume/blonde. ENLARGE slightly so height/footprint MATCH idle_01. INCREASE hair volume slightly and make hair MORE BLONDE like idle_01 (ombre dark roots + honey highlights). Keep victory pose; camera gaze OK.'
            : frame === 'lying'
              ? 'QA FIX lying (optional): Brighten hair highlights slightly toward idle_01 honey blonde WITHOUT changing lying pose, limbs, or scale. If unsure, keep hair as-is.'
              : frame === 'attack'
                ? 'QA FIX attack: Match idle_01 character height/footprint. Keep attack pose.'
                : 'QA FIX: Match idle_01 scale and hair only where needed; keep pose.';

    const scaleRule =
      frame === 'walk_01' ||
      frame === 'hurt' ||
      frame === 'victory' ||
      frame === 'attack' ||
      frame === 'lying'
        ? `SCALE: Character size/footprint MUST match idle_01 in the 576x576 frame. Same head-to-toe height ratio and margins above head / below feet. NOT oversized, NOT undersized vs idle_01.`
        : 'SCALE: Keep the same character size and framing as IMAGE 1 — do not enlarge or shrink the fighter.';

    const hairRule =
      'HAIR LOCK: Same as idle_01 — medium/long volume, ombre dark roots + honey blonde highlights, same length silhouette. FORBIDDEN: flat dark hair, oversized helmet-hair, or mismatched blonde intensity.';

    const clutchRule =
      frame === 'idle_02'
        ? 'CLUTCH: MUST show the rectangular SILVER clutch from idle_01. Put it in the LOWER/resting hand (open that fist to hold the clutch) OR tuck clearly at the hip. The clutch must be OBVIOUSLY visible. FORBIDDEN: both empty fists with no bag.'
        : frame === 'lying'
          ? 'CLUTCH: Keep silver clutch near the hand or on the ground beside the hip. Character remains LYING DOWN — do not stand up.'
          : 'CLUTCH: Keep the rectangular SILVER clutch from idle_01 visible (held in free hand or at hip/side). Do NOT omit the clutch. Do NOT invent a different bag.';

    const poseLock =
      frame === 'lying'
        ? 'POSE LOCK: Character MUST stay LYING DOWN (horizontal KO on the ground) exactly like IMAGE 1. FORBIDDEN: standing, victory pose, source-card collage, UI panels, duplicate bodies.'
        : 'POSE LOCK: Keep IMAGE 1 pose/limbs exactly — only adjust scale and hair as specified.';

    const baseRule = `LÍVIA SURGICAL QA (frame=${frame}):
1) ${frameQaFix}
2) FOOTWEAR LOCKED: RED strappy high-heeled sandals on BOTH feet (same as idle_01). FORBIDDEN: silver sandals, metallic silver heels, wrong shoe color.
3) ${clutchRule}
4) ${gazeRule}
5) ${scaleRule}
6) ${hairRule}
7) ${poseLock}
8) Keep EXACT red one-shoulder ruffled dress, forearm tattoo, bracelets. Solid magenta (#FF00FF).
NO redesign. NO new outfit. NO Dinarte clothes. NO duplicate/extra character bodies. NO source-card UI.`;

    return { parts, baseRule };
  }

  /** Appended to normal (non-surgical) Livía frame generation for consistency. */
  private liviaIdentityAddon(frameName?: string): string {
    const gaze =
      frameName === 'victory'
        ? ' Gaze may face CAMERA only on victory.'
        : frameName === 'lying'
          ? ' Eyes closed; do not look at camera.'
          : ' MUST look RIGHT toward opponent — NOT at camera.';
    const scale =
      frameName === 'attack' || frameName === 'victory'
        ? ' Match Dinarte sheet character SCALE/framing (same footprint in 576x576 as idle_01). NOT oversized.'
        : '';
    return ` Lívia LOCKED: RED strappy high-heeled sandals (NOT silver). Always include silver rectangular clutch when hand/side is visible.${gaze}${scale}`;
  }

  /**
   * Rhussiana identity lock: normal slim body, longer black dress with babado above knee, bare hands.
   * Appended to every Rhussiana generation (master + derived frames).
   */
  private rhussianaIdentityAddon(frameName?: string): string {
    const scale =
      frameName === 'attack'
        ? ' SCALE HARD LOCK (attack): SAME head-to-toe height and margins as idle_01 in 576x576 — NOT small, NOT oversized, NOT zoomed. Match idle_01 footprint exactly.'
        : frameName === 'idle_01' ||
            frameName === 'idle_02' ||
            frameName === 'victory'
          ? ' SCALE: Match Dinarte / idle_01 FOOTPRINT in 576x576 — same head-to-toe height and margins. NOT compressed squat idle. NOT oversized victory. Consistent proportions across frames.'
          : ' SCALE: Match idle_01 / Dinarte footprint — consistent body size across the sheet.';
    return ` RHUSSIANA LOCKED IDENTITY (HARD FAIL IF WRONG):
OUTFIT: black strapless dress with layered babado/ruffle hem. Hem MUST end ONLY ~1 finger width ABOVE the kneecap (almost knee-length) — knees visible just below hem. GOLD heeled sandals, gold hair clip/earrings (optional gold bracelet). NO red dress. NO silver clutch.
FORBIDDEN DRESS: mini/short mid-thigh skirt, lots of bare thigh, vulgar ultra-short hem, missing babado/ruffles.
HANDS: BARE SKIN ONLY. FORBIDDEN: boxing gloves, fighter gloves, MMA gloves, fingerless combat gloves, hand wraps, padded knuckle gloves.
BODY: NORMAL average slim figure (mais magra / normal body) — soft smooth arms/shoulders/legs. Flat natural midsection. FORBIDDEN: plump/gordinha/overly curvy, muscular/buffed bodybuilder physique, ripped abs, shredded delts/biceps/quads, round protruding belly.
${scale}`;
  }

  /**
   * Ana identity lock: female emerald one-shoulder gown, pink glasses, high bun, no watch.
   * Appended to every Ana generation (master + derived frames).
   */
  private anaIdentityAddon(frameName?: string): string {
    const scale =
      ' SCALE HARD LOCK: Match idle_01 FOOTPRINT in 576x576 — SAME head-to-toe height and margins (~70-80% canvas height). NOT small. NOT miniature multi-sprites. NOT zoomed out. NOT larger than idle_01.';
    const hair =
      frameName === 'lying'
        ? ' HAIR HARD LOCK (lying): EXACT same dark HIGH BUN + two loose wavy face-framing strands as idle_01. FORBIDDEN different haircut, loose down hair, missing bun.'
        : ' HAIR LOCK: EXACT same dark HIGH BUN + two loose wavy face-framing strands as idle_01 across all frames.';
    const glasses =
      ' GLASSES HARD LOCK: rose-pink / lavender rounded eyeglasses on EVERY frame (including lying). FORBIDDEN missing glasses, black frames, tinted sport goggles.';
    const idle02 =
      frameName === 'idle_02'
        ? ' IDLE_02 LOW GUARD HARD LOCK: SAME idle stance/legs as idle_01 but BOTH fists MUST drop to WAIST/HIP height (guarda baixa). idle_01 = high guard (chest/chin). HARD FAIL if fists stay at chest/chin/head like idle_01. FORBIDDEN pixel-clone.'
        : '';
    const gaze =
      frameName === 'victory'
        ? ' GAZE: May look slightly toward camera for victory shout OR keep 3/4 toward opponent.'
        : frameName === 'lying'
          ? ' Eyes closed; do not look at camera.'
          : ' GAZE HARD LOCK: Head and eyes face RIGHT toward the opponent in 3/4 fighting-game profile (same as Dinarte sheet). FORBIDDEN looking straight at camera.';
    return ` ANA LOCKED IDENTITY (from source card / face_master / idle_01 — HARD FAIL IF WRONG):
GENDER: FEMALE presentation. NORMAL female body. Soft smooth arms with ZERO muscle. FORBIDDEN: male body, Dinarte musculature, ripped biceps/delts.
OUTFIT (EXACT match across ALL frames):
- EMERALD GREEN one-shoulder gown/dress. Strap on her LEFT shoulder. RIGHT shoulder BARE.
- Matching emerald fabric sash/belt knotted at the waist.
- Long hem near the ankles (feet/heels remain visible for walk/attack). NOT a mini dress. NOT red. NOT black.
- Matching dark/emerald closed-toe heels — SAME shoes every frame (FORBIDDEN sneakers, red Livia sandals, gold Rhussiana sandals).
FACE: warm tan/olive skin; wide friendly smile; small gold hoop earrings.
${glasses}
${hair}
HANDS/WRISTS: BARE SKIN on BOTH hands AND BOTH wrists. NO WATCH (source has none — FORBIDDEN adding a watch on either wrist). FORBIDDEN boxing/fighter/MMA/fingerless gloves, wraps.
FORBIDDEN: black tank (Dinarte), red one-shoulder Livia dress, black Rhussiana dress, cargo pants, jeans, sneakers, missing glasses, missing bun, outfit/hair/shoe swap between frames, gloves of any kind.
${gaze}
${idle02}
BACKGROUND/SCENE: EXACTLY ONE character in a single 576x576 frame. HARD FAIL: collage, contact sheet, sprite sheet, 2+ figures, source-card UI (WEN / stats / green vortex).
Solid magenta (#FF00FF).
${scale}`;
  }

  /**
   * Evellyn identity lock: female long straight black hair, dark navy tee, charcoal pants, no watch.
   * Appended to every Evellyn generation (master + derived frames).
   */
  private evellynIdentityAddon(frameName?: string): string {
    const scale =
      ' SCALE HARD LOCK: Match idle_01 FOOTPRINT in 576x576 — SAME head-to-toe height and margins (~70-80% canvas height). NOT small. NOT miniature multi-sprites. NOT zoomed out. NOT larger than idle_01.';
    const hair =
      frameName === 'lying'
        ? ' HAIR HARD LOCK (lying): EXACT same LONG STRAIGHT JET-BLACK hair as idle_01 — side-parted, falling over both shoulders to mid-torso/waist. FORBIDDEN bun, short hair, curly hair, different haircut.'
        : ' HAIR LOCK: EXACT same LONG STRAIGHT JET-BLACK hair, side-parted, over BOTH shoulders to mid-torso/waist as idle_01 across all frames.';
    const idle02 =
      frameName === 'idle_02'
        ? ' IDLE_02 LOW GUARD HARD LOCK: SAME idle stance/legs as idle_01 but BOTH fists MUST drop to WAIST/HIP height (guarda baixa). idle_01 = high guard (chest/chin). HARD FAIL if fists stay at chest/chin/head like idle_01. FORBIDDEN pixel-clone.'
        : '';
    const gaze =
      frameName === 'victory'
        ? ' GAZE: May look slightly toward camera for victory shout OR keep 3/4 toward opponent.'
        : frameName === 'lying'
          ? ' Eyes closed; do not look at camera.'
          : ' GAZE HARD LOCK: Head and eyes face RIGHT toward the opponent in 3/4 fighting-game profile (same as Dinarte sheet). FORBIDDEN looking straight at camera.';
    const attack =
      frameName === 'attack'
        ? ' ATTACK HARD LOCK: SAME SCALE as idle_01. EXACTLY TWO ARMS. RIGHT punch fully extended to the RIGHT (Dinarte). LEFT fist chambered at waist. Left arm hidden — OMIT watch (do NOT put a watch on the RIGHT punching wrist). FORBIDDEN extra/ghost/third arm.'
        : '';
    const victory =
      frameName === 'victory'
        ? ' VICTORY HARD LOCK: EXACTLY TWO ARMS. RIGHT arm straight UP, fist ABOVE head. LEFT fist at waist. FORBIDDEN extra/ghost arm, idle-with-raised-arm hybrid.'
        : '';
    return ` EVELLYN LOCKED IDENTITY (from source card / face_master / idle_01 — HARD FAIL IF WRONG):
GENDER: FEMALE presentation. NORMAL female body. Soft smooth arms with ZERO muscle. FORBIDDEN: male body, Dinarte musculature, ripped biceps/delts.
OUTFIT (EXACT match across ALL frames):
- PLAIN dark navy / charcoal short-sleeve crew-neck t-shirt (no logo, form-fitting).
- Dark charcoal pants matching the tee (SAME every frame — NOT cargo, NOT a dress).
- Dark low-top sneakers matching the dark outfit — SAME shoes every frame.
FACE: medium tan/warm golden skin; dark brown almond eyes; thin arched dark brows; muted rose/mauve lips; gentle closed-mouth smile. NO glasses. NO jewelry.
${hair}
HANDS/WRISTS: BARE SKIN on BOTH hands AND BOTH wrists. NO WATCH (source has none — FORBIDDEN adding a watch on either wrist). If left arm is hidden, OMIT the watch — NEVER put a watch on the RIGHT wrist. FORBIDDEN boxing/fighter/MMA/fingerless gloves, wraps.
FORBIDDEN: black tank (Dinarte), emerald Ana gown, red Livia dress, black Rhussiana dress, bun, short hair, adding a watch, adding glasses/jewelry, outfit/hair/shoe swap between frames, gloves of any kind, male body.
${gaze}
${idle02}
${attack}
${victory}
BACKGROUND/SCENE: EXACTLY ONE character in a single 576x576 frame. HARD FAIL: collage, contact sheet, sprite sheet, 2+ figures, source-card UI (WDX / stats / green vortex).
Solid magenta (#FF00FF).
${scale}`;
  }

  /**
   * João identity lock: formal dark suit + magenta necktie matching idle_01.
   * NEVER polo / sleeveless / default fighter clothes / gloves.
   */
  private joaoIdentityAddon(frameName?: string): string {
    const scale =
      ' SCALE: Match idle_01 FOOTPRINT in 576x576 — same head-to-toe height and margins (~80% of canvas height). NOT small/undersized. NOT oversized. Same proportions as idle_01.';
    return ` JOÃO LOCKED IDENTITY (HARD FAIL IF MISSING):
OUTFIT (EXACT match to idle_01 — MANDATORY FORMAL SUIT / TERNO):
- Charcoal/black formal suit JACKET with clear LAPELS and long sleeves (blazer/terno).
- Matching charcoal/black suit TROUSERS (dress pants with fabric folds — NOT jeans, NOT cargo).
- Dark charcoal/black collared DRESS SHIRT under the jacket.
- Bright MAGENTA / HOT PINK NECKTIE (very visible against the dark suit).
- Thin black belt with small square silver buckle.
- Dark polished FORMAL dress shoes (NOT sneakers/tênis, NOT boots, NOT combat shoes).
FORBIDDEN OUTFITS: black polo, sleeveless tank, default fighter clothes, shorts, jeans, hoodie, no-jacket shirt-only looks, missing necktie, missing suit jacket.
HANDS: BARE SKIN ONLY. FORBIDDEN: boxing gloves, fighter gloves, MMA gloves, fingerless combat gloves, hand wraps, padded knuckle gloves.
HAIR/FACE: short dark fade hair, full dark beard/mustache — same as idle_01.
BACKGROUND/SCENE: EXACTLY ONE CHARACTER in a single 576x576 frame. NO GHOST IMAGES. NO collage. NO contact sheet. NO second person.
${scale}`;
  }

  /**
   * Neto identity lock: idle_01 clothes (black tee + medium-blue jeans), bare hands, fordo body, idle scale.
   */
  private netoIdentityAddon(_frameName?: string): string {
    const scale =
      ' SCALE HARD LOCK: Match idle_01 FOOTPRINT in 576x576 — SAME head-to-toe height and margins (~70-80% canvas height). NOT small. NOT disproportionate. NOT zoomed out.';
    return ` NETO LOCKED IDENTITY (from approved idle_01 — HARD FAIL IF WRONG):
OUTFIT (EXACT match to idle_01):
- Plain tight black short-sleeve t-shirt.
- Medium-blue denim jeans (exact idle_01 blue — NOT light wash, NOT charcoal, NOT cargo pants).
- Solid black sneakers (NOT white soles cargo boots).
FORBIDDEN: boxing/fighter outfit, cargo pants, brown belt, gold necklace, charcoal/gray pants, gloves of any kind.
HANDS: BARE SKIN ONLY on BOTH hands. FORBIDDEN: boxing gloves, fighter gloves, MMA gloves, fingerless combat gloves, hand wraps, padded knuckle gloves.
BODY: stocky/fordo normal build matching idle_01 — NOT skinny redesign, NOT bodybuilder overhaul.
BACKGROUND/SCENE: EXACTLY ONE character. NO multi-sprite collage. Solid magenta (#FF00FF).
${scale}`;
  }

  /**
   * Default body for ALL participants except Dinarte: smooth non-muscular arms.
   * Muscular/ripped arms are a Dinarte-only special characteristic.
   */
  private defaultSmoothArmsAddon(participantId?: string): string {
    if (!participantId || participantId === 'dinarte') return '';
    return ` GLOBAL BODY DEFAULT (NOT Dinarte):
ARMS MUST BE SMOOTH / LISOS — soft flat cylindrical arms with ZERO visible muscle definition (no biceps peaks, no triceps cuts, no deltoid shreds, no forearm veins).
BODY: NORMAL average build — NOT skinny/slim, NOT muscular/buff/ripped/bodybuilder.
FORBIDDEN: copying Dinarte/template fighter musculature onto this participant. Muscular arms are a Dinarte-ONLY special exception.
`;
  }

  /**
   * Leandro identity lock: SMOOTH arms, NORMAL body, black tee + dark cargo, bare hands/wrists, hair lock.
   */
  private leandroIdentityAddon(frameName?: string): string {
    const scale =
      ' SCALE HARD LOCK: Match idle_01 FOOTPRINT in 576x576 — SAME head-to-toe height and margins (~70-80% canvas height). NOT small. NOT miniature multi-sprites. NOT zoomed out. NOT larger than idle_01.';
    const hair =
      frameName === 'lying'
        ? ' HAIR HARD LOCK (lying): EXACT same short dark fade/buzz hair as idle_01 — same color, length, silhouette. FORBIDDEN different haircut, longer hair, different volume.'
        : ' HAIR LOCK: EXACT same short dark fade/buzz as idle_01 across all frames.';
    return ` LEANDRO LOCKED IDENTITY (from approved idle_01 — HARD FAIL IF WRONG):
OUTFIT (EXACT match to idle_01):
- Plain black crew-neck short-sleeve t-shirt.
- Dark charcoal/black cargo pants (side pockets OK).
- Black sneakers with white soles/laces.
FORBIDDEN: polo, jeans-without-cargo, boxing/fighter outfit, gloves of any kind, watches, wristbands.
HANDS/WRISTS: BARE SKIN ONLY on BOTH hands AND BOTH wrists. FORBIDDEN: boxing/fighter/MMA/fingerless gloves, hand wraps, watches, wristbands (ignore source-card watch).
ARMS: SMOOTH / LISOS — ZERO visible muscles (no biceps, triceps, delts, forearm cuts, veins). Soft flat cylindrical arms like a non-athlete.
BODY: NORMAL average everyday male — NOT skinny/slim, NOT muscular/buff/ripped. Muscular arms are Dinarte-ONLY — NEVER for Leandro.
${hair}
BACKGROUND/SCENE: EXACTLY ONE character in a single 576x576 frame. HARD FAIL: collage, contact sheet, sprite sheet, 2+ figures, three miniaturized walkers.
Solid magenta (#FF00FF).
${scale}`;
  }

  /**
   * Jailson identity lock: navy open blazer + black tee, DARK blue denim (exact idle_01 — NOT light wash), bare hands.
   */
  private jailsonIdentityAddon(_frameName?: string): string {
    const scale =
      ' SCALE HARD LOCK: Match idle_01 FOOTPRINT in 576x576 — SAME head-to-toe height and margins (~70-80% canvas height). NOT small. NOT oversized.';
    return ` JAILSON LOCKED IDENTITY (from approved idle_01 — HARD FAIL IF WRONG):
OUTFIT (EXACT match to idle_01):
- Dark navy / charcoal open long-sleeve shirt or light blazer with sleeves rolled to mid-forearm.
- Solid black crew-neck t-shirt underneath.
- DARK blue denim jeans — EXACT same dark medium/navy denim as idle_01 (saturated dark blue with deep navy shadows).
- Brown belt with rectangular gold/brass buckle.
- Light pale-blue sneakers with white soles and white laces.
- Black rectangular glasses; short neat black hair; gold wedding band on left ring finger OK.
PANTS HARD LOCK: DARK denim matching idle_01 EXACTLY. FORBIDDEN: light-wash jeans, light blue pants, grey pants, faded sky-blue denim, any pants lighter than idle_01.
HANDS/WRISTS: BARE SKIN ONLY. FORBIDDEN: gloves of any kind, watches, wristbands.
ARMS: SMOOTH / LISOS — ZERO visible muscles. BODY: NORMAL average male — NOT muscular/buff.
BACKGROUND/SCENE: EXACTLY ONE character in a single 576x576 frame. Solid magenta (#FF00FF).
${scale}`;
  }

  /**
   * Izaias identity lock: navy puffer + white tee, EXACTLY ONE silver steel chain, bare hands, one shoe design.
   */
  private izaiasIdentityAddon(_frameName?: string): string {
    const scale =
      ' SCALE HARD LOCK: Match idle_01 FOOTPRINT in 576x576 — SAME head-to-toe height and margins (~70-80% canvas height). NOT small. NOT miniature multi-sprites. NOT zoomed out.';
    return ` IZAIAS LOCKED IDENTITY (HARD FAIL IF WRONG):
OUTFIT (must match across ALL frames — EXACT same colors as idle_01):
- Dark CHARCOAL-NAVY quilted puffer/hooded jacket worn open (near-black navy ~same as idle_01/walk_02 — FORBIDDEN bright blue, light blue, electric blue, grey-blue tint).
- Plain white crew-neck t-shirt underneath.
- Dark charcoal/gray jeans.
- EXACTLY ONE thick silver steel curb-link chain necklace over the white tee (NEVER 2, NEVER 3, NEVER missing).
- Shoes HARD LOCK: solid black sneakers with black laces and dark soles — SAME design on EVERY frame (no white soles swap, no grey sneakers, no different silhouette).
FORBIDDEN: multi-chain stacks, missing chain, changing shoe color/style between frames, boxing/fighter outfit, blue-tinted jacket different from idle_01.
HANDS: BARE SKIN ONLY on BOTH hands. FORBIDDEN: boxing gloves, fighter gloves, MMA gloves, fingerless combat gloves, hand wraps, padded knuckle gloves.
ARMS: SMOOTH / LISOS — ZERO visible muscles. BODY: NORMAL average male — NOT muscular/buff.
BACKGROUND/SCENE: EXACTLY ONE character in a single 576x576 frame. Solid magenta (#FF00FF). NO collage/contact sheet.
${scale}`;
  }

  /**
   * Erikson identity lock: navy Classic Cars tee, blue jeans, white sneakers, gold chain + studs, watch L.
   */
  private eriksonIdentityAddon(frameName?: string): string {
    const scale =
      ' SCALE HARD LOCK: Match idle_01 FOOTPRINT in 576x576 — SAME head-to-toe height and margins (~70-80% canvas height). NOT small. NOT miniature multi-sprites. NOT zoomed out. NOT larger than idle_01.';
    const hair =
      frameName === 'lying'
        ? ' HAIR HARD LOCK (lying): EXACT same short dark textured top with fade sides as idle_01 — same color, length, silhouette. FORBIDDEN different haircut.'
        : ' HAIR LOCK: EXACT same short dark textured top with fade sides as idle_01 across all frames.';
    const gaze =
      frameName === 'victory'
        ? ' GAZE: May look slightly toward camera for victory shout OR keep 3/4 toward opponent — NEVER full front portrait facing camera with both eyes locked on viewer like a photo.'
        : ' GAZE HARD LOCK: Head and eyes face RIGHT toward the opponent in 3/4 fighting-game profile (same as Dinarte sheet). FORBIDDEN: looking straight at camera / full-front portrait gaze / both eyes locked on viewer.';
    return ` ERIKSON LOCKED IDENTITY (from approved idle_01 / source card — HARD FAIL IF WRONG):
OUTFIT (EXACT match across ALL frames):
- Navy blue crew-neck short-sleeve t-shirt with rectangular "Classic Cars" chest graphic (vintage yellow cars + cursive Classic Cars text on cream panel).
- Medium-blue denim jeans (light fade/whiskering on thighs OK — SAME wash as idle_01).
- Solid white / off-white sneakers with white laces and thick soles — SAME shoes every frame.
- Thick gold curb-link chain necklace over the tee collar.
- Small gold stud earrings in both ears.
- Black rectangular smartwatch on LEFT wrist (keep on every frame where wrist visible — HARD FAIL if missing on walk frames).
FORBIDDEN: black tank (Dinarte), different tee graphic, missing chain, missing studs, missing watch, shoe color swap, gloves of any kind.
HANDS: BARE SKIN (watch on left wrist only — NOT boxing gloves / wraps / fingerless gloves).
ARMS: SMOOTH / LISOS — ZERO visible muscles. BODY: NORMAL average lean male — NOT muscular/buff (Dinarte-ONLY musculature FORBIDDEN).
ART STYLE LOCK: Match idle_01 pixel rendering exactly (same outline weight, shading, saturation). FORBIDDEN different art style / softer painterly look / thinner outlines.
${gaze}
${hair}
BACKGROUND/SCENE: EXACTLY ONE character in a single 576x576 frame. HARD FAIL: collage, contact sheet, sprite sheet, 2+ figures.
Solid magenta (#FF00FF).
${scale}`;
  }

  /**
   * Fernando identity lock: black polo + bright green collar/cuffs, black joggers, black sneakers white soles.
   * No watch in source (hands in pockets) — keep wrists bare.
   */
  private fernandoIdentityAddon(frameName?: string): string {
    const scale =
      ' SCALE HARD LOCK: Match idle_01 FOOTPRINT in 576x576 — SAME head-to-toe height and margins (~70-80% canvas height). NOT small. NOT miniature multi-sprites. NOT zoomed out. NOT larger than idle_01.';
    const hair =
      frameName === 'lying'
        ? ' HAIR HARD LOCK (lying): EXACT same dark curly/coiled volume on top with tapered fade sides as idle_01 — same color, length, silhouette. FORBIDDEN different haircut, straight hair, buzz cut.'
        : ' HAIR LOCK: EXACT same dark curly/coiled volume on top with tapered fade sides as idle_01 across all frames.';
    const idle02 =
      frameName === 'idle_02'
        ? ' IDLE_02 HARD LOCK: SAME SCALE/PROPORTION as idle_01 (same head-to-toe height, same baseline). SAME idle/guard FAMILY — EXACTLY TWO ARMS, both fists in fighting guard. Microvariation ONLY: slightly LOWER or slightly HIGHER fists than idle_01. FORBIDDEN: broken/twisted arms, extra/ghost limbs, tiny/oversized body, pixel-clone.'
        : frameName === 'attack'
          ? ' ATTACK HARD LOCK: SAME SCALE as idle_01 (head near top, feet near bottom — NOT small). EXACTLY TWO ARMS. RIGHT punch fully extended to the RIGHT (Dinarte). LEFT fist chambered at waist. FORBIDDEN extra/ghost/third arm.'
          : frameName === 'victory'
            ? ' VICTORY HARD LOCK: EXACTLY TWO ARMS. RIGHT arm straight UP, fist ABOVE head. LEFT fist at waist. FORBIDDEN extra/ghost arm, idle-with-raised-arm hybrid.'
            : '';
    return ` FERNANDO LOCKED IDENTITY (from source card / face_master — HARD FAIL IF WRONG):
OUTFIT (EXACT match across ALL frames):
- Black short-sleeve POLO shirt with a BRIGHT LIME/KELLY GREEN ribbed collar AND matching bright green trim on BOTH sleeve cuffs.
- Small green/white logo on the LEFT chest of the polo (keep if visible).
- Solid black jogger / track pants with ribbed ankle cuffs (tapered at ankles — NOT jeans, NOT cargo).
- Black sneakers with thick WHITE soles / midsoles and dark uppers — SAME shoes every frame.
FACE: medium-tan / light-brown skin; thin black mustache + short neat goatee on chin; dark curly hair voluminous on top, fade/taper on sides; small silver/white stud earrings.
WRISTS/HANDS: BARE SKIN on BOTH hands AND BOTH wrists. NO WATCH (source has no visible watch — FORBIDDEN adding a watch). FORBIDDEN boxing/fighter/MMA/fingerless gloves, wraps, wristbands.
FORBIDDEN: black tank (Dinarte), missing green collar, missing green cuffs, jeans, cargo pants, shoe color swap, outfit/hair swap between frames, gloves of any kind, inventing a watch.
ARMS: SMOOTH / LISOS — ZERO visible muscles. BODY: NORMAL average lean male — NOT muscular/buff (Dinarte-ONLY musculature FORBIDDEN).
GAZE: Head and eyes face RIGHT toward the opponent in 3/4 fighting-game profile (same as Dinarte sheet). FORBIDDEN full-front camera stare (except a slight victory shout is OK).
${hair}
${idle02}
BACKGROUND/SCENE: EXACTLY ONE character in a single 576x576 frame. HARD FAIL: collage, contact sheet, sprite sheet, 2+ figures.
Solid magenta (#FF00FF).
${scale}`;
  }

  /**
   * Ryan identity lock: black polo + lime collar/cuffs, ESPERANÇA logo, backpack, black pants, no watch.
   */
  private ryanIdentityAddon(frameName?: string): string {
    const scale =
      ' SCALE HARD LOCK: Match idle_01 FOOTPRINT in 576x576 — SAME head-to-toe height and margins (~70-80% canvas height). NOT small. NOT miniature multi-sprites. NOT zoomed out. NOT larger than idle_01.';
    const hair =
      frameName === 'lying'
        ? ' HAIR HARD LOCK (lying): EXACT same short dark hair brushed slightly up/side as idle_01 — same color, length, silhouette. FORBIDDEN curly hair, different haircut.'
        : ' HAIR LOCK: EXACT same short dark hair brushed slightly up/side as idle_01 across all frames. FORBIDDEN curly hair (that is Fernando, not Ryan).';
    const idle02 =
      frameName === 'idle_02'
        ? ' IDLE_02 MICROVARIATION: SAME idle fighting stance as idle_01 but guard MUST be visibly different (raise OR lower fists ~1-2cm / change lead-hand reach). FORBIDDEN pixel-clone of idle_01.'
        : '';
    return ` RYAN LOCKED IDENTITY (from source card / face_master — HARD FAIL IF WRONG):
OUTFIT (EXACT match across ALL frames):
- Black / dark navy short-sleeve POLO with a BRIGHT LIME GREEN ribbed collar AND matching bright lime-green bands on BOTH sleeve cuffs.
- Left-chest logo: "ESPERANÇA" over "DISTRIBUIDORA DE FRIOS" (green/white lettering) — MUST stay on every frame.
- Black backpack straps visible over BOTH shoulders (keep backpack).
- Solid black pants / joggers with cuffed ankles — SAME every frame.
- Black sneakers with thin WHITE soles and dark uppers — SAME shoes every frame.
FACE: young adult male; light-to-medium olive/tan skin; short dark hair (NOT curly); even dark stubble on jaw/chin + mustache; dark eyebrows.
WRISTS/HANDS: BARE SKIN on BOTH hands AND BOTH wrists. NO WATCH (source has no watch — FORBIDDEN adding a watch on either wrist). FORBIDDEN boxing/fighter/MMA/fingerless gloves, wraps.
FORBIDDEN: confusing Ryan with Fernando (Fernando has curly hair + goatee + stud earrings, Ryan does not); missing backpack; missing ESPERANÇA logo; missing lime collar or sleeve bands; black tank (Dinarte); adding a watch; gloves; shoe/outfit/hair swap between frames.
ARMS: SMOOTH / LISOS — ZERO visible muscles. BODY: NORMAL average lean male — NOT muscular/buff (Dinarte-ONLY musculature FORBIDDEN).
GAZE: Head and eyes face RIGHT toward the opponent in 3/4 fighting-game profile (same as Dinarte sheet). FORBIDDEN full-front camera stare (except a slight victory shout is OK).
${hair}
${idle02}
BACKGROUND/SCENE: EXACTLY ONE character in a single 576x576 frame. HARD FAIL: collage, contact sheet, sprite sheet, 2+ figures.
Solid magenta (#FF00FF).
${scale}`;
  }

  /**
   * Alexandre identity lock: black cap, white-framed sunglasses, salt-and-pepper beard,
   * silver chain, black tee, right-forearm tattoo. No watch in source.
   */
  private alexandreIdentityAddon(frameName?: string): string {
    const scale =
      ' SCALE HARD LOCK: Match idle_01 FOOTPRINT in 576x576 — SAME head-to-toe height and margins (~70-80% canvas height). NOT small. NOT miniature multi-sprites. NOT zoomed out. NOT larger than idle_01.';
    const cap =
      ' CAP HARD LOCK: solid black baseball cap on EVERY frame (including lying) — brim forward, pulled slightly low. FORBIDDEN missing cap, different color cap, backwards cap.';
    const glasses =
      ' GLASSES HARD LOCK: thick WHITE rectangular sunglasses with dark lenses on EVERY frame (including lying). FORBIDDEN missing glasses, black frames, clear lenses, round glasses.';
    const beard =
      frameName === 'lying'
        ? ' BEARD HARD LOCK (lying): EXACT same short trimmed salt-and-pepper beard + mustache as idle_01 — dark sides, GREY/WHITE patch concentrated on the chin. FORBIDDEN clean-shaven, all-black beard, different length.'
        : ' BEARD LOCK: short trimmed salt-and-pepper beard + mustache — dark sides, GREY/WHITE on the chin — SAME across all frames.';
    const tattoo =
      ' TATTOO HARD LOCK: dense black geometric/sun/tribal tattoo covering the RIGHT forearm whenever the right arm is visible. NEVER put the tattoo on the left arm. If the right arm is hidden, omit the tattoo rather than moving it.';
    const idle02 =
      frameName === 'idle_02'
        ? ' IDLE_02 LOW GUARD HARD FAIL: SAME idle stance / legs / 3/4 RIGHT gaze as idle_01, but BOTH fists MUST drop to WAIST/HIP height (guarda baixa). Elbows more relaxed. FORBIDDEN chest-height clone of idle_01. Fists clearly LOWER than idle_01.'
        : '';
    const victory =
      frameName === 'victory'
        ? ' VICTORY POSE HARD LOCK (Dinarte): EXACTLY TWO ARMS — never 3, never 4, never ghost extra limbs. RIGHT arm straight UP above the head with a clenched fist. LEFT fist down at the waist/hip (elbow bent). Mouth open in a shout. FORBIDDEN idle chest-guard, both fists at chest, extra arms growing from shoulders.'
        : '';
    return ` ALEXANDRE LOCKED IDENTITY (from source card / face_master / body_master — HARD FAIL IF WRONG):
OUTFIT (EXACT match across ALL frames):
- Solid black baseball cap, brim forward.
- Thick WHITE-framed rectangular sunglasses with dark lenses (signature accessory).
- Black crew-neck short-sleeve t-shirt (subtle dark-on-black pattern or small light chest logo OK — SAME tee every frame).
- Plain black knee-length athletic shorts (idle_01 lock — NOT long pants, NOT jeans, NOT cargo). SAME shorts every frame.
- Solid black low-top sneakers with black laces — SAME shoes every frame.
- Silver curb-link chain necklace over the tee collar on EVERY frame.
FACE: medium-tan / bronze skin; short trimmed salt-and-pepper beard with GREY/WHITE chin; black cap; white sunglasses.
WRISTS/HANDS: BARE SKIN on BOTH hands AND BOTH wrists. NO WATCH (source has no visible watch — FORBIDDEN adding a watch). FORBIDDEN boxing/fighter/MMA/fingerless gloves, wraps, wristbands.
FORBIDDEN: black tank (Dinarte), missing cap, missing white sunglasses, missing silver chain, missing right-forearm tattoo when right arm visible, adding a watch, shoe/outfit/hair/cap swap between frames, gloves of any kind.
ARMS: SMOOTH / LISOS — ZERO visible muscles. BODY: NORMAL average lean male — NOT muscular/buff (Dinarte-ONLY musculature FORBIDDEN).
GAZE HARD LOCK: Head in 3/4 fighting-game profile looking RIGHT at the opponent (Dinarte idle head angle). Nose and cap brim point RIGHT — NOT at the camera. FORBIDDEN: full-front portrait, camera stare, both ears equally visible like a photo. (Victory shout may turn slightly toward camera; idle/walk/attack MUST look at opponent.)
WALK HARD LOCK (walk_01/walk_02): mid-stride walking — one leg clearly forward, the other back, rear heel lifted, arms counter-swinging. FORBIDDEN: idle planted-feet stance, both fists at chest like idle.
${cap}
${glasses}
${beard}
${tattoo}
${idle02}
${victory}
BACKGROUND/SCENE: EXACTLY ONE character in a single 576x576 frame. HARD FAIL: collage, contact sheet, sprite sheet, 2+ figures.
Solid magenta (#FF00FF).
${scale}`;
  }

  /**
   * Tiago identity lock: charcoal DIESEL allover tee, black glasses, watch L, dark pants, white sneakers.
   */
  private tiagoIdentityAddon(frameName?: string): string {
    const scale =
      ' SCALE HARD LOCK: Match idle_01 FOOTPRINT in 576x576 — SAME head-to-toe height and margins (~70-80% canvas height). NOT small. NOT miniature multi-sprites. NOT zoomed out. NOT larger than idle_01.';
    const hair =
      frameName === 'lying'
        ? ' HAIR HARD LOCK (lying): EXACT same short dark spiky/textured upright top as idle_01 — same color, length, silhouette. FORBIDDEN different haircut.'
        : ' HAIR LOCK: EXACT same short dark spiky/textured upright top as idle_01 across all frames.';
    const glasses =
      ' GLASSES HARD LOCK: thick black rectangular eyeglasses on EVERY frame (including lying). FORBIDDEN missing glasses, round glasses, tinted lenses.';
    return ` TIAGO LOCKED IDENTITY (from source card / face_master — HARD FAIL IF WRONG):
OUTFIT (EXACT match across ALL frames):
- Charcoal/grey crew-neck short-sleeve t-shirt with dense all-over black "DIESEL" wordmark pattern (repeating block lettering across the whole tee).
- Dark navy or black casual trousers/pants (SAME color every frame).
- Clean solid white sneakers with white laces — SAME shoes every frame (FORBIDDEN black boots, dark sneakers, shoe color swap).
- Thick black sports/digital watch on LEFT wrist (keep on every frame where wrist visible).
FACE: friendly light-to-medium skin; clean-shaven; thick black rectangular glasses ALWAYS on.
FORBIDDEN: black tank (Dinarte), plain tee without DIESEL pattern, missing glasses, missing watch, shoe/outfit/hair swap between frames, gloves of any kind.
HANDS: BARE SKIN (watch on left wrist only — NOT boxing gloves / wraps / fingerless gloves).
ARMS: SMOOTH / LISOS — ZERO visible muscles. BODY: NORMAL average male — NOT muscular/buff (Dinarte-ONLY musculature FORBIDDEN).
${hair}
${glasses}
BACKGROUND/SCENE: EXACTLY ONE character in a single 576x576 frame. HARD FAIL: collage, contact sheet, sprite sheet, 2+ figures.
Solid magenta (#FF00FF).
${scale}`;
  }

  /**
   * Ricardo identity lock: royal-blue UA tee, smooth arms, NORMAL body, dark athletic pants.
   */
  private ricardoIdentityAddon(frameName?: string): string {
    const scale =
      ' SCALE HARD LOCK: Match idle_01 FOOTPRINT in 576x576 — SAME head-to-toe height and margins (~70-80% canvas height). NOT small. NOT miniature multi-sprites. NOT zoomed out. NOT larger than idle_01.';
    const hair =
      frameName === 'lying'
        ? ' HAIR HARD LOCK (lying): EXACT same short dark buzz cut as idle_01 — same color, length, silhouette. FORBIDDEN different haircut, longer hair, different volume.'
        : ' HAIR LOCK: EXACT same short dark buzz cut as idle_01 across all frames.';
    return ` RICARDO LOCKED IDENTITY (from approved idle_01 — HARD FAIL IF WRONG):
OUTFIT (EXACT match to idle_01):
- Royal-blue crew-neck short-sleeve t-shirt with large light-blue Under Armour logo centered on the chest.
- Dark charcoal/black athletic pants.
- Dark sneakers.
FORBIDDEN: black tank (Dinarte), polo, boxing/fighter outfit, gloves of any kind, watches, wristbands.
HANDS/WRISTS: BARE SKIN ONLY on BOTH hands AND BOTH wrists.
ARMS: SMOOTH / LISOS — ZERO visible muscles (no biceps, triceps, delts, forearm cuts, veins). Soft flat cylindrical arms like a non-athlete.
BODY: NORMAL average everyday male — NOT skinny/slim, NOT muscular/buff/ripped. Muscular arms are Dinarte-ONLY — NEVER for Ricardo.
${hair}
BACKGROUND/SCENE: EXACTLY ONE character in a single 576x576 frame. HARD FAIL: collage, contact sheet, sprite sheet, 2+ figures.
Solid magenta (#FF00FF).
${scale}`;
  }

  /**
   * Caio identity lock: plain black crew-neck tee, silver chain, right-ear stud,
   * dark charcoal jeans, black sneakers, fade + beard. No watch in source.
   */
  private caioIdentityAddon(frameName?: string): string {
    const scale =
      ' SCALE HARD LOCK: Match idle_01 FOOTPRINT in 576x576 — SAME head-to-toe height and margins (~70-80% canvas height). NOT small. NOT miniature multi-sprites. NOT zoomed out. NOT larger than idle_01.';
    const hair =
      frameName === 'lying'
        ? ' HAIR HARD LOCK (lying): EXACT same short dark fade (textured top, faded sides) as idle_01 — same color, length, silhouette. FORBIDDEN different haircut.'
        : ' HAIR LOCK: EXACT same short dark fade (textured top, faded sides) as idle_01 across all frames.';
    const idle02 =
      frameName === 'idle_02'
        ? ' IDLE_02 LOW GUARD HARD FAIL: SAME idle stance / legs / 3/4 RIGHT gaze as idle_01, but BOTH fists MUST drop to WAIST/HIP height (guarda baixa). Elbows more relaxed. FORBIDDEN chest-height clone of idle_01. Fists clearly LOWER than idle_01.'
        : frameName === 'attack'
          ? ' ATTACK HARD LOCK: SAME SCALE as idle_01 (head near top, feet near bottom — NOT small). EXACTLY TWO ARMS. RIGHT punch fully extended to the RIGHT (Dinarte). LEFT fist chambered at waist. Left arm hidden — OMIT watch. FORBIDDEN extra/ghost/third arm. FORBIDDEN watch on punching RIGHT wrist.'
          : frameName === 'victory'
            ? ' VICTORY HARD LOCK: EXACTLY TWO ARMS. RIGHT arm straight UP, fist ABOVE head. LEFT fist at waist. FORBIDDEN extra/ghost arm, idle-with-raised-arm hybrid. Watch LEFT only if visible — NEVER on the raised RIGHT arm.'
            : frameName === 'lying'
              ? ' LYING HARD LOCK: FLAT on the ground (head LEFT, feet RIGHT), body on baseline — NOT floating, NOT sitting knees-up. Left arm may be hidden — OMIT watch rather than putting it on the right wrist.'
              : '';
    const watch =
      frameName === 'attack' || frameName === 'lying'
        ? ' WATCH: left arm hidden in this pose — OMIT the watch. FORBIDDEN placing a watch on the visible RIGHT wrist.'
        : ' WATCH: source has NO watch — keep BOTH wrists BARE. If a watch is ever generated on idle_01 it MUST stay on the LEFT wrist in other frames; NEVER move it to the right wrist.';
    return ` CAIO LOCKED IDENTITY (from source card / face_master / body_master — HARD FAIL IF WRONG):
OUTFIT (EXACT match across ALL frames):
- PLAIN black crew-neck short-sleeve t-shirt (no logo required; SAME tee every frame).
- Thin silver chain necklace over the tee collar on EVERY upright frame.
- Small silver/white stud earring in the RIGHT ear.
- Dark charcoal jeans (NOT cargo, NOT shorts, NOT light-wash) — SAME pants every frame.
- Black sneakers with white soles / midsoles — SAME shoes every frame.
FACE: medium-tan / warm-tan skin; short dark fade hair (textured top, faded sides); groomed short dark beard + mustache connected along the jaw.
WRISTS/HANDS: BARE SKIN on BOTH hands AND BOTH wrists. NO WATCH (source has no visible watch — FORBIDDEN adding a watch). FORBIDDEN boxing/fighter/MMA/fingerless gloves, wraps, wristbands.
FORBIDDEN: black tank (Dinarte), missing silver chain, missing RIGHT-ear stud, shoe/outfit/hair/beard swap between frames, gloves of any kind, inventing a watch on the RIGHT wrist.
ARMS: SMOOTH / LISOS — ZERO visible muscles. BODY: NORMAL average lean male — NOT muscular/buff (Dinarte-ONLY musculature FORBIDDEN). Source-card muscles are WRONG.
GAZE HARD LOCK: Head in 3/4 fighting-game profile looking RIGHT at the opponent (Dinarte idle head angle). Nose points RIGHT — NOT at the camera. FORBIDDEN: full-front portrait, camera stare, both ears equally visible like a photo. (Victory shout may turn slightly toward camera; idle/walk/attack MUST look at opponent.)
WALK HARD LOCK (walk_01/walk_02): mid-stride walking — one leg clearly forward, the other back, rear heel lifted, arms counter-swinging. FORBIDDEN: idle planted-feet stance, both fists at chest like idle.
${hair}
${watch}
${idle02}
BACKGROUND/SCENE: EXACTLY ONE character in a single 576x576 frame. HARD FAIL: collage, contact sheet, sprite sheet, 2+ figures.
Solid magenta (#FF00FF).
${scale}`;
  }

  /**
   * Daniel identity lock: white polo, dark blue jeans, white slip-ons, right-arm
   * sleeve tattoo, gold watch LEFT wrist. Distinct from locked participant david.
   */
  private danielIdentityAddon(frameName?: string): string {
    const scale =
      ' SCALE HARD LOCK: Match idle_01 FOOTPRINT in 576x576 — SAME head-to-toe height and margins (~70-80% canvas height). NOT small. NOT miniature multi-sprites. NOT zoomed out. NOT larger than idle_01.';
    const hair =
      frameName === 'lying'
        ? ' HAIR HARD LOCK (lying): EXACT same short dark fade (textured top, faded sides) as idle_01 — same color, length, silhouette. FORBIDDEN different haircut.'
        : ' HAIR LOCK: EXACT same short dark fade (textured top, faded sides) as idle_01 across all frames.';
    const tattoo =
      ' TATTOO HARD LOCK: dense black sleeve tattoo covering the RIGHT arm (shoulder to wrist) whenever the right arm is visible. NEVER put the tattoo on the left arm. If the right arm is hidden, omit the tattoo rather than moving it.';
    const idle02 =
      frameName === 'idle_02'
        ? ' IDLE_02 LOW GUARD HARD FAIL: SAME idle stance / legs / 3/4 RIGHT gaze as idle_01, but BOTH fists MUST drop to WAIST/HIP height (guarda baixa). Elbows more relaxed. FORBIDDEN chest-height clone of idle_01. Fists clearly LOWER than idle_01. Gold watch stays on LEFT wrist.'
        : frameName === 'attack'
          ? ' ATTACK HARD LOCK: SAME SCALE as idle_01 (head near top, feet near bottom — NOT small). EXACTLY TWO ARMS. RIGHT punch fully extended to the RIGHT (Dinarte) with sleeve tattoo visible. LEFT fist chambered at waist. Left arm hidden — OMIT gold watch. FORBIDDEN extra/ghost/third arm. FORBIDDEN adding a watch onto the punching RIGHT wrist if omitting.'
          : frameName === 'victory'
            ? ' VICTORY HARD LOCK: EXACTLY TWO ARMS. RIGHT arm straight UP, fist ABOVE head (tattoo sleeve visible). LEFT fist at waist with GOLD watch on LEFT wrist. Mouth open — metal braces visible. FORBIDDEN extra/ghost arm, idle-with-raised-arm hybrid. NEVER put the watch on the raised RIGHT arm.'
            : frameName === 'lying'
              ? ' LYING HARD LOCK: FLAT on the ground (head LEFT, feet RIGHT), body on baseline — NOT floating, NOT sitting knees-up. OMIT gold watch (do not relocate it).'
              : '';
    const watch =
      frameName === 'attack' || frameName === 'lying'
        ? ' WATCH: this pose hides or grounds the wrists — OMIT the gold watch rather than moving it to the other wrist.'
        : ' WATCH HARD LOCK: chunky GOLD watch on LEFT wrist whenever the left wrist is visible (same laterality as idle_01). NEVER put the watch on the right wrist.';
    return ` DANIEL LOCKED IDENTITY (from source card / face_master / body_master — HARD FAIL IF WRONG):
THIS IS DANIEL — NOT DAVID. Do not use David's identity.
OUTFIT (EXACT match across ALL frames):
- WHITE short-sleeve polo shirt with collar (plain, no loud logo) — SAME polo every frame.
- Dark blue slim-fit denim jeans — SAME jeans every frame (NOT cargo, NOT shorts, NOT black pants).
- White slip-on canvas sneakers (Vans-style) with thin white soles — SAME shoes every frame.
- Keys hanging from the RIGHT hip belt loop when the hip is visible.
FACE: light-tan / light-brown skin; short dark fade hair; thin dark mustache + small goatee; metal braces visible when the mouth is open (hurt/victory).
RIGHT ARM: dense black sleeve tattoo whenever visible.
LEFT WRIST: chunky GOLD watch whenever the left wrist is visible.
WRISTS/HANDS: BARE SKIN fists (watch LEFT only). FORBIDDEN boxing/fighter/MMA/fingerless gloves, wraps.
FORBIDDEN: black tank (Dinarte), confusing Daniel with David, missing white polo, missing right-arm tattoo when right arm visible, watch on RIGHT wrist, shoe/outfit/hair swap between frames, gloves of any kind.
ARMS: SMOOTH / LISOS — ZERO visible muscles. BODY: NORMAL average lean male — NOT muscular/buff (Dinarte-ONLY musculature FORBIDDEN).
GAZE HARD LOCK: Head in 3/4 fighting-game profile looking RIGHT at the opponent (Dinarte idle head angle). Nose points RIGHT — NOT at the camera. FORBIDDEN: full-front portrait, camera stare. (Victory shout may turn slightly toward camera; idle/walk/attack MUST look at opponent.)
WALK HARD LOCK (walk_01/walk_02): mid-stride walking — one leg clearly forward, the other back, rear heel lifted, arms counter-swinging. FORBIDDEN: idle planted-feet stance, both fists at chest like idle.
${hair}
${tattoo}
${watch}
${idle02}
BACKGROUND/SCENE: EXACTLY ONE character in a single 576x576 frame. HARD FAIL: collage, contact sheet, sprite sheet, 2+ figures.
Solid magenta (#FF00FF).
${scale}`;
  }

  /**
   * Fabio identity lock: navy blazer, white open shirt, chest tattoo, navy pants,
   * white sneakers, silver watch LEFT. Smooth arms. Not Joao (no magenta tie).
   */
  private fabioIdentityAddon(frameName?: string): string {
    const scale =
      ' SCALE HARD LOCK: Match idle_01 FOOTPRINT in 576x576 — SAME head-to-toe height and margins (~70-80% canvas height). NOT small. NOT miniature multi-sprites. NOT zoomed out. NOT larger than idle_01.';
    const hair =
      frameName === 'lying'
        ? ' HAIR HARD LOCK (lying): EXACT same short dark fade (textured top, faded sides) as idle_01 — same color, length, silhouette. FORBIDDEN different haircut.'
        : ' HAIR LOCK: EXACT same short dark fade (textured top, faded sides) as idle_01 across all frames.';
    const idle02 =
      frameName === 'idle_02'
        ? ' IDLE_02 LOW GUARD HARD FAIL: SAME idle stance / legs / 3/4 RIGHT gaze as idle_01, but BOTH fists MUST drop to WAIST/HIP height (guarda baixa). Elbows more relaxed. FORBIDDEN chest-height clone of idle_01. Fists clearly LOWER than idle_01.'
        : frameName === 'attack'
          ? ' ATTACK HARD LOCK: SAME SCALE as idle_01 (head near top, feet near bottom — NOT small). EXACTLY TWO ARMS. RIGHT punch fully extended to the RIGHT (Dinarte). LEFT fist chambered at waist. Left arm hidden — OMIT watch. FORBIDDEN extra/ghost/third arm. FORBIDDEN watch on punching RIGHT wrist.'
          : frameName === 'victory'
            ? ' VICTORY HARD LOCK: EXACTLY TWO ARMS. RIGHT arm straight UP, fist ABOVE head. LEFT fist at waist with silver watch if left wrist visible. FORBIDDEN extra/ghost arm, idle-with-raised-arm hybrid. Watch LEFT only — NEVER on the raised RIGHT arm.'
            : frameName === 'lying'
              ? ' LYING HARD LOCK: FLAT on the ground (head LEFT, feet RIGHT), body on baseline — NOT floating, NOT sitting knees-up. Left arm may be hidden — OMIT watch rather than putting it on the right wrist.'
              : '';
    const watch =
      frameName === 'attack' || frameName === 'lying'
        ? ' WATCH: left arm hidden in this pose — OMIT the silver watch. FORBIDDEN placing a watch on the visible RIGHT wrist.'
        : ' WATCH HARD LOCK: silver watch on LEFT wrist whenever the left wrist is visible (same laterality as idle_01). NEVER put the watch on the right wrist.';
    return ` FABIO LOCKED IDENTITY (from source card / face_master / body_master — HARD FAIL IF WRONG):
THIS IS FABIO — NOT JOAO (Joao has magenta necktie + polished dress shoes) and NOT JAILSON (Jailson has glasses + black tee + jeans).
OUTFIT (EXACT match across ALL frames):
- Navy blue tailored blazer/suit jacket with lapels (SAME jacket every frame).
- WHITE button-down dress shirt, top buttons OPEN, NO necktie — dark CHEST TATTOO visible in the open collar V.
- Matching navy dress pants (NOT jeans, NOT cargo, NOT joggers) — SAME pants every frame.
- Bright WHITE sneakers with white laces — SAME shoes every frame (FORBIDDEN dress shoes, black sneakers, shoe color swap).
FACE: medium-tan / olive skin; short dark fade hair (textured top brushed slightly up); thin dark mustache + small neat goatee.
LEFT WRIST: silver watch whenever the left wrist is visible.
FORBIDDEN: magenta necktie, dress shoes, black tank (Dinarte), glasses, jeans, missing blazer, missing chest tattoo, missing white sneakers, gloves of any kind, watch on RIGHT wrist.
ARMS: SMOOTH / LISOS — ZERO visible muscles. BODY: NORMAL average lean male — NOT muscular/buff (Dinarte-ONLY musculature FORBIDDEN).
GAZE HARD LOCK: Head in 3/4 fighting-game profile looking RIGHT at the opponent (Dinarte idle head angle). Nose points RIGHT — NOT at the camera. FORBIDDEN: full-front portrait, camera stare. (Victory shout may turn slightly toward camera; idle/walk/attack MUST look at opponent.)
WALK HARD LOCK (walk_01/walk_02): mid-stride walking — one leg clearly forward, the other back, rear heel lifted, arms counter-swinging. FORBIDDEN: idle planted-feet stance, both fists at chest like idle.
SAME CHARACTER AS idle_01: EXACT same body mass, LEG THICKNESS (thigh/calf silhouette), navy blazer cut/lapels/length, navy dress-pants fabric/color/width, WHITE sneakers, face and hair rendering. FORBIDDEN: skinnier/thicker legs than idle_01, different jacket cut, different pants, different shoes, different artist/style, idle clone.
${hair}
${watch}
${idle02}
BACKGROUND/SCENE: EXACTLY ONE character in a single 576x576 frame. HARD FAIL: collage, contact sheet, sprite sheet, 2+ figures.
Solid magenta (#FF00FF).
${scale}`;
  }

  /**
   * Hiago identity lock: oversized black "TOP" tee, olive cargo joggers,
   * black-and-white sneakers, round black glasses, chain+pendant, watch LEFT.
   * Smooth arms. Reserve fighter (not Izaias).
   */
  private hiagoIdentityAddon(frameName?: string): string {
    const scale =
      ' SCALE HARD LOCK: Match idle_01 FOOTPRINT in 576x576 — SAME head-to-toe height and margins (~70-80% canvas height). NOT small. NOT miniature multi-sprites. NOT zoomed out. NOT larger than idle_01.';
    const hair =
      frameName === 'lying'
        ? ' HAIR HARD LOCK (lying): EXACT same thick voluminous dark wavy-curly quiff as idle_01 — same color, length, silhouette. FORBIDDEN short fade, buzz, different haircut.'
        : ' HAIR LOCK: EXACT same thick voluminous dark wavy-curly quiff (volume on top, shorter sides) as idle_01 across all frames.';
    const idle02 =
      frameName === 'idle_02'
        ? ' IDLE_02 LOW GUARD HARD FAIL: SAME idle stance / legs / 3/4 RIGHT gaze as idle_01, but BOTH fists MUST drop to WAIST/HIP height (guarda baixa). Elbows more relaxed. FORBIDDEN chest-height clone of idle_01. Fists clearly LOWER than idle_01.'
        : frameName === 'attack'
          ? ' ATTACK HARD LOCK: SAME SCALE as idle_01 (head near top, feet near bottom — NOT small). EXACTLY TWO ARMS. RIGHT punch fully extended to the RIGHT (Dinarte). LEFT fist chambered at waist. Left arm hidden — OMIT watch. FORBIDDEN extra/ghost/third arm. FORBIDDEN watch on punching RIGHT wrist. Keep round black glasses.'
          : frameName === 'victory'
            ? ' VICTORY HARD LOCK: EXACTLY TWO ARMS. RIGHT arm straight UP, fist ABOVE head. LEFT fist at waist with dark watch if left wrist visible. FORBIDDEN extra/ghost arm, idle-with-raised-arm hybrid. Watch LEFT only — NEVER on the raised RIGHT arm. Gaze 3/4 RIGHT (may be slightly more frontal if shouting). Keep glasses.'
            : frameName === 'lying'
              ? ' LYING HARD LOCK: FLAT on the ground (head LEFT, feet RIGHT), body on baseline — NOT floating, NOT sitting knees-up. Left arm may be hidden — OMIT watch rather than putting it on the right wrist. Keep glasses if the face is visible.'
              : '';
    const watch =
      frameName === 'attack' || frameName === 'lying'
        ? ' WATCH: left arm hidden in this pose — OMIT the watch. FORBIDDEN placing a watch on the visible RIGHT wrist.'
        : ' WATCH HARD LOCK: dark/black watch on LEFT wrist whenever the left wrist is visible (same laterality as idle_01). NEVER put the watch on the right wrist.';
    return ` HIAGO LOCKED IDENTITY (from source card / face_master / body_master — HARD FAIL IF WRONG):
THIS IS HIAGO — NOT IZAIAS (Izaias has a charcoal-navy puffer jacket + white tee + charcoal jeans) and NOT CAIO (Caio has a beard, no glasses, charcoal jeans).
OUTFIT (EXACT match across ALL frames):
- Oversized black short-sleeve crew-neck t-shirt with small white "TOP" text on the LEFT chest (SAME tee every frame).
- Olive-green cargo jogger pants with large thigh pockets and elastic ankles (SAME pants every frame — NOT jeans, NOT black pants).
- Black-and-white low-top sneakers with white laces, white side stripe, white soles — SAME shoes every frame.
- Round thick BLACK-rimmed glasses ALWAYS on the face.
- Thin silver/dark chain necklace with a small dark circular pendant.
FACE: young male; light-medium tan/olive skin; NO facial hair; thick voluminous dark brown/black wavy-curly hair with a quiff on top and shorter sides.
LEFT WRIST: dark/black watch whenever the left wrist is visible.
FORBIDDEN: puffer jacket, beard, missing glasses, missing olive cargo, missing "TOP" tee, missing chain, black tank (Dinarte), shoe/outfit/hair swap between frames, gloves of any kind, watch on RIGHT wrist.
ARMS: SMOOTH / LISOS — ZERO visible muscles. BODY: NORMAL average lean young male — NOT muscular/buff (Dinarte-ONLY musculature FORBIDDEN).
GAZE HARD LOCK: Head in 3/4 fighting-game profile looking RIGHT at the opponent (Dinarte idle head angle). Nose points RIGHT — NOT at the camera. FORBIDDEN: full-front portrait, camera stare. (Victory shout may turn slightly toward camera; idle/walk/attack MUST look at opponent.)
WALK HARD LOCK (walk_01/walk_02): mid-stride walking — one leg clearly forward, the other back, rear heel lifted, arms counter-swinging. FORBIDDEN: idle planted-feet stance, both fists at chest like idle.
SAME CHARACTER AS idle_01: EXACT same body mass, LEG THICKNESS (thigh/calf silhouette), olive cargo cut/pockets, black oversized tee, black-and-white sneakers, glasses, face and hair rendering. FORBIDDEN: skinnier/thicker legs than idle_01, different pants, different shoes, different artist/style, idle clone.
${hair}
${watch}
${idle02}
BACKGROUND/SCENE: EXACTLY ONE character in a single 576x576 frame. HARD FAIL: collage, contact sheet, sprite sheet, 2+ figures, source-card UI (WDX / stats / green vortex).
Solid magenta (#FF00FF).
${scale}`;
  }

  /**
   * Kelvin identity lock: white polo with red/navy striped collar+cuffs, dark navy
   * pants, white sneakers with red accents, round black glasses, white earbuds,
   * watch LEFT. Smooth arms. Distinct from Daniel (no tattoo/braces) and Hiago.
   */
  private kelvinIdentityAddon(frameName?: string): string {
    const scale =
      ' SCALE HARD LOCK: Match idle_01 FOOTPRINT in 576x576 — SAME head-to-toe height and margins (~70-80% canvas height). NOT small. NOT miniature multi-sprites. NOT zoomed out. NOT larger than idle_01.';
    const hair =
      frameName === 'lying'
        ? ' HAIR HARD LOCK (lying): EXACT same short dark curly/textured taper fade (denser on top, shorter sides) as idle_01 — same color, length, silhouette. FORBIDDEN different haircut.'
        : ' HAIR LOCK: EXACT same short dark curly/textured taper fade (denser on top, shorter sides) as idle_01 across all frames.';
    const idle02 =
      frameName === 'idle_02'
        ? ' IDLE_02 LOW GUARD HARD FAIL: SAME idle stance / legs / 3/4 RIGHT gaze as idle_01, but BOTH fists MUST drop to WAIST/HIP height (guarda baixa). Elbows more relaxed. FORBIDDEN chest-height clone of idle_01. Fists clearly LOWER than idle_01. Glasses + earbuds stay on. Watch LEFT if visible.'
        : frameName === 'attack'
          ? ' ATTACK HARD LOCK: SAME SCALE as idle_01 (head near top, feet near bottom — NOT small). EXACTLY TWO ARMS. RIGHT punch fully extended to the RIGHT (Dinarte). LEFT fist chambered at waist. Left arm hidden — OMIT watch. FORBIDDEN extra/ghost/third arm. FORBIDDEN watch on punching RIGHT wrist. Keep round black glasses and white earbuds.'
          : frameName === 'victory'
            ? ' VICTORY HARD LOCK: EXACTLY TWO ARMS. RIGHT arm straight UP, fist ABOVE head. LEFT fist at waist with watch if left wrist visible. FORBIDDEN extra/ghost arm, idle-with-raised-arm hybrid. Watch LEFT only — NEVER on the raised RIGHT arm. Gaze 3/4 RIGHT (may be slightly more frontal if shouting). Keep glasses and earbuds.'
            : frameName === 'lying'
              ? ' LYING HARD LOCK: FLAT on the ground (head LEFT, feet RIGHT), body on baseline — NOT floating, NOT sitting knees-up. Left arm may be hidden — OMIT watch rather than putting it on the right wrist. Keep glasses if the face is visible.'
              : '';
    const watch =
      frameName === 'attack' || frameName === 'lying'
        ? ' WATCH: left arm hidden in this pose — OMIT the watch. FORBIDDEN placing a watch on the visible RIGHT wrist.'
        : ' WATCH HARD LOCK: silver/dark watch on LEFT wrist whenever the left wrist is visible (same laterality as idle_01). NEVER put the watch on the right wrist.';
    return ` KELVIN LOCKED IDENTITY (from source card / face_master / body_master — HARD FAIL IF WRONG):
THIS IS KELVIN — NOT DANIEL (Daniel has a right-arm tattoo, gold watch, braces, NO glasses, NO earbuds) and NOT HIAGO (Hiago has a black "TOP" tee + olive cargo).
OUTFIT (EXACT match across ALL frames):
- WHITE short-sleeve polo with red AND navy striped collar AND matching striped sleeve cuffs (SAME polo every frame).
- Dark navy / black trousers (SAME pants every frame — NOT cargo, NOT shorts, NOT jeans).
- White athletic sneakers with red accents on tongue/heel and dark soles — SAME shoes every frame.
- Round thick BLACK-rimmed glasses ALWAYS on the face.
- White wireless earbuds (AirPods) in BOTH ears ALWAYS.
FACE: young male; medium-tan / warm-brown skin; NO facial hair; short dark curly/textured taper fade (volume on top, shorter sides).
LEFT WRIST: silver/dark watch whenever the left wrist is visible.
FORBIDDEN: black tank (Dinarte), missing glasses, missing earbuds, missing collar stripes, Daniel tattoo, Hiago "TOP" tee, olive cargo, shoe/outfit/hair swap between frames, gloves of any kind, watch on RIGHT wrist.
ARMS: SMOOTH / LISOS — ZERO visible muscles. BODY: NORMAL slender/average lean young male — NOT muscular/buff (Dinarte-ONLY musculature FORBIDDEN).
GAZE HARD LOCK: Head in 3/4 fighting-game profile looking RIGHT at the opponent (Dinarte idle head angle). Nose points RIGHT — NOT at the camera. FORBIDDEN: full-front portrait, camera stare. (Victory shout may turn slightly toward camera; idle/walk/attack MUST look at opponent.)
WALK HARD LOCK (walk_01/walk_02): mid-stride walking — one leg clearly forward, the other back, rear heel lifted, arms counter-swinging. FORBIDDEN: idle planted-feet stance, both fists at chest like idle.
SAME CHARACTER AS idle_01: EXACT same body mass, LEG THICKNESS (thigh/calf silhouette), white polo cut, navy pants fabric/color/width, white sneakers with red accents, glasses, earbuds, face and hair rendering. FORBIDDEN: skinnier/thicker legs than idle_01, different pants, different shoes, different artist/style, idle clone.
${hair}
${watch}
${idle02}
BACKGROUND/SCENE: EXACTLY ONE character in a single 576x576 frame. HARD FAIL: collage, contact sheet, sprite sheet, 2+ figures, source-card UI (WDX / stats / green vortex).
Solid magenta (#FF00FF).
${scale}`;
  }

  /** Victory pose with explicit scale matching for Lívia. */
  private buildVictoryParts(
    request: GenerationRequest,
    sourceB64: string,
    faceB64: string,
    templateB64: string
  ): { parts: any[]; baseRule: string } {
    const parts: any[] = [];
    const hasPoseRef = !!(request.poseReferenceImage && fs.existsSync(request.poseReferenceImage));

    if (hasPoseRef) {
      parts.push({
        text: 'IMAGE 1 (POSE + SCALE ONLY — Dinarte victory): Copy fist-raise pose AND character size/footprint in the canvas. Ignore clothes/gender.',
      });
      parts.push(pngPart(request.poseReferenceImage!));
      parts.push({ text: 'IMAGE 1 AGAIN (confirm SCALE — same margins, not zoomed):' });
      parts.push(pngPart(request.poseReferenceImage!));
      if (
        request.participantId === 'leonardo' ||
        request.participantId === 'alexandre' ||
        request.participantId === 'ryan' ||
        request.participantId === 'fernando' ||
        request.participantId === 'caio' ||
        request.participantId === 'evellyn' ||
        request.participantId === 'fabio' ||
        request.participantId === 'hiago' ||
        request.participantId === 'kelvin'
      ) {
        parts.push({
          text: 'IMAGE 1 A 3RD TIME (Dinarte victory — RIGHT arm straight UP above head is MANDATORY):',
        });
        parts.push(pngPart(request.poseReferenceImage!));
      }
    } else {
      parts.push({ text: 'POSE TEMPLATE (victory):' });
      parts.push({ inlineData: { data: templateB64, mimeType: 'image/png' } });
    }

    if (request.approvedMaster && fs.existsSync(request.approvedMaster)) {
      if (request.participantId === 'leonardo') {
        // NEVER attach idle_01 (full body OR scale chip) — it contaminates victory into idle guard.
        // Scale comes from Dinarte IMAGE 1; identity from text + source card + face.
        parts.push({
          text: 'LEONARDO IDENTITY (TEXT LOCK — no idle pose image): light heather-gray polo with TWO thin dark navy stripes on collar AND sleeve cuffs; medium-blue jeans; white/light sneakers; short salt-and-pepper hair; light stubble; NORMAL average body with SMOOTH non-muscular arms; BARE hands. Pose MUST be Dinarte victory only (RIGHT arm straight UP above head). Footprint ~70-80% of 576x576 like IMAGE 1.',
        });
        parts.push({
          text: 'CLOTHES COLOR REF (source card — outfit colors only, ignore photo pose):',
        });
        parts.push({ inlineData: { data: sourceB64, mimeType: 'image/jpeg' } });
        if (hasPoseRef) {
          parts.push({
            text: 'POSE OVERRIDE (Dinarte victory — CRITICAL): RIGHT arm straight vertical UP, fist ABOVE the head near top of canvas. LEFT fist at hip/waist. Legs wide. Mouth open celebrating.',
          });
          parts.push(pngPart(request.poseReferenceImage!));
          parts.push({
            text: 'POSE OVERRIDE AGAIN: If fists are both near chest = FAIL. Raised victory fist above head is MANDATORY.',
          });
          parts.push(pngPart(request.poseReferenceImage!));
        }
      } else if (request.participantId === 'alexandre') {
        // NEVER attach idle_01 full body — it contaminates victory into idle guard.
        parts.push({
          text: 'ALEXANDRE IDENTITY (TEXT LOCK — no idle pose image): black baseball cap brim forward; thick WHITE-framed sunglasses; salt-and-pepper beard with GREY/WHITE chin; silver chain; black short-sleeve tee with subtle dark chest pattern; black athletic shorts; black sneakers; dense black tattoo on RIGHT forearm only; NO watch; NORMAL average body with SMOOTH non-muscular arms; BARE hands. Pose MUST be Dinarte victory only (RIGHT arm straight UP above head, LEFT fist at waist). EXACTLY TWO ARMS. Footprint ~70-80% of 576x576 like IMAGE 1.',
        });
        parts.push({
          text: 'CLOTHES COLOR REF (source card — outfit colors only, ignore photo pose):',
        });
        parts.push({ inlineData: { data: sourceB64, mimeType: 'image/jpeg' } });
        if (hasPoseRef) {
          parts.push({
            text: 'POSE OVERRIDE (Dinarte victory — CRITICAL): RIGHT arm straight vertical UP, fist ABOVE the head near top of canvas. LEFT fist at hip/waist. Legs wide. Mouth open celebrating. EXACTLY TWO ARMS — FORBIDDEN extra/ghost arms.',
          });
          parts.push(pngPart(request.poseReferenceImage!));
          parts.push({
            text: 'POSE OVERRIDE AGAIN: If fists are both near chest = FAIL. Raised victory fist above head is MANDATORY.',
          });
          parts.push(pngPart(request.poseReferenceImage!));
        }
      } else if (request.participantId === 'ryan') {
        // NEVER attach idle_01 full body — it contaminates victory into idle guard + ghost extra arm.
        parts.push({
          text: 'RYAN IDENTITY (TEXT LOCK — no idle pose image): black polo with BRIGHT LIME GREEN collar AND lime-green sleeve bands; ESPERANCA DISTRIBUIDORA DE FRIOS left-chest logo; black backpack ON THE BACK (straps on shoulders, hands do NOT grab straps); black pants; black sneakers white soles; short dark hair; dark stubble; NO watch; NORMAL average body with SMOOTH non-muscular arms; BARE hands. Pose MUST be Dinarte victory only (RIGHT arm straight UP above head, LEFT fist at waist). EXACTLY TWO ARMS. Footprint ~70-80% of 576x576 like IMAGE 1.',
        });
        parts.push({
          text: 'CLOTHES COLOR REF (source card — outfit colors only, ignore photo pose):',
        });
        parts.push({ inlineData: { data: sourceB64, mimeType: 'image/jpeg' } });
        if (hasPoseRef) {
          parts.push({
            text: 'POSE OVERRIDE (Dinarte victory — CRITICAL): RIGHT arm straight vertical UP, fist ABOVE the head near top of canvas. LEFT fist at hip/waist. Legs wide. Mouth open celebrating. EXACTLY TWO ARMS — FORBIDDEN extra/ghost arms / third limb.',
          });
          parts.push(pngPart(request.poseReferenceImage!));
          parts.push({
            text: 'POSE OVERRIDE AGAIN: If fists are both near chest = FAIL. If three arms = FAIL. Raised victory fist above head is MANDATORY.',
          });
          parts.push(pngPart(request.poseReferenceImage!));
        }
      } else if (request.participantId === 'fernando') {
        // NEVER attach idle_01 full body — it contaminates victory into idle guard + ghost extra arm.
        parts.push({
          text: 'FERNANDO IDENTITY (TEXT LOCK — no idle pose image): black short-sleeve polo with BRIGHT LIME GREEN collar AND matching green sleeve cuffs; small green/white chest logo; black jogger pants; black sneakers with white soles; dark curly hair volume on top with fade sides; thin mustache + goatee; silver stud earrings; NO watch; NORMAL average body with SMOOTH non-muscular arms; BARE hands. Pose MUST be Dinarte victory only (RIGHT arm straight UP above head, LEFT fist at waist). EXACTLY TWO ARMS. Footprint ~70-80% of 576x576 like IMAGE 1.',
        });
        parts.push({
          text: 'CLOTHES COLOR REF (source card — outfit colors only, ignore photo pose):',
        });
        parts.push({ inlineData: { data: sourceB64, mimeType: 'image/jpeg' } });
        if (hasPoseRef) {
          parts.push({
            text: 'POSE OVERRIDE (Dinarte victory — CRITICAL): RIGHT arm straight vertical UP, fist ABOVE the head near top of canvas. LEFT fist at hip/waist. Legs wide. Mouth open celebrating. EXACTLY TWO ARMS — FORBIDDEN extra/ghost arms / third limb.',
          });
          parts.push(pngPart(request.poseReferenceImage!));
          parts.push({
            text: 'POSE OVERRIDE AGAIN: If fists are both near chest = FAIL. If three arms = FAIL. Raised victory fist above head is MANDATORY.',
          });
          parts.push(pngPart(request.poseReferenceImage!));
        }
      } else if (request.participantId === 'caio') {
        // NEVER attach idle_01 full body — it contaminates victory into idle guard + ghost extra arm.
        parts.push({
          text: 'CAIO IDENTITY (TEXT LOCK — no idle pose image): PLAIN black crew-neck short-sleeve t-shirt; thin silver chain over collar; small silver stud in RIGHT ear; dark charcoal jeans; black sneakers with white soles; short dark fade hair; groomed short dark beard + mustache; medium-tan skin; NO watch; NORMAL average body with SMOOTH non-muscular arms; BARE hands. Pose MUST be Dinarte victory only (RIGHT arm straight UP above head, LEFT fist at waist). EXACTLY TWO ARMS. Footprint ~70-80% of 576x576 like IMAGE 1.',
        });
        parts.push({
          text: 'CLOTHES COLOR REF (source card — outfit colors only, ignore photo pose):',
        });
        parts.push({ inlineData: { data: sourceB64, mimeType: 'image/jpeg' } });
        if (hasPoseRef) {
          parts.push({
            text: 'POSE OVERRIDE (Dinarte victory — CRITICAL): RIGHT arm straight vertical UP, fist ABOVE the head near top of canvas. LEFT fist at hip/waist. Legs wide. Mouth open celebrating. EXACTLY TWO ARMS — FORBIDDEN extra/ghost arms / third limb.',
          });
          parts.push(pngPart(request.poseReferenceImage!));
          parts.push({
            text: 'POSE OVERRIDE AGAIN: If fists are both near chest = FAIL. If three arms = FAIL. Raised victory fist above head is MANDATORY.',
          });
          parts.push(pngPart(request.poseReferenceImage!));
        }
      } else if (request.participantId === 'evellyn') {
        // NEVER attach idle_01 full body — it contaminates victory into idle guard + ghost extra arm.
        parts.push({
          text: 'EVELLYN IDENTITY (TEXT LOCK — FEMALE — no idle pose image): WOMAN with long straight jet-black hair over both shoulders to mid-torso; medium tan/warm skin; PLAIN dark navy/charcoal short-sleeve crew-neck tee; dark charcoal pants; dark sneakers; BARE hands; NO watch; NO jewelry; NO glasses; NORMAL female body with SMOOTH non-muscular arms. Pose MUST be Dinarte victory only (RIGHT arm straight UP above head, LEFT fist at waist). EXACTLY TWO ARMS. Footprint ~70-80% of 576x576 like IMAGE 1.',
        });
        parts.push({
          text: 'CLOTHES COLOR REF (source card — outfit colors only, ignore photo pose):',
        });
        parts.push({ inlineData: { data: sourceB64, mimeType: 'image/jpeg' } });
        if (hasPoseRef) {
          parts.push({
            text: 'POSE OVERRIDE (Dinarte victory — CRITICAL): RIGHT arm straight vertical UP, fist ABOVE the head near top of canvas. LEFT fist at hip/waist. Legs wide. Mouth open celebrating. EXACTLY TWO ARMS — FORBIDDEN extra/ghost arms / third limb.',
          });
          parts.push(pngPart(request.poseReferenceImage!));
          parts.push({
            text: 'POSE OVERRIDE AGAIN: If fists are both near chest = FAIL. If three arms = FAIL. Raised victory fist above head is MANDATORY.',
          });
          parts.push(pngPart(request.poseReferenceImage!));
        }
      } else if (request.participantId === 'daniel') {
        // NEVER attach idle_01 full body — it contaminates victory into idle guard + ghost extra arm.
        parts.push({
          text: 'DANIEL IDENTITY (TEXT LOCK — no idle pose image): WHITE short-sleeve polo; dark blue slim jeans; white slip-on canvas sneakers; short dark fade hair; thin mustache + goatee; metal braces if mouth open; dense BLACK SLEEVE TATTOO on RIGHT arm; chunky GOLD watch on LEFT wrist (the waist fist, NEVER on the raised RIGHT arm); keys on RIGHT hip; SMOOTH arms. THIS IS DANIEL, NOT DAVID. Pose MUST be Dinarte victory only (RIGHT arm straight UP above head, LEFT fist at waist). EXACTLY TWO ARMS. Footprint ~70-80% of 576x576 like IMAGE 1.',
        });
        parts.push({
          text: 'CLOTHES COLOR REF (source card — outfit colors only, ignore photo pose):',
        });
        parts.push({ inlineData: { data: sourceB64, mimeType: 'image/jpeg' } });
        if (hasPoseRef) {
          parts.push({
            text: 'POSE OVERRIDE (Dinarte victory — CRITICAL): RIGHT arm straight vertical UP, fist ABOVE the head near top of canvas (tattoo sleeve on this raised arm). LEFT fist at hip/waist with GOLD watch. Legs wide. Mouth open celebrating (braces visible). EXACTLY TWO ARMS — FORBIDDEN extra/ghost arms / third limb.',
          });
          parts.push(pngPart(request.poseReferenceImage!));
          parts.push({
            text: 'POSE OVERRIDE AGAIN: If fists are both near chest = FAIL. If three arms = FAIL. Raised victory fist above head is MANDATORY. Watch stays LEFT.',
          });
          parts.push(pngPart(request.poseReferenceImage!));
        }
      } else if (request.participantId === 'fabio') {
        // NEVER attach idle_01 full body — it contaminates victory into idle guard + ghost extra arm.
        parts.push({
          text: 'FABIO IDENTITY (TEXT LOCK — no idle pose image): navy blue blazer with lapels; WHITE open-collar dress shirt NO necktie; dark chest tattoo in the open V; matching navy dress pants; bright WHITE sneakers; short dark fade hair; thin mustache + goatee; silver watch on LEFT wrist (the waist fist, NEVER on the raised RIGHT arm); NORMAL average body with SMOOTH non-muscular arms. THIS IS FABIO, NOT JOAO. Pose MUST be Dinarte victory only (RIGHT arm straight UP above head, LEFT fist at waist). EXACTLY TWO ARMS. Footprint ~70-80% of 576x576 like IMAGE 1.',
        });
        parts.push({
          text: 'CLOTHES COLOR REF (source card — outfit colors only, ignore photo pose):',
        });
        parts.push({ inlineData: { data: sourceB64, mimeType: 'image/jpeg' } });
        if (hasPoseRef) {
          parts.push({
            text: 'POSE OVERRIDE (Dinarte victory — CRITICAL): RIGHT arm straight vertical UP, fist ABOVE the head near top of canvas. LEFT fist at hip/waist with silver watch. Legs wide. Mouth open celebrating. EXACTLY TWO ARMS — FORBIDDEN extra/ghost arms / third limb.',
          });
          parts.push(pngPart(request.poseReferenceImage!));
          parts.push({
            text: 'POSE OVERRIDE AGAIN: If fists are both near chest = FAIL. If three arms = FAIL. Raised victory fist above head is MANDATORY. Watch stays LEFT.',
          });
          parts.push(pngPart(request.poseReferenceImage!));
        }
      } else if (request.participantId === 'hiago') {
        // NEVER attach idle_01 full body — it contaminates victory into idle guard + ghost extra arm.
        parts.push({
          text: 'HIAGO IDENTITY (TEXT LOCK — no idle pose image): oversized black short-sleeve tee with small white "TOP" on LEFT chest; olive-green cargo joggers; black-and-white sneakers; round thick BLACK glasses ALWAYS; thin chain with dark pendant; voluminous dark wavy-curly quiff; NO beard; dark watch on LEFT wrist (the waist fist, NEVER on the raised RIGHT arm); NORMAL average body with SMOOTH non-muscular arms. THIS IS HIAGO, NOT IZAIAS. Pose MUST be Dinarte victory only (RIGHT arm straight UP above head, LEFT fist at waist). EXACTLY TWO ARMS. Footprint ~70-80% of 576x576 like IMAGE 1. Gaze 3/4 RIGHT toward opponent (may be slightly more frontal if shouting).',
        });
        parts.push({
          text: 'CLOTHES COLOR REF (source card — outfit colors only, ignore photo pose):',
        });
        parts.push({ inlineData: { data: sourceB64, mimeType: 'image/jpeg' } });
        if (hasPoseRef) {
          parts.push({
            text: 'POSE OVERRIDE (Dinarte victory — CRITICAL): RIGHT arm straight vertical UP, fist ABOVE the head near top of canvas. LEFT fist at hip/waist with dark watch. Legs wide. Mouth open celebrating. EXACTLY TWO ARMS — FORBIDDEN extra/ghost arms / third limb. Keep round black glasses.',
          });
          parts.push(pngPart(request.poseReferenceImage!));
          parts.push({
            text: 'POSE OVERRIDE AGAIN: If fists are both near chest = FAIL. If three arms = FAIL. Raised victory fist above head is MANDATORY. Watch stays LEFT. Gaze 3/4 RIGHT (not camera).',
          });
          parts.push(pngPart(request.poseReferenceImage!));
        }
      } else if (request.participantId === 'kelvin') {
        // NEVER attach idle_01 full body without pose override — it can contaminate victory into idle guard.
        parts.push({
          text: 'KELVIN IDENTITY (TEXT LOCK — YOUTHFUL TEEN PROPORTIONS): Kelvin is a SLENDER, LEAN, YOUNG TEENAGER / YOUTH (15-18 years old build). Narrow shoulders, slim torso, slender smooth arms with NO adult biceps/bulges, slim legs, youthful head-to-body ratio (NOT adult, NOT buff, NOT broad-shouldered). WHITE short-sleeve polo with red AND navy striped collar AND matching striped sleeve cuffs; dark navy/black trousers; white sneakers with red accents; round thick BLACK glasses ALWAYS; white wireless earbuds in BOTH ears; short dark curly taper-fade; NO beard; silver/dark watch on LEFT wrist (the waist fist, NEVER on the raised RIGHT arm). THIS IS KELVIN, NOT DANIEL. Pose MUST be Dinarte victory only (RIGHT arm straight UP above head, LEFT fist at waist). EXACTLY TWO ARMS. Footprint ~70-80% of 576x576 like IMAGE 1. Gaze 3/4 RIGHT toward opponent (may be slightly more frontal if shouting).',
        });
        parts.push({
          text: 'CLOTHES COLOR REF (source card — outfit colors only, ignore photo pose):',
        });
        parts.push({ inlineData: { data: sourceB64, mimeType: 'image/jpeg' } });
        if (hasPoseRef) {
          parts.push({
            text: 'POSE OVERRIDE (Dinarte victory — CRITICAL): RIGHT arm straight vertical UP, fist ABOVE the head near top of canvas. LEFT fist at hip/waist with watch if visible. Legs wide. Mouth open celebrating. EXACTLY TWO ARMS — FORBIDDEN extra/ghost arms / third limb. Keep round black glasses and white earbuds.',
          });
          parts.push(pngPart(request.poseReferenceImage!));
          parts.push({
            text: 'POSE OVERRIDE AGAIN: If fists are both near chest = FAIL. If three arms = FAIL. Raised victory fist above head is MANDATORY. Watch stays LEFT. Gaze 3/4 RIGHT (not camera).',
          });
          parts.push(pngPart(request.poseReferenceImage!));
        }
      } else {
        if (request.participantId === 'livia') {
          parts.push({
            text: 'IMAGE 2 (IDENTITY — idle_01): Same red dress, RED sandals, silver clutch, hair, face. Do NOT copy idle pose. Do NOT enlarge beyond IMAGE 1 scale.',
          });
        } else if (request.participantId === 'rhussiana') {
          parts.push({
            text: 'IMAGE 2 (IDENTITY — idle_01): Same black strapless dress with babado above knee, GOLD sandals, NORMAL slim body, BARE hands, hair, face. Do NOT copy idle pose. Do NOT enlarge beyond IMAGE 1 scale. NO gloves. NO mini dress.',
          });
        } else if (request.participantId === 'ana') {
          parts.push({
            text: 'IMAGE 2 (IDENTITY — idle_01): FEMALE Ana, emerald green one-shoulder gown (LEFT strap, RIGHT shoulder bare), emerald sash, dark/emerald heels, high bun + face-framing strands, rose-pink glasses, gold hoops, BARE hands, NO watch. Do NOT copy idle pose. SAME scale as idle_01. NO gloves. NO male body.',
          });
        } else if (request.participantId === 'joao') {
          parts.push({
            text: 'IMAGE 2 (IDENTITY — idle_01): FULL formal charcoal/black SUIT with lapels, matching trousers, dark dress shirt, bright MAGENTA necktie, silver belt buckle, polished dress shoes, fade hair, beard, BARE hands. Do NOT copy idle pose. Do NOT enlarge/shrink beyond IMAGE 1 / idle_01 scale. NO gloves. NO polo.',
          });
        } else if (request.participantId === 'neto') {
          parts.push({
            text: 'IMAGE 2 (IDENTITY — idle_01): plain tight black short-sleeve tee, medium-blue denim jeans, black sneakers, fade hair, full beard, BARE hands. Do NOT copy idle pose. SAME scale as idle_01. NO gloves. NO cargo pants.',
          });
        } else if (request.participantId === 'leandro') {
          parts.push({
            text: 'IMAGE 2 (IDENTITY — idle_01): plain black crew-neck tee, dark cargo pants, black sneakers with white soles, NORMAL average body, BARE hands and BARE wrists. Do NOT copy idle pose. SAME scale as idle_01. NO gloves. NO watches.',
          });
        } else if (request.participantId === 'ricardo') {
          parts.push({
            text: 'IMAGE 2 (IDENTITY — idle_01): royal-blue crew-neck tee with light-blue Under Armour logo, dark athletic pants, dark sneakers, NORMAL average body with SMOOTH arms, BARE hands. Do NOT copy idle pose. SAME scale as idle_01. NO gloves.',
          });
        } else if (request.participantId === 'jailson') {
          parts.push({
            text: 'IMAGE 2 (IDENTITY — idle_01): dark navy open blazer/shirt rolled sleeves, black tee, DARK blue denim jeans (exact idle_01 dark denim — NOT light wash), brown belt gold buckle, pale-blue sneakers, glasses, BARE hands. Do NOT copy idle pose. SAME scale as idle_01. NO gloves. NO watch. PANTS must be DARK like idle_01.',
          });
        } else if (request.participantId === 'erikson') {
          parts.push({
            text: 'IMAGE 2 (IDENTITY ONLY — idle_01 clothes/face): navy Classic Cars tee, medium-blue jeans, white sneakers, thick gold chain, gold stud earrings, black smartwatch LEFT wrist, short dark textured hair, NORMAL smooth-armed body. Do NOT copy idle arm pose / guard fists. Pose comes ONLY from IMAGE 1 victory. SAME body scale as idle_01. NO gloves. NO Dinarte tank. NO third arm.',
          });
        } else if (request.participantId === 'ryan') {
          parts.push({
            text: 'IMAGE 2 (IDENTITY ONLY — idle_01 clothes/face): black polo with BRIGHT LIME GREEN collar AND lime-green sleeve bands, ESPERANÇA DISTRIBUIDORA DE FRIOS left-chest logo, black backpack straps, black pants, black sneakers white soles, short dark hair, dark stubble, NORMAL smooth-armed body, BARE wrists NO watch. Do NOT copy idle arm pose / guard fists. Pose comes ONLY from IMAGE 1 victory. SAME body scale as idle_01. NO gloves. NO third arm.',
          });
        } else {
          parts.push({
            text: 'IMAGE 2 (IDENTITY — idle_01): Same EXACT clothes, shoes, gloves/accessories, hair, face as this master. Do NOT invent a new outfit. Do NOT copy idle pose. Do NOT enlarge beyond IMAGE 1 scale.',
          });
        }
        parts.push(pngPart(request.approvedMaster));
      }
    }
    parts.push({ text: 'Face reference:' });
    parts.push({ inlineData: { data: faceB64, mimeType: 'image/png' } });

    let baseRule = `CRITICAL VICTORY: Match IMAGE 1 pose AND SCALE (same character height/margins in 576x576). NOT oversized vs idle_01.
Keep IMAGE 2 outfit EXACTLY (same dress/top, same shoes, same gloves/accessories as idle_01). NO outfit color swap.
Gaze may face CAMERA. Solid magenta (#FF00FF).`;
    if (request.participantId === 'livia') {
      baseRule = `CRITICAL VICTORY: Match IMAGE 1 pose AND SCALE (same character height/margins in 576x576). NOT oversized vs idle_01.
Keep IMAGE 2 outfit EXACTLY: RED sandals (NOT silver), silver clutch, red dress.
Gaze may face CAMERA. Solid magenta (#FF00FF). Lívia: RED heels locked. Silver clutch visible. Camera gaze OK.`;
    } else if (request.participantId === 'rhussiana') {
      baseRule = `CRITICAL VICTORY: Match IMAGE 1 pose AND SCALE (same character height/margins in 576x576). NOT oversized vs idle_01. NOT a different body scale than idle.
Keep IMAGE 2 outfit EXACTLY: black strapless dress WITH babado ending one finger above the knee, GOLD heeled sandals, NORMAL slim body, BARE HANDS.
FORBIDDEN: boxing/fighter/fingerless gloves, muscular bodybuilder physique, plump/gordinha body, mini mid-thigh dress.
Gaze may face CAMERA. Solid magenta (#FF00FF).`;
    } else if (request.participantId === 'ana') {
      baseRule = `CRITICAL VICTORY (ANA — FEMALE): Match IMAGE 1 Dinarte victory pose AND SCALE (RIGHT arm straight UP above head, LEFT fist at hip/waist, legs wide). NOT oversized vs idle_01.
Keep IMAGE 2 identity EXACTLY: FEMALE, emerald green one-shoulder gown (LEFT strap, RIGHT shoulder bare), emerald sash, dark/emerald heels, high bun, rose-pink glasses ALWAYS, gold hoops, BARE HANDS, NO WATCH, SMOOTH female arms.
FORBIDDEN: idle guard fists at chest, male body, Dinarte muscles, missing glasses, missing bun, boxing gloves.
Gaze may face CAMERA. Solid magenta (#FF00FF).`;
    } else if (request.participantId === 'joao') {
      baseRule = `CRITICAL VICTORY: Match IMAGE 1 pose AND SCALE (same character height/margins in 576x576). SAME footprint as idle_01 — NOT undersized, NOT oversized.
Keep IMAGE 2 outfit EXACTLY: charcoal/black formal SUIT jacket with lapels, matching suit trousers, dark dress shirt, bright MAGENTA necktie, silver belt buckle, polished dress shoes, BARE HANDS.
FORBIDDEN: polo, sleeveless, default fighter clothes, gloves of any kind, missing jacket, missing necktie.
Gaze may face CAMERA. Solid magenta (#FF00FF).`;
    } else if (request.participantId === 'neto') {
      baseRule = `CRITICAL VICTORY: Match IMAGE 1 pose AND SCALE (same character height/margins in 576x576). SAME footprint as idle_01 — NOT undersized, NOT oversized.
Keep IMAGE 2 outfit EXACTLY: plain tight black short-sleeve tee, medium-blue denim jeans (exact idle_01 blue), black sneakers, BARE HANDS.
FORBIDDEN: gloves of any kind, cargo pants, charcoal pants, gold necklace, generic fighter outfit.
Gaze may face CAMERA. Solid magenta (#FF00FF).`;
    } else if (request.participantId === 'leandro') {
      baseRule = `CRITICAL VICTORY: Match IMAGE 1 pose AND SCALE (same character height/margins in 576x576). SAME footprint as idle_01 — NOT undersized, NOT oversized.
Keep IMAGE 2 outfit EXACTLY: plain black crew-neck tee, dark cargo pants, black sneakers with white soles, NORMAL average body, BARE HANDS, BARE WRISTS.
FORBIDDEN: gloves of any kind, watches, wristbands, muscular redesign, multi-sprite collage.
Gaze may face CAMERA. Solid magenta (#FF00FF).`;
    } else if (request.participantId === 'ricardo') {
      baseRule = `CRITICAL VICTORY: Match IMAGE 1 pose AND SCALE (same character height/margins in 576x576). SAME footprint as idle_01 — NOT undersized, NOT oversized.
Keep IMAGE 2 outfit EXACTLY: royal-blue crew-neck tee with light-blue Under Armour logo, dark athletic pants, dark sneakers, NORMAL average body with SMOOTH arms, BARE HANDS.
FORBIDDEN: gloves, Dinarte tank, muscular redesign, multi-sprite collage.
Gaze may face CAMERA. Solid magenta (#FF00FF).`;
    } else if (request.participantId === 'jailson') {
      baseRule = `CRITICAL VICTORY: Match IMAGE 1 pose AND SCALE (same character height/margins in 576x576). SAME footprint as idle_01 — NOT undersized, NOT oversized.
Keep IMAGE 2 outfit EXACTLY: dark navy open blazer/shirt (rolled sleeves), black tee, DARK blue denim jeans matching idle_01 EXACTLY (NOT light-wash / NOT lighter blue), brown belt with gold buckle, pale-blue sneakers, glasses, BARE HANDS, NO WATCH.
PANTS HARD FAIL: light blue / light-wash / faded jeans. Must be the SAME dark denim as idle_01.
Gaze may face CAMERA. Solid magenta (#FF00FF).`;
    } else if (request.participantId === 'erikson') {
      baseRule = `CRITICAL VICTORY: Match IMAGE 1 (Dinarte victory) pose ONLY.
EXACTLY TWO ARMS: right arm straight UP with fist above head; left arm bent with fist near hip/waist.
HARD FAIL: third arm, ghost limb, idle chest-guard fists from IMAGE 2, collage.
IMAGE 2 is CLOTHES/FACE/HAIR/SHOES ONLY — NEVER copy idle arm positions from IMAGE 2.
Keep IMAGE 2 outfit EXACTLY: navy Classic Cars tee, medium-blue jeans, white sneakers, thick gold chain, gold studs, black smartwatch LEFT wrist, NORMAL smooth-armed body.
SAME body footprint/height as idle_01 (~70-80% canvas) — NOT undersized.
Gaze toward opponent RIGHT (3/4). Solid magenta (#FF00FF).`;
    } else if (request.participantId === 'leonardo') {
      baseRule = `CRITICAL VICTORY (Leonardo): Match IMAGE 1 / POSE OVERRIDE (Dinarte victory) silhouette EXACTLY.
POSE HARD LOCK: RIGHT arm straight vertical UP — fist ABOVE head near top of frame; LEFT fist at waist/hip; legs planted wide; celebrating shout.
HARD FAIL: idle fists-at-chest; both arms at chest; fist only near head (must be ABOVE); tiny; collage; third arm; buff bodybuilder arms.
NO idle_01 body image was provided — do NOT invent idle guard. Pose only from Dinarte IMAGE 1.
Outfit: gray polo with navy collar/cuff stripes, blue jeans, light sneakers, salt-and-pepper hair, NORMAL SMOOTH arms.
Footprint ~70-80% of 576x576 like IMAGE 1 — NOT tiny.
Solid magenta (#FF00FF). EXACTLY ONE character.`;
    } else if (request.participantId === 'alexandre') {
      baseRule = `CRITICAL VICTORY (Alexandre): Match IMAGE 1 / POSE OVERRIDE (Dinarte victory) silhouette EXACTLY.
POSE HARD LOCK: RIGHT arm straight vertical UP — fist ABOVE head near top of frame; LEFT fist at waist/hip; legs planted wide; celebrating shout. EXACTLY TWO ARMS.
HARD FAIL: idle fists-at-chest; both arms at chest; extra/ghost/third/fourth arms; tiny; collage; buff bodybuilder arms.
NO idle_01 body image was provided — do NOT invent idle guard. Pose only from Dinarte IMAGE 1.
Outfit: black cap, WHITE sunglasses, salt-and-pepper beard, silver chain, black patterned tee, black shorts, black sneakers, RIGHT forearm tattoo, NO watch, NORMAL SMOOTH arms.
Footprint ~70-80% of 576x576 like IMAGE 1 — NOT tiny.
Solid magenta (#FF00FF). EXACTLY ONE character.`;
    } else if (request.participantId === 'ryan') {
      baseRule = `CRITICAL VICTORY: Match IMAGE 1 (Dinarte victory) pose ONLY.
EXACTLY TWO ARMS: right arm straight UP with fist above head; left arm bent with fist near hip/waist.
HARD FAIL: third arm, ghost limb, idle chest-guard fists from IMAGE 2, collage.
IMAGE 2 is CLOTHES/FACE/HAIR/SHOES ONLY — NEVER copy idle arm positions from IMAGE 2.
Keep IMAGE 2 outfit EXACTLY: black polo with BRIGHT LIME GREEN collar AND lime-green sleeve bands, ESPERANÇA DISTRIBUIDORA DE FRIOS logo, black backpack straps, black pants, black sneakers white soles, short dark hair, dark stubble, NORMAL smooth-armed body, NO watch.
SAME body footprint/height as idle_01 (~70-80% canvas) — NOT undersized.
Gaze toward opponent RIGHT (3/4). Solid magenta (#FF00FF).`;
    } else if (request.participantId === 'fernando') {
      baseRule = `CRITICAL VICTORY (Fernando): Match IMAGE 1 / POSE OVERRIDE (Dinarte victory) silhouette EXACTLY.
POSE HARD LOCK: RIGHT arm straight vertical UP — fist ABOVE head near top of frame; LEFT fist at waist/hip; legs planted wide; celebrating shout. EXACTLY TWO ARMS.
HARD FAIL: idle fists-at-chest; idle-with-extra-raised-arm hybrid; extra/ghost/third arm; tiny; collage.
NO idle_01 body image was provided — do NOT invent idle guard. Pose only from Dinarte IMAGE 1.
Outfit: black polo + BRIGHT LIME GREEN collar AND green sleeve cuffs, black joggers, black sneakers white soles, curly hair, mustache+goatee, stud earrings, NO watch, NORMAL SMOOTH arms.
Footprint ~70-80% of 576x576 like IMAGE 1 — NOT tiny.
Solid magenta (#FF00FF). EXACTLY ONE character.`;
    } else if (request.participantId === 'caio') {
      baseRule = `CRITICAL VICTORY (Caio): Match IMAGE 1 / POSE OVERRIDE (Dinarte victory) silhouette EXACTLY.
POSE HARD LOCK: RIGHT arm straight vertical UP — fist ABOVE head near top of frame; LEFT fist at waist/hip; legs planted wide; celebrating shout. EXACTLY TWO ARMS.
HARD FAIL: idle fists-at-chest; idle-with-extra-raised-arm hybrid; extra/ghost/third arm; tiny; collage.
NO idle_01 body image was provided — do NOT invent idle guard. Pose only from Dinarte IMAGE 1.
Outfit: PLAIN black crew-neck tee, thin silver chain, RIGHT-ear silver stud, dark charcoal jeans, black sneakers white soles, fade hair, short dark beard, NO watch, NORMAL SMOOTH arms.
WATCH: LEFT wrist only if visible. FORBIDDEN watch on the raised RIGHT arm.
Footprint ~70-80% of 576x576 like IMAGE 1 — NOT tiny.
Solid magenta (#FF00FF). EXACTLY ONE character.`;
    } else if (request.participantId === 'evellyn') {
      baseRule = `CRITICAL VICTORY (Evellyn — FEMALE): Match IMAGE 1 / POSE OVERRIDE (Dinarte victory) silhouette EXACTLY.
POSE HARD LOCK: RIGHT arm straight vertical UP — fist ABOVE head near top of frame; LEFT fist at waist/hip; legs planted wide; celebrating shout. EXACTLY TWO ARMS.
HARD FAIL: idle fists-at-chest; extra/ghost/third arm; tiny; collage; male body.
NO idle_01 body image was provided — do NOT invent idle guard. Pose only from Dinarte IMAGE 1.
Outfit: long straight jet-black hair over both shoulders, PLAIN dark navy/charcoal crew-neck tee, dark charcoal pants, dark sneakers, BARE hands, NO watch, NO glasses, NORMAL SMOOTH female arms.
Footprint ~70-80% of 576x576 like IMAGE 1 — NOT tiny.
Solid magenta (#FF00FF). EXACTLY ONE character.`;
    } else if (request.participantId === 'daniel') {
      baseRule = `CRITICAL VICTORY (Daniel): Match IMAGE 1 / POSE OVERRIDE (Dinarte victory) silhouette EXACTLY.
POSE HARD LOCK: RIGHT arm straight vertical UP — fist ABOVE head near top of frame; LEFT fist at waist/hip; legs planted wide; celebrating shout. EXACTLY TWO ARMS.
HARD FAIL: idle fists-at-chest; idle-with-extra-raised-arm hybrid; extra/ghost/third arm; tiny; collage.
NO idle_01 body image was provided — do NOT invent idle guard. Pose only from Dinarte IMAGE 1.
Outfit: WHITE polo, dark blue slim jeans, white slip-on sneakers, fade hair, mustache+goatee, braces if mouth open, RIGHT-arm sleeve tattoo, GOLD watch on LEFT wrist (NEVER on raised RIGHT arm), keys on right hip, NORMAL SMOOTH arms.
THIS IS DANIEL — NOT DAVID.
Footprint ~70-80% of 576x576 like IMAGE 1 — NOT tiny.
Solid magenta (#FF00FF). EXACTLY ONE character.`;
    } else if (request.participantId === 'fabio') {
      baseRule = `CRITICAL VICTORY (Fabio): Match IMAGE 1 / POSE OVERRIDE (Dinarte victory) silhouette EXACTLY.
POSE HARD LOCK: RIGHT arm straight vertical UP — fist ABOVE head near top of frame; LEFT fist at waist/hip; legs planted wide; celebrating shout. EXACTLY TWO ARMS.
HARD FAIL: idle fists-at-chest; idle-with-extra-raised-arm hybrid; extra/ghost/third arm; tiny; collage.
NO idle_01 body image was provided — do NOT invent idle guard. Pose only from Dinarte IMAGE 1.
Outfit: navy blazer, WHITE open-collar shirt NO necktie, chest tattoo, navy dress pants, WHITE sneakers, fade hair, mustache+goatee, silver watch on LEFT wrist (NEVER on raised RIGHT arm), NORMAL SMOOTH arms.
THIS IS FABIO — NOT Joao (no magenta tie, no dress shoes).
Footprint ~70-80% of 576x576 like IMAGE 1 — NOT tiny.
Solid magenta (#FF00FF). EXACTLY ONE character.`;
    } else if (request.participantId === 'hiago') {
      baseRule = `CRITICAL VICTORY (Hiago): Match IMAGE 1 / POSE OVERRIDE (Dinarte victory) silhouette EXACTLY.
POSE HARD LOCK: RIGHT arm straight vertical UP — fist ABOVE head near top of frame; LEFT fist at waist/hip; legs planted wide; celebrating shout. EXACTLY TWO ARMS.
HARD FAIL: idle fists-at-chest; idle-with-extra-raised-arm hybrid; extra/ghost/third arm; tiny; collage.
NO idle_01 body image was provided — do NOT invent idle guard. Pose only from Dinarte IMAGE 1.
Outfit: oversized black tee with white "TOP", olive-green cargo joggers, black-and-white sneakers, round BLACK glasses ALWAYS, chain with pendant, voluminous curly quiff, NO beard, dark watch on LEFT wrist (NEVER on raised RIGHT arm), NORMAL SMOOTH arms.
GAZE: 3/4 toward opponent RIGHT (may be slightly more frontal if shouting). FORBIDDEN full camera stare.
THIS IS HIAGO — NOT Izaias (no puffer) and NOT Caio (glasses + olive cargo).
Footprint ~70-80% of 576x576 like IMAGE 1 — NOT tiny.
Solid magenta (#FF00FF). EXACTLY ONE character.`;
    } else if (request.participantId === 'kelvin') {
      baseRule = `CRITICAL VICTORY (Kelvin): Match IMAGE 1 / POSE OVERRIDE (Dinarte victory) silhouette EXACTLY.
POSE HARD LOCK: RIGHT arm straight vertical UP — fist ABOVE head near top of frame; LEFT fist at waist/hip; legs planted wide; celebrating shout. EXACTLY TWO ARMS.
HARD FAIL: idle fists-at-chest; idle-with-extra-raised-arm hybrid; extra/ghost/third arm; tiny; collage; adult bodybuilder physique / broad muscular shoulders.
Kelvin is a SLENDER, LEAN, YOUNG TEENAGER: narrow shoulders, slim torso, slender smooth arms, youthful head-to-body ratio.
Outfit: WHITE polo with red AND navy striped collar+cuffs, dark navy trousers, white sneakers with red accents, round BLACK glasses ALWAYS, white earbuds in BOTH ears, curly taper-fade, NO beard, watch on LEFT wrist (NEVER on raised RIGHT arm), SMOOTH slender arms.
GAZE: 3/4 toward opponent RIGHT (may be slightly more frontal if shouting). FORBIDDEN full camera stare.
THIS IS KELVIN — NOT Daniel (no tattoo, has glasses+earbuds) and NOT Hiago (no black "TOP" tee).
Footprint ~70-80% of 576x576 like IMAGE 1 — NOT tiny.
Solid magenta (#FF00FF). EXACTLY ONE character.`;
    }
    return { parts, baseRule };
  }

  /**
   * Edit an existing sprite: change ONLY footwear.
   * Primary reference is the current frame itself (identity + pose + outfit).
   */
  private buildShoeOnlyEditParts(request: GenerationRequest): { parts: any[]; baseRule: string } {
    if (!request.editBaseImage || !fs.existsSync(request.editBaseImage)) {
      throw new Error('shoeOnlyEdit requires editBaseImage (existing frame PNG).');
    }

    const style = request.shoeEditStyle || 'black_flats';
    const parts: any[] = [];

    if (style === 'white_sneakers') {
      parts.push({
        text: 'IMAGE 1 (PRIMARY — KEEP ALMOST EVERYTHING): This is the EXACT sprite to preserve. Keep the SAME black hoodie, black pants, gold necklace, face, hair, body proportions, pose, arms, hands, and background. Change ONLY the footwear color/style.',
      });
      parts.push(pngPart(request.editBaseImage));

      if (request.shoeReferenceImage && fs.existsSync(request.shoeReferenceImage)) {
        parts.push({
          text: 'IMAGE 2 (SHOE COLOR ONLY): Copy ONLY white sneaker / tênis branco color. Do NOT copy pose, clothes, face, or hair from this image.',
        });
        parts.push(pngPart(request.shoeReferenceImage));
      }

      const baseRule = `CRITICAL EDIT RULE: Change ONLY the footwear to WHITE sneakers (tênis branco).
Keep EXACT same black hoodie, black pants, gold necklace, face, hair, pose, proportions, hands, and everything else identical to IMAGE 1.
NO new clothes. NO redesign. NO blue sneakers. NO blue shoes. NO colored sneakers.
Solid magenta background (#FF00FF).`;
      return { parts, baseRule };
    }

    if (style === 'red_sandals') {
      parts.push({
        text: 'IMAGE 1 (PRIMARY — KEEP ALMOST EVERYTHING): This is the EXACT sprite to preserve. Keep the SAME red dress, silver clutch, face, hair, body proportions, pose, arms, hands, legs, and magenta background. Change ONLY the footwear on both feet.',
      });
      parts.push(pngPart(request.editBaseImage));

      if (request.shoeReferenceImage && fs.existsSync(request.shoeReferenceImage)) {
        parts.push({
          text: 'IMAGE 2 (SHOE STYLE ONLY — idle_01): Copy ONLY the simple RED strappy high-heeled sandals (toe strap + ankle strap). Do NOT copy pose, dress folds, clutch, face, or hair from this image.',
        });
        parts.push(pngPart(request.shoeReferenceImage));
      }

      const baseRule = `CRITICAL EDIT RULE: Change ONLY the footwear to match IMAGE 2 — simple RED strappy high-heeled sandals (same as idle_01).
Keep EXACT same pose, dress, clutch, face, hair, proportions, hands, and everything else identical to IMAGE 1.
FORBIDDEN: gladiator multi-strap sandals, silver/metallic heels, redesigning the outfit.
Solid magenta background (#FF00FF).`;
      return { parts, baseRule };
    }

    parts.push({
      text: 'IMAGE 1 (PRIMARY — KEEP ALMOST EVERYTHING): This is the EXACT sprite to preserve. Keep the SAME yellow jacket, yellow skirt, face, hair, body proportions, pose, arms, hands, and background. Change ONLY the footwear.',
    });
    parts.push(pngPart(request.editBaseImage));

    if (request.shoeReferenceImage && fs.existsSync(request.shoeReferenceImage)) {
      parts.push({
        text: 'IMAGE 2 (SHOE STYLE ONLY): Copy ONLY the black flat shoe style (sapatinho preto / black flats, no thick sole). Do NOT copy pose, clothes, gloves, headband, or hair from this image.',
      });
      parts.push(pngPart(request.shoeReferenceImage));
    }

    const baseRule = `CRITICAL EDIT RULE: Change ONLY the footwear to black flat shoes (sapatinho preto).
Keep EXACT same yellow jacket, yellow skirt, face, hair, pose, proportions, hands, and everything else identical to IMAGE 1.
NO new clothes. NO gloves. NO headband. NO cargo pants. NO tank top. NO redesign.
NO sneakers / tênis. NO thick white soles. NO blue accessories.
Solid magenta background (#FF00FF).`;

    return { parts, baseRule };
  }

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    try {
      if (!fs.existsSync(request.sourceImage)) throw new Error(`Source image not found: ${request.sourceImage}`);
      if (!fs.existsSync(request.faceMaster)) throw new Error(`Face master not found: ${request.faceMaster}`);
      if (!fs.existsSync(request.templateImage)) throw new Error(`Template image not found: ${request.templateImage}`);

      const sourceB64 = fileToBase64(request.sourceImage);
      const faceB64 = fileToBase64(request.faceMaster);
      const templateB64 = fileToBase64(request.templateImage);

      let parts: any[];
      let baseRule: string;

      if (request.radjaHairOnlyEdit) {
        ({ parts, baseRule } = this.buildRadjaHairOnlyEditParts(request));
      } else if (request.eriksonWatchLockEdit) {
        ({ parts, baseRule } = this.buildEriksonWatchLockEditParts(request));
      } else if (request.izaiasJacketColorLockEdit) {
        ({ parts, baseRule } = this.buildIzaiasJacketColorLockEditParts(request));
      } else if (request.radjaJacketLockEdit) {
        ({ parts, baseRule } = this.buildRadjaJacketLockEditParts(request));
      } else if (request.radjaWrapLockEdit) {
        ({ parts, baseRule } = this.buildRadjaWrapLockEditParts(request));
      } else if (request.rhussianaBodySoftenEdit) {
        ({ parts, baseRule } = this.buildRhussianaBodySoftenEditParts(request));
      } else if (request.leandroSmoothArmsEdit) {
        ({ parts, baseRule } = this.buildLeandroSmoothArmsEditParts(request));
      } else if (request.rhussianaBellyFlattenEdit) {
        ({ parts, baseRule } = this.buildRhussianaBellyFlattenEditParts(request));
      } else if (request.liviaHairOnlyEdit) {
        ({ parts, baseRule } = this.buildLiviaHairOnlyEditParts(request));
      } else if (request.liviaSurgicalEdit) {
        ({ parts, baseRule } = this.buildLiviaSurgicalEditParts(request));
      } else if (request.ghostLimbFix) {
        ({ parts, baseRule } = this.buildGhostLimbFixParts(request));
      } else if (request.shoeOnlyEdit) {
        ({ parts, baseRule } = this.buildShoeOnlyEditParts(request));
      } else if (request.participantId === 'fatinha' && (request.frameName === 'walk_01' || request.frameName === 'walk_02')) {
        ({ parts, baseRule } = this.buildFatinhaWalkParts(request, sourceB64, faceB64));
      } else if (request.frameName === 'walk_01') {
        ({ parts, baseRule } = this.buildWalk01Parts(request, sourceB64, faceB64, templateB64));
      } else if (request.frameName === 'walk_02') {
        ({ parts, baseRule } = this.buildWalk02Parts(
          request,
          sourceB64,
          faceB64,
          templateB64
        ));
      } else if (request.frameName === 'idle_02') {
        ({ parts, baseRule } = this.buildIdle02Parts(request, sourceB64, faceB64, templateB64));
      } else if (request.frameName === 'hurt') {
        ({ parts, baseRule } = this.buildHurtParts(request, sourceB64, faceB64, templateB64));
      } else if (request.frameName === 'lying') {
        ({ parts, baseRule } = this.buildLyingParts(request, sourceB64, faceB64, templateB64));
      } else if (request.frameName === 'victory') {
        ({ parts, baseRule } = this.buildVictoryParts(request, sourceB64, faceB64, templateB64));
      } else {
        ({ parts, baseRule } = this.buildDefaultParts(request, sourceB64, faceB64, templateB64));
      }

      if (
        request.participantId === 'livia' &&
        !request.liviaSurgicalEdit &&
        !request.liviaHairOnlyEdit &&
        !request.shoeOnlyEdit
      ) {
        baseRule += this.liviaIdentityAddon(request.frameName);
      }
      if (
        request.participantId === 'rhussiana' &&
        !request.rhussianaBodySoftenEdit &&
        !request.rhussianaBellyFlattenEdit
      ) {
        baseRule += this.rhussianaIdentityAddon(request.frameName);
      }
      if (request.participantId === 'ana') {
        baseRule += this.anaIdentityAddon(request.frameName);
      }
      if (request.participantId === 'evellyn') {
        baseRule += this.evellynIdentityAddon(request.frameName);
      }
      if (request.participantId === 'joao') {
        baseRule += this.joaoIdentityAddon(request.frameName);
      }
      if (request.participantId === 'neto') {
        baseRule += this.netoIdentityAddon(request.frameName);
      }
      if (request.participantId === 'leandro') {
        baseRule += this.leandroIdentityAddon(request.frameName);
      }
      if (request.participantId === 'ricardo') {
        baseRule += this.ricardoIdentityAddon(request.frameName);
      }
      if (request.participantId === 'izaias' && !request.izaiasJacketColorLockEdit) {
        baseRule += this.izaiasIdentityAddon(request.frameName);
      }
      if (request.participantId === 'jailson') {
        baseRule += this.jailsonIdentityAddon(request.frameName);
      }
      if (request.participantId === 'erikson') {
        baseRule += this.eriksonIdentityAddon(request.frameName);
      }
      if (request.participantId === 'tiago') {
        baseRule += this.tiagoIdentityAddon(request.frameName);
      }
      if (request.participantId === 'fernando') {
        baseRule += this.fernandoIdentityAddon(request.frameName);
      }
      if (request.participantId === 'alexandre') {
        baseRule += this.alexandreIdentityAddon(request.frameName);
      }
      if (request.participantId === 'ryan') {
        baseRule += this.ryanIdentityAddon(request.frameName);
      }
      if (request.participantId === 'caio') {
        baseRule += this.caioIdentityAddon(request.frameName);
      }
      if (request.participantId === 'daniel') {
        baseRule += this.danielIdentityAddon(request.frameName);
      }
      if (request.participantId === 'fabio') {
        baseRule += this.fabioIdentityAddon(request.frameName);
      }
      if (request.participantId === 'hiago') {
        baseRule += this.hiagoIdentityAddon(request.frameName);
      }
      if (request.participantId === 'kelvin') {
        baseRule += this.kelvinIdentityAddon(request.frameName);
      }
      // Global default: smooth non-muscular arms for everyone except Dinarte.
      // Skip when a participant-specific identity addon already covers body (still safe to append).
      if (
        request.participantId &&
        request.participantId !== 'dinarte' &&
        !request.rhussianaBodySoftenEdit &&
        !request.rhussianaBellyFlattenEdit &&
        !request.leandroSmoothArmsEdit &&
        !request.liviaSurgicalEdit &&
        !request.liviaHairOnlyEdit &&
        !request.shoeOnlyEdit &&
        !request.radjaHairOnlyEdit &&
        !request.radjaJacketLockEdit &&
        !request.izaiasJacketColorLockEdit &&
        !request.radjaWrapLockEdit &&
        !request.eriksonWatchLockEdit &&
        !request.ghostLimbFix
      ) {
        baseRule += this.defaultSmoothArmsAddon(request.participantId);
      }

      // Honor --custom-prompt / prompt file text when provided by orchestrator.
      if (request.prompt && request.prompt.trim().length > 0) {
        parts.push({ text: `ADDITIONAL PROMPT CONSTRAINTS:\n${request.prompt.trim().slice(0, 4000)}` });
      }

      parts.push({ text: baseRule });

      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: [
          {
            role: 'user',
            parts: parts
          }
        ],
        config: {
          responseModalities: ["IMAGE"]
        }
      });

      let base64Image = '';
      let outMimeType = '';
      if (response.candidates && response.candidates.length > 0 && response.candidates[0].content && response.candidates[0].content.parts && response.candidates[0].content.parts.length > 0) {
         const part = response.candidates[0].content.parts[0];
         if (part.inlineData && part.inlineData.data) {
             base64Image = part.inlineData.data;
             outMimeType = part.inlineData.mimeType || '';
         } else if (part.text) {
             base64Image = part.text;
         }
      }

      if (!base64Image) {
         return {
             success: false,
             error: 'No image data returned from API.'
         };
      }

      const imageBuffer = Buffer.from(base64Image, 'base64');
      
      let rawExt = 'png';
      if (outMimeType.includes('jpeg') || outMimeType.includes('jpg')) rawExt = 'jpg';
      else if (outMimeType.includes('webp')) rawExt = 'webp';

      if (request.outputPath) {
        fs.mkdirSync(path.dirname(request.outputPath), { recursive: true });
        // Keep frame-specific raw when possible (avoid overwriting with later frames).
        const frameTag = request.frameName ? `${request.frameName}_` : '';
        const rawPath = path.join(path.dirname(request.outputPath), `${frameTag}raw_provider_output.${rawExt}`);
        safeWriteFileSync(rawPath, imageBuffer);
        // Also keep legacy path for tooling that expects it.
        safeWriteFileSync(path.join(path.dirname(request.outputPath), `raw_provider_output.${rawExt}`), imageBuffer);
      }
      
      const originalMetadata = await sharp(imageBuffer).metadata();
      const rawSize = imageBuffer.length;
      const targetW = request.outputWidth || 576;
      const targetH = request.outputHeight || 576;
      const resizedBuffer = await this.normalizeSpriteToCanvas(imageBuffer, targetW, targetH);

      const finalMetadata = await sharp(resizedBuffer).metadata();
      const hasAlpha = finalMetadata.hasAlpha || false;

      if (request.outputPath) {
        safeWriteFileSync(request.outputPath, resizedBuffer);
      }

      const sha256 = crypto.createHash('sha256').update(resizedBuffer).digest('hex');

      return {
        success: true,
        outputPath: request.outputPath,
        sha256: sha256,
        width: finalMetadata.width,
        height: finalMetadata.height,
        hasAlpha: hasAlpha,
        needsBackgroundReview: !hasAlpha,
        rawExtension: rawExt,
        rawSize,
        originalWidth: originalMetadata.width,
        originalHeight: originalMetadata.height,
        outMimeType
      };

      } catch (error: any) {
      let errorMsg = error.message || String(error);
      if (errorMsg.toLowerCase().includes('key not valid')) errorMsg = 'Invalid API Key';
      else if (errorMsg.toLowerCase().includes('not found')) errorMsg = 'Model not found';
      else if (errorMsg.toLowerCase().includes('permission denied')) errorMsg = 'Permission denied';
      else if (errorMsg.toLowerCase().includes('quota') || errorMsg.toLowerCase().includes('rate limit')) errorMsg = 'Quota/Rate limit exceeded';
      else if (errorMsg.toLowerCase().includes('timeout')) errorMsg = 'Timeout';
      
      console.log(`[DEBUG] Raw API error:`, errorMsg, error);
      
      return {
        success: false,
        error: errorMsg
      };
    }
  }

  /**
   * Normalize provider output to a solid-magenta 576x576 sprite.
   * Content-aware: trim non-magenta bbox first so wide/collage-like canvases
   * do not letterbox into a tiny character (Leandro walk_02 failure mode).
   */
  private async normalizeSpriteToCanvas(
    imageBuffer: Buffer,
    targetW: number,
    targetH: number
  ): Promise<Buffer> {
    const MAGENTA = { r: 255, g: 0, b: 255, alpha: 1 };
    const { data, info } = await sharp(imageBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const w = info.width;
    const h = info.height;
    let minX = w;
    let minY = h;
    let maxX = 0;
    let maxY = 0;
    let fg = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        const magenta = Math.abs(r - 255) <= 40 && g <= 40 && Math.abs(b - 255) <= 40;
        if (a < 10 || magenta) continue;
        fg++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }

    // Fallback: plain contain resize if no FG detected.
    if (fg < 50 || maxX < minX || maxY < minY) {
      return sharp(imageBuffer)
        .resize(targetW, targetH, { fit: 'contain', background: MAGENTA, kernel: 'nearest' })
        .png()
        .toBuffer();
    }

    // Target ~74% canvas height (idle footprint) when content was undersized on a large canvas.
    const useNearest = Math.max(w, h) <= 1024;

    // If multiple vertical FG bands (stacked dual-sprite lying failure), keep the largest band only.
    const rowHasFg = new Array(h).fill(false);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        const magenta = Math.abs(r - 255) <= 40 && g <= 40 && Math.abs(b - 255) <= 40;
        if (a >= 10 && !magenta) {
          rowHasFg[y] = true;
          break;
        }
      }
    }
    type Band = { y0: number; y1: number };
    const bands: Band[] = [];
    let inBand = false;
    let y0 = 0;
    for (let y = 0; y < h; y++) {
      if (rowHasFg[y] && !inBand) {
        inBand = true;
        y0 = y;
      } else if (!rowHasFg[y] && inBand) {
        bands.push({ y0, y1: y - 1 });
        inBand = false;
      }
    }
    if (inBand) bands.push({ y0, y1: h - 1 });

    let cropMinY = minY;
    let cropMaxY = maxY;
    let cropMinX = minX;
    let cropMaxX = maxX;
    if (bands.length >= 2) {
      let best = bands[0];
      let bestH = best.y1 - best.y0;
      for (const b of bands) {
        const hh = b.y1 - b.y0;
        if (hh > bestH) {
          best = b;
          bestH = hh;
        }
      }
      cropMinY = best.y0;
      cropMaxY = best.y1;
      cropMinX = w;
      cropMaxX = 0;
      for (let y = cropMinY; y <= cropMaxY; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          const magenta = Math.abs(r - 255) <= 40 && g <= 40 && Math.abs(b - 255) <= 40;
          if (a < 10 || magenta) continue;
          if (x < cropMinX) cropMinX = x;
          if (x > cropMaxX) cropMaxX = x;
        }
      }
      if (cropMaxX < cropMinX) {
        cropMinX = minX;
        cropMaxX = maxX;
      }
    }

    const bw2 = cropMaxX - cropMinX + 1;
    const bh2 = cropMaxY - cropMinY + 1;
    const pad2 = Math.max(4, Math.round(Math.max(bw2, bh2) * 0.04));
    const left2 = Math.max(0, cropMinX - pad2);
    const top2 = Math.max(0, cropMinY - pad2);
    const width2 = Math.min(w - left2, bw2 + pad2 * 2);
    const height2 = Math.min(h - top2, bh2 + pad2 * 2);

    let cropped = sharp(imageBuffer).extract({ left: left2, top: top2, width: width2, height: height2 });
    const contentHeightRatioEff = bh2 / Math.min(w, h);

    // If original was wide (multi-panel risk) or content was small, upscale crop to fill target height.
    // Threshold 0.70 catches undersized walks (~55-65%) that still looked tiny vs idle (~96%).
    if (w / h > 1.25 || contentHeightRatioEff < 0.70) {
      const scaled = await cropped
        .resize({
          width: targetW,
          height: Math.round(targetH * 0.78),
          fit: 'inside',
          kernel: useNearest ? 'nearest' : 'lanczos3',
          background: MAGENTA,
        })
        .png()
        .toBuffer();
      const meta = await sharp(scaled).metadata();
      const sw = Math.min(meta.width || targetW, targetW);
      const sh = Math.min(meta.height || targetH, targetH);
      // Ensure overlay never exceeds canvas (sharp composite requirement).
      const overlay =
        (meta.width || 0) > targetW || (meta.height || 0) > targetH
          ? await sharp(scaled)
              .resize(targetW, targetH, { fit: 'inside', background: MAGENTA, kernel: useNearest ? 'nearest' : 'lanczos3' })
              .png()
              .toBuffer()
          : scaled;
      const overlayMeta = await sharp(overlay).metadata();
      const ow = overlayMeta.width || sw;
      const oh = overlayMeta.height || sh;
      const leftPad = Math.max(0, Math.floor((targetW - ow) / 2));
      const topPad = Math.max(0, targetH - oh - 2); // feet near bottom
      return sharp({
        create: {
          width: targetW,
          height: targetH,
          channels: 3,
          background: MAGENTA,
        },
      })
        .composite([{ input: overlay, left: leftPad, top: topPad }])
        .png()
        .toBuffer();
    }

    return cropped
      .resize(targetW, targetH, {
        fit: 'contain',
        background: MAGENTA,
        kernel: useNearest ? 'nearest' : 'lanczos3',
      })
      .png()
      .toBuffer();
  }
}
