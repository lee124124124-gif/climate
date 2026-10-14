// 사진에 들어가는 로고 이미지(금일중학교 교표, SDG 13 로고)를 불러오는 모듈.
//
// 두 로고 모두 "원본 이미지를 그대로" 사진에 넣는다. 색을 바꾸거나 동그랗게 잘라내지 않고,
// 비율만 유지한 채 정해진 자리에 들어가도록 축소해서 그린다.
//
// 이미지를 찾는 순서:
//   1) 앱에서 직접 등록한 이미지 (브라우저 localStorage에 저장 — 한 번 등록하면 계속 유지됨)
//   2) assets 폴더의 파일 (logo.png / sdg13.png 등)
//   3) 둘 다 없으면 임시로 그린 그림을 대신 사용

function createImageAsset(opts) {
  return {
    label: opts.label,
    storageKey: opts.storageKey,
    candidates: opts.candidates,
    plate: !!opts.plate, // 뒤에 흰 받침을 깔지 여부 (배경이 어두운 프레임에서도 로고가 보이게)
    fallback: opts.fallback || null,
    maxSide: opts.maxSide || 768, // 등록한 이미지를 저장할 때만 적용하는 최대 변 길이

    img: null,
    source: "none", // "custom"(앱에서 등록) | "file"(assets 폴더) | "none"

    async load() {
      const saved = this.readStored();
      if (saved) {
        try {
          this.img = await this.toImage(saved);
          this.source = "custom";
          return this.source;
        } catch (e) {
          this.clear(); // 저장된 값이 깨졌으면 지우고 파일 쪽으로 넘어간다
        }
      }

      for (const path of this.candidates) {
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
        return localStorage.getItem(this.storageKey);
      } catch (e) {
        return null; // 사생활 보호 모드 등 localStorage를 못 쓰는 환경
      }
    },

    // 사용자가 고른 이미지 파일을 로고로 등록한다.
    async setFromFile(file) {
      const dataUrl = await this.readFileAsDataUrl(file);
      const raw = await this.toImage(dataUrl);
      // 원본이 충분히 작으면 손대지 않고 그대로 저장한다.
      const needShrink = Math.max(raw.width, raw.height) > this.maxSide;
      const stored = needShrink ? this.shrink(raw) : dataUrl;
      this.img = needShrink ? await this.toImage(stored) : raw;
      this.source = "custom";
      try {
        localStorage.setItem(this.storageKey, stored);
      } catch (e) {
        // 저장 공간이 부족해도 이번 세션에서는 그대로 쓸 수 있게 둔다.
      }
      return this.img;
    },

    clear() {
      try {
        localStorage.removeItem(this.storageKey);
      } catch (e) {
        /* 무시 */
      }
      this.img = null;
      this.source = "none";
    },

    shrink(img) {
      const scale = Math.min(1, this.maxSide / Math.max(img.width, img.height));
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

    // 정사각형 자리(한 변 size)에 로고를 원본 비율 그대로 그린다.
    draw(ctx, cx, cy, size, accentColor) {
      const half = size / 2;

      if (this.plate) {
        // 배경색과 상관없이 로고가 또렷하게 보이도록 흰 받침을 깐다. (로고 자체는 건드리지 않음)
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.2)";
        ctx.shadowBlur = size * 0.16;
        ctx.shadowOffsetY = size * 0.04;
        ctx.fillStyle = "#ffffff";
        Paint.roundRect(ctx, cx - half, cy - half, size, size, size * 0.16);
        ctx.fill();
        ctx.restore();

        if (accentColor) {
          ctx.save();
          ctx.lineWidth = Math.max(1.5, size * 0.035);
          ctx.strokeStyle = accentColor;
          Paint.roundRect(ctx, cx - half + ctx.lineWidth / 2, cy - half + ctx.lineWidth / 2,
            size - ctx.lineWidth, size - ctx.lineWidth, size * 0.14);
          ctx.stroke();
          ctx.restore();
        }
      }

      const pad = this.plate ? size * 0.12 : 0;
      const box = size - pad * 2;
      if (this.img) {
        Paint.contain(ctx, this.img, cx - box / 2, cy - box / 2, box, box);
      } else if (this.fallback) {
        this.fallback(ctx, cx, cy, box);
      }
    },
  };
}

// 로고 파일이 아직 없을 때 쓰는 임시 엠블럼 (금일중학교 교표의 마름모 형태).
function drawFallbackSchoolEmblem(ctx, cx, cy, size) {
  const r = size / 2;
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
  ctx.font = "bold " + Math.round(r * 0.5) + "px " + FONT_BODY;
  ctx.fillText("금일중", cx, cy + r * 0.02);
  ctx.restore();
}

const SchoolLogo = createImageAsset({
  label: "금일중학교 로고",
  storageKey: "kumil-photobooth-logo",
  candidates: ["assets/logo.png", "assets/logo.jpg", "assets/logo.jpeg", "assets/logo.webp", "assets/logo.svg"],
  plate: true,
  fallback: drawFallbackSchoolEmblem,
});

const SdgLogo = createImageAsset({
  label: "SDG 13 로고",
  storageKey: "kumil-photobooth-sdg13",
  // 공식 로고 타일은 그 자체로 배경(진한 초록)을 가지고 있어 받침을 깔지 않는다.
  candidates: ["assets/sdg13.png", "assets/sdg13.jpg", "assets/sdg13.jpeg", "assets/sdg13.webp", "assets/sdg13.svg"],
  plate: false,
  fallback: (ctx, cx, cy, size) => Paint.sdg13Badge(ctx, cx, cy, size),
});
