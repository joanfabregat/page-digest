const MAX_CHARS = 25000;

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
  // First, execute the bundle which stores result in window.__pageDigestResult__
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['dist/content.bundle.js']
  });

  // Then retrieve the result from the global variable
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => window.__pageDigestResult__
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

    // Prepare content (truncate if needed)
    let content = article.content;
    let truncated = false;

    if (content.length > MAX_CHARS) {
      content = content.substring(0, MAX_CHARS);
      truncated = true;
    }

    showInfo(content.length, truncated);

    // Step 2: Send to background script for ChatGPT injection
    setStatus('Opening ChatGPT...', 'opening');

    chrome.runtime.sendMessage({
      action: 'summarize',
      article: {
        title: article.title,
        url: article.url,
        content: content
      }
    });

    setStatus('Done! Check the ChatGPT tab.', 'done');

  } catch (error) {
    setStatus(`Error: ${error.message}`, 'error');
  } finally {
    btn.disabled = false;
  }
}

btn.addEventListener('click', summarize);
