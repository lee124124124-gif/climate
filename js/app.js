// 화면 전환 상태머신 + 전체 흐름을 연결하는 메인 컨트롤러.
(function () {
  const SHOT_COUNT = 4;

  const state = {
    event: null,
    layout: null,
    filter: "none",
    shots: [],
  };

  const els = {
    eventGrid: document.getElementById("event-grid"),
    filterGrid: document.getElementById("filter-grid"),
    video: document.getElementById("video"),
    countdownOverlay: document.getElementById("countdown-overlay"),
    flash: document.getElementById("flash"),
    cameraNotice: document.getElementById("camera-notice"),
    progressDots: document.getElementById("progress-dots"),
    btnStartShoot: document.getElementById("btn-start-shoot"),
    btnSwitchCamera: document.getElementById("btn-switch-camera"),
    resultImage: document.getElementById("result-image"),
    btnDownload: document.getElementById("btn-download"),
    btnRetake: document.getElementById("btn-retake"),
    btnRestart: document.getElementById("btn-restart"),
  };

  function showScreen(id) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    document.getElementById(id).classList.add("active");
  }

  function renderEventGrid() {
    els.eventGrid.innerHTML = "";
    THEMES.forEach((theme) => {
      const btn = document.createElement("button");
      btn.className = "event-card";
      btn.dataset.event = theme.id;
      btn.innerHTML = `
        <span class="event-icon">${theme.icon}</span>
        <span class="event-label">${theme.label}</span>
      `;
      btn.style.setProperty("--card-from", theme.bgFrom);
      btn.style.setProperty("--card-to", theme.bgTo);
      btn.addEventListener("click", () => selectEvent(theme.id));
      els.eventGrid.appendChild(btn);
    });
  }

  function renderFilterGrid() {
    els.filterGrid.innerHTML = "";
    FILTERS.forEach((f) => {
      const btn = document.createElement("button");
      btn.className = "filter-card";
      btn.dataset.filter = f.id;
      btn.innerHTML = `
        <span class="filter-swatch" style="background:${f.swatch}"></span>
        <span class="filter-label">${f.label}</span>
      `;
      btn.addEventListener("click", () => selectFilter(f.id));
      els.filterGrid.appendChild(btn);
    });
  }

  function renderProgressDots() {
    els.progressDots.innerHTML = "";
    for (let i = 0; i < SHOT_COUNT; i++) {
      const dot = document.createElement("span");
      dot.className = "dot";
      els.progressDots.appendChild(dot);
    }
  }

  function updateProgressDots(filledCount) {
    const dots = els.progressDots.querySelectorAll(".dot");
    dots.forEach((d, i) => d.classList.toggle("filled", i < filledCount));
  }

  function selectEvent(id) {
    state.event = id;
    document.body.dataset.theme = id;
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

  async function enterCameraScreen() {
    state.shots = [];
    renderProgressDots();
    els.btnStartShoot.disabled = false;
    els.btnStartShoot.textContent = "촬영 시작";
    els.cameraNotice.textContent = "";
    const activeFilter = getFilter(state.filter);
    els.video.style.filter = activeFilter.cssFilter;

    try {
      await Camera.init(els.video);
      await Camera.start();
      els.btnSwitchCamera.hidden = !Camera.hasMultipleCameras();
    } catch (err) {
      els.cameraNotice.textContent =
        "카메라에 접근할 수 없어요. 브라우저의 카메라 권한을 허용했는지 확인해주세요.";
      els.btnStartShoot.disabled = true;
    }
  }

  async function startShootSequence() {
    els.btnStartShoot.disabled = true;
    els.btnSwitchCamera.disabled = true;
    els.btnStartShoot.textContent = "촬영 중...";
    const activeFilter = getFilter(state.filter);

    for (let i = 0; i < SHOT_COUNT; i++) {
      const dataUrl = await Camera.countdownAndShoot({
        overlayEl: els.countdownOverlay,
        flashEl: els.flash,
        cssFilter: activeFilter.cssFilter,
        overlayColor: activeFilter.overlay,
      });
      state.shots.push(dataUrl);
      updateProgressDots(state.shots.length);
      if (i < SHOT_COUNT - 1) {
        await Camera.sleep(1200);
      }
    }

    const finalDataUrl = await composeResult(state.shots, state.layout, state.event);
    Camera.stop();
    els.resultImage.src = finalDataUrl;
    els.btnDownload.href = finalDataUrl;
    ShareUI.reset();
    showScreen("screen-result");
  }

  async function retake() {
    showScreen("screen-camera");
    await enterCameraScreen();
  }

  function restart() {
    state.event = null;
    state.layout = null;
    state.filter = "none";
    state.shots = [];
    Camera.stop();
    document.querySelectorAll(".layout-card, .filter-card").forEach((c) =>
      c.classList.remove("selected")
    );
    showScreen("screen-event");
  }

  function wireStaticButtons() {
    document.querySelectorAll(".layout-card").forEach((card) => {
      card.addEventListener("click", () => selectLayout(card.dataset.layout));
    });
    document.querySelectorAll("[data-back]").forEach((btn) => {
      btn.addEventListener("click", () => showScreen(btn.dataset.back));
    });
    els.btnStartShoot.addEventListener("click", startShootSequence);
    els.btnSwitchCamera.addEventListener("click", async () => {
      els.btnSwitchCamera.disabled = true;
      await Camera.switchCamera();
      els.btnSwitchCamera.disabled = false;
    });
    els.btnRetake.addEventListener("click", retake);
    els.btnRestart.addEventListener("click", restart);
  }

  renderEventGrid();
  renderFilterGrid();
  renderProgressDots();
  wireStaticButtons();
  ShareUI.init(() => els.resultImage.src);
})();
