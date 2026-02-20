#!/usr/bin/env node

/**
 * Migration Script: AdCollection + Ad → Campaign
 * 
 * Converts the old two-level ads system (AdCollection + Ad)
 * to the new simplified Campaign system
 * 
 * Usage:
 *   node src/migrations/migrateAdsToCampaigns.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import AdCollection from '../models/AdCollection.js';
import Ad from '../models/Ad.js';
import Campaign from '../models/Campaign.js';
import { nanoid } from 'nanoid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

// Placement mapping (old → new)
const PLACEMENT_MAP = {
  popup: 'popup',
  header: 'top_banner',
  footer: 'footer_banner',
  sidebar: 'sidebar',
  in_article: 'in_content',
  after_article: 'in_content',
  between_sections: 'in_content',
  floating_banner: 'floating',
  custom: 'in_content', // Map custom to in_content
};

// Status mapping
const STATUS_MAP = {
  draft: 'draft',
  active: 'active',
  paused: 'paused',
  archived: 'ended',
};

async function connectDB() {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/bassac-cms';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function migrateAdCollectionToCampaign(adCollection) {
  try {
    // Get all ads for this collection
    const ads = await Ad.find({ collectionId: adCollection._id });

    if (ads.length === 0) {
      console.log(`⚠️  Skipping "${adCollection.name}" - no ads found`);
      return null;
    }

    // Convert ads
    const campaignAds = ads.map(ad => ({
      adId: nanoid(10),
      type: ad.type || 'image',
      imageUrl: ad.imageUrl || '',
      mobileImageUrl: ad.mobileImageUrl || '',
      htmlContent: ad.htmlContent || '',
      videoUrl: ad.videoUrl || '',
      linkUrl: ad.linkUrl || '',
      linkTarget: ad.linkTarget || '_blank',
      ctaText: ad.ctaText || 'Learn More',
      altText: ad.altText || '',
      weight: ad.weight || 50,
      stats: {
        impressions: ad.stats?.impressions || 0,
        clicks: ad.stats?.clicks || 0,
        ctr: ad.stats?.ctr || 0,
        conversions: ad.stats?.conversions || 0,
      },
      isActive: ad.status === 'active',
    }));

    // Normalize weights
    const totalWeight = campaignAds.reduce((sum, ad) => sum + ad.weight, 0);
    if (totalWeight > 0) {
      campaignAds.forEach(ad => {
        ad.weight = Math.round((ad.weight / totalWeight) * 100);
      });
    }

    // Map placement
    const newPlacement = PLACEMENT_MAP[adCollection.placement] || 'in_content';

    // Map status
    const newStatus = STATUS_MAP[adCollection.status] || 'draft';

    // Convert targeting
    const targeting = {
      pages: adCollection.targetPages?.filter(p => p !== 'all') || [],
      devices: adCollection.targetDevices || ['desktop', 'mobile', 'tablet'],
      visitors: 'all', // Default to all (old system didn't have this)
      countries: adCollection.targetCountries?.filter(c => c !== 'all') || [],
      categories: adCollection.targetCategories || [],
    };

    // Convert schedule
    const schedule = {
      startDate: adCollection.schedule?.startDate || new Date(),
      endDate: adCollection.schedule?.endDate || null,
      timezone: adCollection.schedule?.timezone || 'Asia/Phnom_Penh',
    };

    // Convert settings
    const settings = {
      popup: {
        autoClose: adCollection.popupSettings?.autoClose !== false,
        autoCloseSeconds: adCollection.popupSettings?.autoCloseSeconds || 10,
        showCloseButton: adCollection.popupSettings?.showCloseButton !== false,
        backdropClickClose: adCollection.popupSettings?.backdropClickClose !== false,
      },
      banner: {
        sticky: false,
        dismissible: true,
      },
      floating: {
        position: 'bottom-right',
        minimizable: true,
      },
      inContent: {
        position: 'after_paragraph',
        paragraphIndex: 3,
      },
    };

    // Convert frequency
    const frequency = {
      type: adCollection.frequency?.type || 'once_per_session',
      maxImpressions: adCollection.frequency?.maxImpressions || 0,
      maxClicks: adCollection.frequency?.maxClicks || 0,
    };

    // Calculate aggregate stats
    const totalImpressions = campaignAds.reduce((sum, ad) => sum + ad.stats.impressions, 0);
    const totalClicks = campaignAds.reduce((sum, ad) => sum + ad.stats.clicks, 0);
    const totalConversions = campaignAds.reduce((sum, ad) => sum + ad.stats.conversions, 0);

    // Create campaign
    const campaign = {
      name: adCollection.name,
      description: adCollection.description || '',
      placement: newPlacement,
      targeting,
      schedule,
      ads: campaignAds,
      settings,
      frequency,
      status: newStatus,
      stats: {
        totalImpressions,
        totalClicks,
        ctr: totalImpressions > 0 ? parseFloat(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0,
        totalConversions,
        budget: 0,
        spent: 0,
      },
      createdBy: adCollection.createdBy || null,
      updatedBy: adCollection.updatedBy || null,
      createdAt: adCollection.createdAt,
      updatedAt: adCollection.updatedAt,
    };

    return campaign;
  } catch (error) {
    console.error(`❌ Error migrating "${adCollection.name}":`, error.message);
    return null;
  }
}

async function migrate() {
  console.log('\n🚀 Starting migration: AdCollection + Ad → Campaign\n');

  try {
    await connectDB();

    // Check if campaigns already exist
    const existingCampaigns = await Campaign.countDocuments();
    if (existingCampaigns > 0) {
      console.log(`⚠️  Warning: ${existingCampaigns} campaigns already exist`);
      console.log('   This migration will create new campaigns from AdCollections');
      console.log('   Old AdCollections and Ads will NOT be deleted automatically\n');
    }

    // Get all ad collections
    const adCollections = await AdCollection.find({});
    console.log(`📊 Found ${adCollections.length} ad collections to migrate\n`);

    if (adCollections.length === 0) {
      console.log('✅ No ad collections to migrate');
      await mongoose.disconnect();
      return;
    }

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    // Migrate each collection
    for (const adCollection of adCollections) {
      console.log(`📦 Migrating: "${adCollection.name}"...`);

      const campaignData = await migrateAdCollectionToCampaign(adCollection);

      if (!campaignData) {
        skipCount++;
        continue;
      }

      try {
        // Check if campaign with same name already exists
        const existing = await Campaign.findOne({ name: campaignData.name });
        if (existing) {
          console.log(`   ⚠️  Campaign "${campaignData.name}" already exists - skipping`);
          skipCount++;
          continue;
        }

        await Campaign.create(campaignData);
        console.log(`   ✅ Created campaign with ${campaignData.ads.length} ads`);
        successCount++;
      } catch (error) {
        console.error(`   ❌ Failed to create campaign:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Successfully migrated: ${successCount}`);
    console.log(`   ⚠️  Skipped: ${skipCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📦 Total processed: ${adCollections.length}\n`);

    if (successCount > 0) {
      console.log('✅ Migration completed successfully!');
      console.log('\n📝 Next steps:');
      console.log('   1. Test the new campaigns in the dashboard');
      console.log('   2. Verify all data migrated correctly');
      console.log('   3. Update your frontend to use /dashboard/campaigns');
      console.log('   4. Once verified, you can optionally remove old AdCollections and Ads\n');
    } else {
      console.log('⚠️  No campaigns were migrated');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB\n');
  }
}

// Run migration
migrate().catch(console.error);
