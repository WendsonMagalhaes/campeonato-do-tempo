# App — Campeonato do Tempo 2026

Aplicação local-first (Vite + React + TypeScript). Sem servidor remoto.

```bash
cd app
npm install
npm run dev
```

- Operador: http://127.0.0.1:5173/
- Telão (somente leitura): http://127.0.0.1:5173/telao

```bash
npm test
npm run typecheck
npm run build
npm run e2e
```

Timer Capture opcional (local-first, sem servidor remoto):

```bash
cd ../timer-capture
python -m pip install -r requirements.txt
python server.py
```

No painel do operador, o card **Timer Capture** mostra se `http://127.0.0.1:8765/health` está online. Leituras estáveis viram candidatos; o operador atribui a A/B (ou descarta). Sem webcam/periférico, use **Simular leitura** ou a entrada manual da rodada — o fluxo manual nunca depende da câmera.

O botão **Ensaio 32/16** cadastra o setup de teste.
