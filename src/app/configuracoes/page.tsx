"use client";

import { useEffect, useState } from "react";
import { DBService, Profile, Aluno } from "@/services/db";
import Header from "../components/Header";
import { PageHeader } from "../components/ui/PageHeader";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { EmptyState } from "../components/ui/EmptyState";
import {
  School,
  Users,
  FileSpreadsheet,
  UploadCloud,
  Trash2,
  Edit2,
  Link2,
  Plus,
  ArrowLeft,
  Check,
  AlertCircle,
  X,
  Layers
} from "lucide-react";

export default function ConfigissoesPage() {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [view, setView] = useState<'grid' | 'turmas'>('grid');

  // Turmas list management
  const [turmasList, setTurmasList] = useState<string[]>([]);
  const [extraTurmas, setExtraTurmas] = useState<string[]>([]);
  const [classLinks, setClassLinks] = useState<Record<string, string>>({});

  // Input states
  const [newTurmaName, setNewTurmaName] = useState("");
  const [studentInputs, setStudentInputs] = useState<Record<string, string>>({});

  // Modais
  const [importingTurma, setImportingTurma] = useState<string | null>(null);
  const [csvText, setCsvText] = useState("");
  const [importMethod, setImportMethod] = useState<'file' | 'text'>('file');
  const [csvFile, setCsvFile] = useState<File | null>(null);

  const [editingAluno, setEditingAluno] = useState<Aluno | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editRa, setEditRa] = useState("");
  const [editDigito, setEditDigito] = useState("");
  const [editTurma, setEditTurma] = useState("");
  const [editNascimento, setEditNascimento] = useState("");

  // Feedback states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    const user = DBService.getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'gestao')) {
      window.location.href = "/";
      return;
    }
    setCurrentUser(user);
    loadAllData();

    if (typeof window !== "undefined") {
      const savedLinks = localStorage.getItem("cantina_class_links");
      if (savedLinks) {
        setClassLinks(JSON.parse(savedLinks));
      }
      const savedExtra = localStorage.getItem("cantina_extra_turmas");
      if (savedExtra) {
        setExtraTurmas(JSON.parse(savedExtra));
      }
    }
  }, []);

  const loadAllData = async () => {
    try {
      const allAlunos = await DBService.getAlunos();
      setAlunos(allAlunos);
      const activeTurmas = Array.from(new Set(allAlunos.map(a => a.turma).filter(Boolean)));
      setTurmasList(activeTurmas);
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    }
  };

  const saveClassLink = (turma: string, link: string) => {
    const updated = { ...classLinks, [turma]: link };
    setClassLinks(updated);
    localStorage.setItem("cantina_class_links", JSON.stringify(updated));
    setSuccessMsg(`Link da turma ${turma} salvo com sucesso!`);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleAddTurma = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newTurmaName.trim().toUpperCase();
    if (!name) return;

    if (turmasList.includes(name) || extraTurmas.includes(name)) {
      setErrorMsg("Esta turma já existe.");
      setTimeout(() => setErrorMsg(""), 3000);
      return;
    }

    const updatedExtra = [...extraTurmas, name];
    setExtraTurmas(updatedExtra);
    localStorage.setItem("cantina_extra_turmas", JSON.stringify(updatedExtra));
    setNewTurmaName("");
    setSuccessMsg(`Turma ${name} criada com sucesso!`);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleDeleteTurma = async (turma: string) => {
    if (confirm(`Tem certeza que deseja excluir a turma "${turma}" e TODOS os seus alunos?`)) {
      setIsLoading(true);
      try {
        const classStudents = alunos.filter(a => a.turma === turma);
        for (const student of classStudents) {
          await DBService.deleteAluno(student.id);
        }

        const updatedExtra = extraTurmas.filter(t => t !== turma);
        setExtraTurmas(updatedExtra);
        localStorage.setItem("cantina_extra_turmas", JSON.stringify(updatedExtra));

        const updatedLinks = { ...classLinks };
        delete updatedLinks[turma];
        setClassLinks(updatedLinks);
        localStorage.setItem("cantina_class_links", JSON.stringify(updatedLinks));

        await loadAllData();
        setSuccessMsg(`Turma "${turma}" e seus alunos foram excluídos.`);
        setTimeout(() => setSuccessMsg(""), 3000);
      } catch (err: any) {
        setErrorMsg(err.message || "Erro ao excluir turma.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleAddStudent = async (turma: string) => {
    const nome = studentInputs[turma]?.trim();
    if (!nome) return;

    setIsLoading(true);
    try {
      const ra = Math.floor(100000 + Math.random() * 900000).toString();
      const digito = Math.floor(0 + Math.random() * 10).toString();

      await DBService.addAluno(nome, ra, turma);
      setStudentInputs(prev => ({ ...prev, [turma]: "" }));

      if (extraTurmas.includes(turma)) {
        const updatedExtra = extraTurmas.filter(t => t !== turma);
        setExtraTurmas(updatedExtra);
        localStorage.setItem("cantina_extra_turmas", JSON.stringify(updatedExtra));
      }

      await loadAllData();
    } catch (err: any) {
      alert(err.message || "Erro ao adicionar aluno.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (confirm("Deseja realmente excluir este aluno?")) {
      setIsLoading(true);
      try {
        await DBService.deleteAluno(id);
        await loadAllData();
      } catch (err: any) {
        alert(err.message || "Erro ao excluir aluno.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleClearList = async (turma: string) => {
    if (confirm(`Deseja realmente excluir TODOS os alunos da turma "${turma}"?`)) {
      setIsLoading(true);
      try {
        const classStudents = alunos.filter(a => a.turma === turma);
        for (const student of classStudents) {
          await DBService.deleteAluno(student.id);
        }

        if (!extraTurmas.includes(turma)) {
          const updatedExtra = [...extraTurmas, turma];
          setExtraTurmas(updatedExtra);
          localStorage.setItem("cantina_extra_turmas", JSON.stringify(updatedExtra));
        }

        await loadAllData();
        setSuccessMsg(`Todos os alunos da turma ${turma} foram removidos.`);
        setTimeout(() => setSuccessMsg(""), 3000);
      } catch (err: any) {
        setErrorMsg(err.message || "Erro ao limpar lista.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) || "");
      reader.onerror = (err) => reject(err);
      reader.readAsText(file, "UTF-8");
    });
  };

  const parseCSVFile = (text: string, targetTurma: string): any[] => {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      throw new Error("O arquivo CSV está vazio.");
    }

    let headerIndex = -1;
    let delimiter = ';';
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let cols = line.split(';').map(c => c.trim().replace(/^["']|["']$/g, ''));
      const hasNome = cols.some(c => c.toLowerCase().includes('nome do aluno') || c.toLowerCase() === 'nome');
      const hasRa = cols.some(c => c.toLowerCase() === 'ra');
      if (hasNome && hasRa) {
        headerIndex = i;
        delimiter = ';';
        break;
      }

      cols = line.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
      const hasNomeComma = cols.some(c => c.toLowerCase().includes('nome do aluno') || c.toLowerCase() === 'nome');
      const hasRaComma = cols.some(c => c.toLowerCase() === 'ra');
      if (hasNomeComma && hasRaComma) {
        headerIndex = i;
        delimiter = ',';
        break;
      }
    }

    if (headerIndex === -1) {
      throw new Error("Cabeçalho não identificado no CSV. Certifique-se de que a tabela possui as colunas 'Nome do Aluno' e 'RA'.");
    }

    const headers = lines[headerIndex].split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
    const findColumnIndex = (keyword: string) => {
      return headers.findIndex(h => h.toLowerCase() === keyword.toLowerCase() || h.toLowerCase().includes(keyword.toLowerCase()));
    };

    const nomeIdx = findColumnIndex('nome do aluno') !== -1 ? findColumnIndex('nome do aluno') : findColumnIndex('nome');
    const raIdx = findColumnIndex('ra');
    const digIdx = findColumnIndex('dig. ra') !== -1 ? findColumnIndex('dig. ra') : (findColumnIndex('dig') !== -1 ? findColumnIndex('dig') : findColumnIndex('dígito'));
    const nascCIdx = findColumnIndex('data de nascimento') !== -1 ? findColumnIndex('data de nascimento') : (findColumnIndex('nascimento') !== -1 ? findColumnIndex('nascimento') : findColumnIndex('nasc'));
    const sitIdx = findColumnIndex('situação') !== -1 ? findColumnIndex('situação') : findColumnIndex('situacao');

    if (nomeIdx === -1 || raIdx === -1) {
      throw new Error("Colunas obrigatórias ('Nome do Aluno' e 'RA') não encontradas.");
    }

    const ignoredSituations = ["REMA", "TRAN", "BXTR", "NCOM", "RECL"];
    const parsedAlunos: any[] = [];
    const seenLocalKeys = new Set<string>();

    for (let i = headerIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      let cols: string[] = [];
      if (delimiter === ';') {
        cols = line.split(';').map(c => c.trim().replace(/^["']|["']$/g, ''));
      } else {
        cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^["']|["']$/g, ''));
      }

      if (cols.length <= Math.max(nomeIdx, raIdx)) continue;

      const nome = cols[nomeIdx]?.trim();
      if (!nome) continue;

      if (sitIdx !== -1 && cols[sitIdx]) {
        const situacao = cols[sitIdx].trim().toUpperCase();
        if (ignoredSituations.includes(situacao)) {
          continue;
        }
      }

      let raRaw = cols[raIdx]?.trim() || "";
      let raClean = raRaw.replace(',', '.');
      let raNum = Number(raClean);
      let ra = isNaN(raNum) ? raRaw : Math.round(raNum).toString();

      let digito = digIdx !== -1 ? cols[digIdx]?.trim() || "" : "";
      if (digito && !isNaN(Number(digito))) {
        digito = Math.round(Number(digito)).toString();
      }

      let dataNascimento = nascCIdx !== -1 ? cols[nascCIdx]?.trim() || "" : "";

      const localKey = `${ra}-${digito}`.toUpperCase();
      if (seenLocalKeys.has(localKey)) continue;

      const existsInDb = alunos.some(existing =>
        existing.ra === ra &&
        (existing.digito || "") === (digito || "")
      );
      if (existsInDb) continue;

      seenLocalKeys.add(localKey);
      parsedAlunos.push({
        nome: nome.toUpperCase(),
        ra,
        digito,
        data_nascimento: dataNascimento,
        turma: targetTurma,
        saldo: 0.00,
        ativo: true
      });
    }

    return parsedAlunos;
  };

  const handleImportCsv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importingTurma) return;

    setIsLoading(true);
    try {
      let newAlunos: any[] = [];

      if (importMethod === 'file') {
        if (!csvFile) {
          throw new Error("Por favor, selecione um arquivo CSV.");
        }
        const text = await readFileAsText(csvFile);
        newAlunos = parseCSVFile(text, importingTurma);
      } else {
        if (!csvText.trim()) {
          throw new Error("A lista de nomes está vazia.");
        }
        const names = csvText
          .split("\n")
          .map(line => line.trim())
          .filter(line => line.length > 0);

        if (names.length === 0) {
          throw new Error("A lista de nomes está vazia.");
        }

        newAlunos = names.map(name => {
          const ra = Math.floor(100000 + Math.random() * 900000).toString();
          const digito = Math.floor(0 + Math.random() * 10).toString();
          return {
            nome: name.toUpperCase(),
            ra,
            digito,
            turma: importingTurma,
            saldo: 0.00,
            ativo: true
          };
        });
      }

      if (newAlunos.length === 0) {
        throw new Error("Nenhum estudante novo para importar (todos já existem ou foram ignorados).");
      }

      await DBService.addAlunosBulk(newAlunos);

      if (extraTurmas.includes(importingTurma)) {
        const updatedExtra = extraTurmas.filter(t => t !== importingTurma);
        setExtraTurmas(updatedExtra);
        localStorage.setItem("cantina_extra_turmas", JSON.stringify(updatedExtra));
      }

      setCsvText("");
      setCsvFile(null);
      setImportingTurma(null);
      await loadAllData();
      setSuccessMsg(`${newAlunos.length} alunos importados com sucesso!`);
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (err: any) {
      alert(err.message || "Erro ao importar alunos.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenEdit = (aluno: Aluno) => {
    setEditingAluno(aluno);
    setEditNome(aluno.nome);
    setEditRa(aluno.ra);
    setEditDigito(aluno.digito || "0");
    setEditTurma(aluno.turma);
    setEditNascimento(aluno.data_nascimento || "");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAluno) return;

    setIsLoading(true);
    try {
      await DBService.updateAluno(editingAluno.id, {
        nome: editNome.trim().toUpperCase(),
        ra: editRa.trim(),
        digito: editDigito.trim(),
        turma: editTurma.trim().toUpperCase(),
        data_nascimento: editNascimento.trim()
      });

      setEditingAluno(null);
      await loadAllData();
      setSuccessMsg("Dados do aluno atualizados com sucesso!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      alert(err.message || "Erro ao salvar alterações.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentUser) return null;

  const allTurmas = Array.from(new Set([...turmasList, ...extraTurmas])).sort();

  return (
    <div className="flex-1 bg-[--bg-base] text-slate-800 min-h-screen">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* VIEW 1: GRID PRINCIPAL */}
        {view === 'grid' && (
          <div className="space-y-8">
            <PageHeader
              title="Configurações Escolares"
              description="Gerenciamento de turmas, enturmação de estudantes e parâmetros gerais."
              action={
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => window.location.href = "/admin"}
                  leftIcon={<ArrowLeft className="h-4 w-4" />}
                >
                  Voltar ao Painel
                </Button>
              }
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Card: TURMAS (ATIVO) */}
              <button
                onClick={() => setView('turmas')}
                className="bg-white hover:border-slate-300 hover:shadow-md border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between h-48 transition-all cursor-pointer text-left group"
              >
                <div className="space-y-2">
                  <div className="h-10 w-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100 group-hover:scale-105 transition-transform">
                    <School className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 group-hover:text-red-600 transition-colors">
                      Turmas & Estudantes
                    </h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                      Configuração de turmas e enturmação via planilha
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                  <Badge variant="brand">{allTurmas.length} turmas</Badge>
                  <span className="text-xs font-bold text-slate-700 group-hover:text-red-600 transition-colors">
                    Gerenciar →
                  </span>
                </div>
              </button>

              {/* Card: Servidores (Leitura) */}
              <div className="bg-white/60 border border-slate-200 rounded-3xl p-6 shadow-2xs flex flex-col justify-between h-48 opacity-60">
                <div className="space-y-2">
                  <div className="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-700">Corpo Docente</h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">Professores e servidores habilitados</p>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                  <Badge variant="neutral">Apenas Leitura</Badge>
                </div>
              </div>

              {/* Card: Secretaria Geral */}
              <div className="bg-white/60 border border-slate-200 rounded-3xl p-6 shadow-2xs flex flex-col justify-between h-48 opacity-60">
                <div className="space-y-2">
                  <div className="h-10 w-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-700">Secretaria & Permissões</h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">Controle de perfis de acesso</p>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                  <Badge variant="neutral">Apenas Leitura</Badge>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: GERENCIAMENTO DE TURMAS */}
        {view === 'turmas' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setView('grid')}
                  className="h-9 w-9 rounded-2xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer shadow-xs"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 leading-tight">Gestão de Turmas</h2>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">Adicione turmas, importe estudantes e gerencie cadastros.</p>
                </div>
              </div>

              {/* Formulário Nova Turma */}
              <form onSubmit={handleAddTurma} className="flex gap-2">
                <Input
                  type="text"
                  value={newTurmaName}
                  onChange={e => setNewTurmaName(e.target.value)}
                  placeholder="Ex: 6ºB"
                  className="w-28 uppercase font-bold text-center"
                  required
                />
                <Button
                  type="submit"
                  variant="brand"
                  size="md"
                  leftIcon={<Plus className="h-4 w-4" />}
                >
                  Criar Turma
                </Button>
              </form>
            </div>

            {/* Alertas */}
            {successMsg && (
              <div className="text-xs text-emerald-700 bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200 font-medium flex items-center gap-2 animate-fade-in">
                <Check className="h-4 w-4 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}
            {errorMsg && (
              <div className="text-xs text-rose-700 bg-rose-50 p-3.5 rounded-2xl border border-rose-200 font-medium flex items-center gap-2 animate-fade-in">
                <AlertCircle className="h-4 w-4 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Lista de Turmas */}
            {allTurmas.length === 0 ? (
              <EmptyState
                icon={<School className="h-8 w-8 text-slate-400" />}
                title="Nenhuma turma cadastrada"
                description="Crie uma turma usando o campo acima para começar a cadastrar estudantes."
              />
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {allTurmas.map(turma => {
                  const turmaStudents = alunos.filter(a => a.turma === turma);
                  const count = turmaStudents.length;

                  return (
                    <div
                      key={turma}
                      className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4"
                    >
                      {/* Top Bar da Turma */}
                      <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-black text-xs border border-red-100">
                            {turma.substring(0, 3)}
                          </div>
                          <h3 className="font-extrabold text-base text-slate-900">{turma}</h3>
                          <Badge variant="neutral">{count} estudantes</Badge>
                        </div>
                        <button
                          onClick={() => handleDeleteTurma(turma)}
                          className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
                          title="Excluir Turma"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Link da Turma */}
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            type="text"
                            defaultValue={classLinks[turma] || ""}
                            onBlur={(e) => saveClassLink(turma, e.target.value)}
                            placeholder="Link do drive ou material da turma..."
                            leftIcon={<Link2 className="h-4 w-4" />}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          size="md"
                          onClick={(e) => {
                            const input = e.currentTarget.parentElement?.querySelector('input') as HTMLInputElement | null;
                            if (input) saveClassLink(turma, input.value);
                          }}
                        >
                          Salvar Link
                        </Button>
                      </div>

                      {/* Barra de Ações Rápidas */}
                      <div className="flex flex-wrap items-center justify-between gap-3 py-2 bg-slate-50 rounded-2xl border border-slate-200/80 px-4">
                        <span className="text-xs text-slate-600 font-semibold">
                          Ações da Turma:
                        </span>
                        <div className="flex gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setImportingTurma(turma)}
                            leftIcon={<FileSpreadsheet className="h-3.5 w-3.5 text-red-600" />}
                          >
                            Importar CSV
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleClearList(turma)}
                            className="text-slate-500 hover:text-rose-600"
                          >
                            Limpar Turma
                          </Button>
                        </div>
                      </div>

                      {/* Inserir Aluno Rápido */}
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          value={studentInputs[turma] || ""}
                          onChange={(e) => setStudentInputs(prev => ({ ...prev, [turma]: e.target.value }))}
                          placeholder="Nome completo do novo estudante..."
                          className="flex-1"
                        />
                        <Button
                          variant="brand"
                          size="md"
                          onClick={() => handleAddStudent(turma)}
                          disabled={isLoading}
                        >
                          Adicionar
                        </Button>
                      </div>

                      {/* Lista de Estudantes da Turma */}
                      {count === 0 ? (
                        <div className="text-center py-6 text-slate-400 text-xs italic bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                          Nenhum estudante cadastrado nesta turma ainda.
                        </div>
                      ) : (
                        <div className="max-h-64 overflow-y-auto border border-slate-100 rounded-2xl divide-y divide-slate-100 pr-1">
                          {turmaStudents.sort((a, b) => a.nome.localeCompare(b.nome)).map(student => (
                            <div
                              key={student.id}
                              className="p-3 hover:bg-slate-50/70 transition-colors flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div>
                                  <span className="font-bold text-slate-900 block truncate">{student.nome}</span>
                                  <span className="text-[11px] text-slate-400 font-mono">
                                    RA: {student.ra}-{student.digito || "0"}
                                    {student.data_nascimento && ` • Nasc: ${student.data_nascimento}`}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleOpenEdit(student)}
                                  className="h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
                                  title="Editar Aluno"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteStudent(student.id)}
                                  className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
                                  title="Excluir Aluno"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL: IMPORTAÇÃO CSV */}
      {importingTurma && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Importar Alunos</h3>
                <p className="text-xs text-slate-400 mt-0.5">Destino: Turma <strong className="text-slate-700">{importingTurma}</strong></p>
              </div>
              <button
                onClick={() => { setImportingTurma(null); setCsvFile(null); setCsvText(""); }}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Abas */}
            <div className="flex bg-slate-100 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setImportMethod('file')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  importMethod === 'file' ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Planilha CSV
              </button>
              <button
                type="button"
                onClick={() => setImportMethod('text')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  importMethod === 'text' ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Lista Manual
              </button>
            </div>

            <form onSubmit={handleImportCsv} className="space-y-4">
              {importMethod === 'file' ? (
                <div className="space-y-3">
                  <div className="border-2 border-dashed border-slate-200 hover:border-red-400 rounded-2xl p-6 transition-colors flex flex-col items-center justify-center text-center relative bg-slate-50/50 space-y-2">
                    <UploadCloud className="h-8 w-8 text-red-600" />
                    <span className="text-xs font-bold text-slate-800">
                      {csvFile ? csvFile.name : "Clique para selecionar o arquivo .CSV"}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {csvFile ? `${(csvFile.size / 1024).toFixed(1)} KB` : "Mapeia Nome do Aluno, RA, Dig. RA e Nascimento"}
                    </span>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      required={importMethod === 'file'}
                    />
                  </div>

                  <div className="text-[11px] text-slate-600 bg-amber-50/80 border border-amber-200/60 rounded-2xl p-3.5 space-y-1">
                    <p className="font-bold text-amber-900">Regras de Leitura:</p>
                    <ul className="list-disc pl-4 space-y-0.5 text-[10px] text-amber-800">
                      <li>Colunas necessárias: <strong>Nome do Aluno</strong> e <strong>RA</strong>.</li>
                      <li>Colunas opcionais: <strong>Dig. RA</strong> e <strong>Data de Nascimento</strong>.</li>
                      <li>Alunos com situação inativa (REMA, TRAN, etc.) são ignorados.</li>
                      <li>Registros duplicados no mesmo RA são desconsiderados.</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600">Cole os nomes (um por linha):</label>
                  <textarea
                    value={csvText}
                    onChange={e => setCsvText(e.target.value)}
                    placeholder="JOÃO VICTOR SILVA&#10;MARIA EDUARDA SANTOS&#10;PEDRO HENRIQUE LIMA"
                    rows={6}
                    className="textarea font-mono text-xs"
                    required={importMethod === 'text'}
                  />
                  <span className="text-[10px] text-slate-400 block">
                    RAs e dígitos serão gerados de forma automática para cada estudante.
                  </span>
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => {
                    setImportingTurma(null);
                    setCsvText("");
                    setCsvFile(null);
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="brand"
                  size="md"
                  disabled={isLoading}
                  className="flex-1 shadow-xs"
                >
                  {isLoading ? "Processando..." : "Importar Alunos"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIÇÃO DE ALUNO */}
      {editingAluno && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900">Editar Cadastro</h3>
              <button
                onClick={() => setEditingAluno(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Nome Completo</label>
                <Input
                  type="text"
                  value={editNome}
                  onChange={e => setEditNome(e.target.value)}
                  className="font-bold uppercase"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1">RA (Registro)</label>
                  <Input
                    type="text"
                    value={editRa}
                    onChange={e => setEditRa(e.target.value)}
                    className="font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Dígito</label>
                  <Input
                    type="text"
                    value={editDigito}
                    onChange={e => setEditDigito(e.target.value)}
                    maxLength={1}
                    className="text-center font-mono font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Turma / Classe</label>
                <Input
                  type="text"
                  value={editTurma}
                  onChange={e => setEditTurma(e.target.value)}
                  className="uppercase font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Data de Nascimento</label>
                <Input
                  type="text"
                  value={editNascimento}
                  onChange={e => setEditNascimento(e.target.value)}
                  placeholder="Ex: 15/05/2012"
                />
              </div>

              <div className="flex gap-2.5 pt-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setEditingAluno(null)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="brand"
                  size="md"
                  disabled={isLoading}
                  className="flex-1 shadow-xs"
                >
                  {isLoading ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
