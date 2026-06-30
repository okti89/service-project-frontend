import React, { useState, useEffect, useMemo } from 'react';
import { Table, Button, Modal, Form, Spinner, Card, Row, Col, Badge, InputGroup } from 'react-bootstrap';
import { FaPlus, FaUserTie, FaClipboardList, FaTools, FaSearch, FaTimes } from 'react-icons/fa';
import ServiceDetailModal from '../../components/ServiceDetailModal';
import api from '../../api/api';
import toast from 'react-hot-toast';

const Customers = () => {
    const [customers, setCustomers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [currentTab, setCurrentTab] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    const [servicesModal, setServicesModal] = useState({ open: false, customer: null });
    const [customerServices, setCustomerServices] = useState([]);
    const [isServicesLoading, setIsServicesLoading] = useState(false);
    const [servicesError, setServicesError] = useState(null);
    const [selectedService, setSelectedService] = useState(null);
    const [showServiceDetail, setShowServiceDetail] = useState(false);
    
    const [formData, setFormData] = useState({
        full_name: '',
        phone_number: '',
        email: '',
        address: '',
        note: ''
    });

    const fetchCustomers = async () => {
        try {
            const res = await api.get('/customers/customers/');
            // Backend returns a list directly or inside a results key if paginated
            setCustomers(res.data.results || res.data);
        } catch (error) {
            toast.error('Müşteriler yüklenirken hata oluştu.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    const handleClose = () => {
        setShowModal(false);
        setEditingId(null);
        setFormData({ full_name: '', phone_number: '', email: '', address: '', note: '' });
    };

    const handleShow = (customer = null) => {
        if (customer) {
            setEditingId(customer.id);
            setFormData({
                full_name: customer.full_name,
                phone_number: customer.phone_number,
                email: customer.email || '',
                address: customer.address || '',
                note: customer.note || ''
            });
        }
        setShowModal(true);
    };

    const handleChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
    };

    const handlePhoneChange = (e) => {
        let val = e.target.value;
        
        // Sadece rakamları al
        let digits = val.replace(/\D/g, '');
        
        if (digits.startsWith('90')) digits = digits.substring(2);
        if (digits.startsWith('0')) digits = digits.substring(1);
        
        // Sadece 10 haneye kadar izin ver (Alan kdou sonrası)
        digits = digits.substring(0, 10);

        let formatted = '+90 ';
        if (digits.length > 0) formatted += digits.substring(0, 3);
        if (digits.length > 3) formatted += ' ' + digits.substring(3, 6);
        if (digits.length > 6) formatted += ' ' + digits.substring(6, 8);
        if (digits.length > 8) formatted += ' ' + digits.substring(8, 10);

        // Hiç yazı yazılmamışsa, tamamını silmesine izin ver
        if (val === '' || val === '+9') formatted = '';
        
        setFormData({ ...formData, phone_number: formatted });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.patch(`/customers/customers/${editingId}/`, formData);
                toast.success('Müşteri güncellendi.');
            } else {
                await api.post('/customers/customers/', formData);
                toast.success('Yeni müşteri eklendi.');
            }
            handleClose();
            fetchCustomers();
        } catch (error) {
            const data = error.response?.data;
            let errMsg = 'Kayıt işlemi başarısız.';
            if (data) {
                if (typeof data.detail === 'string') errMsg = data.detail;
                else if (typeof data.error === 'string') errMsg = data.error;
                else if (typeof data === 'object') {
                    const firstEntry = Object.entries(data).find(([, val]) => val);
                    if (firstEntry) {
                        const [, val] = firstEntry;
                        errMsg = Array.isArray(val) ? String(val[0]) : String(val);
                    }
                }
            }
            toast.error(errMsg);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Bu müşteriyi silmek istediğinize emin misiniz?')) {
            try {
                await api.delete(`/customers/customers/${id}/`);
                toast.success('Müşteri silindi.');
                fetchCustomers();
            } catch (error) {
                toast.error('Silme işlemi başarısız.');
            }
        }
    };

    const openWhatsApp = (phone) => {
        if (!phone) return;
        const cleanPhone = phone.replace(/\D/g, '');
        window.open(`https://wa.me/${cleanPhone}`, '_blank');
    };

    const openMap = (address) => {
        if (!address) {
            toast.error("Bu müşteriye ait kayıtlı adres bulunmuyor.");
            return;
        }
        window.open(`https://maps.google.com/?q=${encodeURIComponent(address)}`, '_blank');
    };

    const handleRestore = async (id, name) => {
        if (window.confirm(`${name} isimli müşteriyi geri getirmek (aktif etmek) istediğinize emin misiniz?`)) {
            try {
                await api.post(`/customers/customers/${id}/restore/`);
                toast.success('Müşteri kaydı geri getirildi.');
                fetchCustomers();
            } catch (error) {
                toast.error('Geri getirme işlemi başarısız.');
            }
        }
    };

    const openServicesModal = async (customer) => {
        setServicesModal({ open: true, customer });
        setCustomerServices([]);
        setServicesError(null);
        setIsServicesLoading(true);
        try {
            const res = await api.get('/services/admin-services/', { params: { customer: customer.id } });
            const list = res.data.results || res.data || [];
            setCustomerServices(Array.isArray(list) ? list : []);
        } catch (error) {
            const status = error.response?.status;
            if (status === 404) {
                setServicesError('Servisler API uç noktası henüz hazır değil.');
            } else {
                setServicesError('Servisler yüklenirken bir hata oluştu.');
            }
            setCustomerServices([]);
        } finally {
            setIsServicesLoading(false);
        }
    };

    const closeServicesModal = () => {
        setServicesModal({ open: false, customer: null });
        setCustomerServices([]);
        setServicesError(null);
        setIsServicesLoading(false);
    };

    const openServiceDetail = (service) => {
        closeServicesModal();
        setSelectedService(service);
        setShowServiceDetail(true);
    };

    const closeServiceDetail = () => {
        setShowServiceDetail(false);
        setSelectedService(null);
    };

    const totalCustomers = customers.length;
    const activeCustomers = customers.filter(c => !c.is_deleted).length;
    const inactiveCustomers = customers.filter(c => c.is_deleted).length;

    const displayedCustomers = useMemo(() => {
        const term = String(searchTerm || '').trim().toLocaleLowerCase('tr-TR');
        return customers.filter(c => {
            if (currentTab === 'active' && c.is_deleted) return false;
            if (currentTab === 'inactive' && !c.is_deleted) return false;
            if (!term) return true;
            const haystack = [
                c.full_name,
                c.phone_number,
                c.email,
                c.address,
                c.note,
            ].filter(Boolean).join(' ').toLocaleLowerCase('tr-TR');
            return haystack.includes(term);
        });
    }, [customers, currentTab, searchTerm]);

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4 gap-3 flex-wrap">
                <h3 className="fw-bold m-0 text-light"><FaUserTie className="me-2 text-primary" /> Müşteriler</h3>
                <div className="d-flex gap-2 align-items-center flex-grow-1" style={{ maxWidth: '420px' }}>
                    <InputGroup>
                        <InputGroup.Text className="bg-light border-end-0">
                            <FaSearch className="text-muted" />
                        </InputGroup.Text>
                        <Form.Control
                            placeholder="İsim, telefon, e-posta, adres veya not ile ara..."
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            className="border-start-0"
                        />
                        {searchTerm ? (
                            <Button
                                variant="light"
                                onClick={() => setSearchTerm('')}
                                title="Aramayı temizle"
                            >
                                <FaTimes />
                            </Button>
                        ) : null}
                    </InputGroup>
                </div>
                <Button variant="primary" onClick={() => handleShow()}>
                    <FaPlus className="me-1" /> Yeni Müşteri
                </Button>
            </div>

            {/* Summary Cards */}
            <Row className="g-3 mb-4">
                <Col lg={4} md={6}>
                    <Card onClick={() => setCurrentTab('all')} className="border-0 shadow-sm rounded-3 h-100 p-3" style={{ borderLeft: '4px solid #2196F3', cursor: 'pointer', opacity: currentTab === 'all' ? 1 : 0.6, transform: currentTab === 'all' ? 'scale(1.02)' : 'scale(1)', transition: 'all 0.2s' }}>
                        <div className="text-muted fw-bold mb-1" style={{ fontSize: '0.8rem' }}>TOPLAM MÜŞTERİ</div>
                        <h3 className="fw-bold m-0">{totalCustomers}</h3>
                    </Card>
                </Col>
                <Col lg={4} md={6}>
                    <Card onClick={() => setCurrentTab('active')} className="border-0 shadow-sm rounded-3 h-100 p-3" style={{ borderLeft: '4px solid #4CAF50', cursor: 'pointer', opacity: currentTab === 'active' ? 1 : 0.6, transform: currentTab === 'active' ? 'scale(1.02)' : 'scale(1)', transition: 'all 0.2s' }}>
                        <div className="text-muted fw-bold mb-1" style={{ fontSize: '0.8rem' }}>AKTİF</div>
                        <h3 className="fw-bold m-0 text-success">{activeCustomers}</h3>
                    </Card>
                </Col>
                <Col lg={4} md={12}>
                    <Card onClick={() => setCurrentTab('inactive')} className="border-0 shadow-sm rounded-3 h-100 p-3" style={{ borderLeft: '4px solid #F44336', cursor: 'pointer', opacity: currentTab === 'inactive' ? 1 : 0.6, transform: currentTab === 'inactive' ? 'scale(1.02)' : 'scale(1)', transition: 'all 0.2s' }}>
                        <div className="text-muted fw-bold mb-1" style={{ fontSize: '0.8rem' }}>SİLİNEN (PASİF)</div>
                        <h3 className="fw-bold m-0 text-danger">{inactiveCustomers}</h3>
                    </Card>
                </Col>
            </Row>

            <Card className="border-0 shadow-sm rounded-3">
                <Card.Body className="p-0">
                    {isLoading ? (
                        <div className="text-center p-5"><Spinner animation="border" variant="primary" /></div>
                    ) : displayedCustomers.length === 0 ? (
                        <div className="text-center p-5 text-muted">
                            {searchTerm
                                ? `"${searchTerm}" ile eşleşen müşteri bulunamadı.`
                                : currentTab === 'all'
                                    ? 'Henüz müşteri kaydı bulunmuyor.'
                                    : currentTab === 'active'
                                        ? 'Henüz aktif bir müşteri kaydı bulunmuyor.'
                                        : 'Silinmiş müşteri bulunmuyor.'}
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <Table hover className="m-0 align-middle">
                                <thead className="bg-light">
                                    <tr>
                                        <th className="px-3 py-3 text-center" style={{ width: '50px' }}>#</th>
                                        <th className="px-3 py-3">Ad Soyad</th>
                                        <th className="py-3" style={{ width: '22%' }}>Adres</th>
                                        <th className="py-3" style={{ width: '18%' }}>Not</th>
                                        <th className="text-end px-3 py-3" style={{minWidth: '340px', whiteSpace: 'nowrap'}}>İşlemler</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {displayedCustomers.map((c, index) => (
                                        <tr key={c.id}>
                                            <td className="px-3 text-center text-muted fw-medium">{index + 1}</td>
                                            <td className="px-3">
                                                <div className="fw-medium">{c.full_name}</div>
                                                {c.phone_number ? (
                                                    <small className="text-muted d-block mt-1">{c.phone_number}</small>
                                                ) : null}
                                            </td>
                                            <td>
                                                {c.address ? <div className="text-truncate" style={{maxWidth: '180px'}} title={c.address}>{c.address}</div> : <span className="text-muted">-</span>}
                                            </td>
                                            <td>
                                                {c.note ? <div className="text-truncate" style={{maxWidth: '150px'}} title={c.note}>{c.note}</div> : <span className="text-muted">-</span>}
                                            </td>
                                            <td className="text-end px-3 text-nowrap">
                                                {!c.is_deleted ? (
                                                    <div className="d-inline-flex flex-wrap justify-content-end gap-1">
                                                        <Button variant="outline-success" size="sm" onClick={() => openWhatsApp(c.phone_number)}>
                                                            WhatsApp
                                                        </Button>
                                                        <Button variant="outline-info" size="sm" onClick={() => openMap(c.address)}>
                                                            Harita
                                                        </Button>
                                                        <Button variant="outline-warning" size="sm" onClick={() => openServicesModal(c)}>
                                                            Servisler
                                                        </Button>
                                                        <Button variant="outline-primary" size="sm" onClick={() => handleShow(c)}>
                                                            Düzenle
                                                        </Button>
                                                        <Button variant="outline-danger" size="sm" onClick={() => handleDelete(c.id)}>
                                                            Sil
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <Button variant="success" size="sm" className="border-0" onClick={() => handleRestore(c.id, c.full_name)}>
                                                        Geri Getir
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    )}
                </Card.Body>
            </Card>

            <Modal show={showModal} onHide={handleClose} backdrop="static" size="lg">
                <Form onSubmit={handleSubmit}>
                    <Modal.Header closeButton>
                        <Modal.Title>{editingId ? 'Müşteri Düzenle' : 'Yeni Müşteri Ekle'}</Modal.Title>
                    </Modal.Header>
                    <Modal.Body className="px-4">
                        <Row className="mb-3">
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="fw-semibold">İsim Soyisim *</Form.Label>
                                    <Form.Control required type="text" name="full_name" value={formData.full_name} onChange={handleChange} placeholder="Müşterinin tam adı" />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="fw-semibold">Telefon Numarası *</Form.Label>
                                    <Form.Control required type="text" name="phone_number" value={formData.phone_number} onChange={handlePhoneChange} placeholder="+90 555 123 45 67"/>
                                </Form.Group>
                            </Col>
                        </Row>
                        
                        <Row className="mb-3">
                            <Col md={12}>
                                <Form.Group>
                                    <Form.Label className="fw-semibold">E-posta Adresi (İsteğe Bağlı)</Form.Label>
                                    <Form.Control type="email" name="email" value={formData.email} onChange={handleChange} placeholder="ornek@mail.com"/>
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row className="mb-3">
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="fw-semibold">Adres</Form.Label>
                                    <Form.Control as="textarea" rows={4} name="address" value={formData.address} onChange={handleChange} placeholder="Açık adres..." />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-semibold">Özel Notlar</Form.Label>
                                    <Form.Control as="textarea" rows={4} name="note" value={formData.note} onChange={handleChange} placeholder="Müşteri hakkında hatırlatıcı notlar..." />
                                </Form.Group>
                            </Col>
                        </Row>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleClose}>İptal</Button>
                        <Button variant="primary" type="submit">Kaydet</Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            <Modal show={servicesModal.open} onHide={closeServicesModal} size="lg" centered>
                <Modal.Header closeButton>
                    <Modal.Title>
                        <FaTools className="me-2 text-warning" />
                        {servicesModal.customer
                            ? `${servicesModal.customer.full_name} - Servisler`
                            : 'Müşteri Servisleri'}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {isServicesLoading ? (
                        <div className="text-center p-5">
                            <Spinner animation="border" variant="warning" />
                            <div className="text-muted mt-3">Servisler yükleniyor...</div>
                        </div>
                    ) : servicesError ? (
                        <div className="text-center p-5">
                            <FaClipboardList size={32} className="text-muted mb-3" />
                            <div className="text-muted">{servicesError}</div>
                        </div>
                    ) : customerServices.length === 0 ? (
                        <div className="text-center p-5 text-muted">
                            <FaClipboardList size={32} className="mb-3" />
                            <div>Bu müşteriye ait kayıtlı servis bulunmuyor.</div>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <Table hover className="m-0 align-middle">
                                <thead className="bg-light">
                                    <tr>
                                        <th className="px-3 py-2">Servis No</th>
                                        <th className="py-2">Konu</th>
                                        <th className="py-2">Durum</th>
                                        <th className="py-2">Tarih</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {customerServices.map(s => {
                                        const id = s.id ?? s.pk;
                                        const receipt = s.receipt_number || s.service_no || s.code || `#${id}`;
                                        const subject = s.subject || s.title || s.description || s.fault_description || '-';
                                        const statusCode = s.service_status || s.status_code || s.status || '-';
                                        const statusName = s.status_name || (
                                            typeof s.status === 'object' ? (s.status?.name || s.status?.label) : null
                                        ) || String(statusCode);
                                        const date = s.scheduled_date || s.scheduled_at || s.service_date || s.created_at || s.date;
                                        const formattedDate = date ? new Date(date).toLocaleString('tr-TR') : '-';
                                        return (
                                            <tr
                                                key={id}
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => openServiceDetail(s)}
                                                title="Servis detayını görmek için tıklayın"
                                                className="customer-service-row"
                                            >
                                                <td className="px-3 fw-medium">{String(receipt)}</td>
                                                <td>{String(subject)}</td>
                                                <td>
                                                    <Badge bg="secondary" pill>{String(statusName)}</Badge>
                                                </td>
                                                <td>{formattedDate}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </Table>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={closeServicesModal}>Kapat</Button>
                </Modal.Footer>
            </Modal>

            <style>{`
                .customer-service-row:hover {
                    background-color: rgba(33, 150, 243, 0.08);
                }
            `}</style>

            <ServiceDetailModal
                show={showServiceDetail}
                serviceId={selectedService?.id}
                initialService={selectedService}
                onClose={closeServiceDetail}
            />
        </div>
    );
};

export default Customers;
