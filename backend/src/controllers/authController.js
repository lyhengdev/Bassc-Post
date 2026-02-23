import { User } from '../models/index.js';
import { generateTokens, verifyRefreshToken, generateEmailVerificationToken, generatePasswordResetToken } from '../utils/jwt.js';
import { getDefaultAvatarByGender, isAvatarMissing } from '../utils/userProfile.js';
import emailService from '../services/emailService.js';
import { recordFailedAttempt, clearFailedAttempts } from '../middleware/loginLimiter.js';
import logger from '../services/loggerService.js';
import config from '../config/index.js';
import crypto from 'crypto';
import {
  successResponse,
  createdResponse,
  badRequestResponse,
  unauthorizedResponse,
  conflictResponse,
} from '../utils/apiResponse.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const resolveAvatar = (user) => {
  if (!user || isAvatarMissing(user.avatar)) {
    return getDefaultAvatarByGender(user?.gender);
  }
  return user.avatar;
};

const SOCIAL_SESSION_TTL_MS = 5 * 60 * 1000;
const SOCIAL_STATE_MAX_AGE_MS = 10 * 60 * 1000;
const socialSessions = new Map();

const SOCIAL_STATE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.env === 'production',
  sameSite: 'lax',
  maxAge: SOCIAL_STATE_MAX_AGE_MS,
  path: '/api/auth/social',
};

const GOOGLE_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/user.gender.read',
  'https://www.googleapis.com/auth/user.birthday.read',
];

const SOCIAL_PROVIDERS = ['google', 'facebook'];

const cleanupSocialSessions = () => {
  const now = Date.now();
  for (const [code, value] of socialSessions.entries()) {
    if (!value || value.expiresAt <= now) {
      socialSessions.delete(code);
    }
  }
};

const socialCleanupTimer = setInterval(cleanupSocialSessions, 60 * 1000);
if (typeof socialCleanupTimer.unref === 'function') {
  socialCleanupTimer.unref();
}

const getSocialCallbackRedirectUrl = () => {
  const configured = (process.env.SOCIAL_AUTH_CALLBACK_URL || '').trim();
  if (configured) return configured;
  const base = (config.frontendUrl || 'http://localhost:5173').replace(/\/$/, '');
  return `${base}/auth/social/callback`;
};

const buildSocialCallbackUrl = ({ code, error, message }) => {
  const fallbackUrl = getSocialCallbackRedirectUrl();
  let redirectUrl;
  try {
    redirectUrl = new URL(fallbackUrl);
  } catch {
    redirectUrl = new URL('/auth/social/callback', config.frontendUrl || 'http://localhost:5173');
  }

  if (code) redirectUrl.searchParams.set('code', code);
  if (error) redirectUrl.searchParams.set('error', error);
  if (message) redirectUrl.searchParams.set('message', message);

  return redirectUrl.toString();
};

const createSocialSession = (payload) => {
  cleanupSocialSessions();
  const code = crypto.randomUUID();
  socialSessions.set(code, {
    payload,
    expiresAt: Date.now() + SOCIAL_SESSION_TTL_MS,
  });
  return code;
};

const consumeSocialSession = (code) => {
  if (!code) return null;
  const entry = socialSessions.get(code);
  socialSessions.delete(code);
  if (!entry || entry.expiresAt <= Date.now()) {
    return null;
  }
  return entry.payload;
};

const getStateCookieName = (provider) => `oauth_state_${provider}`;

const normalizeProvider = (provider) => {
  if (typeof provider !== 'string') return '';
  return provider.trim().toLowerCase();
};

const toIsoDate = (year, month, day) => {
  if (!year || !month || !day) return null;
  const isoDate = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const testDate = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(testDate.getTime())) {
    return null;
  }
  return isoDate;
};

const normalizeSocialGender = (value) => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'male' || normalized === 'female') return normalized;
  return null;
};

const parseFacebookBirthday = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return toIsoDate(trimmed.slice(0, 4), trimmed.slice(5, 7), trimmed.slice(8, 10));
  }

  const [month = '', day = '', year = ''] = trimmed.split('/');
  if (!year) return null;
  return toIsoDate(year, month, day);
};

const parseGoogleBirthday = (birthdays) => {
  if (!Array.isArray(birthdays) || birthdays.length === 0) {
    return null;
  }

  const selectedBirthday = birthdays.find((entry) => entry?.metadata?.primary) || birthdays[0];
  const date = selectedBirthday?.date;
  if (!date) return null;

  if (!date.year) {
    // Ignore partial birthdays because DB requires a full date.
    return null;
  }

  return toIsoDate(date.year, date.month, date.day);
};

const parseJsonResponse = async (response) => {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
};

const getGoogleConfig = () => {
  const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();
  const redirectUri = (process.env.GOOGLE_REDIRECT_URI || `${config.apiBaseUrl.replace(/\/$/, '')}/api/auth/social/google/callback`).trim();

  if (!clientId || !clientSecret || !redirectUri) return null;
  return { clientId, clientSecret, redirectUri };
};

const getFacebookConfig = () => {
  const appId = (process.env.FACEBOOK_APP_ID || '').trim();
  const appSecret = (process.env.FACEBOOK_APP_SECRET || '').trim();
  const redirectUri = (process.env.FACEBOOK_REDIRECT_URI || `${config.apiBaseUrl.replace(/\/$/, '')}/api/auth/social/facebook/callback`).trim();

  if (!appId || !appSecret || !redirectUri) return null;
  return { appId, appSecret, redirectUri };
};

const getOAuthConfig = (provider) => {
  if (provider === 'google') return getGoogleConfig();
  if (provider === 'facebook') return getFacebookConfig();
  return null;
};

const toAuthUser = (user) => ({
  id: user._id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  fullName: user.fullName,
  gender: user.gender,
  birthday: user.birthday,
  role: user.role,
  avatar: resolveAvatar(user),
  bio: user.bio,
  isEmailVerified: user.isEmailVerified,
  profileCompletionRequired: Boolean(user.profileNeedsCompletion),
  profileMissingFields: Array.isArray(user.profileMissingFields) ? user.profileMissingFields : [],
  createdAt: user.createdAt,
});

const createSocialPassword = () => {
  // Random generated password is only a placeholder for social accounts.
  return `${crypto.randomBytes(24).toString('hex')}Aa1!`;
};

const getSocialProfileMissingFields = ({ gender, birthday }) => {
  const missing = [];
  if (!gender) missing.push('gender');
  if (!birthday) missing.push('birthday');
  return missing;
};

const resolveProviderField = (provider) => {
  if (provider === 'google') return 'googleId';
  if (provider === 'facebook') return 'facebookId';
  return null;
};

const getSafeSocialAuthMessage = (error) => {
  const rawMessage = typeof error?.message === 'string' ? error.message : '';
  if (!rawMessage) return 'Could not sign in with this provider. Please try again.';

  if (rawMessage.includes('deactivated')) return rawMessage;
  if (rawMessage.includes('email')) return rawMessage;
  return 'Could not sign in with this provider. Please try again.';
};

const buildFirstAndLastName = (profile) => {
  const firstName = (profile.firstName || '').trim();
  const lastName = (profile.lastName || '').trim();

  if (firstName && lastName) {
    return { firstName, lastName };
  }

  const fullName = (profile.name || '').trim();
  if (!fullName) {
    return {
      firstName: firstName || 'Social',
      lastName: lastName || 'User',
    };
  }

  const parts = fullName.split(/\s+/).filter(Boolean);
  return {
    firstName: firstName || parts[0] || 'Social',
    lastName: lastName || parts.slice(1).join(' ') || 'User',
  };
};

const normalizeEmail = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
};

const exchangeGoogleCodeForProfile = async (code) => {
  const googleConfig = getGoogleConfig();
  if (!googleConfig) {
    throw new Error('Google login is not configured');
  }

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: googleConfig.clientId,
      client_secret: googleConfig.clientSecret,
      redirect_uri: googleConfig.redirectUri,
      grant_type: 'authorization_code',
    }).toString(),
  });

  const tokenPayload = await parseJsonResponse(tokenResponse);
  if (!tokenResponse.ok) {
    const reason = tokenPayload?.error_description || tokenPayload?.error || 'Google token exchange failed';
    throw new Error(reason);
  }

  const accessToken = tokenPayload?.access_token;
  if (!accessToken) {
    throw new Error('Google did not return an access token');
  }

  const userInfoResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const userInfo = await parseJsonResponse(userInfoResponse);
  if (!userInfoResponse.ok) {
    throw new Error('Google user profile lookup failed');
  }

  const email = normalizeEmail(userInfo?.email);
  if (!email) {
    throw new Error('Google account did not return an email');
  }
  if (userInfo?.email_verified === false) {
    throw new Error('Google account email is not verified');
  }

  const peopleResponse = await fetch('https://people.googleapis.com/v1/people/me?personFields=birthdays,genders', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const peopleData = peopleResponse.ok ? await parseJsonResponse(peopleResponse) : {};

  const genderRaw = Array.isArray(peopleData?.genders)
    ? (peopleData.genders.find((entry) => entry?.metadata?.primary)?.value || peopleData.genders[0]?.value)
    : null;
  const gender = normalizeSocialGender(genderRaw);
  const birthday = parseGoogleBirthday(peopleData?.birthdays);

  return {
    provider: 'google',
    providerId: userInfo?.sub || '',
    email,
    firstName: userInfo?.given_name || '',
    lastName: userInfo?.family_name || '',
    name: userInfo?.name || '',
    avatar: userInfo?.picture || '',
    gender,
    birthday,
  };
};

const exchangeFacebookCodeForProfile = async (code) => {
  const facebookConfig = getFacebookConfig();
  if (!facebookConfig) {
    throw new Error('Facebook login is not configured');
  }

  const tokenQuery = new URLSearchParams({
    client_id: facebookConfig.appId,
    client_secret: facebookConfig.appSecret,
    redirect_uri: facebookConfig.redirectUri,
    code,
  }).toString();
  const tokenResponse = await fetch(`https://graph.facebook.com/v20.0/oauth/access_token?${tokenQuery}`);

  const tokenPayload = await parseJsonResponse(tokenResponse);
  if (!tokenResponse.ok) {
    const reason = tokenPayload?.error?.message || 'Facebook token exchange failed';
    throw new Error(reason);
  }

  const accessToken = tokenPayload?.access_token;
  if (!accessToken) {
    throw new Error('Facebook did not return an access token');
  }

  const profileQuery = new URLSearchParams({
    fields: 'id,first_name,last_name,name,email,birthday,gender,picture.type(large)',
    access_token: accessToken,
  }).toString();
  const profileResponse = await fetch(`https://graph.facebook.com/me?${profileQuery}`);

  const profilePayload = await parseJsonResponse(profileResponse);
  if (!profileResponse.ok) {
    const reason = profilePayload?.error?.message || 'Facebook profile lookup failed';
    throw new Error(reason);
  }

  const email = normalizeEmail(profilePayload?.email);
  if (!email) {
    throw new Error('Facebook did not return an email. Please use Google or email signup.');
  }

  return {
    provider: 'facebook',
    providerId: profilePayload?.id || '',
    email,
    firstName: profilePayload?.first_name || '',
    lastName: profilePayload?.last_name || '',
    name: profilePayload?.name || '',
    avatar: profilePayload?.picture?.data?.url || '',
    gender: normalizeSocialGender(profilePayload?.gender),
    birthday: parseFacebookBirthday(profilePayload?.birthday),
  };
};

const upsertSocialUser = async ({ provider, profile, requestId }) => {
  const providerField = resolveProviderField(provider);

  let user = null;
  if (providerField && profile.providerId) {
    user = await User.findOne({ [providerField]: profile.providerId });
  }
  if (!user && profile.email) {
    user = await User.findOne({ email: profile.email });
  }

  const missingFields = getSocialProfileMissingFields(profile);

  if (!user) {
    const { firstName, lastName } = buildFirstAndLastName(profile);
    user = await User.create({
      email: profile.email,
      password: createSocialPassword(),
      firstName,
      lastName,
      role: 'user',
      isEmailVerified: true,
      avatar: profile.avatar || undefined,
      gender: profile.gender || 'male',
      birthday: profile.birthday || null,
      [providerField]: profile.providerId || undefined,
      profileNeedsCompletion: missingFields.length > 0,
      profileMissingFields: missingFields,
    });

    logger.info('New social user registered', {
      userId: user._id,
      email: user.email,
      provider,
      requestId,
    });

    return user;
  }

  if (user.status !== 'active') {
    throw new Error('Your account has been deactivated. Please contact support.');
  }

  const nextMissing = new Set(Array.isArray(user.profileMissingFields) ? user.profileMissingFields : []);
  let shouldSave = false;

  if (providerField && profile.providerId && !user[providerField]) {
    user[providerField] = profile.providerId;
    shouldSave = true;
  }

  if (!user.isEmailVerified) {
    user.isEmailVerified = true;
    shouldSave = true;
  }

  if (profile.gender) {
    if (!user.gender || nextMissing.has('gender')) {
      user.gender = profile.gender;
      shouldSave = true;
    }
    if (nextMissing.delete('gender')) {
      shouldSave = true;
    }
  }

  if (profile.birthday) {
    if (!user.birthday || nextMissing.has('birthday')) {
      user.birthday = profile.birthday;
      shouldSave = true;
    }
    if (nextMissing.delete('birthday')) {
      shouldSave = true;
    }
  }

  if (profile.avatar && isAvatarMissing(user.avatar)) {
    user.avatar = profile.avatar;
    shouldSave = true;
  }

  const nextMissingFields = Array.from(nextMissing);
  if (JSON.stringify(nextMissingFields) !== JSON.stringify(user.profileMissingFields || [])) {
    user.profileMissingFields = nextMissingFields;
    shouldSave = true;
  }

  const needsCompletion = nextMissingFields.length > 0;
  if (Boolean(user.profileNeedsCompletion) !== needsCompletion) {
    user.profileNeedsCompletion = needsCompletion;
    shouldSave = true;
  }

  if (shouldSave) {
    await user.save();
  }

  return user;
};

/**
 * Register new user
 * POST /api/auth/register
 */
export const register = asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName, gender, birthday } = req.body;

  // Check if user exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return conflictResponse(res, 'Email already registered');
  }

  // Create user
  const user = await User.create({
    email,
    password,
    firstName,
    lastName,
    gender,
    birthday,
    role: 'user',
    profileNeedsCompletion: false,
    profileMissingFields: [],
  });

  // Generate email verification token
  const verificationToken = generateEmailVerificationToken();
  user.emailVerificationToken = verificationToken;
  user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  await user.save();

  // Send verification email
  try {
    await emailService.sendVerificationEmail(user, verificationToken);
  } catch (error) {
    logger.error('Failed to send verification email', { 
      error, 
      userId: user._id,
      requestId: req.requestId 
    });
  }

  // Generate tokens
  const tokens = generateTokens(user);

  // Save refresh token
  user.refreshToken = tokens.refreshToken;
  await user.save();

  logger.info('New user registered', { 
    userId: user._id, 
    email: user.email,
    requestId: req.requestId 
  });

  return createdResponse(res, {
    user: toAuthUser(user),
    ...tokens,
  }, 'Registration successful. Please verify your email.');
});

/**
 * Check email availability
 * GET /api/auth/check-email?email=
 */
export const checkEmailAvailability = asyncHandler(async (req, res) => {
  const email = req.query.email;
  const exists = await User.exists({ email });
  const available = !Boolean(exists);

  return successResponse(
    res,
    { email, available },
    available ? 'Email is available' : 'Email already registered'
  );
});

const buildGoogleAuthUrl = (state) => {
  const googleConfig = getGoogleConfig();
  if (!googleConfig) return null;

  const params = new URLSearchParams({
    client_id: googleConfig.clientId,
    redirect_uri: googleConfig.redirectUri,
    response_type: 'code',
    scope: GOOGLE_SCOPES.join(' '),
    state,
    access_type: 'offline',
    include_granted_scopes: 'true',
    prompt: 'consent',
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};

const buildFacebookAuthUrl = (state) => {
  const facebookConfig = getFacebookConfig();
  if (!facebookConfig) return null;

  const params = new URLSearchParams({
    client_id: facebookConfig.appId,
    redirect_uri: facebookConfig.redirectUri,
    response_type: 'code',
    state,
    scope: 'email,public_profile,user_birthday',
  });

  return `https://www.facebook.com/v20.0/dialog/oauth?${params.toString()}`;
};

const buildProviderAuthUrl = (provider, state) => {
  if (provider === 'google') return buildGoogleAuthUrl(state);
  if (provider === 'facebook') return buildFacebookAuthUrl(state);
  return null;
};

export const startSocialAuth = asyncHandler(async (req, res) => {
  const provider = normalizeProvider(req.params.provider);

  if (!SOCIAL_PROVIDERS.includes(provider)) {
    return badRequestResponse(res, 'Unsupported social provider');
  }

  const providerConfig = getOAuthConfig(provider);
  if (!providerConfig) {
    return badRequestResponse(res, `${provider} login is not configured on this server`);
  }

  const state = crypto.randomBytes(24).toString('hex');
  res.cookie(getStateCookieName(provider), state, SOCIAL_STATE_COOKIE_OPTIONS);

  const authUrl = buildProviderAuthUrl(provider, state);
  if (!authUrl) {
    return badRequestResponse(res, `${provider} login is not configured on this server`);
  }

  return res.redirect(authUrl);
});

export const socialAuthCallback = asyncHandler(async (req, res) => {
  const provider = normalizeProvider(req.params.provider);
  const stateCookieName = getStateCookieName(provider);
  const storedState = req.cookies?.[stateCookieName];
  res.clearCookie(stateCookieName, SOCIAL_STATE_COOKIE_OPTIONS);

  const providerError = typeof req.query.error === 'string' ? req.query.error : '';
  const providerErrorDescription = typeof req.query.error_description === 'string' ? req.query.error_description : '';
  const code = typeof req.query.code === 'string' ? req.query.code : '';
  const state = typeof req.query.state === 'string' ? req.query.state : '';

  if (!SOCIAL_PROVIDERS.includes(provider)) {
    return res.redirect(buildSocialCallbackUrl({
      error: 'unsupported_provider',
      message: 'Unsupported social provider',
    }));
  }

  if (providerError) {
    return res.redirect(buildSocialCallbackUrl({
      error: providerError,
      message: providerErrorDescription || 'Social login was canceled.',
    }));
  }

  if (!code) {
    return res.redirect(buildSocialCallbackUrl({
      error: 'missing_code',
      message: 'Missing authorization code from provider.',
    }));
  }

  if (!state || !storedState || state !== storedState) {
    return res.redirect(buildSocialCallbackUrl({
      error: 'invalid_state',
      message: 'Invalid social login state. Please try again.',
    }));
  }

  try {
    const profile = provider === 'google'
      ? await exchangeGoogleCodeForProfile(code)
      : await exchangeFacebookCodeForProfile(code);

    const user = await upsertSocialUser({ provider, profile, requestId: req.requestId });
    if (user.status !== 'active') {
      throw new Error('Your account has been deactivated. Please contact support.');
    }

    user.lastLogin = new Date();
    const tokens = generateTokens(user);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    const sessionCode = createSocialSession({
      user: toAuthUser(user),
      ...tokens,
    });

    return res.redirect(buildSocialCallbackUrl({ code: sessionCode }));
  } catch (error) {
    logger.error('Social auth callback failed', {
      provider,
      error: error.message,
      requestId: req.requestId,
    });

    return res.redirect(buildSocialCallbackUrl({
      error: 'social_auth_failed',
      message: getSafeSocialAuthMessage(error),
    }));
  }
});

export const socialExchange = asyncHandler(async (req, res) => {
  const { code } = req.body;
  const payload = consumeSocialSession(code);

  if (!payload) {
    return unauthorizedResponse(res, 'Social login session expired. Please try again.');
  }

  return successResponse(res, payload, 'Social login successful');
});

/**
 * Login user
 * POST /api/auth/login
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const clientIp = req.ip;

  // Find user with password
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    // Record failed attempt even for non-existent users (prevent user enumeration)
    recordFailedAttempt(email, clientIp);
    return unauthorizedResponse(res, 'Invalid email or password');
  }

  // Check password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    // Record failed attempt
    const result = recordFailedAttempt(email, clientIp);
    
    if (result.locked) {
      return res.status(423).json({
        success: false,
        message: `Too many failed attempts. Account locked for ${Math.ceil(result.remainingSeconds / 60)} minutes.`,
        retryAfter: result.remainingSeconds,
      });
    }
    
    return unauthorizedResponse(res, `Invalid email or password. ${result.attemptsRemaining} attempts remaining.`);
  }

  // Check if user is active
  if (user.status !== 'active') {
    logger.logSecurity('Login attempt on inactive account', { 
      email, 
      userId: user._id,
      requestId: req.requestId 
    });
    return unauthorizedResponse(res, 'Your account has been deactivated. Please contact support.');
  }

  // Clear failed attempts on successful login
  clearFailedAttempts(email, clientIp);

  // Update last login
  user.lastLogin = new Date();

  // Generate tokens
  const tokens = generateTokens(user);
  user.refreshToken = tokens.refreshToken;
  await user.save();

  logger.info('User logged in', { 
    userId: user._id, 
    email: user.email,
    requestId: req.requestId 
  });

  return successResponse(res, {
    user: toAuthUser(user),
    ...tokens,
  }, 'Login successful');
});

/**
 * Get current user
 * GET /api/auth/me
 */
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  return successResponse(res, {
    user: toAuthUser(user),
  });
});

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
export const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;

  if (!token) {
    return badRequestResponse(res, 'Refresh token is required');
  }

  try {
    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.id).select('+refreshToken');

    if (!user || user.refreshToken !== token) {
      return unauthorizedResponse(res, 'Invalid refresh token');
    }

    // Generate new tokens
    const tokens = generateTokens(user);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    return successResponse(res, tokens, 'Token refreshed');
  } catch (error) {
    return unauthorizedResponse(res, 'Invalid or expired refresh token');
  }
});

/**
 * Logout
 * POST /api/auth/logout
 */
export const logout = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  user.refreshToken = null;
  await user.save();

  return successResponse(res, null, 'Logged out successfully');
});

/**
 * Verify email
 * POST /api/auth/verify-email
 */
export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;

  const user = await User.findOne({
    emailVerificationToken: token,
    emailVerificationExpires: { $gt: new Date() },
  }).select('+emailVerificationToken +emailVerificationExpires');

  if (!user) {
    return badRequestResponse(res, 'Invalid or expired verification token');
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  return successResponse(res, null, 'Email verified successfully');
});

/**
 * Resend verification email
 * POST /api/auth/resend-verification
 */
export const resendVerification = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user.isEmailVerified) {
    return badRequestResponse(res, 'Email is already verified');
  }

  const verificationToken = generateEmailVerificationToken();
  user.emailVerificationToken = verificationToken;
  user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await user.save();

  await emailService.sendVerificationEmail(user, verificationToken);

  return successResponse(res, null, 'Verification email sent');
});

/**
 * Forgot password
 * POST /api/auth/forgot-password
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  // Don't reveal if email exists
  if (!user) {
    return successResponse(res, null, 'If the email exists, a reset link has been sent');
  }

  const resetToken = generatePasswordResetToken();
  user.passwordResetToken = resetToken;
  user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await user.save();

  try {
    await emailService.sendPasswordResetEmail(user, resetToken);
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    throw error;
  }

  return successResponse(res, null, 'If the email exists, a reset link has been sent');
});

/**
 * Reset password
 * POST /api/auth/reset-password
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  const user = await User.findOne({
    passwordResetToken: token,
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetToken +passwordResetExpires');

  if (!user) {
    return badRequestResponse(res, 'Invalid or expired reset token');
  }

  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.refreshToken = null; // Invalidate all sessions
  await user.save();

  return successResponse(res, null, 'Password reset successful. Please login with your new password.');
});

/**
 * Change password (authenticated)
 * POST /api/auth/change-password
 */
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return badRequestResponse(res, 'Current password is incorrect');
  }

  user.password = newPassword;
  await user.save();

  return successResponse(res, null, 'Password changed successfully');
});

export default {
  register,
  checkEmailAvailability,
  startSocialAuth,
  socialAuthCallback,
  socialExchange,
  login,
  getMe,
  refreshToken,
  logout,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  changePassword,
};
