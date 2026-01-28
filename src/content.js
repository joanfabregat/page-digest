import { Readability } from '@mozilla/readability';

function extractArticle() {
  try {
    const documentClone = document.cloneNode(true);
    const reader = new Readability(documentClone);
    const article = reader.parse();

    const fallbackContent = document.body.innerText;
    const usedFallback = !article || !article.textContent;
    const content = usedFallback ? fallbackContent : article.textContent;

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

// Execute and store result globally
window.__pageDigestResult__ = extractArticle();
