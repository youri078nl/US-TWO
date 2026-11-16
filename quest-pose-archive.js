/* US TWO: import a local, uncompressed ZIP of user-approved 2D pose frames.
 * No network request. No script execution from archives. This parser supports
 * STORED ZIP files only (portable across Safari and Chrome).
 */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.USTwoPoseArchive=Object.freeze(api);
})(typeof window==='object'?window:null,function(){
  'use strict';
  const SCENES=new Set(['pepsi','kiss','hug','dance','walk','stars','five','play','calm']);
  const MAX_ARCHIVE=45*1024*1024, MAX_FRAME=4*1024*1024;
  const u16=(dv,n)=>dv.getUint16(n,true), u32=(dv,n)=>dv.getUint32(n,true);
  const decoder=new TextDecoder('utf-8',{fatal:true});
  let table=null;
  function crc32(bytes){
    if(!table) {
      table=new Uint32Array(256);
      for(let i=0;i<256;i++){
        let c=i;for(let j=0;j<8;j++)c=c&1?(0xedb88320^(c>>>1)):(c>>>1);
        table[i]=c>>>0;
      }
    }
    let c=0xffffffff;
    for(const b of bytes)c=table[(c^b)&255]^(c>>>8);
    return (c^0xffffffff)>>>0;
  }
  function validImage(data,ext){
    if(ext==='webp')return data.length>=12&&
      data[0]===82&&data[1]===73&&data[2]===70&&data[3]===70&&
      data[8]===87&&data[9]===69&&data[10]===66&&data[11]===80;
    return data.length>=8&&
      [137,80,78,71,13,10,26,10].every((n,i)=>data[i]===n);
  }
  function readArchive(buffer){
    if(!(buffer instanceof ArrayBuffer)||buffer.byteLength>MAX_ARCHIVE||buffer.byteLength<22)
      throw Error('Het pakket heeft een ongeldig formaat of is groter dan 45 MB.');
    const bytes=new Uint8Array(buffer),dv=new DataView(buffer);
    let eocd=-1;
    for(let p=buffer.byteLength-22;p>=Math.max(0,buffer.byteLength-65557);p--){
      if(u32(dv,p)===0x06054b50){eocd=p;break;}
    }
    if(eocd<0)throw Error('ZIP-eindrecord ontbreekt.');
    if(u16(dv,eocd+4)||u16(dv,eocd+6))throw Error('Meerdelige ZIP wordt niet ondersteund.');
    const count=u16(dv,eocd+10),dirSize=u32(dv,eocd+12),dirOffset=u32(dv,eocd+16);
    if(!count||count>260||dirOffset+dirSize>eocd)
      throw Error('Ongeldige ZIP-bestandslijst.');
    let pos=dirOffset,total=0;
    const scenes=new Map(),seen=new Set();
    for(let i=0;i<count;i++){
      if(pos+46>buffer.byteLength||u32(dv,pos)!==0x02014b50)
        throw Error('Ongeldige bestandslijst in ZIP.');
      const flags=u16(dv,pos+8),method=u16(dv,pos+10);
      const crc=u32(dv,pos+16),compressed=u32(dv,pos+20),uncompressed=u32(dv,pos+24);
      const nameLen=u16(dv,pos+28),extraLen=u16(dv,pos+30),commentLen=u16(dv,pos+32);
      const local=u32(dv,pos+42);
      if((flags&1)!==0||method!==0||compressed!==uncompressed)
        throw Error('Gebruik het originele ongecomprimeerde US TWO-pakket.');
      if(pos+46+nameLen+extraLen+commentLen>eocd||local+30>buffer.byteLength)
        throw Error('Beschadigd ZIP-bestand.');
      const name=decoder.decode(bytes.subarray(pos+46,pos+46+nameLen));
      pos+=46+nameLen+extraLen+commentLen;
      if(name==='README.txt')continue;
      const parts=name.match(/^([a-z]+)\/([a-z]+)_(\d{2})\.(webp|png)$/);
      if(!parts||!SCENES.has(parts[1])||parts[2]!==parts[1])
        throw Error('Onverwacht bestand in het pakket: '+name.slice(0,80));
      const scene=parts[1],frame=Number(parts[3]),ext=parts[4];
      if(frame<1||frame>24||uncompressed<100||uncompressed>MAX_FRAME||seen.has(name))
        throw Error('Ongeldig of dubbel frame: '+name);
      if(u32(dv,local)!==0x04034b50)
        throw Error('Ontbrekende beeldgegevens voor '+name);
      const offset=local+30+u16(dv,local+26)+u16(dv,local+28);
      if(offset+compressed>buffer.byteLength)
        throw Error('Afgebroken beeldgegevens in pakket.');
      const binary=bytes.subarray(offset,offset+compressed);
      if(!validImage(binary,ext)||crc32(binary)!==crc)
        throw Error('Beeldframe is beschadigd: '+name);
      const data=new Uint8Array(binary);
      const blob=new Blob([data],{type:ext==='webp'?'image/webp':'image/png'});
      if(!scenes.has(scene))scenes.set(scene,[]);
      scenes.get(scene).push({name,frame,blob});
      seen.add(name);total+=uncompressed;
      if(total>MAX_ARCHIVE)throw Error('Het pakket bevat te veel beelddata.');
    }
    if(pos!==dirOffset+dirSize)throw Error('Onvolledige ZIP-bestandslijst.');
    if(!scenes.size)throw Error('Het pakket bevat geen ondersteunde 2D-scènes.');
    const result=[];
    for(const [scene,list] of scenes){
      list.sort((a,b)=>a.frame-b.frame);
      if(list.length<2||list.length>24||list.some((x,i)=>x.frame!==i+1)||
        list.reduce((v,x)=>v+x.blob.size,0)>20*1024*1024)
        throw Error('De beeldreeks voor '+scene+' is onvolledig.');
      result.push({scene,frames:list.map(x=>x.blob),filenames:list.map(x=>x.name)});
    }
    return result;
  }
  async function parseZip(file){
    if(!file||file.size>MAX_ARCHIVE)throw Error('Het ZIP-pakket is te groot.');
    return readArchive(await file.arrayBuffer());
  }
  return Object.freeze({parseZip,readArchive,crc32});
});
