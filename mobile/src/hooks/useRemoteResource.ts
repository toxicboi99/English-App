import { useEffect, useEffectEvent, useState } from "react";

function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong while loading live data.";
}

export function useRemoteResource<T>(
  loader: () => Promise<T>,
  dependencies: ReadonlyArray<unknown>,
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runLoader = useEffectEvent(async (mode: "initial" | "refresh") => {
    if (mode === "initial") {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError(null);

    try {
      const result = await loader();
      setData(result);
    } catch (loadError) {
      setError(toErrorMessage(loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  });

  useEffect(() => {
    void runLoader("initial");
  }, dependencies);

  async function reload() {
    await runLoader("refresh");
  }

  return {
    data,
    setData,
    error,
    loading,
    refreshing,
    reload,
  };
}
