// The consumer smoke test (scripts/consumer-smoke.sh): installs learn-kit from a fresh clone into a scratch directory, as an
// app does, and imports @learn-kit/graph, @learn-kit/drill and @learn-kit/learner from there. It needs the network or a warm npm cache, because the install runs
// the build with devDependencies; set LEARN_KIT_SKIP_SMOKE=1 to leave it out offline.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const script = fileURLToPath(new URL('./consumer-smoke.sh', import.meta.url));

describe.skipIf(process.env.LEARN_KIT_SKIP_SMOKE === '1')('a consumer install of learn-kit', () => {
  it('installs from git and imports learn-kit/graph, learn-kit/drill and learn-kit/learner', () => {
    let output = '';
    try {
      output = execFileSync('bash', [script], { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 540_000 });
    } catch (err) {
      const e = /** @type {{ stdout?: string, stderr?: string }} */ (err);
      throw new Error(`consumer smoke test failed:\n${e.stdout ?? ''}\n${e.stderr ?? ''}`);
    }
    expect(output).toContain('the exports map names the entry points');
    expect(output).toContain('learn-kit/graph imports');
    expect(output).toContain('learn-kit/drill imports');
    expect(output).toContain('learn-kit/learner imports');
    expect(output).toContain('consumer smoke test passed');
  }, 600_000);
});
