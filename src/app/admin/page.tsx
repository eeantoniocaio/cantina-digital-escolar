"use client";

import { useState, useEffect } from "react";
import { DBService, Aluno, Comprovante, Movimentacao, Profile, Produto } from "@/services/db";
import Header from "../components/Header";
import { StatCard } from "../components/ui/StatCard";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHeader } from "../components/ui/PageHeader";
import {
  Clock,
  Users,
  Coins,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Plus,
  Trash2,
  Edit2,
  Search,
  ShieldAlert,
  ArrowDownLeft,
  ArrowUpRight,
  UtensilsCrossed,
  History,
  X
} from "lucide-react";

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
      await DBService.approveComprovante(comp.id);
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

  const totalCreditosCirculando = alunos.reduce((sum, a) => sum + a.saldo, 0);
  const pendentesCount = comprovantes.filter(c => c.status === 'pendente').length;

  const isHashDuplicate = (comp: Comprovante) => {
    return comprovantes.filter(c => c.hash_comprovante === comp.hash_comprovante && c.id !== comp.id).length > 0;
  };

  const isTxIdDuplicate = (comp: Comprovante) => {
    if (!comp.id_transacao) return false;
    return comprovantes.filter(c => c.id_transacao === comp.id_transacao && c.status === 'aprovado' && c.id !== comp.id).length > 0;
  };

  return (
    <div className="flex-1 bg-[--bg-base] text-slate-800 min-h-screen">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <PageHeader
          title="Secretaria & Gestão"
          description="Controle operacional de recargas Pix, alunos, cardápio e auditoria."
          badge={
            <Badge variant="brand" dot>
              {currentUser?.is_master ? "Modo Master" : "Administração"}
            </Badge>
          }
        />

        {/* KPI Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          <StatCard
            label="Fila de Aprovação Pix"
            value={pendentesCount}
            badgeText={pendentesCount > 0 ? "Requer Atenção" : "Em Dia"}
            badgeVariant={pendentesCount > 0 ? "warning" : "success"}
            icon={<Clock className="h-4 w-4" />}
            subtitle={`${pendentesCount} comprovantes aguardando verificação`}
            accentColor="yellow"
          />

          <StatCard
            label="Estudantes Matriculados"
            value={alunos.length}
            badgeText="Ativos"
            badgeVariant="info"
            icon={<Users className="h-4 w-4" />}
            subtitle="Alunos com carteirinha digital habilitada"
            accentColor="blue"
          />

          <StatCard
            label="Crédito em Circulação"
            value={`R$ ${totalCreditosCirculando.toFixed(2)}`}
            badgeText="Total em Saldo"
            badgeVariant="success"
            icon={<Coins className="h-4 w-4" />}
            subtitle="Saldo total disponível nas contas"
            accentColor="green"
          />
        </section>

        {/* Tab Navigation Pills */}
        <div className="bg-[#F7F6F3] p-1.5 rounded-full mb-8 flex flex-wrap gap-1 w-fit">
          <button
            onClick={() => setActiveTab('fila')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'fila'
                ? 'bg-[#101828] text-white shadow-xs'
                : 'text-slate-600 hover:text-[#101828] hover:bg-white/80'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Fila de Pix</span>
            {pendentesCount > 0 && (
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'fila' ? 'bg-[#FF88D3] text-[#831843]' : 'bg-[#FFCD20]/40 text-[#854D0E]'
              }`}>
                {pendentesCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('alunos')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'alunos'
                ? 'bg-[#101828] text-white shadow-xs'
                : 'text-slate-600 hover:text-[#101828] hover:bg-white/80'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Cadastro de Alunos</span>
          </button>

          <button
            onClick={() => setActiveTab('produtos')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'produtos'
                ? 'bg-[#101828] text-white shadow-xs'
                : 'text-slate-600 hover:text-[#101828] hover:bg-white/80'
            }`}
          >
            <UtensilsCrossed className="h-4 w-4" />
            <span>Cardápio</span>
          </button>

          <button
            onClick={() => setActiveTab('movimentacoes')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'movimentacoes'
                ? 'bg-[#101828] text-white shadow-xs'
                : 'text-slate-600 hover:text-[#101828] hover:bg-white/80'
            }`}
          >
            <History className="h-4 w-4" />
            <span>Auditoria</span>
          </button>
        </div>

        {/* TAB 1: FILA DE PIX */}
        {activeTab === 'fila' && (
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">
                  Comprovantes em Espera
                </h3>
                <span className="text-xs text-slate-500 font-bold bg-[#EBF9FD] text-[#075985] px-3 py-0.5 rounded-full">
                  {comprovantes.filter(c => c.status === 'pendente').length} pendente(s)
                </span>
              </div>

              {comprovantes.filter(c => c.status === 'pendente').length === 0 ? (
                <EmptyState
                  icon={<CheckCircle2 className="h-7 w-7 text-emerald-500" />}
                  title="Fila de análise zerada!"
                  description="Todos os comprovantes Pix enviados pelas famílias foram analisados e creditados com sucesso."
                  variant="green"
                />
              ) : (
                comprovantes.filter(c => c.status === 'pendente').map(comp => {
                  const aluno = alunos.find(a => a.id === comp.aluno_id);
                  const isDuplicate = isHashDuplicate(comp) || isTxIdDuplicate(comp);
                  const isSelected = selectedComp?.id === comp.id;

                  return (
                    <div
                      key={comp.id}
                      onClick={() => { setSelectedComp(comp); setErrorMessage(""); }}
                      className={`p-6 rounded-3xl transition-all cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                        isSelected
                          ? 'bg-[#101828] text-white shadow-lg -translate-y-0.5'
                          : isDuplicate
                          ? 'bg-[#FFF0F8] text-[#831843] hover:shadow-md'
                          : 'bg-white hover:bg-[#EBF9FD] hover:shadow-md shadow-2xs'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2.5">
                          <span className={`text-base font-extrabold ${isSelected ? 'text-white' : 'text-[#101828]'}`}>
                            {aluno?.nome || "Aluno Excluído"}
                          </span>
                          <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {aluno?.turma}
                          </span>
                          {isDuplicate && (
                            <span className="text-[10px] font-black bg-rose-500 text-white px-2.5 py-0.5 rounded-full">
                              Duplicidade
                            </span>
                          )}
                        </div>
                        <div className={`text-xs space-y-0.5 ${isSelected ? 'text-white/70' : 'text-slate-500'}`}>
                          <p>Pagador: <strong className={isSelected ? 'text-white' : 'text-slate-800'}>{comp.pagador}</strong></p>
                          <p className="font-mono text-[11px] opacity-75">ID Pix: {comp.id_transacao || "Não identificado"}</p>
                        </div>
                      </div>

                      <div className="text-right flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto border-t sm:border-0 border-white/10 pt-3 sm:pt-0">
                        <span className={`text-2xl font-black ${isSelected ? 'text-[#A6F686]' : 'text-emerald-600'}`}>
                          R$ {comp.valor.toFixed(2)}
                        </span>
                        <span className={`text-[11px] font-medium ${isSelected ? 'text-white/60' : 'text-slate-400'}`}>
                          {new Date(comp.criado_em).toLocaleDateString('pt-BR')} às {new Date(comp.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Visualizador de Detalhes */}
            <div className="lg:col-span-1">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sticky top-24 shadow-sm space-y-5">
                {selectedComp ? (
                  <>
                    <div className="border-b border-slate-100 pb-3 flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-base text-slate-900">Análise do Documento</h4>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {selectedComp.id.substring(0, 12)}...</p>
                      </div>
                      <Badge variant={isHashDuplicate(selectedComp) || isTxIdDuplicate(selectedComp) ? "danger" : "info"}>
                        {isHashDuplicate(selectedComp) || isTxIdDuplicate(selectedComp) ? "Suspeito" : "Regular"}
                      </Badge>
                    </div>

                    {/* Imagem do Comprovante */}
                    <div className="relative rounded-2xl border border-slate-200 bg-slate-50 h-56 overflow-hidden flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selectedComp.arquivo_url}
                        alt="Comprovante Pix"
                        className="object-contain h-full w-full p-2"
                      />
                    </div>

                    {/* Alertas de Fraude */}
                    <div className="space-y-2">
                      {isHashDuplicate(selectedComp) && (
                        <div className="text-xs bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-2xl flex items-start gap-2.5">
                          <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <strong className="block font-bold">Arquivo Duplicado:</strong>
                            Esta mesma imagem já foi enviada em outro comprovante.
                          </div>
                        </div>
                      )}

                      {isTxIdDuplicate(selectedComp) && (
                        <div className="text-xs bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-2xl flex items-start gap-2.5">
                          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <strong className="block font-bold">Transação já Aprovada:</strong>
                            O identificador Pix informado já consta em outro lançamento.
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Metadados Extraídos */}
                    <div className="bg-[#F7F6F3] p-5 rounded-2xl space-y-2.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-medium">Estudante:</span>
                        <strong className="text-[#101828] font-bold text-sm">
                          {alunos.find(a => a.id === selectedComp.aluno_id)?.nome}
                        </strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-medium">Valor identificado:</span>
                        <strong className="text-emerald-600 font-black text-base">
                          R$ {selectedComp.valor.toFixed(2)}
                        </strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-medium">Nome Pagador:</span>
                        <strong className="text-slate-800">{selectedComp.pagador}</strong>
                      </div>
                      <div className="flex flex-col gap-0.5 pt-2 border-t border-black/5">
                        <span className="text-slate-400 text-[10px] font-bold uppercase">ID Pix:</span>
                        <strong className="text-slate-600 font-mono text-[11px] break-all">{selectedComp.id_transacao || "Não consta"}</strong>
                      </div>
                    </div>

                    {errorMessage && (
                      <div className="text-xs text-rose-700 bg-rose-50 p-3.5 rounded-2xl border border-rose-200 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                        <span>{errorMessage}</span>
                      </div>
                    )}

                    {/* Botões de Decisão */}
                    <div className="flex gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => { setIsRejectModalOpen(true); setErrorMessage(""); }}
                        className="flex-1 py-3 px-4 rounded-full text-xs font-bold text-[#991B1B] bg-[#FFF0F8] hover:bg-rose-100 transition-colors cursor-pointer"
                      >
                        Rejeitar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApprove(selectedComp)}
                        disabled={isTxIdDuplicate(selectedComp)}
                        className="flex-2 py-3 px-5 rounded-full text-xs font-bold text-white bg-[#101828] hover:bg-[#1E293B] transition-colors cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Aprovar R$ {selectedComp.valor.toFixed(2)}
                      </button>
                    </div>
                  </>
                ) : (
                  <EmptyState
                    icon={<Search className="h-6 w-6 text-slate-400" />}
                    title="Nenhum item selecionado"
                    description="Clique em um comprovante da fila para analisar a imagem e as assinaturas de segurança."
                  />
                )}
              </div>
            </div>
          </section>
        )}

        {/* TAB 2: ALUNOS */}
        {activeTab === 'alunos' && (
          <section className="bg-white border border-slate-200 p-6 rounded-3xl shadow-xs">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Alunos Cadastrados</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Gerenciamento de estudantes e turmas ativas</p>
              </div>
              <Button
                variant="brand"
                size="md"
                onClick={() => setIsAddAlunoOpen(true)}
                leftIcon={<Plus className="h-4 w-4" />}
              >
                Novo Aluno
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Nome do Aluno</th>
                    <th className="py-3 px-4">Turma</th>
                    <th className="py-3 px-4">Registro (RA)</th>
                    <th className="py-3 px-4 text-right">Saldo Atual</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {alunos.map(aluno => (
                    <tr key={aluno.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{aluno.nome}</td>
                      <td className="py-3.5 px-4">
                        <span className="bg-slate-100 text-slate-700 font-bold px-2.5 py-0.5 rounded-full text-[10px]">
                          {aluno.turma}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500">{aluno.ra}</td>
                      <td className="py-3.5 px-4 text-right font-black text-slate-900">
                        R$ {aluno.saldo.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge variant="success" dot>
                          Ativo
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* TAB 3: PRODUTOS */}
        {activeTab === 'produtos' && (
          <section className="bg-white border border-slate-200 p-6 rounded-3xl shadow-xs">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Itens do Cardápio</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Gerencie os produtos disponíveis no terminal da cantina</p>
              </div>
              <Button
                variant="brand"
                size="md"
                onClick={handleOpenAddProduto}
                leftIcon={<Plus className="h-4 w-4" />}
              >
                Novo Item
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Produto</th>
                    <th className="py-3 px-4">Categoria</th>
                    <th className="py-3 px-4 text-right">Preço</th>
                    <th className="py-3 px-4 text-center">Disponibilidade</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {produtos.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        Nenhum produto cadastrado no cardápio.
                      </td>
                    </tr>
                  ) : (
                    produtos.map(prod => (
                      <tr key={prod.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">{prod.nome}</td>
                        <td className="py-3.5 px-4 capitalize text-slate-600">
                          {prod.categoria === 'salgado' ? 'Salgado' :
                           prod.categoria === 'bebida' ? 'Bebida' :
                           prod.categoria === 'doce' ? 'Doce' : 'Outro'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-slate-900">
                          R$ {prod.preco.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {prod.ativo ? (
                            <Badge variant="success" dot>Ativo</Badge>
                          ) : (
                            <Badge variant="neutral">Inativo</Badge>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-1.5">
                          <button
                            onClick={() => handleOpenEditProduto(prod)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                            title="Editar"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduto(prod.id)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
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

        {/* TAB 4: MOVIMENTACOES */}
        {activeTab === 'movimentacoes' && (
          <section className="bg-white border border-slate-200 p-6 rounded-3xl shadow-xs">
            <div className="mb-6">
              <h3 className="text-base font-extrabold text-slate-900">Trilha de Auditoria Geral</h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Histórico imutável de todas as recargas Pix e débitos da cantina</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Estudante</th>
                    <th className="py-3 px-4">Operação</th>
                    <th className="py-3 px-4 text-right">Valor</th>
                    <th className="py-3 px-4">Descrição / Itens</th>
                    <th className="py-3 px-4">Operador</th>
                    <th className="py-3 px-4 text-right">Data & Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {movimentacoes.map(mov => {
                    const aluno = alunos.find(a => a.id === mov.aluno_id);
                    return (
                      <tr key={mov.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">{aluno?.nome || "Excluído"}</td>
                        <td className="py-3.5 px-4">
                          {mov.tipo === 'credito' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                              <ArrowDownLeft className="h-3 w-3 text-emerald-600" />
                              RECARGA PIX
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                              <ArrowUpRight className="h-3 w-3 text-rose-600" />
                              DÉBITO CANTINA
                            </span>
                          )}
                        </td>
                        <td className={`py-3.5 px-4 text-right font-black ${mov.tipo === 'credito' ? 'text-emerald-600' : 'text-slate-900'}`}>
                          {mov.tipo === 'credito' ? '+' : '-'} R$ {mov.valor.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">{mov.descricao}</td>
                        <td className="py-3.5 px-4 text-slate-400">
                          {mov.criado_por === 'usr-admin' ? 'Secretaria' : 'Terminal Cantina'}
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-400 font-medium">
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900">Rejeitar Recarga Pix</h3>
              <button
                onClick={() => { setIsRejectModalOpen(false); setRejectionReason(""); }}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Descreva o motivo da recusa. Essa justificativa será exibida diretamente no portal da família.
            </p>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <textarea
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="Exemplo: Comprovante de favorecido diferente ou valor divergente..."
                rows={4}
                className="textarea"
                required
              />

              {errorMessage && (
                <div className="text-xs text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200">
                  {errorMessage}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => { setIsRejectModalOpen(false); setRejectionReason(""); }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  size="md"
                  className="flex-1"
                >
                  Confirmar Rejeição
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Adicionar Aluno */}
      {isAddAlunoOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900">Cadastrar Novo Aluno</h3>
              <button
                onClick={() => setIsAddAlunoOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddAlunoSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Nome Completo</label>
                <Input
                  type="text"
                  value={alunoNome}
                  onChange={e => setAlunoNome(e.target.value)}
                  placeholder="Nome do estudante"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Turma</label>
                  <Input
                    type="text"
                    value={alunoTurma}
                    onChange={e => setAlunoTurma(e.target.value)}
                    placeholder="Ex: 6º Ano A"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Registro (RA)</label>
                  <Input
                    type="text"
                    value={alunoRa}
                    onChange={e => setAlunoRa(e.target.value)}
                    placeholder="123456-7"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Vincular Responsável</label>
                <select
                  value={alunoResponsavelId}
                  onChange={e => setAlunoResponsavelId(e.target.value)}
                  className="select"
                >
                  <option value="">Nenhum / Cadastrar sem vínculo</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.nome} ({p.email})</option>
                  ))}
                </select>
              </div>

              {errorMessage && (
                <div className="text-xs text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200">
                  {errorMessage}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setIsAddAlunoOpen(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="brand"
                  size="md"
                  className="flex-1"
                >
                  Cadastrar Aluno
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Adicionar/Editar Produto */}
      {isAddProdutoOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900">
                {selectedProduto ? "Editar Item do Cardápio" : "Adicionar Item ao Cardápio"}
              </h3>
              <button
                onClick={() => setIsAddProdutoOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduto} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Nome do Item</label>
                <Input
                  type="text"
                  value={produtoNome}
                  onChange={e => setProdutoNome(e.target.value)}
                  placeholder="Ex: Salgado Assado, Suco Natural..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Preço (R$)</label>
                  <Input
                    type="text"
                    value={produtoPreco}
                    onChange={e => setProdutoPreco(e.target.value)}
                    placeholder="Ex: 6,50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Categoria</label>
                  <select
                    value={produtoCategoria}
                    onChange={e => setProdutoCategoria(e.target.value as any)}
                    className="select"
                  >
                    <option value="salgado">Salgado</option>
                    <option value="bebida">Bebida</option>
                    <option value="doce">Doce</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Disponibilidade</label>
                <select
                  value={produtoAtivo ? "ativo" : "inativo"}
                  onChange={e => setProdutoAtivo(e.target.value === "ativo")}
                  className="select"
                >
                  <option value="ativo">Ativo (visível no terminal da cantina)</option>
                  <option value="inativo">Inativo (oculto)</option>
                </select>
              </div>

              {errorMessage && (
                <div className="text-xs text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200">
                  {errorMessage}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setIsAddProdutoOpen(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="brand"
                  size="md"
                  className="flex-1"
                >
                  Salvar Item
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
