"use client";

import { useState, useEffect } from "react";
import { DBService, Aluno, Comprovante, Movimentacao, Profile } from "@/services/db";

export default function AdminDashboard() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'fila' | 'alunos' | 'movimentacoes'>('fila');
  
  // Data States
  const [comprovantes, setComprovantes] = useState<Comprovante[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  // Modal / Ações States
  const [selectedComp, setSelectedComp] = useState<Comprovante | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Cadastro de Aluno State
  const [isAddAlunoOpen, setIsAddAlunoOpen] = useState(false);
  const [alunoNome, setAlunoNome] = useState("");
  const [alunoRa, setAlunoRa] = useState("");
  const [alunoTurma, setAlunoTurma] = useState("");
  const [alunoResponsavelId, setAlunoResponsavelId] = useState("");

  useEffect(() => {
    const user = DBService.getCurrentUser();
    if (!user || user.role !== 'admin') {
      window.location.href = "/";
      return;
    }
    setCurrentUser(user);
    loadAllData();
  }, []);

  const loadAllData = () => {
    setComprovantes(DBService.getComprovantes());
    setAlunos(DBService.getAlunos());
    setMovimentacoes(DBService.getMovimentacoes());
    setProfiles(DBService.getProfiles().filter(p => p.role === 'familia'));
  };

  const handleApprove = (comp: Comprovante) => {
    try {
      DBService.approveComprovante(comp.id, currentUser.id);
      setSelectedComp(null);
      loadAllData();
    } catch (err: any) {
      setErrorMessage(err.message || "Erro ao aprovar comprovante.");
    }
  };

  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComp) return;
    if (!rejectionReason.trim()) {
      setErrorMessage("Por favor, informe o motivo da rejeição.");
      return;
    }

    try {
      DBService.rejectComprovante(selectedComp.id, rejectionReason);
      setIsRejectModalOpen(false);
      setRejectionReason("");
      setSelectedComp(null);
      setErrorMessage("");
      loadAllData();
    } catch (err: any) {
      setErrorMessage(err.message || "Erro ao rejeitar comprovante.");
    }
  };

  const handleAddAlunoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!alunoNome.trim() || !alunoRa.trim() || !alunoTurma.trim()) {
      setErrorMessage("Preencha todos os campos obrigatórios.");
      return;
    }

    try {
      DBService.addAluno(alunoNome, alunoRa, alunoTurma, alunoResponsavelId || undefined);
      setIsAddAlunoOpen(false);
      setAlunoNome("");
      setAlunoRa("");
      setAlunoTurma("");
      setAlunoResponsavelId("");
      setErrorMessage("");
      loadAllData();
    } catch (err: any) {
      setErrorMessage(err.message || "Erro ao cadastrar aluno.");
    }
  };

  // Estatísticas Rápidas
  const totalCreditosCirculando = alunos.reduce((sum, a) => sum + a.saldo, 0);
  const pendentesCount = comprovantes.filter(c => c.status === 'pendente').length;
  const aprovadosCount = comprovantes.filter(c => c.status === 'aprovado').length;

  // Detecção de Duplicidades na Fila
  const isHashDuplicate = (comp: Comprovante) => {
    return comprovantes.filter(c => c.hash_comprovante === comp.hash_comprovante && c.id !== comp.id).length > 0;
  };

  const isTxIdDuplicate = (comp: Comprovante) => {
    if (!comp.id_transacao) return false;
    return comprovantes.filter(c => c.id_transacao === comp.id_transacao && c.status === 'aprovado' && c.id !== comp.id).length > 0;
  };

  return (
    <div className="flex-1 bg-slate-950 text-slate-100 min-h-screen">
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-emerald-400 to-indigo-300 bg-clip-text text-transparent">
              Cantina Digital
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Administração
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400 hidden sm:inline">Painel: <strong>{currentUser?.nome}</strong></span>
            <a href="/" className="text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700 transition-colors">
              Sair
            </a>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        
        {/* KPI Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fila de Aprovação</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-black text-amber-400">{pendentesCount}</span>
              <span className="text-xxs text-amber-500/80 bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10">Aguardando Revisão</span>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total de Alunos</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-black text-slate-200">{alunos.length}</span>
              <span className="text-xxs text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">Ativos</span>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Crédito Circulante Geral</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-black text-emerald-400">R$ {totalCreditosCirculando.toFixed(2)}</span>
              <span className="text-xxs text-slate-400">Total nos Saldos</span>
            </div>
          </div>
        </section>

        {/* Tab Selector */}
        <div className="border-b border-slate-800 mb-8 flex gap-4 text-sm font-semibold">
          <button
            onClick={() => setActiveTab('fila')}
            className={`pb-3 relative transition-colors cursor-pointer ${activeTab === 'fila' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'}`}
          >
            📋 Fila de Pix {pendentesCount > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xxs font-bold">{pendentesCount}</span>}
            {activeTab === 'fila' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />}
          </button>

          <button
            onClick={() => setActiveTab('alunos')}
            className={`pb-3 relative transition-colors cursor-pointer ${activeTab === 'alunos' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'}`}
          >
            👥 Cadastro de Alunos
            {activeTab === 'alunos' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />}
          </button>

          <button
            onClick={() => setActiveTab('movimentacoes')}
            className={`pb-3 relative transition-colors cursor-pointer ${activeTab === 'movimentacoes' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'}`}
          >
            📊 Trilha de Auditoria (Ledger)
            {activeTab === 'movimentacoes' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />}
          </button>
        </div>

        {/* Tab: Fila de Pix */}
        {activeTab === 'fila' && (
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Lista de Comprovantes */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-lg font-bold text-slate-200 mb-2">Comprovantes Recebidos</h3>
              
              {comprovantes.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-slate-900/20 border border-slate-800 rounded-2xl">
                  Nenhum comprovante no banco de dados.
                </div>
              ) : comprovantes.filter(c => c.status === 'pendente').length === 0 ? (
                <div className="p-12 text-center text-slate-400 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                  🎉 Todos os PIX foram analisados e aprovados! Fila vazia.
                </div>
              ) : (
                comprovantes.filter(c => c.status === 'pendente').map(comp => {
                  const aluno = alunos.find(a => a.id === comp.aluno_id);
                  const isDuplicate = isHashDuplicate(comp) || isTxIdDuplicate(comp);
                  return (
                    <button
                      key={comp.id}
                      onClick={() => { setSelectedComp(comp); setErrorMessage(""); }}
                      className={`w-full text-left p-5 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 cursor-pointer ${
                        selectedComp?.id === comp.id
                          ? 'bg-slate-900 border-emerald-500 shadow-md shadow-emerald-500/5'
                          : isDuplicate
                          ? 'bg-red-500/5 border-red-500/30 hover:bg-slate-900 hover:border-red-500/40'
                          : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-sm font-bold text-slate-100">{aluno?.nome || "Aluno Excluído"}</span>
                          <span className="text-xxs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-800">{aluno?.turma}</span>
                          {isDuplicate && (
                            <span className="text-xxs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-bold animate-pulse">
                              ⚠️ ALERTA DUPLICADO
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 space-y-0.5">
                          <p>Pagador: <strong>{comp.pagador}</strong></p>
                          <p className="font-mono text-xxs">Transação: {comp.id_transacao || "Não informada"}</p>
                        </div>
                      </div>

                      <div className="text-right flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto border-t sm:border-0 border-slate-800 pt-3 sm:pt-0">
                        <span className="text-lg font-black text-emerald-400">R$ {comp.valor.toFixed(2)}</span>
                        <span className="text-xxs text-slate-500">
                          {new Date(comp.criado_em).toLocaleDateString('pt-BR')} às {new Date(comp.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Visualizador de Detalhes / Lado a Lado */}
            <div className="lg:col-span-1">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sticky top-24 shadow-xl">
                {selectedComp ? (
                  <div className="space-y-6">
                    <div className="border-b border-slate-800 pb-4">
                      <h4 className="font-bold text-lg text-slate-100">Análise do Comprovante</h4>
                      <p className="text-xs text-slate-500">ID interno: {selectedComp.id}</p>
                    </div>

                    {/* Imagem do Comprovante */}
                    <div className="relative rounded-2xl border border-slate-800 bg-slate-950 h-52 overflow-hidden flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selectedComp.arquivo_url}
                        alt="Comprovante Original"
                        className="object-contain h-full w-full p-2"
                      />
                    </div>

                    {/* Alertas de Segurança */}
                    <div className="space-y-2">
                      {isHashDuplicate(selectedComp) ? (
                        <div className="text-xs bg-red-500/10 border border-red-500/25 text-red-400 p-3 rounded-xl flex items-start gap-2">
                          <span className="text-base">🚨</span>
                          <div>
                            <strong>Arquivo Duplicado:</strong> Este comprovante exato (mesma imagem) já foi submetido em outro envio. Risco de fraude.
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs bg-emerald-500/5 border border-emerald-500/15 text-emerald-400 p-2.5 rounded-xl flex items-center gap-2">
                          <span className="text-emerald-400">✓</span> Assinatura digital única (sem duplicados).
                        </div>
                      )}

                      {isTxIdDuplicate(selectedComp) ? (
                        <div className="text-xs bg-red-500/10 border border-red-500/25 text-red-400 p-3 rounded-xl flex items-start gap-2">
                          <span className="text-base">🚨</span>
                          <div>
                            <strong>PIX Duplicado:</strong> Este ID de transação PIX já consta como "Aprovado" no sistema. Não credite novamente.
                          </div>
                        </div>
                      ) : selectedComp.id_transacao ? (
                        <div className="text-xs bg-emerald-500/5 border border-emerald-500/15 text-emerald-400 p-2.5 rounded-xl flex items-center gap-2">
                          <span className="text-emerald-400">✓</span> ID de transação PIX inédito.
                        </div>
                      ) : null}
                    </div>

                    {/* Dados Lidos */}
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-2.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Aluno:</span>
                        <strong className="text-slate-200">
                          {alunos.find(a => a.id === selectedComp.aluno_id)?.nome}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Valor extraído:</span>
                        <strong className="text-emerald-400 font-bold text-sm">
                          R$ {selectedComp.valor.toFixed(2)}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Pagador:</span>
                        <strong className="text-slate-200">{selectedComp.pagador}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">ID Pix:</span>
                        <strong className="text-slate-300 font-mono text-[10px] break-all">{selectedComp.id_transacao}</strong>
                      </div>
                    </div>

                    {errorMessage && (
                      <div className="text-xs text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                        ⚠️ {errorMessage}
                      </div>
                    )}

                    {/* Botões de Ação */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => { setIsRejectModalOpen(true); setErrorMessage(""); }}
                        className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold py-3 rounded-xl border border-red-500/20 transition-colors cursor-pointer"
                      >
                        Rejeitar
                      </button>
                      <button
                        onClick={() => handleApprove(selectedComp)}
                        disabled={isTxIdDuplicate(selectedComp)}
                        className="flex-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-600/10 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        Liberar R$ {selectedComp.valor.toFixed(2)}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16 text-slate-500">
                    <span className="text-4xl block mb-3">🔍</span>
                    Selecione um comprovante da fila para analisar as informações de segurança e liberar o saldo.
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Tab: Alunos */}
        {activeTab === 'alunos' && (
          <section className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-200">Alunos Cadastrados</h3>
              <button
                onClick={() => setIsAddAlunoOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4.5 py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                + Novo Aluno
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-xs text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Nome</th>
                    <th className="py-3 px-4">Turma</th>
                    <th className="py-3 px-4">RA</th>
                    <th className="py-3 px-4 text-right">Saldo Atual</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-sm text-slate-300">
                  {alunos.map(aluno => (
                    <tr key={aluno.id} className="hover:bg-slate-800/5 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-200">{aluno.nome}</td>
                      <td className="py-3.5 px-4">{aluno.turma}</td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-400">{aluno.ra}</td>
                      <td className="py-3.5 px-4 text-right font-black text-emerald-400">R$ {aluno.saldo.toFixed(2)}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-xxs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Ativo
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Tab: Movimentacoes */}
        {activeTab === 'movimentacoes' && (
          <section className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl">
            <h3 className="text-lg font-bold text-slate-200 mb-6">Trilha de Auditoria Geral (Entradas e Saídas)</h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-xs text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Aluno</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Valor</th>
                    <th className="py-3 px-4">Descrição</th>
                    <th className="py-3 px-4">Operador</th>
                    <th className="py-3 px-4">Data/Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-sm text-slate-300">
                  {movimentacoes.map(mov => {
                    const aluno = alunos.find(a => a.id === mov.aluno_id);
                    return (
                      <tr key={mov.id} className="hover:bg-slate-800/5 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-200">{aluno?.nome || "Excluído"}</td>
                        <td className="py-3.5 px-4">
                          {mov.tipo === 'credito' ? (
                            <span className="px-2 py-0.5 rounded text-xxs font-bold bg-emerald-500/15 text-emerald-400">ENTRADA (PIX)</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-xxs font-bold bg-rose-500/15 text-rose-400">SAÍDA (CONSUMO)</span>
                          )}
                        </td>
                        <td className={`py-3.5 px-4 font-black ${mov.tipo === 'credito' ? 'text-emerald-400' : 'text-slate-300'}`}>
                          {mov.tipo === 'credito' ? '+' : '-'} R$ {mov.valor.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-400">{mov.descricao}</td>
                        <td className="py-3.5 px-4 text-xs text-slate-400">{mov.criado_por === 'usr-admin' ? 'Secretaria' : 'Atendente Cantina'}</td>
                        <td className="py-3.5 px-4 text-xs text-slate-400">
                          {new Date(mov.criado_em).toLocaleDateString('pt-BR')} às {new Date(mov.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      {/* Modal: Rejeição de Comprovante */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-30">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6">
            <h3 className="text-lg font-bold text-slate-100 mb-2">Rejeitar Recarga PIX</h3>
            <p className="text-xs text-slate-400 mb-4">Por favor, descreva o motivo da rejeição. A família visualizará este texto em seu painel para efetuar correções.</p>
            
            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <textarea
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  placeholder="Ex: Valor incorreto no comprovante, banco de destino não correspondente..."
                  rows={4}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-red-500"
                  required
                />
              </div>

              {errorMessage && (
                <div className="text-xs text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                  ⚠️ {errorMessage}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsRejectModalOpen(false); setRejectionReason(""); }}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold py-2.5 rounded-xl border border-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold py-2.5 rounded-xl transition-colors cursor-pointer"
                >
                  Confirmar Rejeição
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Adicionar Aluno */}
      {isAddAlunoOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-30">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6">
            <h3 className="text-lg font-bold text-slate-100 mb-4">Adicionar Novo Aluno</h3>

            <form onSubmit={handleAddAlunoSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Nome Completo</label>
                <input
                  type="text"
                  value={alunoNome}
                  onChange={e => setAlunoNome(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  placeholder="Nome do Aluno"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Turma</label>
                  <input
                    type="text"
                    value={alunoTurma}
                    onChange={e => setAlunoTurma(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    placeholder="Ex: 6º Ano A"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">RA (Registro)</label>
                  <input
                    type="text"
                    value={alunoRa}
                    onChange={e => setAlunoRa(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    placeholder="123456-7"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Vincular Responsável (Família)</label>
                <select
                  value={alunoResponsavelId}
                  onChange={e => setAlunoResponsavelId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Nenhum / Cadastrar desvinculado</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.nome} ({p.email})</option>
                  ))}
                </select>
              </div>

              {errorMessage && (
                <div className="text-xs text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                  ⚠️ {errorMessage}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddAlunoOpen(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold py-2.5 rounded-xl border border-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2.5 rounded-xl transition-colors cursor-pointer"
                >
                  Cadastrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
