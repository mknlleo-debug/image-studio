import {upscale} from './pipeline/upscale.ts';
let ort,session;
const openDB=()=>new Promise((res,rej)=>{const r=indexedDB.open('image-studio-ai-checkpoints',1);r.onupgradeneeded=()=>r.result.createObjectStore('tiles');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
const digest=async a=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',a))].map(x=>x.toString(16).padStart(2,'0')).join('');
const get=(db,k)=>new Promise((res,rej)=>{const r=db.transaction('tiles').objectStore('tiles').get(k);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
const put=(db,k,v)=>new Promise((res,rej)=>{const t=db.transaction('tiles','readwrite');t.objectStore('tiles').put(v,k);t.oncomplete=()=>res();t.onerror=()=>rej(t.error)});

onmessage=async({data:m})=>{try{
ort??=await import('./ort/ort.wasm.min.mjs');ort.env.wasm.wasmPaths=new URL('./ort/',self.location).href;ort.env.wasm.numThreads=1;
postMessage({type:'progress',text:'تحميل الموديل المحلي...'});
session??=await ort.InferenceSession.create(new URL('./models/general.onnx',self.location).href,{executionProviders:['wasm']});
const pixels=new Uint8ClampedArray(m.pixels);const db=m.resume?await openDB():null;const key='general-1940a93e-tile128-pad12:'+m.width+':'+m.height+':'+await digest(pixels);let tile=0,reused=0,saved=0;
const output=await upscale({pixels,width:m.width,height:m.height,outWidth:m.width*2,outHeight:m.height*2,filter:'lanczos3',tta:false,alpha:'resize',tile:128,overlap:12},async(data,w,h)=>{const k=key+':'+tile++;const cached=db?await get(db,k):null;if(cached&&cached.byteLength===3*w*h*16){reused++;return Float32Array.from(new Uint8Array(cached),x=>x/255);}const t=new ort.Tensor('float32',data,[1,3,h,w]);const o=await session.run({[session.inputNames[0]]:t});const v=o[session.outputNames[0]];const result=new Float32Array(v.data);v.dispose();t.dispose();if(db){const packed=Uint8ClampedArray.from(result,x=>x*255);try{await put(db,k,packed.buffer);saved++}catch(e){throw Error('المساحة المحلية مش كفاية لحفظ الأجزاء. حرّر مساحة ثم استكمل. الأجزاء السابقة لسه محفوظة.')}}return result},{progress:(done,total)=>postMessage({type:'progress',text:'المعالجة الذكية على الجهاز: '+done+' / '+total+' جزء | مسترجع '+reused+' | محفوظ جديد '+saved+' | WASM CPU'})});
postMessage({type:'done',pixels:output.buffer},[output.buffer]);db?.close();
}catch(e){postMessage({type:'error',text:e.message||String(e)})}};
