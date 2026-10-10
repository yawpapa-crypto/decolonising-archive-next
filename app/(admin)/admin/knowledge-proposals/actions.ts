"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/src/lib/auth";
import { createClient } from "@/src/lib/supabase/server";
export async function reviewProposal(form:FormData){
 await requireAdmin();const status=String(form.get('status'));if(!['in_review','accepted','declined','needs_evidence'].includes(status))throw Error('Invalid review status.');
 const db=await createClient();const {error}=await db.from('knowledge_proposals').update({status,reviewer_note:String(form.get('note')??'').slice(0,4000)}).eq('id',String(form.get('id')));if(error)throw Error('Could not save review.');revalidatePath('/admin/knowledge-proposals');revalidatePath('/knowledge-graph');
}
