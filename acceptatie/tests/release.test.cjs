const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const dir=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(dir,f),'utf8');
test('complete 258-card deck and original image assets are present',()=>{
 const catalog=JSON.parse(read('catalog/quest-full-258.json'));
 assert.equal(catalog.ordinary.length,240);assert.equal(catalog.superdates.length,18);
 assert.equal(new Set(catalog.ordinary.map(x=>x.id)).size,240);
 assert.equal(fs.readdirSync(path.join(dir,'assets/cards')).filter(x=>/\.(jpg|png|webp)$/i.test(x)).length,258);
 for(const f of ['assets/us-two-user-pawn.png','assets/us-two-user-board.png','assets/approved-youri-kim.webp','assets/approved-pepsi.webp'])assert.ok(fs.statSync(path.join(dir,f)).size>100);
});
test('manifest is installable and points to the same release scope',()=>{
 const m=JSON.parse(read('manifest.webmanifest'));
 assert.equal(m.display,'standalone');assert.equal(m.start_url,'./');assert.equal(m.scope,'./');
 assert.ok(m.icons.some(x=>x.sizes==='192x192'));assert.ok(m.icons.some(x=>x.sizes==='512x512'));
 for(const icon of m.icons)assert.ok(fs.existsSync(path.join(dir,icon.src)));
});
test('every versioned shell asset exists and is precached under exact URL',()=>{
 const html=read('index.html'),worker=read('service-worker.js');
 const shell=JSON.parse(worker.match(/const SHELL=(\[[^\n]+\]);/)[1]);
 const assets=[...html.matchAll(/(?:src|href)="(\.\/[^"]+\.(?:js|css)\?v=100rc1)"/g)].map(m=>m[1]);
 assert.ok(assets.length>=15);
 for(const asset of assets){assert.ok(shell.includes(asset),asset);assert.ok(fs.existsSync(path.join(dir,asset.split('?')[0])),asset);}
 for(const asset of shell)assert.ok(fs.existsSync(path.join(dir,asset.split('?')[0])),asset);
 assert.ok(read('app.js').includes("version: '1.0.0-rc.1'"));assert.ok(worker.includes('v1.0.0-rc.1'));
});
test('shared board uses server revision, no per-device pawn replacement, and four location shortcuts',()=>{
 const board=read('quest-board.js'),world=read('quest-world-images.js'),html=read('index.html');
 assert.ok(board.includes('serverRevision<lastServerRevision'));
 assert.ok(board.includes('renderedStep,renderedWorld'));
 assert.ok(!board.includes('const file=await stored(key);'));
 assert.ok(world.includes("return pair+'/world-'+n;"));
 assert.ok(world.includes('memory.set(key,blob)'));
 assert.ok(world.includes('await access(key,blob).catch(()=>{})'));
 for(const x of ['living','beach','airport','forest'])assert.ok(html.includes('data-quick-location="'+x+'"'));
});
