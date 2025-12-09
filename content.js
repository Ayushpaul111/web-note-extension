/**
 * Content Script - Handles text selection UI
 * Shows a floating icon when text is selected (like Grammarly)
 */

let selectionIcon = null;
let selectionModal = null;
let selectionTimeout = null;
let currentSelection = null;
let currentUrl = null;

// Initialize
function init() {
  createSelectionIcon();
  createSelectionModal();
  setupSelectionListeners();
}

/**
 * Create the floating selection icon
 */
function createSelectionIcon() {
  selectionIcon = document.createElement("div");
  selectionIcon.id = "quick-note-selection-icon";
  selectionIcon.className = "quick-note-icon-hidden";
  selectionIcon.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M9 7H15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M9 11H15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M9 15H13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `;

  selectionIcon.title = "Save to Notes";
  document.body.appendChild(selectionIcon);

  // Click handler
  selectionIcon.addEventListener("click", handleIconClick);

  // Prevent icon from interfering with page selection
  selectionIcon.addEventListener("mousedown", (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
}

/**
 * Create the selection modal for URL option
 */
function createSelectionModal() {
  selectionModal = document.createElement("div");
  selectionModal.id = "quick-note-modal";
  selectionModal.className = "quick-note-modal-hidden";
  selectionModal.innerHTML = `
    <div class="quick-note-modal-content">
      <div class="quick-note-modal-header">
        <h3>💾 Save Note</h3>
        <button class="quick-note-modal-close" title="Close">✕</button>
      </div>
      <div class="quick-note-modal-body">
        <div class="quick-note-preview">
          <div class="quick-note-preview-label">Edit your note:</div>
          <textarea class="quick-note-preview-textarea" rows="6"></textarea>
        </div>
        <div class="quick-note-url-option">
          <label class="quick-note-checkbox">
            <input type="checkbox" id="quick-note-include-url" checked>
            <span>Include page URL</span>
          </label>
          <div class="quick-note-url-display"></div>
        </div>
      </div>
      <div class="quick-note-modal-footer">
        <button class="quick-note-btn quick-note-btn-secondary quick-note-cancel">Cancel</button>
        <button class="quick-note-btn quick-note-btn-primary quick-note-save">
          <span class="btn-content">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
              <polyline points="17 21 17 13 7 13 7 21"></polyline>
              <polyline points="7 3 7 8 15 8"></polyline>
            </svg>
            <span>Save Note</span>
          </span>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(selectionModal);

  // Event listeners
  selectionModal
    .querySelector(".quick-note-modal-close")
    .addEventListener("click", hideModal);
  selectionModal
    .querySelector(".quick-note-cancel")
    .addEventListener("click", hideModal);
  selectionModal
    .querySelector(".quick-note-save")
    .addEventListener("click", handleSaveFromModal);

  // Close on outside click
  selectionModal.addEventListener("click", (e) => {
    if (e.target === selectionModal) {
      hideModal();
    }
  });

  // URL checkbox toggle
  selectionModal
    .querySelector("#quick-note-include-url")
    .addEventListener("change", (e) => {
      const urlDisplay = selectionModal.querySelector(
        ".quick-note-url-display"
      );
      urlDisplay.style.display = e.target.checked ? "block" : "none";
    });

  // Auto-resize textarea
  const textarea = selectionModal.querySelector(".quick-note-preview-textarea");
  textarea.addEventListener("input", (e) => {
    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";
  });
}

/**
 * Setup selection event listeners
 */
function setupSelectionListeners() {
  document.addEventListener("mouseup", handleTextSelection);
  document.addEventListener("selectionchange", handleSelectionChange);

  // Hide icon when clicking elsewhere (but not on the icon itself)
  document.addEventListener("mousedown", (e) => {
    if (
      !selectionIcon.contains(e.target) &&
      !selectionModal.contains(e.target)
    ) {
      setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.toString().trim().length === 0) {
          hideIcon();
          currentSelection = null;
        }
      }, 10);
    }
  });

  // Hide icon when scrolling
  let scrollTimeout;
  document.addEventListener(
    "scroll",
    () => {
      hideIcon();
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const selection = window.getSelection();
        if (selection && selection.toString().trim()) {
          showIconForSelection();
        }
      }, 150);
    },
    true
  );

  // Hide icon when window loses focus
  window.addEventListener("blur", () => {
    hideIcon();
    currentSelection = null;
  });
}

/**
 * Handle text selection
 */
function handleTextSelection(e) {
  // Don't process if clicking on the icon or modal
  if (selectionIcon.contains(e.target) || selectionModal.contains(e.target)) {
    return;
  }

  // Small delay to ensure selection is complete
  clearTimeout(selectionTimeout);
  selectionTimeout = setTimeout(() => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (selectedText && selectedText.length > 0) {
      // Store current selection text and URL
      currentSelection = selectedText;
      currentUrl = window.location.href;
      showIconForSelection();
    } else {
      hideIcon();
      currentSelection = null;
      currentUrl = null;
    }
  }, 10);
}

/**
 * Handle selection change
 */
function handleSelectionChange() {
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();

  if (!selectedText || selectedText.length === 0) {
    setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.toString().trim().length === 0) {
        hideIcon();
        currentSelection = null;
        currentUrl = null;
      }
    }, 50);
  }
}

/**
 * Show icon near the selection
 */
function showIconForSelection() {
  const selection = window.getSelection();
  if (!selection.rangeCount) return;

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  if (rect.width === 0 && rect.height === 0) return;

  // Position icon at the end of selection
  const iconWidth = 40;
  const iconHeight = 40;
  const offset = 8;

  let left = rect.right + offset + window.scrollX;
  let top = rect.top + window.scrollY - iconHeight / 2 + rect.height / 2;

  // Keep icon within viewport
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Adjust horizontal position if too far right
  if (left + iconWidth > viewportWidth + window.scrollX) {
    left = rect.left + window.scrollX - iconWidth - offset;
  }

  // Adjust vertical position if too far down
  if (top + iconHeight > viewportHeight + window.scrollY) {
    top = viewportHeight + window.scrollY - iconHeight - offset;
  }

  // Adjust vertical position if too far up
  if (top < window.scrollY) {
    top = window.scrollY + offset;
  }

  selectionIcon.style.left = `${left}px`;
  selectionIcon.style.top = `${top}px`;

  // Show with animation
  requestAnimationFrame(() => {
    selectionIcon.classList.remove("quick-note-icon-hidden");
    selectionIcon.classList.add("quick-note-icon-visible");
  });
}

/**
 * Hide the icon
 */
function hideIcon() {
  selectionIcon.classList.remove("quick-note-icon-visible");
  selectionIcon.classList.add("quick-note-icon-hidden");
}

/**
 * Show the modal
 */
function showModal() {
  // Populate modal with current selection
  const previewTextarea = selectionModal.querySelector(
    ".quick-note-preview-textarea"
  );
  const urlDisplay = selectionModal.querySelector(".quick-note-url-display");
  const includeUrlCheckbox = selectionModal.querySelector(
    "#quick-note-include-url"
  );

  previewTextarea.value = currentSelection;
  urlDisplay.textContent = currentUrl;
  includeUrlCheckbox.checked = true;
  urlDisplay.style.display = "block";

  // Show modal
  selectionModal.classList.remove("quick-note-modal-hidden");
  selectionModal.classList.add("quick-note-modal-visible");

  // Auto-resize textarea and focus
  setTimeout(() => {
    previewTextarea.style.height = "auto";
    previewTextarea.style.height = previewTextarea.scrollHeight + "px";
    previewTextarea.focus();
    previewTextarea.setSelectionRange(
      previewTextarea.value.length,
      previewTextarea.value.length
    );
  }, 100);
}

/**
 * Hide the modal
 */
function hideModal() {
  selectionModal.classList.remove("quick-note-modal-visible");
  selectionModal.classList.add("quick-note-modal-hidden");

  // Clear selection
  const selection = window.getSelection();
  if (selection) {
    selection.removeAllRanges();
  }

  hideIcon();
  currentSelection = null;
  currentUrl = null;

  // Reset button state
  setTimeout(() => {
    const saveBtn = selectionModal.querySelector(".quick-note-save");
    saveBtn.disabled = false;
    saveBtn.classList.remove("saving", "saved");
    const btnContent = saveBtn.querySelector(".btn-content");
    btnContent.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
        <polyline points="17 21 17 13 7 13 7 21"></polyline>
        <polyline points="7 3 7 8 15 8"></polyline>
      </svg>
      <span>Save Note</span>
    `;
  }, 300);
}

/**
 * Handle icon click
 */
function handleIconClick(e) {
  e.preventDefault();
  e.stopPropagation();

  if (!currentSelection) {
    console.log("No text selected");
    hideIcon();
    return;
  }

  // Hide icon and show modal
  hideIcon();
  showModal();
}

/**
 * Handle save from modal
 */
async function handleSaveFromModal() {
  const previewTextarea = selectionModal.querySelector(
    ".quick-note-preview-textarea"
  );
  const editedText = previewTextarea.value.trim();

  if (!editedText) {
    previewTextarea.classList.add("shake");
    setTimeout(() => {
      previewTextarea.classList.remove("shake");
    }, 300);
    previewTextarea.focus();
    return;
  }

  const includeUrl = selectionModal.querySelector(
    "#quick-note-include-url"
  ).checked;
  const urlToSave = includeUrl ? currentUrl : null;

  try {
    const saveBtn = selectionModal.querySelector(".quick-note-save");
    const btnContent = saveBtn.querySelector(".btn-content");

    // Disable button and show saving state
    saveBtn.disabled = true;
    saveBtn.classList.add("saving");

    // Saving animation
    btnContent.innerHTML = `
      <svg class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" opacity="0.25"></circle>
        <path d="M12 2 A10 10 0 0 1 22 12" opacity="1"></path>
      </svg>
      <span>Saving...</span>
    `;

    // Send message to background script to save note
    chrome.runtime.sendMessage(
      {
        action: "saveNote",
        text: editedText,
        url: urlToSave,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error sending message:", chrome.runtime.lastError);
          saveBtn.disabled = false;
          saveBtn.classList.remove("saving");
          return;
        }

        // Success state
        saveBtn.classList.remove("saving");
        saveBtn.classList.add("saved");
        btnContent.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>Saved!</span>
        `;

        // Hide modal after delay
        setTimeout(() => {
          hideModal();
        }, 1000);
      }
    );
  } catch (error) {
    console.error("Error in handleSaveFromModal:", error);
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
