// interceptor.js - Runs in MAIN world, overrides fetch and XHR to capture API traffic

(function() {
  if (window.__visualVerifyInterceptorInitialized) return;
  window.__visualVerifyInterceptorInitialized = true;
  window.__visualVerifyNetworkLogs = [];

  // 1. Intercept Fetch API
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const url = args[0];
    const options = args[1] || {};
    const method = options.method || "GET";
    const requestLog = {
      type: "fetch",
      url: typeof url === "string" ? url : (url.url || String(url)),
      method: method,
      payload: null,
      timestamp: new Date().toISOString()
    };

    if (options.body) {
      try {
        if (typeof options.body === "string") {
          requestLog.payload = JSON.parse(options.body);
        } else {
          requestLog.payload = "[Non-JSON or Binary Body]";
        }
      } catch (e) {
        requestLog.payload = String(options.body);
      }
    }

    try {
      const response = await originalFetch(...args);
      const clonedResponse = response.clone();
      requestLog.status = response.status;
      
      try {
        const text = await clonedResponse.text();
        try {
          requestLog.response = JSON.parse(text);
        } catch (e) {
          requestLog.response = text.substring(0, 1000); // Truncate long non-JSON response bodies
        }
      } catch (e) {
        requestLog.response = "[Error Reading Body]";
      }

      window.__visualVerifyNetworkLogs.push(requestLog);
      return response;
    } catch (error) {
      requestLog.status = "Error";
      requestLog.response = error.message;
      window.__visualVerifyNetworkLogs.push(requestLog);
      throw error;
    }
  };

  // 2. Intercept XMLHttpRequest
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    this.__visualVerifyRequestDetails = {
      type: "xhr",
      url: url,
      method: method,
      timestamp: new Date().toISOString()
    };
    return originalOpen.apply(this, [method, url, ...args]);
  };

  XMLHttpRequest.prototype.send = function(body) {
    const details = this.__visualVerifyRequestDetails;
    if (details) {
      if (body) {
        try {
          if (typeof body === "string") {
            details.payload = JSON.parse(body);
          } else {
            details.payload = "[Non-JSON Body]";
          }
        } catch (e) {
          details.payload = String(body);
        }
      }
      
      this.addEventListener("load", function() {
        details.status = this.status;
        try {
          details.response = JSON.parse(this.responseText);
        } catch (e) {
          details.response = this.responseText.substring(0, 1000);
        }
        window.__visualVerifyNetworkLogs.push(details);
      });

      this.addEventListener("error", function(err) {
        details.status = "Error";
        details.response = err.message || "Network error";
        window.__visualVerifyNetworkLogs.push(details);
      });
    }
    return originalSend.apply(this, [body]);
  };

  // 3. Listener to communicate with ISOLATED world content script
  window.addEventListener("VisualVerifyRequestNetworkLogs", () => {
    const responseEvent = new CustomEvent("VisualVerifyResponseNetworkLogs", {
      detail: window.__visualVerifyNetworkLogs
    });
    window.dispatchEvent(responseEvent);
  });

  window.addEventListener("VisualVerifyClearNetworkLogs", () => {
    window.__visualVerifyNetworkLogs = [];
  });

  console.log("VisualVerify Network Interceptor Injected successfully.");
})();
