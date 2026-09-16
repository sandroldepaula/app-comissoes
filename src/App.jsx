import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Car, 
  Printer, 
  Plus, 
  Pencil,
  Trash2, 
  TrendingUp, 
  Award, 
  Sparkles, 
  CheckCircle2, 
  Calculator, 
  ShieldCheck, 
  ArrowUpRight, 
  Info, 
  Layers, 
  X, 
  BarChart3, 
  PieChart, 
  ClipboardList, 
  ArrowLeft, 
  Calendar, 
  Target, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp,
  AlertTriangle,
  User,
  LogOut,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Loader2,
  KeyRound,
  SlidersHorizontal,
  Wallet,
  Sun,
  Moon
} from 'lucide-react';

const SUPABASE_URL = 'https://hhmtsvicjtqydrjvacze.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhobXRzdmljanRxeWRyanZhY3plIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxNzM4NjEsImV4cCI6MjEwNDc0OTg2MX0.eCRTXvxOsLkvdFUS3_5JmfE7XNLjKvKWdl61jUN9new';

const AUTH_STORAGE_KEY = 'auto_auth_session_v1';

const R_RATES = {
  R0: 0,
  R1: 0.012,
  R2: 0.024,
  R3: 0.036,
  R4: 0.048
};

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const DEFAULT_EXTRAS = {
  premioUsados: 0,
  premioAguia: 0,
  premioLider: 0,
  premioNps: 0
};

const DEFAULT_SALE = {
  id: 0,
  client: '',
  car: '',
  vn: 0,
  margin: 0,
  fAndI: 0,
  returnFAndI: 'R0',
  spf: 0,
  accessories: 0,
  autobox: 0,
  emplacamento: 0,
  seguro: 0,
  bonusCarro: 0,
  usadosCaptados: 0
};

const getInitialRecoveryToken = () => {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash;
  if (hash && (hash.includes('type=recovery') || hash.includes('access_token='))) {
    const params = new URLSearchParams(hash.replace(/^#/, ''));
    if (params.get('type') === 'recovery' || params.get('access_token')) {
      return params.get('access_token');
    }
  }
  return null;
};

const initialRecoveryToken = getInitialRecoveryToken();

const getErrorMessage = async (res) => {
  try {
    const json = await res.json();
    return json?.error_description || json?.message || json?.msg || json?.error || res.statusText || 'Erro na requisição';
  } catch (e) {
    return res.statusText || 'Erro na requisição';
  }
};

const createRestClient = (sessionRef, refreshSessionToken, onLogout) => {
  const executeSecureRequest = async (table, queryOrPath, method, body, extraHeaders = {}) => {
    let currentToken = sessionRef.current?.access_token;
    
    if (!currentToken) {
      throw new Error('Acesso bloqueado: sessão não autenticada.');
    }

    const buildHeaders = (token) => ({
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...extraHeaders
    });

    const url = `${SUPABASE_URL}/rest/v1/${table}${queryOrPath || ''}`;
    let res = await fetch(url, {
      method,
      headers: buildHeaders(currentToken),
      body: body ? JSON.stringify(body) : undefined
    });

    if (res.status === 401) {
      try {
        const refreshedSession = await refreshSessionToken();
        if (refreshedSession?.access_token) {
          currentToken = refreshedSession.access_token;
          res = await fetch(url, {
            method,
            headers: buildHeaders(currentToken),
            body: body ? JSON.stringify(body) : undefined
          });
        } else {
          onLogout();
          throw new Error('Sessão expirada. Faça login novamente.');
        }
      } catch (err) {
        onLogout();
        throw err;
      }
    }

    return res;
  };

  return {
    from: (table) => ({
      select: async (cols = '*', queryParams = '') => {
        try {
          const q = queryParams 
            ? `select=${encodeURIComponent(cols)}&${queryParams}`
            : `select=${encodeURIComponent(cols)}`;
          const res = await executeSecureRequest(table, `?${q}`, 'GET');
          if (!res.ok) {
            const msg = await getErrorMessage(res);
            return { data: null, error: new Error(msg) };
          }
          const data = await res.json();
          return { data, error: null };
        } catch (err) {
          return { data: null, error: err };
        }
      },
      delete: () => ({
        match: async (filtersObj) => {
          try {
            const params = Object.entries(filtersObj)
              .map(([k, v]) => `${encodeURIComponent(k)}=eq.${encodeURIComponent(v)}`)
              .join('&');
            const res = await executeSecureRequest(table, `?${params}`, 'DELETE');
            if (!res.ok) {
              const msg = await getErrorMessage(res);
              return { error: new Error(msg) };
            }
            return { error: null };
          } catch (err) {
            return { error: err };
          }
        },
        eq: async (column, value) => {
          try {
            const res = await executeSecureRequest(table, `?${encodeURIComponent(column)}=eq.${encodeURIComponent(value)}`, 'DELETE');
            if (!res.ok) {
              const msg = await getErrorMessage(res);
              return { error: new Error(msg) };
            }
            return { error: null };
          } catch (err) {
            return { error: err };
          }
        }
      }),
      insert: async (payload) => {
        try {
          const body = Array.isArray(payload) ? payload : [payload];
          const res = await executeSecureRequest(table, '', 'POST', body, { 'Prefer': 'return=minimal' });
          if (!res.ok) {
            const msg = await getErrorMessage(res);
            return { error: new Error(msg) };
          }
          return { error: null };
        } catch (err) {
          return { error: err };
        }
      },
      upsert: async (payload, options = {}) => {
        try {
          const body = Array.isArray(payload) ? payload : [payload];
          const onConflictParam = options?.onConflict ? `?on_conflict=${encodeURIComponent(options.onConflict)}` : '';
          const res = await executeSecureRequest(table, onConflictParam, 'POST', body, {
            'Prefer': 'resolution=merge-duplicates,return=minimal'
          });
          if (!res.ok) {
            const msg = await getErrorMessage(res);
            return { error: new Error(msg) };
          }
          return { error: null };
        } catch (err) {
          return { error: err };
        }
      }
    })
  };
};

const useInjectGoogleFont = () => {
  useEffect(() => {
    const fontId = 'google-font-inter';
    if (!document.getElementById(fontId)) {
      const link = document.createElement('link');
      link.id = fontId;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap';
      document.head.appendChild(link);
    }
  }, []);
};

const CurrencyInput = ({ value, onChange, className, placeholder, disabled, theme = 'dark' }) => {
  const isDark = theme === 'dark';
  const displayValue = useMemo(() => {
    if (value === 0 && !disabled) return '';
    if (value === undefined || value === null) return '';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }, [value, disabled]);

  const handleChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '');
    const numeric = raw ? parseInt(raw, 10) / 100 : 0;
    onChange(numeric);
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      disabled={disabled}
      placeholder={placeholder || "R$ 0,00"}
      className={`${
        isDark
          ? 'bg-slate-950/70 hover:bg-slate-900/80 focus:bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-600'
          : 'bg-slate-50/70 hover:bg-white focus:bg-white border-slate-200 text-slate-800 placeholder:text-slate-400'
      } border text-xs font-medium font-mono rounded-xl px-2.5 py-1.5 w-full transition-all duration-150 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 print:bg-transparent print:border-none print:p-0 print:text-[7.8px] print:font-semibold print:text-slate-900 print:text-right print:shadow-none print:h-auto print:w-full print:min-w-0 ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${className || ''}`}
    />
  );
};

const computeMonthMetrics = (salesList = [], extrasObj = DEFAULT_EXTRAS, netPct = 69.0) => {
  const volume = salesList.length;
  const vnBase = salesList.reduce((acc, s) => acc + (s.vn || 0), 0);
  const marginBase = salesList.reduce((acc, s) => acc + (s.margin || 0), 0);
  const fAndIBase = salesList.reduce((acc, s) => acc + (s.fAndI || 0), 0);
  const accBase = salesList.reduce((acc, s) => acc + (s.accessories || 0), 0);
  const autoboxBase = salesList.reduce((acc, s) => acc + (s.autobox || 0), 0);
  const empBase = salesList.reduce((acc, s) => acc + (s.emplacamento || 0), 0);

  const seguroTotal = salesList.reduce((acc, s) => acc + (s.seguro || 0), 0);
  const bonusCarroTotal = salesList.reduce((acc, s) => acc + (s.bonusCarro || 0), 0);
  const usadosCaptadosTotal = salesList.reduce((acc, s) => acc + (s.usadosCaptados || 0), 0);
  const commissionDirects = seguroTotal + bonusCarroTotal + usadosCaptadosTotal;

  const fAndICount = salesList.filter(s => (s.fAndI || 0) > 0).length;
  const spfCount = salesList.filter(s => (s.spf || 0) > 0).length;
  const empCount = salesList.filter(s => (s.emplacamento || 0) > 0).length;
  const accCount = salesList.filter(s => (s.accessories || 0) > 0).length;

  const spfPenetration = fAndICount > 0 ? (spfCount / fAndICount) : 0;
  const empPenetration = volume > 0 ? (empCount / volume) : 0;
  const accTicketHeader = volume > 0 ? (accBase / volume) : 0;
  const accTicketCommission = accCount > 0 ? (accBase / accCount) : 0;

  let vnTier = 0.0012;
  if (volume >= 11 && volume <= 14) vnTier = 0.0017;
  else if (volume >= 15 && volume <= 16) vnTier = 0.0022;
  else if (volume >= 17 && volume <= 20) vnTier = 0.0027;
  else if (volume >= 21) vnTier = 0.0030;

  let marginTier = 0.03;
  if (volume >= 11 && volume <= 16) marginTier = 0.04;
  else if (volume >= 17 && volume <= 20) marginTier = 0.045;
  else if (volume >= 21) marginTier = 0.05;

  let empTier = 0.03;
  if (empPenetration > 0.80 && empPenetration <= 0.95) empTier = 0.04;
  else if (empPenetration > 0.95) empTier = 0.05;

  let accTier = 0.02;
  if (accTicketCommission >= 1000 && accTicketCommission < 2000) accTier = 0.05;
  else if (accTicketCommission >= 2000) accTier = 0.06;

  let fAndIAccelerator = 0.03;
  if (spfPenetration >= 0.40 && spfPenetration <= 0.50) fAndIAccelerator = 0.04;
  else if (spfPenetration > 0.50) fAndIAccelerator = 0.05;

  const commissionVn = vnBase * vnTier;
  const commissionMargin = marginBase * marginTier;
  const commissionSpf = spfCount * 100;
  const commissionAcc = accBase * accTier;
  const commissionAutobox = autoboxBase * 0.045;
  const commissionEmp = empBase * empTier;

  const fAndIBaseRetorno = salesList.reduce((acc, s) => {
    const rate = R_RATES[s.returnFAndI] || 0;
    return acc + ((s.fAndI || 0) * rate);
  }, 0);
  const commissionRetornoFAndI = fAndIBaseRetorno * fAndIAccelerator;

  const dsr = 0.20 * (commissionVn + commissionMargin + commissionRetornoFAndI);

  const extrasTotal = 
    (extrasObj.premioUsados || 0) + 
    (extrasObj.premioAguia || 0) + 
    (extrasObj.premioLider || 0) + 
    (extrasObj.premioNps || 0);

  const grossCommission = 
    dsr + 
    commissionVn + 
    commissionMargin + 
    commissionRetornoFAndI + 
    commissionSpf + 
    commissionAcc + 
    commissionAutobox + 
    commissionEmp + 
    commissionDirects + 
    extrasTotal;

  const netCommission = grossCommission * ((netPct ?? 69.0) / 100);

  return {
    volume,
    vnBase,
    marginBase,
    fAndIBase,
    accBase,
    autoboxBase,
    empBase,
    fAndIBaseRetorno,
    fAndICount,
    spfCount,
    empCount,
    accCount,
    vnTier,
    marginTier,
    empTier,
    accTier,
    fAndIAccelerator,
    spfPenetration,
    empPenetration,
    accTicketHeader,
    accTicketCommission,
    commissionVn,
    commissionMargin,
    commissionRetornoFAndI,
    commissionSpf,
    commissionAcc,
    commissionAutobox,
    commissionEmp,
    seguroTotal,
    bonusCarroTotal,
    usadosCaptadosTotal,
    commissionDirects,
    dsr,
    extrasTotal,
    grossCommission,
    netCommission
  };
};

export default function App() {
  useInjectGoogleFont();

  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('auto_app_theme') || 'dark';
    } catch (e) {
      return 'dark';
    }
  });

  const isDark = theme === 'dark';

  const toggleTheme = useCallback(() => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    try {
      localStorage.setItem('auto_app_theme', nextTheme);
    } catch (e) {}
  }, [theme]);

  const [session, setSession] = useState(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return null;
  });

  const sessionRef = useRef(session);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const [user, setUser] = useState(() => session?.user || null);
  const [recoveryToken, setRecoveryToken] = useState(initialRecoveryToken);
  const [authMode, setAuthMode] = useState(initialRecoveryToken ? 'resetPassword' : 'login');
  const [authLoading, setAuthLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [authForm, setAuthForm] = useState({
    name: '',
    email: '',
    password: ''
  });

  const [resetPasswordForm, setResetPasswordForm] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const [toast, setToast] = useState(null);

  const showNotification = useCallback((text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    if (recoveryToken) {
      setAuthMode('resetPassword');
      window.history.replaceState(null, '', window.location.pathname);
      showNotification('Link de recuperação validado. Defina sua nova senha.');
    }

    const handleHash = () => {
      const token = getInitialRecoveryToken();
      if (token) {
        setRecoveryToken(token);
        setAuthMode('resetPassword');
        window.history.replaceState(null, '', window.location.pathname);
        showNotification('Link de recuperação validado. Defina sua nova senha.');
      }
    };

    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [recoveryToken, showNotification]);

  const refreshSessionToken = useCallback(async () => {
    const currentRefresh = sessionRef.current?.refresh_token;
    if (!currentRefresh) return null;

    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refresh_token: currentRefresh })
      });

      if (!res.ok) return null;

      const data = await res.json();
      if (data.access_token) {
        const newSession = {
          access_token: data.access_token,
          refresh_token: data.refresh_token || currentRefresh,
          user: data.user || sessionRef.current?.user
        };
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newSession));
        sessionRef.current = newSession;
        setSession(newSession);
        setUser(newSession.user);
        return newSession;
      }
      return null;
    } catch (e) {
      return null;
    }
  }, []);

  const handleLogout = useCallback(() => {
    const activeUserId = sessionRef.current?.user?.id;
    localStorage.removeItem(AUTH_STORAGE_KEY);
    
    if (activeUserId) {
      try {
        localStorage.removeItem(`auto_months_${activeUserId}`);
        localStorage.removeItem(`auto_sales_${activeUserId}`);
      } catch (e) {}
    }

    sessionRef.current = null;
    setSession(null);
    setUser(null);
    setMonths([]);
    setSalesByMonth({});
    setSelectedMonthId(null);
    setCurrentScreen('HUB');
    showNotification('Sessão encerrada com segurança.');
  }, [showNotification]);

  const dbClient = useMemo(() => {
    return createRestClient(sessionRef, refreshSessionToken, handleLogout);
  }, [refreshSessionToken, handleLogout]);

  const [currentScreen, setCurrentScreen] = useState('HUB');
  const [selectedMonthId, setSelectedMonthId] = useState(null);

  const [months, setMonths] = useState([]);
  const [salesByMonth, setSalesByMonth] = useState({});

  const [isCreateMonthOpen, setIsCreateMonthOpen] = useState(false);
  const [isEditMonthOpen, setIsEditMonthOpen] = useState(false);
  const [monthToEdit, setMonthToEdit] = useState(null);
  const [monthToDelete, setMonthToDelete] = useState(null);
  const [showCalculationModal, setShowCalculationModal] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [newMonthForm, setNewMonthForm] = useState({
    mes: MONTH_NAMES[new Date().getMonth()] || 'Setembro',
    ano: new Date().getFullYear() || 2026,
    meta: 15
  });

  const [editMonthForm, setEditMonthForm] = useState({
    mes: 'Setembro',
    ano: 2026,
    meta: 15
  });

  const [isSalesCollapsed, setIsSalesCollapsed] = useState(false);
  const [expandedMobileCardId, setExpandedMobileCardId] = useState(null);
  const [activeDonutSlice, setActiveDonutSlice] = useState(null);
  const [activeModelBar, setActiveModelBar] = useState(null);
  const [newSale, setNewSale] = useState(DEFAULT_SALE);

  const formatBRL = useCallback((val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  }, []);

  const formatPercent = useCallback((val) => {
    return (val * 100).toFixed(2).replace('.', ',') + '%';
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!authForm.email || !authForm.password) {
      showNotification('Por favor, preencha todos os campos.', 'error');
      return;
    }

    setAuthLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: authForm.email.trim(),
          password: authForm.password
        })
      });

      const data = await res.json();
      if (!res.ok) {
        const errorDesc = data.error_description || data.message || data.msg || 'Falha ao autenticar';
        throw new Error(errorDesc === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : errorDesc);
      }

      const newSession = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        user: data.user
      };

      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newSession));
      sessionRef.current = newSession;
      setSession(newSession);
      setUser(data.user);
      showNotification(`Bem-vindo, ${data.user.user_metadata?.name || data.user.email}!`);
    } catch (err) {
      showNotification(err.message || 'Erro ao realizar login', 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!authForm.email || !authForm.password) {
      showNotification('Preencha seu e-mail e crie uma senha.', 'error');
      return;
    }
    if (authForm.password.length < 6) {
      showNotification('A senha deve conter no mínimo 6 caracteres.', 'error');
      return;
    }

    setAuthLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: authForm.email.trim(),
          password: authForm.password,
          data: {
            name: authForm.name.trim() || 'Consultor'
          }
        })
      });

      const data = await res.json();
      if (!res.ok) {
        const errorDesc = data.error_description || data.message || data.msg || 'Erro ao criar conta';
        throw new Error(errorDesc);
      }

      if (data.access_token) {
        const newSession = {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          user: data.user
        };
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newSession));
        sessionRef.current = newSession;
        setSession(newSession);
        setUser(data.user);
        showNotification('Conta criada e autenticada com sucesso!');
      } else {
        showNotification('Conta criada com sucesso! Você já pode realizar o login.');
        setAuthMode('login');
      }
    } catch (err) {
      showNotification(err.message || 'Erro ao criar conta', 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!authForm.email) {
      showNotification('Por favor, informe seu e-mail.', 'error');
      return;
    }

    setAuthLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: authForm.email.trim() })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errorDesc = data.error_description || data.message || data.msg || 'Erro ao solicitar recuperação';
        throw new Error(errorDesc);
      }

      showNotification('Link de recuperação enviado para o seu e-mail!');
      setAuthMode('login');
    } catch (err) {
      showNotification(err.message || 'Erro ao enviar e-mail de recuperação', 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!resetPasswordForm.newPassword || !resetPasswordForm.confirmPassword) {
      showNotification('Preencha ambos os campos de senha.', 'error');
      return;
    }
    if (resetPasswordForm.newPassword.length < 6) {
      showNotification('A nova senha deve ter no mínimo 6 caracteres.', 'error');
      return;
    }
    if (resetPasswordForm.newPassword !== resetPasswordForm.confirmPassword) {
      showNotification('As senhas não coincidem.', 'error');
      return;
    }
    if (!recoveryToken) {
      showNotification('Token de recuperação expirado ou ausente.', 'error');
      setAuthMode('forgot');
      return;
    }

    setAuthLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        method: 'PUT',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${recoveryToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password: resetPasswordForm.newPassword })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errorDesc = data.error_description || data.message || data.msg || 'Erro ao redefinir senha';
        throw new Error(errorDesc);
      }

      showNotification('Senha redefinida com sucesso! Faça login com a nova senha.');
      setRecoveryToken(null);
      setResetPasswordForm({ newPassword: '', confirmPassword: '' });
      setAuthMode('login');
    } catch (err) {
      showNotification(err.message || 'Erro ao redefinir senha', 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.id) {
      setMonths([]);
      setSalesByMonth({});
      return;
    }
    const userMonthsKey = `auto_months_${user.id}`;
    const userSalesKey = `auto_sales_${user.id}`;

    try {
      const localM = localStorage.getItem(userMonthsKey);
      if (localM) setMonths(JSON.parse(localM));
      else setMonths([]);

      const localS = localStorage.getItem(userSalesKey);
      if (localS) setSalesByMonth(JSON.parse(localS));
      else setSalesByMonth({});
    } catch (e) {
      setMonths([]);
      setSalesByMonth({});
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    try {
      localStorage.setItem(`auto_months_${user.id}`, JSON.stringify(months));
    } catch (e) {}
  }, [months, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    try {
      localStorage.setItem(`auto_sales_${user.id}`, JSON.stringify(salesByMonth));
    } catch (e) {}
  }, [salesByMonth, user?.id]);

  const syncMonthToSupabase = useCallback(async (monthObj) => {
    if (!user?.id || !sessionRef.current?.access_token) return;
    try {
      const payload = {
        id: String(monthObj.id),
        user_id: String(user.id),
        nome_mes: String(monthObj.mes || ''),
        ano: String(monthObj.ano || '2026'),
        meta: Number(monthObj.meta) || 0,
        aliquota_liquida: Number(monthObj.netPercentage !== undefined ? monthObj.netPercentage : 69.0),
        lancamentos_extras: monthObj.extras || DEFAULT_EXTRAS
      };

      const { error } = await dbClient.from('meses').upsert(payload, { onConflict: 'id' });
      if (error) throw error;
    } catch (err) {
      console.warn('Falha no upload do mês:', err);
      showNotification(`Erro ao sincronizar mês com a nuvem: ${err.message || 'Falha de comunicação'}`, 'error');
      throw err;
    }
  }, [dbClient, user?.id, showNotification]);

  const syncSalesToSupabase = useCallback(async (mId, salesList) => {
    if (!user?.id || !sessionRef.current?.access_token) return;
    try {
      const payload = salesList.map(s => ({
        id: String(s.id),
        user_id: String(user.id),
        mes_id: String(mId),
        cliente: String(s.client || ''),
        carro: String(s.car || ''),
        vn: Number(s.vn) || 0,
        margem: Number(s.margin) || 0,
        fi: Number(s.fAndI) || 0,
        retorno_fi: String(s.returnFAndI || 'R0'),
        spf: Number(s.spf) || 0,
        acessorios: Number(s.accessories) || 0,
        autobox: Number(s.autobox) || 0,
        emplacamento: Number(s.emplacamento) || 0,
        seguro: Number(s.seguro) || 0,
        bonus_carro: Number(s.bonusCarro) || 0,
        usados_captados: Number(s.usadosCaptados) || 0
      }));

      if (payload.length > 0) {
        const { error: upsertErr } = await dbClient.from('vendas').upsert(payload, { onConflict: 'id' });
        if (upsertErr) throw upsertErr;
      }

      const { data: remoteRows, error: fetchErr } = await dbClient
        .from('vendas')
        .select('id', `mes_id=eq.${encodeURIComponent(mId)}&user_id=eq.${encodeURIComponent(user.id)}`);

      if (!fetchErr && Array.isArray(remoteRows)) {
        const currentActiveIds = new Set(salesList.map(s => String(s.id)));
        const idsToRemove = remoteRows
          .map(r => String(r.id))
          .filter(id => !currentActiveIds.has(id));

        for (const idToDelete of idsToRemove) {
          const { error: delErr } = await dbClient.from('vendas').delete().match({
            id: idToDelete,
            user_id: String(user.id)
          });
          if (delErr) console.warn('Falha ao remover item deletado:', delErr);
        }
      }
    } catch (err) {
      console.warn('Falha no upload de vendas:', err);
      showNotification(`Erro ao sincronizar vendas com a nuvem: ${err.message || 'Falha de comunicação'}`, 'error');
      throw err;
    }
  }, [dbClient, user?.id, showNotification]);

  useEffect(() => {
    if (!user?.id || !sessionRef.current?.access_token) return;
    let isSubscribed = true;

    const fetchFromSupabase = async () => {
      try {
        const { data: dbMonths, error: monthsErr } = await dbClient
          .from('meses')
          .select('*', `user_id=eq.${encodeURIComponent(user.id)}`);

        if (monthsErr) throw monthsErr;

        if (isSubscribed && dbMonths && Array.isArray(dbMonths)) {
          if (dbMonths.length === 0) {
            setMonths([]);
            setSalesByMonth({});
            try {
              localStorage.setItem(`auto_months_${user.id}`, JSON.stringify([]));
              localStorage.setItem(`auto_sales_${user.id}`, JSON.stringify({}));
            } catch (e) {}
            return;
          }

          const normalizedMonths = dbMonths.map(m => ({
            id: String(m.id),
            user_id: String(m.user_id || user.id),
            mes: String(m.nome_mes || 'Mês'),
            ano: String(m.ano || 2026),
            meta: Number(m.meta) || 15,
            netPercentage: m.aliquota_liquida !== undefined ? Number(m.aliquota_liquida) : 69.0,
            extras: m.lancamentos_extras || DEFAULT_EXTRAS
          }));

          setMonths(normalizedMonths);

          const { data: dbVendas, error: vendasErr } = await dbClient
            .from('vendas')
            .select('*', `user_id=eq.${encodeURIComponent(user.id)}`);

          if (vendasErr) throw vendasErr;

          if (isSubscribed && dbVendas && Array.isArray(dbVendas)) {
            const mapped = {};
            dbVendas.forEach(v => {
              const mId = String(v.mes_id);
              if (!mapped[mId]) mapped[mId] = [];
              mapped[mId].push({
                id: String(v.id),
                user_id: String(v.user_id || user.id),
                client: String(v.cliente || ''),
                car: String(v.carro || ''),
                vn: Number(v.vn) || 0,
                margin: Number(v.margem) || 0,
                fAndI: Number(v.fi) || 0,
                returnFAndI: String(v.retorno_fi || 'R0'),
                spf: Number(v.spf) || 0,
                accessories: Number(v.acessorios) || 0,
                autobox: Number(v.autobox) || 0,
                emplacamento: Number(v.emplacamento) || 0,
                seguro: Number(v.seguro) || 0,
                bonusCarro: Number(v.bonus_carro) || 0,
                usadosCaptados: Number(v.usados_captados) || 0
              });
            });
            setSalesByMonth(mapped);
          }
        }
      } catch (err) {
        console.warn('Conexão Supabase em contingência local:', err);
      }
    };

    fetchFromSupabase();

    return () => {
      isSubscribed = false;
    };
  }, [dbClient, user?.id]);

  const activeMonth = useMemo(() => {
    if (!selectedMonthId) return null;
    return months.find(m => String(m.id) === String(selectedMonthId)) || null;
  }, [months, selectedMonthId]);

  const activeSales = useMemo(() => {
    if (!selectedMonthId) return [];
    return salesByMonth[String(selectedMonthId)] || [];
  }, [salesByMonth, selectedMonthId]);

  const activeExtras = useMemo(() => {
    return activeMonth?.extras || DEFAULT_EXTRAS;
  }, [activeMonth]);

  const activeNetPercentage = useMemo(() => {
    return activeMonth?.netPercentage ?? 69.0;
  }, [activeMonth]);

  const metrics = useMemo(() => {
    return computeMonthMetrics(activeSales, activeExtras, activeNetPercentage);
  }, [activeSales, activeExtras, activeNetPercentage]);

  const modelVolumeData = useMemo(() => {
    const counts = {};
    activeSales.forEach(s => {
      const rawName = (s.car || '').trim();
      const model = rawName ? rawName.toUpperCase() : 'NÃO ESPECIFICADO';
      counts[model] = (counts[model] || 0) + 1;
    });

    const totalSales = activeSales.length;
    return Object.entries(counts)
      .map(([model, count]) => ({
        model,
        count,
        percentage: totalSales > 0 ? (count / totalSales) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count);
  }, [activeSales]);

  const grossCommissionSlices = useMemo(() => {
    const rawSlices = [
      { id: 'vn', label: 'Comissão VN', shortLabel: 'VN', value: metrics.commissionVn, color: '#38bdf8' },
      { id: 'margem', label: 'Comissão Margem', shortLabel: 'Margem', value: metrics.commissionMargin, color: '#0ea5e9' },
      { id: 'retorno', label: 'Retorno F&I', shortLabel: 'Retorno F&I', value: metrics.commissionRetornoFAndI, color: '#6366f1' },
      { id: 'spf', label: 'Comissão SPF', shortLabel: 'SPF', value: metrics.commissionSpf, color: '#8b5cf6' },
      { id: 'acessorios', label: 'Comissão Acessórios', shortLabel: 'Acessórios', value: metrics.commissionAcc, color: '#ec4899' },
      { id: 'autobox', label: 'Comissão Autobox', shortLabel: 'Autobox', value: metrics.commissionAutobox, color: '#f43f5e' },
      { id: 'emplacamento', label: 'Comissão Emplacamento', shortLabel: 'Emplacamento', value: metrics.commissionEmp, color: '#f97316' },
      { id: 'seguro', label: 'Seguros', shortLabel: 'Seguro', value: metrics.seguroTotal, color: '#eab308' },
      { id: 'bonus_usados', label: 'Bônus Carro + Usados C.', shortLabel: 'Bônus / Usados', value: metrics.bonusCarroTotal + metrics.usadosCaptadosTotal, color: '#10b981' },
      { id: 'dsr', label: 'DSR (20%)', shortLabel: 'DSR (20%)', value: metrics.dsr, color: '#14b8a6' },
      { id: 'extras', label: 'Lançamentos Extras', shortLabel: 'Extras', value: metrics.extrasTotal, color: '#06b6d4' },
    ];

    const valid = rawSlices.filter(slice => slice.value > 0.009);
    const total = valid.reduce((acc, curr) => acc + curr.value, 0);

    return valid.map(slice => ({
      ...slice,
      percent: total > 0 ? (slice.value / total) * 100 : 0
    }));
  }, [metrics]);

  const donutGeometry = useMemo(() => {
    const total = grossCommissionSlices.reduce((acc, curr) => acc + curr.value, 0);
    if (total <= 0) return [];

    let accumulatedAngle = 0;
    const cx = 130;
    const cy = 130;
    const outerR = 115;
    const innerR = 78;

    return grossCommissionSlices.map((slice, index) => {
      const sweep = (slice.value / total) * 360;
      const startAngle = accumulatedAngle;
      const endAngle = accumulatedAngle + sweep;
      accumulatedAngle = endAngle;

      const gap = grossCommissionSlices.length > 1 ? Math.min(1.8, sweep * 0.25) : 0;
      const effectiveStart = startAngle + gap / 2;
      const effectiveEnd = endAngle - gap / 2;

      const toRad = (deg) => (deg * Math.PI) / 180.0;
      const x1 = cx + outerR * Math.cos(toRad(effectiveStart));
      const y1 = cy + outerR * Math.sin(toRad(effectiveStart));
      const x2 = cx + outerR * Math.cos(toRad(effectiveEnd));
      const y2 = cy + outerR * Math.sin(toRad(effectiveEnd));
      const x3 = cx + innerR * Math.cos(toRad(effectiveEnd));
      const y3 = cy + innerR * Math.sin(toRad(effectiveEnd));
      const x4 = cx + innerR * Math.cos(toRad(effectiveStart));
      const y4 = cy + innerR * Math.sin(toRad(effectiveStart));

      const largeArc = sweep > 180 ? 1 : 0;

      const pathData = sweep >= 359.99
        ? `M ${cx} ${cy - outerR} A ${outerR} ${outerR} 0 1 0 ${cx} ${cy + outerR} A ${outerR} ${outerR} 0 1 0 ${cx} ${cy - outerR} M ${cx} ${cy - innerR} A ${innerR} ${innerR} 0 1 1 ${cx} ${cy + innerR} A ${innerR} ${innerR} 0 1 1 ${cx} ${cy - innerR} Z`
        : `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4} Z`;

      return {
        ...slice,
        index,
        pathData,
        sweep,
        midAngle: (startAngle + endAngle) / 2
      };
    });
  }, [grossCommissionSlices]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowCalculationModal(false);
        setIsAddModalOpen(false);
        setIsCreateMonthOpen(false);
        setIsEditMonthOpen(false);
        setMonthToEdit(null);
        setMonthToDelete(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCreateMonth = async (e) => {
    e.preventDefault();
    if (!user?.id) return;
    const newId = 'm_' + Date.now();
    const createdMonth = {
      id: newId,
      user_id: String(user.id),
      mes: newMonthForm.mes,
      ano: String(newMonthForm.ano || 2026),
      meta: Number(newMonthForm.meta) || 15,
      netPercentage: 69.0,
      extras: DEFAULT_EXTRAS
    };

    try {
      await syncMonthToSupabase(createdMonth);
      setMonths(prev => [createdMonth, ...prev]);
      setSalesByMonth(prev => ({ ...prev, [newId]: [] }));
      setIsCreateMonthOpen(false);
      setSelectedMonthId(newId);
      setCurrentScreen('DETAIL');
      showNotification(`Mês de ${createdMonth.mes}/${createdMonth.ano} criado com sucesso!`);
    } catch (err) {
      console.error('Falha ao criar mês no Supabase:', err);
      setMonths(prev => [createdMonth, ...prev]);
      setSalesByMonth(prev => ({ ...prev, [newId]: [] }));
      setIsCreateMonthOpen(false);
      setSelectedMonthId(newId);
      setCurrentScreen('DETAIL');
      showNotification(`Mês criado localmente. Erro na nuvem: ${err.message}`, 'error');
    }
  };

  const handleOpenEditMonth = (m) => {
    setMonthToEdit(m);
    setEditMonthForm({
      mes: m.mes,
      ano: Number(m.ano) || 2026,
      meta: Number(m.meta) || 15
    });
    setIsEditMonthOpen(true);
  };

  const handleUpdateMonth = async (e) => {
    e.preventDefault();
    if (!monthToEdit || !user?.id) return;

    const updatedMonth = {
      ...monthToEdit,
      user_id: String(user.id),
      mes: editMonthForm.mes,
      ano: String(editMonthForm.ano || '2026'),
      meta: Number(editMonthForm.meta) || 0
    };

    const nextMonths = months.map(m => String(m.id) === String(updatedMonth.id) ? updatedMonth : m);
    setMonths(nextMonths);
    setIsEditMonthOpen(false);
    setMonthToEdit(null);

    try {
      await syncMonthToSupabase(updatedMonth);
      showNotification("Competência atualizada com sucesso!");
    } catch (err) {
      console.error("Erro ao atualizar mês:", err);
      showNotification(`Competência salva localmente. Erro na nuvem: ${err.message}`, "error");
    }
  };

  const handleConfirmDeleteMonth = async () => {
    if (!monthToDelete || !user?.id) return;
    const mId = String(monthToDelete.id);

    setMonths(prev => prev.filter(m => String(m.id) !== mId));
    setSalesByMonth(prev => {
      const next = { ...prev };
      delete next[mId];
      return next;
    });

    if (selectedMonthId === mId) {
      setSelectedMonthId(null);
      setCurrentScreen('HUB');
    }

    setMonthToDelete(null);
    showNotification("Mês excluído localmente!");

    try {
      const { error: delVendasErr } = await dbClient.from('vendas').delete().match({
        mes_id: mId,
        user_id: String(user.id)
      });
      if (delVendasErr) throw delVendasErr;
      const { error: delMesErr } = await dbClient.from('meses').delete().match({
        id: mId,
        user_id: String(user.id)
      });
      if (delMesErr) throw delMesErr;
      showNotification("Mês excluído da nuvem com sucesso!");
    } catch (e) {
      console.warn('Erro ao remover do Supabase:', e);
      showNotification(`Erro ao excluir mês no Supabase: ${e.message}`, 'error');
    }
  };

  const handleUpdateActiveMonthExtras = (field, val) => {
    if (!selectedMonthId) return;
    const updatedExtras = { ...activeExtras, [field]: val };

    const nextMonths = months.map(m => {
      if (String(m.id) === String(selectedMonthId)) {
        return { ...m, extras: updatedExtras };
      }
      return m;
    });

    setMonths(nextMonths);
    const targetMonth = nextMonths.find(m => String(m.id) === String(selectedMonthId));
    if (targetMonth) {
      syncMonthToSupabase(targetMonth);
    }
  };

  const handleUpdateActiveNetPercentage = (val) => {
    if (!selectedMonthId) return;
    const nextMonths = months.map(m => {
      if (String(m.id) === String(selectedMonthId)) {
        return { ...m, netPercentage: val };
      }
      return m;
    });

    setMonths(nextMonths);
    const targetMonth = nextMonths.find(m => String(m.id) === String(selectedMonthId));
    if (targetMonth) {
      syncMonthToSupabase(targetMonth);
    }
  };

  const handleSaleChange = (saleId, field, value) => {
    if (!selectedMonthId) return;
    const currentSales = salesByMonth[selectedMonthId] || [];
    const nextList = currentSales.map(s => s.id === saleId ? { ...s, [field]: value } : s);

    setSalesByMonth(prev => ({ ...prev, [selectedMonthId]: nextList }));
    syncSalesToSupabase(selectedMonthId, nextList);
  };

  const handleRemoveSale = (saleId) => {
    if (!selectedMonthId) return;
    const currentSales = salesByMonth[selectedMonthId] || [];
    const nextList = currentSales.filter(s => s.id !== saleId);

    setSalesByMonth(prev => ({ ...prev, [selectedMonthId]: nextList }));
    syncSalesToSupabase(selectedMonthId, nextList);
    showNotification("Venda removida.");
  };

  const handleSaveNewSale = () => {
    if (!selectedMonthId || !user?.id) return;
    const currentSales = salesByMonth[selectedMonthId] || [];
    const clientName = newSale.client.trim() || `Cliente ${currentSales.length + 1}`;
    const carName = newSale.car.trim() || 'Veículo';

    const saleToAdd = {
      ...newSale,
      id: 'v_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      user_id: String(user.id),
      client: clientName,
      car: carName
    };

    const nextSales = [...currentSales, saleToAdd];
    setSalesByMonth(prev => ({ ...prev, [selectedMonthId]: nextSales }));
    setNewSale(DEFAULT_SALE);
    setIsAddModalOpen(false);
    showNotification("Venda adicionada com sucesso!");
    syncSalesToSupabase(selectedMonthId, nextSales);
  };

  if (!user) {
    return (
      <div className={`min-h-screen w-full flex items-center justify-center p-4 font-['Inter',sans-serif] antialiased relative overflow-hidden transition-colors duration-200 selection:bg-sky-500/30 selection:text-sky-200 ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800'
      }`}>
        
        {/* Floating Theme Toggle in Auth Screen */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={`Mudar para Modo ${isDark ? 'Claro' : 'Escuro'}`}
          title={`Mudar para Modo ${isDark ? 'Claro' : 'Escuro'}`}
          className={`fixed top-5 right-5 z-50 p-2.5 rounded-2xl border transition-all cursor-pointer shadow-lg active:scale-95 ${
            isDark
              ? 'bg-slate-900/90 border-slate-800 text-amber-400 hover:bg-slate-800 hover:text-amber-300 hover:border-slate-700'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          {isDark ? <Sun size={19} strokeWidth={2.2} /> : <Moon size={19} strokeWidth={2.2} />}
        </button>

        {/* Subtle radial depth gradient in background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        {toast && (
          <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium transition-all duration-300 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-3 ${
            toast.type === 'error' 
              ? 'bg-rose-950/80 border-rose-800/80 text-rose-200 shadow-rose-950/50' 
              : 'bg-emerald-950/80 border-emerald-800/80 text-emerald-200 shadow-emerald-950/50'
          }`}>
            <CheckCircle2 size={18} className={toast.type === 'error' ? 'text-rose-400' : 'text-emerald-400'} />
            <span>{toast.text}</span>
          </div>
        )}

        <div className={`w-full max-w-md rounded-3xl shadow-2xl p-8 border transition-all duration-200 animate-in zoom-in-95 relative z-10 ${
          isDark 
            ? 'bg-slate-900/90 backdrop-blur-2xl border-slate-800/90 border-t border-t-white/10 shadow-black/80 text-slate-100' 
            : 'bg-white border-slate-200/90 shadow-slate-300/40 text-slate-800'
        }`}>
          
          <div className="flex flex-col items-center text-center mb-6">
            <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center mb-3 shadow-inner text-sky-500 ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-sky-50 border-sky-200'
            }`}>
              {authMode === 'resetPassword' ? (
                <KeyRound size={24} strokeWidth={2} />
              ) : (
                <Car size={24} strokeWidth={2} />
              )}
            </div>
            
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-500 text-[10px] font-semibold uppercase tracking-wider mb-2">
              Plataforma Comercial Next-Gen
            </div>

            <h1 className={`text-xl font-black tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              {authMode === 'forgot'
                ? 'Recuperar Senha'
                : authMode === 'resetPassword'
                ? 'Definir Nova Senha'
                : 'Gestão & Comissões Auto'}
            </h1>
            <p className={`text-xs mt-1 max-w-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {authMode === 'forgot'
                ? 'Digite seu e-mail cadastrado para enviarmos as instruções de redefinição.'
                : authMode === 'resetPassword'
                ? 'Crie uma nova senha de no mínimo 6 caracteres para sua conta.'
                : 'Controle comercial executivo com criptografia e isolamento seguro de dados.'}
            </p>
          </div>

          {(authMode === 'login' || authMode === 'signup') && (
            <div className={`flex rounded-2xl p-1 mb-6 border ${
              isDark ? 'bg-slate-950/80 border-slate-800/80' : 'bg-slate-100 border-slate-200'
            }`}>
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  authMode === 'login'
                    ? isDark
                      ? 'bg-slate-800 text-sky-400 shadow-md border border-slate-700/80'
                      : 'bg-white text-sky-600 shadow-md border border-slate-200'
                    : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Acessar Conta
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('signup')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  authMode === 'signup'
                    ? isDark
                      ? 'bg-slate-800 text-sky-400 shadow-md border border-slate-700/80'
                      : 'bg-white text-sky-600 shadow-md border border-slate-200'
                    : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Criar Conta
              </button>
            </div>
          )}

          {authMode === 'forgot' ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  E-mail Cadastrado
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    required
                    value={authForm.email}
                    onChange={(e) => setAuthForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="seuemail@exemplo.com"
                    className={`w-full pl-10 pr-3 py-2.5 border text-xs font-medium rounded-xl transition-all focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 ${
                      isDark
                        ? 'bg-slate-950/80 border-slate-800 text-slate-100 placeholder:text-slate-600'
                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                    }`}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full mt-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs py-3 rounded-xl transition-all duration-150 shadow-lg shadow-sky-500/20 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {authLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Enviando Link...</span>
                  </>
                ) : (
                  <span>Enviar Link de Recuperação</span>
                )}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                    isDark ? 'text-slate-400 hover:text-sky-400' : 'text-slate-500 hover:text-sky-600'
                  }`}
                >
                  <ArrowLeft size={14} />
                  <span>Voltar ao Login</span>
                </button>
              </div>
            </form>
          ) : authMode === 'resetPassword' ? (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Nova Senha
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={resetPasswordForm.newPassword}
                    onChange={(e) => setResetPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="Mínimo 6 caracteres"
                    className={`w-full pl-10 pr-10 py-2.5 border text-xs font-medium rounded-xl transition-all focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 ${
                      isDark
                        ? 'bg-slate-950/80 border-slate-800 text-slate-100 placeholder:text-slate-600'
                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Confirmar Nova Senha
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={resetPasswordForm.confirmPassword}
                    onChange={(e) => setResetPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Repita a nova senha"
                    className={`w-full pl-10 pr-10 py-2.5 border text-xs font-medium rounded-xl transition-all focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 ${
                      isDark
                        ? 'bg-slate-950/80 border-slate-800 text-slate-100 placeholder:text-slate-600'
                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(p => !p)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full mt-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs py-3 rounded-xl transition-all duration-150 shadow-lg shadow-sky-500/20 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {authLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Salvando Nova Senha...</span>
                  </>
                ) : (
                  <span>Salvar Nova Senha</span>
                )}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                    isDark ? 'text-slate-400 hover:text-sky-400' : 'text-slate-500 hover:text-sky-600'
                  }`}
                >
                  <ArrowLeft size={14} />
                  <span>Voltar ao Login</span>
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={authMode === 'login' ? handleLogin : handleSignUp} className="space-y-4">
              {authMode === 'signup' && (
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Nome Completo
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <User size={16} />
                    </div>
                    <input
                      type="text"
                      required
                      value={authForm.name}
                      onChange={(e) => setAuthForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: João da Silva"
                      className={`w-full pl-10 pr-3 py-2.5 border text-xs font-medium rounded-xl transition-all focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 ${
                        isDark
                          ? 'bg-slate-950/80 border-slate-800 text-slate-100 placeholder:text-slate-600'
                          : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                      }`}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  E-mail Corporativo ou Pessoal
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    required
                    value={authForm.email}
                    onChange={(e) => setAuthForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="seuemail@exemplo.com"
                    className={`w-full pl-10 pr-3 py-2.5 border text-xs font-medium rounded-xl transition-all focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 ${
                      isDark
                        ? 'bg-slate-950/80 border-slate-800 text-slate-100 placeholder:text-slate-600'
                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                    }`}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={`block text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Senha de Acesso
                  </label>
                  {authMode === 'login' && (
                    <button
                      type="button"
                      onClick={() => setAuthMode('forgot')}
                      className="text-xs font-medium text-sky-500 hover:text-sky-400 hover:underline cursor-pointer"
                    >
                      Esqueceu a senha?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={authForm.password}
                    onChange={(e) => setAuthForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Mínimo 6 caracteres"
                    className={`w-full pl-10 pr-10 py-2.5 border text-xs font-medium rounded-xl transition-all focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 ${
                      isDark
                        ? 'bg-slate-950/80 border-slate-800 text-slate-100 placeholder:text-slate-600'
                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full mt-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs py-3 rounded-xl transition-all duration-150 shadow-lg shadow-sky-500/20 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {authLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>{authMode === 'login' ? 'Autenticando...' : 'Criando Conta...'}</span>
                  </>
                ) : (
                  <span>{authMode === 'login' ? 'Entrar no Sistema' : 'Criar Minha Conta'}</span>
                )}
              </button>
            </form>
          )}

          <div className={`mt-6 pt-4 border-t text-center text-[11px] ${
            isDark ? 'border-slate-800/80 text-slate-500' : 'border-slate-200 text-slate-400'
          }`}>
            <span>Seus dados comerciais são protegidos por criptografia e RLS.</span>
          </div>
        </div>
      </div>
    );
  }

  const renderHubScreen = () => {
    return (
      <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-8 py-8 space-y-8 animate-in fade-in duration-200">
        {/* Hub Welcome Banner with Controlled Depth */}
        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-6 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden transition-colors ${
          isDark
            ? 'bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 border-t border-t-white/10 shadow-black/50 text-slate-100'
            : 'bg-white border border-slate-200/90 shadow-slate-200 text-slate-800'
        }`}>
          <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-500 bg-sky-500/10 px-2.5 py-0.5 rounded-full border border-sky-500/20">
                Multi-Competência
              </span>
              <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Gestão Comercial Automotiva
              </span>
            </div>
            <h2 className={`text-2xl md:text-3xl font-black tracking-tight mt-2.5 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              Competências Comerciais
            </h2>
            <p className={`text-xs md:text-sm mt-1 max-w-xl leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Monitore seus fechamentos mensais, acompanhe o atingimento de metas e apure previsões líquidas com precisão.
            </p>
          </div>

          <div className="flex items-center gap-3 relative z-10">
            <button
              type="button"
              onClick={() => setIsCreateMonthOpen(true)}
              className="inline-flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs md:text-sm px-5 py-3 rounded-2xl transition-all duration-150 shadow-lg shadow-sky-500/20 active:scale-[0.98] cursor-pointer"
            >
              <Plus size={18} strokeWidth={2.5} />
              <span>Criar Novo Mês</span>
            </button>
          </div>
        </div>

        {/* Competencies Grid */}
        {months.length === 0 ? (
          <div className={`rounded-3xl p-12 text-center shadow-2xl transition-colors ${
            isDark
              ? 'bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 border-t border-t-white/10'
              : 'bg-white border border-slate-200/90 shadow-slate-200'
          }`}>
            <div className="max-w-md mx-auto flex flex-col items-center">
              <div className={`w-16 h-16 rounded-2xl border text-sky-500 flex items-center justify-center mb-4 shadow-inner ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-sky-50 border-sky-200'
              }`}>
                <Calendar size={32} strokeWidth={1.8} />
              </div>
              <h3 className={`text-lg font-bold tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                Nenhum mês de competência cadastrado
              </h3>
              <p className={`text-xs mt-1.5 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Comece criando sua primeira competência. Todos os lançamentos de vendas e cálculos de comissões serão sincronizados diretamente na nuvem.
              </p>
              <button
                type="button"
                onClick={() => setIsCreateMonthOpen(true)}
                className="mt-6 inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold px-5 py-2.5 rounded-xl transition-all duration-150 shadow-lg shadow-sky-500/20 cursor-pointer"
              >
                <Plus size={16} strokeWidth={2.2} />
                <span>Criar Primeiro Mês</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {months.map(m => {
              const mSales = salesByMonth[m.id] || [];
              const mMetrics = computeMonthMetrics(mSales, m.extras || DEFAULT_EXTRAS, m.netPercentage ?? 69.0);
              const metaProgress = m.meta > 0 ? Math.min(100, (mMetrics.volume / m.meta) * 100) : 0;

              return (
                <div 
                  key={m.id}
                  className={`rounded-3xl p-6 shadow-2xl transition-all duration-200 flex flex-col justify-between group relative overflow-hidden ${
                    isDark
                      ? 'bg-slate-900/80 backdrop-blur-xl border border-slate-800/90 border-t border-t-white/10 shadow-black/50 hover:border-slate-700/90 hover:shadow-sky-500/5'
                      : 'bg-white border border-slate-200/90 shadow-slate-200 hover:shadow-lg hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-2xl border text-sky-500 flex items-center justify-center group-hover:scale-105 transition-transform shadow-inner ${
                          isDark ? 'bg-slate-950 border-slate-800' : 'bg-sky-50 border-sky-200'
                        }`}>
                          <Calendar size={22} />
                        </div>
                        <div>
                          <h3 className={`text-lg font-bold tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                            {m.mes} / {m.ano}
                          </h3>
                          <div className={`flex items-center gap-2 text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            <Target size={12} className="text-sky-500" />
                            <span>Meta: {m.meta} veículos</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditMonth(m);
                          }}
                          className={`p-2 rounded-xl transition-colors cursor-pointer ${
                            isDark
                              ? 'text-slate-400 hover:text-sky-400 hover:bg-slate-800/60'
                              : 'text-slate-400 hover:text-sky-600 hover:bg-slate-100'
                          }`}
                          title="Editar Competência"
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMonthToDelete(m);
                          }}
                          className="text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 p-2 rounded-xl transition-colors cursor-pointer"
                          title="Excluir Mês"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Progresso da Meta</span>
                        <span className={`font-bold tabular-nums ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                          {mMetrics.volume} / {m.meta} ({metaProgress.toFixed(0)}%)
                        </span>
                      </div>
                      <div className={`w-full rounded-full h-2 overflow-hidden border p-[1px] ${
                        isDark ? 'bg-slate-950 border-slate-800/80' : 'bg-slate-100 border-slate-200'
                      }`}>
                        <div 
                          className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all duration-300 shadow-xs"
                          style={{ width: `${metaProgress}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className={`border rounded-2xl p-3 shadow-inner ${
                        isDark ? 'bg-slate-950/60 border-slate-800/70' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
                          Volume Faturado
                        </span>
                        <span className={`text-base font-extrabold mt-0.5 block tabular-nums ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                          {mMetrics.volume} {mMetrics.volume === 1 ? 'carro' : 'carros'}
                        </span>
                      </div>

                      <div className={`border rounded-2xl p-3 shadow-inner ${
                        isDark ? 'bg-slate-950/60 border-slate-800/70' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
                          Comissão Bruta
                        </span>
                        <span className={`text-base font-extrabold mt-0.5 block tabular-nums ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                          {formatBRL(mMetrics.grossCommission)}
                        </span>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950/60 border border-sky-500/20 text-white rounded-2xl p-4 flex items-center justify-between shadow-xl">
                      <div>
                        <span className="text-[10px] font-semibold text-sky-400 uppercase tracking-wider block">
                          Líquido Previsto
                        </span>
                        <span className="text-xl font-black text-sky-300 tracking-tight tabular-nums">
                          {formatBRL(mMetrics.netCommission)}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded-lg border border-sky-500/20">
                        {m.netPercentage ?? 69}%
                      </span>
                    </div>
                  </div>

                  <div className={`pt-5 mt-4 border-t ${isDark ? 'border-slate-800/80' : 'border-slate-200'}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMonthId(m.id);
                        setCurrentScreen('DETAIL');
                      }}
                      className={`w-full flex items-center justify-center gap-2 font-bold text-xs px-4 py-2.5 rounded-xl border transition-all duration-150 cursor-pointer ${
                        isDark
                          ? 'bg-slate-800/80 hover:bg-slate-800 hover:text-sky-300 text-slate-200 border-slate-700/60'
                          : 'bg-slate-100 hover:bg-slate-200 hover:text-sky-700 text-slate-700 border-slate-200'
                      }`}
                    >
                      <span>Acessar Lançamentos</span>
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderDetailScreen = () => {
    if (!activeMonth) return null;

    return (
      <div className="w-full max-w-[1720px] mx-auto space-y-6 print:space-y-0 animate-in fade-in duration-200">
        
        {/* Navigation Bar for Selected Month */}
        <div className="w-full px-4 sm:px-8 pt-4 sm:pt-6 print:hidden">
          <div className={`rounded-2xl p-4 sm:px-6 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
            isDark
              ? 'bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 border-t border-t-white/10 shadow-black/40 text-slate-100'
              : 'bg-white border border-slate-200/80 shadow-slate-200 text-slate-800'
          }`}>
            <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setCurrentScreen('HUB')}
                className={`inline-flex items-center gap-1.5 font-semibold text-xs px-3.5 py-2 rounded-xl border transition-all cursor-pointer shrink-0 ${
                  isDark
                    ? 'text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border-slate-700/60'
                    : 'text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border-slate-200'
                }`}
              >
                <ArrowLeft size={15} />
                <span>Voltar para Meses</span>
              </button>

              {/* Mobile Meta Badge */}
              <div className={`sm:hidden flex items-center gap-1.5 text-xs rounded-xl px-3 py-1.5 font-medium shrink-0 border ${
                isDark ? 'text-slate-300 bg-slate-950/80 border-slate-800' : 'text-slate-700 bg-slate-50 border-slate-200'
              }`}>
                <Target size={13} className="text-sky-500" />
                <span>Meta: <strong className={isDark ? 'text-white font-bold' : 'text-slate-900 font-bold'}>{activeMonth.meta}</strong></span>
              </div>

              <div className={`h-5 w-px hidden sm:block ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
              
              <div className="hidden sm:block">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Competência Ativa</span>
                <h2 className={`text-base font-bold tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                  {activeMonth.mes} / {activeMonth.ano}
                </h2>
              </div>
            </div>

            {/* Mobile Competency Title */}
            <div className={`sm:hidden pt-1 border-t ${isDark ? 'border-slate-800/80' : 'border-slate-200'}`}>
              <span className="text-[10px] text-slate-500 block font-semibold uppercase tracking-wider">Competência Ativa</span>
              <h2 className={`text-lg font-bold tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                {activeMonth.mes} / {activeMonth.ano}
              </h2>
            </div>

            {/* Desktop Meta Badge */}
            <div className={`hidden sm:flex items-center gap-2 text-xs rounded-xl px-3.5 py-2 font-medium shrink-0 shadow-inner border ${
              isDark ? 'text-slate-300 bg-slate-950/80 border-slate-800' : 'text-slate-700 bg-slate-50 border-slate-200'
            }`}>
              <Target size={14} className="text-sky-500" />
              <span>Meta: <strong className={isDark ? 'text-white font-bold' : 'text-slate-900 font-bold'}>{activeMonth.meta}</strong> veículos</span>
            </div>
          </div>
        </div>

        {/* Print Executive Header (strictly for @media print) */}
        <div className="hidden print:flex items-center justify-between border-b border-slate-300 pb-2 mb-2.5 text-slate-900">
          <div className="flex items-baseline gap-2.5">
            <h1 className="text-sm font-black tracking-tight text-slate-900 leading-none">
              Relatório Executivo de Vendas & Comissões
            </h1>
            <span className="text-[10px] text-slate-600 font-semibold">
              Competência: <strong>{activeMonth.mes} / {activeMonth.ano}</strong>
            </span>
            <span className="text-[9px] text-slate-400">
              • Emissão: {new Date().toLocaleDateString('pt-BR')}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[9.5px]">
            <span className="text-slate-600 font-medium">Meta: <strong>{activeMonth.meta}</strong> veículos</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-600">Alíquota Líquida:</span>
            <span className="text-slate-900 font-black bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
              {activeNetPercentage.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Print Top Metric Cards (strictly for @media print) */}
        <div className="hidden print:grid print:grid-cols-4 print:gap-3 print:mb-2.5 print-avoid-break">
          <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[9.5px] font-semibold text-slate-500 uppercase tracking-wider">
                Volume Total & Faixa VN
              </span>
              <span className="w-5 h-5 rounded bg-slate-50 flex items-center justify-center text-slate-400">
                <Layers size={12} />
              </span>
            </div>
            <div className="my-1">
              <span className="text-xl font-black text-slate-900 tracking-tight">
                {metrics.volume} {metrics.volume === 1 ? 'veículo' : 'veículos'}
              </span>
            </div>
            <div className="border-t border-slate-100 pt-1 text-[9px] text-slate-500 flex items-center justify-between">
              <span>Taxa Aplicada VN:</span>
              <span className="bg-rose-50 text-rose-700 font-bold px-1.5 py-0.2 rounded-full border border-rose-200">
                {formatPercent(metrics.vnTier)}
              </span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[9.5px] font-semibold text-slate-500 uppercase tracking-wider">
                DSR (20%)
              </span>
              <span className="w-5 h-5 rounded bg-slate-50 flex items-center justify-center text-slate-400">
                <ShieldCheck size={12} />
              </span>
            </div>
            <div className="my-1">
              <span className="text-xl font-black text-slate-900 tracking-tight">
                {formatBRL(metrics.dsr)}
              </span>
            </div>
            <div className="border-t border-slate-100 pt-1 text-[9px] text-slate-500 flex items-center justify-between">
              <span>Base de Cálculo</span>
              <span className="font-semibold text-slate-700">VN + Margem + Retorno</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[9.5px] font-semibold text-slate-500 uppercase tracking-wider">
                Comissão Bruta
              </span>
              <span className="w-5 h-5 rounded bg-sky-50 flex items-center justify-center text-sky-600">
                <Calculator size={12} />
              </span>
            </div>
            <div className="my-1">
              <span className="text-xl font-black text-slate-900 tracking-tight">
                {formatBRL(metrics.grossCommission)}
              </span>
            </div>
            <div className="border-t border-slate-100 pt-1 text-[9px] text-slate-500 flex items-center justify-between">
              <span>Origem</span>
              <span className="font-semibold text-slate-700">Comissões + Extras</span>
            </div>
          </div>

          <div 
            className="bg-slate-900 text-white rounded-xl p-3 border border-slate-800 flex flex-col justify-between print-dark-card"
            style={{ backgroundColor: '#0f172a', color: '#ffffff', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[9.5px] font-semibold uppercase tracking-wider text-sky-300">
                Líquido Previsto
              </span>
              <span className="text-[9px] font-bold text-sky-200 bg-white/10 px-1.5 py-0.2 rounded border border-white/10">
                {activeNetPercentage.toFixed(2)}%
              </span>
            </div>
            <div className="my-1">
              <span className="text-xl font-black text-sky-400 tracking-tight">
                {formatBRL(metrics.netCommission)}
              </span>
            </div>
            <div className="border-t border-white/10 pt-1 text-[9px] text-slate-300 flex items-center justify-between">
              <span>Alíquota Base:</span>
              <span className="font-semibold text-white">{activeNetPercentage.toFixed(2)}%</span>
            </div>
          </div>
        </div>

        {/* Print Extras Inline Strip */}
        <div className="hidden print:flex items-center justify-between border border-slate-300 rounded-xl bg-slate-50/90 p-2 px-3 mb-2.5 text-[9.5px] text-slate-800 print-avoid-break">
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-900 uppercase tracking-wider text-[8px] bg-slate-200/90 px-1.5 py-0.5 rounded">
              Premiações do mês:
            </span>
            <span>Usados: <strong className="font-bold text-slate-900">{formatBRL(activeExtras.premioUsados)}</strong></span>
            <span>Águia: <strong className="font-bold text-slate-900">{formatBRL(activeExtras.premioAguia)}</strong></span>
            <span>Líder: <strong className="font-bold text-slate-900">{formatBRL(activeExtras.premioLider)}</strong></span>
            <span>NPS: <strong className="font-bold text-slate-900">{formatBRL(activeExtras.premioNps)}</strong></span>
          </div>
          <div className="font-medium text-slate-700">
            Total Extras: <span className="font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-300">{formatBRL(metrics.extrasTotal)}</span>
          </div>
        </div>

        {/* 1. SEÇÃO: VISÃO GERAL DO MÊS (3 CARDS PRINCIPAIS) */}
        <section className="w-full print:hidden">
          <div className="w-full px-4 sm:px-8 pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <h2 className={`text-xl sm:text-2xl font-bold tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              Visão Geral do Mês
            </h2>
            <div className={`flex items-center gap-1.5 text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <Sparkles size={14} className="text-sky-500" />
              <span>Cálculos atualizados dinamicamente</span>
            </div>
          </div>

          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 px-4 sm:px-8 mt-4">
            
            {/* Card 1: Volume Total & Gatilho da Comissão */}
            <div className={`rounded-2xl p-6 flex flex-col justify-between transition-all duration-200 relative overflow-hidden group shadow-2xl ${
              isDark
                ? 'bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 border-t border-t-white/10 shadow-black/40 hover:border-slate-700'
                : 'bg-white border border-slate-200/90 shadow-slate-200 hover:border-slate-300'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Volume Total & Gatilho da Comissão
                </span>
                <span className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors shadow-inner ${
                  isDark
                    ? 'bg-slate-950 border-slate-800 text-slate-400 group-hover:text-sky-400'
                    : 'bg-slate-50 border-slate-200 text-slate-500 group-hover:text-sky-600'
                }`}>
                  <Layers size={16} />
                </span>
              </div>
              <div className="mt-4 flex items-baseline gap-2.5">
                <span className={`text-3xl font-black tracking-tight tabular-nums ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                  {metrics.volume}
                </span>
                <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {metrics.volume === 1 ? 'veículo faturado' : 'veículos faturados'}
                </span>
              </div>
              <div className={`mt-4 pt-3 border-t flex items-center justify-between text-xs ${
                isDark ? 'border-slate-800/80' : 'border-slate-100'
              }`}>
                <span className={`font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Taxa Aplicada VN:</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-500 border border-rose-500/30 tabular-nums">
                  {formatPercent(metrics.vnTier)}
                </span>
              </div>
            </div>

            {/* Card 2: Salário Bruto com DSR (20%) */}
            <div className={`rounded-2xl p-6 flex flex-col justify-between transition-all duration-200 relative group shadow-2xl ${
              isDark
                ? 'bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 border-t border-t-white/10 shadow-black/40 hover:border-slate-700'
                : 'bg-white border border-slate-200/90 shadow-slate-200 hover:border-slate-300'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Salário Bruto com DSR (20%)
                  </span>
                  <button 
                    type="button"
                    onClick={() => setShowCalculationModal(true)}
                    className="text-slate-400 hover:text-sky-500 transition-colors p-0.5 rounded-md cursor-pointer"
                    title="Ver memória de cálculo"
                  >
                    <Info size={15} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCalculationModal(true)}
                  className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-500 flex items-center justify-center hover:bg-sky-500/20 transition-colors cursor-pointer"
                  title="Abrir detalhamento"
                >
                  <ArrowUpRight size={16} />
                </button>
              </div>

              <div className="mt-4">
                <span 
                  onClick={() => setShowCalculationModal(true)}
                  className={`text-3xl font-black tracking-tight tabular-nums cursor-pointer hover:text-sky-500 transition-colors ${
                    isDark ? 'text-slate-100' : 'text-slate-900'
                  }`}
                >
                  {formatBRL(metrics.grossCommission)}
                </span>
              </div>

              <div className={`mt-4 pt-3 border-t flex items-center justify-between text-xs ${
                isDark ? 'border-slate-800/80' : 'border-slate-100'
              }`}>
                <span className={`font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Comissões + Extras + DSR</span>
                <button 
                  type="button"
                  onClick={() => setShowCalculationModal(true)}
                  className="text-sky-500 hover:text-sky-400 font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  Ver Detalhamento
                </button>
              </div>
            </div>

            {/* Card 3: Líquido Previsto a Receber */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950/70 border border-sky-500/30 border-t border-t-sky-400/30 text-white shadow-2xl shadow-sky-950/30 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-center justify-between z-10">
                <span className="text-xs font-semibold uppercase tracking-wider text-sky-400">
                  Líquido Previsto a Receber
                </span>
                
                <div className="flex items-center bg-slate-950/80 hover:bg-slate-950 backdrop-blur-md rounded-xl border border-slate-800 px-2 py-0.5">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={activeNetPercentage}
                    onChange={(e) => handleUpdateActiveNetPercentage(parseFloat(e.target.value) || 0)}
                    className="w-12 bg-transparent text-white font-bold text-xs text-right focus:outline-none tabular-nums"
                  />
                  <span className="text-sky-400 text-xs font-bold ml-0.5">%</span>
                </div>
              </div>

              <div className="mt-4 z-10">
                <span className="text-3xl font-black text-sky-400 tracking-tight tabular-nums">
                  {formatBRL(metrics.netCommission)}
                </span>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs z-10">
                <span className="text-slate-400">Alíquota Líquida Base:</span>
                <span className="font-bold text-white tabular-nums">{activeNetPercentage.toFixed(2)}%</span>
              </div>

              <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />
            </div>
          </div>
        </section>

        {/* 2. SEÇÃO: PREMIAÇÕES DO MÊS (MINI-CARDS) */}
        <section className="w-full px-4 sm:px-8 mt-6 print:hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Premiações do mês
            </span>
            <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Soma total: <strong className={`tabular-nums ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{formatBRL(metrics.extrasTotal)}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            {[
              { label: 'Prêmio Usados', val: activeExtras.premioUsados, icon: Award },
              { label: 'Prêmio Águia', val: activeExtras.premioAguia, icon: TrendingUp },
              { label: 'Prêmio Líder', val: activeExtras.premioLider, icon: Sparkles },
              { label: 'Prêmio NPS', val: activeExtras.premioNps, icon: CheckCircle2 }
            ].map((p, idx) => {
              const IconComp = p.icon;
              return (
                <div key={idx} className={`rounded-2xl p-3.5 flex items-center justify-between shadow-xl transition-colors ${
                  isDark
                    ? 'bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 text-slate-100'
                    : 'bg-white border border-slate-200/80 text-slate-800 shadow-slate-100'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-xl border text-sky-500 flex items-center justify-center shadow-inner ${
                      isDark ? 'bg-slate-950 border-slate-800' : 'bg-sky-50 border-sky-200'
                    }`}>
                      <IconComp size={15} />
                    </div>
                    <div>
                      <span className={`block text-[11px] font-medium leading-none ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{p.label}</span>
                      <span className={`text-sm font-bold mt-1 block tabular-nums ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{formatBRL(p.val)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 3. SEÇÃO: INTELIGÊNCIA COMERCIAL & ANÁLISE BI ANALYTICS (POSICIONADA ANTES DE VENDAS) */}
        <section className="w-full print:hidden">
          <div className="w-full px-6 sm:px-8 pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                  Inteligência Comercial & Análise BI
                </h2>
                <span className="bg-sky-500/10 text-sky-500 text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full border border-sky-500/20">
                  Analytics
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Distribuição de mix de faturamento e decomposição transparente das receitas apuradas
              </p>
            </div>
            <span className={`text-xs font-medium hidden sm:inline-block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {activeSales.length} {activeSales.length === 1 ? 'venda analisada' : 'vendas analisadas'}
            </span>
          </div>

          <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6 px-6 sm:px-8 mt-4 mb-8">
            
            {/* Chart 1: Volume por Modelo */}
            <div className={`rounded-2xl p-6 shadow-2xl transition-all duration-200 relative flex flex-col justify-between overflow-hidden ${
              isDark
                ? 'bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 border-t border-t-white/10 hover:border-slate-700 text-slate-100'
                : 'bg-white border border-slate-200/90 shadow-slate-200 hover:border-slate-300 text-slate-800'
            }`}>
              <div className={`flex items-start justify-between gap-3 border-b pb-4 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <div>
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-xl border text-sky-500 flex items-center justify-center shadow-inner ${
                      isDark ? 'bg-slate-950 border-slate-800' : 'bg-sky-50 border-sky-200'
                    }`}>
                      <BarChart3 size={16} />
                    </div>
                    <h3 className={`text-base font-bold tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                      Volume por Modelo
                    </h3>
                  </div>
                  <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Ranking decrescente de unidades faturadas no período
                  </p>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-xl border ${
                  isDark ? 'bg-slate-950 text-slate-300 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}>
                  {modelVolumeData.length} {modelVolumeData.length === 1 ? 'modelo' : 'modelos'}
                </span>
              </div>

              <div className="pt-5 pb-2 flex-1">
                {modelVolumeData.length === 0 ? (
                  <div className="h-56 flex flex-col items-center justify-center text-slate-500 text-xs">
                    <Car size={28} className="mb-2 text-slate-600" />
                    <span>Nenhum veículo lançado para análise gráfica.</span>
                  </div>
                ) : (
                  <div className="min-h-[400px] max-h-[540px] overflow-y-auto pr-2 space-y-3">
                    {modelVolumeData.map((item, idx) => {
                      const isHovered = activeModelBar === item.model;
                      const maxCount = modelVolumeData[0]?.count || 1;
                      const barWidth = Math.max(8, (item.count / maxCount) * 100);

                      return (
                        <div
                          key={item.model}
                          onMouseEnter={() => setActiveModelBar(item.model)}
                          onMouseLeave={() => setActiveModelBar(null)}
                          className={`p-2.5 rounded-xl border transition-all duration-200 relative cursor-pointer ${
                            isHovered 
                              ? isDark ? 'bg-slate-800/80 border-sky-500/40 shadow-lg' : 'bg-sky-50 border-sky-300 shadow-md'
                              : isDark ? 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              <span className={`w-5 h-5 rounded-md text-[10px] font-bold flex items-center justify-center shrink-0 ${
                                idx === 0 
                                  ? 'bg-sky-500 text-slate-950 shadow-xs' 
                                  : idx === 1 
                                  ? isDark ? 'bg-slate-700 text-white' : 'bg-slate-300 text-slate-800'
                                  : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'
                              }`}>
                                #{idx + 1}
                              </span>
                              <span className={`font-semibold truncate tracking-tight text-[13px] ${
                                isDark ? 'text-slate-200' : 'text-slate-800'
                              }`}>
                                {item.model}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 font-mono tabular-nums">
                              <span className={`font-bold text-xs ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                                {item.count} {item.count === 1 ? 'unid.' : 'unids.'}
                              </span>
                              <span className="text-[11px] font-bold text-sky-500 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20">
                                {item.percentage.toFixed(1).replace('.', ',')}%
                              </span>
                            </div>
                          </div>

                          <div className={`w-full rounded-full h-2 overflow-hidden border p-[1px] ${
                            isDark ? 'bg-slate-900 border-slate-800/80' : 'bg-slate-200 border-slate-300'
                          }`}>
                            <div
                              style={{ width: `${barWidth}%` }}
                              className={`h-full rounded-full bg-gradient-to-r from-sky-500 to-sky-400 transition-all duration-300 ${
                                isHovered ? 'shadow-lg shadow-sky-500/40' : ''
                              }`}
                            />
                          </div>

                          {isHovered && (
                            <div className="absolute right-3 -top-10 z-20 pointer-events-none backdrop-blur-xl bg-slate-950 text-white p-2 px-3 rounded-xl border border-slate-700 shadow-2xl text-xs flex items-center gap-2 animate-in fade-in zoom-in-95 duration-150">
                              <span className="w-2 h-2 rounded-full bg-sky-400" />
                              <span className="font-medium text-slate-400">{item.model}:</span>
                              <span className="font-bold text-white tabular-nums">{item.count} {item.count === 1 ? 'carro' : 'carros'}</span>
                              <span className="text-sky-400 text-[11px] tabular-nums">({item.percentage.toFixed(1)}%)</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className={`pt-3 border-t flex items-center justify-between text-[11px] ${
                isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'
              }`}>
                <span>Concentração no líder ({modelVolumeData[0]?.model || 'N/D'}):</span>
                <span className={`font-bold tabular-nums ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  {modelVolumeData[0]?.percentage ? `${modelVolumeData[0].percentage.toFixed(1).replace('.', ',')}% das vendas` : '0%'}
                </span>
              </div>
            </div>

            {/* Chart 2: Composição da Comissão Bruta */}
            <div className={`rounded-2xl p-6 shadow-2xl transition-all duration-200 relative flex flex-col justify-between overflow-hidden ${
              isDark
                ? 'bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 border-t border-t-white/10 hover:border-slate-700 text-slate-100'
                : 'bg-white border border-slate-200/90 shadow-slate-200 hover:border-slate-300 text-slate-800'
            }`}>
              <div className={`flex items-start justify-between gap-3 border-b pb-4 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <div>
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-xl border text-indigo-500 flex items-center justify-center shadow-inner ${
                      isDark ? 'bg-slate-950 border-slate-800' : 'bg-indigo-50 border-indigo-200'
                    }`}>
                      <PieChart size={16} />
                    </div>
                    <h3 className={`text-base font-bold tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                      Composição da Comissão Bruta
                    </h3>
                  </div>
                  <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Fatiamento proporcional da receita por origem de bonificação
                  </p>
                </div>
                <span className="text-xs font-bold bg-indigo-500/10 text-indigo-500 px-2.5 py-1 rounded-xl border border-indigo-500/20">
                  {grossCommissionSlices.length} {grossCommissionSlices.length === 1 ? 'fonte ativa' : 'fontes ativas'}
                </span>
              </div>

              <div className="pt-4 pb-2 flex-1">
                {grossCommissionSlices.length === 0 ? (
                  <div className="h-56 flex flex-col items-center justify-center text-slate-500 text-xs w-full">
                    <Calculator size={28} className="mb-2 text-slate-600" />
                    <span>Nenhuma comissão apurada para compor o gráfico.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center mt-3">
                    <div className="lg:col-span-5 flex items-center justify-center">
                      <div className="relative w-[260px] h-[260px] flex items-center justify-center shrink-0">
                        <svg width="260" height="260" viewBox="0 0 260 260" className="w-full h-full transform -rotate-90">
                          {donutGeometry.map((slice) => {
                            const isHovered = activeDonutSlice === slice.index;
                            return (
                              <path
                                key={slice.id}
                                d={slice.pathData}
                                fill={slice.color}
                                className="transition-all duration-200 cursor-pointer"
                                style={{
                                  transformOrigin: '130px 130px',
                                  transform: isHovered ? 'scale(1.04)' : 'scale(1)',
                                  filter: isHovered ? 'drop-shadow(0 0 8px rgba(56, 189, 248, 0.4))' : 'none',
                                  opacity: activeDonutSlice !== null && !isHovered ? 0.35 : 1
                                }}
                                onMouseEnter={() => setActiveDonutSlice(slice.index)}
                                onMouseLeave={() => setActiveDonutSlice(null)}
                              />
                            );
                          })}
                        </svg>

                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">TOTAL BRUTO</span>
                          <span className={`text-lg font-black tracking-tight tabular-nums ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                            {formatBRL(metrics.grossCommission)}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 mt-1">100% Ativo</span>
                        </div>

                        {activeDonutSlice !== null && donutGeometry[activeDonutSlice] && (
                          <div className="absolute -bottom-3 z-30 pointer-events-none backdrop-blur-xl bg-slate-950/95 text-white py-1.5 px-3 rounded-xl border border-slate-700 shadow-2xl text-[11px] whitespace-nowrap animate-in fade-in zoom-in-95 duration-150">
                            <div className="flex items-center gap-1.5 font-mono tabular-nums">
                              <span 
                                className="w-2 h-2 rounded-full shrink-0" 
                                style={{ backgroundColor: donutGeometry[activeDonutSlice].color }} 
                              />
                              <span className="font-semibold text-slate-300 font-sans">
                                {donutGeometry[activeDonutSlice].label}:
                              </span>
                              <span className="font-bold text-white">
                                {formatBRL(donutGeometry[activeDonutSlice].value)}
                              </span>
                              <span className="text-sky-400 font-semibold">
                                ({donutGeometry[activeDonutSlice].percent.toFixed(1).replace('.', ',')}%)
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="lg:col-span-7 flex flex-col justify-center space-y-1.5 min-w-0">
                      {grossCommissionSlices.filter(s => s.value > 0).map((slice, index) => {
                        const isHovered = activeDonutSlice === index;
                        return (
                          <div
                            key={slice.id}
                            onMouseEnter={() => setActiveDonutSlice(index)}
                            onMouseLeave={() => setActiveDonutSlice(null)}
                            className={`flex items-center justify-between gap-3 py-1.5 px-3 rounded-xl border transition-all cursor-pointer ${
                              isHovered 
                                ? isDark ? 'bg-slate-800 border-slate-700 shadow-md' : 'bg-slate-100 border-slate-300 shadow-sm'
                                : isDark ? 'bg-slate-950/50 border-slate-800/80 hover:bg-slate-850 hover:border-slate-700' : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                              <span className={`text-xs font-semibold whitespace-nowrap ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                {slice.shortLabel || slice.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 font-mono tabular-nums">
                              <span className={`text-xs font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                                {formatBRL(slice.value)}
                              </span>
                              <span className="text-[11px] font-semibold text-slate-500 w-12 text-right">
                                {slice.percent.toFixed(1).replace('.', ',')}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className={`pt-3 border-t flex items-center justify-between text-[11px] ${
                isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'
              }`}>
                <span>Maior alavanca de ganho:</span>
                <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  {grossCommissionSlices[0] ? `${grossCommissionSlices[0].label} (${grossCommissionSlices[0].percent.toFixed(1).replace('.', ',')}%)` : 'N/D'}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 4. SEÇÃO: LANÇAMENTO DE VENDAS (DESKTOP TABLE + MOBILE ACCORDION CARDS) */}
        <section className="w-full px-4 sm:px-8 mt-6 print:px-0 print:mt-0 print:space-y-0 print-avoid-break">
          <div className="mb-4 print:hidden">
            <h2 className={`text-xl sm:text-2xl font-bold tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              Lançamento de Vendas
            </h2>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Insira os dados individuais de cada venda realizada na competência
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <div className={`text-xs font-medium px-3 py-1.5 rounded-xl shadow-xs border ${
                isDark ? 'text-slate-300 bg-slate-900/80 border-slate-800' : 'text-slate-700 bg-white border-slate-200'
              }`}>
                Total de registros: <strong className={`font-bold tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>{activeSales.length}</strong>
              </div>
              <button
                type="button"
                onClick={() => setIsSalesCollapsed(prev => !prev)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-500 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer"
              >
                {isSalesCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                <span>{isSalesCollapsed ? 'Mostrar Lançamentos' : 'Recolher Lançamentos'}</span>
              </button>
            </div>
          </div>

          {/* DESKTOP VIEW: Fluid Wide Table */}
          <div className={`hidden lg:block rounded-2xl overflow-hidden shadow-2xl transition-colors print:border print:border-slate-300 print:rounded-xl print:shadow-none print:overflow-visible print:mb-2.5 ${
            isDark
              ? 'bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 border-t border-t-white/10 text-slate-100'
              : 'bg-white border border-slate-200/90 text-slate-800'
          }`}>
            <div className="w-full overflow-x-auto print:overflow-visible">
              <table className="w-full min-w-full text-left text-xs whitespace-nowrap print:text-[7.8px] print:w-full print:table-fixed">
                
                {/* Print Colgroup Width Allocation */}
                <colgroup className="hidden print:table-column-group">
                  <col className="w-[14%]" style={{ width: '14%' }} />
                  <col className="w-[11%]" style={{ width: '11%' }} />
                  <col className="w-[8%]" style={{ width: '8%' }} />
                  <col className="w-[7.5%]" style={{ width: '7.5%' }} />
                  <col className="w-[7.5%]" style={{ width: '7.5%' }} />
                  <col className="w-[5.5%]" style={{ width: '5.5%' }} />
                  <col className="w-[6.5%]" style={{ width: '6.5%' }} />
                  <col className="w-[7%]" style={{ width: '7%' }} />
                  <col className="w-[6.5%]" style={{ width: '6.5%' }} />
                  <col className="w-[6.5%]" style={{ width: '6.5%' }} />
                  <col className="w-[6.5%]" style={{ width: '6.5%' }} />
                  <col className="w-[6.5%]" style={{ width: '6.5%' }} />
                  <col className="w-[6.5%]" style={{ width: '6.5%' }} />
                </colgroup>

                <thead className={`border-b uppercase tracking-wider text-[11px] font-semibold print:bg-slate-100 print:text-[7.8px] print:border-b print:border-slate-300 ${
                  isDark ? 'bg-slate-950/80 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}>
                  <tr>
                    <th className="px-3 py-3 font-semibold print:text-slate-900 print:px-1 print:py-0.5 print:w-[14%] truncate">Cliente</th>
                    <th className="px-3 py-3 font-semibold print:text-slate-900 print:px-1 print:py-0.5 print:w-[11%] truncate">Carro</th>

                    <th className="px-3 py-2.5 text-right print:px-1 print:py-0.5 print:w-[8%]">
                      <div className="flex flex-col items-end">
                        <span className="font-semibold print:text-slate-900 print:text-[7.8px]">VN (R$)</span>
                        <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono tracking-tight bg-sky-500/15 text-sky-500 border border-sky-500/30 print:bg-transparent print:border-none print:p-0 print:text-[7.5px] print:mt-0 print:font-bold">
                          Tot: {formatBRL(metrics.vnBase)}
                        </span>
                      </div>
                    </th>

                    <th className="px-3 py-2.5 text-right print:px-1 print:py-0.5 print:w-[7.5%]">
                      <div className="flex flex-col items-end">
                        <span className="font-semibold print:text-slate-900 print:text-[7.8px]">Margem</span>
                        <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono tracking-tight bg-sky-500/15 text-sky-500 border border-sky-500/30 print:bg-transparent print:border-none print:p-0 print:text-[7.5px] print:mt-0 print:font-bold">
                          Tot: {formatBRL(metrics.marginBase)}
                        </span>
                      </div>
                    </th>

                    <th className="px-3 py-2.5 text-right print:px-1 print:py-0.5 print:w-[7.5%]">
                      <div className="flex flex-col items-end">
                        <span className="font-semibold print:text-slate-900 print:text-[7.8px]">F&I (R$)</span>
                        <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono tracking-tight bg-sky-500/15 text-sky-500 border border-sky-500/30 print:bg-transparent print:border-none print:p-0 print:text-[7.5px] print:mt-0 print:font-bold">
                          Tot: {formatBRL(metrics.fAndIBase)}
                        </span>
                      </div>
                    </th>

                    <th className="px-3 py-3 text-center font-semibold print:text-slate-900 print:px-1 print:py-0.5 print:w-[5.5%]">Retorno</th>
                    
                    <th className="px-3 py-2.5 text-right print:px-1 print:py-0.5 print:w-[6.5%]">
                      <div className="flex flex-col items-end">
                        <span className="font-semibold print:text-slate-900 print:text-[7.8px]">SPF</span>
                        <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono tracking-tight bg-sky-500/15 text-sky-500 border border-sky-500/30 print:bg-transparent print:border-none print:p-0 print:text-[7.5px] print:mt-0 print:font-bold">
                          Penetr: {formatPercent(metrics.spfPenetration)}
                        </span>
                      </div>
                    </th>

                    <th className="px-3 py-2.5 text-right print:px-1 print:py-0.5 print:w-[7%]">
                      <div className="flex flex-col items-end">
                        <span className="font-semibold print:text-slate-900 print:text-[7.8px]">Acessórios</span>
                        <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono tracking-tight bg-sky-500/15 text-sky-500 border border-sky-500/30 print:bg-transparent print:border-none print:p-0 print:text-[7.5px] print:mt-0 print:font-bold">
                          T.M: {formatBRL(metrics.accTicketHeader)}
                        </span>
                      </div>
                    </th>

                    <th className="px-3 py-2.5 text-right print:px-1 print:py-0.5 print:w-[6.5%]">
                      <div className="flex flex-col items-end">
                        <span className="font-semibold print:text-slate-900 print:text-[7.8px]">Autobox</span>
                        <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono tracking-tight bg-sky-500/15 text-sky-500 border border-sky-500/30 print:bg-transparent print:border-none print:p-0 print:text-[7.5px] print:mt-0 print:font-bold">
                          Tot: {formatBRL(metrics.autoboxBase)}
                        </span>
                      </div>
                    </th>

                    <th className="px-3 py-3 text-right font-semibold print:text-slate-900 print:px-1 print:py-0.5 print:w-[6.5%]">Emplac.</th>
                    <th className="px-3 py-3 text-right font-semibold print:text-slate-900 print:px-1 print:py-0.5 print:w-[6.5%]">Seguro</th>
                    <th className="px-3 py-3 text-right font-semibold print:text-slate-900 print:px-1 print:py-0.5 print:w-[6.5%]">Bônus</th>
                    <th className="px-3 py-3 text-right font-semibold print:text-slate-900 print:px-1 print:py-0.5 print:w-[6.5%]">Usados C.</th>
                    <th className="px-2 py-3 text-center font-semibold print:hidden w-12">Ações</th>
                  </tr>
                </thead>

                <tbody className={`divide-y print:divide-slate-200 ${
                  isDark ? 'divide-slate-800/80' : 'divide-slate-100'
                } ${isSalesCollapsed ? 'hidden print:table-row-group' : ''}`}>
                  {activeSales.length === 0 ? (
                    <tr>
                      <td colSpan="14" className="text-center py-16 print:py-4 px-4">
                        <div className="max-w-md mx-auto flex flex-col items-center justify-center text-center">
                          <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center text-slate-500 mb-3 shadow-inner print:hidden ${
                            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
                          }`}>
                            <ClipboardList size={26} strokeWidth={1.8} />
                          </div>
                          <h4 className={`text-sm font-bold tracking-tight ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                            Nenhuma venda registrada neste mês
                          </h4>
                          <p className={`text-xs mt-1 max-w-sm print:hidden ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            Seus lançamentos comerciais e cálculos em tempo real aparecerão aqui assim que você cadastrar o primeiro veículo.
                          </p>
                          <button
                            type="button"
                            onClick={() => setIsAddModalOpen(true)}
                            className="mt-4 inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold px-4 py-2 rounded-xl transition-all duration-150 shadow-lg shadow-sky-500/20 cursor-pointer print:hidden"
                          >
                            <Plus size={15} strokeWidth={2.5} />
                            <span>Clique em + Adicionar Nova Venda para iniciar</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    activeSales.map((sale, index) => (
                      <tr 
                        key={sale.id} 
                        className={`transition-colors duration-150 group print:hover:bg-transparent print:border-b print:border-slate-200 ${
                          isDark ? 'hover:bg-slate-850/40' : 'hover:bg-slate-50/70'
                        }`}
                      >
                        <td className="px-2 py-2 print:px-1 print:py-0.5 print:w-[14%] truncate">
                          <input 
                            type="text" 
                            value={sale.client} 
                            onChange={(e) => handleSaleChange(sale.id, 'client', e.target.value)}
                            placeholder={`Cliente ${index + 1}`}
                            className={`w-36 min-w-[150px] border text-xs font-medium rounded-xl px-2.5 py-1.5 transition-all focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 print:bg-transparent print:border-none print:p-0 print:text-[7.8px] print:text-slate-900 print:truncate print:h-auto print:w-full print:min-w-0 ${
                              isDark 
                                ? 'bg-slate-950/70 hover:bg-slate-950 focus:bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600'
                                : 'bg-slate-50/70 hover:bg-white focus:bg-white border-slate-200 text-slate-800 placeholder:text-slate-400'
                            }`}
                          />
                        </td>

                        <td className="px-2 py-2 print:px-1 print:py-0.5 print:w-[11%] truncate">
                          <input 
                            type="text" 
                            value={sale.car} 
                            onChange={(e) => handleSaleChange(sale.id, 'car', e.target.value)}
                            placeholder="Modelo"
                            className={`w-36 min-w-[140px] border text-xs font-medium rounded-xl px-2.5 py-1.5 transition-all focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 print:bg-transparent print:border-none print:p-0 print:text-[7.8px] print:text-slate-900 print:truncate print:h-auto print:w-full print:min-w-0 ${
                              isDark 
                                ? 'bg-slate-950/70 hover:bg-slate-950 focus:bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600'
                                : 'bg-slate-50/70 hover:bg-white focus:bg-white border-slate-200 text-slate-800 placeholder:text-slate-400'
                            }`}
                          />
                        </td>

                        <td className="px-2 py-2 print:px-1 print:py-0.5 print:w-[8%]">
                          <CurrencyInput 
                            theme={theme}
                            className="w-28 min-w-[115px] text-right text-xs" 
                            value={sale.vn} 
                            onChange={(v) => handleSaleChange(sale.id, 'vn', v)} 
                          />
                        </td>

                        <td className="px-2 py-2 print:px-1 print:py-0.5 print:w-[7.5%]">
                          <CurrencyInput 
                            theme={theme}
                            className="w-28 min-w-[115px] text-right text-xs" 
                            value={sale.margin} 
                            onChange={(v) => handleSaleChange(sale.id, 'margin', v)} 
                          />
                        </td>

                        <td className="px-2 py-2 print:px-1 print:py-0.5 print:w-[7.5%]">
                          <CurrencyInput 
                            theme={theme}
                            className="w-28 min-w-[115px] text-right text-xs" 
                            value={sale.fAndI} 
                            onChange={(v) => handleSaleChange(sale.id, 'fAndI', v)} 
                          />
                        </td>

                        <td className="px-2 py-2 print:px-1 print:py-0.5 print:w-[5.5%] text-center">
                          <select 
                            value={sale.returnFAndI} 
                            onChange={(e) => handleSaleChange(sale.id, 'returnFAndI', e.target.value)}
                            className={`w-24 min-w-[95px] border text-xs font-semibold rounded-xl px-2 py-1.5 text-center focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-all cursor-pointer print:bg-transparent print:border-none print:appearance-none print:p-0 print:text-[7.8px] print:text-center print:text-slate-900 print:w-full print:min-w-0 ${
                              isDark
                                ? 'bg-slate-950/70 hover:bg-slate-950 focus:bg-slate-950 border-slate-800 text-slate-200'
                                : 'bg-slate-50/70 hover:bg-white focus:bg-white border-slate-200 text-slate-800'
                            }`}
                          >
                            <option value="R0">R0 (0%)</option>
                            <option value="R1">R1 (1,2%)</option>
                            <option value="R2">R2 (2,4%)</option>
                            <option value="R3">R3 (3,6%)</option>
                            <option value="R4">R4 (4,8%)</option>
                          </select>
                        </td>

                        <td className="px-2 py-2 print:px-1 print:py-0.5 print:w-[6.5%]">
                          <CurrencyInput 
                            theme={theme}
                            className="w-28 min-w-[115px] text-right text-xs" 
                            value={sale.spf} 
                            onChange={(v) => handleSaleChange(sale.id, 'spf', v)} 
                          />
                        </td>

                        <td className="px-2 py-2 print:px-1 print:py-0.5 print:w-[7%]">
                          <CurrencyInput 
                            theme={theme}
                            className="w-28 min-w-[115px] text-right text-xs" 
                            value={sale.accessories} 
                            onChange={(v) => handleSaleChange(sale.id, 'accessories', v)} 
                          />
                        </td>

                        <td className="px-2 py-2 print:px-1 print:py-0.5 print:w-[6.5%]">
                          <CurrencyInput 
                            theme={theme}
                            className="w-28 min-w-[115px] text-right text-xs" 
                            value={sale.autobox} 
                            onChange={(v) => handleSaleChange(sale.id, 'autobox', v)} 
                          />
                        </td>

                        <td className="px-2 py-2 print:px-1 print:py-0.5 print:w-[6.5%]">
                          <CurrencyInput 
                            theme={theme}
                            className="w-28 min-w-[115px] text-right text-xs" 
                            value={sale.emplacamento} 
                            onChange={(v) => handleSaleChange(sale.id, 'emplacamento', v)} 
                          />
                        </td>

                        <td className="px-2 py-2 print:px-1 print:py-0.5 print:w-[6.5%]">
                          <CurrencyInput 
                            theme={theme}
                            className="w-28 min-w-[115px] text-right text-xs" 
                            value={sale.seguro} 
                            onChange={(v) => handleSaleChange(sale.id, 'seguro', v)} 
                          />
                        </td>

                        <td className="px-2 py-2 print:px-1 print:py-0.5 print:w-[6.5%]">
                          <CurrencyInput 
                            theme={theme}
                            className="w-28 min-w-[115px] text-right text-xs" 
                            value={sale.bonusCarro} 
                            onChange={(v) => handleSaleChange(sale.id, 'bonusCarro', v)} 
                          />
                        </td>

                        <td className="px-2 py-2 print:px-1 print:py-0.5 print:w-[6.5%]">
                          <CurrencyInput 
                            theme={theme}
                            className="w-28 min-w-[115px] text-right text-xs" 
                            value={sale.usadosCaptados} 
                            onChange={(v) => handleSaleChange(sale.id, 'usadosCaptados', v)} 
                          />
                        </td>

                        <td className="px-2 py-2 text-center print:hidden w-12">
                          <button 
                            type="button"
                            onClick={() => handleRemoveSale(sale.id)}
                            className="text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 p-1.5 rounded-xl transition-colors duration-150 cursor-pointer"
                            title="Remover venda"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className={`p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50/80 border-slate-200'
            } ${isSalesCollapsed ? 'hidden' : ''}`}>
              <button 
                type="button"
                onClick={() => setIsAddModalOpen(true)} 
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-sky-500/20 active:scale-[0.98] cursor-pointer"
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>Adicionar Nova Venda</span>
              </button>
              
              <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Pressione para abrir o formulário detalhado de cadastro de venda
              </span>
            </div>
          </div>

          {/* MOBILE FIRST VIEW: Ergonomic Accordion Cards */}
          <div className={`block lg:hidden space-y-3 print:hidden ${isSalesCollapsed ? 'hidden' : ''}`}>
            {activeSales.length === 0 ? (
              <div className={`border rounded-2xl p-8 text-center ${
                isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <ClipboardList size={32} className="mx-auto text-slate-500 mb-2" />
                <p className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Nenhuma venda lançada ainda</p>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="mt-4 w-full min-h-[44px] inline-flex items-center justify-center gap-2 bg-sky-500 text-slate-950 font-bold text-xs rounded-xl shadow-md"
                >
                  <Plus size={16} />
                  <span>Cadastrar Primeira Venda</span>
                </button>
              </div>
            ) : (
              <>
                {activeSales.map((sale, idx) => {
                  const isExpanded = expandedMobileCardId === sale.id;
                  return (
                    <div 
                      key={sale.id}
                      className={`border rounded-2xl p-4 shadow-xl space-y-3 transition-all ${
                        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-sky-500 block">
                            Registro #{idx + 1}
                          </span>
                          <h4 className={`text-sm font-bold truncate mt-0.5 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                            {sale.client || `Cliente ${idx + 1}`}
                          </h4>
                          <span className={`text-xs block truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {sale.car || 'Veículo não informado'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => setExpandedMobileCardId(isExpanded ? null : sale.id)}
                            className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border cursor-pointer ${
                              isDark
                                ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                                : 'bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900'
                            }`}
                            aria-label="Expandir detalhes"
                          >
                            <SlidersHorizontal size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemoveSale(sale.id)}
                            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500/20 cursor-pointer"
                            aria-label="Excluir venda"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Summary chips */}
                      <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                        <div className={`p-2 rounded-xl border ${
                          isDark ? 'bg-slate-950 border-slate-800/80 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}>
                          <span className="text-[10px] text-slate-500 uppercase block font-semibold">Valor da Nota</span>
                          <span className="font-bold font-mono">{formatBRL(sale.vn)}</span>
                        </div>
                        <div className={`p-2 rounded-xl border ${
                          isDark ? 'bg-slate-950 border-slate-800/80 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}>
                          <span className="text-[10px] text-slate-500 uppercase block font-semibold">Margem</span>
                          <span className="font-bold font-mono">{formatBRL(sale.margin)}</span>
                        </div>
                      </div>

                      {/* Collapsible inputs */}
                      {isExpanded && (
                        <div className={`pt-3 border-t space-y-3 animate-in fade-in duration-150 ${
                          isDark ? 'border-slate-800' : 'border-slate-200'
                        }`}>
                          <div className="grid grid-cols-1 gap-2.5">
                            <div>
                              <label className={`text-[11px] font-semibold block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Nome do Cliente</label>
                              <input
                                type="text"
                                value={sale.client}
                                onChange={(e) => handleSaleChange(sale.id, 'client', e.target.value)}
                                className={`min-h-[44px] w-full border rounded-xl px-3 text-xs ${
                                  isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                                }`}
                              />
                            </div>

                            <div>
                              <label className={`text-[11px] font-semibold block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Modelo do Carro</label>
                              <input
                                type="text"
                                value={sale.car}
                                onChange={(e) => handleSaleChange(sale.id, 'car', e.target.value)}
                                className={`min-h-[44px] w-full border rounded-xl px-3 text-xs ${
                                  isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                                }`}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2.5">
                            <div>
                              <label className={`text-[11px] font-semibold block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>F&I</label>
                              <CurrencyInput 
                                theme={theme}
                                className="min-h-[44px]"
                                value={sale.fAndI} 
                                onChange={(v) => handleSaleChange(sale.id, 'fAndI', v)} 
                              />
                            </div>
                            <div>
                              <label className={`text-[11px] font-semibold block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Retorno F&I</label>
                              <select 
                                value={sale.returnFAndI} 
                                onChange={(e) => handleSaleChange(sale.id, 'returnFAndI', e.target.value)}
                                className={`min-h-[44px] w-full border text-xs font-semibold rounded-xl px-2 ${
                                  isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                                }`}
                              >
                                <option value="R0">R0 (0%)</option>
                                <option value="R1">R1 (1,2%)</option>
                                <option value="R2">R2 (2,4%)</option>
                                <option value="R3">R3 (3,6%)</option>
                                <option value="R4">R4 (4,8%)</option>
                              </select>
                            </div>

                            <div>
                              <label className={`text-[11px] font-semibold block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>SPF</label>
                              <CurrencyInput 
                                theme={theme}
                                className="min-h-[44px]"
                                value={sale.spf} 
                                onChange={(v) => handleSaleChange(sale.id, 'spf', v)} 
                              />
                            </div>

                            <div>
                              <label className={`text-[11px] font-semibold block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Acessórios</label>
                              <CurrencyInput 
                                theme={theme}
                                className="min-h-[44px]"
                                value={sale.accessories} 
                                onChange={(v) => handleSaleChange(sale.id, 'accessories', v)} 
                              />
                            </div>

                            <div>
                              <label className={`text-[11px] font-semibold block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Autobox</label>
                              <CurrencyInput 
                                theme={theme}
                                className="min-h-[44px]"
                                value={sale.autobox} 
                                onChange={(v) => handleSaleChange(sale.id, 'autobox', v)} 
                              />
                            </div>

                            <div>
                              <label className={`text-[11px] font-semibold block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Emplacamento</label>
                              <CurrencyInput 
                                theme={theme}
                                className="min-h-[44px]"
                                value={sale.emplacamento} 
                                onChange={(v) => handleSaleChange(sale.id, 'emplacamento', v)} 
                              />
                            </div>

                            <div>
                              <label className={`text-[11px] font-semibold block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Seguro</label>
                              <CurrencyInput 
                                theme={theme}
                                className="min-h-[44px]"
                                value={sale.seguro} 
                                onChange={(v) => handleSaleChange(sale.id, 'seguro', v)} 
                              />
                            </div>

                            <div>
                              <label className={`text-[11px] font-semibold block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Bônus Carro</label>
                              <CurrencyInput 
                                theme={theme}
                                className="min-h-[44px]"
                                value={sale.bonusCarro} 
                                onChange={(v) => handleSaleChange(sale.id, 'bonusCarro', v)} 
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-2xl shadow-lg shadow-sky-500/20 active:scale-[0.98] cursor-pointer"
                >
                  <Plus size={18} strokeWidth={2.5} />
                  <span>Adicionar Nova Venda</span>
                </button>
              </>
            )}
          </div>
        </section>

        {/* 5. SEÇÃO: LANÇAMENTOS EXTRAS (INPUTS DE PREMIAÇÃO MANUAL) */}
        <section className="w-full px-4 sm:px-8 mt-6 print:hidden">
          <div className={`rounded-2xl p-6 sm:p-8 space-y-4 shadow-2xl transition-colors ${
            isDark
              ? 'bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 border-t border-t-white/10 text-slate-100'
              : 'bg-white border border-slate-200/90 text-slate-800'
          }`}>
            <div className={`flex items-center justify-between border-b pb-4 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <div>
                <h2 className={`text-xl font-bold tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                  Lançamentos de Premiações
                </h2>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Prêmios manuais e bônus que somam diretamente à comissão bruta
                </p>
              </div>
              <span className="text-xs font-bold text-sky-500 bg-sky-500/10 px-3 py-1 rounded-xl border border-sky-500/20 font-mono tabular-nums">
                Total: {formatBRL(metrics.extrasTotal)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-2">
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Prêmio Usados Captados
                </label>
                <CurrencyInput 
                  theme={theme}
                  value={activeExtras.premioUsados} 
                  onChange={(v) => handleUpdateActiveMonthExtras('premioUsados', v)} 
                />
              </div>

              <div>
                <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Prêmio Águia
                </label>
                <CurrencyInput 
                  theme={theme}
                  value={activeExtras.premioAguia} 
                  onChange={(v) => handleUpdateActiveMonthExtras('premioAguia', v)} 
                />
              </div>

              <div>
                <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Prêmio Líder
                </label>
                <CurrencyInput 
                  theme={theme}
                  value={activeExtras.premioLider} 
                  onChange={(v) => handleUpdateActiveMonthExtras('premioLider', v)} 
                />
              </div>

              <div>
                <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Prêmio NPS
                </label>
                <CurrencyInput 
                  theme={theme}
                  value={activeExtras.premioNps} 
                  onChange={(v) => handleUpdateActiveMonthExtras('premioNps', v)} 
                />
              </div>
            </div>
          </div>
        </section>

        {/* Print Bottom Section: Balanced Audit Grid (strictly for @media print) */}
        <div className="hidden print:grid print:grid-cols-12 print:gap-3 print:mt-3 print:mb-0 print-avoid-break">
          
          {/* Bloco 1: Memória de Cálculo (6 colunas) */}
          <div className="print:col-span-6 border border-slate-200 rounded-xl bg-white p-3 flex flex-col justify-between print-avoid-break">
            <div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-1.5 text-slate-900">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded bg-sky-50 text-sky-600 flex items-center justify-center">
                    <Calculator size={11} />
                  </div>
                  <h3 className="text-[9.5px] font-bold tracking-tight text-slate-900 uppercase">
                    Memória de Cálculo — Apuração da Comissão Bruta
                  </h3>
                </div>
                <span className="text-[8px] text-slate-500 font-semibold">
                  Regras Contratuais
                </span>
              </div>

              <div className="bg-slate-50/70 border border-slate-200 rounded-lg p-2 text-[8.5px]">
                <div className="grid grid-cols-2 gap-x-4">
                  <div className="space-y-1 divide-y divide-slate-100">
                    <div className="flex items-center justify-between pt-0.5">
                      <div className="truncate pr-1">
                        <span className="font-semibold text-slate-800 block truncate">1. Valor da Nota (VN)</span>
                        <span className="text-[7.5px] text-slate-500 truncate block">Base {formatBRL(metrics.vnBase)} × {formatPercent(metrics.vnTier)}</span>
                      </div>
                      <span className="font-bold text-slate-900 shrink-0">{formatBRL(metrics.commissionVn)}</span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="truncate pr-1">
                        <span className="font-semibold text-slate-800 block truncate">2. Margem</span>
                        <span className="text-[7.5px] text-slate-500 truncate block">Base {formatBRL(metrics.marginBase)} × {formatPercent(metrics.marginTier)}</span>
                      </div>
                      <span className="font-bold text-slate-900 shrink-0">{formatBRL(metrics.commissionMargin)}</span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="truncate pr-1">
                        <span className="font-semibold text-slate-800 block truncate">3. Retorno F&I</span>
                        <span className="text-[7.5px] text-slate-500 truncate block">Base {formatBRL(metrics.fAndIBaseRetorno)} × {formatPercent(metrics.fAndIAccelerator)}</span>
                      </div>
                      <span className="font-bold text-slate-900 shrink-0">{formatBRL(metrics.commissionRetornoFAndI)}</span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="truncate pr-1">
                        <span className="font-semibold text-slate-800 block truncate">4. SPF</span>
                        <span className="text-[7.5px] text-slate-500 truncate block">{metrics.spfCount} contr. × R$ 100,00</span>
                      </div>
                      <span className="font-bold text-slate-900 shrink-0">{formatBRL(metrics.commissionSpf)}</span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="truncate pr-1">
                        <span className="font-semibold text-slate-800 block truncate">5. Acessórios</span>
                        <span className="text-[7.5px] text-slate-500 truncate block">Base {formatBRL(metrics.accBase)} × {formatPercent(metrics.accTier)}</span>
                      </div>
                      <span className="font-bold text-slate-900 shrink-0">{formatBRL(metrics.commissionAcc)}</span>
                    </div>
                  </div>

                  <div className="space-y-1 divide-y divide-slate-100">
                    <div className="flex items-center justify-between pt-0.5">
                      <div className="truncate pr-1">
                        <span className="font-semibold text-slate-800 block truncate">6. Autobox</span>
                        <span className="text-[7.5px] text-slate-500 truncate block">Base {formatBRL(metrics.autoboxBase)} × 4,5%</span>
                      </div>
                      <span className="font-bold text-slate-900 shrink-0">{formatBRL(metrics.commissionAutobox)}</span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="truncate pr-1">
                        <span className="font-semibold text-slate-800 block truncate">7. Emplacamento</span>
                        <span className="text-[7.5px] text-slate-500 truncate block">Base {formatBRL(metrics.empBase)} × {formatPercent(metrics.empTier)}</span>
                      </div>
                      <span className="font-bold text-slate-900 shrink-0">{formatBRL(metrics.commissionEmp)}</span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="truncate pr-1">
                        <span className="font-semibold text-slate-800 block truncate">8. Premiações Diretas</span>
                        <span className="text-[7.5px] text-slate-500 truncate block">Seguro + Bônus + Usados C.</span>
                      </div>
                      <span className="font-bold text-slate-900 shrink-0">{formatBRL(metrics.commissionDirects)}</span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="truncate pr-1">
                        <span className="font-semibold text-slate-800 block truncate">9. DSR (20%)</span>
                        <span className="text-[7.5px] text-slate-500 truncate block">20% s/ VN + Margem + Retorno</span>
                      </div>
                      <span className="font-bold text-slate-900 shrink-0">{formatBRL(metrics.dsr)}</span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="truncate pr-1">
                        <span className="font-semibold text-slate-800 block truncate">10. Extras Manuais</span>
                        <span className="text-[7.5px] text-slate-500 truncate block">Usados + Águia + Líder + NPS</span>
                      </div>
                      <span className="font-bold text-slate-900 shrink-0">{formatBRL(metrics.extrasTotal)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-sky-50 border border-sky-200 rounded-lg p-1.5 px-2.5 flex justify-between items-center mt-1.5">
              <div>
                <span className="text-[9px] font-bold text-sky-950 block leading-tight">Total Geral Bruto Apurado</span>
                <span className="text-[8px] text-sky-700 leading-tight">
                  Previsão Líquida ({activeNetPercentage.toFixed(2)}%): <strong className="font-bold text-slate-900">{formatBRL(metrics.netCommission)}</strong>
                </span>
              </div>
              <span className="text-base font-black text-sky-700">{formatBRL(metrics.grossCommission)}</span>
            </div>
          </div>

          {/* Bloco 2: Volume por Modelo (3 colunas) */}
          <div className="print:col-span-3 border border-slate-200 rounded-xl p-3 bg-white flex flex-col justify-between print-avoid-break">
            <div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-1.5 text-slate-900">
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-sky-50 text-sky-600 flex items-center justify-center">
                    <BarChart3 size={11} />
                  </div>
                  <h4 className="text-[9px] font-bold text-slate-900 uppercase">
                    Volume por Modelo
                  </h4>
                </div>
                <span className="text-[7.5px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded">
                  {modelVolumeData.length} mod.
                </span>
              </div>

              <div className="space-y-1">
                {modelVolumeData.length === 0 ? (
                  <div className="py-4 text-center text-[8px] text-slate-400">
                    Nenhum modelo cadastrado
                  </div>
                ) : (
                  modelVolumeData.slice(0, 5).map((item, idx) => {
                    const maxCount = modelVolumeData[0]?.count || 1;
                    const barWidth = Math.max(10, (item.count / maxCount) * 100);

                    return (
                      <div key={item.model} className="p-0.5 px-1 rounded border border-slate-100 bg-slate-50/50">
                        <div className="flex items-center justify-between text-[8px] mb-0.5">
                          <div className="flex items-center gap-1 min-w-0 pr-1 truncate">
                            <span className="w-3 h-3 rounded bg-slate-200 text-slate-800 text-[6.5px] font-bold flex items-center justify-center shrink-0">
                              #{idx + 1}
                            </span>
                            <span className="font-bold text-slate-800 truncate">{item.model}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 font-mono">
                            <span className="font-black text-slate-900">{item.count} un.</span>
                            <span className="text-[7px] font-bold text-sky-700 bg-sky-50 px-1 py-0.2 rounded border border-sky-100">
                              {item.percentage.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-200/80 rounded-full h-1 overflow-hidden">
                          <div 
                            style={{ width: `${barWidth}%` }}
                            className="h-full rounded-full bg-sky-600"
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Bloco 3: Composição da Comissão Bruta (3 colunas) */}
          <div className="print:col-span-3 border border-slate-200 rounded-xl p-3 bg-white flex flex-col justify-between print-avoid-break">
            <div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-1 text-slate-900">
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <PieChart size={11} />
                  </div>
                  <h4 className="text-[9px] font-bold text-slate-900 uppercase">
                    Composição Bruta
                  </h4>
                </div>
                <span className="text-[7.5px] font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded border border-indigo-100">
                  {grossCommissionSlices.length} fontes
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                {grossCommissionSlices.length === 0 ? (
                  <div className="py-4 text-center text-[8px] text-slate-400 w-full">
                    Nenhuma receita lançada
                  </div>
                ) : (
                  <>
                    <div className="relative w-[145px] h-[145px] shrink-0 flex items-center justify-center">
                      <svg width="145" height="145" viewBox="0 0 260 260" className="w-full h-full transform -rotate-90">
                        {donutGeometry.map((slice) => (
                          <path
                            key={slice.id}
                            d={slice.pathData}
                            fill={slice.color}
                          />
                        ))}
                      </svg>
                      <div className="absolute inset-0 m-auto w-[62px] h-[62px] rounded-full bg-white border border-slate-200 flex flex-col items-center justify-center text-center p-0.5 pointer-events-none">
                        <span className="text-[6.5px] font-bold text-slate-400 uppercase leading-none">Total</span>
                        <span className="text-[7.5px] font-black text-slate-900 truncate max-w-[56px] mt-0.5 font-mono">
                          {formatBRL(metrics.grossCommission)}
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 space-y-0.5 text-[7.5px] min-w-0">
                      {grossCommissionSlices.slice(0, 6).map((slice) => (
                        <div key={slice.id} className="flex items-center justify-between py-0.5 px-0.5 border-b border-slate-50 last:border-none">
                          <div className="flex items-center gap-1 min-w-0 pr-0.5 truncate">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                            <span className="font-medium text-slate-700 truncate">{slice.shortLabel || slice.label}</span>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0 font-mono">
                            <span className="font-bold text-slate-900">{formatBRL(slice.value)}</span>
                            <span className="text-[6.5px] font-bold text-slate-500 w-4 text-right">
                              {slice.percent.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

        </div>

      </div>
    );
  };

  const userDisplayName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuário';

  return (
    <div className={`min-h-screen w-full flex flex-col items-center justify-start font-['Inter',sans-serif] antialiased transition-colors duration-200 selection:bg-sky-500/30 selection:text-sky-200 print:bg-white print:text-slate-900 print:p-0 print:m-0 print:min-h-0 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800'
    }`}>
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl border text-sm font-medium transition-all duration-300 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-3 ${
          toast.type === 'error' 
            ? 'bg-rose-950/80 border-rose-800/80 text-rose-200 shadow-rose-950/50' 
            : 'bg-emerald-950/80 border-emerald-800/80 text-emerald-200 shadow-emerald-950/50'
        }`}>
          <CheckCircle2 size={18} className={toast.type === 'error' ? 'text-rose-400' : 'text-emerald-400'} />
          <span>{toast.text}</span>
        </div>
      )}

      {/* Main Top Header with Theme Switcher, Profile & Glass finish */}
      <header className={`w-full sticky top-0 z-30 flex items-center justify-between px-4 sm:px-8 py-3.5 border-b backdrop-blur-xl transition-colors print:hidden ${
        isDark ? 'bg-slate-950/80 border-slate-800/80 text-slate-100' : 'bg-white/90 border-slate-200/80 text-slate-800 shadow-xs'
      }`}>
        <div 
          className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group" 
          onClick={() => setCurrentScreen('HUB')}
        >
          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl border flex items-center justify-center text-sky-500 shadow-inner group-hover:border-sky-500/50 transition-colors shrink-0 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-sky-50 border-sky-200'
          }`}>
            <Car size={20} className="sm:w-[22px] sm:h-[22px]" strokeWidth={2.2} />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className={`text-base sm:text-lg font-black tracking-tight leading-none transition-colors ${
                isDark ? 'text-slate-100 group-hover:text-white' : 'text-slate-900 group-hover:text-sky-600'
              }`}>
                Gestão & Comissões Auto
              </h1>
              <span className="bg-sky-500/10 text-sky-500 border border-sky-500/20 text-[9px] sm:text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full hidden sm:inline-block">
                MULTI-MESES
              </span>
            </div>
            <p className={`text-xs font-normal mt-0.5 hidden md:block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Controle comercial executivo & sincronização em nuvem
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* User Profile Chip with Controlled Depth */}
          <div className={`flex items-center gap-2 sm:gap-2.5 border rounded-2xl py-1 sm:py-1.5 px-2.5 sm:px-3 shadow-inner ${
            isDark ? 'bg-slate-900/80 border-slate-800/90' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-sky-600 to-sky-400 text-slate-950 flex items-center justify-center font-black text-xs uppercase shadow-xs shrink-0">
              {userDisplayName.charAt(0)}
            </div>
            <div className="hidden sm:block text-left">
              <span className={`text-xs font-bold block leading-none ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                {userDisplayName}
              </span>
              <span className={`text-[10px] block leading-tight truncate max-w-[130px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {user?.email}
              </span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 p-1.5 rounded-xl transition-all cursor-pointer ml-0.5 sm:ml-1 shrink-0"
              title="Sair da Conta"
            >
              <LogOut size={15} />
            </button>
          </div>

          {/* Theme Toggle Button in Header */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Mudar para Modo ${isDark ? 'Claro' : 'Escuro'}`}
            title={`Mudar para Modo ${isDark ? 'Claro' : 'Escuro'}`}
            className={`p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer shrink-0 active:scale-95 ${
              isDark
                ? 'bg-slate-900/80 border-slate-800/90 text-amber-400 hover:bg-slate-800 hover:text-amber-300 hover:border-slate-700'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            {isDark ? <Sun size={16} strokeWidth={2.2} /> : <Moon size={16} strokeWidth={2.2} />}
          </button>

          {currentScreen === 'DETAIL' && (
            <button 
              type="button"
              onClick={() => window.print()} 
              className="inline-flex items-center justify-center gap-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold px-2.5 py-2 sm:px-3.5 sm:py-2 rounded-xl transition-all duration-150 shadow-lg shadow-sky-500/20 active:scale-[0.98] cursor-pointer shrink-0"
              title="Imprimir ou salvar em PDF"
            >
              <Printer size={14} className="shrink-0" />
              <span className="hidden sm:inline">Exportar </span><span>PDF</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full flex-1 pb-12 print:pb-0 print:p-0">
        {currentScreen === 'HUB' ? renderHubScreen() : renderDetailScreen()}
      </main>

      {/* Modal: Novo Mês de Competência */}
      {isCreateMonthOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget) setIsCreateMonthOpen(false); }}
        >
          <div className={`border rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 ${
            isDark ? 'bg-slate-900 border-slate-800 border-t border-t-white/10 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl border text-sky-500 flex items-center justify-center shadow-inner ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-sky-50 border-sky-200'
                }`}>
                  <Calendar size={18} />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Novo Mês de Competência</h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Crie um novo período de lançamentos</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsCreateMonthOpen(false)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                  isDark ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800' : 'text-slate-400 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateMonth} className="p-6 space-y-4">
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Mês de Competência
                </label>
                <select
                  value={newMonthForm.mes}
                  onChange={(e) => setNewMonthForm(prev => ({ ...prev, mes: e.target.value }))}
                  className={`w-full border text-sm font-medium rounded-xl px-3 py-2.5 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                >
                  {MONTH_NAMES.map(m => (
                    <option key={m} value={m} className={isDark ? "bg-slate-900 text-slate-100" : "bg-white text-slate-800"}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Ano
                </label>
                <input 
                  type="number"
                  value={newMonthForm.ano}
                  onChange={(e) => setNewMonthForm(prev => ({ ...prev, ano: e.target.value }))}
                  min="2020"
                  max="2035"
                  className={`w-full border text-sm font-medium rounded-xl px-3 py-2.5 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                  required
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Meta de Vendas (Quantidade de Veículos)
                </label>
                <input 
                  type="number"
                  value={newMonthForm.meta}
                  onChange={(e) => setNewMonthForm(prev => ({ ...prev, meta: e.target.value }))}
                  min="1"
                  className={`w-full border text-sm font-medium rounded-xl px-3 py-2.5 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                  required
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateMonthOpen(false)}
                  className={`font-semibold text-xs px-4 py-2.5 rounded-xl transition-colors cursor-pointer ${
                    isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-sky-500/20 active:scale-[0.98] cursor-pointer"
                >
                  Criar e Abrir Mês
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Competência */}
      {isEditMonthOpen && monthToEdit && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget) setIsEditMonthOpen(false); }}
        >
          <div className={`border rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 ${
            isDark ? 'bg-slate-900 border-slate-800 border-t border-t-white/10 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl border text-sky-500 flex items-center justify-center shadow-inner ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-sky-50 border-sky-200'
                }`}>
                  <Pencil size={18} />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Editar Competência</h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Altere o período ou a meta da competência</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsEditMonthOpen(false)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                  isDark ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800' : 'text-slate-400 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateMonth} className="p-6 space-y-4">
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Mês de Competência
                </label>
                <select
                  value={editMonthForm.mes}
                  onChange={(e) => setEditMonthForm(prev => ({ ...prev, mes: e.target.value }))}
                  className={`w-full border text-sm font-medium rounded-xl px-3 py-2.5 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                >
                  {MONTH_NAMES.map(m => (
                    <option key={m} value={m} className={isDark ? "bg-slate-900 text-slate-100" : "bg-white text-slate-800"}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Ano
                </label>
                <input 
                  type="number"
                  value={editMonthForm.ano}
                  onChange={(e) => setEditMonthForm(prev => ({ ...prev, ano: e.target.value }))}
                  min="2020"
                  max="2035"
                  className={`w-full border text-sm font-medium rounded-xl px-3 py-2.5 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                  required
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Meta de Vendas (Quantidade de Veículos)
                </label>
                <input 
                  type="number"
                  value={editMonthForm.meta}
                  onChange={(e) => setEditMonthForm(prev => ({ ...prev, meta: e.target.value }))}
                  min="1"
                  className={`w-full border text-sm font-medium rounded-xl px-3 py-2.5 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                  required
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditMonthOpen(false)}
                  className={`font-semibold text-xs px-4 py-2.5 rounded-xl transition-colors cursor-pointer ${
                    isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-sky-500/20 active:scale-[0.98] cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Exclusão de Mês */}
      {monthToDelete && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget) setMonthToDelete(null); }}
        >
          <div className={`border rounded-3xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200 space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-800 border-t border-t-white/10 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center shadow-inner">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className={`text-base font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                Excluir mês {monthToDelete.mes} / {monthToDelete.ano}?
              </h3>
              <p className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Todas as vendas cadastradas e cálculos desta competência serão excluídos permanentemente da nuvem e do armazenamento local.
              </p>
            </div>
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setMonthToDelete(null)}
                className={`font-semibold text-xs px-4 py-2.5 rounded-xl transition-colors cursor-pointer ${
                  isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteMonth}
                className="bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-rose-500/20 active:scale-[0.98] cursor-pointer"
              >
                Sim, Excluir Mês
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Memória de Cálculo */}
      {showCalculationModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget) setShowCalculationModal(false); }}
        >
          <div className={`border rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-200 ${
            isDark ? 'bg-slate-900 border-slate-800 border-t border-t-white/10 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between sticky top-0 z-10 ${
              isDark ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl border text-sky-500 flex items-center justify-center shadow-inner ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-sky-50 border-sky-200'
                }`}>
                  <Calculator size={20} />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Memória de Cálculo</h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Detalhamento transparente da apuração da Comissão Bruta</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowCalculationModal(false)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                  isDark ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800' : 'text-slate-400 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto p-6 space-y-4 flex-1 text-xs">
              <div className={`border rounded-2xl p-4 space-y-3 font-mono divide-y ${
                isDark ? 'bg-slate-950/60 border-slate-800 divide-slate-800/80 text-slate-200' : 'bg-slate-50 border-slate-200 divide-slate-200 text-slate-800'
              }`}>
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className={`font-semibold block font-sans ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>1. Comissão Valor da Nota (VN)</span>
                    <span className="text-[11px] text-slate-500 font-sans">Base {formatBRL(metrics.vnBase)} × {formatPercent(metrics.vnTier)} ({metrics.volume} veículos)</span>
                  </div>
                  <span className={`font-bold text-sm tabular-nums ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{formatBRL(metrics.commissionVn)}</span>
                </div>

                <div className="flex items-center justify-between pt-2.5">
                  <div>
                    <span className={`font-semibold block font-sans ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>2. Comissão Margem</span>
                    <span className="text-[11px] text-slate-500 font-sans">Base {formatBRL(metrics.marginBase)} × {formatPercent(metrics.marginTier)}</span>
                  </div>
                  <span className={`font-bold text-sm tabular-nums ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{formatBRL(metrics.commissionMargin)}</span>
                </div>

                <div className="flex items-center justify-between pt-2.5">
                  <div>
                    <span className={`font-semibold block font-sans ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>3. Retorno F&I</span>
                    <span className="text-[11px] text-slate-500 font-sans">Base Retorno F&I ({formatBRL(metrics.fAndIBaseRetorno)}) × Acelerador SPF ({formatPercent(metrics.fAndIAccelerator)})</span>
                  </div>
                  <span className={`font-bold text-sm tabular-nums ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{formatBRL(metrics.commissionRetornoFAndI)}</span>
                </div>

                <div className="flex items-center justify-between pt-2.5">
                  <div>
                    <span className={`font-semibold block font-sans ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>4. Comissão SPF</span>
                    <span className="text-[11px] text-slate-500 font-sans">{metrics.spfCount} contratos com SPF × R$ 100,00</span>
                  </div>
                  <span className={`font-bold text-sm tabular-nums ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{formatBRL(metrics.commissionSpf)}</span>
                </div>

                <div className="flex items-center justify-between pt-2.5">
                  <div>
                    <span className={`font-semibold block font-sans ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>5. Comissão Acessórios</span>
                    <span className="text-[11px] text-slate-500 font-sans">Base {formatBRL(metrics.accBase)} × {formatPercent(metrics.accTier)} (T.M.: {formatBRL(metrics.accTicketCommission)})</span>
                  </div>
                  <span className={`font-bold text-sm tabular-nums ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{formatBRL(metrics.commissionAcc)}</span>
                </div>

                <div className="flex items-center justify-between pt-2.5">
                  <div>
                    <span className={`font-semibold block font-sans ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>6. Comissão Autobox</span>
                    <span className="text-[11px] text-slate-500 font-sans">Base {formatBRL(metrics.autoboxBase)} × 4,5%</span>
                  </div>
                  <span className={`font-bold text-sm tabular-nums ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{formatBRL(metrics.commissionAutobox)}</span>
                </div>

                <div className="flex items-center justify-between pt-2.5">
                  <div>
                    <span className={`font-semibold block font-sans ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>7. Comissão Emplacamento</span>
                    <span className="text-[11px] text-slate-500 font-sans">Base {formatBRL(metrics.empBase)} × {formatPercent(metrics.empTier)} (Penetração: {formatPercent(metrics.empPenetration)})</span>
                  </div>
                  <span className={`font-bold text-sm tabular-nums ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{formatBRL(metrics.commissionEmp)}</span>
                </div>

                <div className="flex items-center justify-between pt-2.5">
                  <div>
                    <span className={`font-semibold block font-sans ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>8. Premiações Diretas da Tabela</span>
                    <span className="text-[11px] text-slate-500 font-sans">Seguros ({formatBRL(metrics.seguroTotal)}) + Bônus ({formatBRL(metrics.bonusCarroTotal)}) + Usados C. ({formatBRL(metrics.usadosCaptadosTotal)})</span>
                  </div>
                  <span className={`font-bold text-sm tabular-nums ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{formatBRL(metrics.commissionDirects)}</span>
                </div>

                <div className="flex items-center justify-between pt-2.5">
                  <div>
                    <span className={`font-semibold block font-sans ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>9. DSR (Descanso Semanal Remunerado)</span>
                    <span className="text-[11px] text-slate-500 font-sans">20% sobre (VN + Margem + Retorno F&I)</span>
                  </div>
                  <span className={`font-bold text-sm tabular-nums ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{formatBRL(metrics.dsr)}</span>
                </div>

                <div className="flex items-center justify-between pt-2.5">
                  <div>
                    <span className={`font-semibold block font-sans ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>10. Lançamentos Extras Manuais</span>
                    <span className="text-[11px] text-slate-500 font-sans">Usados ({formatBRL(activeExtras.premioUsados)}) + Águia ({formatBRL(activeExtras.premioAguia)}) + Líder ({formatBRL(activeExtras.premioLider)}) + NPS ({formatBRL(activeExtras.premioNps)})</span>
                  </div>
                  <span className={`font-bold text-sm tabular-nums ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{formatBRL(metrics.extrasTotal)}</span>
                </div>
              </div>

              <div className="p-4 bg-sky-500/10 border border-sky-500/20 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-sky-500 block">Total Geral Bruto Apurado</span>
                  <span className="text-[11px] text-slate-500">Previsão Líquida ({activeNetPercentage.toFixed(2)}%): <strong className={isDark ? 'text-white font-mono' : 'text-slate-900 font-mono'}>{formatBRL(metrics.netCommission)}</strong></span>
                </div>
                <span className="text-xl font-black text-sky-500 font-mono tabular-nums">{formatBRL(metrics.grossCommission)}</span>
              </div>
            </div>

            <div className={`px-6 py-3.5 border-t flex justify-end ${
              isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <button
                type="button"
                onClick={() => setShowCalculationModal(false)}
                className={`font-bold text-xs px-5 py-2.5 rounded-xl transition-all duration-150 cursor-pointer ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                }`}
              >
                Concluir Visualização
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Nova Venda */}
      {isAddModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget) setIsAddModalOpen(false); }}
        >
          <div className={`border rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-200 ${
            isDark ? 'bg-slate-900 border-slate-800 border-t border-t-white/10 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between sticky top-0 z-10 ${
              isDark ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl border text-sky-500 flex items-center justify-center shadow-inner ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-sky-50 border-sky-200'
                }`}>
                  <Car size={20} />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Nova Venda</h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Cadastre os valores comerciais e agregados do veículo</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                  isDark ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800' : 'text-slate-400 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto p-6 space-y-5 flex-1 text-xs">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sky-500 font-bold text-xs uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-sky-500" />
                  <span>Grupo 1: Identificação Básica</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Nome do Cliente
                    </label>
                    <input 
                      type="text"
                      value={newSale.client}
                      onChange={(e) => setNewSale(prev => ({ ...prev, client: e.target.value }))}
                      placeholder={`Cliente ${activeSales.length + 1}`}
                      className={`border text-sm font-medium rounded-xl px-3 py-2 w-full transition-all duration-150 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 ${
                        isDark ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Modelo do Veículo
                    </label>
                    <input 
                      type="text"
                      value={newSale.car}
                      onChange={(e) => setNewSale(prev => ({ ...prev, car: e.target.value }))}
                      placeholder="Ex: DOLPHIN MINI GL"
                      className={`border text-sm font-medium rounded-xl px-3 py-2 w-full transition-all duration-150 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 ${
                        isDark ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                      }`}
                    />
                  </div>
                </div>
              </div>

              <div className={`space-y-3 pt-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <div className="flex items-center gap-2 text-sky-500 font-bold text-xs uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-sky-500" />
                  <span>Grupo 2: Valores Principais</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Valor da Nota (VN)
                    </label>
                    <CurrencyInput 
                      theme={theme}
                      value={newSale.vn}
                      onChange={(val) => setNewSale(prev => ({ ...prev, vn: val }))}
                      className="text-sm py-2 px-3 rounded-xl"
                      placeholder="R$ 0,00"
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Margem Comercial
                    </label>
                    <CurrencyInput 
                      theme={theme}
                      value={newSale.margin}
                      onChange={(val) => setNewSale(prev => ({ ...prev, margin: val }))}
                      className="text-sm py-2 px-3 rounded-xl"
                      placeholder="R$ 0,00"
                    />
                  </div>
                </div>
              </div>

              <div className={`space-y-3 pt-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <div className="flex items-center gap-2 text-sky-500 font-bold text-xs uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-sky-500" />
                  <span>Grupo 3: F&I e Financiamento</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      F&I / Financiamento
                    </label>
                    <CurrencyInput 
                      theme={theme}
                      value={newSale.fAndI}
                      onChange={(val) => setNewSale(prev => ({ ...prev, fAndI: val }))}
                      className="text-sm py-2 px-3 rounded-xl"
                      placeholder="R$ 0,00"
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Retorno F&I
                    </label>
                    <select
                      value={newSale.returnFAndI}
                      onChange={(e) => setNewSale(prev => ({ ...prev, returnFAndI: e.target.value }))}
                      className={`border text-sm font-medium rounded-xl px-3 py-2 w-full transition-all duration-150 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 cursor-pointer ${
                        isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    >
                      <option value="R0">R0 (0,0%)</option>
                      <option value="R1">R1 (1,2%)</option>
                      <option value="R2">R2 (2,4%)</option>
                      <option value="R3">R3 (3,6%)</option>
                      <option value="R4">R4 (4,8%)</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Valor SPF
                    </label>
                    <CurrencyInput 
                      theme={theme}
                      value={newSale.spf}
                      onChange={(val) => setNewSale(prev => ({ ...prev, spf: val }))}
                      className="text-sm py-2 px-3 rounded-xl"
                      placeholder="R$ 0,00"
                    />
                  </div>
                </div>
              </div>

              <div className={`space-y-3 pt-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <div className="flex items-center gap-2 text-sky-500 font-bold text-xs uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-sky-500" />
                  <span>Grupo 4: Serviços e Acessórios Agregados</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Acessórios
                    </label>
                    <CurrencyInput 
                      theme={theme}
                      value={newSale.accessories}
                      onChange={(val) => setNewSale(prev => ({ ...prev, accessories: val }))}
                      className="text-sm py-2 px-3 rounded-xl"
                      placeholder="R$ 0,00"
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Autobox
                    </label>
                    <CurrencyInput 
                      theme={theme}
                      value={newSale.autobox}
                      onChange={(val) => setNewSale(prev => ({ ...prev, autobox: val }))}
                      className="text-sm py-2 px-3 rounded-xl"
                      placeholder="R$ 0,00"
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Emplacamento
                    </label>
                    <CurrencyInput 
                      theme={theme}
                      value={newSale.emplacamento}
                      onChange={(val) => setNewSale(prev => ({ ...prev, emplacamento: val }))}
                      className="text-sm py-2 px-3 rounded-xl"
                      placeholder="R$ 0,00"
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Seguro
                    </label>
                    <CurrencyInput 
                      theme={theme}
                      value={newSale.seguro}
                      onChange={(val) => setNewSale(prev => ({ ...prev, seguro: val }))}
                      className="text-sm py-2 px-3 rounded-xl"
                      placeholder="R$ 0,00"
                    />
                  </div>
                </div>
              </div>

              <div className={`space-y-3 pt-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <div className="flex items-center gap-2 text-sky-500 font-bold text-xs uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-sky-500" />
                  <span>Grupo 5: Premiações Diretas</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Bônus Carro
                    </label>
                    <CurrencyInput 
                      theme={theme}
                      value={newSale.bonusCarro}
                      onChange={(val) => setNewSale(prev => ({ ...prev, bonusCarro: val }))}
                      className="text-sm py-2 px-3 rounded-xl"
                      placeholder="R$ 0,00"
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Usados Captados
                    </label>
                    <CurrencyInput 
                      theme={theme}
                      value={newSale.usadosCaptados}
                      onChange={(val) => setNewSale(prev => ({ ...prev, usadosCaptados: val }))}
                      className="text-sm py-2 px-3 rounded-xl"
                      placeholder="R$ 0,00"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className={`px-6 py-4 border-t flex flex-col-reverse sm:flex-row items-center justify-end gap-3 sticky bottom-0 z-10 ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <button 
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className={`w-full sm:w-auto font-semibold text-xs px-5 py-2.5 rounded-xl transition-all duration-150 cursor-pointer ${
                  isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={handleSaveNewSale}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs px-6 py-2.5 rounded-xl transition-all duration-150 shadow-lg shadow-sky-500/20 active:scale-[0.98] cursor-pointer"
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>Salvar Venda</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global CSS for Print and Themes */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 5mm 7mm;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-shadow: none !important;
            text-shadow: none !important;
          }
          html, body, #root, div {
            background-color: #ffffff !important;
            color: #0f172a !important;
          }
          html, body {
            font-size: 8px !important;
            line-height: 1.15 !important;
            width: 100% !important;
            height: 100% !important;
            overflow: hidden !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-avoid-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .print-dark-card {
            background-color: #0f172a !important;
            color: #ffffff !important;
          }
          table {
            table-layout: fixed !important;
            width: 100% !important;
          }
          th, td {
            padding: 1px 3px !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
          }
          input, select {
            border: none !important;
            box-shadow: none !important;
            padding: 1px 3px !important;
            background: transparent !important;
            color: #0f172a !important;
            font-size: 7.8px !important;
            height: auto !important;
            width: 100% !important;
            min-width: 0 !important;
          }
        }
      `}</style>

    </div>
  );
}