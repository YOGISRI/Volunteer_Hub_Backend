router.get("/users/:id/impact-report", verifyToken, async (req, res) => {
  const { id } = req.params;

  // 1️⃣ Completed Applications
  const { data: apps } = await supabase
    .from("applications")
    .select("hours, opportunity_id")
    .eq("volunteer_id", id)
    .eq("completed", true);

  const totalHours = apps.reduce((sum, a) => sum + (a.hours || 0), 0);
  const totalOpportunities = apps.length;

  // 2️⃣ Unique Organizations
  const { data: orgs } = await supabase
    .from("applications")
    .select("organization_id")
    .eq("volunteer_id", id)
    .eq("completed", true);

  const uniqueOrgs = new Set(orgs.map(o => o.organization_id));

  // 3️⃣ Average Rating
  const { data: ratings } = await supabase
    .from("ratings")
    .select("rating")
    .eq("volunteer_id", id);

  const averageRating =
    ratings.length > 0
      ? (
          ratings.reduce((sum, r) => sum + r.rating, 0) /
          ratings.length
        ).toFixed(1)
      : 0;

  res.json({
    totalHours,
    totalOpportunities,
    totalOrganizations: uniqueOrgs.size,
    averageRating
  });
});