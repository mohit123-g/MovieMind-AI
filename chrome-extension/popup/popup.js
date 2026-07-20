// document.addEventListener('DOMContentLoaded', async () => {
//     const titleEl = document.getElementById('movie-title');
//     const sentimentText = document.getElementById('sentiment-text');
//     const sentimentBar = document.getElementById('sentiment-bar');
//     const vibeContainer = document.getElementById('vibe-stats-container');
//     const summaryText = document.getElementById('ai-summary-text');

//     const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

//     if (!tab.url.includes("imdb.com/title/")) {
//         document.body.innerHTML = `
//             <div style="padding: 20px; text-align: center; font-family: sans-serif;">
//                 <h3 style="color: #2c3e50;">🎬 MovieMind AI</h3>
//                 <p style="color: #7f8c8d; font-size: 14px;">Please navigate to an IMDb movie page or user reviews page to analyze sentiment!</p>
//             </div>`;
//         return;
//     }

//     chrome.tabs.sendMessage(tab.id, { action: "EXTRACT_REVIEWS" }, async (response) => {
//         // Handle undefined response (fixes the async port closed error visually)
//         if (chrome.runtime.lastError || !response) {
//             titleEl.innerText = "Please refresh the page and try again.";
//             return;
//         }

//         if (!response.reviews || response.reviews.length === 0) {
//             titleEl.innerText = "No reviews found on this page.";
//             return;
//         }

//         titleEl.innerText = response.movie_title;
//         sentimentText.innerText = "Analyzing reviews with AI...";

//         try {
//             const apiRes = await fetch("http://127.0.0.1:8000/api/analyze", {
//                 method: "POST",
//                 headers: { "Content-Type": "application/json" },
//                 body: JSON.stringify(response)
//             });

//             const data = await apiRes.json();
//             updateDashboard(data);

//             const filterSection = document.getElementById('filter-section');
//             const filtersContainer = document.getElementById('filters-container');
//             const navContainer = document.getElementById('nav-action-container');

//             if (navContainer) navContainer.innerHTML = "";

//             if (response.is_main_page) {
//                 // HIDE the filter radio buttons on the main page
//                 if (filtersContainer) filtersContainer.style.display = 'none';

//                 // CREATE a button to open reviews in a NEW TAB
//                 if (navContainer) {
//                     const navBtn = document.createElement('button');
//                     navBtn.innerText = "See Reviews ➔";
//                     navBtn.style.cssText = "margin-top: 10px; width: 100%; padding: 8px; cursor: pointer; background: #f5c518; color: black; border: none; border-radius: 4px; font-weight: bold;";
//                     navBtn.onclick = () => {
//                         chrome.tabs.create({ url: response.reviews_url, active: true });
//                     };
//                     navContainer.appendChild(navBtn);
//                 }
//             } else {
//                 // SHOW the filter section on the reviews page
//                 if (filterSection) filterSection.style.display = 'block';
//                 if (filtersContainer) filtersContainer.style.display = 'block';

//                 chrome.tabs.sendMessage(tab.id, {
//                     action: "INJECT_LABELS",
//                     predictions: data.review_predictions
//                 });
//             }

//         } catch (error) {
//             console.error(error);
//             sentimentText.innerText = "Error connecting to backend.";
//             summaryText.innerText = "Make sure your FastAPI server is running.";
//         }
//     });

//     function updateDashboard(data) {
//         sentimentBar.style.width = `${data.overall_stats.positive_pct}%`;
//         sentimentText.innerText = `${data.overall_stats.positive_pct}% Positive | ${data.overall_stats.negative_pct}% Negative`;

//         vibeContainer.innerHTML = "";
//         const vibeRadiosContainer = document.getElementById('vibe-radios');
//         if (vibeRadiosContainer) vibeRadiosContainer.innerHTML = "";

//         for (const [vibe, pct] of Object.entries(data.vibe_stats)) {
//             if (pct > 0) {
//                 const el = document.createElement('div');
//                 el.innerText = `${vibe}: ${pct}%`;
//                 el.style.fontSize = "0.85rem";
//                 el.style.marginBottom = "4px";
//                 vibeContainer.appendChild(el);

//                 if (vibeRadiosContainer) {
//                     const label = document.createElement('label');
//                     label.style.marginRight = "8px";
//                     label.innerHTML = `<input type="radio" name="movie-filter" value="${vibe}" data-category="vibe"> ${vibe}`;
//                     vibeRadiosContainer.appendChild(label);
//                 }
//             }
//         }

//         summaryText.innerText = data.summary || "Summary generation pending.";

//         // Attach Filter Listeners
//         const getFilterMode = () => document.querySelector('input[name="filter-mode"]:checked').value;

//         document.querySelectorAll('input[name="movie-filter"]').forEach(radio => {
//             radio.addEventListener('change', (e) => {
//                 chrome.tabs.sendMessage(tab.id, {
//                     action: "FILTER_REVIEWS",
//                     filter: e.target.value,
//                     category: e.target.getAttribute('data-category'),
//                     mode: getFilterMode()
//                 });
//             });
//         });

//         // Re-apply filter if mode changes (Blur <-> Hide)
//         document.querySelectorAll('input[name="filter-mode"]').forEach(radio => {
//             radio.addEventListener('change', () => {
//                 const activeFilter = document.querySelector('input[name="movie-filter"]:checked');
//                 if (activeFilter) {
//                     chrome.tabs.sendMessage(tab.id, {
//                         action: "FILTER_REVIEWS",
//                         filter: activeFilter.value,
//                         category: activeFilter.getAttribute('data-category'),
//                         mode: getFilterMode()
//                     });
//                 }
//             });
//         });
//     }
// });

document.addEventListener('DOMContentLoaded', async () => {
    const titleEl = document.getElementById('movie-title');
    const sentimentText = document.getElementById('sentiment-text');
    const sentimentBar = document.getElementById('sentiment-bar');
    const summaryText = document.getElementById('ai-summary-text');
    const filterSection = document.getElementById('filter-section');
    const btnReanalyze = document.getElementById('btn-reanalyze');
    const btnClearCache = document.getElementById('btn-clear-cache');

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.url.includes("imdb.com/title/")) {
        document.body.innerHTML = `
            <div style="padding: 20px; text-align: center; background: #121212; color: #fff; height: 100vh;">
                <h3 style="color: #f5c518;">🎬 MovieMind AI</h3>
                <p style="color: #aaa; font-size: 14px;">Please navigate to an IMDb movie page to begin!</p>
            </div>`;
        return;
    }

    const isMainPage = !tab.url.includes('/reviews');
    const imdbIdMatch = tab.url.match(/title\/(tt\d+)/);
    const imdbId = imdbIdMatch ? imdbIdMatch[1] : null;
    const storageKey = `MovieMind_${imdbId}`;

    // Clean up the tab title (e.g., "Interstellar (2014)")
    let cleanTitle = tab.title.split('-')[0].replace(/User reviews/ig, '').trim();
    titleEl.innerText = cleanTitle;

    // ==========================================
    // GLOBAL BUTTON LISTENERS
    // ==========================================
    btnClearCache.onclick = () => {
        chrome.storage.local.clear(() => {
            alert("All MovieMind AI cache cleared successfully!");
            window.close();
        });
    };

    btnReanalyze.onclick = () => {
        chrome.storage.local.remove(storageKey, () => {
            chrome.tabs.reload(tab.id);
            window.close(); 
        });
    };

    // ==========================================
    // STATE 1: ON THE MAIN MOVIE PAGE
    // ==========================================
    if (isMainPage) {
        document.body.innerHTML = `
            <div style="padding: 30px; text-align: center; background: #121212; color: #fff; border-radius: 8px;">
                <h3 style="color: #f5c518;">🎬 Redirecting...</h3>
                <p style="color: #aaa; font-size: 14px;">Taking you to the reviews page to start the analysis.</p>
                <p style="color: #e74c3c; font-size: 12px; margin-top: 15px; font-weight: bold;">(Click the extension icon again once the page loads!)</p>
            </div>`;
        
        chrome.runtime.sendMessage({
            type: "START_ANALYSIS",
            payload: { imdbId: imdbId, tabId: tab.id }
        });
        
        return; 
    }

    // ==========================================
    // STATE 2: ON THE REVIEWS PAGE
    // ==========================================
    filterSection.style.display = 'block';
    btnReanalyze.style.display = 'block';

    const renderData = (data) => {
        updateDashboard(data);
        chrome.tabs.sendMessage(tab.id, { 
            action: "INJECT_LABELS", 
            predictions: data.review_predictions 
        });
    };

    chrome.storage.local.get(storageKey, (result) => {
        if (result[storageKey]) {
            renderData(result[storageKey]);
        } else {
            sentimentText.innerText = "Analyzing reviews in the background. Please wait...";
            summaryText.innerText = "AI summary generating...";
            btnReanalyze.disabled = true; 
            
            chrome.storage.onChanged.addListener(function storageListener(changes, namespace) {
                if (namespace === 'local' && changes[storageKey]) {
                    renderData(changes[storageKey].newValue);
                    btnReanalyze.disabled = false;
                    chrome.storage.onChanged.removeListener(storageListener);
                }
            });
        }
    });

    // --- DONUT CHART DRAWING LOGIC ---
    function drawDonutChart(vibeStats) {
        const canvas = document.getElementById('vibe-donut-chart');
        const legendContainer = document.getElementById('vibe-legend');
        const vibeRadiosContainer = document.getElementById('vibe-radios');
        
        canvas.style.display = "block";
        legendContainer.innerHTML = "";
        if (vibeRadiosContainer) vibeRadiosContainer.innerHTML = "";

        // IMDb-friendly color palette for vibes
        const colors = ["#f5c518", "#3498db", "#e74c3c", "#9b59b6", "#e67e22", "#1abc9c", "#ecf0f1"];
        
        let validVibes = [];
        let total = 0;

        for (const [vibe, pct] of Object.entries(vibeStats)) {
            if (pct > 0) {
                total += pct;
                validVibes.push({ name: vibe, value: pct });
            }
        }

        // Sort largest to smallest for a prettier chart
        validVibes.sort((a, b) => b.value - a.value);

        if (canvas.getContext && total > 0) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const outerRadius = Math.min(centerX, centerY) - 2;
            const innerRadius = outerRadius * 0.60; // 60% thickness creates the donut hole

            let startAngle = -0.5 * Math.PI; // Start at top center

            validVibes.forEach((vibe, index) => {
                const sliceAngle = (vibe.value / total) * 2 * Math.PI;
                const color = colors[index % colors.length];

                // Draw Slice
                ctx.beginPath();
                ctx.arc(centerX, centerY, outerRadius, startAngle, startAngle + sliceAngle, false);
                ctx.arc(centerX, centerY, innerRadius, startAngle + sliceAngle, startAngle, true);
                ctx.closePath();
                ctx.fillStyle = color;
                ctx.fill();

                startAngle += sliceAngle;

                // Build Legend Text
                const legendItem = document.createElement('div');
                legendItem.className = 'legend-item';
                legendItem.innerHTML = `<span class="legend-color" style="background-color: ${color};"></span> ${vibe.name}: ${vibe.value}%`;
                legendContainer.appendChild(legendItem);

                // Build Filter Radios
                if (vibeRadiosContainer) {
                    const label = document.createElement('label');
                    label.style.marginRight = "10px";
                    label.innerHTML = `<input type="radio" name="movie-filter" value="${vibe.name}" data-category="vibe"> ${vibe.name}`;
                    vibeRadiosContainer.appendChild(label);
                }
            });
        }
    }

    function updateDashboard(data) {
        sentimentBar.style.width = `${data.overall_stats.positive_pct}%`;
        sentimentText.innerText = `${data.overall_stats.positive_pct}% Positive | ${data.overall_stats.negative_pct}% Negative`;
        summaryText.innerText = data.summary || "Summary generation failed.";

        // Draw the Canvas Donut Chart
        if (data.vibe_stats) {
            drawDonutChart(data.vibe_stats);
        }

        // Setup Filter Listeners
        const getFilterMode = () => document.querySelector('input[name="filter-mode"]:checked').value;

        const applyCurrentFilter = () => {
            const activeFilter = document.querySelector('input[name="movie-filter"]:checked');
            if (activeFilter) {
                chrome.tabs.sendMessage(tab.id, { 
                    action: "FILTER_REVIEWS", 
                    filter: activeFilter.value,
                    category: activeFilter.getAttribute('data-category'),
                    mode: getFilterMode() 
                });
            }
        };

        document.querySelectorAll('input[name="movie-filter"]').forEach(radio => {
            radio.addEventListener('change', applyCurrentFilter);
        });

        document.querySelectorAll('input[name="filter-mode"]').forEach(radio => {
            radio.addEventListener('change', applyCurrentFilter);
        });
    }
});