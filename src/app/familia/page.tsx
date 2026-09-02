"use client";

import { useState, useEffect, useRef } from "react";
import { DBService, Aluno, Comprovante, DADOS_PIX_ESCOLA } from "@/services/db";
import { OCRService, OCRResult } from "@/services/ocr";
import Header from "../components/Header";
import { PageHeader } from "../components/ui/PageHeader";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { EmptyState } from "../components/ui/EmptyState";
import {
  Users,
  CreditCard,
  History,
  UploadCloud,
  Copy,
  Check,
  X,
  FileText,
  AlertCircle
} from "lucide-react";

export default function FamiliaDashboard() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [comprovantes, setComprovantes] = useState<Comprovante[]>([]);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);

  // States do Formulário de Upload
  const [selectedAlunoId, setSelectedAlunoId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);

  // OCR result state para revisão
  const [ocrData, setOcrData] = useState<OCRResult | null>(null);
  const [manualValor, setManualValor] = useState("");
  const [manualPagador, setManualPagador] = useState("");
  const [manualTransacao, setManualTransacao] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // States do Perfil do Aluno
  const [selectedAlunoProfile, setSelectedAlunoProfile] = useState<Aluno | null>(null);
  const [alunoConsumo, setAlunoConsumo] = useState<any[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const user = DBService.getCurrentUser();
    if (!user || (user.role !== 'familia' && user.role !== 'admin' && user.role !== 'gestao')) {
      window.location.href = "/";
      return;
    }
    setCurrentUser(user);
    loadData(user.id);
  }, []);

  const loadData = async (userId: string) => {
    try {
      const responsavelAlunos = await DBService.getAlunosByResponsavel(userId);
      setAlunos(responsavelAlunos);
      const allComps = await DBService.getComprovantes();
      setComprovantes(allComps.filter(c => c.responsavel_id === userId));
    } catch (err) {
      console.error("Erro ao carregar dados da família:", err);
    }
  };

  const handleOpenProfile = async (aluno: Aluno) => {
    setSelectedAlunoProfile(aluno);
    try {
      const movimentacoes = await DBService.getMovimentacoes();
      const compras = movimentacoes.filter(m => m.aluno_id === aluno.id && m.tipo === 'debito').reverse();
      setAlunoConsumo(compras);
    } catch (err) {
      console.error("Erro ao carregar movimentações do aluno:", err);
    }
  };

  const handleCloseProfile = () => {
    setSelectedAlunoProfile(null);
    setAlunoConsumo([]);
  };

  const handleRecarregarFromProfile = (alunoId: string) => {
    setSelectedAlunoId(alunoId);
    setSelectedAlunoProfile(null);
    setAlunoConsumo([]);
    setIsUploadOpen(true);
  };

  const handleCopyPix = () => {
    navigator.clipboard.writeText(DADOS_PIX_ESCOLA.chave);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2500);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setErrorMessage("");

      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      setIsProcessingOCR(true);
      setOcrData(null);
      try {
        const result = await OCRService.analisarComprovante(file);
        setOcrData(result);
        setManualValor(result.valor.toFixed(2));
        setManualPagador(result.pagador);
        setManualTransacao(result.id_transacao);
      } catch (err: any) {
        setErrorMessage("Erro ao processar imagem.");
      } finally {
        setIsProcessingOCR(false);
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlunoId) {
      setErrorMessage("Por favor, selecione o aluno.");
      return;
    }
    if (!selectedFile) {
      setErrorMessage("Por favor, envie o comprovante.");
      return;
    }

    try {
      const hash = await OCRService.calcularHashArquivo(selectedFile);
      const valor = parseFloat(manualValor.replace(",", "."));

      if (isNaN(valor) || valor <= 0) {
        setErrorMessage("Valor de recarga inválido.");
        return;
      }

      await DBService.uploadComprovante({
        alunoId: selectedAlunoId,
        responsavelId: currentUser.id,
        valor,
        pagador: manualPagador || "Não identificado",
        dataPagamento: new Date().toISOString(),
        idTransacao: manualTransacao || "MANUAL-" + Math.random().toString(36).substr(2, 9),
        arquivoUrl: filePreview || "https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=500",
        hashComprovante: hash
      });

      setIsUploadOpen(false);
      setSelectedFile(null);
      setFilePreview(null);
      setOcrData(null);
      setSelectedAlunoId("");
      setErrorMessage("");

      await loadData(currentUser.id);
    } catch (err: any) {
      setErrorMessage(err.message || "Erro ao salvar o comprovante.");
    }
  };

  const resetForm = () => {
    setIsUploadOpen(false);
    setSelectedFile(null);
    setFilePreview(null);
    setOcrData(null);
    setSelectedAlunoId("");
    setErrorMessage("");
  };

  return (
    <div className="flex-1 bg-[--bg-base] text-slate-800 min-h-screen">
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-10">
        <PageHeader
          title="Portal da Família"
          description="Acompanhe o saldo dos estudantes, envie recargas Pix e monitore o consumo."
          action={
            <Button
              variant="brand"
              size="md"
              onClick={() => setIsUploadOpen(true)}
              leftIcon={<CreditCard className="h-4 w-4" />}
              className="shadow-xs"
            >
              Recarregar via Pix
            </Button>
          }
        />

        {/* 1. SEÇÃO DE DEPENDENTES */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-[#101828] flex items-center gap-2.5">
              <Users className="h-4 w-4 text-slate-400" />
              Estudantes Vinculados
            </h2>
            <span className="text-xs font-bold text-[#075985] bg-[#EBF9FD] px-3.5 py-1 rounded-full">
              {alunos.length} dependente(s)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {alunos.map((aluno, idx) => {
              // Paleta contextual para cada dependente
              const pastelPalettes = [
                { bg: "bg-[#EBF9FD]", text: "text-[#0C4A6E]", badge: "bg-[#84E2FA]/30 text-[#075985]", avatarBg: "bg-white text-[#0284C7]" },
                { bg: "bg-[#FFF0F8]", text: "text-[#831843]", badge: "bg-[#FF88D3]/30 text-[#9D174D]", avatarBg: "bg-white text-[#DB2777]" },
                { bg: "bg-[#F0FCEE]", text: "text-[#14532D]", badge: "bg-[#A6F686]/35 text-[#166534]", avatarBg: "bg-white text-[#16A34A]" },
                { bg: "bg-[#FFFCE8]", text: "text-[#713F12]", badge: "bg-[#FFCD20]/30 text-[#854D0E]", avatarBg: "bg-white text-[#CA8A04]" },
              ];
              const theme = pastelPalettes[idx % pastelPalettes.length];

              return (
                <div
                  key={aluno.id}
                  onClick={() => handleOpenProfile(aluno)}
                  className={`group text-left ${theme.bg} rounded-3xl p-7 relative overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer hover:-translate-y-0.5`}
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className={`h-14 w-14 rounded-2xl ${theme.avatarBg} font-black flex items-center justify-center text-xl shadow-xs shrink-0 overflow-hidden`}>
                        {aluno.foto ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={aluno.foto} alt={aluno.nome} className="h-full w-full object-cover" />
                        ) : (
                          aluno.nome.charAt(0)
                        )}
                      </div>
                      <div>
                        <h3 className={`font-black text-lg ${theme.text} leading-tight`}>
                          {aluno.nome}
                        </h3>
                        <p className="text-xs opacity-75 mt-0.5 font-mono">RA: {aluno.ra}</p>
                      </div>
                    </div>
                    <span className={`text-[11px] font-black uppercase px-3 py-1 rounded-full ${theme.badge}`}>
                      {aluno.turma}
                    </span>
                  </div>

                  <div className="mt-6 pt-5 border-t border-black/5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-60 block">Saldo Atual</span>
                      <span className="text-3xl font-black text-[#101828]">
                        R$ {aluno.saldo.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRecarregarFromProfile(aluno.id);
                        }}
                        className="px-4 py-2.5 rounded-full bg-[#101828] text-white hover:bg-[#1E293B] text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                        Recarregar Pix
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 2. HISTÓRICO DE COMPROVANTES ENVIADOS */}
        <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <History className="h-4 w-4 text-slate-400" />
                Histórico de Recargas Pix
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Status de conferência dos comprovantes enviados</p>
            </div>
            <Badge variant="neutral">{comprovantes.length} comprovantes</Badge>
          </div>

          {comprovantes.length === 0 ? (
            <EmptyState
              icon={<CreditCard className="h-7 w-7 text-slate-300" />}
              title="Nenhuma recarga enviada"
              description="Quando você fizer um Pix e enviar o comprovante, poderá acompanhar a aprovação aqui."
              action={
                <Button variant="brand" size="md" onClick={() => setIsUploadOpen(true)}>
                  Fazer Primeira Recarga
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Estudante</th>
                    <th className="py-3 px-4 text-right">Valor</th>
                    <th className="py-3 px-4">Identificação / Transação</th>
                    <th className="py-3 px-4">Data do Envio</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {comprovantes.map(comp => {
                    const aluno = alunos.find(a => a.id === comp.aluno_id);
                    return (
                      <tr key={comp.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {aluno ? aluno.nome : "Aluno"}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-emerald-600">
                          R$ {comp.valor.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-[11px] text-slate-600 font-mono">
                            ID: {comp.id_transacao ? comp.id_transacao.substring(0, 16) + '...' : 'Pendente'}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Pagador: {comp.pagador}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 font-medium">
                          {new Date(comp.criado_em).toLocaleDateString('pt-BR')} às {new Date(comp.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {comp.status === 'pendente' && (
                            <Badge variant="warning" dot>
                              Aguardando Secretaria
                            </Badge>
                          )}
                          {comp.status === 'aprovado' && (
                            <Badge variant="success" dot>
                              Creditado no Saldo
                            </Badge>
                          )}
                          {comp.status === 'rejeitado' && (
                            <div className="flex flex-col items-end gap-1">
                              <Badge variant="danger" dot>
                                Recusado
                              </Badge>
                              {comp.observacao && (
                                <span className="text-[10px] text-rose-600 italic max-w-xs block text-right">
                                  Motivo: {comp.observacao}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* MODAL DE RECARGA PIX + OCR */}
      {isUploadOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl my-8">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-red-600" />
                Nova Recarga Pix
              </h3>
              <button
                onClick={resetForm}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
              {/* Coluna 1: Dados do Pix Escolar */}
              <div className="p-6 space-y-4">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  1. Realize o Pix para a Escola
                </h4>

                <div className="bg-[#FFFCE8] rounded-3xl p-5 space-y-3">
                  <div>
                    <span className="text-[10px] text-[#713F12] font-black uppercase tracking-widest block">
                      Chave Pix ({DADOS_PIX_ESCOLA.tipoChave})
                    </span>
                    <div className="flex items-center justify-between mt-1 bg-white p-3 rounded-2xl shadow-2xs">
                      <span className="text-xs font-mono font-black text-[#991B1B] truncate mr-2 select-all">
                        {DADOS_PIX_ESCOLA.chave}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyPix}
                        className="text-slate-600 hover:text-[#101828] p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                        title="Copiar Chave Pix"
                      >
                        {copiedPix ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-[#713F12] border-t border-amber-200/50 pt-3">
                    <div className="flex justify-between">
                      <span className="opacity-75">Beneficiário:</span>
                      <strong className="text-[#101828] font-bold">{DADOS_PIX_ESCOLA.beneficiario}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-75">Banco:</span>
                      <strong className="text-[#101828] font-bold">{DADOS_PIX_ESCOLA.banco}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-75">Cidade:</span>
                      <strong className="text-[#101828] font-bold">{DADOS_PIX_ESCOLA.cidade}</strong>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-slate-600 bg-[#EBF9FD] p-4 rounded-3xl leading-relaxed space-y-1">
                  <p className="font-black text-[#0C4A6E] flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 text-[#0284C7] shrink-0" />
                    Como funciona:
                  </p>
                  <p className="text-[11px] text-[#075985] font-medium">
                    Copie a chave Pix acima, efetue o pagamento no app do seu banco, tire print do comprovante e faça o upload ao lado.
                  </p>
                </div>
              </div>

              {/* Coluna 2: Upload do Comprovante e Leitor OCR */}
              <div className="p-6 flex flex-col justify-between">
                <form onSubmit={handleUploadSubmit} className="space-y-4 flex-1">
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                    2. Enviar Comprovante
                  </h4>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">
                      Para qual estudante é o crédito?
                    </label>
                    <select
                      value={selectedAlunoId}
                      onChange={e => setSelectedAlunoId(e.target.value)}
                      className="select"
                      required
                    >
                      <option value="">Selecione o estudante...</option>
                      {alunos.map(a => (
                        <option key={a.id} value={a.id}>{a.nome} ({a.turma})</option>
                      ))}
                    </select>
                  </div>

                  {!selectedFile ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-200 hover:border-[#101828] rounded-3xl p-8 text-center cursor-pointer hover:bg-slate-50 transition-all flex flex-col items-center justify-center space-y-2"
                    >
                      <div className="h-12 w-12 rounded-2xl bg-[#FFF0F8] text-[#DB2777] flex items-center justify-center">
                        <UploadCloud className="h-6 w-6" />
                      </div>
                      <span className="text-xs font-black text-[#101828]">Carregar Foto ou PDF do Comprovante</span>
                      <span className="text-[10px] text-slate-400">Formatos aceitos: JPG, PNG e PDF</span>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*,application/pdf"
                        className="hidden"
                      />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="relative rounded-2xl border border-slate-200 bg-slate-50 h-32 overflow-hidden flex items-center justify-center">
                        {selectedFile.type.includes("pdf") ? (
                          <div className="text-slate-500 text-xs flex flex-col items-center gap-1">
                            <FileText className="h-8 w-8 text-slate-400" />
                            <span className="font-mono text-[11px]">{selectedFile.name}</span>
                          </div>
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={filePreview || ""}
                            alt="Preview do Comprovante"
                            className="object-contain h-full w-full p-2"
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFile(null);
                            setFilePreview(null);
                            setOcrData(null);
                          }}
                          className="absolute top-2 right-2 bg-[#101828] text-white rounded-full p-1 text-xs hover:bg-red-600 transition-colors cursor-pointer shadow-xs"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {isProcessingOCR && (
                        <div className="flex items-center justify-center gap-2.5 p-3.5 bg-[#EBF9FD] rounded-2xl">
                          <div className="h-4 w-4 rounded-full border-2 border-[#0284C7] border-t-transparent animate-spin" />
                          <span className="text-xs text-[#075985] font-bold animate-pulse">
                            Identificando dados do Pix...
                          </span>
                        </div>
                      )}

                      {ocrData && !isProcessingOCR && (
                        <div className="bg-[#F0FCEE] p-4 rounded-2xl space-y-3 animate-fade-in">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-[#14532D] uppercase tracking-widest">
                              Dados Confirmados
                            </span>
                            <span className="text-[10px] font-black bg-emerald-200 text-[#14532D] px-2.5 py-0.5 rounded-full">
                              Leitura Concluída
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2.5">
                            <div>
                              <label className="block text-[10px] font-bold text-[#14532D] mb-1">Valor (R$)</label>
                              <Input
                                type="text"
                                value={manualValor}
                                onChange={e => setManualValor(e.target.value)}
                                className="font-black bg-white"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-[#14532D] mb-1">ID da Transação</label>
                              <Input
                                type="text"
                                value={manualTransacao}
                                onChange={e => setManualTransacao(e.target.value)}
                                className="font-mono text-xs bg-white"
                                required
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-[10px] font-bold text-[#14532D] mb-1">Nome do Pagador</label>
                              <Input
                                type="text"
                                value={manualPagador}
                                onChange={e => setManualPagador(e.target.value)}
                                className="bg-white"
                                required
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {errorMessage && (
                    <div className="text-xs text-rose-700 bg-rose-50 p-3.5 rounded-2xl border border-rose-200">
                      {errorMessage}
                    </div>
                  )}

                  <div className="border-t border-slate-100 pt-4 flex gap-2.5">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="flex-1 py-3 px-5 rounded-full text-xs font-bold text-slate-600 bg-[#F7F6F3] hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isProcessingOCR || !selectedFile}
                      className="flex-1 py-3 px-5 rounded-full text-xs font-black text-white bg-[#101828] hover:bg-[#1E293B] transition-colors cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Enviar Comprovante
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALHES DO ESTUDANTE */}
      {selectedAlunoProfile && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-8 space-y-6 p-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-400" />
                Perfil do Estudante
              </h3>
              <button
                onClick={handleCloseProfile}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Coluna 1: Dados e QR */}
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="h-20 w-20 rounded-full bg-red-100 text-red-700 font-black flex items-center justify-center text-2xl border-2 border-red-200 shadow-xs">
                  {selectedAlunoProfile.foto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={selectedAlunoProfile.foto} alt={selectedAlunoProfile.nome} className="h-full w-full object-cover rounded-full" />
                  ) : (
                    selectedAlunoProfile.nome.charAt(0)
                  )}
                </div>

                <div>
                  <h4 className="font-extrabold text-base text-slate-900 leading-tight">
                    {selectedAlunoProfile.nome}
                  </h4>
                  <Badge variant="brand" className="mt-1.5">{selectedAlunoProfile.turma}</Badge>
                  <p className="text-xs text-slate-400 font-mono mt-1">RA: {selectedAlunoProfile.ra}</p>
                </div>

                <div className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Saldo Atual</span>
                  <span className="text-2xl font-black text-emerald-600">R$ {selectedAlunoProfile.saldo.toFixed(2)}</span>
                </div>

                <div className="w-full pt-2">
                  <Button
                    variant="brand"
                    size="md"
                    onClick={() => handleRecarregarFromProfile(selectedAlunoProfile.id)}
                    leftIcon={<CreditCard className="h-4 w-4" />}
                    className="w-full"
                  >
                    Fazer Recarga Pix
                  </Button>
                </div>
              </div>

              {/* Coluna 2: Consumo */}
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                    Últimos Consumos
                  </h4>
                  <Badge variant="neutral">{alunoConsumo.length}</Badge>
                </div>

                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {alunoConsumo.length === 0 ? (
                    <EmptyState
                      icon={<History className="h-6 w-6 text-slate-300" />}
                      title="Nenhum consumo registrado"
                      description="As compras realizadas no caixa da cantina aparecerão aqui."
                    />
                  ) : (
                    alunoConsumo.map(comp => (
                      <div
                        key={comp.id}
                        className="p-3 bg-slate-50 rounded-2xl border border-slate-200/60 flex justify-between items-center text-xs"
                      >
                        <div className="space-y-0.5">
                          <strong className="text-slate-900 block font-bold">{comp.descricao}</strong>
                          <span className="text-[10px] text-slate-400 block font-medium">
                            {new Date(comp.criado_em).toLocaleDateString('pt-BR')} às {new Date(comp.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                          - R$ {comp.valor.toFixed(2)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
