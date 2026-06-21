import { SorobanBalance } from "@/src/utils/sorobanMath";

function generateEdgeCases(): string[] {
  const cases: string[] = [];
  cases.push("0");
  cases.push("0.0");
  cases.push("0.0000000");
  cases.push("100000");
  cases.push("0.0000001");
  cases.push("1.2345678");
  cases.push("999999999999.9999999");
  for (let i = 0; i < 200; i++) {
    const int = Math.floor(Math.random() * 100000);
    const frac = Math.floor(Math.random() * 10000000)
      .toString()
      .padStart(7, "0");
    cases.push(`${int}.${frac}`);
  }
  return cases;
}

function runBenchmark(): void {
  const cases = generateEdgeCases();
  const ROUNDTRIPS = 1000;
  const FORMAT_OPS = 10000;

  const balances = cases.map((c) => SorobanBalance.fromString(c));

  console.log(`=== SorobanBalance Round-Trip Test (${ROUNDTRIPS} iterations) ===`);
  const rtStart = performance.now();
  for (let i = 0; i < ROUNDTRIPS; i++) {
    for (const b of balances) {
      if (!b) throw new Error(`Failed to parse`);
      const displayed = b.toDisplay("en-US");
      const parsed = SorobanBalance.fromString(displayed);
      if (!parsed || !parsed.eq(b)) {
        throw new Error(`Round-trip failed for ${b.toDisplay()}`);
      }
    }
  }
  const rtElapsed = performance.now() - rtStart;
  console.log(`Round-trips: ${ROUNDTRIPS * cases.length} in ${rtElapsed.toFixed(1)}ms`);

  console.log(`\n=== Format Performance (${FORMAT_OPS} operations) ===`);
  const fmtStart = performance.now();
  for (let i = 0; i < FORMAT_OPS; i++) {
    const b = balances[i % balances.length];
    if (!b) continue;
    b.toDisplay("en-US");
    b.toDisplay("de-DE");
    b.toDisplay("ja-JP");
  }
  const fmtElapsed = performance.now() - fmtStart;
  console.log(`Format ops: ${FORMAT_OPS * 3} in ${fmtElapsed.toFixed(1)}ms`);

  const passed = fmtElapsed < 50;
  console.log(`\nCompletion under 50ms: ${passed ? "PASS" : "FAIL"} (${fmtElapsed.toFixed(1)}ms)`);
  console.log(`Round-trip integrity: PASS`);

  if (!passed) throw new Error(`Format benchmark too slow: ${fmtElapsed.toFixed(1)}ms`);
}

if (typeof window !== "undefined" && typeof (globalThis as Record<string, unknown>).__BENCHMARK_RUN !== "undefined") {
  try {
    runBenchmark();
    console.log("SorobanMath benchmark completed successfully.");
  } catch (err) {
    console.error("SorobanMath benchmark failed:", err);
  }
}

export { runBenchmark, SorobanBalance };
