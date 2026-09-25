const ENCRYPTION_KEY = "vishnu_meesho_2026_secure_key";
function encrypt(t) {
  let e = "";
  for (let o = 0; o < t.length; o++)
    e += String.fromCharCode(
      t.charCodeAt(o) ^ ENCRYPTION_KEY.charCodeAt(o % 31),
    );
  return btoa(e);
}
function decrypt(t) {
  try {
    const e = atob(t);
    let o = "";
    for (let t = 0; t < e.length; t++)
      o += String.fromCharCode(
        e.charCodeAt(t) ^ ENCRYPTION_KEY.charCodeAt(t % 31),
      );
    return o;
  } catch (t) {
    return null;
  }
}
const getEndpoints = () => {
  const t = atob("aHR0cHM6Ly9sb2NhbGhvc3Q="),
    e = atob("aHR0cDovL2xvY2FsaG9zdDozMDAw"),
    o = atob("L2FwaS92ZXJpZnktbGljZW5zZQ==");
  return [t + o, e + o];
};
export const Auth = {
  async isAuthenticated() {
    const { authToken: t, tokenExpiry: e } = await chrome.storage.local.get([
      "authToken",
      "tokenExpiry",
    ]);
    if (!t || !e) return !1;
    if (Date.now() > e) return (await this.logout(), !1);
    const o = decrypt(t);
    return !(!o || "verified_user" !== o) || (await this.logout(), !1);
  },
  async login() {
    const t = atob("aHR0cHM6Ly9sb2NhbGhvc3Qvc2lnbi1pbg==");
    chrome.tabs.create({ url: t });
  },
  logout: async () => (
    await chrome.storage.local.remove([
      "authToken",
      "userPlan",
      "tokenExpiry",
      "tokenChecksum",
    ]),
    !0
  ),
  async checkLicense() {
    const t = getEndpoints();
    for (const e of t)
      try {
        const t = await fetch(e, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });
        if (t.ok) {
          const e = await t.json();
          if (e.success) {
            const t = encrypt("verified_user"),
              o = Date.now() + 864e5,
              n = btoa(t + o);
            return (
              await chrome.storage.local.set({
                authToken: t,
                userPlan: e.plan || "pro",
                tokenExpiry: o,
                tokenChecksum: n,
              }),
              { success: !0, plan: e.plan }
            );
          }
          continue;
        }
      } catch (t) {}
    return { success: !1, message: "Please log in" };
  },
  async revalidateSession() {
    return (
      !!(await this.isAuthenticated()) &&
      (!!(await this.checkLicense()).success || (await this.logout(), !1))
    );
  },
  async verifyIntegrity() {
    const {
      authToken: t,
      tokenExpiry: e,
      tokenChecksum: o,
    } = await chrome.storage.local.get([
      "authToken",
      "tokenExpiry",
      "tokenChecksum",
    ]);
    return !!(t && e && o) && btoa(t + e) === o;
  },
};
