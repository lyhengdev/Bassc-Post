import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Migration Script: Old Ads System → New Collection-Based System
 * 
 * This script converts your existing ads to the new collection structure:
 * - Each old ad becomes a collection with 1 ad
 * - Preserves all targeting, scheduling, and settings
 * - Migrates ad events to reference collections
 * 
 * IMPORTANT: Backup your database before running!
 */

// Import old models (your current system)
const OldAdSchema = new mongoose.Schema({}, { strict: false });
const OldAd = mongoose.model('OldAd', OldAdSchema, 'ads'); // Use existing 'ads' collection

// Import new models
import AdCollection from './models/AdCollection.js';
import Ad from './models/Ad.js';
import AdEvent from './models/AdEvent.js';

const migrationLog = {
  collectionsCreated: 0,
  adsCreated: 0,
  eventsUpdated: 0,
  errors: [],
};

/**
 * Convert old ad to new collection + ad
 */
const migrateAd = async (oldAd) => {
  try {
    console.log(`Migrating ad: ${oldAd.name} (${oldAd._id})`);
    
    // Extract targeting info from old ad
    const targetPages = oldAd.targeting?.pages || ['all'];
    const targetDevices = oldAd.targeting?.devices || ['desktop', 'mobile', 'tablet'];
    const targetUserTypes = [];
    if (oldAd.targeting?.showForLoggedIn !== false && oldAd.targeting?.showForGuests !== false) {
      targetUserTypes.push('all');
    } else if (oldAd.targeting?.showForLoggedIn) {
      targetUserTypes.push('logged_in');
    } else if (oldAd.targeting?.showForGuests) {
      targetUserTypes.push('guest');
    }
    
    const targetCountries = oldAd.targeting?.countries || ['all'];
    const targetCategories = oldAd.targeting?.categories || [];
    
    // Get placement (use first from placements array or placement field)
    const placement = oldAd.placements?.[0] || oldAd.placement || 'custom';
    
    // Create collection
    const collection = await AdCollection.create({
      name: `${oldAd.name} (Migrated)`,
      description: `Migrated from old ads system - ID: ${oldAd._id}`,
      placement,
      placementId: oldAd.placementId || '',
      targetPages,
      targetDevices,
      targetUserTypes,
      targetCountries,
      targetCategories,
      rotationType: 'weighted',
      frequency: {
        type: oldAd.frequency?.type || 'once_per_session',
        maxImpressions: oldAd.frequency?.maxImpressions || 0,
        maxClicks: oldAd.frequency?.maxClicks || 0,
      },
      schedule: {
        startDate: oldAd.schedule?.startDate || new Date(),
        endDate: oldAd.schedule?.endDate || null,
        daysOfWeek: oldAd.schedule?.dayOfWeek || [],
        timeStart: oldAd.schedule?.timeStart || null,
        timeEnd: oldAd.schedule?.timeEnd || null,
        timezone: 'Asia/Phnom_Penh',
      },
      popupSettings: {
        autoClose: oldAd.autoClose !== false,
        autoCloseSeconds: oldAd.autoCloseSeconds || 10,
        showCloseButton: true,
        backdropClickClose: true,
      },
      status: oldAd.status === 'active' ? 'active' : 'paused',
      priority: oldAd.priority || 1,
      stats: {
        totalImpressions: oldAd.stats?.impressions || 0,
        totalClicks: oldAd.stats?.clicks || 0,
        ctr: oldAd.stats?.ctr || 0,
        lastServed: oldAd.stats?.lastImpression || null,
        activeAdsCount: 1,
      },
      createdBy: oldAd.createdBy || null,
      updatedBy: oldAd.updatedBy || null,
      createdAt: oldAd.createdAt || new Date(),
      updatedAt: oldAd.updatedAt || new Date(),
    });
    
    migrationLog.collectionsCreated++;
    console.log(`✓ Created collection: ${collection.name} (${collection._id})`);
    
    // Create ad within collection
    const ad = await Ad.create({
      collectionId: collection._id,
      name: oldAd.name,
      description: oldAd.description || '',
      type: oldAd.type || 'image',
      imageUrl: oldAd.imageUrl || '',
      mobileImageUrl: oldAd.mobileImageUrl || '',
      imageUrls: oldAd.imageUrls || [],
      slideIntervalMs: oldAd.slideIntervalMs || 3000,
      htmlContent: oldAd.htmlContent || '',
      videoUrl: oldAd.videoUrl || '',
      linkUrl: oldAd.linkUrl || '',
      linkTarget: oldAd.linkTarget || '_blank',
      ctaText: oldAd.ctaText || 'Learn More',
      style: oldAd.style || 'banner',
      size: oldAd.size || 'responsive',
      alignment: oldAd.alignment || 'center',
      maxWidth: oldAd.maxWidth || null,
      backgroundColor: oldAd.backgroundColor || '',
      borderRadius: oldAd.borderRadius || 8,
      padding: oldAd.padding || 0,
      showLabel: oldAd.showLabel !== false,
      labelText: oldAd.labelText || 'Advertisement',
      animation: oldAd.animation || 'fade',
      weight: oldAd.weight || 50,
      status: oldAd.status === 'active' ? 'active' : 'paused',
      order: 0,
      altText: oldAd.altText || '',
      stats: {
        impressions: oldAd.stats?.impressions || 0,
        clicks: oldAd.stats?.clicks || 0,
        ctr: oldAd.stats?.ctr || 0,
        lastServed: oldAd.stats?.lastImpression || null,
      },
      createdBy: oldAd.createdBy || null,
      updatedBy: oldAd.updatedBy || null,
      createdAt: oldAd.createdAt || new Date(),
      updatedAt: oldAd.updatedAt || new Date(),
    });
    
    migrationLog.adsCreated++;
    console.log(`✓ Created ad: ${ad.name} (${ad._id})`);
    
    // Update old ad events to reference new collection and ad
    // This connects old tracking data to new system
    const OldAdEvent = mongoose.model('OldAdEvent', new mongoose.Schema({}, { strict: false }), 'adevents');
    
    const updateResult = await OldAdEvent.updateMany(
      { adId: oldAd._id },
      { 
        $set: { 
          collectionId: collection._id,
          // Keep original adId for reference, but add new mapping
          newAdId: ad._id,
        } 
      }
    );
    
    migrationLog.eventsUpdated += updateResult.modifiedCount || 0;
    console.log(`✓ Updated ${updateResult.modifiedCount || 0} events`);
    
    return {
      oldAdId: oldAd._id,
      collectionId: collection._id,
      adId: ad._id,
    };
    
  } catch (error) {
    console.error(`✗ Error migrating ad ${oldAd._id}:`, error.message);
    migrationLog.errors.push({
      oldAdId: oldAd._id,
      error: error.message,
    });
    return null;
  }
};

/**
 * Main migration function
 */
const runMigration = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to database');
    
    // Get all old ads
    const oldAds = await OldAd.find({}).lean();
    console.log(`\nFound ${oldAds.length} ads to migrate\n`);
    
    if (oldAds.length === 0) {
      console.log('No ads to migrate. Exiting.');
      process.exit(0);
    }
    
    // Confirm before proceeding
    console.log('⚠️  IMPORTANT: This will create new collections and ads.');
    console.log('⚠️  Make sure you have backed up your database!');
    console.log('\nStarting migration in 5 seconds... (Press Ctrl+C to cancel)\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Migrate each ad
    const results = [];
    for (const oldAd of oldAds) {
      const result = await migrateAd(oldAd);
      if (result) {
        results.push(result);
      }
    }
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('MIGRATION COMPLETE');
    console.log('='.repeat(60));
    console.log(`Collections created: ${migrationLog.collectionsCreated}`);
    console.log(`Ads created: ${migrationLog.adsCreated}`);
    console.log(`Events updated: ${migrationLog.eventsUpdated}`);
    console.log(`Errors: ${migrationLog.errors.length}`);
    
    if (migrationLog.errors.length > 0) {
      console.log('\nErrors:');
      migrationLog.errors.forEach(err => {
        console.log(`  - Ad ${err.oldAdId}: ${err.error}`);
      });
    }
    
    console.log('\n✓ Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Verify the new collections and ads in your admin panel');
    console.log('2. Test the frontend with the new API endpoints');
    console.log('3. Once verified, you can archive/delete old ads collection');
    
    // Create mapping file for reference
    const fs = await import('fs');
    fs.writeFileSync(
      'migration-mapping.json',
      JSON.stringify(results, null, 2)
    );
    console.log('\n✓ Mapping file saved: migration-mapping.json');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

// Run migration
runMigration();
