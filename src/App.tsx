import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { SidebarNav, TabType } from './components/SidebarNav';
import { UserProfileForm } from './components/UserProfileForm';
import { WorkoutEngineView } from './components/WorkoutEngineView';
import { ExerciseLibraryView } from './components/ExerciseLibraryView';
import { WorkoutLoggerView } from './components/WorkoutLoggerView';
import { FatigueProgressView } from './components/FatigueProgressView';
import { AICoachView } from './components/AICoachView';
import { FlexibleDietView } from './components/FlexibleDietView';
import { AuthModal } from './components/AuthModal';
import { LoginScreen } from './components/LoginScreen';
import { SplashScreen } from './components/SplashScreen';
import { SubscriptionView } from './components/SubscriptionView';
import { SubscriptionModal } from './components/SubscriptionModal';
import { OnboardingWizard } from './components/OnboardingWizard';
import { DeviceSessionsModal } from './components/DeviceSessionsModal';
import { BodyMeasurementsModal } from './components/BodyMeasurementsModal';
import { AchievementsView } from './components/AchievementsView';
import { PremiumGateModal } from './components/PremiumGateModal';
import { GoogleDriveView } from './components/GoogleDriveView';
import { verifyUserEmail } from './services/authService';
import { PermissionService } from './services/permissionService';
import { AthletaBackupPayload } from './services/googleDriveService';

import { UserProfile, FullBodyProgram, WorkoutLog, SubscriptionState } from './types';
import { generateFullBodyWorkout } from './engine/workoutEngine';
import { exportPlanToPDF } from './services/pdfExporter';
import { 
  getSubscriptionState, 
  saveSubscriptionState 
} from './services/subscriptionService';
import { 
  UserAccount, 
  getCurrentSession, 
  setCurrentSession, 
  updateUserAccountProfile,
  DEMO_ACCOUNTS 
} from './services/authService';
import { 
  Dumbbell, 
  Flame, 
  Apple, 
  MessageSquare, 
  Play, 
  Sparkles, 
  Activity, 
  ShieldCheck, 
  User, 
  CreditCard, 
  Laptop,
  CheckCircle2,
  Clock,
  Target,
  TrendingUp,
  Zap,
  Award
} from 'lucide-react';

export default function App() {
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState<boolean>(false);
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState<boolean>(false);
  const [isBodyMeasurementsOpen, setIsBodyMeasurementsOpen] = useState<boolean>(false);
  const [isPremiumGateOpen, setIsPremiumGateOpen] = useState<boolean>(false);
  const [premiumGateTitle, setPremiumGateTitle] = useState<string>('Recurso Exclusivo APEX Pass');
  const [premiumGateDesc, setPremiumGateDesc] = useState<string>('Este recurso de alta precisão é reservado para membros do plano APEX Membership.');
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [emailVerifySuccess, setEmailVerifySuccess] = useState<boolean>(false);

  const handleVerifyEmail = () => {
    if (!currentUser) return;
    const updated = verifyUserEmail(currentUser.id);
    setCurrentUser(updated);
    setEmailVerifySuccess(true);
    setTimeout(() => setEmailVerifySuccess(false), 4000);
  };

  // Active Subscription State
  const [subscription, setSubscription] = useState<SubscriptionState>(() => getSubscriptionState());

  // Active Authenticated User Session
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    return getCurrentSession();
  });

  // Default initial athlete profile initialized from user or demo
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    return currentUser ? currentUser.profile : DEMO_ACCOUNTS[0].profile;
  });

  // Generated Workout Engine Program State
  const [program, setProgram] = useState<FullBodyProgram>(() =>
    generateFullBodyWorkout(userProfile)
  );

  // Selected Day ID for Workout Logger
  const [activeDayId, setActiveDayId] = useState<'A' | 'B' | 'C' | 'D'>('A');

  // Completed Workout Logs
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);

  const handleSaveProfile = (updatedProfile: UserProfile) => {
    setUserProfile(updatedProfile);
    if (currentUser) {
      const updatedUser = updateUserAccountProfile(currentUser.id, updatedProfile);
      setCurrentUser(updatedUser);
    }
    const newProgram = generateFullBodyWorkout(updatedProfile);
    setProgram(newProgram);
    setActiveTab('workout_engine');
  };

  const handleLoginSuccess = (account: UserAccount) => {
    setCurrentUser(account);
    setUserProfile(account.profile);
    const newProgram = generateFullBodyWorkout(account.profile);
    setProgram(newProgram);
    setIsAuthModalOpen(false);
  };

  const handleLogout = () => {
    setCurrentSession(null);
    setCurrentUser(null);
  };

  const handleSubscriptionUpdate = (updatedState: SubscriptionState) => {
    setSubscription(updatedState);
    saveSubscriptionState(updatedState);
  };

  const handleOnboardingComplete = (newProfile: UserProfile) => {
    handleSaveProfile(newProfile);
    setShowOnboarding(false);
  };

  // Splash screen transition
  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  // If no user is logged in, show the mandatory Login Screen wall
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // First Access Onboarding Wizard Flow
  if (showOnboarding) {
    return (
      <OnboardingWizard
        initialName={userProfile.name}
        onComplete={handleOnboardingComplete}
      />
    );
  }

  const handleRegenerateProgram = () => {
    const newProgram = generateFullBodyWorkout(userProfile);
    setProgram(newProgram);
  };

  const handleSelectDayForLogger = (dayId: 'A' | 'B' | 'C' | 'D') => {
    setActiveDayId(dayId);
    setActiveTab('progress');
  };

  const handleSaveWorkoutLog = (newLog: WorkoutLog) => {
    setWorkoutLogs((prev) => [newLog, ...prev]);
  };

  const handleExportPDF = () => {
    exportPlanToPDF({ program, userProfile });
  };

  const handleRestoreBackup = (backup: AthletaBackupPayload) => {
    if (backup.userProfile) {
      setUserProfile(backup.userProfile);
      if (currentUser) {
        const updated = updateUserAccountProfile(currentUser.id, backup.userProfile);
        setCurrentUser(updated);
      }
    }
    if (backup.program) {
      setProgram(backup.program);
    }
    if (backup.workoutLogs && Array.isArray(backup.workoutLogs)) {
      setWorkoutLogs(backup.workoutLogs);
    }
    setActiveTab('workout_engine');
  };

  // Active next workout day calculations
  const nextWorkoutDay = program.dias?.find((d) => d.dayId === activeDayId) || program.dias?.[0];
  const nextDayExercisesCount = nextWorkoutDay?.items?.length || 6;
  const nextDayFocusMuscles = nextWorkoutDay?.focusMuscles || ['Peitoral', 'Costas', 'Quadríceps'];

  return (
    <div className="min-h-screen bg-[#09090b] font-sans text-zinc-100 flex flex-col selection:bg-rose-500/30 selection:text-white">
      {/* Top Header Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userProfileName={userProfile.name}
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenSubscriptionModal={() => setIsSubscriptionModalOpen(true)}
        onLogout={handleLogout}
        onExportPDF={handleExportPDF}
        onToggleMobileMenu={() => setIsMobileNavOpen(!isMobileNavOpen)}
      />

      {/* Main Content Area with Left Navigation Sidebar */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-6">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          
          {/* Retractable Sidebar Menu */}
          <aside className="w-full lg:w-auto sticky top-20 shrink-0 z-30 transition-all duration-300">
            <SidebarNav
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              workoutCount={program.dias?.length || 5}
              isCollapsed={isSidebarCollapsed}
              setIsCollapsed={setIsSidebarCollapsed}
              isMobileOpen={isMobileNavOpen}
              setIsMobileOpen={setIsMobileNavOpen}
            />
          </aside>

          {/* Tab Content Display */}
          <main className="flex-1 min-w-0 w-full">
            {/* Visão Geral (Overview Dashboard) */}
            {activeTab === 'overview' && (
              <div className="space-y-6 animate-fadeIn">
                
                {/* Email Verification Banner */}
                {currentUser && !currentUser.emailVerified && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-200">
                    <div className="flex items-center space-x-2.5">
                      <ShieldCheck className="h-5 w-5 text-amber-400 shrink-0" />
                      <div>
                        <strong>Verificação de E-mail Pendente:</strong> Confirme o endereço <code className="bg-amber-500/20 px-1.5 py-0.5 rounded text-amber-300 font-mono">{currentUser.email}</code> para garantir a recuperação segura da sua conta.
                      </div>
                    </div>
                    <button
                      onClick={handleVerifyEmail}
                      className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold px-3.5 py-1.5 rounded-xl transition-all cursor-pointer text-xs shrink-0"
                    >
                      Verificar E-mail Agora
                    </button>
                  </div>
                )}

                {emailVerifySuccess && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center space-x-2 text-xs text-emerald-300">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                    <span>E-mail verificado com sucesso! Sua conta Athleta Core Pass está 100% ativada.</span>
                  </div>
                )}

                {/* 1. Hero Banner: Personalized Greeting & Primary CTA */}
                <div className="bg-[#0f0f12] border border-zinc-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-rose-600/10 rounded-full blur-3xl pointer-events-none"></div>
                  <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-red-600/5 rounded-full blur-2xl pointer-events-none"></div>
                  
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
                    <div className="space-y-3 max-w-xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center space-x-1.5 bg-rose-500/15 border border-rose-500/30 text-rose-300 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                          <Sparkles className="h-3.5 w-3.5 text-rose-400" />
                          <span>Atleta Nível {userProfile.experience === 'advanced' ? 'Avançado' : userProfile.experience === 'intermediate' ? 'Intermediário' : 'Iniciante'}</span>
                        </span>
                        <span className="bg-zinc-800 border border-zinc-700 text-zinc-300 px-3 py-1 rounded-full text-xs font-mono font-bold">
                          Frequência: {userProfile.availableDays}x / semana
                        </span>
                      </div>

                      <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                        Bem-vindo de volta, <span className="text-rose-500">{userProfile.name}</span>!
                      </h1>
                      <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-medium">
                        Sua ficha <strong className="text-zinc-200">Fullbody Scientific Engine</strong> está otimizada com descansos programados e volume de séries efetivas para maximizar hipertrofia e força.
                      </p>
                    </div>

                    {/* Primary Hero CTA Button */}
                    <div className="w-full lg:w-auto flex flex-col sm:flex-row lg:flex-col items-stretch gap-3 shrink-0">
                      <button
                        onClick={() => handleSelectDayForLogger(activeDayId)}
                        className="w-full sm:w-auto bg-gradient-to-r from-rose-600 via-red-600 to-rose-500 hover:from-rose-500 hover:to-red-500 text-white px-8 py-4 rounded-2xl font-black text-sm flex items-center justify-center space-x-3 transition-all shadow-xl shadow-rose-600/30 hover:scale-[1.02] active:scale-[0.98] cursor-pointer group"
                      >
                        <div className="h-7 w-7 rounded-lg bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Play className="h-4 w-4 fill-white text-white ml-0.5" />
                        </div>
                        <span className="tracking-wider uppercase">INICIAR TREINO DO DIA</span>
                      </button>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          onClick={() => setIsBodyMeasurementsOpen(true)}
                          className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 px-4 py-2.5 rounded-2xl font-bold text-xs transition-all text-center cursor-pointer hover:border-rose-500/40 flex items-center justify-center space-x-1.5"
                        >
                          <Activity className="h-3.5 w-3.5 text-rose-400" />
                          <span>Medições Corporais</span>
                        </button>
                        <button
                          onClick={() => setShowOnboarding(true)}
                          className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 px-4 py-2.5 rounded-2xl font-bold text-xs transition-all text-center cursor-pointer hover:border-zinc-700"
                        >
                          Recalibrar Ficha
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Key Fitness Indicators Grid (Next Workout, Streak, Metrics) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  
                  {/* Next Workout Card */}
                  <div 
                    onClick={() => handleSelectDayForLogger(activeDayId)}
                    className="bg-[#0f0f12] border border-zinc-800/90 hover:border-rose-500/50 p-6 rounded-3xl cursor-pointer transition-all space-y-4 group relative overflow-hidden shadow-xl"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center font-bold">
                          <Dumbbell className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Próxima Fase</p>
                          <h3 className="font-black text-white text-base group-hover:text-rose-400 transition-colors">
                            Treino Dia {nextWorkoutDay?.dayId || 'A'}
                          </h3>
                        </div>
                      </div>
                      <span className="bg-rose-500/15 text-rose-300 font-mono font-bold text-xs px-2.5 py-1 rounded-xl border border-rose-500/20">
                        {nextDayExercisesCount} Exercícios
                      </span>
                    </div>

                    <div className="space-y-2 pt-1 border-t border-zinc-800/80">
                      <div className="flex items-center justify-between text-xs text-zinc-400">
                        <span className="flex items-center gap-1.5">
                          <Target className="h-3.5 w-3.5 text-rose-400" />
                          <span>Músculos Alvo:</span>
                        </span>
                        <span className="font-bold text-zinc-200 truncate max-w-[160px]">
                          {nextDayFocusMuscles.join(', ')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-zinc-400">
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-rose-400" />
                          <span>Duração Estimada:</span>
                        </span>
                        <span className="font-mono font-bold text-zinc-200">~{userProfile.timePerSessionMin} min</span>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between text-xs text-rose-400 font-bold group-hover:translate-x-1 transition-transform">
                      <span>Iniciar agora →</span>
                      <Zap className="h-4 w-4" />
                    </div>
                  </div>

                  {/* Training Sequence / Streak Card */}
                  <div className="bg-[#0f0f12] border border-zinc-800/90 p-6 rounded-3xl space-y-4 shadow-xl relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
                          <Flame className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Consistência</p>
                          <h3 className="font-black text-white text-base">
                            Sequência de Treinos
                          </h3>
                        </div>
                      </div>
                      <span className="bg-amber-500/15 text-amber-300 font-bold text-xs px-2.5 py-1 rounded-xl border border-amber-500/20 flex items-center gap-1">
                        🔥 5 Dias
                      </span>
                    </div>

                    <div className="space-y-2 pt-1 border-t border-zinc-800/80">
                      <div className="flex items-center justify-between text-xs text-zinc-400">
                        <span>Meta Semanal:</span>
                        <span className="font-bold text-zinc-200">{workoutLogs.length} de {userProfile.availableDays} Concluídos</span>
                      </div>
                      {/* Progress Bar */}
                      <div className="w-full h-2 bg-zinc-900 border border-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full"
                          style={{ width: `${Math.min(100, (workoutLogs.length / userProfile.availableDays) * 100 || 60)}%` }}
                        />
                      </div>
                    </div>

                    <p className="text-[11px] text-zinc-400 font-medium pt-1">
                      Mantenha o estímulo frequente para maximizar o ganho de massa magra sem fadiga excessiva.
                    </p>
                  </div>

                  {/* Weekly Evolution / Metrics Card */}
                  <div className="bg-[#0f0f12] border border-zinc-800/90 p-6 rounded-3xl space-y-4 shadow-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center font-bold">
                          <TrendingUp className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Volume Total</p>
                          <h3 className="font-black text-white text-base">
                            Evolução Semanal
                          </h3>
                        </div>
                      </div>
                      <span className="bg-rose-500/15 text-rose-300 font-mono font-bold text-xs px-2.5 py-1 rounded-xl border border-rose-500/20">
                        +8.2% este mês
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-800/80">
                      <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800 text-center">
                        <p className="text-[10px] text-zinc-400 uppercase font-medium">Séries Totais</p>
                        <p className="text-sm font-black text-white mt-0.5">24 Séries</p>
                      </div>
                      <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800 text-center">
                        <p className="text-[10px] text-zinc-400 uppercase font-medium">RIR Médio</p>
                        <p className="text-sm font-black text-rose-400 mt-0.5">1-2 RIR</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                      <span>Nível de Estresse Tensional:</span>
                      <span className="text-emerald-400 font-bold">Ótimo</span>
                    </div>
                  </div>

                </div>

                {/* 3. Quick Modules Navigation Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Fullbody Matrix Card */}
                  <div 
                    onClick={() => setActiveTab('workout_engine')}
                    className="bg-[#0f0f12] border border-zinc-800/90 hover:border-rose-500/50 p-5 rounded-2xl cursor-pointer transition-all space-y-3 group shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div className="h-10 w-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                        <Dumbbell className="h-5 w-5" />
                      </div>
                      <span className="bg-rose-500/20 text-rose-300 font-bold text-xs px-2.5 py-1 rounded-full border border-rose-500/30">
                        {program.splitDays?.length || 5} Fases
                      </span>
                    </div>
                    <div>
                      <h3 className="font-bold text-white group-hover:text-rose-400 transition-colors text-sm">
                        Fullbody Matrix
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1">
                        Rotinas estruturadas por fadiga central e volume semanal.
                      </p>
                    </div>
                  </div>

                  {/* NutriFlux Engine Card */}
                  <div 
                    onClick={() => setActiveTab('diet')}
                    className="bg-[#0f0f12] border border-zinc-800/90 hover:border-rose-500/50 p-5 rounded-2xl cursor-pointer transition-all space-y-3 group shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div className="h-10 w-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                        <Apple className="h-5 w-5" />
                      </div>
                      <span className="bg-rose-500/20 text-rose-300 font-bold text-xs px-2.5 py-1 rounded-full border border-rose-500/30">
                        NUTRIFLUX
                      </span>
                    </div>
                    <div>
                      <h3 className="font-bold text-white group-hover:text-rose-400 transition-colors text-sm">
                        NutriFlux Engine
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1">
                        Calorias e distribuição de macros para alta performance.
                      </p>
                    </div>
                  </div>

                  {/* APEX Membership Card */}
                  <div 
                    onClick={() => setActiveTab('subscription')}
                    className="bg-[#0f0f12] border border-zinc-800/90 hover:border-rose-500/50 p-5 rounded-2xl cursor-pointer transition-all space-y-3 group shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div className="h-10 w-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <span className="bg-rose-600 text-white font-black text-[10px] px-2 py-0.5 rounded uppercase shadow-sm">
                        APEX PASS
                      </span>
                    </div>
                    <div>
                      <h3 className="font-bold text-white group-hover:text-rose-400 transition-colors text-sm">
                        APEX Membership
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1">
                        Acesso ilimitado à Inteligência Artificial e histórico.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Gamified Achievements Section */}
                <AchievementsView userId={currentUser.id} />

                {/* Detailed Workout Program Preview */}
                <WorkoutEngineView
                  program={program}
                  onRegenerate={handleRegenerateProgram}
                  onSelectDayForLogger={handleSelectDayForLogger}
                  userProfile={userProfile}
                  onOpenDriveTab={() => setActiveTab('google_drive')}
                />
              </div>
            )}

            {/* Treinos Fullbody */}
            {activeTab === 'workout_engine' && (
              <WorkoutEngineView
                program={program}
                onRegenerate={handleRegenerateProgram}
                onSelectDayForLogger={handleSelectDayForLogger}
                userProfile={userProfile}
                onOpenDriveTab={() => setActiveTab('google_drive')}
              />
            )}

            {/* Dieta Flexível */}
            {activeTab === 'diet' && (
              <FlexibleDietView userProfile={userProfile} program={program} />
            )}

            {/* Treinador IA */}
            {activeTab === 'ai_coach' && (
              <AICoachView profile={userProfile} program={program} />
            )}

            {/* Guia de Exercícios */}
            {activeTab === 'exercise_library' && <ExerciseLibraryView />}

            {/* Nuvem Google Drive */}
            {activeTab === 'google_drive' && (
              <GoogleDriveView
                program={program}
                userProfile={userProfile}
                workoutLogs={workoutLogs}
                onRestoreBackup={handleRestoreBackup}
              />
            )}

            {/* Gerenciar Perfis */}
            {activeTab === 'assessment' && (
              <UserProfileForm
                initialProfile={userProfile}
                onSaveProfile={handleSaveProfile}
              />
            )}

            {/* Subscription & PNU Management */}
            {activeTab === 'subscription' && (
              <SubscriptionView
                subscription={subscription}
                onSubscriptionUpdate={handleSubscriptionUpdate}
                onOpenCheckoutModal={() => setIsSubscriptionModalOpen(true)}
                userEmail={currentUser.email}
                userName={currentUser.name}
              />
            )}

            {/* Progress Logger */}
            {activeTab === 'progress' && (
              <WorkoutLoggerView
                program={program}
                activeDayId={activeDayId}
                onSaveLog={handleSaveWorkoutLog}
              />
            )}

            {/* Fatigue & Deload */}
            {activeTab === 'fatigue' && (
              <FatigueProgressView
                profile={userProfile}
                workoutLogs={workoutLogs}
                onUpdateProfile={setUserProfile}
              />
            )}
          </main>

        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#0f0f12] border-t border-zinc-800 py-4 text-center text-xs text-zinc-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>Athleta AI • Prescrição Científica & Alta Performance (FULL BODY Engine v2.5)</p>
          <button
            onClick={() => setIsDeviceModalOpen(true)}
            className="text-zinc-400 hover:text-rose-400 flex items-center space-x-1 text-[11px] transition-colors cursor-pointer"
          >
            <Laptop className="h-3.5 w-3.5" />
            <span>Ver Dispositivos Ativos</span>
          </button>
        </div>
      </footer>

      {/* Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      <SubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
        subscription={subscription}
        onSubscriptionUpdate={handleSubscriptionUpdate}
        userEmail={currentUser.email}
        userName={currentUser.name}
      />

      <DeviceSessionsModal
        isOpen={isDeviceModalOpen}
        onClose={() => setIsDeviceModalOpen(false)}
      />

      <BodyMeasurementsModal
        isOpen={isBodyMeasurementsOpen}
        onClose={() => setIsBodyMeasurementsOpen(false)}
        userId={currentUser.id}
      />

      <PremiumGateModal
        isOpen={isPremiumGateOpen}
        onClose={() => setIsPremiumGateOpen(false)}
        featureTitle={premiumGateTitle}
        featureDescription={premiumGateDesc}
        onOpenSubscriptionView={() => {
          setIsPremiumGateOpen(false);
          setIsSubscriptionModalOpen(true);
        }}
      />
    </div>
  );
}
