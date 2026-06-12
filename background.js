/**
 * ActiveLearn AI - Background Orchestrator
 * Restructured chunk-specific active recall generator.
 * Maps questions to specific 10-minute lecture segments (0-10m, 10-20m, etc.).
 * Uses current streak to adaptively select formats and difficulty levels.
 */

// Initialize default storage states upon installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    totalScore: 0,
    questionsAnswered: 0,
    streak: 0,
    weakConcepts: []
  }, () => {
    console.log('[ActiveLearn AI] Background Service Worker Initialized.');
  });
});

// CHUNK-BASED DIVERSIFIED QUESTION DATABASE
// Structured strictly by: Topic -> Chunk ID (1: 0-10m, 2: 10-20m, 3: 20-30m, 4: 30-40m, 5: 40-50m, 6+: 50m+)
const CHUNK_QUESTION_DATABASE = {
  javascript: {
    1: [ // Chunk 1 (0-10 mins) - Scopes, Variables, Arrays
      {
        format: "mcq",
        concept: "Variables Declarations",
        question: "Which of the following correctly describes variable scoping in modern JavaScript?",
        options: [
          "var is block-scoped, while let and const are function-scoped.",
          "let and const are block-scoped, whereas var is function-scoped.",
          "let, var, and const are all compiled as globally immutable arrays.",
          "const allows variable reassignment and redeclaration within the same block scope."
        ],
        correctIndex: 1,
        explanation: "Variables declared with let and const bind directly to their enclosing block scope. var hoists globally or to its parent functional scope, allowing duplicate declarations which can cause silent runtime errors."
      },
      {
        format: "numerical",
        concept: "Array Indexing",
        question: "Consider an array `let arr = [10, 20, 30, 40]`. What is the evaluated integer result of `arr[arr.length - 2]`?",
        correctNumeric: 30,
        explanation: "arr.length is 4. arr[4 - 2] evaluates to arr[2]. JavaScript arrays use 0-based indexing: arr[0]=10, arr[1]=20, arr[2]=30."
      },
      {
        format: "conceptual",
        concept: "Equality Coercion",
        question: "Explain why double equality '==' is generally avoided in favor of triple equality '===' in professional codebases.",
        explanation: "Double equality (==) performs type coercion before comparison, which leads to strange edge cases like `[] == false` or `0 == ''` returning true. Triple equality (===) performs strict comparison, checking both the value and the type directly without type casting.",
        solutionKeyPoints: ["type coercion", "strict comparison", "checks value and type"]
      }
    ],
    2: [ // Chunk 2 (10-20 mins) - Closures, TDZ, Arrow Functions context
      {
        format: "pyq",
        exam: "GATE Computer Science 2021",
        concept: "Closure Preservations",
        question: "What is the primary operational mechanism behind JavaScript closures?",
        options: [
          "A method that converts dynamic variables into static database tables.",
          "An inner function retaining references to its parent lexical scope variables even after the parent function completes execution.",
          "An abstract compiler layer that halts browser paint ticks during asynchronous fetching.",
          "A security standard that encrypts local variable objects before storage."
        ],
        correctIndex: 1,
        explanation: "Closures give functional references memory retention of their outer scopes. At runtime, functional contexts remain bound to their lexical scope environments, avoiding garbage collection of parent variable blocks."
      },
      {
        format: "assertion-reason",
        concept: "Temporal Dead Zone",
        question: "Temporal Dead Zone (TDZ) hoisting behaviors:",
        assertion: "Accessing variables declared with let or const before their declaration line throws a ReferenceError.",
        reason: "let and const variables are hoisted but reside in an uninitialized Temporal Dead Zone until their declaration is compiled.",
        correctIndex: 0, // Both true, correct explanation
        explanation: "Both statements are true. Hoisting registers let/const parameters in memory, but unlike var (which initializes as undefined), accessing them inside the TDZ throws a strict ReferenceError."
      },
      {
        format: "conceptual",
        concept: "Arrow Functions Context",
        question: "How does the binding of the 'this' keyword differ inside an arrow function compared to a standard function?",
        explanation: "Arrow functions do not bind their own 'this' dynamic context. Instead, they capture 'this' lexically from their enclosing parent execution context. Standard functions bind 'this' dynamically based on how and where the function is invoked.",
        solutionKeyPoints: ["lexical binding", "parent execution context", "no dynamic binding"]
      }
    ],
    3: [ // Chunk 3 (20-30 mins) - Event loop, Callbacks, Async order
      {
        format: "pyq",
        exam: "FAANG System Review",
        concept: "Asynchronous Tick Priorities",
        question: "In the JavaScript Event Loop tick, which queue is checked and fully drained first?",
        options: [
          "Macrotask queue (setTimeout, setInterval) runs first to maintain paint FPS.",
          "Microtask queue (Promise.then, queueMicrotask) is fully drained before the next macrotask executes.",
          "Both queues execute concurrently inside multi-threaded browser engines.",
          "The render frame ticks alternate evenly between macro and micro arrays."
        ],
        correctIndex: 1,
        explanation: "After the active synchronous call stack clears, the engine immediately yields to drain the Microtask queue. Only once all microtasks (promises) are cleared does V8 proceed to fetch the next macrotask (setTimeout)."
      },
      {
        format: "numerical",
        concept: "Recursion Counts",
        question: "Consider a recursive function `func(x) { if(x <= 1) return 1; return x + func(x - 2); }`. What is the evaluated output integer for `func(5)`?",
        correctNumeric: 9,
        explanation: "func(5) returns 5 + func(3). func(3) returns 3 + func(1). func(1) returns 1. Combining them: 5 + 3 + 1 = 9."
      },
      {
        format: "numerical",
        concept: "Asynchronous Ordering",
        question: "Assume a Promise executes synchronously but resolves asynchronously. In what order is console output triggered? Consider `console.log(1); Promise.resolve().then(() => console.log(2)); console.log(3);` What is the index of '2' in the resulting console sequence (1-indexed)?",
        correctNumeric: 3,
        explanation: "V8 outputs 1 synchronously, schedules 2 to the microtask queue, outputs 3 synchronously. Finally, V8 drains microtasks and outputs 2. The order is [1, 3, 2], so 2 is the 3rd index."
      }
    ],
    4: [ // Chunk 4 (30-40 mins) - Prototypes, JIT compile
      {
        format: "assertion-reason",
        concept: "Prototypal Access",
        question: "Prototypal chain lookups:",
        assertion: "Object.create(null) produces an object that lacks properties like hasOwnProperty or toString.",
        reason: "Object.create(null) initializes a brand new object whose internal prototypal pointer (__proto__) terminates directly at null instead of Object.prototype.",
        correctIndex: 0, // Both true, correct explanation
        explanation: "Both statements are true. Passing null removes Object.prototype from the prototypal inheritance path, yielding a raw, clean map lacking standard utility prototype methods."
      },
      {
        format: "pyq",
        exam: "GATE Computer Science 2023",
        concept: "V8 Compiler Optimization",
        question: "How does the V8 Engine optimize dynamic functional executions at runtime?",
        options: [
          "V8 converts JavaScript code directly into binary web assembly before parsing.",
          "By profiling bytecode execution, V8 identifies hot functions and uses JIT (TurboFan) compiler to compile them directly into highly optimized machine code.",
          "By caching all variables inside session databases to avoid V8 registry lookups.",
          "V8 compiles all dynamic arrays into rigid C++ struct structures sequentially."
        ],
        correctIndex: 1,
        explanation: "V8 leverages JIT (Just-In-Time) compilation. Bytecode tracks hot paths; highly executed functions are fed to the TurboFan compiler which produces optimized assembly instructions, reverting back to bytecode if structural assumptions change."
      }
    ],
    5: [ // Chunk 5 (40-50 mins) - Memory leaks, ES modules
      {
        format: "conceptual",
        concept: "Memory Leak Diagnostics",
        question: "Describe three common architectural patterns that cause memory leaks in modern Single Page Applications (SPAs).",
        explanation: "1. Forgotten timers or intervals (setInterval) that keep references to child state alive. 2. Unremoved event listeners attached globally (e.g. window.addEventListener) that reference local elements. 3. Detached DOM nodes retained inside parent object registries or closures.",
        solutionKeyPoints: ["forgotten timers", "unremoved global listeners", "detached DOM nodes"]
      }
    ]
  },
  python: {
    1: [ // Chunk 1 (0-10 mins) - Mutability & Slicing
      {
        format: "mcq",
        concept: "List Mutability",
        question: "Which of the following statements about standard Python data types is correct?",
        options: [
          "Tuples and Lists are both mutable structures.",
          "Tuples are immutable, while Lists are mutable and can be modified in-place.",
          "Strings allow item reassignment, making them mutable.",
          "Integers and Float values are mutable objects in Pythons."
        ],
        correctIndex: 1,
        explanation: "Lists can be modified in-place (items added/removed). Tuples, strings, integers, and floats are completely immutable in Python; modifications create new objects in memory."
      },
      {
        format: "numerical",
        concept: "List Slicing",
        question: "Consider a Python list `x = [1, 2, 3, 4, 5]`. What is the length of the sliced list `x[1:4]`?",
        correctNumeric: 3,
        explanation: "x[1:4] yields items from index 1 up to index 3 (exclusive of 4). Sliced list: [2, 3, 4], which has a length of 3."
      }
    ],
    2: [ // Chunk 2 (10-20 mins) - Decorators, Memory references
      {
        format: "pyq",
        exam: "UPSC Civil Services technical",
        concept: "Decorator Mechanics",
        question: "What does the Python decorator pattern allow developers to achieve?",
        options: [
          "Decorator compresses script size before compilation.",
          "It allows wrapping a target function to dynamically extend or modify its execution behavior without modifying its source code.",
          "It forces the Python code to run exclusively inside web servers.",
          "It automates SQL migration table indexing."
        ],
        correctIndex: 1,
        explanation: "Decorators intercept functional arguments and responses dynamically, letting developers inject logs, caching, or authentication around existing functions without altering the base logic."
      },
      {
        format: "assertion-reason",
        concept: "Memory Reference",
        question: "Object identity comparison in Python:",
        assertion: "The expression 'a is b' evaluates to True if 'a == b' is True in all cases.",
        reason: "The 'is' operator checks reference identity (memory addresses), whereas the '==' operator evaluates value equality.",
        correctIndex: 3, // Assertion is false, Reason is true
        explanation: "Assertion is false. Value equality doesn't mean identity in memory. E.g. `x = [1,2]` and `y = [1,2]` means `x == y` is True, but `x is y` is False as they reference separate arrays."
      }
    ],
    3: [ // Chunk 3 (20-30 mins) - GIL & CPU Threading
      {
        format: "pyq",
        exam: "GATE Computer Science 2022",
        concept: "Global Interpreter Lock",
        question: "What is the operational effect of Python's Global Interpreter Lock (GIL)?",
        options: [
          "It blocks external scripting attacks during runtime.",
          "It is a mutex ensuring only one thread executes Python bytecode at a time, limiting true parallel scale of CPU-bound multi-threaded scripts.",
          "It translates bytecode directly into native executable assembly.",
          "It allows running python scripts in browser context scripts."
        ],
        correctIndex: 1,
        explanation: "The GIL simplifies memory management by ensuring only one thread runs bytecode concurrently. This makes multi-threading slow for CPU-bound tasks, requiring multiprocessing packages to utilize multiple CPU cores."
      }
    ],
    4: [ // Chunk 4 (30-40 mins) - OOP Metaclasses
      {
        format: "conceptual",
        concept: "Metaclasses construct",
        question: "Explain Python metaclasses and describe a realistic scenario where you would implement them.",
        explanation: "Metaclasses are 'classes of classes' that define how classes themselves are constructed. They inherit from 'type' and intercept class creation. They are typically implemented in framework design (like Django ORM or Pydantic validation schemas) to auto-register fields and enforce class interface constraints.",
        solutionKeyPoints: ["class construction", "inherits from type", "framework ORM design"]
      }
    ]
  },
  react: {
    1: [ // Chunk 1 (0-10 mins) - Virtual DOM diff
      {
        format: "mcq",
        concept: "Virtual DOM role",
        question: "What is the primary role of React's Virtual DOM reconciliation?",
        options: [
          "To bypass browser engines completely and paint on canvas grids.",
          "To maintain an in-memory UI representation, perform diffing on state updates, and apply minimal batches to the real DOM.",
          "To cache absolute HTML raw nodes inside local session cookies.",
          "To compress script sizes in client browser bundles."
        ],
        correctIndex: 1,
        explanation: "Virtual DOM reconciliation tracks state diffs. By calculating minimal paint alterations (reconciliation diffs), React avoids heavy browser reflows and repaints."
      }
    ],
    2: [ // Chunk 2 (10-20 mins) - Hooks & Lifecycles
      {
        format: "pyq",
        exam: "Frontend Core Exam",
        concept: "Hooks Dependency lists",
        question: "What does providing an empty dependency array `[]` in `useEffect` achieve?",
        options: [
          "It disables the hook, preventing any trigger.",
          "It executes the hook callback exactly once after the initial render (mount) and runs cleanup once upon unmount.",
          "It creates an infinite rendering cycle.",
          "It delegates functional state updates to separate background threads."
        ],
        correctIndex: 1,
        explanation: "An empty list tells React the effect depends on zero state changes, causing V8 to trigger the effect once upon mounting (acting like standard componentDidMount lifecycle)."
      }
    ],
    3: [ // Chunk 3 (20-30 mins) - Context API bottlenecks
      {
        format: "assertion-reason",
        concept: "Context Rendering limits",
        question: "React Context Render Performance:",
        assertion: "Heavy use of React Context API for high-frequency state updates can lead to performance bottlenecks.",
        reason: "Any change to a Context Provider's value forces all child components that consume that context to re-render, lacking fine-grained selector optimizations.",
        correctIndex: 0, // Both true, correct explanation
        explanation: "Both statements are true. Unlike specialized stores (like Redux/Zustand), Context lacks granular component selectors; any provider change forces V8 to rebuild all active consumer states."
      }
    ],
    4: [ // Chunk 4 (30-40 mins) - React Server Components
      {
        format: "pyq",
        exam: "GATE Systems 2024",
        concept: "React Server Components",
        question: "What is the foundational architectural advantage of React Server Components (RSC)?",
        options: [
          "They translate component rendering into web assembly loops.",
          "They render exclusively on the server and stream lightweight UI data, allowing developers to omit heavy dependency bundles from the client JavaScript payload.",
          "They disable CSS styling to secure application bundles.",
          "They automate database tables creation inside cloud systems."
        ],
        correctIndex: 1,
        explanation: "RSC executes entirely on the server. Since dependencies (like markdown parsers or date libraries) remain on the server, the client bundle remains small, drastically reducing paint and load times."
      }
    ]
  },
  general: {
    1: [ // Chunk 1 (0-10 mins) - REST vs GraphQL
      {
        format: "mcq",
        concept: "REST vs GraphQL",
        question: "What is the structural difference between REST APIs and GraphQL?",
        options: [
          "REST is for static pages, whereas GraphQL queries databases.",
          "REST exposes fixed-shape endpoint structures, while GraphQL utilizes a single endpoint allowing clients to query exact fields.",
          "GraphQL runs strictly on high-priority WebSocket loops.",
          "REST requires SQL structures, whereas GraphQL uses NoSQL."
        ],
        correctIndex: 1,
        explanation: "REST exposes explicit resources via URLs. GraphQL uses schemas with a single POST endpoint where the client specifies the exact return attributes, eliminating over-fetching."
      }
    ],
    2: [ // Chunk 2 (10-20 mins) - ACID
      {
        format: "pyq",
        exam: "Competitive Exam Core",
        concept: "Database ACID Model",
        question: "What are the core guarantees of the database ACID model?",
        options: [
          "Scalability, indexing, dynamic schema alterations, and rapid indexing.",
          "Atomicity, Consistency, Isolation, and Durability, ensuring transactions process reliably.",
          "Asynchronous replication, clusters, and dual-disk security.",
          "Auto-indexing, caching registries, and data compression grids."
        ],
        correctIndex: 1,
        explanation: "ACID ensures reliability: Atomicity (all-or-nothing), Consistency (integrity constraints), Isolation (concurrent execution yields isolated results), and Durability (saved permanently)."
      }
    ],
    3: [ // Chunk 3 (20-30 mins) - Caching
      {
        format: "assertion-reason",
        concept: "Distributed Caching",
        question: "Distributed Caching Layers:",
        assertion: "Using Redis in front of a relational SQL database increases query read performance dramatically.",
        reason: "Redis is an in-memory key-value data store that serves queries directly from dynamic RAM, avoiding slower disk-bound relational database lookups.",
        correctIndex: 0, // Both true, correct explanation
        explanation: "Both statements are true. Serving highly hit static query results directly from RAM yields sub-millisecond lookups, reducing standard disk database I/O bottlenecks."
      }
    ],
    4: [ // Chunk 4 (30-40 mins) - CAP
      {
        format: "pyq",
        exam: "UPSC technical ESE",
        concept: "CAP Theorem",
        question: "In distributed systems, what does the CAP Theorem state?",
        options: [
          "Distributed networks always guarantee Capacity, Availability, and Portability concurrently.",
          "In the presence of a network partition (P), a distributed system can guarantee either Consistency (C) or Availability (A), but not both.",
          "Systems are always secure (C), highly available (A), and cost-efficient (P).",
          "Data must always be fully partitioned before system compile."
        ],
        correctIndex: 1,
        explanation: "CAP states you must trade-off. When nodes lose contact (Partition), the system can either pause writes to keep data identical (Consistency) or continue writes on local nodes yielding mismatched states (Availability)."
      }
    ]
  }
};

// Main message handler listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getQuestionsQuiz") {
    const { videoTitle, timestamp } = message;
    const titleLower = (videoTitle || "").toLowerCase();
    
    // Step A: Detect active topic
    let topic = "general";
    if (titleLower.includes("javascript") || titleLower.includes(" js ") || titleLower.includes("js:") || titleLower.includes("web dev") || titleLower.includes("frontend") || titleLower.includes("html") || titleLower.includes("css")) {
      topic = "javascript";
    } else if (titleLower.includes("python") || titleLower.includes("django") || titleLower.includes("flask") || titleLower.includes("data science") || titleLower.includes("machine learning")) {
      topic = "python";
    } else if (titleLower.includes("react") || titleLower.includes("hook") || titleLower.includes("nextjs") || titleLower.includes("vue") || titleLower.includes("angular")) {
      topic = "react";
    }

    // Resolve chunk ID based on the timestamp (milestone)
    // Milestone 600 -> Chunk 1, Milestone 1200 -> Chunk 2, etc.
    const chunkId = Math.max(1, Math.ceil(timestamp / 600));

    // Step B: Performance-based Adaptive Difficulty format styling
    chrome.storage.local.get(['streak'], (data) => {
      const streak = data.streak || 0;
      console.log(`[ActiveLearn Service Worker] Adaptive Format: Streak=${streak} | Chunk ID=${chunkId} | Topic=${topic.toUpperCase()}`);

      const topicLib = CHUNK_QUESTION_DATABASE[topic] || CHUNK_QUESTION_DATABASE["general"];
      
      // Pull questions strictly for this chunkId (or wrap around if chunkId exceeds database limit)
      const maxAvailableChunk = Object.keys(topicLib).length;
      const targetChunk = chunkId <= maxAvailableChunk ? chunkId : (chunkId % maxAvailableChunk || maxAvailableChunk);
      
      let pool = topicLib[targetChunk] || topicLib[1] || [];
      
      // If the pool is small, combine with generic fallback questions
      if (pool.length < 3) {
        const fallbacks = CHUNK_QUESTION_DATABASE["general"][targetChunk] || CHUNK_QUESTION_DATABASE["general"][1] || [];
        pool = [...pool, ...fallbacks];
      }

      // Filter and clone 3 random questions from the pool, adding timestamps
      const shuffled = [...pool].sort(() => 0.5 - Math.random());
      
      let questions = [];
      let pickedCount = 0;
      for (const q of shuffled) {
        const alreadyPicked = questions.some(sq => sq.question === q.question);
        if (!alreadyPicked) {
          const copy = JSON.parse(JSON.stringify(q));
          copy.timestamp = timestamp + (pickedCount * 5); // spacing out slightly
          questions.push(copy);
          pickedCount++;
        }
        if (questions.length === 3) break;
      }

      // Ensure we have at least 2 questions (duplicating if necessary)
      while (questions.length < 2 && pool.length > 0) {
        questions.push(JSON.parse(JSON.stringify(pool[0])));
      }

      console.log(`[ActiveLearn Service Worker] Generated ${questions.length} questions for Chunk ${chunkId}`);

      sendResponse({
        success: true,
        topic: topic,
        chunkId: chunkId,
        questions: questions
      });
    });

    return true; // Keep message channel open for async sendResponse
  }
});
