import { supabase } from './supabaseClient';

export interface Profile {
  id: string;
  email: string;
  nome: string;
  role: 'admin' | 'familia' | 'cantina' | 'aluno' | 'professor' | 'gestao';
  aluno_id?: string;
  criado_em: string;
  rg?: string;
  whatsapp?: string;
}

export interface Aluno {
  id: string;
  nome: string;
  ra: string;
  digito?: string;
  turma: string;
  saldo: number;
  ativo: boolean;
  foto?: string;
  criado_em: string;
}

export interface Comprovante {
  id: string;
  aluno_id: string;
  aluno_nome?: string;
  responsavel_id: string;
  responsavel_nome?: string;
  valor: number;
  pagador: string;
  data_pagamento: string;
  id_transacao: string;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  arquivo_url: string;
  hash_comprovante: string;
  observacao?: string;
  criado_em: string;
}

export interface Movimentacao {
  id: string;
  aluno_id: string;
  aluno_nome?: string;
  tipo: 'credito' | 'debito';
  valor: number;
  descricao: string;
  criado_por: string;
  criado_por_nome?: string;
  criado_em: string;
}

export interface Produto {
  id: string;
  nome: string;
  preco: number;
  categoria: 'salgado' | 'bebida' | 'doce' | 'outro';
  ativo: boolean;
  criado_em: string;
}

export const DADOS_PIX_ESCOLA = {
  chave: "12.345.678/0001-99",
  tipoChave: "CNPJ",
  beneficiario: "CANTINA DIGITAL LTDA",
  banco: "Banco do Brasil",
  cidade: "São Paulo"
};

export class DBService {
  static async getProfiles(): Promise<Profile[]> {
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) throw error;
    return data || [];
  }

  static async getAlunos(): Promise<Aluno[]> {
    const { data, error } = await supabase.from('alunos').select('*').order('nome');
    if (error) throw error;
    return data || [];
  }

  static async getResponsaveis(): Promise<{ familia_id: string; aluno_id: string }[]> {
    const { data, error } = await supabase.from('responsaveis').select('*');
    if (error) throw error;
    return data || [];
  }

  static async getComprovantes(): Promise<Comprovante[]> {
    const { data, error } = await supabase.from('comprovantes').select('*').order('criado_em', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  static async getMovimentacoes(): Promise<Movimentacao[]> {
    const { data, error } = await supabase.from('movimentacoes').select('*').order('criado_em', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  static async getAlunosByResponsavel(responsavelId: string): Promise<Aluno[]> {
    const { data: vinculos, error: vError } = await supabase.from('responsaveis').select('aluno_id').eq('familia_id', responsavelId);
    if (vError) throw vError;
    if (!vinculos || vinculos.length === 0) return [];
    
    const alunoIds = vinculos.map(v => v.aluno_id);
    const { data: alunos, error: aError } = await supabase.from('alunos').select('*').in('id', alunoIds).order('nome');
    if (aError) throw aError;
    return alunos || [];
  }

  static getCurrentUser(): Profile | null {
    if (typeof window === 'undefined') return null;
    const user = localStorage.getItem('cantina_current_user');
    return user ? JSON.parse(user) : null;
  }

  static async login(email: string, role: 'admin' | 'familia' | 'cantina' | 'aluno' | 'professor' | 'gestao'): Promise<Profile> {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('role', role);
    if (error) throw error;

    let profile: Profile;
    if (!profiles || profiles.length === 0) {
      profile = {
        id: crypto.randomUUID(),
        email: email.toLowerCase(),
        nome: email.split('@')[0].toUpperCase(),
        role,
        aluno_id: role === 'aluno' ? 'aluno-1' : (role === 'professor' ? 'prof-1' : undefined),
        criado_em: new Date().toISOString()
      };
      const { error: insertError } = await supabase.from('profiles').insert([profile]);
      if (insertError) throw insertError;
    } else {
      profile = profiles[0];
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('cantina_current_user', JSON.stringify(profile));
    }
    return profile;
  }

  static logout() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('cantina_current_user');
    supabase.auth.signOut();
  }

  static async signUpAluno(params: {
    email: string;
    password: string;
    nome: string;
    ra: string;
    digito: string;
    turma: string;
  }): Promise<Profile> {
    if (!params.email.toLowerCase().endsWith('@al.educacao.sp.gov.br')) {
      throw new Error("Estudantes só podem usar o domínio de e-mail @al.educacao.sp.gov.br");
    }

    // 1. Cadastra no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: {
        data: {
          nome: params.nome,
          role: 'aluno'
        }
      }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error("Erro ao criar usuário no Supabase Auth.");

    // 2. Cria o registro do aluno
    const novoAluno = {
      nome: params.nome,
      ra: params.ra,
      digito: params.digito,
      turma: params.turma,
      saldo: 0.00,
      ativo: true,
      criado_em: new Date().toISOString()
    };
    
    const { data: alunoData, error: alunoError } = await supabase
      .from('alunos')
      .insert([novoAluno])
      .select();

    if (alunoError) throw alunoError;
    const aluno = alunoData[0] as Aluno;

    // 3. Cria o perfil do usuário
    const perfil = {
      id: authData.user.id,
      email: params.email.toLowerCase(),
      nome: params.nome,
      role: 'aluno' as const,
      aluno_id: aluno.id,
      criado_em: new Date().toISOString()
    };

    const { error: profileError } = await supabase
      .from('profiles')
      .insert([perfil]);

    if (profileError) throw profileError;

    return perfil;
  }

  static async signUpResponsavel(params: {
    email: string;
    password: string;
    nome: string;
    rg: string;
    whatsapp: string;
  }): Promise<Profile> {
    // 1. Cadastra no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: {
        data: {
          nome: params.nome,
          role: 'familia'
        }
      }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error("Erro ao criar usuário no Supabase Auth.");

    // 2. Cria o perfil do usuário (com os campos rg e whatsapp)
    const perfil = {
      id: authData.user.id,
      email: params.email.toLowerCase(),
      nome: params.nome,
      role: 'familia' as const,
      rg: params.rg,
      whatsapp: params.whatsapp,
      criado_em: new Date().toISOString()
    };

    const { error: profileError } = await supabase
      .from('profiles')
      .insert([perfil]);

    if (profileError) throw profileError;

    return perfil;
  }

  static async signIn(email: string, password: string): Promise<Profile> {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error("Usuário não autenticado.");

    // Busca o perfil da tabela profiles correspondente ao ID do auth
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id);

    if (profileError) throw profileError;
    if (!profiles || profiles.length === 0) {
      throw new Error("Perfil não encontrado para este usuário no banco de dados.");
    }

    const profile = profiles[0] as Profile;
    if (typeof window !== 'undefined') {
      localStorage.setItem('cantina_current_user', JSON.stringify(profile));
    }
    return profile;
  }

  static async signInWithGoogle(): Promise<void> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined
      }
    });
    if (error) throw error;
  }

  static async handleOAuthCallback(): Promise<Profile | null> {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session?.user) return null;

    const user = session.user;
    
    // Verifica se já tem perfil
    const { data: profiles, error: pError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id);
    
    if (pError) throw pError;

    let profile: Profile;
    if (!profiles || profiles.length === 0) {
      const nome = user.user_metadata.full_name || user.email?.split('@')[0].toUpperCase() || "USUÁRIO GOOGLE";
      const email = user.email || "";
      const emailLower = email.toLowerCase();
      
      const isStudentEmail = emailLower.endsWith('@al.educacao.sp.gov.br');
      const isTeacherEmail = emailLower.endsWith('@prof.educacao.sp.gov.br') || emailLower.endsWith('@servidor.educacao.sp.gov.br');
      
      let role: 'admin' | 'familia' | 'cantina' | 'aluno' | 'professor' | 'gestao' = 'familia';
      if (emailLower === 'andre.avancini@servidor.educacao.sp.gov.br') {
        role = 'gestao';
      } else if (isTeacherEmail) {
        role = 'professor';
      } else if (isStudentEmail) {
        role = 'aluno';
      }
      
      let aluno_id: string | undefined = undefined;
      if (isStudentEmail || isTeacherEmail) {
        // Cria também o Aluno
        const novoAluno = {
          nome,
          ra: (isTeacherEmail ? "P-" : "G-") + Math.random().toString(36).substr(2, 6).toUpperCase(),
          digito: "0",
          turma: isTeacherEmail ? "Professor" : "Não Definitiva",
          saldo: 0.00,
          ativo: true,
          criado_em: new Date().toISOString()
        };
        const { data: aData, error: aError } = await supabase.from('alunos').insert([novoAluno]).select();
        if (!aError && aData && aData.length > 0) {
          aluno_id = aData[0].id;
        }
      }

      profile = {
        id: user.id,
        email,
        nome,
        role,
        aluno_id,
        criado_em: new Date().toISOString()
      };

      await supabase.from('profiles').insert([profile]);
    } else {
      profile = profiles[0];
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('cantina_current_user', JSON.stringify(profile));
    }
    return profile;
  }

  static async signUpProfessor(params: {
    email: string;
    password: string;
    nome: string;
  }): Promise<Profile> {
    const emailLower = params.email.toLowerCase();
    const isAllowedDomain = emailLower.endsWith('@prof.educacao.sp.gov.br') || emailLower.endsWith('@servidor.educacao.sp.gov.br');
    if (!isAllowedDomain) {
      throw new Error("E-mail deve utilizar os domínios @prof.educacao.sp.gov.br ou @servidor.educacao.sp.gov.br");
    }

    const role: Profile['role'] = emailLower === 'andre.avancini@servidor.educacao.sp.gov.br' ? 'gestao' : 'professor';

    // 1. Cadastra no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: {
        data: {
          nome: params.nome,
          role: role
        }
      }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error("Erro ao criar usuário no Supabase Auth.");

    // 2. Cria o registro do aluno/funcionário
    const novoAluno = {
      nome: params.nome,
      ra: "P-" + Math.random().toString(36).substr(2, 6).toUpperCase(),
      digito: "0",
      turma: "Professor",
      saldo: 0.00,
      ativo: true,
      criado_em: new Date().toISOString()
    };
    
    const { data: alunoData, error: alunoError } = await supabase
      .from('alunos')
      .insert([novoAluno])
      .select();

    if (alunoError) throw alunoError;
    const aluno = alunoData[0] as Aluno;

    // 3. Cria o perfil do usuário
    const perfil = {
      id: authData.user.id,
      email: params.email.toLowerCase(),
      nome: params.nome,
      role,
      aluno_id: aluno.id,
      criado_em: new Date().toISOString()
    };

    const { error: profileError } = await supabase
      .from('profiles')
      .insert([perfil]);

    if (profileError) throw profileError;

    return perfil;
  }

  static async addAluno(nome: string, ra: string, turma: string, responsavelId?: string): Promise<Aluno> {
    const novoAluno = {
      nome,
      ra,
      turma,
      saldo: 0.00,
      ativo: true,
      criado_em: new Date().toISOString()
    };
    
    const { data, error } = await supabase.from('alunos').insert([novoAluno]).select();
    if (error) throw error;
    const aluno = data[0] as Aluno;

    if (responsavelId) {
      const { error: vError } = await supabase.from('responsaveis').insert([{ familia_id: responsavelId, aluno_id: aluno.id }]);
      if (vError) throw vError;
    }

    return aluno;
  }

  static async uploadComprovante(params: {
    alunoId: string;
    responsavelId: string;
    valor: number;
    pagador: string;
    dataPagamento: string;
    idTransacao: string;
    arquivoUrl: string;
    hashComprovante: string;
  }): Promise<Comprovante> {
    const { data: compHash, error: errHash } = await supabase.from('comprovantes').select('id').eq('hash_comprovante', params.hashComprovante);
    if (errHash) throw errHash;
    if (compHash && compHash.length > 0) {
      throw new Error("Este arquivo de comprovante já foi enviado anteriormente.");
    }

    if (params.idTransacao) {
      const { data: compTx, error: errTx } = await supabase.from('comprovantes').select('id').eq('id_transacao', params.idTransacao).eq('status', 'aprovado');
      if (errTx) throw errTx;
      if (compTx && compTx.length > 0) {
        throw new Error("Este ID de Transação PIX já foi aprovado no sistema.");
      }
    }

    const novoComprovante = {
      aluno_id: params.alunoId,
      responsavel_id: params.responsavelId,
      valor: params.valor,
      pagador: params.pagador,
      data_pagamento: params.dataPagamento,
      id_transacao: params.idTransacao,
      status: 'pendente',
      arquivo_url: params.arquivoUrl,
      hash_comprovante: params.hashComprovante,
      criado_em: new Date().toISOString()
    };

    const { data, error } = await supabase.from('comprovantes').insert([novoComprovante]).select();
    if (error) throw error;
    return data[0] as Comprovante;
  }

  static async approveComprovante(comprovanteId: string, adminId: string): Promise<void> {
    const { data: comps, error: compError } = await supabase.from('comprovantes').select('*').eq('id', comprovanteId);
    if (compError) throw compError;
    if (!comps || comps.length === 0) throw new Error("Comprovante não encontrado.");
    
    const comp = comps[0];
    if (comp.status !== 'pendente') throw new Error("Comprovante já processado.");

    if (comp.id_transacao) {
      const { data: activeTx, error: txError } = await supabase.from('comprovantes').select('id').eq('id_transacao', comp.id_transacao).eq('status', 'aprovado');
      if (txError) throw txError;
      if (activeTx && activeTx.length > 0) {
        throw new Error("Transação com este ID já foi aprovada em outro comprovante.");
      }
    }

    const { error: updError } = await supabase.from('comprovantes').update({ status: 'aprovado' }).eq('id', comprovanteId);
    if (updError) throw updError;

    const novaMov = {
      aluno_id: comp.aluno_id,
      tipo: 'credito',
      valor: comp.valor,
      descricao: `Recarga PIX Aprovada - ID: ${comp.id_transacao || 'N/A'}`,
      criado_por: adminId,
      criado_em: new Date().toISOString()
    };
    const { error: movError } = await supabase.from('movimentacoes').insert([novaMov]);
    if (movError) throw movError;

    const { data: aluno, error: aError } = await supabase.from('alunos').select('saldo').eq('id', comp.aluno_id).single();
    if (aError) throw aError;
    
    const newSaldo = parseFloat(aluno.saldo) + parseFloat(comp.valor);
    const { error: aUpdError } = await supabase.from('alunos').update({ saldo: newSaldo }).eq('id', comp.aluno_id);
    if (aUpdError) throw aUpdError;
  }

  static async rejectComprovante(comprovanteId: string, observacao: string): Promise<void> {
    const { data: comps, error: compError } = await supabase.from('comprovantes').select('status').eq('id', comprovanteId);
    if (compError) throw compError;
    if (!comps || comps.length === 0) throw new Error("Comprovante não encontrado.");
    
    if (comps[0].status !== 'pendente') throw new Error("Comprovante já processado.");

    const { error: updError } = await supabase.from('comprovantes').update({ status: 'rejeitado', observacao }).eq('id', comprovanteId);
    if (updError) throw updError;
  }

  static async registrarConsumo(alunoId: string, valor: number, descricao: string, operadorId: string): Promise<Movimentacao> {
    const { data: aluno, error: aError } = await supabase.from('alunos').select('*').eq('id', alunoId).single();
    if (aError) throw aError;
    if (!aluno) throw new Error("Aluno não encontrado.");
    
    const saldoAtual = parseFloat(aluno.saldo);
    if (saldoAtual < valor) {
      throw new Error(`Saldo insuficiente. Saldo atual: R$ ${saldoAtual.toFixed(2)}`);
    }

    const { error: aUpdError } = await supabase.from('alunos').update({ saldo: saldoAtual - valor }).eq('id', alunoId);
    if (aUpdError) throw aUpdError;

    const novaMov = {
      aluno_id: alunoId,
      tipo: 'debito',
      valor,
      descricao,
      criado_por: operadorId,
      criado_em: new Date().toISOString()
    };
    
    const { data, error } = await supabase.from('movimentacoes').insert([novaMov]).select();
    if (error) throw error;
    return data[0] as Movimentacao;
  }

  static async updateAluno(alunoId: string, updates: Partial<Aluno>): Promise<Aluno> {
    const { data, error } = await supabase.from('alunos').update(updates).eq('id', alunoId).select();
    if (error) throw error;
    return data[0] as Aluno;
  }

  static async getProdutos(): Promise<Produto[]> {
    const { data, error } = await supabase.from('produtos').select('*').order('nome');
    if (error) throw error;
    return data || [];
  }

  static async addProduto(nome: string, preco: number, categoria: 'salgado' | 'bebida' | 'doce' | 'outro'): Promise<Produto> {
    const novoProduto = {
      nome,
      preco,
      categoria,
      ativo: true,
      criado_em: new Date().toISOString()
    };
    const { data, error } = await supabase.from('produtos').insert([novoProduto]).select();
    if (error) throw error;
    return data[0] as Produto;
  }

  static async updateProduto(id: string, updates: Partial<Produto>): Promise<Produto> {
    const { data, error } = await supabase.from('produtos').update(updates).eq('id', id).select();
    if (error) throw error;
    return data[0] as Produto;
  }

  static async deleteProduto(id: string): Promise<void> {
    const { error } = await supabase.from('produtos').delete().eq('id', id);
    if (error) throw error;
  }

  static async updateProfile(profileId: string, updates: Partial<Profile>): Promise<Profile> {
    const { data, error } = await supabase.from('profiles').update(updates).eq('id', profileId).select();
    if (error) throw error;
    
    const currentUser = this.getCurrentUser();
    if (currentUser && currentUser.id === profileId) {
      const updatedUser = { ...currentUser, ...data[0] };
      if (typeof window !== 'undefined') {
        localStorage.setItem('cantina_current_user', JSON.stringify(updatedUser));
      }
    }
    return data[0] as Profile;
  }

  static async deleteAluno(id: string): Promise<void> {
    const { error } = await supabase.from('alunos').delete().eq('id', id);
    if (error) throw error;
  }

  static async addAlunosBulk(alunosList: { nome: string; ra: string; digito: string; turma: string; saldo: number; ativo: boolean }[]): Promise<void> {
    const { error } = await supabase.from('alunos').insert(alunosList);
    if (error) throw error;
  }
}
