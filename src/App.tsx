import React, { useState } from 'react';
import { Header } from './components/Header';
import { SidebarNav } from './components/SidebarNav';
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

import { exportPlanToPDF } from './services/pdfExporter';
import { useAuth } from './hooks/useAuth';
import { useNavigation } from './hooks/useNavigation';
import { useSubscription } from './hooks/useSubscription';
import { useWorkout } from './hooks/useWorkout';
import { 
  Dumbbell, 
  Sparkles, 
  Activity, 
  ShieldCheck, 
  Clock, 
  Target, 
  Award, 
  Loader2, 
  Play 
} from 'lucide-react';

export default function App() {
  const [showSplash, setShowSplash] = useState<boolean>(true);

  // 1. Auth Module
  const {
    authState,
    currentUser,
    emailVerifySuccess,
    handleLoginSuccess,
    handleLogout,
    handleVerifyEmail,
    handleUpdateProfile,
  } = useAuth();

  // 2. Navigation & Modals Module
  const {
    activeTab,
    setActiveTab,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    isMobileNavOpen,
    setIsMobileNavOpen,
    isAuthModalOpen,
    setIsAuthModalOpen,
    isSubscriptionModalOpen,
    setIsSubscriptionModalOpen,
    isDeviceModalOpen,
    setIsDeviceModalOpen,
    isBodyMeasurementsOpen,
    setIsBodyMeasurementsOpen,
    isPremiumGateOpen,
    setIsPremiumGateOpen,
    showOnboarding,
    setShowOnboarding,
  } = useNavigation();

  // 3. Subscription Module
  const {
    subscription,
    handleSubscriptionUpdate,
  } = useSubscription(currentUser?.id);

  // 4. Workout & Profile Module
  const {
    userProfile,
    program,
    activeDayId,
    setActiveDayId,
    workoutLogs,
    handleSaveProfile,
    handleRegenerateProgram,
    handleSaveWorkoutLog,
    handleApplyDriveBackup,
  } = useWorkout(currentUser?.id);

  // Synchronize profile updates with user account
  const onSaveProfileAndNavigate = async (updatedProfile: typeof userProfile) => {
    await handleSaveProfile(updatedProfile);
    if (currentUser) {
      await handleUpdateProfile(updatedProfile);
    }
    setActiveTab('workout_engine');
  };

  const handleOnboardingComplete = async (newProfile: typeof userProfile) => {
    await onSaveProfileAndNavigate(newProfile);
    setShowOnboarding(false);
  };

  // Splash screen transition
  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  // Loading Firebase session state
  if (authState === 'loading') {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center text-zinc-100 space-y-4">
        <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl">
          <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
        </div>
        <p className="text-xs text-zinc-400 font-medium tracking-wide">
          Sincronizando com Firebase & Firestore...
        </p>
      </div>
    );
  }

  // If no user is logged in, show the mandatory Login Screen wall
  if (!currentUser) {
    return (
      <LoginScreen 
        onLoginSuccess={handleLoginSuccess} 
        isLoadingSession={authState === 'loading'}
      />
    );
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

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans selection:bg-rose-500 selection:text-white">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userProfileName={userProfile.name}
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenSubscriptionModal={() => setIsSubscriptionModalOpen(true)}
        onLogout={handleLogout}
        onExportPDF={() => exportPlanToPDF({ program, userProfile })}
        onToggleMobileMenu={() => setIsMobileNavOpen(!isMobileNavOpen)}
      />

      {/* Email Verification Banner */}
      {currentUser && !currentUser.emailVerified && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs text-amber-300 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="h-4 w-4 text-amber-400" />
            <span>Conta Google verificada via Firebase ID Token: <strong>{currentUser.email}</strong></span>
          </div>
          <button
            onClick={handleVerifyEmail}
            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
          >
            {emailVerifySuccess ? 'Verificado ✓' : 'Sincronizar'}
          </button>
        </div>
      )}

      {/* Main App Layout */}
      <div className="flex-1 flex overflow-hidden max-w-7xl w-full mx-auto">
        {/* Left Sidebar Navigation */}
        <SidebarNav
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setIsMobileNavOpen(false);
          }}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
          isMobileOpen={isMobileNavOpen}
          setIsMobileOpen={setIsMobileNavOpen}
        />

        {/* Dynamic Main Content Area */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          <main className="p-4 sm:p-6 lg:p-8 space-y-6">
            
            {/* Overview / Dashboard */}
            {activeTab === 'overview' && (
              <div className="space-y-6 animate-fadeIn">
                {/* Hero / Athlete Welcome Card */}
                <div className="relative overflow-hidden bg-[#0f0f12] border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xl">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-rose-600/10 blur-[100px] rounded-full pointer-events-none" />
                  
                  <div className="relative z-10 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="inline-flex items-center space-x-2 bg-rose-500/15 border border-rose-500/30 text-rose-400 px-3 py-1 rounded-full text-xs font-bold font-mono">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>FIRESTORE & GOOGLE AUTH CONECTADOS</span>
                      </div>
                      <div className="text-xs text-zinc-400 font-mono">
                        {currentUser.email}
                      </div>
                    </div>

                    <div>
                      <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        Olá, {currentUser.name}
                      </h1>
                      <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl mt-1">
                        Seus dados biométricos e histórico de treinos estão sincronizados no Firestore.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3 pt-2">
                      <button
                        onClick={() => setActiveTab('workout_engine')}
                        className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-600/20 transition-all flex items-center space-x-2 cursor-pointer active:scale-95"
                      >
                        <Play className="h-4 w-4 fill-white" />
                        <span>VER PRESCRIÇÃO DO TREINO</span>
                      </button>
                      <button
                        onClick={() => setActiveTab('progress')}
                        className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 text-xs font-bold rounded-xl transition-all flex items-center space-x-2 cursor-pointer active:scale-95"
                      >
                        <Activity className="h-4 w-4 text-rose-400" />
                        <span>REGISTRAR SESSÃO DE HOJE</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick Metrics Bento Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-[#0f0f12] border border-zinc-800 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between text-zinc-400">
                      <span className="text-xs font-medium">Metodologia</span>
                      <Dumbbell className="h-4 w-4 text-rose-500" />
                    </div>
                    <div className="text-lg font-black text-white">Full Body 2.5</div>
                    <div className="text-[10px] text-zinc-500">Alta frequência e sobrecarga</div>
                  </div>

                  <div className="bg-[#0f0f12] border border-zinc-800 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between text-zinc-400">
                      <span className="text-xs font-medium">Frequência Semanal</span>
                      <Clock className="h-4 w-4 text-rose-500" />
                    </div>
                    <div className="text-lg font-black text-white">{userProfile.availableDays} dias / semana</div>
                    <div className="text-[10px] text-zinc-500">Divisão otimizada de volume</div>
                  </div>

                  <div className="bg-[#0f0f12] border border-zinc-800 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between text-zinc-400">
                      <span className="text-xs font-medium">Objetivo Primário</span>
                      <Target className="h-4 w-4 text-rose-500" />
                    </div>
                    <div className="text-lg font-black text-white capitalize">{userProfile.objective}</div>
                    <div className="text-[10px] text-zinc-500">Intensidade e RIR calibrados</div>
                  </div>

                  <div className="bg-[#0f0f12] border border-zinc-800 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between text-zinc-400">
                      <span className="text-xs font-medium">Assinatura Ativa</span>
                      <Award className="h-4 w-4 text-rose-500" />
                    </div>
                    <div className="text-lg font-black text-rose-400">
                      {subscription.isSubscribed ? 'PRO & APEX' : 'CORE (Gratuito)'}
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      {subscription.isSubscribed ? 'Recursos avançados liberados' : 'Limite mensal ativo'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Assessment / Profile Edit */}
            {activeTab === 'assessment' && (
              <UserProfileForm
                initialProfile={userProfile}
                onSave={onSaveProfileAndNavigate}
              />
            )}

            {/* Workout Prescription Engine */}
            {activeTab === 'workout_engine' && (
              <WorkoutEngineView
                program={program}
                userProfile={userProfile}
                onRegenerate={handleRegenerateProgram}
                onSelectDayForLogger={(dayId) => {
                  setActiveDayId(dayId);
                  setActiveTab('progress');
                }}
              />
            )}

            {/* Exercise 3D Library */}
            {(activeTab === 'exercise_library' || (activeTab as string) === 'exercises') && (
              <ExerciseLibraryView
                userProfile={userProfile}
              />
            )}

            {/* Workout Logger & Execution */}
            {activeTab === 'progress' && (
              <WorkoutLoggerView
                program={program}
                initialDayId={activeDayId}
                onSaveLog={handleSaveWorkoutLog}
                savedLogs={workoutLogs}
              />
            )}

            {/* Fatigue Management & Readiness */}
            {activeTab === 'fatigue' && (
              <FatigueProgressView
                logs={workoutLogs}
                program={program}
                userProfile={userProfile}
              />
            )}

            {/* AI Coach KINETIX */}
            {(activeTab === 'ai_coach' || (activeTab as string) === 'coach') && (
              <AICoachView
                profile={userProfile}
                program={program}
                subscription={subscription}
                onOpenSubscriptionModal={() => setIsSubscriptionModalOpen(true)}
                onOpenPremiumGate={(title, desc) => setIsPremiumGateOpen(true)}
              />
            )}

            {/* Flexible Diet */}
            {activeTab === 'diet' && (
              <FlexibleDietView
                userProfile={userProfile}
              />
            )}

            {/* Subscription & Plans */}
            {activeTab === 'subscription' && (
              <SubscriptionView
                subscription={subscription}
                onSubscriptionUpdate={handleSubscriptionUpdate}
                onOpenCheckoutModal={() => setIsSubscriptionModalOpen(true)}
                userEmail={currentUser.email}
                userName={currentUser.name}
              />
            )}

            {/* Google Drive Cloud Backup */}
            {activeTab === 'google_drive' && (
              <GoogleDriveView
                userProfile={userProfile}
                program={program}
                workoutLogs={workoutLogs}
                subscription={subscription}
                onApplyBackup={handleApplyDriveBackup}
              />
            )}

            {/* Achievements View */}
            {activeTab === 'achievements' && (
              <AchievementsView
                workoutLogs={workoutLogs}
                userProfile={userProfile}
              />
            )}
          </main>
        </div>
      </div>

      {/* Modals & Dialogs */}
      {isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          currentUser={currentUser}
          onLogout={handleLogout}
          onOpenDeviceSessions={() => {
            setIsAuthModalOpen(false);
            setIsDeviceModalOpen(true);
          }}
          onOpenBodyMeasurements={() => {
            setIsAuthModalOpen(false);
            setIsBodyMeasurementsOpen(true);
          }}
        />
      )}

      {isSubscriptionModalOpen && (
        <SubscriptionModal
          isOpen={isSubscriptionModalOpen}
          onClose={() => setIsSubscriptionModalOpen(false)}
          subscription={subscription}
          onSubscriptionUpdate={handleSubscriptionUpdate}
          userEmail={currentUser.email}
          userName={currentUser.name}
        />
      )}

      {isDeviceModalOpen && (
        <DeviceSessionsModal
          isOpen={isDeviceModalOpen}
          onClose={() => setIsDeviceModalOpen(false)}
        />
      )}

      {isBodyMeasurementsOpen && (
        <BodyMeasurementsModal
          isOpen={isBodyMeasurementsOpen}
          onClose={() => setIsBodyMeasurementsOpen(false)}
          uid={currentUser.id}
        />
      )}

      {isPremiumGateOpen && (
        <PremiumGateModal
          isOpen={isPremiumGateOpen}
          onClose={() => setIsPremiumGateOpen(false)}
          onUpgrade={() => {
            setIsPremiumGateOpen(false);
            setIsSubscriptionModalOpen(true);
          }}
        />
      )}
    </div>
  );
}
