"use client";

import { useEffect, useState, useRef } from "react";
import { DBService, Aluno, Movimentacao } from "@/services/db";
import Header from "../components/Header";

export default function AlunoDashboard() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [alunoInfo, setAlunoInfo] = useState<Aluno | null>(null);
  const [compras, setCompras] = useState<Movimentacao[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  // Estados adicionais para resiliência e painel administrativo
  const [allAlunos, setAllAlunos] = useState<Aluno[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const user = DBService.getCurrentUser();
    if (!user || (user.role !== 'aluno' && user.role !== 'admin' && user.role !== 'gestao')) {
      window.location.href = "/";
      return;
    }
    setCurrentUser(user);
    loadData(user.aluno_id || '', user.role);
  }, []);

  const loadData = async (alunoId: string, userRole: string) => {
    try {
      const alunosList = await DBService.getAlunos();
      setAllAlunos(alunosList);

      let targetId = alunoId;
      
      // Se for admin ou gestão e não possuir ID de aluno direto, visualiza o primeiro aluno cadastrado por padrão
      if ((userRole === 'admin' || userRole === 'gestao') && !targetId) {
        if (alunosList.length > 0) {
          targetId = alunosList[0].id;
        }
      }

      const info = alunosList.find(a => a.id === targetId);
      if (info) {
        setAlunoInfo(info);
        // Filtra compras deste aluno
        const movimentacoes = await DBService.getMovimentacoes();
        setCompras(movimentacoes.filter(m => m.aluno_id === targetId && m.tipo === 'debito').reverse());
      } else {
        setAlunoInfo(null);
      }
    } catch (err) {
      console.error("Erro ao carregar dados do aluno:", err);
    } finally {
      setHasLoaded(true);
    }
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

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && alunoInfo) {
      const file = e.target.files[0];
      setUploadingPhoto(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        try {
          const updated = await DBService.updateAluno(alunoInfo.id, { foto: base64String });
          setAlunoInfo(updated);
        } catch (err) {
          console.error("Erro ao salvar foto:", err);
        } finally {
          setUploadingPhoto(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!hasLoaded) {
    return (
      <div className="flex-1 bg-slate-50 flex items-center justify-center min-h-screen text-slate-500">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-3 border-red-600 border-t-transparent"></div>
          <span className="text-xs font-bold text-slate-400">Carregando...</span>
        </div>
      </div>
    );
  }

  if (!alunoInfo) {
    return (
      <div className="flex-1 bg-slate-50 text-slate-800 min-h-screen">
        <Header />
        <main className="max-w-md mx-auto px-4 py-16 text-center">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6">
            <span className="text-5xl block">⚠️</span>
            
            {currentUser?.role === 'admin' || currentUser?.role === 'gestao' ? (
              <div className="space-y-3">
                <h2 className="font-extrabold text-base text-slate-800">Nenhum aluno cadastrado</h2>
                <p className="text-xs text-slate-450 leading-relaxed">
                  Para poder visualizar a tela do estudante e gerar carteirinhas, é necessário ter pelo menos um aluno cadastrado no sistema.
                </p>
                <div className="pt-2">
                  <a
                    href="/configuracoes"
                    className="inline-block bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-6 py-3 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
                  >
                    Ir para Configurações (Cadastrar Turmas)
                  </a>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <h2 className="font-extrabold text-base text-slate-800">Cadastro Não Encontrado</h2>
                <p className="text-xs text-slate-450 leading-relaxed">
                  Não localizamos o registro de estudante vinculado à sua conta. Por favor, procure a secretaria ou gestão da escola para regularizar o seu cadastro.
                </p>
                <div className="pt-2">
                  <a
                    href="/"
                    className="inline-block bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-250 font-bold text-xs px-6 py-3 rounded-xl transition-all cursor-pointer"
                  >
                    Voltar para o Início
                  </a>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${alunoInfo.id}`;

  return (
    <div className="flex-1 bg-slate-50 text-slate-800 min-h-screen">
      <Header />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        
        {/* Admin Student Switcher */}
        {(currentUser?.role === 'admin' || currentUser?.role === 'gestao') && allAlunos.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-left">
              <span className="text-[10px] text-slate-400 font-black uppercase block tracking-wider">Visualização Administrativa</span>
              <p className="text-xxs text-slate-505 mt-0.5">Selecione um aluno para simular seu extrato, saldo e carteirinha escolar.</p>
            </div>
            <select
              value={alunoInfo.id}
              onChange={(e) => {
                const selectedId = e.target.value;
                const info = allAlunos.find(a => a.id === selectedId);
                if (info) {
                  setAlunoInfo(info);
                  DBService.getMovimentacoes().then(movimentacoes => {
                    setCompras(movimentacoes.filter(m => m.aluno_id === selectedId && m.tipo === 'debito').reverse());
                  });
                }
              }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-755 focus:outline-none focus:border-red-500 w-full sm:w-64 cursor-pointer"
            >
              {allAlunos.map(a => (
                <option key={a.id} value={a.id}>
                  {a.nome} ({a.turma})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Top Header Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col md:flex-row justify-between items-center gap-6 shadow-xs">
          <div className="flex items-center gap-4 text-left w-full md:w-auto">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="group relative h-14 w-14 rounded-full bg-red-100 text-red-700 font-black flex items-center justify-center text-2xl cursor-pointer overflow-hidden border border-red-200/50 shadow-xs shrink-0"
              title="Clique para alterar sua foto de perfil"
            >
              {alunoInfo.foto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={alunoInfo.foto} 
                  alt={alunoInfo.nome} 
                  className="h-full w-full object-cover transition-transform group-hover:scale-110"
                />
              ) : (
                alunoInfo.nome.charAt(0)
              )}
              {uploadingPhoto ? (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                </div>
              ) : (
                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[8px] text-white font-bold leading-none text-center">Alterar<br/>Foto 📷</span>
                </div>
              )}
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handlePhotoChange} 
              accept="image/*" 
              className="hidden" 
            />
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
            <div className="w-full space-y-2">
              <button
                onClick={handleShare}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <span>🔗</span> {copiedLink ? "Link Copiado!" : "Compartilhar QR Code"}
              </button>
              <button
                onClick={() => setIsCardModalOpen(true)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-250 font-bold text-xs py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95"
              >
                <span>🪪</span> Minha Carteirinha
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

      {/* Modal da Carteirinha Escolar */}
      {isCardModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-30 overflow-y-auto print:absolute print:inset-0 print:bg-white print:p-0 print:z-0">
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              body * {
                visibility: hidden;
              }
              .print-hide {
                display: none !important;
              }
              #carteirinha-print-area, #carteirinha-print-area * {
                visibility: visible;
              }
              #carteirinha-print-area {
                position: absolute;
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%) scale(1.1);
                border: none !important;
                box-shadow: none !important;
                background: white !important;
                display: flex !important;
                gap: 24px !important;
              }
            }
          `}} />
          
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl overflow-hidden shadow-xl p-6 print:border-0 print:shadow-none print:p-0">
            {/* Header Modal */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-150 mb-6 print-hide">
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <span>🪪</span> Carteirinha Escolar Digital
              </h3>
              <button
                onClick={() => setIsCardModalOpen(false)}
                className="text-slate-400 hover:text-slate-650 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Área de Impressão */}
            <div 
              id="carteirinha-print-area" 
              className="flex flex-col sm:flex-row gap-6 justify-center items-center py-4 print:py-0 bg-slate-50/50 rounded-2xl border border-slate-100 p-6 print:bg-white print:border-0 print:p-0"
            >
              {/* CARTÃO FRENTE */}
              <div className="w-[240px] h-[370px] bg-gradient-to-b from-red-600 via-red-650 to-red-800 rounded-2xl p-4 flex flex-col justify-between text-white relative shadow-lg border border-red-700/30 print:shadow-none">
                {/* Cabeçalho */}
                <div className="flex items-center gap-2.5 border-b border-white/20 pb-2">
                  <div className="h-8 w-8 bg-white text-red-600 rounded-full flex items-center justify-center font-black text-[9px] shadow-sm shrink-0 border border-red-700/10">
                    EEAC
                  </div>
                  <div className="text-left leading-none">
                    <h5 className="font-extrabold text-[10px] tracking-tight uppercase text-white">E.E. Antônio Caio</h5>
                    <span className="text-[7px] text-red-100 font-bold uppercase tracking-wider">Carteirinha Escolar</span>
                  </div>
                </div>

                {/* Foto */}
                <div className="h-32 w-28 bg-slate-100/90 rounded-xl overflow-hidden border-2 border-white/80 shadow-md flex items-center justify-center mx-auto my-3 relative shrink-0">
                  {alunoInfo.foto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={alunoInfo.foto} 
                      alt={alunoInfo.nome} 
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <span className="text-4xl">👤</span>
                      <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest mt-1">Sem Foto</span>
                    </div>
                  )}
                </div>

                {/* Dados */}
                <div className="text-center space-y-2 mt-1">
                  <div>
                    <h4 className="font-black text-sm tracking-tight uppercase text-white truncate max-w-[210px] leading-tight">
                      {alunoInfo.nome}
                    </h4>
                    <span className="inline-block mt-0.5 text-[8px] font-extrabold text-red-700 bg-white px-2.5 py-0.5 rounded-full border border-white/20 uppercase shadow-xs">
                      {alunoInfo.turma}
                    </span>
                  </div>
                  
                  <div className="pt-2 border-t border-white/10 text-[8px] text-red-100 font-semibold space-y-0.5">
                    <p className="font-mono">RA: {alunoInfo.ra}</p>
                    <p className="text-[7px] text-white/60">ANO LETIVO: 2026</p>
                  </div>
                </div>
                
                {/* Marca D'Água / Detalhes de Credencial */}
                <div className="absolute bottom-2 right-4 text-[6px] text-white/35 font-bold uppercase tracking-widest leading-none">
                  EEAC ESTUDANTE
                </div>
              </div>

              {/* CARTÃO VERSO */}
              <div className="w-[240px] h-[370px] bg-white rounded-2xl p-4 flex flex-col justify-between text-slate-800 relative shadow-lg border border-slate-200/80 print:shadow-none">
                {/* Top Banner */}
                <div className="bg-gradient-to-r from-red-600 to-red-800 text-white font-black text-[9px] py-1.5 px-3 rounded-full text-center uppercase tracking-wider shadow-xs">
                  CANTINA DIGITAL - EEAC
                </div>

                {/* QR Code */}
                <div className="flex flex-col items-center space-y-1.5 mt-3">
                  <div className="bg-slate-50 border border-slate-200/60 p-2.5 rounded-xl flex items-center justify-center shadow-inner">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrCodeUrl}
                      alt="QR Code do Aluno"
                      className="w-24 h-24 object-contain"
                    />
                  </div>
                  <span className="text-center text-[7px] text-slate-400 font-bold max-w-[180px] leading-tight">
                    Apresente este código no caixa da cantina para realizar débitos rápidos de consumo
                  </span>
                </div>

                {/* Faux Barcode */}
                <div className="space-y-1 mt-2">
                  <div className="flex justify-center items-center h-8 gap-[1.5px] px-2 overflow-hidden opacity-90 select-none">
                    <div className="bg-slate-800 w-[2.5px] h-full" />
                    <div className="bg-slate-800 w-[1px] h-full" />
                    <div className="bg-slate-800 w-[3.5px] h-full" />
                    <div className="bg-slate-800 w-[1px] h-full" />
                    <div className="bg-slate-800 w-[2px] h-full" />
                    <div className="bg-slate-800 w-[4.5px] h-full" />
                    <div className="bg-slate-800 w-[1px] h-full" />
                    <div className="bg-slate-800 w-[2.5px] h-full" />
                    <div className="bg-slate-800 w-[3.5px] h-full" />
                    <div className="bg-slate-800 w-[1px] h-full" />
                    <div className="bg-slate-800 w-[2px] h-full" />
                    <div className="bg-slate-800 w-[4.5px] h-full" />
                    <div className="bg-slate-800 w-[2.5px] h-full" />
                    <div className="bg-slate-800 w-[1.5px] h-full" />
                    <div className="bg-slate-800 w-[3px] h-full" />
                  </div>
                  <div className="text-[7px] font-mono text-center text-slate-450 leading-none">
                    *{alunoInfo.id.substring(0, 8).toUpperCase()}*
                  </div>
                </div>

                {/* Termos de uso */}
                <div className="text-[6px] text-slate-400 text-center leading-normal border-t border-slate-100 pt-2 pb-1">
                  <p className="font-bold">Uso pessoal e intransferível.</p>
                  <p>Cantina Digital Escolar © 2026</p>
                </div>
              </div>
            </div>

            {/* Ações Modal */}
            <div className="flex gap-3 mt-6 pt-4 border-t border-slate-150 text-xs font-bold print-hide">
              <button
                onClick={() => setIsCardModalOpen(false)}
                className="flex-1 bg-slate-150 hover:bg-slate-200 text-slate-600 py-3 rounded-xl border border-slate-200 transition-colors cursor-pointer"
              >
                Fechar
              </button>
              <button
                onClick={handlePrint}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
              >
                <span>🖨️</span> Imprimir Carteirinha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
