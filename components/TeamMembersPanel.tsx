"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserPlus,
  Shield,
  Mail,
  Loader2,
  CheckCircle2,
  XCircle,
  Trash2,
  Search,
  KeyRound,
  Users,
  RefreshCw,
  X,
  Eye,
  EyeOff,
  Crown,
} from "lucide-react";
import { FieldInput, FieldLabel } from "@/components/ThemeFormFields";
import { errorText, fetchJson } from "@/lib/clientFetch";
import { passwordIssue } from "@/lib/security/urls";
import type { TeamMember } from "@/lib/auth/teamMembers";

interface TeamMembersPanelProps {
  adminUserId: string;
  initialMembers: TeamMember[];
  onCountChange: (count: number) => void;
}

function formatWhen(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export function TeamMembersPanel({ adminUserId, initialMembers, onCountChange }: TeamMembersPanelProps) {
  const [members, setMembers] = useState<TeamMember[]>(initialMembers);
  const [loading, setLoading] = useState(false);
  const [synced, setSynced] = useState(false);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "user">("all");

  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "user">("user");
  const [createLoading, setCreateLoading] = useState(false);
  const [notice, setNotice] = useState<{ success: boolean; message: string } | null>(null);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<TeamMember | null>(null);
  const [passwordValue, setPasswordValue] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<TeamMember | null>(null);
  const [deleteLoading] = useState(false);

  const createLock = useRef(false);

  const applyMembers = (next: TeamMember[]) => {
    setMembers(next);
    onCountChange(next.length);
  };

  const loadMembers = async (background = false) => {
    if (!background) setLoading(true);
    try {
      const { ok, data } = await fetchJson("/api/admin/users");
      if (!ok || !Array.isArray(data.users)) {
        setNotice({ success: false, message: errorText(data, "Could not refresh the team list.") });
        return;
      }
      const next = data.users.filter((row): row is TeamMember => {
        if (!row || typeof row !== "object") return false;
        const member = row as Partial<TeamMember>;
        return typeof member.id === "string" && typeof member.email === "string" && (member.role === "admin" || member.role === "user");
      });
      applyMembers(next);
      setSynced(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    onCountChange(initialMembers.length);
    void loadMembers(true);
    // Initial directory comes from the server; refresh once for sign-in times.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const adminCount = members.filter((member) => member.role === "admin").length;
  const userCount = members.length - adminCount;

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return members.filter((member) => {
      if (roleFilter !== "all" && member.role !== roleFilter) return false;
      if (!needle) return true;
      return member.email.toLowerCase().includes(needle);
    });
  }, [members, query, roleFilter]);

  const handleCreateUser = async (event: React.FormEvent) => {
    event.preventDefault();
    if (createLock.current) return;
    const issue = passwordIssue(newPassword);
    if (issue) {
      setNotice({ success: false, message: issue });
      return;
    }
    createLock.current = true;
    setCreateLoading(true);
    setNotice(null);
    try {
      const { ok, data } = await fetchJson("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail, password: newPassword, role: newRole }),
      });
      const created = data.user as { id?: string; email?: string; role?: string } | undefined;
      if (ok && created?.id && created.email && (created.role === "admin" || created.role === "user")) {
        setNotice({ success: true, message: `${created.email} can sign in now.` });
        setNewEmail("");
        setNewPassword("");
        setNewRole("user");
        applyMembers([
          {
            id: created.id,
            email: created.email,
            role: created.role,
            created_at: new Date().toISOString(),
            last_sign_in_at: null,
          },
          ...members.filter((member) => member.id !== created.id),
        ]);
      } else {
        setNotice({ success: false, message: errorText(data, "Failed to create the member.") });
      }
    } finally {
      createLock.current = false;
      setCreateLoading(false);
    }
  };

  const handleRole = async (member: TeamMember, role: "admin" | "user") => {
    if (member.role === role || busyId) return;
    if (member.id === adminUserId) {
      setNotice({ success: false, message: "You can't change your own access level." });
      return;
    }
    if (role === "user" && member.role === "admin" && adminCount <= 1) {
      setNotice({ success: false, message: "At least one administrator must remain." });
      return;
    }

    const previous = members;
    setBusyId(member.id);
    setNotice(null);
    applyMembers(members.map((row) => (row.id === member.id ? { ...row, role } : row)));
    try {
      const { ok, data } = await fetchJson("/api/admin/users/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: member.id, role }),
      });
      if (!ok) {
        applyMembers(previous);
        setNotice({ success: false, message: errorText(data, "Could not update access.") });
      } else {
        setNotice({
          success: true,
          message: role === "admin" ? `${member.email} now has full admin access.` : `${member.email} now has user access.`,
        });
      }
    } finally {
      setBusyId(null);
    }
  };

  const resetPasswordModal = () => {
    setPasswordTarget(null);
    setPasswordValue("");
    setPasswordConfirm("");
    setPasswordError(null);
    setShowPassword(false);
  };

  const closePassword = () => {
    if (passwordLoading) return;
    resetPasswordModal();
  };

  const handlePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!passwordTarget || passwordLoading) return;
    const issue = passwordIssue(passwordValue);
    if (issue) {
      setPasswordError(issue);
      return;
    }
    if (passwordValue !== passwordConfirm) {
      setPasswordError("The two passwords don't match.");
      return;
    }
    setPasswordLoading(true);
    setPasswordError(null);
    try {
      const { ok, data } = await fetchJson("/api/admin/users/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: passwordTarget.id, password: passwordValue }),
      });
      if (!ok) {
        setPasswordError(errorText(data, "Could not update the password."));
        return;
      }
      const email = passwordTarget.email;
      resetPasswordModal();
      setNotice({ success: true, message: `Password updated for ${email}. Share it with them directly — nothing is emailed.` });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || deleteLoading) return;
    const target = deleteTarget;
    const previous = members;
    applyMembers(members.filter((row) => row.id !== target.id));
    setDeleteTarget(null);
    setNotice(null);
    const { ok, data } = await fetchJson("/api/admin/users/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: target.id }),
    });
    if (!ok) {
      applyMembers(previous);
      setDeleteTarget(target);
      setNotice({ success: false, message: errorText(data, "Could not remove this member.") });
      return;
    }
    setNotice({ success: true, message: `${target.email} no longer has access.` });
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="grid xl:grid-cols-5 gap-6 sm:gap-8">
        <div className="xl:col-span-3 bg-white rounded-3xl shadow-card border border-dusty-pink/20 p-6 sm:p-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-soft-gold/15 text-deep-ochre rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            <UserPlus className="w-3.5 h-3.5" /> Team Access
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-royal-plum mb-1 font-bona-nova">Add Team Member</h2>
          <p className="text-forest-green/70 text-xs mb-6 font-medium">
            Create an account without disturbing your session. They can sign in immediately.
          </p>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <FieldLabel>Email Address <span className="text-red-500">*</span></FieldLabel>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dusty-pink" />
                <FieldInput type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required placeholder="member@kahanievents.in" className="pl-10" autoComplete="off" />
              </div>
            </div>
            <div>
              <FieldLabel>Temporary Password <span className="text-red-500">*</span></FieldLabel>
              <FieldInput type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={10} maxLength={72} placeholder="10–72 characters, with a letter and a number" autoComplete="new-password" />
            </div>
            <div>
              <FieldLabel>Role</FieldLabel>
              <select value={newRole} onChange={(e) => setNewRole(e.target.value as "admin" | "user")} className="w-full px-4 py-3 bg-cream/50 border border-dusty-pink/30 rounded-2xl text-royal-plum font-semibold focus:outline-none focus:ring-2 focus:ring-soft-gold/40 text-sm cursor-pointer">
                <option value="user">User — View Only</option>
                <option value="admin">Admin — Full Management Access</option>
              </select>
            </div>
            <motion.button type="submit" disabled={createLoading} whileHover={{ scale: createLoading ? 1 : 1.015 }} whileTap={{ scale: createLoading ? 1 : 0.985 }}
              className="w-full py-3.5 bg-plum-gradient text-white font-bold rounded-2xl shadow-glow-plum hover:shadow-lg transition-all text-xs uppercase tracking-wider disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2.5"
            >
              {createLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : <><UserPlus className="w-4 h-4" /> Create Member Account</>}
            </motion.button>
          </form>
        </div>

        <div className="xl:col-span-2 space-y-4">
          <div className="bg-soft-gold/10 border border-soft-gold/30 rounded-3xl p-6 sm:p-8">
            <h3 className="font-bold text-deep-ochre mb-2 flex items-center gap-2 font-bona-nova text-lg">
              <Shield className="w-5 h-5" /> Invitation-Only Security
            </h3>
            <p className="text-sm text-forest-green/80 leading-relaxed font-medium">
              Public sign-ups are disabled. From this panel you can invite someone, reset their password, switch them between admin and user access, or remove them.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Members", value: members.length, icon: Users },
              { label: "Admins", value: adminCount, icon: Crown },
              { label: "Users", value: userCount, icon: Shield },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-white rounded-2xl border border-dusty-pink/20 px-3 py-4 text-center shadow-card">
                <Icon className="w-4 h-4 text-soft-gold mx-auto mb-1.5" />
                <div className="text-xl font-bold text-royal-plum font-bona-nova leading-none">{value}</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-dusty-pink mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {notice && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className={`flex items-start gap-2.5 p-3.5 rounded-2xl border ${notice.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
        >
          {notice.success ? <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />}
          <p className={`text-sm font-bold ${notice.success ? "text-green-700" : "text-red-700"}`}>{notice.message}</p>
        </motion.div>
      )}

      <div className="bg-white rounded-3xl shadow-card border border-dusty-pink/20 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-dusty-pink/15 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-royal-plum font-bona-nova">Team Directory ({visible.length})</h2>
            <p className="text-forest-green/70 text-xs mt-0.5 font-medium">Every account that can open the Kahani Events Vault.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 lg:flex-none">
              <Search className="w-4 h-4 text-soft-gold absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search email..."
                className="w-full lg:w-52 pl-9 pr-4 py-2 bg-cream/60 border border-dusty-pink/30 rounded-xl text-xs font-semibold text-royal-plum focus:outline-none focus:ring-2 focus:ring-soft-gold/40"
              />
            </div>
            <button type="button" onClick={() => void loadMembers()} disabled={loading} title="Refresh" className="p-2 rounded-xl border border-dusty-pink/30 text-royal-plum hover:bg-cream cursor-pointer disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-3 bg-cream/30 border-b border-dusty-pink/10 flex items-center gap-2 overflow-x-auto">
          {([
            ["all", "All"],
            ["admin", "Admins"],
            ["user", "Users"],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setRoleFilter(id)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide cursor-pointer whitespace-nowrap ${
                roleFilter === id ? "bg-plum-gradient text-white shadow-glow-plum" : "bg-white text-royal-plum border border-dusty-pink/25 hover:border-soft-gold"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[760px]">
            <thead>
              <tr className="bg-cream/60 border-b border-dusty-pink/15">
                {["Member", "Access", "Joined", "Last sign-in", "Actions"].map((heading) => (
                  <th key={heading} className={`px-4 sm:px-6 py-3.5 text-xs font-bold text-royal-plum/70 uppercase tracking-wide whitespace-nowrap ${heading === "Actions" ? "text-right" : ""}`}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-cream/70 text-xs font-medium">
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-14 text-center text-forest-green/50 text-sm">
                    {loading ? "Loading team members..." : query || roleFilter !== "all" ? "No members match this filter." : "No team members yet. Invite the first one above."}
                  </td>
                </tr>
              ) : (
                visible.map((member) => {
                  const isSelf = member.id === adminUserId;
                  const lastAdmin = member.role === "admin" && adminCount <= 1;
                  const roleLocked = isSelf || !!busyId;
                  return (
                    <tr key={member.id} className={`transition-colors ${isSelf ? "bg-soft-gold/10" : "hover:bg-cream/40"}`}>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-plum-gradient flex items-center justify-center font-bold text-white text-xs shrink-0">
                            {member.email?.[0]?.toUpperCase() || "?"}
                          </div>
                          <div className="min-w-0">
                            <div className="text-royal-plum font-bold truncate max-w-[220px]">{member.email || "No email"}</div>
                            {isSelf && <div className="text-[10px] font-bold uppercase tracking-wider text-deep-ochre">You</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="inline-flex rounded-xl border border-dusty-pink/30 p-0.5 bg-cream/40">
                          {(["user", "admin"] as const).map((role) => {
                            const active = member.role === role;
                            const disabled = roleLocked || (role === "user" && lastAdmin);
                            return (
                              <button
                                key={role}
                                type="button"
                                disabled={disabled}
                                title={isSelf ? "Your own access stays admin" : lastAdmin && role === "user" ? "At least one administrator must remain" : role === "admin" ? "Full management access" : "User view only"}
                                onClick={() => void handleRole(member, role)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-colors ${
                                  active ? "bg-plum-gradient text-white" : "text-royal-plum/70 hover:text-royal-plum"
                                } disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer`}
                              >
                                {busyId === member.id && active ? <Loader2 className="w-3 h-3 animate-spin" /> : role === "admin" ? "Admin" : "User"}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-royal-plum/70 whitespace-nowrap">{formatWhen(member.created_at) ?? "–"}</td>
                      <td className="px-4 sm:px-6 py-4 text-royal-plum/70 whitespace-nowrap">
                        {synced ? formatWhen(member.last_sign_in_at) ?? "Never signed in" : "–"}
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            title="Change password"
                            onClick={() => {
                              setPasswordTarget(member);
                              setPasswordValue("");
                              setPasswordConfirm("");
                              setPasswordError(null);
                              setShowPassword(false);
                            }}
                            className="p-2 rounded-xl border border-dusty-pink/20 hover:border-soft-gold text-royal-plum hover:bg-white cursor-pointer transition-colors"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title={isSelf ? "You can't remove your own account" : lastAdmin ? "At least one administrator must remain" : "Remove member"}
                            disabled={isSelf || lastAdmin || deleteLoading}
                            onClick={() => setDeleteTarget(member)}
                            className="p-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {passwordTarget && (
          <>
            <motion.div key="pw-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9998] bg-royal-plum/20 backdrop-blur-sm" onClick={closePassword} />
            <motion.div key="pw-modal" initial={{ opacity: 0, scale: 0.92, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: 16 }} transition={{ type: "spring", stiffness: 380, damping: 32 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-labelledby="password-modal-title"
              onClick={(e) => {
                if (e.target === e.currentTarget) closePassword();
              }}
            >
              <form onSubmit={handlePassword} className="w-full max-w-md bg-white rounded-3xl shadow-card-hover border border-dusty-pink/20 overflow-hidden">
                <div className="bg-cream-gradient px-6 pt-6 pb-4 border-b border-dusty-pink/10 flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-soft-gold/15 border border-soft-gold/30 flex items-center justify-center shrink-0">
                      <KeyRound className="w-5 h-5 text-deep-ochre" />
                    </div>
                    <div className="min-w-0">
                      <h2 id="password-modal-title" className="text-royal-plum font-bold text-base font-bona-nova leading-snug">Change password</h2>
                      <p className="text-xs text-dusty-pink font-medium mt-0.5 truncate">{passwordTarget.email}</p>
                    </div>
                  </div>
                  <button type="button" onClick={closePassword} disabled={passwordLoading} className="p-1.5 rounded-xl text-dusty-pink hover:text-royal-plum hover:bg-cream transition-colors disabled:opacity-50 cursor-pointer" aria-label="Close">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="px-6 py-5 space-y-4">
                  <p className="text-xs text-forest-green/80 font-medium leading-relaxed">
                    Set a new password and share it with them yourself. Their next sign-in uses this password.
                    {passwordTarget.id === adminUserId ? " This is your account, so you may need to sign in again after saving." : ""}
                  </p>
                  <div>
                    <FieldLabel>New password</FieldLabel>
                    <div className="relative">
                      <FieldInput type={showPassword ? "text" : "password"} value={passwordValue} onChange={(e) => setPasswordValue(e.target.value)} required minLength={10} maxLength={72} autoComplete="new-password" placeholder="10–72 characters, with a letter and a number" className="pr-11" />
                      <button type="button" onClick={() => setShowPassword((open) => !open)} className="absolute right-3 top-1/2 -translate-y-1/2 text-dusty-pink hover:text-royal-plum cursor-pointer" aria-label={showPassword ? "Hide password" : "Show password"}>
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <FieldLabel>Confirm password</FieldLabel>
                    <FieldInput type={showPassword ? "text" : "password"} value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} required minLength={10} maxLength={72} autoComplete="new-password" placeholder="Repeat the new password" />
                  </div>
                  {passwordError && <p className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{passwordError}</p>}
                </div>
                <div className="px-6 pb-6 flex gap-3">
                  <button type="button" onClick={closePassword} disabled={passwordLoading} className="flex-1 py-3 rounded-2xl border border-dusty-pink/30 text-royal-plum text-sm font-bold hover:bg-cream-dark transition-colors cursor-pointer disabled:opacity-50">Cancel</button>
                  <button type="submit" disabled={passwordLoading} className="flex-1 py-3 bg-plum-gradient text-white font-bold rounded-2xl shadow-glow-plum text-sm cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2">
                    {passwordLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : "Update password"}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTarget && (
          <>
            <motion.div key="del-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9998] bg-royal-plum/20 backdrop-blur-sm" onClick={() => !deleteLoading && setDeleteTarget(null)} />
            <motion.div key="del-modal" initial={{ opacity: 0, scale: 0.92, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: 16 }} transition={{ type: "spring", stiffness: 380, damping: 32 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-labelledby="delete-member-title"
              onClick={(e) => {
                if (e.target === e.currentTarget && !deleteLoading) setDeleteTarget(null);
              }}
            >
              <div className="w-full max-w-sm bg-white rounded-3xl shadow-card-hover border border-dusty-pink/20 overflow-hidden">
                <div className="px-6 pt-6 pb-2">
                  <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mb-3">
                    <Trash2 className="w-5 h-5 text-red-500" />
                  </div>
                  <h2 id="delete-member-title" className="text-royal-plum font-bold text-base font-bona-nova">Remove this member?</h2>
                  <p className="text-sm text-forest-green/80 font-medium mt-2 leading-relaxed">
                    <span className="font-bold text-royal-plum">{deleteTarget.email}</span> will lose access immediately. This cannot be undone.
                  </p>
                  {notice && !notice.success && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold">
                      {notice.message}
                    </div>
                  )}
                </div>
                <div className="px-6 py-5 flex gap-3">
                  <button type="button" onClick={() => setDeleteTarget(null)} disabled={deleteLoading} className="flex-1 py-3 rounded-2xl border border-dusty-pink/30 text-royal-plum text-sm font-bold hover:bg-cream-dark transition-colors cursor-pointer disabled:opacity-50">Keep</button>
                  <button type="button" onClick={() => void handleDelete()} disabled={deleteLoading} className="flex-1 py-3 rounded-2xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2">
                    {deleteLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Removing...</> : "Remove access"}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
