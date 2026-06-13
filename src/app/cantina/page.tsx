"use client";

import { useState, useEffect } from "react";
import { DBService, Aluno, Movimentacao } from "@/services/db";

export default function CantinaTerminal() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Data States
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [recentSales, setRecentSales] = useState<Movimentacao[]>([]);
  
  // Checkout States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAluno, setSelectedAluno] = useState<Aluno | null>(null);
  const [chargeAmount, setChargeAmount] = useState("");
  const [chargeDesc, setChargeDesc] = useState("");
  
  // UI feedback states
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const user = DBService.getCurrentUser();
    if (!user || user.role !== 'cantina') {
      window.location.href = "/";
      return;
    }
    setCurrentUser(user);
    loadData();
  }, []);

  const loadData = () => {
    setAlunos(DBService.getAlunos());
    const allMovs = DBService.getMovimentacoes();
    setRecentSales(allMovs.filter(m => m.tipo === 'debito').reverse().slice(0, 10));
  };

  const handleSelectAluno = (aluno: Aluno) => {
    setSelectedAluno(aluno);
    setSearchQuery("");
    setChargeAmount("");
    setChargeDesc("");
    setSuccessMsg("");
    setErrorMsg("");
  };

  const handleQuickAmount = (amount: number) => {
    setChargeAmount(amount.toFixed(2));
  };

  const handleQuickDesc = (desc: string) => {
    setChargeDesc(desc);
  };

  const handleChargeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAluno) return;
    
    const amount = parseFloat(chargeAmount.replace(",", "."));
    if (isNaN(amount) || amount <= 0) {
      setErrorMsg("Informe um valor de débito válido.");
      return;
    }

    if (!chargeDesc.trim()) {
      setErrorMsg("Informe uma descrição (ex: Pão de queijo + Suco).");
      return;
    }

    try {
      DBService.registrarConsumo(
        selectedAluno.id,
        amount,
        chargeDesc,
        currentUser.id
      );

      setSuccessMsg(`Débito de R$ ${amount.toFixed(2)} realizado com sucesso para ${selectedAluno.nome}!`);
      setChargeAmount("");
      setChargeDesc("");
      setErrorMsg("");
      
      loadData();
      
      const updatedAlunos = DBService.getAlunos();
      const updatedAluno = updatedAlunos.find(a => a.id === selectedAluno.id);
      if (updatedAluno) {
        setSelectedAluno(updatedAluno);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao efetuar débito.");
    }
  };

  // Filtro de Alunos por Busca
  const filteredAlunos = searchQuery.trim() === ""
    ? []
    : alunos.filter(a => 
        a.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.ra.includes(searchQuery) ||
        a.turma.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 5);

  return (
    <div className="flex-1 bg-slate-50 text-slate-800 min-h-screen">
      {/* Navbar */}
      <nav className="border-b border-slate-200 bg-white sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-red-600 rounded-full flex items-center justify-center text-white font-black text-xxs border border-red-700 shadow-xs">
              EEAC
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight text-slate-800 block">
                Cantina Digital
              </span>
              <span className="text-[9px] text-slate-500 font-bold uppercase block leading-none">Terminal Cantina</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-500 hidden sm:inline">Operador: <strong>{currentUser?.nome}</strong></span>
            <a href="/" className="text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 px-3.5 py-1.5 rounded-full border border-slate-200 transition-colors">
              Sair
            </a>
          </div>
        </div>
      </nav>

      {/* Main Grid Layout */}
      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Lado Esquerdo: Busca e Formulário de Venda */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Caixa de Busca */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 relative shadow-xs">
            <h3 className="text-base font-extrabold text-slate-800 mb-4 flex items-center gap-2">
              <span>🔍</span> 1. Localizar Aluno
            </h3>
            
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Digite o nome do aluno, turma ou RA..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-red-500 text-slate-800 placeholder-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Resultados Dropdown */}
            {filteredAlunos.length > 0 && (
              <div className="absolute left-6 right-6 mt-2 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl z-10 divide-y divide-slate-100">
                {filteredAlunos.map(aluno => (
                  <button
                    key={aluno.id}
                    onClick={() => handleSelectAluno(aluno)}
                    className="w-full text-left p-4 hover:bg-slate-50 transition-colors flex justify-between items-center cursor-pointer text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-800 block text-sm">{aluno.nome}</span>
                      <span className="text-slate-400">RA: {aluno.ra} • Turma: {aluno.turma}</span>
                    </div>
                    <span className="font-extrabold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                      R$ {aluno.saldo.toFixed(2)}
                    </span>
                  </button>
                ))}
              </div>
            )}
            
            {searchQuery.trim() !== "" && filteredAlunos.length === 0 && (
              <div className="mt-2 text-xs text-slate-400 italic">
                Nenhum aluno correspondente encontrado.
              </div>
            )}
          </div>

          {/* Form de Débito (checkout) */}
          {selectedAluno ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-6 shadow-xs">
              
              {/* Resumo do Aluno Selecionado */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 bg-slate-50 rounded-2xl border border-slate-100 gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-red-100 text-red-700 font-black flex items-center justify-center text-xl">
                    {selectedAluno.nome.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-base text-slate-800">{selectedAluno.nome}</h4>
                    <p className="text-xs text-slate-400">Turma: {selectedAluno.turma} • RA: {selectedAluno.ra}</p>
                  </div>
                </div>

                <div className="text-right flex sm:flex-col justify-between w-full sm:w-auto items-center sm:items-end border-t sm:border-0 border-slate-200 pt-3 sm:pt-0">
                  <span className="text-[10px] text-slate-450 uppercase font-bold">Saldo Disponível</span>
                  <span className="text-2xl font-black text-emerald-600">R$ {selectedAluno.saldo.toFixed(2)}</span>
                </div>
              </div>

              {/* Formulário de Registro de Venda */}
              <form onSubmit={handleChargeSubmit} className="space-y-6">
                <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                  <span>🍔</span> 2. Registrar Consumo
                </h3>

                {/* Linha de Valor */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-500">Valor do Lanche (R$)</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => handleQuickAmount(5)}
                      className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl py-3 transition-all hover:border-red-500/30 cursor-pointer"
                    >
                      R$ 5,00
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAmount(8)}
                      className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl py-3 transition-all hover:border-red-500/30 cursor-pointer"
                    >
                      R$ 8,00
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAmount(10)}
                      className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl py-3 transition-all hover:border-red-500/30 cursor-pointer"
                    >
                      R$ 10,00
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAmount(12)}
                      className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl py-3 transition-all hover:border-red-500/30 cursor-pointer"
                    >
                      R$ 12,00
                    </button>
                  </div>
                  
                  <input
                    type="text"
                    value={chargeAmount}
                    onChange={e => setChargeAmount(e.target.value)}
                    placeholder="Digite outro valor... R$ 0,00"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-lg font-black focus:outline-none focus:border-red-500 text-slate-800 placeholder-slate-400"
                    required
                  />
                </div>

                {/* Descrição do Consumo */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-500">O que foi consumido?</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px] font-semibold">
                    <button
                      type="button"
                      onClick={() => handleQuickDesc("Salgado + Suco")}
                      className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg py-2 transition-all cursor-pointer"
                    >
                      Salgado + Suco
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickDesc("Lanche Natural + Refresco")}
                      className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg py-2 transition-all cursor-pointer"
                    >
                      Lanche Nat. + Suco
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickDesc("Pão de Queijo Duplo")}
                      className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg py-2 transition-all cursor-pointer"
                    >
                      Pão de Queijo Duplo
                    </button>
                  </div>

                  <input
                    type="text"
                    value={chargeDesc}
                    onChange={e => setChargeDesc(e.target.value)}
                    placeholder="Ex: Pastel de forno + Suco Del Valle"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs focus:outline-none focus:border-red-500 text-slate-800 placeholder-slate-400"
                    required
                  />
                </div>

                {/* Feedbacks de Erro e Sucesso */}
                {errorMsg && (
                  <div className="text-xs text-red-650 bg-red-50 p-3 rounded-lg border border-red-100">
                    ⚠️ {errorMsg}
                  </div>
                )}

                {successMsg && (
                  <div className="text-xs text-emerald-650 bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                    🎉 {successMsg}
                  </div>
                )}

                {/* Ações */}
                <div className="flex gap-4 pt-4 border-t border-slate-200 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setSelectedAluno(null)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-3.5 rounded-xl border border-slate-200 cursor-pointer"
                  >
                    Trocar Aluno
                  </button>
                  <button
                    type="submit"
                    className="flex-2 bg-red-600 hover:bg-red-700 text-white py-3.5 rounded-xl transition-all cursor-pointer"
                  >
                    Confirmar e Debitar Saldo
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center text-slate-400 shadow-xs">
              <span className="text-5xl block mb-4">🛒</span>
              Pesquise e selecione um aluno acima para registrar a compra.
            </div>
          )}
        </div>

        {/* Lado Direito: Vendas Recentes */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
            <div>
              <h4 className="font-extrabold text-base text-slate-800 flex items-center gap-2">
                <span>🕒</span> Vendas do Turno
              </h4>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mt-1">Últimos débitos realizados</p>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {recentSales.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs italic">
                  Nenhuma venda realizada neste turno.
                </div>
              ) : (
                recentSales.map(sale => {
                  const aluno = alunos.find(a => a.id === sale.aluno_id);
                  return (
                    <div
                      key={sale.id}
                      className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl flex justify-between items-center text-xs"
                    >
                      <div className="space-y-0.5">
                        <strong className="text-slate-800 block font-bold">{aluno?.nome || "Excluído"}</strong>
                        <span className="text-slate-500 block text-[10px] truncate max-w-[150px]">{sale.descricao}</span>
                        <span className="text-[9px] text-slate-450 block">
                          {new Date(sale.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <span className="font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100 text-right whitespace-nowrap">
                        - R$ {sale.valor.toFixed(2)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
