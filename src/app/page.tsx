"use client";

import { useEffect, useState } from "react";
import { DBService, Profile } from "@/services/db";

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

  useEffect(() => {
    // Check if user is already logged in locally
    const user = DBService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }
    
    // Check if returning from Google OAuth redirect
    const checkOAuth = async () => {
      try {
        const profile = await DBService.handleOAuthCallback();
        if (profile) {
          setCurrentUser(profile);
          const redirectPath = profile.role === 'gestao' ? '/admin' : `/${profile.role}`;
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
        const redirectPath = profile.role === 'gestao' ? '/admin' : `/${profile.role}`;
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

      // Reset fields
      clearFormFields();
      setActiveTab('login');
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao realizar cadastro.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg("");
    try {
      await DBService.signInWithGoogle();
    } catch (err: any) {
      setErrorMsg("Erro ao iniciar autenticação com o Google.");
    }
  };

  const handleSimularLogin = async (role: 'familia' | 'admin' | 'cantina' | 'aluno' | 'professor' | 'gestao') => {
    let email = "";
    if (role === 'admin') email = "admin@escola.com";
    else if (role === 'cantina') email = "cantina@escola.com";
    else if (role === 'aluno') email = "enzo@escola.com";
    else if (role === 'professor') email = "professor@prof.educacao.sp.gov.br";
    else if (role === 'gestao') email = "andre.avancini@servidor.educacao.sp.gov.br";
    else email = "pai@email.com";

    await DBService.login(email, role);
    if (role === 'gestao') {
      window.location.href = "/admin";
    } else {
      window.location.href = `/${role}`;
    }
  };

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
    <main className="flex-1 bg-slate-50 text-slate-800 flex flex-col justify-between min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-red-600 rounded-full flex items-center justify-center text-white font-black text-xs border border-red-700 shadow-sm">
              EEAC
            </div>
            <div>
              <h1 className="font-extrabold text-sm tracking-tight text-slate-800 leading-none">
                Cantina Digital
              </h1>
              <span className="text-[10px] text-slate-500 font-semibold uppercase">E.E. Antônio Caio</span>
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
        <div className="text-center mb-8">
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-850">
            {activeTab === 'login' ? 'Acesse sua conta' : 'Crie sua conta'}
          </h2>
          <p className="mt-1.5 text-xs text-slate-400">
            {activeTab === 'login' ? 'Insira suas credenciais ou utilize redes sociais' : 'Preencha os dados de acordo com seu perfil'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full shadow-sm space-y-6">
          {/* Custom Tab Selector */}
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1 text-xs font-bold text-slate-550">
            <button
              onClick={() => { setActiveTab('login'); setErrorMsg(""); setSuccessMsg(""); }}
              className={`flex-1 py-2 rounded-lg transition-all cursor-pointer text-center ${activeTab === 'login' ? 'bg-white text-slate-800 shadow-xs' : 'hover:text-slate-700'}`}
            >
              Entrar
            </button>
            <button
              onClick={() => { setActiveTab('register'); setErrorMsg(""); setSuccessMsg(""); }}
              className={`flex-1 py-2 rounded-lg transition-all cursor-pointer text-center ${activeTab === 'register' ? 'bg-white text-slate-800 shadow-xs' : 'hover:text-slate-700'}`}
            >
              Cadastrar-se
            </button>
          </div>

          {/* Social login option */}
          <div className="space-y-3">
            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-650 font-bold text-xs py-3 rounded-xl border border-slate-200 shadow-2xs transition-all active:scale-98 cursor-pointer"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.53 14.97 1 12 1 7.24 1 3.21 3.73 1.29 7.71l3.88 3C6.11 7.73 8.78 5.04 12 5.04z" />
                <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.29 1.48-1.14 2.73-2.4 3.58l3.76 2.91c2.2-2.03 3.67-5.02 3.67-8.64z" />
                <path fill="#FBBC05" d="M5.17 14.71c-.24-.71-.38-1.47-.38-2.26s.14-1.55.38-2.26L1.29 7.19C.46 8.86 0 10.73 0 12.7c0 1.97.46 3.84 1.29 5.51l3.88-3z" />
                <path fill="#34A853" d="M12 23c3.24 0 5.95-1.08 7.93-2.91l-3.76-2.91c-1.08.72-2.45 1.16-4.17 1.16-3.22 0-5.89-2.69-6.83-5.67l-3.88 3C3.21 20.27 7.24 23 12 23z" />
              </svg>
              <span>{activeTab === 'login' ? 'Entrar com Google' : 'Cadastrar com Google'}</span>
            </button>
            <div className="flex items-center justify-center gap-3">
              <div className="h-[1px] bg-slate-200 flex-1"></div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ou</span>
              <div className="h-[1px] bg-slate-200 flex-1"></div>
            </div>
          </div>

          {/* Form Area */}
          {activeTab === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xxs font-bold text-slate-500 uppercase">E-mail</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  placeholder="exemplo@email.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-red-500 placeholder-slate-400"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xxs font-bold text-slate-500 uppercase">Senha</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-red-500 placeholder-slate-400"
                  required
                />
              </div>

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

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-red-655 hover:bg-red-755 text-white font-bold text-xs py-3 rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoading ? "Entrando..." : "Entrar na Conta"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              {/* Role Selector */}
              <div className="flex border border-slate-200 p-0.5 rounded-lg text-xxs font-bold text-slate-500 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setRegisterRole('aluno')}
                  className={`flex-1 py-1.5 rounded transition-all cursor-pointer ${registerRole === 'aluno' ? 'bg-white text-slate-850 shadow-2xs border border-slate-200/50' : ''}`}
                >
                  Estudante
                </button>
                <button
                  type="button"
                  onClick={() => setRegisterRole('professor')}
                  className={`flex-1 py-1.5 rounded transition-all cursor-pointer ${registerRole === 'professor' ? 'bg-white text-slate-850 shadow-2xs border border-slate-200/50' : ''}`}
                >
                  Servidor/Prof.
                </button>
                <button
                  type="button"
                  onClick={() => setRegisterRole('familia')}
                  className={`flex-1 py-1.5 rounded transition-all cursor-pointer ${registerRole === 'familia' ? 'bg-white text-slate-850 shadow-2xs border border-slate-200/50' : ''}`}
                >
                  Responsável
                </button>
              </div>

              {registerRole === 'aluno' && (
                <>
                  <div className="space-y-1">
                    <label className="block text-xxs font-bold text-slate-500 uppercase">Nome Completo</label>
                    <input
                      type="text"
                      value={studentNome}
                      onChange={e => setStudentNome(e.target.value)}
                      placeholder="Nome do Estudante"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-red-500 placeholder-slate-400"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xxs font-bold text-slate-500 uppercase">Série / Turma</label>
                      <input
                        type="text"
                        value={studentSerie}
                        onChange={e => setStudentSerie(e.target.value)}
                        placeholder="Ex: 6º Ano A"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-red-500 placeholder-slate-400"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      <div className="col-span-2 space-y-1">
                        <label className="block text-xxs font-bold text-slate-500 uppercase">RA</label>
                        <input
                          type="text"
                          value={studentRA}
                          onChange={e => setStudentRA(e.target.value)}
                          placeholder="123456"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-red-500 placeholder-slate-400 font-mono"
                          required
                        />
                      </div>
                      <div className="col-span-1 space-y-1">
                        <label className="block text-xxs font-bold text-slate-500 uppercase">Dígito</label>
                        <input
                          type="text"
                          value={studentDigit}
                          onChange={e => setStudentDigit(e.target.value)}
                          placeholder="X"
                          maxLength={1}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-red-500 placeholder-slate-400 text-center font-bold font-mono"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xxs font-bold text-slate-500 uppercase">E-mail Institucional</label>
                    <input
                      type="email"
                      value={studentEmail}
                      onChange={e => setStudentEmail(e.target.value)}
                      placeholder="seu-ra@al.educacao.sp.gov.br"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-red-500 placeholder-slate-400"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xxs font-bold text-slate-500 uppercase">Senha</label>
                    <input
                      type="password"
                      value={studentPassword}
                      onChange={e => setStudentPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-red-500 placeholder-slate-400"
                      required
                    />
                  </div>
                </>
              )}

              {registerRole === 'professor' && (
                <>
                  <div className="space-y-1">
                    <label className="block text-xxs font-bold text-slate-500 uppercase">Nome Completo</label>
                    <input
                      type="text"
                      value={profNome}
                      onChange={e => setProfNome(e.target.value)}
                      placeholder="Nome do Professor/Servidor"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-red-500 placeholder-slate-400"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xxs font-bold text-slate-500 uppercase">E-mail Institucional</label>
                    <input
                      type="email"
                      value={profEmail}
                      onChange={e => setProfEmail(e.target.value)}
                      placeholder="seu-nome@prof.educacao.sp.gov.br"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-red-500 placeholder-slate-400"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xxs font-bold text-slate-500 uppercase">Senha</label>
                    <input
                      type="password"
                      value={profPassword}
                      onChange={e => setProfPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-red-500 placeholder-slate-400"
                      required
                    />
                  </div>
                </>
              )}

              {registerRole === 'familia' && (
                <>
                  <div className="space-y-1">
                    <label className="block text-xxs font-bold text-slate-500 uppercase">Nome Completo</label>
                    <input
                      type="text"
                      value={parentNome}
                      onChange={e => setParentNome(e.target.value)}
                      placeholder="Nome do Responsável"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-red-500 placeholder-slate-400"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xxs font-bold text-slate-500 uppercase">RG</label>
                      <input
                        type="text"
                        value={parentRG}
                        onChange={e => setParentRG(e.target.value)}
                        placeholder="Ex: 12.345.678-9"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-red-500 placeholder-slate-400 font-mono"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xxs font-bold text-slate-500 uppercase">Whatsapp</label>
                      <input
                        type="text"
                        value={parentWhatsapp}
                        onChange={e => setParentWhatsapp(e.target.value)}
                        placeholder="(11) 99999-9999"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-red-500 placeholder-slate-400"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xxs font-bold text-slate-500 uppercase">E-mail</label>
                    <input
                      type="email"
                      value={parentEmail}
                      onChange={e => setParentEmail(e.target.value)}
                      placeholder="exemplo@email.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-red-500 placeholder-slate-400"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xxs font-bold text-slate-500 uppercase">Senha</label>
                    <input
                      type="password"
                      value={parentPassword}
                      onChange={e => setParentPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-red-500 placeholder-slate-400"
                      required
                    />
                  </div>
                </>
              )}

              {errorMsg && (
                <div className="text-xxs text-red-655 bg-red-50 p-3 rounded-lg border border-red-100 font-medium">
                  ⚠️ {errorMsg}
                </div>
              )}

              {successMsg && (
                <div className="text-xxs text-emerald-655 bg-emerald-50 p-3 rounded-lg border border-emerald-100 font-medium">
                  🎉 {successMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-3 rounded-xl transition-all cursor-pointer disabled:opacity-50 shadow-2xs active:scale-98"
              >
                {isLoading ? "Criando Conta..." : "Cadastrar Conta"}
              </button>
            </form>
          )}
        </div>

        {/* Simulador Dev / Backdoor buttons */}
        <div className="mt-8 bg-white border border-slate-200 rounded-2xl p-4 w-full text-center space-y-2.5">
          <span className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider block">Atalhos Prototipagem (Bypass Login)</span>
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => handleSimularLogin('aluno')}
              className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 py-1.5 px-3 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
            >
              🎓 Aluno Teste
            </button>
            <button
              onClick={() => handleSimularLogin('professor')}
              className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 py-1.5 px-3 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
            >
              💼 Professor Teste
            </button>
            <button
              onClick={() => handleSimularLogin('familia')}
              className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 py-1.5 px-3 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
            >
              👨‍👩‍👦 Família Teste
            </button>
            <button
              onClick={() => handleSimularLogin('cantina')}
              className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 py-1.5 px-3 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
            >
              🍔 Cantina Teste
            </button>
            <button
              onClick={() => handleSimularLogin('admin')}
              className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 py-1.5 px-3 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
            >
              🏫 Secretaria Teste
            </button>
            <button
              onClick={() => handleSimularLogin('gestao')}
              className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 py-1.5 px-3 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
            >
              🔑 Gestão Teste
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <p>© 2026 E.E. Antônio Caio - Cantina Digital Escolar. Todos os direitos reservados.</p>
      </footer>
    </main>
  );
}
