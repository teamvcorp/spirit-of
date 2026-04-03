"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, LogOut, Eye, EyeOff, KeyRound, Users, ShoppingBag, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";

type Toy = { id: string; name: string; description: string; price: number; image: string };
type UserChild = { id: string; name: string; magicPoints: number; wishlistCount: number };
type User = { id: string; email: string; createdAt: string; walletBalance: number; shippingAddress: string; referralCode: string; isChristmasLocked: boolean; children: UserChild[]; _count: { children: number } };

export default function AdminCMS() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [toys, setToys] = useState<Toy[]>([]);
  const [toysLoading, setToysLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formPoints, setFormPoints] = useState("");
  const [formImage, setFormImage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'toys' | 'users'>('toys');
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [resettingUser, setResettingUser] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [tempPasswords, setTempPasswords] = useState<Record<string, string>>({});
  const [copiedUser, setCopiedUser] = useState<string | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/auth")
      .then((r) => r.json())
      .then((d) => { setAuthed(d.ok); if (d.ok) { loadToys(); loadUsers(); } });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-logout when the tab/window is closed or the user navigates away
  useEffect(() => {
    const logout = () => {
      navigator.sendBeacon(
        "/api/admin/auth",
        new Blob([JSON.stringify({ logout: true })], { type: "application/json" })
      );
    };
    window.addEventListener("beforeunload", logout);
    return () => window.removeEventListener("beforeunload", logout);
  }, []);

  const loadToys = async () => {
    setToysLoading(true);
    try {
      const r = await fetch("/api/toys");
      if (!r.ok) { console.error("loadToys failed:", r.status); setToysLoading(false); return; }
      const d = await r.json();
      if (d.toys) setToys(d.toys);
    } catch (e) { console.error("loadToys error:", e); }
    setToysLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError("");
    const r = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const d = await r.json();
    setLoggingIn(false);
    if (d.ok) { setAuthed(true); setPassword(""); loadToys(); }
    else setLoginError("Incorrect password.");
  };

  const handleLogout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    setAuthed(false);
    setToys([]);
    setUsers([]);
    setTempPasswords({});
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    setFormError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) { setFormError(d.error ?? "Upload failed"); setUploading(false); return; }
      setFormImage(d.url);
    } catch { setFormError("Upload failed"); }
    setUploading(false);
  };

  const handleAddToy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formDesc.trim() || !formPoints) {
      setFormError("Name, description, and point cost are required.");
      return;
    }
    setSaving(true);
    setFormError("");
    const r = await fetch("/api/toys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: formName.trim(), description: formDesc.trim(), pointCost: Number(formPoints), image: formImage.trim() }),
    });
    setSaving(false);
    if (r.ok) { setFormName(""); setFormDesc(""); setFormPoints(""); setFormImage(""); setShowAddForm(false); loadToys(); }
    else { const d = await r.json(); setFormError(d.error ?? "Failed to add toy."); }
  };

  const handleDelete = async (toyId: string) => {
    if (!confirm("Delete this toy? This cannot be undone.")) return;
    setDeleting(toyId);
    await fetch(`/api/toys/${toyId}`, { method: "DELETE" });
    setDeleting(null);
    loadToys();
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const r = await fetch("/api/admin/users");
      if (!r.ok) { console.error("loadUsers failed:", r.status); setUsersLoading(false); return; }
      const d = await r.json();
      if (d.users) setUsers(d.users);
    } catch (e) { console.error("loadUsers error:", e); }
    setUsersLoading(false);
  };

  const handleResetPassword = async (userId: string) => {
    if (!confirm("Reset this user's password? They will need to use the temporary password to log in.")) return;
    setResettingUser(userId);
    const r = await fetch(`/api/admin/users/${userId}`, { method: "PATCH" });
    const d = await r.json();
    setResettingUser(null);
    if (d.tempPassword) {
      setTempPasswords((prev) => ({ ...prev, [userId]: d.tempPassword }));
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Delete account for ${email}? This will also delete all their children and data. This cannot be undone.`)) return;
    setDeletingUser(userId);
    await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    setDeletingUser(null);
    setTempPasswords((prev) => { const next = { ...prev }; delete next[userId]; return next; });
    loadUsers();
  };

  const copyTemp = (userId: string, pw: string) => {
    navigator.clipboard.writeText(pw);
    setCopiedUser(userId);
    setTimeout(() => setCopiedUser(null), 2000);
  };

  if (authed === null) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-500 text-sm italic animate-pulse">Checking access…</p>
      </main>
    );
  }

  if (!authed) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-10 text-center">
            <p className="text-[10px] text-crimson-500 font-bold uppercase tracking-[0.3em] mb-3">Spirit of Santa</p>
            <h1 className="text-3xl font-serif italic text-white">Company Admin</h1>
            <p className="text-slate-600 text-sm mt-2">Internal tool — not for parents.</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setLoginError(""); }}
                placeholder="Admin password"
                className="w-full bg-slate-900 border border-slate-800 text-white px-6 py-4 pr-12 rounded-2xl outline-none focus:border-crimson-600 transition text-sm placeholder:text-slate-600"
                autoFocus
              />
              <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {loginError && <p className="text-red-400 text-xs text-center">{loginError}</p>}
            <button type="submit" disabled={!password || loggingIn} className="w-full bg-crimson-700 text-white py-4 rounded-full font-bold text-sm hover:bg-crimson-600 transition disabled:opacity-40">
              {loggingIn ? "Verifying…" : "Enter"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      <header className="border-b border-slate-800 px-12 py-6 flex justify-between items-center">
        <div>
          <span className="text-[10px] text-crimson-500 font-bold uppercase tracking-[0.3em]">Spirit of Santa</span>
          <h1 className="text-xl font-serif italic text-white mt-0.5">Company Admin</h1>
        </div>
        <div className="flex items-center gap-6">
          <nav className="flex gap-1 bg-slate-900 border border-slate-800 rounded-full px-1 py-1">
            <button
              onClick={() => setActiveTab('toys')}
              className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition ${
                activeTab === 'toys' ? 'bg-crimson-700 text-white' : 'text-slate-500 hover:text-white'
              }`}
            >
              <ShoppingBag size={13} /> Toys
            </button>
            <button
              onClick={() => { setActiveTab('users'); if (users.length === 0) loadUsers(); }}
              className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition ${
                activeTab === 'users' ? 'bg-crimson-700 text-white' : 'text-slate-500 hover:text-white'
              }`}
            >
              <Users size={13} /> Users
            </button>
          </nav>
          <button onClick={handleLogout} className="flex items-center gap-2 text-xs text-slate-500 hover:text-red-400 transition font-medium">
            <LogOut size={14} /> Log Out
          </button>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-12 py-16">

        {/* ── Users Tab ── */}
        {activeTab === 'users' && (
          <div>
            <div className="flex justify-between items-end mb-10">
              <div>
                <h2 className="text-3xl font-serif italic">Parent Accounts</h2>
                <p className="text-slate-500 text-sm mt-1">{users.length} {users.length === 1 ? 'account' : 'accounts'} registered</p>
              </div>
              <button onClick={loadUsers} className="text-xs text-slate-500 hover:text-white transition font-medium">↺ Refresh</button>
            </div>
            {usersLoading ? (
              <p className="text-slate-600 text-sm italic animate-pulse">Loading users…</p>
            ) : users.length === 0 ? (
              <div className="text-center py-24 border border-dashed border-slate-800 rounded-2xl">
                <p className="text-slate-600 font-serif italic text-lg">No users yet.</p>
              </div>
            ) : (
              <div className="border border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-900 text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500 border-b border-slate-800">
                    <tr>
                      <th className="px-8 py-5">Email</th>
                      <th className="px-8 py-5">Joined</th>
                      <th className="px-8 py-5">Children</th>
                      <th className="px-8 py-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {users.map((user) => (
                      <tr key={user.id} className="group">
                        <td colSpan={4} className="p-0">
                          {/* Clickable row */}
                          <div
                            className="grid hover:bg-slate-900/50 transition cursor-pointer"
                            style={{ gridTemplateColumns: '1fr auto auto auto' }}
                            onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
                          >
                            <div className="px-8 py-5 flex items-center gap-2">
                              {expandedUser === user.id ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
                              <div>
                                <span className="text-white font-medium">{user.email}</span>
                                {tempPasswords[user.id] && (
                                  <div className="mt-2 flex items-center gap-2">
                                    <span className="font-mono text-xs bg-slate-800 text-emerald-400 px-3 py-1 rounded-lg border border-slate-700">
                                      {tempPasswords[user.id]}
                                    </span>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); copyTemp(user.id, tempPasswords[user.id]); }}
                                      className="p-1 text-slate-500 hover:text-white transition"
                                      title="Copy to clipboard"
                                    >
                                      {copiedUser === user.id ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="px-8 py-5 text-slate-400 text-sm">
                              {new Date(user.createdAt).toLocaleDateString()}
                            </div>
                            <div className="px-8 py-5 text-sm">
                              <span className="text-crimson-400 font-mono font-bold">{user._count.children}</span>
                            </div>
                            <div className="px-8 py-5">
                              <div className="flex justify-end items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => handleResetPassword(user.id)}
                                  disabled={resettingUser === user.id}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 rounded-lg transition disabled:opacity-40"
                                  title="Reset password"
                                >
                                  <KeyRound size={12} />
                                  {resettingUser === user.id ? 'Resetting…' : 'Reset PW'}
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(user.id, user.email)}
                                  disabled={deletingUser === user.id}
                                  className="p-2 text-slate-600 hover:text-red-400 transition disabled:opacity-40"
                                  title="Delete account"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                          {/* Expanded detail panel */}
                          {expandedUser === user.id && (
                            <div className="bg-slate-900/60 border-t border-slate-800 px-12 py-6 space-y-4">
                              <div className="grid grid-cols-3 gap-6 text-sm">
                                <div>
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Wallet Balance</span>
                                  <span className="text-white font-mono font-bold text-lg">${(user.walletBalance / 100).toFixed(2)}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Referral Code</span>
                                  <span className="text-crimson-400 font-mono font-bold">{user.referralCode || '—'}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Christmas Lock</span>
                                  <span className={user.isChristmasLocked ? 'text-emerald-400 font-bold' : 'text-slate-500'}>{user.isChristmasLocked ? '🔒 Finalized' : 'Open'}</span>
                                </div>
                              </div>
                              <div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Shipping Address</span>
                                <p className="text-slate-300 text-sm whitespace-pre-wrap">{user.shippingAddress || 'No address on file'}</p>
                              </div>
                              {user.children.length > 0 ? (
                                <div>
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Children</span>
                                  <div className="grid grid-cols-2 gap-3">
                                    {user.children.map((child) => (
                                      <div key={child.id} className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 flex justify-between items-center">
                                        <div>
                                          <span className="text-white font-medium text-sm">{child.name}</span>
                                          <span className="text-slate-500 text-xs ml-2">{child.wishlistCount} wishlist item{child.wishlistCount !== 1 ? 's' : ''}</span>
                                        </div>
                                        <span className="text-crimson-400 font-mono font-bold text-sm">{child.magicPoints} pts</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <p className="text-slate-600 text-sm italic">No children registered.</p>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Toy Catalog Tab ── */}
        {activeTab === 'toys' && (<>
        <div className="flex justify-between items-end mb-10">
          <div>
            <h2 className="text-3xl font-serif italic">Toy Catalog</h2>
            <p className="text-slate-500 text-sm mt-1">{toys.length} {toys.length === 1 ? "toy" : "toys"} in the catalog</p>
          </div>
          <button onClick={() => { setShowAddForm((v) => !v); setFormError(""); }} className="flex items-center gap-2 bg-crimson-700 hover:bg-crimson-600 text-white px-6 py-3 rounded-full text-sm font-bold transition">
            <Plus size={16} /> {showAddForm ? "Cancel" : "Add New Toy"}
          </button>
        </div>

        {showAddForm && (
          <form onSubmit={handleAddToy} className="mb-10 bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">New Toy</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Name *</label>
                <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Wooden Train Set" className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-3 rounded-xl text-sm outline-none focus:border-crimson-600 transition placeholder:text-slate-600" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Point Cost *</label>
                <input type="number" min="1" value={formPoints} onChange={(e) => setFormPoints(e.target.value)} placeholder="e.g. 50" className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-3 rounded-xl text-sm outline-none focus:border-crimson-600 transition placeholder:text-slate-600" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Description *</label>
              <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Brief description shown to children" rows={2} className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-3 rounded-xl text-sm outline-none focus:border-crimson-600 transition placeholder:text-slate-600 resize-none" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Toy Image (optional)</label>
              <div className="flex items-center gap-4">
                <label className={`cursor-pointer bg-slate-800 border border-slate-700 hover:border-crimson-600 text-slate-400 hover:text-white px-4 py-3 rounded-xl text-sm transition ${uploading ? 'opacity-40 pointer-events-none' : ''}`}>
                  {uploading ? 'Uploading…' : 'Choose Image'}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
                </label>
                {formImage && (
                  <div className="flex items-center gap-3">
                    <img src={formImage} alt="Preview" className="w-10 h-10 rounded-lg object-cover border border-slate-700" />
                    <span className="text-emerald-400 text-xs font-medium">Uploaded ✓</span>
                    <button type="button" onClick={() => setFormImage("")} className="text-slate-600 hover:text-red-400 text-xs transition">Remove</button>
                  </div>
                )}
              </div>
            </div>
            {formError && <p className="text-red-400 text-xs">{formError}</p>}
            <div className="flex justify-end pt-2">
              <button type="submit" disabled={saving} className="bg-crimson-700 hover:bg-crimson-600 text-white px-8 py-3 rounded-full text-sm font-bold transition disabled:opacity-40">
                {saving ? "Saving…" : "Save Toy"}
              </button>
            </div>
          </form>
        )}

        {toysLoading ? (
          <p className="text-slate-600 text-sm italic animate-pulse">Loading catalog…</p>
        ) : toys.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-slate-800 rounded-2xl">
            <p className="text-slate-600 font-serif italic text-lg">No toys yet.</p>
            <p className="text-slate-700 text-sm mt-2">Click Add New Toy to build the catalog.</p>
          </div>
        ) : (
          <div className="border border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900 text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500 border-b border-slate-800">
                <tr>
                  <th className="px-8 py-5">Toy</th>
                  <th className="px-8 py-5">Description</th>
                  <th className="px-8 py-5">Points</th>
                  <th className="px-8 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {toys.map((toy) => (
                  <tr key={toy.id} className="hover:bg-slate-900/50 transition">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        {toy.image ? (
                          <img src={toy.image} alt={toy.name} className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                          <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-xl">🧸</div>
                        )}
                        <span className="font-medium text-white">{toy.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-slate-400 max-w-xs truncate">{toy.description}</td>
                    <td className="px-8 py-6"><span className="text-crimson-400 font-mono font-bold">{toy.price} pts</span></td>
                    <td className="px-8 py-6 text-right">
                      <button onClick={() => handleDelete(toy.id)} disabled={deleting === toy.id} className="p-2 text-slate-600 hover:text-red-400 transition disabled:opacity-40" title="Delete toy">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </>)}
      </main>
    </div>
  );
}
