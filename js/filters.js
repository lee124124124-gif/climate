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
];

function getFilter(id) {
  return FILTERS.find((f) => f.id === id) || FILTERS[0];
}
