// interceptor.js - Runs in MAIN world, overrides fetch and XHR to capture API traffic

(function() {
  if (window.__visualVerifyInterceptorInitialized) return;
  window.__visualVerifyInterceptorInitialized = true;
  window.__visualVerifyNetworkLogs = [];

  // Helper to parse complex request bodies (FormData, URLSearchParams, JSON, binary)
  function parseRequestBody(body) {
    if (!body) return null;
    try {
      if (typeof body === "string") {
        try {
          return JSON.parse(body);
        } catch (e) {
          // Check if it's a URL-encoded query string
          if (body.includes("=") && !body.includes("{")) {
            const params = new URLSearchParams(body);
            return Object.fromEntries(params.entries());
          }
          return body;
        }
      }
      if (body instanceof URLSearchParams) {
        return Object.fromEntries(body.entries());
      }
      if (body instanceof FormData) {
        const data = {};
        body.forEach((value, key) => {
          if (value instanceof File) {
            data[key] = `[File: ${value.name} (${value.size} bytes)]`;
          } else {
            data[key] = value;
          }
        });
        return data;
      }
      if (body instanceof Blob) {
        return `[Blob: ${body.type} (${body.size} bytes)]`;
      }
      if (body instanceof ArrayBuffer) {
        return `[ArrayBuffer: (${body.byteLength} bytes)]`;
      }
      return String(body);
    } catch (err) {
      return "[Failed to Parse Payload]";
    }
  }

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
      requestLog.payload = parseRequestBody(options.body);
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
        details.payload = parseRequestBody(body);
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
