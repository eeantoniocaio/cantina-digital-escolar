"use client";

import { useEffect, useState } from "react";
import { DBService, Profile } from "@/services/db";
import { Button } from "./components/ui/Button";
import { Input } from "./components/ui/Input";
import {
  Mail,
  Lock,
  User,
  AlertCircle,
  CheckCircle2,
  Phone,
  FileText
} from "lucide-react";

export default function Home() {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [registerRole, setRegisterRole] = useState<'aluno' | 'familia' | 'professor'>('aluno');

  // Input states for Login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Input states for Student Register
  const [studentNome, setStudentNome] = useState("");
  const [studentSerie, setStudentSerie] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentRA, setStudentRA] = useState("");
  const [studentDigit, setStudentDigit] = useState("");
  const [studentPassword, setStudentPassword] = useState("");

  // Input states for Parent Register
  const [parentNome, setParentNome] = useState("");
  const [parentRG, setParentRG] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentWhatsapp, setParentWhatsapp] = useState("");
  const [parentPassword, setParentPassword] = useState("");

  // Input states for Professor Register
  const [profNome, setProfNome] = useState("");
  const [profEmail, setProfEmail] = useState("");
  const [profPassword, setProfPassword] = useState("");

  // Feedback states
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    const user = DBService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }

    const checkOAuth = async () => {
      if (typeof window !== 'undefined') {
        const hash = window.location.hash;
        const search = window.location.search;
        if (hash.includes('error=') || search.includes('error=')) {
          const params = new URLSearchParams(hash.startsWith('#') ? hash.substring(1) : search);
          const errorDesc = params.get('error_description') || params.get('error') || 'Erro na autenticação OAuth';
          const errorCode = params.get('error_code');
          if (errorCode === 'bad_oauth_state' || errorDesc.includes('expired')) {
            setErrorMsg("A sessão de login expirou ou foi cancelada. Por favor, tente entrar com o Google novamente.");
          } else {
            setErrorMsg(`Erro na autenticação Google: ${errorDesc.replace(/\+/g, ' ')}`);
          }
          window.history.replaceState(null, '', window.location.pathname);
          return;
        }
      }

      try {
        const profile = await DBService.handleOAuthCallback();
        if (profile) {
          setCurrentUser(profile);
          const redirectPath = (profile.is_master || profile.role === 'gestao' || profile.role === 'admin') ? '/admin' : `/${profile.role}`;
          window.location.href = redirectPath;
        }
      } catch (err: any) {
        console.error("OAuth callback error:", err);
      }
    };
    checkOAuth();
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setIsLoading(true);

    try {
      const profile = await DBService.signIn(loginEmail, loginPassword);
      setSuccessMsg(`Bem-vindo de volta, ${profile.nome}!`);
      setTimeout(() => {
        const redirectPath = (profile.is_master || profile.role === 'gestao' || profile.role === 'admin') ? '/admin' : `/${profile.role}`;
        window.location.href = redirectPath;
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao fazer login. Verifique suas credenciais.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setIsLoading(true);

    try {
      if (registerRole === 'aluno') {
        if (!studentNome || !studentSerie || !studentEmail || !studentRA || !studentDigit || !studentPassword) {
          setErrorMsg("Preencha todos os campos obrigatórios.");
          setIsLoading(false);
          return;
        }
        if (!studentEmail.toLowerCase().endsWith("@al.educacao.sp.gov.br")) {
          setErrorMsg("Estudantes só podem usar o domínio de e-mail @al.educacao.sp.gov.br");
          setIsLoading(false);
          return;
        }

        await DBService.signUpAluno({
          email: studentEmail,
          password: studentPassword,
          nome: studentNome,
          ra: studentRA,
          digito: studentDigit,
          turma: studentSerie
        });

        setSuccessMsg("Cadastro de estudante realizado com sucesso! Verifique seu e-mail para confirmação.");
      } else if (registerRole === 'professor') {
        if (!profNome || !profEmail || !profPassword) {
          setErrorMsg("Preencha todos os campos obrigatórios.");
          setIsLoading(false);
          return;
        }
        const emailLower = profEmail.toLowerCase();
        if (!emailLower.endsWith("@prof.educacao.sp.gov.br") && !emailLower.endsWith("@servidor.educacao.sp.gov.br")) {
          setErrorMsg("Professores e servidores devem usar o e-mail @prof.educacao.sp.gov.br ou @servidor.educacao.sp.gov.br");
          setIsLoading(false);
          return;
        }

        await DBService.signUpProfessor({
          email: profEmail,
          password: profPassword,
          nome: profNome
        });

        setSuccessMsg("Cadastro de professor/servidor realizado com sucesso! Verifique seu e-mail para confirmação.");
      } else {
        if (!parentNome || !parentRG || !parentEmail || !parentWhatsapp || !parentPassword) {
          setErrorMsg("Preencha todos os campos obrigatórios.");
          setIsLoading(false);
          return;
        }

        await DBService.signUpResponsavel({
          email: parentEmail,
          password: parentPassword,
          nome: parentNome,
          rg: parentRG,
          whatsapp: parentWhatsapp
        });

        setSuccessMsg("Cadastro de responsável realizado com sucesso! Verifique seu e-mail para confirmação.");
      }

      clearFormFields();
      setActiveTab('login');
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao realizar cadastro.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (isGoogleLoading) return;
    setErrorMsg("");
    setIsGoogleLoading(true);
    try {
      await DBService.signInWithGoogle();
    } catch (err: any) {
      setErrorMsg("Erro ao iniciar autenticação com o Google.");
      setIsGoogleLoading(false);
    }
  };

  const handleSimularLogin = process.env.NODE_ENV === 'development'
    ? async (role: 'familia' | 'admin' | 'cantina' | 'aluno' | 'professor' | 'gestao') => {
        let email = '';
        if (role === 'admin') email = 'admin@escola.com';
        else if (role === 'cantina') email = 'cantina@escola.com';
        else if (role === 'aluno') email = 'enzo@escola.com';
        else if (role === 'professor') email = 'professor@prof.educacao.sp.gov.br';
        else if (role === 'gestao') email = 'andre.avancini@servidor.educacao.sp.gov.br';
        else email = 'pai@email.com';

        await DBService.login(email, role);
        if (role === 'gestao') {
          window.location.href = '/admin';
        } else {
          window.location.href = `/${role}`;
        }
      }
    : undefined;

  const handleLogout = () => {
    DBService.logout();
    setCurrentUser(null);
  };

  const clearFormFields = () => {
    setStudentNome("");
    setStudentSerie("");
    setStudentEmail("");
    setStudentRA("");
    setStudentDigit("");
    setStudentPassword("");
    setParentNome("");
    setParentRG("");
    setParentEmail("");
    setParentWhatsapp("");
    setParentPassword("");
    setProfNome("");
    setProfEmail("");
    setProfPassword("");
  };

  return (
    <main className="flex-1 bg-[--bg-base] text-slate-800 flex flex-col justify-between min-h-screen">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-red-600 rounded-2xl flex items-center justify-center text-white font-black text-xs shadow-xs">
              EEAC
            </div>
            <div>
              <h1 className="font-extrabold text-sm tracking-tight text-slate-900 leading-none">
                Cantina Digital
              </h1>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">E.E. Antônio Caio</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
            {currentUser && (
              <div className="flex items-center gap-2 bg-slate-100 py-1.5 px-3 rounded-full border border-slate-200">
                <span>Logado como: <strong className="text-slate-800">{currentUser.nome}</strong> ({currentUser.role})</span>
                <button
                  onClick={handleLogout}
                  className="text-red-600 hover:text-red-700 transition-colors underline font-bold cursor-pointer"
                >
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Login / Register Area */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto px-4 py-12 w-full">
        <div className="text-center mb-8 space-y-1">
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
            {activeTab === 'login' ? 'Acesse sua conta' : 'Crie sua conta'}
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            {activeTab === 'login' ? 'Entre com seu e-mail institucional ou conta Google' : 'Preencha os dados de acordo com seu perfil'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full shadow-xs space-y-6">
          {/* Custom Tab Selector */}
          <div className="flex bg-slate-100 p-1 rounded-2xl gap-1 text-xs font-bold text-slate-600">
            <button
              onClick={() => { setActiveTab('login'); setErrorMsg(""); setSuccessMsg(""); }}
              className={`flex-1 py-2 rounded-xl transition-all cursor-pointer text-center ${
                activeTab === 'login' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => { setActiveTab('register'); setErrorMsg(""); setSuccessMsg(""); }}
              className={`flex-1 py-2 rounded-xl transition-all cursor-pointer text-center ${
                activeTab === 'register' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Cadastrar-se
            </button>
          </div>

          {/* Social login option */}
          <div className="space-y-3">
            <button
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading}
              className={`w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs py-3 rounded-2xl border border-slate-200 shadow-2xs transition-all active:scale-98 ${
                isGoogleLoading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:border-slate-300'
              }`}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.53 14.97 1 12 1 7.24 1 3.21 3.73 1.29 7.71l3.88 3C6.11 7.73 8.78 5.04 12 5.04z" />
                <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.29 1.48-1.14 2.73-2.4 3.58l3.76 2.91c2.2-2.03 3.67-5.02 3.67-8.64z" />
                <path fill="#FBBC05" d="M5.17 14.71c-.24-.71-.38-1.47-.38-2.26s.14-1.55.38-2.26L1.29 7.19C.46 8.86 0 10.73 0 12.7c0 1.97.46 3.84 1.29 5.51l3.88-3z" />
                <path fill="#34A853" d="M12 23c3.24 0 5.95-1.08 7.93-2.91l-3.76-2.91c-1.08.72-2.45 1.16-4.17 1.16-3.22 0-5.89-2.69-6.83-5.67l-3.88 3C3.21 20.27 7.24 23 12 23z" />
              </svg>
              <span>{isGoogleLoading ? 'Redirecionando...' : (activeTab === 'login' ? 'Entrar com Google' : 'Cadastrar com Google')}</span>
            </button>

            <div className="flex items-center justify-center gap-3">
              <div className="h-[1px] bg-slate-200 flex-1"></div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ou com e-mail</span>
              <div className="h-[1px] bg-slate-200 flex-1"></div>
            </div>
          </div>

          {/* Form Area */}
          {activeTab === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">E-mail</label>
                <Input
                  type="email"
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  placeholder="exemplo@email.com"
                  leftIcon={<Mail className="h-4 w-4" />}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Senha</label>
                <Input
                  type="password"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  leftIcon={<Lock className="h-4 w-4" />}
                  required
                />
              </div>

              {errorMsg && (
                <div className="text-xs text-rose-700 bg-rose-50 p-3 rounded-2xl border border-rose-200 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="text-xs text-emerald-700 bg-emerald-50 p-3 rounded-2xl border border-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <Button
                type="submit"
                variant="brand"
                size="lg"
                loading={isLoading}
                className="w-full shadow-xs"
              >
                Entrar na Conta
              </Button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              {/* Role Selector */}
              <div className="flex border border-slate-200 p-1 rounded-2xl text-xs font-bold text-slate-600 bg-slate-50 gap-1">
                <button
                  type="button"
                  onClick={() => setRegisterRole('aluno')}
                  className={`flex-1 py-1.5 rounded-xl transition-all cursor-pointer ${
                    registerRole === 'aluno' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
                  }`}
                >
                  Estudante
                </button>
                <button
                  type="button"
                  onClick={() => setRegisterRole('professor')}
                  className={`flex-1 py-1.5 rounded-xl transition-all cursor-pointer ${
                    registerRole === 'professor' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
                  }`}
                >
                  Professor
                </button>
                <button
                  type="button"
                  onClick={() => setRegisterRole('familia')}
                  className={`flex-1 py-1.5 rounded-xl transition-all cursor-pointer ${
                    registerRole === 'familia' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
                  }`}
                >
                  Responsável
                </button>
              </div>

              {registerRole === 'aluno' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Nome Completo</label>
                    <Input
                      type="text"
                      value={studentNome}
                      onChange={e => setStudentNome(e.target.value)}
                      placeholder="Nome do Estudante"
                      leftIcon={<User className="h-4 w-4" />}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Série / Turma</label>
                      <Input
                        type="text"
                        value={studentSerie}
                        onChange={e => setStudentSerie(e.target.value)}
                        placeholder="Ex: 6º Ano A"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      <div className="col-span-2">
                        <label className="block text-xs font-bold text-slate-600 mb-1">RA</label>
                        <Input
                          type="text"
                          value={studentRA}
                          onChange={e => setStudentRA(e.target.value)}
                          placeholder="123456"
                          className="font-mono text-xs"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Díg.</label>
                        <Input
                          type="text"
                          value={studentDigit}
                          onChange={e => setStudentDigit(e.target.value)}
                          placeholder="X"
                          maxLength={1}
                          className="text-center font-mono font-bold text-xs"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">E-mail Institucional</label>
                    <Input
                      type="email"
                      value={studentEmail}
                      onChange={e => setStudentEmail(e.target.value)}
                      placeholder="seu-ra@al.educacao.sp.gov.br"
                      leftIcon={<Mail className="h-4 w-4" />}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Senha</label>
                    <Input
                      type="password"
                      value={studentPassword}
                      onChange={e => setStudentPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      leftIcon={<Lock className="h-4 w-4" />}
                      required
                    />
                  </div>
                </>
              )}

              {registerRole === 'professor' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Nome Completo</label>
                    <Input
                      type="text"
                      value={profNome}
                      onChange={e => setProfNome(e.target.value)}
                      placeholder="Nome do Professor / Servidor"
                      leftIcon={<User className="h-4 w-4" />}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">E-mail Institucional</label>
                    <Input
                      type="email"
                      value={profEmail}
                      onChange={e => setProfEmail(e.target.value)}
                      placeholder="seu-nome@prof.educacao.sp.gov.br"
                      leftIcon={<Mail className="h-4 w-4" />}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Senha</label>
                    <Input
                      type="password"
                      value={profPassword}
                      onChange={e => setProfPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      leftIcon={<Lock className="h-4 w-4" />}
                      required
                    />
                  </div>
                </>
              )}

              {registerRole === 'familia' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Nome Completo</label>
                    <Input
                      type="text"
                      value={parentNome}
                      onChange={e => setParentNome(e.target.value)}
                      placeholder="Nome do Responsável"
                      leftIcon={<User className="h-4 w-4" />}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">RG</label>
                      <Input
                        type="text"
                        value={parentRG}
                        onChange={e => setParentRG(e.target.value)}
                        placeholder="Ex: 12.345.678-9"
                        leftIcon={<FileText className="h-4 w-4" />}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">WhatsApp</label>
                      <Input
                        type="text"
                        value={parentWhatsapp}
                        onChange={e => setParentWhatsapp(e.target.value)}
                        placeholder="(11) 99999-9999"
                        leftIcon={<Phone className="h-4 w-4" />}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">E-mail</label>
                    <Input
                      type="email"
                      value={parentEmail}
                      onChange={e => setParentEmail(e.target.value)}
                      placeholder="exemplo@email.com"
                      leftIcon={<Mail className="h-4 w-4" />}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Senha</label>
                    <Input
                      type="password"
                      value={parentPassword}
                      onChange={e => setParentPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      leftIcon={<Lock className="h-4 w-4" />}
                      required
                    />
                  </div>
                </>
              )}

              {errorMsg && (
                <div className="text-xs text-rose-700 bg-rose-50 p-3 rounded-2xl border border-rose-200 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="text-xs text-emerald-700 bg-emerald-50 p-3 rounded-2xl border border-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <Button
                type="submit"
                variant="brand"
                size="lg"
                loading={isLoading}
                className="w-full shadow-xs"
              >
                Criar Conta
              </Button>
            </form>
          )}
        </div>

        {/* Simulador Dev */}
        {process.env.NODE_ENV === 'development' && handleSimularLogin && (
          <div className="mt-8 bg-amber-50/90 border border-amber-200 rounded-3xl p-4 w-full text-center space-y-2.5">
            <span className="text-[10px] text-amber-700 uppercase font-extrabold tracking-wider block">
              Atalhos de Simulação (Ambiente Local)
            </span>
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                onClick={() => handleSimularLogin('aluno')}
                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 py-1.5 px-3 rounded-xl text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
              >
                Estudante
              </button>
              <button
                onClick={() => handleSimularLogin('professor')}
                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 py-1.5 px-3 rounded-xl text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
              >
                Professor
              </button>
              <button
                onClick={() => handleSimularLogin('familia')}
                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 py-1.5 px-3 rounded-xl text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
              >
                Família
              </button>
              <button
                onClick={() => handleSimularLogin('cantina')}
                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 py-1.5 px-3 rounded-xl text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
              >
                Cantina
              </button>
              <button
                onClick={() => handleSimularLogin('admin')}
                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 py-1.5 px-3 rounded-xl text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
              >
                Secretaria
              </button>
              <button
                onClick={() => handleSimularLogin('gestao')}
                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 py-1.5 px-3 rounded-xl text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
              >
                Gestão
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white/80 backdrop-blur-sm py-6 text-center text-xs text-slate-400 font-medium">
        <p>© 2026 E.E. Antônio Caio — Cantina Digital Escolar. Todos os direitos reservados.</p>
      </footer>
    </main>
  );
}
