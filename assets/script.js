let score = 0;
let questionsData = null;
let selectedType = null;
let selectedChapter = null;
let userAnswers = [];
let totalQuestions = 0;

function shuffle(array) {
  return array.sort(() => Math.random() - 0.5);
}

async function loadQuestions() {
  if (!questionsData) {
    const res = await fetch('assets/questions.json');
    questionsData = await res.json();
  }
  score = 0;
  userAnswers = [];
  selectedType = null;
  selectedChapter = null;
  document.getElementById("homepage-card").style.display = "block";
  document.getElementById("type-select").style.display = "none";
  document.getElementById("quiz-card").style.display = "none";
  document.getElementById("score-card").style.display = "none";
}

function chooseChapter(chapterKey) {
  selectedChapter = chapterKey;
  document.getElementById("type-select").style.display = "block";
}

function startQuiz(type) {
  selectedType = type;
  score = 0;
  userAnswers = [];
  document.getElementById("homepage-card").style.display = "none";
  document.getElementById("score-card").style.display = "none";
  document.getElementById("quiz-card").style.display = "block";
  renderQuestions();
}
function renderQuestions() {
  let questions = [];
  let title = "Quiz";
  let chapterData = questionsData[selectedChapter] || questionsData;
  if (selectedType === "true_false") {
    questions = chapterData.true_false || [];
    title = "True or False";
  } else if (selectedType === "multiple_choice") {
    questions = chapterData.multiple_choice || [];
    title = "Multiple Choice";
  } else if (selectedType === "problems") {
    questions = chapterData.problems || [];
    title = "Problems";
  }
  totalQuestions = questions.length;
  document.getElementById("quiz-title").innerText = title;
  const container = document.getElementById("quiz-questions");
  container.innerHTML = "";
  // Only use the Back button in index.html, do not add another here
  container.innerHTML = "";
  questions.forEach((q, i) => {
    let html = `<div class='question-block'><span style='font-weight:bold'>${i+1}. </span>`;
    if (selectedType === "true_false") {
      html += `${q.question}<br>`;
      html += `<label><input type='radio' name='q${i}' value='true'>True</label> `;
      html += `<label><input type='radio' name='q${i}' value='false'>False</label>`;
    } else if (selectedType === "multiple_choice") {
      html += `${q.question}<br>`;
      q.choices.forEach(choice => {
        html += `<label><input type='radio' name='q${i}' value='${choice}'>${choice}</label><br>`;
      });
    } else if (selectedType === "problems") {
      html += `${q.scenario}<br>`;
      if (q.table) {
        html += `<table><tr><th>Account</th><th>Amount</th></tr>`;
        q.table.forEach(row => {
          html += `<tr><td>${row[0]}</td><td>${row[1]}</td></tr>`;
        });
        html += `</table>`;
      }
      html += `<input type='text' name='q${i}' placeholder='Enter your answer' />`;
    }
    html += `</div>`;
    container.innerHTML += html;
  });
  // Set the quiz title after rendering
  // Set the quiz title after rendering
  let quizTitle = "Quiz";
  if (selectedType === "true_false") quizTitle = "True or False";
  else if (selectedType === "multiple_choice") quizTitle = "Multiple Choice";
  else if (selectedType === "problems") quizTitle = "Problems";
  document.getElementById('quiz-title').innerText = quizTitle;
}
function submitAnswers() {
  let questions = [];
  let chapterData = questionsData[selectedChapter] || questionsData;
  if (selectedType === "true_false") {
    questions = chapterData.true_false || [];
  } else if (selectedType === "multiple_choice") {
    questions = chapterData.multiple_choice || [];
  } else if (selectedType === "problems") {
    questions = chapterData.problems || [];
  }
  score = 0;
  userAnswers = [];
  for (let i = 0; i < questions.length; i++) {
    let val;
    if (selectedType === "true_false") {
      val = document.querySelector(`input[name='q${i}']:checked`);
      if (val) {
        let ans = val.value === "true";
        userAnswers.push(ans === questions[i].answer);
        if (ans === questions[i].answer) score++;
      } else {
        userAnswers.push(false);
      }
    } else if (selectedType === "multiple_choice") {
      val = document.querySelector(`input[name='q${i}']:checked`);
      if (val) {
        userAnswers.push(val.value === questions[i].answer);
        if (val.value === questions[i].answer) score++;
      } else {
        userAnswers.push(false);
      }
    } else if (selectedType === "problems") {
      val = document.querySelector(`input[name='q${i}']`);
      if (val) {
        let ans = val.value.replace(/[^0-9]/g, "");
        userAnswers.push(ans === questions[i].answer);
        if (ans === questions[i].answer) score++;
      } else {
        userAnswers.push(false);
      }
    }
  }
  showScoreSummary(questions);
}
function showScoreSummary(questions) {
  document.getElementById("quiz-card").style.display = "none";
  document.getElementById("score-card").style.display = "block";
  document.getElementById("score").innerText = score + " / " + totalQuestions;
  let summary = "<h3>Results</h3><ul>";
  questions.forEach((q, i) => {
    let qText = selectedType === "problems" ? q.scenario : q.question;
    summary += `<li>${qText} <span style='color:${userAnswers[i] ? "green" : "red"}'>${userAnswers[i] ? "✔" : "✖"}</span></li>`;
  });
  summary += "</ul>";
  document.getElementById("score-summary").innerHTML = summary;
}

function showTFQuestion() {
  document.getElementById("tf-card").style.display = "block";
  document.getElementById("mc-card").style.display = "none";
  document.getElementById("problem-card").style.display = "none";
  document.getElementById("next-set-btn").style.display = "none";
  if (tfIndex < chapterTF.length) {
    document.getElementById("tf-question").innerHTML = `<span style='font-weight:bold'>Question ${tfIndex+1} of ${chapterTF.length}</span><br>${chapterTF[tfIndex].question}`;
    document.getElementById("tf-feedback").innerText = "";
    document.getElementById("tf-score").innerText = score;
    document.getElementById("score").innerText = score;
  } else {
    document.getElementById("tf-question").innerText = "";
    document.getElementById("tf-feedback").innerText = `True/False set complete! Your score: ${score}/${chapterTF.length}`;
    document.getElementById("next-set-btn").style.display = "block";
  }
}

function checkTF(answer) {
  if (tfIndex >= chapterTF.length) return;
  const feedback = document.getElementById("tf-feedback");
  if (answer === chapterTF[tfIndex].answer) {
    feedback.innerText = "Correct!";
    score++;
    tfAnswers.push(true);
  } else {
    feedback.innerText = "Incorrect.";
    tfAnswers.push(false);
  }
  document.getElementById("tf-score").innerText = score;
  document.getElementById("score").innerText = score;
  setTimeout(() => {
    tfIndex++;
    showTFQuestion();
  }, 1000);
}

function nextSet() {
  if (currentSet === 0) {
    currentSet = 1;
    mcIndex = 0;
    showMCQuestion();
  } else if (currentSet === 1) {
    if (chapterProblems.length > 0) {
      currentSet = 2;
      problemIndex = 0;
      showProblemQuestion();
    } else {
      showSummary();
    }
  } else if (currentSet === 2) {
    showSummary();
  }
}

function showMCQuestion() {
  document.getElementById("tf-card").style.display = "none";
  document.getElementById("mc-card").style.display = "block";
  document.getElementById("problem-card").style.display = "none";
  document.getElementById("next-set-btn").style.display = "none";
  if (mcIndex < chapterMC.length) {
    document.getElementById("mc-question").innerHTML = `<span style='font-weight:bold'>Question ${mcIndex+1} of ${chapterMC.length}</span><br>${chapterMC[mcIndex].question}`;
    const mcContainer = document.getElementById("mc-choices");
    mcContainer.innerHTML = "";
    chapterMC[mcIndex].choices.forEach(choice => {
      const btn = document.createElement("button");
      btn.innerText = choice;
      btn.onclick = () => checkMC(choice);
      mcContainer.appendChild(btn);
    });
    document.getElementById("mc-feedback").innerText = "";
    document.getElementById("mc-score").innerText = score;
    document.getElementById("score").innerText = score;
  } else {
    document.getElementById("mc-question").innerText = "";
    document.getElementById("mc-feedback").innerText = `Multiple Choice set complete! Your score: ${score}/${chapterMC.length + chapterTF.length}`;
    document.getElementById("next-set-btn").style.display = "block";
  }
}

function checkMC(choice) {
  if (mcIndex >= chapterMC.length) return;
  const feedback = document.getElementById("mc-feedback");
  if (choice === chapterMC[mcIndex].answer) {
    feedback.innerText = "Correct!";
    score++;
    mcAnswers.push(true);
  } else {
    feedback.innerText = "Incorrect.";
    mcAnswers.push(false);
  }
  document.getElementById("mc-score").innerText = score;
  document.getElementById("score").innerText = score;
  setTimeout(() => {
    mcIndex++;
    showMCQuestion();
  }, 1000);
}
function showProblemQuestion() {
  document.getElementById("tf-card").style.display = "none";
  document.getElementById("mc-card").style.display = "none";
  document.getElementById("problem-card").style.display = "block";
  document.getElementById("next-set-btn").style.display = "none";
  if (problemIndex < chapterProblems.length) {
    document.getElementById("problem-text").innerHTML = `<span style='font-weight:bold'>Problem ${problemIndex+1} of ${chapterProblems.length}</span><br>${chapterProblems[problemIndex].scenario}`;
    const table = document.getElementById("problem-table");
    table.innerHTML = "<tr><th>Account</th><th>Amount</th></tr>";
    chapterProblems[problemIndex].table.forEach(row => {
      table.innerHTML += `<tr><td>${row[0]}</td><td>${row[1]}</td></tr>`;
    });
    document.getElementById("problem-answer").value = "";
    document.getElementById("problem-feedback").innerText = "";
    document.getElementById("problem-score").innerText = score;
    document.getElementById("score").innerText = score;
  } else {
    document.getElementById("problem-text").innerText = "";
    document.getElementById("problem-feedback").innerText = `Problem set complete! Your score: ${score}/${totalQuestions}`;
    document.getElementById("next-set-btn").style.display = "block";
  }
}
function checkProblem() {
  if (problemIndex >= chapterProblems.length) return;
  const userAnswer = document.getElementById("problem-answer").value.replace(/[^0-9]/g, "");
  const feedback = document.getElementById("problem-feedback");
  if (userAnswer === chapterProblems[problemIndex].answer) {
    feedback.innerText = "Correct!";
    score++;
    problemAnswers.push(true);
  } else {
    feedback.innerText = `Incorrect. Correct answer: ${chapterProblems[problemIndex].answer}`;
    problemAnswers.push(false);
  }
  document.getElementById("problem-score").innerText = score;
  document.getElementById("score").innerText = score;
  setTimeout(() => {
    problemIndex++;
    showProblemQuestion();
  }, 1200);
}
function showSummary() {
  document.getElementById("tf-card").style.display = "none";
  document.getElementById("mc-card").style.display = "none";
  document.getElementById("problem-card").style.display = "none";
  document.getElementById("next-set-btn").style.display = "none";
  let summary = `<h2>Review Complete!</h2><p>Your total score: <strong>${score}/${totalQuestions}</strong></p>`;
  summary += `<h3>True/False Results</h3><ul>`;
  chapterTF.forEach((q, i) => {
    summary += `<li>${q.question} <span style='color:${tfAnswers[i] ? "green" : "red"}'>${tfAnswers[i] ? "✔" : "✖"}</span></li>`;
  });
  summary += `</ul><h3>Multiple Choice Results</h3><ul>`;
  chapterMC.forEach((q, i) => {
    summary += `<li>${q.question} <span style='color:${mcAnswers[i] ? "green" : "red"}'>${mcAnswers[i] ? "✔" : "✖"}</span></li>`;
  });
  summary += `</ul><h3>Problem Results</h3><ul>`;
  chapterProblems.forEach((q, i) => {
    summary += `<li>${q.scenario} <span style='color:${problemAnswers[i] ? "green" : "red"}'>${problemAnswers[i] ? "✔" : "✖"}</span></li>`;
  });
  summary += `</ul><button onclick='restartReviewer()'>Back to Homepage</button>`;
  document.body.innerHTML = `<div class='card'>${summary}</div>`;
}

function restartReviewer() {
  selectedType = null;
  selectedChapter = null;
  score = 0;
  userAnswers = [];
  document.getElementById("homepage-card").style.display = "block";
  document.getElementById("type-select").style.display = "none";
  document.getElementById("quiz-card").style.display = "none";
  document.getElementById("score-card").style.display = "none";
}

window.onload = () => {
  loadQuestions();
};
