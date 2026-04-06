/**
 * Parse a fetch Response as JSON without throwing on empty body
 * (`res.json()` → "Unexpected end of JSON input").
 */
export async function readJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error(
      res.ok
        ? "서버 응답이 비어 있습니다."
        : `요청 실패 (${res.status} ${res.statusText})`.trim()
    );
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    throw new Error(
      res.ok
        ? "응답을 해석할 수 없습니다."
        : `요청 실패 (${res.status})`
    );
  }
}
