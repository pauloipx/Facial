# Mini Face Verify (PC + Telemóvel)

Miniaplicação web para registar e verificar rosto usando a câmara do navegador.

## Requisitos

- Python 3.10+
- Webcam no PC ou câmara frontal no telemóvel
- Mesmo Wi-Fi para acesso pelo telemóvel

## Instalação

```bash
python -m venv .venv
.venv\Scripts\activate.bat
pip install -r requirements.txt
```

Se estiveres em PowerShell e quiseres usar o script `.ps1`, primeiro:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

## Executar

```bash
uvicorn app:app --host 0.0.0.0 --port 8000
```

Aceder no PC: `http://localhost:8000`

No telemóvel (mesma rede), aceder: `http://SEU_IP_LOCAL:8000`

## Fluxo de uso

1. Inserir o `ID do utilizador`.
2. Clicar em `Iniciar Câmara`.
3. Clicar em `Capturar`.
4. Clicar em `Registar Face`.
5. Para autenticar, capturar novamente e clicar em `Verificar Face`.

## Endpoints

- `GET /api/health`
- `POST /api/enroll`
- `POST /api/verify`

## Notas importantes

- Este é um MVP, sem deteção de prova de vida (liveness).
- O registo guarda embedding em `face_db.json`.
- Ajustar `DISTANCE_THRESHOLD` em `app.py` para calibrar match/no-match.
