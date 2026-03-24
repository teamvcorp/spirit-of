"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, LogOut, Eye, EyeOff } from "lucide-react";

type Toy = { id: string; name: string; description: string; price: number; image: string };

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
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/auth")
      .then((r) => r.json())
      .then((d) => { setAuthed(d.ok); if (d.ok) loadToys(); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadToys = async () => {
    setToysLoading(true);
    const r = await fetch("/api/toys");
    const d = await r.json();
    if (d.toys) setToys(d.toys);
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
        <button onClick={handleLogout} className="flex items-center gap-2 text-xs text-slate-500 hover:text-red-400 transition font-medium">
          <LogOut size={14} /> Log Out
        </button>
      </header>
      <main className="max-w-4xl mx-auto px-12 py-16">
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
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Image URL (optional)</label>
              <input value={formImage} onChange={(e) => setFormImage(e.target.value)} placeholder="https://…" className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-3 rounded-xl text-sm outline-none focus:border-crimson-600 transition placeholder:text-slate-600" />
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
      </main>
    </div>
  );
}
