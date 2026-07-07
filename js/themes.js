// 학교 행사별 테마 정의. 새 행사를 추가하려면 이 배열에 항목을 하나 추가하면 된다.
const THEMES = [
  {
    id: "sports",
    label: "체육대회",
    icon: "🏃",
    bgFrom: "#ff9a3c",
    bgTo: "#1e6fd9",
    accent: "#ff5a1f",
    emojis: ["🏃", "🏅", "⚽", "🔥", "🥇", "📣"],
    title: "SPORTS DAY",
  },
  {
    id: "science",
    label: "과학의날",
    icon: "🔬",
    bgFrom: "#3a1c71",
    bgTo: "#00c9ff",
    accent: "#00c9ff",
    emojis: ["🔬", "🧪", "🚀", "⚗️", "🧬", "✨"],
    title: "SCIENCE DAY",
  },
  {
    id: "graduation",
    label: "졸업식",
    icon: "🎓",
    bgFrom: "#0f2027",
    bgTo: "#c9a227",
    accent: "#d4af37",
    emojis: ["🎓", "🌸", "📜", "🌟", "💐", "🎉"],
    title: "GRADUATION",
  },
  {
    id: "festival",
    label: "축제",
    icon: "🎉",
    bgFrom: "#f857a6",
    bgTo: "#7d2ae8",
    accent: "#ff2fb0",
    emojis: ["🎉", "🎊", "✨", "🎈", "🎵", "🌈"],
    title: "SCHOOL FESTIVAL",
  },
];

function getTheme(id) {
  return THEMES.find((t) => t.id === id) || THEMES[0];
}
