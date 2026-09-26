import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,it} from 'vitest';

const root=process.cwd();
const source=fs.readFileSync(path.join(root,'QINGLAN_TEST_CENTER.py'),'utf8');

describe('Python GUI test center',()=>{
  it('packages one GUI for local/network/release flows',()=>{
    expect(source).toContain('本機啟動測試');
    expect(source).toContain('網路啟動測試');
    expect(source).toContain('完整發布預檢');
    expect(source).toContain('正式部署＋網路驗證');
  });
  it('invokes npm and npx through Node JS entrypoints and blocks shell launchers',()=>{
    expect(source).toContain('npm-cli.js');
    expect(source).toContain('npx-cli.js');
    expect(source).toContain('_assert_direct(command)');
    expect(source).toContain('shell=False');
  });

  it('requires no manual network URL and auto-deploys when the cached build is stale or absent',()=>{
    expect(source).toContain('def network_test(self, open_browser: bool)');
    expect(source).toContain('_deployment_fingerprint');
    expect(source).toContain('_resolve_production_endpoint');
    expect(source).not.toContain('請先填入網路網址');
    expect(source).not.toContain('network_entry');
  });
  it('keeps health and WebSocket verification in the GUI flow',()=>{
    expect(source).toContain('verify-world-sync.mjs');
    expect(source).toContain('127.0.0.1:8787/health');
    expect(source).toContain('Network WebSocket');
  });
  it('tolerates Cloudflare Worker/Durable Object rollout skew after deploy',()=>{
    expect(source).toContain('NETWORK_RELEASE_PROPAGATION_TIMEOUT_SECONDS');
    expect(source).toContain('/api/release?probe=');
    expect(source).toContain('Durable Object 仍為');
    expect(source).toContain('Network Worker Release');
  });
  it('quiesces local Node/Vite/esbuild before npm ci and retries only Windows file-lock EPERM',()=>{
    expect(source).toContain('_quiesce_for_dependency_mutation');
    expect(source).toContain('taskkill.exe');
    expect(source).toContain('npm ci（EPERM 自動重試）');
    expect(source).toContain('"eperm" in combined and "esbuild" in combined');
  });
  it('detects semantic Wrangler unauthenticated output and uses OAuth device login',()=>{
    expect(source).toContain('_cloudflare_auth_ok');
    expect(source).toContain('you are not authenticated');
    expect(source).toContain('["login", "--device"]');
    expect(source).toContain('CLOUDFLARE_API_TOKEN');
    expect(source).not.toContain('login = self._wrangler(["login"], "Cloudflare Login"');
  });
  it('embeds Development Guard rules and runs them before release work',()=>{
    expect(source).toContain('PROJECT_RULES = (');
    expect(source).toContain('CHANGE_IMPACT_RULES = (');
    expect(source).toContain('class DevelopmentGuard');
    expect(source).toContain('run_development_guard');
    expect(source).toContain('scripts/development-baseline.json');
  });

});
