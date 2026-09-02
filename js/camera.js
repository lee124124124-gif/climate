// 카메라 스트림 제어 + 10초 카운트다운 + 촬영을 담당하는 모듈.
const Camera = {
  videoEl: null,
  stream: null,
  devices: [],
  deviceIndex: 0,
  audioCtx: null,

  async init(videoEl) {
    this.videoEl = videoEl;
    this.deviceIndex = 0;
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      this.devices = list.filter((d) => d.kind === "videoinput");
    } catch (e) {
      this.devices = [];
    }
  },

  async start() {
    const hadStream = !!this.stream;
    this.stop();
    if (hadStream) {
      // 직전 카메라 장치가 OS 레벨에서 완전히 해제될 시간을 확보한다.
      // (해제 직후 바로 재요청하면 NotReadableError로 실패해 전환이 안 먹힐 수 있음)
      await this.sleep(300);
    }
    const constraints = {
      video: this.devices.length
        ? { deviceId: { exact: this.devices[this.deviceIndex].deviceId } }
        : true,
      audio: false,
    };

    // 방금 해제한 장치를 곧바로 다시 열 때 OS가 아직 "사용 중"으로 인식해
    // NotReadableError 등을 던지는 경우가 있어, 짧은 대기 후 몇 차례 재시도한다.
    const RETRYABLE = ["NotReadableError", "TrackStartError", "AbortError"];
    let lastErr = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        this.stream = await navigator.mediaDevices.getUserMedia(constraints);
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
        if (attempt < 3 && RETRYABLE.includes(e.name)) {
          await this.sleep(300 * (attempt + 1));
          continue;
        }
        throw e;
      }
    }
    if (lastErr) throw lastErr;

    this.videoEl.srcObject = this.stream;
    await this.videoEl.play();

    // 권한 허용 후에는 라벨이 채워지므로 최초 1회에 한해 장치 목록을 다시 읽는다.
    // (전환할 때마다 다시 읽으면 브라우저가 목록 순서를 바꿀 수 있어 전환 인덱스가 어긋난다)
    if (!this.devicesLoaded) {
      const list = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = list.filter((d) => d.kind === "videoinput");
      if (videoInputs.length) {
        this.devices = videoInputs;
      }
      this.devicesLoaded = true;
    }
  },

  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    // srcObject를 비워서 브라우저가 카메라 장치를 확실히 반납하게 한다.
    // (다음 start()가 곧바로 이어질 때 "장치 사용 중" 오류로 실패하는 것을 방지)
    if (this.videoEl) {
      this.videoEl.srcObject = null;
    }
  },

  hasMultipleCameras() {
    return this.devices.length > 1;
  },

  async switchCamera() {
    // 전환이 끝나기 전에 다시 호출되는 것을 막아, 연속 클릭 시 상태가 꼬이지 않게 한다.
    if (!this.hasMultipleCameras() || this.switching) return;
    this.switching = true;
    const previousIndex = this.deviceIndex;
    this.deviceIndex = (this.deviceIndex + 1) % this.devices.length;
    try {
      await this.start();
    } catch (e) {
      // 전환 실패 시 이전 카메라로 되돌리고 다시 시작해, 화면이 멈춰있지 않게 한다.
      this.deviceIndex = previousIndex;
      await this.start();
      throw e;
    } finally {
      this.switching = false;
    }
  },

  // 현재 비디오 프레임을 좌우 반전(셀카 모드)해 캡처하고 filter/overlay를 적용해 dataURL로 반환한다.
  captureFrame(cssFilter, overlayColor) {
    const canvas = document.getElementById("capture-canvas");
    const w = this.videoEl.videoWidth;
    const h = this.videoEl.videoHeight;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");

    ctx.save();
    ctx.filter = cssFilter && cssFilter !== "none" ? cssFilter : "none";
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(this.videoEl, 0, 0, w, h);
    ctx.restore();

    if (overlayColor) {
      ctx.fillStyle = overlayColor;
      ctx.fillRect(0, 0, w, h);
    }

    return canvas.toDataURL("image/png");
  },

  playBeep(freq = 880, duration = 0.09) {
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = this.audioCtx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // 오디오를 사용할 수 없는 환경(권한/브라우저 제약)에서는 조용히 무시한다.
    }
  },

  sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  },

  // 10초 카운트다운을 보여준 뒤 한 장을 촬영해 dataURL을 반환한다.
  async countdownAndShoot({ overlayEl, flashEl, cssFilter, overlayColor }) {
    for (let n = 10; n >= 1; n--) {
      overlayEl.textContent = n;
      overlayEl.classList.remove("pulse");
      // 강제 리플로우로 애니메이션을 매번 재시작
      void overlayEl.offsetWidth;
      overlayEl.classList.add("pulse");
      this.playBeep(660, 0.08);
      await this.sleep(1000);
    }
    overlayEl.textContent = "";
    this.playBeep(1100, 0.12);
    flashEl.classList.add("flash-active");
    const dataUrl = this.captureFrame(cssFilter, overlayColor);
    await this.sleep(150);
    flashEl.classList.remove("flash-active");
    return dataUrl;
  },
};
