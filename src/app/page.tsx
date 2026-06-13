"use client";

import Link from "next/link";
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
    <main className="flex-1 flex flex-col justify-center items-center px-4 relative overflow-hidden bg-slate-950 text-slate-100 py-12">
      {/* Decorative Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-4xl z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider bg-violet-500/10 text-violet-400 border border-violet-500/20 uppercase">
            ⚡ Inovação Escolar
          </span>
          <h1 className="mt-6 text-4xl sm:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-violet-400 via-indigo-200 to-emerald-400">
            Cantina Digital
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-400 max-w-xl mx-auto">
            O canal seguro e inteligente para gerar créditos e acompanhar o consumo dos alunos sem o uso de celulares em sala.
          </p>
        </div>

        {/* Portais de Acesso */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Card 1: Família */}
          <button
            onClick={() => handleSimularLogin('familia')}
            className="group relative flex flex-col justify-between items-start text-left p-6 rounded-2xl border border-slate-800 bg-slate-900/50 hover:bg-slate-900 hover:border-violet-500/50 transition-all duration-300 transform hover:-translate-y-1 shadow-lg backdrop-blur-md"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-25 transition-opacity duration-300">
              <span className="text-6xl">👨‍👩‍👦</span>
            </div>
            <div>
              <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-violet-500/20 text-violet-400 mb-6 group-hover:scale-110 transition-transform duration-300">
                <span className="text-xl">🏠</span>
              </div>
              <h2 className="text-xl font-bold text-slate-100 mb-2">Família / Responsável</h2>
              <p className="text-sm text-slate-400">
                Envie comprovantes PIX, verifique o saldo atualizado dos alunos e acompanhe o histórico de recargas.
              </p>
            </div>
            <div className="mt-8 text-xs font-semibold text-violet-400 flex items-center group-hover:translate-x-1 transition-transform">
              Acessar Painel <span className="ml-1">→</span>
            </div>
          </button>

          {/* Card 2: Cantina */}
          <button
            onClick={() => handleSimularLogin('cantina')}
            className="group relative flex flex-col justify-between items-start text-left p-6 rounded-2xl border border-slate-800 bg-slate-900/50 hover:bg-slate-900 hover:border-amber-500/50 transition-all duration-300 transform hover:-translate-y-1 shadow-lg backdrop-blur-md"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-25 transition-opacity duration-300">
              <span className="text-6xl">🍔</span>
            </div>
            <div>
              <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-amber-500/20 text-amber-400 mb-6 group-hover:scale-110 transition-transform duration-300">
                <span className="text-xl">🥪</span>
              </div>
              <h2 className="text-xl font-bold text-slate-100 mb-2">Cantina / Operador</h2>
              <p className="text-sm text-slate-400">
                Consulte saldo por nome do aluno ou turma e registre débitos de lanches de forma ágil e segura.
              </p>
            </div>
            <div className="mt-8 text-xs font-semibold text-amber-400 flex items-center group-hover:translate-x-1 transition-transform">
              Acessar Terminal <span className="ml-1">→</span>
            </div>
          </button>

          {/* Card 3: Admin */}
          <button
            onClick={() => handleSimularLogin('admin')}
            className="group relative flex flex-col justify-between items-start text-left p-6 rounded-2xl border border-slate-800 bg-slate-900/50 hover:bg-slate-900 hover:border-emerald-500/50 transition-all duration-300 transform hover:-translate-y-1 shadow-lg backdrop-blur-md"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-25 transition-opacity duration-300">
              <span className="text-6xl">🏫</span>
            </div>
            <div>
              <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-emerald-500/20 text-emerald-400 mb-6 group-hover:scale-110 transition-transform duration-300">
                <span className="text-xl">💼</span>
              </div>
              <h2 className="text-xl font-bold text-slate-100 mb-2">Secretaria / Admin</h2>
              <p className="text-sm text-slate-400">
                Fila de aprovação de PIX, prevenção de fraudes, controle de saldos gerais e auditoria.
              </p>
            </div>
            <div className="mt-8 text-xs font-semibold text-emerald-400 flex items-center group-hover:translate-x-1 transition-transform">
              Acessar Secretaria <span className="ml-1">→</span>
            </div>
          </button>
        </div>

        {/* Footer info & Simulações rápidas */}
        <div className="border-t border-slate-800/60 pt-8 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 gap-4">
          <p>© 2026 Cantina Digital Escolar. Desenvolvido para simplificar e proteger.</p>
          
          {currentUser && (
            <div className="flex items-center gap-3 bg-slate-900 py-1.5 px-3 rounded-full border border-slate-800">
              <span>Logado como: <strong>{currentUser.nome}</strong> ({currentUser.role})</span>
              <button 
                onClick={handleLogout} 
                className="text-red-400 hover:text-red-300 transition-colors underline font-medium cursor-pointer"
              >
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
