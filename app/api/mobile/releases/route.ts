import { NextResponse } from 'next/server';
import releases from './published.json';
/** Activate only after store verification, including the intended release cohort. */
export async function GET(){return NextResponse.json(releases,{headers:{'Cache-Control':'public, max-age=900','Access-Control-Allow-Origin':'*'}});}
