// sidepanel.js - Handles UI interaction, storage, drag-and-drop file upload, screenshot capture, and Gemini API calls

document.addEventListener("DOMContentLoaded", () => {
  // UI Elements
  const settingsBtn = document.getElementById("settings-btn");
  const settingsPanel = document.getElementById("settings-panel");
  const apiKeyInput = document.getElementById("api-key-input");
  const saveKeyBtn = document.getElementById("save-key-btn");
  const modelSelect = document.getElementById("model-select");
  const languageSelect = document.getElementById("language-select");

  const providerSelect = document.getElementById("provider-select");
  const endpointGroup = document.getElementById("endpoint-group");
  const endpointInput = document.getElementById("endpoint-input");
  const apiKeyGroup = document.getElementById("api-key-group");
  const apiKeyLabel = document.getElementById("api-key-label");
  const toggleKeyVisibilityBtn = document.getElementById("toggle-key-visibility-btn");
  const modelSelectGroup = document.getElementById("model-select-group");
  const modelTextGroup = document.getElementById("model-text-group");
  const modelInputText = document.getElementById("model-input-text");

  const dropzone = document.getElementById("dropzone");
  const mockupFileInput = document.getElementById("mockup-file-input");
  const dropzoneText = document.getElementById("dropzone-text");
  const mockupPreviewContainer = document.getElementById("mockup-preview-container");
  const mockupPreview = document.getElementById("mockup-preview");
  const btnRemoveMockup = document.getElementById("btn-remove-mockup");

  const specInput = document.getElementById("spec-input");
  const verifyBtn = document.getElementById("verify-btn");
  const verifySpinner = document.getElementById("verify-spinner");
  const statusBox = document.getElementById("status-box");
  const statusText = document.getElementById("status-text");

  const reportPanel = document.getElementById("report-panel");
  const reportScore = document.getElementById("report-score");
  const togglePreviewBtn = document.getElementById("toggle-preview-btn");
  const previewContainer = document.getElementById("preview-container");
  const screenshotPreview = document.getElementById("screenshot-preview");
  const resultsContainer = document.getElementById("results-container");
  const simulationsSection = document.getElementById("simulations-section");
  const simulationsContainer = document.getElementById("simulations-container");
  const runAllSimsBtn = document.getElementById("run-all-sims-btn");
  const exportIssuesBtn = document.getElementById("export-issues-btn");
  const downloadReportBtn = document.getElementById("download-report-btn");

  // State
  let currentScreenshotUrl = "";
  let uploadedMockupBase64 = "";
  let uploadedMockupMimeType = "";
  let currentSimulationTests = [];
  let currentBaselineResults = [];
  let resolvedLanguage = "en";

  // Tab-specific state persistence
  const tabStates = {}; // Keyed by tabId: { specs, mockupBase64, mockupMimeType, mockupSrc, results, simulations, screenshotUrl, url, reportVisible, simulationsVisible }
  let currentTabId = null;

  const TRANSLATIONS = {
    ko: {
      verificationLogs: "검증 로그",
      initializing: "시뮬레이션 동작 초기화 중...",
      sendingSteps: "페이지로 입력 동작 전송 중...",
      actionsComplete: "동작 완료. 화면 캡처 중...",
      apiCallDetected: "✅ API 호출 감지됨:",
      apiStatusMatches: "✅ API 응답 상태 코드가 일치합니다:",
      apiStatusMismatch: "❌ API 응답 상태 코드 불일치! 예상: {expected}, 실제: {actual}",
      apiCallMissing: "❌ 다음 경로를 포함하는 API 호출이 감지되지 않았습니다: \"{path}\"",
      warningTextFound: "✅ 화면에 예상 경고 메시지가 표시됨: \"{text}\"",
      warningTextMissing: "❌ 화면에 예상 경고 메시지가 표시되지 않음: \"{text}\"",
      payload: "전송 데이터",
      response: "응답 데이터",
      runTest: "테스트 실행",
      pending: "대기 중",
      running: "실행 중",
      pass: "통과",
      fail: "실패",
      error: "오류",
      runAllTests: "전체 테스트 실행",
      interactiveTitle: "⚡ Interactive Validation Tests (플러그인 직접 실행 검증)"
    },
    en: {
      verificationLogs: "Verification Logs",
      initializing: "Initializing simulated actions...",
      sendingSteps: "Executing input actions directly on page...",
      actionsComplete: "Actions complete. Capturing active window layout...",
      apiCallDetected: "✅ API Call detected:",
      apiStatusMatches: "✅ API Response status code matches:",
      apiStatusMismatch: "❌ API Response status mismatch! Expected {expected}, got {actual}",
      apiCallMissing: "❌ Expected API call containing \"{path}\" was NOT detected.",
      warningTextFound: "✅ Expected warning text visible in layout: \"{text}\"",
      warningTextMissing: "❌ Expected warning text NOT visible in layout: \"{text}\"",
      payload: "Payload",
      response: "Response",
      runTest: "Run Test",
      pending: "Pending",
      running: "Running",
      pass: "Pass",
      fail: "Fail",
      error: "Error",
      runAllTests: "Run All Tests",
      interactiveTitle: "⚡ Interactive Validation Tests (플러그인 직접 실행 검증)"
    }
  };

  // Handle toggling of configurations based on the selected LLM Provider
  function handleProviderChange(provider) {
    if (provider === "gemini") {
      endpointGroup.classList.add("hidden");
      modelTextGroup.classList.add("hidden");
      apiKeyGroup.classList.remove("hidden");
      modelSelectGroup.classList.remove("hidden");
      apiKeyLabel.textContent = "Gemini API Key";
      apiKeyInput.placeholder = "AIzaSy...";
    } else if (provider === "ollama") {
      endpointGroup.classList.remove("hidden");
      modelTextGroup.classList.remove("hidden");
      apiKeyGroup.classList.add("hidden");
      modelSelectGroup.classList.add("hidden");
      if (!endpointInput.value.trim()) {
        endpointInput.value = "http://localhost:11434";
      }
      if (!modelInputText.value.trim()) {
        modelInputText.value = "llama3.2-vision";
      }
    } else if (provider === "openai") {
      endpointGroup.classList.remove("hidden");
      modelTextGroup.classList.remove("hidden");
      apiKeyGroup.classList.remove("hidden");
      modelSelectGroup.classList.add("hidden");
      apiKeyLabel.textContent = "API Key / Token";
      apiKeyInput.placeholder = "sk-...";
      if (!endpointInput.value.trim()) {
        endpointInput.value = "https://api.openai.com/v1";
      }
      if (!modelInputText.value.trim()) {
        modelInputText.value = "gpt-4o";
      }
    }
  }

  providerSelect.addEventListener("change", () => {
    handleProviderChange(providerSelect.value);
  });

  if (toggleKeyVisibilityBtn) {
    toggleKeyVisibilityBtn.addEventListener("click", () => {
      const type = apiKeyInput.type === "password" ? "text" : "password";
      apiKeyInput.type = type;
      toggleKeyVisibilityBtn.textContent = type === "password" ? "👁️" : "🙈";
      toggleKeyVisibilityBtn.setAttribute("aria-pressed", type === "text" ? "true" : "false");
      toggleKeyVisibilityBtn.setAttribute("aria-label", type === "password" ? "Show API Key" : "Hide API Key");
    });
  }

  // 1. Load configuration from local storage
  chrome.storage.local.get([
    "geminiApiKey", "selectedModel", "selectedLanguage", "savedSpecs",
    "aiProvider", "apiEndpoint", "customModel"
  ], (result) => {
    // Load AI Provider
    if (result.aiProvider) {
      providerSelect.value = result.aiProvider;
    } else {
      providerSelect.value = "gemini";
    }

    // Load Endpoint & custom model
    if (result.apiEndpoint) {
      endpointInput.value = result.apiEndpoint;
    }
    if (result.customModel) {
      modelInputText.value = result.customModel;
    }

    // Setup fields visibility
    handleProviderChange(providerSelect.value);

    if (result.geminiApiKey) {
      apiKeyInput.value = result.geminiApiKey;
    } else if (providerSelect.value === "gemini") {
      // Auto-open settings if key is missing
      toggleSettings(true);
    }
    if (result.selectedModel) {
      let model = result.selectedModel;
      // Migrate deprecated 1.5 models to 2.5
      if (model.includes("1.5")) {
        model = model.replace("1.5", "2.5");
        chrome.storage.local.set({ selectedModel: model });
      }
      modelSelect.value = model;
    }
    if (result.selectedLanguage) {
      languageSelect.value = result.selectedLanguage;
    } else {
      languageSelect.value = "auto";
    }

    // Initialize currentTabId and tabStates
    chrome.tabs.query({ active: true, currentWindow: true }, ([activeTab]) => {
      if (activeTab) {
        currentTabId = activeTab.id;
        loadTabState(currentTabId);
      }
    });
  });

  // Track specifications input changes and update active tab state
  specInput.addEventListener("input", () => {
    if (currentTabId && tabStates[currentTabId]) {
      tabStates[currentTabId].specs = specInput.value;
    }
    chrome.storage.local.set({ savedSpecs: specInput.value });
  });

  // 2. Settings Accordion Toggle
  settingsBtn.addEventListener("click", () => {
    const isHidden = settingsPanel.classList.contains("hidden");
    toggleSettings(isHidden);
  });

  function toggleSettings(open) {
    if (open) {
      settingsPanel.classList.remove("hidden");
      settingsBtn.classList.add("active");
      settingsBtn.setAttribute("aria-expanded", "true");
    } else {
      settingsPanel.classList.add("hidden");
      settingsBtn.classList.remove("active");
      settingsBtn.setAttribute("aria-expanded", "false");
    }
  }

  // 3. Save Configuration
  saveKeyBtn.addEventListener("click", () => {
    const key = apiKeyInput.value.trim();
    const model = modelSelect.value;
    const lang = languageSelect.value;
    const provider = providerSelect.value;
    const endpoint = endpointInput.value.trim();
    const customModel = modelInputText.value.trim();

    chrome.storage.local.set({
      geminiApiKey: key,
      selectedModel: model,
      selectedLanguage: lang,
      aiProvider: provider,
      apiEndpoint: endpoint,
      customModel: customModel
    }, () => {
      showStatus("Configuration saved successfully!", "success");
      setTimeout(() => {
        toggleSettings(false);
        hideStatus();
      }, 1000);
    });
  });

  // 4. Toggle Preview Screenshot
  togglePreviewBtn.addEventListener("click", () => {
    const isHidden = previewContainer.classList.contains("hidden");
    if (isHidden) {
      previewContainer.classList.remove("hidden");
      togglePreviewBtn.textContent = "🖼️ Hide Captured Screenshot";
      togglePreviewBtn.setAttribute("aria-expanded", "true");
    } else {
      previewContainer.classList.add("hidden");
      togglePreviewBtn.textContent = "🖼️ View Captured Screenshot";
      togglePreviewBtn.setAttribute("aria-expanded", "false");
    }
  });

  // 5. Mockup Image Upload handling (Drag & Drop or Click)
  dropzone.addEventListener("click", (e) => {
    // Avoid triggering file selector when clicking remove button
    if (e.target !== btnRemoveMockup) {
      mockupFileInput.click();
    }
  });

  mockupFileInput.addEventListener("change", (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      handleMockupFile(files[0]);
    }
  });

  // Drag & Drop event listeners
  ["dragenter", "dragover"].forEach((eventName) => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add("dragover");
    }, false);
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove("dragover");
    }, false);
  });

  dropzone.addEventListener("drop", (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
      handleMockupFile(files[0]);
    }
  });

  function handleMockupFile(file) {
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file (PNG, JPG, SVG)!");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      mockupPreview.src = dataUrl;
      uploadedMockupBase64 = dataUrl.split(",")[1];
      uploadedMockupMimeType = file.type;

      // Update UI preview
      dropzoneText.classList.add("hidden");
      mockupPreviewContainer.classList.remove("hidden");

      // Update tabState
      if (currentTabId && tabStates[currentTabId]) {
        tabStates[currentTabId].mockupBase64 = uploadedMockupBase64;
        tabStates[currentTabId].mockupMimeType = uploadedMockupMimeType;
        tabStates[currentTabId].mockupSrc = dataUrl;
      }
    };
    reader.readAsDataURL(file);
  }

  btnRemoveMockup.addEventListener("click", (e) => {
    e.stopPropagation(); // Avoid triggering file selection dialog
    uploadedMockupBase64 = "";
    uploadedMockupMimeType = "";
    mockupPreview.src = "";
    mockupFileInput.value = ""; // Reset file input

    // Reset UI
    mockupPreviewContainer.classList.add("hidden");
    dropzoneText.classList.remove("hidden");

    // Update tabState
    if (currentTabId && tabStates[currentTabId]) {
      tabStates[currentTabId].mockupBase64 = "";
      tabStates[currentTabId].mockupMimeType = "";
      tabStates[currentTabId].mockupSrc = "";
    }
  });

  // 6. Verification Flow Trigger
  verifyBtn.addEventListener("click", async () => {
    const provider = providerSelect.value;
    const apiKey = apiKeyInput.value.trim();
    const endpoint = endpointInput.value.trim();
    const specs = specInput.value.trim();
    
    // Choose model based on provider
    const model = provider === "gemini" ? modelSelect.value : modelInputText.value.trim();
    const lang = languageSelect.value;

    if (provider === "gemini" && !apiKey) {
      alert("Please enter and save a Gemini API Key first!");
      toggleSettings(true);
      apiKeyInput.focus();
      return;
    }

    if (provider === "openai" && !apiKey) {
      alert("Please enter and save an API Key first!");
      toggleSettings(true);
      apiKeyInput.focus();
      return;
    }

    if (provider !== "gemini" && !model) {
      alert("Please enter a model name first!");
      toggleSettings(true);
      modelInputText.focus();
      return;
    }

    // Verify at least one input is provided (text spec or design mockup)
    if (!specs && !uploadedMockupBase64) {
      alert("Please enter a text specification OR upload a design mockup image!");
      specInput.focus();
      return;
    }

    // Reset layout
    resultsContainer.innerHTML = Array.from({ length: 3 }).map(() => `
      <div class="result-card skeleton">
        <div class="skeleton-header">
          <div class="skeleton-line title"></div>
          <div class="skeleton-line status"></div>
        </div>
        <div class="skeleton-line desc"></div>
        <div class="skeleton-line desc short"></div>
      </div>
    `).join("");
    reportPanel.classList.remove("hidden");
    simulationsSection.classList.add("hidden");
    simulationsContainer.innerHTML = "";
    verifyBtn.disabled = true;
    verifySpinner.classList.remove("hidden");
    showStatus("Getting active window...");

    try {
      // A. Get active tab details
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!activeTab) {
        throw new Error("No active tab found. Please open a webpage to audit.");
      }

      // Ensure it's a web page
      if (activeTab.url && (activeTab.url.startsWith("chrome://") || activeTab.url.startsWith("edge://"))) {
        throw new Error("Cannot audit internal browser pages. Please open a public webpage.");
      }

      // B. Inject content script if not already there, then scrape DOM
      let domData;
      const actionName = "scrapeDOM";
      showStatus("Extracting webpage elements...");

      try {
        const response = await chrome.tabs.sendMessage(activeTab.id, { action: actionName });
        if (response && response.success) {
          domData = response.data;
        } else {
          throw new Error("Content script response failed");
        }
      } catch (err) {
        showStatus("Initializing content script...");
        await chrome.scripting.executeScript({
          target: { tabId: activeTab.id },
          files: ["scripts/content.js"]
        });
        
        showStatus("Extracting webpage elements...");

        const response = await chrome.tabs.sendMessage(activeTab.id, { action: actionName });
        if (response && response.success) {
          domData = response.data;
        } else {
          throw new Error("Failed to extract DOM metadata from webpage.");
        }
      }

      // Resolve language
      resolvedLanguage = lang;
      if (lang === "auto") {
        const hasKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(specs) || 
                          /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(domData.title) || 
                          (domData.headings && domData.headings.some(h => /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(h.text)));
        resolvedLanguage = hasKorean ? "ko" : "en";
      }

      // C. Capture current visible screenshot
      showStatus("Capturing page layout screenshot...");
      const screenshotDataUrl = await chrome.tabs.captureVisibleTab(null, { format: "png" });
      currentScreenshotUrl = screenshotDataUrl;
      screenshotPreview.src = screenshotDataUrl;

      // D. Audit using LLM Interface
      showStatus("AI is auditing requirements (visual & functional)...");
      const base64LiveScreenshot = screenshotDataUrl.split(",")[1];
      const auditResult = await callLLMAPI(provider, apiKey, endpoint, model, specs, domData, base64LiveScreenshot, uploadedMockupBase64, uploadedMockupMimeType, lang);

      // E. Render Report
      renderReport(auditResult);

      // Save to tabState
      if (currentTabId && tabStates[currentTabId]) {
        tabStates[currentTabId].results = currentBaselineResults;
        tabStates[currentTabId].simulations = currentSimulationTests;
        tabStates[currentTabId].screenshotUrl = currentScreenshotUrl;
        tabStates[currentTabId].reportVisible = true;
        tabStates[currentTabId].simulationsVisible = currentSimulationTests.length > 0;
      }

    } catch (error) {
      console.error(error);
      // 인라인 에러 카드로 에러 표시 (alert 대신)
      const effectiveLang = resolvedLanguage || (languageSelect ? languageSelect.value : 'en') || 'en';
      const errorTitle = effectiveLang === 'ko' ? '검증 실패' : 'Audit Failed';
      renderErrorCard(errorTitle, error.message, '');
      showStatus(`Error: ${error.message}`, "error");
    } finally {
      verifyBtn.disabled = false;
      verifySpinner.classList.add("hidden");
      setTimeout(hideStatus, 3000);
    }
  });

  // Helper: Status display
  function showStatus(message, type = "") {
    statusBox.classList.remove("hidden");
    statusText.textContent = message;
    if (type === "error") {
      statusBox.style.color = "var(--danger)";
    } else if (type === "success") {
      statusBox.style.color = "var(--success)";
    } else {
      statusBox.style.color = "var(--primary-accent)";
    }
  }

  function hideStatus() {
    statusBox.classList.add("hidden");
  }

  // 7. Generalized LLM API Routing (Supports Gemini, Ollama, OpenAI)
  async function callLLMAPI(provider, apiKey, endpoint, model, specs, domData, liveScreenshotBase64, mockupBase64, mockupMimeType, targetLang) {
    if (provider === "gemini") {
      return callGeminiAPI(apiKey, model, specs, domData, liveScreenshotBase64, mockupBase64, mockupMimeType, targetLang);
    } else if (provider === "ollama" || provider === "openai") {
      return callOpenAICompatibleAPI(provider, apiKey, endpoint, model, specs, domData, liveScreenshotBase64, mockupBase64, mockupMimeType, targetLang);
    } else {
      throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }

  // 8. OpenAI & Ollama Multimodal Compatible API Call
  // 8. Shared Prompt Builder Helper
  function buildPromptText(specs, domData, mockupBase64, targetLang) {
    const hasKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(specs) || 
                      /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(domData.title) || 
                      (domData.headings && domData.headings.some(h => /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(h.text)));

    let languageInstruction = "";
    if (targetLang === "ko") {
      languageInstruction = `
LANGUAGE REQUIREMENT:
- You MUST output all JSON text fields ("title", "description", "suggestions", "name") strictly in Korean (한국어). Do not use English for these fields.
`;
    } else if (targetLang === "en") {
      languageInstruction = `
LANGUAGE REQUIREMENT:
- You MUST output all JSON text fields ("title", "description", "suggestions", "name") strictly in English. Do not use Korean for these fields.
`;
    } else {
      languageInstruction = `
LANGUAGE REQUIREMENT:
- Detect the language of the specifications or mockup annotations.
- If the specifications, mockup notations, or target webpage contains Korean (한국어) - or if the flag 'hasKorean' is true (which is ${hasKorean}) - you MUST output the fields "title", "description", "suggestions", and "name" strictly in Korean (한국어).
- Otherwise, match the language of the input (typically English).
`;
    }

    let promptText = `
You are an expert visual and functional Quality Assurance (QA) engineer.
You are given:
1. A webpage screenshot of the active view (Image 1).
2. Extracted metadata of elements (DOM inputs, text limits, placeholder, buttons, headers) parsed as JSON.
`;

    if (mockupBase64) {
      promptText += `3. A design mockup image uploaded by the user (Image 2) which represents the target design intent.\n`;
    }

    if (specs) {
      promptText += `\nSPECIFICATIONS TO VERIFY:\n${specs}\n`;
    }

    promptText += `
WEBPAGE DOM METADATA (JSON):
${JSON.stringify(domData, null, 2)}

YOUR TASK:
Audit the webpage (represented by Image 1 and the DOM JSON) to check for compliance.
`;

    if (mockupBase64) {
      promptText += `
- COMPARE the live webpage screenshot (Image 1) WITH the design mockup (Image 2) visually. Identify any visual discrepancies (layout positioning, spacing, alignment, logo placement, copywriting differences, input styles, fonts).
- Audit whether the element values (like placeholders or buttons) in the DOM JSON match the design intent shown in Image 2.
`;
    }

    if (specs) {
      promptText += `
- Review whether the explicit text requirements listed under SPECIFICATIONS are met by the initial/static layout and static HTML properties.
- Specifically check the DOM JSON constraints (e.g. check if inputs matching the rule have correct attributes like 'maxlength', 'required', 'pattern', or placeholder values).
`;
    }

    if (mockupBase64 && specs) {
      promptText += `
CRITICAL INSTRUCTION:
Both a design mockup image AND text specifications were provided. You MUST audit BOTH.
Compare Image 1 with Image 2 and evaluate DOM constraints against the text specifications.
`;
    }

    promptText += `
${languageInstruction}

You MUST respond strictly in JSON format matching the schema below. Do not wrap the JSON output in markdown block symbols.
Return a JSON object with two fields:
{
  "baselineResults": [
    {
      "title": "Short title of the rule/visual element verified (e.g., 'Email Placeholder Check' or 'Header Alignment Check')",
      "status": "pass" or "fail",
      "description": "Clear explanation of what was verified, comparing the live site/DOM properties against the specifications/design mockup.",
      "suggestions": "If failed, detailed HTML/CSS/JS instructions on how the developer can fix this discrepancy. If passed, write 'None'."
    }
  ],
  "simulationTests": [
    {
      "id": "A unique slug ID (e.g. 'invalid_email_test')",
      "name": "Short name of the test (e.g. 'Invalid Email API Test')",
      "description": "Explains what inputs will be injected and what response/warning is verified.",
      "steps": [
        { "action": "fill", "selector": "CSS selector of the input field", "value": "the value to fill" },
        { "action": "click", "selector": "CSS selector of the submit button" }
      ],
      "validation": {
        "apiPath": "API endpoint substring expected to be called (e.g., '/api/register'), or empty string",
        "statusCode": 400, // expected HTTP status code of the API call, or null
        "domWarningText": "Expected error/warning text to appear on the screen, or empty string (e.g., 'Email must be from example.com')"
      }
    }
  ]
}
`;
    return promptText;
  }

  // 9. Shared JSON Parser Helper
  function parseJSONResponse(generatedText) {
    const cleaned = generatedText.trim();
    
    // 1. Try direct parsing
    try {
      return JSON.parse(cleaned);
    } catch (inner) {}

    // 2. Try extracting JSON using markdown block matching
    const mdRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
    const match = cleaned.match(mdRegex);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1].trim());
      } catch (inner) {}
    }

    // 3. Try parsing text between first '[' and last ']' (array format)
    const startIdx = cleaned.indexOf('[');
    const endIdx = cleaned.lastIndexOf(']');
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      try {
        return JSON.parse(cleaned.substring(startIdx, endIdx + 1));
      } catch (inner) {}
    }

    // 4. Try parsing text between first '{' and last '}' (object format)
    const startObjIdx = cleaned.indexOf('{');
    const endObjIdx = cleaned.lastIndexOf('}');
    if (startObjIdx !== -1 && endObjIdx !== -1 && endObjIdx > startObjIdx) {
      try {
        return JSON.parse(cleaned.substring(startObjIdx, endObjIdx + 1));
      } catch (inner) {}
    }

    // If all failed, throw the original syntax error
    return JSON.parse(cleaned);
  }

  // 10. OpenAI & Ollama Multimodal Compatible API Call
  async function callOpenAICompatibleAPI(provider, apiKey, endpoint, model, specs, domData, liveScreenshotBase64, mockupBase64, mockupMimeType, targetLang) {
    // 오프라인 상태 사전 체크
    if (!navigator.onLine) {
      const lang = resolvedLanguage || (languageSelect ? languageSelect.value : 'en') || 'en';
      const offlineMsg = lang === 'ko'
        ? '네트워크가 연결되어 있지 않습니다. 인터넷 연결을 확인 후 다시 시도해 주세요.'
        : 'No network connection detected. Please check your internet and try again.';
      throw new Error(offlineMsg);
    }

    let url = endpoint ? endpoint.trim() : "";
    if (!url) {
      if (provider === "ollama") {
        url = "http://localhost:11434";
      } else {
        throw new Error("API Endpoint URL is required for OpenAI-Compatible providers.");
      }
    }
    
    // Format URL correctly for Chat Completions API
    if (!url.endsWith("/chat/completions")) {
      if (url.endsWith("/")) url = url.slice(0, -1);
      if (!url.endsWith("/v1") && provider === "ollama") {
        url += "/v1";
      }
      url += "/chat/completions";
    }

    const promptText = buildPromptText(specs, domData, mockupBase64, targetLang);

    // Construct OpenAI messages payload (multimodal format)
    const contentParts = [
      { type: "text", text: promptText },
      {
        type: "image_url",
        image_url: {
          url: `data:image/png;base64,${liveScreenshotBase64}`
        }
      }
    ];

    if (mockupBase64) {
      contentParts.push({
        type: "image_url",
        image_url: {
          url: `data:${mockupMimeType || "image/png"};base64,${mockupBase64}`
        }
      });
    }

    const requestBody = {
      model: model || (provider === "ollama" ? "llama3.2-vision" : "gpt-4o"),
      messages: [
        {
          role: "user",
          content: contentParts
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1
    };

    const headers = {
      "Content-Type": "application/json"
    };
    if (apiKey && provider === "openai") {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    // AbortController를 사용한 30초 타임아웃 설정
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    let response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      // AbortError 감지 → 타임아웃 메시지
      if (fetchErr.name === 'AbortError') {
        const lang = resolvedLanguage || (languageSelect ? languageSelect.value : 'en') || 'en';
        const timeoutMsg = lang === 'ko'
          ? 'API 요청이 30초 내에 응답하지 않았습니다. 네트워크 상태를 확인하거나 잠시 후 다시 시도해 주세요.'
          : 'API request timed out after 30 seconds. Please check your network or try again later.';
        throw new Error(timeoutMsg);
      }
      throw fetchErr;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorText = await response.text();
      let errorMsg = response.statusText;
      try {
        const errJson = JSON.parse(errorText);
        errorMsg = errJson.error?.message || errorMsg;
      } catch (e) {}
      // HTTP 상태 코드별 사용자 친화적 가이드 매핑
      const lang = resolvedLanguage || (languageSelect ? languageSelect.value : 'en') || 'en';
      const guide = getErrorGuide(response.status, provider, lang);
      throw new Error(guide || `API Error (${response.status}): ${errorMsg}`);
    }

    const responseData = await response.json();
    const generatedText = responseData.choices[0].message.content;

    try {
      return parseJSONResponse(generatedText);
    } catch (e) {
      console.warn("Failed to parse response as JSON:", e, generatedText);
      throw new Error(`AI returned invalid JSON: ${e.message}`);
    }
  }

  // 11. Gemini Multimodal API Call (Supports multiple images)
  async function callGeminiAPI(apiKey, model, specs, domData, liveScreenshotBase64, mockupBase64, mockupMimeType, targetLang) {
    // 오프라인 상태 사전 체크
    if (!navigator.onLine) {
      const lang = resolvedLanguage || (languageSelect ? languageSelect.value : 'en') || 'en';
      const offlineMsg = lang === 'ko'
        ? '네트워크가 연결되어 있지 않습니다. 인터넷 연결을 확인 후 다시 시도해 주세요.'
        : 'No network connection detected. Please check your internet and try again.';
      throw new Error(offlineMsg);
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const promptText = buildPromptText(specs, domData, mockupBase64, targetLang);

    // Construct the parts array
    const parts = [
      { text: promptText },
      {
        inlineData: {
          mimeType: "image/png",
          data: liveScreenshotBase64
        }
      }
    ];

    // Append design mockup as the second image if uploaded
    if (mockupBase64) {
      parts.push({
        inlineData: {
          mimeType: mockupMimeType || "image/png",
          data: mockupBase64
        }
      });
    }

    const requestBody = {
      contents: [
        {
          parts: parts
        }
      ],
      generationConfig: {
        responseMimeType: "application/json"
      }
    };

    // AbortController를 사용한 30초 타임아웃 설정
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    let response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      // AbortError 감지 → 타임아웃 메시지
      if (fetchErr.name === 'AbortError') {
        const lang = resolvedLanguage || (languageSelect ? languageSelect.value : 'en') || 'en';
        const timeoutMsg = lang === 'ko'
          ? 'API 요청이 30초 내에 응답하지 않았습니다. 네트워크 상태를 확인하거나 잠시 후 다시 시도해 주세요.'
          : 'API request timed out after 30 seconds. Please check your network or try again later.';
        throw new Error(timeoutMsg);
      }
      throw fetchErr;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      let errorMsg = response.statusText;
      try {
        const errorData = await response.json();
        errorMsg = errorData.error?.message || errorMsg;
      } catch (e) {}
      // HTTP 상태 코드별 사용자 친화적 가이드 매핑
      const lang = resolvedLanguage || (languageSelect ? languageSelect.value : 'en') || 'en';
      const guide = getErrorGuide(response.status, 'gemini', lang);
      throw new Error(guide || `Gemini API Error (${response.status}): ${errorMsg}`);
    }

    const responseData = await response.json();
    const generatedText = responseData.candidates[0].content.parts[0].text;

    try {
      return parseJSONResponse(generatedText);
    } catch (e) {
      console.warn("Failed to parse response as JSON:", e, generatedText);
      throw new Error(`AI returned invalid JSON: ${e.message}`);
    }
  }

  // 8. Results Dashboard Renderer
  function renderReport(results) {
    resultsContainer.innerHTML = "";
    reportPanel.classList.remove("hidden");

    let baselineResults = [];
    currentSimulationTests = [];

    if (results) {
      if (Array.isArray(results)) {
        baselineResults = results;
      } else {
        baselineResults = results.baselineResults || [];
        currentSimulationTests = results.simulationTests || [];
      }
      currentBaselineResults = baselineResults;
    }

    // A. Render Baseline Results
    let passCount = 0;
    const totalCount = baselineResults.length;

    baselineResults.forEach((item) => {
      const isPass = item.status && item.status.toLowerCase() === "pass";
      if (isPass) passCount++;

      const card = document.createElement("div");
      card.className = `result-card ${isPass ? "pass" : "fail"}`;

      card.innerHTML = `
        <div class="card-header">
          <span class="card-title">${escapeHTML(item.title)}</span>
          <span class="status-badge">${isPass ? "PASS" : "FAIL"}</span>
        </div>
        <div class="card-description">${escapeHTML(item.description)}</div>
        ${
          !isPass && item.suggestions && item.suggestions !== "None"
            ? `<div class="card-suggestions"><strong>💡 Suggestion:</strong> ${escapeHTML(item.suggestions)}</div>`
            : ""
        }
      `;
      resultsContainer.appendChild(card);
    });

    // Update score badge
    reportScore.textContent = `${passCount}/${totalCount} Passed`;
    if (passCount === totalCount) {
      reportScore.style.backgroundColor = "var(--success-bg)";
      reportScore.style.borderColor = "var(--success-border)";
      reportScore.style.color = "var(--success)";
    } else {
      reportScore.style.backgroundColor = "var(--bg-tertiary)";
      reportScore.style.borderColor = "var(--border-color)";
      reportScore.style.color = "var(--text-main)";
    }

    // B. Render Interactive Simulation Tests
    simulationsContainer.innerHTML = "";
    const t = TRANSLATIONS[resolvedLanguage] || TRANSLATIONS['en'];

    if (currentSimulationTests.length > 0) {
      simulationsSection.classList.remove("hidden");
      
      // Translate header & button
      const sectionHeader = simulationsSection.querySelector("h2");
      if (sectionHeader) {
        sectionHeader.innerHTML = t.interactiveTitle;
      }
      runAllSimsBtn.textContent = t.runAllTests;

      currentSimulationTests.forEach((test) => {
        const card = document.createElement("div");
        card.className = "simulation-card";
        card.id = `sim-card-${test.id}`;

        let stepsHtml = "";
        if (test.steps && test.steps.length > 0) {
          stepsHtml = `<div class="sim-steps-list">`;
          test.steps.forEach((s) => {
            if (s.action === "fill") {
              const fillText = resolvedLanguage === "ko" ? `입력` : `fill`;
              const withText = resolvedLanguage === "ko" ? `에 값` : `with`;
              stepsHtml += `<div><span>${fillText}</span> ${escapeHTML(s.selector)} ${withText} "${escapeHTML(s.value)}"</div>`;
            } else if (s.action === "click") {
              const clickText = resolvedLanguage === "ko" ? `클릭` : `click`;
              stepsHtml += `<div><span>${clickText}</span> ${escapeHTML(s.selector)}</div>`;
            }
          });
          stepsHtml += `</div>`;
        }

        card.innerHTML = `
          <div class="sim-header">
            <div>
              <div class="sim-title">${escapeHTML(test.name)}</div>
              <span class="sim-badge pending" id="sim-badge-${test.id}">${t.pending}</span>
            </div>
            <button class="sim-btn-play" id="sim-btn-${test.id}">▶ ${t.runTest}</button>
          </div>
          <div class="sim-desc">${escapeHTML(test.description)}</div>
          ${stepsHtml}
          <div class="sim-log-panel hidden" id="sim-log-${test.id}">
            <div class="sim-log-header">${t.verificationLogs}</div>
            <div class="sim-logs-content" id="sim-logs-content-${test.id}"></div>
            <img class="sim-screenshot-thumb hidden" id="sim-thumb-${test.id}" alt="Simulated State Thumbnail">
            <div class="sim-log-actions hidden" id="sim-actions-${test.id}">
              <button class="sim-log-btn" id="sim-btn-copy-api-${test.id}" type="button">📋 Copy API Data</button>
              <button class="sim-log-btn" id="sim-btn-save-api-${test.id}" type="button">💾 Save API Log</button>
            </div>
          </div>
        `;

        simulationsContainer.appendChild(card);

        // Bind run handler to button
        const runBtn = card.querySelector(`#sim-btn-${test.id}`);
        runBtn.addEventListener("click", () => runSimulationTest(test));
      });
    } else {
      simulationsSection.classList.add("hidden");
    }
  }

  // 9. Execute single simulation interactive test directly on the active tab
  async function runSimulationTest(test) {
    const card = document.getElementById(`sim-card-${test.id}`);
    const badge = document.getElementById(`sim-badge-${test.id}`);
    const runBtn = document.getElementById(`sim-btn-${test.id}`);
    const logPanel = document.getElementById(`sim-log-${test.id}`);
    const logsContent = document.getElementById(`sim-logs-content-${test.id}`);
    const thumb = document.getElementById(`sim-thumb-${test.id}`);
    const t = TRANSLATIONS[resolvedLanguage] || TRANSLATIONS['en'];

    // Update UI to running state
    card.className = "simulation-card running";
    badge.className = "sim-badge running";
    badge.textContent = t.running;
    runBtn.disabled = true;
    logPanel.classList.remove("hidden");
    logsContent.innerHTML = `<div class="sim-log-item">${t.initializing}</div>`;
    thumb.classList.add("hidden");

    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!activeTab) {
        throw new Error("No active tab found");
      }

      // Execute simulation steps directly on active tab
      logsContent.innerHTML += `<div class="sim-log-item">${t.sendingSteps}</div>`;
      const response = await chrome.tabs.sendMessage(activeTab.id, {
        action: "runSimulationSteps",
        steps: test.steps,
        expectedWarningText: test.validation.domWarningText
      });

      if (!response || !response.success) {
        throw new Error(response?.error || "Failed to execute simulation steps on page");
      }

      const result = response.result;
      logsContent.innerHTML += `<div class="sim-log-item">${t.actionsComplete}</div>`;

      // Wait 150ms for browser painting, then capture tab screenshot of this simulated state
      await new Promise(r => setTimeout(r, 150));
      const testScreenshotUrl = await chrome.tabs.captureVisibleTab(null, { format: "png" });
      thumb.src = testScreenshotUrl;
      thumb.classList.remove("hidden");

      // Set up click-to-view original size screenshot
      thumb.onclick = () => {
        const win = window.open();
        win.document.write(`<img src="${testScreenshotUrl}" style="max-width:100%; border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.5);">`);
      };

      // Perform validation checks
      let pass = true;
      let logsHtml = "";

      // Validate API request if expected
      if (test.validation.apiPath) {
        const matchingLogs = result.networkLogs.filter(log => log.url.includes(test.validation.apiPath));
        if (matchingLogs.length > 0) {
          const log = matchingLogs[matchingLogs.length - 1]; // get latest request
          const statusMatch = test.validation.statusCode ? log.status === test.validation.statusCode : true;
          
          if (statusMatch) {
            logsHtml += `<div class="sim-log-item request">${t.apiCallDetected} <code>${escapeHTML(log.method)} ${escapeHTML(log.url)}</code></div>`;
            logsHtml += `<div class="sim-log-item response">${t.apiStatusMatches} <code>${log.status}</code></div>`;
            if (log.payload) {
              logsHtml += `<div class="sim-log-item text-muted">${t.payload}: <code>${escapeHTML(JSON.stringify(log.payload))}</code></div>`;
            }
            if (log.response) {
              logsHtml += `<div class="sim-log-item text-muted">${t.response}: <code>${escapeHTML(JSON.stringify(log.response))}</code></div>`;
            }
          } else {
            pass = false;
            logsHtml += `<div class="sim-log-item request">⚠️ ${t.apiCallDetected} <code>${escapeHTML(log.method)} ${escapeHTML(log.url)}</code></div>`;
            const errorText = t.apiStatusMismatch.replace("{expected}", test.validation.statusCode).replace("{actual}", log.status);
            logsHtml += `<div class="sim-log-item error">${errorText}</div>`;
          }
        } else {
          pass = false;
          const missingText = t.apiCallMissing.replace("{path}", test.validation.apiPath);
          logsHtml += `<div class="sim-log-item error">${missingText}</div>`;
        }
      }

      // Validate DOM Warning message if expected
      if (test.validation.domWarningText) {
        if (result.warningTextFound) {
          const textFound = t.warningTextFound.replace("{text}", test.validation.domWarningText);
          logsHtml += `<div class="sim-log-item response">${textFound}</div>`;
        } else {
          pass = false;
          const textMissing = t.warningTextMissing.replace("{text}", test.validation.domWarningText);
          logsHtml += `<div class="sim-log-item error">${textMissing}</div>`;
        }
      }

      // Update test result status
      if (pass) {
        card.className = "simulation-card pass";
        badge.className = "sim-badge pass";
        badge.textContent = t.pass;
      } else {
        card.className = "simulation-card fail";
        badge.className = "sim-badge fail";
        badge.textContent = t.fail;
      }

      logsContent.innerHTML = logsHtml;

      // Handle copy and save action buttons for simulation API data
      const logActions = document.getElementById(`sim-actions-${test.id}`);
      const copyApiBtn = document.getElementById(`sim-btn-copy-api-${test.id}`);
      const saveApiBtn = document.getElementById(`sim-btn-save-api-${test.id}`);

      if (logActions && test.validation.apiPath) {
        const matchingLogs = result.networkLogs.filter(log => log.url.includes(test.validation.apiPath));
        if (matchingLogs.length > 0) {
          const targetLog = matchingLogs[matchingLogs.length - 1]; // get latest matching request
          const apiDataText = JSON.stringify({
            testName: test.name,
            testId: test.id,
            url: targetLog.url,
            method: targetLog.method,
            status: targetLog.status,
            timestamp: targetLog.timestamp,
            payload: targetLog.payload,
            response: targetLog.response
          }, null, 2);

          logActions.classList.remove("hidden");

          copyApiBtn.onclick = (e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(apiDataText).then(() => {
              const originalText = copyApiBtn.textContent;
              copyApiBtn.textContent = resolvedLanguage === "ko" ? "✅ 복사 완료!" : "✅ Copied!";
              setTimeout(() => { copyApiBtn.textContent = originalText; }, 1200);
            });
          };

          saveApiBtn.onclick = (e) => {
            e.stopPropagation();
            const blob = new Blob([apiDataText], { type: "application/json;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `api_log_${test.id}_${new Date().getTime()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          };
        } else {
          logActions.classList.add("hidden");
        }
      } else if (logActions) {
        logActions.classList.add("hidden");
      }

    } catch (err) {
      console.error(err);
      card.className = "simulation-card fail";
      badge.className = "sim-badge fail";
      badge.textContent = t.error;
      logsContent.innerHTML = `<div class="sim-log-item error">❌ ${t.error}: ${escapeHTML(err.message)}</div>`;
      
      const logActions = document.getElementById(`sim-actions-${test.id}`);
      if (logActions) logActions.classList.add("hidden");
    } finally {
      runBtn.disabled = false;
    }
  }

  // 10. Bind Run All button
  runAllSimsBtn.addEventListener("click", async () => {
    runAllSimsBtn.disabled = true;
    for (const test of currentSimulationTests) {
      try {
        await runSimulationTest(test);
        // Wait brief pause between tests to let page settle
        await new Promise(r => setTimeout(r, 600));
      } catch (e) {
        console.error("Error in Run All loop:", e);
      }
    }
    runAllSimsBtn.disabled = false;
  });

  // Helper: Build Markdown Report
  async function buildReportMarkdown() {
    let markdown = `# 👁️‍🗨️ VisualVerify QA Issues Report\n`;
    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      markdown += `**URL:** ${activeTab ? activeTab.url : "Unknown Webpage"}\n`;
    } catch (e) {
      markdown += `**URL:** Unknown Webpage\n`;
    }
    markdown += `**Date:** ${new Date().toLocaleString()}\n\n`;

    // A. Baseline UI Failures
    const failures = currentBaselineResults.filter(item => item.status && item.status.toLowerCase() === "fail");
    markdown += `## ❌ Baseline UI & Visual Failures (${failures.length})\n`;
    if (failures.length > 0) {
      failures.forEach((item, idx) => {
        markdown += `${idx + 1}. **${item.title}**\n`;
        markdown += `   - *Description:* ${item.description}\n`;
        if (item.suggestions && item.suggestions !== "None") {
          markdown += `   - *Developer Suggestion:* ${item.suggestions}\n`;
        }
        markdown += `\n`;
      });
    } else {
      markdown += `*No static or visual failures detected on the baseline page.* \n\n`;
    }

    // B. Interactive Simulation Results
    markdown += `## ⚡ Interactive Simulation Results (${currentSimulationTests.length})\n`;
    if (currentSimulationTests.length > 0) {
      currentSimulationTests.forEach((test, idx) => {
        const badge = document.getElementById(`sim-badge-${test.id}`);
        const status = badge ? badge.textContent : "Pending/대기중";
        const logPanel = document.getElementById(`sim-log-${test.id}`);
        const logsContent = document.getElementById(`sim-logs-content-${test.id}`);
        
        let logsText = "";
        if (logPanel && !logPanel.classList.contains("hidden") && logsContent) {
          const items = logsContent.querySelectorAll(".sim-log-item");
          logsText = Array.from(items).map(el => el.innerText.trim()).join("\n     ");
        } else {
          logsText = resolvedLanguage === "ko" ? "테스트 실행되지 않음" : "Test not executed yet";
        }

        markdown += `${idx + 1}. **${test.name}** [Status: **${status}**]\n`;
        markdown += `   - *Description:* ${test.description}\n`;
        markdown += `   - *Verification Logs:*\n     ${logsText}\n\n`;
      });
    } else {
      markdown += `*No interactive validation simulations available for this page.*\n\n`;
    }
    return markdown;
  }

  // 11. Copy Report Issues (Markdown format) to Clipboard
  exportIssuesBtn.addEventListener("click", async () => {
    const markdown = await buildReportMarkdown();
    
    // Copy to clipboard
    navigator.clipboard.writeText(markdown).then(() => {
      const originalText = exportIssuesBtn.textContent;
      exportIssuesBtn.textContent = resolvedLanguage === "ko" ? "✅ 복사 완료!" : "✅ Copied!";
      exportIssuesBtn.disabled = true;
      setTimeout(() => {
        exportIssuesBtn.textContent = originalText;
        exportIssuesBtn.disabled = false;
      }, 1500);
    }).catch(err => {
      console.error("Failed to copy report:", err);
      alert("Failed to copy report to clipboard.");
    });
  });

  // 12. Save Report to File
  if (downloadReportBtn) {
    downloadReportBtn.addEventListener("click", async () => {
      const markdown = await buildReportMarkdown();
      const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `VisualVerify_Report_${new Date().toISOString().slice(0,10)}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  // HTML sanitization helper
  function escapeHTML(str) {
    if (str === null || str === undefined) return "";
    const stringVal = String(str);
    return stringVal
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // HTTP 상태 코드별 사용자 친화적 에러 가이드 매핑
  function getErrorGuide(status, provider, lang) {
    // lang이 결정되지 않은 시점이면 languageSelect 값 참조 후 fallback 'en'
    const effectiveLang = lang || (languageSelect ? languageSelect.value : 'en') || 'en';
    const isKo = effectiveLang === 'ko';

    const guides = {
      400: isKo
        ? '잘못된 요청입니다. 입력 내용을 확인해 주세요.'
        : 'Bad request. Please check your input.',
      401: isKo
        ? 'API 키가 유효하지 않거나 만료되었습니다. 설정(⚙️)에서 API 키를 확인해 주세요.'
        : 'API key is invalid or expired. Please check your API key in Settings (⚙️).',
      403: isKo
        ? '접근이 거부되었습니다. API 키 권한을 확인해 주세요.'
        : 'Access denied. Please verify your API key permissions.',
      429: isKo
        ? 'API 호출 한도를 초과했습니다. 잠시 후(1~2분) 다시 시도해 주세요.'
        : 'Rate limit exceeded. Please wait 1-2 minutes and try again.'
    };

    if (guides[status]) return guides[status];

    // 500~599 서버 에러 범위
    if (status >= 500 && status <= 599) {
      return isKo
        ? '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
        : 'Server error occurred. Please try again later.';
    }

    // 기타: 원래 에러 메시지를 반환하도록 null 리턴
    return null;
  }

  // 인라인 에러 카드 렌더링 (alert 대체)
  function renderErrorCard(title, detail, errorCode) {
    const effectiveLang = resolvedLanguage || (languageSelect ? languageSelect.value : 'en') || 'en';
    const isKo = effectiveLang === 'ko';
    const retryLabel = isKo ? '🔄 다시 시도' : '🔄 Retry';

    resultsContainer.innerHTML = '';
    reportPanel.classList.remove('hidden');

    const card = document.createElement('div');
    card.className = 'error-card';
    card.setAttribute('role', 'alert');

    card.innerHTML = `
      <div class="error-card-header">
        <span aria-hidden="true">⚠️</span>
        <span>${escapeHTML(title)}</span>
      </div>
      <div class="error-card-body">
        ${escapeHTML(detail)}
        ${errorCode ? ` <code>${escapeHTML(errorCode)}</code>` : ''}
      </div>
    `;

    // 재시도 버튼 (접근성: 키보드 포커스 가능)
    const retryBtn = document.createElement('button');
    retryBtn.className = 'btn-retry';
    retryBtn.textContent = retryLabel;
    retryBtn.setAttribute('aria-label', isKo ? '검증 재시도' : 'Retry audit');
    retryBtn.addEventListener('click', () => {
      verifyBtn.click();
    });
    card.appendChild(retryBtn);

    resultsContainer.appendChild(card);
  }

  // Save current UI state to the currentTabId state object and persistent local storage
  function saveCurrentTabState() {
    if (!currentTabId) return;
    const state = {
      specs: specInput ? specInput.value : "",
      mockupBase64: uploadedMockupBase64,
      mockupMimeType: uploadedMockupMimeType,
      mockupSrc: mockupPreview ? mockupPreview.src : "",
      results: currentBaselineResults,
      simulations: currentSimulationTests,
      screenshotUrl: currentScreenshotUrl,
      url: tabStates[currentTabId]?.url || "",
      reportVisible: reportPanel ? !reportPanel.classList.contains("hidden") : false,
      simulationsVisible: simulationsSection ? !simulationsSection.classList.contains("hidden") : false
    };
    tabStates[currentTabId] = state;
    chrome.storage.local.set({ [`tabState_${currentTabId}`]: state });
  }

  // Load state for a specific tabId and update the UI
  function loadTabState(tabId) {
    chrome.storage.local.get([`tabState_${tabId}`], (res) => {
      const savedState = res[`tabState_${tabId}`];
      if (savedState) {
        tabStates[tabId] = savedState;
      }
      
      const state = tabStates[tabId];
      if (state) {
        // Restore specifications
        if (specInput) {
          specInput.value = state.specs || "";
        }
        
        // Restore mockup
        uploadedMockupBase64 = state.mockupBase64 || "";
        uploadedMockupMimeType = state.mockupMimeType || "";
        if (mockupPreview) {
          mockupPreview.src = state.mockupSrc || "";
        }
        if (uploadedMockupBase64) {
          if (dropzoneText) dropzoneText.classList.add("hidden");
          if (mockupPreviewContainer) mockupPreviewContainer.classList.remove("hidden");
        } else {
          if (mockupPreviewContainer) mockupPreviewContainer.classList.add("hidden");
          if (dropzoneText) dropzoneText.classList.remove("hidden");
        }

        // Restore results and simulation state variables
        currentBaselineResults = state.results || [];
        currentSimulationTests = state.simulations || [];
        currentScreenshotUrl = state.screenshotUrl || "";
        if (screenshotPreview) {
          screenshotPreview.src = currentScreenshotUrl;
        }

        // Restore UI elements
        if (state.reportVisible) {
          renderReport({
            baselineResults: currentBaselineResults,
            simulationTests: currentSimulationTests
          });
          if (reportPanel) reportPanel.classList.remove("hidden");
          if (state.simulationsVisible && simulationsSection) {
            simulationsSection.classList.remove("hidden");
          }
        } else {
          if (reportPanel) reportPanel.classList.add("hidden");
          if (resultsContainer) resultsContainer.innerHTML = "";
          if (simulationsSection) simulationsSection.classList.add("hidden");
          if (simulationsContainer) simulationsContainer.innerHTML = "";
        }
      } else {
        // Clear UI for tab with no saved state
        if (specInput) specInput.value = "";
        uploadedMockupBase64 = "";
        uploadedMockupMimeType = "";
        if (mockupPreview) mockupPreview.src = "";
        if (mockupPreviewContainer) mockupPreviewContainer.classList.add("hidden");
        if (dropzoneText) dropzoneText.classList.remove("hidden");
        currentBaselineResults = [];
        currentSimulationTests = [];
        currentScreenshotUrl = "";
        if (screenshotPreview) screenshotPreview.src = "";
        if (reportPanel) reportPanel.classList.add("hidden");
        if (resultsContainer) resultsContainer.innerHTML = "";
        if (simulationsSection) simulationsSection.classList.add("hidden");
        if (simulationsContainer) simulationsContainer.innerHTML = "";
        
        // Initialize basic state structure
        tabStates[tabId] = {
          specs: "",
          mockupBase64: "",
          mockupMimeType: "",
          mockupSrc: "",
          results: [],
          simulations: [],
          screenshotUrl: "",
          url: "",
          reportVisible: false,
          simulationsVisible: false
        };
      }
    });
  }

  // Listen for window focus changes (switching browser windows)
  chrome.windows.onFocusChanged.addListener((windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) return;
    chrome.tabs.query({ active: true, windowId: windowId }, ([activeTab]) => {
      if (activeTab && activeTab.id !== currentTabId) {
        // Save current active tab state before switching
        saveCurrentTabState();
        currentTabId = activeTab.id;
        
        // Initialize new tab state structure in memory if not exists
        if (!tabStates[currentTabId]) {
          tabStates[currentTabId] = {
            specs: "",
            mockupBase64: "",
            mockupMimeType: "",
            mockupSrc: "",
            results: [],
            simulations: [],
            screenshotUrl: "",
            url: activeTab.url || "",
            reportVisible: false,
            simulationsVisible: false
          };
        }
        
        loadTabState(currentTabId);
      }
    });
  });

  // Listen for tab activation (switching tabs in the same window)
  chrome.tabs.onActivated.addListener((activeInfo) => {
    // 1. Save state of the tab we are leaving
    saveCurrentTabState();
    
    // 2. Switch current tab ID
    currentTabId = activeInfo.tabId;
    
    // 3. Load state of the new tab
    if (!tabStates[currentTabId]) {
      chrome.tabs.get(currentTabId, (tab) => {
        tabStates[currentTabId] = {
          specs: "",
          mockupBase64: "",
          mockupMimeType: "",
          mockupSrc: "",
          results: [],
          simulations: [],
          screenshotUrl: "",
          url: tab ? tab.url : "",
          reportVisible: false,
          simulationsVisible: false
        };
        loadTabState(currentTabId);
      });
    } else {
      loadTabState(currentTabId);
    }
  });

  // Listen for tab URL updates (navigating to a new page in the active tab)
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Only care about the active tab updates to prevent background tabs from overwriting active state
    if (tabId === currentTabId && changeInfo.url) {
      const oldState = tabStates[tabId];
      const newUrl = changeInfo.url;
      
      if (oldState) {
        // Update URL but DO NOT clear/delete the specs or mockup results.
        // We preserve specifications and baseline results for maximum UX convenience.
        oldState.url = newUrl;
        saveCurrentTabState();
      } else {
        // Initialize new state if completely empty
        tabStates[tabId] = {
          specs: "",
          mockupBase64: "",
          mockupMimeType: "",
          mockupSrc: "",
          results: [],
          simulations: [],
          screenshotUrl: "",
          url: newUrl,
          reportVisible: false,
          simulationsVisible: false
        };
        saveCurrentTabState();
      }
    }
  });
});
