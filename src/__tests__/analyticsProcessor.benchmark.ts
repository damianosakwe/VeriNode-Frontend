import type { AggregateResult } from '@/src/types/analytics';

function generateSyntheticData(pointCount: number): Float64Array {
  const data = new Float64Array(pointCount);
  for (let i = 0; i < pointCount; i++) {
    const base = 50 + Math.sin(i / 1000) * 30;
    data[i] = base + (Math.random() - 0.5) * 40;
  }
  return data;
}

async function runBenchmark(): Promise<void> {
  const POINT_COUNT = 31_536_000;
  const workerUrl = new URL('../workers/analyticsProcessor.worker.ts', import.meta.url);

  console.log(`Generating ${POINT_COUNT.toLocaleString()} synthetic data points...`);
  const data = generateSyntheticData(POINT_COUNT);
  console.log(`Data size: ${(data.byteLength / 1024 / 1024).toFixed(2)} MB`);

  const worker = new Worker(workerUrl);

  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    let lastProgress = 0;

    worker.onmessage = (e) => {
      const msg = e.data;

      switch (msg.type) {
        case 'PROGRESS': {
          const pct = msg.payload.progress;
          if (pct - lastProgress >= 10 || pct === 100) {
            console.log(`Progress: ${pct}%`);
            lastProgress = pct;
          }
          break;
        }
        case 'RESULT': {
          const elapsed = performance.now() - startTime;
          const result = msg.payload.result as AggregateResult;
          console.log('\n=== Benchmark Results ===');
          console.log(`Wall-clock time: ${(elapsed / 1000).toFixed(2)}s`);
          console.log(`Points processed: ${result.count.toLocaleString()}`);
          console.log(`Avg: ${result.avg.toFixed(2)}ms`);
          console.log(`P50: ${result.p50.toFixed(2)}ms`);
          console.log(`P95: ${result.p95.toFixed(2)}ms`);
          console.log(`P99: ${result.p99.toFixed(2)}ms`);
          console.log(`Min: ${result.min.toFixed(2)}ms`);
          console.log(`Max: ${result.max.toFixed(2)}ms`);

          const passed = elapsed < 2000;
          console.log(`\nCompletion under 2s: ${passed ? 'PASS' : 'FAIL'} (${(elapsed / 1000).toFixed(2)}s)`);

          worker.terminate();
          if (passed) resolve();
          else reject(new Error(`Benchmark took too long: ${(elapsed / 1000).toFixed(2)}s`));
          break;
        }
        case 'ERROR': {
          worker.terminate();
          reject(new Error(msg.payload.message));
          break;
        }
      }
    };

    worker.onerror = (err) => {
      worker.terminate();
      reject(new Error(err.message));
    };

    worker.postMessage(
      {
        type: 'COMPUTE',
        payload: {
          data,
          config: { groupBy: 'none' },
          requestId: 'benchmark',
        },
      },
      [data.buffer],
    );
  });
}

if (typeof window !== 'undefined' && typeof (globalThis as Record<string, unknown>).__BENCHMARK_RUN !== 'undefined') {
  runBenchmark()
    .then(() => console.log('Benchmark completed successfully.'))
    .catch((err) => console.error('Benchmark failed:', err));
}

export { runBenchmark, generateSyntheticData };
