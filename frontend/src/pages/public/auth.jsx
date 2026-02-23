import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Eye, Eye as EyeIcon, EyeOff, Mail, Send, Camera, CheckCircle } from 'lucide-react';
import { useLogin, useRegister, useUpdateProfile } from '../../hooks/useApi';
import { usersAPI, newsletterAPI } from '../../services/api';
import { Button, Avatar, Input, Textarea } from '../../components/common/index.jsx';
import { BetweenSectionsSlot } from '../../components/ads/BetweenSectionsSlot.jsx';
import { buildApiUrl, buildMediaUrl } from '../../utils';
import { useAuthStore } from '../../stores/authStore';

export function LoginPage() {
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

    login({ email, password }, { onSuccess: () => navigate(from, { replace: true }) });
  };

  return (
    <>
      <Helmet><title>Sign In - Bassac Post</title></Helmet>
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-2 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center">
              <span className="text-white font-display font-bold text-2xl">B</span>
            </div>
            <span className="font-display font-bold text-2xl text-dark-900 dark:text-white">Bassac Post</span>
          </Link>

          <div className="card p-8">
            <h1 className="text-2xl font-bold text-dark-900 dark:text-white text-center mb-6">Sign In</h1>

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
                  <span className="text-sm text-dark-600 dark:text-dark-400">Remember me</span>
                </label>
                <Link to="/forgot-password" className="text-sm link-primary">Forgot password?</Link>
              </div>

              <Button type="submit" className="w-full" size="lg" isLoading={isPending}>Sign In</Button>
            </form>

            <p className="mt-6 text-center text-dark-500">
              Don't have an account? <Link to="/register" className="font-medium link-primary">Sign up</Link>
            </p>

            <div className="mt-6 p-4 bg-dark-100 dark:bg-dark-800 rounded-xl">
              <p className="text-sm font-medium text-dark-600 dark:text-dark-400 mb-2">Demo Accounts:</p>
              <div className="text-xs text-dark-500 space-y-1">
                <p>Admin: admin@bassacmedia.com / Admin@123</p>
                <p>Editor: editor@bassacmedia.com / Editor@123</p>
                <p>Writer: writer@bassacmedia.com / Writer@123</p>
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

export function RegisterPage() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const navigate = useNavigate();
  const { mutate: register, isPending } = useRegister();

  const passwordStrength = getPasswordStrength(form.password);

  const handleChange = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
    if (errors[field]) setErrors({ ...errors, [field]: '' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!form.firstName) newErrors.firstName = 'Required';
    if (!form.lastName) newErrors.lastName = 'Required';
    if (!form.email) newErrors.email = 'Required';
    if (!form.password) newErrors.password = 'Required';
    else if (form.password.length < 8) newErrors.password = 'Min 8 characters';
    if (form.password !== form.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    register({ firstName: form.firstName, lastName: form.lastName, email: form.email, password: form.password }, { onSuccess: () => navigate('/dashboard') });
  };

  return (
    <>
      <Helmet><title>Create Account - Bassac Post</title></Helmet>
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-2 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center">
              <span className="text-white font-display font-bold text-2xl">B</span>
            </div>
            <span className="font-display font-bold text-2xl text-dark-900 dark:text-white">Bassac Post</span>
          </Link>

          <div className="card p-8">
            <h1 className="text-2xl font-bold text-dark-900 dark:text-white text-center mb-6">Create Account</h1>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="First Name" placeholder="John" value={form.firstName} onChange={handleChange('firstName')} error={errors.firstName} required />
                <Input label="Last Name" placeholder="Doe" value={form.lastName} onChange={handleChange('lastName')} error={errors.lastName} required />
              </div>
              <Input label="Email" type="email" placeholder="you@example.com" value={form.email} onChange={handleChange('email')} error={errors.email} required />
              <div>
                <div className="relative">
                  <Input label="Password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={form.password} onChange={handleChange('password')} error={errors.password} required />
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
                      Password strength: {passwordStrength.label}
                    </p>
                  </div>
                )}
              </div>
              <Input label="Confirm Password" type="password" placeholder="••••••••" value={form.confirmPassword} onChange={handleChange('confirmPassword')} error={errors.confirmPassword} required />
              <Button type="submit" className="w-full" size="lg" isLoading={isPending}>Create Account</Button>
            </form>

            <p className="mt-6 text-center text-dark-500">
              Already have an account? <Link to="/login" className="font-medium link-primary">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

// ==================== CONTACT PAGE ====================

export function AccountPage() {
  const { user, setUser } = useAuthStore();
  const { mutate: updateProfile, isPending } = useUpdateProfile();
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    bio: user?.bio || '',
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;

    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', avatarFile);
      const response = await usersAPI.uploadAvatar(formData);
      const avatar = response?.data?.data?.avatar;
      if (avatar) {
        setUser({ ...user, avatar });
        setAvatarFile(null);
        setAvatarPreview(null);
        toast.success('Profile picture updated!');
      } else {
        toast.error('Upload failed');
      }
    } catch (error) {
      toast.error('Upload failed');
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
      <Helmet><title>Account - Bassac Post</title></Helmet>
      <div className="container-custom py-10">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-dark-900 dark:text-white mb-6">Account</h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="card p-6 text-center">
              <div className="relative inline-block mb-4">
                <Avatar
                  src={buildMediaUrl(avatarPreview || user?.avatar)}
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

              {avatarFile && (
                <div className="mb-4 space-y-2">
                  <p className="text-sm text-dark-500 truncate">{avatarFile.name}</p>
                  <div className="flex gap-2 justify-center">
                    <Button
                      size="sm"
                      onClick={handleAvatarUpload}
                      isLoading={isUploadingAvatar}
                    >
                      Upload
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setAvatarFile(null);
                        setAvatarPreview(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              <h2 className="text-2xl font-semibold text-dark-900 dark:text-white">{user?.fullName}</h2>
              <p className="text-dark-500">{user?.email}</p>
              <p className="text-sm text-primary-600 capitalize mt-1">{user?.role}</p>
            </div>
            <div className="card p-6">
              <h2 className="font-semibold text-dark-900 dark:text-white mb-4">Edit Profile</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="First Name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                  <Input label="Last Name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                </div>
                <Textarea label="Bio" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Tell us about yourself..." />
                <Button type="submit" isLoading={isPending}>Save Changes</Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ==================== PREVIEW PAGE ====================

export function VerifyEmailPage() {
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
        <title>Verify Email - Bassac Post</title>
      </Helmet>
      <div className="w-full max-w-md">
        <div className="card p-8 text-center">
          {status === 'verifying' && (
            <>
              <div className="w-16 h-16 mx-auto mb-4 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
              <h1 className="text-2xl font-bold text-dark-900 dark:text-white mb-2">Verifying Email</h1>
              <p className="text-dark-500">Please wait while we verify your email address...</p>
            </>
          )}
          {status === 'success' && (
            <>
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-dark-900 dark:text-white mb-2">Email Verified!</h1>
              <p className="text-dark-500 mb-4">{message}</p>
              <p className="text-sm text-dark-400">Redirecting to login...</p>
            </>
          )}
          {status === 'error' && (
            <>
              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-dark-900 dark:text-white mb-2">Verification Failed</h1>
              <p className="text-dark-500 mb-6">{message}</p>
              <Link to="/login" className="btn btn-primary">Go to Login</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== Newsletter Confirm Page ====================
export function NewsletterConfirmPage() {
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
        <title>Confirm Subscription - Bassac Post</title>
      </Helmet>
      <div className="w-full max-w-md">
        <div className="card p-8 text-center">
          {status === 'verifying' && (
            <>
              <div className="w-16 h-16 mx-auto mb-4 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
              <h1 className="text-2xl font-bold text-dark-900 dark:text-white mb-2">Confirming Subscription</h1>
              <p className="text-dark-500">Please wait while we confirm your subscription...</p>
            </>
          )}
          {status === 'success' && (
            <>
              <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h1 className="text-2xl font-bold text-dark-900 dark:text-white mb-2">Subscribed!</h1>
              <p className="text-dark-500 mb-4">{message}</p>
              <Link to="/" className="btn btn-primary">Go Home</Link>
            </>
          )}
          {status === 'error' && (
            <>
              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-dark-900 dark:text-white mb-2">Confirmation Failed</h1>
              <p className="text-dark-500 mb-6">{message}</p>
              <Link to="/" className="btn btn-primary">Go Home</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== Newsletter Unsubscribe Page ====================
export function NewsletterUnsubscribePage() {
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
        <title>Unsubscribe - Bassac Post</title>
      </Helmet>
      <div className="w-full max-w-md">
        <div className="card p-8 text-center">
          {status === 'verifying' && (
            <>
              <div className="w-16 h-16 mx-auto mb-4 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
              <h1 className="text-2xl font-bold text-dark-900 dark:text-white mb-2">Processing</h1>
              <p className="text-dark-500">Please wait while we update your subscription...</p>
            </>
          )}
          {status === 'success' && (
            <>
              <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h1 className="text-2xl font-bold text-dark-900 dark:text-white mb-2">Unsubscribed</h1>
              <p className="text-dark-500 mb-4">{message}</p>
              <Link to="/" className="btn btn-primary">Go Home</Link>
            </>
          )}
          {status === 'error' && (
            <>
              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-dark-900 dark:text-white mb-2">Unsubscribe Failed</h1>
              <p className="text-dark-500 mb-6">{message}</p>
              <Link to="/" className="btn btn-primary">Go Home</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== Forgot Password Page ====================
export function ForgotPasswordPage() {
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
        <title>Forgot Password - Bassac Post</title>
      </Helmet>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <h1 className="text-2xl font-bold text-primary-600">Bassac Post</h1>
          </Link>
        </div>
        <div className="card p-8">
          <h2 className="text-2xl font-bold text-dark-900 dark:text-white mb-2">Forgot Password</h2>
          <p className="text-dark-500 mb-6">Enter your email and we'll send you a reset link.</p>

          {status === 'success' ? (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <Mail className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-dark-600 dark:text-dark-300 mb-6">{message}</p>
              <Link to="/login" className="btn btn-primary">Back to Login</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {status === 'error' && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 text-sm">
                  {message}
                </div>
              )}
              <Input
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Sending...' : 'Send Reset Link'}
              </Button>
              <p className="text-center text-sm text-dark-500">
                Remember your password?{' '}
                <Link to="/login" className="text-primary-600 hover:underline">
                  Sign in
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
          <title>Reset Password - Bassac Post</title>
        </Helmet>
        <div className="w-full max-w-md">
          <div className="card p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-dark-900 dark:text-white mb-2">Invalid Link</h1>
            <p className="text-dark-500 mb-6">{message}</p>
            <Link to="/forgot-password" className="btn btn-primary">Request New Link</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-50 dark:bg-dark-950 px-4">
      <Helmet>
        <title>Reset Password - Bassac Post</title>
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
              <h2 className="text-2xl font-bold text-dark-900 dark:text-white mb-2">Password Reset!</h2>
              <p className="text-dark-500 mb-4">{message}</p>
              <p className="text-sm text-dark-400">Redirecting to login...</p>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-dark-900 dark:text-white mb-2">Reset Password</h2>
              <p className="text-dark-500 mb-6">Enter your new password below.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {status === 'error' && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 text-sm">
                    {message}
                  </div>
                )}
                <div className="relative">
                  <Input
                    label="New Password"
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
                  label="Confirm Password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="••••••••"
                  required
                />
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Resetting...' : 'Reset Password'}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
