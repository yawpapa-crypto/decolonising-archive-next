import { redirect, notFound } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
export default async function Page({params}:{params:Promise<{id:string}>}) {
 const {id}=await params;
 const db=await createClient();
 const {data}=await db.from("reading_lists").select("id").eq("id",id).eq("is_public",true).maybeSingle();
 if(!data)notFound();
 redirect(`/curated-collections/${id}`);
}
