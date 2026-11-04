"use client";

import React from "react";
import Image from "next/image";
import {
  Shield,
  Sparkles,
  ChevronRight,
  PlusCircle,
  Layers,
  FolderPlus,
  UserPlus,
  LogOut,
} from "lucide-react";

interface AdminSidebarProps {
  adminEmail: string;
  activeTab: "add-theme" | "all-themes" | "categories" | "users" | "logs";
  setActiveTab: (tab: "add-theme" | "all-themes" | "categories" | "users" | "logs") => void;
  themesCount: number;
  categoriesCount: number;
  membersCount: number;
  onSignOutClick: () => void;
  onNavClick?: () => void;
}

export function AdminSidebar({
  adminEmail,
  activeTab,
  setActiveTab,
  themesCount,
  categoriesCount,
  membersCount,
  onSignOutClick,
  onNavClick,
}: AdminSidebarProps) {
  const navItems = [
    { id: "add-theme" as const, label: "Add New Theme", icon: PlusCircle, badge: "Create" },
    { id: "all-themes" as const, label: "Showroom Themes", icon: Layers, badge: `${themesCount}` },
    { id: "categories" as const, label: "Theme Categories", icon: FolderPlus, badge: `${categoriesCount}` },
    { id: "users" as const, label: "Team Members", icon: UserPlus, badge: `${membersCount}` },
    { id: "logs" as const, label: "Audit & Access Logs", icon: Shield, badge: "Live" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 border-b border-dusty-pink/15 shrink-0">
        <a href="/" className="flex items-center gap-3 group">
          <div className="relative w-10 h-10 shrink-0 flex items-center justify-center rounded-2xl bg-white border border-dusty-pink/20 shadow-xs group-hover:border-soft-gold/50 transition-colors p-1.5">
            <Image
              src="/logo.png"
              alt="Kahani Logo"
              width={40}
              height={32}
              className="object-contain w-auto h-auto max-h-full max-w-full"
              priority
            />
          </div>
          <div>
            <h2 className="font-bold text-royal-plum text-base tracking-tight font-bona-nova leading-none">
              Kahani Vault
            </h2>
            <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-soft-gold/15 text-deep-ochre text-[10px] font-bold tracking-widest uppercase">
              <Shield className="w-2.5 h-2.5" /> Enterprise Admin
            </div>
          </div>
        </a>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        <a
          href="/"
          className="flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold text-forest-green hover:text-royal-plum hover:bg-cream transition-all group mb-2 border border-dashed border-dusty-pink/30 hover:border-soft-gold"
        >
          <div className="flex items-center gap-3">
            <Sparkles className="w-4 h-4 text-royal-plum" />
            <span>Visit Client Showroom</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-dusty-pink group-hover:translate-x-0.5 transition-transform" />
        </a>

        <div className="px-3 pt-2 pb-1 text-[11px] font-bold text-dusty-pink uppercase tracking-widest">
          Management Studio
        </div>

        {navItems.map(({ id, label, icon: Icon, badge }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => {
                setActiveTab(id);
                onNavClick?.();
              }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                active
                  ? "bg-plum-gradient text-white shadow-glow-plum"
                  : "text-royal-plum/80 hover:bg-cream hover:text-royal-plum"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${active ? "text-white" : "text-royal-plum"}`} />
                <span>{label}</span>
              </div>
              {badge && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    active
                      ? "bg-white/20 text-white"
                      : badge === "Live"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-cream-dark text-royal-plum"
                  }`}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom user card */}
      <div className="p-3 shrink-0 border-t border-dusty-pink/10">
        <div className="flex items-center justify-between p-3 rounded-2xl bg-cream/70 border border-dusty-pink/20">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-plum-gradient text-white flex items-center justify-center font-bold text-xs shrink-0">
              {adminEmail[0]?.toUpperCase()}
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-royal-plum truncate">{adminEmail}</p>
              <p className="text-[10px] text-deep-ochre font-semibold uppercase tracking-wider">
                Super Administrator
              </p>
            </div>
          </div>
          <button
            onClick={onSignOutClick}
            title="Sign Out"
            className="p-2 rounded-xl text-dusty-pink hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
