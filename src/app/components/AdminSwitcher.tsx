"use client";

import { useEffect, useState } from "react";
import { DBService, Profile } from "@/services/db";

export default function AdminSwitcher() {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState("");

  useEffect(() => {
    // Check initial user and path
    const user = DBService.getCurrentUser();
    setCurrentUser(user);
    if (typeof window !== "undefined") {
      setCurrentPath(window.location.pathname);
    }

    // Set up a small interval to check for user updates (since localStorage changes are not always events on the same tab)
    const interval = setInterval(() => {
      const updatedUser = DBService.getCurrentUser();
      if (JSON.stringify(updatedUser) !== JSON.stringify(currentUser)) {
        setCurrentUser(updatedUser);
      }
      if (typeof window !== "undefined" && window.location.pathname !== currentPath) {
        setCurrentPath(window.location.pathname);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentUser, currentPath]);

  // Hide if not logged in or not admin/gestao
  if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "gestao")) {
    return null;
  }

  const menuItems = [
    { label: "🏫 Secretaria (Admin)", path: "/admin" },
    { label: "🍔 Terminal da Cantina", path: "/cantina" },
    { label: "🎓 Carteirinha Aluno", path: "/aluno" },
    { label: "💼 Carteirinha Professor", path: "/professor" },
    { label: "👨‍👩‍👦 Portal da Família", path: "/familia" },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans print:hidden">
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-14 w-14 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 border border-red-700 cursor-pointer relative group"
        title="Painel de Navegação de Gestão"
      >
        <span className="text-xl transition-transform duration-300">
          {isOpen ? "✕" : "⚙️"}
        </span>
        
        {/* Badge */}
        <span className="absolute -top-1.5 -right-1.5 bg-slate-900 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-slate-700 leading-none">
          {currentUser.role}
        </span>
      </button>

      {/* Navigation Card */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-64 bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-3xl p-4 shadow-2xl space-y-3 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="border-b border-slate-100 pb-2.5">
            <h4 className="font-extrabold text-xs text-slate-800 leading-none">Painel de Acesso Rápido</h4>
            <p className="text-[9px] text-slate-400 mt-1 leading-normal">Seu perfil ({currentUser.role}) possui permissão de acesso total ao sistema.</p>
          </div>

          <nav className="space-y-1">
            {menuItems.map((item) => {
              const isActive = currentPath === item.path;
              return (
                <a
                  key={item.path}
                  href={item.path}
                  className={`block text-xxs font-bold px-3 py-2 rounded-xl transition-all duration-150 ${
                    isActive
                      ? "bg-red-50 text-red-650 border border-red-100/50"
                      : "text-slate-650 hover:bg-slate-50 hover:text-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{item.label}</span>
                    {isActive && <span className="h-1.5 w-1.5 rounded-full bg-red-600"></span>}
                  </div>
                </a>
              );
            })}
          </nav>

          <div className="border-t border-slate-100 pt-2.5 flex justify-between items-center text-[10px] text-slate-400">
            <span>Logado como: <strong>{currentUser.nome}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
}
