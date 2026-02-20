#!/usr/bin/env node

/**
 * Export Newsletter Subscribers
 * 
 * Exports existing newsletter subscribers to CSV
 * for migration to Mailchimp/SendGrid
 */

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function exportSubscribers() {
  console.log('\n📧 NEWSLETTER SUBSCRIBER EXPORT\n');

  try {
    // Connect to MongoDB
    console.log('📦 Connecting to MongoDB...');
    const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB connected\n');

    // Try to find newsletter subscribers
    // Check different possible model names
    let subscribers = [];
    let modelFound = false;

    // Try Newsletter model
    try {
      const Newsletter = mongoose.model('Newsletter');
      subscribers = await Newsletter.find({}).lean();
      modelFound = true;
      console.log(`✅ Found ${subscribers.length} subscribers in Newsletter collection`);
    } catch (e) {
      console.log('ℹ️  Newsletter model not found, trying Subscriber...');
    }

    // Try Subscriber model
    if (!modelFound) {
      try {
        const Subscriber = mongoose.model('Subscriber');
        subscribers = await Subscriber.find({}).lean();
        modelFound = true;
        console.log(`✅ Found ${subscribers.length} subscribers in Subscriber collection`);
      } catch (e) {
        console.log('ℹ️  Subscriber model not found, trying User...');
      }
    }

    // Try User model with newsletter flag
    if (!modelFound) {
      try {
        const User = mongoose.model('User');
        subscribers = await User.find({ 
          $or: [
            { newsletter: true },
            { subscribedToNewsletter: true },
            { isSubscribed: true }
          ]
        }).lean();
        modelFound = true;
        console.log(`✅ Found ${subscribers.length} subscribers in User collection`);
      } catch (e) {
        console.log('⚠️  No subscriber data found');
      }
    }

    if (subscribers.length === 0) {
      console.log('\n⚠️  No subscribers found to export');
      console.log('   This might mean:');
      console.log('   - Newsletter feature not yet used');
      console.log('   - Different collection name');
      console.log('   - Already migrated\n');
      process.exit(0);
    }

    // Prepare CSV data
    console.log('\n📝 Preparing CSV export...');
    
    const csvRows = [];
    
    // Header
    csvRows.push('Email,First Name,Last Name,Subscribed Date,Status');

    // Data rows
    subscribers.forEach(sub => {
      const email = sub.email || sub.emailAddress || '';
      const firstName = sub.firstName || sub.name?.split(' ')[0] || '';
      const lastName = sub.lastName || sub.name?.split(' ')[1] || '';
      const subscribedDate = sub.subscribedAt || sub.createdAt || '';
      const status = sub.isActive !== false ? 'subscribed' : 'unsubscribed';

      // Escape commas in fields
      const escapeCsv = (field) => {
        if (!field) return '';
        return field.toString().includes(',') ? `"${field}"` : field;
      };

      csvRows.push([
        escapeCsv(email),
        escapeCsv(firstName),
        escapeCsv(lastName),
        subscribedDate ? new Date(subscribedDate).toISOString() : '',
        status
      ].join(','));
    });

    // Write to file
    const exportDir = path.join(__dirname, '../../exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const filename = `newsletter-subscribers-${Date.now()}.csv`;
    const filepath = path.join(exportDir, filename);
    
    fs.writeFileSync(filepath, csvRows.join('\n'), 'utf8');

    console.log(`✅ Exported ${subscribers.length} subscribers`);
    console.log(`📁 File saved: ${filepath}\n`);

    // Also create JSON export
    const jsonFilename = `newsletter-subscribers-${Date.now()}.json`;
    const jsonFilepath = path.join(exportDir, jsonFilename);
    
    const jsonData = subscribers.map(sub => ({
      email: sub.email || sub.emailAddress || '',
      firstName: sub.firstName || sub.name?.split(' ')[0] || '',
      lastName: sub.lastName || sub.name?.split(' ')[1] || '',
      subscribedDate: sub.subscribedAt || sub.createdAt || '',
      status: sub.isActive !== false ? 'subscribed' : 'unsubscribed',
      tags: sub.tags || [],
      metadata: sub.metadata || {},
    }));

    fs.writeFileSync(jsonFilepath, JSON.stringify(jsonData, null, 2), 'utf8');
    console.log(`📁 JSON backup: ${jsonFilepath}\n`);

    // Statistics
    const activeCount = subscribers.filter(s => s.isActive !== false).length;
    const inactiveCount = subscribers.length - activeCount;

    console.log('📊 Statistics:');
    console.log(`   Total subscribers: ${subscribers.length}`);
    console.log(`   Active: ${activeCount}`);
    console.log(`   Inactive: ${inactiveCount}`);

    // Sample data
    if (subscribers.length > 0) {
      console.log('\n📋 Sample (first 5):');
      subscribers.slice(0, 5).forEach((sub, i) => {
        console.log(`   ${i + 1}. ${sub.email || sub.emailAddress || 'N/A'}`);
      });
    }

    console.log('\n✅ EXPORT COMPLETE!\n');
    console.log('📝 Next Steps:');
    console.log('   1. Sign up for Mailchimp/SendGrid');
    console.log('   2. Create a new audience/list');
    console.log('   3. Import the CSV file');
    console.log('   4. Verify import was successful');
    console.log('   5. Run cleanup script to remove old system');
    console.log('   6. Integrate new API into signup form\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Export failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run export
exportSubscribers();
