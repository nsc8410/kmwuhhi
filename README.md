# 전국금속노동조합 현대중공업지부 간행물 아카이브 (PWA)

조합원이 스마트폰 홈 화면에 아이콘을 추가해 앱처럼 쓸 수 있는 무료 웹앱입니다.
서버 비용, 앱스토어 등록비 없이 운영할 수 있도록 만들었습니다.

## 1. 파일 구성

```
union-pwa/
├── index.html          메인 페이지
├── manifest.json        PWA 설정 (앱 이름, 아이콘, 색상)
├── service-worker.js     오프라인 캐싱
├── css/style.css
├── js/app.js
├── icons/                앱 아이콘 (192px, 512px, 애플용)
├── data/publications.json   간행물 목록 데이터
└── publications/         실제 PDF 파일을 넣는 폴더
```

## 2. 무료 배포 방법 (GitHub Pages)

1. github.com 에서 새 저장소(Repository)를 만듭니다. (예: `hhi-union-archive`)
   - Public으로 설정해야 무료 Pages 기능을 쓸 수 있습니다.
2. 이 폴더(`union-pwa`) 안의 파일을 모두 저장소에 업로드합니다.
   - 웹 브라우저에서 "Add file → Upload files"로 드래그앤드롭 가능합니다.
3. 저장소의 **Settings → Pages** 메뉴로 이동합니다.
4. **Branch**를 `main`, 폴더를 `/ (root)`로 선택하고 저장합니다.
5. 1~2분 후 `https://[깃허브아이디].github.io/hhi-union-archive/` 형태의 주소가 생성됩니다.
6. 조합원에게 이 주소를 카톡방/밴드/문자로 공유하면 됩니다.

> 깃허브 계정이 없거나 어려우시면, Netlify(netlify.com)에 폴더를 그대로 드래그앤드롭해도 몇 초 만에 같은 결과를 얻을 수 있습니다. 두 방법 모두 완전 무료입니다.

## 3. 조합원이 앱처럼 설치하는 방법

- **Android(크롬)**: 사이트 접속 → 하단 "홈 화면에 추가" 배너 → 추가
- **iPhone(사파리)**: 사이트 접속 → 공유 버튼(⬆) → "홈 화면에 추가"

설치 후에는 인터넷이 잠깐 끊겨도 이전에 열람한 간행물 목록과 화면이 캐시되어 있어 표시됩니다.

## 4. 새 간행물(소식지) 추가하는 방법

1. 발행한 PDF 파일을 `publications/` 폴더에 넣습니다. (예: `248.pdf`)
2. `data/publications.json` 파일을 열어 맨 위에 새 항목을 추가합니다:

```json
{
  "no": 248,
  "category": "소식지",
  "title": "제248호 소식지 제목",
  "date": "2026-09-20",
  "summary": "한두 줄 요약",
  "file": "publications/248.pdf"
}
```

3. GitHub Pages를 쓰는 경우, 두 파일(새 PDF + 수정한 json)을 다시 업로드(Upload files)하면
   1~2분 내로 사이트에 자동 반영됩니다. 별도 코딩이나 재배포 절차가 필요 없습니다.

## 5. 카테고리 추가하고 싶다면

지금은 "소식지"만 있지만, `publications.json`의 `"category"` 값을 "성명서/공지",
"회의록" 등으로 자유롭게 바꿔 넣으면 사이트 상단 필터 버튼이 자동으로 늘어납니다.
코드를 수정할 필요가 없습니다.

## 6. 지금 들어있는 샘플 데이터

`data/publications.json`과 `publications/` 폴더에는 실제 발행물이 아닌
**샘플(예시) 데이터**가 들어 있습니다. 운영 전에 반드시 실제 소식지로 교체해 주세요.
