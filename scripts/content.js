// content.js - Scrapes page inputs, attributes, and key texts to send to the side panel

if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "scrapeDOM") {
      try {
        const data = extractDOMData();
        sendResponse({ success: true, data: data });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    } else if (request.action === "runSimulation") {
      try {
        simulateValidationFlow();
        // Wait 800ms for animations and network requests to complete, then return scraped DOM & network logs
        setTimeout(() => {
          try {
            const data = extractDOMData();
            sendResponse({ success: true, data: data });
          } catch (innerErr) {
            sendResponse({ success: false, error: innerErr.message });
          }
        }, 800);
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    } else if (request.action === "runSimulationSteps") {
      executeSteps(request.steps, request.expectedWarningText)
        .then((result) => {
          sendResponse({ success: true, result: result });
        })
        .catch((error) => {
          sendResponse({ success: false, error: error.message });
        });
    }
    return true; // Keeps the message channel open for async response
  });
}

/**
 * Recursively queries elements including those hidden inside Shadow DOM.
 */
function queryElementsIncludingShadows(root, selectors) {
  const elements = [];
  
  // Find all elements matching the selector inside the current root
  const found = root.querySelectorAll(selectors);
  found.forEach(el => elements.push(el));
  
  // Find all elements that have a shadowRoot
  const allElements = root.querySelectorAll("*");
  allElements.forEach(el => {
    if (el.shadowRoot) {
      elements.push(...queryElementsIncludingShadows(el.shadowRoot, selectors));
    }
  });
  
  return elements;
}

/**
 * Scrapes form elements, validation properties, and headings from the page.
 */
function extractDOMData() {
  // Query network logs from MAIN world via synchronous CustomEvents
  let networkLogs = [];
  const receiveLogs = (e) => {
    networkLogs = e.detail;
  };
  window.addEventListener("VisualVerifyResponseNetworkLogs", receiveLogs, { once: true });
  window.dispatchEvent(new CustomEvent("VisualVerifyRequestNetworkLogs"));

  const result = {
    url: window.location.href,
    title: document.title,
    inputs: [],
    buttons: [],
    headings: [],
    networkLogs: networkLogs
  };

  // 1. Scrape inputs, textareas, and selects including Shadow DOM
  const inputElements = queryElementsIncludingShadows(document, "input, textarea, select");
  inputElements.forEach((el) => {
    if (el.type === "hidden") return; // Skip hidden inputs to keep JSON payload clean

    // Find associated label text if any
    let labelText = "";
    if (el.id) {
      const labelEl = document.querySelector(`label[for="${el.id}"]`);
      if (labelEl) {
        labelText = labelEl.textContent.replace(/\s+/g, " ").trim();
      }
    }
    if (!labelText) {
      const parentLabel = el.closest("label");
      if (parentLabel) {
        labelText = parentLabel.textContent.replace(/\s+/g, " ").trim();
      }
    }

    result.inputs.push({
      id: el.id || null,
      name: el.name || null,
      tagName: el.tagName.toLowerCase(),
      type: el.type || null,
      placeholder: el.placeholder || null,
      required: el.required || false,
      maxLength: el.maxLength !== -1 && el.maxLength !== 524288 ? el.maxLength : null, // 524288 is default browser max
      minLength: el.minLength !== -1 ? el.minLength : null,
      pattern: el.pattern || null,
      disabled: el.disabled || false,
      labelText: labelText || null,
      value: el.value || ""
    });
  });

  // 2. Scrape buttons including Shadow DOM
  const buttonElements = queryElementsIncludingShadows(document, "button, input[type='submit'], input[type='button']");
  buttonElements.forEach((el) => {
    result.buttons.push({
      id: el.id || null,
      tagName: el.tagName.toLowerCase(),
      type: el.type || "button",
      text: el.textContent.replace(/\s+/g, " ").trim() || el.value || null,
      disabled: el.disabled || false
    });
  });

  // 3. Scrape visible headings (h1, h2, h3) including Shadow DOM
  const headingElements = queryElementsIncludingShadows(document, "h1, h2, h3");
  headingElements.forEach((el) => {
    const text = el.textContent.replace(/\s+/g, " ").trim();
    if (text) {
      result.headings.push({
        tagName: el.tagName.toLowerCase(),
        text: text
      });
    }
  });

  return result;
}

/**
 * Automates form field injection with boundary-violating/invalid inputs
 * and triggers a programmatic click event on the submit button.
 */
function simulateValidationFlow() {
  const emailInput = document.querySelector('input[type="email"], input[name*="email" i], input[id*="email" i]');
  const passwordInput = document.querySelector('input[type="password"], input[name*="password" i], input[id*="password" i]');
  const userIdInput = document.querySelector('input[type="text"][id*="user" i], input[type="text"][name*="user" i], input[type="text"][id*="id" i]');

  if (emailInput) {
    emailInput.value = "invalid_email_format";
    emailInput.dispatchEvent(new Event("input", { bubbles: true }));
    emailInput.dispatchEvent(new Event("change", { bubbles: true }));
  }
  
  if (passwordInput) {
    passwordInput.value = "too_long_password_exceeding_16_characters_limit";
    passwordInput.dispatchEvent(new Event("input", { bubbles: true }));
    passwordInput.dispatchEvent(new Event("change", { bubbles: true }));
  }

  if (userIdInput) {
    userIdInput.value = "user_id_too_long_exceeding_limit";
    userIdInput.dispatchEvent(new Event("input", { bubbles: true }));
    userIdInput.dispatchEvent(new Event("change", { bubbles: true }));
  }

  const submitBtn = document.querySelector('button[type="submit"], input[type="submit"], button#submitBtn, form button');
  if (submitBtn) {
    submitBtn.click();
  }
}

/**
 * Executes dynamic, step-based simulation actions and returns the results.
 */
async function executeSteps(steps, expectedWarningText) {
  // 1. Clear network logs in MAIN world
  window.dispatchEvent(new CustomEvent("VisualVerifyClearNetworkLogs"));
  await new Promise((resolve) => setTimeout(resolve, 50));

  // 2. Run steps sequentially
  if (Array.isArray(steps)) {
    for (const step of steps) {
      try {
        if (step.action === "fill") {
          const el = document.querySelector(step.selector);
          if (el) {
            el.value = step.value;
            el.dispatchEvent(new Event("input", { bubbles: true }));
            el.dispatchEvent(new Event("change", { bubbles: true }));
            el.dispatchEvent(new Event("blur", { bubbles: true }));
          } else {
            console.warn("Element not found for selector:", step.selector);
          }
        } else if (step.action === "click") {
          const el = document.querySelector(step.selector);
          if (el) {
            el.click();
          } else {
            console.warn("Element not found for selector:", step.selector);
          }
        }
      } catch (err) {
        console.error("Failed to execute simulation step:", step, err);
      }
      // Small delay between steps
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  // 3. Wait 800ms for network requests and DOM rendering to complete
  await new Promise((resolve) => setTimeout(resolve, 800));

  // 4. Query network logs from MAIN world
  let networkLogs = [];
  const receiveLogs = (e) => {
    networkLogs = e.detail;
  };
  window.addEventListener("VisualVerifyResponseNetworkLogs", receiveLogs, { once: true });
  window.dispatchEvent(new CustomEvent("VisualVerifyRequestNetworkLogs"));

  // Wait a brief moment for the synchronous CustomEvent response to register
  await new Promise((resolve) => setTimeout(resolve, 50));

  // 5. Check if expected warning text exists in the page
  let warningTextFound = false;
  if (expectedWarningText) {
    warningTextFound = searchWarningInDOM(expectedWarningText);
  }

  return {
    networkLogs: networkLogs,
    warningTextFound: warningTextFound
  };
}

/**
 * Searches the DOM (including visible body text and shadow root content) for warning text.
 */
function searchWarningInDOM(text) {
  if (!text) return false;
  const lowercaseText = text.toLowerCase();
  
  // A. Check innerText of body
  const bodyText = document.body.innerText || "";
  if (bodyText.toLowerCase().includes(lowercaseText)) {
    return true;
  }

  // B. Check elements containing text or alerts, including those in Shadow DOM
  const elements = queryElementsIncludingShadows(document, "div, span, p, label, li, a, h1, h2, h3, h4, h5, h6");
  for (const el of elements) {
    if (el.textContent && el.textContent.toLowerCase().includes(lowercaseText)) {
      // Check if it's visible
      const style = window.getComputedStyle(el);
      if (style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0") {
        return true;
      }
    }
  }

  return false;
}

