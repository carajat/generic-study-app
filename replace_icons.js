const fs = require('fs');

const replacements = {
  '🗑️': '<span class="material-symbols-rounded icon-sm">delete</span>',
  '✏️': '<span class="material-symbols-rounded icon-sm">edit</span>',
  '📘': '<span class="material-symbols-rounded icon-sm">menu_book</span>',
  '📙': '<span class="material-symbols-rounded icon-sm">library_books</span>',
  '📕': '<span class="material-symbols-rounded icon-sm">book</span>',
  '📔': '<span class="material-symbols-rounded icon-sm">import_contacts</span>',
  '📗': '<span class="material-symbols-rounded icon-sm">auto_stories</span>',
  '📝': '<span class="material-symbols-rounded icon-sm">edit_document</span>',
  '⏰': '<span class="material-symbols-rounded icon-sm">schedule</span>',
  '🗓️': '<span class="material-symbols-rounded icon-sm">calendar_month</span>',
  '🎓': '<span class="material-symbols-rounded icon-sm">school</span>',
  '🔥': '<span class="material-symbols-rounded icon-sm">local_fire_department</span>',
  '📅': '<span class="material-symbols-rounded icon-sm">event</span>',
  '🌅': '<span class="material-symbols-rounded icon-sm">wb_twilight</span>',
  '🌙': '<span class="material-symbols-rounded icon-sm">dark_mode</span>',
  '📜': '<span class="material-symbols-rounded icon-sm">rule</span>',
  '✅': '<span class="material-symbols-rounded icon-sm">check_circle</span>',
  '☑️': '<span class="material-symbols-rounded icon-sm">check_box</span>',
  '☐': '<span class="material-symbols-rounded icon-sm">check_box_outline_blank</span>',
  '⬜': '<span class="material-symbols-rounded icon-sm">check_box_outline_blank</span>',
  '⚠️': '<span class="material-symbols-rounded icon-sm">warning</span>',
  '🔴': '<span class="material-symbols-rounded icon-sm">circle</span>',
  '📚': '<span class="material-symbols-rounded icon-sm">local_library</span>',
  '📖': '<span class="material-symbols-rounded icon-sm">import_contacts</span>',
  '❓': '<span class="material-symbols-rounded icon-sm">help</span>',
  '🎥': '<span class="material-symbols-rounded icon-sm">videocam</span>',
  '🎯': '<span class="material-symbols-rounded icon-sm">track_changes</span>',
  '👍': '',
  '📥': '<span class="material-symbols-rounded icon-sm">download</span>',
  '📤': '<span class="material-symbols-rounded icon-sm">upload</span>',
  '➕': '<span class="material-symbols-rounded icon-sm">add</span>',
  '❌': '<span class="material-symbols-rounded icon-sm">close</span>',
  '🍔': '<span class="material-symbols-rounded icon-sm">restaurant</span>',
  '😴': '<span class="material-symbols-rounded icon-sm">bed</span>',
  '🛁': '<span class="material-symbols-rounded icon-sm">bathtub</span>',
  '🏋️': '<span class="material-symbols-rounded icon-sm">fitness_center</span>'
};

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  for (const [emoji, icon] of Object.entries(replacements)) {
    content = content.split(emoji).join(icon);
  }
  fs.writeFileSync(filePath, content);
  console.log(`Updated ${filePath}`);
}

processFile('app.js');
