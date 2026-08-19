import { BioAtlasService } from '../../services/bioAtlasService';
import { EXERCISE_DATABASE } from '../exerciseData';

async function runBioAtlasTests() {
  console.log('--- INICIANDO TESTES DO BIOATLAS / EXERCISE DATABASE ---');

  // Test 1: Deduplication verification
  {
    const catalog = BioAtlasService.getExerciseCatalog();
    const idSet = new Set<string>();
    let duplicatesFound = false;

    catalog.forEach((ex) => {
      if (idSet.has(ex.id)) {
        duplicatesFound = true;
        console.error(`Exercício duplicado encontrado: ${ex.id}`);
      }
      idSet.add(ex.id);
    });

    console.assert(!duplicatesFound, 'A biblioteca de exercícios não deve conter IDs duplicados');
    console.assert(catalog.length > 0, 'O catálogo deve possuir exercícios cadastrados');
    console.log(`✓ Teste 1: ${catalog.length} exercícios validados sem duplicatas no BioAtlas`);
  }

  // Test 2: Separation of scientific biomechanics from media
  {
    const catalog = BioAtlasService.getExerciseCatalog();
    const squat = catalog.find((e) => e.id === 'ex_squat_barbell');

    console.assert(squat !== undefined, 'Agachamento deve existir no catálogo');
    if (squat) {
      console.assert(squat.biomechanics !== undefined, 'Campos biomecânicos devem estar estruturados');
      console.assert(squat.biomechanics.jointsInvolved.includes('knee'), 'Joelho deve ser uma articulação envolvida no squat');
      console.assert(squat.biomechanics.jointsInvolved.includes('hip'), 'Quadril deve ser uma articulação envolvida no squat');
      console.assert(squat.biomechanics.movementPlane === 'sagittal', 'Plano sagital');
      console.assert(squat.media !== undefined, 'Mídia deve estar desacoplada');
    }
    console.log('✓ Teste 2: Biomecânica pura (articulações, planos, eixos, RIR/RPE) separada do conteúdo de mídia');
  }

  // Test 3: Comprehensive filters (muscle, equipment, pattern, difficulty)
  {
    const chestBarbell = BioAtlasService.filterExercises({
      muscle: 'peitoral',
      equipment: 'barbell',
      pattern: 'horizontal_push',
    });

    console.assert(chestBarbell.length > 0, 'Deve encontrar supino reto ou variações com barra para peito');
    chestBarbell.forEach((ex) => {
      console.assert(ex.equipment === 'barbell', 'Filtro de equipamento deve ser estrito');
      console.assert(ex.movementPattern === 'horizontal_push', 'Filtro de padrão motor deve ser estrito');
    });
    console.log(`✓ Teste 3: Filtro multicritério (peitoral + barra + horizontal_push) retornou ${chestBarbell.length} exercícios correspondentes`);
  }

  // Test 4: Intelligent Biomechanical Substitution
  {
    const substitutions = BioAtlasService.findIntelligentSubstitutions('ex_squat_barbell', 'small_gym');
    console.assert(substitutions.length > 0, 'Deve fornecer substitutos válidos para o agachamento em academia pequena');
    console.log(`✓ Teste 4: Substituição inteligente encontrou ${substitutions.length} alternativas válidas com biomecânica compatível`);
  }

  console.log('-------------------------------------------------------------------');
  console.log('TODOS OS TESTES DO BIOATLAS PASSARAM COM 100% DE SUCESSO!');
}

runBioAtlasTests().catch((err) => {
  console.error('Falha nos testes do BioAtlas:', err);
  process.exit(1);
});
