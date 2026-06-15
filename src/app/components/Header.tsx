"use client";

import { useEffect, useState, useRef } from "react";
import { DBService, Profile, Aluno } from "@/services/db";

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
      // Carregar informações extras como foto, se for o caso
      DBService.getAlunos().then((alunos) => {
        const info = alunos.find((a) => a.id === user.aluno_id);
        if (info) {
          setAlunoInfo(info);
        }
      }).catch(err => console.error("Erro ao carregar dados adicionais do usuário:", err));
    }

    // Fecha o dropdown se clicar fora
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

  // Mapeamento de rótulos de roles para exibição amigável
  const roleLabels: Record<string, string> = {
    admin: "Administrador(a)",
    gestao: "Gestor(a)",
    professor: "Professor(a) / Servidor",
    aluno: "Estudante",
    familia: "Responsável",
    cantina: "Cantina",
  };

  // Links de navegação baseados na role do usuário
  const getNavLinks = () => {
    if (currentUser.role === "admin" || currentUser.role === "gestao") {
      return [
        { label: "Início", path: "/admin" },
        { label: "Terminal Cantina", path: "/cantina" },
        { label: "Carteirinha Aluno", path: "/aluno" },
        { label: "Carteirinha Professor", path: "/professor" },
        { label: "Portal Família", path: "/familia" },
      ];
    }
    
    switch (currentUser.role) {
      case "aluno":
        return [{ label: "Minha Carteirinha", path: "/aluno" }];
      case "professor":
        return [{ label: "Minha Carteirinha", path: "/professor" }];
      case "familia":
        return [{ label: "Portal da Família", path: "/familia" }];
      case "cantina":
        return [{ label: "Terminal da Cantina", path: "/cantina" }];
      default:
        return [];
    }
  };

  const navLinks = getNavLinks();

  // Avatar do usuário (foto ou iniciais)
  const userAvatar = alunoInfo?.foto || null;
  const userInitials = currentUser.nome ? currentUser.nome.charAt(0).toUpperCase() : "U";

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-45 shadow-sm font-sans print:hidden">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Logo e Nome */}
        <div className="flex items-center gap-8">
          <a href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <div className="h-9 w-9 bg-red-600 rounded-full flex items-center justify-center text-white font-black text-xxs border border-red-700 shadow-sm shrink-0">
              EEAC
            </div>
            <div className="leading-none text-left">
              <span className="font-extrabold text-sm tracking-tight text-slate-800 block">
                Cantina Digital
              </span>
              <span className="text-[9px] text-slate-500 font-bold uppercase block mt-0.5">
                E.E. Antônio Caio
              </span>
            </div>
          </a>

          {/* Links de Navegação (Desktop) */}
          <nav className="hidden md:flex items-center gap-1.5">
            {navLinks.map((link) => {
              const isActive = currentPath === link.path;
              return (
                <a
                  key={link.path}
                  href={link.path}
                  className={`text-xxs font-bold px-3 py-2 rounded-xl transition-all duration-150 ${
                    isActive
                      ? "bg-red-50 text-red-650 border border-red-100/40"
                      : "text-slate-550 hover:bg-slate-50 hover:text-slate-800"
                  }`}
                >
                  {link.label}
                </a>
              );
            })}
          </nav>
        </div>

        {/* Lado Direito: Notificações e Perfil */}
        <div className="flex items-center gap-4">
          
          {/* Ícone de Notificação (Simulado) */}
          <button className="relative h-8 w-8 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 flex items-center justify-center transition-colors cursor-pointer">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
            </svg>
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-red-600 rounded-full text-white text-[8px] font-black flex items-center justify-center border border-white leading-none">
              3
            </span>
          </button>

          {/* Seletor de Perfil / Menu Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2.5 p-1 rounded-full hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
            >
              {/* Avatar da barra */}
              <div className="h-8 w-8 rounded-full bg-red-100 text-red-700 font-extrabold flex items-center justify-center text-xs overflow-hidden border border-red-200/40 shrink-0">
                {userAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={userAvatar} alt={currentUser.nome} className="h-full w-full object-cover" />
                ) : (
                  userInitials
                )}
              </div>
              <span className="text-xs font-bold text-slate-700 hidden sm:block truncate max-w-[100px]">
                {currentUser.nome?.split(" ")[0]}
              </span>
              <svg className={`h-4 w-4 text-slate-400 transition-transform hidden sm:block ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            {/* Menu Dropdown de Perfil */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2.5 w-64 bg-white/95 backdrop-blur-md border border-slate-200 rounded-3xl p-5 shadow-2xl space-y-4 animate-in fade-in slide-in-from-top-3 duration-150">
                
                {/* Cabeçalho do Dropdown */}
                <div className="flex flex-col items-center text-center pb-3 border-b border-slate-100">
                  <div className="h-14 w-14 rounded-full bg-red-100 text-red-700 font-black flex items-center justify-center text-lg overflow-hidden border-2 border-red-200/50 mb-2 relative group shadow-sm shrink-0">
                    {userAvatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={userAvatar} alt={currentUser.nome} className="h-full w-full object-cover" />
                    ) : (
                      userInitials
                    )}
                  </div>
                  <h4 className="font-extrabold text-sm text-slate-800 leading-tight truncate max-w-[200px]">
                    {currentUser.nome}
                  </h4>
                  <span className="mt-1 text-[9px] font-black text-red-650 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-150 uppercase tracking-wide leading-none">
                    {roleLabels[currentUser.role] || currentUser.role}
                  </span>
                </div>

                {/* Ações */}
                <div className="space-y-1">
                  <a
                    href="/configuracoes"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-3 text-xxs font-bold text-slate-650 hover:text-slate-850 hover:bg-slate-50 px-3 py-2 rounded-xl transition-all"
                  >
                    <svg className="h-4 w-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.43l1.004-.827c.292-.24.437-.613.43-.991a6.936 6.936 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
                    </svg>
                    <span>Configurações</span>
                  </a>
                  
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 text-xxs font-bold text-red-600 hover:text-red-750 hover:bg-red-50/55 px-3 py-2 rounded-xl transition-all cursor-pointer text-left"
                  >
                    <svg className="h-4 w-4 text-red-550 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                    </svg>
                    <span>Sair da conta</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navegação Mobile (Links rápidos adicionais, se aplicável) */}
      <div className="md:hidden border-t border-slate-100 bg-slate-50 flex overflow-x-auto gap-2 p-2 scrollbar-none">
        {navLinks.map((link) => {
          const isActive = currentPath === link.path;
          return (
            <a
              key={link.path}
              href={link.path}
              className={`text-[10px] font-black px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0 transition-all ${
                isActive
                  ? "bg-red-600 text-white shadow-sm"
                  : "text-slate-650 hover:bg-slate-100"
              }`}
            >
              {link.label}
            </a>
          );
        })}
      </div>
    </header>
  );
}
