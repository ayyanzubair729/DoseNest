const medicationLogService = require("../services/medicationLog.service");
const familyMemberService = require("../services/familyMember.service");

const listLogs = async (req, res, next) => {
  try {
    // Ownership check: the family member (if any) must belong to this user.
    if (req.query.familyMemberId) {
      await familyMemberService.getForUser(req.user.id, req.query.familyMemberId);
    }

    const logs = await medicationLogService.listLogs(req.user.id, {
      medicationId: req.query.medicationId,
      familyMemberId: req.query.familyMemberId,
      status: req.query.status,
      limit: req.query.limit,
    });
    res.json({ success: true, data: { logs } });
  } catch (err) {
    next(err);
  }
};

const markTaken = async (req, res, next) => {
  try {
    const log = await medicationLogService.markLog(req.user.id, req.params.id, "taken");
    res.json({ success: true, data: { log } });
  } catch (err) {
    next(err);
  }
};

const markMissed = async (req, res, next) => {
  try {
    const log = await medicationLogService.markLog(req.user.id, req.params.id, "missed");
    res.json({ success: true, data: { log } });
  } catch (err) {
    next(err);
  }
};

module.exports = { listLogs, markMissed, markTaken };
