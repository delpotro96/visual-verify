const { chromium } = require('playwright');
const path = require('path');

(async () => {
  console.log("Starting headless extension test...");

  const extensionPath = path.resolve(__dirname, '..');
  console.log(`Loading extension from: ${extensionPath}`);

  // Launch browser with the extension loaded
  const browserContext = await chromium.launchPersistentContext('', {
    headless: false, // Chrome extensions only work in non-headless mode in Playwright
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });

  const page = await browserContext.newPage();

  // Handle console errors in the main test page
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[Browser Console Error]: ${msg.text()}`);
    }
  });

  page.on('pageerror', err => {
    console.log(`[Browser Page Error]: ${err.toString()}`);
  });

  try {
    // 1. Find Extension ID by visiting chrome://extensions
    console.log("Navigating to chrome://extensions to find the Extension ID...");
    const extensionsPage = await browserContext.newPage();
    await extensionsPage.goto('chrome://extensions/');
    await extensionsPage.waitForTimeout(2000); // Wait for extensions to load

    // Read the Extension ID
    // In chrome://extensions, the extension info is inside a shadow DOM
    const extensionId = await extensionsPage.evaluate(() => {
      // Find extensions-manager shadow host
      const manager = document.querySelector('extensions-manager');
      if (!manager) return null;
      
      const itemList = manager.shadowRoot.querySelector('extensions-item-list');
      if (!itemList) return null;
      
      const items = itemList.shadowRoot.querySelectorAll('extensions-item');
      for (const item of items) {
        const nameEl = item.shadowRoot.querySelector('#name');
        if (nameEl && nameEl.textContent.includes('VisualVerify')) {
          return item.id;
        }
      }
      return null;
    });

    console.log(`Found Extension ID: ${extensionId}`);
    if (!extensionId) {
      throw new Error("Could not find VisualVerify extension ID on chrome://extensions page.");
    }

    // 2. Open the Sidepanel HTML page directly to verify it loads without errors
    console.log("Opening sidepanel page directly to inspect console...");
    const sidepanelPage = await browserContext.newPage();
    
    // Listen for errors in sidepanel
    let sidepanelErrors = [];
    sidepanelPage.on('console', msg => {
      if (msg.type() === 'error') {
        sidepanelErrors.push(`Console: ${msg.text()}`);
      }
    });
    sidepanelPage.on('pageerror', err => {
      sidepanelErrors.push(`PageError: ${err.message}`);
    });

    await sidepanelPage.goto(`chrome-extension://${extensionId}/sidepanel/sidepanel.html`);
    await sidepanelPage.waitForTimeout(2000); // Wait for load and scripts initialization

    // Check if key UI components are loaded
    const titleVisible = await sidepanelPage.isVisible('.logo-text');
    const inputVisible = await sidepanelPage.isVisible('#spec-input');
    const auditBtnVisible = await sidepanelPage.isVisible('#verify-btn');

    console.log(`--- Sidepanel Status ---`);
    console.log(`Logo Title Visible: ${titleVisible}`);
    console.log(`Specification Input Visible: ${inputVisible}`);
    console.log(`Audit Button Visible: ${auditBtnVisible}`);
    
    if (sidepanelErrors.length > 0) {
      console.log(`❌ Sidepanel has JavaScript errors:`);
      sidepanelErrors.forEach(err => console.log(` - ${err}`));
    } else {
      console.log(`✅ Sidepanel loaded successfully with ZERO JavaScript errors!`);
    }

    // 3. Open test sandbox page and verify injection
    console.log("Opening test page...");
    const testPagePath = path.resolve(__dirname, 'test_page.html');
    await page.goto(`file://${testPagePath}`);
    await page.waitForTimeout(1000);

    console.log("Injecting content.js and testing DOM scraper function...");
    const scraperResult = await page.evaluate(() => {
      // Check if extractDOMData is available or inject/run it manually to verify
      if (typeof extractDOMData === 'function') {
        return { success: true, data: extractDOMData() };
      }
      return { success: false, error: "extractDOMData function not found in context" };
    });

    // If not found, let's manually inject the content script code to test if it runs without syntax errors
    if (!scraperResult.success) {
      console.log("Function not loaded yet (expected for file:// url without explicit settings). Manual evaluation to test syntax...");
      // Let's read the content script file content and evaluate it
      const fs = require('fs');
      const contentScriptCode = fs.readFileSync(path.resolve(__dirname, '../scripts/content.js'), 'utf8');
      
      const evalResult = await page.evaluate((code) => {
        try {
          // Eval script to verify it has no syntax errors
          const fn = new Function(code + "\nreturn extractDOMData();");
          const data = fn();
          return { success: true, inputsCount: data.inputs.length, buttonsCount: data.buttons.length };
        } catch (e) {
          return { success: false, error: e.message };
        }
      }, contentScriptCode);

      if (evalResult.success) {
        console.log(`✅ content.js script syntax verified! Successfully scraped ${evalResult.inputsCount} inputs and ${evalResult.buttonsCount} buttons.`);
      } else {
        console.log(`❌ content.js execution error: ${evalResult.error}`);
      }
    }

  } catch (error) {
    console.error(`❌ Test execution failed: ${error.message}`);
  } finally {
    console.log("Closing test browser in 2 seconds...");
    await browserContext.close();
  }
})();
