"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { DBService, Aluno, Movimentacao } from "@/services/db";
import Header from "../components/Header";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import {
  Share2,
  Printer,
  Camera,
  History,
  CreditCard,
  GraduationCap,
  Check,
  X
} from "lucide-react";

export default function AlunoDashboard() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [alunoInfo, setAlunoInfo] = useState<Aluno | null>(null);
  const [compras, setCompras] = useState<Movimentacao[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [allAlunos, setAllAlunos] = useState<Aluno[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async (alunoId: string, userRole: string) => {
    try {
      const alunosList = await DBService.getAlunos();
      setAllAlunos(alunosList);

      let targetId = alunoId;
      if ((userRole === 'admin' || userRole === 'gestao') && !targetId) {
        if (alunosList.length > 0) {
          targetId = alunosList[0].id;
        }
      }

      const info = alunosList.find(a => a.id === targetId);
      if (info) {
        setAlunoInfo(info);
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
  }, []);

  useEffect(() => {
    const user = DBService.getCurrentUser();
    if (!user || (user.role !== 'aluno' && user.role !== 'admin' && user.role !== 'gestao')) {
      window.location.href = "/";
      return;
    }
    setCurrentUser(user);
    loadData(user.aluno_id || '', user.role);
  }, [loadData]);

  const handleShare = () => {
    if (!alunoInfo) return;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${alunoInfo.id}`;

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
      <div className="flex-1 bg-[--bg-base] min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-3 border-red-600 border-t-transparent animate-spin" />
          <span className="text-xs font-bold text-slate-400">Carregando carteirinha...</span>
        </div>
      </div>
    );
  }

  if (!alunoInfo) {
    return (
      <div className="flex-1 bg-[--bg-base] text-slate-800 min-h-screen">
        <Header />
        <main className="max-w-md mx-auto px-4 py-20 text-center">
          <EmptyState
            icon={<GraduationCap className="h-8 w-8 text-slate-400" />}
            title="Cadastro não encontrado"
            description="Não localizamos um cadastro de estudante ativo vinculado a esta conta. Procure a secretaria da escola."
            action={
              <Button variant="secondary" size="md" onClick={() => window.location.href = "/"}>
                Voltar para o Início
              </Button>
            }
          />
        </main>
      </div>
    );
  }

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${alunoInfo.id}`;

  return (
    <div className="flex-1 bg-[--bg-base] text-slate-800 min-h-screen">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Seletor de simulação administrativa */}
        {(currentUser?.role === 'admin' || currentUser?.role === 'gestao') && allAlunos.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Visualização de Gestão
              </span>
              <p className="text-xs text-slate-600 font-medium mt-0.5">
                Alterne entre os estudantes para conferir extratos e carteirinhas.
              </p>
            </div>
            <select
              value={alunoInfo.id}
              onChange={(e) => {
                const selectedId = e.target.value;
                const info = allAlunos.find(a => a.id === selectedId);
                if (info) {
                  setAlunoInfo(info);
                  DBService.getMovimentacoes().then(movs => {
                    setCompras(movs.filter(m => m.aluno_id === selectedId && m.tipo === 'debito').reverse());
                  });
                }
              }}
              className="select w-full sm:w-64"
            >
              {allAlunos.map(a => (
                <option key={a.id} value={a.id}>
                  {a.nome} ({a.turma})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Top Student Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col md:flex-row justify-between items-center gap-6 shadow-xs">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="group relative h-16 w-16 rounded-full bg-red-100 text-red-700 font-black flex items-center justify-center text-xl cursor-pointer overflow-hidden border-2 border-red-200 shrink-0 shadow-xs"
              title="Clique para alterar foto"
            >
              {alunoInfo.foto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={alunoInfo.foto}
                  alt={alunoInfo.nome}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                alunoInfo.nome.charAt(0)
              )}

              {uploadingPhoto ? (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                </div>
              ) : (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="h-5 w-5 text-white" />
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
                <h2 className="font-extrabold text-lg text-slate-900 leading-tight">
                  {alunoInfo.nome}
                </h2>
                <Badge variant="brand">{alunoInfo.turma}</Badge>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-1">
                RA: {alunoInfo.ra}-{alunoInfo.digito || "0"}
                {alunoInfo.data_nascimento && ` • Nasc: ${alunoInfo.data_nascimento}`}
              </p>
            </div>
          </div>

          <div className="text-right w-full md:w-auto flex md:flex-col justify-between items-center md:items-end border-t md:border-0 border-slate-100 pt-4 md:pt-0">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Saldo Disponível</span>
            <span className="text-3xl font-black text-emerald-600">R$ {alunoInfo.saldo.toFixed(2)}</span>
          </div>
        </div>

        {/* Two Column Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* QR Code Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col items-center justify-between text-center space-y-4 md:col-span-1">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">QR Code da Cantina</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Mostre este código no caixa para realizar compras rápidas.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl flex items-center justify-center shadow-inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrCodeUrl}
                alt="QR Code do Aluno"
                className="w-40 h-40 object-contain rounded-xl"
              />
            </div>

            <div className="w-full space-y-2">
              <Button
                variant="brand"
                size="md"
                onClick={handleShare}
                leftIcon={copiedLink ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                className="w-full"
              >
                {copiedLink ? "Link Copiado!" : "Compartilhar QR"}
              </Button>

              <Button
                variant="secondary"
                size="md"
                onClick={() => setIsCardModalOpen(true)}
                leftIcon={<CreditCard className="h-4 w-4" />}
                className="w-full"
              >
                Minha Carteirinha
              </Button>
            </div>
          </div>

          {/* Extrato de Consumo */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs md:col-span-2 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <History className="h-4 w-4 text-slate-400" />
                Histórico de Consumo
              </h3>
              <Badge variant="neutral">{compras.length} compras</Badge>
            </div>

            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {compras.length === 0 ? (
                <EmptyState
                  icon={<History className="h-6 w-6 text-slate-300" />}
                  title="Nenhum consumo recente"
                  description="Quando você realizar compras no caixa da cantina, os lançamentos aparecerão aqui."
                />
              ) : (
                compras.map(comp => (
                  <div
                    key={comp.id}
                    className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/60 flex justify-between items-center text-xs hover:bg-slate-100/60 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <strong className="text-slate-900 block font-bold">{comp.descricao}</strong>
                      <span className="text-[11px] text-slate-400 block font-medium">
                        {new Date(comp.criado_em).toLocaleDateString('pt-BR')} às {new Date(comp.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <span className="font-black text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                      - R$ {comp.valor.toFixed(2)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modal da Carteirinha Escolar Digital */}
      {isCardModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto print:absolute print:inset-0 print:bg-white print:p-0 print:z-0 animate-fade-in">
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
                transform: translate(-50%, -50%) scale(1.05);
                border: none !important;
                box-shadow: none !important;
                background: white !important;
                display: flex !important;
                gap: 24px !important;
              }
            }
          `}} />

          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl p-6 print:border-0 print:shadow-none print:p-0">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-6 print-hide">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-red-600" />
                Carteirinha Escolar Digital
              </h3>
              <button
                onClick={() => setIsCardModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Print Area */}
            <div
              id="carteirinha-print-area"
              className="flex flex-col sm:flex-row gap-6 justify-center items-center py-4 print:py-0 bg-slate-50 rounded-2xl border border-slate-200/80 p-6 print:bg-white print:border-0 print:p-0"
            >
              {/* Frente */}
              <div className="w-[240px] h-[370px] bg-gradient-to-b from-red-600 via-red-700 to-red-800 rounded-2xl p-4 flex flex-col justify-between text-white relative shadow-lg border border-red-700/30 print:shadow-none">
                <div className="flex items-center gap-2.5 border-b border-white/20 pb-2">
                  <div className="h-8 w-8 bg-white text-red-600 rounded-full flex items-center justify-center font-black text-[9px] shadow-sm shrink-0">
                    EEAC
                  </div>
                  <div className="text-left leading-none">
                    <h5 className="font-black text-[10px] tracking-tight uppercase text-white">E.E. Antônio Caio</h5>
                    <span className="text-[7px] text-red-100 font-bold uppercase tracking-wider">Carteirinha do Aluno</span>
                  </div>
                </div>

                <div className="h-32 w-28 bg-white/95 rounded-xl overflow-hidden border-2 border-white shadow-md flex items-center justify-center mx-auto my-2 shrink-0">
                  {alunoInfo.foto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={alunoInfo.foto} alt={alunoInfo.nome} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center text-slate-400">
                      <GraduationCap className="h-10 w-10 text-slate-300" />
                      <span className="text-[8px] font-bold uppercase mt-1">Sem Foto</span>
                    </div>
                  )}
                </div>

                <div className="text-center space-y-1.5">
                  <h4 className="font-black text-sm uppercase text-white truncate max-w-[210px] leading-tight">
                    {alunoInfo.nome}
                  </h4>
                  <span className="inline-block text-[8px] font-extrabold text-red-700 bg-white px-2.5 py-0.5 rounded-full uppercase shadow-xs">
                    {alunoInfo.turma}
                  </span>

                  <div className="pt-2 border-t border-white/10 text-[8px] text-red-100 font-semibold space-y-0.5">
                    <p className="font-mono">RA: {alunoInfo.ra}-{alunoInfo.digito || "0"}</p>
                    {alunoInfo.data_nascimento && <p>NASC: {alunoInfo.data_nascimento}</p>}
                    <p className="text-[7px] text-white/60">ANO LETIVO: 2026</p>
                  </div>
                </div>

                <div className="absolute bottom-2 right-4 text-[6px] text-white/30 font-black uppercase tracking-widest">
                  EEAC ESTUDANTE
                </div>
              </div>

              {/* Verso */}
              <div className="w-[240px] h-[370px] bg-white rounded-2xl p-4 flex flex-col justify-between text-slate-800 relative shadow-lg border border-slate-200 print:shadow-none">
                <div className="bg-slate-900 text-white font-black text-[9px] py-1.5 px-3 rounded-full text-center uppercase tracking-wider shadow-xs">
                  CANTINA DIGITAL — EEAC
                </div>

                <div className="flex flex-col items-center space-y-1.5 mt-2">
                  <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrCodeUrl} alt="QR Code" className="w-24 h-24 object-contain" />
                  </div>
                  <span className="text-center text-[8px] text-slate-400 font-bold max-w-[180px] leading-tight">
                    Apresente no caixa da cantina para debitar lanches
                  </span>
                </div>

                <div className="space-y-1 mt-2">
                  <div className="flex justify-center items-center h-7 gap-[1.5px] px-2 overflow-hidden opacity-90 select-none">
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
                  </div>
                  <div className="text-[7px] font-mono text-center text-slate-400 leading-none">
                    *{alunoInfo.id.substring(0, 8).toUpperCase()}*
                  </div>
                </div>

                <div className="text-[7px] text-slate-400 text-center border-t border-slate-100 pt-2 pb-1">
                  <p className="font-bold">Uso pessoal e intransferível.</p>
                  <p>Cantina Digital Escolar © 2026</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100 text-xs font-bold print-hide">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setIsCardModalOpen(false)}
                className="flex-1"
              >
                Fechar
              </Button>
              <Button
                variant="brand"
                size="md"
                onClick={handlePrint}
                leftIcon={<Printer className="h-4 w-4" />}
                className="flex-1 shadow-xs"
              >
                Imprimir Carteirinha
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
