import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,it} from 'vitest';

const root=process.cwd();
const worker=fs.readFileSync(path.join(root,'cloudflare/world-worker/src/index.js'),'utf8');
const gui=fs.readFileSync(path.join(root,'QINGLAN_TEST_CENTER.py'),'utf8');

describe('P0.26.2 Cloudflare deployment version propagation safety',()=>{
  it('exposes Worker release directly without routing through the Durable Object',()=>{
    expect(worker).toContain("url.pathname==='/api/release'");
    expect(worker).toContain("app:'qinglan-realms-worker'");
  });

  it('polls Worker and Durable Object releases instead of failing immediately on rollout skew',()=>{
    expect(gui).toContain('NETWORK_RELEASE_PROPAGATION_TIMEOUT_SECONDS = 150');
    expect(gui).toContain('/api/release?probe=');
    expect(gui).toContain('/health?probe=');
    expect(gui).toContain('Cloudflare Worker 已更新為');
    expect(gui).toContain('Durable Object 仍為');
  });
});
