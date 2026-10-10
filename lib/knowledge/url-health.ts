import { lookup } from "node:dns/promises";
import { request as httpsRequest } from "node:https";
import { request as httpRequest } from "node:http";
import { isIP } from "node:net";
/** Deny internal addresses and pin the resolved address to prevent DNS rebinding. Redirects aren't followed. */
export function isPublicAddress(address:string) {
 if(isIP(address)===4){const [a,b]=address.split('.').map(Number);return !(a===0||a===10||a===127||a>=224||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&b===168)||(a===100&&b>=64&&b<=127)||(a===198&&(b===18||b===19)));}
 return isIP(address)===6 && /^[23]/i.test(address) && !address.toLowerCase().startsWith('2001:db8:');
}
export async function checkPublicUrl(value:string):Promise<{status:number|null;content_type:string|null}> {
 try{
  const url=new URL(value);if(!['https:','http:'].includes(url.protocol)||url.username||url.password||(url.port&&!['80','443'].includes(url.port)))return {status:null,content_type:null};
  const hostname=url.hostname.replace(/^\[|\]$/g,'');const addresses=await lookup(hostname,{all:true});if(!addresses.length||addresses.some(a=>!isPublicAddress(a.address)))return {status:null,content_type:null};
  const address=addresses[0];
  return await new Promise(resolve=>{const run=url.protocol==='https:'?httpsRequest:httpRequest;const req=run(url,{method:'HEAD',family:address.family,headers:{'User-Agent':'ARED-Archive-Quality/1.0'},lookup:(_host,_options,callback)=>callback(null,address.address,address.family)},res=>{res.resume();resolve({status:res.statusCode??null,content_type:String(res.headers['content-type']??'')||null});});req.setTimeout(5000,()=>req.destroy());req.on('error',()=>resolve({status:null,content_type:null}));req.end();});
 }catch{return {status:null,content_type:null};}
}
