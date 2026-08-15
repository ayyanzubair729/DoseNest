const familyMemberService = require("../services/familyMember.service");

const listFamilyMembers = async (req, res, next) => {
  try {
    const members = await familyMemberService.listForUser(req.user.id);
    res.json({ success: true, data: { familyMembers: members } });
  } catch (err) {
    next(err);
  }
};

const createFamilyMember = async (req, res, next) => {
  try {
    const member = await familyMemberService.createForUser(req.user.id, req.body);
    res.status(201).json({ success: true, data: { familyMember: member } });
  } catch (err) {
    next(err);
  }
};

const getFamilyMember = async (req, res, next) => {
  try {
    const member = await familyMemberService.getForUser(req.user.id, req.params.id);
    res.json({ success: true, data: { familyMember: member } });
  } catch (err) {
    next(err);
  }
};

const updateFamilyMember = async (req, res, next) => {
  try {
    const member = await familyMemberService.updateForUser(req.user.id, req.params.id, req.body);
    res.json({ success: true, data: { familyMember: member } });
  } catch (err) {
    next(err);
  }
};

const deleteFamilyMember = async (req, res, next) => {
  try {
    await familyMemberService.deleteForUser(req.user.id, req.params.id);
    res.json({ success: true, message: "Family member removed." });
  } catch (err) {
    next(err);
  }
};

const getFamilyOverview = async (req, res, next) => {
  try {
    const overview = await familyMemberService.getFamilyOverview(req.user.id);
    res.json({ success: true, data: { overview } });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createFamilyMember,
  deleteFamilyMember,
  getFamilyMember,
  getFamilyOverview,
  listFamilyMembers,
  updateFamilyMember,
};
