import { useEffect, useMemo, useState } from 'react'
import { useOperatorView } from '../../application/store.tsx'
import {
  formatRaceTime,
  msToSeconds,
  parseRaceTime,
  randomRaceTargetMs,
} from '../../domain/time.ts'
import { getParticipantAvatar } from '../../domain/participants.ts'
import type { Participant, Team } from '../../domain/types.ts'
import '../theme/operator.css'
import {
  deriveMatchRoundControls,
  validatePositiveRaceTimeInput,
} from './matchRoundControls.ts'

const TIMER_CAPTURE_HEALTH_URL = 'http://127.0.0.1:8765/health'

const PAGE_SIZE = 8

const STATUS_LABEL: Record<string, string> = {
  setup: 'Preparação',
  revealing_teams: 'Revelação das duplas',
  drawing_bracket: 'Sorteio da chave',
  bracket_drawn: 'Chave sorteada',
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
    start,
    setPage: (next: number) => setPage(Math.max(0, Math.min(next, pageCount - 1))),
  }
}

function Thumb({ src, name }: { src: string | null; name: string }) {
  if (src) return <img className="op-thumb" src={src} alt={name} />
  return <span className="op-thumb-placeholder">{name.slice(0, 1).toUpperCase() || '?'}</span>
}

function Pagination({ page, pageCount, onChange, total }: { page: number; pageCount: number; onChange: (n: number) => void; total: number }) {
  if (total === 0) return null
  return (
    <div className="op-pagination">
      <span>Página {page + 1} de {pageCount} — {total} registro(s)</span>
      <div className="op-pagination-controls">
        <button className="op-btn ghost small" disabled={page === 0} onClick={() => onChange(page - 1)}>Anterior</button>
        <button className="op-btn ghost small" disabled={page >= pageCount - 1} onClick={() => onChange(page + 1)}>Próxima</button>
      </div>
    </div>
  )
}

function ParticipantsPanel({
  participants,
  photoOf,
  fightPhotoOf,
  onAdd,
  onEdit,
  onRemove,
  onPhoto,
  onFightPhoto,
}: {
  participants: Participant[]
  photoOf: (person: Participant) => string | null
  fightPhotoOf: (person: Participant) => string | null
  onAdd: (name: string, fighterVariant: 'male' | 'female') => void
  onEdit: (id: string, name: string, fighterVariant: 'male' | 'female') => void
  onRemove: (id: string) => void
  onPhoto: (id: string, dataUrl: string) => void
  onFightPhoto: (id: string, dataUrl: string) => void
}) {
  const [name, setName] = useState('')
  const [fighterVariant, setFighterVariant] = useState<'male' | 'female'>('male')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [editingVariant, setEditingVariant] = useState<'male' | 'female'>('male')
  const sorted = useMemo(() => [...participants].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')), [participants])
  const { page, pageCount, pageItems, setPage } = usePagination(sorted)

  return (
    <div className="op-card">
      <h2>Participantes</h2>
      <p className="op-subtitle">Cadastro individual com foto e variante do sprite (masculino/feminino). Lista paginada.</p>
      <div className="op-progress-track">
        <div className="op-progress-fill" style={{ width: `${Math.min(100, (participants.length / 32) * 100)}%` }} />
      </div>
      <div className="op-subtitle" style={{ marginTop: -10 }}>{participants.length} participantes cadastrados (32 titulares em 16 duplas)</div>

      <div className="op-form-row">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do participante"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && name.trim()) {
              onAdd(name, fighterVariant)
              setName('')
            }
          }}
        />
        <select
          value={fighterVariant}
          onChange={(e) => setFighterVariant(e.target.value as 'male' | 'female')}
          aria-label="Variante do sprite"
        >
          <option value="male">Masculino</option>
          <option value="female">Feminino</option>
        </select>
        <button
          className="op-btn"
          disabled={!name.trim()}
          onClick={() => { onAdd(name, fighterVariant); setName('') }}
        >
          Adicionar
        </button>
      </div>

      {pageItems.length === 0 ? (
        <div className="op-empty">Nenhum participante nesta página.</div>
      ) : (
        <table className="op-table">
          <thead>
            <tr>
              <th></th>
              <th>Nome</th>
              <th>Variante</th>
              <th>Foto</th>
              <th>Avatar de luta</th>
              <th style={{ textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((person) => (
              <tr key={person.id}>
                <td><Thumb src={photoOf(person)} name={person.name} /></td>
                <td>
                  {editingId === person.id ? (
                    <input value={editingName} onChange={(e) => setEditingName(e.target.value)} />
                  ) : (
                    person.name
                  )}
                </td>
                <td>
                  {editingId === person.id ? (
                    <select
                      value={editingVariant}
                      onChange={(e) => setEditingVariant(e.target.value as 'male' | 'female')}
                      aria-label={`Variante de ${person.name}`}
                    >
                      <option value="male">Masculino</option>
                      <option value="female">Feminino</option>
                    </select>
                  ) : (
                    <span
                      className={
                        (person.fighterVariant ?? 'male') === 'female'
                          ? 'op-variant-badge op-variant-badge--female'
                          : 'op-variant-badge op-variant-badge--male'
                      }
                      title="Variante do sprite na batalha"
                    >
                      {(person.fighterVariant ?? 'male') === 'female' ? 'Feminino' : 'Masculino'}
                    </span>
                  )}
                </td>
                <td>
                  <label className="op-file-label">
                    Trocar
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (!file) return
                        const reader = new FileReader()
                        reader.onload = () => onPhoto(person.id, String(reader.result))
                        reader.readAsDataURL(file)
                      }}
                    />
                  </label>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Thumb src={fightPhotoOf(person)} name={person.name} />
                    <label className="op-file-label">
                      Trocar
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(event) => {
                          const file = event.target.files?.[0]
                          if (!file) return
                          const reader = new FileReader()
                          reader.onload = () => onFightPhoto(person.id, String(reader.result))
                          reader.readAsDataURL(file)
                        }}
                      />
                    </label>
                  </div>
                </td>
                <td style={{ textAlign: 'right' }}>
                  {editingId === person.id ? (
                    <>
                      <button
                        className="op-btn small"
                        onClick={() => {
                          onEdit(person.id, editingName, editingVariant)
                          setEditingId(null)
                        }}
                      >
                        Salvar
                      </button>{' '}
                      <button className="op-btn ghost small" onClick={() => setEditingId(null)}>Cancelar</button>
                    </>
                  ) : (
                    <>
                      <button
                        className="op-btn ghost small"
                        onClick={() => {
                          setEditingId(person.id)
                          setEditingName(person.name)
                          setEditingVariant(person.fighterVariant ?? 'male')
                        }}
                      >
                        Editar
                      </button>{' '}
                      <button className="op-btn danger small" onClick={() => onRemove(person.id)}>Excluir</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Pagination page={page} pageCount={pageCount} total={sorted.length} onChange={setPage} />
    </div>
  )
}

function TeamsPanel({
  participants,
  teams,
  onAdd,
  onEdit,
  onRemove,
}: {
  participants: Participant[]
  teams: Team[]
  onAdd: (input: { name: string; p1: string; p2: string; firstReveal: string; order: number }) => void
  onEdit: (id: string, input: { name: string; p1: string; p2: string; firstReveal: string; order: number }) => void
  onRemove: (id: string) => void
}) {
  const [name, setName] = useState('')
  const [p1, setP1] = useState('')
  const [p2, setP2] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editState, setEditState] = useState({ name: '', p1: '', p2: '', firstReveal: '', order: 1 })

  const byId = useMemo(() => new Map(participants.map((p) => [p.id, p])), [participants])
  const used = useMemo(() => {
    const set = new Set<string>()
    teams.forEach((team) => { set.add(team.participant1Id); set.add(team.participant2Id) })
    return set
  }, [teams])
  const available = participants.filter((p) => !used.has(p.id))
  const sortedTeams = useMemo(() => [...teams].sort((a, b) => a.revealOrder - b.revealOrder), [teams])
  const { page, pageCount, pageItems, setPage } = usePagination(sortedTeams)

  const editAvailable = editingId
    ? participants.filter((p) => !used.has(p.id) || p.id === editState.p1 || p.id === editState.p2)
    : []

  return (

    <div className="op-card">
      <h2>Duplas</h2>
      <p className="op-subtitle">Formação previamente cadastrada. O telão apenas encena a revelação — nunca sorteia de fato.</p>
      <div className="op-progress-track">
        <div className="op-progress-fill" style={{ width: `${Math.min(100, (teams.length / 16) * 100)}%` }} />
      </div>
      <div className="op-subtitle" style={{ marginTop: -10 }}>{teams.length}/16 duplas formadas · {available.length} participante(s) disponível(is)</div>

      <div className="op-form-row">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da dupla (opcional)" />
        <select value={p1} onChange={(e) => setP1(e.target.value)}>
          <option value="">Integrante 1</option>
          {available.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
        </select>
        <select value={p2} onChange={(e) => setP2(e.target.value)}>
          <option value="">Integrante 2</option>
          {available.filter((p) => p.id !== p1).map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
        </select>
        <button
          className="op-btn"
          disabled={!p1 || !p2 || teams.length >= 16}
          onClick={() => {
            onAdd({ name, p1, p2, firstReveal: p1, order: teams.length + 1 })
            setName(''); setP1(''); setP2('')
          }}
        >
          Formar dupla
        </button>
      </div>

      {pageItems.length === 0 ? (
        <div className="op-empty">Nenhuma dupla nesta página.</div>
      ) : (
        <table className="op-table">
          <thead>
            <tr>
              <th>Ordem</th>
              <th>Dupla</th>
              <th>Integrantes</th>
              <th>Revela 1º</th>
              <th style={{ textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((team) => (
              <tr key={team.id}>
                <td>{team.revealOrder}</td>
                <td>{team.name}</td>
                <td>{byId.get(team.participant1Id)?.name ?? '?'} & {byId.get(team.participant2Id)?.name ?? '?'}</td>
                <td>{byId.get(team.firstRevealParticipantId)?.name ?? '?'}</td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    className="op-btn ghost small"
                    onClick={() => {
                      setEditingId(team.id)
                      setEditState({
                        name: team.name,
                        p1: team.participant1Id,
                        p2: team.participant2Id,
                        firstReveal: team.firstRevealParticipantId,
                        order: team.revealOrder,
                      })
                    }}
                  >
                    Editar
                  </button>{' '}
                  <button className="op-btn danger small" onClick={() => onRemove(team.id)}>Desfazer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Pagination page={page} pageCount={pageCount} total={sortedTeams.length} onChange={setPage} />

      {editingId ? (
        <div className="op-inline-edit">
          <input value={editState.name} onChange={(e) => setEditState((s) => ({ ...s, name: e.target.value }))} placeholder="Nome da dupla" />
          <select value={editState.p1} onChange={(e) => setEditState((s) => ({ ...s, p1: e.target.value }))}>
            {editAvailable.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
          </select>
          <select value={editState.p2} onChange={(e) => setEditState((s) => ({ ...s, p2: e.target.value }))}>
            {editAvailable.filter((p) => p.id !== editState.p1).map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
          </select>
          <select value={editState.firstReveal} onChange={(e) => setEditState((s) => ({ ...s, firstReveal: e.target.value }))}>
            <option value={editState.p1}>{byId.get(editState.p1)?.name ?? 'Integrante 1'} revela 1º</option>
            <option value={editState.p2}>{byId.get(editState.p2)?.name ?? 'Integrante 2'} revela 1º</option>
          </select>
          <button className="op-btn small" onClick={() => { onEdit(editingId, editState); setEditingId(null) }}>Salvar</button>
          <button className="op-btn ghost small" onClick={() => setEditingId(null)}>Cancelar</button>
        </div>
      ) : null}
    </div>
  )
}

function TimerCaptureConfig({ candidates }: { candidates: { id: string; valueMs: number; confidence: number }[] }) {
  const [roi, setRoi] = useState({ x: 0, y: 0, w: 320, h: 80 })
  const [isOpen, setIsOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [cameraIndex, setCameraIndex] = useState(0)
  const [captureEnabled, setCaptureEnabled] = useState(false)
  const [naturalSize, setNaturalSize] = useState({ w: 640, h: 480 })
  const [displaySize, setDisplaySize] = useState({ w: 640, h: 480 })

  useEffect(() => {
    if (!isOpen) return
    fetch('http://127.0.0.1:8765/roi', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => setRoi(data))
      .catch(() => { })
  }, [isOpen])

  if (!isOpen) {
    return (
      <button className="op-btn ghost small" onClick={() => setIsOpen(true)}>
        Configurar Câmera/Cronômetro
      </button>
    )
  }

  const switchCamera = (index: number) => {
    setCameraIndex(index)
    fetch('http://127.0.0.1:8765/camera', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ index })
    }).catch(() => { })
  }

  const toggleCapture = () => {
    const next = !captureEnabled
    setCaptureEnabled(next)
    fetch('http://127.0.0.1:8765/capture/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: next })
    }).catch(() => { })
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const img = e.currentTarget.querySelector('img')
    if (!img) return
    const rect = img.getBoundingClientRect()
    const scaleX = img.naturalWidth / rect.width
    const scaleY = img.naturalHeight / rect.height

    const x = Math.max(0, (e.clientX - rect.left) * scaleX)
    const y = Math.max(0, (e.clientY - rect.top) * scaleY)
    setIsDragging(true)
    setDragStart({ x, y })
    setRoi({ x, y, w: 0, h: 0 })
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return
    const img = e.currentTarget.querySelector('img')
    if (!img) return
    const rect = img.getBoundingClientRect()
    const scaleX = img.naturalWidth / rect.width
    const scaleY = img.naturalHeight / rect.height

    const currentX = Math.max(0, Math.min((e.clientX - rect.left) * scaleX, img.naturalWidth))
    const currentY = Math.max(0, Math.min((e.clientY - rect.top) * scaleY, img.naturalHeight))

    // update display size for the render pass
    setDisplaySize({ w: rect.width, h: rect.height })

    setRoi({
      x: Math.min(dragStart.x, currentX),
      y: Math.min(dragStart.y, currentY),
      w: Math.abs(currentX - dragStart.x),
      h: Math.abs(currentY - dragStart.y)
    })
  }

  const handlePointerUp = () => {
    if (!isDragging) return
    setIsDragging(false)
    fetch('http://127.0.0.1:8765/roi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        x: Math.round(roi.x),
        y: Math.round(roi.y),
        w: Math.round(roi.w),
        h: Math.round(roi.h),
      })
    }).catch(() => { })
  }

  const updateDisplaySize = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight })
    setDisplaySize({ w: img.width, h: img.height })
    img.style.display = 'block'
    if (img.nextElementSibling) {
      ; (img.nextElementSibling as HTMLElement).style.display = 'none'
    }
  }

  return (
    <div className="op-card" style={{ marginTop: 16, backgroundColor: '#f0f0f0', color: '#333' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, color: '#333' }}>Configuração da Câmera</h3>
        <button className="op-btn ghost small" onClick={() => setIsOpen(false)}>Fechar</button>
      </div>
      <p className="op-subtitle" style={{ color: '#555' }}>Desenhe um retângulo sobre os dígitos do cronômetro para configurar a área de leitura (ROI).</p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <label>Câmera:</label>
        <select
          value={cameraIndex}
          onChange={(e) => switchCamera(Number(e.target.value))}
          style={{ padding: 4 }}
        >
          <option value={0}>Câmera 0 (Padrão)</option>
          <option value={1}>Câmera 1 (Ex: Externa)</option>
          <option value={2}>Câmera 2</option>
          <option value={3}>Câmera 3</option>
        </select>

        <button
          className={`op-btn ${captureEnabled ? 'danger' : 'secondary'} small`}
          onClick={toggleCapture}
        >
          {captureEnabled ? 'Parar Leitura (OCR)' : 'Iniciar Leitura (OCR)'}
        </button>
      </div>

      <div
        style={{ position: 'relative', display: 'inline-block', border: '1px solid #ccc', cursor: 'crosshair', userSelect: 'none', backgroundColor: '#000', minWidth: 320, minHeight: 240 }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <img
          src={`http://127.0.0.1:8765/stream?t=${cameraIndex}`}
          alt="Câmera"
          style={{ display: 'block', maxWidth: '100%', pointerEvents: 'none' }}
          onError={(e) => {
            e.currentTarget.style.display = 'none'
            if (e.currentTarget.nextElementSibling) {
              ; (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex'
            }
          }}
          onLoad={updateDisplaySize}
        />
        <div style={{ display: 'none', width: 640, height: 480, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ddd', color: '#666', flexDirection: 'column' }}>
          <span style={{ fontSize: 24, marginBottom: 8 }}>📷</span>
          <span>Servidor de câmera offline.</span>
          <code style={{ marginTop: 8, padding: 4, backgroundColor: '#eee', borderRadius: 4 }}>Inicie o python server.py em timer-capture/</code>
        </div>

        {roi.w > 0 && roi.h > 0 && naturalSize.w > 0 && (
          <div style={{
            position: 'absolute',
            left: (roi.x / naturalSize.w) * displaySize.w,
            top: (roi.y / naturalSize.h) * displaySize.h,
            width: (roi.w / naturalSize.w) * displaySize.w,
            height: (roi.h / naturalSize.h) * displaySize.h,
            border: '2px solid #00ff00',
            backgroundColor: 'rgba(0, 255, 0, 0.1)',
            pointerEvents: 'none'
          }} />
        )}
      </div>
      <div className="op-hint" style={{ marginTop: 8, color: '#666' }}>
        Região Atual: X: {Math.round(roi.x)}, Y: {Math.round(roi.y)}, L: {Math.round(roi.w)}, A: {Math.round(roi.h)}
      </div>
      <div style={{ marginTop: 16, borderTop: '1px solid #ccc', paddingTop: 16 }}>
        <strong>Leitura em tempo real:</strong>
        {candidates.length > 0 ? (
          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#00cc00', marginTop: 8 }}>
            {formatRaceTime(candidates[candidates.length - 1].valueMs)}
          </div>
        ) : (
          <div style={{ color: '#888', marginTop: 8 }}>Nenhuma leitura estável no momento...</div>
        )}
      </div>
    </div>
  )
}

export function OperatorApp() {
  const store = useOperatorView()
  const { state, view, photos, dispatch, publishRound3Draft } = store
  const [target, setTarget] = useState('00:01:50')
  const [manual, setManual] = useState('00:01:56')
  const [sim, setSim] = useState('00:01:56')
  const [targetError, setTargetError] = useState<string | null>(null)
  const [manualError, setManualError] = useState<string | null>(null)
  const [simError, setSimError] = useState<string | null>(null)
  const [captureOnline, setCaptureOnline] = useState<boolean | null>(null)
  const [r1a, setR1a] = useState('')
  const [r1b, setR1b] = useState('')
  const [r3a, setR3a] = useState('')
  const [r3b, setR3b] = useState('')

  const photoOf = (person: Participant) =>
    (person.photoAssetId && photos[person.photoAssetId]) || person.avatar || getParticipantAvatar(person) || null

  const fightPhotoOf = (person: Participant) =>
    (person.fightPhotoAssetId && photos[person.fightPhotoAssetId]) || person.fightAvatar || null

  const round = state.rounds.find((item) => item.id === state.activeRoundId)
  const match = state.matches.find((item) => item.id === state.activeMatchId)
  const roundControls = useMemo(() => deriveMatchRoundControls(round), [round])
  const teamName = (id: string | null) => state.teams.find((t) => t.id === id)?.name ?? 'A definir'
  const matchBlocksStart = state.matches.some(
    (item) => item.status === 'active' || item.status === 'awaiting_confirmation',
  )

  useEffect(() => {
    let cancelled = false
    const tick = () => {
      void fetch(TIMER_CAPTURE_HEALTH_URL, { cache: 'no-store' })
        .then((response) => response.ok)
        .then((ok) => {
          if (!cancelled) setCaptureOnline(ok)
        })
        .catch(() => {
          if (!cancelled) setCaptureOnline(false)
        })
    }
    tick()
    const id = window.setInterval(tick, 2500)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [])

  useEffect(() => {
    if (captureOnline === false) {
      dispatch({ type: 'ClearCameraCandidates' })
    }
  }, [captureOnline, dispatch])

  return (
    <div className="operator-app">
      <header className="op-topbar">
        <div className="op-brand">
          Painel do Operador
          <span className="op-status-pill">{STATUS_LABEL[state.status] ?? state.status}</span>
          <span className="op-status-pill">{store.persistenceLabel}</span>
        </div>
        <div className="op-topbar-actions">
          <button className="op-btn ghost" onClick={store.undo}>Desfazer</button>
          <button
            className="op-btn ghost"
            title="Carrega todos os 32 participantes reais com fotos/avatares e as 16 duplas oficiais"
            onClick={() => {
              if (
                window.confirm(
                  'Carregar o elenco oficial completo (32 participantes e 16 duplas)? O estado atual do campeonato será reiniciado.',
                )
              ) {
                store.loadOfficialRoster()
              }
            }}
          >
            Elenco oficial (32/16)
          </button>
          <a className="op-btn secondary" href="/telao" target="_blank" rel="noreferrer">Abrir telão</a>
          <button
            className="op-btn ghost"
            onClick={async () => {
              const json = await store.exportBackup()
              const blob = new Blob([json], { type: 'application/json' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = 'campeonato-backup.json'
              a.click()
            }}
          >
            Exportar backup
          </button>
          <label className="op-file-label">
            Importar
            <input
              type="file"
              accept="application/json"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (!file) return
                void file.text().then((text) => store.importBackup(text))
              }}
            />
          </label>
        </div>
      </header>

      <main className="op-main">
        {store.error ? <div className="op-banner error">{store.error}</div> : null}

        {state.status === 'setup' ? (
          <div className="op-grid-2">
            <ParticipantsPanel
              participants={state.participants}
              photoOf={photoOf}
              fightPhotoOf={fightPhotoOf}
              onAdd={(name, fighterVariant) => dispatch({ type: 'RegisterParticipant', name, fighterVariant })}
              onEdit={(id, name, fighterVariant) =>
                dispatch({ type: 'EditParticipant', participantId: id, name, fighterVariant })
              }
              onRemove={(id) => dispatch({ type: 'RemoveParticipant', participantId: id })}
              onPhoto={(id, dataUrl) => void store.uploadPhoto(id, dataUrl)}
              onFightPhoto={(id, dataUrl) => void store.uploadFightPhoto(id, dataUrl)}
            />
            <TeamsPanel
              participants={state.participants}
              teams={state.teams}
              onAdd={({ name, p1, p2, firstReveal, order }) => dispatch({
                type: 'DefineTeam',
                name,
                participant1Id: p1,
                participant2Id: p2,
                firstRevealParticipantId: firstReveal,
                revealOrder: order,
              })}
              onEdit={(id, { name, p1, p2, firstReveal, order }) => dispatch({
                type: 'EditTeam',
                teamId: id,
                name,
                participant1Id: p1,
                participant2Id: p2,
                firstRevealParticipantId: firstReveal,
                revealOrder: order,
              })}
              onRemove={(id) => dispatch({ type: 'RemoveTeam', teamId: id })}
            />
            <div className="op-card" style={{ gridColumn: '1 / -1' }}>
              <h2>Iniciar campeonato</h2>
              <p className="op-subtitle">Exige 32 participantes titulares e 16 duplas cadastradas.</p>
              <div className="op-form-row">
                <button
                  className="op-btn ghost"
                  disabled={state.teams.length === 0}
                  title="Embaralha a ordem de revelação das duplas. Pode clicar quantas vezes quiser antes de iniciar."
                  onClick={() => store.shuffleTeamRevealOrder()}
                >
                  Sortear ordem de revelação
                </button>
                <button
                  className="op-btn"
                  disabled={state.participants.length < 32 || state.teams.length !== 16}
                  onClick={() => dispatch({ type: 'StartTeamReveal' })}
                >
                  Iniciar revelação cenográfica
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {state.status === 'revealing_teams' ? (
          <div className="op-card">
            <h2>Revelação das duplas</h2>
            <p className="op-subtitle">O operador vê a dupla real. O telão anima e termina no parceiro já cadastrado — nunca sorteia de novo.</p>
            <button className="op-btn" onClick={store.revealNextWithCinematic}>Revelar próxima dupla</button>
            <table className="op-table" style={{ marginTop: 16 }}>
              <thead><tr><th>#</th><th>Dupla</th><th>Status</th></tr></thead>
              <tbody>
                {[...state.teams].sort((a, b) => a.revealOrder - b.revealOrder).map((team) => (
                  <tr key={team.id}>
                    <td>{team.revealOrder}</td>
                    <td>{team.name}</td>
                    <td>{team.status === 'registered' ? 'Aguardando' : 'Revelada'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {state.status === 'drawing_bracket' || state.status === 'bracket_drawn' ? (
          <div className="op-card">
            <h2>Sorteio real da chave</h2>
            <p className="op-subtitle">Este sorteio pode ser real e definirá os 8 confrontos das oitavas.</p>
            <div className="op-form-row">
              <button className="op-btn" onClick={() => store.drawBracketWithCinematic()}>Sortear 8 confrontos</button>
              {state.status === 'bracket_drawn' ? (
                <button className="op-btn" onClick={() => dispatch({ type: 'ConfirmBracket' })}>Confirmar chave</button>
              ) : null}
            </div>
            <div className="op-bracket-grid">
              {state.matches.filter((item) => item.stage === 'oitavas').map((item) => (
                <div className="op-match-card" key={item.id}>
                  {teamName(item.teamAId)} vs {teamName(item.teamBId)}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {state.status === 'finished' ? (
          <div className="op-card">
            <h2>Campeonato encerrado</h2>
            <p className="op-subtitle">
              Campeã no telão:{' '}
              <strong>
                {state.teams.find((team) => team.id === state.championTeamId)?.name ?? '—'}
              </strong>
              . Domínio já está em <code>finished</code> — não há comando extra de confirmação.
              Para novo torneio, reinicie com o elenco oficial (fluxo manual permanece disponível).
            </p>
            <div className="op-form-row">
              <button
                className="op-btn"
                onClick={() => {
                  if (
                    !window.confirm(
                      'Reiniciar campeonato com o elenco oficial? O estado atual será substituído pelos 32 participantes e 16 duplas oficiais.',
                    )
                  ) {
                    return
                  }
                  store.loadOfficialRoster()
                }}
              >
                Reiniciar com elenco oficial
              </button>
              <button
                className="op-btn ghost"
                onClick={async () => {
                  const json = await store.exportBackup()
                  const blob = new Blob([json], { type: 'application/json' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = 'campeonato-backup.json'
                  a.click()
                }}
              >
                Exportar backup final
              </button>
            </div>
          </div>
        ) : null}

        {state.status === 'in_progress' || state.status === 'finished' ? (
          <div className="op-card">
            <h2>Chave</h2>
            {state.status === 'in_progress' ? (
              <div className="op-form-row" style={{ marginBottom: 12 }}>
                <button
                  className="op-btn ghost"
                  title="Atalho de ensaio: completa confrontos 2x0 (tempos manuais fixos) até a final ficar pronta"
                  onClick={() => {
                    if (
                      !window.confirm(
                        'Avançar chave até a FINAL (teste)?\n\nCada confronto pendente vira 2x0 para o lado A com tempos manuais determinísticos. A final permanece para jogar. Desfazer (1 passo) reverte tudo.',
                      )
                    ) {
                      return
                    }
                    dispatch({ type: 'SimulateBracketProgress', until: 'final' })
                  }}
                >
                  Avançar chave até a final (teste)
                </button>
                <button
                  className="op-btn ghost"
                  title="Atalho de ensaio: simula até coroar a campeã"
                  onClick={() => {
                    if (
                      !window.confirm(
                        'Simular até a CAMPEÃ (teste)?\n\nCompleta toda a chave (incluindo a final) com 2x0 determinísticos. Use só para ensaio/QA do telão.',
                      )
                    ) {
                      return
                    }
                    dispatch({ type: 'SimulateBracketProgress', until: 'champion' })
                  }}
                >
                  Simular até a campeã (teste)
                </button>
              </div>
            ) : null}
            <div className="op-bracket-grid">
              {state.matches.map((item) => (
                <div className={`op-match-card ${item.id === state.activeMatchId ? 'active-match' : ''}`} key={item.id}>
                  <div className="op-subtitle" style={{ margin: 0 }}>{item.stage} · confronto {item.position + 1}</div>
                  <div>{teamName(item.teamAId)} <strong>{item.scoreA} x {item.scoreB}</strong> {teamName(item.teamBId)}</div>
                  {item.status === 'awaiting_confirmation' ? (
                    <button
                      className="op-btn small"
                      onClick={() => dispatch({ type: 'ConfirmMatchWinner', matchId: item.id })}
                    >
                      Confirmar classificação
                    </button>
                  ) : (
                    <button
                      className="op-btn small"
                      disabled={item.status !== 'pending' || !item.teamAId || !item.teamBId || matchBlocksStart}
                      onClick={() => dispatch({ type: 'StartMatch', matchId: item.id })}
                    >
                      Iniciar confronto
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {match ? (
          <div className="op-card">
            <h2>Confronto {match.stage} — {match.scoreA} x {match.scoreB}</h2>
            {view.eligibleR1 ? (
              <div className="op-form-row">
                <select value={r1a} onChange={(e) => setR1a(e.target.value)}>
                  <option value="">Jogador A — rodada 1</option>
                  {view.eligibleR1.teamA.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select value={r1b} onChange={(e) => setR1b(e.target.value)}>
                  <option value="">Jogador B — rodada 1</option>
                  {view.eligibleR1.teamB.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <button className="op-btn" disabled={!r1a || !r1b} onClick={() => dispatch({ type: 'SelectRound1Players', participantAId: r1a, participantBId: r1b })}>
                  Confirmar rodada 1
                </button>
              </div>
            ) : null}
            {view.automaticR2 ? (
              <div className="op-form-row">
                <span>Rodada 2 automática: {view.automaticR2.participantA?.name} x {view.automaticR2.participantB?.name}</span>
                <button className="op-btn" onClick={() => dispatch({ type: 'StartRound2' })}>Iniciar rodada 2</button>
              </div>
            ) : null}
            {view.eligibleR3 ? (
              <div className="op-form-row">
                <select
                  value={r3a}
                  onChange={(e) => {
                    const next = e.target.value
                    setR3a(next)
                    publishRound3Draft(next || null, r3b || null)
                  }}
                >
                  <option value="">Representante A (rodada 3)</option>
                  {view.eligibleR3.teamA.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select
                  value={r3b}
                  onChange={(e) => {
                    const next = e.target.value
                    setR3b(next)
                    publishRound3Draft(r3a || null, next || null)
                  }}
                >
                  <option value="">Representante B (rodada 3)</option>
                  {view.eligibleR3.teamB.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <button className="op-btn" disabled={!r3a || !r3b} onClick={() => dispatch({
                  type: 'SelectRound3Representatives',
                  participantAId: r3a,
                  participantBId: r3b,
                })}>Confirmar rodada 3</button>
              </div>
            ) : null}
            {round ? (
              <div className="op-inline-edit" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
                <div className="op-subtitle" style={{ margin: 0 }}>
                  Rodada {round.number} — {roundControls.statusLabel}
                  {roundControls.targetLabel ? ` · alvo ${roundControls.targetLabel}` : ''}
                </div>
                <p className="op-hint">{roundControls.hint}</p>
                <div className="op-attempt-flags">
                  <span className={roundControls.hasAttemptA ? 'op-flag ok' : 'op-flag pending'}>
                    A {roundControls.hasAttemptA ? 'atribuído' : 'pendente'}
                  </span>
                  <span className={roundControls.hasAttemptB ? 'op-flag ok' : 'op-flag pending'}>
                    B {roundControls.hasAttemptB ? 'atribuído' : 'pendente'}
                  </span>
                </div>
                <div className="op-form-row">
                  <input
                    value={target}
                    onChange={(e) => {
                      setTarget(e.target.value)
                      setTargetError(null)
                    }}
                    placeholder="Tempo-alvo MM:SS:CS"
                    aria-invalid={Boolean(targetError)}
                  />
                  <button
                    className="op-btn ghost"
                    disabled={!roundControls.canSetTarget}
                    title="Preenche e registra um alvo aleatório entre 00:01:20 e 00:02:40"
                    onClick={() => {
                      const ms = randomRaceTargetMs()
                      const formatted = formatRaceTime(ms)
                      setTarget(formatted)
                      setTargetError(null)
                      dispatch({ type: 'RegisterTargetTime', seconds: msToSeconds(ms) })
                    }}
                  >
                    Aleatório
                  </button>
                  <button
                    className="op-btn secondary"
                    disabled={!roundControls.canSetTarget}
                    title={
                      roundControls.canSetTarget
                        ? 'Registrar o tempo-alvo digitado'
                        : 'Alvo só pode ser definido enquanto a rodada aguarda tentativas'
                    }
                    onClick={() => {
                      const result = validatePositiveRaceTimeInput(target, parseRaceTime)
                      if (result.seconds === null) {
                        setTargetError(result.error)
                        return
                      }
                      setTargetError(null)
                      dispatch({ type: 'RegisterTargetTime', seconds: result.seconds })
                    }}
                  >
                    Definir alvo
                  </button>
                </div>
                {targetError ? <div className="op-field-error">{targetError}</div> : null}
                <div className="op-form-row">
                  <input
                    value={manual}
                    onChange={(e) => {
                      setManual(e.target.value)
                      setManualError(null)
                    }}
                    placeholder="Tempo manual MM:SS:CS"
                    aria-invalid={Boolean(manualError)}
                  />
                  <button
                    className="op-btn secondary"
                    disabled={!roundControls.canAssignA}
                    title={
                      roundControls.canAssignA
                        ? roundControls.hasAttemptA
                          ? 'Substituir o tempo do lado A'
                          : 'Atribuir tempo ao lado A'
                        : 'Defina o alvo e aguarde a fase de tentativas'
                    }
                    onClick={() => {
                      const result = validatePositiveRaceTimeInput(manual, parseRaceTime)
                      if (result.seconds === null) {
                        setManualError(result.error)
                        return
                      }
                      if (!round.participantAId) return
                      setManualError(null)
                      dispatch({
                        type: 'RegisterManualTime',
                        participantId: round.participantAId,
                        seconds: result.seconds,
                      })
                    }}
                  >
                    Atribuir a A
                  </button>
                  <button
                    className="op-btn secondary"
                    disabled={!roundControls.canAssignB}
                    title={
                      roundControls.canAssignB
                        ? roundControls.hasAttemptB
                          ? 'Substituir o tempo do lado B'
                          : 'Atribuir tempo ao lado B'
                        : 'Defina o alvo e aguarde a fase de tentativas'
                    }
                    onClick={() => {
                      const result = validatePositiveRaceTimeInput(manual, parseRaceTime)
                      if (result.seconds === null) {
                        setManualError(result.error)
                        return
                      }
                      if (!round.participantBId) return
                      setManualError(null)
                      dispatch({
                        type: 'RegisterManualTime',
                        participantId: round.participantBId,
                        seconds: result.seconds,
                      })
                    }}
                  >
                    Atribuir a B
                  </button>
                </div>
                {manualError ? <div className="op-field-error">{manualError}</div> : null}
                <div className="op-form-row">
                  <button
                    className="op-btn"
                    disabled={!roundControls.canResolveRound}
                    onClick={() => dispatch({ type: 'ResolveRound' })}
                    title={
                      roundControls.canResolveRound
                        ? 'Calcula o vencedor, revela tempos no telão e confirma a rodada'
                        : 'Disponível somente com os dois tempos atribuídos'
                    }
                  >
                    Calcular, revelar e confirmar
                  </button>
                  <button
                    className="op-btn ghost"
                    disabled={!roundControls.canStartTiebreaker}
                    title={
                      roundControls.canStartTiebreaker
                        ? 'Nova tentativa sem alterar o placar'
                        : 'Disponível somente após empate de diferença'
                    }
                    onClick={() => dispatch({ type: 'StartTiebreaker' })}
                  >
                    Desempate
                  </button>
                </div>
              </div>
            ) : null}
            {match.status === 'awaiting_confirmation' ? (
              <button className="op-btn" style={{ marginTop: 12 }} onClick={() => dispatch({ type: 'ConfirmMatchWinner' })}>
                Confirmar classificação
              </button>
            ) : null}
          </div>
        ) : null}

        {match ? (
          <div className="op-card">
            <h2>Timer Capture</h2>
            <p className="op-subtitle">
              Candidatos da webcam nunca pontuam sozinhos — o operador atribui. Entrada manual acima
              permanece sempre disponível.
            </p>
            <div className="op-capture-status">
              <span
                className={
                  captureOnline === true
                    ? 'op-flag ok'
                    : captureOnline === false
                      ? 'op-flag pending'
                      : 'op-flag'
                }
              >
                Periférico localhost
                {captureOnline === true ? ': online' : captureOnline === false ? ': offline' : ': verificando…'}
              </span>
              <TimerCaptureConfig candidates={view.pendingCandidates} />
            </div>
            <ol className="op-howto">
              <li>Com webcam + cronômetro prontos: <code>python server.py</code> em <code>timer-capture/</code>.</li>
              <li>Aponte a câmera ao display; leituras estáveis aparecem como candidatos abaixo.</li>
              <li>Atribua A ou B (ou descarte). Sem periférico, use <strong>Simular leitura</strong> ou o tempo manual.</li>
            </ol>
            <div className="op-form-row">
              <input
                value={sim}
                onChange={(e) => {
                  setSim(e.target.value)
                  setSimError(null)
                }}
                placeholder="Simular leitura MM:SS:CS"
                aria-invalid={Boolean(simError)}
              />
              <button
                className="op-btn secondary"
                onClick={() => {
                  const result = validatePositiveRaceTimeInput(sim, parseRaceTime)
                  if (result.seconds === null) {
                    setSimError(result.error)
                    return
                  }
                  setSimError(null)
                  store.simulateTimer(result.seconds)
                }}
              >
                Simular leitura
              </button>
            </div>
            {simError ? <div className="op-field-error">{simError}</div> : null}
            {view.pendingCandidates.length === 0 ? (
              <div className="op-empty">
                Nenhum candidato pendente.
                {captureOnline === false
                  ? ' Periférico offline — use simulação ou entrada manual.'
                  : ' Aguarde uma leitura estável ou simule.'}
              </div>
            ) : (
              view.pendingCandidates.map((candidate) => (
                <div className="op-candidate" key={candidate.id}>
                  <span>{formatRaceTime(candidate.valueMs)} ({Math.round(candidate.confidence * 100)}%)</span>
                  <span>
                    <button
                      className="op-btn small"
                      disabled={!roundControls.canAssignFromCapture || !round?.participantAId}
                      title={
                        roundControls.canAssignFromCapture
                          ? 'Atribuir este candidato ao lado A'
                          : 'Defina o alvo e aguarde a fase de tentativas'
                      }
                      onClick={() => round?.participantAId && dispatch({
                        type: 'AssignTimerValue',
                        detectedValueId: candidate.id,
                        participantId: round.participantAId,
                      })}
                    >
                      Atribuir A
                    </button>{' '}
                    <button
                      className="op-btn small"
                      disabled={!roundControls.canAssignFromCapture || !round?.participantBId}
                      title={
                        roundControls.canAssignFromCapture
                          ? 'Atribuir este candidato ao lado B'
                          : 'Defina o alvo e aguarde a fase de tentativas'
                      }
                      onClick={() => round?.participantBId && dispatch({
                        type: 'AssignTimerValue',
                        detectedValueId: candidate.id,
                        participantId: round.participantBId,
                      })}
                    >
                      Atribuir B
                    </button>{' '}
                    <button className="op-btn danger small" onClick={() => dispatch({
                      type: 'DiscardTimerCandidate',
                      detectedValueId: candidate.id,
                    })}>Descartar</button>
                  </span>
                </div>
              ))
            )}
          </div>
        ) : null}
      </main>
    </div>
  )
}