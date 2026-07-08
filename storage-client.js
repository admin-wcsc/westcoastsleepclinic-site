/* ---------------------------------------------------------------------------
   StorageClient  —  the "middleman" between your app and where data lives.

   THE WHOLE POINT:
   Your app never talks to storage directly. It talks to StorageClient, and
   StorageClient decides HOW to store things. Today it calls your local dev
   server. When the Azure Storage account exists, you rewrite ONLY the
   insides of this file to call it — and the rest of your app doesn't
   change at all. Power Automate will trigger off of storage (blob-created)
   once that side is built; the browser only ever needs to know about
   "storage," never about Power Automate directly.
--------------------------------------------------------------------------- */

var StorageClient = (function () {
  // Change this ONE line when the backend location changes (e.g. to an
  // Azure Function that writes to Blob Storage).
  var BASE_URL = 'http://localhost:4000';

  function request(path, options) {
    return fetch(BASE_URL + path, options).then(function (res) {
      if (!res.ok) {
        return res.json().catch(function () { return {}; }).then(function (body) {
          throw new Error(body.error || ('Request failed: ' + res.status));
        });
      }
      return res.json();
    });
  }

  function jsonPost(path, data) {
    return request(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  }

  // Browsers give you a File object from an <input type="file">. We convert
  // it to base64 text so it can travel inside JSON to the server.
  function fileToBase64(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result.split(',')[1]); };
      reader.onerror = function () { reject(new Error('Could not read file.')); };
      reader.readAsDataURL(file);
    });
  }

  // Bundles a form's data plus any attached documents into one package and
  // sends it to storage in one call. `files` is an array of browser File
  // objects (e.g. straight from an <input type="file"> or a drop zone).
  function submitIntake(type, data, files) {
    return Promise.all((files || []).map(function (f) {
      return fileToBase64(f).then(function (base64) {
        return { name: f.name, base64: base64 };
      });
    })).then(function (encodedFiles) {
      return jsonPost('/submissions/' + type, { data: data, files: encodedFiles });
    });
  }

  function listSubmissions(type) {
    return request('/submissions/' + type, { method: 'GET' });
  }

  return {
    submitIntake: submitIntake,
    listSubmissions: listSubmissions
  };
})();
