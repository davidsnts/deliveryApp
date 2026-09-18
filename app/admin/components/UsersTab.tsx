"use client";

import React, { useState, useEffect } from "react";
import { User, KeyRound, Trash2, Plus, Loader2, ShieldCheck, UserPlus } from "lucide-react";
import { fetchAdminUsers, createAdminUser, updateAdminUser, deleteAdminUser } from "@/app/lib/api";

interface AdminUser {
  id: string;
  username: string;
  name: string;
  role: string;
  created_at: string;
}

export function UsersTab({ triggerToast }: { triggerToast: (msg: string) => void }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estados dos Formulários
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [selectedUserForPass, setSelectedUserForPass] = useState<AdminUser | null>(null);
  const [editPasswordValue, setEditPasswordValue] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const data = await fetchAdminUsers();
      setUsers(data);
    } catch (err: any) {
      triggerToast(err.message || "Erro ao carregar lista de usuários.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await createAdminUser({ username: newUsername, password: newPassword, name: newName });
      triggerToast("Usuário cadastrado com sucesso!");
      setShowCreateModal(false);
      setNewUsername("");
      setNewName("");
      setNewPassword("");
      await loadUsers();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForPass) return;
    try {
      setIsSubmitting(true);
      await updateAdminUser({ id: selectedUserForPass.id, newPassword: editPasswordValue });
      triggerToast(`Senha do usuário ${selectedUserForPass.username} alterada!`);
      setSelectedUserForPass(null);
      setEditPasswordValue("");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, username: string) => {
    if (confirm(`Tem certeza que deseja excluir o acesso de "${username}"?`)) {
      try {
        await deleteAdminUser(id);
        triggerToast(`Usuário ${username} removido.`);
        await loadUsers();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-orange-500" />
            Usuários do Painel Admin
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Gerencie quem tem acesso ao sistema de pedidos e altere credenciais de acesso.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Novo Usuário</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {users.map((u) => (
            <div
              key={u.id}
              className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-orange-400">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">{u.name}</h4>
                    <p className="text-xs text-slate-400 font-mono">@{u.username}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-md">
                  {u.role || "Admin"}
                </span>
              </div>

              <div className="pt-3 border-t border-slate-850 flex items-center justify-end gap-2">
                <button
                  onClick={() => setSelectedUserForPass(u)}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  <span>Alterar Senha</span>
                </button>

                <button
                  onClick={() => handleDelete(u.id, u.username)}
                  className="p-1.5 bg-red-950/30 hover:bg-red-900/50 text-red-400 border border-red-900/40 rounded-xl text-xs transition-colors cursor-pointer"
                  title="Excluir Usuário"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Novo Usuário */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <form
            onSubmit={handleCreateUser}
            className="bg-slate-950 border border-slate-800 w-full max-w-md rounded-2xl p-6 space-y-4"
          >
            <h3 className="font-bold text-white text-base">Cadastrar Novo Usuário</h3>

            <div>
              <label className="block text-xs text-slate-300 mb-1">Nome Completo</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: João Silva"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">Usuário (Login)</label>
              <input
                type="text"
                required
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Ex: joao.admin"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">Senha Inicial</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-2 text-xs font-semibold text-slate-400 bg-slate-900 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2 text-xs font-bold text-white bg-orange-600 rounded-xl flex justify-center items-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cadastrar"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Editar Senha */}
      {selectedUserForPass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <form
            onSubmit={handleUpdatePassword}
            className="bg-slate-950 border border-slate-800 w-full max-w-md rounded-2xl p-6 space-y-4"
          >
            <h3 className="font-bold text-white text-base">
              Alterar Senha de @{selectedUserForPass.username}
            </h3>

            <div>
              <label className="block text-xs text-slate-300 mb-1">Nova Senha</label>
              <input
                type="password"
                required
                value={editPasswordValue}
                onChange={(e) => setEditPasswordValue(e.target.value)}
                placeholder="Digite a nova senha..."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedUserForPass(null)}
                className="flex-1 py-2 text-xs font-semibold text-slate-400 bg-slate-900 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2 text-xs font-bold text-white bg-amber-600 rounded-xl flex justify-center items-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Atualizar Senha"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}