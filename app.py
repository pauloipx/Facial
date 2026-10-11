import base64
import json
import os
from datetime import datetime
from typing import Dict, List

import cv2
import numpy as np
from deepface import DeepFace
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel


DB_PATH = "face_db.json"
MODEL_NAME = "Facenet512"
DISTANCE_THRESHOLD = 0.35


class FacePayload(BaseModel):
    user_id: str
    image_base64: str


def load_db() -> Dict[str, Dict]:
    if not os.path.exists(DB_PATH):
        return {}
    with open(DB_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def save_db(db: Dict[str, Dict]) -> None:
    with open(DB_PATH, "w", encoding="utf-8") as f:
        json.dump(db, f, indent=2, ensure_ascii=False)


def decode_base64_image(image_base64: str) -> np.ndarray:
    if "," in image_base64:
        image_base64 = image_base64.split(",", 1)[1]

    binary = base64.b64decode(image_base64)
    arr = np.frombuffer(binary, np.uint8)
    image = cv2.imdecode(arr, cv2.IMREAD_COLOR)

    if image is None:
        raise ValueError("Não foi possível decodificar a imagem.")

    return image


def extract_embedding(image_b64: str) -> np.ndarray:
    try:
        image = decode_base64_image(image_b64)
        result: List[Dict] = DeepFace.represent(
            img_path=image,
            model_name=MODEL_NAME,
            detector_backend="opencv",
            enforce_detection=True,
        )
        if not result:
            raise ValueError("Nenhuma face detectada na imagem.")
        return np.array(result[0]["embedding"], dtype=np.float32)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Erro ao extrair face: {exc}") from exc


def cosine_distance(a: np.ndarray, b: np.ndarray) -> float:
    numerator = np.dot(a, b)
    denominator = np.linalg.norm(a) * np.linalg.norm(b)
    if denominator == 0:
        return 1.0
    cosine_similarity = numerator / denominator
    return 1.0 - float(cosine_similarity)


app = FastAPI(title="Mini Face Verify")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok", "model": MODEL_NAME}


@app.post("/api/enroll")
def enroll_face(payload: FacePayload):
    embedding = extract_embedding(payload.image_base64)
    db = load_db()
    db[payload.user_id] = {
        "embedding": embedding.tolist(),
        "updated_at": datetime.utcnow().isoformat() + "Z",
    }
    save_db(db)
    return {"message": "Face registada com sucesso."}


@app.post("/api/verify")
def verify_face(payload: FacePayload):
    db = load_db()
    user_data = db.get(payload.user_id)
    if not user_data:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado. Faça o registo primeiro.")

    probe_embedding = extract_embedding(payload.image_base64)
    ref_embedding = np.array(user_data["embedding"], dtype=np.float32)

    distance = cosine_distance(ref_embedding, probe_embedding)
    is_match = distance <= DISTANCE_THRESHOLD

    return {
        "user_id": payload.user_id,
        "match": is_match,
        "distance": round(distance, 4),
        "threshold": DISTANCE_THRESHOLD,
    }


app.mount("/", StaticFiles(directory="static", html=True), name="static")
