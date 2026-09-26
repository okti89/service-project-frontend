import { useCallback, useEffect, useRef, useState } from 'react'
import api from '../api/api'

export default function useCustomerPages({ search = '', status = 'all', pageSize = 50, enabled = true } = {}) {
  const [query, setQuery] = useState(search.trim())
  const [customers, setCustomers] = useState([])
  const [count, setCount] = useState(0)
  const [summary, setSummary] = useState({ total: 0, active: 0, inactive: 0 })
  const [nextPage, setNextPage] = useState(null)
  const [isLoading, setIsLoading] = useState(enabled)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const requestRef = useRef(null)
  const failedPageRef = useRef(1)
  const sentinelRef = useRef(null)
  const scrollRootRef = useRef(null)

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300)
    return () => clearTimeout(timer)
  }, [search])

  const loadPage = useCallback(async (page = 1) => {
    if (!enabled || (page > 1 && requestRef.current)) return
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    setError('')
    failedPageRef.current = page
    if (page === 1) {
      setIsLoading(true)
      setIsLoadingMore(false)
      setCustomers([])
      setNextPage(null)
      setCount(0)
    } else {
      setIsLoadingMore(true)
    }
    try {
      const response = await api.get('/customers/customers/', {
        params: { page, page_size: pageSize, search: query, status },
        signal: controller.signal,
        timeout: 20000,
      })
      if (controller.signal.aborted || requestRef.current !== controller) return
      const data = response.data
      const rows = Array.isArray(data) ? data : data.results || []
      setCustomers((previous) => {
        const unique = new Map((page === 1 ? [] : previous).map((customer) => [customer.id, customer]))
        rows.forEach((customer) => unique.set(customer.id, customer))
        return [...unique.values()]
      })
      setCount(Array.isArray(data) ? rows.length : data.count)
      setNextPage(!Array.isArray(data) && data.next ? page + 1 : null)
      if (data.summary) setSummary(data.summary)
    } catch (failure) {
      if (!controller.signal.aborted) {
        setError(failure.response?.status === 404 && page > 1
          ? 'Liste değişti. Yeniden yüklemek için tekrar deneyin.'
          : 'Müşteriler yüklenemedi. Lütfen tekrar deneyin.')
        if (failure.response?.status === 404) failedPageRef.current = 1
      }
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null
        setIsLoading(false)
        setIsLoadingMore(false)
      }
    }
  }, [enabled, pageSize, query, status])

  useEffect(() => {
    if (enabled) loadPage(1)
    return () => {
      requestRef.current?.abort()
      requestRef.current = null
    }
  }, [enabled, loadPage])

  useEffect(() => {
    if (!enabled || isLoading || isLoadingMore || error || !nextPage || query !== search.trim()) return
    const target = sentinelRef.current
    if (!target) return
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) loadPage(nextPage)
    }, { root: scrollRootRef.current, rootMargin: '160px' })
    observer.observe(target)
    return () => observer.disconnect()
  }, [enabled, error, isLoading, isLoadingMore, loadPage, nextPage, query, search])

  const reload = useCallback(() => loadPage(1), [loadPage])
  const retry = useCallback(() => loadPage(failedPageRef.current), [loadPage])

  return { customers, count, summary, isLoading, isLoadingMore, error, hasMore: nextPage !== null,
    isSearching: query !== search.trim(), reload, retry, sentinelRef, scrollRootRef }
}
