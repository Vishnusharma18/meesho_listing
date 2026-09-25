async function handleSaveField(e) {
  try {
    const { profileId, field } = e;
    if (!profileId || !field) return false;

    let data = (await chrome.storage.local.get(["profiles"])).profiles || {};

    if (!data[profileId]) return false;

    const index = data[profileId].fields.findIndex(
      (x) => x.selector === field.selector,
    );

    if (index > -1) {
      data[profileId].fields[index] = field;
    } else {
      data[profileId].fields.push(field);
    }

    await chrome.storage.local.set({ profiles: data });

    return true;
  } catch (e) {
    return false;
  }
}

chrome.runtime.onMessage.addListener((msg, sender, res) => {
  if (msg.action === "SAVE_FIELD") {
    handleSaveField(msg.payload).then((r) => {
      res({ success: r });
    });
    return true;
  }
});
