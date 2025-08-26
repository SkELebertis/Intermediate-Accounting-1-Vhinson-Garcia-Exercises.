let score = 0;
let questionsData = {};
let problemsData = {};
let selectedType = null;
let selectedChapter = null;
let userAnswers = [];
let totalQuestions = 0;

function formatCurrency(n) {
  if (n === null || n === undefined || n === "") return "";
  const num = Number(n);
  if (isNaN(num)) return n;
  return '₱' + num.toLocaleString();
}

// attach live formatting to an amount input: formats numbers with thousand separators
function attachAmountFormatting(inputEl) {
  if (!inputEl) return;
  const fmt = (raw) => {
    const cleaned = String(raw).replace(/[^0-9.-]/g, '');
    if (cleaned === '') return '';
    const n = Number(cleaned);
    if (!isFinite(n)) return raw;
    // format without decimal places (inputs are whole amounts)
    return n.toLocaleString();
  };

  inputEl.addEventListener('input', (e) => {
    const pos = inputEl.selectionStart || 0;
    const before = inputEl.value;
    const formatted = fmt(before);
    inputEl.value = formatted;
    // try to keep caret at end (simple approach)
    inputEl.selectionStart = inputEl.selectionEnd = inputEl.value.length;
  });

  inputEl.addEventListener('blur', (e) => {
    inputEl.value = fmt(inputEl.value);
  });
}

async function loadQuestions() {
  try {
    const qRes = await fetch('assets/questions.json');
    questionsData = await qRes.json();
  } catch (e) {
    console.warn('Could not load questions.json', e);
    questionsData = {};
  }
  try {
    const pRes = await fetch('assets/problems.json');
    problemsData = await pRes.json();
  } catch (e) {
    // problems.json is optional; fall back to problems inside questions.json
    console.warn('Could not load problems.json', e);
    problemsData = {};
  }

  // If problems are inside questions.json under chapters, merge them
  for (const ch in questionsData) {
    if (!problemsData[ch] && questionsData[ch].problems) {
      problemsData[ch] = { problems: questionsData[ch].problems };
    }
  }

  score = 0;
  userAnswers = [];
  selectedType = null;
  selectedChapter = null;
  document.getElementById('homepage-card').style.display = 'block';
  document.getElementById('type-select').style.display = 'none';
  document.getElementById('quiz-card').style.display = 'none';
  document.getElementById('score-card').style.display = 'none';
}

function chooseChapter(chapterKey) {
  selectedChapter = chapterKey;
  document.getElementById('type-select').style.display = 'block';
}

function startQuiz(type) {
  selectedType = type;
  score = 0;
  userAnswers = [];
  document.getElementById('homepage-card').style.display = 'none';
  document.getElementById('score-card').style.display = 'none';
  document.getElementById('quiz-card').style.display = 'block';
  renderQuestions();
}

function renderQuestions() {
  let questions = [];
  let title = 'Quiz';
  const chapterQ = questionsData[selectedChapter] || {};
  const chapterP = problemsData[selectedChapter] || {};

  if (selectedType === 'true_false') {
    questions = chapterQ.true_false || [];
    title = 'True or False';
  } else if (selectedType === 'multiple_choice') {
    questions = chapterQ.multiple_choice || [];
    title = 'Multiple Choice';
  } else if (selectedType === 'multiple_choice_problems') {
    questions = chapterQ.multiple_choice_problems || [];
    title = 'Multiple Choice: Problems';
  } else if (selectedType === 'problems') {
    questions = chapterP.problems || [];
    title = 'Straight Problems';
  }

  // totalQuestions is number of individual questions (for problems, sum sub-questions)
  if (selectedType === 'problems') {
    totalQuestions = questions.reduce((s, q) => s + (q.questions ? q.questions.length : 1), 0);
  } else {
    totalQuestions = questions.length;
  }

  document.getElementById('quiz-title').innerText = title;
  const container = document.getElementById('quiz-questions');
  container.innerHTML = '';

  questions.forEach((q, i) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'question-block';
    const headerHtml = `<span style='font-weight:bold'>${i+1}.</span>`;
    const header = document.createElement('div');
    header.className = 'question-header';

    if (selectedType === 'true_false') {
      header.innerHTML = `${headerHtml}${q.question}`;
      wrapper.appendChild(header);
      const trueLabel = document.createElement('label');
      trueLabel.innerHTML = `<input type='radio' name='q${i}' value='true'> True`;
      const falseLabel = document.createElement('label');
      falseLabel.style.marginLeft = '12px';
      falseLabel.innerHTML = `<input type='radio' name='q${i}' value='false'> False`;
      wrapper.appendChild(trueLabel);
      wrapper.appendChild(falseLabel);
    }

    if (selectedType === 'multiple_choice' || selectedType === 'multiple_choice_problems') {
      header.innerHTML = `${headerHtml}${q.question}`;
      wrapper.appendChild(header);
      (q.choices || []).forEach((choice, ci) => {
        // create a label with structure: <label class='choice-label'><input type=radio ...><span class='choice-text'>...</span></label>
        const lbl = document.createElement('label');
        lbl.className = 'choice-label';
        const rid = `q${i}_c${ci}`;
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = `q${i}`;
        input.id = rid;
        input.value = choice;
        const span = document.createElement('span');
        span.className = 'choice-text';
        span.innerText = choice;
        lbl.appendChild(input);
        lbl.appendChild(span);
        // allow clicking the whole label to check the radio
        lbl.addEventListener('click', (e) => {
          // when label clicked, mark the radio
          input.checked = true;
        });
        wrapper.appendChild(lbl);
      });
    }

    if (selectedType === 'problems') {
      header.innerHTML = `${headerHtml}${q.scenario || q.prompt || ''}`;
      header.className = 'problem-scenario';
      wrapper.appendChild(header);

      if (q.table) {
        const tbl = document.createElement('table');
        tbl.innerHTML = '<tr><th>Account</th><th>Amount</th></tr>' + (q.table.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join(''));
        wrapper.appendChild(tbl);
      }

      // journal entries: render an expected two-column comparison (Imprest vs Fluctuating)
        // journal entries: normally render an editable table students can add rows to
        if (q.journal_entries) {
          const isKimberly = String(q.scenario || '').toLowerCase().includes('kimberly');
          // For KIMBERLY only, render the two-column Imprest vs Fluctuating comparison table
          if (isKimberly) {
            // build a date -> {imprest:[], fluctuating:[], other:[]} map
            const map = {};
            (q.journal_entries || []).forEach(entry => {
              const desc = String(entry.description || '');
              const low = desc.toLowerCase();
              let sys = 'other';
              if (low.includes('imprest')) sys = 'imprest';
              else if (low.includes('fluctuat') || low.includes('fluctuating')) sys = 'fluctuating';
              // prefer explicit date field, else try to extract a yyyy-mm-dd or mm/dd/yy pattern, else use description as key
              let date = entry.date || '';
              if (!date) {
                const m = desc.match(/\d{4}-\d{2}-\d{2}/);
                if (m) date = m[0];
                else {
                  const m2 = desc.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/);
                  date = m2 ? m2[0] : desc.split(':')[0] || '';
                }
              }
              date = String(date || '').trim() || '';
              if (!map[date]) map[date] = {imprest: [], fluctuating: [], other: []};
              // build lines for the entry (debits then credits)
              const lines = [];
              (entry.debit || []).forEach(d => lines.push(`${d.account} ${formatCurrency(d.amount)}`));
              (entry.credit || []).forEach(c => lines.push(`${c.account} ${formatCurrency(c.amount)}`));
              map[date][sys].push({ description: entry.description, lines });
            });

            // render comparison table only for KIMBERLY
            const compDiv = document.createElement('div');
            compDiv.className = 'imprest-compare';
            compDiv.innerHTML = '<h4>Expected adjusting entries — Imprest Fund vs Fluctuating Balance</h4>';
            const compTable = document.createElement('table');
            compTable.className = 'imprest-table';
            let rowsHtml = '<thead><tr><th style="width:12%">Date</th><th>Imprest Fund System</th><th>Fluctuating Balance</th></tr></thead><tbody>';
            Object.keys(map).forEach(dk => {
              const group = map[dk];
              const impHtml = group.imprest.map(e => e.lines.map(l => `<div>${l}</div>`).join('')).join('<div style="height:8px"></div>') || '';
              const flHtml = group.fluctuating.map(e => e.lines.map(l => `<div>${l}</div>`).join('')).join('<div style="height:8px"></div>') || '';
              rowsHtml += `<tr><td style="vertical-align:top">${dk}</td><td>${impHtml}</td><td>${flHtml}</td></tr>`;
            });
            rowsHtml += '</tbody>';
            compTable.innerHTML = rowsHtml;
            compDiv.appendChild(compTable);
            wrapper.appendChild(compDiv);
          }

          // journal entries editable area (students' input)
          const jeDiv = document.createElement('div');
          jeDiv.className = 'journal-entries';
          jeDiv.innerHTML = '<h4>Adjusting Journal Entries (add rows, select Debit/Credit)</h4>';

        const table = document.createElement('table');
        table.className = 'je-table';
        table.setAttribute('data-q', i);
        table.innerHTML = `
          <thead><tr><th style='width:40%'>Account</th><th style='width:20%'>Type</th><th style='width:25%'>Amount</th><th style='width:15%'>Action</th></tr></thead>
          <tbody></tbody>
        `;

        const tBody = table.querySelector('tbody');

        // helper to add row
        const addRow = (acct = '', type = 'debit', amt = '') => {
          const r = document.createElement('tr');
          r.className = 'je-table-row';
          r.innerHTML = `
            <td><input class='problem-input je-account' type='text' value='${acct}' placeholder='Account'></td>
            <td>
              <select class='je-side problem-input'>
                <option value='debit' ${type === 'debit' ? 'selected' : ''}>Debit</option>
                <option value='credit' ${type === 'credit' ? 'selected' : ''}>Credit</option>
              </select>
            </td>
            <td><input class='problem-input je-amount' type='text' value='${amt}' placeholder='Amount'></td>
            <td><button type='button' class='je-remove'>Remove</button></td>
          `;
          tBody.appendChild(r);
          const rem = r.querySelector('.je-remove');
          rem.addEventListener('click', () => r.remove());
          // attach amount formatting to the newly created amount input
          const amtEl = r.querySelector('.je-amount');
          attachAmountFormatting(amtEl);
        };

        // start with one empty row
        addRow();

        const controls = document.createElement('div');
        controls.style.marginTop = '8px';
        controls.innerHTML = `<button type='button' class='je-add'>Add row</button>`;
        controls.querySelector('.je-add').addEventListener('click', () => addRow());

        // If this problem appears to be the KIMBERLY petty cash problem, add quick-load templates
        if (String(q.scenario || '').toLowerCase().includes('kimberly')) {
          const tmplImprest = document.createElement('button');
          tmplImprest.type = 'button';
          tmplImprest.className = 'je-load';
          tmplImprest.style.marginLeft = '8px';
          tmplImprest.innerText = 'Load imprest template';
          tmplImprest.addEventListener('click', () => {
            tBody.innerHTML = '';
            (q.journal_entries || []).forEach(entry => {
              if (String(entry.description || '').toLowerCase().includes('imprest')) {
                (entry.debit || []).forEach(d => addRow(d.account || '', 'debit', d.amount || ''));
                (entry.credit || []).forEach(c => addRow(c.account || '', 'credit', c.amount || ''));
              }
            });
          });

          const tmplFluct = document.createElement('button');
          tmplFluct.type = 'button';
          tmplFluct.className = 'je-load';
          tmplFluct.style.marginLeft = '8px';
          tmplFluct.innerText = 'Load fluctuating template';
          tmplFluct.addEventListener('click', () => {
            tBody.innerHTML = '';
            (q.journal_entries || []).forEach(entry => {
              const d = String(entry.description || '').toLowerCase();
              if (d.includes('fluctuat') || d.includes('fluctuating') || d.includes('fluctuat')) {
                (entry.debit || []).forEach(dd => addRow(dd.account || '', 'debit', dd.amount || ''));
                (entry.credit || []).forEach(cc => addRow(cc.account || '', 'credit', cc.amount || ''));
              }
            });
          });

          controls.appendChild(tmplImprest);
          controls.appendChild(tmplFluct);
        }

        jeDiv.appendChild(table);
        jeDiv.appendChild(controls);
        wrapper.appendChild(jeDiv);
      }

  // render sub-questions (corrected adjusted cash balance input) AFTER the JE table
      (q.questions || [{ question: 'Answer', answer: q.answer }]).forEach((subQ, sqIndex) => {
        const qdiv = document.createElement('div');
        qdiv.className = 'problem-question';
        qdiv.innerHTML = `<div class='question-text'>${subQ.question}</div>`;

        // If question has format 'cash_and_cash_equivalents', render two inputs
        if (subQ.format === 'cash_and_cash_equivalents') {
          const cashLabel = document.createElement('label');
          cashLabel.innerText = 'Cash';
          cashLabel.style.display = 'block';
          cashLabel.style.fontWeight = '600';
          const cashInput = document.createElement('input');
          cashInput.type = 'text';
          cashInput.name = `q${i}_${sqIndex}_cash`;
          cashInput.className = 'problem-input';
          cashInput.placeholder = 'Enter cash amount';
          qdiv.appendChild(cashLabel);
          qdiv.appendChild(cashInput);
          attachAmountFormatting(cashInput);

          const ceLabel = document.createElement('label');
          ceLabel.innerText = 'Cash equivalents';
          ceLabel.style.display = 'block';
          ceLabel.style.fontWeight = '600';
          const ceInput = document.createElement('input');
          ceInput.type = 'text';
          ceInput.name = `q${i}_${sqIndex}_ce`;
          ceInput.className = 'problem-input';
          ceInput.placeholder = 'Enter cash equivalents amount';
          qdiv.appendChild(ceLabel);
          qdiv.appendChild(ceInput);
          attachAmountFormatting(ceInput);
        } else {
          const input = document.createElement('input');
          input.type = 'text';
          input.name = `q${i}_${sqIndex}`;
          input.className = 'problem-input';
          input.placeholder = 'Enter amount or answer';
          qdiv.appendChild(input);
          attachAmountFormatting(input);
        }

        wrapper.appendChild(qdiv);
      });
    }

    container.appendChild(wrapper);
  });
}

function submitAnswers() {
  const chapterQ = questionsData[selectedChapter] || {};
  const chapterP = problemsData[selectedChapter] || {};
  let questions = [];
  if (selectedType === 'true_false') questions = chapterQ.true_false || [];
  else if (selectedType === 'multiple_choice') questions = chapterQ.multiple_choice || [];
  else if (selectedType === 'multiple_choice_problems') questions = chapterQ.multiple_choice_problems || [];
  else if (selectedType === 'problems') questions = chapterP.problems || [];

  score = 0;
  userAnswers = [];

  // compute total possible including journal lines
  let totalPossible = 0;
  questions.forEach(q => {
    if (selectedType === 'problems') {
      totalPossible += (q.questions || []).length;
      (q.journal_entries || []).forEach(entry => {
        totalPossible += (entry.debit || []).length + (entry.credit || []).length;
      });
    } else {
      totalPossible += 1;
    }
  });

  // evaluate answers
  questions.forEach((q, i) => {
    if (selectedType === 'true_false') {
      const val = document.querySelector(`input[name='q${i}']:checked`);
      const user = val ? (val.value === 'true') : null;
      const correct = !!q.answer;
      const isCorrect = user === correct;
      userAnswers.push({ type: 'tf', question: q.question, user, correct, isCorrect });
      if (isCorrect) score++;
  } else if (selectedType === 'multiple_choice' || selectedType === 'multiple_choice_problems') {
      const val = document.querySelector(`input[name='q${i}']:checked`);
      const user = val ? String(val.value).trim() : null;
      const correct = q.answer;
      let isCorrect = false;
      if (user !== null && typeof correct === 'string') {
        isCorrect = user.toLowerCase() === String(correct).trim().toLowerCase();
      } else {
        isCorrect = user === correct;
      }
      userAnswers.push({ type: 'mc', question: q.question, user, correct, isCorrect });
      if (isCorrect) score++;
    } else if (selectedType === 'problems') {
      const subResults = [];
      (q.questions || [{ question: 'Answer', answer: q.answer }]).forEach((subQ, sqIndex) => {
        let userRaw = '';
        let isCorrect = false;
        const correctRaw = (subQ.answer !== undefined) ? String(subQ.answer) : '';

        if (subQ.format === 'cash_and_cash_equivalents') {
          const cashEl = document.querySelector(`input[name='q${i}_${sqIndex}_cash']`);
          const ceEl = document.querySelector(`input[name='q${i}_${sqIndex}_ce']`);
          const cashVal = cashEl ? (cashEl.value || '').replace(/[^0-9.-]/g, '') : '';
          const ceVal = ceEl ? (ceEl.value || '').replace(/[^0-9.-]/g, '') : '';
          const cashNum = cashVal === '' ? null : Number(cashVal);
          const ceNum = ceVal === '' ? null : Number(ceVal);
          const sum = (cashNum || 0) + (ceNum || 0);
          userRaw = `${cashEl ? cashEl.value : ''} + ${ceEl ? ceEl.value : ''}`;
          const correctNum = correctRaw.replace(/[^0-9.-]/g, '');
          if (correctNum !== '') {
            isCorrect = Number(sum) === Number(correctNum);
          }
        } else {
          const input = document.querySelector(`input[name='q${i}_${sqIndex}']`);
          userRaw = input ? input.value.trim() : '';
          const userNum = userRaw.replace(/[^0-9.-]/g, '');
          const correctNum = correctRaw.replace(/[^0-9.-]/g, '');
          if (userNum !== '' && correctNum !== '') {
            isCorrect = Number(userNum) === Number(correctNum);
          } else {
            isCorrect = String(userRaw).trim().toLowerCase() === String(correctRaw).trim().toLowerCase();
          }
        }

        if (isCorrect) score++;
        subResults.push({ question: subQ.question, user: userRaw, correct: subQ.answer, isCorrect, explanation: subQ.explanation || '' });
      });

      // evaluate journal lines by matching expected lines against student's table rows
      const journalResults = [];
      // gather student rows from the table for this question
      const table = document.querySelector(`table.je-table[data-q='${i}']`);
      const studentRows = [];
      if (table) {
        table.querySelectorAll('tbody tr').forEach(r => {
          const acct = (r.querySelector('.je-account') || {}).value || '';
          const side = (r.querySelector('.je-side') || {}).value || 'debit';
          const amtRaw = (r.querySelector('.je-amount') || {}).value || '';
          const amt = amtRaw.replace(/[^0-9.-]/g, '');
          studentRows.push({ account: acct.trim(), side, amountRaw: amtRaw.trim(), amount: amt });
        });
      }
  // (studentRows captured for result rendering)

      // for each expected line find a matching student row (first-match) and mark it
      const usedIdx = new Set();
      (q.journal_entries || []).forEach(entry => {
        (entry.debit || []).forEach(d => {
          const expectedAcc = String(d.account || '').trim();
          const expectedAmt = String(d.amount !== undefined ? d.amount : '').replace(/[^0-9.-]/g, '');
          let matched = false;
          let matchType = 'strict';
          // strict match: account exact, amount exact, side match
          for (let si = 0; si < studentRows.length; si++) {
            if (usedIdx.has(si)) continue;
            const sr = studentRows[si];
            const accMatch = expectedAcc ? sr.account.toLowerCase() === expectedAcc.toLowerCase() : true;
            const amtMatch = expectedAmt ? sr.amount === expectedAmt : false;
            const sideMatch = sr.side === 'debit';
            if (accMatch && amtMatch && sideMatch) {
              matched = true; usedIdx.add(si);
              journalResults.push({ side: 'debit', description: entry.description, expectedAccount: d.account, expectedAmount: d.amount, userAccount: sr.account, userAmount: sr.amountRaw, correct: true, matchType });
              score++;
              break;
            }
          }
          // relaxed fallback: allow substring account match or vice-versa, amount numeric tolerance, ignore side
          if (!matched) {
            for (let si = 0; si < studentRows.length; si++) {
              if (usedIdx.has(si)) continue;
              const sr = studentRows[si];
              const accL = (sr.account || '').toLowerCase();
              const expL = (expectedAcc || '').toLowerCase();
              const accMatchRelax = expL && (accL.includes(expL) || expL.includes(accL));
              const amtMatchRelax = expectedAmt && sr.amount && (sr.amount === expectedAmt || Math.abs(Number(sr.amount) - Number(expectedAmt)) <= 1);
              if ((accMatchRelax || (!expectedAcc && accL)) && amtMatchRelax) {
                matched = true; usedIdx.add(si); matchType = 'relaxed';
                journalResults.push({ side: 'debit', description: entry.description, expectedAccount: d.account, expectedAmount: d.amount, userAccount: sr.account, userAmount: sr.amountRaw, correct: true, matchType });
                score++;
                break;
              }
            }
          }
          if (!matched) {
            journalResults.push({ side: 'debit', description: entry.description, expectedAccount: d.account, expectedAmount: d.amount, userAccount: '', userAmount: '', correct: false, matchType: 'none' });
          }
        });

        (entry.credit || []).forEach(c => {
          const expectedAcc = String(c.account || '').trim();
          const expectedAmt = String(c.amount !== undefined ? c.amount : '').replace(/[^0-9.-]/g, '');
          let matched = false;
          let matchType = 'strict';
          // strict match
          for (let si = 0; si < studentRows.length; si++) {
            if (usedIdx.has(si)) continue;
            const sr = studentRows[si];
            const accMatch = expectedAcc ? sr.account.toLowerCase() === expectedAcc.toLowerCase() : true;
            const amtMatch = expectedAmt ? sr.amount === expectedAmt : false;
            const sideMatch = sr.side === 'credit';
            if (accMatch && amtMatch && sideMatch) {
              matched = true; usedIdx.add(si);
              journalResults.push({ side: 'credit', description: entry.description, expectedAccount: c.account, expectedAmount: c.amount, userAccount: sr.account, userAmount: sr.amountRaw, correct: true, matchType });
              score++;
              break;
            }
          }
          // relaxed fallback
          if (!matched) {
            for (let si = 0; si < studentRows.length; si++) {
              if (usedIdx.has(si)) continue;
              const sr = studentRows[si];
              const accL = (sr.account || '').toLowerCase();
              const expL = (expectedAcc || '').toLowerCase();
              const accMatchRelax = expL && (accL.includes(expL) || expL.includes(accL));
              const amtMatchRelax = expectedAmt && sr.amount && (sr.amount === expectedAmt || Math.abs(Number(sr.amount) - Number(expectedAmt)) <= 1);
              if ((accMatchRelax || (!expectedAcc && accL)) && amtMatchRelax) {
                matched = true; usedIdx.add(si); matchType = 'relaxed';
                journalResults.push({ side: 'credit', description: entry.description, expectedAccount: c.account, expectedAmount: c.amount, userAccount: sr.account, userAmount: sr.amountRaw, correct: true, matchType });
                score++;
                break;
              }
            }
          }
          if (!matched) {
            journalResults.push({ side: 'credit', description: entry.description, expectedAccount: c.account, expectedAmount: c.amount, userAccount: '', userAmount: '', correct: false, matchType: 'none' });
          }
        });
      });

  userAnswers.push({ type: 'problem', scenario: q.scenario, subResults, journalResults, studentRows });
    }
  });

  // store totalPossible on a global-ish variable for rendering
  totalQuestions = totalPossible;

  showScoreSummary(questions);
}

function showScoreSummary(questions) {
  document.getElementById('quiz-card').style.display = 'none';
  document.getElementById('score-card').style.display = 'block';

  // use the totalQuestions computed at submit (includes JE lines)
  const totalPossible = (typeof totalQuestions === 'number' && totalQuestions > 0) ? totalQuestions : (selectedType === 'problems' ? questions.reduce((s, q) => s + (q.questions ? q.questions.length : 1), 0) : questions.length);

  const pct = totalPossible === 0 ? 0 : (score / totalPossible) * 100;
  document.getElementById('score').innerHTML = `<div>${score} / ${totalPossible}</div><div style="font-size:1rem;margin-top:8px;color:#666">${pct.toFixed(1)}%</div>`;

  const out = document.getElementById('score-summary');
  out.innerHTML = '';

  // helper: if a result is missing a correct value, try to look it up from questionsData
  function lookupCorrectAnswer(qText) {
    try {
      const ch = questionsData[selectedChapter] || {};
      const lists = [ch.multiple_choice || [], ch.multiple_choice_problems || []];
      for (const lst of lists) {
        for (const q of lst) {
          if (String(q.question || '').trim() === String(qText || '').trim()) return q.answer;
        }
      }
    } catch (e) {}
    return null;
  }

  const header = document.createElement('h3');
  header.innerText = 'Results';
  out.appendChild(header);

  // (debug removed) -- render results only

  userAnswers.forEach((res, idx) => {
    if (res.type === 'tf' || res.type === 'mc') {
      const item = document.createElement('div');
      item.className = `question-result ${res.isCorrect ? 'correct' : 'incorrect'}`;
      item.innerHTML = `<div><span class='answer-indicator ${res.isCorrect ? 'correct' : 'incorrect'}'>${res.isCorrect ? '✓' : '✗'}</span> ${res.question}</div>`;
      if (!res.isCorrect) {
        const ca = document.createElement('div');
        ca.className = 'correct-answer';
        // if correct is missing or generic, try to lookup from questionsData
        let correct = res.correct;
        if (!correct || String(correct).trim() === '') {
          const looked = lookupCorrectAnswer(res.question);
          if (looked) correct = looked;
        }
        ca.innerText = `Correct answer: ${correct || '<unknown>'}`;
        item.appendChild(ca);
      }
      out.appendChild(item);
    } else if (res.type === 'problem') {
      const pr = document.createElement('div');
      pr.className = 'problem-result';
      pr.innerHTML = `<div class='problem-scenario'>${res.scenario}</div>`;
      (res.subResults || []).forEach(sr => {
        const qdiv = document.createElement('div');
        qdiv.className = `question-result ${sr.isCorrect ? 'correct' : 'incorrect'}`;
        qdiv.innerHTML = `<div><span class='answer-indicator ${sr.isCorrect ? 'correct' : 'incorrect'}'>${sr.isCorrect ? '✓' : '✗'}</span> ${sr.question}</div>`;
        if (!sr.isCorrect) {
          const details = document.createElement('div');
          details.className = 'answer-details';
          details.innerHTML = `<div>Your answer: ${formatCurrency(sr.user)}</div><div class='correct-answer'>Correct answer: ${formatCurrency(sr.correct)}</div>` + (sr.explanation ? `<div class='explanation'>${sr.explanation}</div>` : '');
          qdiv.appendChild(details);
        }
        pr.appendChild(qdiv);
      });

  // show journal evaluation if any
      if (res.journalResults && res.journalResults.length) {
        const jeWrapper = document.createElement('div');
        jeWrapper.className = 'journal-eval';
        jeWrapper.innerHTML = '<h4>Adjusting Journal Entries (your inputs)</h4>';
        // group by description
        res.journalResults.forEach(jr => {
          const row = document.createElement('div');
          row.className = `journal-line ${jr.correct ? 'correct' : 'incorrect'}`;
          row.style.display = 'flex';
          row.style.justifyContent = 'space-between';
          row.style.alignItems = 'center';
          row.style.padding = '6px 8px';
          row.innerHTML = `
            <div style='flex:1'>
              <div style='font-weight:600'>${jr.description} — ${jr.side.toUpperCase()}</div>
              <div style='font-size:0.95em;color:#333'>Expected: ${jr.expectedAccount} — ${formatCurrency(jr.expectedAmount)}</div>
              <div style='font-size:0.95em;color:#555'>Your answer: ${jr.userAccount || '<em>blank</em>'} — ${jr.userAmount || '<em>blank</em>'}</div>
              ${jr.matchType === 'relaxed' ? "<div style='font-size:0.85em;color:#b36b00;margin-top:6px'>Matched using relaxed rules (account substring or ±1 amount)</div>" : ''}
            </div>
            <div style='width:48px;text-align:center'><span class='answer-indicator ${jr.correct ? 'correct' : 'incorrect'}'>${jr.correct ? '✓' : '✗'}</span></div>
          `;
          jeWrapper.appendChild(row);
        });
        pr.appendChild(jeWrapper);
      }

      // show student's ledger-style journal (their input rows)
      if (res.studentRows && res.studentRows.length) {
        const led = document.createElement('div');
        led.className = 'student-ledger';
        led.innerHTML = '<h4>Your journal (ledger view)</h4>';
        const t = document.createElement('table');
        t.className = 'journal-table';
        let rows = '<thead><tr><th>Account</th><th>Debit</th><th>Credit</th></tr></thead><tbody>';
        res.studentRows.forEach(r => {
          if (!r.account && !r.amountRaw) return; // skip empty rows
          if (r.side === 'debit') rows += `<tr><td>${r.account}</td><td>${formatCurrency(r.amount)}</td><td></td></tr>`;
          else rows += `<tr><td>${r.account}</td><td></td><td>${formatCurrency(r.amount)}</td></tr>`;
        });
        rows += '</tbody>';
        t.innerHTML = rows;
        led.appendChild(t);
        pr.appendChild(led);
      }

      out.appendChild(pr);
    }
  });

  // add a restart button
  const back = document.createElement('div');
  back.style.marginTop = '16px';
  back.innerHTML = `<button onclick="restartReviewer()">Back to Homepage</button>`;
  out.appendChild(back);
}

function restartReviewer() {
  selectedType = null;
  selectedChapter = null;
  score = 0;
  userAnswers = [];
  document.getElementById('homepage-card').style.display = 'block';
  document.getElementById('type-select').style.display = 'none';
  document.getElementById('quiz-card').style.display = 'none';
  document.getElementById('score-card').style.display = 'none';
}

window.onload = () => loadQuestions();
