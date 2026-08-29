import { useCallback, useEffect, useRef, useState } from 'react'
import { createIndexedDbPersistence } from '../../persistence/indexedDb.ts'
import {
    projectIndividualScoreboard,
    type IndividualPortraitView,
    type IndividualScoreboardProjection,
} from '../../domain/individualProjections.ts'
import type { ScoreboardProjection } from '../../domain/projections.ts'
import { subscribeScoreboardSupabase as subscribeScoreboard } from '../../adapters/display/supabaseChannel.ts'
import { globalAudio } from '../../audio/singleton.ts'
import { BattleScene } from '../../battle/BattleScene.tsx'
import { DuoQualifiedScene } from '../../battle/DuoQualifiedScene.tsx'
import { OpeningScene } from '../../copa-ui/runtime/OpeningScene.tsx'
import { VersusScene } from '../../copa-ui/runtime/VersusScene.tsx'
import { RoundAnnounceScene } from '../../copa-ui/runtime/RoundAnnounceScene.tsx'
import { IndividualLineupScene, type LineupMatch } from '../../copa-ui/runtime/IndividualLineupScene.tsx'
import {
    MATCH_KO_HOLD_MS,
    ROUND_RESULT_HOLD_MS,
    resolveScoreboardLayers,
} from './scoreboardLayers.ts'

/**
 * Reaproveita as MESMAS cenas cinematográficas do modo Duplas
 * (BattleScene, VersusScene, RoundAnnounceScene, DuoQualifiedScene,
 * e agora IndividualLineupScene pras telas de pré/pós-confronto).
 *
 * Como cada cena espera "2 integrantes por lado", no modo 1x1
 * duplicamos o jogador nas duas posições.
 */

const LOSER_PANEL_HOLD_MS_INDIVIDUAL = 8000

function usePhotoCache() {
    const persistence = useRef(createIndexedDbPersistence()).current
    const cacheRef = useRef(new Map<string, string>())
    const pendingRef = useRef(new Set<string>())
    const [, bump] = useState(0)

    return (photoAssetId: string | null | undefined): string | null => {
        if (!photoAssetId) return null

        if (
            photoAssetId.startsWith('/') ||
            photoAssetId.startsWith('http')
        ) {
            return photoAssetId
        }

        const cached = cacheRef.current.get(photoAssetId)

        if (cached) return cached

        if (!pendingRef.current.has(photoAssetId)) {
            pendingRef.current.add(photoAssetId)

            void persistence
                .getPhoto(photoAssetId)
                .then((data) => {
                    pendingRef.current.delete(photoAssetId)

                    if (data) {
                        cacheRef.current.set(photoAssetId, data)
                        bump((n) => n + 1)
                    }
                })
                .catch(() => pendingRef.current.delete(photoAssetId))
        }

        return null
    }
}

function useIndividualProjection() {
    const [projection, setProjection] =
        useState<IndividualScoreboardProjection | null>(null)

    useEffect(() => {
        const persistence = createIndexedDbPersistence()

        void persistence.load().then((state) => {
            if (state && (state as any).schemaVersion) {
                setProjection(
                    projectIndividualScoreboard(state as any),
                )
            }
        })

        const unsubscribe = subscribeScoreboard(
            (json) => {
                setProjection(
                    JSON.parse(json) as IndividualScoreboardProjection,
                )
            },
            () => {
                /* eventos de cinemática tratados à parte */
            },
        )

        return unsubscribe
    }, [])

    return projection
}

function photoFor(
    p: {
        photoAssetId?: string | null
        bodyImageUrl?: string | null
        avatarUrl?: string | null
    },
    getPhoto: (id: string | null | undefined) => string | null,
): string | null {
    return (
        p.bodyImageUrl ||
        (p.photoAssetId && getPhoto(p.photoAssetId)) ||
        p.avatarUrl ||
        null
    )
}

function toDuoVersusShape(
    v: NonNullable<IndividualScoreboardProjection['versus']>,
): NonNullable<ScoreboardProjection['versus']> {
    const memberA = {
        id: v.participantA.id,
        name: v.participantA.name,
        photoAssetId: v.participantA.photoAssetId,
        avatarUrl: v.participantA.avatarUrl,
        bodyImageUrl: v.participantA.bodyImageUrl,
        fighterVariant: v.participantA.fighterVariant,
    }

    const memberB = {
        id: v.participantB.id,
        name: v.participantB.name,
        photoAssetId: v.participantB.photoAssetId,
        avatarUrl: v.participantB.avatarUrl,
        bodyImageUrl: v.participantB.bodyImageUrl,
        fighterVariant: v.participantB.fighterVariant,
    }

    return {
        stage: 'oitavas',
        teamAName: v.participantA.name,
        teamBName: v.participantB.name,

        membersA: [memberA, memberA],
        membersB: [memberB, memberB],

        activeAId: memberA.id,
        activeBId: memberB.id,

        scoreA: v.scoreA,
        scoreB: v.scoreB,

        roundNumber: v.roundNumber,
        targetLabel: v.targetLabel,

        prizeA: '',
        prizeB: '',

        timesHidden: v.timesHidden,

        timeA: v.timeA,
        timeB: v.timeB,

        diffA: v.diffA,
        diffB: v.diffB,

        roundWinner:
            v.roundWinnerSide === 'left'
                ? v.participantA.name
                : v.roundWinnerSide === 'right'
                    ? v.participantB.name
                    : null,

        roundWinnerSide: v.roundWinnerSide,

        matchPoint: Boolean(v.finalScoreLabel),
        finalScoreLabel: v.finalScoreLabel,

        matchWinnerSide: v.matchWinnerSide,

        tie: v.tie,
    }
}

export function ScoreboardAppIndividual() {
    const projection = useIndividualProjection()
    const getPhoto = usePhotoCache()

    const [audioUnlocked, setAudioUnlocked] = useState(false)

    const [koHoldDone, setKoHoldDone] = useState(false)

    const lastMatchWinnerRef = useRef<string | null>(null)
    const lastScreenRef = useRef<string | undefined>(undefined)

    /*
     * Guarda o matchId assim que a partida é decidida (finalScoreLabel /
     * matchWinnerSide presentes). Enquanto essa referência apontar pro
     * matchId atual, o efeito de anúncio de rodada abaixo NÃO deve mais
     * anunciar nenhuma "rodada nova" desse confronto -- qualquer `round`
     * que a projection ainda entregue depois disso é uma rodada fantasma
     * que nunca vai ser jogada (a tela só ainda não virou `match_win`).
     */
    const matchDecidedIdRef = useRef<string | null>(null)

    /*
     * ============================================================
     * CONTROLE DA ANIMAÇÃO DO ROUND
     * ============================================================
     */

    const [roundAnnounceHold, setRoundAnnounceHold] =
        useState(false)

    const lastRoundAnnounceKeyRef =
        useRef<string | null>(null)

    const revealedVersusRef =
        useRef<IndividualScoreboardProjection['versus']>(null)

    const revealedRoundKeyRef =
        useRef<string | null>(null)

    const prevRoundVersusRef =
        useRef<IndividualScoreboardProjection['versus']>(null)

    /*
     * Este é o ponto importante da correção.
     *
     * O BattleScene pode estar mostrando o ROUND 1 enquanto
     * projection já recebeu o ROUND 2.
     *
     * Então mantemos o snapshot que está realmente sendo
     * exibido pela animação.
     */
    const displayedVersusRef =
        useRef<IndividualScoreboardProjection['versus']>(null)

    const [roundResultHoldDone, setRoundResultHoldDone] =
        useState(true)

    const roundResultTimerRef =
        useRef<number | null>(null)

    const roundAnnounceTimerRef =
        useRef<number | null>(null)

    /*
     * ============================================================
     * AUDIO
     * ============================================================
     */

    const handleUnlockAudio = useCallback(async () => {
        await globalAudio.unlock()
        setAudioUnlocked(true)
    }, [])

    useEffect(() => {
        const AudioContextClass =
            window.AudioContext ||
            (window as any).webkitAudioContext

        if (AudioContextClass) {
            try {
                const testCtx = new AudioContextClass()

                if (testCtx.state === 'running') {
                    globalAudio
                        .unlock()
                        .then(() => setAudioUnlocked(true))
                }

                void testCtx.close()
            } catch {
                /* ignora */
            }
        }
    }, [])

    useEffect(() => {
        if (audioUnlocked) return

        const onUserInteraction = () =>
            void handleUnlockAudio()

        window.addEventListener(
            'keydown',
            onUserInteraction,
        )

        window.addEventListener(
            'pointerdown',
            onUserInteraction,
        )

        return () => {
            window.removeEventListener(
                'keydown',
                onUserInteraction,
            )

            window.removeEventListener(
                'pointerdown',
                onUserInteraction,
            )
        }
    }, [audioUnlocked, handleUnlockAudio])

    /*
     * ============================================================
     * DETECÇÃO DO RESULTADO DO ROUND
     * ============================================================
     */

    useEffect(() => {
        /*
         * Se saiu da tela de round, limpa o estado da animação.
         */
        if (projection?.screen !== 'round') {
            revealedRoundKeyRef.current = null
            prevRoundVersusRef.current = null
            revealedVersusRef.current = null
            displayedVersusRef.current = null
            matchDecidedIdRef.current = null

            if (roundResultTimerRef.current !== null) {
                window.clearTimeout(
                    roundResultTimerRef.current,
                )

                roundResultTimerRef.current = null
            }

            setRoundResultHoldDone(true)

            return
        }

        const v = projection.versus
        const prev = prevRoundVersusRef.current

        if (!v) {
            prevRoundVersusRef.current = null
            return
        }

        /*
         * Assim que a partida é decidida (última rodada com placar final
         * / vencedor definido), marca esse matchId como "encerrado". Isso
         * é o que o efeito de anúncio de rodada usa pra ignorar qualquer
         * `round` seguinte desse mesmo confronto -- mesmo que a projection
         * ainda entregue uma rodada N+1 por um instante antes da tela
         * virar `match_win`, ela não deve mais ser anunciada.
         */
        if (v.finalScoreLabel || v.matchWinnerSide) {
            matchDecidedIdRef.current = v.matchId
        }

        /*
         * Cancela timer anterior antes de iniciar outro.
         */
        const startRoundResultHold = (
            versus: NonNullable<
                IndividualScoreboardProjection['versus']
            >,
            key: string,
        ) => {
            if (revealedRoundKeyRef.current === key) {
                return
            }

            revealedRoundKeyRef.current = key

            /*
             * Congela exatamente o resultado que a BattleScene
             * deve continuar exibindo.
             */
            revealedVersusRef.current = versus
            displayedVersusRef.current = versus

            setRoundResultHoldDone(false)

            if (roundResultTimerRef.current !== null) {
                window.clearTimeout(
                    roundResultTimerRef.current,
                )
            }

            roundResultTimerRef.current =
                window.setTimeout(() => {
                    roundResultTimerRef.current = null

                    setRoundResultHoldDone(true)
                }, ROUND_RESULT_HOLD_MS)
        }

        /*
         * ========================================================
         * CASO A
         *
         * A store publicou o resultado do round antes de avançar.
         * ========================================================
         */

        if (
            !v.timesHidden &&
            v.roundWinnerSide &&
            !Boolean(v.finalScoreLabel)
        ) {
            const key =
                `${v.matchId}-r${v.roundNumber}` +
                `-${v.roundWinnerSide}` +
                `-${v.scoreA}-${v.scoreB}`

            startRoundResultHold(v, key)
        }

        /*
         * ========================================================
         * CASO B
         *
         * A store pulou o frame intermediário e já entregou
         * o próximo round.
         *
         * Nesse caso reconstruímos o resultado do round anterior.
         * ========================================================
         */

        else if (
            prev &&
            prev.matchId === v.matchId &&
            !Boolean(prev.finalScoreLabel) &&
            (
                prev.roundNumber !== v.roundNumber ||
                prev.scoreA !== v.scoreA ||
                prev.scoreB !== v.scoreB
            )
        ) {
            const key =
                `${prev.matchId}-synth-r${prev.roundNumber}` +
                `-${v.scoreA}-${v.scoreB}`

            if (
                revealedRoundKeyRef.current !== key
            ) {
                const winnerSide:
                    | 'left'
                    | 'right'
                    | null =
                    v.scoreA > prev.scoreA
                        ? 'left'
                        : v.scoreB > prev.scoreB
                            ? 'right'
                            : prev.roundWinnerSide

                const revealed = {
                    ...prev,
                    timesHidden: false,
                    roundWinnerSide: winnerSide,
                }

                startRoundResultHold(
                    revealed,
                    key,
                )
            }
        }

        prevRoundVersusRef.current = v
    }, [projection])

    /*
     * ============================================================
     * FLAGS DA TELA
     * ============================================================
     */

    const koHold =
        projection?.screen === 'match_win' &&
        !koHoldDone

    const showDuoQualifiedNow =
        projection?.screen === 'match_win' &&
        !koHold &&
        Boolean(projection?.versus)

    const roundResultHold =
        projection?.screen === 'round' &&
        !roundResultHoldDone

    /*
     * ============================================================
     * ANÚNCIO DO PRÓXIMO ROUND
     * ============================================================
     *
     * IMPORTANTE:
     *
     * Enquanto roundResultHold estiver ativo,
     * o RoundAnnounceScene NÃO pode aparecer.
     *
     * Isso impede:
     *
     * BattleScene ROUND 1
     * +
     * RoundAnnounceScene ROUND 2
     *
     * ao mesmo tempo.
     */

    useEffect(() => {
        if (
            !projection ||
            projection.screen !== 'round' ||
            !projection.versus
        ) {
            lastRoundAnnounceKeyRef.current = null

            if (roundAnnounceTimerRef.current !== null) {
                window.clearTimeout(
                    roundAnnounceTimerRef.current,
                )

                roundAnnounceTimerRef.current = null
            }

            setRoundAnnounceHold(false)

            return
        }

        /*
         * A animação do round anterior ainda está rodando.
         *
         * NÃO iniciar o anúncio.
         */
        if (roundResultHold) {
            return
        }

        const v = projection.versus

        /*
         * A partida desse matchId já foi decidida (última rodada com
         * placar final / vencedor definido) -- qualquer `round` que
         * ainda chegue depois disso é uma rodada fantasma que nunca vai
         * ser jogada, a tela só ainda não virou `match_win`. Não anuncia.
         */
        if (matchDecidedIdRef.current === v.matchId) {
            return
        }

        const key =
            `${v.matchId}-r${v.roundNumber}`

        /*
         * Já anunciamos este round.
         */
        if (
            lastRoundAnnounceKeyRef.current === key
        ) {
            return
        }

        lastRoundAnnounceKeyRef.current = key

        /*
         * Cancela qualquer anúncio antigo.
         */
        if (roundAnnounceTimerRef.current !== null) {
            window.clearTimeout(
                roundAnnounceTimerRef.current,
            )
        }

        setRoundAnnounceHold(true)

        roundAnnounceTimerRef.current =
            window.setTimeout(() => {
                roundAnnounceTimerRef.current = null

                setRoundAnnounceHold(false)
            }, 2500)

        return () => {
            if (
                roundAnnounceTimerRef.current !== null
            ) {
                window.clearTimeout(
                    roundAnnounceTimerRef.current,
                )

                roundAnnounceTimerRef.current = null
            }
        }
    }, [
        projection?.screen,
        projection?.versus?.matchId,
        projection?.versus?.roundNumber,
        roundResultHold,
    ])

    /*
     * ============================================================
     * VERSUS DA BATTLE
     * ============================================================
     *
     * Durante o hold usamos obrigatoriamente o snapshot antigo.
     *
     * Assim, mesmo que projection já esteja no ROUND 2,
     * BattleScene continua recebendo o ROUND 1.
     */

    const versusForBattle =
        roundResultHold &&
            revealedVersusRef.current
            ? revealedVersusRef.current
            : projection?.versus

    /*
     * ============================================================
     * VERSUS DO ANÚNCIO
     * ============================================================
     *
     * O anúncio só usa o projection depois que o hold terminou.
     *
     * Portanto:
     *
     * ROUND 1 segurado
     *       ↓
     * roundResultHold = true
     *       ↓
     * anúncio bloqueado
     *       ↓
     * hold termina
     *       ↓
     * projection = ROUND 2
     *       ↓
     * anúncio ROUND 2
     */

    const versusForAnnouncement =
        projection?.versus

    /*
     * ============================================================
     * ELIMINADO -> CLASSIFICADO
     * ============================================================
     */

    const [showWinnerPanel, setShowWinnerPanel] =
        useState(false)

    const duoQualifiedArmedRef =
        useRef(false)

    useEffect(() => {
        if (
            showDuoQualifiedNow &&
            !duoQualifiedArmedRef.current
        ) {
            duoQualifiedArmedRef.current = true

            setShowWinnerPanel(false)

            const t = window.setTimeout(() => {
                setShowWinnerPanel(true)
            }, LOSER_PANEL_HOLD_MS_INDIVIDUAL)

            return () => window.clearTimeout(t)
        }

        if (!showDuoQualifiedNow) {
            duoQualifiedArmedRef.current = false
            setShowWinnerPanel(false)
        }
    }, [showDuoQualifiedNow])

    /*
     * ============================================================
     * MÚSICA
     * ============================================================
     */

    useEffect(() => {
        if (!projection) return

        if (projection.screen === 'round') {
            globalAudio.playMusic('battleMain')
            globalAudio.playAmbience('coldRoom')
        } else if (projection.screen === 'versus') {
            globalAudio.playMusic('teamSelect')
            globalAudio.playAmbience(null)
        } else if (projection.screen === 'match_win') {
            if (!koHold) {
                globalAudio.playMusic(
                    'championCelebration',
                )

                globalAudio.playAmbience('crowd')
            }
        } else if (projection.screen === 'opening') {
            globalAudio.playMusic('introCinematic')
        } else {
            globalAudio.playMusic(null)
        }

        if (
            projection.screen !== lastScreenRef.current
        ) {
            if (
                projection.screen === 'versus' ||
                projection.screen === 'round'
            ) {
                globalAudio.play('vs_impact')
            }

            lastScreenRef.current =
                projection.screen
        }

        if (
            projection.screen === 'match_win' &&
            !lastMatchWinnerRef.current
        ) {
            lastMatchWinnerRef.current = 'playing'

            setKoHoldDone(false)

            window.setTimeout(() => {
                setKoHoldDone(true)

                lastMatchWinnerRef.current = 'done'

                globalAudio.playMusic(
                    'championCelebration',
                )

                globalAudio.playAmbience('crowd')

                globalAudio.play(
                    'crowd.cheerBig',
                )
            }, MATCH_KO_HOLD_MS)
        } else if (
            projection.screen !== 'match_win'
        ) {
            lastMatchWinnerRef.current = null
            setKoHoldDone(false)
        }
    }, [projection, koHold])

    /*
     * ============================================================
     * SEM PROJECTION
     * ============================================================
     */

    if (!projection) {
        return (
            <div className="scoreboard">
                <OpeningScene
                    tournamentName="Confrontos Individuais"
                    timelineEpoch={0}
                />
            </div>
        )
    }

    /*
     * ============================================================
     * CAMADAS DA BATTLE
     * ============================================================
     */

    const battleLayersScreen:
        | 'versus'
        | 'round'
        | 'match_win'
        | null =
        projection.screen === 'versus' ||
            projection.screen === 'round' ||
            projection.screen === 'match_win'
            ? projection.screen
            : null

    const layers = battleLayersScreen
        ? resolveScoreboardLayers({
            screen: battleLayersScreen,
            hasVersus: Boolean(
                projection.versus,
            ),
            koHold: Boolean(koHold),
            round3Hold: false,
        })
        : null

    const duoVersus = projection.versus
        ? toDuoVersusShape(
            projection.versus,
        )
        : null

    const duoVersusForBattle =
        versusForBattle
            ? toDuoVersusShape(
                versusForBattle,
            )
            : null

    const winnerSideBlue = duoVersus
        ? duoVersus.matchWinnerSide ===
        'left' ||
        (
            duoVersus.matchWinnerSide ==
            null &&
            duoVersus.scoreA >
            duoVersus.scoreB
        )
        : false

    // ----------------------------------------------------------------
    // Dados pra IndividualLineupScene -- mapeia os matches da projection
    // pro shape que a cena espera (mesmos participantes, foto resolvida
    // via photoFor/getPhoto, com placar só quando faz sentido mostrar).
    // ----------------------------------------------------------------
    const lineupMatches: LineupMatch[] = projection.matches
        .filter((m) => m.revealed)
        .map((m) => {
            const scoreA = (m as { scoreA?: number }).scoreA
            const scoreB = (m as { scoreB?: number }).scoreB
            return {
                id: m.id,
                label: m.label,
                participantA: m.participantA
                    ? {
                        id: m.participantA.id,
                        name: m.participantA.name,
                        photoUrl: photoFor(m.participantA, getPhoto),
                    }
                    : null,
                participantB: m.participantB
                    ? {
                        id: m.participantB.id,
                        name: m.participantB.name,
                        photoUrl: photoFor(m.participantB, getPhoto),
                    }
                    : null,
                scoreA: typeof scoreA === 'number' ? scoreA : null,
                scoreB: typeof scoreB === 'number' ? scoreB : null,
            }
        })

    return (
        <>
            {!audioUnlocked && (
                <div
                    onClick={
                        handleUnlockAudio
                    }
                    role="button"
                    tabIndex={0}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 99999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor:
                            'rgba(0,0,0,0.75)',
                        cursor: 'pointer',
                    }}
                >
                    <div
                        style={{
                            color: '#ffcc00',
                            fontSize: 22,
                            textAlign: 'center',
                            padding: 24,
                        }}
                    >
                        Toque ou clique em
                        qualquer lugar para
                        ativar o som do telão
                    </div>
                </div>
            )}

            <div className="scoreboard">
                {projection.screen ===
                    'opening' ? (
                    <OpeningScene
                        tournamentName={
                            projection.tournamentName
                        }
                        timelineEpoch={
                            audioUnlocked
                                ? 'unlocked'
                                : 'locked'
                        }
                    />
                ) : null}

                {projection.screen === 'lineup' ? (
                    <IndividualLineupScene
                        title="CONFRONTOS"
                        matches={lineupMatches}
                        mode="upcoming"
                    />
                ) : null}

                {projection.screen ===
                    'versus' &&
                    duoVersus ? (
                    <VersusScene
                        phaseLabel={projection.versus!.label.toUpperCase()}
                        teamAName={
                            duoVersus.teamAName
                        }
                        teamBName={
                            duoVersus.teamBName
                        }
                        membersA={[
                            {
                                id: duoVersus
                                    .membersA[0]
                                    .id,
                                name: duoVersus
                                    .membersA[0]
                                    .name,
                                photoUrl:
                                    photoFor(
                                        duoVersus
                                            .membersA[0],
                                        getPhoto,
                                    ),
                            },
                            {
                                id: duoVersus
                                    .membersA[1]
                                    .id,
                                name: duoVersus
                                    .membersA[1]
                                    .name,
                                photoUrl:
                                    photoFor(
                                        duoVersus
                                            .membersA[1],
                                        getPhoto,
                                    ),
                            },
                        ]}
                        membersB={[
                            {
                                id: duoVersus
                                    .membersB[0]
                                    .id,
                                name: duoVersus
                                    .membersB[0]
                                    .name,
                                photoUrl:
                                    photoFor(
                                        duoVersus
                                            .membersB[0],
                                        getPhoto,
                                    ),
                            },
                            {
                                id: duoVersus
                                    .membersB[1]
                                    .id,
                                name: duoVersus
                                    .membersB[1]
                                    .name,
                                photoUrl:
                                    photoFor(
                                        duoVersus
                                            .membersB[1],
                                        getPhoto,
                                    ),
                            },
                        ]}
                        targetLabel={
                            duoVersus.targetLabel
                        }
                    />
                ) : null}

                {layers?.showBattle &&
                    duoVersusForBattle ? (
                    <BattleScene
                        versus={
                            duoVersusForBattle
                        }
                        screen={
                            layers.battleScreen
                        }
                        getPhoto={getPhoto}
                        forceMatchFinish={
                            layers.forceMatchFinish
                        }
                        forceRoundWin={
                            layers.forceRoundWin
                        }
                    />
                ) : null}

                {/*
                 * =================================================
                 * ROUND ANNOUNCE
                 * =================================================
                 *
                 * A trava !roundResultHold é fundamental.
                 *
                 * Mesmo que projection já tenha mudado para
                 * ROUND 2, enquanto a BattleScene estiver segurando
                 * o resultado do ROUND 1 este componente não renderiza.
                 */}
                {roundAnnounceHold &&
                    !roundResultHold &&
                    versusForAnnouncement ? (
                    <RoundAnnounceScene
                        roundLabel={`RODADA ${versusForAnnouncement.roundNumber ?? ''} DE 3`}
                        left={{
                            id: versusForAnnouncement
                                .participantA.id,
                            name: versusForAnnouncement
                                .participantA.name,
                            photoUrl: photoFor(
                                versusForAnnouncement
                                    .participantA,
                                getPhoto,
                            ),
                        }}
                        right={{
                            id: versusForAnnouncement
                                .participantB.id,
                            name: versusForAnnouncement
                                .participantB.name,
                            photoUrl: photoFor(
                                versusForAnnouncement
                                    .participantB,
                                getPhoto,
                            ),
                        }}
                        onDone={() =>
                            setRoundAnnounceHold(
                                false,
                            )
                        }
                    />
                ) : null}

                {showDuoQualifiedNow &&
                    projection.versus
                    ? (() => {
                        const winner: IndividualPortraitView =
                            winnerSideBlue
                                ? projection
                                    .versus!
                                    .participantA
                                : projection
                                    .versus!
                                    .participantB

                        const loser: IndividualPortraitView =
                            winnerSideBlue
                                ? projection
                                    .versus!
                                    .participantB
                                : projection
                                    .versus!
                                    .participantA

                        const winnerSide:
                            | 'blue'
                            | 'red' =
                            winnerSideBlue
                                ? 'blue'
                                : 'red'

                        const loserSide:
                            | 'blue'
                            | 'red' =
                            winnerSideBlue
                                ? 'red'
                                : 'blue'

                        return showWinnerPanel ? (
                            <DuoQualifiedScene
                                teamName={
                                    winner.name
                                }
                                scoreA={
                                    projection
                                        .versus!
                                        .scoreA
                                }
                                scoreB={
                                    projection
                                        .versus!
                                        .scoreB
                                }
                                side={
                                    winnerSide
                                }
                                outcome="classified"
                                prizeAmount={0}
                                members={[
                                    {
                                        id: winner.id,
                                        name: winner.name,
                                        photoUrl:
                                            photoFor(
                                                winner,
                                                getPhoto,
                                            ),
                                        fighterVariant:
                                            winner.fighterVariant,
                                    },
                                    {
                                        id: winner.id,
                                        name: winner.name,
                                        photoUrl:
                                            photoFor(
                                                winner,
                                                getPhoto,
                                            ),
                                        fighterVariant:
                                            winner.fighterVariant,
                                    },
                                ]}
                            />
                        ) : (
                            <DuoQualifiedScene
                                teamName={
                                    loser.name
                                }
                                scoreA={
                                    projection
                                        .versus!
                                        .scoreA
                                }
                                scoreB={
                                    projection
                                        .versus!
                                        .scoreB
                                }
                                side={
                                    loserSide
                                }
                                outcome="eliminated"
                                prizeAmount={0}
                                members={[
                                    {
                                        id: loser.id,
                                        name: loser.name,
                                        photoUrl:
                                            photoFor(
                                                loser,
                                                getPhoto,
                                            ),
                                        fighterVariant:
                                            loser.fighterVariant,
                                    },
                                    {
                                        id: loser.id,
                                        name: loser.name,
                                        photoUrl:
                                            photoFor(
                                                loser,
                                                getPhoto,
                                            ),
                                        fighterVariant:
                                            loser.fighterVariant,
                                    },
                                ]}
                            />
                        )
                    })()
                    : null}

                {projection.screen === 'finished' ? (
                    <IndividualLineupScene
                        title="CONFRONTOS INDIVIDUAIS CONCLUÍDOS"
                        subtitle="TODOS OS CONFRONTOS FORAM FINALIZADOS"
                        matches={lineupMatches}
                        mode="finished"
                    />
                ) : null}
            </div>
        </>
    )
}