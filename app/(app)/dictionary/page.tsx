import { DictionaryClient } from "@/components/dictionary/dictionary-client";
import { getCurrentUser } from "@/lib/auth";
import { getDictionaryData } from "@/lib/data";

export default async function DictionaryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const params = await searchParams;
  const query = params.q ?? "";
  const data = await getDictionaryData(user.id, query);

  return (
    <DictionaryClient
      initialData={JSON.parse(JSON.stringify(data))}
      initialQuery={query}
    />
  );
}
