
import { supabase } from "../lib/supabase";

export const auditLog = async ({
  action,
  page,
  description,
  element = null,
  targetId = null,
  targetName = null,
  beforeValue = null,
  afterValue = null,
  details = {},
}) => {
  try {
    // Get the currently authenticated Supabase user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    // Do not save audit events for unauthenticated users
    if (userError || !user) {
      console.warn(
        "Audit log skipped: no authenticated user"
      );

      return false;
    }

    // Build the audit record
    const logData = {
      // Supabase Auth user UUID
      auth_user_id: user.id,

      // Mobile users do not use the existing numeric user_id
      user_id: null,

      // Authenticated user's email
      user_email: user.email || null,

      // Resolve the user's name from Supabase metadata
      user_name:
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email ||
        null,

      // Resolve the user's role
      user_role:
        user.user_metadata?.role ||
        "Driver",

      // Audit action
      action,

      // Audit description
      description:
        description ||
        `${user.email || "User"} performed ${String(action)
          .toLowerCase()
          .replace(/_/g, " ")} on ${
          page || "Mobile App"
        }`,

      // Screen or application area
      page: page || "Mobile App",

      // UI element involved in the event
      element,

      // Convert target ID to a string when supplied
      target_id:
        targetId !== null && targetId !== undefined
          ? String(targetId)
          : null,

      // Target name
      target_name: targetName || null,

      // Previous value
      before_value:
        beforeValue !== null &&
        beforeValue !== undefined
          ? String(beforeValue)
          : null,

      // New value
      after_value:
        afterValue !== null &&
        afterValue !== undefined
          ? String(afterValue)
          : null,

      // Additional information
      details: {
        ...details,
        platform: "mobile",
        timestamp: new Date().toISOString(),
      },

      // Mobile application does not currently use a URL
      url: null,
    };

    console.log("📝 MOBILE AUDIT:", logData);

    // Insert the audit event into Supabase
    const { error: insertError } = await supabase
      .from("mobile_audit_logs")
      .insert([logData]);

    if (insertError) {
      console.error(
        "❌ Mobile audit log failed:",
        insertError
      );

      return false;
    }

    console.log(
      "✅ Mobile audit log saved:",
      action
    );

    return true;
  } catch (error) {
    console.error(
      "❌ Mobile audit logger exception:",
      error
    );

    return false;
  }
};