import { useMemo, useState } from 'react'
import { useOperatorViewIndividual } from '../../application/individualStore.tsx'
import {
    formatRaceTime,
    msToSeconds,
    parseRaceTime,
    randomRaceTargetMs,
} from '../../domain/time.ts'
import { getParticipantAvatar } from '../../domain/participants.ts'
import type { Participant } from '../../domain/types.ts'
import '../theme/operator.css'
import { validatePositiveRaceTimeInput } from './matchRoundControls.ts'

const PAGE_SIZE = 8

const STATUS_LABEL: Record<string, string> = {
    setup: 'Preparação',
    revealing_matchups: 'Revelação dos confrontos',
    in_progress: 'Em andamento',
    finished: 'Finalizado',
}

function usePagination<T>(items: T[], pageSize = PAGE_SIZE) {
    const [page, setPage] = useState(0)

    const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
    const safePage = Math.min(page, pageCount - 1)
    const start = safePage * pageSize
    const pageItems = items.slice(start, start + pageSize)

    return {
        page: safePage,
        pageCount,
        pageItems,
        setPage: (next: number) =>
            setPage(Math.max(0, Math.min(next, pageCount - 1))),
    }
}

function Thumb({
    src,
    name,
}: {
    src: string | null
    name: string
}) {
    if (src) {
        return (
            <img
                className="op-thumb"
                src={src}
                alt={name}
            />
        )
    }

    return (
        <span className="op-thumb-placeholder">
            {name.slice(0, 1).toUpperCase() || '?'}
        </span>
    )
}

function Pagination({
    page,
    pageCount,
    onChange,
    total,
}: {
    page: number
    pageCount: number
    onChange: (n: number) => void
    total: number
}) {
    if (total === 0) return null

    return (
        <div className="op-pagination">
            <span>
                Página {page + 1} de {pageCount} — {total} registro(s)
            </span>

            <div className="op-pagination-controls">
                <button
                    className="op-btn ghost small"
                    disabled={page === 0}
                    onClick={() => onChange(page - 1)}
                >
                    Anterior
                </button>

                <button
                    className="op-btn ghost small"
                    disabled={page >= pageCount - 1}
                    onClick={() => onChange(page + 1)}
                >
                    Próxima
                </button>
            </div>
        </div>
    )
}

function maskRaceTimeDigits(digits: string) {
    const d = digits.slice(0, 6)

    let out = ''

    for (let i = 0; i < d.length; i++) {
        if (i === 2 || i === 4) {
            out += ':'
        }

        out += d[i]
    }

    return out
}

function RaceTimeInput({
    value,
    onChange,
    placeholder,
    ariaInvalid,
}: {
    value: string
    onChange: (next: string) => void
    placeholder?: string
    ariaInvalid?: boolean
}) {
    return (
        <input
            value={value}
            inputMode="numeric"
            autoComplete="off"
            placeholder={placeholder ?? '00:00:00'}
            aria-invalid={ariaInvalid}
            onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '')
                onChange(maskRaceTimeDigits(digits))
            }}
            onKeyDown={(e) => {
                if (e.key === 'Backspace' && value.endsWith(':')) {
                    e.preventDefault()

                    const digits = value
                        .replace(/\D/g, '')
                        .slice(0, -1)

                    onChange(maskRaceTimeDigits(digits))
                }
            }}
            maxLength={8}
        />
    )
}

function ParticipantsPanel({
    participants,
    photoOf,
    onAdd,
    onEdit,
    onRemove,
    onPhoto,
}: {
    participants: Participant[]
    photoOf: (person: Participant) => string | null
    onAdd: (
        name: string,
        fighterVariant: 'male' | 'female'
    ) => void
    onEdit: (
        id: string,
        name: string,
        fighterVariant: 'male' | 'female'
    ) => void
    onRemove: (id: string) => void
    onPhoto: (id: string, dataUrl: string) => void
}) {
    const [name, setName] = useState('')
    const [fighterVariant, setFighterVariant] =
        useState<'male' | 'female'>('male')

    const [editingId, setEditingId] =
        useState<string | null>(null)

    const [editingName, setEditingName] = useState('')

    const [editingVariant, setEditingVariant] =
        useState<'male' | 'female'>('male')

    const sorted = useMemo(
        () =>
            [...participants].sort((a, b) =>
                a.name.localeCompare(b.name, 'pt-BR')
            ),
        [participants]
    )

    const {
        page,
        pageCount,
        pageItems,
        setPage,
    } = usePagination(sorted)

    return (
        <div className="op-card">
            <h2>Participantes (Individual)</h2>

            <p className="op-subtitle">
                Cadastro próprio deste torneio individual — não
                compartilha lista com o modo Duplas.
            </p>

            <div className="op-card-actions">
                <input
                    value={name}
                    onChange={(e) =>
                        setName(e.target.value)
                    }
                    placeholder="Nome do participante"
                    style={{
                        flex: 2,
                        minWidth: 160,
                    }}
                    onKeyDown={(e) => {
                        if (
                            e.key === 'Enter' &&
                            name.trim()
                        ) {
                            onAdd(
                                name,
                                fighterVariant
                            )

                            setName('')
                        }
                    }}
                />

                <select
                    value={fighterVariant}
                    onChange={(e) =>
                        setFighterVariant(
                            e.target.value as
                            | 'male'
                            | 'female'
                        )
                    }
                >
                    <option value="male">
                        Masculino
                    </option>

                    <option value="female">
                        Feminino
                    </option>
                </select>

                <button
                    className="op-btn"
                    disabled={!name.trim()}
                    onClick={() => {
                        onAdd(
                            name,
                            fighterVariant
                        )

                        setName('')
                    }}
                >
                    Adicionar
                </button>
            </div>

            {pageItems.length === 0 ? (
                <div className="op-empty">
                    Nenhum participante nesta página.
                </div>
            ) : (
                <div className="op-table-wrap">
                    <table className="op-table">
                        <thead>
                            <tr>
                                <th></th>
                                <th>Nome</th>
                                <th>Variante</th>
                                <th>Foto</th>
                                <th style={{ textAlign: 'right' }}>
                                    Ações
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {pageItems.map((person) => (
                                <tr key={person.id}>
                                    <td>
                                        <Thumb
                                            src={photoOf(person)}
                                            name={person.name}
                                        />
                                    </td>

                                    <td>
                                        {editingId === person.id ? (
                                            <input
                                                value={editingName}
                                                onChange={(e) =>
                                                    setEditingName(
                                                        e.target.value
                                                    )
                                                }
                                            />
                                        ) : (
                                            person.name
                                        )}
                                    </td>

                                    <td>
                                        {editingId === person.id ? (
                                            <select
                                                value={editingVariant}
                                                onChange={(e) =>
                                                    setEditingVariant(
                                                        e.target.value as
                                                        | 'male'
                                                        | 'female'
                                                    )
                                                }
                                            >
                                                <option value="male">
                                                    Masculino
                                                </option>

                                                <option value="female">
                                                    Feminino
                                                </option>
                                            </select>
                                        ) : (
                                            (person.fighterVariant ??
                                                'male') ===
                                                'female'
                                                ? 'Feminino'
                                                : 'Masculino'
                                        )}
                                    </td>

                                    <td>
                                        <label className="op-file-label">
                                            Trocar

                                            <input
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp"
                                                onChange={(event) => {
                                                    const file =
                                                        event.target.files?.[0]

                                                    if (!file) return

                                                    const reader =
                                                        new FileReader()

                                                    reader.onload = () =>
                                                        onPhoto(
                                                            person.id,
                                                            String(
                                                                reader.result
                                                            )
                                                        )

                                                    reader.readAsDataURL(
                                                        file
                                                    )
                                                }}
                                            />
                                        </label>
                                    </td>

                                    <td
                                        style={{
                                            textAlign: 'right',
                                        }}
                                    >
                                        {editingId === person.id ? (
                                            <>
                                                <button
                                                    className="op-btn small"
                                                    onClick={() => {
                                                        onEdit(
                                                            person.id,
                                                            editingName,
                                                            editingVariant
                                                        )

                                                        setEditingId(
                                                            null
                                                        )
                                                    }}
                                                >
                                                    Salvar
                                                </button>{' '}

                                                <button
                                                    className="op-btn ghost small"
                                                    onClick={() =>
                                                        setEditingId(
                                                            null
                                                        )
                                                    }
                                                >
                                                    Cancelar
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    className="op-btn ghost small"
                                                    onClick={() => {
                                                        setEditingId(
                                                            person.id
                                                        )

                                                        setEditingName(
                                                            person.name
                                                        )

                                                        setEditingVariant(
                                                            person.fighterVariant ??
                                                            'male'
                                                        )
                                                    }}
                                                >
                                                    Editar
                                                </button>{' '}

                                                <button
                                                    className="op-btn danger small"
                                                    onClick={() =>
                                                        onRemove(
                                                            person.id
                                                        )
                                                    }
                                                >
                                                    Excluir
                                                </button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <Pagination
                page={page}
                pageCount={pageCount}
                total={sorted.length}
                onChange={setPage}
            />
        </div>
    )
}

function MatchupsPanel({
    participants,
    matches,
    onAdd,
    onEdit,
    onRemove,
}: {
    participants: Participant[]
    matches: {
        id: string
        label: string
        position: number
        participantAId: string
        participantBId: string
        status: string
    }[]
    onAdd: (input: {
        label: string
        a: string
        b: string
        position: number
    }) => void
    onEdit: (
        id: string,
        input: {
            label: string
            a: string
            b: string
            position: number
        }
    ) => void
    onRemove: (id: string) => void
}) {
    const [label, setLabel] = useState('')
    const [a, setA] = useState('')
    const [b, setB] = useState('')

    const [editingId, setEditingId] =
        useState<string | null>(null)

    const [editState, setEditState] = useState({
        label: '',
        a: '',
        b: '',
        position: 1,
    })

    const byId = useMemo(
        () =>
            new Map(
                participants.map((p) => [
                    p.id,
                    p,
                ])
            ),
        [participants]
    )

    const sortedMatches = useMemo(
        () =>
            [...matches].sort(
                (x, y) =>
                    x.position - y.position
            ),
        [matches]
    )

    const {
        page,
        pageCount,
        pageItems,
        setPage,
    } = usePagination(sortedMatches)

    return (
        <div className="op-card">
            <h2>Confrontos (pré-definidos)</h2>

            <p className="op-subtitle">
                Você define quem enfrenta quem — o telão
                só encena a revelação, nunca sorteia de fato.
            </p>

            <div className="op-card-actions">
                <input
                    value={label}
                    onChange={(e) =>
                        setLabel(e.target.value)
                    }
                    placeholder="Rótulo (opcional)"
                    style={{
                        flex: 2,
                        minWidth: 160,
                    }}
                />

                <select
                    value={a}
                    onChange={(e) =>
                        setA(e.target.value)
                    }
                >
                    <option value="">
                        Jogador A
                    </option>

                    {participants.map((p) => (
                        <option
                            key={p.id}
                            value={p.id}
                        >
                            {p.name}
                        </option>
                    ))}
                </select>

                <select
                    value={b}
                    onChange={(e) =>
                        setB(e.target.value)
                    }
                >
                    <option value="">
                        Jogador B
                    </option>

                    {participants
                        .filter(
                            (p) => p.id !== a
                        )
                        .map((p) => (
                            <option
                                key={p.id}
                                value={p.id}
                            >
                                {p.name}
                            </option>
                        ))}
                </select>

                <button
                    className="op-btn"
                    disabled={!a || !b}
                    onClick={() => {
                        onAdd({
                            label,
                            a,
                            b,
                            position:
                                matches.length + 1,
                        })

                        setLabel('')
                        setA('')
                        setB('')
                    }}
                >
                    Adicionar confronto
                </button>
            </div>

            {pageItems.length === 0 ? (
                <div className="op-empty">
                    Nenhum confronto nesta página.
                </div>
            ) : (
                <div className="op-table-wrap">
                    <table className="op-table">
                        <thead>
                            <tr>
                                <th>Ordem</th>
                                <th>Rótulo</th>
                                <th>Confronto</th>
                                <th style={{ textAlign: 'right' }}>
                                    Ações
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {pageItems.map((match) => (
                                <tr key={match.id}>
                                    <td>
                                        {match.position}
                                    </td>

                                    <td>
                                        {match.label}
                                    </td>

                                    <td>
                                        {
                                            byId.get(
                                                match.participantAId
                                            )?.name
                                        }{' '}
                                        x{' '}
                                        {
                                            byId.get(
                                                match.participantBId
                                            )?.name
                                        }
                                    </td>

                                    <td
                                        style={{
                                            textAlign:
                                                'right',
                                        }}
                                    >
                                        <button
                                            className="op-btn ghost small"
                                            onClick={() => {
                                                setEditingId(
                                                    match.id
                                                )

                                                setEditState({
                                                    label: match.label,
                                                    a: match.participantAId,
                                                    b: match.participantBId,
                                                    position:
                                                        match.position,
                                                })
                                            }}
                                        >
                                            Editar
                                        </button>{' '}

                                        <button
                                            className="op-btn danger small"
                                            onClick={() =>
                                                onRemove(
                                                    match.id
                                                )
                                            }
                                        >
                                            Remover
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <Pagination
                page={page}
                pageCount={pageCount}
                total={sortedMatches.length}
                onChange={setPage}
            />

            {editingId ? (
                <div className="op-inline-edit">
                    <input
                        value={editState.label}
                        onChange={(e) =>
                            setEditState((s) => ({
                                ...s,
                                label: e.target.value,
                            }))
                        }
                        placeholder="Rótulo"
                    />

                    <select
                        value={editState.a}
                        onChange={(e) =>
                            setEditState((s) => ({
                                ...s,
                                a: e.target.value,
                            }))
                        }
                    >
                        {participants.map((p) => (
                            <option
                                key={p.id}
                                value={p.id}
                            >
                                {p.name}
                            </option>
                        ))}
                    </select>

                    <select
                        value={editState.b}
                        onChange={(e) =>
                            setEditState((s) => ({
                                ...s,
                                b: e.target.value,
                            }))
                        }
                    >
                        {participants
                            .filter(
                                (p) =>
                                    p.id !==
                                    editState.a
                            )
                            .map((p) => (
                                <option
                                    key={p.id}
                                    value={p.id}
                                >
                                    {p.name}
                                </option>
                            ))}
                    </select>

                    <input
                        type="number"
                        value={editState.position}
                        onChange={(e) =>
                            setEditState((s) => ({
                                ...s,
                                position:
                                    Number(
                                        e.target.value
                                    ) || 1,
                            }))
                        }
                        style={{ width: 70 }}
                    />

                    <button
                        className="op-btn small"
                        onClick={() => {
                            onEdit(
                                editingId,
                                editState
                            )

                            setEditingId(null)
                        }}
                    >
                        Salvar
                    </button>

                    <button
                        className="op-btn ghost small"
                        onClick={() =>
                            setEditingId(null)
                        }
                    >
                        Cancelar
                    </button>
                </div>
            ) : null}
        </div>
    )
}

export function OperatorAppIndividual() {
    const store = useOperatorViewIndividual()

    const {
        state,
        view,
        photos,
        dispatch,
    } = store

    const [target, setTarget] =
        useState('00:01:50')

    const [manual, setManual] =
        useState('00:01:56')

    const [sim, setSim] =
        useState('00:01:56')

    const [targetError, setTargetError] =
        useState<string | null>(null)

    const [manualError, setManualError] =
        useState<string | null>(null)

    const [simError, setSimError] =
        useState<string | null>(null)

    const photoOf = (person: Participant) =>
        (person.photoAssetId &&
            photos[person.photoAssetId]) ||
        person.avatar ||
        getParticipantAvatar(person) ||
        null

    const match = state.matches.find(
        (item) =>
            item.id === state.activeMatchId
    )

    const round = state.rounds.find(
        (item) =>
            item.id === state.activeRoundId
    )

    const nameOf = (
        id: string | null
    ) =>
        state.participants.find(
            (p) => p.id === id
        )?.name ?? 'A definir'

    const matchBlocksStart =
        state.matches.some(
            (item) =>
                item.status === 'active' ||
                item.status ===
                'awaiting_confirmation'
        )

    /**
     * Reinicia TODO o torneio, mas mantém
     * os participantes cadastrados.
     */
    const resetTournament = () => {
        const confirmed =
            window.confirm(
                'Tem certeza que deseja reiniciar o torneio?\n\n' +
                'Todos os confrontos, rodadas, resultados, ' +
                'placares e progresso serão apagados.\n\n' +
                'Os participantes serão mantidos para que você ' +
                'possa programar os confrontos novamente.'
            )

        if (!confirmed) return

        dispatch({
            type: 'ResetIndividualTournament',
        })
    }

    return (
        <div className="operator-app">
            <header className="op-topbar">
                <div className="op-brand">
                    Painel do Operador — Individual

                    <span className="op-status-pill">
                        {STATUS_LABEL[
                            state.status
                        ] ??
                            state.status}
                    </span>

                    <span className="op-status-pill">
                        {
                            store.persistenceLabel
                        }
                    </span>
                </div>

                <div className="op-topbar-actions">
                    <a
                        className="op-btn secondary"
                        href="/telao-individual"
                        target="_blank"
                        rel="noreferrer"
                    >
                        Abrir telão
                    </a>

                    <button
                        className="op-btn ghost"
                        onClick={store.undo}
                    >
                        Desfazer
                    </button>

                    {/* NOVO BOTÃO */}
                    <button
                        className="op-btn danger"
                        onClick={
                            resetTournament
                        }
                    >
                        Reiniciar torneio
                    </button>

                    <button
                        className="op-btn ghost"
                        onClick={async () => {
                            const json =
                                await store.exportBackup()

                            const blob =
                                new Blob(
                                    [json],
                                    {
                                        type: 'application/json',
                                    }
                                )

                            const url =
                                URL.createObjectURL(
                                    blob
                                )

                            const a =
                                document.createElement(
                                    'a'
                                )

                            a.href = url
                            a.download =
                                'individual-backup.json'

                            a.click()

                            URL.revokeObjectURL(
                                url
                            )
                        }}
                    >
                        Exportar backup
                    </button>

                    <label className="op-file-label">
                        Importar

                        <input
                            type="file"
                            accept="application/json"
                            onChange={(
                                event
                            ) => {
                                const file =
                                    event.target
                                        .files?.[0]

                                if (!file)
                                    return

                                void file
                                    .text()
                                    .then(
                                        (
                                            text
                                        ) =>
                                            store.importBackup(
                                                text
                                            )
                                    )
                            }}
                        />
                    </label>
                </div>
            </header>

            <main className="op-main">
                {store.error ? (
                    <div className="op-banner error">
                        {store.error}
                    </div>
                ) : null}

                {state.status ===
                    'setup' ? (
                    <div className="op-grid-2">
                        <ParticipantsPanel
                            participants={
                                state.participants
                            }
                            photoOf={
                                photoOf
                            }
                            onAdd={(
                                name,
                                fighterVariant
                            ) =>
                                dispatch({
                                    type: 'RegisterIndividualParticipant',
                                    name,
                                    fighterVariant,
                                })
                            }
                            onEdit={(
                                id,
                                name,
                                fighterVariant
                            ) =>
                                dispatch({
                                    type: 'EditIndividualParticipant',
                                    participantId:
                                        id,
                                    name,
                                    fighterVariant,
                                })
                            }
                            onRemove={(id) =>
                                dispatch({
                                    type: 'RemoveIndividualParticipant',
                                    participantId:
                                        id,
                                })
                            }
                            onPhoto={(
                                id,
                                dataUrl
                            ) =>
                                void store.uploadPhoto(
                                    id,
                                    dataUrl
                                )
                            }
                        />

                        <MatchupsPanel
                            participants={
                                state.participants
                            }
                            matches={
                                state.matches
                            }
                            onAdd={({
                                label,
                                a,
                                b,
                                position,
                            }) =>
                                dispatch({
                                    type: 'DefineIndividualMatch',
                                    label,
                                    participantAId:
                                        a,
                                    participantBId:
                                        b,
                                    position,
                                })
                            }
                            onEdit={(
                                id,
                                {
                                    label,
                                    a,
                                    b,
                                    position,
                                }
                            ) =>
                                dispatch({
                                    type: 'EditIndividualMatch',
                                    matchId:
                                        id,
                                    label,
                                    participantAId:
                                        a,
                                    participantBId:
                                        b,
                                    position,
                                })
                            }
                            onRemove={(id) =>
                                dispatch({
                                    type: 'RemoveIndividualMatch',
                                    matchId:
                                        id,
                                })
                            }
                        />

                        <div
                            className="op-card"
                            style={{
                                gridColumn:
                                    '1 / -1',
                            }}
                        >
                            <h2>
                                Iniciar confrontos
                            </h2>

                            <p className="op-subtitle">
                                Exige ao menos
                                um confronto
                                definido.
                            </p>

                            <button
                                className="op-btn"
                                disabled={
                                    state.matches
                                        .length ===
                                    0
                                }
                                onClick={() =>
                                    dispatch({
                                        type: 'StartIndividualReveal',
                                    })
                                }
                            >
                                Iniciar revelação
                                cenográfica
                            </button>
                        </div>
                    </div>
                ) : null}

                {state.status ===
                    'revealing_matchups' ? (
                    <div className="op-card">
                        <h2>
                            Revelação dos
                            confrontos
                        </h2>

                        <p className="op-subtitle">
                            O operador vê o
                            confronto real. O
                            telão encena a
                            revelação — nunca
                            sorteia de novo.
                        </p>

                        <div className="op-card-actions">
                            <button
                                className="op-btn"
                                onClick={
                                    store.revealNextMatchWithCinematic
                                }
                            >
                                Revelar próximo
                                confronto
                            </button>

                            {/* PERMITE REINICIAR
                                MESMO DURANTE A
                                REVELAÇÃO */}
                            <button
                                className="op-btn danger"
                                onClick={
                                    resetTournament
                                }
                            >
                                Reiniciar torneio
                            </button>
                        </div>

                        <div className="op-table-wrap">
                            <table
                                className="op-table"
                                style={{
                                    marginTop: 16,
                                }}
                            >
                                <thead>
                                    <tr>
                                        <th>
                                            #
                                        </th>
                                        <th>
                                            Confronto
                                        </th>
                                        <th>
                                            Status
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {[
                                        ...state.matches,
                                    ]
                                        .sort(
                                            (
                                                a,
                                                b
                                            ) =>
                                                a.position -
                                                b.position
                                        )
                                        .map(
                                            (
                                                item
                                            ) => (
                                                <tr
                                                    key={
                                                        item.id
                                                    }
                                                >
                                                    <td>
                                                        {
                                                            item.position
                                                        }
                                                    </td>

                                                    <td>
                                                        {nameOf(
                                                            item.participantAId
                                                        )}{' '}
                                                        x{' '}
                                                        {nameOf(
                                                            item.participantBId
                                                        )}
                                                    </td>

                                                    <td>
                                                        {item.revealed
                                                            ? 'Revelado'
                                                            : 'Aguardando'}
                                                    </td>
                                                </tr>
                                            )
                                        )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : null}

                {state.status ===
                    'in_progress' ||
                    state.status ===
                    'finished' ? (
                    <div className="op-card">
                        <div
                            style={{
                                display: 'flex',
                                alignItems:
                                    'center',
                                justifyContent:
                                    'space-between',
                                gap: 16,
                            }}
                        >
                            <div>
                                <h2>
                                    Confrontos
                                </h2>
                            </div>

                            <button
                                className="op-btn danger"
                                onClick={
                                    resetTournament
                                }
                            >
                                Reiniciar torneio
                            </button>
                        </div>

                        <div className="op-bracket-grid">
                            {state.matches.map(
                                (item) => (
                                    <div
                                        className={`op-match-card ${item.id ===
                                            state.activeMatchId
                                            ? 'active-match'
                                            : ''
                                            }`}
                                        key={
                                            item.id
                                        }
                                    >
                                        <div
                                            className="op-subtitle"
                                            style={{
                                                margin: 0,
                                            }}
                                        >
                                            {
                                                item.label
                                            }
                                        </div>

                                        <div>
                                            {nameOf(
                                                item.participantAId
                                            )}{' '}
                                            <strong>
                                                {
                                                    item.scoreA
                                                }{' '}
                                                x{' '}
                                                {
                                                    item.scoreB
                                                }
                                            </strong>{' '}
                                            {nameOf(
                                                item.participantBId
                                            )}
                                        </div>

                                        {item.status ===
                                            'awaiting_confirmation' ? (
                                            <button
                                                className="op-btn small"
                                                onClick={() =>
                                                    dispatch(
                                                        {
                                                            type: 'ConfirmIndividualMatchWinner',
                                                            matchId:
                                                                item.id,
                                                        }
                                                    )
                                                }
                                            >
                                                Confirmar
                                                vencedor
                                            </button>
                                        ) : (
                                            <button
                                                className="op-btn small"
                                                disabled={
                                                    item.status !==
                                                    'pending' ||
                                                    matchBlocksStart
                                                }
                                                onClick={() =>
                                                    dispatch(
                                                        {
                                                            type: 'StartIndividualMatch',
                                                            matchId:
                                                                item.id,
                                                        }
                                                    )
                                                }
                                            >
                                                Iniciar
                                                confronto
                                            </button>
                                        )}
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                ) : null}

                {match ? (
                    <div className="op-card">
                        <h2>
                            Confronto{' '}
                            {match.label} —{' '}
                            {match.scoreA} x{' '}
                            {match.scoreB}
                        </h2>

                        {match.status ===
                            'awaiting_confirmation' ||
                            view.canResolveRound ||
                            view.canStartTiebreaker ? (
                            <div className="op-card-actions">
                                {match.status ===
                                    'awaiting_confirmation' ? (
                                    <button
                                        className="op-btn"
                                        onClick={() =>
                                            dispatch(
                                                {
                                                    type: 'ConfirmIndividualMatchWinner',
                                                }
                                            )
                                        }
                                    >
                                        Confirmar
                                        vencedor
                                    </button>
                                ) : null}

                                {view.canResolveRound ? (
                                    <button
                                        className="op-btn"
                                        onClick={() =>
                                            dispatch(
                                                {
                                                    type: 'ResolveIndividualRound',
                                                }
                                            )
                                        }
                                    >
                                        Calcular,
                                        revelar e
                                        confirmar
                                    </button>
                                ) : null}

                                {view.canStartTiebreaker ? (
                                    <button
                                        className="op-btn ghost"
                                        onClick={() =>
                                            dispatch(
                                                {
                                                    type: 'StartIndividualTiebreaker',
                                                }
                                            )
                                        }
                                    >
                                        Refazer
                                        rodada
                                        (empate)
                                    </button>
                                ) : null}
                            </div>
                        ) : null}

                        {round ? (
                            <div
                                className="op-inline-edit"
                                style={{
                                    display:
                                        'flex',
                                    flexDirection:
                                        'column',
                                    alignItems:
                                        'stretch',
                                }}
                            >
                                <div
                                    className="op-subtitle"
                                    style={{
                                        margin: 0,
                                    }}
                                >
                                    Rodada{' '}
                                    {
                                        round.number
                                    }{' '}
                                    de 3 —{' '}
                                    {
                                        round.status
                                    }

                                    {round.targetTimeMs !==
                                        null
                                        ? ` · alvo ${formatRaceTime(
                                            round.targetTimeMs
                                        )}`
                                        : ''}
                                </div>

                                <div className="op-attempt-flags">
                                    <span
                                        className={
                                            round.attemptA
                                                ? 'op-flag ok'
                                                : 'op-flag pending'
                                        }
                                    >
                                        {nameOf(
                                            match.participantAId
                                        )}{' '}
                                        {round.attemptA
                                            ? 'atribuído'
                                            : 'pendente'}
                                    </span>

                                    <span
                                        className={
                                            round.attemptB
                                                ? 'op-flag ok'
                                                : 'op-flag pending'
                                        }
                                    >
                                        {nameOf(
                                            match.participantBId
                                        )}{' '}
                                        {round.attemptB
                                            ? 'atribuído'
                                            : 'pendente'}
                                    </span>
                                </div>

                                <div className="op-form-row">
                                    <RaceTimeInput
                                        value={
                                            target
                                        }
                                        onChange={(
                                            v
                                        ) => {
                                            setTarget(
                                                v
                                            )

                                            setTargetError(
                                                null
                                            )
                                        }}
                                        placeholder="Tempo-alvo MM:SS:CS"
                                        ariaInvalid={Boolean(
                                            targetError
                                        )}
                                    />

                                    <button
                                        className="op-btn ghost"
                                        disabled={
                                            round.status !==
                                            'awaiting_target'
                                        }
                                        onClick={() => {
                                            const ms =
                                                randomRaceTargetMs()

                                            setTarget(
                                                formatRaceTime(
                                                    ms
                                                )
                                            )

                                            setTargetError(
                                                null
                                            )

                                            dispatch(
                                                {
                                                    type: 'RegisterTargetTime',
                                                    seconds:
                                                        msToSeconds(
                                                            ms
                                                        ),
                                                }
                                            )
                                        }}
                                    >
                                        Aleatório
                                    </button>

                                    <button
                                        className="op-btn secondary"
                                        disabled={
                                            round.status !==
                                            'awaiting_target'
                                        }
                                        onClick={() => {
                                            const result =
                                                validatePositiveRaceTimeInput(
                                                    target,
                                                    parseRaceTime
                                                )

                                            if (
                                                result.seconds ===
                                                null
                                            ) {
                                                setTargetError(
                                                    result.error
                                                )

                                                return
                                            }

                                            setTargetError(
                                                null
                                            )

                                            dispatch(
                                                {
                                                    type: 'RegisterTargetTime',
                                                    seconds:
                                                        result.seconds,
                                                }
                                            )
                                        }}
                                    >
                                        Definir
                                        alvo
                                    </button>
                                </div>

                                {targetError ? (
                                    <div className="op-field-error">
                                        {
                                            targetError
                                        }
                                    </div>
                                ) : null}

                                <div className="op-form-row">
                                    <RaceTimeInput
                                        value={
                                            manual
                                        }
                                        onChange={(
                                            v
                                        ) => {
                                            setManual(
                                                v
                                            )

                                            setManualError(
                                                null
                                            )
                                        }}
                                        placeholder="Tempo manual MM:SS:CS"
                                        ariaInvalid={Boolean(
                                            manualError
                                        )}
                                    />

                                    <button
                                        className="op-btn secondary"
                                        disabled={
                                            round.status ===
                                            'awaiting_target' ||
                                            round.status ===
                                            'confirmed' ||
                                            round.status ===
                                            'tie'
                                        }
                                        onClick={() => {
                                            const result =
                                                validatePositiveRaceTimeInput(
                                                    manual,
                                                    parseRaceTime
                                                )

                                            if (
                                                result.seconds ===
                                                null
                                            ) {
                                                setManualError(
                                                    result.error
                                                )

                                                return
                                            }

                                            setManualError(
                                                null
                                            )

                                            dispatch(
                                                {
                                                    type: 'RegisterManualTime',
                                                    participantId:
                                                        match.participantAId,
                                                    seconds:
                                                        result.seconds,
                                                }
                                            )
                                        }}
                                    >
                                        Atribuir a{' '}
                                        {nameOf(
                                            match.participantAId
                                        )}
                                    </button>

                                    <button
                                        className="op-btn secondary"
                                        disabled={
                                            round.status ===
                                            'awaiting_target' ||
                                            round.status ===
                                            'confirmed' ||
                                            round.status ===
                                            'tie'
                                        }
                                        onClick={() => {
                                            const result =
                                                validatePositiveRaceTimeInput(
                                                    manual,
                                                    parseRaceTime
                                                )

                                            if (
                                                result.seconds ===
                                                null
                                            ) {
                                                setManualError(
                                                    result.error
                                                )

                                                return
                                            }

                                            setManualError(
                                                null
                                            )

                                            dispatch(
                                                {
                                                    type: 'RegisterManualTime',
                                                    participantId:
                                                        match.participantBId,
                                                    seconds:
                                                        result.seconds,
                                                }
                                            )
                                        }}
                                    >
                                        Atribuir a{' '}
                                        {nameOf(
                                            match.participantBId
                                        )}
                                    </button>
                                </div>

                                {manualError ? (
                                    <div className="op-field-error">
                                        {
                                            manualError
                                        }
                                    </div>
                                ) : null}

                                <div className="op-form-row">
                                    <RaceTimeInput
                                        value={sim}
                                        onChange={(
                                            v
                                        ) => {
                                            setSim(
                                                v
                                            )

                                            setSimError(
                                                null
                                            )
                                        }}
                                        placeholder="Simular leitura MM:SS:CS"
                                        ariaInvalid={Boolean(
                                            simError
                                        )}
                                    />

                                    <button
                                        className="op-btn secondary"
                                        onClick={() => {
                                            const result =
                                                validatePositiveRaceTimeInput(
                                                    sim,
                                                    parseRaceTime
                                                )

                                            if (
                                                result.seconds ===
                                                null
                                            ) {
                                                setSimError(
                                                    result.error
                                                )

                                                return
                                            }

                                            setSimError(
                                                null
                                            )

                                            store.simulateTimer(
                                                result.seconds
                                            )
                                        }}
                                    >
                                        Simular
                                        leitura
                                    </button>
                                </div>

                                {simError ? (
                                    <div className="op-field-error">
                                        {
                                            simError
                                        }
                                    </div>
                                ) : null}

                                {view.pendingCandidates
                                    .length >
                                    0 ? (
                                    <div>
                                        {view.pendingCandidates.map(
                                            (
                                                candidate
                                            ) => (
                                                <div
                                                    className="op-candidate"
                                                    key={
                                                        candidate.id
                                                    }
                                                >
                                                    <span>
                                                        {formatRaceTime(
                                                            candidate.valueMs
                                                        )}{' '}
                                                        (
                                                        {Math.round(
                                                            candidate.confidence *
                                                            100
                                                        )}
                                                        %)
                                                    </span>

                                                    <span>
                                                        <button
                                                            className="op-btn small"
                                                            onClick={() =>
                                                                dispatch(
                                                                    {
                                                                        type: 'AssignTimerValue',
                                                                        detectedValueId:
                                                                            candidate.id,
                                                                        participantId:
                                                                            match.participantAId,
                                                                    }
                                                                )
                                                            }
                                                        >
                                                            Atribuir
                                                            A
                                                        </button>{' '}

                                                        <button
                                                            className="op-btn small"
                                                            onClick={() =>
                                                                dispatch(
                                                                    {
                                                                        type: 'AssignTimerValue',
                                                                        detectedValueId:
                                                                            candidate.id,
                                                                        participantId:
                                                                            match.participantBId,
                                                                    }
                                                                )
                                                            }
                                                        >
                                                            Atribuir
                                                            B
                                                        </button>{' '}

                                                        <button
                                                            className="op-btn danger small"
                                                            onClick={() =>
                                                                dispatch(
                                                                    {
                                                                        type: 'DiscardTimerCandidate',
                                                                        detectedValueId:
                                                                            candidate.id,
                                                                    }
                                                                )
                                                            }
                                                        >
                                                            Descartar
                                                        </button>
                                                    </span>
                                                </div>
                                            )
                                        )}
                                    </div>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                ) : null}
            </main>
        </div>
    )
}