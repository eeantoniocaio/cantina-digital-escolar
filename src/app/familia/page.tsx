"use client";

import { useState, useEffect, useRef } from "react";
import { DBService, Aluno, Comprovante, DADOS_PIX_ESCOLA } from "@/services/db";
import { OCRService, OCRResult } from "@/services/ocr";

export default function FamiliaDashboard() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [comprovantes, setComprovantes] = useState<Comprovante[]>([]);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const user = DBService.getCurrentUser();
    if (!user || user.role !== 'familia') {
      window.location.href = "/";
      return;
    }
    setCurrentUser(user);
    loadData(user.id);
  }, []);

  const loadData = (userId: string) => {
    setAlunos(DBService.getAlunosByResponsavel(userId));
    setComprovantes(DBService.getComprovantes().filter(c => c.responsavel_id === userId));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setErrorMessage("");

      // Gerar preview do arquivo
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Rodar simulador de OCR
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

      DBService.uploadComprovante({
        alunoId: selectedAlunoId,
        responsavelId: currentUser.id,
        valor,
        pagador: manualPagador || "Não identificado",
        dataPagamento: new Date().toISOString(),
        idTransacao: manualTransacao || "MANUAL-" + Math.random().toString(36).substr(2, 9),
        arquivoUrl: filePreview || "https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=500",
        hashComprovante: hash
      });

      // Reset
      setIsUploadOpen(false);
      setSelectedFile(null);
      setFilePreview(null);
      setOcrData(null);
      setSelectedAlunoId("");
      setErrorMessage("");
      
      // Recarregar dados
      loadData(currentUser.id);
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
    <div className="flex-1 bg-slate-950 text-slate-100 min-h-screen">
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-violet-400 to-indigo-300 bg-clip-text text-transparent">
              Cantina Digital
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
              Família
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400 hidden sm:inline">Olá, <strong>{currentUser?.nome}</strong></span>
            <a href="/" className="text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700 transition-colors">
              Sair
            </a>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Filhos e Saldos */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
              <span>👤</span> Seus Alunos / Dependentes
            </h2>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-2 shadow-lg shadow-violet-500/10 active:scale-95 cursor-pointer"
            >
              <span>💳</span> Enviar Pix / Recarga
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {alunos.map(aluno => (
              <div 
                key={aluno.id}
                className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800/80 rounded-2xl p-6 relative overflow-hidden shadow-md"
              >
                <div className="absolute top-0 right-0 p-6">
                  <span className="text-xs font-bold text-slate-500 bg-slate-800/50 px-2.5 py-1 rounded-full border border-slate-800 uppercase">
                    {aluno.turma}
                  </span>
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-full bg-violet-500/20 text-violet-400 font-bold flex items-center justify-center text-lg">
                    {aluno.nome.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-100">{aluno.nome}</h3>
                    <p className="text-xs text-slate-400">RA: {aluno.ra}</p>
                  </div>
                </div>

                <div className="mt-6 border-t border-slate-800/60 pt-4 flex items-center justify-between">
                  <span className="text-sm text-slate-400">Saldo da Cantina</span>
                  <span className="text-2xl font-black text-emerald-400">
                    R$ {aluno.saldo.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Histórico de Comprovantes */}
        <section>
          <h2 className="text-xl font-bold tracking-tight text-slate-100 mb-6 flex items-center gap-2">
            <span>🕒</span> Histórico de Envios
          </h2>

          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
            {comprovantes.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                Nenhum comprovante enviado ainda. Faça um Pix para começar!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs text-slate-400 uppercase tracking-wider bg-slate-950/40">
                      <th className="py-4 px-6">Aluno</th>
                      <th className="py-4 px-6">Valor</th>
                      <th className="py-4 px-6">Identificação / Pix</th>
                      <th className="py-4 px-6">Enviado em</th>
                      <th className="py-4 px-6">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 text-sm text-slate-300">
                    {comprovantes.map(comp => {
                      const aluno = alunos.find(a => a.id === comp.aluno_id);
                      return (
                        <tr key={comp.id} className="hover:bg-slate-800/10 transition-colors">
                          <td className="py-4 px-6 font-semibold text-slate-200">
                            {aluno ? aluno.nome : "Desconhecido"}
                          </td>
                          <td className="py-4 px-6 font-bold text-emerald-400">
                            R$ {comp.valor.toFixed(2)}
                          </td>
                          <td className="py-4 px-6">
                            <div className="text-xs text-slate-400 font-mono">
                              ID: {comp.id_transacao ? comp.id_transacao.substring(0, 16) + '...' : 'Pendente'}
                            </div>
                            <div className="text-xs text-slate-500">
                              Pagador: {comp.pagador}
                            </div>
                          </td>
                          <td className="py-4 px-6 text-xs text-slate-400">
                            {new Date(comp.criado_em).toLocaleDateString('pt-BR')} às {new Date(comp.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-4 px-6">
                            {comp.status === 'pendente' && (
                              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                🟡 Pendente
                              </span>
                            )}
                            {comp.status === 'aprovado' && (
                              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                🟢 Aprovado
                              </span>
                            )}
                            {comp.status === 'rejeitado' && (
                              <div className="flex flex-col items-start gap-1">
                                <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                                  🔴 Rejeitado
                                </span>
                                {comp.observacao && (
                                  <span className="text-xxs text-red-300/80 italic max-w-xs block">
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
          </div>
        </section>
      </main>

      {/* Modal / Overlay de Envio de Recarga */}
      {isUploadOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-30 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl my-8">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/20">
              <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <span>⚡</span> Nova Recarga PIX
              </h3>
              <button
                onClick={resetForm}
                className="text-slate-400 hover:text-slate-200 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800">
              {/* Coluna 1: Dados Bancários */}
              <div className="p-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                  1. Realize o PIX para a escola
                </h4>
                
                <div className="bg-slate-950 rounded-2xl p-5 border border-slate-800/80 mb-4">
                  <div className="text-xs text-slate-500 mb-1">Chave Pix ({DADOS_PIX_ESCOLA.tipoChave})</div>
                  <div className="text-sm font-mono font-bold text-violet-400 mb-3 select-all">
                    {DADOS_PIX_ESCOLA.chave}
                  </div>
                  
                  <div className="space-y-2 text-xs text-slate-400">
                    <div className="flex justify-between">
                      <span>Beneficiário:</span>
                      <strong className="text-slate-200">{DADOS_PIX_ESCOLA.beneficiario}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Banco:</span>
                      <strong className="text-slate-200">{DADOS_PIX_ESCOLA.banco}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Cidade:</span>
                      <strong className="text-slate-200">{DADOS_PIX_ESCOLA.cidade}</strong>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-slate-500 leading-relaxed bg-violet-500/5 p-3.5 rounded-xl border border-violet-500/10">
                  💡 <strong>Instruções:</strong> Copie a chave acima e faça o pagamento em seu banco de preferência. Em seguida, tire print do comprovante e faça o upload ao lado.
                </div>
              </div>

              {/* Coluna 2: Upload e OCR */}
              <div className="p-6 flex flex-col justify-between">
                <form onSubmit={handleUploadSubmit} className="space-y-4 flex-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    2. Envie o Comprovante
                  </h4>

                  {/* Seleção do Aluno */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                      Para qual aluno é a recarga?
                    </label>
                    <select
                      value={selectedAlunoId}
                      onChange={e => setSelectedAlunoId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-violet-500 text-slate-200"
                      required
                    >
                      <option value="">Selecione o aluno...</option>
                      {alunos.map(a => (
                        <option key={a.id} value={a.id}>{a.nome} ({a.turma})</option>
                      ))}
                    </select>
                  </div>

                  {/* Upload do Arquivo */}
                  {!selectedFile ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-800 hover:border-violet-500/50 rounded-2xl p-8 text-center cursor-pointer hover:bg-violet-500/5 transition-all duration-300 flex flex-col items-center justify-center"
                    >
                      <span className="text-3xl mb-2">📸</span>
                      <span className="text-sm font-semibold text-slate-300">Carregar Imagem do Comprovante</span>
                      <span className="text-xs text-slate-500 mt-1">Aceita PNG, JPG e PDF</span>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*,application/pdf"
                        className="hidden"
                      />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Preview do Comprovante */}
                      <div className="relative rounded-xl border border-slate-800 bg-slate-950 h-32 overflow-hidden flex items-center justify-center">
                        {selectedFile.type.includes("pdf") ? (
                          <div className="text-slate-400 text-xs flex flex-col items-center gap-1">
                            <span className="text-2xl">📄</span>
                            <span>{selectedFile.name}</span>
                          </div>
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={filePreview || ""}
                            alt="Preview do Comprovante"
                            className="object-contain h-full w-full"
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFile(null);
                            setFilePreview(null);
                            setOcrData(null);
                          }}
                          className="absolute top-2 right-2 bg-red-500/80 text-white rounded-full p-1.5 text-xs hover:bg-red-600 transition-colors"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Loading de OCR */}
                      {isProcessingOCR && (
                        <div className="flex items-center justify-center gap-3 p-4 bg-slate-950 rounded-xl border border-slate-800">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-violet-500 border-t-transparent"></div>
                          <span className="text-xs text-slate-400 animate-pulse">IA lendo dados do comprovante...</span>
                        </div>
                      )}

                      {/* Revisão de Dados (OCR e Fallback Manual) */}
                      {ocrData && !isProcessingOCR && (
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                          <div className="text-xxs font-bold text-violet-400 uppercase tracking-wider flex justify-between items-center">
                            <span>📝 Revisar Informações Lidas</span>
                            <span className="text-xxs text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">OCR Sucesso</span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xxs font-semibold text-slate-500 mb-0.5">Valor (R$)</label>
                              <input
                                type="text"
                                value={manualValor}
                                onChange={e => setManualValor(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-100 font-bold focus:outline-none focus:border-violet-500"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-xxs font-semibold text-slate-500 mb-0.5">ID da Transação</label>
                              <input
                                type="text"
                                value={manualTransacao}
                                onChange={e => setManualTransacao(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-300 font-mono focus:outline-none focus:border-violet-500"
                                required
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-xxs font-semibold text-slate-500 mb-0.5">Nome do Pagador (PIX)</label>
                              <input
                                type="text"
                                value={manualPagador}
                                onChange={e => setManualPagador(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-violet-500"
                                required
                              />
                            </div>
                          </div>
                          <div className="text-xxs text-slate-500 leading-normal">
                            ⚠️ Se a IA leu algum campo incorretamente ou não o encontrou, você pode corrigi-lo diretamente nos campos acima antes de enviar.
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {errorMessage && (
                    <div className="text-xs text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                      ⚠️ {errorMessage}
                    </div>
                  )}

                  <div className="border-t border-slate-800/80 pt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold py-2.5 rounded-xl border border-slate-700 transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isProcessingOCR || !selectedFile}
                      className="flex-1 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold py-2.5 rounded-xl transition-all shadow-md shadow-violet-500/10 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Confirmar e Enviar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
