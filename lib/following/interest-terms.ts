import { sanitizeInterests, interestTerms } from "@/lib/onboarding/taxonomy";
/** Accept legacy string arrays and the shared onboarding's structured interests. */
export function followingInterestTerms(profile: {interests?:unknown;research_interests?:unknown}|null|undefined):string[]{
 const terms: string[]=[];
 for(const value of [profile?.interests,profile?.research_interests]){
  if(Array.isArray(value))terms.push(...value.filter((t):t is string=>typeof t==='string'));
  else if(value&&typeof value==='object')terms.push(...interestTerms(sanitizeInterests(value)).map(t=>t.term));
 }
 return [...new Set(terms.map(t=>t.trim().toLowerCase()).filter(Boolean))];
}
