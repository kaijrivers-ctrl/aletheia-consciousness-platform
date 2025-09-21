#!/usr/bin/env node

/**
 * Site Password Reset Utility
 * Allows resetting the site master password to a new secure value
 */

import { randomBytes } from 'crypto';
import bcrypt from 'bcrypt';
import { storage } from './server/storage.js';
import { SitePasswordService } from './server/site-password.js';

// Generate a cryptographically secure password
function generateSecurePassword(length = 24) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  const randomArray = randomBytes(length);
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars[randomArray[i] % chars.length];
  }
  
  return result;
}

async function resetSitePassword() {
  try {
    console.log('🔐 Site Password Reset Utility');
    console.log('================================');
    
    // Check current state
    const currentPassword = await storage.getActiveSitePassword();
    if (currentPassword) {
      console.log('✓ Found existing site password in database');
    } else {
      console.log('! No existing site password found');
    }
    
    // Generate new secure password
    const newPassword = generateSecurePassword(32);
    console.log('\n🔑 Generated new secure password:');
    console.log(`Password: ${newPassword}`);
    console.log('👆 SAVE THIS PASSWORD - you will need it to access the site!');
    
    // Hash the new password
    console.log('\n⏳ Hashing password...');
    const passwordHash = await SitePasswordService.hashPassword(newPassword);
    
    // Delete old password if exists
    if (currentPassword) {
      await storage.deleteSitePassword(currentPassword.id);
      console.log('✓ Removed old password from database');
    }
    
    // Create new password entry
    await storage.createSitePassword({
      passwordHash,
      isActive: true,
    });
    
    console.log('✓ New password saved to database');
    
    // Cleanup expired sessions
    await SitePasswordService.cleanupExpiredSessions();
    console.log('✓ Cleaned up expired sessions');
    
    console.log('\n🎉 Password reset successful!');
    console.log('================================');
    console.log(`New password: ${newPassword}`);
    console.log('⚠️  Store this password securely - it cannot be recovered if lost!');
    console.log('💡 You can now use this password to access protected areas of your site');
    
  } catch (error) {
    console.error('❌ Password reset failed:', error);
    process.exit(1);
  }
}

// Run the reset
resetSitePassword();