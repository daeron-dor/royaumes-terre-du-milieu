import RealmApp from './realm-app';
import OpenProfiles from './realm/open-profiles';
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const demo = (await searchParams).demo === '1';
  return (
    <>
      {!demo && <OpenProfiles />}
      <RealmApp demoMode={demo} />
    </>
  );
}
