"use client";

import { useEffect, useState } from "react";
import { DBService, Aluno, Movimentacao } from "@/services/db";

export default function AlunoDashboard() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [alunoInfo, setAlunoInfo] = useState<Aluno | null>(null);
  const [compras, setCompras] = useState<Movimentacao[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const user = DBService.getCurrentUser();
    if (!user || user.role !== 'aluno') {
      window.location.href = "/";
      return;
    }
    setCurrentUser(user);
    loadData(user.aluno_id || 'aluno-1');
  }, []);

  const loadData = (alunoId: string) => {
    const alunos = DBService.getAlunos();
    const info = alunos.find(a => a.id === alunoId);
    if (info) {
      setAlunoInfo(info);
    }
    
    // Filtra compras deste aluno
    const movimentacoes = DBService.getMovimentacoes();
    setCompras(movimentacoes.filter(m => m.aluno_id === alunoId && m.tipo === 'debito').reverse());
  };

  const handleShare = () => {
    if (!alunoInfo) return;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${alunoInfo.id}`;
    
    // Tenta compartilhar ou copia link
    if (navigator.share) {
      navigator.share({
        title: `QR Code de ${alunoInfo.nome}`,
        text: `Use este QR Code para comprar na Cantina Digital`,
        url: qrUrl,
      }).catch(err => console.log(err));
    } else {
      navigator.clipboard.writeText(qrUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  if (!alunoInfo) {
    return (
      <div className="flex-1 bg-slate-50 flex items-center justify-center min-h-screen text-slate-500">
        Carregando...
      </div>
    );
  }

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${alunoInfo.id}`;

  return (
    <div className="flex-1 bg-slate-50 text-slate-800 min-h-screen">
      {/* Navbar */}
      <nav className="border-b border-slate-200 bg-white sticky top-0 z-20 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-red-600 rounded-full flex items-center justify-center text-white font-black text-xxs border border-red-700 shadow-xs">
              EEAC
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight text-slate-800 block">
                Cantina Digital
              </span>
              <span className="text-[9px] text-slate-500 font-bold uppercase block leading-none">Aluno</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-500 hidden sm:inline">Olá, <strong>{alunoInfo.nome}</strong></span>
            <a href="/" className="text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 px-3.5 py-1.5 rounded-full border border-slate-200 transition-colors">
              Sair
            </a>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        
        {/* Top Header Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col md:flex-row justify-between items-center gap-6 shadow-xs">
          <div className="flex items-center gap-4 text-left w-full md:w-auto">
            <div className="h-14 w-14 rounded-full bg-red-100 text-red-700 font-black flex items-center justify-center text-2xl">
              {alunoInfo.nome.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-lg text-slate-800 leading-none">{alunoInfo.nome}</h2>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100 uppercase">
                  {alunoInfo.turma}
                </span>
              </div>
              <p className="text-xxs text-slate-400 mt-1.5">Registro do Aluno (RA): {alunoInfo.ra}</p>
            </div>
          </div>

          <div className="text-right w-full md:w-auto flex md:flex-col justify-between items-center md:items-end border-t md:border-0 border-slate-100 pt-4 md:pt-0">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Meu Saldo Disponível</span>
            <span className="text-3xl font-black text-emerald-600">R$ {alunoInfo.saldo.toFixed(2)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Coluna QR CODE */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col items-center justify-between text-center space-y-4 md:col-span-1">
            <div>
              <h3 className="font-bold text-sm text-slate-800">Meu QR Code da Cantina</h3>
              <p className="text-[10px] text-slate-400 mt-1 leading-normal">Mostre este código no caixa da cantina para realizar compras rápidas.</p>
            </div>

            {/* QR Code Card */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center justify-center shadow-inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrCodeUrl}
                alt="QR Code do Aluno"
                className="w-40 h-40 object-contain rounded-md"
              />
            </div>

            {/* Share / Save */}
            <div className="w-full">
              <button
                onClick={handleShare}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <span>🔗</span> {copiedLink ? "Link Copiado!" : "Compartilhar QR Code"}
              </button>
            </div>
          </div>

          {/* Coluna Extrato / Compras */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs md:col-span-2 space-y-4">
            <h3 className="font-bold text-sm text-slate-800">Meu Extrato de Consumo</h3>
            
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1 divide-y divide-slate-100">
              {compras.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs italic">
                  Nenhum consumo registrado recentemente.
                </div>
              ) : (
                compras.map(comp => (
                  <div
                    key={comp.id}
                    className="pt-3 first:pt-0 flex justify-between items-center text-xs"
                  >
                    <div className="space-y-0.5">
                      <strong className="text-slate-800 block font-semibold">{comp.descricao}</strong>
                      <span className="text-[10px] text-slate-400 block">
                        {new Date(comp.criado_em).toLocaleDateString('pt-BR')} às {new Date(comp.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <span className="font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100">
                      - R$ {comp.valor.toFixed(2)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
