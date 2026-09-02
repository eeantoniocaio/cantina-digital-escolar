"use client";

import { useEffect, useState, useCallback } from "react";
import { DBService, Profile, CategoriaCardapio } from "@/services/db";
import Header from "@/app/components/Header";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Badge } from "@/app/components/ui/Badge";
import { Input } from "@/app/components/ui/Input";
import { EmptyState } from "@/app/components/ui/EmptyState";
import {
  UtensilsCrossed,
  Plus,
  ArrowLeft,
  Edit2,
  Power,
  Check,
  AlertCircle,
  X,
  AlertTriangle
} from "lucide-react";

export default function CategoriasPage() {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [categorias, setCategorias] = useState<CategoriaCardapio[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal de Criação / Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<CategoriaCardapio | null>(null);
  const [modalNome, setModalNome] = useState("");
  const [modalAtivo, setModalAtivo] = useState(true);
  const [modalError, setModalError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Modal / Confirmação de Desativação
  const [categoriaToToggle, setCategoriaToToggle] = useState<CategoriaCardapio | null>(null);

  // Feedbacks
  const [feedbackSuccess, setFeedbackSuccess] = useState("");
  const [feedbackError, setFeedbackError] = useState("");

  const loadCategorias = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await DBService.getCategorias(true);
      setCategorias(data);
    } catch (err: any) {
      console.error("Erro ao carregar categorias:", err);
      setFeedbackError("Erro ao carregar categorias do banco.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const user = DBService.getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'gestao' && !user.is_master)) {
      window.location.href = "/configuracoes";
      return;
    }
    setCurrentUser(user);
    loadCategorias();
  }, [loadCategorias]);

  const handleOpenCreateModal = () => {
    setEditingCategoria(null);
    setModalNome("");
    setModalAtivo(true);
    setModalError("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cat: CategoriaCardapio) => {
    setEditingCategoria(cat);
    setModalNome(cat.nome);
    setModalAtivo(cat.ativo);
    setModalError("");
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");

    const trimmedNome = modalNome.trim();
    if (!trimmedNome) {
      setModalError("O nome da categoria é obrigatório.");
      return;
    }

    if (trimmedNome.length < 2) {
      setModalError("O nome deve conter pelo menos 2 caracteres.");
      return;
    }

    if (trimmedNome.length > 50) {
      setModalError("O nome não pode ultrapassar 50 caracteres.");
      return;
    }

    // Verificar duplicidade local no frontend
    const exists = categorias.some(
      c => c.nome.toLowerCase() === trimmedNome.toLowerCase() && c.id !== editingCategoria?.id
    );
    if (exists) {
      setModalError("Já existe uma categoria cadastrada com este nome.");
      return;
    }

    setIsSaving(true);
    try {
      if (editingCategoria) {
        await DBService.updateCategoria(editingCategoria.id, {
          nome: trimmedNome,
          ativo: modalAtivo
        });
        setFeedbackSuccess(`Categoria "${trimmedNome}" atualizada com sucesso!`);
      } else {
        await DBService.addCategoria(trimmedNome, modalAtivo);
        setFeedbackSuccess(`Categoria "${trimmedNome}" criada com sucesso!`);
      }

      setIsModalOpen(false);
      setEditingCategoria(null);
      setModalNome("");
      await loadCategorias();
    } catch (err: any) {
      setModalError(err.message || "Erro ao salvar categoria.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmToggleStatus = async () => {
    if (!categoriaToToggle) return;

    try {
      const newStatus = !categoriaToToggle.ativo;
      await DBService.toggleCategoriaStatus(categoriaToToggle.id, newStatus);
      setFeedbackSuccess(
        newStatus
          ? `Categoria "${categoriaToToggle.nome}" reativada com sucesso!`
          : `Categoria "${categoriaToToggle.nome}" desativada com sucesso!`
      );
      setCategoriaToToggle(null);
      await loadCategorias();
    } catch (err: any) {
      setFeedbackError(err.message || "Erro ao alterar status da categoria.");
      setCategoriaToToggle(null);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="flex-1 bg-[--bg-base] text-slate-800 min-h-screen">
      <Header />

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Navegação de Retorno e Header */}
        <div>
          <a
            href="/configuracoes"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-[#101828] mb-3 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar para Configurações</span>
          </a>

          <PageHeader
            title="Categorias do Cardápio"
            description="Organize as categorias utilizadas no cardápio da cantina."
            badge={
              <Badge variant="brand" dot>
                GESTÃO
              </Badge>
            }
            action={
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="py-3.5 px-6 rounded-full bg-[#101828] text-white hover:bg-[#1E293B] font-bold text-xs transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-98"
              >
                <Plus className="h-4 w-4 text-[#84E2FA]" />
                <span>Nova categoria</span>
              </button>
            }
          />
        </div>

        {/* Feedback Mensagens */}
        {feedbackSuccess && (
          <div className="bg-[#F0FCEE] text-[#14532D] p-4 rounded-2xl flex items-center justify-between text-xs font-bold animate-fade-in shadow-2xs">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-600" />
              <span>{feedbackSuccess}</span>
            </div>
            <button
              onClick={() => setFeedbackSuccess("")}
              className="text-[#14532D] hover:opacity-75 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {feedbackError && (
          <div className="bg-rose-50 text-rose-800 p-4 rounded-2xl flex items-center justify-between text-xs font-bold animate-fade-in shadow-2xs border border-rose-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600" />
              <span>{feedbackError}</span>
            </div>
            <button
              onClick={() => setFeedbackError("")}
              className="text-rose-800 hover:opacity-75 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Lista de Categorias */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-16 space-y-3">
            <div className="h-8 w-8 rounded-full border-3 border-[#101828] border-t-transparent animate-spin" />
            <span className="text-xs font-bold text-slate-400">Carregando categorias...</span>
          </div>
        ) : categorias.length === 0 ? (
          <EmptyState
            icon={<UtensilsCrossed className="h-8 w-8 text-[#DB2777]" />}
            title="Nenhuma categoria cadastrada"
            description="Cadastre a primeira categoria para organizar os produtos no Terminal da Cantina."
            variant="pink"
            action={
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="py-3 px-5 rounded-full bg-[#101828] text-white hover:bg-[#1E293B] text-xs font-bold transition-all cursor-pointer"
              >
                + Adicionar Primeira Categoria
              </button>
            }
          />
        ) : (
          <div className="bg-white rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-black/5">
              <h3 className="text-sm font-extrabold text-[#101828]">
                Todas as Categorias ({categorias.length})
              </h3>
              <span className="text-xs text-slate-400 font-medium">
                {categorias.filter(c => c.ativo).length} ativas • {categorias.filter(c => !c.ativo).length} inativas
              </span>
            </div>

            {/* Visualização Desktop (Tabela) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider text-[10px] font-black">
                    <th className="py-3.5 px-4">Nome da Categoria</th>
                    <th className="py-3.5 px-4 text-center">Itens Associados</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categorias.map(cat => (
                    <tr key={cat.id} className="hover:bg-[#F7F6F3]/50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-9 w-9 rounded-2xl flex items-center justify-center font-black text-xs ${
                            cat.ativo ? 'bg-[#FFF0F8] text-[#DB2777]' : 'bg-slate-100 text-slate-400'
                          }`}>
                            {cat.nome.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className={`font-black text-sm block ${cat.ativo ? 'text-[#101828]' : 'text-slate-400 line-through'}`}>
                              {cat.nome}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">slug: {cat.slug}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-[#F7F6F3] text-slate-700">
                          {cat.produtos_count || 0} {cat.produtos_count === 1 ? 'item' : 'itens'}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-center">
                        {cat.ativo ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#F0FCEE] text-[#14532D]">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Ativa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-500">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                            Inativa
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(cat)}
                            className="p-2 rounded-xl text-slate-600 hover:text-[#101828] hover:bg-[#F7F6F3] transition-colors cursor-pointer"
                            title="Editar Categoria"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (cat.ativo && (cat.produtos_count ?? 0) > 0) {
                                setCategoriaToToggle(cat);
                              } else {
                                setCategoriaToToggle(cat);
                              }
                            }}
                            className={`p-2 rounded-xl transition-colors cursor-pointer ${
                              cat.ativo
                                ? 'text-amber-600 hover:bg-amber-50'
                                : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={cat.ativo ? "Desativar Categoria" : "Reativar Categoria"}
                          >
                            <Power className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Visualização Mobile (Cards) */}
            <div className="sm:hidden space-y-3">
              {categorias.map(cat => (
                <div
                  key={cat.id}
                  className="p-4 bg-[#F7F6F3] rounded-2xl flex flex-col space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`h-8 w-8 rounded-xl flex items-center justify-center font-black text-xs ${
                        cat.ativo ? 'bg-white text-[#DB2777]' : 'bg-slate-200 text-slate-500'
                      }`}>
                        {cat.nome.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className={`font-black text-sm leading-tight ${cat.ativo ? 'text-[#101828]' : 'text-slate-400 line-through'}`}>
                          {cat.nome}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-mono">slug: {cat.slug}</span>
                      </div>
                    </div>

                    {cat.ativo ? (
                      <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-[#F0FCEE] text-[#14532D]">
                        Ativa
                      </span>
                    ) : (
                      <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-600">
                        Inativa
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-black/5 text-xs">
                    <span className="text-slate-500 font-bold">
                      {cat.produtos_count || 0} itens associados
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(cat)}
                        className="py-1.5 px-3 rounded-full bg-white text-slate-700 text-xs font-bold shadow-2xs cursor-pointer"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => setCategoriaToToggle(cat)}
                        className={`py-1.5 px-3 rounded-full text-xs font-bold shadow-2xs cursor-pointer ${
                          cat.ativo ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'
                        }`}
                      >
                        {cat.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* MODAL: CRIAR / EDITAR CATEGORIA */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-7 space-y-6 animate-scale-up">
            <div className="flex justify-between items-center pb-3 border-b border-black/5">
              <h3 className="text-base font-black text-[#101828]">
                {editingCategoria ? "Editar Categoria" : "Nova Categoria"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  Nome da Categoria *
                </label>
                <Input
                  type="text"
                  value={modalNome}
                  onChange={e => setModalNome(e.target.value)}
                  placeholder="Ex: Salgados, Bebidas, Lanches..."
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  Status
                </label>
                <div className="flex bg-[#F7F6F3] p-1 rounded-full text-xs font-bold text-slate-600 gap-1">
                  <button
                    type="button"
                    onClick={() => setModalAtivo(true)}
                    className={`flex-1 py-2 rounded-full transition-all cursor-pointer ${
                      modalAtivo ? 'bg-[#101828] text-white shadow-xs' : 'hover:text-[#101828]'
                    }`}
                  >
                    Ativa
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalAtivo(false)}
                    className={`flex-1 py-2 rounded-full transition-all cursor-pointer ${
                      !modalAtivo ? 'bg-[#101828] text-white shadow-xs' : 'hover:text-[#101828]'
                    }`}
                  >
                    Inativa
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 font-medium">
                  {modalAtivo
                    ? "Aparecerá para seleção em novos produtos no cardápio."
                    : "Ficará oculta para novos cadastros, preservando itens históricos."}
                </p>
              </div>

              {modalError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-2xl text-xs flex items-center gap-2 animate-fade-in">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="pt-2 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3.5 px-5 rounded-full text-xs font-bold text-slate-600 bg-[#F7F6F3] hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-3.5 px-5 rounded-full text-xs font-black text-white bg-[#101828] hover:bg-[#1E293B] transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSaving ? "Salvando..." : (editingCategoria ? "Atualizar" : "Cadastrar")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL / CONFIRMAÇÃO DE DESATIVAÇÃO OU ATIVAÇÃO */}
      {categoriaToToggle && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-7 space-y-5 animate-scale-up text-center">
            <div className="h-14 w-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="h-7 w-7" />
            </div>

            <div>
              <h3 className="text-base font-black text-[#101828]">
                {categoriaToToggle.ativo
                  ? `Desativar Categoria "${categoriaToToggle.nome}"?`
                  : `Reativar Categoria "${categoriaToToggle.nome}"?`}
              </h3>

              {categoriaToToggle.ativo ? (
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  {(categoriaToToggle.produtos_count ?? 0) > 0 ? (
                    <strong className="text-amber-800 block mb-1">
                      Esta categoria possui {categoriaToToggle.produtos_count} {categoriaToToggle.produtos_count === 1 ? 'item associado' : 'itens associados'}.
                    </strong>
                  ) : null}
                  Ela será desativada e deixará de aparecer para novos cadastros de produtos, mas seus itens históricos serão preservados.
                </p>
              ) : (
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  A categoria voltará a ficar disponível para seleção em novos produtos no Terminal da Cantina.
                </p>
              )}
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setCategoriaToToggle(null)}
                className="flex-1 py-3 px-5 rounded-full text-xs font-bold text-slate-600 bg-[#F7F6F3] hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmToggleStatus}
                className={`flex-1 py-3 px-5 rounded-full text-xs font-black text-white transition-colors cursor-pointer shadow-xs ${
                  categoriaToToggle.ativo
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-[#101828] hover:bg-[#1E293B]'
                }`}
              >
                {categoriaToToggle.ativo ? "Sim, Desativar" : "Sim, Reativar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
