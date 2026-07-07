// 촬영된 4장의 사진을 선택한 배치(1x4 / 2x2)와 행사 테마로 합성해 최종 이미지를 만든다.

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// object-fit: cover 방식으로 이미지를 지정 영역에 그린다 (비율이 달라도 잘려서 꽉 채워짐).
function drawImageCover(ctx, img, x, y, w, h) {
  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (img.width - sw) / 2;
  const sy = (img.height - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function todayLabel() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}

function paintBackground(ctx, w, h, theme) {
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, theme.bgFrom);
  grad.addColorStop(1, theme.bgTo);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function paintEmojiRow(ctx, emojis, centerX, y, fontSize, count = 6) {
  ctx.font = `${fontSize}px "Segoe UI Emoji", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const spacing = fontSize * 1.15;
  const startX = centerX - (spacing * (count - 1)) / 2;
  for (let i = 0; i < count; i++) {
    ctx.fillText(emojis[i % emojis.length], startX + i * spacing, y);
  }
}

async function drawStrip(images, theme) {
  const W = 640;
  const outerPad = 24;
  const headerH = 150;
  const footerH = 190;
  const cardX = outerPad;
  const cardY = outerPad;
  const cardW = W - outerPad * 2;
  const gap = 14;
  const innerPad = 18;
  const photoW = cardW - innerPad * 2;
  const photoH = Math.round(photoW * 0.72);
  const photosH = photoH * 4 + gap * 3;
  const cardH = headerH + photosH + footerH;
  const H = cardH + outerPad * 2;

  const canvas = document.getElementById("result-canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  paintBackground(ctx, W, H, theme);

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.25)";
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, cardX, cardY, cardW, cardH, 22);
  ctx.fill();
  ctx.restore();

  // 헤더
  ctx.fillStyle = theme.accent;
  ctx.textAlign = "center";
  ctx.font = "bold 34px 'Segoe UI', sans-serif";
  ctx.fillText(theme.title, W / 2, cardY + 62);
  ctx.fillStyle = "#333";
  ctx.font = "20px 'Segoe UI', sans-serif";
  ctx.fillText(`${theme.icon} ${theme.label} ${theme.icon}`, W / 2, cardY + 100);

  // 사진
  let y = cardY + headerH;
  const x = cardX + innerPad;
  for (const img of images) {
    roundRect(ctx, x, y, photoW, photoH, 10);
    ctx.save();
    ctx.clip();
    drawImageCover(ctx, img, x, y, photoW, photoH);
    ctx.restore();
    ctx.strokeStyle = "rgba(0,0,0,0.08)";
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, photoW, photoH, 10);
    ctx.stroke();
    y += photoH + gap;
  }

  // 푸터
  paintEmojiRow(ctx, theme.emojis, W / 2, cardY + cardH - 110, 30, 6);
  ctx.fillStyle = "#555";
  ctx.font = "18px 'Segoe UI', sans-serif";
  ctx.fillText(todayLabel(), W / 2, cardY + cardH - 55);
  ctx.fillStyle = "#999";
  ctx.font = "14px 'Segoe UI', sans-serif";
  ctx.fillText("School Photobooth", W / 2, cardY + cardH - 28);

  return canvas.toDataURL("image/png");
}

async function drawGrid(images, theme) {
  const W = 1200;
  const outerPad = 40;
  const headerH = 170;
  const footerH = 150;
  const cardX = outerPad;
  const cardY = outerPad;
  const cardW = W - outerPad * 2;
  const gap = 20;
  const innerPad = 26;
  const photoAreaW = cardW - innerPad * 2;
  const photoW = (photoAreaW - gap) / 2;
  const photoH = photoW;
  const photosH = photoH * 2 + gap;
  const cardH = headerH + photosH + footerH;
  const H = cardH + outerPad * 2;

  const canvas = document.getElementById("result-canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  paintBackground(ctx, W, H, theme);

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.25)";
  ctx.shadowBlur = 34;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, cardX, cardY, cardW, cardH, 26);
  ctx.fill();
  ctx.restore();

  // 헤더
  ctx.fillStyle = theme.accent;
  ctx.textAlign = "center";
  ctx.font = "bold 46px 'Segoe UI', sans-serif";
  ctx.fillText(theme.title, W / 2, cardY + 80);
  ctx.fillStyle = "#333";
  ctx.font = "26px 'Segoe UI', sans-serif";
  ctx.fillText(`${theme.icon} ${theme.label} ${theme.icon}`, W / 2, cardY + 130);

  // 2x2 사진
  const positions = [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ];
  const gridX = cardX + innerPad;
  const gridY = cardY + headerH;
  images.forEach((img, i) => {
    const [col, row] = positions[i];
    const x = gridX + col * (photoW + gap);
    const y = gridY + row * (photoH + gap);
    roundRect(ctx, x, y, photoW, photoH, 14);
    ctx.save();
    ctx.clip();
    drawImageCover(ctx, img, x, y, photoW, photoH);
    ctx.restore();
    ctx.strokeStyle = "rgba(0,0,0,0.08)";
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, photoW, photoH, 14);
    ctx.stroke();
  });

  // 푸터
  paintEmojiRow(ctx, theme.emojis, W / 2, cardY + cardH - 95, 40, 7);
  ctx.fillStyle = "#555";
  ctx.font = "24px 'Segoe UI', sans-serif";
  ctx.fillText(todayLabel(), W / 2, cardY + cardH - 40);

  return canvas.toDataURL("image/png");
}

async function composeResult(shots, layoutId, themeId) {
  const theme = getTheme(themeId);
  const images = await Promise.all(shots.map(loadImage));
  if (layoutId === "grid") {
    return drawGrid(images, theme);
  }
  return drawStrip(images, theme);
}
