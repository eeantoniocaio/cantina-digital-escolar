"use client";

import { useEffect, useState, useRef } from "react";
import { DBService, Profile, Aluno } from "@/services/db";
import { supabase } from "@/services/supabaseClient";
import Header from "../components/Header";

export default function ConfigissoesPage() {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [alunoInfo, setAlunoInfo] = useState<Aluno | null>(null);

  // Form states
  const [nome, setNome] = useState("");
  const [rg, setRg] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Photo state
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Status feedback
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const user = DBService.getCurrentUser();
    if (!user) {
      window.location.href = "/";
      return;
    }
    setCurrentUser(user);
    setNome(user.nome || "");
    setRg(user.rg || "");
    setWhatsapp(user.whatsapp || "");

    // Se tiver aluno_id (aluno, professor, gestao), busca dados da carteirinha (foto, etc)
    if (user.aluno_id) {
      DBService.getAlunos().then((alunos) => {
        const info = alunos.find((a) => a.id === user.aluno_id);
        if (info) {
          setAlunoInfo(info);
          setPhoto(info.foto || null);
        }
      }).catch(err => console.error("Erro ao carregar dados do aluno nas configurações:", err));
    }
  }, []);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && alunoInfo) {
      const file = e.target.files[0];
      setUploadingPhoto(true);
      setErrorMsg("");
      setSuccessMsg("");
      
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        try {
          const updated = await DBService.updateAluno(alunoInfo.id, { foto: base64String });
          setAlunoInfo(updated);
          setPhoto(base64String);
          setSuccessMsg("Foto de perfil atualizada com sucesso!");
        } catch (err: any) {
          setErrorMsg(err.message || "Erro ao salvar foto de perfil.");
        } finally {
          setUploadingPhoto(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setErrorMsg("");
    setSuccessMsg("");
    setIsLoading(true);

    if (newPassword && newPassword !== confirmPassword) {
      setErrorMsg("A confirmação da nova senha não confere.");
      setIsLoading(false);
      return;
    }

    try {
      // 1. Atualizar informações cadastrais na tabela 'profiles'
      const updates: Partial<Profile> = { nome };
      if (currentUser.role === 'familia') {
        updates.rg = rg;
        updates.whatsapp = whatsapp;
      }

      await DBService.updateProfile(currentUser.id, updates);

      // Se for aluno/professor, também sincroniza o nome na tabela de alunos correspondente
      if (alunoInfo) {
        await DBService.updateAluno(alunoInfo.id, { nome });
      }

      // 2. Atualizar senha no Supabase Auth, se fornecida
      if (newPassword) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (passwordError) throw passwordError;
        setNewPassword("");
        setConfirmPassword("");
      }

      setSuccessMsg("Configurações atualizadas com sucesso!");
      
      // Atualizar estado local
      const updatedUser = DBService.getCurrentUser();
      setCurrentUser(updatedUser);
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao salvar alterações.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="flex-1 bg-slate-50 text-slate-800 min-h-screen">
      <Header />

      <main className="max-w-xl mx-auto px-4 py-12">
        <div className="space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-xl font-extrabold text-slate-800">Minhas Configurações</h2>
            <p className="text-xs text-slate-400 mt-1">Gerencie os dados da sua conta e preferências de acesso.</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
            
            {/* Seção de Foto de Perfil (Opcional - para alunos/professores/gestao que possuem foto vinculada) */}
            {alunoInfo && (
              <div className="flex flex-col items-center justify-center p-4 border-b border-slate-100 pb-6 text-center">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative h-20 w-20 rounded-full bg-red-100 text-red-700 font-black flex items-center justify-center text-3xl cursor-pointer overflow-hidden border-2 border-red-200/50 shadow-sm shrink-0 mb-3"
                  title="Clique para alterar sua foto de perfil"
                >
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo} alt={nome} className="h-full w-full object-cover transition-transform group-hover:scale-110" />
                  ) : (
                    nome ? nome.charAt(0).toUpperCase() : "U"
                  )}
                  {uploadingPhoto ? (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 bg-black/45 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[9px] text-white font-bold leading-tight">Alterar Foto</span>
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
                <h4 className="font-extrabold text-xs text-slate-700">Foto de Perfil</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Clique na imagem para enviar um novo arquivo de foto.</p>
              </div>
            )}

            {/* Formulário Principal */}
            <form onSubmit={handleSaveProfile} className="space-y-4">
              
              <div className="space-y-1">
                <label className="block text-xxs font-bold text-slate-400 uppercase">E-mail (Não editável)</label>
                <input
                  type="email"
                  value={currentUser.email}
                  disabled
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-500 cursor-not-allowed font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xxs font-bold text-slate-450 uppercase">Nome Completo</label>
                <input
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-red-500 font-semibold"
                  required
                />
              </div>

              {/* Campos para Responsáveis */}
              {currentUser.role === 'familia' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xxs font-bold text-slate-450 uppercase">RG</label>
                    <input
                      type="text"
                      value={rg}
                      onChange={e => setRg(e.target.value)}
                      placeholder="Número do seu RG"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-red-500 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xxs font-bold text-slate-450 uppercase">Whatsapp</label>
                    <input
                      type="text"
                      value={whatsapp}
                      onChange={e => setWhatsapp(e.target.value)}
                      placeholder="(11) 99999-9999"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>
              )}

              {/* Informações Extras de Estudante (Visualização) */}
              {alunoInfo && currentUser.role === 'aluno' && (
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-150 text-xxs">
                  <div>
                    <span className="text-slate-400 uppercase font-bold block mb-0.5">Série / Turma</span>
                    <strong className="text-slate-700 text-xs">{alunoInfo.turma}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase font-bold block mb-0.5">Registro (RA)</span>
                    <strong className="text-slate-700 font-mono text-xs">{alunoInfo.ra}</strong>
                  </div>
                </div>
              )}

              {/* Alteração de Senha */}
              <div className="border-t border-slate-100 pt-6 space-y-4">
                <h4 className="text-xxs font-bold text-red-650 uppercase tracking-wide">Segurança: Alterar Senha</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xxs font-bold text-slate-450 uppercase">Nova Senha</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Nova senha (mín. 6 caracteres)"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xxs font-bold text-slate-450 uppercase">Confirmar Nova Senha</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Confirme a nova senha"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>
              </div>

              {/* Feedbacks */}
              {errorMsg && (
                <div className="text-xxs text-red-650 bg-red-50 p-3 rounded-lg border border-red-100 font-medium">
                  ⚠️ {errorMsg}
                </div>
              )}

              {successMsg && (
                <div className="text-xxs text-emerald-650 bg-emerald-50 p-3 rounded-lg border border-emerald-100 font-medium">
                  🎉 {successMsg}
                </div>
              )}

              {/* Botões */}
              <div className="flex gap-3 pt-4 text-xs font-bold">
                <a
                  href="/"
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-xl border border-slate-200 transition-colors text-center"
                >
                  Voltar
                </a>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-2 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? "Salvando..." : "Salvar Configurações"}
                </button>
              </div>

            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
