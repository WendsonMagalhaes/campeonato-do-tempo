import { describe, expect, it } from 'vitest'
import { battleCallouts, battleFx, calloutForRound } from './battle-assets.ts'
import { CELEBRATION_CROWD_ANIM, CELEBRATION_CROWD_FRAMES } from './celebrationCrowdData.ts'
import {
  CELEBRATION_CROWD_BOX,
  CHAMPION,
  CHAMPION_BG,
  DUO_QUALIFIED,
  QUALIFIED_HUD,
  qualifiedTextMaxWidth,
} from '../copa-ui/layouts/championGeometry.ts'

describe('DuoQualified / champion celebration contracts', () => {
  it('uses plaza trophies BG (not coldroom / old street stage)', () => {
    expect(CHAMPION_BG).toContain('champion_plaza_trophies_bg')
    expect(CHAMPION_BG).not.toContain('coldroom')
    expect(CHAMPION_BG).not.toContain('champion_stage_bg')
  })

  it('keeps nameplate aspect + medium BitmapText fit ratios', () => {
    expect(QUALIFIED_HUD.duoName.size).toBe('medium')
    expect(QUALIFIED_HUD.duoName.maxWidthRatio).toBe(0.7)
    const max = qualifiedTextMaxWidth(DUO_QUALIFIED.teamName, QUALIFIED_HUD.duoName.maxWidthRatio)
    expect(max).toBeGreaterThan(200)
    expect(max).toBeLessThanOrEqual(DUO_QUALIFIED.teamName.w)
  })

  it('reserves fighter victory slots larger than photo frames', () => {
    expect(DUO_QUALIFIED.fighter1.w).toBeGreaterThan(DUO_QUALIFIED.portrait1.w)
    expect(DUO_QUALIFIED.fighter2.h).toBeGreaterThan(DUO_QUALIFIED.portrait2.h)
  })

  it('positions large portraits on the side flanks without occluding center nameplate', () => {
    // Left portrait is on left flank, right portrait is on right flank
    expect(DUO_QUALIFIED.portrait1.x).toBeLessThan(200)
    expect(DUO_QUALIFIED.portrait2.x).toBeGreaterThan(1400)
    expect(DUO_QUALIFIED.portrait1.w).toBeGreaterThanOrEqual(320)
    expect(DUO_QUALIFIED.portrait2.w).toBeGreaterThanOrEqual(320)

    // Clear of central teamName nameplate
    expect(DUO_QUALIFIED.portrait1.x + DUO_QUALIFIED.portrait1.w).toBeLessThanOrEqual(DUO_QUALIFIED.teamName.x)
    expect(DUO_QUALIFIED.portrait2.x).toBeGreaterThanOrEqual(DUO_QUALIFIED.teamName.x + DUO_QUALIFIED.teamName.w)

    // Symmetrical positioning from canvas edges (1920)
    const leftMargin = DUO_QUALIFIED.portrait1.x
    const rightMargin = 1920 - (DUO_QUALIFIED.portrait2.x + DUO_QUALIFIED.portrait2.w)
    expect(leftMargin).toBe(rightMargin)

    // Same geometry on Champion
    expect(CHAMPION.portrait1.x).toBeLessThan(200)
    expect(CHAMPION.portrait2.x).toBeGreaterThan(1400)
    expect(CHAMPION.portrait1.w).toBeGreaterThanOrEqual(320)
    expect(CHAMPION.portrait2.w).toBeGreaterThanOrEqual(320)
    expect(CHAMPION.portrait1.x + CHAMPION.portrait1.w).toBeLessThanOrEqual(CHAMPION.teamName.x)
    expect(CHAMPION.portrait2.x).toBeGreaterThanOrEqual(CHAMPION.teamName.x + CHAMPION.teamName.w)
  })

  it('wires celebration crowd to the 2-frame layered foreground intro crowd assets', () => {
    expect(CELEBRATION_CROWD_FRAMES.length).toBe(2)
    expect(CELEBRATION_CROWD_FRAMES[0]).toBe(
      '/assets/runtime/intro/crowd/layered/30_intro_crowd_foreground_frame_01.png',
    )
    expect(CELEBRATION_CROWD_FRAMES[1]).toBe(
      '/assets/runtime/intro/crowd/layered/31_intro_crowd_foreground_frame_02.png',
    )
    expect(CELEBRATION_CROWD_ANIM.periodMs).toBeGreaterThanOrEqual(200)
    expect(CELEBRATION_CROWD_ANIM.periodMs).toBeLessThanOrEqual(350)
    expect(CELEBRATION_CROWD_BOX.y).toBeGreaterThanOrEqual(600)
    expect(CELEBRATION_CROWD_BOX.y + CELEBRATION_CROWD_BOX.h).toBeGreaterThanOrEqual(1080)
  })

  it('wires confetti to the pre-extracted runtime FX asset', () => {
    expect(battleFx.confetti).toBe('/assets/runtime/fx/confetti.png')
  })

  it('Duo Qualified title uses winner.png in a compact slot above the name crest', () => {
    expect(battleCallouts.winner).toBe('/assets/ui/winner.png')
    expect(DUO_QUALIFIED.title.h).toBeGreaterThanOrEqual(200)
    expect(DUO_QUALIFIED.title.h).toBeLessThanOrEqual(260)
    expect(DUO_QUALIFIED.title.w).toBeGreaterThanOrEqual(700)
    // Hierarchy: winner → names → score with vertical gaps (no mash).
    expect(DUO_QUALIFIED.teamName.y).toBeGreaterThanOrEqual(DUO_QUALIFIED.title.y + DUO_QUALIFIED.title.h - 8)
    expect(DUO_QUALIFIED.score.y).toBeGreaterThanOrEqual(
      DUO_QUALIFIED.teamName.y + DUO_QUALIFIED.teamName.h + 16,
    )
  })

  it('Champion does not reuse winner.png (pending dedicated title asset)', () => {
    // Contract: winner is DuoQualified-only; Champion keeps BitmapText CAMPEÃ.
    expect(battleCallouts.winner).not.toContain('champion')
  })

  it('Champion layout mirrors Duo Qualified fighter slots (no telão prize box)', () => {
    expect(CHAMPION.fighter1.y).toBe(DUO_QUALIFIED.fighter1.y)
    expect(CHAMPION.fighter2.y).toBe(DUO_QUALIFIED.fighter2.y)
    expect(CHAMPION.teamName.y).toBeGreaterThanOrEqual(CHAMPION.title.y + CHAMPION.title.h - 16)
    expect(CHAMPION).not.toHaveProperty('prize')
  })
})

describe('battle announcer callout assets', () => {
  it('maps round number to round_1 / round_2 / final_round', () => {
    expect(calloutForRound(1)).toBe('/assets/ui/round_1.png')
    expect(calloutForRound(2)).toBe('/assets/ui/round_2.png')
    expect(calloutForRound(3)).toBe('/assets/ui/final_round.png')
  })

  it('exposes fight + ko under stable lowercase paths', () => {
    expect(battleCallouts.fight).toBe('/assets/ui/fight.png')
    expect(battleCallouts.ko).toBe('/assets/ui/ko.png')
  })
})
