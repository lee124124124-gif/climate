// 금일중학교 로고를 불러와 사진 배경에 넣어주는 모듈.
//
// 로고를 찾는 순서:
//   1) 앱에서 직접 등록한 로고 (브라우저 localStorage에 저장 — 한 번 등록하면 계속 유지됨)
//   2) assets/logo.png (또는 .jpg / .jpeg / .webp / .svg) 파일
//   3) 둘 다 없으면 학교 엠블럼(파란 마름모)을 직접 그려서 대신 사용
const SchoolLogo = {
  STORAGE_KEY: "geumil-photobooth-logo",
  CANDIDATES: ["assets/logo.png", "assets/logo.jpg", "assets/logo.jpeg", "assets/logo.webp", "assets/logo.svg"],
  MAX_SIDE: 512, // 저장 용량을 아끼려고 긴 변을 이 크기로 줄여서 보관한다

  img: null,
  source: "none", // "custom" | "file" | "none"

  async load() {
    const saved = this.readStored();
    if (saved) {
      try {
        this.img = await this.toImage(saved);
        this.source = "custom";
        return this.source;
      } catch (e) {
        // 저장된 값이 깨졌으면 지우고 파일 쪽으로 넘어간다.
        this.clear();
      }
    }

    for (const path of this.CANDIDATES) {
      try {
        this.img = await this.toImage(path);
        this.source = "file";
        return this.source;
      } catch (e) {
        // 해당 파일이 없으면 다음 후보로
      }
    }

    this.img = null;
    this.source = "none";
    return this.source;
  },

  readStored() {
    try {
      return localStorage.getItem(this.STORAGE_KEY);
    } catch (e) {
      return null; // 사생활 보호 모드 등 localStorage를 못 쓰는 환경
    }
  },

  // 사용자가 고른 이미지 파일을 로고로 등록한다.
  async setFromFile(file) {
    const dataUrl = await this.readFileAsDataUrl(file);
    const raw = await this.toImage(dataUrl);
    const shrunk = this.shrink(raw);
    this.img = await this.toImage(shrunk);
    this.source = "custom";
    try {
      localStorage.setItem(this.STORAGE_KEY, shrunk);
    } catch (e) {
      // 저장 공간이 부족해도 이번 세션에서는 그대로 사용할 수 있게 둔다.
    }
    return this.img;
  },

  clear() {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (e) {
      /* 무시 */
    }
    this.img = null;
    this.source = "none";
  },

  shrink(img) {
    const scale = Math.min(1, this.MAX_SIDE / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, w, h);
    return c.toDataURL("image/png");
  },

  readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  },

  toImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("이미지를 불러오지 못했습니다: " + src));
      img.src = src;
    });
  },

  // 결과 사진에 들어가는 원형 로고 뱃지.
  drawBadge(ctx, cx, cy, radius, ringColor) {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.22)";
    ctx.shadowBlur = radius * 0.35;
    ctx.shadowOffsetY = radius * 0.08;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.lineWidth = Math.max(2, radius * 0.09);
    ctx.strokeStyle = ringColor || "#14225B";
    ctx.beginPath();
    ctx.arc(cx, cy, radius - ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.84, 0, Math.PI * 2);
    ctx.clip();
    if (this.img) {
      const box = radius * 1.46;
      Paint.contain(ctx, this.img, cx - box / 2, cy - box / 2, box, box);
    } else {
      this.drawFallbackEmblem(ctx, cx, cy, radius * 0.84);
    }
    ctx.restore();
  },

  // 로고 파일이 아직 없을 때 쓰는 임시 엠블럼 (금일중학교 교표의 마름모 형태).
  drawFallbackEmblem(ctx, cx, cy, r) {
    ctx.save();
    ctx.strokeStyle = "#1E5AA8";
    ctx.lineWidth = Math.max(2, r * 0.1);
    Paint.diamond(ctx, cx, cy, r * 0.96, r * 0.96);
    ctx.stroke();
    ctx.lineWidth = Math.max(1.5, r * 0.07);
    Paint.diamond(ctx, cx, cy, r * 0.7, r * 0.7);
    ctx.stroke();

    ctx.fillStyle = "#14225B";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold " + Math.round(r * 0.52) + "px " + FONT_BODY;
    ctx.fillText("금일중", cx, cy + r * 0.02);
    ctx.restore();
  },
};
