const CHATGPT_SUMMARIZER_URL = 'https://chatgpt.com/g/g-6JOD1U2Xp-summarizer';
const MAX_CHARS = 25000; // ChatGPT's approximate limit

const btn = document.getElementById('summarize-btn');
const status = document.getElementById('status');
const info = document.getElementById('info');
const charCount = document.getElementById('char-count');

function setStatus(message, type) {
  status.textContent = message;
  status.className = `status ${type}`;
  status.classList.remove('hidden');
}

function showInfo(chars, truncated) {
  const truncatedMsg = truncated ? ' (truncated)' : '';
  charCount.textContent = `${chars.toLocaleString()} characters extracted${truncatedMsg}`;
  info.classList.remove('hidden');
}

function hideInfo() {
  info.classList.add('hidden');
}

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function extractContent(tabId) {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    files: ['dist/content.bundle.js']
  });

  return results[0]?.result;
}

async function injectIntoChatGPT(tabId, text) {
  // Wait a bit for the page to fully load
  await new Promise(resolve => setTimeout(resolve, 2000));

  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: (textToInject) => {
      const editor = document.querySelector('#prompt-textarea');

      if (!editor) {
        return { success: false, error: 'Could not find ChatGPT input field' };
      }

      editor.focus();
      document.execCommand('insertText', false, textToInject);
      editor.dispatchEvent(new Event('input', { bubbles: true }));

      return { success: true };
    },
    args: [text]
  });

  return results[0]?.result;
}

async function clickSubmitButton(tabId) {
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

      return { success: false, error: 'Could not find submit button' };
    }
  });

  return results[0]?.result;
}

async function summarize() {
  btn.disabled = true;
  hideInfo();

  try {
    // Step 1: Get current tab and extract content
    setStatus('Extracting article content...', 'extracting');
    const tab = await getCurrentTab();
    const article = await extractContent(tab.id);

    if (!article || !article.content) {
      throw new Error('Could not extract content from page');
    }

    // Prepare the text to send
    let content = article.content;
    let truncated = false;

    if (content.length > MAX_CHARS) {
      content = content.substring(0, MAX_CHARS);
      truncated = true;
    }

    const textToSend = `Please summarize this article:\n\nTitle: ${article.title}\nURL: ${article.url}\n\n${content}`;

    showInfo(content.length, truncated);

    // Step 2: Open ChatGPT Summarizer
    setStatus('Opening ChatGPT Summarizer...', 'opening');
    const chatGPTTab = await chrome.tabs.create({ url: CHATGPT_SUMMARIZER_URL });

    // Step 3: Wait for page to load and inject text
    setStatus('Waiting for ChatGPT to load...', 'injecting');

    // Poll until the page is ready
    let attempts = 0;
    const maxAttempts = 20;
    let injected = false;

    while (attempts < maxAttempts && !injected) {
      await new Promise(resolve => setTimeout(resolve, 1000));

      try {
        const result = await injectIntoChatGPT(chatGPTTab.id, textToSend);
        if (result?.success) {
          injected = true;
        }
      } catch (e) {
        // Page might not be ready yet, keep trying
      }

      attempts++;
    }

    if (!injected) {
      throw new Error('Could not inject text into ChatGPT. Please make sure you are logged in.');
    }

    // Step 4: Auto-submit
    setStatus('Submitting...', 'injecting');
    await clickSubmitButton(chatGPTTab.id);

    setStatus('Done! Check the ChatGPT tab.', 'done');

  } catch (error) {
    setStatus(`Error: ${error.message}`, 'error');
  } finally {
    btn.disabled = false;
  }
}

btn.addEventListener('click', summarize);
