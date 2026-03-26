"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { GlassPanel } from "@/components/ui/GlassPanel";
import {
  fetchAdminUsers,
  updateAdminUser,
  deleteAdminUser,
  createAdminUser,
  type AdminUser,
} from "@/lib/api";
import { cn } from "@/lib/cn";
import { useToast } from "@/hooks/useToast";
import { HugeiconsIcon } from "@hugeicons/react";
import { UserAdd01Icon, Delete01Icon, PencilEdit01Icon } from "@hugeicons/core-free-icons";

const ROLE_LABELS: Record<string, string> = {
  applicant: "Студент",
  employer: "Работодатель",
  curator: "Куратор",
};

const ROLE_COLORS: Record<string, string> = {
  applicant: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  employer: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  curator: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
};

export default function AdminUsersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", displayName: "", password: "", role: "applicant" });
  const [saving, setSaving] = useState(false);

  const limit = 20;

  useEffect(() => {
    if (!user || user.role !== "curator") {
      router.replace("/dashboard");
    }
  }, [user, router]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAdminUsers({ page, limit, role: roleFilter || undefined, q: search || undefined });
      setUsers(data.items);
      setTotal(data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, roleFilter, search]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleDelete = async (uid: string) => {
    if (!confirm("Удалить пользователя? Это действие необратимо.")) return;
    try {
      await deleteAdminUser(uid);
      showToast("Пользователь удалён", "success");
      loadUsers();
    } catch {
      showToast("Ошибка удаления", "error");
    }
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      await updateAdminUser(editUser.id, {
        displayName: editUser.displayName,
        email: editUser.email,
        role: editUser.role,
      });
      showToast("Данные обновлены", "success");
      setEditUser(null);
      loadUsers();
    } catch {
      showToast("Ошибка обновления", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!newUser.email || !newUser.password) {
      showToast("Заполните email и пароль", "error");
      return;
    }
    setSaving(true);
    try {
      await createAdminUser(newUser);
      showToast("Пользователь создан", "success");
      setCreateOpen(false);
      setNewUser({ email: "", displayName: "", password: "", role: "applicant" });
      loadUsers();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка создания", "error");
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Управление пользователями</h1>
          <p className="mt-1 text-[var(--text-secondary)]">Всего: {total}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,var(--brand-magenta),var(--brand-orange))] px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:opacity-90"
          >
            <HugeiconsIcon icon={UserAdd01Icon} size={16} />
            Создать
          </button>
          <Link
            href="/admin/dashboard"
            className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
          >
            ← Дашборд
          </Link>
        </div>
      </div>

      <GlassPanel className="flex flex-wrap items-center gap-3 p-4">
        <input
          type="text"
          placeholder="Поиск по имени или email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="glass-input flex-1 min-w-[200px] px-4 py-2 text-sm"
        />
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="glass-select px-4 py-2 text-sm"
        >
          <option value="">Все роли</option>
          <option value="applicant">Студенты</option>
          <option value="employer">Работодатели</option>
          <option value="curator">Кураторы</option>
        </select>
      </GlassPanel>

      {loading ? (
        <GlassPanel className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--brand-cyan)] border-t-transparent" />
        </GlassPanel>
      ) : users.length === 0 ? (
        <GlassPanel className="flex h-64 items-center justify-center text-[var(--text-secondary)]">
          Пользователи не найдены
        </GlassPanel>
      ) : (
        <>
          <div className="space-y-2">
            {users.map((u, idx) => (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
              >
                <GlassPanel className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[var(--text-primary)] truncate">{u.displayName || u.email}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{u.email}</p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {new Date(u.createdAt).toLocaleDateString("ru-RU")}
                    </p>
                  </div>
                  <span className={cn("rounded-full px-3 py-1 text-xs font-medium", ROLE_COLORS[u.role] || "bg-gray-500/15 text-gray-700 dark:text-gray-300")}>
                    {ROLE_LABELS[u.role] || u.role}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setEditUser({ ...u })}
                      className="rounded-lg bg-[var(--glass-bg-strong)] p-2 text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
                      title="Редактировать"
                    >
                      <HugeiconsIcon icon={PencilEdit01Icon} size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="rounded-lg bg-red-500/10 p-2 text-red-400 transition hover:bg-red-500/20"
                      title="Удалить"
                    >
                      <HugeiconsIcon icon={Delete01Icon} size={16} />
                    </button>
                  </div>
                </GlassPanel>
              </motion.div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="rounded-lg bg-[var(--glass-bg-strong)] px-3 py-1.5 text-sm text-[var(--text-secondary)] disabled:opacity-40"
              >
                ←
              </button>
              <span className="text-sm text-[var(--text-secondary)]">
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="rounded-lg bg-[var(--glass-bg-strong)] px-3 py-1.5 text-sm text-[var(--text-secondary)] disabled:opacity-40"
              >
                →
              </button>
            </div>
          )}
        </>
      )}

      <AnimatePresence>
        {editUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => setEditUser(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md space-y-4 rounded-2xl border border-[var(--glass-border)] bg-[var(--page-bg)] p-6 shadow-2xl"
            >
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Редактирование пользователя</h2>
              <div>
                <label className="text-sm text-[var(--text-secondary)]">Имя</label>
                <input
                  className="glass-input mt-1 w-full px-4 py-2 text-sm"
                  value={editUser.displayName}
                  onChange={(e) => setEditUser(u => u ? { ...u, displayName: e.target.value } : null)}
                />
              </div>
              <div>
                <label className="text-sm text-[var(--text-secondary)]">Email</label>
                <input
                  className="glass-input mt-1 w-full px-4 py-2 text-sm"
                  value={editUser.email}
                  onChange={(e) => setEditUser(u => u ? { ...u, email: e.target.value } : null)}
                />
              </div>
              <div>
                <label className="text-sm text-[var(--text-secondary)]">Роль</label>
                <select
                  className="glass-select mt-1 w-full px-4 py-2 text-sm"
                  value={editUser.role}
                  onChange={(e) => setEditUser(u => u ? { ...u, role: e.target.value } : null)}
                >
                  <option value="applicant">Студент</option>
                  <option value="employer">Работодатель</option>
                  <option value="curator">Куратор</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="flex-1 rounded-xl bg-[linear-gradient(135deg,var(--brand-magenta),var(--brand-orange))] py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {saving ? "..." : "Сохранить"}
                </button>
                <button
                  onClick={() => setEditUser(null)}
                  className="rounded-xl border border-[var(--glass-border)] px-4 py-2.5 text-sm text-[var(--text-primary)]"
                >
                  Отмена
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {createOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => setCreateOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md space-y-4 rounded-2xl border border-[var(--glass-border)] bg-[var(--page-bg)] p-6 shadow-2xl"
            >
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Создание пользователя</h2>
              <div>
                <label className="text-sm text-[var(--text-secondary)]">Email *</label>
                <input
                  className="glass-input mt-1 w-full px-4 py-2 text-sm"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser(u => ({ ...u, email: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm text-[var(--text-secondary)]">Имя</label>
                <input
                  className="glass-input mt-1 w-full px-4 py-2 text-sm"
                  value={newUser.displayName}
                  onChange={(e) => setNewUser(u => ({ ...u, displayName: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm text-[var(--text-secondary)]">Пароль *</label>
                <input
                  className="glass-input mt-1 w-full px-4 py-2 text-sm"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser(u => ({ ...u, password: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm text-[var(--text-secondary)]">Роль</label>
                <select
                  className="glass-select mt-1 w-full px-4 py-2 text-sm"
                  value={newUser.role}
                  onChange={(e) => setNewUser(u => ({ ...u, role: e.target.value }))}
                >
                  <option value="applicant">Студент</option>
                  <option value="employer">Работодатель</option>
                  <option value="curator">Куратор</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreate}
                  disabled={saving}
                  className="flex-1 rounded-xl bg-[linear-gradient(135deg,var(--brand-magenta),var(--brand-orange))] py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {saving ? "..." : "Создать"}
                </button>
                <button
                  onClick={() => setCreateOpen(false)}
                  className="rounded-xl border border-[var(--glass-border)] px-4 py-2.5 text-sm text-[var(--text-primary)]"
                >
                  Отмена
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
