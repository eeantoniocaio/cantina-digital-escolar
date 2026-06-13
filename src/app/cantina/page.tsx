"use client";

import { useState, useEffect } from "react";
import { DBService, Aluno, Movimentacao, Produto } from "@/services/db";

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
      setSuccessMsg(`Aluno ${student.nome} identificado via QR Code!`);
      setIsScanning(false);
    } else {
      setErrorMsg("QR Code inválido ou aluno não cadastrado.");
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
        () => {
          // Silent scan error
        }
      ).catch((err: any) => {
        console.error("Erro ao iniciar a câmera para QR Code:", err);
      });
    }).catch((err) => {
      console.error("Erro ao carregar módulo html5-qrcode:", err);
    });
    
    return () => {
      if (html5QrCode) {
        // html5QrCode.isScanning checks if camera is active
        try {
          html5QrCode.stop().catch(() => {});
        } catch (e) {}
      }
    };
  }, [isScanning, alunos]);

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
    setProdutos(DBService.getProdutos().filter(p => p.ativo));
    const allMovs = DBService.getMovimentacoes();
    setRecentSales(allMovs.filter(m => m.tipo === 'debito').reverse().slice(0, 10));
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
      setCart([]);
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
          <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="h-9 w-9 bg-red-600 rounded-full flex items-center justify-center text-white font-black text-xxs border border-red-700 shadow-xs">
              EEAC
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight text-slate-800 block">
                Cantina Digital
              </span>
              <span className="text-[9px] text-slate-500 font-bold uppercase block leading-none">Terminal Cantina</span>
            </div>
          </a>
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
            
            <div className="flex gap-3 relative">
              <div className="relative flex-1">
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
              <button
                type="button"
                onClick={() => { setIsScanning(true); setSuccessMsg(""); setErrorMsg(""); }}
                className="bg-red-650 hover:bg-red-750 text-white font-bold px-5 sm:px-6 rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95 shrink-0 text-xs sm:text-sm"
              >
                <span>📷</span> <span className="hidden sm:inline">Escanear QR</span>
              </button>
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
              <div className="space-y-6">
                <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                  <span>🍔</span> 2. Selecionar Itens do Cardápio
                </h3>

                {/* Grid de Produtos */}
                <div className="space-y-4">
                  {['salgado', 'bebida', 'doce', 'outro'].map(cat => {
                    const catProds = produtos.filter(p => p.categoria === cat);
                    if (catProds.length === 0) return null;
                    return (
                      <div key={cat} className="space-y-2">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider capitalize">
                          {cat === 'salgado' ? '🍔 Salgados' :
                           cat === 'bebida' ? '🥤 Bebidas' :
                           cat === 'doce' ? '🍬 Doces' : '📦 Outros'}
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {catProds.map(prod => (
                            <button
                              key={prod.id}
                              type="button"
                              onClick={() => addToCart(prod)}
                              className="bg-slate-50 hover:bg-slate-100 hover:border-red-500/30 border border-slate-200 rounded-xl p-3 text-left transition-all cursor-pointer flex flex-col justify-between h-20 shadow-2xs active:scale-95 text-xs"
                            >
                              <span className="font-bold text-slate-800 text-[11px] leading-tight line-clamp-2">{prod.nome}</span>
                              <span className="font-black text-emerald-600 text-xs mt-1">R$ {prod.preco.toFixed(2)}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Resumo do Carrinho */}
                {cart.length > 0 && (
                  <div className="border border-red-100 bg-red-50/30 rounded-2xl p-4 space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-red-100/50">
                      <span className="text-xs font-extrabold text-slate-700">Carrinho Atual</span>
                      <button
                        type="button"
                        onClick={clearCart}
                        className="text-xxs font-bold text-red-600 hover:text-red-800 transition-colors"
                      >
                        Limpar Carrinho
                      </button>
                    </div>

                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {cart.map(item => (
                        <div key={item.produto.id} className="flex justify-between items-center text-xs">
                          <span className="font-medium text-slate-700">{item.produto.nome}</span>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-slate-400">R$ {(item.produto.preco * item.qtd).toFixed(2)}</span>
                            <div className="flex items-center gap-1 border border-slate-200 bg-white rounded-lg p-0.5">
                              <button
                                type="button"
                                onClick={() => removeFromCart(item.produto.id)}
                                className="w-5 h-5 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
                              >
                                -
                              </button>
                              <span className="w-5 text-center font-bold text-slate-850">{item.qtd}</span>
                              <button
                                type="button"
                                onClick={() => addToCart(item.produto)}
                                className="w-5 h-5 flex items-center justify-center font-bold text-slate-650 hover:bg-slate-100 rounded cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <form onSubmit={handleChargeSubmit} className="space-y-4 pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Dados do Lançamento</h4>
                  
                  {/* Linha de Valor */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-1 space-y-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase">Valor Total (R$)</label>
                      <input
                        type="text"
                        value={chargeAmount}
                        onChange={e => setChargeAmount(e.target.value)}
                        placeholder="R$ 0,00"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-black focus:outline-none focus:border-red-500 text-slate-800 placeholder-slate-400"
                        required
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase">Itens / Descrição</label>
                      <input
                        type="text"
                        value={chargeDesc}
                        onChange={e => setChargeDesc(e.target.value)}
                        placeholder="Ex: Pastel de forno + Suco Del Valle"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-red-500 text-slate-800 placeholder-slate-400"
                        required
                      />
                    </div>
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
                  <div className="flex gap-4 pt-2 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setSelectedAluno(null)}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-650 py-3 rounded-xl border border-slate-200 cursor-pointer"
                    >
                      Trocar Aluno
                    </button>
                    <button
                      type="submit"
                      className="flex-2 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
                    >
                      Confirmar e Debitar R$ {parseFloat(chargeAmount || "0").toFixed(2)}
                    </button>
                  </div>
                </form>
              </div>
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

      {/* Modal Leitor QR Code */}
      {isScanning && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-30">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden shadow-xl p-6">
            <div className="flex justify-between items-center pb-4 border-b border-slate-150 mb-4">
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <span>📷</span> Leitor de QR Code
              </h3>
              <button
                onClick={() => setIsScanning(false)}
                className="text-slate-400 hover:text-slate-650 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Vídeo / Câmera */}
            <div className="relative w-full h-64 bg-slate-900 rounded-2xl overflow-hidden mx-auto shadow-inner border border-slate-800 flex items-center justify-center mb-4">
              <div id="reader" className="w-full h-full object-cover"></div>
              
              {/* Overlay HUD do Scanner */}
              <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-red-500/40 rounded-2xl m-4 flex items-center justify-center">
                <div className="w-[80%] h-[80%] border border-red-500/20 rounded-xl relative overflow-hidden">
                  {/* Laser bar animation */}
                  <div className="absolute left-0 right-0 h-[2px] bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] top-0 animate-bounce" style={{ animationDuration: '3.5s' }} />
                </div>
              </div>
            </div>

            {/* Simulação Rápida (Fallback e testes de QA) */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center space-y-2.5">
              <span className="text-[10px] text-slate-450 uppercase font-bold tracking-wider block">Simular Leitura de Carteirinha</span>
              <div className="flex flex-wrap gap-2 justify-center">
                {alunos.map(aluno => (
                  <button
                    key={aluno.id}
                    type="button"
                    onClick={() => handleQrScanSuccess(aluno.id)}
                    className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 py-1.5 px-3 rounded-lg text-[10px] font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    👤 {aluno.nome.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Botão Fechar */}
            <div className="pt-4 mt-2 border-t border-slate-150">
              <button
                onClick={() => setIsScanning(false)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs py-3 rounded-xl border border-slate-200 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
