import { useEffect, useMemo, useState, useRef } from 'react'
import { Badge, Button, Card, Col, Form, Modal, Row, Spinner, Image, Tabs, Tab, Table } from 'react-bootstrap'
import {
  FaCalendarAlt, FaCheck, FaClock, FaEdit, FaImage, FaPlus, FaTasks, FaTrash, FaUser, FaTools, FaFileContract
} from 'react-icons/fa'
import api from '../../api/api'
import toast from 'react-hot-toast'

const defaultTaskForm = {
  title: '', description: '', assigned_to: '', due_date: '',
  reminder_date: '', is_completed: false, source_identifier: ''
}

const defaultMaintenanceForm = {
  customer: '', device_type: '', device_brand: '', device_model: '',
  start_date: '', end_date: '', period_months: 6, technician: '', notes: '', is_active: true
}

function readApiError(error, fallback) {
  const data = error?.response?.data
  if (!data) return fallback
  if (typeof data.detail === 'string') return data.detail
  if (typeof data.error === 'string') return data.error
  if (typeof data === 'object') {
    const firstEntry = Object.entries(data).find(([, value]) => value)
    if (firstEntry && Array.isArray(firstEntry[1])) return String(firstEntry[1][0])
    if (firstEntry && typeof firstEntry[1] === 'string') return firstEntry[1]
  }
  return fallback
}

function formatShortDate(value, showTime=true) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('tr-TR', showTime ? { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' } : { day:'2-digit', month:'short', year:'numeric' })
}

const Planner = () => {
  const [activeTab, setActiveTab] = useState('tasks')
  
  // Data States
  const [tasks, setTasks] = useState([])
  const [maintenances, setMaintenances] = useState([])
  const [users, setUsers] = useState([])
  const [customers, setCustomers] = useState([])
  const [technicians, setTechnicians] = useState([])
  
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // TASK States
  const [taskFilter, setTaskFilter] = useState('pending') 
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [taskForm, setTaskForm] = useState(defaultTaskForm)
  const [imageFile, setImageFile] = useState(null)
  const fileInputRef = useRef(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // MAINTENANCE States
  const [maintFilter, setMaintFilter] = useState('active')
  const [showMaintModal, setShowMaintModal] = useState(false)
  const [editingMaintId, setEditingMaintId] = useState(null)
  const [maintForm, setMaintForm] = useState(defaultMaintenanceForm)

  const fetchData = async (silent = false) => {
    let ok = true
    if (!silent) setIsLoading(true)
    try {
      const [tRes, mRes, uRes, cRes, techRes] = await Promise.all([
        api.get('/planners/tasks/'),
        api.get('/planners/maintenances/'),
        api.get('/accounts/admin/users/').catch(() => ({ data: [] })),
        api.get('/customers/customer-list/').catch(() => ({ data: [] })),
        api.get('/technicians/technician-list/').catch(() => ({ data: [] }))
      ])
      setTasks(Array.isArray(tRes.data) ? tRes.data : [])
      setMaintenances(Array.isArray(mRes.data) ? mRes.data : [])
      setUsers(Array.isArray(uRes.data) ? uRes.data : [])
      setCustomers(Array.isArray(cRes.data) ? cRes.data : [])
      setTechnicians(Array.isArray(techRes.data) ? techRes.data : [])
    } catch (error) {
      ok = false
      toast.error(readApiError(error, 'Veriler yüklenirken hata oluştu.'))
    } finally {
      if (!silent) setIsLoading(false)
      setIsRefreshing(false)
    }
    return ok
  }

  useEffect(() => { fetchData() }, [])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    const ok = await fetchData(true)
    if (ok) toast.success('Veriler yenilendi.')
  }

  // --- TASK LOGIC ---
  const resetTaskForm = () => {
    setTaskForm(defaultTaskForm)
    setImageFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }
  const closeTaskModal = () => { setShowTaskModal(false); setEditingTaskId(null); setIsSubmitting(false); resetTaskForm() }
  const openTaskModal = (task = null) => {
    if (task) {
      setEditingTaskId(task.id)
      setTaskForm({
        title: task.title || '', description: task.description || '', assigned_to: task.assigned_to || '',
        due_date: task.due_date ? task.due_date.substring(0, 16) : '',
        reminder_date: task.reminder_date ? task.reminder_date.substring(0, 16) : '',
        is_completed: Boolean(task.is_completed),
        source_identifier: task.source_identifier || ''
      })
    } else {
      setEditingTaskId(null)
      resetTaskForm()
    }
    setShowTaskModal(true)
  }

  const handleTaskSubmit = async (e) => {
    e.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)
    const payload = new FormData()
    payload.append('title', taskForm.title)
    if (taskForm.description) payload.append('description', taskForm.description)
    if (taskForm.assigned_to) payload.append('assigned_to', taskForm.assigned_to)
    if (taskForm.due_date) payload.append('due_date', new Date(taskForm.due_date).toISOString())
    if (taskForm.reminder_date) payload.append('reminder_date', new Date(taskForm.reminder_date).toISOString())
    if (taskForm.source_identifier) payload.append('source_identifier', taskForm.source_identifier)
    payload.append('is_completed', taskForm.is_completed)
    if (imageFile) payload.append('image', imageFile)

    try {
      if (editingTaskId) {
        await api.patch(`/planners/tasks/${editingTaskId}/`, payload, { headers: { 'Content-Type': 'multipart/form-data' } })
        toast.success('Görev güncellendi.')
      } else {
        await api.post('/planners/tasks/', payload, { headers: { 'Content-Type': 'multipart/form-data' } })
        toast.success('Yeni görev eklendi.')
      }
      closeTaskModal()
      fetchData(true)
    } catch (error) { toast.error(readApiError(error, 'İşlem başarısız.')); setIsSubmitting(false) }
  }

  const handleTaskAction = async (id, action='delete') => {
    if (action === 'delete') {
      if (!window.confirm('Emin misiniz?')) return
      try { await api.delete(`/planners/tasks/${id}/`); toast.success('Silindi.'); fetchData(true) } catch(e) { toast.error('Silinemedi') }
    } else if (action === 'toggle') {
      const t = tasks.find(x => x.id === id)
      try { await api.patch(`/planners/tasks/${id}/`, { is_completed: !t.is_completed }); toast.success('Durum değişti.'); fetchData(true) } catch(e) { toast.error('Hata!') }
    }
  }

  // --- MAINTENANCE LOGIC ---
  const resetMaintForm = () => setMaintForm(defaultMaintenanceForm)
  const closeMaintModal = () => { setShowMaintModal(false); setEditingMaintId(null); setIsSubmitting(false); resetMaintForm() }
  const openMaintModal = (maint = null) => {
    if(maint) {
      setEditingMaintId(maint.id)
      setMaintForm({
        customer: maint.customer || '', device_type: maint.device_type || '', device_brand: maint.device_brand || '',
        device_model: maint.device_model || '', start_date: maint.start_date || '', end_date: maint.end_date || '',
        period_months: maint.period_months || 6, technician: maint.technician || '', notes: maint.notes || '', is_active: maint.is_active
      })
    } else {
      setEditingMaintId(null)
      resetMaintForm()
    }
    setShowMaintModal(true)
  }

  const handleMaintSubmit = async (e) => {
    e.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      const payload = { ...maintForm, technician: maintForm.technician || null }
      if (editingMaintId) {
        await api.patch(`/planners/maintenances/${editingMaintId}/`, payload)
        toast.success('Sözleşme güncellendi.')
      } else {
        await api.post('/planners/maintenances/', payload)
        toast.success('Sözleşme eklendi.')
      }
      closeMaintModal()
      fetchData(true)
    } catch (e) { toast.error(readApiError(e, 'Kayıt başarısız.')); setIsSubmitting(false) }
  }

  const handleMaintDelete = async (id) => {
    if(!window.confirm('Bu sözleşmeyi silmek istediğinize emin misiniz?')) return
    try { await api.delete(`/planners/maintenances/${id}/`); toast.success('Silindi.'); fetchData(true) } catch(e) { toast.error('Silinemedi') }
  }


  // --- COMPUTED DATA ---
  const activeUsers = useMemo(() => users.filter(u => u.is_active), [users])
  const activeTechs = useMemo(() => users.filter(u => u.is_active && u.user_type === 'technician'), [users])

  const { overdueTasks, todayTasks, pendingTasks, completedTasks } = useMemo(() => {
    const todayStr = new Date().toDateString(); const now = new Date()
    const completed = tasks.filter(t => t.is_completed); const incomplete = tasks.filter(t => !t.is_completed)
    const overdue = incomplete.filter(t => t.due_date && new Date(t.due_date) < now && new Date(t.due_date).toDateString() !== todayStr)
    const today = incomplete.filter(t => t.due_date && new Date(t.due_date).toDateString() === todayStr)
    const pending = incomplete.filter(t => !t.due_date || (new Date(t.due_date) >= now || new Date(t.due_date).toDateString() === todayStr))
    return { overdueTasks: overdue, todayTasks: today, pendingTasks: pending, completedTasks: completed }
  }, [tasks])

  const displayedTasks = useMemo(() => {
    if (taskFilter === 'all') return tasks
    if (taskFilter === 'overdue') return overdueTasks
    if (taskFilter === 'today') return todayTasks
    if (taskFilter === 'completed') return completedTasks
    return pendingTasks
  }, [tasks, taskFilter, overdueTasks, todayTasks, completedTasks, pendingTasks])

  const displayedMaintenances = useMemo(() => {
    return maintFilter === 'active' ? maintenances.filter(m => m.is_active) : maintenances.filter(m => !m.is_active)
  }, [maintenances, maintFilter])

  return (
    <div>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <h3 className="fw-bold m-0 text-light">
          <FaTasks className="me-2 text-primary" /> Bakım ve Görev Planlayıcısı
        </h3>
        <div className="d-flex gap-2">
          <Button variant="outline-light" onClick={handleRefresh} disabled={isRefreshing}>
            {isRefreshing ? <Spinner size="sm" animation="border" className="me-2" /> : null} Yenile
          </Button>
          <Button variant="primary" onClick={() => activeTab === 'tasks' ? openTaskModal() : openMaintModal()}>
            <FaPlus className="me-1" /> {activeTab === 'tasks' ? 'Görev Ekle' : 'Sözleşme Ekle'}
          </Button>
        </div>
      </div>

      <Card className="border-0 shadow-sm rounded-3">
        <Card.Header className="bg-white border-bottom-0 pb-0 pt-3 px-3">
          <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="custom-tabs border-bottom">
            <Tab eventKey="tasks" title={<><FaTasks className="me-2"/>Görevler (Kanban)</>} />
            <Tab eventKey="maintenances" title={<><FaFileContract className="me-2"/>Bakım Sözleşmeleri</>} />
          </Tabs>
        </Card.Header>
        <Card.Body className="p-4 bg-light">
          {isLoading ? (
            <div className="text-center p-5"><Spinner animation="border" variant="primary" /></div>
          ) : activeTab === 'tasks' ? (
            // TASKS VIEW
            <>
              <Row className="g-3 mb-4">
                <Col lg={2} md={4} sm={6}>
                  <Card onClick={() => setTaskFilter('all')} className="border-0 shadow-sm rounded-3 h-100 p-3" style={{ borderLeft: '4px solid #2196F3', cursor: 'pointer', opacity: taskFilter === 'all' ? 1 : 0.6, transform: taskFilter === 'all' ? 'scale(1.02)' : 'scale(1)' }}>
                    <div className="text-muted fw-bold mb-1" style={{ fontSize: '0.8rem' }}>TÜMÜ</div><h3 className="fw-bold m-0">{tasks.length}</h3>
                  </Card>
                </Col>
                <Col lg={2} md={4} sm={6}>
                  <Card onClick={() => setTaskFilter('pending')} className="border-0 shadow-sm rounded-3 h-100 p-3" style={{ borderLeft: '4px solid #FF9800', cursor: 'pointer', opacity: taskFilter === 'pending' ? 1 : 0.6, transform: taskFilter === 'pending' ? 'scale(1.02)' : 'scale(1)' }}>
                    <div className="text-muted fw-bold mb-1" style={{ fontSize: '0.8rem' }}>BEKLEYEN</div><h3 className="fw-bold m-0 text-warning">{pendingTasks.length}</h3>
                  </Card>
                </Col>
                <Col lg={2} md={4} sm={6}>
                  <Card onClick={() => setTaskFilter('today')} className="border-0 shadow-sm rounded-3 h-100 p-3" style={{ borderLeft: '4px solid #9C27B0', cursor: 'pointer', opacity: taskFilter === 'today' ? 1 : 0.6, transform: taskFilter === 'today' ? 'scale(1.02)' : 'scale(1)' }}>
                    <div className="text-muted fw-bold mb-1" style={{ fontSize: '0.8rem' }}>BUGÜN</div><h3 className="fw-bold m-0" style={{ color: '#9C27B0' }}>{todayTasks.length}</h3>
                  </Card>
                </Col>
                <Col lg={3} md={6}>
                  <Card onClick={() => setTaskFilter('overdue')} className="border-0 shadow-sm rounded-3 h-100 p-3" style={{ borderLeft: '4px solid #dc3545', cursor: 'pointer', opacity: taskFilter === 'overdue' ? 1 : 0.6, transform: taskFilter === 'overdue' ? 'scale(1.02)' : 'scale(1)' }}>
                    <div className="text-muted fw-bold mb-1" style={{ fontSize: '0.8rem' }}>GECİKMİŞ</div><h3 className="fw-bold m-0 text-danger">{overdueTasks.length}</h3>
                  </Card>
                </Col>
                <Col lg={3} md={6}>
                  <Card onClick={() => setTaskFilter('completed')} className="border-0 shadow-sm rounded-3 h-100 p-3" style={{ borderLeft: '4px solid #4CAF50', cursor: 'pointer', opacity: taskFilter === 'completed' ? 1 : 0.6, transform: taskFilter === 'completed' ? 'scale(1.02)' : 'scale(1)' }}>
                    <div className="text-muted fw-bold mb-1" style={{ fontSize: '0.8rem' }}>TAMAMLANAN</div><h3 className="fw-bold m-0 text-success">{completedTasks.length}</h3>
                  </Card>
                </Col>
              </Row>

              {displayedTasks.length === 0 ? <Card className="border-0 shadow-sm rounded-3 p-5 text-center text-muted bg-white">Görev bulunamadı.</Card> : (
                <Row className="g-3">
                  {displayedTasks.map(task => (
                    <Col xl={3} lg={4} md={6} sm={12} key={task.id}>
                      <Card className="h-100 border-0 shadow-sm rounded-3 overflow-hidden task-card" style={{ transition: 'all 0.2s', borderTop: `4px solid ${task.is_completed ? '#4CAF50' : (task.due_date && new Date(task.due_date) < new Date() ? '#dc3545' : '#FF9800')}` }}>
                        {task.image && (<div style={{ height: '140px', overflow: 'hidden' }}><Image src={task.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>)}
                        <Card.Body className="d-flex flex-column p-3">
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <h6 className="fw-bold text-dark m-0 pe-2" style={{ lineHeight: '1.4' }}>{task.title}</h6>
                            <Badge bg={task.is_completed ? 'success' : 'warning'} className={task.is_completed ? '' : 'text-dark'} style={{ cursor: 'pointer' }} onClick={(e) => {e.stopPropagation(); handleTaskAction(task.id, 'toggle')}}>
                              {task.is_completed ? <FaCheck /> : <FaClock />}
                            </Badge>
                          </div>
                          {task.description && <p className="text-muted mb-2" style={{ fontSize: '0.85rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{task.description}</p>}
                          {task.source_identifier && <div className="mb-2"><Badge bg="seçondary" style={{fontSize: '0.7rem'}}><FaTools className="me-1"/>{task.source_identifier}</Badge></div>}
                          
                          <div className="mt-auto d-flex flex-column gap-2 text-muted" style={{ fontSize: '0.8rem' }}>
                            {task.assigned_user_name && <div><FaUser className="me-2 text-primary" />{task.assigned_user_name}</div>}
                            {task.due_date && <div className={(new Date(task.due_date) < new Date() && !task.is_completed) ? 'text-danger fw-bold' : ''}><FaCalendarAlt className="me-2" />Teslim: {formatShortDate(task.due_date)}</div>}
                            {task.reminder_date && <div><FaClock className="me-2 text-info" />Hatırlatma: {formatShortDate(task.reminder_date)}</div>}
                          </div>
                        </Card.Body>
                        <Card.Footer className="bg-white border-top-0 p-3 pt-0 d-flex justify-content-end gap-2">
                          <Button variant="light" size="sm" className="text-primary border" onClick={() => openTaskModal(task)}><FaEdit /></Button>
                          <Button variant="light" size="sm" className="text-danger border" onClick={() => handleTaskAction(task.id, 'delete')}><FaTrash /></Button>
                        </Card.Footer>
                      </Card>
                    </Col>
                  ))}
                </Row>
              )}
            </>
          ) : (
            // MAINTENANCES VIEW
            <>
               <div className="mb-3">
                 <Button variant={maintFilter === 'active' ? 'primary' : 'outline-primary'} size="sm" className="me-2" onClick={() => setMaintFilter('active')}>Aktif Sözleşmeler</Button>
                 <Button variant={maintFilter === 'passive' ? 'seçondary' : 'outline-seçondary'} size="sm" onClick={() => setMaintFilter('passive')}>Pasif/Biten Sözleşmeler</Button>
               </div>
               {displayedMaintenances.length === 0 ? <Card className="border-0 shadow-sm rounded-3 p-5 text-center text-muted bg-white">Sözleşme kaydı bulunamadı.</Card> : (
                 <div className="table-responsive bg-white rounded-3 shadow-sm">
                   <Table hover className="m-0 align-middle">
                     <thead className="bg-light">
                       <tr>
                         <th className="px-4 py-3">Müşteri</th>
                         <th>Cihaz</th>
                         <th>Bşl. Tarihi</th>
                         <th>Bitiş Tarihi</th>
                         <th>Periyot</th>
                         <th>Teknisyen</th>
                         <th className="text-end px-4">İşlemler</th>
                       </tr>
                     </thead>
                     <tbody>
                       {displayedMaintenances.map(m => (
                         <tr key={m.id}>
                           <td className="px-4 fw-medium">{m.customer_name}</td>
                           <td>{m.device_brand} {m.device_model} <div className="text-muted" style={{fontSize: '0.8rem'}}>{m.device_type}</div></td>
                           <td>{formatShortDate(m.start_date, false)}</td>
                           <td>{formatShortDate(m.end_date, false)}</td>
                           <td>{m.period_months} Ay</td>
                           <td>{m.technician_name || '-'}</td>
                           <td className="text-end px-4">
                             <Button variant="light" size="sm" className="me-2 border text-primary" onClick={() => openMaintModal(m)}><FaEdit/></Button>
                             <Button variant="light" size="sm" className="border text-danger" onClick={() => handleMaintDelete(m.id)}><FaTrash/></Button>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </Table>
                 </div>
               )}
            </>
          )}
        </Card.Body>
      </Card>

      {/* TASK MODAL */}
      <Modal show={showTaskModal} onHide={closeTaskModal} backdrop="static" size="lg">
        <Form onSubmit={handleTaskSubmit}>
          <Modal.Header closeButton><Modal.Title>{editingTaskId ? 'Görev Düzenle' : 'Yeni Görev Ekle'}</Modal.Title></Modal.Header>
          <Modal.Body className="px-4 py-3">
             <Row className="g-3">
               <Col md={8}><Form.Group><Form.Label className="fw-semibold">Başlık *</Form.Label><Form.Control required name="title" value={taskForm.title} onChange={e=>setTaskForm({...taskForm, title:e.target.value})} /></Form.Group></Col>
               <Col md={4}>
                  <Form.Group>
                    <Form.Label className="fw-semibold">Atanacak Kişi</Form.Label>
                    <Form.Select name="assigned_to" value={taskForm.assigned_to} onChange={e=>setTaskForm({...taskForm, assigned_to:e.target.value})}>
                      <option value="">Kendime / Atanmamış</option>
                      {activeUsers.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
                    </Form.Select>
                  </Form.Group>
               </Col>
               <Col md={12}><Form.Group><Form.Label className="fw-semibold">Açıklama</Form.Label><Form.Control as="textarea" rows={3} name="description" value={taskForm.description} onChange={e=>setTaskForm({...taskForm, description:e.target.value})} /></Form.Group></Col>
               <Col md={6}><Form.Group><Form.Label className="fw-semibold">Son Teslim Tarihi</Form.Label><Form.Control type="datetime-local" name="due_date" value={taskForm.due_date} onChange={e=>setTaskForm({...taskForm, due_date:e.target.value})} /></Form.Group></Col>
               <Col md={6}><Form.Group><Form.Label className="fw-semibold">Hatırlatma Tarihi</Form.Label><Form.Control type="datetime-local" name="reminder_date" value={taskForm.reminder_date} onChange={e=>setTaskForm({...taskForm, reminder_date:e.target.value})} /></Form.Group></Col>
               <Col md={6}><Form.Group><Form.Label className="fw-semibold">Kaynak İzleyici</Form.Label><Form.Control type="text" name="source_identifier" value={taskForm.source_identifier} onChange={e=>setTaskForm({...taskForm, source_identifier:e.target.value})} placeholder="Örn: BKM-01" /></Form.Group></Col>
               <Col md={6}><Form.Group><Form.Label className="fw-semibold">Fotoğraf Gerekli mi?</Form.Label><Form.Control type="file" accept="image/*" ref={fileInputRef} onChange={e => setImageFile(e.target.files[0])} /></Form.Group></Col>
               <Col md={12} className="mt-3"><Form.Check type="switch" label="Görev Tamamlandı" checked={taskForm.is_completed} onChange={e=>setTaskForm({...taskForm, is_completed:e.target.checked})} className="fw-bold text-success fs-5" /></Col>
             </Row>
          </Modal.Body>
          <Modal.Footer><Button variant="seçondary" onClick={closeTaskModal}>İptal</Button><Button variant="primary" type="submit" disabled={isSubmitting}>{isSubmitting ? <Spinner size="sm" animation="border" /> : 'Kaydet'}</Button></Modal.Footer>
        </Form>
      </Modal>

      {/* MAINTENANCE MODAL */}
      <Modal show={showMaintModal} onHide={closeMaintModal} backdrop="static" size="lg">
        <Form onSubmit={handleMaintSubmit}>
          <Modal.Header closeButton><Modal.Title>{editingMaintId ? 'Sözleşme Düzenle' : 'Yeni Bakım Sözleşmesi'}</Modal.Title></Modal.Header>
          <Modal.Body className="px-4 py-3">
            <Row className="g-3">
              <Col md={6}>
                 <Form.Group>
                    <Form.Label className="fw-semibold">Müşteri *</Form.Label>
                    <Form.Select required name="customer" value={maintForm.customer} onChange={e=>setMaintForm({...maintForm, customer:e.target.value})}>
                      <option value="">Seçiniz</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.customer_name || c.first_name}</option>)}
                    </Form.Select>
                 </Form.Group>
              </Col>
              <Col md={6}>
                 <Form.Group>
                    <Form.Label className="fw-semibold">Sorumlu Teknisyen</Form.Label>
                    <Form.Select name="technician" value={maintForm.technician} onChange={e=>setMaintForm({...maintForm, technician:e.target.value})}>
                      <option value="">Atanmamış</option>
                      {technicians.map(t => <option key={t.id} value={t.id}>{t.user?.full_name || t.user?.email || 'Bilinmeyen Teknisyen'}</option>)}
                    </Form.Select>
                 </Form.Group>
              </Col>
              <Col md={4}><Form.Group><Form.Label className="fw-semibold">Cihaz Türü</Form.Label><Form.Control name="device_type" value={maintForm.device_type} onChange={e=>setMaintForm({...maintForm, device_type:e.target.value})} /></Form.Group></Col>
              <Col md={4}><Form.Group><Form.Label className="fw-semibold">Marka</Form.Label><Form.Control name="device_brand" value={maintForm.device_brand} onChange={e=>setMaintForm({...maintForm, device_brand:e.target.value})} /></Form.Group></Col>
              <Col md={4}><Form.Group><Form.Label className="fw-semibold">Model</Form.Label><Form.Control name="device_model" value={maintForm.device_model} onChange={e=>setMaintForm({...maintForm, device_model:e.target.value})} /></Form.Group></Col>
              <Col md={4}><Form.Group><Form.Label className="fw-semibold">Başlangıç Tarihi *</Form.Label><Form.Control type="date" required name="start_date" value={maintForm.start_date} onChange={e=>setMaintForm({...maintForm, start_date:e.target.value})} /></Form.Group></Col>
              <Col md={4}><Form.Group><Form.Label className="fw-semibold">Bitiş Tarihi *</Form.Label><Form.Control type="date" required name="end_date" value={maintForm.end_date} onChange={e=>setMaintForm({...maintForm, end_date:e.target.value})} /></Form.Group></Col>
              <Col md={4}><Form.Group><Form.Label className="fw-semibold">Bakım Periyodu (Ay)</Form.Label><Form.Control type="number" required name="period_months" value={maintForm.period_months} onChange={e=>setMaintForm({...maintForm, period_months:e.target.value})} min={1} /></Form.Group></Col>
              <Col md={12}><Form.Group><Form.Label className="fw-semibold">Notlar</Form.Label><Form.Control as="textarea" rows={2} name="notes" value={maintForm.notes} onChange={e=>setMaintForm({...maintForm, notes:e.target.value})} /></Form.Group></Col>
              <Col md={12}><Form.Check type="switch" label="Aktif Sözleşme" checked={maintForm.is_active} onChange={e=>setMaintForm({...maintForm, is_active:e.target.checked})} className="fw-bold fs-6 mt-2" /></Col>
            </Row>
          </Modal.Body>
          <Modal.Footer><Button variant="seçondary" onClick={closeMaintModal}>İptal</Button><Button variant="primary" type="submit" disabled={isSubmitting}>{isSubmitting ? <Spinner size="sm" animation="border" /> : 'Kaydet'}</Button></Modal.Footer>
        </Form>
      </Modal>

      <style>{`
        .task-card:hover { transform: translateY(-5px); box-shadow: 0 .5rem 1rem rgba(0,0,0,.15)!important; }
        .custom-tabs .nav-link { color: #6c757d; font-weight: 600; padding: 1rem 1.5rem; border: none; border-bottom: 3px solid transparent; }
        .custom-tabs .nav-link:hover { border-color: #e9ecef; }
        .custom-tabs .nav-link.active { color: #2196F3; border-bottom-color: #2196F3; background: transparent; }
      `}</style>
    </div>
  )
}

export default Planner
