// 미국 문화 × SDG 13(기후변화 대응) 컨셉의 포토 배경(프레임) 정의.
//
// 각 프레임은 아래 3개의 painter로 배경을 그린다. 좌표는 compose.js가 넘겨주는
// 레이아웃 정보(r)를 기준으로 계산하므로 1×4 / 2×2 어느 쪽이든 같은 코드로 그려진다.
//   backdrop(ctx, r) : 캔버스 전체 바탕 (사진 뒤쪽까지 포함)
//   header(ctx, r)   : 위쪽 제목 영역 (0 ~ r.headerH)
//   footer(ctx, r)   : 아래쪽 장식 영역 (r.footerY ~ r.H) — 로고/SDG 뱃지는 compose.js가 공통으로 그린다
//
// 새 배경을 추가하려면 이 배열에 항목을 하나 더 넣으면 된다.

const FRAMES = [
  // ─────────────────────────────────────────────────────────────
  // 1. 성조기 카니발 — 미국 동네 축제(카니발) + 지구를 지키는 별
  // ─────────────────────────────────────────────────────────────
  {
    id: "carnival",
    label: "성조기 카니발",
    icon: "🎪",
    en: "AMERICAN CLIMATE CARNIVAL",
    desc: "성조기 × 축제 가랜드",
    ui: { from: "#14225B", to: "#C8102E", accent: "#FFD93D" },
    preview: "linear-gradient(160deg,#14225B 0%,#14225B 38%,#C8102E 38%,#C8102E 56%,#FFF7EC 56%,#FFF7EC 74%,#2E8B57 74%)",
    title: "AMERICAN CLIMATE CARNIVAL",
    sub: "미국문화 × 기후행동 포토부스",
    tagline: "SAVE THE PLANET!",
    photoBorder: "#FFFFFF",
    ink: "#14225B",
    inkSoft: "#8A7B68",
    taglineColor: "#C8102E",
    logoRing: "#C8102E",
    pal: { navy: "#14225B", red: "#C8102E", cream: "#FFF7EC", green: "#2E8B57", gold: "#FFD93D" },

    backdrop(ctx, r) {
      const p = this.pal;
      ctx.fillStyle = p.cream;
      ctx.fillRect(0, 0, r.W, r.H);

      // 양옆 여백에 성조기 색(빨강-네이비)을 번갈아 세운 캔디 스트라이프.
      // 흰색은 바탕(크림색)에 묻혀 보이지 않으므로 네이비를 쓴다.
      const barW = Math.round(r.pad * 0.5);
      const step = 28 * r.u;
      for (let y = 0; y < r.H; y += step * 2) {
        ctx.fillStyle = p.red;
        ctx.fillRect(0, y, barW, step);
        ctx.fillRect(r.W - barW, y + step, barW, step);
        ctx.fillStyle = p.navy;
        ctx.fillRect(0, y + step, barW, step);
        ctx.fillRect(r.W - barW, y, barW, step);
      }

      // 위쪽 네이비 밴드 + 별 (성조기 캔턴)
      const bandH = r.headerH - 12 * r.u;
      ctx.fillStyle = p.navy;
      ctx.fillRect(0, 0, r.W, bandH);
      Paint.starField(ctx, 0, 0, r.W, bandH, "#ffffff", Math.round(r.W / 22), 3, 9 * r.u);

      // 밴드 아래 성조기 줄무늬
      Paint.stripes(ctx, 0, bandH, r.W, 12 * r.u, [p.red, p.cream, p.red], 3);
    },

    header(ctx, r) {
      const p = this.pal;
      const u = r.u;
      const cx = r.cx;

      // 카니발 가랜드
      Paint.bunting(ctx, 0, 10 * u, r.W, 10 * u, Math.max(7, Math.round(r.W / 90)),
        [p.red, p.cream, p.gold, p.green], 26 * u, "rgba(255,255,255,0.8)");

      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";

      // 학교 이름 (작게)
      ctx.fillStyle = p.gold;
      ctx.font = "bold " + Math.round(15 * u) + "px " + FONT_BODY;
      Paint.tracked(ctx, "★ KUMIL MIDDLE SCHOOL ★", cx, 108 * u, { spacing: 2.2 * u });

      // 메인 타이틀 — 양옆의 지구·잎 아이콘 자리를 비워두고 그 폭에 맞춘다.
      const maxW = r.W - r.pad * 2 - 132 * u;
      Paint.fitSize(ctx, this.title, maxW, (s) => "bold " + s + "px " + FONT_DISPLAY, Math.round(40 * u), 16, 1.5 * u);
      ctx.fillStyle = "#ffffff";
      Paint.tracked(ctx, this.title, cx, 152 * u, { spacing: 1.5 * u, stroke: p.red, lineWidth: 7 * u });

      // 한글 부제
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.font = "bold " + Math.round(17 * u) + "px " + FONT_BODY;
      ctx.fillText(this.sub, cx, 184 * u);
      ctx.restore();

      // 왼쪽엔 성조기, 오른쪽엔 잎사귀 — 미국과 환경을 한 쌍으로 둔다.
      Paint.usFlag(ctx, r.pad + 2 * u, 134 * u, 48 * u, 31 * u);
      Paint.leaf(ctx, r.W - r.pad - 22 * u, 150 * u, 22 * u, p.green, 0.5);
    },

    footer(ctx, r) {
      const p = this.pal;
      const u = r.u;
      // 색종이 조각
      Paint.confetti(ctx, r.pad, r.footerY + 6 * u, r.W - r.pad * 2, r.footerH - 74 * u,
        [p.red, p.navy, p.green, p.gold], Math.round(22 * u), 21);
      // 바닥 성조기 줄무늬
      Paint.stripes(ctx, 0, r.H - 18 * u, r.W, 18 * u, [p.red, p.cream, p.red, p.cream, p.red], 5);
    },
  },

  // ─────────────────────────────────────────────────────────────
  // 2. 자유의 여신 — 횃불을 든 기후행동 선언
  // ─────────────────────────────────────────────────────────────
  {
    id: "liberty",
    label: "자유의 여신",
    icon: "🗽",
    en: "CLIMATE ACTION!",
    desc: "여신상 왕관 × 횃불",
    ui: { from: "#0B4A46", to: "#2AA38C", accent: "#FFD369" },
    preview: "linear-gradient(160deg,#0B4A46,#1E8D7C 60%,#2AA38C)",
    title: "CLIMATE ACTION!",
    sub: "자유의 여신과 함께하는 기후행동",
    tagline: "I WILL ACT FOR THE PLANET",
    photoBorder: "#F2FFFB",
    ink: "#FFFFFF",
    inkSoft: "rgba(255,255,255,0.78)",
    taglineColor: "#FFD369",
    logoRing: "#FFD369",
    pal: { deep: "#0B4A46", mint: "#2AA38C", pale: "#7FC9B4", gold: "#FFD369", ink: "#06302D" },

    backdrop(ctx, r) {
      const p = this.pal;
      const g = ctx.createLinearGradient(0, 0, 0, r.H);
      g.addColorStop(0, p.deep);
      g.addColorStop(0.45, "#17776B");
      g.addColorStop(1, p.mint);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, r.W, r.H);

      // 은은한 별무리
      Paint.starField(ctx, 0, 0, r.W, r.H, "rgba(255,255,255,0.35)", Math.round(r.H / 60), 5, 7 * r.u);

      // 헤더 뒤로 비치는 커다란 왕관 워터마크
      ctx.save();
      ctx.globalAlpha = 0.1;
      Paint.libertyCrown(ctx, r.cx, r.headerH * 0.78, r.W * 0.72, "#ffffff");
      ctx.restore();

      // 바닥의 해수면 물결
      Paint.waves(ctx, 0, r.H - 52 * r.u, r.W, 52 * r.u, "rgba(255,255,255,0.14)", 9 * r.u, 150 * r.u);
      Paint.waves(ctx, 0, r.H - 32 * r.u, r.W, 32 * r.u, "rgba(6,48,45,0.45)", 7 * r.u, 110 * r.u);

      // 맨 위 성조기 리본 (빨강-흰색 줄무늬)
      Paint.stripes(ctx, 0, 0, r.W, 9 * r.u, ["#C8102E", "#FFF7EC", "#C8102E"], 3);
    },

    header(ctx, r) {
      const p = this.pal;
      const u = r.u;
      const cx = r.cx;

      // 왕관과 횃불
      Paint.libertyCrown(ctx, cx, 68 * u, 120 * u, p.pale, p.gold);
      Paint.libertyTorch(ctx, r.pad + 30 * u, 92 * u, 74 * u, { body: p.pale, flame: p.gold });
      Paint.libertyTorch(ctx, r.W - r.pad - 30 * u, 92 * u, 74 * u, { body: p.pale, flame: p.gold });

      // 성조기 (자유의 여신상과 함께 미국을 바로 알아보게)
      Paint.usFlag(ctx, r.pad + 4 * u, 18 * u, 46 * u, 30 * u);
      Paint.usFlag(ctx, r.W - r.pad - 50 * u, 18 * u, 46 * u, 30 * u);

      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";

      const maxW = r.W - r.pad * 3;
      Paint.fitSize(ctx, this.title, maxW, (s) => "bold " + s + "px " + FONT_DISPLAY, Math.round(46 * u), 18, 2 * u);
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(0,0,0,0.3)";
      ctx.shadowBlur = 12 * u;
      Paint.tracked(ctx, this.title, cx, 152 * u, { spacing: 2 * u });
      ctx.shadowBlur = 0;

      ctx.fillStyle = p.gold;
      ctx.font = "bold " + Math.round(15 * u) + "px " + FONT_BODY;
      Paint.tracked(ctx, "KUMIL MIDDLE SCHOOL · SDG 13", cx, 182 * u, { spacing: 2 * u });

      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = Math.round(15 * u) + "px " + FONT_BODY;
      ctx.fillText(this.sub, cx, 208 * u);
      ctx.restore();
    },

    footer(ctx, r) {
      const u = r.u;
      // 캐릭터가 들어갈 자리를 비워두고, 물결 위에 별만 몇 개 띄운다.
      Paint.starField(ctx, r.pad, r.footerY + 10 * u, r.W - r.pad * 2, 30 * u,
        "rgba(255,255,255,0.5)", 7, 31, 6 * u);
    },
  },

  // ─────────────────────────────────────────────────────────────
  // 3. 그린 루트 66 — 미국 도로여행 + 재생에너지
  // ─────────────────────────────────────────────────────────────
  {
    id: "route66",
    label: "그린 루트 66",
    icon: "🛣️",
    en: "GREEN ROUTE 66",
    desc: "레트로 표지판 × 풍력",
    ui: { from: "#2E2254", to: "#FF8A4C", accent: "#FFD93D" },
    preview: "linear-gradient(180deg,#FFB15C,#F2714F 45%,#8E3A80 75%,#2E2254)",
    title: "GREEN ROUTE 66",
    sub: "재생에너지로 달리는 기후행동 로드트립",
    tagline: "DRIVE CLEAN · RIDE GREEN",
    photoBorder: "#FFF4E3",
    ink: "#FFFFFF",
    inkSoft: "rgba(255,255,255,0.76)",
    taglineColor: "#FFD93D",
    logoRing: "#FFD93D",
    pal: { sky1: "#FFC46B", sky2: "#F2714F", sky3: "#8E3A80", night: "#2E2254", road: "#201A3C", gold: "#FFD93D", green: "#4FC08D" },

    backdrop(ctx, r) {
      const p = this.pal;
      const g = ctx.createLinearGradient(0, 0, 0, r.H);
      g.addColorStop(0, p.sky1);
      g.addColorStop(0.22, p.sky2);
      g.addColorStop(0.62, p.sky3);
      g.addColorStop(1, p.night);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, r.W, r.H);

      // 레트로 선셋 (가로로 잘린 해)
      ctx.save();
      const sunY = r.headerH * 0.42;
      const sunR = r.W * 0.3;
      ctx.globalAlpha = 0.55;
      const sg = ctx.createLinearGradient(0, sunY - sunR, 0, sunY + sunR);
      sg.addColorStop(0, "#FFE9A8");
      sg.addColorStop(1, "#FF6B4A");
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.arc(r.cx, sunY, sunR, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      // 해를 가로지르는 슬릿
      ctx.fillStyle = p.sky2;
      for (let i = 0; i < 7; i++) {
        const sh = (4 + i * 1.6) * r.u;
        ctx.fillRect(r.cx - sunR, sunY + sunR * 0.2 + i * 11 * r.u, sunR * 2, sh);
      }
      ctx.restore();

      // 바닥 도로
      const roadH = 86 * r.u;
      ctx.fillStyle = p.road;
      ctx.fillRect(0, r.H - roadH, r.W, roadH);
      ctx.strokeStyle = p.gold;
      ctx.lineWidth = 5 * r.u;
      ctx.setLineDash([26 * r.u, 20 * r.u]);
      ctx.beginPath();
      ctx.moveTo(0, r.H - roadH * 0.42);
      ctx.lineTo(r.W, r.H - roadH * 0.42);
      ctx.stroke();
      ctx.setLineDash([]);
    },

    header(ctx, r) {
      const p = this.pal;
      const u = r.u;
      const cx = r.cx;

      // 루트 66 표지판
      Paint.highwayShield(ctx, cx, 62 * u, 92 * u, 92 * u, "#ffffff", "#2b2b2b");
      ctx.save();
      ctx.textAlign = "center";
      ctx.fillStyle = "#1b1b1b";
      ctx.font = "bold " + Math.round(14 * u) + "px " + FONT_BODY;
      ctx.fillText("CLIMATE", cx, 44 * u);
      ctx.font = "bold " + Math.round(34 * u) + "px " + FONT_DISPLAY;
      ctx.fillText("66", cx, 84 * u);
      ctx.restore();

      // 양쪽 풍력 발전기
      Paint.windTurbine(ctx, r.pad + 30 * u, 128 * u, 54 * u, "rgba(255,255,255,0.85)", 0.4);
      Paint.windTurbine(ctx, r.W - r.pad - 30 * u, 128 * u, 54 * u, "rgba(255,255,255,0.85)", -0.7);

      // 표지판 옆 성조기
      Paint.usFlag(ctx, r.pad + 2 * u, 14 * u, 44 * u, 29 * u);
      Paint.usFlag(ctx, r.W - r.pad - 46 * u, 14 * u, 44 * u, 29 * u);

      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      const maxW = r.W - r.pad * 3;
      Paint.fitSize(ctx, this.title, maxW, (s) => "bold " + s + "px " + FONT_DISPLAY, Math.round(44 * u), 18, 2 * u);
      ctx.fillStyle = "#ffffff";
      Paint.tracked(ctx, this.title, cx, 160 * u, { spacing: 2 * u, stroke: "rgba(46,34,84,0.75)", lineWidth: 7 * u });

      // 레트로 선셋 위에 올라가는 작은 글씨라 그림자를 넣어 또렷하게 보이게 한다.
      ctx.shadowColor = "rgba(46,34,84,0.75)";
      ctx.shadowBlur = 7 * u;
      ctx.fillStyle = p.gold;
      ctx.font = "bold " + Math.round(14 * u) + "px " + FONT_BODY;
      Paint.tracked(ctx, "KUMIL MIDDLE SCHOOL · SDG 13", cx, 188 * u, { spacing: 1.8 * u });

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold " + Math.round(14 * u) + "px " + FONT_BODY;
      ctx.fillText(this.sub, cx, 212 * u);
      ctx.restore();
    },

    footer(ctx, r) {
      const u = r.u;
      // 도로 위 전기차·자전거 (캐릭터 자리를 가리지 않도록 도로 쪽에만 둔다)
      Paint.emoji(ctx, "🚙", r.cx - 74 * u, r.H - 30 * u, 26 * u);
      Paint.emoji(ctx, "🚲", r.cx + 74 * u, r.H - 30 * u, 24 * u);
    },
  },

  // ─────────────────────────────────────────────────────────────
  // 4. 국립공원 — 미국 국립공원 빈티지 포스터 + 숲 지키기
  // ─────────────────────────────────────────────────────────────
  {
    id: "park",
    label: "국립공원",
    icon: "🏔️",
    en: "PROTECT OUR PLANET",
    desc: "빈티지 포스터 × 숲",
    ui: { from: "#1F4435", to: "#D96F32", accent: "#F2C14E" },
    preview: "linear-gradient(170deg,#FAF0DC 0%,#F2C14E 30%,#D96F32 55%,#1F4435 100%)",
    title: "PROTECT OUR PLANET",
    sub: "국립공원처럼 지구를 지켜요",
    tagline: "KEEP IT WILD · KEEP IT COOL",
    photoBorder: "#FAF0DC",
    ink: "#1F4435",
    inkSoft: "#8A7A5E",
    taglineColor: "#D96F32",
    logoRing: "#1F4435",
    pal: { cream: "#FAF0DC", mustard: "#F2C14E", rust: "#D96F32", forest: "#1F4435", pine: "#2F6B4F", sky: "#F6DCA8" },

    backdrop(ctx, r) {
      const p = this.pal;
      ctx.fillStyle = p.cream;
      ctx.fillRect(0, 0, r.W, r.H);

      // 빈티지 포스터 테두리 (두 줄 라인)
      ctx.save();
      ctx.strokeStyle = p.forest;
      ctx.lineWidth = 4 * r.u;
      ctx.strokeRect(10 * r.u, 10 * r.u, r.W - 20 * r.u, r.H - 20 * r.u);
      ctx.lineWidth = 1.5 * r.u;
      ctx.strokeRect(18 * r.u, 18 * r.u, r.W - 36 * r.u, r.H - 36 * r.u);
      ctx.restore();

      // 헤더 배경: 햇살 + 산 + 나무
      const hH = r.headerH;
      ctx.save();
      ctx.beginPath();
      ctx.rect(20 * r.u, 20 * r.u, r.W - 40 * r.u, hH - 26 * r.u);
      ctx.clip();
      ctx.fillStyle = p.sky;
      ctx.fillRect(0, 0, r.W, hH);
      Paint.sunRays(ctx, r.cx, hH * 0.42, r.W, "rgba(242,193,78,0.5)", 18, 0.26);
      ctx.fillStyle = p.mustard;
      ctx.beginPath();
      ctx.arc(r.cx, hH * 0.42, 46 * r.u, 0, Math.PI * 2);
      ctx.fill();
      Paint.mountains(ctx, 0, hH * 0.3, r.W, hH * 0.72, [p.forest, p.pine, "#3F7E44"]);
      ctx.restore();

      // 바닥 숲
      const baseY = r.H - 22 * r.u;
      ctx.save();
      ctx.beginPath();
      ctx.rect(20 * r.u, r.footerY, r.W - 40 * r.u, r.H - r.footerY - 20 * r.u);
      ctx.clip();
      for (let i = 0; i < Math.round(r.W / 70); i++) {
        const x = 26 * r.u + i * 66 * r.u + (i % 2 ? 8 * r.u : 0);
        Paint.pineTree(ctx, x, baseY, (i % 3 === 0 ? 58 : 44) * r.u, i % 2 ? p.pine : p.forest);
      }
      ctx.restore();
    },

    header(ctx, r) {
      const p = this.pal;
      const u = r.u;
      const cx = r.cx;

      // 제목 리본
      const ribbonH = 56 * u;
      const ribbonY = r.headerH - ribbonH - 16 * u;
      const ribbonW = r.W - r.pad * 2;
      ctx.save();
      ctx.fillStyle = p.cream;
      Paint.roundRect(ctx, r.pad, ribbonY, ribbonW, ribbonH, 8 * u);
      ctx.fill();
      ctx.strokeStyle = p.forest;
      ctx.lineWidth = 3 * u;
      Paint.roundRect(ctx, r.pad + 5 * u, ribbonY + 5 * u, ribbonW - 10 * u, ribbonH - 10 * u, 5 * u);
      ctx.stroke();

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      Paint.fitSize(ctx, this.title, ribbonW - 40 * u, (s) => "bold " + s + "px " + FONT_DISPLAY, Math.round(32 * u), 14, 2.5 * u);
      ctx.fillStyle = p.forest;
      Paint.tracked(ctx, this.title, cx, ribbonY + ribbonH / 2, { spacing: 2.5 * u });
      ctx.restore();

      // 리본 위 작은 안내
      ctx.save();
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold " + Math.round(14 * u) + "px " + FONT_BODY;
      ctx.shadowColor = "rgba(31,68,53,0.55)";
      ctx.shadowBlur = 8 * u;
      Paint.tracked(ctx, "NATIONAL PARK SERVICE OF THE PLANET", cx, 40 * u, { spacing: 1.6 * u });
      ctx.restore();

      // 빈티지 포스터 안쪽 모서리의 성조기
      Paint.usFlag(ctx, r.pad - 6 * u, 62 * u, 44 * u, 29 * u);
      Paint.usFlag(ctx, r.W - r.pad - 38 * u, 62 * u, 44 * u, 29 * u);
    },

    footer(ctx, r) {
      const u = r.u;
      const p = this.pal;
      ctx.save();
      ctx.fillStyle = p.cream;
      Paint.roundRect(ctx, r.pad * 0.7, r.footerY + 8 * u, r.W - r.pad * 1.4, r.footerH - 54 * u, 14 * u);
      ctx.fill();
      ctx.strokeStyle = "rgba(31,68,53,0.35)";
      ctx.lineWidth = 2 * u;
      Paint.roundRect(ctx, r.pad * 0.7, r.footerY + 8 * u, r.W - r.pad * 1.4, r.footerH - 54 * u, 14 * u);
      ctx.stroke();
      ctx.restore();
    },
  },
];

function getFrame(id) {
  return FRAMES.find((f) => f.id === id) || FRAMES[0];
}
