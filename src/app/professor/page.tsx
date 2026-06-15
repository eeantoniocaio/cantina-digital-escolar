"use client";

import { useEffect, useState, useRef } from "react";
import { DBService, Aluno, Movimentacao, Profile } from "@/services/db";
import Header from "../components/Header";

export default function ProfessorDashboard() {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [alunoInfo, setAlunoInfo] = useState<Aluno | null>(null);
  const [compras, setCompras] = useState<Movimentacao[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const user = DBService.getCurrentUser();
    if (!user || (user.role !== 'professor' && user.role !== 'gestao')) {
      window.location.href = "/";
      return;
    }
    setCurrentUser(user);
    loadData(user.aluno_id || 'prof-1');
  }, []);

  const loadData = async (alunoId: string) => {
    try {
      const alunos = await DBService.getAlunos();
      const info = alunos.find(a => a.id === alunoId);
      if (info) {
        setAlunoInfo(info);
      }
      
      // Filtra compras deste aluno/professor
      const movimentacoes = await DBService.getMovimentacoes();
      setCompras(movimentacoes.filter(m => m.aluno_id === alunoId && m.tipo === 'debito').reverse());
    } catch (err) {
      console.error("Erro ao carregar dados do professor:", err);
    }
  };

  const handleShare = () => {
    if (!alunoInfo) return;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${alunoInfo.id}`;
    
    if (navigator.share) {
      navigator.share({
        title: `QR Code de ${alunoInfo.nome}`,
        text: `Use este QR Code para consumir na Cantina Digital`,
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

  const handleLogout = () => {
    DBService.logout();
    window.location.href = "/";
  };

  if (!alunoInfo || !currentUser) {
    return (
      <div className="flex-1 bg-slate-50 flex items-center justify-center min-h-screen text-slate-500">
        Carregando...
      </div>
    );
  }

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${alunoInfo.id}`;

  return (
    <div className="flex-1 bg-slate-50 text-slate-800 min-h-screen">
      <Header />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        
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
                  {currentUser.role === 'gestao' ? 'Gestão' : 'Servidor'}
                </span>
              </div>
              <p className="text-xxs text-slate-400 mt-1.5">E-mail: {currentUser.email}</p>
              <p className="text-xxs text-slate-400 mt-0.5">RA/Registro: {alunoInfo.ra}</p>
            </div>
          </div>

          <div className="text-right w-full md:w-auto flex md:flex-col justify-between items-center md:items-end border-t md:border-0 border-slate-100 pt-4 md:pt-0">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Saldo de Consumo</span>
            <span className="text-3xl font-black text-emerald-600">R$ {alunoInfo.saldo.toFixed(2)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Coluna QR CODE */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col items-center justify-between text-center space-y-4 md:col-span-1">
            <div>
              <h3 className="font-bold text-sm text-slate-800">QR Code do Servidor</h3>
              <p className="text-[10px] text-slate-400 mt-1 leading-normal">Apresente este código na cantina para realizar suas compras.</p>
            </div>

            {/* QR Code Card */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center justify-center shadow-inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrCodeUrl}
                alt="QR Code de Consumo"
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
                <span>🪪</span> Carteirinha Digital
              </button>
            </div>
          </div>

          {/* Coluna Extrato / Compras */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs md:col-span-2 space-y-4">
            <h3 className="font-bold text-sm text-slate-800">Histórico de Compras</h3>
            
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1 divide-y divide-slate-100">
              {compras.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs italic">
                  Nenhuma compra registrada recentemente.
                </div>
              ) : (
                compras.map(comp => (
                  <div
                    key={comp.id}
                    className="flex justify-between items-center py-3 text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-700">{comp.descricao}</p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {new Date(comp.criado_em).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-red-600">- R$ {comp.valor.toFixed(2)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* MODAL CARTEIRINHA DIGITAL */}
      {isCardModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-250 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative space-y-6">
            <button
              onClick={() => setIsCardModalOpen(false)}
              className="absolute top-4 right-4 h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
            >
              ✕
            </button>

            <div className="text-center">
              <h3 className="font-black text-sm text-slate-800">Carteirinha Digital de Servidor</h3>
              <p className="text-[10px] text-slate-400 mt-1">Utilize para identificação e compras rápidas.</p>
            </div>

            {/* Imagem Impressa da Carteirinha */}
            <div id="carteirinha-impressao" className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-xs">
              {/* Header da Carteirinha */}
              <div className="bg-red-600 p-4 text-white flex items-center gap-3 border-b border-red-700">
                <div className="h-9 w-9 bg-white rounded-full flex items-center justify-center text-red-650 font-black text-[10px]">
                  EEAC
                </div>
                <div>
                  <h4 className="font-black text-xs uppercase leading-none">E.E. Antônio Caio</h4>
                  <span className="text-[8px] text-red-100 font-bold uppercase tracking-wider block mt-1 leading-none">
                    {currentUser.role === 'gestao' ? 'Gestão Escolar' : 'Professor / Servidor'}
                  </span>
                </div>
              </div>

              {/* Corpo da Carteirinha */}
              <div className="p-4 flex gap-4 items-center">
                {/* Foto */}
                <div className="h-24 w-20 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 text-xs shrink-0 overflow-hidden font-bold">
                  {alunoInfo.foto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={alunoInfo.foto} alt={alunoInfo.nome} className="h-full w-full object-cover" />
                  ) : (
                    alunoInfo.nome.charAt(0)
                  )}
                </div>

                {/* Dados & QR Code */}
                <div className="flex-1 space-y-2 text-left min-w-0">
                  <div className="leading-tight">
                    <span className="text-[8px] text-slate-400 font-bold uppercase">Nome</span>
                    <p className="font-extrabold text-xxs text-slate-700 truncate">{alunoInfo.nome}</p>
                  </div>
                  <div className="leading-tight">
                    <span className="text-[8px] text-slate-400 font-bold uppercase">Registro (RA)</span>
                    <p className="font-mono font-bold text-[10px] text-slate-600">{alunoInfo.ra}</p>
                  </div>

                  {/* QR Code Mini */}
                  <div className="pt-1 flex items-center justify-end">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrCodeUrl}
                      alt="QR Code Carteirinha"
                      className="w-12 h-12 object-contain"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Ações */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handlePrint}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2.5 rounded-xl transition-all cursor-pointer shadow-xs text-center"
              >
                🖨️ Imprimir
              </button>
              <button
                onClick={() => setIsCardModalOpen(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-650 font-bold text-xs py-2.5 rounded-xl transition-all cursor-pointer shadow-xs text-center border border-slate-200"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
