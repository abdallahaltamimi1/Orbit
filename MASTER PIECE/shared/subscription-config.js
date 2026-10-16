(() => {
  "use strict";
  const free = { classes: 1, studentsPerClass: 20, lessons: 3, labs: 10, assignments: 5 };
  const plans = {
    "teacher-free": {
      name: "Teacher Free",
      accountType: "teacher",
      price: null,
      limits: free,
      features: {
        publishing: true,
        planning: true,
        basicReports: true,
        advancedReports: false,
        productivity: false,
      },
    },
    "teacher-pro": {
      name: "Teacher Pro",
      accountType: "teacher",
      price: null,
      limits: { classes: 10, studentsPerClass: 100, lessons: 50, labs: 100, assignments: 50 },
      features: {
        publishing: true,
        planning: true,
        basicReports: true,
        advancedReports: true,
        productivity: true,
      },
    },
    "school-starter": {
      name: "School Starter",
      accountType: "school",
      trialDays: 14,
      price: null,
      limits: {
        teachers: 5,
        students: 100,
        classes: 10,
        studentsPerClass: 100,
        lessons: 100,
        labs: 200,
        assignments: 100,
        jobs: 10,
      },
      features: {
        publishing: true,
        planning: true,
        basicReports: true,
        advancedReports: false,
        productivity: true,
        recruitment: true,
        schoolStats: false,
      },
    },
    "school-pro": {
      name: "School Pro",
      accountType: "school",
      price: null,
      limits: {
        teachers: 50,
        students: 1000,
        classes: 100,
        studentsPerClass: 100,
        lessons: 1000,
        labs: 2000,
        assignments: 1000,
        jobs: 100,
      },
      features: {
        publishing: true,
        planning: true,
        basicReports: true,
        advancedReports: true,
        productivity: true,
        recruitment: true,
        schoolStats: true,
      },
    },
  };
  // Override individual plan fields from OrbitConfig.subscriptionPlans before this file loads.
  for (const [id, override] of Object.entries(window.OrbitConfig?.subscriptionPlans || {})) {
    plans[id] = {
      ...plans[id],
      ...override,
      limits: { ...plans[id]?.limits, ...override.limits },
      features: { ...plans[id]?.features, ...override.features },
    };
  }
  window.OrbitPlanConfig = {
    plans,
    labSessionMinutes: 30,
    monthlyResources: ["lessons", "labs", "assignments", "jobs"],
  };
})();
