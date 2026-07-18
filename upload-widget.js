// ---------------- SHARED UPLOAD WIDGET ----------------
// The drag-and-drop / browse file picker used by registration.html (Step 5's
// document upload) and provider-referral.html (the referral upload modal).
// Each page creates its own instance, pointed at its own element IDs, and
// reads the current file list back with .getFiles() — the widget owns the
// list itself rather than the page keeping a separate array in sync.

var UPLOAD_ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg'];

function uploadGetExtension(filename) {
  var dot = filename.lastIndexOf('.');
  return dot === -1 ? '' : filename.slice(dot + 1).toLowerCase();
}

function escHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

// opts:
//   dropZoneId, fileInputIds (array), fileListId, fileCountNoteId, uploadErrId — required
//   onChange() — optional; called after every add/remove so the page can react
//   (e.g. provider-referral.html re-checks whether Submit should be enabled)
function createUploadWidget(opts) {
  var files = [];
  var dropZone = document.getElementById(opts.dropZoneId);
  var fileList = document.getElementById(opts.fileListId);
  var fileCountNote = document.getElementById(opts.fileCountNoteId);
  var uploadErr = document.getElementById(opts.uploadErrId);

  function showError(msg) {
    uploadErr.textContent = msg;
    uploadErr.style.display = 'block';
  }

  function handleFiles(newFiles) {
    var rejected = [];
    for (var i = 0; i < newFiles.length; i++) {
      if (UPLOAD_ALLOWED_EXTENSIONS.indexOf(uploadGetExtension(newFiles[i].name)) === -1) {
        rejected.push(newFiles[i].name);
        continue;
      }
      var duplicate = false;
      for (var j = 0; j < files.length; j++) {
        if (files[j].name === newFiles[i].name && files[j].size === newFiles[i].size) {
          duplicate = true;
          break;
        }
      }
      if (!duplicate) files.push(newFiles[i]);
    }
    // Reset inputs so the same file can be re-selected after removal
    opts.fileInputIds.forEach(function (id) { document.getElementById(id).value = ''; });
    renderFileList();
    if (rejected.length > 0) {
      showError('Unsupported file type — ' + rejected.join(', ') + '. Accepted types: Word, PDF, Excel, PNG, JPEG.');
    }
  }

  function removeFile(idx) {
    files.splice(idx, 1);
    renderFileList();
  }

  function renderFileList() {
    fileList.innerHTML = '';
    files.forEach(function (f, idx) {
      var item = document.createElement('div');
      item.className = 'file-item';
      item.innerHTML =
        '<div class="file-icon"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>' +
        '<div class="file-info">' +
          '<div class="file-name">' + escHtml(f.name) + '</div>' +
          '<div class="file-size">' + formatBytes(f.size) + '</div>' +
        '</div>' +
        '<button class="file-remove" type="button" data-remove-idx="' + idx + '" aria-label="Remove file">' +
          '<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
        '</button>';
      fileList.appendChild(item);
    });

    if (files.length > 0) {
      var fileWord = files.length === 1 ? 'file selected' : 'files selected';
      fileCountNote.textContent = files.length + ' ' + fileWord;
      fileCountNote.style.display = 'block';
    } else {
      fileCountNote.style.display = 'none';
    }
    uploadErr.style.display = 'none';
    if (opts.onChange) opts.onChange();
  }

  fileList.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-remove-idx]');
    if (btn) removeFile(parseInt(btn.getAttribute('data-remove-idx'), 10));
  });

  dropZone.addEventListener('dragover', function (e) { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', function (e) { if (!dropZone.contains(e.relatedTarget)) dropZone.classList.remove('drag-over'); });
  dropZone.addEventListener('drop', function (e) { e.preventDefault(); dropZone.classList.remove('drag-over'); handleFiles(e.dataTransfer.files); });
  opts.fileInputIds.forEach(function (id) {
    document.getElementById(id).addEventListener('change', function () { handleFiles(this.files); });
  });

  return {
    getFiles: function () { return files; },
    showError: showError
  };
}
