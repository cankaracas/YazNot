# YazNot 1.0 — User Guide

## Welcome

YazNot is a calm notebook built for one thing: not losing the sentence in your head. It runs offline on Windows, installs from the browser on your phone, and shows the same notes everywhere you sign in with the same account.

This guide is intentionally short. Open the section you need, finish the task, and get back to writing. You can reopen it any time from the **?** button in the bottom-right corner or **⋯ → User guide**. The in-app guide works offline.

### Three ideas

- **Device first, cloud second.** A note is saved on this device before it syncs. Write without a connection; changes catch up when you are back online.
- **Speech stays here.** Speech-to-text runs entirely on your device. Audio is never sent to a server.
- **Keep it calm.** Sections, notes and a few good tools. Everything distracting stays behind a menu.

## The first note

### Sign in

Open YazNot with Google or a one-time code sent to your email. As long as you use the same account, your notes look the same on Windows, in a browser and on your phone.

The guide opens once on first launch. After you choose **Got it**, the **?** button stays in the bottom-right corner.

### Create a section

1. Select **New section** in the sidebar.
2. Give it a name; choose an emoji, colour and layout if you like.
3. **Flat list** is for writing notes directly. **Grouped** is for keeping notes inside groups.
4. Select **Save** to open the section.

### Create a note

Select **New item**, give the note a title and start writing. YazNot saves every change automatically. The **Saved** label below the title tells you the note is safe.

## Sections and notes

### Layout

- **Flat list:** notes sit one under another. Good for class notes, a journal or quick ideas.
- **Grouped:** you see groups first, then the notes inside a group. Good for books, projects and larger subjects.
- Drag sections in the sidebar to reorder them.
- **List** shows rows; **Card** shows a more visual grid.

### Quick actions

Right-click a section, group or note (long-press on mobile) for rename, share, hide, move and delete.

- **Hide** does not delete a section. Bring it back from **⋯ → Hidden sections**.
- Everything you delete goes to **Trash** and waits there for **30 days**.
- Use **Undo** in the delete notification to bring it back immediately.

### Bulk actions

Choose **Select** from a section or group menu, then tap notes to select them. The bottom bar can **move**, **export** or **delete** the selection. Use `Shift` for a range and `Ctrl + A` for everything.

## Writing, search, reading

### The editor

The toolbar has headings (H1–H3), bold, italic, underline, strikethrough, highlight, quote, bulleted/numbered lists, links and images.

- **Images:** use the image button, paste from the clipboard or drop a file into the editor. YazNot resizes and compresses it.
- **Focus mode:** just you and the writing. Press `Ctrl + Shift + F`.
- **Words and time:** the word count and approximate reading time sit below the title.

### Search

- **All notes:** `Ctrl + K` or the magnifier in the sidebar. Results appear as you type.
- **Current section:** the search field below the section title. `Ctrl + F` moves the cursor there.
- Use `↑` `↓` to move through results and `Enter` to open one.

### Read like a book

Choose **Read** from a section or group menu. The section opens as one continuous page; the progress percentage stays at the top. Scrolling hides the top bar; tap to bring it back. Press `Esc` to leave.

## Speech to text

While inside a note, press the **microphone** button in the toolbar.

1. **Model:** the Duyu-small model (about 56 MB) downloads once and stays on your device. It then works offline.
2. **Record:** press **Start recording**, speak, then **Stop recording**. Up to 2 minutes.
3. **File:** choose **Choose an audio file** to load MP3, M4A, WAV, OGG or WEBM. Up to 5 minutes.
4. **Review:** edit the text or use **Copy** to put it on the clipboard.
5. **Add to note:** the text is inserted at the cursor.

**Language:** Auto (Turkish + English), Turkish or English. The choice is remembered on the device.

**Privacy:** audio and text never leave your device. Only the model files are downloaded from the internet, once.

**Tip:** use a quiet room, speak at a normal pace, and keep 20–30 cm between you and the microphone.

## Backup, export, sharing

### Automatic backup

On desktop, YazNot makes a backup every day and keeps the last **7 copies per account**. Open the folder from **⋯ → Settings → Backup folder**.

### JSON backup

- **⋯ → Create backup:** writes every note to a single JSON file.
- **⋯ → Restore from backup:** offers two modes:
  - **Add to existing notes:** current notes stay; the backup is added as separate sections.
  - **Replace existing notes:** everything in this account is removed and only the backup is loaded. Trash is emptied too.

### Import and export

From the editor's **⋯** menu, export a note as **PDF**, **TXT** or **Markdown**. Export a whole section with **⋯ → Export as Markdown**.

Use **Import…** in a section or group menu to add TXT, Markdown or PDF. Markdown headings, lists, links and tables are preserved; raw HTML is never executed. PDF text is extracted from the text layer.

### Sharing

Send a section, group or note to an email address. The recipient sees it under **Shares → Incoming** and can accept it into their own account. Both people need to be online for the transfer.

## Accounts and settings

### Multiple accounts

Several accounts can stay signed in on one device. Open the account row at the bottom of the sidebar and choose an account. **Add account** starts a new one without closing the current session.

**Sign out of this account** removes only the active account. To remove an account from the device completely, use the **×** beside its row. Notes, trash and settings are separate for each account.

### Appearance

Under **⋯ → Settings**:

- **Language:** Turkish / English. The interface reloads when you change it.
- **Theme:** Dark / Light.
- **Font size**, **line spacing**, **writing width**.
- **Spell check:** mark mistakes while writing.
- **Backup folder**.

## Shortcuts and troubleshooting

### Shortcuts

| Shortcut | What it does |
|---|---|
| `Ctrl + K` | Search all notes |
| `Ctrl + S` | Save now |
| `Ctrl + N` | New note |
| `Ctrl + F` | Search the open list |
| `Ctrl + B / I / U` | Bold / italic / underline |
| `Ctrl + \` | Toggle the sidebar |
| `Ctrl + Shift + F` | Focus mode |
| `Ctrl + Shift + H` | Hidden sections |
| `Ctrl + A` | Select all in selection mode |
| `Shift + click` | Select a range in selection mode |
| `Esc` | Close the open window / go back |

### Troubleshooting

- **No sign-in code:** check Spam and your organisation's mail quarantine. Some organisations block external senders.
- **Changes have not reached another device:** check the sync state in the sidebar. If it says **waiting…**, changes will be sent when the connection returns.
- **The speech model will not download:** check the connection. Corporate networks sometimes block `huggingface.co`. Partial downloads are discarded; choose **Download model** again.
- **Microphone permission:** open the lock icon in the browser's address bar and allow the microphone. The PWA must be served over **https**.
- **Where are my backups?** On desktop: **Settings → Backup folder**.

Your notes are yours. Write well.
