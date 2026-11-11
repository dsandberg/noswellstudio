// Kometmattes pooler och steg, för sidan uppgifter.html.
//
// En kopia av apps/cometmath/src/game/pools.ts utan typer. Testet
// apps/cometmath/src/game/sitePools.test.ts kontrollerar att kopian ger samma uppgifter och
// steg som appen, så den måste ändras när poolerna ändras.

(function () {
  // Som seeded och shuffled i apps/cometmath/src/fx/random.ts.
  function seeded(seed) {
    let s = Math.abs(Math.floor(seed)) % 2147483647 || 1;
    return () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  function shuffled(list, rng) {
    const result = [...list];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  // Som answerOf i apps/cometmath/src/game/tasks.ts.
  function answerOf({ category, a, b }) {
    if (category === 'addition') return a + b;
    if (category === 'subtraction') return a - b;
    if (category === 'multiplication') return a * b;
    return a / b;
  }
  // Poolerna och uppgifternas steg, se docs/spel.md avsnitt 6.
  const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
  const tens = (n) => Math.floor(n / 10);
  const ones = (n) => n % 10;
  /** `n` är ett av talen. */
  const either = (n, ...list) => list.includes(n);
  /** Alla uppgifter `a ⋯ b` som `keep` godkänner, ordnade efter `a` och sedan `b`. */
  function tasksWhere(category, as, bs, keep) {
    return as.flatMap((a) => bs.filter((b) => keep(a, b)).map((b) => ({ category, a, b })));
  }
  /** Speglingen av `a + b` är `b + a`, och av `a · b` är `b · a`. Minus och delat med har ingen. */
  function isMirror(x, y) {
    const mirrored = x.category === 'addition' || x.category === 'multiplication';
    return mirrored && x.category === y.category && x.a === y.b && x.b === y.a && x.a !== x.b;
  }
  /**
   * Om uppgiften passar bland de valda: högst en annan med samma svar är vald, och inte dess
   * spegling. Samma regel i rundan (`pickTasks`) och i stegen i de stora poolerna.
   */
  function fits(task, picked) {
    const answer = answerOf(task);
    const same = picked.filter((other) => answerOf(other) === answer).length;
    return same < 2 && !picked.some((other) => isMirror(task, other));
  }
  /** Gångertabellerna i varje svårighetsgrad utom Expert. */
  const TABLES = { easy: [2, 5, 10], medium: [3, 4], hard: [6, 7, 8, 9] };
  /** Tonårstal (10–18) och ental (1–9) utan tiotalsövergång. */
  const teenPlusOne = (a, b) =>
    Math.max(a, b) >= 10 && Math.min(a, b) <= 9 && ones(a) + ones(b) <= 9;
  /** Svårighetsgradens regel för plus och minus i de små poolerna. */
  const SMALL = {
    addition: {
      // Upp till 20 utan tiotalsövergång.
      easy: () =>
        tasksWhere(
          'addition',
          range(1, 18),
          range(1, 18),
          (a, b) => a + b <= 10 || teenPlusOne(a, b),
        ),
      // Över tiotalet: ental + ental över 10 och tonårstal + ental till 20 och mer.
      medium: () =>
        tasksWhere(
          'addition',
          range(2, 19),
          range(2, 9),
          (a, b) => a + b > 10 && ones(a) + b >= 10,
        ),
    },
    subtraction: {
      easy: () =>
        tasksWhere(
          'subtraction',
          range(2, 19),
          range(1, 18),
          (a, b) => b < a && (a <= 10 || ones(b) <= ones(a)),
        ),
      // Över tiotalet: 11–28 minus ett ental större än entalet i `a`.
      medium: () => tasksWhere('subtraction', range(11, 28), range(2, 9), (a, b) => b > ones(a)),
    },
  };
  /** Svårighetsgradens regel för plus och minus i de stora poolerna (Svår och Expert). */
  const LARGE = {
    addition: {
      // Utan växling.
      hard: (a, b) => ones(a) + ones(b) <= 9 && tens(a) + tens(b) <= 9,
      // Med växling i entalen.
      expert: (a, b) => ones(a) + ones(b) >= 10,
    },
    subtraction: {
      // Utan växling.
      hard: (a, b) => ones(b) <= ones(a) && tens(b) <= tens(a) && a > b,
      // Med växling.
      expert: (a, b) => ones(b) > ones(a) && tens(a) >= 2,
    },
  };
  // Formerna i de stora poolerna (docs/spel.md avsnitt 6). `a` är alltid minst 10.
  /** TU ± U */
  const tuU = (a, b) => ones(a) >= 1 && b < 10;
  /** TU ± T0 */
  const tuT0 = (a, b) => ones(a) >= 1 && b >= 10 && ones(b) === 0;
  /** TU ± TU */
  const tuTu = (a, b) => ones(a) >= 1 && b >= 10 && ones(b) >= 1;
  /** T0 ± T0 */
  const t0T0 = (a, b) => ones(a) === 0 && b >= 10 && ones(b) === 0;
  /** TU + U i addition Expert: svaret är högst 98. */
  const addExpertU = (a, b) => tens(a) <= 8 && b < 10;
  /** TU + TU i addition Expert. */
  const addExpertTu = (a, b) => b >= 10 && tens(a) + tens(b) <= 8;
  /** TU − TU i subtraktion Expert. */
  const subExpertTu = (a, b) => b >= 10 && tens(b) < tens(a);
  const between = (n, from, to) => n >= from && n <= to;
  /** Multiplikation Expert: `a` 11–15, 16–20 och 21–25, var och en med `b` 2–4, 5–7 och 8–9. */
  const MULTIPLY_EXPERT = [11, 16, 21].flatMap((from) =>
    [
      [2, 4],
      [5, 7],
      [8, 9],
    ].map(
      ([bFrom, bTo]) =>
        (a, b) =>
          between(a, from, from + 4) && between(b, bFrom, bTo),
    ),
  );
  /**
   * Villkoren för steg 1–9, i ordning: det första som stämmer ger uppgiftens steg. Division
   * har multiplikationens steg. Se docs/spel.md avsnitt 6 "Steg".
   */
  const STEPS = {
    addition: {
      easy: [
        (a, b) => a + b <= 7,
        (a, b) => a + b === 8 || a === 10,
        (a, b) => a + b === 9 || a === 11,
        (a, b) => a + b === 10 || a === 12,
        (a) => between(a, 13, 14),
        (a) => between(a, 15, 18),
        (_, b) => between(b, 10, 11),
        (_, b) => between(b, 12, 13),
        (_, b) => between(b, 14, 18),
      ],
      medium: [
        // Steg 1–4: ental + ental, steg 5–9: tonårstal + ental.
        (a, b) => a === 9 || a === b,
        (a, b) => a < 10 && b === 9,
        // Speglingarna (4 + 8 och 8 + 4) i olika steg: de får inte komma i samma runda.
        (a, b) => a < b,
        (a) => a < 10,
        (a) => a <= 14,
        (a) => a <= 16,
        (a) => a === 17,
        (a) => a === 18,
        (a) => a === 19,
      ],
      hard: [
        t0T0,
        (a, b) => tuU(a, b) && a + b < 50,
        (a, b) => tuU(a, b) && a + b >= 50,
        (a, b) => tuT0(a, b) && a + b < 50,
        (a, b) => tuT0(a, b) && a + b >= 50,
        (a, b) => tuTu(a, b) && a + b < 50,
        (a, b) => tuTu(a, b) && between(a + b, 50, 69),
        (a, b) => tuTu(a, b) && between(a + b, 70, 89),
        (a, b) => tuTu(a, b) && a + b >= 90,
      ],
      expert: [
        (a, b) => addExpertU(a, b) && a + b < 50,
        (a, b) => addExpertU(a, b) && a + b >= 50,
        // Steg 3–9: svarets tiotal.
        ...range(3, 9).map((step) => (a, b) => addExpertTu(a, b) && tens(a + b) === step),
      ],
    },
    subtraction: {
      easy: [
        (a) => a <= 7,
        (a, b) => a === 8 || b === 10,
        (a, b) => a === 9 || a - b === 10,
        (a, b) => a === 10 || (between(a, 12, 14) && b < 10),
        (a, b) => between(a, 15, 17) && b < 10,
        (a, b) => between(a, 18, 19) && b < 10,
        (a, b) => b >= 11 && a <= 15,
        (a, b) => b >= 11 && between(a, 16, 17),
        (a, b) => b >= 11 && between(a, 18, 19),
      ],
      medium: [
        // Steg 1–4: `a` 11–18, steg 5–9: `a` 20–28.
        (a, b) => a < 20 && (b === 9 || a === 2 * b),
        (a, b) => a === 2 * b + 1 || a === 2 * b - 1,
        (a, b) => a < 20 && b >= 6,
        (a) => a < 20,
        (a) => a === 20,
        (a) => a === 21,
        (a) => a === 22,
        (a) => a <= 24,
        (a) => a <= 28,
      ],
      hard: [
        t0T0,
        (a, b) => tuU(a, b) && a < 50,
        (a, b) => tuU(a, b) && a >= 50,
        (a, b) => tuT0(a, b) && a < 50,
        (a, b) => tuT0(a, b) && a >= 50,
        (a, b) => tuTu(a, b) && a < 50,
        (a, b) => tuTu(a, b) && between(a, 50, 69),
        (a, b) => tuTu(a, b) && between(a, 70, 89),
        (a, b) => tuTu(a, b) && a >= 90,
      ],
      expert: [
        (a, b) => b < 10 && a < 50,
        (a, b) => b < 10 && a >= 50,
        (a, b) => subExpertTu(a, b) && a < 40,
        // Steg 4–9: tiotalet i `a`.
        ...range(4, 9).map((step) => (a, b) => subExpertTu(a, b) && tens(a) === step),
      ],
    },
    multiplication: {
      easy: [
        (a, b) => either(b, 2, 10) && a <= 6,
        (_, b) => b === 2,
        (_, b) => b === 10,
        (a, b) => b === 5 && a <= 5,
        (_, b) => b === 5,
        (_, b) => either(b, 1, 3),
        (_, b) => either(b, 4, 6),
        (_, b) => either(b, 7, 8),
        (_, b) => b === 9,
      ],
      medium: [
        (a, b) => b === 3 || (b === 4 && a <= 3),
        (a, b) => b === 4 && a <= 6,
        (_, b) => b === 4,
        (_, b) => either(b, 2, 10),
        (_, b) => b === 5,
        (_, b) => b === 6,
        (_, b) => b === 7,
        (_, b) => b === 8,
        (_, b) => b === 9,
      ],
      hard: [
        (a, b) => b === 6 || (b === 7 && a <= 3),
        (_, b) => b === 7,
        (a, b) => either(b, 8, 9) && a <= 5,
        // Inte både 8 · 9 och 9 · 8 i samma steg.
        (a, b) => either(b, 8, 9) && a <= 8,
        (_, b) => either(b, 8, 9),
        // Steg 6–9: 6, 7, 8 och 9 gånger 2, 3, 4, 5 och 10. Efter tabellen, så att
        // divisionen inte får samma svar i hela steget.
        (_, b) => either(b, 2, 10),
        (_, b) => b === 5,
        (_, b) => b === 3,
        (_, b) => b === 4,
      ],
      expert: MULTIPLY_EXPERT,
    },
  };
  /**
   * Uppgiftens steg 1–9 i svårighetsgradens pool: nivån där den kommer första gången. Räknas
   * bara på talen, så det gäller även uppgifter som inte är med i en stor pool. 0 för en
   * uppgift som inte hör till svårighetsgraden.
   */
  function taskStep(task, difficulty) {
    const { category, a, b } = task;
    // x / y har steget för x · y.
    if (category === 'division') {
      return taskStep({ category: 'multiplication', a: a / b, b }, difficulty);
    }
    return STEPS[category][difficulty].findIndex((keep) => keep(a, b)) + 1;
  }
  /**
   * En stor pool (plus och minus i Svår och Expert): 12 uppgifter i steg 1 och 11 i varje
   * annat, tagna med en fast slumpföljd ur stegets alla uppgifter. Bara de som passar
   * (`fits`) tas, så inget steg har fler än två med samma svar eller en spegling.
   */
  function largePool(category, difficulty) {
    const rule = LARGE[category][difficulty];
    const rng = seeded(1);
    return STEPS[category][difficulty].flatMap((_, i) => {
      const step = i + 1;
      const all = tasksWhere(
        category,
        range(10, 99),
        range(1, 99),
        (a, b) => rule(a, b) && taskStep({ category, a, b }, difficulty) === step,
      );
      const picked = [];
      for (const task of shuffled(all, rng)) {
        if (picked.length === (step === 1 ? 12 : 11)) break;
        if (fits(task, picked)) picked.push(task);
      }
      return picked;
    });
  }
  function multiplications(difficulty) {
    if (difficulty === 'expert') {
      return tasksWhere('multiplication', range(11, 25), range(2, 9), () => true);
    }
    const tables = TABLES[difficulty];
    // Lätt har med `· 1`, Mellan och Svår inte.
    const numbers = difficulty === 'easy' ? range(1, 10) : range(2, 10);
    return tasksWhere(
      'multiplication',
      numbers,
      numbers,
      (a, b) => tables.includes(a) || tables.includes(b),
    );
  }
  function buildPool(category, difficulty) {
    if (category === 'multiplication') return multiplications(difficulty);
    // (x · y) / y, så att svaret är x.
    if (category === 'division') {
      return multiplications(difficulty).map(({ a, b }) => ({ category, a: a * b, b }));
    }
    return difficulty === 'easy' || difficulty === 'medium'
      ? SMALL[category][difficulty]()
      : largePool(category, difficulty);
  }

  const api = { taskPool: buildPool, taskStep, answerOf };
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    window.Pooler = api;
  }
})();
