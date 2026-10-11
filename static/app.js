const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const userIdInput = document.getElementById("userId");
const statusEl = document.getElementById("status");
const startBtn = document.getElementById("startBtn");
const captureBtn = document.getElementById("captureBtn");
const enrollBtn = document.getElementById("enrollBtn");
const verifyBtn = document.getElementById("verifyBtn");

const API_BASE = window.location.origin;
let stream = null;
let lastImageBase64 = null;

function isSecureForCamera() {
  return window.isSecureContext || window.location.hostname === "localhost";
}

function getMediaStream(constraints) {
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    return navigator.mediaDevices.getUserMedia(constraints);
  }

  const legacyGetUserMedia =
    navigator.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia;

  if (!legacyGetUserMedia) {
    return Promise.reject(
      new Error(
        "Este browser não suporta acesso à câmara. Use Chrome/Safari atualizados."
      )
    );
  }

  return new Promise((resolve, reject) =>
    legacyGetUserMedia.call(navigator, constraints, resolve, reject)
  );
}

function setStatus(message, isError = false) {
  statusEl.textContent = `Estado: ${message}`;
  statusEl.style.color = isError ? "#fca5a5" : "#cbd5e1";
}

function getUserId() {
  const value = userIdInput.value.trim();
  if (!value) {
    throw new Error("Preencha o ID do utilizador.");
  }
  return value;
}

async function startCamera() {
  if (stream) return;

  if (!isSecureForCamera()) {
    throw new Error(
      "Câmara bloqueada: abra por HTTPS (ou localhost). Evite browser dentro de apps."
    );
  }

  stream = await getMediaStream({
    video: { facingMode: "user" },
    audio: false,
  });
  video.srcObject = stream;
  setStatus("câmara iniciada.");
}

function captureFrame() {
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  lastImageBase64 = canvas.toDataURL("image/jpeg", 0.95);
  setStatus("imagem capturada.");
}

async function postFace(path) {
  const userId = getUserId();
  if (!lastImageBase64) {
    throw new Error("Capture uma imagem primeiro.");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      image_base64: lastImageBase64,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Erro na operação.");
  }
  return data;
}

startBtn.addEventListener("click", async () => {
  try {
    await startCamera();
  } catch (error) {
    setStatus(error.message, true);
  }
});

captureBtn.addEventListener("click", () => {
  try {
    if (!stream) {
      throw new Error("Inicie a câmara primeiro.");
    }
    captureFrame();
  } catch (error) {
    setStatus(error.message, true);
  }
});

enrollBtn.addEventListener("click", async () => {
  try {
    const result = await postFace("/api/enroll");
    setStatus(result.message);
  } catch (error) {
    setStatus(error.message, true);
  }
});

verifyBtn.addEventListener("click", async () => {
  try {
    const result = await postFace("/api/verify");
    if (result.match) {
      setStatus(`verificado com sucesso (distância ${result.distance}).`);
    } else {
      setStatus(`falha na verificação (distância ${result.distance}).`, true);
    }
  } catch (error) {
    setStatus(error.message, true);
  }
});
