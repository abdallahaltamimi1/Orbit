# School channel relationships

Before Phase D, channel ownership used the channel's stored teacher and school fields. Personal membership was stored in the membership list. Academic years, sections, teacher assignments, student identities and enrollments used separate school-scoped stores. Timetable links and monitoring already required explicit year and section IDs. Legacy links used reviewed class IDs.

New school channels are explicitly marked and carry school, Active year, subject and section IDs. Creation and management validate current reviewed teacher identities and approved assignments for every linked section. Schools may explicitly replace the managing teacher when all linked assignments are approved for the replacement. Transfer appends a history event to the channel without rewriting posts or submissions.

Effective membership is a read-time projection of verified Active-year enrollment. It does not write to the personal membership store. Section changes and revocation are reflected on subsequent reads. Post targeting is checked independently of channel access. New assignment submissions retain the school, year and section recorded at submission. Archived access is read-only and requires a verified historical relationship.

Existing personal and legacy channels keep their original records and rules. Timetable and monitoring use explicit section IDs to recognize new shared channels. This is browser-local demo authorization.
