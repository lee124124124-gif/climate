// 사진 필터 정의. cssFilter는 라이브 프리뷰(video)와 canvas 캡처 양쪽에 동일하게 사용해
// 미리보기와 최종 결과물이 항상 일치하도록 한다.
const FILTERS = [
  {
    id: "none",
    label: "원본",
    swatch: "linear-gradient(135deg, #ddd, #fff)",
    cssFilter: "none",
    overlay: null,
  },
  {
    id: "grayscale",
    label: "흑백",
    swatch: "linear-gradient(135deg, #333, #ccc)",
    cssFilter: "grayscale(1) contrast(1.05)",
    overlay: null,
  },
  {
    id: "warm",
    label: "따뜻한 톤",
    swatch: "linear-gradient(135deg, #ff9966, #ffcc70)",
    cssFilter: "sepia(0.25) saturate(1.3) hue-rotate(-8deg) brightness(1.05)",
    overlay: "rgba(255, 150, 60, 0.10)",
  },
  {
    id: "cool",
    label: "차가운 톤",
    swatch: "linear-gradient(135deg, #4facfe, #a0e9ff)",
    cssFilter: "saturate(1.15) hue-rotate(10deg) brightness(0.98) contrast(1.05)",
    overlay: "rgba(60, 120, 255, 0.10)",
  },
];

function getFilter(id) {
  return FILTERS.find((f) => f.id === id) || FILTERS[0];
}
