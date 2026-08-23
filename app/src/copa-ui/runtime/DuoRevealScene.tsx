import { FixedCanvas } from '../components/FixedCanvas.tsx'
import { BitmapText } from '../components/BitmapText.tsx'
import './runtime.css'

export type DuoRevealMember = {
    id: string
    name: string
    photoUrl?: string | null
    bodyImageUrl?: string | null
}

/**
 * Big "duo formed" reveal -- shown as a full-screen overlay on top of
 * TeamFormationScene while `phase === 'landed'`. Purely presentational;
 * the caller controls when it mounts/unmounts (no internal timers), since
 * the 'landed' phase already stays held until the next fake_shuffle event.
 */
export function DuoRevealScene({
    teamName,
    memberA,
    memberB,
}: {
    teamName?: string | null
    memberA: DuoRevealMember
    memberB: DuoRevealMember
}) {
    return (
        <div className="ce-duo-reveal" role="dialog" aria-label="Dupla formada">
            <FixedCanvas className="ce-duo-reveal__canvas" transparent>
                <div className="ce-duo-reveal__backdrop" aria-hidden="true" />

                <div className="ce-duo-reveal__headline">
                    <BitmapText text="DUPLA FORMADA!" size="large" align="center" scale={0.7} />
                </div>
                <div className="ce-duo-reveal__pair">
                    <div className="ce-duo-reveal__member ce-duo-reveal__member--left">
                        <img
                            src={memberA.bodyImageUrl || memberA.photoUrl || undefined}
                            alt=""
                            aria-hidden="true"
                            draggable={false}
                            className="ce-duo-reveal__photo"
                        />
                    </div>

                    <div className="ce-duo-reveal__plus" aria-hidden="true">
                        <BitmapText text="+" size="large" align="center" scale={0.9} />
                    </div>

                    <div className="ce-duo-reveal__member ce-duo-reveal__member--right">
                        <img
                            src={memberB.bodyImageUrl || memberB.photoUrl || undefined}
                            alt=""
                            aria-hidden="true"
                            draggable={false}
                            className="ce-duo-reveal__photo"
                        />
                    </div>
                </div>

                {teamName ? (
                    <div className="ce-duo-reveal__teamname">
                        <BitmapText text={teamName.toUpperCase()} size="medium" align="center" scale={0.55} maxWidth={1200} />
                    </div>
                ) : null}
                {teamName ? (
                    <div className="ce-duo-reveal__teamname">
                        <BitmapText text={teamName.toUpperCase()} size="medium" align="center" scale={0.55} maxWidth={1200} />
                    </div>
                ) : null}
            </FixedCanvas>
        </div>
    )
}