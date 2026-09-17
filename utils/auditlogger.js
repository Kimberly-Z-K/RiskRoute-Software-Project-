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
    // Get the currently logged-in Supabase user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.warn("Audit log skipped: no authenticated user");
      return;
    }

    const logData = {
      // New UUID column for mobile/Supabase Auth users
      auth_user_id: user.id,

      // Keep the existing numeric user_id empty for mobile
      user_id: null,

      user_email: user.email || null,

      user_name:
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email ||
        "Unknown User",

      user_role:
        user.user_metadata?.role ||
        "Driver",

      action,

      description:
        description ||
        `${user.email || "User"} performed ${action
          .toLowerCase()
          .replace(/_/g, " ")} on ${page || "Mobile App"}`,

      page: page || "Mobile App",

      element,

      target_id:
        targetId !== null && targetId !== undefined
          ? String(targetId)
          : null,

      target_name: targetName || null,

      before_value:
        beforeValue !== null && beforeValue !== undefined
          ? String(beforeValue)
          : null,

      after_value:
        afterValue !== null && afterValue !== undefined
          ? String(afterValue)
          : null,

      details: {
        ...details,
        platform: "mobile",
        timestamp: new Date().toISOString(),
      },

      url: null,
    };

    console.log("📝 MOBILE AUDIT:", logData);

    const { error } = await supabase
      .from("audit_logs")
      .insert(logData);

    if (error) {
      console.error("❌ Mobile audit log failed:", error);
      return;
    }

    console.log("✅ Mobile audit log saved:", action);
  } catch (error) {
    console.error("❌ Mobile audit logger exception:", error);
  }
};