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
          <div class="quick-note-preview-label">Selected Text:</div>
          <div class="quick-note-preview-text"></div>
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
        <button class="quick-note-btn quick-note-btn-primary quick-note-save">Save Note</button>
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
  const previewText = selectionModal.querySelector(".quick-note-preview-text");
  const urlDisplay = selectionModal.querySelector(".quick-note-url-display");
  const includeUrlCheckbox = selectionModal.querySelector(
    "#quick-note-include-url"
  );

  // Truncate long text
  const displayText =
    currentSelection.length > 200
      ? currentSelection.substring(0, 200) + "..."
      : currentSelection;

  previewText.textContent = displayText;
  urlDisplay.textContent = currentUrl;
  includeUrlCheckbox.checked = true;
  urlDisplay.style.display = "block";

  // Show modal
  selectionModal.classList.remove("quick-note-modal-hidden");
  selectionModal.classList.add("quick-note-modal-visible");
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
  const includeUrl = selectionModal.querySelector(
    "#quick-note-include-url"
  ).checked;
  const urlToSave = includeUrl ? currentUrl : null;

  try {
    // Add success animation to modal
    const saveBtn = selectionModal.querySelector(".quick-note-save");
    saveBtn.textContent = "✓ Saved!";
    saveBtn.style.background =
      "linear-gradient(135deg, #10b981 0%, #059669 100%)";

    // Send message to background script to save note
    chrome.runtime.sendMessage(
      {
        action: "saveNote",
        text: currentSelection,
        url: urlToSave,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error sending message:", chrome.runtime.lastError);
        } else {
          console.log("Note saved successfully");
        }
      }
    );

    // Hide modal after short delay
    setTimeout(() => {
      hideModal();
      saveBtn.textContent = "Save Note";
      saveBtn.style.background = "";
    }, 800);
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
