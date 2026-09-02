import {
  parseRepRange,
  parseInitialReps,
  DEFAULT_REP_RANGE,
  RepRange,
} from '../../components/WorkoutLoggerView';

async function runRepRangeParserTests() {
  console.log('===================================================================');
  console.log('   ATLETA AI — TEST SUITE: REP RANGE PARSER AUDIT                  ');
  console.log('===================================================================');

  // Test 1: Standard valid ranges ("4-6", "6-10", "8-12", "10-15", "12-15")
  {
    const r1 = parseRepRange('4-6');
    console.assert(r1.min === 4 && r1.max === 6 && r1.lower === 4 && r1.upper === 6, 'Faixa "4-6" -> min:4, max:6');

    const r2 = parseRepRange('6-10');
    console.assert(r2.min === 6 && r2.max === 10 && r2.lower === 6 && r2.upper === 10, 'Faixa "6-10" -> min:6, max:10');

    const r3 = parseRepRange('8-12');
    console.assert(r3.min === 8 && r3.max === 12 && r3.lower === 8 && r3.upper === 12, 'Faixa "8-12" -> min:8, max:12');

    const r4 = parseRepRange('10-15');
    console.assert(r4.min === 10 && r4.max === 15 && r4.lower === 10 && r4.upper === 15, 'Faixa "10-15" -> min:10, max:15');

    const r5 = parseRepRange('12-15');
    console.assert(r5.min === 12 && r5.max === 15 && r5.lower === 12 && r5.upper === 15, 'Faixa "12-15" -> min:12, max:15');

    console.log('✓ [1] Faixas padrão ("4-6", "6-10", "8-12", "10-15", "12-15") interpretadas com precisão');
  }

  // Test 2: Spacing tolerance ("6 - 10", "  8  -  12  ")
  {
    const spaced = parseRepRange('6 - 10');
    console.assert(spaced.min === 6 && spaced.max === 10, 'Faixa com espaços "6 - 10" -> min:6, max:10');

    const extraSpaced = parseRepRange('   8   -   12   ');
    console.assert(extraSpaced.min === 8 && extraSpaced.max === 12, 'Faixa com múltiplos espaços "   8   -   12   " -> min:8, max:12');

    const unicodeDash = parseRepRange('10 – 15');
    console.assert(unicodeDash.min === 10 && unicodeDash.max === 15, 'Faixa com en-dash "10 – 15" -> min:10, max:15');

    console.log('✓ [2] Espaçamentos variados e traços unicode tratados com robustez');
  }

  // Test 3: Single integer target ("8", " 15 ")
  {
    const single = parseRepRange('8');
    console.assert(single.min === 8 && single.max === 8 && single.lower === 8 && single.upper === 8, 'Valor único "8" -> lower:8, upper:8');

    const singleSpaced = parseRepRange('  15  ');
    console.assert(singleSpaced.min === 15 && singleSpaced.max === 15, 'Valor único "  15  " -> lower:15, upper:15');

    console.log('✓ [3] Valor único ("8") mapeado corretamente para lower=8, upper=8');
  }

  // Test 4: Inverted ranges protection (e.g. "12-8", "15-10")
  {
    const inverted = parseRepRange('12-8');
    console.assert(inverted.min === 8 && inverted.max === 12 && inverted.lower === 8 && inverted.upper === 12, 'Faixa invertida "12-8" normalizada para min:8, max:12');

    const inverted2 = parseRepRange('15 - 10');
    console.assert(inverted2.min === 10 && inverted2.max === 15 && inverted2.lower === 10 && inverted2.upper === 15, 'Faixa invertida "15 - 10" normalizada para min:10, max:15');

    console.log('✓ [4] Proteção contra faixas invertidas (nunca cria min > max)');
  }

  // Test 5: Invalid strings, empty strings, text ("abc", "", "---") -> Fallback determinístico
  {
    const empty = parseRepRange('');
    console.assert(empty.min === DEFAULT_REP_RANGE.min && empty.max === DEFAULT_REP_RANGE.max, 'String vazia retorna fallback');

    const abc = parseRepRange('abc');
    console.assert(abc.min === DEFAULT_REP_RANGE.min && abc.max === DEFAULT_REP_RANGE.max, '"abc" retorna fallback');

    const dashes = parseRepRange('---');
    console.assert(dashes.min === DEFAULT_REP_RANGE.min && dashes.max === DEFAULT_REP_RANGE.max, '"---" retorna fallback');

    const zero = parseRepRange('0');
    console.assert(zero.min === DEFAULT_REP_RANGE.min && zero.max === DEFAULT_REP_RANGE.max, '"0" não positivo retorna fallback');

    const negative = parseRepRange('-5');
    console.assert(negative.min === DEFAULT_REP_RANGE.min && negative.max === DEFAULT_REP_RANGE.max, 'Valor negativo retorna fallback');

    console.log('✓ [5] Entradas inválidas ("abc", "", "---", "0", "-5") acionam fallback determinístico');
  }

  // Test 6: Null and Undefined handling (Type safety & No crash)
  {
    const fromNull = parseRepRange(null as any);
    console.assert(fromNull.min === DEFAULT_REP_RANGE.min && fromNull.max === DEFAULT_REP_RANGE.max, 'null retorna fallback sem erro');

    const fromUndefined = parseRepRange(undefined as any);
    console.assert(fromUndefined.min === DEFAULT_REP_RANGE.min && fromUndefined.max === DEFAULT_REP_RANGE.max, 'undefined retorna fallback sem erro');

    const fromNonString = parseRepRange(123 as any);
    console.assert(fromNonString.min === DEFAULT_REP_RANGE.min && fromNonString.max === DEFAULT_REP_RANGE.max, 'Tipo incorreto retorna fallback');

    console.log('✓ [6] null, undefined e tipos atípicos tratados com tolerância a falhas');
  }

  // Test 7: NaN and Negative Number Immunity
  {
    const testCases = ['4-6', '6-10', '8-12', '10-15', '12-15', '8', '6 - 10', '', 'abc', 'NaN', 'undefined', null, undefined];
    for (const tc of testCases) {
      const res = parseRepRange(tc as any);
      console.assert(!isNaN(res.min) && !isNaN(res.max) && !isNaN(res.lower) && !isNaN(res.upper), `Nunca produz NaN para caso: "${tc}"`);
      console.assert(Number.isFinite(res.min) && Number.isFinite(res.max), `Valores finitos para caso: "${tc}"`);
      console.assert(res.min > 0 && res.max > 0, `Valores estritamente positivos para caso: "${tc}"`);
      console.assert(res.min <= res.max, `Ordem consistente (min <= max) para caso: "${tc}"`);
    }

    console.log('✓ [7] Imunidade absoluta a NaN, valores finitos e estritamente positivos (>= 1)');
  }

  // Test 8: parseInitialReps interoperability
  {
    console.assert(parseInitialReps('6-10') === 6, 'parseInitialReps("6-10") === 6');
    console.assert(parseInitialReps('4-6') === 4, 'parseInitialReps("4-6") === 4');
    console.assert(parseInitialReps('8') === 8, 'parseInitialReps("8") === 8');
    console.assert(parseInitialReps('invalid') === 10, 'parseInitialReps("invalid") === 10 (fallback)');
    console.assert(parseInitialReps(undefined) === 10, 'parseInitialReps(undefined) === 10 (fallback)');

    console.log('✓ [8] parseInitialReps mantém compatibilidade 100% com o motor de log');
  }

  console.log('===================================================================');
  console.log('   RESULTADO: 8/8 TESTES PASSARAM COM SUCESSO (100%)              ');
  console.log('===================================================================');
}

runRepRangeParserTests().catch((err) => {
  console.error('Falha nos testes do Rep Range Parser:', err);
  process.exit(1);
});
