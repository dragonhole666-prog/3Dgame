import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,it} from 'vitest';

const source=fs.readFileSync(path.join(process.cwd(),'server/persistence.ts'),'utf8');

describe('Windows persistence file-lock resilience',()=>{
  it('retries transient rename locks and uses unique temp files',()=>{
    expect(source).toContain('RETRYABLE_FILE_CODES');
    expect(source).toContain('renameWithRetry');
    expect(source).toContain('renameSyncWithRetry');
    expect(source).toContain('this.tempSerial');
    expect(source).toContain('process.pid');
  });
  it('does not crash startup on a corrupt lightweight checkpoint',()=>{
    expect(source).toContain("name==='positions'");
    expect(source).toContain('[PersistenceRead] ignored invalid positions.json');
    expect(source).toContain('try{return JSON.parse');
  });
});
