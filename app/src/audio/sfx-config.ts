export const SFX = {
  announcer: {
    round1: '/assets/audio/announcer/round_1.wav',
    round2: '/assets/audio/announcer/round_2.wav',
    finalRound: '/assets/audio/announcer/final_round.wav',
    fight: '/assets/audio/announcer/fight.wav',
    ko: '/assets/audio/announcer/ko.wav',
    perfect: '/assets/audio/announcer/perfect.wav',
  },
  ui: {
    cursorMove: [
      '/assets/audio/ui/cursor_move_01.wav',
      '/assets/audio/ui/cursor_move_02.wav',
      '/assets/audio/ui/cursor_move_03.wav',
      '/assets/audio/ui/cursor_move_04.wav',
      '/assets/audio/ui/cursor_move_05.wav',
      '/assets/audio/ui/cursor_move_06.wav',
    ],
    selectionLock: '/assets/audio/ui/selection_lock.wav',
    vsImpact: '/assets/audio/ui/vs_impact.wav',
    screenTransition: '/assets/audio/ui/screen_transition.wav',
    bracketAdvance: '/assets/audio/ui/bracket_advance.wav',
    flash: '/assets/audio/ui/flash.wav',
  },
  combat: {
    mediumHit: '/assets/audio/combat/medium_hit.wav',
    heavyHit: '/assets/audio/combat/heavy_hit.wav',
  },
  crowd: {
    roundWin: [
      '/assets/audio/crowd/round_win_01.wav',
      '/assets/audio/crowd/round_win_02.wav',
      '/assets/audio/crowd/round_win_03.wav',
    ],
    matchWin: [
      '/assets/audio/crowd/match_win_01.wav',
      '/assets/audio/crowd/match_win_02.wav',
    ],
    matchWinShort: '/assets/audio/crowd/match_win_short.wav',
  },
  ambience: {
    crowd: '/assets/audio/ambience/crowd_loop.wav',
    coldRoom: '/assets/audio/ambience/cold_room_loop.wav',
  }
} as const;
