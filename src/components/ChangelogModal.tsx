import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Sparkles,
  History,
  Tag,
  CheckCircle,
  Wrench,
  ShieldCheck,
  Zap,
  ExternalLink,
  ChevronRight,
  Search,
  Calendar,
} from "lucide-react";
import { CHANGELOG_DATA, ChangelogItem } from "../data/changelogData";

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangelogModal: React.FC<ChangelogModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [selectedVersion, setSelectedVersion] = useState<string>(CHANGELOG_DATA[0].version);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Current active release
  const activeRelease = useMemo(() => {
    return (
      CHANGELOG_DATA.find((item) => item.version === selectedVersion) ||
      CHANGELOG_DATA[0]
    );
  }, [selectedVersion]);

  // Filtered releases based on search
  const filteredReleases = useMemo(() => {
    if (!searchQuery.trim()) return CHANGELOG_DATA;
    const q = searchQuery.toLowerCase().trim();
    return CHANGELOG_DATA.filter(
      (item) =>
        item.version.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q)) ||
        item.features.some(
          (f) =>
            f.title.toLowerCase().includes(q) ||
            f.description.toLowerCase().includes(q)
        )
    );
  }, [searchQuery]);

  if (!isOpen) return null;

  const getTypeBadge = (type: "new" | "improvement" | "fix" | "security") => {
    switch (type) {
      case "new":
        return {
          label: "Новое",
          color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
          icon: <Sparkles size={13} className="text-emerald-500" />,
        };
      case "improvement":
        return {
          label: "Улучшение",
          color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
          icon: <Zap size={13} className="text-blue-500" />,
        };
      case "fix":
        return {
          label: "Исправление",
          color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
          icon: <Wrench size={13} className="text-purple-500" />,
        };
      case "security":
        return {
          label: "Безопасность",
          color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
          icon: <ShieldCheck size={13} className="text-amber-500" />,
        };
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="w-full max-w-4xl bg-app-surface border border-app-border rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-app-primary"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-app-border flex items-center justify-between gap-4 bg-app-card/60 backdrop-blur-sm">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-500 flex items-center justify-center border border-emerald-500/20 shrink-0">
              <History size={19} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold font-mono tracking-tight truncate">
                  История обновлений (Changelog)
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full shrink-0">
                  {CHANGELOG_DATA[0].version}
                </span>
              </div>
              <p className="text-xs text-app-muted font-sans truncate">
                Что нового появилось на платформе TMA Builder
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href="https://github.com/blesswrld/tma-builder/releases"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-app-surface hover:bg-app-hover border border-app-border text-app-muted hover:text-app-primary rounded-xl text-xs font-mono transition-colors"
            >
              <span>GitHub Releases</span>
              <ExternalLink size={11} className="opacity-60" />
            </a>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-app-muted hover:text-app-primary hover:bg-app-hover rounded-xl transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Search & Timeline bar */}
        <div className="p-4 border-b border-app-border bg-app-card/30 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72 flex items-center">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted pointer-events-none shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по версиям и фичам..."
              className="w-full pl-8 pr-4 py-2 bg-app-surface border border-app-border rounded-xl text-xs font-mono text-app-primary placeholder:text-app-muted focus:outline-none focus:border-emerald-500/60 transition-colors shadow-2xs"
            />
          </div>

          {/* Versions Chips Horizontal Scroll */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto custom-scrollbar pb-1 sm:pb-0">
            {filteredReleases.map((rel) => {
              const isActive = rel.version === selectedVersion;
              return (
                <button
                  key={rel.version}
                  type="button"
                  onClick={() => setSelectedVersion(rel.version)}
                  className={`px-3 py-1.5 rounded-xl font-mono text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer select-none ${
                    isActive
                      ? "bg-app-primary text-app-surface shadow-2xs"
                      : "bg-app-surface hover:bg-app-hover border border-app-border text-app-secondary"
                  }`}
                >
                  <span>{rel.version}</span>
                  {rel.isLatest && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-6 space-y-6">
          {/* Active Release Overview Header */}
          <div className="p-5 bg-gradient-to-br from-app-card to-app-surface border border-app-border rounded-3xl space-y-3 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="text-xl font-bold font-mono text-app-primary">
                  {activeRelease.version}
                </span>
                {activeRelease.badge && (
                  <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-mono font-bold rounded-lg">
                    {activeRelease.badge}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-xs font-mono text-app-muted">
                <Calendar size={13} />
                <span>{activeRelease.date}</span>
              </div>
            </div>

            <h4 className="font-mono font-bold text-sm text-app-primary">
              {activeRelease.title}
            </h4>

            <p className="text-xs text-app-muted font-sans leading-relaxed">
              {activeRelease.summary}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-1.5">
              {activeRelease.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-0.5 bg-app-surface border border-app-border text-app-secondary text-[11px] font-mono rounded-lg"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          {/* Feature List */}
          <div className="space-y-3.5">
            <h5 className="text-xs font-bold font-mono uppercase tracking-wider text-app-muted">
              Список изменений и улучшений
            </h5>

            <div className="grid grid-cols-1 gap-3">
              {activeRelease.features.map((feat, idx) => {
                const badge = getTypeBadge(feat.type);
                return (
                  <div
                    key={idx}
                    className="p-4 bg-app-card border border-app-border rounded-2xl space-y-2 hover:border-app-primary/30 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-md border flex items-center gap-1 shrink-0 ${badge.color}`}
                        >
                          {badge.icon}
                          <span>{badge.label}</span>
                        </span>
                        <h6 className="font-mono font-bold text-xs text-app-primary truncate">
                          {feat.title}
                        </h6>
                      </div>
                    </div>

                    <p className="text-xs text-app-muted font-sans leading-relaxed pl-1">
                      {feat.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-app-border bg-app-card/40 flex items-center justify-between text-xs font-mono text-app-muted">
          <span>TMA Builder Platform • Обновления выходят регулярно</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-app-surface hover:bg-app-hover border border-app-border text-app-primary rounded-xl transition-colors cursor-pointer"
          >
            Понятно
          </button>
        </div>
      </motion.div>
    </div>
  );
};
