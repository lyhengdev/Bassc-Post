export const DEFAULT_MALE_AVATAR = '/uploads/avatars/default_male.png';
export const DEFAULT_FEMALE_AVATAR = '/uploads/avatars/default_female.png';
export const DEFAULT_AVATAR_PATHS = [DEFAULT_MALE_AVATAR, DEFAULT_FEMALE_AVATAR];

export const normalizeGender = (gender) => {
  if (typeof gender !== 'string') return 'male';
  return gender.trim().toLowerCase() === 'female' ? 'female' : 'male';
};

export const getDefaultAvatarByGender = (gender) => {
  return normalizeGender(gender) === 'female' ? DEFAULT_FEMALE_AVATAR : DEFAULT_MALE_AVATAR;
};

export const isAvatarMissing = (avatar) => {
  return typeof avatar !== 'string' || avatar.trim() === '';
};

export const isDefaultAvatar = (avatar) => {
  return DEFAULT_AVATAR_PATHS.includes(avatar);
};
