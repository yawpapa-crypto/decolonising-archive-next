import { Suspense } from "react";
import { redirect } from "next/navigation";
import { safeNextPath } from "@/src/lib/security/validate";
import { getCurrentUser } from "@/src/lib/auth";
import AuthPageShell from "@/components/auth/AuthPageShell";
import EditorialCollage from "@/components/auth/EditorialCollage";
import LoginForm from "./LoginForm";
import "@/app/styles/auth-pages.css";
export const metadata={title:"Welcome back | Decolonising Archive",robots:{index:false,follow:false}};
export default async function SignInPage({searchParams}:{searchParams:Promise<{switch?:string;next?:string;error?:string;updated?:string;resetSent?:string}>}) {
 const sp=await searchParams; const next=safeNextPath(sp.next,"/for-you");
 if(!sp.switch && await getCurrentUser()) redirect(next);
 return <AuthPageShell><main className="signup-layout"><LoginForm next={next} error={sp.error} notice={sp.updated || (sp.resetSent ? "Check your inbox for your reset link." : undefined)}/><Suspense fallback={<aside className="signup-collage" aria-hidden="true" />}><EditorialCollage/></Suspense></main></AuthPageShell>;
}
