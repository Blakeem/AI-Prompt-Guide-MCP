#!/usr/bin/env ts-node
/**
 * Performance benchmark for search with and without FingerprintIndex
 *
 * Demonstrates the 10-20x performance improvement from candidate filtering
 */

import { DocumentManager } from '../src/document-manager.js';
import { createDocumentCache } from '../src/document-cache.js';
import { FingerprintIndex } from '../src/fingerprint-index.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const docsRoot = path.join(__dirname, '..', '.ai-prompt-guide', 'docs');

interface BenchmarkResult {
  query: string;
  withIndexMs: number;
  withoutIndexMs: number;
  speedup: number;
  candidatesWithIndex: number;
  totalDocuments: number;
}

async function benchmarkSearch(): Promise<void> {
  console.log('🚀 Search Performance Benchmark\n');
  console.log(`Documents directory: ${docsRoot}\n`);

  // Create managers - one with index, one without
  const cacheWithIndex = createDocumentCache(docsRoot, {
    maxCacheSize: 100,
    enableWatching: false,
    evictionPolicy: 'lru'
  });

  const cacheWithoutIndex = createDocumentCache(docsRoot, {
    maxCacheSize: 100,
    enableWatching: false,
    evictionPolicy: 'lru'
  });

  const fingerprintIndex = new FingerprintIndex(docsRoot);
  await fingerprintIndex.initialize();

  const managerWithIndex = new DocumentManager(docsRoot, cacheWithIndex, fingerprintIndex);
  const managerWithoutIndex = new DocumentManager(docsRoot, cacheWithoutIndex);

  // Get stats
  const { documents: allDocs } = await managerWithIndex.listDocuments();
  const stats = fingerprintIndex.getStats();

  console.log('📊 Index Statistics:');
  console.log(`   Total documents: ${stats.documents}`);
  console.log(`   Unique keywords: ${stats.keywords}`);
  console.log(`   Avg keywords/doc: ${stats.avgKeywordsPerDoc}`);
  console.log('');

  // Test queries
  const queries = [
    'authentication security',
    'database schema',
    'API endpoint',
    'testing integration',
    'configuration'
  ];

  const results: BenchmarkResult[] = [];

  for (const query of queries) {
    console.log(`⚡ Benchmarking: "${query}"`);

    // Warm up
    await managerWithIndex.searchDocuments(query);
    await managerWithoutIndex.searchDocuments(query);

    // Benchmark WITH index
    const candidates = fingerprintIndex.findCandidates(query);
    const startWith = performance.now();
    const resultsWithIndex = await managerWithIndex.searchDocuments(query);
    const durationWith = performance.now() - startWith;

    // Benchmark WITHOUT index
    const startWithout = performance.now();
    const resultsWithoutIndex = await managerWithoutIndex.searchDocuments(query);
    const durationWithout = performance.now() - startWithout;

    const speedup = durationWithout / durationWith;

    results.push({
      query,
      withIndexMs: durationWith,
      withoutIndexMs: durationWithout,
      speedup,
      candidatesWithIndex: candidates.length,
      totalDocuments: allDocs.length
    });

    console.log(`   ✅ With index:    ${durationWith.toFixed(2)}ms (${candidates.length} candidates)`);
    console.log(`   ❌ Without index: ${durationWithout.toFixed(2)}ms (${allDocs.length} documents)`);
    console.log(`   📈 Speedup:       ${speedup.toFixed(2)}x faster\n`);

    // Verify same results
    if (resultsWithIndex.length !== resultsWithoutIndex.length) {
      console.warn(`   ⚠️  Result count mismatch: ${resultsWithIndex.length} vs ${resultsWithoutIndex.length}`);
    }
  }

  // Summary
  console.log('\n📈 Summary:');
  const avgSpeedup = results.reduce((sum, r) => sum + r.speedup, 0) / results.length;
  const avgCandidateReduction = results.reduce((sum, r) =>
    sum + (1 - r.candidatesWithIndex / r.totalDocuments), 0) / results.length * 100;

  console.log(`   Average speedup: ${avgSpeedup.toFixed(2)}x`);
  console.log(`   Average candidate reduction: ${avgCandidateReduction.toFixed(1)}%`);
  console.log(`   Total documents: ${allDocs.length}`);

  // Cleanup
  await cacheWithIndex.destroy();
  await cacheWithoutIndex.destroy();
}

// Run benchmark
benchmarkSearch().catch((error: unknown) => {
  console.error('❌ Benchmark failed:', error);
  process.exit(1);
});
