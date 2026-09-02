"use client";

import { useEffect, useState, useRef } from "react";
import { DBService, Profile, Aluno } from "@/services/db";
import {
  Bell,
  LogOut,
  Settings,
  ChevronDown,
  Sparkles,
  LayoutDashboard,
  Store,
  GraduationCap,
  Briefcase,
  Users
} from "lucide-react";

export default function Header() {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [alunoInfo, setAlunoInfo] = useState<Aluno | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const user = DBService.getCurrentUser();
    setCurrentUser(user);

    if (typeof window !== "undefined") {
      setCurrentPath(window.location.pathname);
    }

    if (user && (user.role === "aluno" || user.role === "professor" || user.role === "gestao")) {
      DBService.getAlunos().then((alunos) => {
        const info = alunos.find((a) => a.id === user.aluno_id);
        if (info) {
          setAlunoInfo(info);
        }
      }).catch(err => console.error("Erro ao carregar dados adicionais do usuário:", err));
    }

    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    DBService.logout();
    window.location.href = "/";
  };

  if (!currentUser) return null;

  const roleLabels: Record<string, string> = {
    admin: "Administrador(a)",
    gestao: "Gestor(a)",
    professor: "Professor(a) / Servidor",
    aluno: "Estudante",
    familia: "Responsável",
    cantina: "Cantina",
  };

  const getNavLinks = () => {
    if (currentUser.is_master || currentUser.role === "admin" || currentUser.role === "gestao") {
      return [
        { label: "Início", path: "/admin", icon: LayoutDashboard },
        { label: "Terminal Cantina", path: "/cantina", icon: Store },
        { label: "Carteirinha Aluno", path: "/aluno", icon: GraduationCap },
        { label: "Carteirinha Servidor", path: "/professor", icon: Briefcase },
        { label: "Portal Família", path: "/familia", icon: Users },
      ];
    }

    switch (currentUser.role) {
      case "aluno":
        return [{ label: "Minha Carteirinha", path: "/aluno", icon: GraduationCap }];
      case "professor":
        return [{ label: "Minha Carteirinha", path: "/professor", icon: Briefcase }];
      case "familia":
        return [{ label: "Portal da Família", path: "/familia", icon: Users }];
      case "cantina":
        return [{ label: "Terminal da Cantina", path: "/cantina", icon: Store }];
      default:
        return [];
    }
  };

  const navLinks = getNavLinks();
  const userAvatar = alunoInfo?.foto || null;
  const userInitials = currentUser.nome ? currentUser.nome.charAt(0).toUpperCase() : "U";

  return (
    <header className="bg-[#FFFFFF]/95 backdrop-blur-md border-b border-black/5 sticky top-0 z-40 font-sans print:hidden transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">

        {/* Logo and Brand */}
        <div className="flex items-center gap-8">
          <a href="/" className="flex items-center gap-3.5 group transition-all">
            <div className="h-11 w-11 bg-red-600 group-hover:bg-red-700 rounded-2xl flex items-center justify-center text-white font-black text-xs shadow-xs transition-colors shrink-0 tracking-wider">
              EEAC
            </div>
            <div className="leading-tight text-left">
              <span className="font-extrabold text-base tracking-tight text-[#101828] block">
                Cantina Digital
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">
                E.E. Antônio Caio
              </span>
            </div>
          </a>

          {/* Navigation links (Desktop) */}
          <nav className="hidden lg:flex items-center gap-1.5 bg-[#F7F6F3] p-1.5 rounded-full">
            {navLinks.map((link) => {
              const isActive = currentPath === link.path;
              const Icon = link.icon;
              return (
                <a
                  key={link.path}
                  href={link.path}
                  className={`text-xs font-bold px-4 py-2 rounded-full transition-all flex items-center gap-2 ${
                    isActive
                      ? "bg-[#101828] text-white shadow-xs"
                      : "text-slate-600 hover:text-[#101828] hover:bg-white/80"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isActive ? "text-white" : "text-slate-400"}`} />
                  {link.label}
                </a>
              );
            })}
          </nav>
        </div>

        {/* Right side: Notifications and Profile */}
        <div className="flex items-center gap-3">
          {/* Notifications Button */}
          <button
            className="relative h-10 w-10 text-slate-600 hover:text-[#101828] rounded-full bg-[#F7F6F3] hover:bg-[#EBF9FD] flex items-center justify-center transition-colors cursor-pointer"
            title="Notificações"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-2 right-2 h-2 w-2 bg-red-600 rounded-full ring-2 ring-white" />
          </button>

          {/* User profile dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2.5 p-1.5 pr-3 rounded-full bg-[#F7F6F3] hover:bg-slate-200/60 transition-all cursor-pointer"
            >
              <div className="h-8 w-8 rounded-full bg-red-100 text-red-700 font-extrabold flex items-center justify-center text-xs overflow-hidden border border-red-200/70 shrink-0 shadow-2xs">
                {userAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={userAvatar} alt={currentUser.nome} className="h-full w-full object-cover" />
                ) : (
                  userInitials
                )}
              </div>
              <span className="text-xs font-bold text-[#101828] hidden sm:block truncate max-w-[120px]">
                {currentUser.nome?.split(" ")[0]}
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 text-slate-400 transition-transform hidden sm:block ${
                  isDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Profile Menu Dropdown */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2.5 w-68 bg-white border border-black/5 rounded-3xl p-5 shadow-xl space-y-4 z-50 animate-fade-in">
                {/* User info */}
                <div className="flex flex-col items-center text-center pb-3 border-b border-black/5">
                  <div className="h-14 w-14 rounded-full bg-red-100 text-red-700 font-black flex items-center justify-center text-lg overflow-hidden border-2 border-red-200 mb-2 relative shadow-xs shrink-0">
                    {userAvatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={userAvatar} alt={currentUser.nome} className="h-full w-full object-cover" />
                    ) : (
                      userInitials
                    )}
                  </div>
                  <h4 className="font-extrabold text-sm text-[#101828] truncate max-w-[210px]">
                    {currentUser.nome}
                  </h4>
                  <span className="mt-1.5 text-[10px] font-black text-red-700 bg-red-50 px-3 py-1 rounded-full border border-red-200 uppercase tracking-wide flex items-center gap-1">
                    {currentUser.is_master && <Sparkles className="h-3 w-3 text-red-600" />}
                    {currentUser.is_master ? "Admin Master" : (roleLabels[currentUser.role] || currentUser.role)}
                  </span>
                </div>

                {/* Actions */}
                <div className="space-y-1">
                  <a
                    href="/configuracoes"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-3 text-xs font-bold text-slate-700 hover:text-[#101828] hover:bg-[#F7F6F3] px-3.5 py-2.5 rounded-2xl transition-all"
                  >
                    <Settings className="h-4 w-4 text-slate-400" />
                    <span>Configurações</span>
                  </a>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 px-3.5 py-2.5 rounded-2xl transition-all cursor-pointer text-left"
                  >
                    <LogOut className="h-4 w-4 text-red-500" />
                    <span>Sair da conta</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile nav pills */}
      <div className="lg:hidden border-t border-black/5 bg-[#F7F6F3] flex overflow-x-auto gap-2 p-2.5 scrollbar-none px-4">
        {navLinks.map((link) => {
          const isActive = currentPath === link.path;
          const Icon = link.icon;
          return (
            <a
              key={link.path}
              href={link.path}
              className={`text-xs font-bold px-3.5 py-2 rounded-full whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 ${
                isActive
                  ? "bg-[#101828] text-white shadow-xs"
                  : "text-slate-600 hover:bg-white"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {link.label}
            </a>
          );
        })}
      </div>
    </header>
  );
}
