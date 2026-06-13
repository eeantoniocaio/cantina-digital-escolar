export interface Profile {
  id: string;
  email: string;
  nome: string;
  role: 'admin' | 'familia' | 'cantina' | 'aluno';
  aluno_id?: string;
  criado_em: string;
}

export interface Aluno {
  id: string;
  nome: string;
  ra: string;
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

// Chave Pix da Escola (Fixa para exibição na UI)
export const DADOS_PIX_ESCOLA = {
  chave: "12.345.678/0001-99",
  tipoChave: "CNPJ",
  beneficiario: "CANTINA DIGITAL LTDA",
  banco: "Banco do Brasil",
  cidade: "São Paulo"
};

// -- SISTEMA DE PERSISTÊNCIA MOCK NO LOCALSTORAGE --
const isServer = typeof window === 'undefined';

const getMockData = <T>(key: string, defaultVal: T): T => {
  if (isServer) return defaultVal;
  const data = localStorage.getItem(`cantina_${key}`);
  return data ? JSON.parse(data) : defaultVal;
};

const setMockData = (key: string, data: any) => {
  if (isServer) return;
  localStorage.setItem(`cantina_${key}`, JSON.stringify(data));
};

// Dados Iniciais para Demonstração (Seed)
const INITIAL_PROFILES: Profile[] = [
  { id: 'usr-admin', email: 'admin@escola.com', nome: 'Diretora Márcia', role: 'admin', criado_em: new Date().toISOString() },
  { id: 'usr-cantina', email: 'cantina@escola.com', nome: 'Atendente Seu Jorge', role: 'cantina', criado_em: new Date().toISOString() },
  { id: 'usr-pai1', email: 'pai@email.com', nome: 'Carlos Silva', role: 'familia', criado_em: new Date().toISOString() },
  { id: 'usr-aluno1', email: 'enzo@escola.com', nome: 'Enzo Silva', role: 'aluno', aluno_id: 'aluno-1', criado_em: new Date().toISOString() }
];

const INITIAL_ALUNOS: Aluno[] = [
  { id: 'aluno-1', nome: 'Enzo Silva', ra: '123456-7', turma: '6º Ano A', saldo: 15.50, ativo: true, criado_em: new Date().toISOString() },
  { id: 'aluno-2', nome: 'Valentina Silva', ra: '765432-1', turma: '8º Ano B', saldo: 42.00, ativo: true, criado_em: new Date().toISOString() }
];

const INITIAL_PRODUTOS: Produto[] = [
  { id: 'prod-1', nome: 'Salgado Assado', preco: 6.00, categoria: 'salgado', ativo: true, criado_em: new Date().toISOString() },
  { id: 'prod-2', nome: 'Suco Natural 300ml', preco: 5.00, categoria: 'bebida', ativo: true, criado_em: new Date().toISOString() },
  { id: 'prod-3', nome: 'Pão de Queijo Grande', preco: 4.50, categoria: 'salgado', ativo: true, criado_em: new Date().toISOString() },
  { id: 'prod-4', nome: 'Brigadeiro Gourmet', preco: 3.50, categoria: 'doce', ativo: true, criado_em: new Date().toISOString() },
  { id: 'prod-5', nome: 'Refrigerante Lata', preco: 6.00, categoria: 'bebida', ativo: true, criado_em: new Date().toISOString() }
];

const INITIAL_RESPONSAVEIS: { familia_id: string; aluno_id: string }[] = [
  { familia_id: 'usr-pai1', aluno_id: 'aluno-1' },
  { familia_id: 'usr-pai1', aluno_id: 'aluno-2' }
];

const INITIAL_COMPROVANTES: Comprovante[] = [
  {
    id: 'comp-1',
    aluno_id: 'aluno-1',
    responsavel_id: 'usr-pai1',
    valor: 50.00,
    pagador: 'Carlos Silva',
    data_pagamento: new Date(Date.now() - 3600000 * 2).toISOString(),
    id_transacao: 'E2E98765432101234567890abcdef',
    status: 'pendente',
    arquivo_url: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=500',
    hash_comprovante: 'hash-fake-1',
    criado_em: new Date(Date.now() - 3600000 * 2).toISOString()
  }
];

const INITIAL_MOVIMENTACOES: Movimentacao[] = [
  {
    id: 'mov-1',
    aluno_id: 'aluno-1',
    tipo: 'credito',
    valor: 15.50,
    descricao: 'Saldo Inicial',
    criado_por: 'usr-admin',
    criado_em: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'mov-2',
    aluno_id: 'aluno-2',
    tipo: 'credito',
    valor: 42.00,
    descricao: 'Saldo Inicial',
    criado_por: 'usr-admin',
    criado_em: new Date(Date.now() - 86400000).toISOString()
  }
];

export class DBService {
  static getProfiles(): Profile[] {
    return getMockData('profiles', INITIAL_PROFILES);
  }

  static getAlunos(): Aluno[] {
    return getMockData('alunos', INITIAL_ALUNOS);
  }

  static getResponsaveis(): { familia_id: string; aluno_id: string }[] {
    return getMockData('responsaveis', INITIAL_RESPONSAVEIS);
  }

  static getComprovantes(): Comprovante[] {
    return getMockData('comprovantes', INITIAL_COMPROVANTES);
  }

  static getMovimentacoes(): Movimentacao[] {
    return getMockData('movimentacoes', INITIAL_MOVIMENTACOES);
  }

  // --- MÉTODOS AUXILIARES ---

  static getAlunosByResponsavel(responsavelId: string): Aluno[] {
    const vinculos = this.getResponsaveis().filter(v => v.familia_id === responsavelId);
    const alunos = this.getAlunos();
    return alunos.filter(a => vinculos.some(v => v.aluno_id === a.id));
  }

  static getCurrentUser(): Profile | null {
    if (isServer) return null;
    const user = localStorage.getItem('cantina_current_user');
    return user ? JSON.parse(user) : null;
  }

  static login(email: string, role: 'admin' | 'familia' | 'cantina' | 'aluno'): Profile {
    const profiles = this.getProfiles();
    let profile = profiles.find(p => p.email.toLowerCase() === email.toLowerCase() && p.role === role);
    
    if (!profile) {
      // Cria perfil automático se não existir para fins de prototipação fluida
      profile = {
        id: 'usr-' + Math.random().toString(36).substr(2, 9),
        email,
        nome: email.split('@')[0].toUpperCase(),
        role,
        aluno_id: role === 'aluno' ? 'aluno-1' : undefined,
        criado_em: new Date().toISOString()
      };
      const newProfiles = [...profiles, profile];
      setMockData('profiles', newProfiles);
    }
    
    localStorage.setItem('cantina_current_user', JSON.stringify(profile));
    return profile;
  }

  static logout() {
    if (isServer) return;
    localStorage.removeItem('cantina_current_user');
  }

  // --- OPERAÇÕES ---

  static addAluno(nome: string, ra: string, turma: string, responsavelId?: string): Aluno {
    const alunos = this.getAlunos();
    const novoAluno: Aluno = {
      id: 'aluno-' + Math.random().toString(36).substr(2, 9),
      nome,
      ra,
      turma,
      saldo: 0.00,
      ativo: true,
      criado_em: new Date().toISOString()
    };

    setMockData('alunos', [...alunos, novoAluno]);

    if (responsavelId) {
      const vinculos = this.getResponsaveis();
      setMockData('responsaveis', [...vinculos, { familia_id: responsavelId, aluno_id: novoAluno.id }]);
    }

    return novoAluno;
  }

  static uploadComprovante(params: {
    alunoId: string;
    responsavelId: string;
    valor: number;
    pagador: string;
    dataPagamento: string;
    idTransacao: string;
    arquivoUrl: string;
    hashComprovante: string;
  }): Comprovante {
    const comprovantes = this.getComprovantes();

    // Verificação de duplicados por Hash
    if (comprovantes.some(c => c.hash_comprovante === params.hashComprovante)) {
      throw new Error("Este arquivo de comprovante já foi enviado anteriormente.");
    }

    // Verificação de duplicados por ID de Transação
    if (params.idTransacao && comprovantes.some(c => c.id_transacao === params.idTransacao && c.status === 'aprovado')) {
      throw new Error("Este ID de Transação PIX já foi aprovado no sistema.");
    }

    const novoComprovante: Comprovante = {
      id: 'comp-' + Math.random().toString(36).substr(2, 9),
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

    setMockData('comprovantes', [...comprovantes, novoComprovante]);
    return novoComprovante;
  }

  static approveComprovante(comprovanteId: string, adminId: string) {
    const comprovantes = this.getComprovantes();
    const compIdx = comprovantes.findIndex(c => c.id === comprovanteId);
    
    if (compIdx === -1) throw new Error("Comprovante não encontrado.");
    if (comprovantes[compIdx].status !== 'pendente') throw new Error("Comprovante já processado.");

    const comp = comprovantes[compIdx];

    // Verificar se o ID de Transação já foi aprovado por outro comprovante
    if (comp.id_transacao && comprovantes.some(c => c.id_transacao === comp.id_transacao && c.status === 'aprovado')) {
      throw new Error("Transação com este ID já foi aprovada em outro comprovante.");
    }

    // Atualiza status do comprovante
    comprovantes[compIdx].status = 'aprovado';
    setMockData('comprovantes', comprovantes);

    // Adiciona movimentação financeira de crédito
    const movimentacoes = this.getMovimentacoes();
    const novaMov: Movimentacao = {
      id: 'mov-' + Math.random().toString(36).substr(2, 9),
      aluno_id: comp.aluno_id,
      tipo: 'credito',
      valor: comp.valor,
      descricao: `Recarga PIX Aprovada - ID: ${comp.id_transacao || 'N/A'}`,
      criado_por: adminId,
      criado_em: new Date().toISOString()
    };
    setMockData('movimentacoes', [...movimentacoes, novaMov]);

    // Atualiza saldo do aluno
    const alunos = this.getAlunos();
    const alunoIdx = alunos.findIndex(a => a.id === comp.aluno_id);
    if (alunoIdx !== -1) {
      alunos[alunoIdx].saldo += comp.valor;
      setMockData('alunos', alunos);
    }
  }

  static rejectComprovante(comprovanteId: string, observacao: string) {
    const comprovantes = this.getComprovantes();
    const compIdx = comprovantes.findIndex(c => c.id === comprovanteId);

    if (compIdx === -1) throw new Error("Comprovante não encontrado.");
    if (comprovantes[compIdx].status !== 'pendente') throw new Error("Comprovante já processado.");

    comprovantes[compIdx].status = 'rejeitado';
    comprovantes[compIdx].observacao = observacao;
    setMockData('comprovantes', comprovantes);
  }

  static registrarConsumo(alunoId: string, valor: number, descricao: string, operadorId: string): Movimentacao {
    const alunos = this.getAlunos();
    const alunoIdx = alunos.findIndex(a => a.id === alunoId);

    if (alunoIdx === -1) throw new Error("Aluno não encontrado.");
    if (alunos[alunoIdx].saldo < valor) {
      throw new Error(`Saldo insuficiente. Saldo atual: R$ ${alunos[alunoIdx].saldo.toFixed(2)}`);
    }

    // Deduz do saldo do aluno
    alunos[alunoIdx].saldo -= valor;
    setMockData('alunos', alunos);

    // Registra movimentação de débito
    const movimentacoes = this.getMovimentacoes();
    const novaMov: Movimentacao = {
      id: 'mov-' + Math.random().toString(36).substr(2, 9),
      aluno_id: alunoId,
      tipo: 'debito',
      valor,
      descricao,
      criado_por: operadorId,
      criado_em: new Date().toISOString()
    };

    setMockData('movimentacoes', [...movimentacoes, novaMov]);
    return novaMov;
  }

  static updateAluno(alunoId: string, updates: Partial<Aluno>): Aluno {
    const alunos = this.getAlunos();
    const alunoIdx = alunos.findIndex(a => a.id === alunoId);
    if (alunoIdx === -1) throw new Error("Aluno não encontrado.");

    const updatedAluno = {
      ...alunos[alunoIdx],
      ...updates
    };

    alunos[alunoIdx] = updatedAluno;
    setMockData('alunos', alunos);
    return updatedAluno;
  }

  static getProdutos(): Produto[] {
    return getMockData('produtos', INITIAL_PRODUTOS);
  }

  static addProduto(nome: string, preco: number, categoria: 'salgado' | 'bebida' | 'doce' | 'outro'): Produto {
    const produtos = this.getProdutos();
    const novoProduto: Produto = {
      id: 'prod-' + Math.random().toString(36).substr(2, 9),
      nome,
      preco,
      categoria,
      ativo: true,
      criado_em: new Date().toISOString()
    };
    setMockData('produtos', [...produtos, novoProduto]);
    return novoProduto;
  }

  static updateProduto(id: string, updates: Partial<Produto>): Produto {
    const produtos = this.getProdutos();
    const idx = produtos.findIndex(p => p.id === id);
    if (idx === -1) throw new Error("Produto não encontrado.");

    const updated = {
      ...produtos[idx],
      ...updates
    };
    produtos[idx] = updated;
    setMockData('produtos', produtos);
    return updated;
  }

  static deleteProduto(id: string): void {
    const produtos = this.getProdutos();
    const filtered = produtos.filter(p => p.id !== id);
    setMockData('produtos', filtered);
  }
}
