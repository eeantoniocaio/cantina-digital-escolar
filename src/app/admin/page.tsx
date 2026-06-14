"use client";

import { useState, useEffect } from "react";
import { DBService, Aluno, Comprovante, Movimentacao, Profile, Produto } from "@/services/db";

export default function AdminDashboard() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'fila' | 'alunos' | 'produtos' | 'movimentacoes'>('fila');
  
  // Data States
  const [comprovantes, setComprovantes] = useState<Comprovante[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);

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

  // Gerenciamento de Produtos State
  const [isAddProdutoOpen, setIsAddProdutoOpen] = useState(false);
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);
  const [produtoNome, setProdutoNome] = useState("");
  const [produtoPreco, setProdutoPreco] = useState("");
  const [produtoCategoria, setProdutoCategoria] = useState<'salgado' | 'bebida' | 'doce' | 'outro'>('salgado');
  const [produtoAtivo, setProdutoAtivo] = useState(true);

  useEffect(() => {
    const user = DBService.getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'gestao')) {
      window.location.href = "/";
      return;
    }
    setCurrentUser(user);
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      const allComps = await DBService.getComprovantes();
      setComprovantes(allComps);
      const allAlunos = await DBService.getAlunos();
      setAlunos(allAlunos);
      const allMovs = await DBService.getMovimentacoes();
      setMovimentacoes(allMovs);
      const allProfiles = await DBService.getProfiles();
      setProfiles(allProfiles.filter(p => p.role === 'familia'));
      const allProds = await DBService.getProdutos();
      setProdutos(allProds);
    } catch (err) {
      console.error("Erro ao carregar dados do admin:", err);
    }
  };

  const handleOpenAddProduto = () => {
    setSelectedProduto(null);
    setProdutoNome("");
    setProdutoPreco("");
    setProdutoCategoria("salgado");
    setProdutoAtivo(true);
    setErrorMessage("");
    setIsAddProdutoOpen(true);
  };

  const handleOpenEditProduto = (prod: Produto) => {
    setSelectedProduto(prod);
    setProdutoNome(prod.nome);
    setProdutoPreco(prod.preco.toString());
    setProdutoCategoria(prod.categoria);
    setProdutoAtivo(prod.ativo);
    setErrorMessage("");
    setIsAddProdutoOpen(true);
  };

  const handleSaveProduto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!produtoNome.trim() || !produtoPreco.trim()) {
      setErrorMessage("Preencha todos os campos.");
      return;
    }

    const price = parseFloat(produtoPreco.replace(",", "."));
    if (isNaN(price) || price <= 0) {
      setErrorMessage("Informe um preço válido maior que zero.");
      return;
    }

    try {
      if (selectedProduto) {
        await DBService.updateProduto(selectedProduto.id, {
          nome: produtoNome,
          preco: price,
          categoria: produtoCategoria,
          ativo: produtoAtivo
        });
      } else {
        const newProd = await DBService.addProduto(produtoNome, price, produtoCategoria);
        if (!produtoAtivo) {
          await DBService.updateProduto(newProd.id, { ativo: false });
        }
      }
      setIsAddProdutoOpen(false);
      setProdutoNome("");
      setProdutoPreco("");
      setErrorMessage("");
      await loadAllData();
    } catch (err: any) {
      setErrorMessage(err.message || "Erro ao salvar produto.");
    }
  };

  const handleDeleteProduto = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este item?")) {
      try {
        await DBService.deleteProduto(id);
        await loadAllData();
      } catch (err: any) {
        alert(err.message || "Erro ao excluir produto.");
      }
    }
  };

  const handleApprove = async (comp: Comprovante) => {
    try {
      await DBService.approveComprovante(comp.id, currentUser.id);
      setSelectedComp(null);
      await loadAllData();
    } catch (err: any) {
      setErrorMessage(err.message || "Erro ao aprovar comprovante.");
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComp) return;
    if (!rejectionReason.trim()) {
      setErrorMessage("Por favor, informe o motivo da rejeição.");
      return;
    }

    try {
      await DBService.rejectComprovante(selectedComp.id, rejectionReason);
      setIsRejectModalOpen(false);
      setRejectionReason("");
      setSelectedComp(null);
      setErrorMessage("");
      await loadAllData();
    } catch (err: any) {
      setErrorMessage(err.message || "Erro ao rejeitar comprovante.");
    }
  };

  const handleAddAlunoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alunoNome.trim() || !alunoRa.trim() || !alunoTurma.trim()) {
      setErrorMessage("Preencha todos os campos obrigatórios.");
      return;
    }

    try {
      await DBService.addAluno(alunoNome, alunoRa, alunoTurma, alunoResponsavelId || undefined);
      setIsAddAlunoOpen(false);
      setAlunoNome("");
      setAlunoRa("");
      setAlunoTurma("");
      setAlunoResponsavelId("");
      setErrorMessage("");
      await loadAllData();
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
    <div className="flex-1 bg-slate-50 text-slate-800 min-h-screen">
      {/* Navbar */}
      <nav className="border-b border-slate-200 bg-white sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="h-9 w-9 bg-red-600 rounded-full flex items-center justify-center text-white font-black text-xxs border border-red-700 shadow-xs">
              EEAC
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight text-slate-800 block">
                Cantina Digital
              </span>
              <span className="text-[9px] text-slate-500 font-bold uppercase block leading-none">Secretaria</span>
            </div>
          </a>
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-500 hidden sm:inline">Painel: <strong>{currentUser?.nome}</strong></span>
            <a href="/" className="text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 px-3.5 py-1.5 rounded-full border border-slate-200 transition-colors">
              Sair
            </a>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        
        {/* KPI Cards (Clean White with borders) */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="bg-white border border-slate-200 p-6 rounded-2xl flex flex-col justify-between shadow-xs">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fila de Aprovação</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-black text-amber-600">{pendentesCount}</span>
              <span className="text-xxs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">Pendente</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-6 rounded-2xl flex flex-col justify-between shadow-xs">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total de Alunos</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-black text-slate-800">{alunos.length}</span>
              <span className="text-xxs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">Ativos</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-6 rounded-2xl flex flex-col justify-between shadow-xs">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Crédito Circulante</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-black text-emerald-600">R$ {totalCreditosCirculando.toFixed(2)}</span>
              <span className="text-[10px] text-slate-400 font-semibold">Total em Saldo</span>
            </div>
          </div>
        </section>

        {/* Tab Selector */}
        <div className="border-b border-slate-200 mb-8 flex gap-4 text-xs font-bold uppercase tracking-wider">
          <button
            onClick={() => setActiveTab('fila')}
            className={`pb-3 relative transition-colors cursor-pointer ${activeTab === 'fila' ? 'text-red-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            📋 Fila de Pix {pendentesCount > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xxs font-black">{pendentesCount}</span>}
            {activeTab === 'fila' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600" />}
          </button>

          <button
            onClick={() => setActiveTab('alunos')}
            className={`pb-3 relative transition-colors cursor-pointer ${activeTab === 'alunos' ? 'text-red-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            👥 Cadastro de Alunos
            {activeTab === 'alunos' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600" />}
          </button>

          <button
            onClick={() => setActiveTab('produtos')}
            className={`pb-3 relative transition-colors cursor-pointer ${activeTab === 'produtos' ? 'text-red-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            🍔 Gerenciar Cardápio
            {activeTab === 'produtos' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600" />}
          </button>

          <button
            onClick={() => setActiveTab('movimentacoes')}
            className={`pb-3 relative transition-colors cursor-pointer ${activeTab === 'movimentacoes' ? 'text-red-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            📊 Trilha de Auditoria
            {activeTab === 'movimentacoes' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600" />}
          </button>
        </div>

        {/* Tab: Fila de Pix */}
        {activeTab === 'fila' && (
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Lista de Comprovantes */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-sm font-bold text-slate-500 uppercase mb-2">Comprovantes Recebidos</h3>
              
              {comprovantes.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-white border border-slate-200 rounded-2xl">
                  Nenhum comprovante no banco de dados.
                </div>
              ) : comprovantes.filter(c => c.status === 'pendente').length === 0 ? (
                <div className="p-12 text-center text-slate-600 bg-emerald-50 border border-emerald-100 rounded-2xl font-bold">
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
                          ? 'bg-white border-red-500 shadow-md'
                          : isDuplicate
                          ? 'bg-red-50/50 border-red-200 hover:bg-white hover:border-red-300'
                          : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-sm font-bold text-slate-800">{aluno?.nome || "Aluno Excluído"}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">{aluno?.turma}</span>
                          {isDuplicate && (
                            <span className="text-xxs px-2 py-0.5 rounded-full bg-red-100 text-red-600 border border-red-200 font-bold animate-pulse">
                              ⚠️ ALERTA DUPLICADO
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 space-y-0.5">
                          <p>Pagador: <strong>{comp.pagador}</strong></p>
                          <p className="font-mono text-[10px] text-slate-400">Transação: {comp.id_transacao || "Não informada"}</p>
                        </div>
                      </div>

                      <div className="text-right flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto border-t sm:border-0 border-slate-100 pt-3 sm:pt-0">
                        <span className="text-base font-black text-emerald-600">R$ {comp.valor.toFixed(2)}</span>
                        <span className="text-[10px] text-slate-400">
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
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sticky top-24 shadow-sm">
                {selectedComp ? (
                  <div className="space-y-6">
                    <div className="border-b border-slate-200 pb-4">
                      <h4 className="font-bold text-base text-slate-800">Análise de Comprovante</h4>
                      <p className="text-[10px] text-slate-400">ID interno: {selectedComp.id}</p>
                    </div>

                    {/* Imagem do Comprovante */}
                    <div className="relative rounded-2xl border border-slate-200 bg-slate-50 h-52 overflow-hidden flex items-center justify-center">
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
                        <div className="text-xs bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl flex items-start gap-2">
                          <span className="text-base">🚨</span>
                          <div>
                            <strong>Arquivo Duplicado:</strong> Esta imagem já foi submetida em outro envio. Risco de fraude.
                          </div>
                        </div>
                      ) : (
                        <div className="text-[11px] bg-emerald-50 border border-emerald-100 text-emerald-700 p-2.5 rounded-xl flex items-center gap-2 font-medium">
                          <span>✓</span> Arquivo de imagem inédito.
                        </div>
                      )}

                      {isTxIdDuplicate(selectedComp) ? (
                        <div className="text-xs bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl flex items-start gap-2">
                          <span className="text-base">🚨</span>
                          <div>
                            <strong>PIX Duplicado:</strong> ID de transação PIX já foi aprovado anteriormente.
                          </div>
                        </div>
                      ) : selectedComp.id_transacao ? (
                        <div className="text-[11px] bg-emerald-50 border border-emerald-100 text-emerald-700 p-2.5 rounded-xl flex items-center gap-2 font-medium">
                          <span>✓</span> ID Pix livre e sem registros anteriores.
                        </div>
                      ) : null}
                    </div>

                    {/* Dados Lidos */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Aluno:</span>
                        <strong className="text-slate-800">
                          {alunos.find(a => a.id === selectedComp.aluno_id)?.nome}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Valor extraído:</span>
                        <strong className="text-emerald-600 font-bold text-sm">
                          R$ {selectedComp.valor.toFixed(2)}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Pagador:</span>
                        <strong className="text-slate-800">{selectedComp.pagador}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">ID Pix:</span>
                        <strong className="text-slate-600 font-mono text-[10px] break-all">{selectedComp.id_transacao}</strong>
                      </div>
                    </div>

                    {errorMessage && (
                      <div className="text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                        ⚠️ {errorMessage}
                      </div>
                    )}

                    {/* Botões de Ação */}
                    <div className="flex gap-3 text-xs font-bold">
                      <button
                        onClick={() => { setIsRejectModalOpen(true); setErrorMessage(""); }}
                        className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 py-3 rounded-xl border border-red-200 transition-colors cursor-pointer"
                      >
                        Rejeitar
                      </button>
                      <button
                        onClick={() => handleApprove(selectedComp)}
                        disabled={isTxIdDuplicate(selectedComp)}
                        className="flex-2 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        Aprovar R$ {selectedComp.valor.toFixed(2)}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16 text-slate-400">
                    <span className="text-4xl block mb-3">🔍</span>
                    Selecione um comprovante para analisar as assinaturas de segurança.
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Tab: Alunos */}
        {activeTab === 'alunos' && (
          <section className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold text-slate-500 uppercase">Alunos Cadastrados</h3>
              <button
                onClick={() => setIsAddAlunoOpen(true)}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4.5 py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                + Novo Aluno
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider bg-slate-50">
                    <th className="py-3 px-4">Nome</th>
                    <th className="py-3 px-4">Turma</th>
                    <th className="py-3 px-4">RA</th>
                    <th className="py-3 px-4 text-right">Saldo Atual</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                  {alunos.map(aluno => (
                    <tr key={aluno.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-800">{aluno.nome}</td>
                      <td className="py-3.5 px-4">{aluno.turma}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">{aluno.ra}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-800">R$ {aluno.saldo.toFixed(2)}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-xxs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
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
          <section className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
            <h3 className="text-sm font-bold text-slate-500 uppercase mb-6">Trilha de Auditoria Geral</h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider bg-slate-50">
                    <th className="py-3 px-4">Aluno</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Valor</th>
                    <th className="py-3 px-4">Descrição</th>
                    <th className="py-3 px-4">Operador</th>
                    <th className="py-3 px-4">Data/Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                  {movimentacoes.map(mov => {
                    const aluno = alunos.find(a => a.id === mov.aluno_id);
                    return (
                      <tr key={mov.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-800">{aluno?.nome || "Excluído"}</td>
                        <td className="py-3.5 px-4">
                          {mov.tipo === 'credito' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">ENTRADA (PIX)</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-100">SAÍDA (CANTINA)</span>
                          )}
                        </td>
                        <td className={`py-3.5 px-4 font-bold ${mov.tipo === 'credito' ? 'text-emerald-600' : 'text-slate-600'}`}>
                          {mov.tipo === 'credito' ? '+' : '-'} R$ {mov.valor.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">{mov.descricao}</td>
                        <td className="py-3.5 px-4 text-slate-400">{mov.criado_por === 'usr-admin' ? 'Secretaria' : 'Atendente Cantina'}</td>
                        <td className="py-3.5 px-4 text-slate-400">
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

        {/* Tab: Produtos */}
        {activeTab === 'produtos' && (
          <section className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold text-slate-500 uppercase">Itens do Cardápio</h3>
              <button
                onClick={handleOpenAddProduto}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4.5 py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                + Novo Item
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider bg-slate-50">
                    <th className="py-3 px-4">Nome do Produto</th>
                    <th className="py-3 px-4">Categoria</th>
                    <th className="py-3 px-4 text-right">Preço</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                  {produtos.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        Nenhum produto cadastrado.
                      </td>
                    </tr>
                  ) : (
                    produtos.map(prod => (
                      <tr key={prod.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-800">{prod.nome}</td>
                        <td className="py-3.5 px-4 capitalize">
                          {prod.categoria === 'salgado' ? '🍔 Salgado' :
                           prod.categoria === 'bebida' ? '🥤 Bebida' :
                           prod.categoria === 'doce' ? '🍬 Doce' : '📦 Outro'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-800">R$ {prod.preco.toFixed(2)}</td>
                        <td className="py-3.5 px-4">
                          {prod.ativo ? (
                            <span className="px-2 py-0.5 rounded text-xxs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                              Ativo
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-xxs font-bold bg-slate-200 text-slate-500 border border-slate-300">
                              Inativo
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <button
                            onClick={() => handleOpenEditProduto(prod)}
                            className="text-slate-600 hover:text-slate-800 font-bold bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors cursor-pointer text-xxs"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteProduto(prod.id)}
                            className="text-red-600 hover:text-red-750 font-bold bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg border border-red-200 transition-colors cursor-pointer text-xxs"
                          >
                            Excluir
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      {/* Modal: Rejeição de Comprovante */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-30">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden shadow-xl p-6">
            <h3 className="text-base font-extrabold text-slate-850 mb-2">Rejeitar Recarga PIX</h3>
            <p className="text-xs text-slate-400 mb-4 font-medium">Por favor, descreva o motivo da rejeição. A família visualizará este texto em seu painel.</p>
            
            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <textarea
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  placeholder="Ex: Comprovante ilegível ou de outro favorecido..."
                  rows={4}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-red-500"
                  required
                />
              </div>

              {errorMessage && (
                <div className="text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                  ⚠️ {errorMessage}
                </div>
              )}

              <div className="flex gap-3 pt-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => { setIsRejectModalOpen(false); setRejectionReason(""); }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-2.5 rounded-xl border border-slate-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl transition-colors cursor-pointer"
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-30">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden shadow-xl p-6">
            <h3 className="text-base font-extrabold text-slate-800 mb-4">Adicionar Novo Aluno</h3>

            <form onSubmit={handleAddAlunoSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Nome Completo</label>
                <input
                  type="text"
                  value={alunoNome}
                  onChange={e => setAlunoNome(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-red-500"
                  placeholder="Nome do Aluno"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Turma</label>
                  <input
                    type="text"
                    value={alunoTurma}
                    onChange={e => setAlunoTurma(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-red-500"
                    placeholder="Ex: 6º Ano A"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">RA (Registro)</label>
                  <input
                    type="text"
                    value={alunoRa}
                    onChange={e => setAlunoRa(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-red-500"
                    placeholder="123456-7"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Vincular Responsável</label>
                <select
                  value={alunoResponsavelId}
                  onChange={e => setAlunoResponsavelId(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-red-500"
                >
                  <option value="">Nenhum / Cadastrar desvinculado</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.nome} ({p.email})</option>
                  ))}
                </select>
              </div>

              {errorMessage && (
                <div className="text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                  ⚠️ {errorMessage}
                </div>
              )}

              <div className="flex gap-3 pt-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setIsAddAlunoOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-2.5 rounded-xl border border-slate-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl transition-colors cursor-pointer"
                >
                  Cadastrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Adicionar/Editar Produto */}
      {isAddProdutoOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-30">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden shadow-xl p-6">
            <h3 className="text-base font-extrabold text-slate-800 mb-4">
              {selectedProduto ? "Editar Item" : "Adicionar Novo Item"}
            </h3>

            <form onSubmit={handleSaveProduto} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Nome do Item</label>
                <input
                  type="text"
                  value={produtoNome}
                  onChange={e => setProdutoNome(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-red-500"
                  placeholder="Ex: Pastel de Forno"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Preço (R$)</label>
                  <input
                    type="text"
                    value={produtoPreco}
                    onChange={e => setProdutoPreco(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-red-500 font-bold"
                    placeholder="Ex: 5,50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Categoria</label>
                  <select
                    value={produtoCategoria}
                    onChange={e => setProdutoCategoria(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-red-500"
                  >
                    <option value="salgado">🍔 Salgado</option>
                    <option value="bebida">🥤 Bebida</option>
                    <option value="doce">🍬 Doce</option>
                    <option value="outro">📦 Outro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Status do Item</label>
                <select
                  value={produtoAtivo ? "ativo" : "inativo"}
                  onChange={e => setProdutoAtivo(e.target.value === "ativo")}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-red-500 font-medium"
                >
                  <option value="ativo">🟢 Ativo (visível na cantina)</option>
                  <option value="inativo">🔴 Inativo (oculto na cantina)</option>
                </select>
              </div>

              {errorMessage && (
                <div className="text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                  ⚠️ {errorMessage}
                </div>
              )}

              <div className="flex gap-3 pt-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setIsAddProdutoOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-2.5 rounded-xl border border-slate-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl transition-colors cursor-pointer"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
