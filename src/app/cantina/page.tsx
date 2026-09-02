"use client";

import { useState, useEffect } from "react";
import { DBService, Aluno, Movimentacao, Produto } from "@/services/db";
import Header from "../components/Header";
import { PageHeader } from "../components/ui/PageHeader";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { EmptyState } from "../components/ui/EmptyState";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  CheckCircle2,
  AlertTriangle,
  Store,
  Clock,
  X,
  Camera
} from "lucide-react";

export default function CantinaTerminal() {
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Data States
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [recentSales, setRecentSales] = useState<Movimentacao[]>([]);

  // Checkout States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAluno, setSelectedAluno] = useState<Aluno | null>(null);
  const [chargeAmount, setChargeAmount] = useState("");
  const [chargeDesc, setChargeDesc] = useState("");
  const [cart, setCart] = useState<{ produto: Produto; qtd: number }[]>([]);

  // UI feedback states
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // QR Code Scanner states
  const [isScanning, setIsScanning] = useState(false);

  const playSuccessBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.12);
    } catch (e) {
      console.log("AudioContext not supported or blocked by browser", e);
    }
  };

  const handleQrScanSuccess = (alunoId: string) => {
    playSuccessBeep();
    const student = alunos.find(a => a.id === alunoId);
    if (student) {
      handleSelectAluno(student);
      setSuccessMsg(`Estudante ${student.nome} identificado com sucesso!`);
      setIsScanning(false);
    } else {
      setErrorMsg("QR Code inválido ou estudante não cadastrado.");
      setIsScanning(false);
    }
  };

  useEffect(() => {
    if (!isScanning) return;

    let html5QrCode: any;

    import("html5-qrcode").then((module) => {
      const Html5Qrcode = module.Html5Qrcode;
      html5QrCode = new Html5Qrcode("reader");

      html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 220, height: 220 }
        },
        (decodedText: string) => {
          handleQrScanSuccess(decodedText);
          html5QrCode.stop().catch((err: any) => console.error(err));
        },
        () => {}
      ).catch((err: any) => {
        console.error("Erro ao iniciar a câmera para QR Code:", err);
      });
    }).catch((err) => {
      console.error("Erro ao carregar módulo html5-qrcode:", err);
    });

    return () => {
      if (html5QrCode) {
        try {
          html5QrCode.stop().catch(() => {});
        } catch (e) {}
      }
    };
  }, [isScanning, alunos]);

  useEffect(() => {
    const user = DBService.getCurrentUser();
    if (!user || (user.role !== 'cantina' && user.role !== 'admin' && user.role !== 'gestao')) {
      window.location.href = "/";
      return;
    }
    setCurrentUser(user);
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const allAlunos = await DBService.getAlunos();
      setAlunos(allAlunos);
      const allProds = await DBService.getProdutos();
      setProdutos(allProds.filter(p => p.ativo));
      const allMovs = await DBService.getMovimentacoes();
      setRecentSales(allMovs.filter(m => m.tipo === 'debito').reverse().slice(0, 10));
    } catch (err) {
      console.error("Erro ao carregar dados da cantina:", err);
    }
  };

  const handleSelectAluno = (aluno: Aluno) => {
    setSelectedAluno(aluno);
    setSearchQuery("");
    setChargeAmount("");
    setChargeDesc("");
    setCart([]);
    setSuccessMsg("");
    setErrorMsg("");
  };

  const addToCart = (produto: Produto) => {
    setCart(prev => {
      const existing = prev.find(item => item.produto.id === produto.id);
      let updated;
      if (existing) {
        updated = prev.map(item =>
          item.produto.id === produto.id ? { ...item, qtd: item.qtd + 1 } : item
        );
      } else {
        updated = [...prev, { produto, qtd: 1 }];
      }
      updateFormFromCart(updated);
      return updated;
    });
  };

  const removeFromCart = (produtoId: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.produto.id === produtoId);
      if (!existing) return prev;
      let updated;
      if (existing.qtd > 1) {
        updated = prev.map(item =>
          item.produto.id === produtoId ? { ...item, qtd: item.qtd - 1 } : item
        );
      } else {
        updated = prev.filter(item => item.produto.id !== produtoId);
      }
      updateFormFromCart(updated);
      return updated;
    });
  };

  const clearCart = () => {
    setCart([]);
    setChargeAmount("");
    setChargeDesc("");
  };

  const updateFormFromCart = (currentCart: { produto: Produto; qtd: number }[]) => {
    const total = currentCart.reduce((sum, item) => sum + item.produto.preco * item.qtd, 0);
    const desc = currentCart.map(item => `${item.qtd}x ${item.produto.nome}`).join(", ");
    setChargeAmount(total > 0 ? total.toFixed(2) : "");
    setChargeDesc(desc);
  };

  const handleChargeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAluno) return;

    const amount = parseFloat(chargeAmount.replace(",", "."));
    if (isNaN(amount) || amount <= 0) {
      setErrorMsg("Informe um valor de débito válido.");
      return;
    }

    if (!chargeDesc.trim()) {
      setErrorMsg("Informe os itens da compra.");
      return;
    }

    try {
      await DBService.registrarConsumo(
        selectedAluno.id,
        amount,
        chargeDesc
      );

      setSuccessMsg(`Débito de R$ ${amount.toFixed(2)} registrado com sucesso!`);
      setChargeAmount("");
      setChargeDesc("");
      setCart([]);
      setErrorMsg("");

      await loadData();

      const updatedAlunos = await DBService.getAlunos();
      const updatedAluno = updatedAlunos.find(a => a.id === selectedAluno.id);
      if (updatedAluno) {
        setSelectedAluno(updatedAluno);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao efetuar débito.");
    }
  };

  const filteredAlunos = searchQuery.trim() === ""
    ? []
    : alunos.filter(a =>
        a.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.ra.includes(searchQuery) ||
        a.turma.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 5);

  return (
    <div className="flex-1 bg-[--bg-base] text-slate-800 min-h-screen">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <PageHeader
          title="Terminal de Caixa"
          description="Ponto de venda com identificação por QR Code e lançamento instantâneo de consumo."
          badge={
            <Badge variant="brand" dot>
              Caixa Ativo
            </Badge>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LADO ESQUERDO: SELEÇÃO E VENDA */}
          <div className="lg:col-span-2 space-y-6">

            {/* 1. Busca / Identificação do Aluno */}
            <div className="bg-white rounded-3xl p-6 shadow-xs relative">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-extrabold text-[#101828] flex items-center gap-2.5">
                  <span className="h-7 w-7 rounded-full bg-[#101828] text-white text-xs font-black flex items-center justify-center">1</span>
                  Identificar Estudante ou Servidor
                </h3>
                {selectedAluno && (
                  <button
                    type="button"
                    onClick={() => setSelectedAluno(null)}
                    className="text-xs font-bold text-slate-500 hover:text-red-600 cursor-pointer transition-colors"
                  >
                    Trocar Aluno
                  </button>
                )}
              </div>

              <div className="flex gap-2.5">
                <div className="relative flex-1">
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Digite o nome, turma ou RA..."
                    leftIcon={<Search className="h-4 w-4" />}
                    rightIcon={
                      searchQuery ? (
                        <button onClick={() => setSearchQuery("")} className="hover:text-slate-700">
                          <X className="h-4 w-4" />
                        </button>
                      ) : null
                    }
                  />

                  {/* Resultados da Busca */}
                  {filteredAlunos.length > 0 && (
                    <div className="absolute left-0 right-0 mt-2 bg-white rounded-3xl shadow-xl z-20 overflow-hidden divide-y divide-slate-100 animate-fade-in border border-black/5">
                      {filteredAlunos.map(aluno => (
                        <button
                          key={aluno.id}
                          onClick={() => handleSelectAluno(aluno)}
                          className="w-full text-left p-4 hover:bg-[#EBF9FD] transition-colors flex justify-between items-center cursor-pointer text-xs"
                        >
                          <div className="space-y-0.5">
                            <span className="font-extrabold text-[#101828] block text-sm">{aluno.nome}</span>
                            <span className="text-slate-400">RA: {aluno.ra} • Turma: {aluno.turma}</span>
                          </div>
                          <span className="font-black text-emerald-700 bg-[#F0FCEE] px-3.5 py-1.5 rounded-full text-xs">
                            R$ {aluno.saldo.toFixed(2)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => { setIsScanning(true); setSuccessMsg(""); setErrorMsg(""); }}
                  className="px-5 py-2.5 rounded-2xl bg-[#FFCD20] text-[#713F12] font-black text-xs hover:bg-[#FACC15] transition-all flex items-center gap-2 shrink-0 cursor-pointer shadow-2xs active:scale-95"
                >
                  <Camera className="h-4 w-4 text-[#854D0E]" />
                  <span className="hidden sm:inline">Escanear</span> QR
                </button>
              </div>

              {searchQuery.trim() !== "" && filteredAlunos.length === 0 && (
                <p className="mt-2 text-xs text-slate-400 italic">
                  Nenhum estudante encontrado com o termo digitado.
                </p>
              )}
            </div>

            {/* Aluno Selecionado e Carrinho */}
            {selectedAluno ? (
              <div className="bg-white rounded-3xl p-7 shadow-xs space-y-7 animate-fade-in">

                {/* Banner de Dados do Aluno em Superfície Pastel */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 bg-[#EBF9FD] rounded-3xl gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-white text-[#0284C7] font-black flex items-center justify-center text-xl shadow-xs shrink-0 overflow-hidden">
                      {selectedAluno.foto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={selectedAluno.foto} alt={selectedAluno.nome} className="h-full w-full object-cover" />
                      ) : (
                        selectedAluno.nome.charAt(0)
                      )}
                    </div>
                    <div>
                      <h4 className="font-black text-lg text-[#0C4A6E] leading-tight">{selectedAluno.nome}</h4>
                      <p className="text-xs text-[#075985] mt-1 font-medium">
                        Turma: <strong className="text-[#0C4A6E]">{selectedAluno.turma}</strong> • RA: {selectedAluno.ra}
                      </p>
                    </div>
                  </div>

                  <div className="text-right flex sm:flex-col justify-between w-full sm:w-auto items-center sm:items-end border-t sm:border-0 border-sky-200/50 pt-3 sm:pt-0">
                    <span className="text-[10px] text-[#075985] uppercase font-black tracking-widest">Saldo Disponível</span>
                    <span className="text-3xl font-black text-[#101828]">R$ {selectedAluno.saldo.toFixed(2)}</span>
                  </div>
                </div>

                {/* 2. Selecionar Itens */}
                <div className="space-y-5">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-extrabold text-[#101828] flex items-center gap-2.5">
                      <span className="h-7 w-7 rounded-full bg-[#101828] text-white text-xs font-black flex items-center justify-center">2</span>
                      Escolha os Produtos no Cardápio
                    </h3>
                  </div>

                  {/* Categorias e Produtos */}
                  <div className="space-y-4">
                    {['salgado', 'bebida', 'doce', 'outro'].map(cat => {
                      const catProds = produtos.filter(p => p.categoria === cat);
                      if (catProds.length === 0) return null;

                      const catStyles = {
                        salgado: { label: "Salgados", bg: "bg-[#FFFCE8] hover:bg-[#FEF08A]/40", text: "text-[#713F12]" },
                        bebida: { label: "Bebidas", bg: "bg-[#EBF9FD] hover:bg-[#BAE6FD]/40", text: "text-[#075985]" },
                        doce: { label: "Doces", bg: "bg-[#FFF0F8] hover:bg-[#FBCFE8]/40", text: "text-[#831843]" },
                        outro: { label: "Outros", bg: "bg-[#F0FCEE] hover:bg-[#BBF7D0]/40", text: "text-[#14532D]" },
                      }[cat as 'salgado' | 'bebida' | 'doce' | 'outro'];

                      return (
                        <div key={cat} className="space-y-2.5">
                          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                            {catStyles.label}
                          </span>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {catProds.map(prod => (
                              <button
                                key={prod.id}
                                type="button"
                                onClick={() => addToCart(prod)}
                                className={`${catStyles.bg} rounded-3xl p-4 text-left transition-all cursor-pointer flex flex-col justify-between h-24 shadow-2xs hover:shadow-md active:scale-95`}
                              >
                                <span className={`font-extrabold text-xs leading-snug line-clamp-2 ${catStyles.text}`}>{prod.nome}</span>
                                <span className="font-black text-sm text-[#101828] mt-2">R$ {prod.preco.toFixed(2)}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Resumo do Carrinho */}
                  {cart.length > 0 && (
                    <div className="bg-[#FFF0F8] rounded-3xl p-5 space-y-4 animate-fade-in">
                      <div className="flex justify-between items-center pb-2 border-b border-pink-200/50">
                        <span className="text-xs font-black text-[#831843] flex items-center gap-2">
                          <ShoppingCart className="h-4 w-4 text-[#DB2777]" />
                          Itens Selecionados ({cart.reduce((s, i) => s + i.qtd, 0)})
                        </span>
                        <button
                          type="button"
                          onClick={clearCart}
                          className="text-[11px] font-bold text-[#DB2777] hover:underline cursor-pointer"
                        >
                          Limpar Carrinho
                        </button>
                      </div>

                      <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                        {cart.map(item => (
                          <div key={item.produto.id} className="flex justify-between items-center text-xs">
                            <span className="font-bold text-[#831843]">{item.produto.nome}</span>
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-[#831843] font-black">
                                R$ {(item.produto.preco * item.qtd).toFixed(2)}
                              </span>
                              <div className="flex items-center gap-1 bg-white rounded-full p-1 shadow-2xs">
                                <button
                                  type="button"
                                  onClick={() => removeFromCart(item.produto.id)}
                                  className="w-6 h-6 flex items-center justify-center text-slate-700 hover:bg-slate-100 rounded-full cursor-pointer transition-colors"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="w-5 text-center font-black text-[#101828]">{item.qtd}</span>
                                <button
                                  type="button"
                                  onClick={() => addToCart(item.produto)}
                                  className="w-6 h-6 flex items-center justify-center text-slate-700 hover:bg-slate-100 rounded-full cursor-pointer transition-colors"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Formulário de Registro de Débito */}
                  <form onSubmit={handleChargeSubmit} className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                          Total (R$)
                        </label>
                        <Input
                          type="text"
                          value={chargeAmount}
                          onChange={e => setChargeAmount(e.target.value)}
                          placeholder="0,00"
                          className="font-black text-lg text-[#101828]"
                          required
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                          Descrição do Consumo
                        </label>
                        <Input
                          type="text"
                          value={chargeDesc}
                          onChange={e => setChargeDesc(e.target.value)}
                          placeholder="Ex: Salgado Assado + Suco..."
                          required
                        />
                      </div>
                    </div>

                    {/* Feedbacks */}
                    {errorMsg && (
                      <div className="text-xs text-rose-700 bg-rose-50 p-3.5 rounded-2xl border border-rose-200 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                        <span>{errorMsg}</span>
                      </div>
                    )}

                    {successMsg && (
                      <div className="text-xs text-emerald-700 bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>{successMsg}</span>
                      </div>
                    )}

                    {/* Ações */}
                    <div className="flex gap-3 pt-3">
                      <button
                        type="button"
                        onClick={() => setSelectedAluno(null)}
                        className="flex-1 py-4 px-6 rounded-full text-xs font-bold text-slate-600 bg-[#F7F6F3] hover:bg-slate-200 transition-colors cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="flex-2 py-4 px-6 rounded-full text-sm font-black text-white bg-[#101828] hover:bg-[#1E293B] shadow-md transition-all active:scale-98 cursor-pointer"
                      >
                        Confirmar Débito R$ {parseFloat(chargeAmount || "0").toFixed(2)}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ) : (
              <EmptyState
                icon={<Store className="h-8 w-8 text-slate-400" />}
                title="Aguardando identificação"
                description="Busque pelo nome, turma ou leia o QR Code da carteirinha do estudante para abrir o caixa."
              />
            )}
          </div>

          {/* LADO DIREITO: VENDAS DO TURNO */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5 sticky top-24">
              <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                <div>
                  <h4 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-400" />
                    Vendas do Turno
                  </h4>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">Últimos débitos realizados no caixa</p>
                </div>
                <Badge variant="neutral">{recentSales.length}</Badge>
              </div>

              <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                {recentSales.length === 0 ? (
                  <p className="text-center py-12 text-slate-400 text-xs italic">
                    Nenhuma venda realizada neste turno.
                  </p>
                ) : (
                  recentSales.map(sale => {
                    const aluno = alunos.find(a => a.id === sale.aluno_id);
                    return (
                      <div
                        key={sale.id}
                        className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl flex justify-between items-center text-xs hover:bg-slate-100/60 transition-colors"
                      >
                        <div className="space-y-0.5">
                          <strong className="text-slate-900 block font-bold">{aluno?.nome || "Excluído"}</strong>
                          <span className="text-slate-500 block text-[11px] truncate max-w-[160px]">{sale.descricao}</span>
                          <span className="text-[10px] text-slate-400 font-medium block">
                            {new Date(sale.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <span className="font-black text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200 whitespace-nowrap">
                          - R$ {sale.valor.toFixed(2)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal Leitor QR Code */}
      {isScanning && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Camera className="h-4 w-4 text-red-600" />
                Leitor de Carteirinha Digital
              </h3>
              <button
                onClick={() => setIsScanning(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Área da Câmera */}
            <div className="relative w-full h-64 bg-slate-950 rounded-2xl overflow-hidden mx-auto shadow-inner border border-slate-800 flex items-center justify-center">
              <div id="reader" className="w-full h-full object-cover"></div>

              {/* HUD do Scanner */}
              <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-red-500/40 rounded-2xl m-4 flex items-center justify-center">
                <div className="w-[75%] h-[75%] border border-red-500/30 rounded-xl relative overflow-hidden">
                  <div className="absolute left-0 right-0 h-[2px] bg-red-500 shadow-[0_0_10px_rgba(239,68,68,1)] top-0 animate-bounce" style={{ animationDuration: '3s' }} />
                </div>
              </div>
            </div>

            {/* Simulação Rápida para Testes e QA */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-center space-y-2">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                Simulação Rápida (Teste sem câmera)
              </span>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {alunos.slice(0, 4).map(aluno => (
                  <button
                    key={aluno.id}
                    type="button"
                    onClick={() => handleQrScanSuccess(aluno.id)}
                    className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 py-1 px-2.5 rounded-xl text-[10px] font-bold shadow-2xs transition-colors cursor-pointer"
                  >
                    {aluno.nome.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setIsScanning(false)}
              className="w-full"
            >
              Cancelar Leitura
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
