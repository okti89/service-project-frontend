import axios from 'axios'

const AUTH_TOKEN_KEY = 'auth-token'
const LEGACY_AUTH_TOKEN_KEY = 'auth_token'
const AUTH_USER_KEY = 'auth-user'
const TENANT_CODE_KEY = 'tenant-code'

const readStoredToken = () => {
    return localStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem(LEGACY_AUTH_TOKEN_KEY)
}

const clearStoredAuth = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY)
    localStorage.removeItem(AUTH_USER_KEY)
    localStorage.removeItem(TENANT_CODE_KEY)
}

const api = axios.create({
    baseURL: 'https://imrpx8h1iihplrf4rs1ssbqo.5.75.152.139.sslip.io/api',
    headers: {
        'Content-Type': 'application/json',
    },
})

api.interceptors.request.use(
    (config) => {
        const token = readStoredToken()
        if (token) {
            config.headers.Authorization = `Token ${token}`
        }
        const tenantCode = localStorage.getItem(TENANT_CODE_KEY)
        if (tenantCode) {
            config.headers['X-Tenant-Code'] = tenantCode
        }

        // Let the browser set proper multipart boundary for file uploads.
        if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
            delete config.headers['Content-Type']
            delete config.headers['content-type']
        }

        return config
    },
    (error) => Promise.reject(error)
)

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status
        const requestUrl = error.config?.url || ''
        const isLogoutRequest = requestUrl.includes('/auth/logout/')

        if (status === 401 && !isLogoutRequest) {
            clearStoredAuth()
            window.dispatchEvent(new CustomEvent('auth:unauthorized'))
        }
        return Promise.reject(error)
    }
)

export default api
