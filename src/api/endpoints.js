// Backend tarafindaki URL tanimlarina birebir uyacak sekilde düzenlenmistir.
// Kaynak: backend/accounts/urls.py

const ENDPOINTS = {
  AUTH: {
    // Admin işlemleri
    ADMIN_LOGIN: 'accounts/admin/login/',
    ADMIN_USERS: 'accounts/admin/users/',
    ADMIN_USER_DETAIL: (id) => `accounts/admin/users/${id}/`,
    ADMIN_USER_APPROVAL: 'accounts/admin/users/approval/',
    ADMIN_USER_DEVICES: 'accounts/admin/devices/',

    // Kullanıcı auth
    REGISTER: 'accounts/auth/register/',
    LOGIN: 'accounts/auth/login/',
    LOGOUT: 'accounts/auth/logout/',
    CHANGE_PASSWORD: 'accounts/auth/change-password/',
    CHECK_AUTH: 'accounts/auth/check/',

    // Parola sifirlama
    PASSWORD_RESET_REQUEST: 'accounts/auth/password/reset/request/',
    PASSWORD_RESET_VERIFY: 'accounts/auth/password/reset/verify/',
    PASSWORD_RESET_CONFIRM: 'accounts/auth/password/reset/confirm/',

    // Cihaz kayıt
    DEVICE_REGISTER: 'accounts/devices/register/',
  },
}

export default ENDPOINTS
