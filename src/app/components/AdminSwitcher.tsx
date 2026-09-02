"use client";

import { useEffect, useState } from "react";
import { DBService, Profile } from "@/services/db";
import {
  SlidersHorizontal,
  X,
  School,
  Store,
  GraduationCap,
  Briefcase,
  Users,
  ShieldCheck,
  ChevronRight
} from "lucide-react";

export default function AdminSwitcher() {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState("");

  useEffect(() => {
    const user = DBService.getCurrentUser();
    setCurrentUser(user);
    if (typeof window !== "undefined") {
      setCurrentPath(window.location.pathname);
    }

    const interval = setInterval(() => {
      const updatedUser = DBService.getCurrentUser();
      setCurrentUser((prevUser) => {
        if (JSON.stringify(updatedUser) !== JSON.stringify(prevUser)) {
          return updatedUser;
        }
        return prevUser;
      });

      if (typeof window !== "undefined") {
        setCurrentPath((prevPath) => {
          if (window.location.pathname !== prevPath) {
            return window.location.pathname;
          }
          return prevPath;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!currentUser || (!currentUser.is_master && currentUser.role !== "admin" && currentUser.role !== "gestao")) {
    return null;
  }

  const menuItems = [
    { label: "Secretaria Geral", path: "/admin", icon: School },
    { label: "Terminal da Cantina", path: "/cantina", icon: Store },
    { label: "Carteirinha do Aluno", path: "/aluno", icon: GraduationCap },
    { label: "Carteirinha Servidor", path: "/professor", icon: Briefcase },
    { label: "Portal da Família", path: "/familia", icon: Users },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans print:hidden">
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-14 w-14 rounded-full bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 border border-slate-700 cursor-pointer relative group"
        title="Painel de Navegação Rápida de Gestão"
      >
        <span className="transition-transform duration-300">
          {isOpen ? <X className="h-5 w-5" /> : <SlidersHorizontal className="h-5 w-5" />}
        </span>

        {/* Badge */}
        <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border border-white shadow-xs leading-none">
          {currentUser.is_master ? "MASTER" : currentUser.role}
        </span>
      </button>

      {/* Navigation Card */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-72 bg-white/95 backdrop-blur-md border border-slate-200 rounded-3xl p-5 shadow-2xl space-y-3 animate-fade-in">
          <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shrink-0">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <h4 className="font-extrabold text-xs text-slate-900 leading-tight">
                Acesso de Gestão
              </h4>
              <p className="text-[10px] text-slate-400 font-medium">Navegue entre os painéis do sistema</p>
            </div>
          </div>

          <nav className="space-y-1">
            {menuItems.map((item) => {
              const isActive = currentPath === item.path;
              const Icon = item.icon;
              return (
                <a
                  key={item.path}
                  href={item.path}
                  className={`flex items-center justify-between text-xs font-semibold px-3 py-2.5 rounded-2xl transition-all duration-150 ${
                    isActive
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                    <span>{item.label}</span>
                  </div>
                  {isActive ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                  )}
                </a>
              );
            })}
          </nav>

          <div className="border-t border-slate-100 pt-2.5 flex justify-between items-center text-[10px] text-slate-400 font-medium">
            <span>Operando como:</span>
            <strong className="text-slate-700 font-bold truncate max-w-[130px]">{currentUser.nome}</strong>
          </div>
        </div>
      )}
    </div>
  );
}
