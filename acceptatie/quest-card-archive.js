/* Read the user's original 50-card ZIP offline. No network requests, no code
 * execution and no silently substituted artwork. Supports method 0 and raw DEFLATE.
 */
(function(root,factory){
 const api=factory();
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.USTwoCardArchive=Object.freeze(api);
})(typeof window==='object'?window:null,function(){
 'use strict';
 const LIMIT=32_000_000,MAX_IMG=900_000,MAX_TOTAL=29_000_000;
 const uint16=(dv,n)=>dv.getUint16(n,true),uint32=(dv,n)=>dv.getUint32(n,true);
 const decoder=new TextDecoder('utf-8',{fatal:true});
 let crcTable=null;
 function crc32(data){
  if(!crcTable){
   crcTable=Array.from({length:256},(_,i)=>{
    let c=i;for(let k=0;k<8;k++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);return c>>>0;
   });
  }
  let c=0xffffffff;
  for(const b of data)c=crcTable[(c^b)&255]^(c>>>8);
  return(c^0xffffffff)>>>0;
 }
 const filename=i=>'US_TWO_kaart_'+String(i).padStart(2,'0')+'.jpg';
 const validJpeg=bytes=>bytes.length>=1000&&bytes[0]===255&&bytes[1]===216&&bytes.at(-2)===255&&bytes.at(-1)===217;
 async function inflate(bytes,method,expected){
  if(method===0)return bytes.slice();
  if(method!==8)throw Error('Niet-ondersteunde ZIP-compressie.');
  if(typeof DecompressionStream!=='function')throw Error('Dit toestel kan ZIP niet uitpakken. Gebruik de 50 losse JPG-bestanden.');
  let stream;
  try{stream=new DecompressionStream('deflate-raw');}
  catch{throw Error('Dit toestel ondersteunt geen ZIP-compressie. Importeer de 50 losse JPG-bestanden.');}
  const out=await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer();
  if(out.byteLength>MAX_IMG||out.byteLength!==expected)throw Error('Ongeldige uitgepakte afbeeldingsgrootte.');
  return new Uint8Array(out);
 }
 async function read(buffer){
  if(!(buffer instanceof ArrayBuffer)||buffer.byteLength<22||buffer.byteLength>LIMIT)
   throw Error('Ongeldig ZIP-bestand of pakket groter dan 32 MB.');
  const bytes=new Uint8Array(buffer),dv=new DataView(buffer);
  let end=-1;
  for(let i=buffer.byteLength-22;i>=Math.max(0,buffer.byteLength-65557);i--){
   if(uint32(dv,i)===0x06054b50){end=i;break;}
  }
  if(end<0||uint16(dv,end+4)||uint16(dv,end+6))throw Error('Geen geldig enkelvoudig ZIP-pakket.');
  const count=uint16(dv,end+10),size=uint32(dv,end+12),start=uint32(dv,end+16);
  if(count<50||count>65||start+size>end)throw Error('De kaartenset moet 50 afbeeldingen bevatten.');
  let pos=start,total=0;
  const out=new Map(),names=new Set();
  for(let i=0;i<count;i++){
   if(pos+46>end||uint32(dv,pos)!==0x02014b50)throw Error('Ongeldige ZIP-bestandslijst.');
   const flags=uint16(dv,pos+8),method=uint16(dv,pos+10),crc=uint32(dv,pos+16);
   const compressed=uint32(dv,pos+20),length=uint32(dv,pos+24);
   const nameLen=uint16(dv,pos+28),extraLen=uint16(dv,pos+30),commentLen=uint16(dv,pos+32),local=uint32(dv,pos+42);
   const limit=pos+46+nameLen+extraLen+commentLen;
   if(limit>end||local+30>start)throw Error('Beschadigde ZIP-directory.');
   const name=decoder.decode(bytes.subarray(pos+46,pos+46+nameLen));pos=limit;
   if(names.has(name))throw Error('Dubbele bestandsnaam in ZIP.');
   names.add(name);
   if(name==='Kaartjes/'||name==='Alle_50_opdrachten.csv')continue;
   const m=name.match(/^Kaartjes\/US_TWO_kaart_(\d{2})\.jpg$/);
   if(!m||Number(m[1])<1||Number(m[1])>50||flags&1||![0,8].includes(method)||
      length<1000||length>MAX_IMG||compressed>LIMIT)
    throw Error('Onverwacht of onveilig bestand in het kaartpakket: '+name.slice(0,72));
   total+=length;if(total>MAX_TOTAL)throw Error('Kaartpakket is te groot.');
   if(uint32(dv,local)!==0x04034b50||uint16(dv,local+8)!==method)
    throw Error('Beschadigd lokaal ZIP-record.');
   const ln=uint16(dv,local+26),ex=uint16(dv,local+28);
   if(local+30+ln+ex+compressed>start)throw Error('Afgebroken ZIP-gegevens.');
   if(decoder.decode(bytes.subarray(local+30,local+30+ln))!==name)
    throw Error('ZIP-bestandsnamen spreken elkaar tegen.');
   const body=await inflate(bytes.subarray(local+30+ln+ex,local+30+ln+ex+compressed),method,length);
   if(body.length!==length||!validJpeg(body)||crc32(body)!==crc)
    throw Error('Bestand beschadigd: '+name);
   out.set(Number(m[1]),new Blob([body],{type:'image/jpeg'}));
  }
  if(out.size!==50||Array.from({length:50},(_,i)=>i+1).some(i=>!out.has(i)))
   throw Error('Niet alle 50 afbeeldingen zijn aanwezig.');
  return out;
 }
 async function readImages(files){
  if(!files||files.length!==50)throw Error('Selecteer precies 50 JPG-kaartjes.');
  const out=new Map();
  for(const file of files){
   const m=file.name.match(/^US_TWO_kaart_(\d{2})\.jpg$/);
   if(!m||Number(m[1])<1||Number(m[1])>50||out.has(Number(m[1]))||file.size<1000||file.size>MAX_IMG)
    throw Error('Ongeldig of dubbel kaartbestand: '+file.name);
   const bytes=new Uint8Array(await file.arrayBuffer());
   if(!validJpeg(bytes))throw Error('Ongeldig JPEG-bestand: '+file.name);
   out.set(Number(m[1]),file);
  }
  return out;
 }
 return Object.freeze({read,readImages,filename,crc32});
});
