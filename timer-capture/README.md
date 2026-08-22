# Timer Capture — periférico localhost

Lê o display do Race Timer por webcam. **Não pontua, não atribui pessoa, não altera a chave.**

```bash
python3 -m pip install -r requirements.txt
python3 server.py
```

- `GET /health`
- `GET /candidate` — último `TIMER_VALUE_DETECTED` estável
- `POST /simulate` `{"value": 1.56}` — desenvolvimento sem câmera
- `POST /roi` `{"x":0,"y":0,"w":320,"h":80}`

Se OpenCV ou a câmera falharem, o serviço continua no modo simulação. O operador usa entrada manual no app.
