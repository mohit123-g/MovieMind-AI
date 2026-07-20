// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//     if (request.action === "EXTRACT_REVIEWS") {
//         // Immediately invoke the async function and tie it to sendResponse
//         (async () => {
//             try {
//                 const data = await extractIMDbReviews();
//                 sendResponse(data);
//             } catch (error) {
//                 console.error("MovieMind Extraction Error:", error);
//                 sendResponse({ movie_title: "Error", reviews: [] });
//             }
//         })();
//         return true; // Keeps channel open for the async closure above
//     }
//     else if (request.action === "INJECT_LABELS") {
//         injectLabels(request.predictions);
//         sendResponse({ success: true });
//     }
//     else if (request.action === "FILTER_REVIEWS") {
//         applyFilters(request.filter, request.category, request.mode);
//         sendResponse({ success: true });
//     }
//     return true;
// });

// async function extractIMDbReviews() {
//     const isMainPage = !window.location.href.includes('/reviews');
//     let targetDocument = document;
//     let reviewsUrl = window.location.href;
//     let htmlText = "";

//     // 1. Get Title from Document
//     let movieTitle = document.title;
//     if (movieTitle.includes('-')) movieTitle = movieTitle.split('-')[0].trim();
//     if (movieTitle.toLowerCase().includes('user reviews')) movieTitle = movieTitle.replace(/user reviews/ig, '').trim();

//     let reviews = [];

//     // 2. Background Fetch (If on main page)
//     if (isMainPage) {
//         try {
//             const baseUrl = window.location.origin + window.location.pathname.split('?')[0];
//             reviewsUrl = baseUrl.endsWith('/') ? baseUrl + 'reviews' : baseUrl + '/reviews';
//             const response = await fetch(reviewsUrl);
//             htmlText = await response.text();
//         } catch (error) {
//             console.error("MovieMind: Failed to background fetch reviews.", error);
//         }
//     }

//     // 3. Extract visible reviews on the Reviews page
//     if (!isMainPage) {
//         const reviewElements = document.querySelectorAll('.ipc-html-content-inner-div, .text.show-more__control');
//         reviewElements.forEach((el, index) => {
//             const id = `moviemind_rev_${index}`;
//             const container = el.closest('article') || el.closest('.review-container') || el.parentElement;
//             if (container) container.setAttribute('data-moviemind-id', id);

//             const text = el.innerText.trim();
//             if (text.length > 20) reviews.push({ id, text });
//         });
//     }

//     // 4. Extract from React JSON Data (If on main page)
//     if (isMainPage && htmlText) {
//         const nextDataMatch = htmlText.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/);
//         if (nextDataMatch) {
//             try {
//                 const nextDataStr = nextDataMatch[1];
//                 const reviewMatches = nextDataStr.match(/"originalText":"(.*?)"/g);
//                 if (reviewMatches) {
//                     reviewMatches.forEach((m, idx) => {
//                         let cleanText = m.replace(/"originalText":"|"/g, '').replace(/\\n/g, ' ');
//                         cleanText = cleanText.replace(/\\u([\d\w]{4})/gi, (m, grp) => String.fromCharCode(parseInt(grp, 16)));
//                         if (cleanText.length > 20) reviews.push({ id: `bg_nd_${idx}`, text: cleanText });
//                     });
//                 }
//             } catch(e) { console.error(e); }
//         }
//     }

//     // Return unique reviews
//     return {
//         movie_title: movieTitle || "Unknown Movie",
//         reviews: [...new Map(reviews.map(item => [item.text, item])).values()],
//         is_main_page: isMainPage,
//         reviews_url: reviewsUrl
//     };
// }

// function injectLabels(predictions) {
//     predictions.forEach(pred => {
//         const container = document.querySelector(`[data-moviemind-id="${pred.id}"]`);
//         if (!container || container.querySelector('.moviemind-label-container')) return;

//         const badgeDiv = document.createElement('div');
//         badgeDiv.className = 'moviemind-label-container';
//         badgeDiv.style.cssText = "margin-bottom: 10px; display: flex; gap: 8px;";

//         const sentimentBadge = document.createElement('span');
//         sentimentBadge.innerText = pred.sentiment === "Positive" ? "🟢 Positive" : "🔴 Negative";
//         sentimentBadge.style.cssText = `
//             padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px;
//             background: ${pred.sentiment === "Positive" ? "#e8f8f5" : "#fdedec"};
//             color: ${pred.sentiment === "Positive" ? "#117a65" : "#c0392b"};
//         `;

//         container.setAttribute('data-moviemind-sentiment', pred.sentiment.toLowerCase());
//         container.setAttribute('data-moviemind-vibe', pred.vibe.toLowerCase());

//         const vibeBadge = document.createElement('span');
//         vibeBadge.innerText = `🎭 ${pred.vibe}`;
//         vibeBadge.style.cssText = "padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px; background: #ebedef; color: #2c3e50;";

//         badgeDiv.appendChild(sentimentBadge);
//         badgeDiv.appendChild(vibeBadge);
//         container.prepend(badgeDiv);
//     });
// }

// function applyFilters(filterType, filterCategory, mode) {
//     const allReviews = document.querySelectorAll('[data-moviemind-sentiment]');

//     allReviews.forEach(review => {
//         // Reset styles first
//         review.style.display = "block";
//         review.style.opacity = "1";
//         review.style.filter = "none";
//         review.style.pointerEvents = "auto";

//         if (filterType !== "all") {
//             const reviewValue = review.getAttribute(`data-moviemind-${filterCategory}`);

//             if (reviewValue !== filterType.toLowerCase()) {
//                 if (mode === "hide") {
//                     review.style.display = "none";
//                 } else if (mode === "blur") {
//                     review.style.opacity = "0.4";
//                     review.style.filter = "blur(4px)";
//                     review.style.pointerEvents = "none"; // prevent clicking blurred reviews
//                 }
//             }
//         }
//     });
// }

// Helper function to pause execution


const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ==========================================
// CONFIGURATION
// ==========================================
const MAX_REVIEWS_LIMIT = 350; // Safely prevents V8/RAM crashes

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "INJECT_LABELS") {
    injectLabels(request.predictions);
    sendResponse({ success: true });
  } else if (request.action === "FILTER_REVIEWS") {
    applyFilters(request.filter, request.category, request.mode);
    sendResponse({ success: true });
  }
  return true;
});

function extractVisibleReviews(limit = MAX_REVIEWS_LIMIT) {
  let movieTitle = document.title;
  if (movieTitle.includes("-")) movieTitle = movieTitle.split("-")[0].trim();
  if (movieTitle.toLowerCase().includes("user reviews"))
    movieTitle = movieTitle.replace(/user reviews/gi, "").trim();

  let reviews = [];
  const reviewElements = document.querySelectorAll(
    ".ipc-html-content-inner-div, .text.show-more__control",
  );

  // CRITICAL FIX: Slice the NodeList to enforce the absolute maximum limit
  const limitedElements = Array.from(reviewElements).slice(0, limit);

  limitedElements.forEach((el, index) => {
    const id = `moviemind_rev_${index}`;
    const container =
      el.closest("article") ||
      el.closest(".review-container") ||
      el.parentElement;
    
    if (container) container.setAttribute("data-moviemind-id", id);

    const text = el.innerText.trim();
    if (text.length > 20) reviews.push({ id, text });
  });

  return {
    movie_title: movieTitle || "Unknown Movie",
    reviews: [...new Map(reviews.map((item) => [item.text, item])).values()],
  };
}

function injectLabels(predictions) {
  predictions.forEach((pred) => {
    const container = document.querySelector(
      `[data-moviemind-id="${pred.id}"]`,
    );
    if (!container || container.querySelector(".moviemind-label-container"))
      return;

    const badgeDiv = document.createElement("div");
    badgeDiv.className = "moviemind-label-container";
    badgeDiv.style.cssText = "margin-bottom: 10px; display: flex; gap: 8px;";

    const sentimentBadge = document.createElement("span");
    sentimentBadge.innerText =
      pred.sentiment === "Positive" ? "🟢 Positive" : "🔴 Negative";
    sentimentBadge.style.cssText = `
            padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px;
            background: ${pred.sentiment === "Positive" ? "#e8f8f5" : "#fdedec"};
            color: ${pred.sentiment === "Positive" ? "#117a65" : "#c0392b"};
        `;

    container.setAttribute(
      "data-moviemind-sentiment",
      pred.sentiment.toLowerCase(),
    );
    container.setAttribute("data-moviemind-vibe", pred.vibe.toLowerCase());

    const vibeBadge = document.createElement("span");
    vibeBadge.innerText = `🎭 ${pred.vibe}`;
    vibeBadge.style.cssText =
      "padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px; background: #ebedef; color: #2c3e50;";

    badgeDiv.appendChild(sentimentBadge);
    badgeDiv.appendChild(vibeBadge);
    container.prepend(badgeDiv);
  });
}

function applyFilters(filterType, filterCategory, mode) {
  const allReviews = document.querySelectorAll("[data-moviemind-sentiment]");

  allReviews.forEach((review) => {
    review.style.display = "block";
    review.style.opacity = "1";
    review.style.filter = "none";
    review.style.pointerEvents = "auto";

    if (filterType !== "all") {
      const reviewValue = review.getAttribute(
        `data-moviemind-${filterCategory}`,
      );

      if (reviewValue !== filterType.toLowerCase()) {
        if (mode === "hide") {
          review.style.display = "none";
        } else if (mode === "blur") {
          review.style.opacity = "0.4";
          review.style.filter = "blur(4px)";
          review.style.pointerEvents = "none";
        }
      }
    }
  });
}

async function waitForReviewsToFinishLoading(maxWait = 15000, maxLimit = MAX_REVIEWS_LIMIT) {
  let lastCount = 0;
  let stableCount = 0;
  const start = Date.now();

  while (Date.now() - start < maxWait) {
    const currentCount = document.querySelectorAll('.ipc-html-content-inner-div, .text.show-more__control').length;

    console.log(`[MovieMind] Reviews loaded: ${currentCount} / ${maxLimit}`);

    // CRITICAL FIX: Break out early if we hit our safe memory limit
    if (currentCount >= maxLimit) {
        console.log(`[MovieMind] Reached safety limit of ${maxLimit} reviews. Stopping loader.`);
        return;
    }

    if (currentCount === lastCount && currentCount > 0) {
      stableCount++;
    } else {
      stableCount = 0;
      lastCount = currentCount;
    }

    if (stableCount >= 4) {
      console.log("[MovieMind] All extra reviews finished loading.");
      return;
    }

    await sleep(500);
  }

  console.log("[MovieMind] Timed out waiting for reviews.");
}


// -------------------------------
// AUTO INITIALIZE REVIEW EXTRACTION
// -------------------------------

(async function autoInit() {
  if (!window.location.href.includes("/reviews")) return;

  console.log("[MovieMind] Initializing...");

  const imdbIdMatch = window.location.href.match(/title\/(tt\d+)/);
  if (!imdbIdMatch) return;
  
  const imdbId = imdbIdMatch[1];
  const storageKey = `MovieMind_${imdbId}`;

  // 1. CHECK CACHE FIRST
  const cacheResult = await chrome.storage.local.get(storageKey);
  if (cacheResult[storageKey]) {
      console.log("[MovieMind] Analysis already cached! Injecting labels and skipping extraction.");
      await sleep(1000); 
      
      extractVisibleReviews(); 
      injectLabels(cacheResult[storageKey].review_predictions);
      
      return; 
  }

  // 2. IF NO CACHE
  await sleep(1500);

  let seeAllBtn = null;
  const allElements = document.querySelectorAll("*");

  for (const el of allElements) {
    const text = (el.innerText || el.textContent || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

    if (text !== "see all") continue;

    const parentText = (
      el.parentElement?.innerText ||
      el.parentElement?.textContent ||
      ""
    ).toLowerCase();

    if (/\d+\s*more/.test(parentText)) continue;

    seeAllBtn = el;
    break;
  }

  if (seeAllBtn) {
    console.log("[MovieMind] Found page-level 'See all' button.");

    const clickable =
      seeAllBtn.closest("button") ||
      seeAllBtn.closest("[role='button']") ||
      seeAllBtn;

    try {
      clickable.dispatchEvent(
        new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          view: window,
        }),
      );

      console.log("[MovieMind] Clicked 'See all'. Waiting for reviews to load...");
      // Pass the hard limit to the waiter
      await waitForReviewsToFinishLoading(15000, MAX_REVIEWS_LIMIT);
      
    } catch (err) {
      console.error("[MovieMind] Failed to click See all:", err);
    }
  } else {
    console.log("[MovieMind] No page-level 'See all' button found.");
  }

  // Pass the hard limit to the extractor
  const data = extractVisibleReviews(MAX_REVIEWS_LIMIT);

  if (data.reviews.length > 0) {
    console.log(`[MovieMind] Extracted ${data.reviews.length} reviews. Sending to backend.`);

    chrome.runtime.sendMessage({
      type: "AUTO_ANALYZE",
      payload: {
        imdbId: imdbId,
        data: data,
      },
    });
  } else {
    console.warn("[MovieMind] No reviews found.");
  }
})();