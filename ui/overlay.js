/**
 * ActiveLearn AI - Advanced Quiz Overlay Controller
 * Manages multi-question sequential active recall quizzes directly in YouTube watch overlay.
 * Handles MCQ, Conceptual textareas, Assertion-Reason, Numerical parsing, and PYQ-style exam challenges.
 * Provides micro-animations, feedback states, and saves analytics metrics to local storage.
 */

window.initQuiz = function(questionsList, onCompleteCallback) {
  const overlay = document.getElementById('active-learning-overlay');
  const modal = overlay.querySelector('.checkpoint-modal');
  
  // DOM Elements
  const badgeEl = document.getElementById('challenge-type-badge');
  const topicEl = document.getElementById('checkpoint-topic');
  const streakEl = document.getElementById('checkpoint-streak');
  const progressEl = document.getElementById('checkpoint-progress');
  const progressTextEl = document.getElementById('checkpoint-indicator-text');
  
  const pyqBanner = document.getElementById('exam-pyq-banner');
  const examTagLabel = document.getElementById('exam-tag-label');
  
  const arHeader = document.getElementById('assertion-reason-header');
  const arAssertionText = document.getElementById('ar-assertion-text');
  const arReasonText = document.getElementById('ar-reason-text');
  
  const questionEl = document.getElementById('checkpoint-question');
  
  // Layout Containers
  const optionsStack = document.getElementById('challenge-options-stack');
  const conceptualBox = document.getElementById('challenge-conceptual-box');
  const numericalBox = document.getElementById('challenge-numerical-box');
  
  const conceptualInput = document.getElementById('conceptual-response-input');
  const revealBtn = document.getElementById('conceptual-reveal-btn');
  const selfEvalBox = document.getElementById('conceptual-self-eval-box');
  const evalButtons = selfEvalBox.querySelectorAll('.eval-btn');
  
  const numericalInput = document.getElementById('numerical-input');
  
  const explanationBox = document.getElementById('checkpoint-explanation-box');
  const explanationTextEl = document.getElementById('checkpoint-explanation-text');
  const submitBtn = document.getElementById('checkpoint-submit-btn');
  const optionBtns = optionsStack.querySelectorAll('.option-btn');

  let currentQuestionIndex = 0;
  let selectedIndex = null;
  let selfGradedValue = null;
  let showingExplanation = false;

  // Load the current active streak and topic from local storage
  chrome.storage.local.get(['streak', 'topic'], (store) => {
    streakEl.textContent = store.streak || 0;
    topicEl.textContent = store.topic || 'learning';
  });

  // Render question function
  function renderQuestion(index) {
    const questionData = questionsList[index];
    selectedIndex = null;
    selfGradedValue = null;
    showingExplanation = false;

    // Reset base buttons and layout displays
    submitBtn.disabled = true;
    submitBtn.textContent = "Submit Answer";

    // Hide all headers/banners by default
    pyqBanner.classList.add('hidden');
    arHeader.classList.add('hidden');
    
    // Hide all layout containers
    optionsStack.classList.add('hidden');
    conceptualBox.classList.add('hidden');
    numericalBox.classList.add('hidden');
    
    // Reset explanations
    explanationBox.classList.add('hidden');
    explanationBox.classList.remove('correct-explanation', 'incorrect-explanation');
    explanationTextEl.textContent = "";
    modal.classList.remove('incorrect-shake');

    // Setup Progress indicators
    const pct = Math.floor(((index + 1) / questionsList.length) * 100);
    progressEl.style.width = `${pct}%`;
    progressTextEl.textContent = `Challenge ${index + 1} of ${questionsList.length}`;

    // Determine and display Badge / Challenge Type
    let format = questionData.format || "mcq";
    badgeEl.textContent = format.toUpperCase() + " CHALLENGE";

    // 1. Check for PYQ Banner
    if (questionData.exam) {
      pyqBanner.classList.remove('hidden');
      examTagLabel.textContent = questionData.exam;
      badgeEl.textContent = "PYQ RECALL";
    }

    // 2. Check for Assertion-Reason header
    if (format === "assertion-reason") {
      arHeader.classList.remove('hidden');
      arAssertionText.textContent = questionData.assertion || "";
      arReasonText.textContent = questionData.reason || "";
      badgeEl.textContent = "ASSERTION-REASON";
      questionEl.textContent = "Determine the correct relationship between the Assertion (A) and Reason (R) statements:";
    } else {
      questionEl.textContent = questionData.question;
    }

    // 3. Render appropriate container
    if (format === "mcq" || format === "assertion-reason" || format === "pyq") {
      optionsStack.classList.remove('hidden');
      
      // Assertion-Reason standard options replacement
      const arOptions = [
        "Both A and R are true, and R is the correct explanation of A.",
        "Both A and R are true, but R is NOT the correct explanation of A.",
        "A is true, but R is false.",
        "A is false, but R is true."
      ];

      optionBtns.forEach((btn, idx) => {
        const contentEl = btn.querySelector('.option-content');
        if (contentEl) {
          if (format === "assertion-reason") {
            contentEl.textContent = arOptions[idx];
          } else {
            contentEl.textContent = questionData.options[idx] || "";
          }
        }
        btn.classList.remove('selected', 'correct', 'incorrect');
        btn.disabled = false;

        btn.onclick = () => {
          if (showingExplanation) return;
          optionBtns.forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          selectedIndex = idx;
          submitBtn.disabled = false;
        };
      });
      
    } else if (format === "conceptual") {
      conceptualBox.classList.remove('hidden');
      conceptualInput.value = "";
      conceptualInput.disabled = false;
      selfEvalBox.classList.add('hidden');
      revealBtn.classList.remove('hidden');
      
      revealBtn.onclick = () => {
        if (!conceptualInput.value.trim()) {
          modal.classList.add('incorrect-shake');
          setTimeout(() => modal.classList.remove('incorrect-shake'), 500);
          return;
        }
        revealBtn.classList.add('hidden');
        conceptualInput.disabled = true;
        selfEvalBox.classList.remove('hidden');
        
        // Show correct explanation/answer for reference
        explanationBox.classList.remove('hidden');
        explanationBox.classList.add('correct-explanation');
        explanationTextEl.textContent = questionData.explanation;
      };

      evalButtons.forEach(btn => {
        btn.onclick = () => {
          selfGradedValue = btn.getAttribute('data-grade'); // "weak", "partial", "strong"
          submitBtn.disabled = false;
          evalButtons.forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          
          // For conceptual, set submit button to say Next/Finish directly
          submitBtn.textContent = (currentQuestionIndex === questionsList.length - 1) ? "Finish & Resume" : "Continue";
        };
      });
      
    } else if (format === "numerical") {
      numericalBox.classList.remove('hidden');
      numericalInput.value = "";
      numericalInput.disabled = false;
      
      numericalInput.oninput = () => {
        if (showingExplanation) return;
        submitBtn.disabled = (numericalInput.value.trim() === "");
      };
    }
  }

  // Fade card transition animation
  function animateCardTransition(index) {
    modal.style.transition = 'opacity 0.22s ease, transform 0.22s ease';
    modal.style.opacity = '0';
    modal.style.transform = 'translateY(12px) scale(0.97)';

    setTimeout(() => {
      renderQuestion(index);
      modal.style.opacity = '1';
      modal.style.transform = 'translateY(0) scale(1)';
    }, 220);
  }

  // Main Submit Trigger
  submitBtn.onclick = () => {
    const questionData = questionsList[currentQuestionIndex];
    const format = questionData.format || "mcq";

    if (format !== "conceptual" && !showingExplanation) {
      submitBtn.disabled = true;
      let isCorrect = false;

      // A. MCQ, Assertion-Reason, or standard PYQ check
      if (format === "mcq" || format === "assertion-reason" || format === "pyq") {
        isCorrect = (selectedIndex === questionData.correctIndex);
        optionBtns.forEach(btn => btn.disabled = true);
        
        if (isCorrect) {
          optionBtns[selectedIndex].classList.add('correct');
          explanationBox.classList.add('correct-explanation');
        } else {
          if (selectedIndex !== null) optionBtns[selectedIndex].classList.add('incorrect');
          optionBtns[questionData.correctIndex].classList.add('correct');
          modal.classList.add('incorrect-shake');
          explanationBox.classList.add('incorrect-explanation');
        }
        
        explanationBox.classList.remove('hidden');
        explanationTextEl.textContent = questionData.explanation;
        
      } 
      // B. Numerical exact checks
      else if (format === "numerical") {
        numericalInput.disabled = true;
        const userAnsStr = numericalInput.value.trim().toLowerCase();
        const correctAnsStr = String(questionData.correctNumeric).trim().toLowerCase();
        
        const userNum = parseFloat(userAnsStr);
        const correctNum = parseFloat(correctAnsStr);
        
        if (!isNaN(userNum) && !isNaN(correctNum)) {
          isCorrect = Math.abs(userNum - correctNum) < 0.01;
        } else {
          isCorrect = (userAnsStr === correctAnsStr);
        }
        
        explanationBox.classList.remove('hidden');
        if (isCorrect) {
          explanationBox.classList.add('correct-explanation');
          numericalInput.style.borderColor = "#10b981";
          numericalInput.style.boxShadow = "0 0 10px rgba(16, 185, 129, 0.2)";
        } else {
          explanationBox.classList.add('incorrect-explanation');
          numericalInput.style.borderColor = "#ef4444";
          numericalInput.style.boxShadow = "0 0 10px rgba(239, 68, 68, 0.2)";
          modal.classList.add('incorrect-shake');
        }
        explanationTextEl.textContent = `Correct value: ${questionData.correctNumeric}. \n\n${questionData.explanation}`;
      }

      // Save analytics tracking to local chrome storage
      chrome.storage.local.get(['totalScore', 'questionsAnswered', 'streak', 'weakConcepts'], (data) => {
        let score = data.totalScore || 0;
        let answered = data.questionsAnswered || 0;
        let streak = data.streak || 0;
        let weakConcepts = data.weakConcepts || [];

        answered += 1;

        if (isCorrect) {
          score += 1.0;
          streak += 1;
        } else {
          streak = 0;
          const timestampVal = questionData.timestamp || 0;
          const conceptName = questionData.concept || "General Topic";
          const explanationExcerpt = questionData.explanation || "";

          const alreadyRegistered = weakConcepts.some(c => c.timestamp === timestampVal);
          if (!alreadyRegistered) {
            weakConcepts.push({
              concept: conceptName,
              timestamp: timestampVal,
              explanation: explanationExcerpt,
              date: new Date().toLocaleDateString()
            });
          }
        }

        streakEl.textContent = streak;

        chrome.storage.local.set({
          totalScore: score,
          questionsAnswered: answered,
          streak: streak,
          weakConcepts: weakConcepts
        }, () => {
          console.log(`[ActiveLearn] Stats saved. Correct=${isCorrect} | Score=${score}/${answered} | Streak=${streak}`);
        });

        // Set state to showingExplanation and enable the button to proceed
        showingExplanation = true;
        submitBtn.textContent = (currentQuestionIndex === questionsList.length - 1) ? "Finish & Resume" : "Continue";
        submitBtn.disabled = false;
      });
      return;
    }

    // If it's a conceptual question or showingExplanation is true, proceed to next
    if (format === "conceptual") {
      let isCorrect = (selfGradedValue === "strong" || selfGradedValue === "partial");
      chrome.storage.local.get(['totalScore', 'questionsAnswered', 'streak', 'weakConcepts'], (data) => {
        let score = data.totalScore || 0;
        let answered = data.questionsAnswered || 0;
        let streak = data.streak || 0;
        let weakConcepts = data.weakConcepts || [];

        answered += 1;
        if (isCorrect) {
          score += (selfGradedValue === "partial") ? 0.5 : 1.0;
          streak += 1;
        } else {
          streak = 0;
          const timestampVal = questionData.timestamp || 0;
          const conceptName = questionData.concept || "General Topic";
          const explanationExcerpt = questionData.explanation || "";

          const alreadyRegistered = weakConcepts.some(c => c.timestamp === timestampVal);
          if (!alreadyRegistered) {
            weakConcepts.push({
              concept: conceptName,
              timestamp: timestampVal,
              explanation: explanationExcerpt,
              date: new Date().toLocaleDateString()
            });
          }
        }

        streakEl.textContent = streak;

        chrome.storage.local.set({
          totalScore: score,
          questionsAnswered: answered,
          streak: streak,
          weakConcepts: weakConcepts
        }, () => {
          proceedToNext();
        });
      });
    } else {
      proceedToNext();
    }

    function proceedToNext() {
      if (currentQuestionIndex < questionsList.length - 1) {
        currentQuestionIndex += 1;
        animateCardTransition(currentQuestionIndex);
      } else {
        // Final question answered: dissolve and trigger callback
        overlay.classList.remove('visible');
        setTimeout(() => {
          overlay.remove();
          if (typeof onCompleteCallback === 'function') {
            onCompleteCallback();
          }
        }, 350);
      }
    }
  };

  // Run initial render
  renderQuestion(currentQuestionIndex);
};
