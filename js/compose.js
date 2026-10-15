// 고른 사진 4장을 배치(1×4 / 2×2)와 프레임 배경으로 합성해 최종 이미지를 만든다.
//
// 배치별 수치는 모두 LAYOUTS에 모아두고, 거기서 계산한 레이아웃 정보(r)를
// frames.js의 painter에게 그대로 넘겨준다. u는 글자·장식 크기를 한 번에 조절하는 배율이다.

const LAYOUTS = {
  strip: {
    id: "strip",
    label: "1 × 4 스트립",
    hint: "인생네컷 느낌의 길쭉한 사진",
    W: 720,
    pad: 34,
    gap: 26,
    cols: 1,
    rows: 4,
    u: 1,
    border: 7,
    radius: 12,
  },
  grid: {
    id: "grid",
    label: "2 × 2 그리드",
    hint: "네모반듯하게 모아 찍은 사진",
    W: 1200,
    pad: 48,
    gap: 30,
    cols: 2,
    rows: 2,
    u: 1.15,
    border: 9,
    radius: 16,
  },
};

const PHOTO_RATIO = 0.75; // 카메라 미리보기와 같은 4:3 비율

function layoutRect(layoutId) {
  const L = LAYOUTS[layoutId] || LAYOUTS.strip;
  const u = L.u;
  const headerH = Math.round(232 * u);
  const footerH = Math.round(262 * u);
  const inner = L.W - L.pad * 2;
  const cellW = Math.round((inner - L.gap * (L.cols - 1)) / L.cols);
  const photoW = cellW - L.border * 2;
  const photoH = Math.round(photoW * PHOTO_RATIO);
  const cellH = photoH + L.border * 2;
  const photosH = cellH * L.rows + L.gap * (L.rows - 1);
  const H = headerH + photosH + footerH;

  return Object.assign({}, L, {
    headerH,
    footerH,
    cellW,
    cellH,
    photoW,
    photoH,
    photosH,
    H,
    photoY: headerH,
    footerY: headerH + photosH,
    cx: L.W / 2,
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("사진을 불러오지 못했습니다."));
    img.src = src;
  });
}

// 사진 안에는 날짜를 넣지 않지만, 저장 파일끼리 구분되도록 파일 이름에는 찍은 시각을 쓴다.
function downloadFileName() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return "kumil-photobooth-" + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + "-" + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds()) + ".png";
}

// 사진 4장을 흰 테두리와 함께 배치한다.
function drawPhotos(ctx, r, frame, images) {
  images.forEach((img, i) => {
    const col = i % r.cols;
    const row = Math.floor(i / r.cols);
    const cellX = r.pad + col * (r.cellW + r.gap);
    const cellY = r.photoY + row * (r.cellH + r.gap);

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.28)";
    ctx.shadowBlur = 16 * r.u;
    ctx.shadowOffsetY = 5 * r.u;
    ctx.fillStyle = frame.photoBorder;
    Paint.roundRect(ctx, cellX, cellY, r.cellW, r.cellH, r.radius + r.border);
    ctx.fill();
    ctx.restore();

    const px = cellX + r.border;
    const py = cellY + r.border;
    ctx.save();
    Paint.roundRect(ctx, px, py, r.photoW, r.photoH, r.radius);
    ctx.clip();
    Paint.cover(ctx, img, px, py, r.photoW, r.photoH);
    ctx.restore();
  });
}

// 사진 아래쪽에 들어가는 글귀. 행사 성격에 맞춰 이 문구만 바꾸면 네 배경에 한 번에 반영된다.
const FOOTER_CAPTION = "세계시민 팀 프로젝트 활동 포토부스";

// 사진을 고른 뒤 선택하는 캐릭터 프레임.
// place: "bottom"(사진 아래 모서리) | "top"(사진 위 모서리), pose는 paint.js의 캐릭터 동작.
const CHARACTER_SETS = [
  { id: "wave", label: "안녕! 인사", desc: "아래 모서리에서 손 흔들기", pose: "wave", place: "bottom" },
  { id: "cheer", label: "만세!", desc: "두 팔 번쩍 들고 만세", pose: "cheer", place: "bottom" },
  { id: "heart", label: "하트 뿅", desc: "머리 위로 하트를 그려요", pose: "heart", place: "bottom" },
  { id: "peek", label: "빼꼼", desc: "사진 위에서 고개만 쏙", pose: "peek", place: "top" },
  { id: "none", label: "캐릭터 없음", desc: "사진만 깔끔하게", pose: null, place: null },
];

function getCharacterSet(id) {
  return CHARACTER_SETS.find((c) => c.id === id) || CHARACTER_SETS[0];
}

// 고른 캐릭터를 사진 영역 모서리에 스티커처럼 올린다.
function drawCharacters(ctx, r, setId) {
  const set = getCharacterSet(setId);
  if (!set.pose || !set.place) return;

  const size = 100 * r.u;
  const inset = 50 * r.u;
  const leftX = r.pad + inset;
  const rightX = r.W - r.pad - inset;
  // 사진 가장자리에 반쯤 걸치게 둬서 사진을 적게 가리면서 스티커처럼 보이게 한다.
  const y = set.place === "top" ? r.photoY + 18 * r.u : r.footerY - 18 * r.u;

  Paint.eagleMascot(ctx, leftX, y, size, set.pose);
  Paint.earthMascot(ctx, rightX, y, size, set.pose);
}

// 모든 프레임에 공통으로 들어가는 아래쪽 정보판 —
// 구호 / 캐릭터 / 학교 로고 / 학교 이름 / SDG 13 로고 / 활동 문구. (날짜는 넣지 않는다)
function drawFooterPlate(ctx, r, frame) {
  const u = r.u;
  const cx = r.cx;

  // 1) 프레임별 한 줄 구호
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  Paint.fitSize(ctx, frame.tagline, r.W - r.pad * 2.4, (s) => "bold " + s + "px " + FONT_DISPLAY, Math.round(26 * u), 12, 2 * u);
  ctx.fillStyle = frame.taglineColor;
  Paint.tracked(ctx, frame.tagline, cx, r.footerY + 52 * u, { spacing: 2 * u });
  ctx.restore();

  // 2) 로고는 양쪽 끝에 큼직하게, 학교 이름은 그 사이 가운데에.
  const rowY = r.footerY + 128 * u;
  const logoW = 152 * u;
  const logoH = 112 * u;

  SchoolLogo.draw(ctx, r.pad + logoW / 2, rowY, logoW, logoH, frame.logoRing);
  SdgLogo.draw(ctx, r.W - r.pad - logoW / 2, rowY, logoW, logoH);

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const nameMaxW = r.W - (r.pad + logoW) * 2 - 24 * u;
  ctx.fillStyle = frame.ink;
  Paint.fitSize(ctx, "금일중학교", nameMaxW, (s) => s + "px " + FONT_CUTE, Math.round(30 * u), 14, 0);
  ctx.fillText("금일중학교", cx, rowY + 2 * u);
  ctx.fillStyle = frame.inkSoft;
  ctx.font = "bold " + Math.round(12 * u) + "px " + FONT_BODY;
  Paint.tracked(ctx, "KUMIL MIDDLE SCHOOL", cx, rowY + 26 * u, { spacing: 1.4 * u });
  ctx.restore();

  // 3) 활동 문구
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = frame.ink;
  Paint.fitSize(ctx, FOOTER_CAPTION, r.W - r.pad * 2.4, (s) => s + "px " + FONT_CUTE, Math.round(21 * u), 10, 0.6 * u);
  Paint.tracked(ctx, FOOTER_CAPTION, cx, r.footerY + 210 * u, { spacing: 0.6 * u });
  ctx.restore();
}

async function composeResult(shots, layoutId, frameId, characterSetId) {
  const frame = getFrame(frameId);
  const r = layoutRect(layoutId);
  const images = await Promise.all(shots.map(loadImage));

  const canvas = document.getElementById("result-canvas");
  canvas.width = r.W;
  canvas.height = r.H;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, r.W, r.H);

  frame.backdrop(ctx, r);
  frame.header(ctx, r);
  frame.footer(ctx, r);
  drawPhotos(ctx, r, frame, images);
  drawCharacters(ctx, r, characterSetId); // 사진 위에 스티커처럼 올라간다
  drawFooterPlate(ctx, r, frame);

  return canvas.toDataURL("image/png");
}

// 캐릭터 선택 화면에 쓰는 작은 미리보기. 실제 합성과 같은 그림으로 동작만 보여준다.
function drawCharacterPreview(canvas, setId) {
  const set = getCharacterSet(setId);
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  ctx.fillStyle = "#F1F4F8";
  Paint.roundRect(ctx, 0, 0, w, h, 12);
  ctx.fill();

  if (!set.pose) {
    ctx.save();
    ctx.strokeStyle = "#C3CBD6";
    ctx.lineWidth = 3;
    ctx.setLineDash([7, 6]);
    Paint.roundRect(ctx, 14, 14, w - 28, h - 28, 10);
    ctx.stroke();
    ctx.restore();
    return;
  }

  // "빼꼼"은 사진 위쪽에 걸치는 동작이라, 미리보기에서도 아래에 사진 모서리를 깔아 보여준다.
  // 머리 위로 올라가는 동작(하트 등)이 잘리지 않게 아래쪽에 여유를 두고 그린다.
  const size = h * 0.68;
  const y = set.place === "top" ? h * 0.46 : h * 0.6;
  Paint.eagleMascot(ctx, w * 0.3, y, size, set.pose);
  Paint.earthMascot(ctx, w * 0.7, y, size, set.pose);

  if (set.place === "top") {
    ctx.fillStyle = "#D7DEE7";
    Paint.roundRect(ctx, 10, h * 0.62, w - 20, h * 0.42, 8);
    ctx.fill();
  }
}

// 프레임 선택 화면에서 쓰는 작은 미리보기. 실제 합성과 같은 painter로 그려서
// 고른 배경이 결과물과 어긋나지 않게 한다. (사진 자리는 회색 박스로 대신 표시)
function drawFramePreview(canvas, frameId, layoutId) {
  const frame = getFrame(frameId);
  const r = layoutRect(layoutId || "strip");
  const scale = canvas.width / r.W;
  const ctx = canvas.getContext("2d");
  canvas.height = Math.round(r.H * scale);
  ctx.save();
  ctx.scale(scale, scale);
  frame.backdrop(ctx, r);
  frame.header(ctx, r);
  frame.footer(ctx, r);
  for (let i = 0; i < r.cols * r.rows; i++) {
    const col = i % r.cols;
    const row = Math.floor(i / r.cols);
    const cellX = r.pad + col * (r.cellW + r.gap);
    const cellY = r.photoY + row * (r.cellH + r.gap);
    ctx.fillStyle = frame.photoBorder;
    Paint.roundRect(ctx, cellX, cellY, r.cellW, r.cellH, r.radius + r.border);
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.13)";
    Paint.roundRect(ctx, cellX + r.border, cellY + r.border, r.photoW, r.photoH, r.radius);
    ctx.fill();
  }
  drawFooterPlate(ctx, r, frame);
  ctx.restore();
}
