// UI Rendering & Manipulation
const UI = {
  elements: {
    appContainer: document.getElementById('app-container'),
    onboardingView: document.getElementById('onboarding-view'),
    dashboardView: document.getElementById('dashboard-view'),
    examName: document.getElementById('exam-name'),
    examScheme: document.getElementById('exam-scheme'),
    examCountdown: document.getElementById('exam-countdown'),
    subjectsContainer: document.getElementById('subjects-container'),
    overallProgress: document.getElementById('overall-progress'),
    overallProgressText: document.getElementById('overall-progress-text')
  },

  init() {
    this.render();
  },

  render() {
    if (!State.config) {
      this.showOnboarding();
    } else {
      this.showDashboard();
      this.renderDashboard();
    }
  },

  showOnboarding() {
    this.elements.dashboardView.classList.add('hidden');
    this.elements.onboardingView.classList.remove('hidden');
  },

  showDashboard() {
    this.elements.onboardingView.classList.add('hidden');
    this.elements.dashboardView.classList.remove('hidden');
  },

  renderDashboard() {
    const config = State.config;
    // Set Exam Info
    this.elements.examName.textContent = config.exam.name || "My Exam";
    this.elements.examScheme.textContent = config.exam.scheme || "Standard";

    // Calculate Countdown
    if (config.exam.date) {
      const examDate = new Date(config.exam.date);
      const today = new Date();
      const diffTime = Math.abs(examDate - today);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      this.elements.examCountdown.textContent = `${diffDays} days remaining`;
    }

    // Render Subjects
    this.elements.subjectsContainer.innerHTML = '';
    
    let totalChapters = 0;
    let completedChapters = 0;

    config.subjects.forEach(subject => {
      const card = document.createElement('div');
      card.className = 'subject-card glass';
      
      const title = document.createElement('h3');
      title.textContent = subject.name;
      card.appendChild(title);

      const chapterList = document.createElement('div');
      
      let subjectTotal = 0;
      let subjectCompleted = 0;

      if (subject.chapters && subject.chapters.length > 0) {
        subject.chapters.forEach(chapter => {
          subjectTotal++;
          totalChapters++;
          
          // Check progress
          const isCompleted = State.progress.subjects?.[subject.id]?.[chapter.id] === true;
          if (isCompleted) {
            subjectCompleted++;
            completedChapters++;
          }

          const chapterRow = document.createElement('div');
          chapterRow.style.display = 'flex';
          chapterRow.style.alignItems = 'center';
          chapterRow.style.gap = '0.5rem';
          chapterRow.style.marginBottom = '0.5rem';
          
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.checked = isCompleted;
          checkbox.addEventListener('change', (e) => {
            this.toggleChapter(subject.id, chapter.id, e.target.checked);
          });

          const label = document.createElement('label');
          label.textContent = chapter.name;
          label.style.fontSize = '0.9rem';
          
          chapterRow.appendChild(checkbox);
          chapterRow.appendChild(label);
          chapterList.appendChild(chapterRow);
        });
      }

      // Subject Progress Bar
      const subProgressContainer = document.createElement('div');
      subProgressContainer.className = 'progress-bar-container';
      const subProgressBar = document.createElement('div');
      subProgressBar.className = 'progress-bar';
      const subPct = subjectTotal > 0 ? (subjectCompleted / subjectTotal) * 100 : 0;
      subProgressBar.style.width = `${subPct}%`;
      subProgressContainer.appendChild(subProgressBar);
      
      card.appendChild(subProgressContainer);
      card.appendChild(chapterList);
      this.elements.subjectsContainer.appendChild(card);
    });

    // Update Overall Progress
    const overallPct = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;
    this.elements.overallProgress.style.width = `${overallPct}%`;
    this.elements.overallProgressText.textContent = `${overallPct}% Completed`;
  },

  toggleChapter(subjectId, chapterId, isCompleted) {
    if (!State.progress.subjects) State.progress.subjects = {};
    if (!State.progress.subjects[subjectId]) State.progress.subjects[subjectId] = {};
    
    State.progress.subjects[subjectId][chapterId] = isCompleted;
    State.saveProgress();
    this.renderDashboard(); // Re-render to update progress bars
  }
};
