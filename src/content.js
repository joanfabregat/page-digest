import { Readability } from '@mozilla/readability';

function extractTextFromHtml(html) {
  // Create a temporary element to extract text with proper spacing
  const temp = document.createElement('div');
  temp.innerHTML = html;

  // Walk through all elements and ensure block elements have spacing
  const blockTags = ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'TR', 'BR', 'BLOCKQUOTE', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'TD', 'TH'];

  function addSpacing(element) {
    // Convert to static array to avoid infinite loop when modifying live NodeList
    const children = Array.from(element.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        if (blockTags.includes(child.tagName)) {
          // Add newline before block elements
          child.insertAdjacentText('beforebegin', '\n');
        }
        addSpacing(child);
      }
    }
  }

  addSpacing(temp);

  // Get text and clean up excessive whitespace
  let text = temp.innerText || temp.textContent;

  // Replace multiple newlines with double newline (paragraph break)
  text = text.replace(/\n{3,}/g, '\n\n');

  // Replace multiple spaces with single space
  text = text.replace(/[ \t]+/g, ' ');

  // Trim lines
  text = text.split('\n').map(line => line.trim()).join('\n');

  // Remove empty lines at start/end
  text = text.trim();

  return text;
}

function extractArticle() {
  try {
    const documentClone = document.cloneNode(true);
    const reader = new Readability(documentClone);
    const article = reader.parse();

    const fallbackContent = document.body.innerText;
    const usedFallback = !article || !article.content;

    // Use our custom extraction to get properly spaced text
    const content = usedFallback
      ? fallbackContent
      : extractTextFromHtml(article.content);

    // Determine quality
    let quality = 'good';
    let qualityReason = null;

    if (usedFallback) {
      quality = 'poor';
      qualityReason = 'Could not extract article structure';
    } else if (content.length < 500) {
      quality = 'poor';
      qualityReason = 'Very little content found';
    } else if (content.length < 1000) {
      quality = 'medium';
      qualityReason = 'Limited content extracted';
    }

    return {
      success: true,
      title: article?.title || document.title,
      content: content,
      url: window.location.href,
      byline: article?.byline || null,
      length: content.length,
      quality: quality,
      qualityReason: qualityReason
    };
  } catch (error) {
    // Fallback if Readability fails completely
    const content = document.body.innerText;
    return {
      success: true,
      title: document.title,
      content: content,
      url: window.location.href,
      byline: null,
      length: content.length,
      quality: 'poor',
      qualityReason: 'Extraction failed, using raw page text'
    };
  }
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractContent') {
    try {
      const result = extractArticle();
      sendResponse(result);
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }
  return true; // Keep the message channel open for async response
});
