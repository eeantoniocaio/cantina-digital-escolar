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
    // Filtra movimentações de débito recentes
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

      // Feedback de sucesso
      setSuccessMsg(`Débito de R$ ${amount.toFixed(2)} realizado com sucesso para ${selectedAluno.nome}!`);
      setChargeAmount("");
      setChargeDesc("");
      setErrorMsg("");
      
      // Recarregar dados
      loadData();
      
      // Atualizar o saldo do aluno selecionado exibido na tela
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
    <div className="flex-1 bg-slate-950 text-slate-100 min-h-screen">
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-amber-400 to-indigo-300 bg-clip-text text-transparent">
              Cantina Digital
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Terminal Cantina
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400 hidden sm:inline">Operador: <strong>{currentUser?.nome}</strong></span>
            <a href="/" className="text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700 transition-colors">
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
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative">
            <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
              <span>🔍</span> 1. Localizar Aluno
            </h3>
            
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Digite o nome do aluno, turma ou RA..."
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-base focus:outline-none focus:border-amber-500 text-slate-200 placeholder-slate-500 shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Resultados Dropdown */}
            {filteredAlunos.length > 0 && (
              <div className="absolute left-6 right-6 mt-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl z-10 divide-y divide-slate-800/60">
                {filteredAlunos.map(aluno => (
                  <button
                    key={aluno.id}
                    onClick={() => handleSelectAluno(aluno)}
                    className="w-full text-left p-4 hover:bg-slate-800/40 transition-colors flex justify-between items-center cursor-pointer"
                  >
                    <div>
                      <span className="font-bold text-slate-200 block">{aluno.nome}</span>
                      <span className="text-xs text-slate-500">RA: {aluno.ra} • Turma: {aluno.turma}</span>
                    </div>
                    <span className="text-sm font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/10">
                      R$ {aluno.saldo.toFixed(2)}
                    </span>
                  </button>
                ))}
              </div>
            )}
            
            {searchQuery.trim() !== "" && filteredAlunos.length === 0 && (
              <div className="mt-2 text-xs text-slate-500 italic">
                Nenhum aluno correspondente encontrado.
              </div>
            )}
          </div>

          {/* Form de Débito (checkout) */}
          {selectedAluno ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
              
              {/* Resumo do Aluno Selecionado */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 bg-slate-950 rounded-2xl border border-slate-850 gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-amber-500/20 text-amber-400 font-extrabold flex items-center justify-center text-xl">
                    {selectedAluno.nome.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-black text-lg text-slate-100">{selectedAluno.nome}</h4>
                    <p className="text-xs text-slate-400">Turma: {selectedAluno.turma} • RA: {selectedAluno.ra}</p>
                  </div>
                </div>

                <div className="text-right flex sm:flex-col justify-between w-full sm:w-auto items-center sm:items-end border-t sm:border-0 border-slate-800/80 pt-3 sm:pt-0">
                  <span className="text-xs text-slate-500 uppercase font-semibold">Saldo Disponível</span>
                  <span className="text-3xl font-black text-emerald-400">R$ {selectedAluno.saldo.toFixed(2)}</span>
                </div>
              </div>

              {/* Formulário de Registro de Venda */}
              <form onSubmit={handleChargeSubmit} className="space-y-6">
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <span>🍔</span> 2. Registrar Consumo
                </h3>

                {/* Linha de Valor */}
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-400">Valor do Lanche (R$)</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <button
                      type="button"
                      onClick={() => handleQuickAmount(5)}
                      className="bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl py-3 text-sm font-semibold transition-all hover:border-amber-500/30 cursor-pointer"
                    >
                      R$ 5,00
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAmount(8)}
                      className="bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl py-3 text-sm font-semibold transition-all hover:border-amber-500/30 cursor-pointer"
                    >
                      R$ 8,00
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAmount(10)}
                      className="bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl py-3 text-sm font-semibold transition-all hover:border-amber-500/30 cursor-pointer"
                    >
                      R$ 10,00
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAmount(12)}
                      className="bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl py-3 text-sm font-semibold transition-all hover:border-amber-500/30 cursor-pointer"
                    >
                      R$ 12,00
                    </button>
                  </div>
                  
                  <input
                    type="text"
                    value={chargeAmount}
                    onChange={e => setChargeAmount(e.target.value)}
                    placeholder="Digite outro valor... R$ 0,00"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-lg font-bold focus:outline-none focus:border-amber-500 text-slate-200 placeholder-slate-600"
                    required
                  />
                </div>

                {/* Descrição do Consumo */}
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-400">O que foi consumido?</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xxs">
                    <button
                      type="button"
                      onClick={() => handleQuickDesc("Salgado + Refresco")}
                      className="bg-slate-950 hover:bg-slate-850 border border-slate-850 rounded-lg py-2 transition-all cursor-pointer"
                    >
                      Salgado + Refresco
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickDesc("Lanche Natural + Suco")}
                      className="bg-slate-950 hover:bg-slate-850 border border-slate-850 rounded-lg py-2 transition-all cursor-pointer"
                    >
                      Lanche Nat. + Suco
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickDesc("Pão de Queijo Duplo")}
                      className="bg-slate-950 hover:bg-slate-850 border border-slate-850 rounded-lg py-2 transition-all cursor-pointer"
                    >
                      Pão de Queijo Duplo
                    </button>
                  </div>

                  <input
                    type="text"
                    value={chargeDesc}
                    onChange={e => setChargeDesc(e.target.value)}
                    placeholder="Ex: Salada de frutas + Mistão quente"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 text-slate-200 placeholder-slate-650"
                    required
                  />
                </div>

                {/* Feedbacks de Erro e Sucesso */}
                {errorMsg && (
                  <div className="text-xs text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                    ⚠️ {errorMsg}
                  </div>
                )}

                {successMsg && (
                  <div className="text-xs text-emerald-400 bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
                    🎉 {successMsg}
                  </div>
                )}

                {/* Ações */}
                <div className="flex gap-4 pt-4 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => setSelectedAluno(null)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold py-3.5 rounded-xl border border-slate-700 cursor-pointer"
                  >
                    Trocar Aluno
                  </button>
                  <button
                    type="submit"
                    className="flex-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold py-3.5 rounded-xl transition-all shadow-lg shadow-amber-500/15 cursor-pointer"
                  >
                    Confirmar e Debitar Saldo
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-16 text-center text-slate-500">
              <span className="text-5xl block mb-4">🛒</span>
              Pesquise e selecione um aluno acima para iniciar o registro da compra.
            </div>
          )}
        </div>

        {/* Lado Direito: Vendas Recentes */}
        <div className="lg:col-span-1">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <div>
              <h4 className="font-bold text-lg text-slate-100 flex items-center gap-2">
                <span>🕒</span> Vendas do Turno
              </h4>
              <p className="text-xxs text-slate-500 uppercase tracking-wider font-semibold mt-1">Últimos débitos realizados</p>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {recentSales.length === 0 ? (
                <div className="text-center py-12 text-slate-600 text-xs italic">
                  Nenhuma venda realizada neste turno.
                </div>
              ) : (
                recentSales.map(sale => {
                  const aluno = alunos.find(a => a.id === sale.aluno_id);
                  return (
                    <div
                      key={sale.id}
                      className="bg-slate-950 border border-slate-850 p-3.5 rounded-xl flex justify-between items-center text-xs"
                    >
                      <div className="space-y-0.5">
                        <strong className="text-slate-200 block">{aluno?.nome || "Excluído"}</strong>
                        <span className="text-slate-400 block text-[11px] truncate max-w-[150px]">{sale.descricao}</span>
                        <span className="text-[10px] text-slate-600 block">
                          {new Date(sale.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <span className="font-black text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/5 text-right whitespace-nowrap">
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
