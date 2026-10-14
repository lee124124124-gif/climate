// 카메라 스트림 제어 + 10초 카운트다운 + 촬영을 담당하는 모듈.
const Camera = {
  videoEl: null,
  stream: null,
  devices: [],
  deviceIndex: 0,
  devicesLoaded: false,
  facingMode: "user", // 모바일 기준 기본은 전면 카메라
  facingModeSupported: true, // exact facingMode 요청이 가능한 환경인지 (실패하면 deviceId 순환 방식으로 대체)
  switching: false, // 카메라 전환이 진행 중인지 (연속 클릭 방지)
  skipRequested: false, // "지금 찍기"로 카운트다운을 건너뛰었는지
  audioCtx: null,

  async init(videoEl) {
    this.videoEl = videoEl;
    this.deviceIndex = 0;
    this.devicesLoaded = false;
    this.facingMode = "user";
    this.facingModeSupported = true;
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      this.devices = list.filter((d) => d.kind === "videoinput");
    } catch (e) {
      this.devices = [];
    }
  },

  // videoConstraints를 생략하면 "기본 카메라" 제약(모바일에서는 전면 힌트)으로 시작한다.
  async start(videoConstraints) {
    const hadStream = !!this.stream;
    this.stop();
    if (hadStream) {
      // 직전 카메라 장치가 OS 레벨에서 완전히 해제될 시간을 확보한다.
      // (해제 직후 바로 재요청하면 NotReadableError로 실패해 전환이 안 먹힐 수 있음)
      await this.sleep(300);
    }
    const constraints = {
      // 데스크톱 웹캠처럼 facingMode 정보가 없는 장치에서는 ideal 힌트가 무시되고 기본 장치가 열린다.
      video: videoConstraints || { facingMode: { ideal: this.facingMode } },
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
    try {
      if (this.facingModeSupported) {
        // 모바일: 후면 카메라가 렌즈별로 여러 개 잡히더라도 facingMode로 전면/후면만 정확히 토글한다.
        const nextFacing = this.facingMode === "environment" ? "user" : "environment";
        try {
          await this.start({ facingMode: { exact: nextFacing } });
          this.facingMode = nextFacing;
          return;
        } catch (e) {
          // 이 기기의 카메라들은 전면/후면 구분 정보가 없다(예: 데스크톱 웹캠 여러 대).
          // 이후로는 장치 순환 방식으로 전환한다.
          this.facingModeSupported = false;
        }
      }

      // 데스크톱 등 facingMode 미지원 환경: deviceId를 순서대로 돌려가며 전환한다.
      const previousIndex = this.deviceIndex;
      this.deviceIndex = (this.deviceIndex + 1) % this.devices.length;
      try {
        await this.start({ deviceId: { exact: this.devices[this.deviceIndex].deviceId } });
      } catch (e) {
        // 전환 실패 시 이전 카메라로 되돌리고 다시 시작해, 화면이 멈춰있지 않게 한다.
        this.deviceIndex = previousIndex;
        await this.start({ deviceId: { exact: this.devices[previousIndex].deviceId } });
        throw e;
      }
    } finally {
      this.switching = false;
    }
  },

  // 전면(셀카) 카메라일 때만 좌우를 뒤집어 보여준다. 후면 카메라는 보이는 그대로가 맞다.
  isMirrored() {
    return this.facingMode !== "environment";
  },

  // 현재 비디오 프레임을 캡처해 filter/overlay를 적용한 dataURL로 반환한다.
  // 미리보기(video)와 같은 방향·같은 필터로 찍어서 보이는 그대로 저장되게 한다.
  captureFrame(cssFilter, overlayColor) {
    const canvas = document.getElementById("capture-canvas");
    const w = this.videoEl.videoWidth;
    const h = this.videoEl.videoHeight;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");

    ctx.save();
    ctx.filter = cssFilter && cssFilter !== "none" ? cssFilter : "none";
    if (this.isMirrored()) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(this.videoEl, 0, 0, w, h);
    ctx.restore();

    if (overlayColor) {
      ctx.fillStyle = overlayColor;
      ctx.fillRect(0, 0, w, h);
    }

    // 8장을 메모리에 들고 있어야 하므로 용량이 작은 JPEG로 보관한다.
    // (최종 결과물은 compose.js에서 다시 PNG로 만든다)
    return canvas.toDataURL("image/jpeg", 0.92);
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

  // 중간에 "지금 찍기"를 누르면 곧바로 빠져나올 수 있는 대기.
  async waitOrSkip(ms) {
    const step = 60;
    for (let waited = 0; waited < ms; waited += step) {
      if (this.skipRequested) return;
      await this.sleep(Math.min(step, ms - waited));
    }
  },

  // 카운트다운을 기다리지 않고 바로 찍게 한다.
  requestSkip() {
    this.skipRequested = true;
  },

  // 10초 카운트다운을 보여준 뒤 한 장을 촬영해 dataURL을 반환한다.
  async countdownAndShoot(opts) {
    const { overlayEl, flashEl, cssFilter, overlayColor } = opts;
    const from = opts.from || 10;
    this.skipRequested = false;

    for (let n = from; n >= 1; n--) {
      if (this.skipRequested) break;
      overlayEl.textContent = n;
      overlayEl.classList.remove("pulse");
      // 강제 리플로우로 애니메이션을 매번 재시작
      void overlayEl.offsetWidth;
      overlayEl.classList.add("pulse");
      // 마지막 3초는 소리를 높여서 "이제 찍는다"는 걸 알려준다.
      this.playBeep(n <= 3 ? 880 : 660, 0.08);
      await this.waitOrSkip(1000);
    }

    overlayEl.textContent = "";
    this.skipRequested = false;
    this.playBeep(1100, 0.12);
    flashEl.classList.add("flash-active");
    const dataUrl = this.captureFrame(cssFilter, overlayColor);
    await this.sleep(150);
    flashEl.classList.remove("flash-active");
    return dataUrl;
  },
};
