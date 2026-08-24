import React from "react";
import {
  Users,
  UserPlus,
  User,
  Trash2,
  Copy,
  X,
  CheckCircle,
  Crown,
  ShieldCheck,
  Check,
} from "lucide-react";
import { Shop } from "../../types";

interface AdminTeamTabProps {
  selectedShop: Shop;
  user: any;
  teamMembers: any[];
  teamInvites: any[];
  isInviteModalOpen: boolean;
  setIsInviteModalOpen: (open: boolean) => void;
  createdInviteUrl: string | null;
  setCreatedInviteUrl: (url: string | null) => void;
  inviteRole: "STAFF" | "MANAGER";
  setInviteRole: (role: "STAFF" | "MANAGER") => void;
  inviteMaxUses: number;
  setInviteMaxUses: (max: number) => void;
  handleCreateInvite: () => void;
  handleRevokeInvite: (code: string) => void;
  handleRemoveMember: (userId: string) => void;
  requestConfirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText?: string,
    isDangerous?: boolean
  ) => void;
  showToast: (message: string, type?: "success" | "error" | "warning") => void;
}

export function AdminTeamTab({
  selectedShop,
  user,
  teamMembers,
  teamInvites,
  isInviteModalOpen,
  setIsInviteModalOpen,
  createdInviteUrl,
  setCreatedInviteUrl,
  inviteRole,
  setInviteRole,
  inviteMaxUses,
  setInviteMaxUses,
  handleCreateInvite,
  handleRevokeInvite,
  handleRemoveMember,
  requestConfirm,
  showToast,
}: AdminTeamTabProps) {
  return (
    <>
      <div className="max-w-4xl mx-auto bg-app-surface border border-app-border rounded-3xl p-6 sm:p-8 text-app-primary space-y-6 shadow-sm font-sans">
        <div className="border-b border-app-border pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold font-mono flex items-center gap-2 text-app-primary">
              <Users size={18} className="text-app-muted" />
              Команда и доступ: {selectedShop.name}
            </h3>
            <p className="text-xs text-app-muted mt-0.5 font-sans">
              Управление сотрудниками, ролями и ссылками-приглашениями
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsInviteModalOpen(true);
              setCreatedInviteUrl(null);
            }}
            className="px-4 py-2.5 bg-app-card hover:bg-app-hover border border-app-border text-app-primary font-mono font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <UserPlus size={15} className="text-app-muted" />
            <span>Пригласить сотрудника</span>
          </button>
        </div>

        {/* Members List */}
        <div className="space-y-3">
          <h4 className="font-bold text-xs font-mono text-app-muted uppercase tracking-wider">
            Состав команды ({(teamMembers || []).length + (selectedShop?.owner ? 1 : 0)})
          </h4>
          <div className="grid grid-cols-1 gap-2.5">
            {/* Owner Item */}
            {selectedShop?.owner && (
              <div className="p-4 bg-app-card border border-app-border rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-app-surface border border-app-border text-app-primary flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                    <Crown size={18} className="text-amber-500 dark:text-amber-400" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-app-primary flex items-center gap-2">
                      <span>{selectedShop.owner.name || selectedShop.owner.email}</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-app-surface text-app-primary border border-app-border flex items-center gap-1">
                        <Crown size={11} className="text-amber-500 dark:text-amber-400" />
                        Владелец
                      </span>
                    </div>
                    <p className="text-[11px] text-app-muted font-mono">{selectedShop.owner.email}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Staff Members */}
            {(teamMembers || []).map(m => (
              <div key={m.id} className="p-4 bg-app-card border border-app-border rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-app-surface border border-app-border text-app-muted flex items-center justify-center font-bold text-sm font-mono shrink-0">
                    <User size={18} className="text-app-muted" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-app-primary flex items-center gap-2">
                      <span>{m.name || m.email}</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-app-surface text-app-secondary border border-app-border">
                        {m.role === "MANAGER" ? "Менеджер" : "Сотрудник"}
                      </span>
                    </div>
                    <p className="text-[11px] text-app-muted font-mono">{m.email}</p>
                  </div>
                </div>
                {/* Delete button: Owner can delete anyone, Manager can delete only Staff */}
                {user && (
                  (selectedShop?.ownerId === user.id || selectedShop?.currentUserRole === "OWNER") ? (
                    <button
                      type="button"
                      onClick={() =>
                        requestConfirm(
                          "Исключить сотрудника",
                          `Удалить ${m.name || m.email} из команды заведения?`,
                          () => handleRemoveMember(m.userId)
                        )
                      }
                      className="p-2 text-app-muted hover:text-rose-500 hover:bg-app-hover border border-transparent hover:border-app-border rounded-xl transition-all cursor-pointer"
                      title="Исключить из команды"
                    >
                      <Trash2 size={16} />
                    </button>
                  ) : (
                    m.role === "STAFF" && (
                      <button
                        type="button"
                        onClick={() =>
                          requestConfirm(
                            "Исключить сотрудника",
                            `Удалить ${m.name || m.email} из команды заведения?`,
                            () => handleRemoveMember(m.userId)
                          )
                        }
                        className="p-2 text-app-muted hover:text-rose-500 hover:bg-app-hover border border-transparent hover:border-app-border rounded-xl transition-all cursor-pointer"
                        title="Исключить сотрудника"
                      >
                        <Trash2 size={16} />
                      </button>
                    )
                  )
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Invites Section */}
        <div className="space-y-3 pt-6 border-t border-app-border">
          <h4 className="font-bold text-xs font-mono text-app-muted uppercase tracking-wider">
            Активные пригласительные ссылки ({(teamInvites || []).length})
          </h4>
          {(teamInvites || []).length === 0 ? (
            <div className="p-6 bg-app-card border border-app-border rounded-2xl text-center space-y-2">
              <UserPlus size={24} className="text-app-muted mx-auto" />
              <p className="text-xs text-app-muted font-mono">
                Нет созданных приглашений. Сгенерируйте ссылку выше и отправьте сотрудникам для предоставления доступа.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {(teamInvites || []).map(inv => (
                <div key={inv.id} className="p-4 bg-app-card border border-app-border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-app-primary px-2.5 py-0.5 bg-app-surface rounded-lg border border-app-border">
                        {inv.code}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-app-surface border border-app-border text-app-muted">
                        {inv.role === "MANAGER" ? "Менеджер" : "Сотрудник"}
                      </span>
                      <span className="text-[11px] text-app-muted font-mono">
                        Использовано: {inv.usedCount} из {inv.maxUses}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-app-muted truncate max-w-md">
                      {inv.inviteUrl}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(inv.inviteUrl);
                        showToast("Ссылка-приглашение скопирована в буфер!", "success");
                      }}
                      className="px-3.5 py-2 bg-app-surface hover:bg-app-hover border border-app-border rounded-xl text-xs font-mono text-app-primary flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Copy size={13} className="text-app-muted" />
                      <span>Скопировать</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRevokeInvite(inv.code)}
                      className="p-2 text-app-muted hover:text-app-primary hover:bg-app-hover border border-transparent hover:border-app-border rounded-xl transition-all cursor-pointer"
                      title="Отозвать ссылку"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-app-surface border border-app-border rounded-3xl p-6 text-app-primary space-y-5 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-app-border pb-3">
              <div className="flex items-center gap-2">
                <UserPlus size={18} className="text-app-muted" />
                <h3 className="text-sm font-semibold tracking-tight uppercase font-mono">Пригласить сотрудника</h3>
              </div>
              <button onClick={() => setIsInviteModalOpen(false)} className="text-app-muted hover:text-app-primary p-1 rounded-lg cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {!createdInviteUrl ? (
              <div className="space-y-4 font-mono text-xs">
                <div>
                  <label className="block text-app-muted mb-2">Роль для приглашаемого</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setInviteRole("STAFF")}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        inviteRole === "STAFF"
                          ? "bg-app-accent text-app-accent-fg border-transparent font-semibold shadow-xs"
                          : "bg-app-card border-app-border text-app-secondary hover:text-app-primary hover:bg-app-hover"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs">Сотрудник</span>
                        {inviteRole === "STAFF" && <Check size={14} />}
                      </div>
                      <p className="text-[10px] opacity-80 leading-tight">Просмотр и обработка заказов</p>
                    </button>

                    <button
                      type="button"
                      disabled={selectedShop?.ownerId !== user?.id && selectedShop?.currentUserRole !== "OWNER"}
                      onClick={() => {
                        if (selectedShop?.ownerId === user?.id || selectedShop?.currentUserRole === "OWNER") {
                          setInviteRole("MANAGER");
                        } else {
                          showToast("Назначать менеджеров может только владелец заведения.", "warning");
                        }
                      }}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        selectedShop?.ownerId !== user?.id && selectedShop?.currentUserRole !== "OWNER"
                          ? "bg-app-card/40 border-app-border/40 text-app-muted cursor-not-allowed opacity-60"
                          : inviteRole === "MANAGER"
                          ? "bg-app-accent text-app-accent-fg border-transparent font-semibold shadow-xs cursor-pointer"
                          : "bg-app-card border-app-border text-app-secondary hover:text-app-primary hover:bg-app-hover cursor-pointer"
                      }`}
                      title={selectedShop?.ownerId !== user?.id && selectedShop?.currentUserRole !== "OWNER" ? "Только владелец заведения может назначать менеджеров" : ""}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs">Менеджер</span>
                        {inviteRole === "MANAGER" && <Check size={14} />}
                      </div>
                      <p className="text-[10px] opacity-80 leading-tight">
                        {selectedShop?.ownerId !== user?.id && selectedShop?.currentUserRole !== "OWNER"
                          ? "Только для владельца"
                          : "Полное управление заведением"}
                      </p>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-app-muted mb-1.5">Лимит активаций ссылки</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={inviteMaxUses}
                    onChange={e => setInviteMaxUses(Number(e.target.value))}
                    className="w-full bg-app-card border border-app-border rounded-xl p-2.5 text-app-primary focus:outline-none focus:border-app-accent"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCreateInvite}
                  className="w-full py-3 bg-app-card hover:bg-app-hover border border-app-border text-app-primary font-bold rounded-xl shadow-sm transition-all cursor-pointer uppercase tracking-wider"
                >
                  Сгенерировать ссылку
                </button>
              </div>
            ) : (
              <div className="space-y-4 font-mono text-xs text-center">
                <div className="p-4 bg-app-card border border-app-border rounded-2xl space-y-2">
                  <CheckCircle size={28} className="text-app-primary mx-auto" />
                  <p className="font-bold text-sm text-app-primary">Ссылка создана!</p>
                  <p className="text-app-muted text-[11px]">
                    Отправьте эту ссылку сотруднику. Перейдя по ней, он сможет войти или зарегистрироваться и автоматически получит доступ к заведению.
                  </p>
                </div>
                <div className="p-3 bg-app-surface border border-app-border rounded-xl break-all text-[11px] text-app-primary font-mono select-all">
                  {createdInviteUrl}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(createdInviteUrl);
                      showToast("Ссылка скопирована в буфер!", "success");
                    }}
                    className="flex-1 py-2.5 bg-app-surface hover:bg-app-hover border border-app-border text-app-primary font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Copy size={14} className="text-app-muted" />
                    <span>Скопировать</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsInviteModalOpen(false);
                      setCreatedInviteUrl(null);
                    }}
                    className="py-2.5 px-4 bg-app-card hover:bg-app-hover border border-app-border text-app-primary font-bold rounded-xl cursor-pointer transition-all"
                  >
                    Закрыть
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
