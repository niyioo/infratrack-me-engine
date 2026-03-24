import { useSearchParams } from "react-router-dom";

export function useQueryParams() {
  const [params, setParams] = useSearchParams();

  function get(name: string) {
    return params.get(name) ?? "";
  }

  function set(name: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    setParams(next);
  }

  return { get, set, raw: params };
}