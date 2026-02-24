import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Eye as EyeIcon, EyeOff, Mail, Camera, CheckCircle, RotateCcw, Facebook } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLogin, useRegister, useUpdateProfile } from '../../hooks/useApi';
import { authAPI, usersAPI, newsletterAPI } from '../../services/api';
import { Button, Avatar, Input, Textarea, Modal } from '../../components/common/index.jsx';
import { BetweenSectionsSlot } from '../../components/ads/BetweenSectionsSlot.jsx';
import { buildApiUrl, buildMediaUrl } from '../../utils';
import { useAuthStore } from '../../stores/authStore';
import useLanguage from '../../hooks/useLanguage';

function GoogleLogo({ className = 'w-4 h-4' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
    >
      <path fill="#EA4335" d="M12 10.2v3.9h5.46c-.24 1.26-.95 2.33-2.01 3.05l3.24 2.52c1.89-1.74 2.98-4.31 2.98-7.37 0-.72-.06-1.42-.18-2.1H12z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.63-2.45l-3.24-2.52c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.77-5.62-4.15l-3.34 2.58C4.7 19.84 8.07 22 12 22z" />
      <path fill="#4A90E2" d="M6.38 13.84A5.95 5.95 0 0 1 6.07 12c0-.64.11-1.26.31-1.84l-3.34-2.58A9.97 9.97 0 0 0 2 12c0 1.61.38 3.13 1.04 4.42l3.34-2.58z" />
      <path fill="#FBBC05" d="M12 6.01c1.47 0 2.78.51 3.81 1.5l2.85-2.85C16.96 3.06 14.7 2 12 2 8.07 2 4.7 4.16 3.04 7.58l3.34 2.58c.8-2.38 3.01-4.15 5.62-4.15z" />
    </svg>
  );
}

function getPostLoginPath(user) {
  if (!user) return '/';
  if (user.profileCompletionRequired) return '/complete-profile';
  if (user.role === 'user') return '/';
  return '/dashboard';
}

function startSocialAuth(provider) {
  window.location.assign(buildApiUrl(`/auth/social/${provider}`));
}

function SocialAuthButtons({ isBusy = false }) {
  const { t } = useLanguage();
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => startSocialAuth('google')}
        disabled={isBusy}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-dark-200 bg-white px-4 py-2.5 text-sm font-semibold text-dark-700 transition-colors hover:bg-dark-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-dark-700 dark:bg-dark-900 dark:text-dark-100 dark:hover:bg-dark-800"
      >
        <GoogleLogo />
        {t('auth.continueWithGoogle', 'Continue with Google')}
      </button>
      <button
        type="button"
        onClick={() => startSocialAuth('facebook')}
        disabled={isBusy}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-dark-200 bg-white px-4 py-2.5 text-sm font-semibold text-dark-700 transition-colors hover:bg-dark-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-dark-700 dark:bg-dark-900 dark:text-dark-100 dark:hover:bg-dark-800"
      >
        <Facebook className="w-4 h-4 text-[#1877F2]" />
        {t('auth.continueWithFacebook', 'Continue with Facebook')}
      </button>
    </div>
  );
}

export function LoginPage() {
  const { t, translateText } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const navigate = useNavigate();
  const location = useLocation();
  const { mutate: login, isPending } = useLogin();
  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!email) newErrors.email = 'Email is required';
    if (!password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    login(
      { email, password },
      {
        onSuccess: (response) => {
          const loggedInUser = response?.data?.data?.user;
          const destination = loggedInUser?.profileCompletionRequired ? '/complete-profile' : from;
          navigate(destination, { replace: true });
        },
      }
    );
  };

  return (
    <>
      <Helmet><title>{`${t('auth.signIn', 'Sign In')} - Bassac Post`}</title></Helmet>
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-2 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center">
              <span className="text-white font-display font-bold text-2xl">B</span>
            </div>
            <span className="font-display font-bold text-2xl text-dark-900 dark:text-white">Bassac Post</span>
          </Link>

          <div className="card p-8">
            <h1 className="text-2xl font-bold text-dark-900 dark:text-white text-center mb-6">{t('auth.signIn', 'Sign In')}</h1>

            <SocialAuthButtons isBusy={isPending} />
            <div className="my-5 flex items-center gap-3 text-xs text-dark-500">
              <span className="h-px flex-1 bg-dark-200 dark:bg-dark-700" />
              <span>{t('auth.orUseEmail', 'or use email')}</span>
              <span className="h-px flex-1 bg-dark-200 dark:bg-dark-700" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input label="Email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} required />

              <div className="relative">
                <Input label="Password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-[38px] text-dark-400 hover:text-dark-600 dark:hover:text-dark-300">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 text-primary-600 rounded focus:ring-2 focus:ring-primary-500" />
                  <span className="text-sm text-dark-600 dark:text-dark-400">{t('auth.rememberMe', 'Remember me')}</span>
                </label>
                <Link to="/forgot-password" className="text-sm link-primary">{t('auth.forgotPassword', 'Forgot password?')}</Link>
              </div>

              <Button type="submit" className="w-full" size="lg" isLoading={isPending}>{t('auth.signIn', 'Sign In')}</Button>
            </form>

            <p className="mt-6 text-center text-dark-500">
              {t('auth.noAccount', "Don't have an account?")} <Link to="/register" className="font-medium link-primary">{t('auth.signUp', 'Sign up')}</Link>
            </p>

            <div className="mt-6 p-4 bg-dark-100 dark:bg-dark-800 rounded-xl">
              <p className="text-sm font-medium text-dark-600 dark:text-dark-400 mb-2">{translateText('Demo Accounts:')}</p>
              <div className="text-xs text-dark-500 space-y-1">
                <p>{translateText('Admin')}: admin@bassacmedia.com / Admin@123</p>
                <p>{translateText('Editor')}: editor@bassacmedia.com / Editor@123</p>
                <p>{translateText('Writer')}: writer@bassacmedia.com / Writer@123</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ==================== REGISTER PAGE ====================
// Password strength calculator
const getPasswordStrength = (password) => {
  if (!password) return { score: 0, label: '', color: '' };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  const strengths = [
    { score: 0, label: '', color: '' },
    { score: 1, label: 'Weak', color: 'bg-red-500' },
    { score: 2, label: 'Fair', color: 'bg-orange-500' },
    { score: 3, label: 'Good', color: 'bg-yellow-500' },
    { score: 4, label: 'Strong', color: 'bg-emerald-500' },
    { score: 5, label: 'Very Strong', color: 'bg-emerald-600' },
  ];

  return strengths[Math.min(score, 5)];
};

const birthdayMonths = [
  { value: '1', label: 'Jan' },
  { value: '2', label: 'Feb' },
  { value: '3', label: 'Mar' },
  { value: '4', label: 'Apr' },
  { value: '5', label: 'May' },
  { value: '6', label: 'Jun' },
  { value: '7', label: 'Jul' },
  { value: '8', label: 'Aug' },
  { value: '9', label: 'Sep' },
  { value: '10', label: 'Oct' },
  { value: '11', label: 'Nov' },
  { value: '12', label: 'Dec' },
];

const birthdayYears = Array.from({ length: 100 }, (_, index) => `${new Date().getFullYear() - index}`);

const getDaysInMonth = (year, month) => {
  if (!year || !month) return 31;
  return new Date(Number(year), Number(month), 0).getDate();
};

const formatBirthday = (year, month, day) => {
  if (!year || !month || !day) return '';
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const emailPattern = /^\S+@\S+\.\S+$/;

const getRegisterValidationErrors = (values) => {
  const nextErrors = {};
  const birthday = formatBirthday(values.birthYear, values.birthMonth, values.birthDay);

  if (!values.firstName?.trim()) nextErrors.firstName = 'Required';
  if (!values.lastName?.trim()) nextErrors.lastName = 'Required';

  if (!values.email?.trim()) {
    nextErrors.email = 'Required';
  } else if (!emailPattern.test(values.email.trim())) {
    nextErrors.email = 'Invalid email address';
  }

  if (!values.gender) {
    nextErrors.gender = 'Required';
  } else if (!['male', 'female'].includes(values.gender)) {
    nextErrors.gender = 'Invalid gender';
  }

  if (!birthday) {
    nextErrors.birthday = 'Birthday is required';
  } else {
    const birthdayDate = new Date(`${birthday}T00:00:00`);
    if (Number.isNaN(birthdayDate.getTime())) {
      nextErrors.birthday = 'Birthday is invalid';
    } else if (birthdayDate > new Date()) {
      nextErrors.birthday = 'Birthday cannot be in the future';
    }
  }

  if (!values.password) {
    nextErrors.password = 'Required';
  } else {
    if (values.password.length < 8) nextErrors.password = 'Min 8 characters';
    else if (!/\d/.test(values.password) || !/[a-zA-Z]/.test(values.password)) {
      nextErrors.password = 'Must include letters and numbers';
    }
  }

  if (!values.confirmPassword) {
    nextErrors.confirmPassword = 'Required';
  } else if (values.password !== values.confirmPassword) {
    nextErrors.confirmPassword = 'Passwords do not match';
  }

  return nextErrors;
};

const AVATAR_CROP_BOX_SIZE = 288;
const AVATAR_EXPORT_SIZE = 640;

const createAvatarEditorState = () => ({
  isOpen: false,
  src: '',
  fileName: 'avatar.jpg',
  naturalWidth: 0,
  naturalHeight: 0,
  position: { x: 0, y: 0 },
  zoom: 1,
  rotation: 0,
});

const loadImageFromUrl = (src) => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Invalid image'));
    image.src = src;
  });
};

const renderCroppedAvatarBlob = async ({ src, position, zoom, rotation }) => {
  const image = await loadImageFromUrl(src);
  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_EXPORT_SIZE;
  canvas.height = AVATAR_EXPORT_SIZE;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to process image');
  }

  const baseCoverScale = Math.max(
    AVATAR_CROP_BOX_SIZE / image.naturalWidth,
    AVATAR_CROP_BOX_SIZE / image.naturalHeight
  );
  const outputRatio = AVATAR_EXPORT_SIZE / AVATAR_CROP_BOX_SIZE;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(
    canvas.width / 2 + position.x * outputRatio,
    canvas.height / 2 + position.y * outputRatio
  );
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.scale(baseCoverScale * zoom * outputRatio, baseCoverScale * zoom * outputRatio);
  ctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
  ctx.restore();

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Unable to process image'));
        return;
      }
      resolve(blob);
    }, 'image/jpeg', 0.92);
  });
};

export function RegisterPage() {
  const { t, translateText } = useLanguage();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    gender: 'male',
    birthDay: '',
    birthMonth: '',
    birthYear: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [emailCheck, setEmailCheck] = useState({ status: 'idle', email: '' });

  const navigate = useNavigate();
  const { mutate: register, isPending } = useRegister();

  const passwordStrength = getPasswordStrength(form.password);
  const normalizedEmail = form.email.trim().toLowerCase();

  useEffect(() => {
    if (!normalizedEmail) {
      setEmailCheck({ status: 'idle', email: '' });
      return;
    }

    if (!emailPattern.test(normalizedEmail)) {
      setEmailCheck({ status: 'idle', email: normalizedEmail });
      return;
    }

    let isCancelled = false;
    setEmailCheck((prev) => {
      if (prev.email === normalizedEmail && (prev.status === 'available' || prev.status === 'taken')) {
        return prev;
      }
      return { status: 'checking', email: normalizedEmail };
    });

    const timer = setTimeout(async () => {
      try {
        const response = await authAPI.checkEmail(normalizedEmail);
        if (isCancelled) return;
        const available = Boolean(response?.data?.data?.available);
        setEmailCheck({ status: available ? 'available' : 'taken', email: normalizedEmail });
      } catch {
        if (!isCancelled) {
          setEmailCheck({ status: 'error', email: normalizedEmail });
        }
      }
    }, 450);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [normalizedEmail]);

  const validationErrors = useMemo(() => getRegisterValidationErrors(form), [form]);
  const mergedValidationErrors = useMemo(() => {
    const nextErrors = { ...validationErrors };

    if (
      !nextErrors.email
      && normalizedEmail
      && emailPattern.test(normalizedEmail)
      && emailCheck.email === normalizedEmail
      && emailCheck.status === 'taken'
    ) {
      nextErrors.email = 'Email already registered';
    }

    return nextErrors;
  }, [emailCheck.email, emailCheck.status, normalizedEmail, validationErrors]);

  const emailChecking = emailCheck.email === normalizedEmail && emailCheck.status === 'checking';
  const visibleErrors = useMemo(() => {
    if (submitAttempted) return mergedValidationErrors;

    const nextErrors = {};
    const birthdayTouched = touched.birthDay || touched.birthMonth || touched.birthYear || touched.birthday;

    Object.entries(mergedValidationErrors).forEach(([field, message]) => {
      if (field === 'birthday') {
        if (birthdayTouched) nextErrors.birthday = message;
        return;
      }
      if (touched[field]) {
        nextErrors[field] = message;
      }
    });

    return nextErrors;
  }, [mergedValidationErrors, submitAttempted, touched]);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleBirthdayChange = (field) => (e) => {
    const nextForm = { ...form, [field]: e.target.value };
    const maxDay = getDaysInMonth(nextForm.birthYear, nextForm.birthMonth);

    if (nextForm.birthDay && Number(nextForm.birthDay) > maxDay) {
      nextForm.birthDay = '';
    }

    setForm(nextForm);
    setTouched((prev) => ({ ...prev, [field]: true, birthday: true }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const birthday = formatBirthday(form.birthYear, form.birthMonth, form.birthDay);
    setSubmitAttempted(true);
    setTouched({
      firstName: true,
      lastName: true,
      email: true,
      gender: true,
      birthDay: true,
      birthMonth: true,
      birthYear: true,
      birthday: true,
      password: true,
      confirmPassword: true,
    });

    if (emailChecking) return;
    if (Object.keys(mergedValidationErrors).length > 0) return;

    register(
      {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        gender: form.gender,
        birthday,
        password: form.password,
      },
      {
        onSuccess: (response) => {
          const newUser = response?.data?.data?.user;
          navigate(getPostLoginPath(newUser), { replace: true });
        },
      }
    );
  };

  return (
    <>
      <Helmet><title>{`${t('auth.createAccount', 'Create Account')} - Bassac Post`}</title></Helmet>
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-2 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center">
              <span className="text-white font-display font-bold text-2xl">B</span>
            </div>
            <span className="font-display font-bold text-2xl text-dark-900 dark:text-white">Bassac Post</span>
          </Link>

          <div className="card p-8">
            <h1 className="text-2xl font-bold text-dark-900 dark:text-white text-center mb-6">{t('auth.createAccount', 'Create Account')}</h1>

            <SocialAuthButtons isBusy={isPending} />
            <div className="my-5 flex items-center gap-3 text-xs text-dark-500">
              <span className="h-px flex-1 bg-dark-200 dark:bg-dark-700" />
              <span>{t('auth.orUseEmail', 'or use email')}</span>
              <span className="h-px flex-1 bg-dark-200 dark:bg-dark-700" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="First Name" placeholder="John" value={form.firstName} onChange={handleChange('firstName')} error={visibleErrors.firstName} required />
                <Input label="Last Name" placeholder="Doe" value={form.lastName} onChange={handleChange('lastName')} error={visibleErrors.lastName} required />
              </div>
              <Input label="Email" type="email" placeholder="you@example.com" value={form.email} onChange={handleChange('email')} error={visibleErrors.email} required />
              {!visibleErrors.email && touched.email && emailCheck.email === normalizedEmail && emailPattern.test(normalizedEmail) && (
                <p
                  className={`-mt-2 text-xs ${
                    emailCheck.status === 'available'
                      ? 'text-emerald-600'
                      : emailCheck.status === 'checking'
                        ? 'text-dark-500'
                        : emailCheck.status === 'error'
                          ? 'text-amber-600'
                          : 'text-dark-500'
                  }`}
                >
                  {emailCheck.status === 'checking' && translateText('Checking email availability...')}
                  {emailCheck.status === 'available' && translateText('Email is available')}
                  {emailCheck.status === 'error' && translateText('Could not verify email right now')}
                </p>
              )}
              <div>
                <label className="label">{t('auth.gender', 'Gender')}<span className="text-red-500 ml-1">*</span></label>
                <div className="grid grid-cols-2 gap-2 rounded-xl border border-dark-200 dark:border-dark-700 p-1 bg-dark-50 dark:bg-dark-900/40">
                  {['male', 'female'].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setForm({ ...form, gender: option });
                        setTouched((prev) => ({ ...prev, gender: true }));
                      }}
                      className={`rounded-lg px-3 py-2 text-sm font-medium capitalize transition-colors ${
                        form.gender === option
                          ? 'bg-primary-600 text-white shadow-sm'
                          : 'text-dark-600 hover:bg-white dark:text-dark-300 dark:hover:bg-dark-800'
                      }`}
                    >
                      {translateText(option)}
                    </button>
                  ))}
                </div>
                {visibleErrors.gender && <p className="mt-1.5 text-sm text-red-500">{translateText(visibleErrors.gender)}</p>}
              </div>
              <div>
                <label className="label">{t('auth.birthday', 'Birthday')}<span className="text-red-500 ml-1">*</span></label>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={form.birthDay}
                    onChange={handleBirthdayChange('birthDay')}
                    className={`input py-2.5 ${visibleErrors.birthday ? 'input-error' : ''}`}
                    required
                  >
                    <option value="">{t('auth.day', 'Day')}</option>
                    {Array.from({ length: getDaysInMonth(form.birthYear, form.birthMonth) }, (_, index) => `${index + 1}`).map((day) => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                  <select
                    value={form.birthMonth}
                    onChange={handleBirthdayChange('birthMonth')}
                    className={`input py-2.5 ${visibleErrors.birthday ? 'input-error' : ''}`}
                    required
                  >
                    <option value="">{t('auth.month', 'Month')}</option>
                    {birthdayMonths.map((month) => (
                      <option key={month.value} value={month.value}>{translateText(month.label)}</option>
                    ))}
                  </select>
                  <select
                    value={form.birthYear}
                    onChange={handleBirthdayChange('birthYear')}
                    className={`input py-2.5 ${visibleErrors.birthday ? 'input-error' : ''}`}
                    required
                  >
                    <option value="">{t('auth.year', 'Year')}</option>
                    {birthdayYears.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                {visibleErrors.birthday && <p className="mt-1.5 text-sm text-red-500">{translateText(visibleErrors.birthday)}</p>}
              </div>
              <div>
                <div className="relative">
                  <Input label="Password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={form.password} onChange={handleChange('password')} error={visibleErrors.password} required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-[38px] text-dark-400 hover:text-dark-600 dark:hover:text-dark-300">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                  </button>
                </div>
                {form.password && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            level <= passwordStrength.score ? passwordStrength.color : 'bg-dark-200 dark:bg-dark-700'
                          }`}
                        />
                      ))}
                    </div>
                    <p className={`text-xs ${passwordStrength.score >= 3 ? 'text-emerald-600' : 'text-dark-500'}`}>
                      {t('auth.passwordStrength', 'Password strength')}: {translateText(passwordStrength.label)}
                    </p>
                  </div>
                )}
              </div>
              <Input label="Confirm Password" type="password" placeholder="••••••••" value={form.confirmPassword} onChange={handleChange('confirmPassword')} error={visibleErrors.confirmPassword} required />
              <Button type="submit" className="w-full" size="lg" isLoading={isPending}>Create Account</Button>
            </form>

            <p className="mt-6 text-center text-dark-500">
              {t('auth.haveAccount', 'Already have an account?')} <Link to="/login" className="font-medium link-primary">{t('auth.signIn', 'Sign in')}</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

// ==================== SOCIAL CALLBACK PAGE ====================

export function SocialAuthCallbackPage() {
  const { translateText } = useLanguage();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Completing social sign in...');

  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const providerMessage = searchParams.get('message');

  useEffect(() => {
    if (error) {
      setStatus('error');
      setMessage(providerMessage || 'Social sign-in failed. Please try again.');
      return;
    }

    if (!code) {
      setStatus('error');
      setMessage('Missing social login session. Please try again.');
      return;
    }

    let cancelled = false;

    const completeSocialLogin = async () => {
      try {
        const response = await authAPI.socialExchange(code);
        if (cancelled) return;

        const payload = response?.data?.data;
        if (!payload?.user || !payload?.accessToken || !payload?.refreshToken) {
          throw new Error('Invalid social login payload');
        }

        login(payload.user, payload.accessToken, payload.refreshToken);
        navigate(getPostLoginPath(payload.user), { replace: true });
      } catch (exchangeError) {
        if (cancelled) return;
        setStatus('error');
        setMessage(exchangeError?.response?.data?.message || 'Could not complete social sign-in. Please try again.');
      }
    };

    completeSocialLogin();

    return () => {
      cancelled = true;
    };
  }, [code, error, login, navigate, providerMessage]);

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="w-full max-w-md card p-8 text-center">
          <h1 className="text-xl font-bold text-dark-900 dark:text-white mb-3">{translateText('Sign-In Failed')}</h1>
          <p className="text-sm text-dark-500 mb-6">{translateText(message)}</p>
          <Link to="/login" className="btn btn-primary w-full">{translateText('Back to Login')}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-md card p-8 text-center">
        <div className="w-12 h-12 mx-auto mb-4 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        <h1 className="text-xl font-bold text-dark-900 dark:text-white mb-2">{translateText('Signing you in')}</h1>
        <p className="text-sm text-dark-500">{translateText(message)}</p>
      </div>
    </div>
  );
}

// ==================== COMPLETE PROFILE PAGE ====================

export function CompleteProfilePage() {
  const { translateText } = useLanguage();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { mutate: updateProfile, isPending } = useUpdateProfile();
  const [form, setForm] = useState({
    gender: user?.gender || '',
    birthday: user?.birthday && !Number.isNaN(new Date(user.birthday).getTime())
      ? new Date(user.birthday).toISOString().split('T')[0]
      : '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const nextGender = user?.profileMissingFields?.includes('gender') ? '' : (user?.gender || '');
    const nextBirthday = user?.birthday && !Number.isNaN(new Date(user.birthday).getTime())
      ? new Date(user.birthday).toISOString().split('T')[0]
      : '';
    setForm({ gender: nextGender, birthday: nextBirthday });
  }, [user?.birthday, user?.gender, user?.profileMissingFields]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = {};

    if (!form.gender || !['male', 'female'].includes(form.gender)) {
      nextErrors.gender = 'Please select your gender';
    }

    if (!form.birthday) {
      nextErrors.birthday = 'Please select your birthday';
    } else {
      const birthdayDate = new Date(`${form.birthday}T00:00:00`);
      if (Number.isNaN(birthdayDate.getTime())) {
        nextErrors.birthday = 'Birthday is invalid';
      } else if (birthdayDate > new Date()) {
        nextErrors.birthday = 'Birthday cannot be in the future';
      }
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    updateProfile(
      {
        gender: form.gender,
        birthday: form.birthday,
      },
      {
        onSuccess: (response) => {
          const updatedUser = response?.data?.data?.user;
          const stillRequired = Boolean(updatedUser?.profileNeedsCompletion);
          if (stillRequired) {
            setErrors({ form: 'Please complete the required profile fields.' });
            return;
          }
          navigate(getPostLoginPath({ ...user, profileCompletionRequired: false }), { replace: true });
        },
      }
    );
  };

  return (
    <>
      <Helmet><title>{`${translateText('Complete Profile')} - Bassac Post`}</title></Helmet>
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-2 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center">
              <span className="text-white font-display font-bold text-2xl">B</span>
            </div>
            <span className="font-display font-bold text-2xl text-dark-900 dark:text-white">Bassac Post</span>
          </Link>

          <div className="card p-8">
            <h1 className="text-2xl font-bold text-dark-900 dark:text-white text-center mb-2">{translateText('Complete Your Profile')}</h1>
            <p className="text-sm text-dark-500 text-center mb-6">
              {translateText('We need your gender and birthday to finish your account setup.')}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {errors.form && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                  {translateText(errors.form)}
                </div>
              )}

              <div>
                <label className="label">{translateText('Gender')}<span className="text-red-500 ml-1">*</span></label>
                <select
                  value={form.gender}
                  onChange={(event) => setForm((prev) => ({ ...prev, gender: event.target.value }))}
                  className={`input ${errors.gender ? 'input-error' : ''}`}
                  required
                >
                  <option value="">{translateText('Select gender')}</option>
                  <option value="male">{translateText('Male')}</option>
                  <option value="female">{translateText('Female')}</option>
                </select>
                {errors.gender && <p className="mt-1.5 text-sm text-red-500">{translateText(errors.gender)}</p>}
              </div>

              <Input
                label={translateText('Birthday')}
                type="date"
                value={form.birthday}
                onChange={(event) => setForm((prev) => ({ ...prev, birthday: event.target.value }))}
                error={translateText(errors.birthday)}
                required
              />

              <Button type="submit" className="w-full" size="lg" isLoading={isPending}>
                {translateText('Save & Continue')}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

// ==================== ACCOUNT PAGE ====================

export function AccountPage() {
  const { translateText } = useLanguage();
  const { user, setUser } = useAuthStore();
  const { mutate: updateProfile, isPending } = useUpdateProfile();
  const initialBirthday = user?.birthday && !Number.isNaN(new Date(user.birthday).getTime())
    ? new Date(user.birthday).toISOString().split('T')[0]
    : '';
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    gender: user?.gender || 'male',
    birthday: initialBirthday,
    bio: user?.bio || '',
  });
  const [avatarEditor, setAvatarEditor] = useState(createAvatarEditorState);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isCropDragging, setIsCropDragging] = useState(false);
  const dragStateRef = useRef({ active: false, lastX: 0, lastY: 0 });

  const cropPreviewImageStyle = useMemo(() => {
    if (!avatarEditor.naturalWidth || !avatarEditor.naturalHeight) {
      return {};
    }
    const coverScale = Math.max(
      AVATAR_CROP_BOX_SIZE / avatarEditor.naturalWidth,
      AVATAR_CROP_BOX_SIZE / avatarEditor.naturalHeight
    );
    return {
      width: `${avatarEditor.naturalWidth * coverScale}px`,
      height: `${avatarEditor.naturalHeight * coverScale}px`,
    };
  }, [avatarEditor.naturalHeight, avatarEditor.naturalWidth]);

  const closeAvatarEditor = () => {
    dragStateRef.current.active = false;
    setIsCropDragging(false);
    setAvatarEditor((prev) => {
      if (prev.src?.startsWith('blob:')) {
        URL.revokeObjectURL(prev.src);
      }
      return createAvatarEditorState();
    });
  };

  useEffect(() => {
    if (!avatarEditor.isOpen) return undefined;

    const updateDrag = (clientX, clientY) => {
      const drag = dragStateRef.current;
      if (!drag.active) return;

      const deltaX = clientX - drag.lastX;
      const deltaY = clientY - drag.lastY;
      drag.lastX = clientX;
      drag.lastY = clientY;

      setAvatarEditor((prev) => ({
        ...prev,
        position: {
          x: prev.position.x + deltaX,
          y: prev.position.y + deltaY,
        },
      }));
    };

    const endDrag = () => {
      if (!dragStateRef.current.active) return;
      dragStateRef.current.active = false;
      setIsCropDragging(false);
    };

    const handleMouseMove = (event) => {
      updateDrag(event.clientX, event.clientY);
    };

    const handleTouchMove = (event) => {
      if (!dragStateRef.current.active) return;
      const touch = event.touches?.[0];
      if (!touch) return;
      event.preventDefault();
      updateDrag(touch.clientX, touch.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', endDrag);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', endDrag);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', endDrag);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', endDrag);
    };
  }, [avatarEditor.isOpen]);

  useEffect(() => {
    return () => {
      if (avatarEditor.src?.startsWith('blob:')) {
        URL.revokeObjectURL(avatarEditor.src);
      }
    };
  }, [avatarEditor.src]);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error(translateText('Please select an image file'));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(translateText('Image must be less than 5MB'));
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    try {
      const image = await loadImageFromUrl(previewUrl);
      setAvatarEditor((prev) => {
        if (prev.src?.startsWith('blob:')) {
          URL.revokeObjectURL(prev.src);
        }
        return {
          ...createAvatarEditorState(),
          isOpen: true,
          src: previewUrl,
          fileName: file.name || 'avatar.jpg',
          naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight,
        };
      });
    } catch {
      URL.revokeObjectURL(previewUrl);
      toast.error(translateText('Could not read this image'));
    }
  };

  const handleAvatarUpload = async () => {
    if (!avatarEditor.src) return;

    setIsUploadingAvatar(true);
    try {
      const croppedBlob = await renderCroppedAvatarBlob({
        src: avatarEditor.src,
        position: avatarEditor.position,
        zoom: avatarEditor.zoom,
        rotation: avatarEditor.rotation,
      });
      const safeName = (avatarEditor.fileName || 'avatar').replace(/\.[^/.]+$/, '');
      const croppedFile = new File([croppedBlob], `${safeName}-edited.jpg`, { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('avatar', croppedFile);
      const response = await usersAPI.uploadAvatar(formData);
      const avatar = response?.data?.data?.avatar;
      if (avatar) {
        setUser({ ...user, avatar });
        toast.success(translateText('Profile picture updated!'));
        closeAvatarEditor();
      } else {
        toast.error(translateText('Upload failed'));
      }
    } catch (error) {
      toast.error(translateText('Upload failed'));
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateProfile(form);
  };

  return (
    <>
      <Helmet><title>{`${translateText('Account')} - Bassac Post`}</title></Helmet>
      <div className="container-custom py-10">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-dark-900 dark:text-white mb-6">{translateText('Account')}</h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="card p-6 text-center">
              <div className="relative inline-block mb-4">
                <Avatar
                  src={buildMediaUrl(user?.avatar)}
                  name={user?.fullName}
                  size="xl"
                  className="mx-auto"
                />
                <label
                  htmlFor="account-avatar-upload"
                  className="absolute bottom-0 right-0 p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-full cursor-pointer transition-colors shadow-lg"
                >
                  <Camera className="w-4 h-4" />
                  <input
                    id="account-avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="mb-4 text-xs text-dark-500">{translateText('Tap the camera icon to choose, crop, and update your photo.')}</p>

              <h2 className="text-2xl font-semibold text-dark-900 dark:text-white">{user?.fullName}</h2>
              <p className="text-dark-500">{user?.email}</p>
              <p className="text-sm text-primary-600 capitalize mt-1">{translateText(user?.role)}</p>
            </div>
            <div className="card p-6">
              <h2 className="font-semibold text-dark-900 dark:text-white mb-4">{translateText('Edit Profile')}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="First Name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                  <Input label="Last Name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">{translateText('Gender')}</label>
                    <select
                      value={form.gender}
                      onChange={(e) => setForm({ ...form, gender: e.target.value })}
                      className="input"
                    >
                      <option value="male">{translateText('Male')}</option>
                      <option value="female">{translateText('Female')}</option>
                    </select>
                  </div>
                  <Input
                    label={translateText('Birthday')}
                    type="date"
                    value={form.birthday}
                    onChange={(e) => setForm({ ...form, birthday: e.target.value })}
                  />
                </div>
                <Textarea label={translateText('Bio')} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder={translateText('Tell us about yourself...')} />
                <Button type="submit" isLoading={isPending}>{translateText('Save Changes')}</Button>
              </form>
            </div>
          </div>
        </div>
      </div>
      <Modal
        isOpen={avatarEditor.isOpen}
        onClose={() => {
          if (!isUploadingAvatar) {
            closeAvatarEditor();
          }
        }}
        title="Edit Profile Picture"
        size="lg"
      >
        <div className="space-y-6">
          <div className="mx-auto w-full max-w-sm">
            <div
              className={`relative mx-auto h-72 w-72 overflow-hidden rounded-full border-4 border-primary-200 dark:border-primary-900 bg-dark-100 dark:bg-dark-800 select-none touch-none ${
                isCropDragging ? 'cursor-grabbing' : 'cursor-grab'
              }`}
              onMouseDown={(event) => {
                event.preventDefault();
                dragStateRef.current = {
                  active: true,
                  lastX: event.clientX,
                  lastY: event.clientY,
                };
                setIsCropDragging(true);
              }}
              onTouchStart={(event) => {
                const touch = event.touches?.[0];
                if (!touch) return;
                dragStateRef.current = {
                  active: true,
                  lastX: touch.clientX,
                  lastY: touch.clientY,
                };
                setIsCropDragging(true);
              }}
            >
              {avatarEditor.src && (
                <img
                  src={avatarEditor.src}
                  alt="Avatar crop preview"
                  className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
                  style={{
                    ...cropPreviewImageStyle,
                    transform: `translate(calc(-50% + ${avatarEditor.position.x}px), calc(-50% + ${avatarEditor.position.y}px)) scale(${avatarEditor.zoom}) rotate(${avatarEditor.rotation}deg)`,
                    transformOrigin: 'center',
                  }}
                />
              )}
              <div className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-white/70" />
            </div>
            <p className="mt-2 text-center text-xs text-dark-500">{translateText('Drag image to reposition inside the circle')}</p>
          </div>

          <div className="space-y-4">
            <div>
              <div className="mb-1 flex items-center justify-between text-sm text-dark-600 dark:text-dark-300">
                <span>{translateText('Zoom')}</span>
                <span>{avatarEditor.zoom.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={avatarEditor.zoom}
                onChange={(event) => setAvatarEditor((prev) => ({ ...prev, zoom: Number(event.target.value) }))}
                className="w-full accent-primary-600"
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between text-sm text-dark-600 dark:text-dark-300">
                <span>{translateText('Rotation')}</span>
                <span>{avatarEditor.rotation}&deg;</span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                step="1"
                value={avatarEditor.rotation}
                onChange={(event) => setAvatarEditor((prev) => ({ ...prev, rotation: Number(event.target.value) }))}
                className="w-full accent-primary-600"
              />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (!isUploadingAvatar) {
                  closeAvatarEditor();
                }
              }}
              disabled={isUploadingAvatar}
            >
              {translateText('Cancel')}
            </Button>
            <Button
              type="button"
              variant="outline"
              leftIcon={<RotateCcw className="h-4 w-4" />}
              onClick={() => setAvatarEditor((prev) => ({ ...prev, position: { x: 0, y: 0 }, zoom: 1, rotation: 0 }))}
              disabled={isUploadingAvatar}
            >
              {translateText('Reset')}
            </Button>
            <Button
              type="button"
              onClick={handleAvatarUpload}
              isLoading={isUploadingAvatar}
            >
              {translateText('Done & Update')}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

// ==================== PREVIEW PAGE ====================

export function VerifyEmailPage() {
  const { translateText } = useLanguage();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. Please request a new verification email.');
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch(buildApiUrl('/auth/verify-email'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await response.json();

        if (response.ok) {
          setStatus('success');
          setMessage('Your email has been verified successfully!');
          setTimeout(() => navigate('/login'), 3000);
        } else {
          setStatus('error');
          setMessage(data.message || 'Verification failed. The link may have expired.');
        }
      } catch (error) {
        setStatus('error');
        setMessage('An error occurred. Please try again later.');
      }
    };

    verifyEmail();
  }, [token, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-50 dark:bg-dark-950 px-4">
      <Helmet>
        <title>{`${translateText('Verify Email')} - Bassac Post`}</title>
      </Helmet>
      <div className="w-full max-w-md">
        <div className="card p-8 text-center">
          {status === 'verifying' && (
            <>
              <div className="w-16 h-16 mx-auto mb-4 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
              <h1 className="text-2xl font-bold text-dark-900 dark:text-white mb-2">{translateText('Verifying Email')}</h1>
              <p className="text-dark-500">{translateText('Please wait while we verify your email address...')}</p>
            </>
          )}
          {status === 'success' && (
            <>
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-dark-900 dark:text-white mb-2">{translateText('Email Verified!')}</h1>
              <p className="text-dark-500 mb-4">{translateText(message)}</p>
              <p className="text-sm text-dark-400">{translateText('Redirecting to login...')}</p>
            </>
          )}
          {status === 'error' && (
            <>
              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-dark-900 dark:text-white mb-2">{translateText('Verification Failed')}</h1>
              <p className="text-dark-500 mb-6">{translateText(message)}</p>
              <Link to="/login" className="btn btn-primary">{translateText('Go to Login')}</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== Newsletter Confirm Page ====================
export function NewsletterConfirmPage() {
  const { translateText } = useLanguage();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid confirmation link. Please subscribe again.');
      return;
    }

    const confirm = async () => {
      try {
        await newsletterAPI.confirm(token);
        setStatus('success');
        setMessage('Your subscription has been confirmed!');
      } catch (error) {
        setStatus('error');
        setMessage(error.response?.data?.message || 'Confirmation failed. The link may have expired.');
      }
    };

    confirm();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-50 dark:bg-dark-950 px-4">
      <Helmet>
        <title>{`${translateText('Confirm Subscription')} - Bassac Post`}</title>
      </Helmet>
      <div className="w-full max-w-md">
        <div className="card p-8 text-center">
          {status === 'verifying' && (
            <>
              <div className="w-16 h-16 mx-auto mb-4 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
              <h1 className="text-2xl font-bold text-dark-900 dark:text-white mb-2">{translateText('Confirming Subscription')}</h1>
              <p className="text-dark-500">{translateText('Please wait while we confirm your subscription...')}</p>
            </>
          )}
          {status === 'success' && (
            <>
              <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h1 className="text-2xl font-bold text-dark-900 dark:text-white mb-2">{translateText('Subscribed!')}</h1>
              <p className="text-dark-500 mb-4">{translateText(message)}</p>
              <Link to="/" className="btn btn-primary">{translateText('Go Home')}</Link>
            </>
          )}
          {status === 'error' && (
            <>
              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-dark-900 dark:text-white mb-2">{translateText('Confirmation Failed')}</h1>
              <p className="text-dark-500 mb-6">{translateText(message)}</p>
              <Link to="/" className="btn btn-primary">{translateText('Go Home')}</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== Newsletter Unsubscribe Page ====================
export function NewsletterUnsubscribePage() {
  const { translateText } = useLanguage();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  useEffect(() => {
    if (!token && !email) {
      setStatus('error');
      setMessage('Invalid unsubscribe link.');
      return;
    }

    const unsubscribe = async () => {
      try {
        await newsletterAPI.unsubscribe({ token, email });
        setStatus('success');
        setMessage('You have been unsubscribed successfully.');
      } catch (error) {
        setStatus('error');
        setMessage(error.response?.data?.message || 'Unsubscribe failed. Please try again later.');
      }
    };

    unsubscribe();
  }, [token, email]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-50 dark:bg-dark-950 px-4">
      <Helmet>
        <title>{`${translateText('Unsubscribe')} - Bassac Post`}</title>
      </Helmet>
      <div className="w-full max-w-md">
        <div className="card p-8 text-center">
          {status === 'verifying' && (
            <>
              <div className="w-16 h-16 mx-auto mb-4 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
              <h1 className="text-2xl font-bold text-dark-900 dark:text-white mb-2">{translateText('Processing')}</h1>
              <p className="text-dark-500">{translateText('Please wait while we update your subscription...')}</p>
            </>
          )}
          {status === 'success' && (
            <>
              <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h1 className="text-2xl font-bold text-dark-900 dark:text-white mb-2">{translateText('Unsubscribed')}</h1>
              <p className="text-dark-500 mb-4">{translateText(message)}</p>
              <Link to="/" className="btn btn-primary">{translateText('Go Home')}</Link>
            </>
          )}
          {status === 'error' && (
            <>
              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-dark-900 dark:text-white mb-2">{translateText('Unsubscribe Failed')}</h1>
              <p className="text-dark-500 mb-6">{translateText(message)}</p>
              <Link to="/" className="btn btn-primary">{translateText('Go Home')}</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== Forgot Password Page ====================
export function ForgotPasswordPage() {
  const { translateText } = useLanguage();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus('idle');

    try {
      const response = await fetch(buildApiUrl('/auth/forgot-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage('If an account exists with this email, you will receive a password reset link.');
      } else {
        setStatus('error');
        setMessage(data.message || 'Something went wrong. Please try again.');
      }
    } catch (error) {
      setStatus('error');
      setMessage('An error occurred. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-50 dark:bg-dark-950 px-4">
      <Helmet>
        <title>{`${translateText('Forgot Password')} - Bassac Post`}</title>
      </Helmet>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <h1 className="text-2xl font-bold text-primary-600">Bassac Post</h1>
          </Link>
        </div>
        <div className="card p-8">
          <h2 className="text-2xl font-bold text-dark-900 dark:text-white mb-2">{translateText('Forgot Password')}</h2>
          <p className="text-dark-500 mb-6">{translateText("Enter your email and we'll send you a reset link.")}</p>

          {status === 'success' ? (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <Mail className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-dark-600 dark:text-dark-300 mb-6">{translateText(message)}</p>
              <Link to="/login" className="btn btn-primary">{translateText('Back to Login')}</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {status === 'error' && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 text-sm">
                  {translateText(message)}
                </div>
              )}
              <Input
                label={translateText('Email Address')}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? translateText('Sending...') : translateText('Send Reset Link')}
              </Button>
              <p className="text-center text-sm text-dark-500">
                {translateText('Remember your password?')}{' '}
                <Link to="/login" className="text-primary-600 hover:underline">
                  {translateText('Sign in')}
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== Reset Password Page ====================
export function ResetPasswordPage() {
  const { translateText } = useLanguage();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid reset link. Please request a new password reset.');
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setStatus('error');
      setMessage('Passwords do not match.');
      return;
    }

    if (formData.password.length < 8) {
      setStatus('error');
      setMessage('Password must be at least 8 characters.');
      return;
    }

    setIsSubmitting(true);
    setStatus('idle');

    try {
      const response = await fetch(buildApiUrl('/auth/reset-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: formData.password }),
      });
      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage('Your password has been reset successfully!');
        setTimeout(() => navigate('/login'), 3000);
      } else {
        setStatus('error');
        setMessage(data.message || 'Reset failed. The link may have expired.');
      }
    } catch (error) {
      setStatus('error');
      setMessage('An error occurred. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'error' && !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-50 dark:bg-dark-950 px-4">
        <Helmet>
          <title>{`${translateText('Reset Password')} - Bassac Post`}</title>
        </Helmet>
        <div className="w-full max-w-md">
          <div className="card p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-dark-900 dark:text-white mb-2">{translateText('Invalid Link')}</h1>
            <p className="text-dark-500 mb-6">{translateText(message)}</p>
            <Link to="/forgot-password" className="btn btn-primary">{translateText('Request New Link')}</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-50 dark:bg-dark-950 px-4">
      <Helmet>
        <title>{`${translateText('Reset Password')} - Bassac Post`}</title>
      </Helmet>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <h1 className="text-2xl font-bold text-primary-600">Bassac Post</h1>
          </Link>
        </div>
        <div className="card p-8">
          {status === 'success' ? (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-dark-900 dark:text-white mb-2">{translateText('Password Reset!')}</h2>
              <p className="text-dark-500 mb-4">{translateText(message)}</p>
              <p className="text-sm text-dark-400">{translateText('Redirecting to login...')}</p>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-dark-900 dark:text-white mb-2">{translateText('Reset Password')}</h2>
              <p className="text-dark-500 mb-6">{translateText('Enter your new password below.')}</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {status === 'error' && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 text-sm">
                    {translateText(message)}
                  </div>
                )}
                <div className="relative">
                  <Input
                    label={translateText('New Password')}
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-9 text-dark-400 hover:text-dark-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                  </button>
                </div>
                <Input
                  label={translateText('Confirm Password')}
                  type={showPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="••••••••"
                  required
                />
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? translateText('Resetting...') : translateText('Reset Password')}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
