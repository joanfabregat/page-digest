const radios = document.querySelectorAll('input[name="provider"]');
const status = document.getElementById('status');

// Load saved provider
chrome.storage.sync.get(['provider'], (result) => {
  const provider = result.provider || 'chatgpt';
  const radio = document.querySelector(`input[value="${provider}"]`);
  if (radio) {
    radio.checked = true;
  }
});

// Save on change
radios.forEach(radio => {
  radio.addEventListener('change', (e) => {
    const provider = e.target.value;
    chrome.storage.sync.set({ provider }, () => {
      showStatus('Settings saved!');
    });
  });
});

function showStatus(message, isError = false) {
  if (!status) return;
  status.textContent = message;
  status.className = `status ${isError ? 'error' : ''}`;
  status.classList.remove('hidden');

  setTimeout(() => {
    if (status) status.classList.add('hidden');
  }, 2000);
}
