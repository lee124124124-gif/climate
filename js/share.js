// 결과 화면의 "공유하기" 버튼 로직. 브라우저 내장 Web Share API를 사용해
// 기기의 공유 시트(카카오톡, 메시지, 메일 등 설치된 앱 목록)로 사진 파일을 바로 전달한다.
// 별도 API 키나 계정, 서버가 필요 없지만 지원하지 않는 브라우저(주로 구형 데스크톱)에서는 버튼이 비활성화된다.
const ShareUI = {
  els: null,
  getImageDataUrl: null,
  supported: false,

  init(getImageDataUrl) {
    this.getImageDataUrl = getImageDataUrl;
    this.els = {
      btnShare: document.getElementById("btn-share"),
      status: document.getElementById("share-status"),
    };

    this.supported = !!(navigator.share && navigator.canShare);
    if (!this.supported) {
      this.setStatus("이 브라우저에서는 공유하기를 지원하지 않아요. 기기에 저장을 이용해주세요.", "error");
      this.els.btnShare.disabled = true;
      return;
    }

    this.els.btnShare.addEventListener("click", () => this.share());
  },

  reset() {
    this.setStatus("", "");
    if (this.els && this.supported) {
      this.els.btnShare.disabled = false;
    }
  },

  setStatus(text, kind) {
    this.els.status.textContent = text;
    this.els.status.className = "share-status" + (kind ? " " + kind : "");
  },

  async share() {
    const dataUrl = this.getImageDataUrl();
    if (!dataUrl) {
      this.setStatus("공유할 사진이 없어요.", "error");
      return;
    }

    this.els.btnShare.disabled = true;
    this.setStatus("", "");

    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], downloadFileName(), { type: blob.type || "image/png" });

      if (!navigator.canShare({ files: [file] })) {
        this.setStatus("이 기기에서는 사진 공유를 지원하지 않아요. 기기에 저장을 이용해주세요.", "error");
        return;
      }

      await navigator.share({
        files: [file],
        title: "아메리칸 기후 카니발 포토부스",
        text: "금일중학교 세계시민 팀 프로젝트 활동 포토부스에서 찍었어요 📸🌍 #SDG13 #ClimateAction",
      });
      this.setStatus("공유했어요!", "success");
    } catch (err) {
      if (err.name !== "AbortError") {
        this.setStatus("공유 중 문제가 생겼어요.", "error");
      }
    } finally {
      this.els.btnShare.disabled = false;
    }
  },
};
