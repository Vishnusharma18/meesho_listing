document.addEventListener("DOMContentLoaded", async () => {
  // Clear any leftover trial / license locks from older builds
  await chrome.storage.local.remove([
    "ecomTrialCount",
    "ecomTrialLocked",
    "userPlan",
    "authToken",
    "tokenExpiry",
    "tokenChecksum",
  ]);

  const profileSelect = document.getElementById("profileSelect");

  const btnNew = document.getElementById("btnNewProfile");
  const btnEdit = document.getElementById("btnEditProfile");
  const btnDelete = document.getElementById("btnDeleteProfile");

  const btnCapture = document.getElementById("btnCapture");
  const btnAutofill = document.getElementById("btnAutofill");

  const btnExport = document.getElementById("btnExport");
  const btnImport = document.getElementById("btnImport");
  const importFile = document.getElementById("importFile");

  let profiles = {};

  /* LOAD PROFILES */

  async function loadProfiles() {
    const data = await chrome.storage.local.get(["profiles"]);

    profiles = data.profiles || {};

    profileSelect.innerHTML = '<option value="" disabled>-- Choose --</option>';

    let lastId = null;

    Object.keys(profiles).forEach((id) => {
      const opt = document.createElement("option");

      opt.value = id;
      opt.textContent = profiles[id].name;

      profileSelect.appendChild(opt);

      lastId = id;
    });

    if (lastId) {
      profileSelect.value = lastId;
    }
  }

  /* SAVE PROFILES */

  async function saveProfiles() {
    await chrome.storage.local.set({ profiles });
  }

  /* CREATE PROFILE */

  btnNew.onclick = async () => {
    const name = prompt("Enter profile name");

    if (!name) return;

    const id = "profile_" + Date.now();

    profiles[id] = {
      name: name,
      fields: [],
    };

    await saveProfiles();

    await loadProfiles();

    profileSelect.value = id;
  };

  /* DELETE PROFILE */

  btnDelete.onclick = async () => {
    const id = profileSelect.value;

    if (!id) return;

    if (!confirm("Delete this profile?")) return;

    delete profiles[id];

    await saveProfiles();

    loadProfiles();
  };

  /* RENAME PROFILE */

  btnEdit.onclick = async () => {
    const id = profileSelect.value;

    if (!id) return;

    const newName = prompt("New name", profiles[id].name);

    if (!newName) return;

    profiles[id].name = newName;

    await saveProfiles();

    loadProfiles();
  };

  /* START CAPTURE */

  btnCapture.onclick = async () => {
    const id = profileSelect.value;

    if (!id) {
      alert("Select profile first");
      return;
    }

    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    const startCapture = () => {
      chrome.tabs.sendMessage(
        tab.id,
        {
          action: "START_CAPTURE",
          profileId: id,
        },
        () => {
          if (chrome.runtime.lastError) {
            chrome.scripting
              .executeScript({
                target: { tabId: tab.id },
                files: ["selector-utils.js", "content.js"],
              })
              .then(() => {
                chrome.tabs.sendMessage(tab.id, {
                  action: "START_CAPTURE",
                  profileId: id,
                });
                window.close();
              })
              .catch(() =>
                alert("Capture Fields could not start on this page"),
              );
          } else {
            window.close();
          }
        },
      );
    };
    chrome.tabs.sendMessage(tab.id, { action: "PING" }, (response) => {
      if (chrome.runtime.lastError || !response || !response.ready) {
        chrome.scripting
          .executeScript({
            target: { tabId: tab.id },
            files: ["selector-utils.js", "content.js"],
          })
          .then(startCapture)
          .catch(() => alert("Capture Fields could not start on this page"));
      } else startCapture();
    });
  };

  /* AUTOFILL */

  btnAutofill.onclick = async () => {
    const id = profileSelect.value;

    if (!id) {
      alert("Select profile first");
      return;
    }

    const data = profiles[id];

    if (!data || data.fields.length === 0) {
      alert("No fields saved in this profile");
      return;
    }

    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    chrome.tabs.sendMessage(tab.id, {
      action: "AUTOFILL",
      data: data,
    });
  };

  /* EXPORT */

  btnExport.onclick = () => {
    if (Object.keys(profiles).length === 0) {
      alert("No profiles to export");
      return;
    }

    const data = JSON.stringify(profiles, null, 2);

    const blob = new Blob([data], { type: "application/json" });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;
    a.download = "ecommann_profiles_" + Date.now() + ".json";

    document.body.appendChild(a);

    a.click();

    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  };

  /* IMPORT */

  btnImport.onclick = () => {
    importFile.click();
  };

  importFile.addEventListener("change", (e) => {
    const file = e.target.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const imported = JSON.parse(event.target.result);

        Object.assign(profiles, imported);

        await chrome.storage.local.set({ profiles });

        alert("Profiles imported successfully");

        loadProfiles();
      } catch {
        alert("Invalid file");
      }
    };

    reader.readAsText(file);
  });

  loadProfiles();
});
