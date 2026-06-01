# 👁️‍🗨️ VisualVerify: AI-Powered Visual & Functional QA Chrome Extension

> **[English Guide](#-english-guide) | [한국어 설명](#-한국어-설명)**

---

# 🇺🇸 English Guide

`VisualVerify` is a premium Chrome Extension (Manifest V3) that leverages the Google Gemini Vision API to comprehensively and automatically audit a webpage's visual layout match, HTML attributes (Static UI), and backend API validation and warning messages (Dynamic Behavior).

## ✨ Key Features

1. **🎨 Baseline UI & Visual QA (Design Mockup Comparison)**
   - Compares the active webpage screenshot side-by-side (1:1) with a **design mockup image** uploaded from Figma or other sources.
   - Automatically detects discrepancies in layout alignment, typography, spacing, colors, image positioning, and provides detailed suggestions with `PASS` / `FAIL` statuses.

2. **📝 Static HTML Audit (Specification Verification)**
   - Matches a user-defined text specification or design goals against actual web page DOM attributes.
   - Catches static coding slip-ups like incorrect placeholder text, missing `maxlength` attributes, and default button states.

3. **⚡ Interactive Validation Tests (Direct Simulation Console)**
   - The AI intelligently scans the specifications and page DOM to **dynamically design executable test cases** (e.g. testing validation limits, empty fields).
   - Clicking `[Run Test]` instructs the extension to directly populate fields and submit form actions in real-time, capturing the resulting state.

4. **📡 Outbound API & Network Request Interceptor**
   - Injects a script directly into the page's main context (`MAIN` world) at `document_start` to hook `window.fetch` and `XMLHttpRequest`.
   - Tracks response status codes (e.g. `400 Bad Request`), request payload schemas, and response JSON objects, matching them against UI visual warnings.

5. **📋 Copy Issues (Export Markdown)**
   - Exports all baseline UI failures and interactive test logs into a clean, formatted Markdown report with a single click. Ideal for pasting into Jira tickets, GitHub Issues, or Slack.

6. **🌐 Localization Support**
   - Supports manual and automatic detection for Korean (`ko`) and English (`en`). When set to Auto, it dynamically translates the AI reports and execution logs based on the page context and specifications language.

## 🛠️ Installation Guide

This extension can be loaded locally using developer mode:

1. **Clone or Download the Repository**
   - Download this codebase folder onto your machine.
2. **Open Extensions Page**
   - Navigate to `chrome://extensions/` in your Chrome browser.
3. **Enable Developer Mode**
   - Toggle the **[Developer mode]** switch in the top-right corner.
4. **Load Unpacked Extension**
   - Click the **[Load unpacked]** button in the top-left corner.
   - Choose the root project folder (`VisualVerify`) to load it.
5. **Pin the Extension**
   - Click the puzzle piece icon on your Chrome toolbar and pin `VisualVerify`.

## 🚀 How to Use

1. Click the **VisualVerify** toolbar icon to open the side panel.
2. Open the **⚙️ Configuration & Key** panel, input your `Google Gemini API Key`, and click Save.
   - (Select from Gemini 2.5 Flash, 2.5 Pro, or 3.5 Flash models.)
3. Navigate to the webpage you wish to audit.
   - You can open the provided sandbox page (`scratch/test_page.html`) for a local demo.
4. Drag and drop a **Design Mockup Image** and input your **Verification Specifications** in the text area.
5. Click **[Audit Active Page]**.
6. Inspect the Baseline Results, and run dynamic tests in the **Interactive Validation Tests** console below by clicking **[Run Test]**.

## 🔒 Security & Privacy
* Your **Gemini API Key** and specifications inputs are securely saved inside your browser's local sandbox (`chrome.storage.local`). They are never uploaded to any external servers, communicating directly with Google's official API endpoints.

---

# 🇰🇷 한국어 설명

`VisualVerify`는 Google Gemini Vision API를 활용하여 웹페이지의 시각적 디자인 매칭 상태, HTML 속성(Static UI), 그리고 백엔드 API 유효성 및 경고문 노출(Dynamic Behavior)을 종합적으로 자동 검사하는 프리미엄 크롬 확장 프로그램(Manifest V3)입니다.

## ✨ 주요 기능

1. **🎨 Baseline UI & Visual QA (디자인 비교 검증)**
   - 개발 중인 활성 페이지 스크린샷과 피그마 등에서 다운로드한 **디자인 목업(Mockup) 이미지**를 1대1로 시각적 비교합니다.
   - 레이아웃 정렬, 폰트, 자간, 색상, 이미지 위치 등의 정밀 차이점을 찾아 개발자 가이드라인 제안서와 함께 `PASS` / `FAIL` 판정을 내립니다.

2. **📝 Static HTML Audit (HTML 사양 명세 검증)**
   - 사용자가 정의한 텍스트 명세서(Specification) 또는 업로드된 디자인 정보와 실제 웹페이지 DOM 객체를 비교 분석합니다.
   - 플레이스홀더 텍스트 불일치, `maxlength` 누락, 버튼 기본 활성화 상태 등의 static 마킹 실수를 확실하게 검출합니다.

3. **⚡ Interactive Validation Tests (플러그인 직접 실행 검증)**
   - 스펙과 페이지 내의 폼 구조를 AI가 지능적으로 분석하여 **수행 가능한 시뮬레이션 시나리오를 동적으로 설계**합니다.
   - [▶ 테스트 실행]을 클릭하면, 확장 프로그램이 페이지 상에 값을 주입하고 클릭 이벤트를 직접 실행하며, 그 결과를 실시간 캡처합니다.

4. **📡 Outbound API & Network Request Interceptor**
   - 웹페이지 메인 컨텍스트(`MAIN` world)에 직접 스크립트를 주입하여 `window.fetch` 및 `XMLHttpRequest`를 실시간 가로챕니다.
   - 시뮬레이션 동작 중 호출된 API의 상태 코드(예: `400 Bad Request`), 페이로드, 응답 값을 추적하여 화면의 에러 노출 유효성 검사 결과와 연동해 최종 판정을 내립니다.

5. **📋 Copy Issues (Markdown 내보내기)**
   - 발견된 Baseline 디자인 결함 목록 및 백엔드 시뮬레이션 결과를 원클릭으로 클립보드에 마크다운 복사할 수 있어 Jira, GitHub, Slack 등으로 즉시 공유하기 편리합니다.

6. **🌐 다국어 설정 지원 (Localization)**
   - 한국어(Korean) 및 영어(English) 옵션을 제공하며, Auto 모드 적용 시 작성된 스펙과 웹페이지 언어에 맞춰 AI 리포트와 시뮬레이션 로그가 동적으로 다국어 출력됩니다.

## 🛠️ 설치 방법 (로컬 설치 가이드)

본 확장 프로그램은 로컬 압축 해제 방식으로 손쉽게 로드하여 개발자 모드에서 사용할 수 있습니다.

1. **저장소 클론 또는 다운로드**
   - 본 코드가 포함된 폴더 전체를 컴퓨터에 내려받습니다.
2. **크롬 확장 프로그램 관리자 열기**
   - 크롬 브라우저 주소창에 `chrome://extensions/`를 입력하여 이동합니다.
3. **개발자 모드 활성화**
   - 우측 상단의 **[개발자 모드]** 토글 스위치를 활성화합니다.
4. **압축해제된 확장 프로그램 로드**
   - 좌측 상단의 **[압축해제된 확장 프로그램 로드]** 버튼을 클릭합니다.
   - 본 프로젝트의 루트 폴더(`VisualVerify`)를 선택하여 추가합니다.
5. **확장 프로그램 고정**
   - 크롬 툴바의 퍼즐 아이콘을 눌러 `VisualVerify`를 고정(Pin)하면 편리하게 사용 가능합니다.

## 🚀 사용 방법

1. 크롬 툴바에서 **VisualVerify** 아이콘을 클릭하여 사이드패널을 엽니다.
2. **⚙️ Configuration & Key** 패널을 열어 보유하고 계신 `Google Gemini API Key`를 입력하고 저장합니다.
   - (Gemini 2.5 Flash / 2.5 Pro / 3.5 Flash 등 최신 Vision 모델 목록을 선택할 수 있습니다.)
3. 검사하고 싶은 활성 웹페이지로 이동합니다.
   - 로컬 테스트를 위해 프로젝트 내에 포함된 `scratch/test_page.html` 파일을 열어서 시도해 볼 수 있습니다.
4. 사이드패널에 **디자인 목업 이미지**를 드래그 앤 드롭하고, **검증 스펙 텍스트**를 자유롭게 입력합니다.
5. **[Audit Active Page]**를 클릭합니다.
6. Baseline 검사 결과를 확인하고, 아래에 나타난 **Interactive Validation Tests** 목록에서 원하는 케이스의 **[테스트 실행]**을 클릭하여 실시간 동적 유효성 및 네트워크 검증을 진행합니다.

## 🔒 보안 정보
* 사용자의 **Gemini API Key** 및 입력 스펙 내역은 크롬 브라우저 내부의 안전한 로컬 저장소(`chrome.storage.local`)에만 저장되며, 어떠한 외부 서버로도 전송되지 않고 로컬 환경에서 구글 공식 API 엔드포인트와만 통신하므로 안전합니다.

---

## 📂 Project Structure

```text
VisualVerify/
├── manifest.json         # Extension metadata & permission settings (MV3)
├── README.md             # Project documentation (English/Korean)
├── scripts/
│   ├── background.js     # Background worker handling side panel activation
│   ├── content.js        # DOM scraper and simulation execution engine (ISOLATED)
│   └── interceptor.js    # MAIN world script patching fetch & XHR requests
├── sidepanel/
│   ├── sidepanel.html    # Glassmorphic dark panel dashboard UI
│   ├── sidepanel.css     # CSS style tokens and interactive UI styling
│   └── sidepanel.js      # Capture engine, Gemini API controller, and UI renderer
└── scratch/
    ├── test_page.html    # Sandbox page containing mock backend and error binding
    └── test_headless.js  # Headless Playwright script for codebase integrity testing
```
