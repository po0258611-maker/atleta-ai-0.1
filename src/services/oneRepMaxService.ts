import { SetLog, WorkoutLog } from '../types';

export type OneRepMaxState = 'unknown' | 'estimated' | 'measured';
export interface OneRepMaxResult { state:OneRepMaxState; valueKg:number|null; method?:'epley'|'brzycki'|'wathan'|'direct_1rm'; confidence:'high'|'moderate'|'low'|'none'; explanation:string; sourceSet?:{weightKg:number;repsDone:number;actualRIR?:number}; }

const validNumber=(n:number)=>Number.isFinite(n)&&n>0;
export class OneRepMaxCalculator {
  static calculateEpley(weightKg:number,reps:number):number{if(!validNumber(weightKg)||!Number.isFinite(reps)||reps<=0)return 0;if(reps===1)return weightKg;return Math.round(weightKg*(1+reps/30)*10)/10;}
  static calculateBrzycki(weightKg:number,reps:number):number{if(!validNumber(weightKg)||!Number.isFinite(reps)||reps<=0)return 0;if(reps===1)return weightKg;if(reps>=36)return weightKg;return Math.round((weightKg/(1.0278-0.0278*reps))*10)/10;}

  static calculateFromSets(sets:SetLog[]):OneRepMaxResult{
    const valid=(sets||[]).filter(s=>s.completed&&validNumber(s.weightKg)&&Number.isFinite(s.repsDone)&&s.repsDone>0&&s.repsDone<=30);
    if(!valid.length)return{state:'unknown',valueKg:null,confidence:'none',explanation:'Sem dados suficientes registrados para estimar 1RM. Complete uma série válida com carga e repetições.'};
    let best=valid[0]; let bestE1rm=0;
    for(const set of valid){
      // RIR is contextual effort data, not an extra repetition. Adding RIR directly
      // to reps can systematically inflate 1RM, so formulas use performed reps only.
      const e1rm=this.calculateEpley(set.weightKg,set.repsDone);
      if(e1rm>bestE1rm){bestE1rm=e1rm;best=set;}
    }
    if(best.repsDone===1&&(best.actualRIR===0||best.actualRIR===undefined))return{state:'measured',valueKg:best.weightKg,method:'direct_1rm',confidence:'high',explanation:`1RM medido diretamente em uma repetição com ${best.weightKg}kg.`,sourceSet:best};
    const confidence:OneRepMaxResult['confidence']=best.repsDone<=6?'high':best.repsDone<=10?'moderate':'low';
    return{state:'estimated',valueKg:bestE1rm,method:'epley',confidence,explanation:`1RM estimado em ${bestE1rm}kg pela fórmula de Epley, usando a melhor série observada (${best.repsDone} reps com ${best.weightKg}kg).`,sourceSet:best};
  }

  static calculateFromHistory(exerciseIdOrName:string,logs:WorkoutLog[]):OneRepMaxResult{
    if(!logs?.length)return{state:'unknown',valueKg:null,confidence:'none',explanation:'Nenhum treino histórico registrado com este exercício.'};
    const query=exerciseIdOrName.toLowerCase().trim(); if(!query)return{state:'unknown',valueKg:null,confidence:'none',explanation:'Exercício não informado.'};
    const matching:SetLog[]=[];
    for(const log of logs){
      for(const exLog of log.exerciseLogs||[]){
        const id=String(exLog.exerciseId||'').toLowerCase(); const name=String(exLog.exerciseName||'').toLowerCase();
        if(id===query||name===query||id.includes(query)||name.includes(query))matching.push(...(exLog.sets||[]));
      }
    }
    return this.calculateFromSets(matching);
  }
}
