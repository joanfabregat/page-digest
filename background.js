const CHATGPT_SUMMARIZER_URL = 'https://chatgpt.com/g/g-6JOD1U2Xp-summarizer';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'summarize') {
    handleSummarize(message.article);
    sendResponse({ started: true });
  }
  return true;
});

async function handleSummarize(article) {
  console.log('[PageDigest] Background: Starting summarize flow');

  // Open ChatGPT tab
  const chatGPTTab = await chrome.tabs.create({ url: CHATGPT_SUMMARIZER_URL });
  console.log('[PageDigest] Background: Opened ChatGPT tab:', chatGPTTab.id);

  // Wait for page to load and inject text
  const textToSend = `Please summarize this article:\n\nTitle: ${article.title}\nURL: ${article.url}\n\n${article.content}`;

  // Poll until the page is ready
  let attempts = 0;
  const maxAttempts = 20;
  let injected = false;

  while (attempts < maxAttempts && !injected) {
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      console.log('[PageDigest] Background: Injection attempt', attempts + 1);
      const result = await injectIntoChatGPT(chatGPTTab.id, textToSend);
      console.log('[PageDigest] Background: Injection result:', result);
      if (result?.success) {
        injected = true;
      }
    } catch (e) {
      console.log('[PageDigest] Background: Injection attempt failed:', e.message);
    }

    attempts++;
  }

  if (injected) {
    console.log('[PageDigest] Background: Injection successful, clicking submit');
    await clickSubmitButton(chatGPTTab.id);
  } else {
    console.error('[PageDigest] Background: Failed to inject after', maxAttempts, 'attempts');
  }
}

async function injectIntoChatGPT(tabId, text) {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: (textToInject) => {
      const editor = document.querySelector('#prompt-textarea');

      if (!editor) {
        return { success: false, error: 'Could not find ChatGPT input field' };
      }

      // ProseMirror editors need direct content manipulation
      editor.focus();

      // Clear existing content and set new text
      const p = document.createElement('p');
      p.textContent = textToInject;
      editor.innerHTML = '';
      editor.appendChild(p);

      // Trigger input event to notify ProseMirror of the change
      editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));

      return { success: true };
    },
    args: [text]
  });

  return results[0]?.result;
}

async function clickSubmitButton(tabId) {
  for (let attempt = 0; attempt < 5; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 500));

    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const selectors = [
          'button[data-testid="send-button"]',
          'button[aria-label="Send prompt"]',
          'form button[type="submit"]'
        ];

        for (const selector of selectors) {
          const button = document.querySelector(selector);
          if (button && !button.disabled) {
            button.click();
            return { success: true };
          }
        }

        return { success: false, error: 'Button not ready' };
      }
    });

    if (results[0]?.result?.success) {
      return results[0].result;
    }
  }

  return { success: false, error: 'Could not find or click submit button' };
}
