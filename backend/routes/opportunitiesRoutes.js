import express from "express";
import supabase from "../config/supabaseClient.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();


// ✅ 1. Create Opportunity (Organization Only)
router.post("/", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "organization") {
      return res.status(403).json({ error: "Only organizations can create opportunities" });
    }

    const { title, description, location, date } = req.body;

    const { data, error } = await supabase
      .from("opportunities")
      .insert([
        {
          title,
          description,
          location,
          date,
          organization_id: req.user.id,
        },
      ])
      .select();

    if (error) throw error;

    res.status(201).json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ✅ 2. Get All Opportunities (Public)
router.get("/", async (req, res) => {
  try {
    const { location, search } = req.query;

    let query = supabase
      .from("opportunities")
      .select("*")
      .order("created_at", { ascending: false });

    // 🔎 Filter by location
    if (location) {
      query = query.ilike("location", `%${location}%`);
    }

    // 🔍 Optional title search
    if (search) {
      query = query.ilike("title", `%${search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json(data);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ✅ 3. Apply to Opportunity (Volunteer Only)
router.post("/:id/apply", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "volunteer") {
      return res.status(403).json({ error: "Only volunteers can apply" });
    }

    const opportunityId = req.params.id;

    const { data: opportunity } = await supabase
      .from("opportunities")
      .select("*")
      .eq("id", opportunityId)
      .single();

    const { data: existing } = await supabase
      .from("applications")
      .select("*")
      .eq("opportunity_id", opportunityId)
      .eq("volunteer_id", req.user.id)
      .single();

    if (existing) {
      return res.status(400).json({ error: "Already applied" });
    }

    const { data, error } = await supabase
      .from("applications")
      .insert([
        {
          opportunity_id: opportunityId,
          volunteer_id: req.user.id,
          status: "pending",
        },
      ])
      .select();

    if (error) throw error;

    // 🔔 Notification for organization
    await supabase.from("notifications").insert([
      {
        user_id: opportunity.organization_id,
        message: "A volunteer applied to your opportunity.",
      },
    ]);

    res.status(201).json(data[0]);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ✅ 4. Get My Applications (Volunteer)
router.get("/my/applications", verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("applications")
      .select("*, opportunities(*)")
      .eq("volunteer_id", req.user.id);

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Get applicants for organization
router.get("/org/applications", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "organization") {
      return res.status(403).json({ error: "Only organizations allowed" });
    }

    const { data, error } = await supabase
      .from("applications")
      .select("*, users(*), opportunities(*)")
      .eq("opportunities.organization_id", req.user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// =============================
// MARK COMPLETE / INCOMPLETE
// =============================
router.patch("/applications/:id/status", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "organization") {
      return res.status(403).json({ error: "Only organizations allowed" });
    }

    const { status } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    const { data, error } = await supabase
      .from("applications")
      .update({ status })
      .eq("id", req.params.id)
      .select()
      .single();

    if (error || !data) {
      return res.status(400).json({ error: "Application not found" });
    }

    res.json(data);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get("/stats", verifyToken, async (req, res) => {
  try {
    if (req.user.role === "organization") {
      const { count, error } = await supabase
        .from("opportunities")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", req.user.id);

      if (error) throw error;

      return res.json({ opportunities: count });
    }

    if (req.user.role === "volunteer") {
      const { count, error } = await supabase
        .from("applications")
        .select("*", { count: "exact", head: true })
        .eq("volunteer_id", req.user.id);

      if (error) throw error;

      return res.json({ applications: count });
    }

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get("/notifications", verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.patch("/notifications/:id/read", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);

    if (error) throw error;

    res.json({ message: "Notification marked as read" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.patch("/applications/:id/complete", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "organization") {
      return res.status(403).json({ error: "Only organizations allowed" });
    }

    const { id } = req.params;
    const { completed, hours } = req.body;

    if (completed === undefined) {
      return res.status(400).json({ error: "Completed value required" });
    }

    // Fetch application
    const { data: app, error: fetchError } = await supabase
      .from("applications")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !app) {
      return res.status(400).json({ error: "Application not found" });
    }

    // Always ensure status becomes approved
    const { data, error } = await supabase
      .from("applications")
      .update({
        status: "approved",
        completed: completed,
        hours: completed ? hours || 0 : 0,
        completed_at: completed ? new Date() : null
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(data);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.post("/applications/:id/rate", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "organization") {
      return res.status(403).json({ error: "Only organizations allowed" });
    }

    const { id } = req.params;
    const { feedback, type } = req.body; 
    // type = "positive" OR "negative"

    const { data: app, error: fetchError } = await supabase
      .from("applications")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !app) {
      return res.status(400).json({ error: "Application not found" });
    }

    if (!app.completed) {
      return res.status(400).json({ error: "Event not completed yet" });
    }

    // Determine rating change
    const change = type === "positive" ? 1 : -1;

    // Update volunteer rating_score
    const { data: volunteer } = await supabase
      .from("users")
      .select("rating_score")
      .eq("id", app.volunteer_id)
      .single();

    const newScore = (volunteer.rating_score || 0) + change;

    await supabase
      .from("users")
      .update({ rating_score: newScore })
      .eq("id", app.volunteer_id);

    // Insert notification with actual feedback
    await supabase.from("notifications").insert([{
      user_id: app.volunteer_id,
      message: `${type === "positive" ? "⭐ Positive" : "⚠ Negative"} feedback: "${feedback}"`
    }]);

    res.json({ message: "Rating updated", newScore });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// =============================
// 8️⃣ GET VOLUNTEER TOTAL RATING
// =============================
router.get("/volunteer/:id/rating", async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("ratings")
      .select("rating")
      .eq("volunteer_id", id);

    if (error) throw error;

    const totalRating = data.reduce((sum, r) => sum + r.rating, 0);

    res.json({ rating: totalRating });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// =============================
// GET ORGANIZATION RATING
// =============================
router.get("/organization/:id/rating", async (req, res) => {
  try {
    const { id } = req.params;

    const { count, error } = await supabase
      .from("opportunities")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", id);

    if (error) throw error;

    res.json({ rating: count });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// =============================
// GET ORGANIZATION STATS
// =============================
router.get("/organization/:id/stats", async (req, res) => {
  try {
    const { id } = req.params;

    // Total opportunities created
    const { count: opportunitiesCount } = await supabase
      .from("opportunities")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", id);

    // Completed applications under this org
    const { count: completedCount } = await supabase
      .from("applications")
      .select("*, opportunities!inner(*)", { count: "exact", head: true })
      .eq("opportunities.organization_id", id)
      .eq("completed", true);

    res.json({
      rating: completedCount || 0,
      totalOpportunities: opportunitiesCount || 0
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get("/org", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "organization") {
      return res.status(403).json({ error: "Only organizations allowed" });
    }

    const { data, error } = await supabase
      .from("opportunities")
      .select("*")
      .eq("organization_id", req.user.id); // 🔥 IMPORTANT FILTER

    if (error) return res.status(400).json(error);

    res.json(data);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
export default router;