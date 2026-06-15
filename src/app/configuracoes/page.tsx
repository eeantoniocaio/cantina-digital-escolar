"use client";

import { useEffect, useState } from "react";
import { DBService, Profile, Aluno } from "@/services/db";
import Header from "../components/Header";

export default function ConfigissoesPage() {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [view, setView] = useState<'grid' | 'turmas'>('grid');
  
  // Turmas list management
  const [turmasList, setTurmasList] = useState<string[]>([]);
  const [extraTurmas, setExtraTurmas] = useState<string[]>([]); // Turmas criadas sem alunos ainda
  const [classLinks, setClassLinks] = useState<Record<string, string>>({});

  // Input states
  const [newTurmaName, setNewTurmaName] = useState("");
  const [studentInputs, setStudentInputs] = useState<Record<string, string>>({}); // Inputs de adicionar aluno por turma

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

    // Carregar links de turmas salvos
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

      // Agrupar turmas existentes
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

        // Remover da lista de extras
        const updatedExtra = extraTurmas.filter(t => t !== turma);
        setExtraTurmas(updatedExtra);
        localStorage.setItem("cantina_extra_turmas", JSON.stringify(updatedExtra));

        // Limpar links
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
      // Gerar RA e dígito aleatórios
      const ra = Math.floor(100000 + Math.random() * 900000).toString();
      const digito = Math.floor(0 + Math.random() * 10).toString(); // dígito entre 0 e 9

      await DBService.addAluno(nome, ra, turma);
      
      // Limpar input
      setStudentInputs(prev => ({ ...prev, [turma]: "" }));
      
      // Remover do extra se agora tem alunos
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

        // Adiciona à lista de extras para que o card continue sendo exibido mesmo vazio
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

    // Identificar a linha de cabeçalho
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
      throw new Error("Não foi possível encontrar o cabeçalho no arquivo CSV. Certifique-se de que a tabela possui as colunas 'Nome do Aluno' e 'RA'.");
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
      throw new Error("Colunas obrigatórias ('Nome do Aluno' e 'RA') não foram encontradas na linha do cabeçalho.");
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

      // Filtrar por situação inativa
      if (sitIdx !== -1 && cols[sitIdx]) {
        const situacao = cols[sitIdx].trim().toUpperCase();
        if (ignoredSituations.includes(situacao)) {
          continue; // Pula aluno
        }
      }

      // Tratamento de RA científico (Ex: "1,15E+08" -> 115000000)
      let raRaw = cols[raIdx]?.trim() || "";
      let raClean = raRaw.replace(',', '.');
      let raNum = Number(raClean);
      let ra = isNaN(raNum) ? raRaw : Math.round(raNum).toString();

      let digito = digIdx !== -1 ? cols[digIdx]?.trim() || "" : "";
      if (digito && !isNaN(Number(digito))) {
        digito = Math.round(Number(digito)).toString();
      }

      let dataNascimento = nascCIdx !== -1 ? cols[nascCIdx]?.trim() || "" : "";

      // Deduplicação na própria lista do CSV
      const localKey = `${ra}-${digito}`.toUpperCase();
      if (seenLocalKeys.has(localKey)) continue;

      // Deduplicação contra alunos já existentes no banco
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
        throw new Error("Nenhum aluno novo para importar (todos já existem, foram ignorados ou são duplicados).");
      }

      await DBService.addAlunosBulk(newAlunos);

      // Remover do extra se agora tem alunos
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
      setSuccessMsg("Dados do aluno atualizados!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      alert(err.message || "Erro ao salvar alterações do aluno.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentUser) return null;

  // Juntar turmas de alunos existentes e turmas criadas vazias
  const allTurmas = Array.from(new Set([...turmasList, ...extraTurmas])).sort();

  return (
    <div className="flex-1 bg-slate-50 text-slate-800 min-h-screen">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8">
        
        {/* VIEW: GRID (PAINEL PRINCIPAL) */}
        {view === 'grid' && (
          <div className="space-y-8">
            <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
              <a href="/admin" className="text-slate-400 hover:text-slate-650 transition-colors text-lg font-bold">
                ←
              </a>
              <div>
                <h2 className="text-xl font-extrabold text-slate-800 leading-tight">Configurações do Sistema</h2>
                <p className="text-xs text-slate-400 mt-0.5">Gerencie os recursos e as tabelas principais da escola.</p>
              </div>
            </div>

            {/* Grid de Cartões estilo do outro app */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Card: TURMAS (ATIVO - CLICÁVEL) */}
              <button
                onClick={() => setView('turmas')}
                className="bg-red-500 hover:bg-red-600 hover:scale-[1.02] active:scale-[0.99] text-white rounded-3xl p-6 shadow-md border border-red-600/10 flex flex-col justify-between h-44 transition-all cursor-pointer relative overflow-hidden text-left"
              >
                <div className="space-y-1">
                  <span className="text-2xl block">🏫</span>
                  <h3 className="font-extrabold text-base">Turmas</h3>
                  <p className="text-[10px] text-red-100 font-semibold">Configuração e enturmação de alunos</p>
                </div>
                <div className="flex justify-between items-center mt-4">
                  <span className="bg-white/20 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-white/10">
                    {allTurmas.length} {allTurmas.length === 1 ? "turma" : "turmas"}
                  </span>
                  <span className="text-[10px] font-bold underline text-white/95">Gerenciar →</span>
                </div>
              </button>

              {/* Card: Corpo Docente (Mock) */}
              <div className="bg-green-500 text-white rounded-3xl p-6 shadow-sm border border-green-600/10 flex flex-col justify-between h-44 opacity-50 relative overflow-hidden select-none">
                <div className="space-y-1">
                  <span className="text-2xl block">👥</span>
                  <h3 className="font-extrabold text-base">Corpo Docente</h3>
                </div>
                <div className="flex justify-between items-center mt-4">
                  <span className="bg-black/15 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-white/10">36 itens</span>
                  <span className="text-[10px] text-white/60 font-semibold uppercase">Apenas leitura</span>
                </div>
              </div>

              {/* Card: Secretaria (Mock) */}
              <div className="bg-pink-500 text-white rounded-3xl p-6 shadow-sm border border-pink-600/10 flex flex-col justify-between h-44 opacity-50 relative overflow-hidden select-none">
                <div className="space-y-1">
                  <span className="text-2xl block">🏫</span>
                  <h3 className="font-extrabold text-base">Secretaria</h3>
                </div>
                <div className="flex justify-between items-center mt-4">
                  <span className="bg-black/15 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-white/10">0 itens</span>
                  <span className="text-[10px] text-white/60 font-semibold uppercase">Apenas leitura</span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* VIEW: TURMAS (GERENCIAMENTO DETALHADO) */}
        {view === 'turmas' && (
          <div className="space-y-8">
            
            {/* Header Detalhes */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setView('grid')}
                  className="text-slate-400 hover:text-slate-650 transition-colors text-lg font-black cursor-pointer"
                >
                  ←
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-xl">🏫</span>
                  <h2 className="text-xl font-extrabold text-slate-800 leading-tight">Turmas</h2>
                </div>
              </div>

              {/* Formulário Nova Turma */}
              <form onSubmit={handleAddTurma} className="flex gap-2">
                <input
                  type="text"
                  value={newTurmaName}
                  onChange={e => setNewTurmaName(e.target.value)}
                  placeholder="Ex: 6ºB"
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold uppercase focus:outline-none focus:border-red-500 w-24 text-center placeholder-slate-400"
                  required
                />
                <button
                  type="submit"
                  className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer shadow-2xs active:scale-95"
                >
                  + Nova Turma
                </button>
              </form>
            </div>

            {/* Feedbacks de Ação */}
            {successMsg && (
              <div className="text-xxs text-emerald-650 bg-emerald-50 p-3 rounded-lg border border-emerald-100 font-bold transition-all animate-bounce">
                🎉 {successMsg}
              </div>
            )}
            {errorMsg && (
              <div className="text-xxs text-red-650 bg-red-50 p-3 rounded-lg border border-red-100 font-bold transition-all">
                ⚠️ {errorMsg}
              </div>
            )}

            {/* Lista de Turmas */}
            {allTurmas.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center text-slate-400 shadow-xs">
                <span className="text-5xl block mb-4">🏫</span>
                Nenhuma turma cadastrada. Crie uma turma preenchendo o formulário acima.
              </div>
            ) : (
              <div className="space-y-6">
                {allTurmas.map(turma => {
                  const turmaStudents = alunos.filter(a => a.turma === turma);
                  const count = turmaStudents.length;

                  return (
                    <div
                      key={turma}
                      className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4"
                    >
                      {/* Cabeçalho da Caixa de Turma */}
                      <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-base text-slate-800">{turma}</h3>
                        </div>
                        <button
                          onClick={() => handleDeleteTurma(turma)}
                          className="h-8 w-8 text-red-550 hover:text-red-700 hover:bg-red-50 rounded-full flex items-center justify-center transition-colors cursor-pointer border border-transparent hover:border-red-100/50"
                          title="Excluir Turma"
                        >
                          🗑️
                        </button>
                      </div>

                      {/* URL / Link da Turma */}
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">🔗</span>
                          <input
                            type="text"
                            defaultValue={classLinks[turma] || ""}
                            onBlur={(e) => saveClassLink(turma, e.target.value)}
                            placeholder="Link da turma (Ex: Canva ou drive link)..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3.5 py-2 text-xs focus:outline-none focus:border-red-500 text-slate-700 placeholder-slate-400"
                          />
                        </div>
                        <button
                          type="button"
                          className="bg-slate-100 hover:bg-slate-200 border border-slate-250 text-slate-750 font-bold text-xs px-4 rounded-xl cursor-pointer"
                          onClick={(e) => {
                            const input = e.currentTarget.parentElement?.querySelector('input') as HTMLInputElement | null;
                            if (input) saveClassLink(turma, input.value);
                          }}
                        >
                          Salvar
                        </button>
                      </div>

                      {/* Ações e Contagem de Alunos */}
                      <div className="flex flex-wrap items-center justify-between gap-4 py-1.5 bg-slate-50/50 rounded-2xl border border-slate-100/80 px-4">
                        <div className="flex items-center gap-2 text-xxs font-bold text-slate-600">
                          <span>Alunos:</span>
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 font-extrabold">
                            {count} {count === 1 ? "aluno" : "alunos"}
                          </span>
                        </div>

                        <div className="flex gap-3 text-xxs font-black">
                          <button
                            onClick={() => setImportingTurma(turma)}
                            className="text-red-600 hover:text-red-750 flex items-center gap-1 cursor-pointer"
                          >
                            📥 Importar Lista / CSV
                          </button>
                          <button
                            onClick={() => handleClearList(turma)}
                            className="text-red-650 hover:text-red-800 flex items-center gap-1 cursor-pointer"
                          >
                            ✕ Limpar lista
                          </button>
                        </div>
                      </div>

                      {/* Adicionar Aluno na Turma */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={studentInputs[turma] || ""}
                          onChange={(e) => setStudentInputs(prev => ({ ...prev, [turma]: e.target.value }))}
                          placeholder="Nome do aluno..."
                          className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-red-500 text-slate-800"
                        />
                        <button
                          onClick={() => handleAddStudent(turma)}
                          disabled={isLoading}
                          className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-5 rounded-xl cursor-pointer disabled:opacity-50"
                        >
                          Adicionar
                        </button>
                      </div>

                      {/* Lista de Alunos (Rolável) */}
                      {count === 0 ? (
                        <div className="text-center py-6 text-slate-400 text-[10px] italic bg-slate-50/30 rounded-2xl border border-dashed border-slate-200">
                          Nenhum estudante matriculado nesta turma.
                        </div>
                      ) : (
                        <div className="max-h-60 overflow-y-auto border border-slate-100 rounded-2xl divide-y divide-slate-100 pr-1">
                          {turmaStudents.sort((a, b) => a.nome.localeCompare(b.nome)).map(student => (
                            <div
                              key={student.id}
                              className="p-3 hover:bg-slate-50/50 transition-colors flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <input
                                  type="checkbox"
                                  className="h-3.5 w-3.5 rounded border-slate-200 text-red-600 focus:ring-red-500 cursor-pointer"
                                />
                                <div className="leading-tight truncate">
                                  <span className="font-extrabold text-slate-850 block uppercase truncate">{student.nome}</span>
                                  <span className="text-[10px] text-slate-400 font-mono">RA: {student.ra}-{student.digito || "0"}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleOpenEdit(student)}
                                  className="h-7 w-7 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full flex items-center justify-center transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                                  title="Editar Aluno"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => handleDeleteStudent(student.id)}
                                  className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50/50 rounded-full flex items-center justify-center transition-colors cursor-pointer border border-transparent hover:border-red-100/40"
                                  title="Remover Aluno"
                                >
                                  🗑️
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

      {/* MODAL: IMPORTAÇÃO CSV / LISTA */}
      {importingTurma && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl p-6 space-y-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-800">Importar Alunos para {importingTurma}</h3>
              <p className="text-xs text-slate-400 mt-1">Selecione o método de importação de estudantes.</p>
            </div>

            {/* Alternador de abas */}
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setImportMethod('file')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  importMethod === 'file'
                    ? "bg-white text-slate-800 shadow-xxs"
                    : "text-slate-450 hover:text-slate-650"
                }`}
              >
                📁 Planilha CSV
              </button>
              <button
                type="button"
                onClick={() => setImportMethod('text')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  importMethod === 'text'
                    ? "bg-white text-slate-800 shadow-xxs"
                    : "text-slate-450 hover:text-slate-650"
                }`}
              >
                📝 Lista Manual
              </button>
            </div>

            <form onSubmit={handleImportCsv} className="space-y-4">
              {importMethod === 'file' ? (
                <div className="space-y-3">
                  <div className="border-2 border-dashed border-slate-200 hover:border-red-400 rounded-2xl p-6 transition-colors flex flex-col items-center justify-center text-center relative bg-slate-50/50">
                    <span className="text-3xl mb-2">📊</span>
                    <span className="text-xs font-extrabold text-slate-700">
                      {csvFile ? csvFile.name : "Clique para selecionar o arquivo CSV"}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1">
                      {csvFile ? `${(csvFile.size / 1024).toFixed(1)} KB` : "Mapeia Nome do Aluno, RA, Dig. RA, Data de Nascimento e Situação"}
                    </span>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 opacity-0 cursor-pointer animate-pulse"
                      required={importMethod === 'file'}
                    />
                  </div>
                  <div className="text-[10px] text-slate-455 bg-amber-50 border border-amber-100 rounded-xl p-3 leading-normal">
                    📌 <strong>Regras da Importação:</strong><br/>
                    • O cabeçalho deve conter as colunas <strong>"Nome do Aluno"</strong> e <strong>"RA"</strong>.<br/>
                    • Serão lidos os campos opcionais <strong>"Dig. RA"</strong> e <strong>"Data de Nascimento"</strong>.<br/>
                    • Serão ignorados alunos com situação <strong>REMA, TRAN, BXTR, NCOM ou RECL</strong>.<br/>
                    • Alunos já matriculados com o mesmo RA serão ignorados automaticamente.
                  </div>
                </div>
              ) : (
                <div>
                  <textarea
                    value={csvText}
                    onChange={e => setCsvText(e.target.value)}
                    placeholder="ANA BEATRIZ BUENO OLIVEIRA&#10;ANA BEATRIZ DE LIMA SOUZA&#10;ARTHUR HENRIQUE PEREIRA SALES"
                    rows={6}
                    className="w-full bg-slate-50 border border-slate-250 rounded-2xl px-4 py-3.5 text-xs text-slate-800 focus:outline-none focus:border-red-500 font-mono"
                    required={importMethod === 'text'}
                  />
                  <p className="text-[9px] text-slate-400 mt-1">Cole um nome de aluno por linha. RAs e dígitos serão gerados aleatoriamente.</p>
                </div>
              )}

              <div className="flex gap-3 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setImportingTurma(null);
                    setCsvText("");
                    setCsvFile(null);
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-655 py-2.5 rounded-xl border border-slate-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? "Processando..." : "Importar Alunos"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIÇÃO DE ALUNO */}
      {editingAluno && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-extrabold text-slate-800">Editar Cadastro de Aluno</h3>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase">Nome Completo</label>
                <input
                  type="text"
                  value={editNome}
                  onChange={e => setEditNome(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-red-500 font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">RA (Registro)</label>
                  <input
                    type="text"
                    value={editRa}
                    onChange={e => setEditRa(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-red-500 font-mono font-bold"
                    required
                  />
                </div>
                <div className="col-span-1 space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Dígito</label>
                  <input
                    type="text"
                    value={editDigito}
                    onChange={e => setEditDigito(e.target.value)}
                    maxLength={1}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-red-500 text-center font-mono font-bold"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase">Turma / Classe</label>
                <input
                  type="text"
                  value={editTurma}
                  onChange={e => setEditTurma(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-red-500 uppercase font-bold"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase">Data de Nascimento</label>
                <input
                  type="text"
                  value={editNascimento}
                  onChange={e => setEditNascimento(e.target.value)}
                  placeholder="Ex: 10/07/2014"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-red-500 font-bold"
                />
              </div>

              <div className="flex gap-3 text-xs font-bold pt-2">
                <button
                  type="button"
                  onClick={() => setEditingAluno(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-655 py-2.5 rounded-xl border border-slate-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
