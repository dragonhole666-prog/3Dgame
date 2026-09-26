import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,it} from 'vitest';

const root=process.cwd();
const source=fs.readFileSync(path.join(root,'QINGLAN_TEST_CENTER.py'),'utf8');

describe('P0.25.9R8 Development Guard',()=>{
  it('stores executable architecture and release rules inside the Python test center',()=>{
    expect(source).toContain('PROJECT_RULES = (');
    expect(source).toContain('CHANGE_IMPACT_RULES = (');
    for(const id of ['ARCH-UI-001','ARCH-NET-001','PERF-RENDER-001','DEP-LOCK-001','LAUNCH-001','RELEASE-001','TEST-SEMANTIC-001','ASSET-001','CHANGE-001'])expect(source).toContain(id);
  });

  it('runs the Development Guard before local/network/release workflows',()=>{
    expect(source).toMatch(/def local_test[\s\S]*?self\.run_development_guard\(\)/);
    expect(source).toMatch(/def network_test[\s\S]*?self\.run_development_guard\(\)/);
    expect(source).toMatch(/def _full_release_gate[\s\S]*?if not development_guard_done:[\s\S]*?self\.run_development_guard\(\)/);
  });

  it('ships a change baseline and records change-impact output',()=>{
    expect(fs.existsSync(path.join(root,'scripts/development-baseline.json'))).toBe(true);
    expect(source).toContain('development-guard-latest.json');
    expect(source).toContain('impact_for');
    expect(source).toContain('accept_development_baseline');
  });
});
