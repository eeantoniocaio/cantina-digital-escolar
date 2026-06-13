"use client";

import { useEffect, useState } from "react";
import { DBService, Profile } from "@/services/db";

export default function Home() {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);

  useEffect(() => {
    setCurrentUser(DBService.getCurrentUser());
  }, []);

  const handleSimularLogin = (role: 'familia' | 'admin' | 'cantina') => {
    let email = "";
    if (role === 'admin') email = "admin@escola.com";
    else if (role === 'cantina') email = "cantina@escola.com";
    else email = "pai@email.com";

    DBService.login(email, role);
    window.location.href = `/${role}`;
  };

  const handleLogout = () => {
    DBService.logout();
    setCurrentUser(null);
  };

  return (
    <main className="flex-1 bg-slate-50 text-slate-800 flex flex-col justify-between min-h-screen">
      {/* Header idêntico ao outro app */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo da Escola Simulado */}
            <div className="h-10 w-10 bg-red-600 rounded-full flex items-center justify-center text-white font-black text-xs border border-red-700 shadow-sm">
              EEAC
            </div>
            <div>
              <h1 className="font-extrabold text-sm tracking-tight text-slate-800 leading-none">
                Cantina Digital
              </h1>
              <span className="text-[10px] text-slate-500 font-semibold uppercase">E.E. Antônio Caio</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
            {currentUser && (
              <div className="flex items-center gap-2 bg-slate-100 py-1.5 px-3 rounded-full border border-slate-200">
                <span>Logado como: <strong className="text-slate-800">{currentUser.nome}</strong> ({currentUser.role})</span>
                <button 
                  onClick={handleLogout} 
                  className="text-red-600 hover:text-red-700 transition-colors underline font-bold cursor-pointer"
                >
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Conteúdo Principal - Cartões de Portal de Entrada */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto px-4 py-12 w-full">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-800">
            Painel de Acesso à Cantina
          </h2>
          <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
            Selecione seu perfil abaixo para gerenciar saldos, enviar comprovantes de PIX ou registrar vendas.
          </p>
        </div>

        {/* Grid de Cartões estilo o outro app (Clean, White com Borda Suave e Sombras leves) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-8">
          {/* Família */}
          <button
            onClick={() => handleSimularLogin('familia')}
            className="group p-6 rounded-2xl border border-slate-200 bg-white hover:border-red-500/50 hover:shadow-md transition-all duration-300 flex flex-col justify-between items-center text-center shadow-xs cursor-pointer h-60"
          >
            <div className="h-12 w-12 rounded-full flex items-center justify-center bg-red-50 text-red-600 mb-4 group-hover:scale-105 transition-transform duration-300">
              <span className="text-2xl">👨‍👩‍👦</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 mb-2">Família / Responsável</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Envie comprovantes PIX, consulte o saldo atual de seus filhos e veja o histórico de recargas.
              </p>
            </div>
            <div className="mt-4 text-xs font-bold text-red-600 group-hover:translate-x-0.5 transition-transform">
              Entrar no Painel →
            </div>
          </button>

          {/* Cantina */}
          <button
            onClick={() => handleSimularLogin('cantina')}
            className="group p-6 rounded-2xl border border-slate-200 bg-white hover:border-red-500/50 hover:shadow-md transition-all duration-300 flex flex-col justify-between items-center text-center shadow-xs cursor-pointer h-60"
          >
            <div className="h-12 w-12 rounded-full flex items-center justify-center bg-red-50 text-red-600 mb-4 group-hover:scale-105 transition-transform duration-300">
              <span className="text-2xl">🍔</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 mb-2">Cantina / Operador</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Busca rápida de alunos e débito de consumo da cantina em tempo real (otimizado para toque).
              </p>
            </div>
            <div className="mt-4 text-xs font-bold text-red-600 group-hover:translate-x-0.5 transition-transform">
              Acessar Terminal →
            </div>
          </button>

          {/* Admin */}
          <button
            onClick={() => handleSimularLogin('admin')}
            className="group p-6 rounded-2xl border border-slate-200 bg-white hover:border-red-500/50 hover:shadow-md transition-all duration-300 flex flex-col justify-between items-center text-center shadow-xs cursor-pointer h-60"
          >
            <div className="h-12 w-12 rounded-full flex items-center justify-center bg-red-50 text-red-600 mb-4 group-hover:scale-105 transition-transform duration-300">
              <span className="text-2xl">🏫</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 mb-2">Secretaria / Admin</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Fila de aprovação de recargas Pix, auditoria financeira de saldos e controle cadastral.
              </p>
            </div>
            <div className="mt-4 text-xs font-bold text-red-600 group-hover:translate-x-0.5 transition-transform">
              Entrar na Secretaria →
            </div>
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <p>© 2026 E.E. Antônio Caio - Cantina Digital Escolar. Todos os direitos reservados.</p>
      </footer>
    </main>
  );
}
