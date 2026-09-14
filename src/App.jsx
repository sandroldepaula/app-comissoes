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
  AlertTriangle,
  User,
  LogOut,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Loader2
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
    
    // Strict block: never allow anonymous requests to private data tables
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

    // Intercept 401 Unauthorized or expired tokens to auto-refresh session
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

const CurrencyInput = ({ value, onChange, className, placeholder, disabled }) => {
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
      className={`bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 text-slate-800 text-xs font-medium rounded-lg px-2.5 py-1.5 w-full transition-all duration-150 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 print:bg-transparent print:border-none print:p-0 print:text-[8.5px] print:font-semibold print:text-slate-900 print:text-right print:shadow-none print:h-auto ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className || ''}`}
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

  // Authentication State
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
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup'
  const [authLoading, setAuthLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [authForm, setAuthForm] = useState({
    name: '',
    email: '',
    password: ''
  });

  const [toast, setToast] = useState(null);

  const showNotification = useCallback((text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

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
    
    // Purge cached financial data associated with the user
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

  // Operational Navigation & Data States
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

      // Step 1: Safe Upsert of active items to prevent data loss on network drops
      if (payload.length > 0) {
        const { error: upsertErr } = await dbClient.from('vendas').upsert(payload, { onConflict: 'id' });
        if (upsertErr) throw upsertErr;
      }

      // Step 2: Fetch remote IDs to safely remove only deleted items
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
      { id: 'vn', label: 'Comissão VN', shortLabel: 'VN', value: metrics.commissionVn, color: '#0284C7' },
      { id: 'margem', label: 'Comissão Margem', shortLabel: 'Margem', value: metrics.commissionMargin, color: '#0EA5E9' },
      { id: 'retorno', label: 'Retorno F&I', shortLabel: 'Retorno F&I', value: metrics.commissionRetornoFAndI, color: '#6366F1' },
      { id: 'spf', label: 'Comissão SPF', shortLabel: 'SPF', value: metrics.commissionSpf, color: '#8B5CF6' },
      { id: 'acessorios', label: 'Comissão Acessórios', shortLabel: 'Acessórios', value: metrics.commissionAcc, color: '#EC4899' },
      { id: 'autobox', label: 'Comissão Autobox', shortLabel: 'Autobox', value: metrics.commissionAutobox, color: '#F43F5E' },
      { id: 'emplacamento', label: 'Comissão Emplacamento', shortLabel: 'Emplacamento', value: metrics.commissionEmp, color: '#F97316' },
      { id: 'seguro', label: 'Seguros', shortLabel: 'Seguro', value: metrics.seguroTotal, color: '#EAB308' },
      { id: 'bonus_usados', label: 'Bônus Carro + Usados C.', shortLabel: 'Bônus / Usados', value: metrics.bonusCarroTotal + metrics.usadosCaptadosTotal, color: '#10B981' },
      { id: 'dsr', label: 'DSR (20%)', shortLabel: 'DSR (20%)', value: metrics.dsr, color: '#14B8A6' },
      { id: 'extras', label: 'Lançamentos Extras', shortLabel: 'Extras', value: metrics.extrasTotal, color: '#3B82F6' },
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
      <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center p-4 font-['Inter',sans-serif] antialiased selection:bg-sky-500 selection:text-white">
        {toast && (
          <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 ${
            toast.type === 'error' 
              ? 'bg-rose-50 border-rose-200 text-rose-800' 
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}>
            <CheckCircle2 size={18} className={toast.type === 'error' ? 'text-rose-600' : 'text-emerald-600'} />
            <span>{toast.text}</span>
          </div>
        )}

        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 border border-slate-200/80 animate-in zoom-in-95 duration-200">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center mb-3 shadow-xs">
              <Car size={26} strokeWidth={2.2} />
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Gestão & Comissões Auto
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
              Plataforma comercial com sincronização em nuvem e isolamento seguro de dados.
            </p>
          </div>

          <div className="flex rounded-2xl bg-slate-100 p-1 mb-6">
            <button
              type="button"
              onClick={() => setAuthMode('login')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                authMode === 'login'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Acessar Conta
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('signup')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                authMode === 'signup'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Criar Conta
            </button>
          </div>

          <form onSubmit={authMode === 'login' ? handleLogin : handleSignUp} className="space-y-4">
            {authMode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nome Completo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User size={16} />
                  </div>
                  <input
                    type="text"
                    required
                    value={authForm.name}
                    onChange={(e) => setAuthForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: João da Silva"
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 text-slate-800 text-xs font-medium rounded-xl transition-all focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                E-mail Corporativo ou Pessoal
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  required
                  value={authForm.email}
                  onChange={(e) => setAuthForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="seuemail@exemplo.com"
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 text-slate-800 text-xs font-medium rounded-xl transition-all focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Senha de Acesso
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={authForm.password}
                  onChange={(e) => setAuthForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 text-slate-800 text-xs font-medium rounded-xl transition-all focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full mt-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs py-3 rounded-xl transition-all duration-150 shadow-sm shadow-sky-600/25 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
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

          <div className="mt-6 pt-4 border-t border-slate-100 text-center text-[11px] text-slate-400">
            <span>Seus dados comerciais são protegidos por criptografia e RLS.</span>
          </div>
        </div>
      </div>
    );
  }

  const renderHubScreen = () => {
    return (
      <div className="w-full px-6 sm:px-8 py-8 space-y-8 animate-in fade-in duration-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-100">
                Multi-Competência
              </span>
              <span className="text-xs text-slate-400 font-medium">Gestão Comercial Automotiva</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight mt-2">
              Competências Comerciais
            </h2>
            <p className="text-xs md:text-sm text-slate-500 mt-1 max-w-xl">
              Gerencie seus meses de faturamento, visualize comparativos de desempenho e acompanhe a evolução das comissões em qualquer dispositivo.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsCreateMonthOpen(true)}
              className="inline-flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs md:text-sm px-5 py-3 rounded-2xl transition-all duration-150 shadow-sm shadow-sky-600/20 active:scale-[0.98] cursor-pointer"
            >
              <Plus size={18} strokeWidth={2.5} />
              <span>Criar Novo Mês</span>
            </button>
          </div>
        </div>

        {months.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center shadow-sm">
            <div className="max-w-md mx-auto flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mb-4 border border-sky-100">
                <Calendar size={32} strokeWidth={1.8} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                Nenhum mês de competência cadastrado
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Comece criando sua primeira competência (ex: Setembro / 2026). Todos os lançamentos de vendas e cálculos de comissões serão sincronizados diretamente na nuvem.
              </p>
              <button
                type="button"
                onClick={() => setIsCreateMonthOpen(true)}
                className="mt-6 inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition-all duration-150 shadow-sm shadow-sky-600/20 cursor-pointer"
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
                  className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between group relative overflow-hidden"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100 group-hover:scale-105 transition-transform">
                          <Calendar size={22} />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                            {m.mes} / {m.ano}
                          </h3>
                          <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                            <Target size={12} />
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
                          className="text-slate-400 hover:text-sky-600 hover:bg-sky-50 p-2 rounded-xl transition-colors cursor-pointer"
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
                          className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-xl transition-colors cursor-pointer"
                          title="Excluir Mês"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="text-slate-500">Progresso da Meta</span>
                        <span className="text-slate-800 font-bold">{mMetrics.volume} / {m.meta} ({metaProgress.toFixed(0)}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden p-[1px]">
                        <div 
                          className="h-full rounded-full bg-gradient-to-r from-sky-500 to-sky-600 transition-all duration-300"
                          style={{ width: `${metaProgress}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-3">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                          Volume Faturado
                        </span>
                        <span className="text-base font-extrabold text-slate-900 mt-0.5 block">
                          {mMetrics.volume} {mMetrics.volume === 1 ? 'carro' : 'carros'}
                        </span>
                      </div>

                      <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-3">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                          Comissão Bruta
                        </span>
                        <span className="text-base font-extrabold text-slate-900 mt-0.5 block">
                          {formatBRL(mMetrics.grossCommission)}
                        </span>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-slate-900 to-sky-950 text-white rounded-2xl p-4 flex items-center justify-between shadow-xs">
                      <div>
                        <span className="text-[10px] font-semibold text-sky-300 uppercase tracking-wider block">
                          Líquido Previsto
                        </span>
                        <span className="text-xl font-extrabold text-sky-400 tracking-tight">
                          {formatBRL(mMetrics.netCommission)}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-sky-200 bg-white/10 px-2 py-0.5 rounded-lg border border-white/10">
                        {m.netPercentage ?? 69}%
                      </span>
                    </div>
                  </div>

                  <div className="pt-5 mt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMonthId(m.id);
                        setCurrentScreen('DETAIL');
                      }}
                      className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-sky-50 text-slate-800 hover:text-sky-700 font-semibold text-xs px-4 py-2.5 rounded-xl transition-all duration-150 cursor-pointer"
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
      <div className="w-full space-y-0 print:space-y-0 animate-in fade-in duration-200">
        
        {/* Navigation Bar for Selected Month */}
        <div className="w-full px-6 sm:px-8 pt-6 print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-4 px-6 shadow-sm">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCurrentScreen('HUB')}
                className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 font-semibold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer"
              >
                <ArrowLeft size={15} />
                <span>Voltar para Meses</span>
              </button>
              <div className="h-5 w-px bg-slate-200 hidden sm:block" />
              <div>
                <span className="text-xs text-slate-400 block font-medium">Competência Ativa</span>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  {activeMonth.mes} / {activeMonth.ano}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 font-medium">
                <Target size={14} className="text-sky-600" />
                <span>Meta: <strong>{activeMonth.meta}</strong> veículos</span>
              </div>
            </div>
          </div>
        </div>

        {/* Print Executive Header (Page 1 Top) */}
        <div className="hidden print:flex items-center justify-between border-b border-slate-300 pb-2 mb-3 text-slate-900">
          <div className="flex items-baseline gap-2.5">
            <h1 className="text-base font-black tracking-tight text-slate-900 leading-none">
              Relatório Executivo de Vendas & Comissões
            </h1>
            <span className="text-[10.5px] text-slate-600 font-semibold">
              Competência: <strong>{activeMonth.mes} / {activeMonth.ano}</strong>
            </span>
            <span className="text-[9.5px] text-slate-400">
              • Emissão: {new Date().toLocaleDateString('pt-BR')} • Página 1 de 2
            </span>
          </div>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="text-slate-600 font-medium">Meta: <strong>{activeMonth.meta}</strong> veículos</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-600">Alíquota Líquida:</span>
            <span className="text-slate-900 font-black bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
              {activeNetPercentage.toFixed(2)}%
            </span>
          </div>
        </div>

        <div className="hidden print:grid print:grid-cols-4 print:gap-4 print:mb-3 print-avoid-break">
          
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-none">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Volume Total & Faixa VN
              </span>
              <span className="w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                <Layers size={14} />
              </span>
            </div>
            <div className="my-1">
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                {metrics.volume} {metrics.volume === 1 ? 'veículo' : 'veículos'}
              </span>
            </div>
            <div className="border-t border-slate-100 pt-2 text-[10px] text-slate-500 flex items-center justify-between">
              <span>Taxa Aplicada VN:</span>
              <span className="bg-rose-50 text-rose-700 font-bold px-2 py-0.5 rounded-full border border-rose-200">
                {formatPercent(metrics.vnTier)}
              </span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-none">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                DSR (20%)
              </span>
              <span className="w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                <ShieldCheck size={14} />
              </span>
            </div>
            <div className="my-1">
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                {formatBRL(metrics.dsr)}
              </span>
            </div>
            <div className="border-t border-slate-100 pt-2 text-[10px] text-slate-500 flex items-center justify-between">
              <span>Base de Cálculo</span>
              <span className="font-semibold text-slate-700">VN + Margem + Retorno</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-none">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Comissão Bruta
              </span>
              <span className="w-6 h-6 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600">
                <Calculator size={14} />
              </span>
            </div>
            <div className="my-1">
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                {formatBRL(metrics.grossCommission)}
              </span>
            </div>
            <div className="border-t border-slate-100 pt-2 text-[10px] text-slate-500 flex items-center justify-between">
              <span>Origem</span>
              <span className="font-semibold text-slate-700">Comissões + Extras</span>
            </div>
          </div>

          <div 
            className="bg-slate-900 text-white rounded-2xl p-4 border border-slate-800 flex flex-col justify-between print-dark-card shadow-none"
            style={{ backgroundColor: '#0f172a', color: '#ffffff', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-300">
                Líquido Previsto a Receber
              </span>
              <span className="text-[10px] font-bold text-sky-200 bg-white/10 px-2 py-0.5 rounded border border-white/10">
                {activeNetPercentage.toFixed(2)}%
              </span>
            </div>
            <div className="my-1">
              <span className="text-2xl font-black text-sky-400 tracking-tight">
                {formatBRL(metrics.netCommission)}
              </span>
            </div>
            <div className="border-t border-white/10 pt-2 text-[10px] text-slate-300 flex items-center justify-between">
              <span>Alíquota Líquida Base:</span>
              <span className="font-semibold text-white">{activeNetPercentage.toFixed(2)}%</span>
            </div>
          </div>
        </div>

        {/* Print Extras Inline Strip (Page 1) */}
        <div className="hidden print:flex items-center justify-between border border-slate-300 rounded-xl bg-slate-50/90 p-2 px-3 mb-3 text-[10px] text-slate-800 print-avoid-break">
          <div className="flex items-center gap-4">
            <span className="font-bold text-slate-900 uppercase tracking-wider text-[8.5px] bg-slate-200/90 px-2 py-0.5 rounded">
              Prêmios Extras:
            </span>
            <span>Usados: <strong className="font-bold text-slate-900">{formatBRL(activeExtras.premioUsados)}</strong></span>
            <span>Águia: <strong className="font-bold text-slate-900">{formatBRL(activeExtras.premioAguia)}</strong></span>
            <span>Líder: <strong className="font-bold text-slate-900">{formatBRL(activeExtras.premioLider)}</strong></span>
            <span>NPS: <strong className="font-bold text-slate-900">{formatBRL(activeExtras.premioNps)}</strong></span>
          </div>
          <div className="font-medium text-slate-700">
            Total Extras: <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-300">{formatBRL(metrics.extrasTotal)}</span>
          </div>
        </div>

        <section className="w-full print:hidden">
          <div className="w-full px-6 sm:px-8 pt-6 flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">
              Visão Geral do Mês
            </h2>
            <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
              <Sparkles size={14} className="text-sky-600" />
              <span>Cálculos atualizados dinamicamente</span>
            </div>
          </div>

          <div className="w-full grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 px-6 sm:px-8 mt-4">
            <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-6 flex flex-col justify-between hover:shadow-md transition-shadow duration-200 relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">Volume Total & Faixa VN</span>
                <span className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-sky-600 transition-colors">
                  <Layers size={16} />
                </span>
              </div>
              <div className="mt-4 flex items-baseline gap-2.5">
                <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{metrics.volume}</span>
                <span className="text-sm font-medium text-slate-500">{metrics.volume === 1 ? 'veículo faturado' : 'veículos faturados'}</span>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Taxa Aplicada VN:</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80">
                  {formatPercent(metrics.vnTier)}
                </span>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-6 flex flex-col justify-between hover:shadow-md transition-shadow duration-200 group">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">DSR (20%)</span>
                <span className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-sky-600 transition-colors">
                  <ShieldCheck size={16} />
                </span>
              </div>
              <div className="mt-4">
                <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{formatBRL(metrics.dsr)}</span>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 font-medium flex items-center justify-between">
                <span>Base de Cálculo</span>
                <span className="text-slate-700 font-semibold">VN + Margem + Retorno</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-6 flex flex-col justify-between hover:shadow-md transition-shadow duration-200 relative group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-slate-500">Comissão Bruta</span>
                  <button 
                    type="button"
                    onClick={() => setShowCalculationModal(true)}
                    className="text-slate-400 hover:text-sky-600 transition-colors p-0.5 rounded-md cursor-pointer"
                    title="Ver memória de cálculo"
                  >
                    <Info size={15} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCalculationModal(true)}
                  className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center hover:bg-sky-100 transition-colors cursor-pointer"
                  title="Abrir detalhamento"
                >
                  <ArrowUpRight size={16} />
                </button>
              </div>

              <div className="mt-4">
                <span 
                  onClick={() => setShowCalculationModal(true)}
                  className="text-3xl font-extrabold text-slate-900 tracking-tight cursor-pointer hover:text-sky-600 transition-colors"
                >
                  {formatBRL(metrics.grossCommission)}
                </span>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Comissões + Extras</span>
                <button 
                  type="button"
                  onClick={() => setShowCalculationModal(true)}
                  className="text-sky-600 hover:text-sky-700 font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  Memória de cálculo
                </button>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950 text-white shadow-md shadow-slate-900/10 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-center justify-between z-10">
                <span className="text-xs font-semibold uppercase tracking-wider text-sky-300">
                  Líquido Previsto a Receber
                </span>
                
                <div className="flex items-center bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-lg border border-white/10 px-2 py-0.5">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={activeNetPercentage}
                    onChange={(e) => handleUpdateActiveNetPercentage(parseFloat(e.target.value) || 0)}
                    className="w-12 bg-transparent text-white font-bold text-xs text-right focus:outline-none"
                  />
                  <span className="text-sky-200 text-xs font-semibold ml-0.5">%</span>
                </div>
              </div>

              <div className="mt-4 z-10">
                <span className="text-3xl font-extrabold text-sky-400 tracking-tight">
                  {formatBRL(metrics.netCommission)}
                </span>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs z-10">
                <span className="text-slate-300">Alíquota Líquida Base:</span>
                <span className="font-semibold text-white">{activeNetPercentage.toFixed(2)}%</span>
              </div>

              <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />
            </div>
          </div>
        </section>

        <section className="w-full px-6 sm:px-8 mt-6 print:hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Resumo de Prêmios Manuais
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Soma total: <strong className="text-slate-800">{formatBRL(metrics.extrasTotal)}</strong>
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
                <div key={idx} className="bg-white border border-slate-200/80 rounded-xl p-3.5 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-slate-50 text-slate-600 flex items-center justify-center">
                      <IconComp size={14} />
                    </div>
                    <div>
                      <span className="block text-[11px] font-medium text-slate-500 leading-none">{p.label}</span>
                      <span className="text-sm font-semibold text-slate-900 mt-1 block">{formatBRL(p.val)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="w-full px-6 sm:px-8 mt-6 print:px-0 print:mt-0 print:space-y-0 print-avoid-break">
          <div className="flex items-center justify-between mb-3 print:hidden">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">
                Lançamento de Vendas
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Insira os dados individuais de cada venda realizada na competência
              </p>
            </div>
            
            <div className="text-xs text-slate-500 font-medium bg-white px-3 py-1.5 rounded-lg border border-slate-200/80 shadow-sm">
              Total de registros: <span className="font-bold text-slate-800">{activeSales.length}</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl overflow-hidden print:border print:border-slate-300 print:rounded-xl print:shadow-none print:overflow-visible">
            <div className="w-full overflow-x-auto print:overflow-visible">
              <table className="w-full min-w-full text-left text-xs whitespace-nowrap print:text-[8.5px]">
                <thead className="bg-slate-100/60 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[11px] font-semibold print:bg-slate-100 print:text-[8px] print:border-b print:border-slate-300">
                  <tr>
                    <th className="px-3 py-3 font-semibold text-slate-700 print:text-slate-900 print:px-1.5 print:py-1">Cliente</th>
                    <th className="px-3 py-3 font-semibold text-slate-700 print:text-slate-900 print:px-1.5 print:py-1">Carro</th>

                    <th className="px-3 py-2.5 text-right print:px-1.5 print:py-1">
                      <div className="flex flex-col items-end">
                        <span className="font-semibold text-slate-700 print:text-slate-900 print:text-[8px]">VN (R$)</span>
                        <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono tracking-tight bg-slate-100 text-slate-700 border border-slate-200/80 print:bg-transparent print:border-none print:p-0 print:text-[8px]">
                          Tot: {formatBRL(metrics.vnBase)}
                        </span>
                      </div>
                    </th>

                    <th className="px-3 py-2.5 text-right print:px-1.5 print:py-1">
                      <div className="flex flex-col items-end">
                        <span className="font-semibold text-slate-700 print:text-slate-900 print:text-[8px]">Margem (R$)</span>
                        <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono tracking-tight bg-slate-100 text-slate-700 border border-slate-200/80 print:bg-transparent print:border-none print:p-0 print:text-[8px]">
                          Tot: {formatBRL(metrics.marginBase)}
                        </span>
                      </div>
                    </th>

                    <th className="px-3 py-2.5 text-right print:px-1.5 print:py-1">
                      <div className="flex flex-col items-end">
                        <span className="font-semibold text-slate-700 print:text-slate-900 print:text-[8px]">F&I (R$)</span>
                        <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono tracking-tight bg-slate-100 text-slate-700 border border-slate-200/80 print:bg-transparent print:border-none print:p-0 print:text-[8px]">
                          Tot: {formatBRL(metrics.fAndIBase)}
                        </span>
                      </div>
                    </th>

                    <th className="px-3 py-3 text-center font-semibold text-slate-700 print:text-slate-900 print:px-1.5 print:py-1">Retorno</th>
                    
                    <th className="px-3 py-2.5 text-right print:px-1.5 print:py-1">
                      <div className="flex flex-col items-end">
                        <span className="font-semibold text-slate-700 print:text-slate-900 print:text-[8px]">Valor SPF</span>
                        <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono tracking-tight bg-slate-100 text-slate-700 border border-slate-200/80 print:bg-transparent print:border-none print:p-0 print:text-[8px]">
                          Penetr: {formatPercent(metrics.spfPenetration)}
                        </span>
                      </div>
                    </th>

                    <th className="px-3 py-2.5 text-right print:px-1.5 print:py-1">
                      <div className="flex flex-col items-end">
                        <span className="font-semibold text-slate-700 print:text-slate-900 print:text-[8px]">Acessórios</span>
                        <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono tracking-tight bg-slate-100 text-slate-700 border border-slate-200/80 print:bg-transparent print:border-none print:p-0 print:text-[8px]">
                          T.M: {formatBRL(metrics.accTicketHeader)}
                        </span>
                      </div>
                    </th>

                    <th className="px-3 py-2.5 text-right print:px-1.5 print:py-1">
                      <div className="flex flex-col items-end">
                        <span className="font-semibold text-slate-700 print:text-slate-900 print:text-[8px]">Autobox</span>
                        <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono tracking-tight bg-slate-100 text-slate-700 border border-slate-200/80 print:bg-transparent print:border-none print:p-0 print:text-[8px]">
                          Tot: {formatBRL(metrics.autoboxBase)}
                        </span>
                      </div>
                    </th>

                    <th className="px-3 py-3 text-right font-semibold text-slate-700 print:text-slate-900 print:px-1.5 print:py-1">Emplac.</th>
                    <th className="px-3 py-3 text-right font-semibold text-slate-700 print:text-slate-900 print:px-1.5 print:py-1">Seguro</th>
                    <th className="px-3 py-3 text-right font-semibold text-slate-700 print:text-slate-900 print:px-1.5 print:py-1">Bônus</th>
                    <th className="px-3 py-3 text-right font-semibold text-slate-700 print:text-slate-900 print:px-1.5 print:py-1">Usados C.</th>
                    <th className="px-2 py-3 text-center font-semibold text-slate-700 print:hidden w-12">Ações</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                  {activeSales.length === 0 ? (
                    <tr>
                      <td colSpan="14" className="text-center py-16 print:py-6 px-4">
                        <div className="max-w-md mx-auto flex flex-col items-center justify-center text-center">
                          <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-400 mb-3 shadow-xs print:hidden">
                            <ClipboardList size={26} strokeWidth={1.8} className="text-slate-400" />
                          </div>
                          <h4 className="text-sm font-bold text-slate-800 tracking-tight">
                            Nenhuma venda registrada neste mês
                          </h4>
                          <p className="text-xs text-slate-500 mt-1 max-w-sm print:hidden">
                            Seus lançamentos comerciais e cálculos em tempo real aparecerão aqui assim que você cadastrar o primeiro veículo.
                          </p>
                          <button
                            type="button"
                            onClick={() => setIsAddModalOpen(true)}
                            className="mt-4 inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all duration-150 shadow-sm shadow-sky-600/20 active:scale-[0.98] cursor-pointer print:hidden"
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
                        className="hover:bg-slate-50/70 transition-colors duration-150 group print:hover:bg-transparent print:border-b print:border-slate-200"
                      >
                        <td className="px-2 py-2 print:px-1.5 print:py-1">
                          <input 
                            type="text" 
                            value={sale.client} 
                            onChange={(e) => handleSaleChange(sale.id, 'client', e.target.value)}
                            placeholder={`Cliente ${index + 1}`}
                            className="w-36 min-w-[150px] bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 text-slate-800 text-xs font-medium rounded-lg px-2.5 py-1.5 transition-all focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 print:bg-transparent print:border-none print:p-0 print:text-[8.5px] print:text-slate-900 print:truncate print:h-auto"
                          />
                        </td>

                        <td className="px-2 py-2 print:px-1.5 print:py-1">
                          <input 
                            type="text" 
                            value={sale.car} 
                            onChange={(e) => handleSaleChange(sale.id, 'car', e.target.value)}
                            placeholder="Modelo"
                            className="w-36 min-w-[140px] bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 text-slate-800 text-xs font-medium rounded-lg px-2.5 py-1.5 transition-all focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 print:bg-transparent print:border-none print:p-0 print:text-[8.5px] print:text-slate-900 print:truncate print:h-auto"
                          />
                        </td>

                        <td className="px-2 py-2 print:px-1.5 print:py-1">
                          <CurrencyInput 
                            className="w-28 min-w-[115px] text-right text-xs" 
                            value={sale.vn} 
                            onChange={(v) => handleSaleChange(sale.id, 'vn', v)} 
                          />
                        </td>

                        <td className="px-2 py-2 print:px-1.5 print:py-1">
                          <CurrencyInput 
                            className="w-28 min-w-[115px] text-right text-xs" 
                            value={sale.margin} 
                            onChange={(v) => handleSaleChange(sale.id, 'margin', v)} 
                          />
                        </td>

                        <td className="px-2 py-2 print:px-1.5 print:py-1">
                          <CurrencyInput 
                            className="w-28 min-w-[115px] text-right text-xs" 
                            value={sale.fAndI} 
                            onChange={(v) => handleSaleChange(sale.id, 'fAndI', v)} 
                          />
                        </td>

                        <td className="px-2 py-2 print:px-1.5 print:py-1 text-center">
                          <select 
                            value={sale.returnFAndI} 
                            onChange={(e) => handleSaleChange(sale.id, 'returnFAndI', e.target.value)}
                            className="w-24 min-w-[95px] bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 text-slate-800 text-xs font-semibold rounded-lg px-2 py-1.5 text-center focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all cursor-pointer print:bg-transparent print:border-none print:appearance-none print:p-0 print:text-[8.5px] print:text-center print:text-slate-900"
                          >
                            <option value="R0">R0 (0%)</option>
                            <option value="R1">R1 (1,2%)</option>
                            <option value="R2">R2 (2,4%)</option>
                            <option value="R3">R3 (3,6%)</option>
                            <option value="R4">R4 (4,8%)</option>
                          </select>
                        </td>

                        <td className="px-2 py-2 print:px-1.5 print:py-1">
                          <CurrencyInput 
                            className="w-28 min-w-[115px] text-right text-xs" 
                            value={sale.spf} 
                            onChange={(v) => handleSaleChange(sale.id, 'spf', v)} 
                          />
                        </td>

                        <td className="px-2 py-2 print:px-1.5 print:py-1">
                          <CurrencyInput 
                            className="w-28 min-w-[115px] text-right text-xs" 
                            value={sale.accessories} 
                            onChange={(v) => handleSaleChange(sale.id, 'accessories', v)} 
                          />
                        </td>

                        <td className="px-2 py-2 print:px-1.5 print:py-1">
                          <CurrencyInput 
                            className="w-28 min-w-[115px] text-right text-xs" 
                            value={sale.autobox} 
                            onChange={(v) => handleSaleChange(sale.id, 'autobox', v)} 
                          />
                        </td>

                        <td className="px-2 py-2 print:px-1.5 print:py-1">
                          <CurrencyInput 
                            className="w-28 min-w-[115px] text-right text-xs" 
                            value={sale.emplacamento} 
                            onChange={(v) => handleSaleChange(sale.id, 'emplacamento', v)} 
                          />
                        </td>

                        <td className="px-2 py-2 print:px-1.5 print:py-1">
                          <CurrencyInput 
                            className="w-28 min-w-[115px] text-right text-xs" 
                            value={sale.seguro} 
                            onChange={(v) => handleSaleChange(sale.id, 'seguro', v)} 
                          />
                        </td>

                        <td className="px-2 py-2 print:px-1.5 print:py-1">
                          <CurrencyInput 
                            className="w-28 min-w-[115px] text-right text-xs" 
                            value={sale.bonusCarro} 
                            onChange={(v) => handleSaleChange(sale.id, 'bonusCarro', v)} 
                          />
                        </td>

                        <td className="px-2 py-2 print:px-1.5 print:py-1">
                          <CurrencyInput 
                            className="w-28 min-w-[115px] text-right text-xs" 
                            value={sale.usadosCaptados} 
                            onChange={(v) => handleSaleChange(sale.id, 'usadosCaptados', v)} 
                          />
                        </td>

                        <td className="px-2 py-2 text-center print:hidden w-12">
                          <button 
                            type="button"
                            onClick={() => handleRemoveSale(sale.id)}
                            className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-colors duration-150 cursor-pointer"
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

            <div className="p-4 bg-slate-50/60 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
              <button 
                type="button"
                onClick={() => setIsAddModalOpen(true)} 
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-sm shadow-sky-600/20 transition-all duration-150 active:scale-[0.98] cursor-pointer"
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>Adicionar Nova Venda</span>
              </button>
              
              <span className="text-xs text-slate-500 font-medium">
                Pressione para abrir o formulário detalhado de cadastro de venda
              </span>
            </div>
          </div>
        </section>

        <section className="w-full px-6 sm:px-8 mt-6 print:hidden">
          <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
                  Lançamentos Extras
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Prêmios manuais e bônus que somam diretamente à comissão bruta
                </p>
              </div>
              <span className="text-xs font-semibold text-sky-700 bg-sky-50 px-3 py-1 rounded-lg border border-sky-100">
                Total: {formatBRL(metrics.extrasTotal)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Prêmio Usados Captados
                </label>
                <CurrencyInput 
                  value={activeExtras.premioUsados} 
                  onChange={(v) => handleUpdateActiveMonthExtras('premioUsados', v)} 
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Prêmio Águia
                </label>
                <CurrencyInput 
                  value={activeExtras.premioAguia} 
                  onChange={(v) => handleUpdateActiveMonthExtras('premioAguia', v)} 
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Prêmio Líder
                </label>
                <CurrencyInput 
                  value={activeExtras.premioLider} 
                  onChange={(v) => handleUpdateActiveMonthExtras('premioLider', v)} 
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Prêmio NPS
                </label>
                <CurrencyInput 
                  value={activeExtras.premioNps} 
                  onChange={(v) => handleUpdateActiveMonthExtras('premioNps', v)} 
                />
              </div>
            </div>
          </div>
        </section>

        <section className="w-full print:hidden">
          <div className="w-full px-6 sm:px-8 pt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">
                  Inteligência Comercial & Análise BI
                </h2>
                <span className="bg-sky-50 text-sky-700 text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full border border-sky-200/80">
                  Analytics
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Distribuição de mix de faturamento e decomposição transparente das receitas apuradas
              </p>
            </div>
            <span className="text-xs text-slate-500 font-medium hidden sm:inline-block">
              {activeSales.length} {activeSales.length === 1 ? 'venda analisada' : 'vendas analisadas'}
            </span>
          </div>

          <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6 px-6 sm:px-8 mt-4 mb-12">
            {/* Chart 1: Volume por Modelo */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200 relative flex flex-col justify-between overflow-hidden">
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                      <BarChart3 size={16} />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 tracking-tight">
                      Volume por Modelo
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Ranking decrescente de unidades faturadas no período
                  </p>
                </div>
                <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200/70">
                  {modelVolumeData.length} {modelVolumeData.length === 1 ? 'modelo' : 'modelos'}
                </span>
              </div>

              <div className="pt-5 pb-2 flex-1">
                {modelVolumeData.length === 0 ? (
                  <div className="h-56 flex flex-col items-center justify-center text-slate-400 text-xs">
                    <Car size={28} className="mb-2 text-slate-300" />
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
                              ? 'bg-slate-50/90 border-sky-300 shadow-sm' 
                              : 'bg-white border-transparent hover:border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              <span className={`w-5 h-5 rounded-md text-[10px] font-bold flex items-center justify-center shrink-0 ${
                                idx === 0 
                                  ? 'bg-sky-600 text-white shadow-xs' 
                                  : idx === 1 
                                  ? 'bg-slate-800 text-white' 
                                  : 'bg-slate-100 text-slate-600'
                              }`}>
                                #{idx + 1}
                              </span>
                              <span className="font-semibold text-slate-800 truncate tracking-tight text-[13px]">
                                {item.model}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-slate-900 font-extrabold text-xs">
                                {item.count} {item.count === 1 ? 'unid.' : 'unids.'}
                              </span>
                              <span className="text-[11px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-100">
                                {item.percentage.toFixed(1).replace('.', ',')}%
                              </span>
                            </div>
                          </div>

                          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden p-[1px]">
                            <div
                              style={{ width: `${barWidth}%` }}
                              className={`h-full rounded-full bg-gradient-to-r from-sky-500 to-sky-600 transition-all duration-300 ${
                                isHovered ? 'from-sky-400 to-sky-500 shadow-sm shadow-sky-500/30' : ''
                              }`}
                            />
                          </div>

                          {isHovered && (
                            <div className="absolute right-3 -top-10 z-20 pointer-events-none backdrop-blur-md bg-slate-900/95 text-white p-2 px-3 rounded-xl border border-slate-700 shadow-xl text-xs flex items-center gap-2 animate-in fade-in zoom-in-95 duration-150">
                              <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                              <span className="font-medium text-slate-300">{item.model}:</span>
                              <span className="font-bold text-white">{item.count} {item.count === 1 ? 'carro' : 'carros'}</span>
                              <span className="text-sky-300 text-[11px]">({item.percentage.toFixed(1)}% do total)</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Concentração no líder ({modelVolumeData[0]?.model || 'N/D'}):</span>
                <span className="font-bold text-slate-800">
                  {modelVolumeData[0]?.percentage ? `${modelVolumeData[0].percentage.toFixed(1).replace('.', ',')}% das vendas` : '0%'}
                </span>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200 relative flex flex-col justify-between overflow-hidden">
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <PieChart size={16} />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 tracking-tight">
                      Composição da Comissão Bruta
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Fatiamento proporcional da receita por origem de bonificação
                  </p>
                </div>
                <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg border border-indigo-100">
                  {grossCommissionSlices.length} {grossCommissionSlices.length === 1 ? 'fonte ativa' : 'fontes ativas'}
                </span>
              </div>

              <div className="pt-4 pb-2 flex-1">
                {grossCommissionSlices.length === 0 ? (
                  <div className="h-56 flex flex-col items-center justify-center text-slate-400 text-xs w-full">
                    <Calculator size={28} className="mb-2 text-slate-300" />
                    <span>Nenhuma comissão apurada para compor o gráfico.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center mt-3">
                    {/* COLUNA ESQUERDA: GRÁFICO DONUT (5 colunas) */}
                    <div className="lg:col-span-5 flex items-center justify-center">
                      <div className="relative w-[260px] h-[260px] flex items-center justify-center shrink-0">
                        <svg width="260" height="260" viewBox="0 0 260 260" className="w-full h-full transform -rotate-90">
                          <defs>
                            <filter id="donutGlow" x="-20%" y="-20%" width="140%" height="140%">
                              <feDropShadow dx="0" dy="4" stdDeviation="5" floodOpacity="0.18" />
                            </filter>
                          </defs>

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
                                  filter: isHovered ? 'url(#donutGlow)' : 'none',
                                  opacity: activeDonutSlice !== null && !isHovered ? 0.45 : 1
                                }}
                                onMouseEnter={() => setActiveDonutSlice(slice.index)}
                                onMouseLeave={() => setActiveDonutSlice(null)}
                              />
                            );
                          })}
                        </svg>

                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">TOTAL BRUTO</span>
                          <span className="text-lg font-black text-slate-900 tracking-tight">{formatBRL(metrics.grossCommission)}</span>
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 mt-1">100% Ativo</span>
                        </div>

                        {activeDonutSlice !== null && donutGeometry[activeDonutSlice] && (
                          <div className="absolute -bottom-3 z-30 pointer-events-none backdrop-blur-md bg-slate-900/95 text-white py-1.5 px-3 rounded-xl border border-slate-700 shadow-2xl text-[11px] whitespace-nowrap animate-in fade-in zoom-in-95 duration-150">
                            <div className="flex items-center gap-1.5">
                              <span 
                                className="w-2 h-2 rounded-full shrink-0" 
                                style={{ backgroundColor: donutGeometry[activeDonutSlice].color }} 
                              />
                              <span className="font-semibold text-slate-200">
                                {donutGeometry[activeDonutSlice].label}:
                              </span>
                              <span className="font-bold text-white">
                                {formatBRL(donutGeometry[activeDonutSlice].value)}
                              </span>
                              <span className="text-sky-300 font-semibold">
                                ({donutGeometry[activeDonutSlice].percent.toFixed(1).replace('.', ',')}%)
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* COLUNA DIREITA: LISTA DE FONTES DE RECEITA (7 colunas) */}
                    <div className="lg:col-span-7 flex flex-col justify-center space-y-1.5 min-w-0">
                      {grossCommissionSlices.filter(s => s.value > 0).map((slice, index) => {
                        const isHovered = activeDonutSlice === index;
                        return (
                          <div
                            key={slice.id}
                            onMouseEnter={() => setActiveDonutSlice(index)}
                            onMouseLeave={() => setActiveDonutSlice(null)}
                            className={`flex items-center justify-between gap-3 py-1.5 px-3 rounded-lg border transition-colors cursor-pointer ${
                              isHovered 
                                ? 'bg-slate-50 border-slate-200/80 shadow-xs' 
                                : 'bg-transparent border-transparent hover:bg-slate-50 hover:border-slate-200/60'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                              <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                                {slice.shortLabel || slice.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-xs font-bold text-slate-900 font-mono">
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

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Maior alavanca de ganho:</span>
                <span className="font-bold text-slate-800">
                  {grossCommissionSlices[0] ? `${grossCommissionSlices[0].label} (${grossCommissionSlices[0].percent.toFixed(1).replace('.', ',')}%)` : 'N/D'}
                </span>
              </div>
            </div>
          </div>
        </section>

        <div className="hidden print:block print-page-break print:break-before-page pt-3">
          
          <div className="flex items-center justify-between border-b border-slate-300 pb-2 mb-3 text-slate-900 print-avoid-break">
            <div className="flex items-baseline gap-2.5">
              <h2 className="text-base font-black tracking-tight text-slate-900 leading-none">
                Auditoria & Inteligência Estratégica
              </h2>
              <span className="text-[10.5px] text-slate-600 font-semibold">
                Competência: <strong>{activeMonth.mes} / {activeMonth.ano}</strong>
              </span>
              <span className="text-[9.5px] text-slate-400">• Página 2 de 2</span>
            </div>
            <div className="text-[10px] text-slate-600">
              Comissão Bruta Consolidada: <strong className="text-slate-900 font-black">{formatBRL(metrics.grossCommission)}</strong>
            </div>
          </div>

          <div className="border border-slate-200 rounded-2xl bg-white p-4 mb-4 print-avoid-break">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-2 text-slate-900">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-sky-50 text-sky-600 flex items-center justify-center">
                  <Calculator size={13} />
                </div>
                <h3 className="text-[10.5px] font-bold tracking-tight text-slate-900 uppercase">
                  Memória de Cálculo — Detalhamento transparente da apuração da Comissão Bruta
                </h3>
              </div>
              <span className="text-[8.5px] text-slate-500 font-semibold">
                Regras Contratuais & Índices Reativos
              </span>
            </div>

            <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3 text-[9.5px]">
              <div className="grid grid-cols-2 gap-x-6">
                
                <div className="space-y-1.5 divide-y divide-slate-100">
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <span className="font-semibold text-slate-800 block">1. Comissão Valor da Nota (VN)</span>
                      <span className="text-[8.5px] text-slate-500">Base {formatBRL(metrics.vnBase)} × {formatPercent(metrics.vnTier)} ({metrics.volume} veículos)</span>
                    </div>
                    <span className="font-bold text-slate-900">{formatBRL(metrics.commissionVn)}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1.5">
                    <div>
                      <span className="font-semibold text-slate-800 block">2. Comissão Margem</span>
                      <span className="text-[8.5px] text-slate-500">Base {formatBRL(metrics.marginBase)} × {formatPercent(metrics.marginTier)}</span>
                    </div>
                    <span className="font-bold text-slate-900">{formatBRL(metrics.commissionMargin)}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1.5">
                    <div>
                      <span className="font-semibold text-slate-800 block">3. Retorno F&I</span>
                      <span className="text-[8.5px] text-slate-500">Base Retorno F&I ({formatBRL(metrics.fAndIBaseRetorno)}) × Acelerador SPF ({formatPercent(metrics.fAndIAccelerator)})</span>
                    </div>
                    <span className="font-bold text-slate-900">{formatBRL(metrics.commissionRetornoFAndI)}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1.5">
                    <div>
                      <span className="font-semibold text-slate-800 block">4. Comissão SPF</span>
                      <span className="text-[8.5px] text-slate-500">{metrics.spfCount} contratos com SPF × R$ 100,00</span>
                    </div>
                    <span className="font-bold text-slate-900">{formatBRL(metrics.commissionSpf)}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1.5">
                    <div>
                      <span className="font-semibold text-slate-800 block">5. Comissão Acessórios</span>
                      <span className="text-[8.5px] text-slate-500">Base {formatBRL(metrics.accBase)} × {formatPercent(metrics.accTier)} (T.M.: {formatBRL(metrics.accTicketCommission)})</span>
                    </div>
                    <span className="font-bold text-slate-900">{formatBRL(metrics.commissionAcc)}</span>
                  </div>
                </div>

                <div className="space-y-1.5 divide-y divide-slate-100">
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <span className="font-semibold text-slate-800 block">6. Comissão Autobox</span>
                      <span className="text-[8.5px] text-slate-500">Base {formatBRL(metrics.autoboxBase)} × 4,5%</span>
                    </div>
                    <span className="font-bold text-slate-900">{formatBRL(metrics.commissionAutobox)}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1.5">
                    <div>
                      <span className="font-semibold text-slate-800 block">7. Comissão Emplacamento</span>
                      <span className="text-[8.5px] text-slate-500">Base {formatBRL(metrics.empBase)} × {formatPercent(metrics.empTier)} (Penetração: {formatPercent(metrics.empPenetration)})</span>
                    </div>
                    <span className="font-bold text-slate-900">{formatBRL(metrics.commissionEmp)}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1.5">
                    <div>
                      <span className="font-semibold text-slate-800 block">8. Premiações Diretas da Tabela</span>
                      <span className="text-[8.5px] text-slate-500">Seguros ({formatBRL(metrics.seguroTotal)}) + Bônus ({formatBRL(metrics.bonusCarroTotal)}) + Usados C. ({formatBRL(metrics.usadosCaptadosTotal)})</span>
                    </div>
                    <span className="font-bold text-slate-900">{formatBRL(metrics.commissionDirects)}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1.5">
                    <div>
                      <span className="font-semibold text-slate-800 block">9. DSR (Descanso Semanal Remunerado)</span>
                      <span className="text-[8.5px] text-slate-500">20% sobre (VN + Margem + Retorno F&I)</span>
                    </div>
                    <span className="font-bold text-slate-900">{formatBRL(metrics.dsr)}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1.5">
                    <div>
                      <span className="font-semibold text-slate-800 block">10. Lançamentos Extras Manuais</span>
                      <span className="text-[8.5px] text-slate-500">Usados ({formatBRL(activeExtras.premioUsados)}) + Águia ({formatBRL(activeExtras.premioAguia)}) + Líder ({formatBRL(activeExtras.premioLider)}) + NPS ({formatBRL(activeExtras.premioNps)})</span>
                    </div>
                    <span className="font-bold text-slate-900">{formatBRL(metrics.extrasTotal)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-sky-50 border border-sky-200 rounded-xl p-2.5 px-3 flex justify-between items-center mt-2.5">
                <div>
                  <span className="text-[10px] font-bold text-sky-950 block">Total Geral Bruto Apurado</span>
                  <span className="text-[9px] text-sky-700">
                    Previsão Líquida ({activeNetPercentage.toFixed(2)}%): <strong className="font-bold text-slate-900">{formatBRL(metrics.netCommission)}</strong>
                  </span>
                </div>
                <span className="text-lg font-black text-sky-700">{formatBRL(metrics.grossCommission)}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 print-avoid-break">
            <div className="border border-slate-200 rounded-2xl p-3.5 bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded bg-sky-50 text-sky-600 flex items-center justify-center">
                    <BarChart3 size={12} />
                  </div>
                  <h4 className="text-[10px] font-bold text-slate-900 uppercase">
                    Volume por Modelo (Mix Comercial)
                  </h4>
                </div>
                <span className="text-[8px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                  {modelVolumeData.length} modelos
                </span>
              </div>

              <div className="space-y-1.5">
                {modelVolumeData.length === 0 ? (
                  <div className="py-8 text-center text-[9px] text-slate-400">
                    Nenhum modelo cadastrado
                  </div>
                ) : (
                  modelVolumeData.slice(0, 6).map((item, idx) => {
                    const maxCount = modelVolumeData[0]?.count || 1;
                    const barWidth = Math.max(10, (item.count / maxCount) * 100);

                    return (
                      <div key={item.model} className="p-1 px-1.5 rounded-lg border border-slate-100 bg-slate-50/50">
                        <div className="flex items-center justify-between text-[8.5px] mb-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="w-3.5 h-3.5 rounded bg-slate-200 text-slate-800 text-[7px] font-bold flex items-center justify-center">
                              #{idx + 1}
                            </span>
                            <span className="font-bold text-slate-800">{item.model}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-slate-900">{item.count} unid.</span>
                            <span className="text-[7.5px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-100">
                              {item.percentage.toFixed(1).replace('.', ',')}%
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
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

            <div className="border border-slate-200 rounded-2xl p-3.5 bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <PieChart size={12} />
                  </div>
                  <h4 className="text-[10px] font-bold text-slate-900 uppercase">
                    Composição da Comissão Bruta
                  </h4>
                </div>
                <span className="text-[8px] font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100">
                  {grossCommissionSlices.length} fontes ativas
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                {grossCommissionSlices.length === 0 ? (
                  <div className="py-8 text-center text-[9px] text-slate-400 w-full">
                    Nenhuma receita lançada
                  </div>
                ) : (
                  <>
                    <div className="relative w-[120px] h-[120px] shrink-0 flex items-center justify-center">
                      <svg width="120" height="120" viewBox="0 0 260 260" className="w-full h-full transform -rotate-90">
                        {donutGeometry.map((slice) => (
                          <path
                            key={slice.id}
                            d={slice.pathData}
                            fill={slice.color}
                          />
                        ))}
                      </svg>
                      <div className="absolute inset-0 m-auto w-[62px] h-[62px] rounded-full bg-white border border-slate-200 flex flex-col items-center justify-center text-center p-0.5 pointer-events-none">
                        <span className="text-[7px] font-bold text-slate-400 uppercase leading-none">Total</span>
                        <span className="text-[8px] font-black text-slate-900 truncate max-w-[56px] mt-0.5">
                          {formatBRL(metrics.grossCommission)}
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 space-y-0.5 text-[8px]">
                      {grossCommissionSlices.map((slice) => (
                        <div key={slice.id} className="flex items-center justify-between py-0.5 px-1 border-b border-slate-50 last:border-none">
                          <div className="flex items-center gap-1.5 min-w-0 pr-1">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                            <span className="font-medium text-slate-700 truncate">{slice.shortLabel || slice.label}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="font-bold text-slate-900">{formatBRL(slice.value)}</span>
                            <span className="text-[7px] font-bold text-slate-500 w-6 text-right">
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
    <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-start p-2 sm:p-4 text-slate-800 font-['Inter',sans-serif] antialiased selection:bg-sky-100 selection:text-sky-900 print:bg-white print:p-0 print:m-0 print:min-h-0">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 ${
          toast.type === 'error' 
            ? 'bg-rose-50 border-rose-200 text-rose-800' 
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <CheckCircle2 size={18} className={toast.type === 'error' ? 'text-rose-600' : 'text-emerald-600'} />
          <span>{toast.text}</span>
        </div>
      )}

      {/* Main Panoramical Card Container */}
      <div 
        className="w-full mx-auto my-4 rounded-3xl shadow-2xl bg-white overflow-hidden border border-slate-200/80 print:w-full print:max-w-none print:m-0 print:p-0 print:border-none print:shadow-none print:rounded-none print:overflow-visible"
        style={{ width: '96%', maxWidth: '1820px' }}
      >
        
        {/* Main Top Header with Profile and Logout */}
        <header className="w-full px-6 sm:px-8 py-5 border-b border-slate-100 bg-white sticky top-0 z-30 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentScreen('HUB')}>
            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shadow-sm">
              <Car size={22} strokeWidth={2.2} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none">
                  Gestão & Comissões Auto
                </h1>
                <span className="bg-slate-100 text-slate-600 text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full">
                  MULTI-MESES
                </span>
              </div>
              <p className="text-xs text-slate-500 font-normal mt-0.5">
                Cálculo em tempo real & sincronização segura por usuário
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* User Profile Chip */}
            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl py-1.5 px-3">
              <div className="w-7 h-7 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs uppercase shadow-2xs">
                {userDisplayName.charAt(0)}
              </div>
              <div className="hidden sm:block text-left">
                <span className="text-xs font-bold text-slate-800 block leading-none">
                  {userDisplayName}
                </span>
                <span className="text-[10px] text-slate-400 block leading-tight truncate max-w-[130px]">
                  {user?.email}
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-xl transition-all cursor-pointer ml-1"
                title="Sair da Conta"
              >
                <LogOut size={16} />
              </button>
            </div>

            {currentScreen === 'DETAIL' && (
              <button 
                type="button"
                onClick={() => window.print()} 
                className="inline-flex items-center justify-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-all duration-150 shadow-sm shadow-sky-600/20 active:scale-[0.98] cursor-pointer"
                title="Imprimir ou salvar em PDF"
              >
                <Printer size={14} />
                <span>Exportar PDF</span>
              </button>
            )}
          </div>
        </header>

        {/* Main Operational Flow */}
        <main className="w-full pb-12 print:pb-0 print:p-0">
          {currentScreen === 'HUB' ? renderHubScreen() : renderDetailScreen()}
        </main>
      </div>

      {isCreateMonthOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget) setIsCreateMonthOpen(false); }}
        >
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                  <Calendar size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Novo Mês de Competência</h3>
                  <p className="text-xs text-slate-500">Crie um novo período de lançamentos</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsCreateMonthOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateMonth} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Mês de Competência
                </label>
                <select
                  value={newMonthForm.mes}
                  onChange={(e) => setNewMonthForm(prev => ({ ...prev, mes: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm font-medium rounded-xl px-3 py-2.5 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                >
                  {MONTH_NAMES.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Ano
                </label>
                <input 
                  type="number"
                  value={newMonthForm.ano}
                  onChange={(e) => setNewMonthForm(prev => ({ ...prev, ano: e.target.value }))}
                  min="2020"
                  max="2035"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm font-medium rounded-xl px-3 py-2.5 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Meta de Vendas (Quantidade de Veículos)
                </label>
                <input 
                  type="number"
                  value={newMonthForm.meta}
                  onChange={(e) => setNewMonthForm(prev => ({ ...prev, meta: e.target.value }))}
                  min="1"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm font-medium rounded-xl px-3 py-2.5 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                  required
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateMonthOpen(false)}
                  className="text-slate-500 hover:text-slate-800 font-semibold text-xs px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm shadow-sky-600/20 active:scale-[0.98] cursor-pointer"
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget) setIsEditMonthOpen(false); }}
        >
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                  <Pencil size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Editar Competência</h3>
                  <p className="text-xs text-slate-500">Altere o período ou a meta da competência</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsEditMonthOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateMonth} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Mês de Competência
                </label>
                <select
                  value={editMonthForm.mes}
                  onChange={(e) => setEditMonthForm(prev => ({ ...prev, mes: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm font-medium rounded-xl px-3 py-2.5 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                >
                  {MONTH_NAMES.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Ano
                </label>
                <input 
                  type="number"
                  value={editMonthForm.ano}
                  onChange={(e) => setEditMonthForm(prev => ({ ...prev, ano: e.target.value }))}
                  min="2020"
                  max="2035"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm font-medium rounded-xl px-3 py-2.5 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Meta de Vendas (Quantidade de Veículos)
                </label>
                <input 
                  type="number"
                  value={editMonthForm.meta}
                  onChange={(e) => setEditMonthForm(prev => ({ ...prev, meta: e.target.value }))}
                  min="1"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm font-medium rounded-xl px-3 py-2.5 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                  required
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditMonthOpen(false)}
                  className="text-slate-500 hover:text-slate-800 font-semibold text-xs px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm shadow-sky-600/20 active:scale-[0.98] cursor-pointer"
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget) setMonthToDelete(null); }}
        >
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-md p-6 animate-in zoom-in-95 duration-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Excluir mês {monthToDelete.mes} / {monthToDelete.ano}?
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Todas as vendas cadastradas e cálculos desta competência serão excluídos permanentemente da nuvem e do armazenamento local. Esta ação não poderá ser desfeita.
              </p>
            </div>
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setMonthToDelete(null)}
                className="text-slate-500 hover:text-slate-800 font-semibold text-xs px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteMonth}
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm shadow-rose-600/20 active:scale-[0.98] cursor-pointer"
              >
                Sim, Excluir Mês
              </button>
            </div>
          </div>
        </div>
      )}

      {showCalculationModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget) setShowCalculationModal(false); }}
        >
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-xl overflow-hidden flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
                  <Calculator size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Memória de Cálculo</h3>
                  <p className="text-xs text-slate-500">Detalhamento transparente da apuração da Comissão Bruta</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowCalculationModal(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto p-6 space-y-4 flex-1 text-xs">
              <div className="divide-y divide-slate-100 bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="font-semibold text-slate-800 block">1. Comissão Valor da Nota (VN)</span>
                    <span className="text-[11px] text-slate-500">Base {formatBRL(metrics.vnBase)} × {formatPercent(metrics.vnTier)} ({metrics.volume} veículos)</span>
                  </div>
                  <span className="font-bold text-slate-900 text-sm">{formatBRL(metrics.commissionVn)}</span>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div>
                    <span className="font-semibold text-slate-800 block">2. Comissão Margem</span>
                    <span className="text-[11px] text-slate-500">Base {formatBRL(metrics.marginBase)} × {formatPercent(metrics.marginTier)}</span>
                  </div>
                  <span className="font-bold text-slate-900 text-sm">{formatBRL(metrics.commissionMargin)}</span>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div>
                    <span className="font-semibold text-slate-800 block">3. Retorno F&I</span>
                    <span className="text-[11px] text-slate-500">Base Retorno F&I ({formatBRL(metrics.fAndIBaseRetorno)}) × Acelerador SPF ({formatPercent(metrics.fAndIAccelerator)})</span>
                  </div>
                  <span className="font-bold text-slate-900 text-sm">{formatBRL(metrics.commissionRetornoFAndI)}</span>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div>
                    <span className="font-semibold text-slate-800 block">4. Comissão SPF</span>
                    <span className="text-[11px] text-slate-500">{metrics.spfCount} contratos com SPF × R$ 100,00</span>
                  </div>
                  <span className="font-bold text-slate-900 text-sm">{formatBRL(metrics.commissionSpf)}</span>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div>
                    <span className="font-semibold text-slate-800 block">5. Comissão Acessórios</span>
                    <span className="text-[11px] text-slate-500">Base {formatBRL(metrics.accBase)} × {formatPercent(metrics.accTier)} (T.M.: {formatBRL(metrics.accTicketCommission)})</span>
                  </div>
                  <span className="font-bold text-slate-900 text-sm">{formatBRL(metrics.commissionAcc)}</span>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div>
                    <span className="font-semibold text-slate-800 block">6. Comissão Autobox</span>
                    <span className="text-[11px] text-slate-500">Base {formatBRL(metrics.autoboxBase)} × 4,5%</span>
                  </div>
                  <span className="font-bold text-slate-900 text-sm">{formatBRL(metrics.commissionAutobox)}</span>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div>
                    <span className="font-semibold text-slate-800 block">7. Comissão Emplacamento</span>
                    <span className="text-[11px] text-slate-500">Base {formatBRL(metrics.empBase)} × {formatPercent(metrics.empTier)} (Penetração: {formatPercent(metrics.empPenetration)})</span>
                  </div>
                  <span className="font-bold text-slate-900 text-sm">{formatBRL(metrics.commissionEmp)}</span>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div>
                    <span className="font-semibold text-slate-800 block">8. Premiações Diretas da Tabela</span>
                    <span className="text-[11px] text-slate-500">Seguros ({formatBRL(metrics.seguroTotal)}) + Bônus ({formatBRL(metrics.bonusCarroTotal)}) + Usados C. ({formatBRL(metrics.usadosCaptadosTotal)})</span>
                  </div>
                  <span className="font-bold text-slate-900 text-sm">{formatBRL(metrics.commissionDirects)}</span>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div>
                    <span className="font-semibold text-slate-800 block">9. DSR (Descanso Semanal Remunerado)</span>
                    <span className="text-[11px] text-slate-500">20% sobre (VN + Margem + Retorno F&I)</span>
                  </div>
                  <span className="font-bold text-slate-900 text-sm">{formatBRL(metrics.dsr)}</span>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div>
                    <span className="font-semibold text-slate-800 block">10. Lançamentos Extras Manuais</span>
                    <span className="text-[11px] text-slate-500">Usados ({formatBRL(activeExtras.premioUsados)}) + Águia ({formatBRL(activeExtras.premioAguia)}) + Líder ({formatBRL(activeExtras.premioLider)}) + NPS ({formatBRL(activeExtras.premioNps)})</span>
                  </div>
                  <span className="font-bold text-slate-900 text-sm">{formatBRL(metrics.extrasTotal)}</span>
                </div>
              </div>

              <div className="p-4 bg-sky-50/80 border border-sky-200/70 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-sky-900 block">Total Geral Bruto Apurado</span>
                  <span className="text-[11px] text-sky-700">Previsão Líquida ({activeNetPercentage.toFixed(2)}%): <strong>{formatBRL(metrics.netCommission)}</strong></span>
                </div>
                <span className="text-xl font-extrabold text-sky-700">{formatBRL(metrics.grossCommission)}</span>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50/80 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowCalculationModal(false)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition-all duration-150 cursor-pointer"
              >
                Concluir Visualização
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget) setIsAddModalOpen(false); }}
        >
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-2xl overflow-hidden flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
                  <Car size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Nova Venda</h3>
                  <p className="text-xs text-slate-500">Cadastre os valores comerciais e agregados do veículo</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto p-6 space-y-5 flex-1 text-xs">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-slate-900 font-semibold text-xs uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                  <span>Grupo 1: Identificação Básica</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      Nome do Cliente
                    </label>
                    <input 
                      type="text"
                      value={newSale.client}
                      onChange={(e) => setNewSale(prev => ({ ...prev, client: e.target.value }))}
                      placeholder={`Cliente ${activeSales.length + 1}`}
                      className="bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 text-slate-800 text-sm font-medium rounded-xl px-3 py-2 w-full transition-all duration-150 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      Modelo do Veículo
                    </label>
                    <input 
                      type="text"
                      value={newSale.car}
                      onChange={(e) => setNewSale(prev => ({ ...prev, car: e.target.value }))}
                      placeholder="Ex: DOLPHIN MINI GL"
                      className="bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 text-slate-800 text-sm font-medium rounded-xl px-3 py-2 w-full transition-all duration-150 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2 text-slate-900 font-semibold text-xs uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                  <span>Grupo 2: Valores Principais</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      Valor da Nota (VN)
                    </label>
                    <CurrencyInput 
                      value={newSale.vn}
                      onChange={(val) => setNewSale(prev => ({ ...prev, vn: val }))}
                      className="text-sm py-2 px-3 rounded-xl"
                      placeholder="R$ 0,00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      Margem Comercial
                    </label>
                    <CurrencyInput 
                      value={newSale.margin}
                      onChange={(val) => setNewSale(prev => ({ ...prev, margin: val }))}
                      className="text-sm py-2 px-3 rounded-xl"
                      placeholder="R$ 0,00"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2 text-slate-900 font-semibold text-xs uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                  <span>Grupo 3: F&I e Financiamento</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      F&I / Financiamento
                    </label>
                    <CurrencyInput 
                      value={newSale.fAndI}
                      onChange={(val) => setNewSale(prev => ({ ...prev, fAndI: val }))}
                      className="text-sm py-2 px-3 rounded-xl"
                      placeholder="R$ 0,00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      Retorno F&I
                    </label>
                    <select
                      value={newSale.returnFAndI}
                      onChange={(e) => setNewSale(prev => ({ ...prev, returnFAndI: e.target.value }))}
                      className="bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 text-slate-800 text-sm font-medium rounded-xl px-3 py-2 w-full transition-all duration-150 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 cursor-pointer"
                    >
                      <option value="R0">R0 (0,0%)</option>
                      <option value="R1">R1 (1,2%)</option>
                      <option value="R2">R2 (2,4%)</option>
                      <option value="R3">R3 (3,6%)</option>
                      <option value="R4">R4 (4,8%)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      Valor SPF
                    </label>
                    <CurrencyInput 
                      value={newSale.spf}
                      onChange={(val) => setNewSale(prev => ({ ...prev, spf: val }))}
                      className="text-sm py-2 px-3 rounded-xl"
                      placeholder="R$ 0,00"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2 text-slate-900 font-semibold text-xs uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                  <span>Grupo 4: Serviços e Acessórios Agregados</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      Acessórios
                    </label>
                    <CurrencyInput 
                      value={newSale.accessories}
                      onChange={(val) => setNewSale(prev => ({ ...prev, accessories: val }))}
                      className="text-sm py-2 px-3 rounded-xl"
                      placeholder="R$ 0,00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      Autobox
                    </label>
                    <CurrencyInput 
                      value={newSale.autobox}
                      onChange={(val) => setNewSale(prev => ({ ...prev, autobox: val }))}
                      className="text-sm py-2 px-3 rounded-xl"
                      placeholder="R$ 0,00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      Emplacamento
                    </label>
                    <CurrencyInput 
                      value={newSale.emplacamento}
                      onChange={(val) => setNewSale(prev => ({ ...prev, emplacamento: val }))}
                      className="text-sm py-2 px-3 rounded-xl"
                      placeholder="R$ 0,00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      Seguro
                    </label>
                    <CurrencyInput 
                      value={newSale.seguro}
                      onChange={(val) => setNewSale(prev => ({ ...prev, seguro: val }))}
                      className="text-sm py-2 px-3 rounded-xl"
                      placeholder="R$ 0,00"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2 text-slate-900 font-semibold text-xs uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                  <span>Grupo 5: Premiações Diretas</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      Bônus Carro
                    </label>
                    <CurrencyInput 
                      value={newSale.bonusCarro}
                      onChange={(val) => setNewSale(prev => ({ ...prev, bonusCarro: val }))}
                      className="text-sm py-2 px-3 rounded-xl"
                      placeholder="R$ 0,00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      Usados Captados
                    </label>
                    <CurrencyInput 
                      value={newSale.usadosCaptados}
                      onChange={(val) => setNewSale(prev => ({ ...prev, usadosCaptados: val }))}
                      className="text-sm py-2 px-3 rounded-xl"
                      placeholder="R$ 0,00"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50/90 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-end gap-3 sticky bottom-0 z-10">
              <button 
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-full sm:w-auto text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 font-semibold text-xs px-5 py-2.5 rounded-xl transition-all duration-150 cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={handleSaveNewSale}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold px-6 py-2.5 rounded-xl transition-all duration-150 shadow-sm shadow-sky-600/20 active:scale-[0.98] cursor-pointer"
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>Salvar Venda</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Dedicated Media Styles */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 6mm 8mm;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-shadow: none !important;
            text-shadow: none !important;
          }
          html, body {
            background-color: #ffffff !important;
            color: #0f172a !important;
            font-size: 8.5px !important;
            line-height: 1.15 !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-page-break {
            break-before: page !important;
            page-break-before: always !important;
          }
          .print-avoid-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .print-dark-card {
            background-color: #0f172a !important;
            color: #ffffff !important;
          }
          input, select {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            background: transparent !important;
            color: #0f172a !important;
            font-size: 8.5px !important;
            height: auto !important;
            width: 100% !important;
          }
        }
      `}</style>

    </div>
  );
}