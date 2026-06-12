/**
 * ActiveLearn AI - Content Script Orchestrator
 * Integrates the active cognitive learning layer directly into YouTube watch pages.
 * Features:
 * 1. Educational Video Detection & Setup
 * 2. Heuristic Semantic Chunker & Timeline Segmenter
 * 3. Attention Intelligence Engine (focus/engagement metrics, skipping, fatigue warnings)
 * 4. Retractable Sliding Dashboard sidebar & Dynamic SVG charts
 * 5. Floating AI Companion Widget & Speech bubble intervention system
 */

// Global state trackers
let isEducational = false;
let currentWatchUrl = "";
let videoElement = null;
let triggeredMilestones = new Set();
let conceptChunks = [];
let weakConceptsList = [];

// Attention indicators
let activeWatchTimeSeconds = 0;
let tabFocusedTimeSeconds = 0;
let pageInteractionCount = 0;
let lastInteractionTimestamp = Date.now();
let lastPlayheadPosition = 0;
let consecutiveSkipsCount = 0;
let attentionFatigueTriggered = false;

// UI elements cached
let sidebarWrapper = null;
let companionWidget = null;

console.log('[ActiveLearn AI] Injected successfully. Monitoring YouTube watch pages...');

// 1. Helper to verify extension context is valid
function isContextValid() {
  return typeof chrome !== 'undefined' && chrome.runtime && !!chrome.runtime.id;
}

// 2. Educational Video Detection Logic
function checkEducationalContent() {
  if (!window.location.href.includes('/watch')) {
    isEducational = false;
    return false;
  }

  const titleEl = document.querySelector('h1.ytd-watch-metadata') || 
                  document.querySelector('h1.title.style-scope.ytd-video-primary-info-renderer');
  const descriptionEl = document.querySelector('#description-inner') || 
                        document.querySelector('#description');
  
  const textToScan = ((titleEl ? titleEl.textContent : "") + " " + 
                     (descriptionEl ? descriptionEl.textContent : "") + " " + 
                     document.title).toLowerCase();

  const eduKeywords = [
    "tutorial", "learn", "course", "lecture", "science", "coding", "programming", "physics",
    "math", "calculus", "chemistry", "biology", "history", "economics", "algebra", "gate ", 
    "upsc", "jee ", "neet", "exam", "preparation", "class", "study", "engineering", "machine learning"
  ];

  isEducational = eduKeywords.some(kw => textToScan.includes(kw));
  console.log(`[ActiveLearn] Educational content check result: ${isEducational}`);
  return isEducational;
}

// 3. Heuristic Semantic Concept Segmenter
// Automatically divides YouTube educational lectures into fixed 10-minute learning chunks
function generateSemanticChunks(duration) {
  if (!duration || duration <= 0) return;

  const title = getYouTubeVideoTitle().toLowerCase();
  let baseTopic = "General Knowledge";
  let syllabus = [];

  if (title.includes("javascript") || title.includes("js")) {
    baseTopic = "JavaScript Core";
    syllabus = [
      { title: "Execution Context & Scope Chains", desc: "Analyzing lexical scopes, variable object structures, and functional memory call stacks.", weightage: "High Weightage" },
      { title: "Closures & Temporal Dead Zone", desc: "Understanding the behavior of closures, hoisting restrictions, let/const TDZ boundary checks.", weightage: "Extremely High (GATE/Interview)" },
      { title: "Asynchronous Event Loop Tick", desc: "Deep dive into microtask/macrotask queues, callback executions, and non-blocking JIT allocations.", weightage: "High Weightage" },
      { title: "Prototypal Inheritance & Chains", desc: "How dynamic inheritance, prototypes, and constructor function linkages work under the hood.", weightage: "Medium Weightage" },
      { title: "Optimal Memory & GC Optimization", desc: "Managing V8 memory reference pointers, leak diagnostics, and chrome devtools profiles.", weightage: "High Weightage" },
      { title: "Advanced Modules & ES6 Systems", desc: "CommonJS vs ES Modules, dynamic loading specs, and dependency bundle limits.", weightage: "Medium Weightage" }
    ];
  } else if (title.includes("python")) {
    baseTopic = "Python Paradigms";
    syllabus = [
      { title: "Memory Allocation & Mutability", desc: "Analyzing reference counts, mutable vs immutable memory variables, and objects storage.", weightage: "Medium Weightage" },
      { title: "Lazy Iterators & Generator Pipes", desc: "Understanding decorators wrapper mechanics and lazy sequence generations.", weightage: "High Weightage" },
      { title: "Global Interpreter Lock (GIL)", desc: "Threading locks, multithread constraints, and multiprocessing alternatives.", weightage: "Extremely High (Advanced Python)" },
      { title: "OOP Metaclasses & Dynamic Class Creation", desc: "How classes are constructed from type schemas and interfaces checked dynamically.", weightage: "High Weightage" },
      { title: "Advanced Asyncio & Coroutines", desc: "Async/await loops, coroutine contexts, task scheduling, and cooperative multitasking.", weightage: "High Weightage" }
    ];
  } else if (title.includes("react")) {
    baseTopic = "React UI Engine";
    syllabus = [
      { title: "Virtual DOM & Reconciliation Diff", desc: "Understanding shallow element diffing, fiber node mounts, and repaint batch updates.", weightage: "Medium Weightage" },
      { title: "Hooks Lifecycle & Fiber Tree", desc: "Referential values stability, memoization structures, and rendering lifecycle hooks.", weightage: "Extremely High Weightage" },
      { title: "Context API & Render Performance", desc: "Prop-drilling bypass strategies and Context Selector component render boundaries.", weightage: "High Weightage" },
      { title: "React Server Components (RSC)", desc: "Server side rendering streaming, bundler payloads reduction, and data caching.", weightage: "High Weightage" },
      { title: "State Management Store Optimization", desc: "Zustand vs Redux Toolkit, atomic updates, selector caching, and action dispatches.", weightage: "High Weightage" }
    ];
  } else {
    baseTopic = "Core Concept Study";
    syllabus = [
      { title: "Axioms & Fundamental Principles", desc: "Baseline definitions, foundational structures, and historical contextual models.", weightage: "Medium Weightage" },
      { title: "Mathematical Formulas & Blueprint", desc: "Analytical breakdown, equation formatting, and problem solving logic.", weightage: "High Weightage" },
      { title: "Case Studies & Systems Integration", desc: "Real-world examples, validation tests, and edge case diagnostics.", weightage: "Extremely High Weightage" },
      { title: "Practice Challenge Exercises", desc: "Applying the active concepts to exam problems and reviewing solutions.", weightage: "High Weightage" },
      { title: "Revision Synthesis & Summary Checklist", desc: "Quick active recall check-ins, flashcard review, and key takeaways.", weightage: "Medium Weightage" }
    ];
  }

  // Create 10-minute chunks (600s each)
  const chunkSize = 600;
  const totalChunks = Math.ceil(duration / chunkSize);
  conceptChunks = [];

  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(duration, (i + 1) * chunkSize);
    
    // Select syllabus entry sequentially
    const syllIndex = i % syllabus.length;
    const info = syllabus[syllIndex];

    conceptChunks.push({
      id: i + 1,
      topic: baseTopic,
      title: `${info.title} (${Math.floor(start/60)}m–${Math.floor(end/60)}m)`,
      desc: info.desc,
      start: start,
      end: end,
      weightage: info.weightage
    });
  }

  console.log(`[ActiveLearn] Formulated ${conceptChunks.length} semantic concept chunks (10-minute intervals).`);
}

// 4. Ingest and Render Slide-out Dashboard
async function injectDashboard() {
  if (document.getElementById('activelearn-dashboard')) return;

  try {
    const cssUrl = chrome.runtime.getURL('ui/dashboard.css');
    if (!document.querySelector(`link[href="${cssUrl}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = cssUrl;
      document.head.appendChild(link);
    }

    const htmlUrl = chrome.runtime.getURL('ui/dashboard.html');
    const response = await fetch(htmlUrl);
    const htmlMarkup = await response.text();

    const virtualDiv = document.createElement('div');
    virtualDiv.innerHTML = htmlMarkup;
    sidebarWrapper = virtualDiv.firstElementChild;

    // Append to body so it slides over the main layout seamlessly
    document.body.appendChild(sidebarWrapper);

    // Initialize Dashboard UI Event Listeners
    setupDashboardInteractions();
    console.log('[ActiveLearn] sliding dashboard injected successfully.');
  } catch (err) {
    console.error('[ActiveLearn] Error injecting dashboard: ', err);
  }
}

// Setup listeners inside the dashboard panel
function setupDashboardInteractions() {
  const toggleBtn = document.getElementById('activelearn-toggle-btn');
  const closeBtn = document.getElementById('activelearn-close-btn');
  const tabBtns = sidebarWrapper.querySelectorAll('.tab-btn');
  const triggerQuizBtn = document.getElementById('sidebar-trigger-quiz');

  // Slide toggle logic
  toggleBtn.onclick = () => {
    sidebarWrapper.classList.toggle('closed');
    updateDashboardUI(); // Live refresh when opening
  };

  closeBtn.onclick = () => {
    sidebarWrapper.classList.add('closed');
  };

  // Navigation tab switching
  tabBtns.forEach(btn => {
    btn.onclick = () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      sidebarWrapper.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      btn.classList.add('active');
      const targetTabId = `tab-${btn.getAttribute('data-tab')}`;
      document.getElementById(targetTabId).classList.add('active');
      
      if (btn.getAttribute('data-tab') === 'analytics') {
        updateAnalyticsVisuals();
      }
    };
  });

  // Manual recall trigger
  triggerQuizBtn.onclick = () => {
    const video = document.querySelector('video');
    if (video) {
      triggeredMilestones.add(Math.floor(video.currentTime));
      triggerQuizCheckpoint(Math.floor(video.currentTime), video);
    }
  };

  // Quick prompt triggers in Companion Tab
  document.getElementById('sug-summarize').onclick = () => sendCompanionMessage("Explain a quick concept summary of the current chunk.");
  document.getElementById('sug-exam').onclick = () => sendCompanionMessage("What are the key exam weightage details for this concept?");
  document.getElementById('sug-explain').onclick = () => sendCompanionMessage("Test my recall with a fast conceptual question!");

  // Chat send input
  document.getElementById('companion-send-btn').onclick = submitCompanionChat;
  document.getElementById('companion-input').onkeypress = (e) => {
    if (e.key === 'Enter') submitCompanionChat();
  };
}

// 5. Update Live Dashboard Stats
function updateDashboardUI() {
  if (!sidebarWrapper || sidebarWrapper.classList.contains('closed')) return;

  const video = document.querySelector('video');
  if (!video) return;

  const currentTime = Math.floor(video.currentTime);
  const duration = video.duration || 1;

  // A. Detect and outline the current active concept chunk
  let activeChunk = null;
  conceptChunks.forEach(ch => {
    if (currentTime >= ch.start && currentTime < ch.end) {
      activeChunk = ch;
    }
  });

  if (activeChunk) {
    document.getElementById('sidebar-concept-title').textContent = activeChunk.title;
    document.getElementById('sidebar-concept-desc').textContent = activeChunk.desc;
    document.getElementById('current-weightage').textContent = activeChunk.weightage;
    
    const chunkDur = activeChunk.end - activeChunk.start;
    const chunkPct = Math.min(100, Math.max(0, ((currentTime - activeChunk.start) / chunkDur) * 100));
    document.getElementById('concept-progress-bar').style.width = `${chunkPct}%`;
    document.getElementById('concept-time-eta').textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
  }

  // B. Populate Chunks List
  const container = document.getElementById('concept-chunks-container');
  container.innerHTML = "";

  conceptChunks.forEach(ch => {
    const item = document.createElement('div');
    item.className = `concept-chunk-item ${activeChunk && activeChunk.id === ch.id ? 'active' : ''}`;
    
    item.innerHTML = `
      <span class="chunk-icon">${activeChunk && activeChunk.id === ch.id ? '🔥' : '📚'}</span>
      <div class="chunk-info">
        <div class="chunk-header-row">
          <span class="chunk-title">${ch.title}</span>
          <span class="chunk-time">${formatTime(ch.start)}</span>
        </div>
        <span class="chunk-desc">${ch.desc}</span>
      </div>
    `;

    // Clicking a chunk seeks directly to its starting timestamp
    item.onclick = () => {
      video.currentTime = ch.start;
      updateDashboardUI();
    };

    container.appendChild(item);
  });

  // C. Populate Spaced Revision Timeline
  chrome.storage.local.get(['weakConcepts'], (data) => {
    const revContainer = document.getElementById('revision-timeline-container');
    const weakList = data.weakConcepts || [];
    
    if (weakList.length === 0) {
      revContainer.innerHTML = `
        <div class="empty-placeholder">
          <span>✨</span>
          <p>Perfect recall! No weak timestamps registered yet.</p>
        </div>
      `;
      return;
    }

    revContainer.innerHTML = "";
    weakList.forEach(c => {
      const item = document.createElement('div');
      item.className = "revision-timeline-item";
      item.innerHTML = `
        <div class="revision-meta">
          <span class="revision-topic">${c.concept}</span>
          <button class="revision-timestamp-btn" data-time="${c.timestamp}">${formatTime(c.timestamp)} ↩</button>
        </div>
        <p class="revision-desc">${c.explanation.substring(0, 120)}...</p>
      `;

      item.querySelector('.revision-timestamp-btn').onclick = () => {
        video.currentTime = c.timestamp;
        sidebarWrapper.classList.add('closed'); // Close panel when jumping
      };

      revContainer.appendChild(item);
    });
  });
}

// 6. Update Circular SVG Gauges & Heatmaps
function updateAnalyticsVisuals() {
  if (!sidebarWrapper) return;

  // Calculate scores
  const focusScore = calculateFocusScore();
  const engagementScore = calculateEngagementScore();

  // A. Animate Focus circular gauge
  const focusFill = document.getElementById('focus-gauge-fill');
  const focusText = document.getElementById('focus-score-text');
  focusFill.setAttribute('stroke-dasharray', `${focusScore}, 100`);
  focusText.textContent = `${focusScore}%`;

  // B. Animate Engagement circular gauge
  const engageFill = document.getElementById('engagement-gauge-fill');
  const engageText = document.getElementById('engagement-score-text');
  engageFill.setAttribute('stroke-dasharray', `${engagementScore}, 100`);
  engageText.textContent = `${engagementScore}%`;

  // C. Update memory retention bar
  chrome.storage.local.get(['totalScore', 'questionsAnswered'], (data) => {
    const answered = data.questionsAnswered || 0;
    const score = data.totalScore || 0;
    
    let retention = 0;
    if (answered > 0) {
      const baseRetention = (score / answered) * 100;
      // Simulation of Ebbinghaus memory decay: decays by 5% per active hour watched
      const elapsedHours = activeWatchTimeSeconds / 3600;
      retention = Math.floor(Math.max(10, baseRetention - (elapsedHours * 5)));
    } else {
      retention = 50; // default baseline estimation before quizzes
    }

    document.getElementById('retention-score').textContent = `${retention}%`;
    document.getElementById('retention-bar').style.width = `${retention}%`;
  });

  // D. Populate Weak-Topic Heatmap (maps weakConcepts logs onto a 12-cell matrix)
  chrome.storage.local.get(['weakConcepts'], (data) => {
    const container = document.getElementById('analytics-heatmap-container');
    const weakList = data.weakConcepts || [];
    container.innerHTML = "";

    // Generate 12 squares reflecting conceptual mastery segments
    for (let i = 0; i < 12; i++) {
      const cell = document.createElement('div');
      
      // Determine color intensity based on weakConcepts count
      let grade = "score-4"; // Default Mastered (Green)
      if (weakList.length > 0) {
        const hits = weakList.filter(c => c.timestamp % 12 === i).length;
        if (hits > 2) grade = "score-1";
        else if (hits === 2) grade = "score-2";
        else if (hits === 1) grade = "score-3";
        else grade = "score-4";
      } else {
        // Random visual gradient before questions are failed
        grade = i % 4 === 0 ? "score-3" : "score-4";
      }

      cell.className = `heatmap-cell ${grade}`;
      cell.title = `Concept Grid Segment ${i + 1} - Mastery Status`;
      container.appendChild(cell);
    }
  });

  // E. Dynamic Concept Mastery progress list
  const masteryTimeline = document.getElementById('analytics-mastery-timeline');
  masteryTimeline.innerHTML = "";

  conceptChunks.forEach(ch => {
    // Check if user made mistakes in this chunk's time interval
    chrome.storage.local.get(['weakConcepts'], (data) => {
      const weakList = data.weakConcepts || [];
      const hasErrors = weakList.some(c => c.timestamp >= ch.start && c.timestamp < ch.end);
      
      const masteryPct = hasErrors ? 40 : 100;
      const progressItem = document.createElement('div');
      progressItem.className = "mastery-item";
      progressItem.innerHTML = `
        <div class="mastery-item-header">
          <span class="mastery-item-title">${ch.title}</span>
          <span class="mastery-item-score">${masteryPct}%</span>
        </div>
        <div class="mastery-progress-track">
          <div class="mastery-progress-fill" style="width: ${masteryPct}%"></div>
        </div>
      `;
      masteryTimeline.appendChild(progressItem);
    });
  });
}

// 7. Inject Floating AI Companion Widget
function injectCompanionWidget() {
  if (document.getElementById('activelearn-companion-widget')) return;

  companionWidget = document.createElement('div');
  companionWidget.id = 'activelearn-companion-widget';
  
  // Custom styles for floating companion
  companionWidget.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: rgba(15, 15, 15, 0.9);
    backdrop-filter: blur(15px);
    -webkit-backdrop-filter: blur(15px);
    border: 2px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 10px 30px rgba(0,0,0,0.5), 0 0 15px rgba(255, 0, 0, 0.15);
    z-index: 2000;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    user-select: none;
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  `;
  companionWidget.innerHTML = '🧠';
  companionWidget.title = "ActiveLearn AI Cognitive Buddy";

  // Pulse animation inside container
  const pulseRing = document.createElement('span');
  pulseRing.style.cssText = `
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    border: 2px solid rgba(255, 0, 0, 0.4);
    animation: ring-pulse 2s infinite;
  `;
  companionWidget.appendChild(pulseRing);

  // Click companion to open sidebar dashboard
  companionWidget.onclick = () => {
    if (sidebarWrapper) {
      sidebarWrapper.classList.remove('closed');
      // Go to Companion tab
      sidebarWrapper.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      sidebarWrapper.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      const compTabBtn = sidebarWrapper.querySelector('[data-tab="companion"]');
      if (compTabBtn) compTabBtn.classList.add('active');
      document.getElementById('tab-companion').classList.add('active');
      updateDashboardUI();
    }
  };

  document.body.appendChild(companionWidget);
  console.log('[ActiveLearn] Floating AI Companion injected successfully.');
}

// Triggers speech bubble warnings from companion
function triggerCompanionIntervention(text) {
  if (!companionWidget) return;

  // Clean existing bubble
  const existingBubble = document.getElementById('companion-speech-bubble');
  if (existingBubble) existingBubble.remove();

  const bubble = document.createElement('div');
  bubble.id = 'companion-speech-bubble';
  bubble.style.cssText = `
    position: absolute;
    bottom: 72px;
    right: 0;
    width: 180px;
    background: rgba(18, 18, 18, 0.95);
    border: 1px solid rgba(255, 0, 0, 0.3);
    border-radius: 12px;
    padding: 10px 14px;
    font-family: inherit;
    font-size: 11px;
    line-height: 1.4;
    color: #fff;
    box-shadow: 0 8px 24px rgba(0,0,0,0.6);
    pointer-events: none;
    animation: fadeIn 0.4s ease;
    z-index: 2001;
  `;
  bubble.innerHTML = `<strong>Attention Alert:</strong><br>${text}`;
  companionWidget.appendChild(bubble);

  // Fade out bubble after 8 seconds
  setTimeout(() => {
    if (bubble) bubble.remove();
  }, 8000);
}

// Update Companion Widget visual mood indicator
function setCompanionMood(mood) {
  if (!companionWidget) return;
  if (mood === 'warning') {
    companionWidget.style.borderColor = 'rgba(255, 0, 0, 0.4)';
    companionWidget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.6), 0 0 25px rgba(255, 0, 0, 0.4)';
  } else if (mood === 'active') {
    companionWidget.style.borderColor = 'rgba(59, 130, 246, 0.4)';
    companionWidget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.6), 0 0 25px rgba(59, 130, 246, 0.4)';
  } else {
    companionWidget.style.borderColor = 'rgba(16, 185, 129, 0.4)';
    companionWidget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.6), 0 0 20px rgba(16, 185, 129, 0.3)';
  }
}

// 8. Companion Interactive Chat Panel Functions
function sendCompanionMessage(messageText) {
  const chatBox = document.getElementById('companion-chat-box');
  const buddyStatus = document.getElementById('buddy-status-text');

  // A. Append user message
  const userMsg = document.createElement('div');
  userMsg.className = "chat-message user";
  userMsg.textContent = messageText;
  chatBox.appendChild(userMsg);
  chatBox.scrollTop = chatBox.scrollHeight;

  buddyStatus.textContent = "Analyzing cognitive queries...";
  setCompanionMood('active');

  // B. Trigger AI summary / answer simulation based on prompt keywords
  setTimeout(() => {
    const responseMsg = document.createElement('div');
    responseMsg.className = "chat-message assistant";
    
    const query = messageText.toLowerCase();
    const videoTitle = getYouTubeVideoTitle();

    if (query.includes("summary") || query.includes("summarize")) {
      responseMsg.textContent = `Here is a semantic summary of the current concept in "${videoTitle}": \n\nWe are exploring the core execution boundaries and functional models. The key active focus lies in mapping execution stacks, avoiding recursive allocation traps, and aligning procedural closures dynamically. This fits heavily into standard systems architecture!`;
    } else if (query.includes("exam") || query.includes("weightage")) {
      responseMsg.textContent = `CRITICAL EXAM ANALYSIS: \n\nThis exact topic ("${document.getElementById('sidebar-concept-title').textContent}") holds massive weightage in core computer science papers. \n\n• GATE CS: Expect 1-2 marks on hoisting recursion or memory scopes. \n• UPSC/Engineering Service: Commonly tested in technical essays. \n• FAANG Interviews: Extremely frequent conceptual checkpoint.`;
    } else if (query.includes("recall") || query.includes("mcq") || query.includes("test")) {
      responseMsg.textContent = `Initiating Quick Checkpoint... Check the center overlay in your YouTube player for the active challenge modal!`;
      const video = document.querySelector('video');
      if (video) {
        triggeredMilestones.add(Math.floor(video.currentTime));
        triggerQuizCheckpoint(Math.floor(video.currentTime), video);
      }
    } else {
      responseMsg.textContent = `ActiveLearn Companion analysis completed: \n\nRegarding "${messageText}", the lecture focuses heavily on the optimal structural execution. For exams like GATE/JEE, remember that proper memory allocation depends directly on lexical environment variables, while conceptual recall improves by 150% through immediate testing. Let's trigger a quick checkpoint!`;
    }

    chatBox.appendChild(responseMsg);
    chatBox.scrollTop = chatBox.scrollHeight;
    buddyStatus.textContent = "Buddy is synchronized";
    setCompanionMood('ready');
  }, 1500);
}

function submitCompanionChat() {
  const input = document.getElementById('companion-input');
  const val = input.value.trim();
  if (val) {
    sendCompanionMessage(val);
    input.value = "";
  }
}

// 9. Attention Intelligence tracking values
function calculateFocusScore() {
  if (activeWatchTimeSeconds === 0) return 100;
  return Math.min(100, Math.max(10, Math.floor((tabFocusedTimeSeconds / activeWatchTimeSeconds) * 100)));
}

function calculateEngagementScore() {
  if (activeWatchTimeSeconds === 0) return 80;
  const interactionPerMinute = (pageInteractionCount / (activeWatchTimeSeconds / 60)) || 0;
  // Standard metric: 5 interactions per minute yields 100% engagement
  return Math.min(100, Math.max(20, Math.floor(Math.min(1.0, interactionPerMinute / 5) * 100)));
}

// 10. Core Attention Monitoring Loops
function initAttentionTracking() {
  // Capture general interactions on body to log engagement metrics
  const interactionEvents = ['mousemove', 'keydown', 'scroll', 'click', 'wheel'];
  interactionEvents.forEach(evt => {
    document.body.addEventListener(evt, () => {
      pageInteractionCount++;
      lastInteractionTimestamp = Date.now();
    });
  });

  // Visbility and focus tracking
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      console.log('[ActiveLearn] Focus lost: Tab placed in background.');
    }
  });

  // Global background timers: Increment stats every 1 second
  setInterval(() => {
    if (!window.location.href.includes('/watch') || !isEducational) return;

    const video = document.querySelector('video');
    if (video && !video.paused && !video.ended) {
      activeWatchTimeSeconds++;
      
      if (document.hasFocus() && document.visibilityState === 'visible') {
        tabFocusedTimeSeconds++;
      }

      // Check attention fatigue (>20 mins playing with zero questions answered)
      if (activeWatchTimeSeconds > 1200 && !attentionFatigueTriggered) {
        chrome.storage.local.get(['questionsAnswered'], (data) => {
          const answered = data.questionsAnswered || 0;
          if (answered === 0) {
            attentionFatigueTriggered = true;
            setCompanionMood('warning');
            triggerCompanionIntervention("You have been watching passively for 20 minutes. Boost retention with a quick recall check!");
          }
        });
      }
    }
  }, 1000);
}

// High-frequency polling loops (checking milestones, skips, SPA links)
function startPollingLoops() {
  // A. Dynamic Skipping/Seek tracking
  setInterval(() => {
    if (!isEducational || !window.location.href.includes('/watch')) return;

    const video = document.querySelector('video');
    if (video) {
      const currentPos = video.currentTime;
      // Seek detection: if the playhead jumped forward or backward by more than 15 seconds
      if (Math.abs(currentPos - lastPlayheadPosition) > 15) {
        consecutiveSkipsCount++;
        console.log(`[ActiveLearn] Seek detected. Playhead moved: ${Math.floor(lastPlayheadPosition)}s -> ${Math.floor(currentPos)}s`);

        if (consecutiveSkipsCount > 3) {
          triggerCompanionIntervention("Frequent playhead skipping detected! Passive skimming reduces recall. Let's do a fast recall test to calibrate.");
          consecutiveSkipsCount = 0;
          setCompanionMood('warning');
        }
      }
      lastPlayheadPosition = currentPos;
    }
  }, 1500);

  // B. Periodically refresh dashboard analytics UI
  setInterval(() => {
    updateDashboardUI();
    updateAnalyticsVisuals();
  }, 4000);

  // C. Automatic 10-Minute (600s) Quiz Trigger
  let lastCheckedTime = 0;
  setInterval(() => {
    if (!isEducational || !window.location.href.includes('/watch')) return;

    const video = document.querySelector('video');
    if (video && !video.paused && !video.ended) {
      const currentPos = Math.floor(video.currentTime);
      
      const lastInterval = Math.floor(lastCheckedTime / 600);
      const currentInterval = Math.floor(currentPos / 600);
      
      // Trigger when crossing forward over a 10-minute boundary (e.g., 600s, 1200s, 1800s, etc.)
      if (currentInterval > lastInterval && currentInterval > 0) {
        const milestone = currentInterval * 600;
        if (!triggeredMilestones.has(milestone)) {
          triggeredMilestones.add(milestone);
          triggerQuizCheckpoint(milestone, video);
        }
      }
      lastCheckedTime = currentPos;
    }
  }, 1000);
}

// 11. Custom Milestone pop-ups triggering active quizzes
function triggerQuizCheckpoint(timestamp, video) {
  if (!isContextValid()) return;

  const isPlayingBeforePause = !video.paused;
  video.pause();

  const title = getYouTubeVideoTitle();
  console.log(`[ActiveLearn] Question Milestone triggered at ${timestamp}s. Segmenting context.`);

  try {
    // Send message to service worker background to generate dynamic, adaptive quiz
    chrome.runtime.sendMessage({
      action: "getQuestionsQuiz",
      videoTitle: title,
      timestamp: timestamp
    }, async (response) => {
      if (!isContextValid()) return;

      if (response && response.success) {
        const { questions } = response;

        try {
          // Double-check stylesheet injection
          const cssUrl = chrome.runtime.getURL('ui/overlay.css');
          if (!document.querySelector(`link[href="${cssUrl}"]`)) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = cssUrl;
            document.head.appendChild(link);
          }

          const htmlUrl = chrome.runtime.getURL('ui/overlay.html');
          const htmlResponse = await fetch(htmlUrl);
          const htmlMarkup = await htmlResponse.text();

          const virtualDiv = document.createElement('div');
          virtualDiv.innerHTML = htmlMarkup;
          const overlayElement = virtualDiv.firstElementChild;

          const moviePlayer = document.querySelector('#movie_player') || 
                              document.querySelector('.html5-video-container') || 
                              video.parentElement;

          if (!moviePlayer) {
            console.error('[ActiveLearn] Player wrapper not found.');
            video.play();
            return;
          }

          // Clean existing overlays
          const prev = document.getElementById('active-learning-overlay');
          if (prev) prev.remove();

          moviePlayer.appendChild(overlayElement);

          // Trigger overlay display fade-in
          setTimeout(() => {
            overlayElement.classList.add('visible');
          }, 50);

          // Run multi-format overlay.js controller
          if (typeof window.initQuiz === 'function') {
            window.initQuiz(questions, () => {
              console.log('[ActiveLearn] Checkpoint cleared. Resuming player.');
              if (isPlayingBeforePause && video) {
                video.play().catch(e => console.warn('Play resume blocked: ', e));
              }
              // Refresh analytics immediately
              updateAnalyticsVisuals();
            });
          } else {
            console.error('[ActiveLearn] window.initQuiz not loaded.');
            if (isPlayingBeforePause && video) video.play();
          }

        } catch (err) {
          console.error('[ActiveLearn] Overlay instantiation error: ', err);
          if (isPlayingBeforePause && video) video.play();
        }
      } else {
        if (isPlayingBeforePause && video) video.play();
      }
    });
  } catch (err) {
    console.error('[ActiveLearn] Service worker contact failed: ', err);
    if (isPlayingBeforePause && video) video.play();
  }
}

// 11b. Final Summary Report overlay on video completion
function triggerFinalSummaryReport() {
  if (!isContextValid()) return;

  const video = document.querySelector('video');
  if (video) video.pause();

  chrome.storage.local.get(['totalScore', 'questionsAnswered', 'weakConcepts'], async (store) => {
    const answered = store.questionsAnswered || 0;
    const score = store.totalScore || 0;
    const weakList = store.weakConcepts || [];
    
    const accuracy = answered > 0 ? Math.floor((score / answered) * 100) : 100;
    const focusScore = calculateFocusScore();
    const engagementScore = calculateEngagementScore();
    const activeRecallScore = Math.floor((accuracy + focusScore + engagementScore) / 3);

    // Identify mastered vs weak chunks
    const masteredNames = [];
    const weakNames = [];

    conceptChunks.forEach(ch => {
      const hasFailed = weakList.some(w => w.timestamp >= ch.start && w.timestamp < ch.end);
      if (hasFailed) {
        weakNames.push(`${ch.title.split(' (')[0]} (${formatTime(ch.start)}–${formatTime(ch.end)})`);
      } else {
        masteredNames.push(`${ch.title.split(' (')[0]} (${formatTime(ch.start)}–${formatTime(ch.end)})`);
      }
    });

    // Detect weakest segment
    let weakestSegmentText = "You demonstrated strong consistency throughout the lecture. No severe retention drops detected!";
    if (weakList.length > 0) {
      // Find chunk with most errors
      const errorCounts = {};
      weakList.forEach(w => {
        const chunkIndex = Math.floor(w.timestamp / 600);
        errorCounts[chunkIndex] = (errorCounts[chunkIndex] || 0) + 1;
      });

      let maxErrorsIdx = 0;
      let maxErrors = 0;
      for (const idx in errorCounts) {
        if (errorCounts[idx] > maxErrors) {
          maxErrors = errorCounts[idx];
          maxErrorsIdx = parseInt(idx);
        }
      }

      const weakestStart = maxErrorsIdx * 600;
      const weakestEnd = weakestStart + 600;
      const matchingWeakObj = weakList.find(w => Math.floor(w.timestamp / 600) === maxErrorsIdx);
      const weakConceptName = matchingWeakObj ? matchingWeakObj.concept : "Core Theories";
      weakestSegmentText = `Your weakest segment was from <strong>${formatTime(weakestStart)}–${formatTime(weakestEnd)}</strong> covering <strong>${weakConceptName}</strong>. Recommended to rewatch from ${formatTime(weakestStart)}.`;
    }

    try {
      // Inject CSS
      const cssUrl = chrome.runtime.getURL('ui/overlay.css');
      if (!document.querySelector(`link[href="${cssUrl}"]`)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = cssUrl;
        document.head.appendChild(link);
      }

      // Generate HTML markup
      const htmlMarkup = `
        <div id="activelearn-final-report-overlay" class="learning-overlay-wrapper">
          <div class="checkpoint-modal report-card-modal">
            <div class="modal-header">
              <div class="badge-container">
                <span class="checkpoint-badge">LECTURE REPORT CARD</span>
                <span class="topic-badge">Final Retention Summary</span>
              </div>
              <div class="close-report-btn" id="close-report-card">✕</div>
            </div>
            
            <h2 class="report-main-title">ActiveLearn Cognitive Analytics</h2>
            
            <div class="stats-grid">
              <div class="stat-card">
                <span class="stat-value">${answered}</span>
                <span class="stat-label">Attempted</span>
              </div>
              <div class="stat-card">
                <span class="stat-value">${accuracy}%</span>
                <span class="stat-label">Accuracy</span>
              </div>
              <div class="stat-card">
                <span class="stat-value">${focusScore}%</span>
                <span class="stat-label">Focus Index</span>
              </div>
              <div class="stat-card">
                <span class="stat-value">${activeRecallScore}%</span>
                <span class="stat-label">Active Recall</span>
              </div>
            </div>

            <div class="recommendations-box">
              <h3 class="section-title">🧠 COGNITIVE HIGHLIGHTS & SUGGESTIONS</h3>
              <p class="recommendation-lead-text">${weakestSegmentText}</p>
              <div class="concept-lists-row">
                <div class="concept-list-col">
                  <span class="col-title green">✅ MASTERED CONCEPTS</span>
                  <ul class="report-ul">
                    ${masteredNames.slice(0, 3).map(n => `<li>${n}</li>`).join('') || "<li>No segments fully mastered yet. Keep learning!</li>"}
                  </ul>
                </div>
                <div class="concept-list-col">
                  <span class="col-title red">⚠️ REVISION REQUIRED</span>
                  <ul class="report-ul">
                    ${weakNames.slice(0, 3).map(n => `<li>${n}</li>`).join('') || "<li>Perfect performance. Zero revisions needed!</li>"}
                  </ul>
                </div>
              </div>
            </div>

            <div class="heatmap-section-box">
              <span class="col-title">🔥 ATTENTION TIMELINE HEATMAP</span>
              <div class="report-heatmap-grid">
                ${Array.from({ length: 12 }).map((_, i) => {
                  let grade = "score-4";
                  if (weakList.length > 0) {
                    const hits = weakList.filter(c => Math.floor(c.timestamp / 600) % 12 === i).length;
                    if (hits > 2) grade = "score-1";
                    else if (hits === 2) grade = "score-2";
                    else if (hits === 1) grade = "score-3";
                  } else {
                    grade = i % 3 === 0 ? "score-3" : "score-4";
                  }
                  return `<div class="heatmap-cell ${grade}" title="Timeline Section ${i+1}"></div>`;
                }).join('')}
              </div>
            </div>

            <div class="report-footer">
              <button class="submit-btn sync-cloud-btn" id="report-sync-cloud">Sync to Cloud Profile</button>
              <button class="submit-btn close-btn-card" id="report-close-btn">Close Report</button>
            </div>
          </div>
        </div>
      `;

      const virtualDiv = document.createElement('div');
      virtualDiv.innerHTML = htmlMarkup;
      const reportOverlay = virtualDiv.firstElementChild;

      const moviePlayer = document.querySelector('#movie_player') || 
                          document.querySelector('.html5-video-container') || 
                          (video ? video.parentElement : document.body);

      if (!moviePlayer) {
        console.error('[ActiveLearn] Player wrapper not found.');
        return;
      }

      // Clean existing overlays
      const prev = document.getElementById('activelearn-final-report-overlay');
      if (prev) prev.remove();

      moviePlayer.appendChild(reportOverlay);

      // Trigger overlay display fade-in
      setTimeout(() => {
        reportOverlay.classList.add('visible');
      }, 50);

      // Connect button click event handlers
      const closeHandler = () => {
        reportOverlay.classList.remove('visible');
        setTimeout(() => reportOverlay.remove(), 350);
      };

      document.getElementById('close-report-card').onclick = closeHandler;
      document.getElementById('report-close-btn').onclick = closeHandler;

      const syncBtn = document.getElementById('report-sync-cloud');
      syncBtn.onclick = () => {
        syncBtn.disabled = true;
        syncBtn.textContent = "Syncing Profile...";
        
        // Post analytical session payload to local FastAPI backend REST endpoints
        fetch("http://127.0.0.1:8000/api/sync-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: 101, // demo student ID
            video_id: new URLSearchParams(window.location.search).get('v') || "demo_vid",
            video_title: getYouTubeVideoTitle(),
            duration_seconds: Math.floor(video ? video.duration : 1800),
            watch_time_seconds: activeWatchTimeSeconds,
            focus_score: focusScore,
            engagement_score: engagementScore,
            retention_estimate: accuracy
          })
        })
        .then(res => res.json())
        .then(data => {
          console.log('[ActiveLearn] Analytics synchronized successfully: ', data);
          syncBtn.textContent = "✓ Synced to Cloud";
          syncBtn.style.background = "#10b981";
        })
        .catch(err => {
          console.error('[ActiveLearn] Sync request failed: ', err);
          syncBtn.textContent = "Sync Failed (Offline)";
          syncBtn.disabled = false;
        });
      };

    } catch (err) {
      console.error('[ActiveLearn] Final Report construction error: ', err);
    }
  });
}

// 12. Dynamic watch view page loaded initializer
function initActiveLearnLayer() {
  if (!isContextValid()) return;

  // Clear existing nodes if re-injecting on page transition
  const oldDash = document.getElementById('activelearn-dashboard');
  if (oldDash) oldDash.remove();
  const oldComp = document.getElementById('activelearn-companion-widget');
  if (oldComp) oldComp.remove();
  const oldOverlay = document.getElementById('active-learning-overlay');
  if (oldOverlay) oldOverlay.remove();
  const oldFinalReport = document.getElementById('activelearn-final-report-overlay');
  if (oldFinalReport) oldFinalReport.remove();

  // Reset trackers
  triggeredMilestones.clear();
  activeWatchTimeSeconds = 0;
  tabFocusedTimeSeconds = 0;
  pageInteractionCount = 0;
  attentionFatigueTriggered = false;

  // Perform Educational Check
  const passesEdu = checkEducationalContent();
  if (!passesEdu) {
    console.log('[ActiveLearn] Video is not classified as educational. Dashboard stands down.');
    return;
  }

  // Set up elements
  const video = document.querySelector('video');
  if (!video) {
    // Retry polling if player hasn't mounted yet
    setTimeout(initActiveLearnLayer, 1000);
    return;
  }

  videoElement = video;
  
  // Attach final report listener on video ended
  videoElement.onended = () => {
    console.log('[ActiveLearn] Lecture ended event detected. Loading retention dashboard report...');
    triggerFinalSummaryReport();
  };

  console.log('[ActiveLearn] Verified Educational watch page. Injecting cognitive dashboard layers...');

  // Formulate Chunks
  const duration = video.duration || 1800;
  generateSemanticChunks(duration);

  // Ingest sidebar dashboard and companion avatar
  injectDashboard();
  injectCompanionWidget();

  // Reset states
  lastPlayheadPosition = video.currentTime;
}

// Helper formatting seconds -> mm:ss
function formatTime(sec) {
  if (isNaN(sec) || sec <= 0) return "0:00";
  const mins = Math.floor(sec / 60);
  const secs = Math.floor(sec % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function getYouTubeVideoTitle() {
  const metadataTitle = document.querySelector('h1.ytd-watch-metadata') || 
                        document.querySelector('h1.title.style-scope.ytd-video-primary-info-renderer');
  if (metadataTitle && metadataTitle.textContent) {
    return metadataTitle.textContent.trim();
  }
  return document.title || "YouTube Course Lecture";
}

// Watch URL page transitions polling trigger for SPA routing compatibility
let lastHref = window.location.href;
setInterval(() => {
  const currentHref = window.location.href;
  if (currentHref !== lastHref) {
    lastHref = currentHref;
    if (currentHref.includes('/watch')) {
      console.log('[ActiveLearn] Dynamic client routing watch view loaded.');
      setTimeout(initActiveLearnLayer, 1800);
    }
  }
}, 1000);

// Run initial configurations
if (window.location.href.includes('/watch')) {
  setTimeout(() => {
    initActiveLearnLayer();
    initAttentionTracking();
    startPollingLoops();
  }, 2000);
}
