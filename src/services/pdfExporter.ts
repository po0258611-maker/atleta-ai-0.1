import jsPDF from 'jspdf';
import { FullBodyProgram, UserProfile, MuscleGroup } from '../types';
import { StructuredDietPlan, generateMealPlan } from '../engine/dietEngine';

interface ExportPdfOptions {
  program: FullBodyProgram;
  userProfile: UserProfile;
  dietPlan?: StructuredDietPlan;
}

const MUSCLE_TRANSLATIONS: Record<MuscleGroup, string> = {
  peitoral: 'Peitoral',
  costas: 'Costas',
  ombros: 'Ombros',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  quadriceps: 'Quadríceps',
  posteriores: 'Posteriores',
  gluteos: 'Glúteos',
  panturrilhas: 'Panturrilhas',
  core: 'Core / Abdômen',
};

export const exportPlanToPDF = ({ program, userProfile, dietPlan }: ExportPdfOptions): void => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const activeDietPlan = dietPlan || generateMealPlan(
    userProfile,
    userProfile.objective === 'fat_loss' ? 'cutting' : 'hypertrophy',
    'traditional'
  );

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let y = margin;

  const checkPageBreak = (neededHeight: number = 20) => {
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
      renderHeaderFooter();
    }
  };

  const renderHeaderFooter = () => {
    // Top bar decoration
    doc.setFillColor(16, 185, 129); // Emerald 500
    doc.rect(0, 0, pageWidth, 4, 'F');

    // Page footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text(
      'Treino MAX — Sistema Científico de Musculação Full-Body & Dieta Flexível',
      margin,
      pageHeight - 8
    );
    doc.text(
      `Página ${doc.internal.pages.length - 1}`,
      pageWidth - margin,
      pageHeight - 8,
      { align: 'right' }
    );
  };

  // Initial Header Bar
  renderHeaderFooter();

  // Document Title Banner
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.roundedRect(margin, y, pageWidth - margin * 2, 28, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('TREINO MAX', margin + 6, y + 10);

  doc.setFontSize(10);
  doc.setTextColor(16, 185, 129); // Emerald
  doc.text('RELATÓRIO DE TREINO CIENTÍFICO & NUTRIÇÃO', margin + 6, y + 17);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  const formattedDate = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.text(`Gerado em: ${formattedDate}`, pageWidth - margin - 6, y + 10, { align: 'right' });
  doc.text('Full Body Routine & Flexible Diet Plan', pageWidth - margin - 6, y + 17, { align: 'right' });

  y += 34;

  // Athlete Profile Summary Box
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.roundedRect(margin, y, pageWidth - margin * 2, 26, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`ATLETA: ${userProfile.name.toUpperCase()}`, margin + 5, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  const expLabel = userProfile.experience === 'intermediate' ? 'Intermediário' : userProfile.experience === 'advanced' ? 'Avançado' : 'Iniciante';
  const objLabel = userProfile.objective === 'hypertrophy' ? 'Hipertrofia Muscular' : userProfile.objective === 'fat_loss' ? 'Emagrecimento / Cutting' : 'Força & Saúde';
  const envLabel = userProfile.environment === 'full_gym' ? 'Academia Completa' : userProfile.environment === 'home' ? 'Em Casa' : 'Comercial/Básica';

  doc.text(`Idade: ${userProfile.age} anos  |  Altura: ${userProfile.heightCm} cm  |  Peso: ${userProfile.weightKg} kg`, margin + 5, y + 13);
  doc.text(`Nível: ${expLabel}  |  Frequência: ${userProfile.availableDays}x/sem  |  Sessão: ${userProfile.timePerSessionMin} min`, margin + 5, y + 18);
  doc.text(`Objetivo: ${objLabel}  |  Ambiente: ${envLabel}`, margin + 5, y + 23);

  y += 32;

  // SECTION 1: WORKOUT PROGRAM (FULL BODY)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(16, 185, 129);
  doc.text('1. FICHA DE TREINO FULL-BODY (SISTEMA DE ALTA FREQUÊNCIA)', margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(
    'Frequência por grupo muscular: 2x a 3x/semana. Alvo de Esforço: RIR 1-2 (1 a 2 repetições na reserva). Descanso inteligente entre séries.',
    margin,
    y
  );
  y += 8;

  // Loop through split days
  program.splitDays.forEach((day) => {
    checkPageBreak(40);

    // Day Header Box
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 8, 1, 1, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`${day.title}  (${day.estimatedTimeMin} min)`, margin + 4, y + 5.5);

    const focusText = day.focusMuscles.map((m) => MUSCLE_TRANSLATIONS[m] || m).join(', ');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(16, 185, 129);
    doc.text(`Foco: ${focusText}`, pageWidth - margin - 4, y + 5.5, { align: 'right' });

    y += 11;

    // Table Header
    doc.setFillColor(226, 232, 240);
    doc.rect(margin, y, pageWidth - margin * 2, 6, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text('EXERCÍCIO', margin + 3, y + 4.2);
    doc.text('SÉRIES X REPS', margin + 75, y + 4.2);
    doc.text('RIR / RPE', margin + 115, y + 4.2);
    doc.text('DESCANSO', margin + 140, y + 4.2);
    doc.text('CADÊNCIA', margin + 165, y + 4.2);

    y += 6;

    // Items
    day.items.forEach((item, idx) => {
      checkPageBreak(12);

      const isEven = idx % 2 === 0;
      doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
      doc.rect(margin, y, pageWidth - margin * 2, 7, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      const exName = item.exercise.nome.length > 38 ? item.exercise.nome.substring(0, 36) + '...' : item.exercise.nome;
      doc.text(`${idx + 1}. ${exName}`, margin + 3, y + 4.8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text(`${item.targetSets}x ${item.targetReps}`, margin + 75, y + 4.8);
      doc.text(`RIR ${item.targetRIR} (RPE ${item.targetRPE})`, margin + 115, y + 4.8);
      doc.text(`${item.targetRestSec}s`, margin + 140, y + 4.8);
      doc.text(item.cadence || '3-0-1-0', margin + 165, y + 4.8);

      y += 7;
    });

    y += 4;
  });

  // Page Break for Diet
  doc.addPage();
  y = margin;
  renderHeaderFooter();

  // SECTION 2: FLEXIBLE DIET PLAN
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(16, 185, 129);
  doc.text('2. PLANO NUTRICIONAL & METAS MACRONUTRICIONAIS', margin, y);
  y += 6;

  const { metrics, meals } = activeDietPlan;

  // Macros Cards Box
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 18, 2, 2, 'F');

  const cardW = (pageWidth - margin * 2) / 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);

  // Cal
  doc.text('CALORIAS ALVO', margin + 4, y + 5);
  doc.setFontSize(11);
  doc.setTextColor(217, 119, 6); // Amber
  doc.text(`${metrics.targetCalories} kcal`, margin + 4, y + 12);

  // Prot
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('PROTEÍNA', margin + cardW + 4, y + 5);
  doc.setFontSize(11);
  doc.setTextColor(16, 185, 129); // Emerald
  doc.text(`${metrics.proteinGrams}g (${metrics.proteinPerKg}g/kg)`, margin + cardW + 4, y + 12);

  // Carb
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('CARBOIDRATOS', margin + cardW * 2 + 4, y + 5);
  doc.setFontSize(11);
  doc.setTextColor(8, 145, 178); // Cyan
  doc.text(`${metrics.carbGrams}g (${metrics.carbPerKg}g/kg)`, margin + cardW * 2 + 4, y + 12);

  // Fat
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('GORDURAS / ÁGUA', margin + cardW * 3 + 4, y + 5);
  doc.setFontSize(10);
  doc.setTextColor(147, 51, 234); // Purple
  doc.text(`${metrics.fatGrams}g  |  ${metrics.waterLiters}L Água`, margin + cardW * 3 + 4, y + 12);

  y += 24;

  // Daily Meal Schedule
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Cardápio Sugerido de Comida de Verdade', margin, y);
  y += 6;

  meals.forEach((meal) => {
    checkPageBreak(35);

    // Meal Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    const boxHeight = 12 + meal.foods.length * 5;
    doc.roundedRect(margin, y, pageWidth - margin * 2, boxHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`${meal.time} - ${meal.name}`, margin + 4, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Totais: ${meal.calories} kcal  |  Prot: ${meal.protein}g  |  Carb: ${meal.carbs}g  |  Gord: ${meal.fat}g`,
      pageWidth - margin - 4,
      y + 6,
      { align: 'right' }
    );

    let foodY = y + 11;
    meal.foods.forEach((food) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text(`• ${food.name} (${food.amount})`, margin + 6, foodY);

      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(`${food.calories} kcal | P:${food.protein}g C:${food.carbs}g F:${food.fat}g`, pageWidth - margin - 6, foodY, { align: 'right' });

      foodY += 5;
    });

    y += boxHeight + 4;
  });

  // SECTION 3: LOW COST PROTEIN GUIDE
  checkPageBreak(35);

  doc.setFillColor(254, 243, 199); // Amber 100
  doc.setDrawColor(251, 191, 36); // Amber 400
  doc.roundedRect(margin, y, pageWidth - margin * 2, 26, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(146, 64, 14); // Amber 800
  doc.text('GUIA ATHLETA DE PROTEÍNAS DE BAIXO CUSTO', margin + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 53, 15);
  doc.text('1. Ovos Inteiros: Proteína de altíssima qualidade biológica e menor custo por grama.', margin + 4, y + 11);
  doc.text('2. Sardinha em Lata: Rica em Ômega-3 e Cálcio. Custa ~25% do valor do salmão.', margin + 4, y + 15);
  doc.text('3. Proteína Texturizada de Soja (PTS): Rende muito, 100% vegetal e muito barata.', margin + 4, y + 19);
  doc.text('4. Sobrecoxa de Frango: Excelente perfil nutricional e mais acessível que o peito.', margin + 4, y + 23);

  y += 32;

  // Save PDF document
  const sanitizedName = userProfile.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  doc.save(`athleta_ai_plano_${sanitizedName}.pdf`);
};
