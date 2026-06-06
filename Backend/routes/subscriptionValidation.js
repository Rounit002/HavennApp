// Subscription validation middleware
const express = require('express');

// Middleware to check if subscription is active
const validateSubscription = (req, res, next) => {
  // Allow all GET requests (read-only) regardless of subscription status
  if (req.method === 'GET') {
    return next();
  }

  // Allow staff/admin users to bypass subscription checks
  if (req.session && req.session.user && (req.session.user.role === 'admin' || req.session.user.role === 'staff')) {
    return next();
  }

  // Check if library owner is authenticated
  if (!req.session || !req.session.owner) {
    return res.status(401).json({ message: 'Unauthorized - Please log in as library owner' });
  }

  // Get library information including subscription details
  const library = req.session.owner;
  
  // Check if subscription is active
  if (!library.is_subscription_active) {
    return res.status(403).json({ 
      message: '⛔ Subscription inactive. Please subscribe to continue.',
      subscriptionExpired: true
    });
  }

  // Check if trial period has ended
  if (library.is_trial && library.subscription_end_date) {
    const endDate = new Date(library.subscription_end_date);
    const currentDate = new Date();
    
    if (currentDate > endDate) {
      // Trial has expired, deactivate subscription
      return res.status(403).json({ 
        message: '⛔ Your trial has expired. Please subscribe to continue.',
        subscriptionExpired: true
      });
    }
  }

  next();
};

// Middleware to add subscription info to owner session
const updateOwnerSubscriptionInfo = async (pool, req, res, next) => {
  // Skip subscription info update for staff/admin users
  if (req.session && req.session.user && (req.session.user.role === 'admin' || req.session.user.role === 'staff')) {
    return next();
  }

  if (req.session && req.session.owner && req.session.owner.id) {
    try {
      const result = await pool.query(
        'SELECT subscription_plan, subscription_start_date, subscription_end_date, is_trial, is_subscription_active FROM libraries WHERE id = $1',
        [req.session.owner.id]
      );
      
      if (result.rows.length > 0) {
        const subscriptionInfo = result.rows[0];
        req.session.owner.subscription_plan = subscriptionInfo.subscription_plan;
        req.session.owner.subscription_start_date = subscriptionInfo.subscription_start_date;
        req.session.owner.subscription_end_date = subscriptionInfo.subscription_end_date;
        req.session.owner.is_trial = subscriptionInfo.is_trial;
        req.session.owner.is_subscription_active = subscriptionInfo.is_subscription_active;
      }
    } catch (error) {
      console.error('[SUBSCRIPTION] Error updating owner subscription info:', error);
    }
  }
  next();
};

module.exports = {
  validateSubscription,
  updateOwnerSubscriptionInfo
};
