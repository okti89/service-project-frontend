import { Button, Spinner } from 'react-bootstrap'

export default function CustomerLoadingStatus({ customers, count, isLoading, isLoadingMore, isSearching, error, hasMore, retry, sentinelRef }) {
  const busy = isLoading || isLoadingMore || isSearching
  return (
    <div ref={sentinelRef} className="text-center p-3 border-top text-muted" aria-live="polite" aria-busy={busy}>
      {busy ? <div><Spinner animation="border" size="sm" className="me-2" />Müşteriler yükleniyor…</div> : null}
      {error ? (
        <div><div className="text-danger mb-2">{error}</div><Button size="sm" variant="outline-primary" onClick={retry}>Tekrar dene</Button></div>
      ) : !isLoading && !isSearching ? (
        <div className="small">
          {customers.length} / {count} müşteri yüklendi
          {!hasMore && !busy ? <span className="d-block mt-1">Tüm müşteriler yüklendi.</span> : null}
        </div>
      ) : null}
    </div>
  )
}
