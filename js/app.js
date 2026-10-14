// 화면 전환 상태머신 + 전체 흐름(배경 → 배치 → 필터 → 8장 촬영 → 4장 선택 → 결과)을 연결하는 메인 컨트롤러.
(function () {
  const SHOT_COUNT = 8; // 총 촬영 장수
  const PICK_COUNT = 4; // 그 중 결과물에 들어갈 장수
  const COUNTDOWN = 10; // 촬영 카운트다운(초)

  const state = {
    frame: FRAMES[0].id,
    layout: "strip",
    filter: "none",
    shots: [], // 찍은 8장 (dataURL)
    picked: [], // 고른 사진의 인덱스 — 고른 순서가 결과물의 순서가 된다
    blobUrl: null, // 결과 이미지의 blob URL (기기 저장용)
  };

  const els = {
    brandLogo: document.getElementById("brand-logo"),
    logoChip: document.getElementById("logo-chip"),
    logoStatus: document.getElementById("logo-status"),
    btnLogoPick: document.getElementById("btn-logo-pick"),
    logoInput: document.getElementById("logo-input"),
    sdgChip: document.getElementById("sdg-chip"),
    sdgStatus: document.getElementById("sdg-status"),
    btnSdgPick: document.getElementById("btn-sdg-pick"),
    sdgInput: document.getElementById("sdg-input"),
    saveHint: document.getElementById("save-hint"),
    frameGrid: document.getElementById("frame-grid"),
    filterGrid: document.getElementById("filter-grid"),
    video: document.getElementById("video"),
    countdownOverlay: document.getElementById("countdown-overlay"),
    flash: document.getElementById("flash"),
    cameraNotice: document.getElementById("camera-notice"),
    shotStatus: document.getElementById("shot-status"),
    progressDots: document.getElementById("progress-dots"),
    btnStartShoot: document.getElementById("btn-start-shoot"),
    btnShootNow: document.getElementById("btn-shoot-now"),
    btnSwitchCamera: document.getElementById("btn-switch-camera"),
    cameraBack: document.querySelector("#screen-camera .btn-back"),
    pickGrid: document.getElementById("pick-grid"),
    pickCount: document.getElementById("pick-count"),
    btnCompose: document.getElementById("btn-compose"),
    btnPickClear: document.getElementById("btn-pick-clear"),
    btnPickRetake: document.getElementById("btn-pick-retake"),
    resultImage: document.getElementById("result-image"),
    btnDownload: document.getElementById("btn-download"),
    btnReselect: document.getElementById("btn-reselect"),
    btnRetake: document.getElementById("btn-retake"),
    btnRestart: document.getElementById("btn-restart"),
  };

  function showScreen(id) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    document.getElementById(id).classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ───────── 로고 (학교 교표 / SDG 13) ─────────
  function paintAssetInto(el, asset, size) {
    el.innerHTML = "";
    const canvas = document.createElement("canvas");
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + "px";
    canvas.style.height = size + "px";
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    asset.draw(ctx, size / 2, size / 2, size, getFrame(state.frame).ui.from);
    el.appendChild(canvas);
  }

  function statusText(asset, fileName, noneText) {
    if (asset.source === "custom") return "등록된 이미지를 쓰고 있어요 ✅";
    if (asset.source === "file") return "assets/" + fileName + " 을 쓰고 있어요 ✅";
    return noneText;
  }

  function refreshLogoUI() {
    paintAssetInto(els.brandLogo, SchoolLogo, 38);
    paintAssetInto(els.logoChip, SchoolLogo, 52);
    paintAssetInto(els.sdgChip, SdgLogo, 52);
    els.logoStatus.textContent = statusText(SchoolLogo, "logo.png", "아직 없어요 — 등록하면 바로 들어가요");
    els.sdgStatus.textContent = statusText(SdgLogo, "sdg13.png", "아직 없어요 — 등록하면 바로 들어가요");
  }

  async function handleLogoFile(file, asset, statusEl) {
    if (!file) return;
    try {
      await asset.setFromFile(file);
      refreshLogoUI();
      renderFrameGrid();
    } catch (e) {
      statusEl.textContent = "이미지를 불러오지 못했어요. 다른 파일로 해주세요.";
    }
  }

  // ───────── 선택 화면 ─────────
  function renderFrameGrid() {
    els.frameGrid.innerHTML = "";
    FRAMES.forEach((frame) => {
      const btn = document.createElement("button");
      btn.className = "frame-card" + (frame.id === state.frame ? " selected" : "");
      btn.dataset.frame = frame.id;
      btn.style.setProperty("--card-from", frame.ui.from);
      btn.style.setProperty("--card-to", frame.ui.to);
      btn.style.setProperty("--card-accent", frame.ui.accent);

      const canvas = document.createElement("canvas");
      canvas.className = "frame-canvas";
      canvas.width = 220;

      const meta = document.createElement("span");
      meta.className = "frame-meta";
      meta.innerHTML =
        '<span class="frame-label">' + frame.icon + " " + frame.label + "</span>" +
        '<span class="frame-en">' + frame.en + "</span>" +
        '<span class="frame-desc">' + frame.desc + "</span>";

      btn.appendChild(canvas);
      btn.appendChild(meta);
      btn.addEventListener("click", () => selectFrame(frame.id));
      els.frameGrid.appendChild(btn);

      // 실제 합성과 같은 그림으로 미리보기를 그린다.
      drawFramePreview(canvas, frame.id, "grid");
    });
  }

  function renderFilterGrid() {
    els.filterGrid.innerHTML = "";
    FILTERS.forEach((f) => {
      const btn = document.createElement("button");
      btn.className = "filter-card" + (f.id === state.filter ? " selected" : "");
      btn.dataset.filter = f.id;
      btn.innerHTML =
        '<span class="filter-swatch" style="background:' + f.swatch + '"></span>' +
        '<span class="filter-label">' + f.label + "</span>";
      btn.addEventListener("click", () => selectFilter(f.id));
      els.filterGrid.appendChild(btn);
    });
  }

  function selectFrame(id) {
    state.frame = id;
    document.body.dataset.frame = id;
    document.querySelectorAll(".frame-card").forEach((c) =>
      c.classList.toggle("selected", c.dataset.frame === id)
    );
    paintAssetInto(els.brandLogo, SchoolLogo, 38);
    showScreen("screen-layout");
  }

  function selectLayout(id) {
    state.layout = id;
    document.querySelectorAll(".layout-card").forEach((c) =>
      c.classList.toggle("selected", c.dataset.layout === id)
    );
    showScreen("screen-filter");
  }

  function selectFilter(id) {
    state.filter = id;
    document.querySelectorAll(".filter-card").forEach((c) =>
      c.classList.toggle("selected", c.dataset.filter === id)
    );
    showScreen("screen-camera");
    enterCameraScreen();
  }

  // ───────── 촬영 ─────────
  function renderProgressDots() {
    els.progressDots.innerHTML = "";
    for (let i = 0; i < SHOT_COUNT; i++) {
      const dot = document.createElement("span");
      dot.className = "dot";
      els.progressDots.appendChild(dot);
    }
  }

  function updateProgressDots(filledCount) {
    els.progressDots.querySelectorAll(".dot").forEach((d, i) =>
      d.classList.toggle("filled", i < filledCount)
    );
  }

  function setNotice(text) {
    els.cameraNotice.textContent = text || "";
    els.cameraNotice.hidden = !text;
  }

  function applyPreviewTransform() {
    els.video.style.transform = Camera.isMirrored() ? "scaleX(-1)" : "none";
  }

  async function enterCameraScreen() {
    state.shots = [];
    state.picked = [];
    renderProgressDots();
    updateProgressDots(0);
    els.btnStartShoot.disabled = false;
    els.btnStartShoot.hidden = false;
    els.btnStartShoot.textContent = "촬영 시작";
    els.btnShootNow.hidden = true;
    els.btnSwitchCamera.disabled = false;
    els.cameraBack.hidden = false;
    els.shotStatus.textContent = "촬영 시작을 누르면 " + COUNTDOWN + "초 카운트 후 " + SHOT_COUNT + "장이 쉬지 않고 이어서 찍혀요";
    setNotice("");
    els.video.style.filter = getFilter(state.filter).cssFilter;

    try {
      await Camera.init(els.video);
      await Camera.start();
      applyPreviewTransform();
      els.btnSwitchCamera.hidden = !Camera.hasMultipleCameras();
    } catch (err) {
      setNotice("카메라에 접근할 수 없어요. 브라우저의 카메라 권한을 허용했는지 확인해주세요.");
      els.btnStartShoot.disabled = true;
    }
  }

  async function startShootSequence() {
    els.btnStartShoot.hidden = true;
    els.btnShootNow.hidden = false;
    els.btnSwitchCamera.disabled = true;
    // 촬영 중에 뒤로 나가면 카메라가 꺼진 채로 촬영이 계속되므로 아예 막는다.
    els.cameraBack.hidden = true;
    const activeFilter = getFilter(state.filter);

    // 한 번 시작하면 8장을 다 찍을 때까지 카운트다운이 끊기지 않고 이어진다.
    // (사이에 멈춤 없이 바로 다음 카운트로 넘어가므로 누를 것이 없다)
    for (let i = 0; i < SHOT_COUNT; i++) {
      els.shotStatus.textContent = SHOT_COUNT + "장 중 " + (i + 1) + "번째 — 포즈 준비!";
      const dataUrl = await Camera.countdownAndShoot({
        overlayEl: els.countdownOverlay,
        flashEl: els.flash,
        cssFilter: activeFilter.cssFilter,
        overlayColor: activeFilter.overlay,
        from: COUNTDOWN,
      });
      state.shots.push(dataUrl);
      updateProgressDots(state.shots.length);

      if (i < SHOT_COUNT - 1) {
        // 플래시가 사라질 짧은 틈만 두고 곧바로 다음 카운트다운을 시작한다.
        els.shotStatus.textContent = "좋아요! " + state.shots.length + "장 찍었어요 📸 바로 다음 사진 갑니다!";
        await Camera.sleep(400);
      }
    }

    Camera.stop();
    els.btnShootNow.hidden = true;
    els.shotStatus.textContent = "촬영 완료!";
    renderPickGrid();
    showScreen("screen-pick");
  }

  // ───────── 8장 중 4장 고르기 ─────────
  function renderPickGrid() {
    els.pickGrid.innerHTML = "";
    state.shots.forEach((src, i) => {
      const btn = document.createElement("button");
      btn.className = "pick-card";
      btn.dataset.index = String(i);
      btn.innerHTML =
        '<img src="' + src + '" alt="' + (i + 1) + '번째 사진">' +
        '<span class="pick-badge"></span>' +
        '<span class="pick-no">' + (i + 1) + "</span>";
      btn.addEventListener("click", () => togglePick(i));
      els.pickGrid.appendChild(btn);
    });
    updatePickUI();
  }

  function togglePick(index) {
    const at = state.picked.indexOf(index);
    if (at >= 0) {
      state.picked.splice(at, 1);
    } else if (state.picked.length < PICK_COUNT) {
      state.picked.push(index);
    } else {
      // 4장을 다 골랐으면 가장 먼저 고른 사진을 빼고 새로 고른 사진을 넣는다.
      state.picked.shift();
      state.picked.push(index);
    }
    updatePickUI();
  }

  function updatePickUI() {
    els.pickGrid.querySelectorAll(".pick-card").forEach((card) => {
      const i = Number(card.dataset.index);
      const order = state.picked.indexOf(i);
      card.classList.toggle("selected", order >= 0);
      card.querySelector(".pick-badge").textContent = order >= 0 ? String(order + 1) : "";
    });
    els.pickCount.textContent = String(state.picked.length);
    els.btnCompose.disabled = state.picked.length !== PICK_COUNT;
  }

  // ───────── 결과 ─────────
  async function buildResult() {
    els.btnCompose.disabled = true;
    els.btnCompose.textContent = "만드는 중…";
    try {
      const shots = state.picked.map((i) => state.shots[i]);
      const finalDataUrl = await composeResult(shots, state.layout, state.frame);
      els.resultImage.src = finalDataUrl;
      await prepareDownload(finalDataUrl);
      ShareUI.reset();
      showScreen("screen-result");
    } finally {
      els.btnCompose.textContent = "이 4장으로 만들기";
      els.btnCompose.disabled = state.picked.length !== PICK_COUNT;
    }
  }

  // "기기에 저장" 준비. 완성 이미지는 용량이 커서 data: 주소 그대로 내려받게 하면
  // 휴대폰 브라우저가 저장을 거부하는 경우가 있어, blob 주소로 바꿔서 건네준다.
  async function prepareDownload(dataUrl) {
    const fileName = downloadFileName();
    els.btnDownload.download = fileName;
    try {
      const blob = await (await fetch(dataUrl)).blob();
      if (state.blobUrl) URL.revokeObjectURL(state.blobUrl);
      state.blobUrl = URL.createObjectURL(blob);
      els.btnDownload.href = state.blobUrl;
    } catch (e) {
      els.btnDownload.href = dataUrl; // blob을 못 만들면 원래 방식으로라도 내려받게 한다
    }
  }

  async function retake() {
    showScreen("screen-camera");
    await enterCameraScreen();
  }

  function restart() {
    state.layout = "strip";
    state.filter = "none";
    state.shots = [];
    state.picked = [];
    Camera.stop();
    document.querySelectorAll(".layout-card, .filter-card").forEach((c) =>
      c.classList.remove("selected")
    );
    showScreen("screen-frame");
  }

  // ───────── 이벤트 연결 ─────────
  function wireButtons() {
    document.querySelectorAll(".layout-card").forEach((card) => {
      card.addEventListener("click", () => selectLayout(card.dataset.layout));
    });
    document.querySelectorAll("[data-back]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.dataset.back !== "screen-camera") Camera.stop();
        showScreen(btn.dataset.back);
      });
    });

    els.btnStartShoot.addEventListener("click", startShootSequence);
    els.btnShootNow.addEventListener("click", () => Camera.requestSkip());
    els.btnSwitchCamera.addEventListener("click", async () => {
      els.btnSwitchCamera.disabled = true;
      try {
        await Camera.switchCamera();
        applyPreviewTransform();
        setNotice("");
      } catch (e) {
        setNotice("카메라 전환에 실패했어요 (" + (e.name || e.message || "알 수 없는 오류") + "). 다시 시도해주세요.");
      } finally {
        els.btnSwitchCamera.disabled = false;
      }
    });

    els.btnCompose.addEventListener("click", buildResult);
    els.btnPickClear.addEventListener("click", () => {
      state.picked = [];
      updatePickUI();
    });
    els.btnPickRetake.addEventListener("click", retake);

    els.btnReselect.addEventListener("click", () => showScreen("screen-pick"));
    els.btnRetake.addEventListener("click", retake);
    els.btnRestart.addEventListener("click", restart);

    els.btnLogoPick.addEventListener("click", () => els.logoInput.click());
    els.logoInput.addEventListener("change", (e) => {
      handleLogoFile(e.target.files && e.target.files[0], SchoolLogo, els.logoStatus);
      e.target.value = "";
    });
    els.btnSdgPick.addEventListener("click", () => els.sdgInput.click());
    els.sdgInput.addEventListener("change", (e) => {
      handleLogoFile(e.target.files && e.target.files[0], SdgLogo, els.sdgStatus);
      e.target.value = "";
    });
  }

  async function init() {
    document.body.dataset.frame = state.frame;
    wireButtons();
    renderFilterGrid();
    renderProgressDots();
    ShareUI.init(() => els.resultImage.src);
    await Promise.all([SchoolLogo.load(), SdgLogo.load()]);
    refreshLogoUI();
    renderFrameGrid();
  }

  init();
})();
