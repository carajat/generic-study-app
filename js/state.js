// State Management & Storage
const CONFIG_KEY = 'study_companion_config';
const PROGRESS_KEY = 'study_companion_progress';

const State = {
  config: null,
  progress: {},

  // Load data from localStorage
  load() {
    try {
      const savedConfig = localStorage.getItem(CONFIG_KEY);
      if (savedConfig) {
        this.config = JSON.parse(savedConfig);
      }
      
      const savedProgress = localStorage.getItem(PROGRESS_KEY);
      if (savedProgress) {
        this.progress = JSON.parse(savedProgress);
      } else {
        this.progress = { subjects: {} };
      }
    } catch (e) {
      console.error("Failed to load state", e);
    }
  },

  // Save progress to localStorage
  saveProgress() {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(this.progress));
  },

  // Import configuration (template)
  importConfig(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      // Basic validation
      if (!data.exam || !data.subjects) {
        throw new Error("Invalid configuration format.");
      }
      localStorage.setItem(CONFIG_KEY, JSON.stringify(data));
      this.config = data;
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  },

  // Import user progress
  importProgress(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (!data.subjects) throw new Error("Invalid progress format.");
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(data));
      this.progress = data;
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  },

  // Export configuration as a blank template
  exportConfigTemplate() {
    const template = this.config || {
      exam: { name: "Your Exam Name", date: "2026-12-31", scheme: "Standard" },
      subjects: [
        { id: "sub1", name: "Mathematics", chapters: [{ id: "c1", name: "Algebra" }, { id: "c2", name: "Calculus" }] },
        { id: "sub2", name: "Physics", chapters: [{ id: "p1", name: "Kinematics" }] }
      ]
    };
    this.downloadJson(template, 'study-template.json');
  },

  // Export progress
  exportProgress() {
    this.downloadJson(this.progress, 'my-progress.json');
  },

  downloadJson(data, filename) {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  },

  factoryReset() {
    localStorage.removeItem(CONFIG_KEY);
    localStorage.removeItem(PROGRESS_KEY);
    this.config = null;
    this.progress = { subjects: {} };
  }
};
