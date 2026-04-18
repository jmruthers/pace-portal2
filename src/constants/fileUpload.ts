/** Profile photo uploads (PR03) — aligned with pace-core FileUpload and DB `file_metadata.category` (`profile_photo`, see docs/database/decisions). */
export const PROFILE_PHOTO_CATEGORY = 'profile_photo';
export const PROFILE_PHOTO_FOLDER = 'profile_photos';
export const PROFILE_PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp';
export const PROFILE_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
/** First segment of the storage path (`pageContext/folder/category/...`); use app id prefix expected by storage policies. */
export const PROFILE_PHOTO_PAGE_CONTEXT = 'pace';

/** Medical action-plan files (PR11) — `core_file_references` + `medi_action_plan.file_reference_id`. */
export const ACTION_PLAN_CATEGORY = 'medi_action_plan';
export const ACTION_PLAN_FOLDER = 'medi_action_plans';
export const ACTION_PLAN_PAGE_CONTEXT = 'medical-profile';
export const ACTION_PLAN_ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp';
export const ACTION_PLAN_MAX_BYTES = 10 * 1024 * 1024;
