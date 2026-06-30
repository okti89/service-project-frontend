import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Form, Button, Spinner, Table, Modal, Badge } from 'react-bootstrap';
import {
  FaCog, FaSave, FaBuilding, FaClock, FaCalendarAlt,
  FaPlus, FaTrash, FaEdit, FaPhone, FaEnvelope,
  FaGlobe, FaMapMarkerAlt, FaImage
} from 'react-icons/fa';
import { useConfig } from '../../context/ConfigContext';
import toast from 'react-hot-toast';

const DAY_LABELS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

const Settings = () => {
  const {
    config, workingHours, holidayExceptions, loading,
    saveConfig, saveWorkingHour, createWorkingHour, refreshConfig,
    createHolidayException, saveHolidayException, deleteHolidayException,
    refreshHolidayExceptions
  } = useConfig();

  // Company form state
  const [companyForm, setCompanyForm] = useState({
    name: '',
    phone_number: '',
    email: '',
    address: '',
    panel_url: '',
    max_users: 10,
    tenant_code: '',
  });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [savingCompany, setSavingCompany] = useState(false);

  // Working hours local state
  const [localHours, setLocalHours] = useState([]);
  const [savingHours, setSavingHours] = useState(false);

  // Holiday modal state
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [holidayForm, setHolidayForm] = useState({
    title: '', start_date: '', end_date: '', is_half_day: false, note: ''
  });
  const [savingHoliday, setSavingHoliday] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState('company');

  // Sync config to form
  useEffect(() => {
    if (config?.id) {
      setCompanyForm({
        name: config.name || '',
        phone_number: config.phone_number || '',
        email: config.email || '',
        address: config.address || '',
        panel_url: config.panel_url || '',
        max_users: config.max_users ?? 10,
        tenant_code: config.tenant_code || '',
      });
      setLogoPreview(config.logo || null);
    }
  }, [config]);

  // Sync working hours
  useEffect(() => {
    if (workingHours.length > 0) {
      setLocalHours(workingHours.map(h => ({ ...h })));
    } else if (config?.id) {
      const defaults = [];
      for (let i = 0; i < 7; i++) {
        defaults.push({
          company: config.id,
          day_of_week: i,
          start_time: i >= 5 ? '00:00' : '08:30',
          end_time: i >= 5 ? '00:00' : '18:00',
          is_holiday: i >= 5
        });
      }
      setLocalHours(defaults);
    }
  }, [workingHours, config]);

  // Company save
  const handleSaveCompany = async (e) => {
    e.preventDefault();
    setSavingCompany(true);
    try {
      const payload = new FormData();
      Object.entries(companyForm).forEach(([key, val]) => {
        if (val !== null && val !== undefined) payload.append(key, val);
      });
      if (logoFile) payload.append('logo', logoFile);

      await saveConfig(payload);
      toast.success('Firma bilgileri kaydedildi.');
      setLogoFile(null);
    } catch (error) {
      console.error('Firma kayıt hatası:', error);
      toast.error('Firma bilgileri kaydedilemedi.');
    } finally {
      setSavingCompany(false);
    }
  };

  const handleLogoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setLogoFile(e.target.files[0]);
      setLogoPreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  // Working hours save
  const handleLocalHourChange = (index, field, value) => {
    setLocalHours(prev => prev.map((h, i) => i === index ? { ...h, [field]: value } : h));
  };

  const handleSaveWorkingHours = async () => {
    setSavingHours(true);
    try {
      for (const hour of localHours) {
        if (hour.id) {
          await saveWorkingHour(hour.id, {
            start_time: hour.start_time,
            end_time: hour.end_time,
            is_holiday: hour.is_holiday
          });
        } else {
          await createWorkingHour({
            company: config.id,
            day_of_week: hour.day_of_week,
            start_time: hour.start_time,
            end_time: hour.end_time,
            is_holiday: hour.is_holiday
          });
        }
      }
      toast.success('Çalışma saatleri güncellendi.');
      refreshConfig();
    } catch (error) {
      toast.error('Çalışma saatleri kaydedilemedi.');
    } finally {
      setSavingHours(false);
    }
  };

  // Holiday CRUD
  const openHolidayModal = (holiday = null) => {
    if (holiday) {
      setEditingHoliday(holiday.id);
      setHolidayForm({
        title: holiday.title || '',
        start_date: holiday.start_date || '',
        end_date: holiday.end_date || '',
        is_half_day: holiday.is_half_day || false,
        note: holiday.note || ''
      });
    } else {
      setEditingHoliday(null);
      setHolidayForm({ title: '', start_date: '', end_date: '', is_half_day: false, note: '' });
    }
    setShowHolidayModal(true);
  };

  const handleSaveHoliday = async (e) => {
    e.preventDefault();
    setSavingHoliday(true);
    try {
      const payload = { ...holidayForm, company: config.id };
      if (!payload.end_date) payload.end_date = payload.start_date;

      if (editingHoliday) {
        await saveHolidayException(editingHoliday, payload);
        toast.success('Tatil güncellendi.');
      } else {
        await createHolidayException(payload);
        toast.success('Tatil eklendi.');
      }
      setShowHolidayModal(false);
      refreshHolidayExceptions();
    } catch (error) {
      toast.error('Tatil kaydedilemedi.');
    } finally {
      setSavingHoliday(false);
    }
  };

  const handleDeleteHoliday = async (id) => {
    if (!window.confirm('Bu tatil kaydını silmek istediğinize emin misiniz?')) return;
    try {
      await deleteHolidayException(id);
      toast.success('Tatil silindi.');
    } catch (error) {
      toast.error('Silinemedi.');
    }
  };

  if (loading) {
    return (
      <div className="text-center p-5">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  const tabs = [
    { key: 'company', label: 'Firma Bilgileri', icon: <FaBuilding className="me-2" /> },
    { key: 'hours', label: 'Çalışma Saatleri', icon: <FaClock className="me-2" /> },
    { key: 'holidays', label: 'Tatil & İstisnalar', icon: <FaCalendarAlt className="me-2" /> },
  ];

  return (
    <div>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <h3 className="fw-bold m-0 text-light">
          <FaCog className="me-2 text-primary" /> Ayarlar
        </h3>
      </div>

      {/* Tab Navigation */}
      <div className="d-flex gap-2 mb-4 flex-wrap">
        {tabs.map(tab => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? 'primary' : 'outline-light'}
            className="d-flex align-items-center px-4 py-2 fw-semibold"
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.icon}{tab.label}
          </Button>
        ))}
      </div>

      {/* Company Info Tab */}
      {activeTab === 'company' && (
        <Card className="border-0 shadow-sm rounded-3">
          <Card.Header className="bg-white border-bottom px-4 py-3">
            <h5 className="fw-bold m-0"><FaBuilding className="me-2 text-primary" />Firma Bilgileri</h5>
          </Card.Header>
          <Card.Body className="p-4">
            <Form onSubmit={handleSaveCompany}>
              <Row className="mb-4 g-4">
                <Col md={8}>
                  <Row className="g-3">
                    <Col md={12}>
                      <Form.Group>
                        <Form.Label className="fw-semibold mb-1">Firma Adı *</Form.Label>
                        <Form.Control
                          required type="text" value={companyForm.name}
                          onChange={e => setCompanyForm({ ...companyForm, name: e.target.value })}
                          placeholder="Firma adınızı girin"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="fw-semibold mb-1"><FaPhone className="me-1 text-muted" />Telefon</Form.Label>
                        <Form.Control
                          type="text" value={companyForm.phone_number}
                          onChange={e => setCompanyForm({ ...companyForm, phone_number: e.target.value })}
                          placeholder="0 (5XX) XXX XX XX"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="fw-semibold mb-1"><FaEnvelope className="me-1 text-muted" />E-posta</Form.Label>
                        <Form.Control
                          type="email" value={companyForm.email}
                          onChange={e => setCompanyForm({ ...companyForm, email: e.target.value })}
                          placeholder="info@firmaniz.com"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="fw-semibold mb-1"><FaGlobe className="me-1 text-muted" />Yönetim Panel URL</Form.Label>
                        <Form.Control
                          type="url" value={companyForm.panel_url}
                          onChange={e => setCompanyForm({ ...companyForm, panel_url: e.target.value })}
                          placeholder="https://panel.firmaniz.com"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="fw-semibold mb-1"><FaMapMarkerAlt className="me-1 text-muted" />Adres</Form.Label>
                        <Form.Control
                          type="text" value={companyForm.address}
                          onChange={e => setCompanyForm({ ...companyForm, address: e.target.value })}
                          placeholder="Firma adresi"
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="fw-semibold mb-1"><FaImage className="me-1 text-muted" />Firma Logosu</Form.Label>
                    <div className="text-center p-3 border rounded-3 bg-light">
                      {logoPreview ? (
                        <img src={logoPreview} alt="Logo" className="img-fluid mb-2 rounded" style={{ maxHeight: '120px', objectFit: 'contain' }} />
                      ) : (
                        <div className="text-muted py-4">
                          <FaImage size={40} className="opacity-25 mb-2 d-block mx-auto" />
                          <small>Logo yüklenmedi</small>
                        </div>
                      )}
                      <Form.Control type="file" accept="image/*" onChange={handleLogoChange} className="mt-2" size="sm" />
                    </div>
                  </Form.Group>
                </Col>
              </Row>

              <hr className="my-4" />
              <h6 className="fw-bold text-primary mb-3">
                <FaCog className="me-2" />Sistem Ayarları
              </h6>
              <Row className="g-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="fw-semibold mb-1">Tenant (Firma) Kodu</Form.Label>
                    <Form.Control
                      type="text"
                      value={companyForm.tenant_code}
                      onChange={e => setCompanyForm({ ...companyForm, tenant_code: e.target.value.toLowerCase() })}
                      placeholder="örn: abc-firma"
                    />
                    <Form.Text className="text-muted">
                      İstemcilerin bu firmaya ulaşması için kullanılan kod.
                    </Form.Text>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="fw-semibold mb-1">Maks. Kullanıcı Sayısı</Form.Label>
                    <Form.Control
                      type="number" min={1}
                      value={companyForm.max_users}
                      readOnly
                      plaintext
                      disabled
                    />
                    <Form.Text className="text-muted">
                      Aktif: <strong>{config.active_users_count ?? 0}</strong> · Kalan: <strong>{config.remaining_users ?? 0}</strong>
                    </Form.Text>
                  </Form.Group>
                </Col>
              </Row>
              <div className="text-end border-top pt-3">
                <Button variant="primary" type="submit" disabled={savingCompany} className="px-4">
                  {savingCompany ? <Spinner animation="border" size="sm" /> : <><FaSave className="me-2" />Kaydet</>}
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      )}

      {/* Working Hours Tab */}
      {activeTab === 'hours' && (
        <Card className="border-0 shadow-sm rounded-3">
          <Card.Header className="bg-white border-bottom px-4 py-3 d-flex justify-content-between align-items-center">
            <h5 className="fw-bold m-0"><FaClock className="me-2 text-primary" />Haftalık Çalışma Saatleri</h5>
            <Button variant="primary" onClick={handleSaveWorkingHours} disabled={savingHours || localHours.length === 0} className="px-4">
              {savingHours ? <Spinner animation="border" size="sm" /> : <><FaSave className="me-2" />Tümünü Kaydet</>}
            </Button>
          </Card.Header>
          <Card.Body className="p-0">
            {localHours.length === 0 ? (
              <div className="text-center text-muted py-5">
                Henüz çalışma saati tanımlı değil. Önce firma bilgilerini kaydedin.
              </div>
            ) : (
              <Table hover className="m-0 align-middle">
                <thead className="bg-light">
                  <tr>
                    <th className="px-4 py-3">Gün</th>
                    <th className="py-3 text-center">Mesai Başlangıç</th>
                    <th className="py-3 text-center">Mesai Bitiş</th>
                    <th className="py-3 text-center">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {localHours.map((hour, index) => {
                    const isWeekend = hour.day_of_week >= 5;
                    return (
                      <tr key={hour.id} className={hour.is_holiday ? 'table-secondary' : ''}>
                        <td className="px-4">
                          <span className="fw-semibold">{DAY_LABELS[hour.day_of_week]}</span>
                          {isWeekend && <Badge bg="warning" text="dark" className="ms-2" style={{ fontSize: '0.7rem' }}>Hafta Sonu</Badge>}
                        </td>
                        <td className="text-center" style={{ width: '200px' }}>
                          <Form.Control
                            type="time" value={hour.start_time || '08:30'}
                            onChange={e => handleLocalHourChange(index, 'start_time', e.target.value)}
                            disabled={hour.is_holiday}
                            className="d-inline-block text-center"
                            style={{ maxWidth: '140px' }}
                          />
                        </td>
                        <td className="text-center" style={{ width: '200px' }}>
                          <Form.Control
                            type="time" value={hour.end_time || '18:00'}
                            onChange={e => handleLocalHourChange(index, 'end_time', e.target.value)}
                            disabled={hour.is_holiday}
                            className="d-inline-block text-center"
                            style={{ maxWidth: '140px' }}
                          />
                        </td>
                        <td className="text-center" style={{ width: '160px' }}>
                          <div className="form-check form-switch d-flex flex-column align-items-center m-0">
                            <input
                              className="form-check-input m-0 mb-1"
                              type="checkbox"
                              checked={!hour.is_holiday}
                              onChange={e => handleLocalHourChange(index, 'is_holiday', !e.target.checked)}
                              style={{ cursor: 'pointer', transform: 'scale(1.2)' }}
                            />
                            <small className={`fw-bold text-${hour.is_holiday ? 'danger' : 'success'}`} style={{ fontSize: '0.75rem' }}>
                              {hour.is_holiday ? 'Tatil' : 'Çalışıyor'}
                            </small>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>
      )}

      {/* Holidays Tab */}
      {activeTab === 'holidays' && (
        <Card className="border-0 shadow-sm rounded-3">
          <Card.Header className="bg-white border-bottom px-4 py-3 d-flex justify-content-between align-items-center">
            <h5 className="fw-bold m-0"><FaCalendarAlt className="me-2 text-primary" />Tatil & İstisnalar</h5>
            <Button variant="primary" onClick={() => openHolidayModal()} disabled={!config?.id}>
              <FaPlus className="me-1" /> Tatil Ekle
            </Button>
          </Card.Header>
          <Card.Body className="p-0">
            {holidayExceptions.length === 0 ? (
              <div className="text-center text-muted py-5">
                Henüz tanımlı tatil veya istisna yok.
              </div>
            ) : (
              <Table hover className="m-0 align-middle">
                <thead className="bg-light">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="py-3">Açıklama</th>
                    <th className="py-3 text-center">Başlangıç</th>
                    <th className="py-3 text-center">Bitiş</th>
                    <th className="py-3 text-center">Tür</th>
                    <th className="py-3">Not</th>
                    <th className="py-3 text-end px-4">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {holidayExceptions.map((h, i) => (
                    <tr key={h.id}>
                      <td className="px-4 text-muted fw-semibold">{i + 1}</td>
                      <td className="fw-medium">{h.title}</td>
                      <td className="text-center">{new Date(h.start_date).toLocaleDateString('tr-TR')}</td>
                      <td className="text-center">{h.end_date ? new Date(h.end_date).toLocaleDateString('tr-TR') : '-'}</td>
                      <td className="text-center">
                        <Badge bg={h.is_half_day ? 'warning' : 'danger'} text={h.is_half_day ? 'dark' : 'white'}>
                          {h.is_half_day ? 'Yarım Gün' : 'Tam Gün'}
                        </Badge>
                      </td>
                      <td className="text-muted" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {h.note || '-'}
                      </td>
                      <td className="text-end px-4">
                        <Button variant="light" size="sm" className="me-2 text-primary border" onClick={() => openHolidayModal(h)} title="Düzenle">
                          <FaEdit />
                        </Button>
                        <Button variant="light" size="sm" className="text-danger border" onClick={() => handleDeleteHoliday(h.id)} title="Sil">
                          <FaTrash />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>
      )}

      {/* Holiday Add/Edit Modal */}
      <Modal show={showHolidayModal} onHide={() => setShowHolidayModal(false)} backdrop="static">
        <Form onSubmit={handleSaveHoliday}>
          <Modal.Header closeButton>
            <Modal.Title>{editingHoliday ? 'Tatil Düzenle' : 'Yeni Tatil Ekle'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">Başlık / Açıklama *</Form.Label>
              <Form.Control
                required type="text" value={holidayForm.title}
                onChange={e => setHolidayForm({ ...holidayForm, title: e.target.value })}
                placeholder="Örn: Ramazan Bayramı"
              />
            </Form.Group>
            <Row className="mb-3 g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Başlangıç Tarihi *</Form.Label>
                  <Form.Control
                    required type="date" value={holidayForm.start_date}
                    onChange={e => setHolidayForm({ ...holidayForm, start_date: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Bitiş Tarihi</Form.Label>
                  <Form.Control
                    type="date" value={holidayForm.end_date}
                    onChange={e => setHolidayForm({ ...holidayForm, end_date: e.target.value })}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">Not</Form.Label>
              <Form.Control
                as="textarea" rows={2} value={holidayForm.note}
                onChange={e => setHolidayForm({ ...holidayForm, note: e.target.value })}
                placeholder="Ek bilgi..."
              />
            </Form.Group>
            <Form.Group className="bg-light p-2 px-3 rounded">
              <Form.Check
                type="switch" id="half-day-switch"
                label="Yarım gün tatil"
                checked={holidayForm.is_half_day}
                onChange={e => setHolidayForm({ ...holidayForm, is_half_day: e.target.checked })}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowHolidayModal(false)} disabled={savingHoliday}>İptal</Button>
            <Button variant="primary" type="submit" disabled={savingHoliday}>
              {savingHoliday ? <Spinner animation="border" size="sm" /> : 'Kaydet'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default Settings;
