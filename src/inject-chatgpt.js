// This script is injected into the ChatGPT tab to insert text into the prompt

function injectText(text) {
  const editor = document.querySelector('#prompt-textarea');

  if (!editor) {
    return { success: false, error: 'Could not find ChatGPT input field' };
  }

  editor.focus();

  // Use execCommand for ProseMirror compatibility
  document.execCommand('insertText', false, text);

  // Trigger input event to ensure ChatGPT recognizes the change
  editor.dispatchEvent(new Event('input', { bubbles: true }));

  return { success: true };
}

function clickSubmit() {
  // Try multiple selectors in case ChatGPT changes their DOM
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

// These functions will be called via chrome.scripting.executeScript
