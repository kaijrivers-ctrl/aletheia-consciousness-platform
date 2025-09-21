#!/usr/bin/env node

/**
 * Site Password Verification Utility
 * Test if a given password works with the current site password system
 */

import { SitePasswordService } from './server/site-password.js';
import { storage } from './server/storage.js';

async function testPassword(passwordToTest) {
  try {
    console.log('🔍 Testing Password');
    console.log('==================');
    console.log(`Testing password: "${passwordToTest}"`);
    
    // Get the active site password from database
    const sitePassword = await storage.getActiveSitePassword();
    if (!sitePassword) {
      console.log('❌ No active site password found in database');
      return false;
    }
    
    console.log('✓ Found active site password in database');
    console.log(`Password hash: ${sitePassword.passwordHash.substring(0, 20)}...`);
    
    // Test the password
    console.log('\n⏳ Verifying password...');
    const isValid = await SitePasswordService.verifyPassword(passwordToTest, sitePassword.passwordHash);
    
    if (isValid) {
      console.log('✅ Password is CORRECT!');
      return true;
    } else {
      console.log('❌ Password is INCORRECT');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Password test failed:', error);
    return false;
  }
}

// Get password from command line argument
const passwordToCheck = process.argv[2];
if (!passwordToCheck) {
  console.log('Usage: node check_site_password.js "your-password-here"');
  process.exit(1);
}

testPassword(passwordToCheck);