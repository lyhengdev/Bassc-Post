import User from '../models/User.js';
import { DEFAULT_FEMALE_AVATAR, DEFAULT_MALE_AVATAR } from './userProfile.js';
import logger from '../services/loggerService.js';

const emptyAvatarFilter = {
  $or: [
    { avatar: { $exists: false } },
    { avatar: null },
    { avatar: '' },
  ],
};

const missingGenderFilter = {
  $or: [
    { gender: { $exists: false } },
    { gender: null },
    { gender: '' },
  ],
};

export const backfillUserProfileFields = async () => {
  const [genderResult, birthdayResult] = await Promise.all([
    User.updateMany(missingGenderFilter, { $set: { gender: 'male' } }),
    User.updateMany({ birthday: { $exists: false } }, { $set: { birthday: null } }),
  ]);

  const [femaleAvatarResult, maleAvatarResult] = await Promise.all([
    User.updateMany(
      {
        $and: [
          emptyAvatarFilter,
          { gender: 'female' },
        ],
      },
      { $set: { avatar: DEFAULT_FEMALE_AVATAR } }
    ),
    User.updateMany(
      {
        $and: [
          emptyAvatarFilter,
          {
            $or: [
              { gender: 'male' },
              { gender: { $exists: false } },
              { gender: null },
              { gender: '' },
            ],
          },
        ],
      },
      { $set: { avatar: DEFAULT_MALE_AVATAR } }
    ),
  ]);

  const totalUpdated = (genderResult.modifiedCount || 0)
    + (birthdayResult.modifiedCount || 0)
    + (femaleAvatarResult.modifiedCount || 0)
    + (maleAvatarResult.modifiedCount || 0);

  if (totalUpdated > 0) {
    logger.info('User profile fields backfilled', {
      genderUpdated: genderResult.modifiedCount || 0,
      birthdayUpdated: birthdayResult.modifiedCount || 0,
      femaleAvatarUpdated: femaleAvatarResult.modifiedCount || 0,
      maleAvatarUpdated: maleAvatarResult.modifiedCount || 0,
    });
  }
};

export default backfillUserProfileFields;
