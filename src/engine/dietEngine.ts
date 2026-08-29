import { UserProfile } from '../types';

export type DietGoal = 'hypertrophy' | 'cutting' | 'maintenance';
export type DietPreference = 'traditional' | 'vegetarian' | 'low_carb' | 'practical' | 'low_cost';
export interface FoodItem { name:string; amount:string; category:'protein'|'carb'|'fat'|'fiber'|'supplement'; calories:number; protein:number; carbs:number; fat:number; }
export interface Meal { id:string; name:string; time:string; type:'breakfast'|'lunch'|'pre_workout'|'post_workout'|'dinner'|'supper'; calories:number; protein:number; carbs:number; fat:number; foods:FoodItem[]; tips:string; }
export interface SubstitutionGroup { category:'protein'|'carb'|'fat'|'fiber'; title:string; baseFood:string; equivalents:{foodName:string;portion:string;notes?:string}[]; }
export interface CalculatedDietMetrics { bmr:number; tdee:number; targetCalories:number; proteinGrams:number; proteinCalories:number; proteinPerKg:number; carbGrams:number; carbCalories:number; carbPerKg:number; fatGrams:number; fatCalories:number; fatPerKg:number; fiberGrams:number; waterLiters:number; }
export interface StructuredDietPlan { metrics:CalculatedDietMetrics; preference:DietPreference; goal:DietGoal; meals:Meal[]; planTotals?:{calories:number;protein:number;carbs:number;fat:number}; }

const clamp=(n:number,min:number,max:number)=>Math.min(max,Math.max(min,n));
const round1=(n:number)=>Math.round(n*10)/10;

export function calculateDietMetrics(profile:UserProfile,goal:DietGoal):CalculatedDietMetrics{
  const weight=clamp(Number(profile.weightKg)||75,25,350);
  const height=clamp(Number(profile.heightCm)||175,100,250);
  const age=clamp(Number(profile.age)||26,13,100);
  const bmr=Math.round(profile.gender==='male'?10*weight+6.25*height-5*age+5:10*weight+6.25*height-5*age-161);
  const activityFactor=profile.availableDays>=5?1.55:profile.availableDays>=3?1.45:1.35;
  const tdee=Math.round(bmr*activityFactor);
  let targetCalories=goal==='hypertrophy'?Math.round(tdee+250):goal==='cutting'?Math.round(tdee-400):tdee;
  targetCalories=Math.max(1200,targetCalories);
  const proteinPerKg=goal==='cutting'?2.0:1.8;
  const proteinGrams=Math.round(weight*proteinPerKg);
  const proteinCalories=proteinGrams*4;
  const minimumFatGrams=Math.round(weight*0.7);
  let fatGrams=Math.max(minimumFatGrams,Math.round(weight*0.8));
  let fatCalories=fatGrams*9;
  let carbCalories=Math.max(0,targetCalories-proteinCalories-fatCalories);
  if(goal==='maintenance' && carbCalories<0){ fatGrams=Math.max(minimumFatGrams,Math.floor((targetCalories-proteinCalories)/9)); fatCalories=Math.max(0,fatGrams*9); carbCalories=Math.max(0,targetCalories-proteinCalories-fatCalories); }
  let carbGrams=Math.round(carbCalories/4);
  if(goal==='cutting' && carbGrams<80) carbGrams=80;
  if(goal==='maintenance' || goal==='hypertrophy') carbGrams=Math.max(80,carbGrams);
  if((goal==='cutting'||goal==='maintenance'||goal==='hypertrophy') && goal!=='hypertrophy'){
    const used=proteinCalories+carbGrams*4;
    fatGrams=Math.max(minimumFatGrams,Math.round(Math.max(0,targetCalories-used)/9));
    fatCalories=fatGrams*9;
    carbCalories=carbGrams*4;
  }
  let lowCarbCap=Number.POSITIVE_INFINITY;
  if(goal==='cutting') lowCarbCap=Number.POSITIVE_INFINITY;
  void lowCarbCap;
  const totalMacroCalories=proteinCalories+carbGrams*4+fatCalories;
  if(totalMacroCalories!==targetCalories){
    const adjustedCarb=Math.max(0,Math.round(Math.max(0,targetCalories-proteinCalories-fatCalories)/4));
    carbGrams=adjustedCarb;
    carbCalories=carbGrams*4;
  }
  const fiberGrams=Math.max(20,Math.round((targetCalories/1000)*14));
  const trainingHours=profile.timePerSessionMin/60;
  const waterLiters=round1(clamp(weight*0.035+trainingHours*0.4,1.5,6));
  return {bmr,tdee,targetCalories,proteinGrams,proteinCalories,proteinPerKg,carbGrams,carbCalories,carbPerKg:round1(carbGrams/weight),fatGrams,fatCalories,fatPerKg:round1(fatGrams/weight),fiberGrams,waterLiters};
}

const COMMON_FOODS={
  protein:{name:'Frango grelhado',amount:'100g',category:'protein' as const,calories:165,protein:31,carbs:0,fat:3.6},
  fish:{name:'Peixe magro grelhado',amount:'100g',category:'protein' as const,calories:128,protein:26,carbs:0,fat:2.7},
  egg:{name:'Ovos inteiros',amount:'2 unidades',category:'protein' as const,calories:140,protein:12,carbs:1,fat:10},
  tofu:{name:'Tofu firme',amount:'150g',category:'protein' as const,calories:180,protein:19,carbs:4,fat:11},
  soyProtein:{name:'PTS preparada',amount:'100g',category:'protein' as const,calories:150,protein:20,carbs:9,fat:2},
  whey:{name:'Whey protein',amount:'30g',category:'supplement' as const,calories:120,protein:24,carbs:3,fat:2},
  rice:{name:'Arroz cozido',amount:'100g',category:'carb' as const,calories:130,protein:2.7,carbs:28,fat:0.3},
  oats:{name:'Aveia',amount:'40g',category:'carb' as const,calories:152,protein:5,carbs:27,fat:3},
  potato:{name:'Batata cozida/assada',amount:'150g',category:'carb' as const,calories:116,protein:3,carbs:26,fat:0.2},
  banana:{name:'Banana',amount:'1 unidade média',category:'carb' as const,calories:90,protein:1.1,carbs:23,fat:0.3},
  bread:{name:'Pão integral',amount:'2 fatias',category:'carb' as const,calories:140,protein:6,carbs:24,fat:2},
  beans:{name:'Feijão cozido',amount:'100g',category:'carb' as const,calories:76,protein:4.8,carbs:13.6,fat:0.5},
  oliveOil:{name:'Azeite de oliva',amount:'10ml',category:'fat' as const,calories:81,protein:0,carbs:0,fat:9},
  peanut:{name:'Pasta de amendoim',amount:'15g',category:'fat' as const,calories:90,protein:4,carbs:3,fat:7.5},
  nuts:{name:'Castanhas',amount:'15g',category:'fat' as const,calories:90,protein:3,carbs:3,fat:8},
  vegetables:{name:'Legumes e folhas variados',amount:'150g',category:'fiber' as const,calories:45,protein:2,carbs:8,fat:0},
  yogurt:{name:'Iogurte proteico',amount:'160g',category:'protein' as const,calories:110,protein:15,carbs:8,fat:2},
};

type BaseFood=FoodItem;
function scaleFood(food:BaseFood,factor:number):FoodItem{
  const amount=food.amount.replace(/^([0-9]+(?:\.[0-9]+)?)/,(m)=>round1(Number(m)*factor).toString());
  return {...food,amount,calories:Math.round(food.calories*factor),protein:round1(food.protein*factor),carbs:round1(food.carbs*factor),fat:round1(food.fat*factor)};
}
function totals(foods:FoodItem[]){ return foods.reduce((a,f)=>({calories:a.calories+f.calories,protein:a.protein+f.protein,carbs:a.carbs+f.carbs,fat:a.fat+f.fat}),{calories:0,protein:0,carbs:0,fat:0}); }
function buildMeal(id:string,name:string,time:string,type:Meal['type'],targetCalories:number,baseFoods:BaseFood[],tips:string):Meal{
  const raw=totals(baseFoods);
  const factor=raw.calories>0?targetCalories/raw.calories:1;
  const foods=baseFoods.map(f=>scaleFood(f,factor));
  const t=totals(foods);
  return {id,name,time,type,calories:t.calories,protein:round1(t.protein),carbs:round1(t.carbs),fat:round1(t.fat),foods,tips};
}

function preferenceFoods(preference:DietPreference):BaseFood[]{
  if(preference==='vegetarian')return[COMMON_FOODS.tofu,COMMON_FOODS.rice,COMMON_FOODS.beans,COMMON_FOODS.vegetables,COMMON_FOODS.oliveOil];
  if(preference==='low_cost')return[COMMON_FOODS.egg,COMMON_FOODS.beans,COMMON_FOODS.rice,COMMON_FOODS.vegetables,COMMON_FOODS.peanut];
  if(preference==='practical')return[COMMON_FOODS.whey,COMMON_FOODS.bread,COMMON_FOODS.yogurt,COMMON_FOODS.banana,COMMON_FOODS.peanut];
  if(preference==='low_carb')return[COMMON_FOODS.protein,COMMON_FOODS.egg,COMMON_FOODS.vegetables,COMMON_FOODS.oliveOil,COMMON_FOODS.nuts];
  return[COMMON_FOODS.protein,COMMON_FOODS.rice,COMMON_FOODS.beans,COMMON_FOODS.vegetables,COMMON_FOODS.oliveOil];
}

function buildBaseMealFoods(preference:DietPreference,index:number):BaseFood[]{
  if(preference==='vegetarian')return index===0?[COMMON_FOODS.egg,COMMON_FOODS.oats,COMMON_FOODS.banana]:index===1?[COMMON_FOODS.tofu,COMMON_FOODS.rice,COMMON_FOODS.beans,COMMON_FOODS.vegetables]:index===2?[COMMON_FOODS.whey,COMMON_FOODS.banana,COMMON_FOODS.peanut]:index===3?[COMMON_FOODS.tofu,COMMON_FOODS.potato,COMMON_FOODS.vegetables,COMMON_FOODS.oliveOil]:[COMMON_FOODS.yogurt,COMMON_FOODS.nuts];
  if(preference==='low_cost')return index===0?[COMMON_FOODS.egg,COMMON_FOODS.bread,COMMON_FOODS.banana]:index===1?[COMMON_FOODS.egg,COMMON_FOODS.rice,COMMON_FOODS.beans,COMMON_FOODS.vegetables]:index===2?[COMMON_FOODS.oats,COMMON_FOODS.banana,COMMON_FOODS.peanut]:index===3?[COMMON_FOODS.egg,COMMON_FOODS.potato,COMMON_FOODS.vegetables]:[COMMON_FOODS.yogurt,COMMON_FOODS.oats];
  if(preference==='practical')return index===0?[COMMON_FOODS.whey,COMMON_FOODS.oats,COMMON_FOODS.banana]:index===1?[COMMON_FOODS.protein,COMMON_FOODS.rice,COMMON_FOODS.beans,COMMON_FOODS.vegetables]:index===2?[COMMON_FOODS.bread,COMMON_FOODS.protein,COMMON_FOODS.yogurt]:index===3?[COMMON_FOODS.egg,COMMON_FOODS.potato,COMMON_FOODS.vegetables]:[COMMON_FOODS.yogurt,COMMON_FOODS.peanut];
  if(preference==='low_carb')return index===0?[COMMON_FOODS.egg,COMMON_FOODS.protein,COMMON_FOODS.vegetables]:index===1?[COMMON_FOODS.protein,COMMON_FOODS.vegetables,COMMON_FOODS.oliveOil]:index===2?[COMMON_FOODS.whey,COMMON_FOODS.yogurt,COMMON_FOODS.nuts]:index===3?[COMMON_FOODS.fish,COMMON_FOODS.vegetables,COMMON_FOODS.oliveOil]:[COMMON_FOODS.egg,COMMON_FOODS.nuts];
  return index===0?[COMMON_FOODS.egg,COMMON_FOODS.oats,COMMON_FOODS.banana]:index===1?[COMMON_FOODS.protein,COMMON_FOODS.rice,COMMON_FOODS.beans,COMMON_FOODS.vegetables,COMMON_FOODS.oliveOil]:index===2?[COMMON_FOODS.banana,COMMON_FOODS.oats,COMMON_FOODS.whey,COMMON_FOODS.peanut]:index===3?[COMMON_FOODS.fish,COMMON_FOODS.potato,COMMON_FOODS.vegetables,COMMON_FOODS.oliveOil]:[COMMON_FOODS.yogurt,COMMON_FOODS.nuts];
}

export function generateMealPlan(profile:UserProfile,goal:DietGoal,preference:DietPreference):StructuredDietPlan{
  const metrics=calculateDietMetrics(profile,goal);
  const ratios=[0.22,0.30,0.20,0.22,0.06];
  const names=['Refeição 1 — Café da Manhã','Refeição 2 — Almoço','Refeição 3 — Pré-Treino','Refeição 4 — Jantar','Refeição 5 — Ceia'];
  const times=['07:30','12:30','16:00','19:30','22:00'];
  const types:Meal['type'][]=['breakfast','lunch','pre_workout','dinner','supper'];
  const tips=preference==='low_carb'?'Priorize vegetais, proteína e gorduras adicionadas com porções compatíveis com sua meta diária.':preference==='low_cost'?'Priorize alimentos acessíveis e varie as fontes conforme preço e disponibilidade.':preference==='practical'?'Prefira opções simples de preparar e transportar, mantendo as porções registradas.':preference==='vegetarian'?'Combine fontes vegetais e, quando aplicável, ovos e laticínios para atingir a meta proteica.':'Use porções compatíveis com a meta diária e ajuste conforme sua evolução e preferência.';
  const meals=ratios.map((ratio,i)=>buildMeal(`meal-${i+1}`,names[i],times[i],types[i],Math.round(metrics.targetCalories*ratio),buildBaseMealFoods(preference,i),tips));
  if(preference==='low_carb'){
    // Rebuild low-carb meals around a capped carbohydrate allocation (<=20% of target calories from carbs).
    const carbCap=Math.min(metrics.carbGrams,Math.floor(metrics.targetCalories*0.20/4));
    const carbScale=metrics.carbGrams>0?carbCap/metrics.carbGrams:0;
    const adjustedMeals=meals.map((meal)=>({
      ...meal,
      foods:meal.foods.map((food)=>food.category==='carb'?scaleFood(food,carbScale):food),
    })).map((meal)=>{const t=totals(meal.foods);return {...meal,calories:t.calories,protein:round1(t.protein),carbs:round1(t.carbs),fat:round1(t.fat)};});
    meals.splice(0,meals.length,...adjustedMeals);
  }
  const planTotals=meals.reduce((a,m)=>({calories:a.calories+m.calories,protein:round1(a.protein+m.protein),carbs:round1(a.carbs+m.carbs),fat:round1(a.fat+m.fat)}),{calories:0,protein:0,carbs:0,fat:0});
  return {metrics,preference,goal,meals,planTotals};
}

export const FOOD_SUBSTITUTIONS_DATABASE:SubstitutionGroup[]=[
  {category:'carb',title:'Fontes de carboidratos',baseFood:'100g de arroz cozido',equivalents:[
    {foodName:'Arroz branco/integral cozido',portion:'100g'},{foodName:'Batata cozida/assada',portion:'150g'},{foodName:'Mandioca cozida',portion:'90g'},{foodName:'Aveia',portion:'40g'},{foodName:'Banana',portion:'1 unidade média'},{foodName:'Pão integral',portion:'2 fatias'},
  ]},
  {category:'protein',title:'Fontes de proteína',baseFood:'100g de frango grelhado',equivalents:[
    {foodName:'Frango grelhado',portion:'100g'},{foodName:'Peixe magro',portion:'110g'},{foodName:'Ovos',portion:'3 unidades'},{foodName:'Tofu firme',portion:'150g'},{foodName:'PTS preparada',portion:'120g'},{foodName:'Whey protein',portion:'30g'},{foodName:'Iogurte proteico',portion:'160g'},
  ]},
  {category:'fat',title:'Fontes de gordura',baseFood:'10ml de azeite',equivalents:[
    {foodName:'Azeite de oliva',portion:'10ml'},{foodName:'Pasta de amendoim',portion:'15g'},{foodName:'Castanhas',portion:'15g'},{foodName:'Abacate',portion:'70g'},
  ]},
  {category:'fiber',title:'Vegetais e fibras',baseFood:'Porção de legumes e folhas',equivalents:[
    {foodName:'Folhas variadas',portion:'à vontade'},{foodName:'Brócolis',portion:'150g'},{foodName:'Cenoura',portion:'100g'},{foodName:'Repolho',portion:'150g'},{foodName:'Abóbora',portion:'150g'},
  ]},
];

export function calculatePlanTotals(plan:StructuredDietPlan){ return plan.meals.reduce((a,m)=>({calories:a.calories+m.calories,protein:round1(a.protein+m.protein),carbs:round1(a.carbs+m.carbs),fat:round1(a.fat+m.fat)}),{calories:0,protein:0,carbs:0,fat:0}); }
export function nutritionPlanIsInternallyConsistent(plan:StructuredDietPlan,tolerance=2){ const t=calculatePlanTotals(plan); return Math.abs(t.calories-plan.planTotals?.calories!)<=tolerance && plan.meals.every((meal)=>{const x=totals(meal.foods);return Math.abs(x.calories-meal.calories)<=1&&Math.abs(x.protein-meal.protein)<=1&&Math.abs(x.carbs-meal.carbs)<=1&&Math.abs(x.fat-meal.fat)<=1;}); }
