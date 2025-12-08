/**
 * Popup UI Controller
 * Handles all UI interactions and storage updates with smooth animations
 */

// DOM Elements
const newNoteInput = document.getElementById("newNoteInput");
const newNoteUrl = document.getElementById("newNoteUrl");
const addNoteBtn = document.getElementById("addNoteBtn");
const notesList = document.getElementById("notesList");
const emptyState = document.getElementById("emptyState");

// Initialize popup
document.addEventListener("DOMContentLoaded", async () => {
  await loadAndRenderNotes();
  setupEventListeners();
});

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Add note button click
  addNoteBtn.addEventListener("click", handleAddNote);

  // Add note on Enter key (Shift+Enter for new line)
  newNoteInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAddNote();
    }
  });
}

/**
 * Load notes from storage and render them
 */
async function loadAndRenderNotes() {
  try {
    const notes = await StorageHelper.getAllNotes();
    renderNotes(notes);
  } catch (error) {
    console.error("Error loading notes:", error);
  }
}

/**
 * Render all notes in the UI
 * @param {Array} notes - Array of note objects
 */
function renderNotes(notes) {
  // Clear current notes
  notesList.innerHTML = "";

  // Show empty state if no notes
  if (notes.length === 0) {
    emptyState.style.display = "block";
    notesList.style.display = "none";
    return;
  }

  emptyState.style.display = "none";
  notesList.style.display = "block";

  // Render each note with staggered animation
  notes.forEach((note, index) => {
    const noteElement = createNoteElement(note, index, notes.length);
    noteElement.style.animationDelay = `${index * 0.05}s`;
    notesList.appendChild(noteElement);
  });
}

/**
 * Create a note element
 * @param {Object} note - Note object
 * @param {number} index - Current index in list
 * @param {number} totalNotes - Total number of notes
 * @returns {HTMLElement} Note element
 */
function createNoteElement(note, index, totalNotes) {
  const noteDiv = document.createElement("div");
  noteDiv.className = "note-item";
  noteDiv.dataset.noteId = note.id;

  // Truncate text to 120 characters
  const displayText =
    note.text.length > 120 ? note.text.substring(0, 120) + "..." : note.text;

  // Format date
  const dateStr = formatDate(note.createdAt);

  // URL section
  const urlSection = note.url
    ? `
    <div class="note-url">
      <a href="${escapeHtml(
        note.url
      )}" target="_blank" class="note-link" title="${escapeHtml(note.url)}">
        🔗 Open Source
      </a>
    </div>
  `
    : "";

  noteDiv.innerHTML = `
    <div class="note-content">
      <div class="note-text">${escapeHtml(displayText)}</div>
      ${urlSection}
      <div class="note-date">${dateStr}</div>
    </div>
    <div class="note-actions">
      <button class="btn-icon btn-edit" title="Edit" data-action="edit">
        ✏️
      </button>
      <button class="btn-icon btn-delete" title="Delete" data-action="delete">
        🗑️
      </button>
      <div class="note-reorder">
        <button class="btn-icon btn-up" title="Move up" data-action="up" ${
          index === 0 ? "disabled" : ""
        }>
          ▲
        </button>
        <button class="btn-icon btn-down" title="Move down" data-action="down" ${
          index === totalNotes - 1 ? "disabled" : ""
        }>
          ▼
        </button>
      </div>
    </div>
  `;

  // Add event listeners
  noteDiv
    .querySelector('[data-action="edit"]')
    .addEventListener("click", () => handleEdit(note));
  noteDiv
    .querySelector('[data-action="delete"]')
    .addEventListener("click", () => handleDelete(note.id));
  noteDiv
    .querySelector('[data-action="up"]')
    .addEventListener("click", () => handleMoveUp(note.id));
  noteDiv
    .querySelector('[data-action="down"]')
    .addEventListener("click", () => handleMoveDown(note.id));

  return noteDiv;
}

/**
 * Handle adding a new note
 */
async function handleAddNote() {
  const text = newNoteInput.value.trim();
  const url = newNoteUrl.value.trim();

  if (!text) {
    // Add shake animation to input
    newNoteInput.style.animation = "shake 0.3s";
    setTimeout(() => {
      newNoteInput.style.animation = "";
    }, 300);
    newNoteInput.focus();
    return;
  }

  // Validate URL if provided
  if (url && !isValidUrl(url)) {
    newNoteUrl.style.animation = "shake 0.3s";
    newNoteUrl.style.borderColor = "#ef4444";
    setTimeout(() => {
      newNoteUrl.style.animation = "";
      newNoteUrl.style.borderColor = "";
    }, 300);
    return;
  }

  try {
    const newNote = {
      id: crypto.randomUUID(),
      text: text,
      url: url || null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      index: 0,
    };

    await StorageHelper.addNote(newNote);

    // Add success feedback
    addNoteBtn.textContent = "✓ Added!";
    addNoteBtn.style.background =
      "linear-gradient(135deg, #10b981 0%, #059669 100%)";

    setTimeout(() => {
      addNoteBtn.textContent = "Add Note";
      addNoteBtn.style.background = "";
    }, 1000);

    newNoteInput.value = "";
    newNoteUrl.value = "";
    await loadAndRenderNotes();
    newNoteInput.focus();
  } catch (error) {
    console.error("Error adding note:", error);
    alert("Failed to add note. Please try again.");
  }
}

/**
 * Validate URL
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid
 */
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Handle editing a note
 * @param {Object} note - Note to edit
 */
async function handleEdit(note) {
  const noteElement = document.querySelector(`[data-note-id="${note.id}"]`);
  const noteContent = noteElement.querySelector(".note-content");

  // Create edit form
  const editForm = document.createElement("div");
  editForm.className = "note-edit-form";
  editForm.innerHTML = `
    <textarea class="edit-textarea">${escapeHtml(note.text)}</textarea>
    <input type="url" class="edit-url" placeholder="Optional: Add or edit link" value="${escapeHtml(
      note.url || ""
    )}">
    <div class="edit-actions">
      <button class="btn btn-primary btn-save">💾 Save</button>
      <button class="btn btn-secondary btn-cancel">✕ Cancel</button>
    </div>
  `;

  // Replace content with edit form
  const originalContent = noteContent.innerHTML;
  noteContent.innerHTML = "";
  noteContent.appendChild(editForm);

  const textarea = editForm.querySelector(".edit-textarea");
  const urlInput = editForm.querySelector(".edit-url");
  const saveBtn = editForm.querySelector(".btn-save");
  const cancelBtn = editForm.querySelector(".btn-cancel");

  // Focus textarea and select all
  textarea.focus();
  textarea.select();

  // Save handler
  saveBtn.addEventListener("click", async () => {
    const newText = textarea.value.trim();
    const newUrl = urlInput.value.trim();

    if (!newText) {
      textarea.style.animation = "shake 0.3s";
      setTimeout(() => {
        textarea.style.animation = "";
      }, 300);
      return;
    }

    // Validate URL if provided
    if (newUrl && !isValidUrl(newUrl)) {
      urlInput.style.animation = "shake 0.3s";
      urlInput.style.borderColor = "#ef4444";
      setTimeout(() => {
        urlInput.style.animation = "";
        urlInput.style.borderColor = "";
      }, 300);
      return;
    }

    try {
      await StorageHelper.updateNote(note.id, newText, newUrl || null);
      await loadAndRenderNotes();
    } catch (error) {
      console.error("Error updating note:", error);
      alert("Failed to update note. Please try again.");
    }
  });

  // Cancel handler
  cancelBtn.addEventListener("click", () => {
    noteContent.innerHTML = originalContent;
  });

  // Save on Ctrl+Enter or Cmd+Enter
  textarea.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      saveBtn.click();
    }
    if (e.key === "Escape") {
      cancelBtn.click();
    }
  });
}

/**
 * Handle deleting a note
 * @param {string} noteId - ID of note to delete
 */
async function handleDelete(noteId) {
  const noteElement = document.querySelector(`[data-note-id="${noteId}"]`);

  // Add remove animation
  noteElement.classList.add("removing");

  // Wait for animation before deleting
  setTimeout(async () => {
    try {
      await StorageHelper.deleteNote(noteId);
      await loadAndRenderNotes();
    } catch (error) {
      console.error("Error deleting note:", error);
      noteElement.classList.remove("removing");
      alert("Failed to delete note. Please try again.");
    }
  }, 300);
}

/**
 * Handle moving note up
 * @param {string} noteId - ID of note to move
 */
async function handleMoveUp(noteId) {
  try {
    await StorageHelper.moveNoteUp(noteId);
    await loadAndRenderNotes();
  } catch (error) {
    console.error("Error moving note up:", error);
  }
}

/**
 * Handle moving note down
 * @param {string} noteId - ID of note to move
 */
async function handleMoveDown(noteId) {
  try {
    await StorageHelper.moveNoteDown(noteId);
    await loadAndRenderNotes();
  } catch (error) {
    console.error("Error moving note down:", error);
  }
}

/**
 * Format timestamp to readable date
 * @param {number} timestamp - Unix timestamp
 * @returns {string} Formatted date string
 */
function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Add shake animation for validation feedback
const style = document.createElement("style");
style.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-10px); }
    75% { transform: translateX(10px); }
  }
`;
document.head.appendChild(style);
