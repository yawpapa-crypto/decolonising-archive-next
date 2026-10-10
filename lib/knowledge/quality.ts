import type { CatalogueRecord } from "@/lib/catalogue/types";
export type QualityRow={id:string;title:string;issues:string[]};
export function auditCatalogue(records:CatalogueRecord[],images:Map<string,{url?:string|null;missingLocal?:boolean}>,shownIds?:Set<string>){
 const ids=new Set(records.map(r=>r.id));const titles=new Map<string,string[]>();const imageOwners=new Map<string,string[]>();
 for(const r of records){const key=r.title.trim().toLowerCase().replace(/\s+/g," ");titles.set(key,[...(titles.get(key)??[]),r.id]);const image=images.get(r.id)?.url;if(image)imageOwners.set(image,[...(imageOwners.get(image)??[]),r.id]);}
 return records.map(r=>{const issues:string[]=[];const image=images.get(r.id);
  if(!image?.url)issues.push("No displayable image");if(image?.missingLocal)issues.push("Broken local image");
  if(!r.provenanceOrCustodyNote || ['unverified','research_lead'].includes(r.evidenceStatus))issues.push("Weak provenance");
  if(!r.dateStart&&!r.periodLabel)issues.push("Missing date / period");
  if((titles.get(r.title.trim().toLowerCase().replace(/\s+/g," "))?.length??0)>1)issues.push("Possible duplicate title");
  if(image?.url&&(imageOwners.get(image.url)?.length??0)>1)issues.push("Shared image — review duplicates");
  if(r.linkedRecordIds.some(id=>!ids.has(id)))issues.push("Unresolved record relationship");
  if(!r.sourceUrl)issues.push("Missing citation source");if(!r.sourceName)issues.push("Missing source attribution");
  if(r.description.trim().length<60)issues.push("Short or missing description");
  if(shownIds&&!shownIds.has(r.id))issues.push("No recorded discovery exposure");
  return {id:r.id,title:r.title,issues};
 });
}
