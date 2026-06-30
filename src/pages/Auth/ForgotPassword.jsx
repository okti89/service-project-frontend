import React, { useState } from 'react';
import { Form, Button, Alert } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { FaEnvelope } from 'react-icons/fa';

const ForgotPassword = () => {
    const { requestPasswordReset } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        const res = await requestPasswordReset(email);

        if (res.ok) {
            toast.success(res.message || 'Kod gönderildi!');
            try { localStorage.setItem('password-reset-account', email); } catch {}
            navigate('/reset-password', { state: { email } });
        } else {
            setError(res.message || 'Kod gönderilirken bir hata oluştu.');
            toast.error('İşlem başarısız.');
        }
        setIsLoading(false);
    };

    return (
        <div>
            <div className="text-center mb-4">
                <h4 className="fw-bold">Şifremi Unuttum</h4>
                <p className="text-muted small">
                    Sistemde kayıtlı e-posta adresinizi girin. Size bir sıfırlama kodu göndereceğiz.
                </p>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}

            <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-4" controlId="formBasicEmail">
                    <Form.Label>E-posta</Form.Label>
                    <div className="input-group">
                        <span className="input-group-text"><FaEnvelope /></span>
                        <Form.Control
                            type="email"
                            name="email"
                            autoComplete="username"
                            inputMode="email"
                            placeholder="ornek@firma.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                </Form.Group>

                <Button variant="primary" type="submit" className="w-100 py-2 fw-bold mb-3" disabled={isLoading}>
                    {isLoading ? 'Gönderiliyor...' : 'Sıfırlama Kodu Gönder'}
                </Button>

                <div className="text-center">
                    <Link to="/login" className="text-decoration-none text-muted small">
                        Giriş ekranına dön
                    </Link>
                </div>
            </Form>
        </div>
    );
};

export default ForgotPassword;
