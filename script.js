// IP Canvas Grade Calculator Script
// This script provides functionality for parsing assignments from text,
// dynamically editing categories and assignments, computing weighted grades,
// and calculating the points needed on an upcoming assignment to achieve
// a desired overall grade.

(() => {
  // Data model
  let categories = [];
  let nextCategoryId = 1;
  let nextAssignmentId = 1;

  // DOM elements
  const step1 = document.getElementById('step1');
  const step2 = document.getElementById('step2');
  const assignmentsInput = document.getElementById('assignments-input');
  const gradesInput = document.getElementById('grades-input');
  const parseBtn = document.getElementById('parse-btn');
  const backBtn = document.getElementById('back-btn');
  const categoriesContainer = document.getElementById('categories-container');
  const totalGradeDisplay = document.getElementById('total-grade-display');
  const totalWeightDisplay = document.getElementById('total-weight-display');
  const addCategoryBtn = document.getElementById('add-category-btn');
  const calcTotalPointsInput = document.getElementById('calc-total-points');
  const calcTargetInput = document.getElementById('calc-target');
  const calcCategorySelect = document.getElementById('calc-category');
  const calcBtn = document.getElementById('calc-btn');
  const calcResult = document.getElementById('calc-result');

  /**
   * Parse the pasted assignments and grades text into a categories array.
   * This parser is an approximation and works best if the user pastes
   * content from Canvas assignment and grade pages. It recognises lines
   * containing a slash-separated score (e.g. "Homework 1 45/50") and
   * category headings with optional weights (e.g. "Exams (30%)"). Any
   * assignments preceding a category header are placed into an
   * "Uncategorised" group.
   *
   * @param {string} assignmentsText
   * @param {string} gradesText (currently unused)
   * @returns {Array}
   */
  function parseAssignments(assignmentsText, gradesText) {
    const lines = assignmentsText.split(/\n+/).map(l => l.trim()).filter(l => l);
    const parsedCategories = [];
    let currentCategory = null;
    // Helper to ensure we have an ungrouped category
    const ensureUngrouped = () => {
      if (!currentCategory) {
        currentCategory = {
          id: nextCategoryId++,
          name: 'Ungrouped',
          weight: 0,
          assignments: []
        };
        parsedCategories.push(currentCategory);
      }
    };
    for (const line of lines) {
      // Category header with optional weight (e.g. "Exams (30%)")
      const catMatch = line.match(/^(.+?)\s*\((\d+(?:\.\d+)?)%\)/);
      if (catMatch) {
        const name = catMatch[1].trim();
        const weight = parseFloat(catMatch[2]);
        currentCategory = {
          id: nextCategoryId++,
          name,
          weight: isNaN(weight) ? 0 : weight,
          assignments: []
        };
        parsedCategories.push(currentCategory);
        continue;
      }
      // Category header without weight: treat as new category with weight 0
      // Only if line does not contain a slash but contains letters
      if (!line.includes('/')) {
        currentCategory = {
          id: nextCategoryId++,
          name: line,
          weight: 0,
          assignments: []
        };
        parsedCategories.push(currentCategory);
        continue;
      }
      // Assignment line with earned/possible points: e.g. "Quiz 1 8/10"
      const assignMatch = line.match(/^(.*?)(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
      if (assignMatch) {
        const name = assignMatch[1].trim() || 'Unnamed assignment';
        const earned = parseFloat(assignMatch[2]);
        const possible = parseFloat(assignMatch[3]);
        ensureUngrouped();
        currentCategory.assignments.push({
          id: nextAssignmentId++,
          name,
          pointsEarned: isNaN(earned) ? 0 : earned,
          pointsPossible: isNaN(possible) ? 0 : possible
        });
        continue;
      }
      // Assignment with just possible points (no score yet): e.g. "Project /50"
      const assignPossibleMatch = line.match(/^(.*?)[^\d](\d+(?:\.\d+)?)/);
      if (assignPossibleMatch && line.includes('/')) {
        const parts = line.split('/');
        const possible = parseFloat(parts[1]);
        const namePart = parts[0].trim();
        ensureUngrouped();
        currentCategory.assignments.push({
          id: nextAssignmentId++,
          name: namePart || 'Unnamed assignment',
          pointsEarned: 0,
          pointsPossible: isNaN(possible) ? 0 : possible
        });
        continue;
      }
    }
    return parsedCategories;
  }

  /**
   * Render the category and assignment lists.
   */
  function renderCategories() {
    categoriesContainer.innerHTML = '';
    categories.forEach(category => {
      // Category card
      const catCard = document.createElement('div');
      catCard.className = 'category-card';
      // Category header
      const headerDiv = document.createElement('div');
      headerDiv.className = 'category-header';
      // Category name input
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.value = category.name;
      nameInput.addEventListener('input', e => {
        category.name = e.target.value;
        updateCalcCategoryOptions();
      });
      headerDiv.appendChild(nameInput);
      // Category weight input
      const weightInput = document.createElement('input');
      weightInput.type = 'number';
      weightInput.min = 0;
      weightInput.max = 100;
      weightInput.step = '0.1';
      weightInput.value = category.weight;
      weightInput.addEventListener('input', e => {
        const val = parseFloat(e.target.value);
        category.weight = isNaN(val) ? 0 : val;
        computeTotals();
        updateCalcCategoryOptions();
      });
      headerDiv.appendChild(weightInput);
      // Percent sign
      const percentSpan = document.createElement('span');
      percentSpan.textContent = '%';
      percentSpan.style.marginRight = '10px';
      headerDiv.appendChild(percentSpan);
      // Delete category button
      const delBtn = document.createElement('button');
      delBtn.className = 'delete-category';
      delBtn.innerHTML = '&times;';
      delBtn.title = 'Delete category';
      delBtn.addEventListener('click', () => {
        removeCategory(category.id);
      });
      headerDiv.appendChild(delBtn);
      catCard.appendChild(headerDiv);
      // Assignment list
      const assignList = document.createElement('div');
      assignList.className = 'assignment-list';
      category.assignments.forEach(assignment => {
        const assignDiv = document.createElement('div');
        assignDiv.className = 'assignment-item';
        // Assignment name input
        const aNameInput = document.createElement('input');
        aNameInput.type = 'text';
        aNameInput.value = assignment.name;
        aNameInput.addEventListener('input', e => {
          assignment.name = e.target.value;
        });
        assignDiv.appendChild(aNameInput);
        // Points earned input
        const earnedInput = document.createElement('input');
        earnedInput.type = 'number';
        earnedInput.min = 0;
        earnedInput.value = assignment.pointsEarned;
        earnedInput.addEventListener('input', e => {
          const val = parseFloat(e.target.value);
          assignment.pointsEarned = isNaN(val) ? 0 : val;
          computeTotals();
        });
        assignDiv.appendChild(earnedInput);
        // Slash separator
        const slash = document.createElement('span');
        slash.textContent = '/';
        slash.style.marginRight = '4px';
        slash.style.color = 'var(--muted)';
        assignDiv.appendChild(slash);
        // Points possible input
        const possibleInput = document.createElement('input');
        possibleInput.type = 'number';
        possibleInput.min = 0;
        possibleInput.value = assignment.pointsPossible;
        possibleInput.addEventListener('input', e => {
          const val = parseFloat(e.target.value);
          assignment.pointsPossible = isNaN(val) ? 0 : val;
          computeTotals();
        });
        assignDiv.appendChild(possibleInput);
        // Delete assignment button
        const delAssignmentBtn = document.createElement('button');
        delAssignmentBtn.className = 'delete-assignment';
        delAssignmentBtn.innerHTML = '&times;';
        delAssignmentBtn.title = 'Delete assignment';
        delAssignmentBtn.addEventListener('click', () => {
          removeAssignment(category.id, assignment.id);
        });
        assignDiv.appendChild(delAssignmentBtn);
        assignList.appendChild(assignDiv);
      });
      // Add assignment button
      const addAssignBtn = document.createElement('button');
      addAssignBtn.className = 'add-assignment-btn';
      addAssignBtn.textContent = 'Add assignment';
      addAssignBtn.addEventListener('click', () => {
        addAssignment(category.id);
      });
      assignList.appendChild(addAssignBtn);
      catCard.appendChild(assignList);
      categoriesContainer.appendChild(catCard);
    });
    computeTotals();
    updateCalcCategoryOptions();
  }

  /**
   * Add a new category to the list.
   */
  function addCategory() {
    const newCategory = {
      id: nextCategoryId++,
      name: `Category ${nextCategoryId - 1}`,
      weight: 0,
      assignments: []
    };
    categories.push(newCategory);
    renderCategories();
  }

  /**
   * Remove a category by id.
   */
  function removeCategory(categoryId) {
    categories = categories.filter(cat => cat.id !== categoryId);
    renderCategories();
  }

  /**
   * Add a new assignment to a category.
   */
  function addAssignment(categoryId) {
    const category = categories.find(cat => cat.id === categoryId);
    if (!category) return;
    const newAssignment = {
      id: nextAssignmentId++,
      name: `Assignment ${nextAssignmentId - 1}`,
      pointsEarned: 0,
      pointsPossible: 0
    };
    category.assignments.push(newAssignment);
    renderCategories();
  }

  /**
   * Remove an assignment from a category.
   */
  function removeAssignment(categoryId, assignmentId) {
    const category = categories.find(cat => cat.id === categoryId);
    if (!category) return;
    category.assignments = category.assignments.filter(a => a.id !== assignmentId);
    renderCategories();
  }

  /**
   * Compute the weighted total grade and update the display.
   */
  function computeTotals() {
    let total = 0;
    let weightSum = 0;
    categories.forEach(cat => {
      const weight = cat.weight;
      weightSum += weight;
      const earned = cat.assignments.reduce((s, a) => s + (a.pointsEarned || 0), 0);
      const possible = cat.assignments.reduce((s, a) => s + (a.pointsPossible || 0), 0);
      const avg = possible > 0 ? earned / possible : 0;
      total += avg * weight;
    });
    const finalGrade = weightSum > 0 ? total : 0;
    totalGradeDisplay.textContent = finalGrade.toFixed(2) + '%';
    totalWeightDisplay.textContent = `Total weighting: ${weightSum.toFixed(2)}%`;
  }

  /**
   * Update the category dropdown for the calculate section.
   */
  function updateCalcCategoryOptions() {
    const selected = calcCategorySelect.value;
    calcCategorySelect.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '-- select --';
    calcCategorySelect.appendChild(placeholder);
    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.name;
      calcCategorySelect.appendChild(opt);
    });
    // Restore selection if still exists
    if (selected) {
      const found = Array.from(calcCategorySelect.options).find(o => o.value === selected);
      if (found) found.selected = true;
    }
  }

  /**
   * Calculate the points required on a new assignment to reach a target grade.
   */
  function calculatePoints() {
    const totalPointsVal = parseFloat(calcTotalPointsInput.value);
    const targetVal = parseFloat(calcTargetInput.value);
    const categoryId = parseInt(calcCategorySelect.value);
    if (isNaN(totalPointsVal) || totalPointsVal <= 0) {
      calcResult.textContent = 'Please enter a valid number of points for the assignment.';
      return;
    }
    if (isNaN(targetVal)) {
      calcResult.textContent = 'Please enter a target grade percentage.';
      return;
    }
    const targetDecimal = targetVal / 100;
    const category = categories.find(cat => cat.id === categoryId);
    if (!category) {
      calcResult.textContent = 'Please select a category.';
      return;
    }
    const categoryWeight = category.weight / 100;
    if (categoryWeight <= 0) {
      calcResult.textContent = 'Selected category has zero weight.';
      return;
    }
    // Sum weighted averages for other categories
    let otherSum = 0;
    categories.forEach(cat => {
      if (cat.id === category.id) return;
      const w = cat.weight / 100;
      const earned = cat.assignments.reduce((s, a) => s + (a.pointsEarned || 0), 0);
      const possible = cat.assignments.reduce((s, a) => s + (a.pointsPossible || 0), 0);
      const avg = possible > 0 ? earned / possible : 0;
      otherSum += w * avg;
    });
    const currentEarned = category.assignments.reduce((s, a) => s + (a.pointsEarned || 0), 0);
    const currentPossible = category.assignments.reduce((s, a) => s + (a.pointsPossible || 0), 0);
    const requiredFraction = (targetDecimal - otherSum) / categoryWeight;
    const newTotalPossible = currentPossible + totalPointsVal;
    const requiredPoints = requiredFraction * newTotalPossible - currentEarned;
    if (requiredFraction < 0) {
      calcResult.textContent = 'Target already met; no points needed.';
      return;
    }
    if (requiredPoints > totalPointsVal) {
      calcResult.textContent = `It is not possible to reach ${targetVal.toFixed(2)}% overall with this assignment in the ${category.name} category.`;
      return;
    }
    const required = Math.max(0, requiredPoints);
    const percentage = (required / totalPointsVal) * 100;
    calcResult.textContent = `You need approximately ${required.toFixed(2)} points (${percentage.toFixed(2)}%) on this assignment.`;
  }

  /**
   * Submit handler for Step1: parse the input and move to Step2.
   */
  function handleParse() {
    const assignmentsText = assignmentsInput.value || '';
    const gradesText = gradesInput.value || '';
    categories = parseAssignments(assignmentsText, gradesText);
    // If nothing parsed, create an empty category
    if (!categories || categories.length === 0) {
      categories = [{ id: nextCategoryId++, name: 'Category 1', weight: 0, assignments: [] }];
    }
    // Show Step2 and hide Step1
    step1.style.display = 'none';
    step2.style.display = 'block';
    // Ensure details are open
    step2.open = true;
    renderCategories();
  }

  /**
   * Back handler to return to Step1 and reset the form.
   */
  function handleBack() {
    // Clear categories and reset inputs
    categories = [];
    assignmentsInput.value = '';
    gradesInput.value = '';
    calcTotalPointsInput.value = '';
    calcTargetInput.value = '';
    calcCategorySelect.innerHTML = '';
    calcResult.textContent = '';
    // Show Step1 and hide Step2
    step1.style.display = 'block';
    step2.style.display = 'none';
    step1.open = true;
  }

  // Event bindings
  parseBtn.addEventListener('click', handleParse);
  backBtn.addEventListener('click', handleBack);
  addCategoryBtn.addEventListener('click', addCategory);
  calcBtn.addEventListener('click', calculatePoints);
})();