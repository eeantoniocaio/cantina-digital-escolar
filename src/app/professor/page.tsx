"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { DBService, Aluno, Movimentacao, Profile } from "@/services/db";
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
  Briefcase,
  Check,
  X
} from "lucide-react";

export default function ProfessorDashboard() {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [alunoInfo, setAlunoInfo] = useState<Aluno | null>(null);
  const [compras, setCompras] = useState<Movimentacao[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async (alunoId: string) => {
    try {
      const alunos = await DBService.getAlunos();
      const info = alunos.find(a => a.id === alunoId);
      if (info) {
        setAlunoInfo(info);
      }

      const movimentacoes = await DBService.getMovimentacoes();
      setCompras(movimentacoes.filter(m => m.aluno_id === alunoId && m.tipo === 'debito').reverse());
    } catch (err) {
      console.error("Erro ao carregar dados do professor:", err);
    }
  }, []);

  useEffect(() => {
    const user = DBService.getCurrentUser();
    if (!user || (user.role !== 'professor' && user.role !== 'gestao')) {
      window.location.href = "/";
      return;
    }
    setCurrentUser(user);
    loadData(user.aluno_id || 'prof-1');
  }, [loadData]);

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

  if (!alunoInfo || !currentUser) {
    return (
      <div className="flex-1 bg-[--bg-base] min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-3 border-red-600 border-t-transparent animate-spin" />
          <span className="text-xs font-bold text-slate-400">Carregando carteirinha...</span>
        </div>
      </div>
    );
  }

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${alunoInfo.id}`;

  return (
    <div className="flex-1 bg-[--bg-base] text-slate-800 min-h-screen">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Top Header Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col md:flex-row justify-between items-center gap-6 shadow-xs">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="group relative h-16 w-16 rounded-full bg-slate-900 text-white font-black flex items-center justify-center text-xl cursor-pointer overflow-hidden border-2 border-slate-800 shrink-0 shadow-xs"
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
                <Badge variant="neutral">
                  {currentUser.role === 'gestao' ? 'Gestão Escolar' : 'Professor(a) / Servidor'}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-1">
                E-mail: {currentUser.email} • Registro: {alunoInfo.ra}
              </p>
            </div>
          </div>

          <div className="text-right w-full md:w-auto flex md:flex-col justify-between items-center md:items-end border-t md:border-0 border-slate-100 pt-4 md:pt-0">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Saldo de Consumo</span>
            <span className="text-3xl font-black text-emerald-600">R$ {alunoInfo.saldo.toFixed(2)}</span>
          </div>
        </div>

        {/* Two Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* QR Code */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col items-center justify-between text-center space-y-4 md:col-span-1">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">QR Code de Consumo</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Apresente este código no caixa da cantina para consumir.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl flex items-center justify-center shadow-inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrCodeUrl}
                alt="QR Code do Servidor"
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
                Carteirinha Digital
              </Button>
            </div>
          </div>

          {/* Histórico */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs md:col-span-2 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <History className="h-4 w-4 text-slate-400" />
                Histórico de Compras
              </h3>
              <Badge variant="neutral">{compras.length} compras</Badge>
            </div>

            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {compras.length === 0 ? (
                <EmptyState
                  icon={<History className="h-6 w-6 text-slate-300" />}
                  title="Nenhuma compra registrada"
                  description="Seus consumos no terminal da cantina aparecerão nesta lista."
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
                        {new Date(comp.criado_em).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
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

      {/* Modal Carteirinha Digital Servidor */}
      {isCardModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-5">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-900">Carteirinha do Servidor</h3>
              <button
                onClick={() => setIsCardModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Cartão Preview */}
            <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-xs">
              <div className="bg-slate-900 p-4 text-white flex items-center gap-3">
                <div className="h-9 w-9 bg-white text-slate-900 rounded-full flex items-center justify-center font-black text-[10px]">
                  EEAC
                </div>
                <div>
                  <h4 className="font-black text-xs uppercase leading-none">E.E. Antônio Caio</h4>
                  <span className="text-[8px] text-slate-300 font-bold uppercase tracking-wider block mt-1">
                    {currentUser.role === 'gestao' ? 'Gestão Escolar' : 'Professor / Servidor'}
                  </span>
                </div>
              </div>

              <div className="p-4 flex gap-4 items-center">
                <div className="h-24 w-20 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 text-xs shrink-0 overflow-hidden font-bold">
                  {alunoInfo.foto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={alunoInfo.foto} alt={alunoInfo.nome} className="h-full w-full object-cover" />
                  ) : (
                    <Briefcase className="h-8 w-8 text-slate-300" />
                  )}
                </div>

                <div className="flex-1 space-y-2 text-left min-w-0">
                  <div>
                    <span className="text-[8px] text-slate-400 font-bold uppercase">Nome</span>
                    <p className="font-extrabold text-xs text-slate-800 truncate">{alunoInfo.nome}</p>
                  </div>
                  <div>
                    <span className="text-[8px] text-slate-400 font-bold uppercase">Registro Funcional</span>
                    <p className="font-mono font-bold text-[11px] text-slate-600">{alunoInfo.ra}</p>
                  </div>

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

            <div className="grid grid-cols-2 gap-2.5">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setIsCardModalOpen(false)}
              >
                Fechar
              </Button>
              <Button
                variant="brand"
                size="md"
                onClick={handlePrint}
                leftIcon={<Printer className="h-4 w-4" />}
              >
                Imprimir
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
