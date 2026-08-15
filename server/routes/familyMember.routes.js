const { Router } = require("express");
const { protect } = require("../middleware/auth");
const {
  assertValidObjectId,
  validateMemberInput,
} = require("../validators/familyMember.validators");
const familyMemberController = require("../controllers/familyMember.controller");

const router = Router();

router.use(protect);

// Static routes must be registered before the :id route.
router.get("/summary", familyMemberController.getFamilyOverview);

router.get("/", familyMemberController.listFamilyMembers);
router.post("/", validateMemberInput, familyMemberController.createFamilyMember);
router.get("/:id", assertValidObjectId, familyMemberController.getFamilyMember);
router.put("/:id", assertValidObjectId, validateMemberInput, familyMemberController.updateFamilyMember);
router.delete("/:id", assertValidObjectId, familyMemberController.deleteFamilyMember);

module.exports = router;
