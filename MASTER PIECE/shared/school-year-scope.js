/* Only explicit reviewed IDs participate in year filtering. Unlinked legacy data is retained. */
(() => {
 function read(){try{const year=OrbitSchoolYearContext.read().selectedYear;if(!year)return null;const model=OrbitSchoolAcademicReadModel.read(year.id),all=OrbitSchoolEnrollments.read().classYearLinks;return {year,model,matches:id=>!all.some(l=>l.classId===id)||all.some(l=>l.classId===id&&l.academicYearId===year.id)};}catch{return null;}}
 window.OrbitSchoolYearScope={read};
})();
