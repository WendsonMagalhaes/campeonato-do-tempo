type FormationBannerProps = {
    text: string
}

export function FormationBanner({ text }: FormationBannerProps) {
    return (
        <div className="formation-banner">
            <svg
                viewBox="0 0 900 145"
                xmlns="http://www.w3.org/2000/svg"
                shapeRendering="crispEdges"
                role="img"
                aria-label={text}
            >
                {/* Asa esquerda */}
                <path
                    d="M5 55 H75 V45 H95 V100 H75 V90 H5 L25 75 Z"
                    fill="#18c928"
                    stroke="#000"
                    strokeWidth="5"
                />

                {/* Asa direita */}
                <path
                    d="M895 55 H825 V45 H805 V100 H825 V90 H895 L875 75 Z"
                    fill="#18c928"
                    stroke="#000"
                    strokeWidth="5"
                />

                {/* Placa principal */}
                <path
                    d="
            M105 10
            H320
            L335 2
            H565
            L580 10
            H795
            L815 30
            V115
            L795 135
            H580
            L565 143
            H335
            L320 135
            H105
            L85 115
            V30
            Z
          "
                    fill="#101b05"
                    stroke="#ffb900"
                    strokeWidth="8"
                />

                {/* Borda interna */}
                <path
                    d="
            M110 22
            H315
            L330 14
            H570
            L585 22
            H790
            L800 32
            V110
            L790 120
            H585
            L570 128
            H330
            L315 120
            H110
            L100 110
            V32
            Z
          "
                    fill="none"
                    stroke="#ff7900"
                    strokeWidth="4"
                />

                {/* Estrela esquerda */}
                <text
                    x="85"
                    y="92"
                    textAnchor="middle"
                    fontSize="55"
                    fill="#ffbd00"
                    stroke="#000"
                    strokeWidth="4"
                >
                    ★
                </text>

                {/* Estrela direita */}
                <text
                    x="815"
                    y="92"
                    textAnchor="middle"
                    fontSize="55"
                    fill="#ffbd00"
                    stroke="#000"
                    strokeWidth="4"
                >
                    ★
                </text>

                {/* Texto */}
                <text
                    x="450"
                    y="88"
                    textAnchor="middle"
                    fill="#ffbd00"
                    stroke="#000"
                    strokeWidth="5"
                    paintOrder="stroke"
                    fontFamily="monospace"
                    fontWeight="900"
                    fontSize="45"
                >
                    {text}
                </text>
            </svg>
        </div>
    )
}