import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const viewsPath = path.resolve('backend/services/views.py')
const pdfPath = path.resolve('backend/services/pdf_utils.py')
const servicesPath = path.resolve('frontend/src/pages/Services/Services.jsx')

const viewsSource = fs.readFileSync(viewsPath, 'utf8').replace(/\r\n/g, '\n')
const pdfSource = fs.readFileSync(pdfPath, 'utf8').replace(/\r\n/g, '\n')
const servicesSource = fs.readFileSync(servicesPath, 'utf8').replace(/\r\n/g, '\n')

const whatsappFunctionMatch = viewsSource.match(
  /def _build_service_status_whatsapp_url[\s\S]*?(?=\n\ndef |\n\nclass )/
)
const whatsappFunction = whatsappFunctionMatch?.[0] || ''

const requiredMarkers = [
  [viewsSource, 'def _build_public_service_tracking_url(service, request=None):'],
  [viewsSource, 'build_public_service_token(service)'],
  [whatsappFunction, 'Servis Durumunuz {status_label} olarak değiştirildi.'],
  [whatsappFunction, 'Takip etmek için: {tracking_url}'],
  [whatsappFunction, 'request=None'],
  [viewsSource, "'whatsapp_status_url': _build_service_status_whatsapp_url("],
  [viewsSource, "'schedule_changed': True"],
  [viewsSource, 'def _build_service_pdf_filename(service):'],
  [viewsSource, 'filename*=UTF-8'],
  [pdfSource, 'from pathlib import Path'],
  [pdfSource, 'import reportlab'],
  [pdfSource, 'from reportlab.pdfbase import pdfmetrics'],
  [pdfSource, 'from reportlab.pdfbase.ttfonts import TTFont'],
  [pdfSource, '_font_registered = False'],
  [pdfSource, "pdfmetrics.registerFont(TTFont('ServiceTurkishFont'"],
  [servicesSource, 'confirmStatusWhatsAppNotification'],
  [servicesSource, "window.confirm('Müşteriye bilgi mesajı gönderilsin mi?')"],
  [servicesSource, "changedKey === 'service_status' && response?.data?.status_changed && response?.data?.whatsapp_status_url"],
  [servicesSource, "(changedKey === 'scheduled_date' || changedKey === 'scheduled_time') && response?.data?.schedule_changed && response?.data?.whatsapp_status_url"],
  [servicesSource, 'getPdfDownloadName(service)'],
  [servicesSource, "parseDownloadFilename(response?.headers?.['content-disposition'])"],
  [servicesSource, 'className="service-row-appointment-meta"'],
  [servicesSource, 'className="service-row-tech-select service-row-tech-select-full"'],
]

const forbiddenMarkers = [
  [whatsappFunction, 'servis durumunuz guncellendi'],
  [whatsappFunction, 'Fis No:'],
  [whatsappFunction, 'Yeni Durum:'],
  [whatsappFunction, 'Randevu:'],
  [whatsappFunction, 'Servis durumunuz:'],
  [whatsappFunction, 'Takip linki:'],
  [pdfSource, 'bos implementasyon'],
  [pdfSource, 'Helvetica ailesi kullaniliyor'],
  [servicesSource, "if (!technicianChanged && response?.data?.status_changed && response?.data?.whatsapp_status_url) {\n        openStatusWhatsApp(response.data.whatsapp_status_url)"],
  [servicesSource, "if (response?.data?.status_changed && response?.data?.whatsapp_status_url) {\n        openStatusWhatsApp(response.data.whatsapp_status_url)"],
  [servicesSource, 'className="service-row-tech-avatar"'],
  [servicesSource, '>Sil</Button>'],
]

const missing = requiredMarkers
  .filter(([source, marker]) => !source.includes(marker))
  .map(([, marker]) => marker)

const forbidden = forbiddenMarkers
  .filter(([source, marker]) => source.includes(marker))
  .map(([, marker]) => marker)

if (missing.length > 0 || forbidden.length > 0) {
  if (missing.length > 0) {
    console.error('Missing service communication markers:')
    for (const item of missing) console.error(`- ${item}`)
  }
  if (forbidden.length > 0) {
    console.error('Forbidden legacy communication markers:')
    for (const item of forbidden) console.error(`- ${item}`)
  }
  process.exit(1)
}

console.log('Service communication structure markers look correct.')
