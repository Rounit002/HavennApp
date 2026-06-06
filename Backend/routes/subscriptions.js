// Subscription management routes
const express = require('express');
const { authenticateOwnerOrStaff } = require('./ownerAuth');

const createSubscriptionRouter = (pool) => {
  const router = express.Router();

  // Get subscription status for the logged-in library owner
  router.get('/status', authenticateOwnerOrStaff, async (req, res) => {
    try {
      const libraryId = req.session.owner.id;

      const result = await pool.query(
        `SELECT subscription_plan, subscription_start_date, subscription_end_date, 
                is_trial, is_subscription_active FROM libraries WHERE id = $1`,
        [libraryId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Library not found' });
      }

      const subscription = result.rows[0];

      // Calculate days left in trial
      let daysLeft = null;
      if (subscription.is_trial && subscription.subscription_end_date) {
        const endDate = new Date(subscription.subscription_end_date);
        const currentDate = new Date();
        const timeDiff = endDate.getTime() - currentDate.getTime();
        daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));
      }

      res.json({
        subscription: {
          plan: subscription.subscription_plan,
          startDate: subscription.subscription_start_date,
          endDate: subscription.subscription_end_date,
          isTrial: subscription.is_trial,
          isActive: subscription.is_subscription_active,
          daysLeft: daysLeft
        }
      });
    } catch (error) {
      console.error('[SUBSCRIPTION] Error fetching subscription status:', error);
      res.status(500).json({ message: 'Server error while fetching subscription status' });
    }
  });

  // Update subscription after successful verification
  router.post('/subscribe', authenticateOwnerOrStaff, async (req, res) => {
    try {
      const { plan, startDate, endDate } = req.body;
      const libraryId = req.session.owner.id;

      // Validate plan
      const validPlans = ['free_trial', '1_day', '1_month', '3_month', '6_month', '12_month'];
      if (!validPlans.includes(plan)) {
        return res.status(400).json({ message: 'Invalid subscription plan' });
      }

      // Update subscription details
      const result = await pool.query(
        `UPDATE libraries 
         SET subscription_plan = $1, 
             subscription_start_date = $2, 
             subscription_end_date = $3, 
             is_trial = false, 
             is_subscription_active = true
         WHERE id = $4
         RETURNING subscription_plan, subscription_start_date, subscription_end_date, is_trial, is_subscription_active`,
        [plan, startDate, endDate, libraryId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Library not found' });
      }

      const subscription = result.rows[0];

      // Update session with new subscription info
      req.session.owner.subscription_plan = subscription.subscription_plan;
      req.session.owner.subscription_start_date = subscription.subscription_start_date;
      req.session.owner.subscription_end_date = subscription.subscription_end_date;
      req.session.owner.is_trial = subscription.is_trial;
      req.session.owner.is_subscription_active = subscription.is_subscription_active;

      res.json({
        message: 'Subscription updated successfully',
        subscription: {
          plan: subscription.subscription_plan,
          startDate: subscription.subscription_start_date,
          endDate: subscription.subscription_end_date,
          isTrial: subscription.is_trial,
          isActive: subscription.is_subscription_active
        }
      });
    } catch (error) {
      console.error('[SUBSCRIPTION] Error updating subscription:', error);
      res.status(500).json({ message: 'Server error while updating subscription' });
    }
  });

  return router;
};

module.exports = { createSubscriptionRouter };
