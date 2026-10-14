// 캔버스 드로잉 도구 모음.
// frames.js(프레임별 배경 그리기)와 compose.js(최종 합성)가 함께 사용한다.

const FONT_DISPLAY = '"Arial Black", "Haettenschweiler", Impact, "Malgun Gothic", sans-serif';
const FONT_BODY = '"Segoe UI", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
const FONT_EMOJI = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';

const Paint = {
  // ───────── 기본 도형 ─────────
  roundRect(ctx, x, y, w, h, r) {
    const rr = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  },

  star(ctx, cx, cy, outerR, opts) {
    const o = opts || {};
    const points = o.points || 5;
    const innerRatio = o.innerRatio || 0.42;
    const rotation = o.rotation === undefined ? -Math.PI / 2 : o.rotation;
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const rad = i % 2 === 0 ? outerR : outerR * innerRatio;
      const ang = rotation + (i * Math.PI) / points;
      const x = cx + Math.cos(ang) * rad;
      const y = cy + Math.sin(ang) * rad;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  },

  diamond(ctx, cx, cy, rx, ry) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - ry);
    ctx.lineTo(cx + rx, cy);
    ctx.lineTo(cx, cy + ry);
    ctx.lineTo(cx - rx, cy);
    ctx.closePath();
  },

  // 같은 프레임이 항상 같은 모양으로 그려지도록 하는 결정적 난수.
  rng(seed) {
    let s = (seed || 1) >>> 0;
    return () => {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
  },

  // ───────── 텍스트 ─────────
  // 자간을 직접 벌려 포스터 느낌으로 그린다 (canvas letterSpacing 미지원 브라우저 대응).
  tracked(ctx, text, cx, y, opts) {
    const o = opts || {};
    const spacing = o.spacing || 0;
    const align = o.align || "center";
    const chars = Array.from(text);
    const widths = chars.map((c) => ctx.measureText(c).width);
    const total = widths.reduce((a, b) => a + b, 0) + spacing * Math.max(0, chars.length - 1);
    let x = align === "center" ? cx - total / 2 : align === "right" ? cx - total : cx;
    const prevAlign = ctx.textAlign;
    ctx.textAlign = "left";
    chars.forEach((c, i) => {
      if (o.stroke) {
        ctx.save();
        ctx.lineWidth = o.lineWidth || 6;
        ctx.strokeStyle = o.stroke;
        ctx.lineJoin = "round";
        ctx.strokeText(c, x, y);
        ctx.restore();
      }
      ctx.fillText(c, x, y);
      x += widths[i] + spacing;
    });
    ctx.textAlign = prevAlign;
    return total;
  },

  // 글자가 maxWidth를 넘지 않을 때까지 폰트 크기를 줄여 적정 크기를 찾고, ctx.font까지 적용한다.
  fitSize(ctx, text, maxWidth, makeFont, startSize, minSize, spacing) {
    let size = startSize;
    const gap = spacing || 0;
    const extra = gap * Math.max(0, Array.from(text).length - 1);
    while (size > minSize) {
      ctx.font = makeFont(size);
      if (ctx.measureText(text).width + extra <= maxWidth) break;
      size -= 1;
    }
    ctx.font = makeFont(size);
    return size;
  },

  emoji(ctx, char, cx, cy, size) {
    ctx.save();
    ctx.font = size + "px " + FONT_EMOJI;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(char, cx, cy);
    ctx.restore();
  },

  // ───────── 이미지 ─────────
  // 영역을 꽉 채우고 넘치는 부분은 잘라낸다 (object-fit: cover).
  cover(ctx, img, x, y, w, h) {
    const scale = Math.max(w / img.width, h / img.height);
    const sw = w / scale;
    const sh = h / scale;
    ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
  },

  // 비율을 유지한 채 영역 안에 모두 들어오게 그린다 (object-fit: contain).
  contain(ctx, img, x, y, w, h) {
    const scale = Math.min(w / img.width, h / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  },

  // ───────── 장식: 미국 모티브 ─────────
  // 성조기 가로 줄무늬.
  stripes(ctx, x, y, w, h, colors, count) {
    const bandH = h / count;
    for (let i = 0; i < count; i++) {
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(x, y + i * bandH, w, bandH + 0.5);
    }
  },

  // 별이 흩뿌려진 영역 (성조기 캔턴 느낌).
  starField(ctx, x, y, w, h, color, count, seed, maxR) {
    const rand = this.rng(seed || 7);
    ctx.save();
    ctx.fillStyle = color;
    for (let i = 0; i < count; i++) {
      const sx = x + rand() * w;
      const sy = y + rand() * h;
      const r = (maxR || 10) * (0.5 + rand() * 0.5);
      ctx.globalAlpha = 0.55 + rand() * 0.45;
      this.star(ctx, sx, sy, r);
      ctx.fill();
    }
    ctx.restore();
  },

  // 카니발 가랜드(삼각 깃발). 줄이 살짝 처지게 그린다.
  bunting(ctx, x1, y1, x2, y2, count, colors, size, lineColor) {
    const sag = size * 0.9;
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2 + sag;
    const qp = (p0, p1, p2, t) => (1 - t) * (1 - t) * p0 + 2 * (1 - t) * t * p1 + t * t * p2;

    ctx.save();
    ctx.strokeStyle = lineColor || "rgba(255,255,255,0.75)";
    ctx.lineWidth = Math.max(2, size * 0.1);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(mx, my, x2, y2);
    ctx.stroke();

    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count;
      const px = qp(x1, mx, x2, t);
      const py = qp(y1, my, y2, t);
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.moveTo(px - size * 0.42, py);
      ctx.lineTo(px + size * 0.42, py);
      ctx.lineTo(px, py + size * 1.25);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  },

  // 자유의 여신상 왕관 (7개의 빛살).
  libertyCrown(ctx, cx, cy, w, color, spikeColor) {
    const r = w / 2;
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 0.52, r * 0.3, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(cx - r * 0.52, cy, r * 1.04, r * 0.18);
    ctx.fillStyle = spikeColor || color;
    for (let i = 0; i < 7; i++) {
      const ang = Math.PI + ((i + 0.5) * Math.PI) / 7;
      const bx = cx + Math.cos(ang) * r * 0.5;
      const by = cy + Math.sin(ang) * r * 0.28;
      const tipLen = r * (0.56 + 0.08 * (3 - Math.abs(3 - i)));
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(ang + Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(-r * 0.075, 0);
      ctx.lineTo(0, -tipLen);
      ctx.lineTo(r * 0.075, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  },

  // 자유의 여신상 횃불.
  libertyTorch(ctx, cx, cy, h, opts) {
    const o = opts || {};
    const bodyColor = o.body || "#7FC9B4";
    const flameColor = o.flame || "#FFD369";
    ctx.save();
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.moveTo(cx - h * 0.055, cy);
    ctx.lineTo(cx + h * 0.055, cy);
    ctx.lineTo(cx + h * 0.085, cy + h * 0.55);
    ctx.lineTo(cx - h * 0.085, cy + h * 0.55);
    ctx.closePath();
    ctx.fill();
    this.roundRect(ctx, cx - h * 0.17, cy - h * 0.12, h * 0.34, h * 0.13, h * 0.04);
    ctx.fill();
    ctx.fillStyle = flameColor;
    ctx.beginPath();
    ctx.moveTo(cx, cy - h * 0.64);
    ctx.quadraticCurveTo(cx + h * 0.2, cy - h * 0.34, cx + h * 0.1, cy - h * 0.14);
    ctx.quadraticCurveTo(cx, cy - h * 0.04, cx - h * 0.1, cy - h * 0.14);
    ctx.quadraticCurveTo(cx - h * 0.2, cy - h * 0.34, cx, cy - h * 0.64);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  },

  // 미국 고속도로 표지판 모양 (루트 66).
  highwayShield(ctx, cx, cy, w, h, fill, stroke) {
    const x = cx - w / 2;
    const y = cy - h / 2;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, y);
    ctx.bezierCurveTo(x + w * 0.1, y, x, y + h * 0.1, x, y + h * 0.34);
    ctx.bezierCurveTo(x, y + h * 0.62, x + w * 0.22, y + h * 0.8, cx, y + h);
    ctx.bezierCurveTo(x + w * 0.78, y + h * 0.8, x + w, y + h * 0.62, x + w, y + h * 0.34);
    ctx.bezierCurveTo(x + w, y + h * 0.1, x + w * 0.9, y, cx, y);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.lineWidth = Math.max(3, w * 0.05);
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }
    ctx.restore();
  },

  // ───────── 장식: 기후·환경 모티브 ─────────
  earth(ctx, cx, cy, r, opts) {
    const o = opts || {};
    const sea = o.sea || "#2E7BD6";
    const land = o.land || "#4CAF6E";
    ctx.save();
    ctx.fillStyle = sea;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = land;
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.35, cy - r * 0.3, r * 0.42, r * 0.3, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.1, cy + r * 0.45, r * 0.22, r * 0.38, 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + r * 0.5, cy + r * 0.05, r * 0.3, r * 0.42, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (o.ring) {
      ctx.lineWidth = Math.max(2, r * 0.1);
      ctx.strokeStyle = o.ring;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  },

  leaf(ctx, cx, cy, size, color, rotation) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation || 0);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.quadraticCurveTo(size * 0.75, -size * 0.3, 0, size);
    ctx.quadraticCurveTo(-size * 0.75, -size * 0.3, 0, -size);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  },

  // 풍력 발전기 (재생에너지).
  windTurbine(ctx, cx, baseY, h, color, rotation) {
    ctx.save();
    ctx.fillStyle = color;
    const topY = baseY - h;
    ctx.beginPath();
    ctx.moveTo(cx - h * 0.035, baseY);
    ctx.lineTo(cx + h * 0.035, baseY);
    ctx.lineTo(cx + h * 0.014, topY);
    ctx.lineTo(cx - h * 0.014, topY);
    ctx.closePath();
    ctx.fill();
    ctx.translate(cx, topY);
    ctx.rotate(rotation || 0);
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI * 2) / 3);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(h * 0.1, -h * 0.2, 0, -h * 0.42);
      ctx.quadraticCurveTo(-h * 0.05, -h * 0.2, 0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(0, 0, h * 0.03, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  pineTree(ctx, cx, baseY, h, color, trunkColor) {
    ctx.save();
    ctx.fillStyle = trunkColor || "#6B4A2B";
    ctx.fillRect(cx - h * 0.035, baseY - h * 0.16, h * 0.07, h * 0.16);
    ctx.fillStyle = color;
    for (let i = 0; i < 3; i++) {
      const layerW = h * (0.44 - i * 0.1);
      const layerY = baseY - h * (0.14 + i * 0.26);
      ctx.beginPath();
      ctx.moveTo(cx, layerY - h * 0.34);
      ctx.lineTo(cx + layerW, layerY);
      ctx.lineTo(cx - layerW, layerY);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  },

  mountains(ctx, x, y, w, h, colors) {
    ctx.save();
    const peaks = [
      { cx: x + w * 0.26, s: 1.0 },
      { cx: x + w * 0.58, s: 0.78 },
      { cx: x + w * 0.82, s: 0.62 },
    ];
    peaks.forEach((p, i) => {
      ctx.fillStyle = colors[i % colors.length];
      const ph = h * p.s;
      const pw = w * 0.42 * p.s;
      ctx.beginPath();
      ctx.moveTo(p.cx - pw, y + h);
      ctx.lineTo(p.cx, y + h - ph);
      ctx.lineTo(p.cx + pw, y + h);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.beginPath();
      ctx.moveTo(p.cx - pw * 0.26, y + h - ph * 0.72);
      ctx.lineTo(p.cx, y + h - ph);
      ctx.lineTo(p.cx + pw * 0.26, y + h - ph * 0.72);
      ctx.lineTo(p.cx + pw * 0.1, y + h - ph * 0.78);
      ctx.lineTo(p.cx - pw * 0.04, y + h - ph * 0.7);
      ctx.closePath();
      ctx.fill();
    });
    ctx.restore();
  },

  // 레트로 포스터의 햇살 광선.
  sunRays(ctx, cx, cy, r, color, count, seedAngle) {
    ctx.save();
    ctx.fillStyle = color;
    for (let i = 0; i < count; i++) {
      const a0 = (seedAngle || 0) + (i * Math.PI * 2) / count;
      const a1 = a0 + Math.PI / count;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, a0, a1);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  },

  // 해수면 상승을 떠올리게 하는 물결 띠.
  waves(ctx, x, y, w, h, color, amplitude, wavelength) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y + amplitude);
    for (let px = 0; px <= w; px += 4) {
      ctx.lineTo(x + px, y + amplitude + Math.sin((px / wavelength) * Math.PI * 2) * amplitude);
    }
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  },

  confetti(ctx, x, y, w, h, colors, count, seed) {
    const rand = this.rng(seed || 11);
    ctx.save();
    for (let i = 0; i < count; i++) {
      const px = x + rand() * w;
      const py = y + rand() * h;
      const s = 5 + rand() * 9;
      ctx.fillStyle = colors[Math.floor(rand() * colors.length)];
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(rand() * Math.PI);
      ctx.globalAlpha = 0.75 + rand() * 0.25;
      if (rand() > 0.45) {
        ctx.fillRect(-s / 2, -s / 4, s, s / 2);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, s / 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
  },

  // ───────── SDG 13 뱃지 ─────────
  // UN 지속가능발전목표 13번(기후변화 대응) 타일을 단순화해 그린다. 공식 색은 #3F7E44.
  sdg13Badge(ctx, cx, cy, size) {
    const x = cx - size / 2;
    const y = cy - size / 2;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.25)";
    ctx.shadowBlur = size * 0.12;
    ctx.shadowOffsetY = size * 0.04;
    ctx.fillStyle = "#3F7E44";
    this.roundRect(ctx, x, y, size, size, size * 0.14);
    ctx.fill();
    ctx.restore();

    ctx.save();
    // 기후를 상징하는 소용돌이 문양
    ctx.strokeStyle = "rgba(255,255,255,0.92)";
    ctx.lineWidth = size * 0.05;
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let i = 0; i < 48; i++) {
      const t = i / 47;
      const ang = t * Math.PI * 2.6;
      const rad = size * 0.05 + t * size * 0.17;
      const px = cx + Math.cos(ang) * rad;
      const py = cy + size * 0.17 + Math.sin(ang) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.font = "bold " + Math.round(size * 0.3) + "px " + FONT_DISPLAY;
    ctx.fillText("13", cx, y + size * 0.33);
    ctx.font = "bold " + Math.round(size * 0.095) + "px " + FONT_BODY;
    this.tracked(ctx, "CLIMATE ACTION", cx, y + size * 0.45, { spacing: size * 0.006 });
    ctx.restore();
  },
};
