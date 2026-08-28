import { redirect } from 'next/navigation';

type ClaimsDetailPageProps = { params: Promise<{ id: string }> };

/** Preserve old claim detail links while making Cases the sole admin workflow. */
export default async function ClaimsDetailPage({ params }: ClaimsDetailPageProps) {
  const { id } = await params;
  redirect(`/cases/${encodeURIComponent(id)}`);
}
