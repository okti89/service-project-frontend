import { useEffect, useRef, useState } from 'react'
import { Button, Dropdown, Modal, Spinner } from 'react-bootstrap'
import { FaDownload, FaEye, FaFilePdf, FaPrint } from 'react-icons/fa'
import toast from 'react-hot-toast'
import api from '../api/api'

export default function A4ServiceFormActions({ service, compact = false, className = '' }) {
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState(null)
  const [ready, setReady] = useState(false)
  const frameRef = useRef(null)
  const printPending = useRef(false)

  useEffect(() => {
    if (!preview) return undefined
    return () => URL.revokeObjectURL(preview.url)
  }, [preview])

  const saveFile = (url, filename) => {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  const printFile = () => {
    try {
      const viewer = frameRef.current?.contentWindow
      if (!viewer) throw new Error('PDF henüz hazır değil.')
      viewer.focus()
      viewer.print()
    } catch {
      toast.error('Tarayıcı yazdırmayı açamadı. PDF görüntüleyicisindeki yazdır düğmesini kullanabilirsiniz.')
    }
  }

  const open = async (action) => {
    if (!service?.id || busy) return
    setBusy(true)
    try {
      const response = await api.get(`/services/admin-services/${service.id}/form-a4-pdf/`, { responseType: 'blob' })
      const blob = response.data instanceof Blob ? response.data : new Blob([response.data])
      if (await blob.slice(0, 5).text() !== '%PDF-') {
        throw new Error('Sunucudan geçerli bir A4 PDF dosyası alınamadı.')
      }
      const filename = `Servis_Formu_A4_${service.receipt_number || service.id}.pdf`.replace(/[\\/:*?"<>|]/g, '_')
      const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }))
      if (action === 'download') {
        saveFile(url, filename)
        // Let the browser finish reading the download before releasing its URL.
        window.setTimeout(() => URL.revokeObjectURL(url), 60000)
        toast.success('A4 servis formu indirildi.')
      } else {
        printPending.current = action === 'print'
        setReady(false)
        setPreview({ url, filename })
      }
    } catch (error) {
      let message = error?.response?.status === 404
        ? 'A4 servis formu bulunamadı. Sunucu güncellemesini ve servis kaydını kontrol edin.'
        : error?.message || 'A4 servis formu alınamadı.'
      if (error?.response?.data instanceof Blob) {
        try {
          const body = JSON.parse(await error.response.data.text())
          if (typeof body.detail === 'string') message = body.detail
        } catch { /* Keep the readable fallback for non-JSON responses. */ }
      }
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  const closePreview = () => {
    printPending.current = false
    setReady(false)
    setPreview(null)
  }

  return <>
    <Dropdown>
      <Dropdown.Toggle
        size="sm" variant="outline-primary" className={className}
        disabled={busy || !service?.id} title="A4 Servis Formu" aria-label="A4 Servis Formu"
      >
        {busy ? <Spinner size="sm" className="me-1" /> : <FaFilePdf className="me-1" />}
        {compact ? 'A4' : 'A4 Servis Formu'}
      </Dropdown.Toggle>
      <Dropdown.Menu align="end" popperConfig={{ strategy: 'fixed' }} style={{ zIndex: 1080 }}>
        <Dropdown.Item onClick={() => open('view')}><FaEye className="me-2" />Görüntüle</Dropdown.Item>
        <Dropdown.Item onClick={() => open('download')}><FaDownload className="me-2" />İndir</Dropdown.Item>
        <Dropdown.Item onClick={() => open('print')}><FaPrint className="me-2" />Yazdır</Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
    <Modal show={Boolean(preview)} onHide={closePreview} size="xl" centered>
      <Modal.Header closeButton><Modal.Title>A4 Servis Formu</Modal.Title></Modal.Header>
      <Modal.Body>
        {preview && <iframe
          ref={frameRef} src={preview.url} title="A4 servis formu PDF önizlemesi"
          style={{ width: '100%', height: '65vh', border: 0 }}
          onLoad={() => {
            setReady(true)
            if (printPending.current) {
              printPending.current = false
              printFile()
            }
          }}
        />}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-primary" onClick={() => saveFile(preview.url, preview.filename)} disabled={!preview}>
          <FaDownload className="me-1" />İndir
        </Button>
        <Button variant="primary" onClick={printFile} disabled={!ready}><FaPrint className="me-1" />Yazdır</Button>
        <Button variant="secondary" onClick={closePreview}>Kapat</Button>
      </Modal.Footer>
    </Modal>
  </>
}
