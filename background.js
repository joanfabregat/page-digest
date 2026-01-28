const MAX_CHARS = 25000;

const SYSTEM_PROMPT = `Summarize this article concisely. Keep the same language as the source. Use bullet points for key takeaways. Be brief but don't miss critical information.`;

// Check if a URL is accessible by the extension
function isAccessibleUrl(url) {
  if (!url) return false;
  return !url.startsWith('chrome://') &&
         !url.startsWith('chrome-extension://') &&
         !url.startsWith('about:') &&
         !url.startsWith('edge://') &&
         !url.startsWith('brave://') &&
         !url.startsWith('opera://') &&
         !url.startsWith('vivaldi://');
}

// Update extension icon state based on tab accessibility
async function updateIconState(tabId, url) {
  if (isAccessibleUrl(url)) {
    await chrome.action.enable(tabId);
    await chrome.action.setTitle({
      tabId,
      title: 'Summarize this page'
    });
  } else {
    await chrome.action.disable(tabId);
    await chrome.action.setTitle({
      tabId,
      title: 'Cannot access this page type'
    });
  }
}

// Listen for tab updates to enable/disable icon
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status === 'complete') {
    updateIconState(tabId, tab.url);
  }
});

// Listen for tab activation to update icon state
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    updateIconState(activeInfo.tabId, tab.url);
  } catch (e) {
    // Tab might not exist anymore
  }
});

// Initialize icon state for all existing tabs on extension load
chrome.tabs.query({}).then(tabs => {
  for (const tab of tabs) {
    updateIconState(tab.id, tab.url);
  }
});

const LLM_CONFIGS = {
  chatgpt: {
    url: 'https://chatgpt.com/',
    inputSelector: '#prompt-textarea, div[contenteditable="true"][data-placeholder], div.ProseMirror[contenteditable="true"]',
    submitSelectors: [
      'button[data-testid="send-button"]',
      'button[aria-label="Send prompt"]',
      'button[aria-label="Send message"]',
      'form button[type="submit"]'
    ],
    injectMethod: 'chatgpt'
  },
  gemini: {
    url: 'https://gemini.google.com/app',
    inputSelector: '.ql-editor[contenteditable="true"], div[contenteditable="true"][aria-label*="prompt"], rich-textarea .ql-editor, div[contenteditable="true"].ql-editor',
    submitSelectors: [
      'button[aria-label="Send message"]',
      'button.send-button',
      'button[data-test-id="send-button"]',
      'button[mattooltip="Send message"]'
    ],
    injectMethod: 'contenteditable'
  },
  claude: {
    url: 'https://claude.ai/new',
    inputSelector: 'div[contenteditable="true"].ProseMirror, div[contenteditable="true"][data-placeholder], div.ProseMirror',
    submitSelectors: [
      'button[aria-label="Send Message"]',
      'button[aria-label="Send message"]',
      'button[type="button"]:has(svg)',
      'fieldset button',
      'form button[type="submit"]',
      'div[data-testid="composer"] button'
    ],
    injectMethod: 'prosemirror'
  }
};

// Listen for extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  console.log('[PageDigest] Extension clicked on tab:', tab.id, tab.url);

  // Check if we can access this tab
  if (!isAccessibleUrl(tab.url)) {
    console.error('[PageDigest] Cannot access this page type:', tab.url);
    return;
  }

  try {
    // Extract content from the current page
    const article = await extractContent(tab.id);

    if (!article || !article.content) {
      console.error('[PageDigest] Could not extract content from page');
      return;
    }

    // Check content quality and ask for confirmation if poor
    if (article.quality === 'poor') {
      const confirmed = await showConfirmDialog(tab.id, article.qualityReason);
      if (!confirmed) {
        console.log('[PageDigest] User cancelled due to poor content quality');
        return;
      }
    }

    // Get the configured provider
    const { provider = 'chatgpt' } = await chrome.storage.sync.get(['provider']);
    console.log('[PageDigest] Using provider:', provider);

    // Prepare content
    let content = article.content;
    if (content.length > MAX_CHARS) {
      content = content.substring(0, MAX_CHARS);
    }

    // Send to LLM
    await handleSummarize(provider, {
      title: article.title,
      url: article.url,
      content: content
    });

  } catch (error) {
    console.error('[PageDigest] Error:', error.message);

    // Show user-friendly error notification
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (errorMsg) => {
          alert(`Page Digest Error:\n\n${errorMsg}\n\nThis may happen on pages with paywalls or dynamic content. Try refreshing the page and waiting for it to fully load.`);
        },
        args: [error.message]
      });
    } catch (e) {
      // Couldn't show alert, just log it
      console.error('[PageDigest] Could not show error to user:', e.message);
    }
  }
});

async function showConfirmDialog(tabId, reason) {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: (reasonText) => {
      return confirm(
        `Page Digest: Limited content detected\n\n` +
        `Reason: ${reasonText}\n\n` +
        `The summary quality may be affected. Continue anyway?`
      );
    },
    args: [reason]
  });

  return results[0]?.result === true;
}

async function extractContent(tabId) {
  const maxRetries = 3;
  let lastError = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log('[PageDigest] Retry attempt', attempt + 1);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Check if tab still exists
      const tab = await chrome.tabs.get(tabId).catch(() => null);
      if (!tab) {
        throw new Error('Tab no longer exists');
      }

      console.log('[PageDigest] Sending message to content script...');

      // Try to send message to content script (which is already injected via manifest)
      const result = await chrome.tabs.sendMessage(tabId, { action: 'extractContent' })
        .catch(async (err) => {
          // Content script might not be loaded yet, try injecting it
          console.log('[PageDigest] Content script not ready, injecting...', err.message);

          await chrome.scripting.executeScript({
            target: { tabId },
            files: ['dist/content.bundle.js']
          });

          // Wait for script to initialize
          await new Promise(resolve => setTimeout(resolve, 300));

          // Try sending message again
          return chrome.tabs.sendMessage(tabId, { action: 'extractContent' });
        });

      console.log('[PageDigest] Got response from content script');
      return result;

    } catch (error) {
      lastError = error;
      console.log('[PageDigest] Extraction attempt failed:', error.message);

      // Retry on communication errors
      if (error.message.includes('Receiving end does not exist') ||
          error.message.includes('Frame') ||
          error.message.includes('frame') ||
          error.message.includes('Could not establish connection')) {
        continue;
      }

      // For other errors, don't retry
      throw error;
    }
  }

  throw lastError || new Error('Failed to extract content after retries');
}

async function handleSummarize(provider, article) {
  const config = LLM_CONFIGS[provider];
  if (!config) {
    console.error('[PageDigest] Unknown provider:', provider);
    return;
  }

  console.log('[PageDigest] Starting summarize flow with', provider);

  // Open LLM tab
  const llmTab = await chrome.tabs.create({ url: config.url });
  console.log('[PageDigest] Opened', provider, 'tab:', llmTab.id);

  // Prepare the text with system prompt
  const textToSend = `${SYSTEM_PROMPT}

---
Title: ${article.title}
Source: ${article.url}
---

${article.content}`;

  // Poll until the page is ready and inject text
  let attempts = 0;
  const maxAttempts = 30;
  let injected = false;

  while (attempts < maxAttempts && !injected) {
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      console.log('[PageDigest] Injection attempt', attempts + 1);
      const result = await injectIntoLLM(llmTab.id, textToSend, config);
      console.log('[PageDigest] Injection result:', result);
      if (result?.success) {
        injected = true;
      }
    } catch (e) {
      console.log('[PageDigest] Injection attempt failed:', e.message);
    }

    attempts++;
  }

  if (injected) {
    console.log('[PageDigest] Injection successful, clicking submit');
    // Wait a bit for the editor to settle
    await new Promise(resolve => setTimeout(resolve, 500));
    await clickSubmitButton(llmTab.id, config.submitSelectors);
  } else {
    console.error('[PageDigest] Failed to inject after', maxAttempts, 'attempts');
  }
}

async function injectIntoLLM(tabId, text, config) {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: (textToInject, inputSelector, injectMethod) => {
      // Try each selector
      const selectors = inputSelector.split(', ');
      let editor = null;

      for (const selector of selectors) {
        editor = document.querySelector(selector.trim());
        if (editor) break;
      }

      if (!editor) {
        return { success: false, error: 'Could not find input field' };
      }

      editor.focus();

      if (injectMethod === 'chatgpt') {
        // ChatGPT uses ProseMirror
        const p = document.createElement('p');
        p.textContent = textToInject;
        editor.innerHTML = '';
        editor.appendChild(p);
        editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
        editor.dispatchEvent(new Event('input', { bubbles: true }));
        editor.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: textToInject }));
      } else if (injectMethod === 'prosemirror') {
        // ProseMirror editors (Claude)
        const p = document.createElement('p');
        p.textContent = textToInject;
        editor.innerHTML = '';
        editor.appendChild(p);

        // Dispatch multiple events to ensure the editor picks up the change
        editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
        editor.dispatchEvent(new Event('input', { bubbles: true }));
        editor.dispatchEvent(new Event('change', { bubbles: true }));

        // Focus at the end
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      } else if (injectMethod === 'contenteditable') {
        // Contenteditable divs (Gemini)
        editor.innerHTML = '';
        const p = document.createElement('p');
        p.textContent = textToInject;
        editor.appendChild(p);
        editor.dispatchEvent(new Event('input', { bubbles: true }));
        editor.dispatchEvent(new Event('change', { bubbles: true }));
      }

      return { success: true };
    },
    args: [text, config.inputSelector, config.injectMethod]
  });

  return results[0]?.result;
}

async function clickSubmitButton(tabId, selectors) {
  for (let attempt = 0; attempt < 15; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 500));

    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: (submitSelectors) => {
        for (const selector of submitSelectors) {
          try {
            const buttons = document.querySelectorAll(selector);
            for (const button of buttons) {
              // Check if button is visible and not disabled
              const style = window.getComputedStyle(button);
              const isVisible = style.display !== 'none' && style.visibility !== 'hidden' && button.offsetParent !== null;

              if (isVisible && !button.disabled) {
                button.click();
                return { success: true, selector };
              }
            }
          } catch (e) {
            // Selector might be invalid, continue
          }
        }
        return { success: false, error: 'Button not ready' };
      },
      args: [selectors]
    });

    if (results[0]?.result?.success) {
      console.log('[PageDigest] Clicked submit with selector:', results[0].result.selector);
      return results[0].result;
    }
  }

  return { success: false, error: 'Could not find or click submit button' };
}
