import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const authContextPath = path.resolve('frontend/src/context/AuthContext.jsx')
const apiPath = path.resolve('frontend/src/api/api.js')
const appPath = path.resolve('frontend/src/App.jsx')
const authContextSource = fs.readFileSync(authContextPath, 'utf8').replace(/\r\n/g, '\n')
const apiSource = fs.readFileSync(apiPath, 'utf8').replace(/\r\n/g, '\n')
const appSource = fs.readFileSync(appPath, 'utf8').replace(/\r\n/g, '\n')
const removeTokenMatch = apiSource.match(/export const removeToken = \(\) => \{[\s\S]*?\n\}/)
const removeTokenSource = removeTokenMatch?.[0] ?? ''

const checks = [
  [authContextSource, 'export function AuthProvider({ children })'],
  [authContextSource, 'const checkAuth = useCallback(async () =>'],
  [authContextSource, "api.post('/accounts/auth/admin/login/'"],
  [authContextSource, 'email,'],
  [authContextSource, "api.post('/accounts/auth/register/'"],
  [authContextSource, 'first_name: firstName'],
  [authContextSource, 'last_name: lastName'],
  [authContextSource, 'phone_number: phoneNumber'],
  [authContextSource, "user_type: 'technician'"],
  [authContextSource, "api.post('/accounts/auth/password/reset/request/'"],
  [authContextSource, '{ email }'],
  [authContextSource, 'const verifyResetCode = useCallback(async (email, code)'],
  [authContextSource, "api.post('/accounts/auth/password/reset/verify/'"],
  [authContextSource, '{ email, code }'],
  [authContextSource, 'const confirmResetPassword = useCallback(async (email, code, newPassword)'],
  [authContextSource, "api.post('/accounts/auth/password/reset/confirm/'"],
  [authContextSource, 'code,'],
  [authContextSource, 'new_password: newPassword'],
  [authContextSource, 'const logout = useCallback(async () =>'],
  [authContextSource, "api.get('/accounts/auth/check/')"],
  [authContextSource, "api.post('/accounts/auth/logout/')"],
  [authContextSource, 'const requestPasswordReset = useCallback(async (email)'],
  [authContextSource, 'register,'],
  [apiSource, 'const getToken = () =>'],
  [
    apiSource,
    'return localStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem(LEGACY_AUTH_TOKEN_KEY)',
  ],
  [removeTokenSource, 'localStorage.removeItem(AUTH_TOKEN_KEY)'],
  [removeTokenSource, 'localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY)'],
  [removeTokenSource, 'localStorage.removeItem(AUTH_USER_KEY)'],
  [removeTokenSource, 'localStorage.removeItem(TENANT_CODE_KEY)'],
  [appSource, 'function GuestRoute({ children })'],
  [appSource, 'const { isLoading, isAuthenticated } = useAuth()'],
  [appSource, 'if (isAuthenticated) {'],
  [appSource, 'return <Navigate to="/app" replace />'],
  [appSource, 'function AppPlaceholder()'],
  [appSource, '<h1>Servis Yonetimi</h1>'],
  [appSource, 'Auth akis hazir. Uygulama kabugu sonraki adimda genisletilecek.'],
  [appSource, '<Route path="/" element={<LandingPage />} />'],
  [appSource, '<Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />'],
  [appSource, '<Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />'],
  [appSource, '<Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />'],
  [appSource, '<Route path="/app" element={<AppPlaceholder />} />'],
]

const missing = checks
  .filter(([source, entry]) => !source.includes(entry))
  .map(([, entry]) => entry)

if (missing.length > 0) {
  console.error('Missing auth contract markers:')
  for (const item of missing) console.error(`- ${item}`)
  process.exit(1)
}

console.log('Auth contract markers look correct.')
