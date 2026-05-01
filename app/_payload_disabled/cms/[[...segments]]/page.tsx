import type { Metadata } from 'next'
import config from '@payload-config'
import { RootPage, generatePageMetadata } from '@payloadcms/next/views'

type Args = {
  params: Promise<{
    segments?: string[]
  }>
  searchParams: Promise<{
    [key: string]: string | string[] | undefined
  }>
}

export const generateMetadata = async ({
  params,
  searchParams,
}: Args): Promise<Metadata> =>
  generatePageMetadata({
    config,
    params: await params,
    searchParams: await searchParams,
  })

export default async function Page({ params, searchParams }: Args) {
  return RootPage({
    config,
    params: await params,
    searchParams: await searchParams,
  })
}
