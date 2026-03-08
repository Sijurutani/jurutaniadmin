/**
 * Reactive composable for two-way binding between component state and URL query params.
 * Handles string | undefined, string[], string, and number types.
 *
 * @param key        - URL query parameter name
 * @param defaultVal - Default value (also determines inferred type)
 * @param options    - Optional: `resetKeys` removes additional query keys atomically when this value is set
 */
export function useRouteQuery<T extends string | number | string[] | undefined>(
  key: string,
  defaultVal: T,
  options: { resetKeys?: string[] } = {}
) {
  const route = useRoute()
  const router = useRouter()

  return computed<T>({
    get(): T {
      const val = route.query[key]

      if (val === undefined || val === null) return defaultVal as T

      // string[]
      if (Array.isArray(defaultVal)) {
        const arr = Array.isArray(val) ? val : [val]
        return arr.filter((v): v is string => typeof v === 'string') as T
      }

      // number
      if (typeof defaultVal === 'number') {
        const n = Number(val)
        return (isNaN(n) ? defaultVal : n) as T
      }

      // string | undefined
      return ((Array.isArray(val) ? val[0] : val) ?? defaultVal) as T
    },

    set(v: T) {
      const q = { ...route.query }

      const isDefault = Array.isArray(v)
        ? v.length === 0
        : (v === defaultVal || v === undefined || v === null || v === '')

      if (isDefault) {
        delete q[key]
      } else {
        q[key] = Array.isArray(v) ? (v as string[]) : String(v as string | number)
      }

      for (const k of (options.resetKeys ?? [])) {
        delete q[k]
      }

      router.replace({ query: q })
    }
  })
}
