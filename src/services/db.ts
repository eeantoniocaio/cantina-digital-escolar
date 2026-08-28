import { supabase } from './supabaseClient';

// ----------------------------------------------------------------
// Utilitário: traduz erros do PostgreSQL/RPCs para mensagens amigáveis
// Códigos P0000–P0009 são lançados pelas RPCs SECURITY DEFINER.
// ----------------------------------------------------------------
export function handleDbError(error: any): string {
  const msg: string = error?.message || '';
  if (msg.startsWith('nao_autenticado'))          return 'Usuário não autenticado. Faça login novamente.';
  if (msg.startsWith('aluno_nao_encontrado'))     return 'Aluno não encontrado ou inativo.';
  if (msg.startsWith('aluno_inexistente'))        return 'O aluno vinculado a este comprovante não existe.';
  if (msg.startsWith('aluno_inativo'))            return 'O aluno está inativo e não pode receber créditos.';
  if (msg.startsWith('saldo_insuficiente'))       return 'Saldo insuficiente para realizar esta compra.';
  if (msg.startsWith('comprovante_nao_encontrado')) return 'Comprovante não encontrado.';
  if (msg.startsWith('comprovante_ja_processado')) return 'Este comprovante já foi processado anteriormente.';
  if (msg.startsWith('transacao_ja_aprovada'))    return 'Esta transação PIX já foi aprovada em outro comprovante.';
  if (msg.startsWith('observacao_obrigatoria'))   return 'Informe o motivo da rejeição.';
  if (msg.startsWith('valor_invalido'))           return 'Valor de cobrança inválido.';
  if (msg.startsWith('alteracao_role_nao_autorizada')) return 'Operação não permitida: somente administradores podem alterar roles.';
  // Violação de UNIQUE constraint (hash_comprovante ou id_transacao duplicado)
  if (error?.code === '23505') return 'Este comprovante já foi enviado anteriormente.';
  return error?.message || 'Erro inesperado. Tente novamente.';
}

// Tipo para updateAluno: exclui campos que não devem ser sobrescritos pelo cliente.
// saldo: alterado apenas via RPC registrar_debito / aprovar_comprovante.
// id e criado_em: imutáveis.
export type AlunoUpdateFields = Omit<Aluno, 'id' | 'saldo' | 'criado_em'>;

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
  data_nascimento?: string;
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

  /**
   * @deprecated DEV-ONLY — NÃO USAR EM PRODUÇÃO.
   * Este método bypassa o Supabase Auth, cria UUIDs falsos sem correspondência
   * em auth.users e viola a FK profiles.id → auth.users(id).
   * Use signIn() para produção.
   * Habilitado apenas quando NODE_ENV === 'development'.
   */
  static async login(email: string, role: 'admin' | 'familia' | 'cantina' | 'aluno' | 'professor' | 'gestao'): Promise<Profile> {
    if (process.env.NODE_ENV !== 'development') {
      throw new Error('[login] Este método só pode ser usado em ambiente de desenvolvimento.');
    }
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('role', role);
    if (error) throw error;

    let profile: Profile;
    if (!profiles || profiles.length === 0) {
      // ATENÇÃO: UUID gerado localmente — inválido em produção (sem auth.users)
      profile = {
        id: crypto.randomUUID(),
        email: email.toLowerCase(),
        nome: email.split('@')[0].toUpperCase(),
        role,
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

    // Upsert em vez de insert: o trigger on_auth_user_created pode ter criado
    // um profile básico antes do código chegar aqui. O upsert atualiza com
    // dados ricos (nome completo, aluno_id) sem falhar por conflito de PK.
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert([perfil], { onConflict: 'id' });

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

    // Upsert: mesmo motivo de signUpAluno — evita conflito com trigger.
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert([perfil], { onConflict: 'id' });

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

      await supabase.from('profiles').upsert([profile], { onConflict: 'id' });
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

    // Upsert: mesmo motivo de signUpAluno — evita conflito com trigger.
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert([perfil], { onConflict: 'id' });

    if (profileError) throw profileError;

    return perfil;
  }

  static async addAluno(nome: string, ra: string, turma: string, responsavelId?: string, digito?: string, dataNascimento?: string): Promise<Aluno> {
    const novoAluno = {
      nome,
      ra,
      digito,
      turma,
      data_nascimento: dataNascimento,
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

  /**
   * Aprova um comprovante PIX via RPC atômica.
   * O operador autenticado é obtido via auth.uid() no servidor (AJUSTE 3).
   * Não aceita adminId do cliente — evita falsificação de identidade.
   * A RPC: (1) valida aluno ativo (AJUSTE 2), (2) aplica lock FOR UPDATE,
   * (3) credita saldo, (4) registra no ledger — tudo em uma transação.
   */
  static async approveComprovante(comprovanteId: string): Promise<void> {
    const { error } = await supabase.rpc('aprovar_comprovante', {
      p_comprovante_id: comprovanteId
    });
    if (error) throw new Error(handleDbError(error));
  }

  /**
   * Rejeita um comprovante PIX via RPC atômica.
   * O rejeitador é obtido via auth.uid() no servidor (AJUSTE 3).
   */
  static async rejectComprovante(comprovanteId: string, observacao: string): Promise<void> {
    const { error } = await supabase.rpc('rejeitar_comprovante', {
      p_comprovante_id: comprovanteId,
      p_observacao: observacao
    });
    if (error) throw new Error(handleDbError(error));
  }

  /**
   * Registra uma compra/débito na cantina via RPC atômica.
   * O operador autenticado é obtido via auth.uid() no servidor (AJUSTE 3).
   * Não aceita operadorId do cliente — evita falsificação de identidade.
   * A RPC: (1) aplica SELECT FOR UPDATE no aluno, (2) valida saldo,
   * (3) debita saldo, (4) registra no ledger — tudo em uma transação.
   * Retorna o id da movimentação criada.
   */
  static async registrarConsumo(alunoId: string, valor: number, descricao: string): Promise<{ id: string }> {
    const { data: movId, error } = await supabase.rpc('registrar_debito', {
      p_aluno_id:  alunoId,
      p_valor:     valor,
      p_descricao: descricao
    });
    if (error) throw new Error(handleDbError(error));
    return { id: movId as string };
  }

  /**
   * Atualiza dados cadastrais de um aluno.
   * SEGURANÇA: 'saldo', 'id' e 'criado_em' são excluídos do tipo.
   * O saldo só pode ser alterado via RPC registrar_debito / aprovar_comprovante.
   */
  static async updateAluno(alunoId: string, updates: Partial<AlunoUpdateFields>): Promise<Aluno> {
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

  static async addAlunosBulk(alunosList: { nome: string; ra: string; digito: string; turma: string; saldo: number; ativo: boolean; data_nascimento?: string }[]): Promise<void> {
    const { error } = await supabase.from('alunos').insert(alunosList);
    if (error) throw error;
  }
}
