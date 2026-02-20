/**
 * Mailchimp Integration
 * 
 * Professional email marketing integration
 * Replaces basic newsletter system
 */

import mailchimp from '@mailchimp/mailchimp_marketing';

// Initialize Mailchimp
mailchimp.setConfig({
  apiKey: process.env.MAILCHIMP_API_KEY,
  server: process.env.MAILCHIMP_SERVER, // e.g., 'us1'
});

const MAILCHIMP_LIST_ID = process.env.MAILCHIMP_LIST_ID;

/**
 * Subscribe user to newsletter
 */
export const subscribeToNewsletter = async (email, firstName = '', lastName = '') => {
  try {
    const response = await mailchimp.lists.addListMember(MAILCHIMP_LIST_ID, {
      email_address: email,
      status: 'subscribed',
      merge_fields: {
        FNAME: firstName,
        LNAME: lastName,
      },
      tags: ['website', 'newsletter'],
    });

    return {
      success: true,
      subscriberId: response.id,
      message: 'Successfully subscribed to newsletter',
    };
  } catch (error) {
    // Handle specific errors
    if (error.status === 400 && error.title === 'Member Exists') {
      return {
        success: false,
        error: 'already_subscribed',
        message: 'This email is already subscribed',
      };
    }

    console.error('Mailchimp subscribe error:', error);
    return {
      success: false,
      error: 'subscription_failed',
      message: 'Failed to subscribe. Please try again.',
    };
  }
};

/**
 * Unsubscribe user from newsletter
 */
export const unsubscribeFromNewsletter = async (email) => {
  try {
    const subscriberHash = require('crypto')
      .createHash('md5')
      .update(email.toLowerCase())
      .digest('hex');

    await mailchimp.lists.updateListMember(
      MAILCHIMP_LIST_ID,
      subscriberHash,
      {
        status: 'unsubscribed',
      }
    );

    return {
      success: true,
      message: 'Successfully unsubscribed from newsletter',
    };
  } catch (error) {
    console.error('Mailchimp unsubscribe error:', error);
    return {
      success: false,
      message: 'Failed to unsubscribe. Please try again.',
    };
  }
};

/**
 * Update subscriber information
 */
export const updateSubscriber = async (email, updates) => {
  try {
    const subscriberHash = require('crypto')
      .createHash('md5')
      .update(email.toLowerCase())
      .digest('hex');

    const response = await mailchimp.lists.updateListMember(
      MAILCHIMP_LIST_ID,
      subscriberHash,
      {
        merge_fields: updates,
      }
    );

    return {
      success: true,
      message: 'Subscriber updated successfully',
    };
  } catch (error) {
    console.error('Mailchimp update error:', error);
    return {
      success: false,
      message: 'Failed to update subscriber',
    };
  }
};

/**
 * Add tags to subscriber
 */
export const addSubscriberTags = async (email, tags) => {
  try {
    const subscriberHash = require('crypto')
      .createHash('md5')
      .update(email.toLowerCase())
      .digest('hex');

    await mailchimp.lists.updateListMemberTags(
      MAILCHIMP_LIST_ID,
      subscriberHash,
      {
        tags: tags.map(tag => ({ name: tag, status: 'active' })),
      }
    );

    return {
      success: true,
      message: 'Tags added successfully',
    };
  } catch (error) {
    console.error('Mailchimp tag error:', error);
    return {
      success: false,
      message: 'Failed to add tags',
    };
  }
};

/**
 * Get subscriber info
 */
export const getSubscriberInfo = async (email) => {
  try {
    const subscriberHash = require('crypto')
      .createHash('md5')
      .update(email.toLowerCase())
      .digest('hex');

    const response = await mailchimp.lists.getListMember(
      MAILCHIMP_LIST_ID,
      subscriberHash
    );

    return {
      success: true,
      subscriber: {
        email: response.email_address,
        status: response.status,
        firstName: response.merge_fields.FNAME,
        lastName: response.merge_fields.LNAME,
        tags: response.tags,
        subscribedAt: response.timestamp_opt,
      },
    };
  } catch (error) {
    if (error.status === 404) {
      return {
        success: false,
        error: 'not_found',
        message: 'Subscriber not found',
      };
    }

    console.error('Mailchimp get subscriber error:', error);
    return {
      success: false,
      message: 'Failed to get subscriber info',
    };
  }
};

/**
 * Batch subscribe users (for migration)
 */
export const batchSubscribe = async (subscribers) => {
  try {
    const operations = subscribers.map(sub => ({
      method: 'POST',
      path: `/lists/${MAILCHIMP_LIST_ID}/members`,
      body: JSON.stringify({
        email_address: sub.email,
        status: 'subscribed',
        merge_fields: {
          FNAME: sub.firstName || '',
          LNAME: sub.lastName || '',
        },
        tags: sub.tags || ['migrated'],
      }),
    }));

    const response = await mailchimp.batches.start({
      operations,
    });

    return {
      success: true,
      batchId: response.id,
      totalOperations: response.total_operations,
      message: 'Batch import started',
    };
  } catch (error) {
    console.error('Mailchimp batch error:', error);
    return {
      success: false,
      message: 'Batch import failed',
    };
  }
};

/**
 * Get campaign statistics
 */
export const getCampaignStats = async (campaignId) => {
  try {
    const response = await mailchimp.reports.getCampaignReport(campaignId);

    return {
      success: true,
      stats: {
        emails_sent: response.emails_sent,
        opens: response.opens.opens_total,
        unique_opens: response.opens.unique_opens,
        open_rate: response.opens.open_rate,
        clicks: response.clicks.clicks_total,
        unique_clicks: response.clicks.unique_clicks,
        click_rate: response.clicks.click_rate,
        unsubscribes: response.unsubscribed,
      },
    };
  } catch (error) {
    console.error('Mailchimp stats error:', error);
    return {
      success: false,
      message: 'Failed to get campaign stats',
    };
  }
};

export default {
  subscribeToNewsletter,
  unsubscribeFromNewsletter,
  updateSubscriber,
  addSubscriberTags,
  getSubscriberInfo,
  batchSubscribe,
  getCampaignStats,
};
