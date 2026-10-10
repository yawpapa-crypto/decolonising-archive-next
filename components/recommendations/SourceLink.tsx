'use client';
import type {ReactNode} from 'react';
import {recommendationEvent} from '@/lib/recommendations/client';
export default function SourceLink({id,href,children,className}:{id:string;href:string;children:ReactNode;className?:string}){return <a href={href} target="_blank" rel="noopener noreferrer" className={className} onClick={()=>recommendationEvent('source_open',id)}>{children}</a>;}
