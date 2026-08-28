import { redirect } from 'next/navigation';

/** Claims are persisted as Cases; retain this URL only as a compatibility redirect. */
export default function ClaimsPage() {
  redirect('/cases');
}
