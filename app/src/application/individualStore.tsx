import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react'

import { createLocalAudio } from '../adapters/audio/localAudio.ts'

import {
    createLocalhostTimerCapture,
    createMockTimerCapture,
} from '../adapters/timerCapture/timerCapture.ts'

import { DomainError } from '../domain/errors.ts'

import type { IndividualCommand } from '../domain/individualCommands.ts'

import {
    createInitialIndividualState,
    handleIndividualCommand,
} from '../domain/individualEngine.ts'

import {
    projectIndividualOperator,
    projectIndividualScoreboard,
} from '../domain/individualProjections.ts'

import type { IndividualTournamentState } from '../domain/individualTypes.ts'

import { createLiveDeps } from '../domain/state.ts'

import { createIndexedDbPersistence } from '../persistence/indexedDb.ts'

import { createSupabaseDisplay } from '../adapters/display/supabaseChannel.ts'


interface IndividualStore {
    state: IndividualTournamentState

    photos: Record<string, string>

    persistenceLabel: string

    error: string | null

    dispatch: (command: IndividualCommand) => void

    undo: () => void

    /**
     * Reseta o torneio, mas mantém os personagens.
     */
    resetTournament: () => void

    uploadPhoto: (
        participantId: string,
        dataUrl: string,
    ) => Promise<void>

    uploadFightPhoto: (
        participantId: string,
        dataUrl: string,
    ) => Promise<void>

    exportBackup: () => Promise<string>

    importBackup: (
        json: string,
    ) => Promise<void>

    simulateTimer: (
        seconds: number,
    ) => void

    revealNextMatchWithCinematic: () => void
}


const Ctx =
    createContext<IndividualStore | null>(null)


/**
 * Tempo da animação do confronto no telão.
 *
 * IMPORTANTE:
 * esse valor deve ser igual ou muito próximo
 * da duração real da cena de revelação.
 */
const MATCH_REVEAL_ANIMATION_MS = 2600


export function IndividualTournamentProvider({
    children,
}: {
    children: ReactNode
}) {
    /**
     * Dependências do domínio.
     */
    const depsRef = useRef(
        createLiveDeps(),
    )


    /**
     * Persistência local.
     */
    const persistence = useRef(
        createIndexedDbPersistence(),
    ).current


    /**
     * Áudio local.
     */
    const audio = useRef(
        createLocalAudio(),
    ).current


    /**
     * Estado atual.
     *
     * A declaração precisa existir antes do
     * callback utilizado pelo display.
     */
    const stateRef =
        useRef<IndividualTournamentState>(
            createInitialIndividualState(
                depsRef.current,
            ),
        )


    /**
     * Display / telão.
     */
    const display = useRef(
        createSupabaseDisplay(
            () =>
                JSON.stringify(
                    projectIndividualScoreboard(
                        stateRef.current,
                    ),
                ),
        ),
    ).current


    /**
     * Timers.
     */
    const mockTimer = useRef(
        createMockTimerCapture(),
    ).current

    const localTimer = useRef(
        createLocalhostTimerCapture(),
    ).current


    /**
     * Histórico para DESFAZER.
     */
    const history =
        useRef<IndividualTournamentState[]>(
            [],
        )


    /**
     * Estado React.
     */
    const [state, setState] =
        useState<IndividualTournamentState>(
            stateRef.current,
        )


    /**
     * Fotos carregadas.
     */
    const [photos, setPhotos] =
        useState<Record<string, string>>(
            {},
        )


    /**
     * Status da persistência.
     */
    const [
        persistenceLabel,
        setPersistenceLabel,
    ] = useState(
        'carregando…',
    )


    /**
     * Erro atual.
     */
    const [error, setError] =
        useState<string | null>(
            null,
        )


    /**
     * Impede duas animações de revelação
     * acontecendo simultaneamente.
     */
    const revealInFlightRef =
        useRef(false)


    /**
     * Timer da animação.
     *
     * Guardamos o ID para podermos cancelar
     * a animação durante desmontagem.
     */
    const revealTimeoutRef =
        useRef<number | null>(null)


    /**
     * Persiste e publica o novo estado.
     */
    const commit = useCallback(
        (
            next: IndividualTournamentState,
            sound?: string,
        ) => {
            /**
             * Atualiza primeiro o ref.
             *
             * Isso é importante porque callbacks
             * assíncronos usam stateRef.current.
             */
            stateRef.current =
                next


            /**
             * Atualiza a interface.
             */
            setState(next)


            /**
             * Publica no telão.
             */
            display.publish(
                JSON.stringify(
                    projectIndividualScoreboard(
                        next,
                    ),
                ),
            )


            /**
             * Toca o som, se houver.
             */
            if (sound) {
                audio.play(sound)
            }


            /**
             * Salva no IndexedDB.
             */
            void persistence
                .save(next as never)
                .then(() => {
                    setPersistenceLabel(
                        `salvo ${new Date().toLocaleTimeString(
                            'pt-BR',
                        )}`,
                    )
                })
                .catch(() => {
                    setPersistenceLabel(
                        'erro ao salvar',
                    )
                })
        },
        [
            audio,
            display,
            persistence,
        ],
    )


    /**
     * Executa um comando do domínio.
     */
    const dispatch = useCallback(
        (
            command: IndividualCommand,
        ) => {
            setError(null)

            try {
                /**
                 * Guarda o estado ANTES do comando.
                 *
                 * Isso permite desfazer inclusive
                 * o ResetIndividualTournament.
                 */
                history.current.push(
                    structuredClone(
                        stateRef.current,
                    ),
                )


                /**
                 * Executa o domínio.
                 */
                const next =
                    handleIndividualCommand(
                        stateRef.current,
                        command,
                        depsRef.current,
                    )


                /**
                 * Define o som da ação.
                 */
                const sound =
                    command.type ===
                        'ConfirmIndividualMatchWinner'
                        ? 'match_win'
                        : command.type ===
                            'ResolveIndividualRound'
                            ? 'round_reveal'
                            : command.type ===
                                'AssignTimerValue' ||
                                command.type ===
                                'RegisterManualTime'
                                ? 'ui_select'
                                : command.type ===
                                    'ResetIndividualTournament'
                                    ? 'ui_confirm'
                                    : 'ui_confirm'


                /**
                 * Salva/publica.
                 */
                commit(
                    next,
                    sound,
                )
            } catch (err) {
                /**
                 * Se o comando falhou,
                 * remove o histórico que acabou
                 * de ser criado.
                 */
                history.current.pop()

                audio.play(
                    'error',
                )

                setError(
                    err instanceof DomainError
                        ? err.message
                        : 'Falha no comando.',
                )
            }
        },
        [
            audio,
            commit,
        ],
    )


    /**
     * Reset explícito.
     *
     * IMPORTANTE:
     * o engine é responsável por preservar
     * os personagens.
     */
    const resetTournament =
        useCallback(() => {
            dispatch({
                type:
                    'ResetIndividualTournament',
            })
        }, [
            dispatch,
        ])


    /**
     * Carregamento inicial + captura dos timers.
     */
    useEffect(() => {
        let cancelled = false


        /**
         * Carrega o estado salvo.
         */
        void persistence
            .load()
            .then(
                (
                    loaded,
                ) => {
                    if (cancelled) {
                        return
                    }


                    if (
                        loaded &&
                        (
                            loaded as unknown as IndividualTournamentState
                        ).schemaVersion
                    ) {
                        const loadedIndividual =
                            loaded as unknown as IndividualTournamentState


                        /**
                         * O estado carregado não entra
                         * no histórico de desfazer.
                         */
                        history.current =
                            []


                        commit(
                            loadedIndividual,
                        )


                        setPersistenceLabel(
                            'restaurado',
                        )
                    } else {
                        setPersistenceLabel(
                            'novo torneio individual',
                        )
                    }
                },
            )
            .catch(() => {
                if (!cancelled) {
                    setPersistenceLabel(
                        'erro ao carregar',
                    )
                }
            })


        /**
         * Recebe valores detectados pelo timer.
         */
        const onCandidate = (
            candidate: {
                valueSeconds: number
                confidence?: number
                frameId?: string | null
            },
        ) => {
            try {
                const next =
                    handleIndividualCommand(
                        stateRef.current,
                        {
                            type:
                                'ReceiveTimerCandidate',

                            valueSeconds:
                                candidate.valueSeconds,

                            confidence:
                                candidate.confidence ??
                                1,

                            frameId:
                                candidate.frameId ??
                                null,
                        },
                        depsRef.current,
                    )


                commit(
                    next,
                )
            } catch {
                /**
                 * Ignora candidatos que o domínio
                 * não aceitar.
                 */
            }
        }


        /**
         * Inicia timers.
         */
        void mockTimer.start(
            onCandidate,
        )

        void localTimer.start(
            onCandidate,
        )


        /**
         * Cleanup.
         */
        return () => {
            cancelled = true

            void mockTimer.stop()

            void localTimer.stop()


            if (
                revealTimeoutRef.current !==
                null
            ) {
                window.clearTimeout(
                    revealTimeoutRef.current,
                )

                revealTimeoutRef.current =
                    null
            }


            revealInFlightRef.current =
                false
        }
    }, [
        commit,
        localTimer,
        mockTimer,
        persistence,
    ])


    /**
     * API exposta pelo contexto.
     */
    const value =
        useMemo<IndividualStore>(
            () => ({
                state,

                photos,

                persistenceLabel,

                error,

                dispatch,


                /**
                 * Reseta o torneio.
                 *
                 * Os personagens continuam
                 * cadastrados.
                 */
                resetTournament,


                /**
                 * DESFAZER.
                 */
                undo() {
                    const previous =
                        history.current.pop()


                    if (!previous) {
                        setError(
                            'Nada para desfazer.',
                        )

                        return
                    }


                    setError(null)


                    commit(
                        previous,
                    )
                },


                /**
                 * Upload da foto normal.
                 */
                async uploadPhoto(
                    participantId,
                    dataUrl,
                ) {
                    const id =
                        `individual_photo_${participantId}`


                    await persistence.savePhoto(
                        id,
                        dataUrl,
                    )


                    setPhotos(
                        (
                            current,
                        ) => ({
                            ...current,
                            [id]:
                                dataUrl,
                        }),
                    )


                    dispatch({
                        type:
                            'UploadIndividualParticipantPhoto',

                        participantId,

                        photoAssetId:
                            id,
                    })
                },


                /**
                 * Upload da foto de luta.
                 */
                async uploadFightPhoto(
                    participantId,
                    dataUrl,
                ) {
                    const id =
                        `individual_fight_photo_${participantId}`


                    await persistence.savePhoto(
                        id,
                        dataUrl,
                    )


                    setPhotos(
                        (
                            current,
                        ) => ({
                            ...current,
                            [id]:
                                dataUrl,
                        }),
                    )


                    dispatch({
                        type:
                            'UploadIndividualParticipantFightPhoto',

                        participantId,

                        fightPhotoAssetId:
                            id,
                    })
                },


                /**
                 * Exporta backup.
                 */
                exportBackup() {
                    return persistence
                        .exportBackup()
                },


                /**
                 * Importa backup.
                 */
                async importBackup(
                    json,
                ) {
                    try {
                        const next =
                            JSON.parse(
                                json,
                            ) as IndividualTournamentState


                        /**
                         * Backup importado vira
                         * um novo ponto inicial.
                         */
                        history.current =
                            []


                        setError(
                            null,
                        )


                        commit(
                            next,
                            'ui_confirm',
                        )
                    } catch {
                        setError(
                            'Backup inválido.',
                        )
                    }
                },


                /**
                 * Simula timer.
                 */
                simulateTimer(
                    seconds,
                ) {
                    mockTimer.simulate(
                        seconds,
                    )
                },


                /**
                 * Revelação cinematográfica.
                 */
                revealNextMatchWithCinematic() {
                    /**
                     * Não permite duas animações
                     * ao mesmo tempo.
                     */
                    if (
                        revealInFlightRef.current
                    ) {
                        return
                    }


                    /**
                     * Procura o próximo confronto
                     * ainda não revelado.
                     */
                    const pending =
                        [
                            ...stateRef
                                .current
                                .matches,
                        ]
                            .filter(
                                (
                                    item,
                                ) =>
                                    !item.revealed,
                            )
                            .sort(
                                (
                                    a,
                                    b,
                                ) =>
                                    a.position -
                                    b.position,
                            )[0]


                    /**
                     * Não existe confronto pendente.
                     */
                    if (!pending) {
                        setError(
                            'Todos os confrontos já foram revelados.',
                        )

                        return
                    }


                    /**
                     * Publica a cena no telão.
                     */
                    display.publishCinematic(
                        {
                            type:
                                'individual_match_reveal',

                            matchId:
                                pending.id,

                            participantAId:
                                pending.participantAId,

                            participantBId:
                                pending.participantBId,

                            label:
                                pending.label,
                        } as never,
                    )


                    /**
                     * Bloqueia nova revelação.
                     */
                    revealInFlightRef.current =
                        true


                    /**
                     * Limpa timeout anterior,
                     * por segurança.
                     */
                    if (
                        revealTimeoutRef.current !==
                        null
                    ) {
                        window.clearTimeout(
                            revealTimeoutRef.current,
                        )
                    }


                    /**
                     * Só depois da animação
                     * marca o confronto como revelado.
                     */
                    revealTimeoutRef.current =
                        window.setTimeout(
                            () => {
                                revealTimeoutRef.current =
                                    null

                                revealInFlightRef.current =
                                    false


                                dispatch({
                                    type:
                                        'RevealNextIndividualMatch',
                                })
                            },
                            MATCH_REVEAL_ANIMATION_MS,
                        )
                },
            }),
            [
                commit,
                dispatch,
                display,
                error,
                mockTimer,
                persistence,
                persistenceLabel,
                photos,
                resetTournament,
                state,
            ],
        )


    return (
        <Ctx.Provider
            value={value}
        >
            {children}
        </Ctx.Provider>
    )
}


/**
 * Hook principal.
 */
export function useIndividualTournament(): IndividualStore {
    const value =
        useContext(
            Ctx,
        )


    if (!value) {
        throw new Error(
            'IndividualTournamentProvider ausente',
        )
    }


    return value
}


/**
 * Projeção para o operador.
 */
export function useOperatorViewIndividual() {
    const store =
        useIndividualTournament()


    return {
        ...store,

        view:
            projectIndividualOperator(
                store.state,
                store.persistenceLabel,
            ),
    }
}
