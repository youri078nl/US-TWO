
'use strict';
// US TWO · dependency-free local WebGL2 glTF 2.0 skinning and preview renderer.
// The original duo mesh, textures and rig are read from PAWN_DUO_1_0.glb; no substitute characters.
(()=>{
const $=id=>document.getElementById(id);
const canvas=$('quest-3d-canvas'), loading=$('quest-3d-loading'), status=$('quest-3d-status');
let gl, data, binary, animation, meshDraws=[], skins=[], textures=[], bones=[], nodes=[], parents=[];
let playing=true, pausedAt=0, pawnPosition=0, animStart=0, travel=null, orbitY=0.28, orbitX=0.21, distance=6.7, targetX=0, targetZ=0, pointer=new Map(), lastPinch=0;
let jointTexture=null, active=false;
const WORLDS=[
 {name:'Het Betoverde Liefdesbos',bg:[.075,.035,.11],tile:[.34,.24,.48]},
 {name:'Neon Date City',bg:[.025,.048,.13],tile:[.20,.33,.58]},
 {name:'Liefdeseiland',bg:[.016,.095,.09],tile:[.12,.49,.43]},
 {name:'De Film- en Fantasiewereld',bg:[.085,.03,.08],tile:[.49,.19,.38]},
 {name:'Dromenrijk',bg:[.13,.068,.03],tile:[.64,.36,.20]},
 {name:'Het Sterrenuniversum',bg:[.015,.065,.105],tile:[.14,.42,.51]}
];
const worldFor=(n)=>WORLDS[Math.floor(Math.max(0,n)/60)%WORLDS.length];
const isSuperTile=n=>n>0&&n%20===0;

const I=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
const M=(a,b)=>{const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o};
const trs=(t,r,s)=>{
 const [x,y,z,w]=r, x2=x+x,y2=y+y,z2=z+z, xx=x*x2,xy=x*y2,xz=x*z2,yy=y*y2,yz=y*z2,zz=z*z2,wx=w*x2,wy=w*y2,wz=w*z2;
 return new Float32Array([(1-yy-zz)*s[0],(xy+wz)*s[0],(xz-wy)*s[0],0,(xy-wz)*s[1],(1-xx-zz)*s[1],(yz+wx)*s[1],0,(xz+wy)*s[2],(yz-wx)*s[2],(1-xx-yy)*s[2],0,t[0],t[1],t[2],1]);
};
const lerp=(a,b,t)=>a.map((v,i)=>v*(1-t)+b[i]*t);
const slerp=(a,b,t)=>{let dot=a.reduce((v,x,i)=>v+x*b[i],0);let bb=b;if(dot<0){dot=-dot;bb=b.map(x=>-x)};if(dot>.9995){const o=lerp(a,bb,t);const n=Math.hypot(...o);return o.map(x=>x/n)}const th=Math.acos(Math.min(1,dot)),si=Math.sin(th);return a.map((v,i)=>(Math.sin((1-t)*th)*v+Math.sin(t*th)*bb[i])/si)};
const copy=(x)=>Array.from(x);
const csz={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4};
const elements={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
function accessor(idx){
 const a=data.accessors[idx],view=data.bufferViews[a.bufferView],n=elements[a.type],sz=csz[a.componentType],stride=view.byteStride||n*sz;
 const off=(view.byteOffset||0)+(a.byteOffset||0),out=[],dv=new DataView(binary);
 for(let i=0;i<a.count;i++){const v=[];for(let k=0;k<n;k++){const p=off+i*stride+k*sz;let x;
 switch(a.componentType){case 5120:x=dv.getInt8(p);break;case 5121:x=dv.getUint8(p);break;case 5122:x=dv.getInt16(p,true);break;case 5123:x=dv.getUint16(p,true);break;case 5125:x=dv.getUint32(p,true);break;case 5126:x=dv.getFloat32(p,true);break;default:throw Error('Onbekende accessortype')};
 if(a.normalized){if(a.componentType===5120)x=Math.max(-1,x/127);if(a.componentType===5121)x/=255;if(a.componentType===5122)x=Math.max(-1,x/32767);if(a.componentType===5123)x/=65535}v.push(x)}out.push(n===1?v[0]:v)}return out;
}
function shader(type,source){const sh=gl.createShader(type);gl.shaderSource(sh,source);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error('Shader fout: '+gl.getShaderInfoLog(sh));return sh}
function program(){
 const vs=`#version 300 es\nprecision highp float;precision highp int;
 layout(location=0) in vec3 p;layout(location=1) in vec3 n;layout(location=2) in vec2 uv;layout(location=3) in uvec4 j;layout(location=4) in vec4 w;
 uniform mat4 pv,model;uniform highp sampler2D boneTex;uniform vec3 offset;uniform bool skinned;
 mat4 readBone(uint index){int j=clamp(int(index),0,65);return mat4(
 texelFetch(boneTex,ivec2(0,j),0),texelFetch(boneTex,ivec2(1,j),0),
 texelFetch(boneTex,ivec2(2,j),0),texelFetch(boneTex,ivec2(3,j),0));}
 out vec3 normal;out vec2 tex;
 void main(){mat4 tr=model;
 if(skinned){tr=w.x*readBone(j.x)+w.y*readBone(j.y)+w.z*readBone(j.z)+w.w*readBone(j.w);}
 vec4 pos=tr*vec4(p,1.0);pos.xyz+=offset;gl_Position=pv*pos;
 normal=normalize(mat3(tr)*n);tex=uv;}`;
 const fs=`#version 300 es\nprecision highp float;in vec3 normal;in vec2 tex;uniform sampler2D image;uniform bool textured;uniform vec4 color;out vec4 outColor;
 void main(){vec3 albedo=color.rgb;if(textured)albedo*=texture(image,tex).rgb;
 float light=max(dot(normalize(normal),normalize(vec3(-0.45,0.85,0.72))),0.0);
 float shade=0.48+0.64*light;
 outColor=vec4(albedo*shade,color.a);}`;
 const prog=gl.createProgram();gl.attachShader(prog,shader(gl.VERTEX_SHADER,vs));gl.attachShader(prog,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(prog);
 if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw Error('Programma: '+gl.getProgramInfoLog(prog));gl.useProgram(prog);
 return {prog,uniforms:Object.fromEntries(['pv','model','boneTex','offset','skinned','image','textured','color'].map(x=>[x,gl.getUniformLocation(prog,x)]))};
}
let renderer;
function vertexBuffers(prim){
 const vao=gl.createVertexArray();gl.bindVertexArray(vao);let count=0,indexed=false,indexType=gl.UNSIGNED_SHORT;
 const attr=prim.attributes;
 for(const [name,loc,size] of [['POSITION',0,3],['NORMAL',1,3],['TEXCOORD_0',2,2],['JOINTS_0',3,4],['WEIGHTS_0',4,4]]){
 if(attr[name]===undefined)continue;
 const a=accessor(attr[name]);const isJoint=name==='JOINTS_0';const v=isJoint?new Uint16Array(a.flat()):new Float32Array(a.flat());
 const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,v,gl.STATIC_DRAW);gl.enableVertexAttribArray(loc);
 if(isJoint)gl.vertexAttribIPointer(loc,size,gl.UNSIGNED_SHORT,0,0);else gl.vertexAttribPointer(loc,size,gl.FLOAT,false,0,0);
 }
 if(attr.JOINTS_0===undefined){gl.disableVertexAttribArray(3);gl.vertexAttribI4ui(3,0,0,0,0)}
 if(attr.WEIGHTS_0===undefined){gl.disableVertexAttribArray(4);gl.vertexAttrib4f(4,1,0,0,0)}
 if(attr.TEXCOORD_0===undefined){gl.disableVertexAttribArray(2);gl.vertexAttrib2f(2,0,0)}
 if(prim.indices!==undefined){const indices=accessor(prim.indices),max=indices.reduce((m,v)=>Math.max(m,v),0);const values=max>65535?new Uint32Array(indices):new Uint16Array(indices),buf=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,buf);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,values,gl.STATIC_DRAW);count=values.length;indexed=true;indexType=max>65535?gl.UNSIGNED_INT:gl.UNSIGNED_SHORT;}
 else count=accessor(attr.POSITION).length;
 gl.bindVertexArray(null);return {vao,count,indexed,indexType};
}
// Separate board geometry from unchanged original character vertices.
function makeTile(){
 const radius=1.18,vertices=[],push=(a,b,c,n)=>[a,b,c].forEach(v=>vertices.push(...v,...n,0,0));
 for(let i=0;i<8;i++){let a=i*Math.PI/4,b=(i+1)*Math.PI/4;
 const p=[radius*Math.cos(a),.03,radius*Math.sin(a)],q=[radius*Math.cos(b),.03,radius*Math.sin(b)];
 push([0,.03,0],p,q,[0,1,0]);
 const p2=[p[0],-.12,p[2]],q2=[q[0],-.12,q[2]];
 push(p,p2,q,[Math.cos(a),0,Math.sin(a)]);push(q,p2,q2,[Math.cos(a),0,Math.sin(a)]);
 }
 const vao=gl.createVertexArray();gl.bindVertexArray(vao);const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
 gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,32,0);gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,3,gl.FLOAT,false,32,12);gl.enableVertexAttribArray(2);gl.vertexAttribPointer(2,2,gl.FLOAT,false,32,24);
 gl.disableVertexAttribArray(3);gl.vertexAttribI4ui(3,0,0,0,0);gl.disableVertexAttribArray(4);gl.vertexAttrib4f(4,1,0,0,0);gl.bindVertexArray(null);
 return {vao,count:vertices.length/8,indexed:false};
}
function loadGlb(buffer){
 const dv=new DataView(buffer);if(dv.getUint32(0,true)!==0x46546c67||dv.getUint32(4,true)!==2)throw Error('Geen geldige GLB 2.0.');
 let off=12,json=null,bin=null;
 while(off<buffer.byteLength){const len=dv.getUint32(off,true),type=dv.getUint32(off+4,true);off+=8;const chunk=buffer.slice(off,off+len);
 if(type===0x4e4f534a)json=JSON.parse(new TextDecoder().decode(chunk));if(type===0x004e4942)bin=chunk;off+=len;}
 if(!json||!bin)throw Error('3D-bundel onvolledig');data=json;binary=bin;
 if(data.skins.length!==2||data.scenes[data.scene||0].nodes.length!==1)throw Error('De groepspion voldoet niet aan de afgesproken structuur.');
}
async function loadTextures(){
 const result=[];
 for(const im of data.images){const view=data.bufferViews[im.bufferView];const bytes=binary.slice(view.byteOffset||0,(view.byteOffset||0)+view.byteLength);
 const blob=new Blob([bytes],{type:im.mimeType});let img;
 if(typeof createImageBitmap==='function')img=await createImageBitmap(blob);
 else{const url=URL.createObjectURL(blob);try{img=await new Promise((resolve,reject)=>{const pic=new Image();pic.onload=()=>resolve(pic);pic.onerror=()=>reject(Error('Textuur lezen mislukt'));pic.src=url})}finally{URL.revokeObjectURL(url)}}
 const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);
 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);gl.generateMipmap(gl.TEXTURE_2D);
 result.push(tex);if(typeof img.close==='function')img.close();
 }
 textures=(data.textures||[]).map(t=>result[t.source]);
}
function initJointTexture(){
 jointTexture=gl.createTexture();gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,jointTexture);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,4,66,0,gl.RGBA,gl.FLOAT,null);
 gl.activeTexture(gl.TEXTURE0);
}
function sceneSetup(){
 nodes=data.nodes.map(n=>({t:copy(n.translation||[0,0,0]),r:copy(n.rotation||[0,0,0,1]),s:copy(n.scale||[1,1,1]),matrix:n.matrix?new Float32Array(n.matrix):null,children:n.children||[],mesh:n.mesh,skin:n.skin}));
 parents=nodes.map(()=>-1);nodes.forEach((n,i)=>n.children.forEach(j=>parents[j]=i));
 skins=data.skins.map(s=>({joints:s.joints,inverse:accessor(s.inverseBindMatrices).map(x=>new Float32Array(x))}));
 selectAnimation(0);
 data.nodes.forEach((n,idx)=>{if(n.mesh===undefined)return;for(const prim of data.meshes[n.mesh].primitives)meshDraws.push({...vertexBuffers(prim),node:idx,skin:n.skin,material:prim.material});});
}
let animationDuration=0,globals=[];
function selectAnimation(index){
 const a=data.animations[index];if(!a)throw Error('Onbekende animatieclip');
 animationDuration=0;
 animation={duration:0,channels:a.channels.map(c=>{
  const s=a.samplers[c.sampler],t=accessor(s.input),v=accessor(s.output);
  animationDuration=Math.max(animationDuration,t[t.length-1]||0);
  return {node:c.target.node,path:c.target.path,times:t,values:v,mode:s.interpolation||'LINEAR'};
 })};
 animation.duration=Math.max(.001,animationDuration);
 playing=true;pausedAt=0;animStart=performance.now();
}
const CLIP_LABELS={
 PAWN_DUO_WALK:'Wandelen',PAWN_DUO_IDLE:'Samen ontspannen',
 PAWN_DUO_HUG:'Knuffelen',PAWN_DUO_KISS:'Zoenen',
 PAWN_DUO_DANCE:'Dansen',PAWN_DUO_HIGH_FIVE:'High five',
 PAWN_DUO_PLAY:'Spelen en lachen',PAWN_DUO_STARGAZE:'Sterren kijken',
 PAWN_DUO_BALL_TOSS:'Bal gooien (zonder 3D-Pepsi)'
};
function pose(time){
 const transforms=nodes.map(n=>({t:n.t.slice(),r:n.r.slice(),s:n.s.slice()}));
 const moment=(playing?time:pausedAt)%animation.duration;
 for(const ch of animation.channels){let idx=0;while(idx+1<ch.times.length-1&&ch.times[idx+1]<moment)idx++;
 const next=Math.min(idx+1,ch.times.length-1),a=ch.times[idx],b=ch.times[next],frac=b>a?(moment-a)/(b-a):0;
 const v=ch.path==='rotation'?slerp(ch.values[idx],ch.values[next],frac):lerp(ch.values[idx],ch.values[next],frac);
 transforms[ch.node][ch.path==='translation'?'t':ch.path==='rotation'?'r':'s']=v;
 }
 globals=nodes.map(()=>I());const dfs=(id,parent)=>{const node=nodes[id],t=transforms[id],local=node.matrix||trs(t.t,t.r,t.s);globals[id]=M(parent,local);node.children.forEach(j=>dfs(j,globals[id]));};
 const sc=data.scenes[data.scene||0];sc.nodes.forEach(id=>dfs(id,I()));
 bones=skins.map(sk=>sk.joints.map((j,i)=>M(globals[j],sk.inverse[i])));
}
function perspective(fov,aspect,near,far){const f=1/Math.tan(fov/2),o=new Float32Array(16);o[0]=f/aspect;o[5]=f;o[10]=(far+near)/(near-far);o[11]=-1;o[14]=(2*far*near)/(near-far);return o}
function lookAt(eye,target){
 const sub=(a,b)=>a.map((x,i)=>x-b[i]);const norm=a=>{const len=Math.hypot(...a);return a.map(x=>x/len)};
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const z=norm(sub(eye,target)),x=norm(cross([0,1,0],z)),y=cross(z,x);
 return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-x.reduce((v,n,i)=>v+n*eye[i],0),-y.reduce((v,n,i)=>v+n*eye[i],0),-z.reduce((v,n,i)=>v+n*eye[i],0),1]);
}
function boardPoint(n){return [Math.sin(n*.48)*1.14,Math.floor(n/2)*.015,n*2.24];}
function drawObject(draw,model,offset,skinned,base,tex){
 const u=renderer.uniforms;gl.bindVertexArray(draw.vao);gl.uniformMatrix4fv(u.model,false,model);gl.uniform3fv(u.offset,offset);gl.uniform1i(u.skinned,skinned?1:0);
 gl.uniform4fv(u.color,base);gl.uniform1i(u.textured,tex?1:0);if(tex){gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex);gl.uniform1i(u.image,0)}
 if(skinned){
 const b=bones[draw.skin],packed=new Float32Array(66*16);
 for(let i=0;i<b.length;i++)packed.set(b[i],i*16);
 gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,jointTexture);
 gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,4,66,gl.RGBA,gl.FLOAT,packed);
 gl.uniform1i(u.boneTex,1);gl.activeTexture(gl.TEXTURE0);
 }
 if(draw.indexed)gl.drawElements(gl.TRIANGLES,draw.count,draw.indexType,0);else gl.drawArrays(gl.TRIANGLES,0,draw.count);
}
let tile;
function loop(now){
 if(!renderer||!active)return;const rect=canvas.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1),width=Math.max(2,Math.round(rect.width*dpr)),height=Math.max(2,Math.round(rect.height*dpr));
 if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;gl.viewport(0,0,width,height)}
 const time=(now-animStart)/1000;pose(time);
 let fx=boardPoint(pawnPosition)[0],fz=boardPoint(pawnPosition)[2];
 if(travel){const t=Math.min(1,(now-travel.started)/1250),e=t*t*(3-2*t),a=boardPoint(travel.from),b=boardPoint(travel.to);fx=a[0]+(b[0]-a[0])*e;fz=a[2]+(b[2]-a[2])*e;if(t>=1){travel=null;pawnPosition=Math.round(pawnPosition)}}
 if($('focus').checked){targetX+=(fx-targetX)*.085;targetZ+=(fz-targetZ)*.085}
 const camX=targetX+distance*Math.sin(orbitY)*Math.cos(orbitX),camY=1.1+distance*Math.sin(orbitX),camZ=targetZ+distance*Math.cos(orbitY)*Math.cos(orbitX);
 const pv=M(perspective(Math.PI/3,width/height,.08,250),lookAt([camX,camY,camZ],[targetX,.9,targetZ]));
 const theme=worldFor(pawnPosition);gl.clearColor(...theme.bg,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.useProgram(renderer.prog);gl.uniformMatrix4fv(renderer.uniforms.pv,false,pv);
 for(let i=Math.max(0,pawnPosition-2);i<pawnPosition+11;i++){
 const b=boardPoint(i),m=I();m[12]=b[0];m[13]=b[1]-.14;m[14]=b[2];
 drawObject(tile,m,[0,0,0],false,i===pawnPosition?[.95,.55,.20,1]:isSuperTile(i)?[.65,.25,.55,1]:[...worldFor(i).tile,1],null);
 }
 for(const draw of meshDraws){const mat=data.materials[draw.material]||{},pbr=mat.pbrMetallicRoughness||{},t=pbr.baseColorTexture,texture=t?textures[t.index]:null;
 drawObject(draw,globals[draw.node],[fx,Math.max(0,.07*Math.sin(Math.min(1,(now-(travel?.started||now))/1250)*Math.PI)),fz],draw.skin!==undefined,pbr.baseColorFactor||[1,1,1,1],texture);
 }
 if(active)requestAnimationFrame(loop);
}
function interaction(){
 const pinchDistance=()=>{const p=[...pointer.values()];return p.length===2?Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y):0};
 canvas.addEventListener('pointerdown',e=>{pointer.set(e.pointerId,{x:e.clientX,y:e.clientY});lastPinch=pinchDistance();canvas.setPointerCapture(e.pointerId)});
 canvas.addEventListener('pointermove',e=>{
  if(!pointer.has(e.pointerId))return;
  const curr=pointer.get(e.pointerId),dx=e.clientX-curr.x,dy=e.clientY-curr.y;
  pointer.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointer.size===1){orbitY+=dx*.009;orbitX=Math.max(-.07,Math.min(.95,orbitX+dy*.007));}
  else if(pointer.size===2){
   const d=pinchDistance();if(lastPinch>0&&d>0)distance=Math.max(3.5,Math.min(15,distance*lastPinch/d));lastPinch=d;
  }
 });
 for(const event of ['pointerup','pointercancel','lostpointercapture'])
  canvas.addEventListener(event,e=>{pointer.delete(e.pointerId);lastPinch=pinchDistance()});
 canvas.addEventListener('wheel',e=>{e.preventDefault();distance=Math.max(3.5,Math.min(15,distance+e.deltaY*.007))},{passive:false});
 $('quest-3d-animation').addEventListener('change',()=>{
  selectAnimation(Number($('quest-3d-animation').value));
  status.textContent='Originele 3D-animatie: '+$('quest-3d-animation').selectedOptions[0].textContent;
 });
 $('quest-3d-pause').addEventListener('click',()=>{
  if(playing)pausedAt=(performance.now()-animStart)/1000;
  else animStart=performance.now()-pausedAt*1000;
  playing=!playing;
  $('quest-3d-pause').textContent=playing?'Pauzeer beweging':'Speel beweging';
 });
}
const FILE_DB='us-two-private-3d-model-v1',FILE_STORE='models';
const CLIPS={walk:'PAWN_DUO_WALK',calm:'PAWN_DUO_IDLE',hug:'PAWN_DUO_HUG',
 kiss:'PAWN_DUO_KISS',dance:'PAWN_DUO_DANCE',five:'PAWN_DUO_HIGH_FIVE',
 play:'PAWN_DUO_PLAY',stars:'PAWN_DUO_STARGAZE',pepsi:'PAWN_DUO_BALL_TOSS'};
let account='',lastCard='',initialized=false,loaded=false,loadToken=0;
function privateStore(){
 return new Promise((resolve,reject)=>{
  const req=indexedDB.open(FILE_DB,1);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(FILE_STORE))req.result.createObjectStore(FILE_STORE);};
  req.onerror=()=>reject(req.error||Error('Geen lokale opslag'));
  req.onsuccess=()=>resolve(req.result);
 });
}
async function readPrivate(){
 const db=await privateStore();
 try{return await new Promise((resolve,reject)=>{
  const tx=db.transaction(FILE_STORE,'readonly'),r=tx.objectStore(FILE_STORE).get(account);
  r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error);
 });}finally{db.close()}
}
async function writePrivate(file){
 const db=await privateStore(),target=account;
 try{return await new Promise((resolve,reject)=>{
  const tx=db.transaction(FILE_STORE,'readwrite');
  tx.objectStore(FILE_STORE).put(file,target);
  tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);
  tx.onabort=()=>reject(tx.error||Error('Opslaan mislukt'));
 });}finally{db.close()}
}
function show(message){if(status)status.textContent=message;}
function setReady(ready){
 if($('quest-3d-model'))$('quest-3d-model').disabled=!ready;
 if($('quest-3d-load-saved'))$('quest-3d-load-saved').disabled=!ready;
 if($('quest-3d-animation'))$('quest-3d-animation').disabled=!ready||!loaded;
 if($('quest-3d-pause'))$('quest-3d-pause').disabled=!ready||!loaded;
}
function currentVisible(){
 return !document.hidden&&Boolean($('quest-3d-details')?.open)&&
   !$('game-panel')?.classList.contains('hidden')&&
   !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}
function resumeRendering(){
 if(!loaded)return;
 if(currentVisible()&&!active){active=true;requestAnimationFrame(loop)}
 else if(!currentVisible())active=false;
}
function setPoseForCard(card){
 if(!loaded||!data?.animations?.length)return;
 const scene=window.USTwoCinematics?.sceneFor(card)||'calm';
 const clip=CLIPS[scene]||CLIPS.calm;
 const i=data.animations.findIndex(a=>a.name===clip);
 if(i>=0){selectAnimation(i);$('quest-3d-animation').value=String(i);
  if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)playing=false;
 }
}
function clear(){
 ++loadToken;active=false;loaded=false;account='';lastCard='';
 data=null;binary=null;renderer=null;meshDraws=[];skins=[];textures=[];bones=[];nodes=[];parents=[];
 if(canvas&&gl){gl.clearColor(0.04,0.03,0.08,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);}
 if(loading){loading.hidden=false;loading.textContent='3D-model privé op dit toestel laden';}
 setReady(false);
 show('3D-weergave verborgen of niet ingeladen. De server-spelstand verandert niet.');
}
function update(state,identity){
 const who=identity?.paired&&identity?.userId&&identity?.coupleId?
   identity.userId+':'+identity.coupleId:'';
 if(!who||!state?.paired){if(account)clear();return}
 if(who!==account){clear();account=who;setReady(true);show('Laad het oorspronkelijke 3D-model op dit toestel. Het blijft lokaal privé.');}
 if(!state.initialized||!Number.isSafeInteger(state.position)||state.position<0)return;
 const next=state.position;
 if(next!==pawnPosition){
   const from=pawnPosition;pawnPosition=next;targetX=boardPoint(next)[0];targetZ=boardPoint(next)[2];
   if(Math.abs(next-from)<=5&&!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
      travel={from,to:next,started:performance.now()};
   else travel=null;
 }
 const cardKey=state.date?.id||state.date?.title||'';
 if(cardKey!==lastCard){lastCard=cardKey;setPoseForCard(state.date);}
 resumeRendering();
}
async function validModel(file){
 if(!(file instanceof Blob)||file.size<500||file.size>20_000_000)throw Error('Model moet een GLB kleiner dan 20 MB zijn.');
 const header=new DataView(await file.slice(0,12).arrayBuffer());
 if(header.getUint32(0,true)!==0x46546c67||header.getUint32(4,true)!==2||
    header.getUint32(8,true)!==file.size)throw Error('Alleen complete glTF 2.0 GLB-modellen zijn toegestaan.');
 return true;
}
async function boot(file){
 if(!account)throw Error('Koppel eerst je accounts.');
 const token=++loadToken;
 active=false;loaded=false;loading.hidden=false;loading.textContent='Oorspronkelijke 3D-pion voorbereiden…';
 try{
  await validModel(file);
  const buffer=await file.arrayBuffer();
  if(token!==loadToken)return;
  gl=canvas.getContext('webgl2',{antialias:true,alpha:false,preserveDrawingBuffer:false});
  if(!gl)throw Error('WebGL2 is niet beschikbaar op deze telefoon.');
  loadGlb(buffer);renderer=program();
  await loadTextures();
  if(token!==loadToken)return;
  sceneSetup();initJointTexture();tile=makeTile();
  if(!initialized){interaction();initialized=true;}
  const picker=$('quest-3d-animation');
  picker.innerHTML='';
  data.animations.forEach((clip,i)=>{
   const option=document.createElement('option');option.value=String(i);
   option.textContent=CLIP_LABELS[clip.name]||clip.name;picker.append(option);
  });
  loaded=true;loading.hidden=true;setReady(true);lastCard='';
  const game=window.USTwoQuestPilotBridge?.read;
  if(game){try{const state=await game();if(token!==loadToken)return;update(state,window.USTwoQuestPilotBridge.identity());}catch(_e){}}
  show('Origineel 3D-model geladen met '+data.animations.length+' echte skeletanimaties. Geen serverwijziging.');
  resumeRendering();
 }catch(err){
  active=false;loaded=false;
  if(token===loadToken){loading.textContent='3D niet geladen: '+err.message;
   show(err.message+' · Het bestaande spelbord blijft beschikbaar.');setReady(Boolean(account));}
 }
}
async function onFile(){
 const input=$('quest-3d-model'),file=input.files?.[0];input.value='';
 if(!account||!file)return;
 try{
  await validModel(file);await writePrivate(file);await boot(file);
 }catch(e){show('3D import mislukt: '+e.message)}
}
async function loadSaved(){
 if(!account)return;
 const userKey=account;
 try{
  show('Opgeslagen 3D-pion controleren…');
  const file=await readPrivate();
  if(userKey!==account)return;
  if(!file)throw Error('Nog geen lokaal opgeslagen origineel model.');
  await boot(file);
 }catch(e){show(e.message)}
}
function bind(){
 if(!canvas)return;
 $('quest-3d-model').addEventListener('change',onFile);
 $('quest-3d-load-saved').addEventListener('click',loadSaved);
 $('quest-3d-details').addEventListener('toggle',resumeRendering);
 window.addEventListener('us-two-session-cleared',clear);
 window.addEventListener('us-two-tab-changed',resumeRendering);
 document.addEventListener('visibilitychange',resumeRendering);
 window.matchMedia?.('(prefers-reduced-motion: reduce)')?.addEventListener?.('change',()=>{
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){playing=false;pausedAt=0}
  resumeRendering();
 });
 setReady(false);
}
window.USTwoQuest3D=Object.freeze({update,clear,loadSaved,availableClips:()=>data?.animations?.map(a=>a.name)||[]});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});
else bind();

})();

