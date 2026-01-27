import { Readability } from '@mozilla/readability';

function extractArticle() {
  try {
    const documentClone = document.cloneNode(true);
    const reader = new Readability(documentClone);
    const article = reader.parse();

    return {
      success: true,
      title: article?.title || document.title,
      content: article?.textContent || document.body.innerText,
      url: window.location.href,
      byline: article?.byline || null,
      length: article?.length || document.body.innerText.length
    };
  } catch (error) {
    // Fallback if Readability fails
    return {
      success: true,
      title: document.title,
      content: document.body.innerText,
      url: window.location.href,
      byline: null,
      length: document.body.innerText.length,
      fallback: true
    };
  }
}

// Execute and return result
extractArticle();
