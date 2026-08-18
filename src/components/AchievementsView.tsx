import React from 'react';
import { 
  Award, 
  Shield, 
  Dumbbell, 
  Flame, 
  Zap, 
  Target, 
  Activity, 
  Star, 
  CheckCircle2, 
  Lock 
} from 'lucide-react';
import { 
  AchievementsService, 
  Achievement 
} from '../services/achievementsService';

interface AchievementsViewProps {
  userId: string;
}

export const AchievementsView: React.FC<AchievementsViewProps> = ({ userId }) => {
  const achievements = AchievementsService.getAchievements(userId);
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  const renderIcon = (iconName: Achievement['iconName']) => {
    switch (iconName) {
      case 'Shield': return <Shield className="h-5 w-5" />;
      case 'Dumbbell': return <Dumbbell className="h-5 w-5" />;
      case 'Award': return <Award className="h-5 w-5" />;
      case 'Flame': return <Flame className="h-5 w-5" />;
      case 'Zap': return <Zap className="h-5 w-5" />;
      case 'Target': return <Target className="h-5 w-5" />;
      case 'Activity': return <Activity className="h-5 w-5" />;
      case 'Star': return <Star className="h-5 w-5" />;
      default: return <Award className="h-5 w-5" />;
    }
  };

  return (
    <div className="bg-[#0f0f12] border border-zinc-800/90 rounded-2xl p-5 space-y-4 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400">
            <Award className="h-5 w-5 text-rose-500" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Conquistas do Atleta</h3>
            <p className="text-[11px] text-zinc-400">Progresso do Athleta Core Pass</p>
          </div>
        </div>

        <span className="text-xs font-mono font-bold px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-full text-rose-400">
          {unlockedCount} / {achievements.length} Desbloqueadas
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {achievements.map((a) => (
          <div
            key={a.id}
            className={`p-3.5 rounded-xl border transition-all flex items-start space-x-3 ${
              a.unlocked
                ? 'bg-zinc-950 border-rose-500/40 shadow-sm'
                : 'bg-zinc-950/40 border-zinc-800/60 opacity-60'
            }`}
          >
            <div
              className={`p-2.5 rounded-xl flex-shrink-0 ${
                a.unlocked
                  ? 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-500'
              }`}
            >
              {renderIcon(a.iconName)}
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className={`font-bold text-xs ${a.unlocked ? 'text-white' : 'text-zinc-400'}`}>
                  {a.title}
                </span>
                {a.unlocked ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Lock className="h-3.5 w-3.5 text-zinc-500" />
                )}
              </div>
              <p className="text-[11px] text-zinc-400 line-clamp-2">{a.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
