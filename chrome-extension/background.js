// console.log("[MovieMind] Background Started");

// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   switch (message.type) {
//     //-----------------------------------------
//     // SAVE MOVIE
//     //-----------------------------------------

//     case "SAVE_MOVIE":
//       chrome.storage.local.get("movies", (result) => {
//         const movies = result.movies || {};

//         movies[message.payload.imdbId] = {
//           ...movies[message.payload.imdbId],

//           ...message.payload,
//         };

//         chrome.storage.local.set(
//           {
//             movies,
//           },
//           () => {
//             console.log("[MovieMind] Movie Saved");

//             sendResponse({
//               success: true,
//             });
//           },
//         );
//       });

//       return true;

//     //-----------------------------------------
//     // GET MOVIE
//     //-----------------------------------------

//     case "GET_MOVIE":
//       chrome.storage.local.get("movies", (result) => {
//         const movies = result.movies || {};

//         sendResponse(movies[message.payload.imdbId] || null);
//       });

//       return true;

//     //-----------------------------------------
//     // START ANALYSIS
//     //-----------------------------------------

//     case "START_ANALYSIS":
//       chrome.tabs.create({
//         url: `https://www.imdb.com/title/${message.payload.imdbId}/reviews/`,
//       });

//       sendResponse({
//         success: true,
//       });

//       return true;
//   }
// });


console.log("[MovieMind] Background Started");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    
    // Handle opening the reviews page from the main page
    // Handle opening the reviews page in the SAME tab
    if (message.type === "START_ANALYSIS") {
        chrome.tabs.update(message.payload.tabId, {
            url: `https://www.imdb.com/title/${message.payload.imdbId}/reviews/`,
        });
        sendResponse({ success: true });
        return true;
    }
    
    // Handle the silent background analysis
    if (message.type === "AUTO_ANALYZE") {
        const { imdbId, data } = message.payload;
        const storageKey = `MovieMind_${imdbId}`;
        
        // 1. Check if we already analyzed this movie
        chrome.storage.local.get(storageKey, async (result) => {
            if (result[storageKey]) {
                console.log(`[MovieMind] Cache hit for ${imdbId}. Skipping backend request.`);
                return; 
            }
            
            // 2. If not, send it to the FastAPI backend
            try {
                console.log(`[MovieMind] Fetching AI analysis for ${imdbId}...`);
                const apiRes = await fetch("https://moviemind-ai-server.onrender.com/api/analyze", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data)
                });
                
                if (apiRes.ok) {
                    const resultData = await apiRes.json();
                    
                    // 3. Save the result to local storage
                    chrome.storage.local.set({ [storageKey]: resultData }, () => {
                        console.log(`[MovieMind] Successfully saved analysis to cache for ${imdbId}`);
                    });
                }
            } catch (error) {
                console.error("[MovieMind] Backend fetch failed", error);
            }
        });
        
        return true; 
    }
});