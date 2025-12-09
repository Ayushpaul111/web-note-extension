// Import storage utilities
importScripts("storage.js");

// Create context menu when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "saveToNotes",
    title: "Save to Notes",
    contexts: ["selection"],
  });

  console.log("Quick Note Taker extension installed");
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "saveToNotes" && info.selectionText) {
    await saveNoteFromText(info.selectionText, info.pageUrl);
  }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "saveNote" && request.text) {
    // Handle async operation properly
    (async () => {
      try {
        await saveNoteFromText(request.text, request.url);
        sendResponse({ success: true });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();

    return true; // Keep message channel open for async response
  }
});

/**
 * Save a note from selected text
 * @param {string} text - Selected text to save
 * @param {string} url - Page URL (optional)
 */
async function saveNoteFromText(text, url = null) {
  try {
    const selectedText = text.trim();

    if (!selectedText) {
      console.log("No text to save");
      return;
    }

    const newNote = {
      id: crypto.randomUUID(),
      text: selectedText,
      url: url || null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      index: 0,
    };

    await StorageHelper.addNote(newNote);
    console.log("Note saved:", selectedText.substring(0, 50) + "...");
  } catch (error) {
    console.error("Error saving note:", error);
    throw error;
  }
}
