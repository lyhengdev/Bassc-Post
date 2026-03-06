export const WORKFLOW_ROLES = Object.freeze([
  'writer',
  'editor',
  'translator',
  'admin',
]);

export const WORKFLOW_STATES = Object.freeze([
  'draft',
  'submitted',
  'editor_approved_source',
  'in_translation',
  'translation_submitted',
  'editor_approved_translation',
  'admin_final_review',
  'published',
]);

export const WORKFLOW_RULES = Object.freeze({
  translatorCanSubmit: true,
  writerCanSubmitOwnArticleTranslation: true,
  translatorCanPublish: false,
  adminIsFinalApprover: true,
});

export default {
  WORKFLOW_ROLES,
  WORKFLOW_STATES,
  WORKFLOW_RULES,
};
