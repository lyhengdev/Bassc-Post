import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

import AdCollection from '../models/AdCollection.js';
import Ad from '../models/Ad.js';
import AdEvent from '../models/AdEvent.js';

/**
 * Migration Script: Convert Old Ads → New Collection-Based System
 * 
 * This script:
 * 1. Creates one collection per existing ad
 * 2. Moves the ad into that collection
 * 3. Updates all tracking events to reference collections
 * 4. Preserves all settings and stats
 * 
 * SAFE: Creates new data, doesn't delete old ads
 */

const migrationLog = {
  collectionsCreated: 0,
  adsUpdated: 0,
  eventsUpdated: 0,
  errors: [],
  warnings: [],
  skipped: 0,
};

/**
 * Convert old ad to new collection + update ad
 */
async function migrateAd(oldAd) {
  try {
    console.log(`\n📦 Migrating: ${oldAd.name} (${oldAd._id})`);
    
    // Skip if ad already has a collection
    if (oldAd.collectionId) {
      console.log(`   ⏭️  Already has collection, skipping`);
      migrationLog.skipped++;
      return null;
    }
    
    // Determine placement (use first from placements array or single placement)
    const placement = oldAd.placements?.length > 0 
      ? oldAd.placements[0] 
      : oldAd.placement || 'custom';
    
    // Extract targeting from old schema
    const targetPages = oldAd.targeting?.pages === 'all' || !oldAd.targeting?.pages
      ? ['all']
      : [oldAd.targeting.pages];
    
    const targetDevices = [];
    if (oldAd.targeting?.devices?.desktop) targetDevices.push('desktop');
    if (oldAd.targeting?.devices?.mobile) targetDevices.push('mobile');
    if (oldAd.targeting?.devices?.tablet) targetDevices.push('tablet');
    if (targetDevices.length === 0) targetDevices.push('desktop', 'mobile', 'tablet');
    
    const targetUserTypes = [];
    if (oldAd.targeting?.userStatus?.loggedIn && oldAd.targeting?.userStatus?.guest) {
      targetUserTypes.push('all');
    } else if (oldAd.targeting?.userStatus?.loggedIn) {
      targetUserTypes.push('logged_in');
    } else if (oldAd.targeting?.userStatus?.guest) {
      targetUserTypes.push('guest');
    } else {
      targetUserTypes.push('all');
    }
    
    const targetCountries = oldAd.targeting?.geoTargeting?.enabled && oldAd.targeting?.geoTargeting?.countries?.length > 0
      ? oldAd.targeting.geoTargeting.countries
      : ['all'];
    
    // Create collection
    const collection = await AdCollection.create({
      name: `${oldAd.name} (Migrated)`,
      description: `Auto-migrated from old ads system. Original ID: ${oldAd._id}`,
      placement,
      placementId: oldAd.placementId || '',
      targetPages,
      targetDevices,
      targetUserTypes,
      targetCountries,
      targetCategories: oldAd.targeting?.categories || [],
      excludeCategories: oldAd.targeting?.excludeCategories || [],
      rotationType: 'weighted',
      frequency: {
        type: oldAd.frequency?.type || 'unlimited',
        maxImpressions: oldAd.frequency?.maxImpressions || 0,
        maxClicks: oldAd.frequency?.maxClicks || 0,
      },
      schedule: {
        startDate: oldAd.schedule?.startDate || new Date(),
        endDate: oldAd.schedule?.endDate || null,
        daysOfWeek: oldAd.schedule?.dayOfWeek || [],
        timeStart: oldAd.schedule?.timeStart || '',
        timeEnd: oldAd.schedule?.timeEnd || '',
      },
      popupSettings: {
        autoClose: oldAd.autoCloseSeconds > 0,
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
      notes: oldAd.notes || '',
      tags: oldAd.tags || [],
      createdAt: oldAd.createdAt || new Date(),
      updatedAt: oldAd.updatedAt || new Date(),
    });
    
    migrationLog.collectionsCreated++;
    console.log(`   ✅ Collection created: ${collection._id}`);
    
    // Update the ad to reference the collection
    oldAd.collectionId = collection._id;
    oldAd.weight = oldAd.weight || 50;
    oldAd.order = 0;
    await oldAd.save();
    
    migrationLog.adsUpdated++;
    console.log(`   ✅ Ad updated with collectionId`);
    
    // Update ad events to reference collection
    const eventUpdateResult = await AdEvent.updateMany(
      { adId: oldAd._id },
      { $set: { collectionId: collection._id } }
    );
    
    migrationLog.eventsUpdated += eventUpdateResult.modifiedCount || 0;
    console.log(`   ✅ Updated ${eventUpdateResult.modifiedCount || 0} events`);
    
    return {
      oldAdId: oldAd._id,
      collectionId: collection._id,
      eventsUpdated: eventUpdateResult.modifiedCount || 0,
    };
    
  } catch (error) {
    console.error(`   ❌ Error migrating ad ${oldAd._id}:`, error.message);
    migrationLog.errors.push({
      oldAdId: oldAd._id,
      adName: oldAd.name,
      error: error.message,
    });
    return null;
  }
}

/**
 * Main migration function
 */
async function runMigration() {
  try {
    console.log('🚀 Starting Ads Migration: Old System → Collection-Based System\n');
    console.log('=' .repeat(70));
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bassac_media_center');
    console.log('✅ Connected to database\n');
    
    // Get all ads
    const ads = await Ad.find({}).lean();
    console.log(`📊 Found ${ads.length} ads to migrate\n`);
    
    if (ads.length === 0) {
      console.log('No ads to migrate. Exiting.');
      process.exit(0);
    }
    
    // Show warning
    console.log('⚠️  IMPORTANT:');
    console.log('   - This will create new collections for your existing ads');
    console.log('   - Your old ads will remain intact (backward compatible)');
    console.log('   - Events will be updated to reference collections');
    console.log('   - Make sure you have backed up your database!\n');
    console.log('Starting in 5 seconds... (Press Ctrl+C to cancel)\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('=' .repeat(70));
    
    // Migrate each ad
    const results = [];
    for (const adData of ads) {
      const result = await migrateAd(adData);
      if (result) {
        results.push(result);
      }
    }
    
    // Print summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 MIGRATION COMPLETE');
    console.log('='.repeat(70));
    console.log(`✅ Collections created:  ${migrationLog.collectionsCreated}`);
    console.log(`✅ Ads updated:          ${migrationLog.adsUpdated}`);
    console.log(`✅ Events updated:       ${migrationLog.eventsUpdated}`);
    console.log(`⏭️  Ads skipped:         ${migrationLog.skipped}`);
    console.log(`❌ Errors:               ${migrationLog.errors.length}`);
    
    if (migrationLog.errors.length > 0) {
      console.log('\n❌ Errors:');
      migrationLog.errors.forEach(err => {
        console.log(`   - ${err.adName} (${err.oldAdId}): ${err.error}`);
      });
    }
    
    if (migrationLog.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      migrationLog.warnings.forEach(warn => {
        console.log(`   - ${warn}`);
      });
    }
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Visit /dashboard/ad-collections to see your new collections');
    console.log('2. Test the frontend to make sure ads display correctly');
    console.log('3. Check analytics to ensure tracking is working');
    console.log('4. Once verified, you can start using the new collection-based system!');
    
    // Save migration report
    const fs = await import('fs');
    const report = {
      date: new Date().toISOString(),
      summary: migrationLog,
      migrations: results,
    };
    fs.writeFileSync(
      path.join(__dirname, '../../migration-report.json'),
      JSON.stringify(report, null, 2)
    );
    console.log('\n📄 Migration report saved: backend/migration-report.json');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from database');
  }
}

// Run migration
console.log(`
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│   Bassac CMS - Ads System Migration                          │
│   Old System → New Collection-Based System                    │
│                                                                │
└────────────────────────────────────────────────────────────────┘
`);

runMigration().catch(console.error);
