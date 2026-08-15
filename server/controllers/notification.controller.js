const notificationService = require("../services/notification.service");

const listNotifications = async (req, res, next) => {
  try {
    const notifications = await notificationService.listForUser(req.user.id, {
      unread: req.query.unread,
      type: req.query.type,
      limit: req.query.limit,
    });
    res.json({ success: true, data: { notifications } });
  } catch (err) {
    next(err);
  }
};

const getUnreadCount = async (req, res, next) => {
  try {
    const count = await notificationService.unreadCountForUser(req.user.id);
    res.json({ success: true, data: { count } });
  } catch (err) {
    next(err);
  }
};

const markNotificationRead = async (req, res, next) => {
  try {
    const notification = await notificationService.markReadForUser(req.user.id, req.params.id);
    res.json({ success: true, data: { notification } });
  } catch (err) {
    next(err);
  }
};

const markAllRead = async (req, res, next) => {
  try {
    const marked = await notificationService.markAllReadForUser(req.user.id);
    res.json({ success: true, data: { marked } });
  } catch (err) {
    next(err);
  }
};

const getNextReminder = async (req, res, next) => {
  try {
    const reminder = await notificationService.getNextReminder(req.user.id);
    res.json({ success: true, data: { reminder } });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getNextReminder,
  getUnreadCount,
  listNotifications,
  markAllRead,
  markNotificationRead,
};
