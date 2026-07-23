-- Same drift pattern as monthly_fees.fee_status and notifications.notification_type,
-- caught by an automated crash-hunt across every GET route. `mess_menu.meal_type`
-- was replaced by `meal_type_id -> meal_type_master` in this morning's bulk change,
-- with no code update. Breaks both reading the mess menu (ORDER BY meal_type ->
-- Unknown column) and adding a new item (INSERT still writes meal_type directly).
--
-- meal_type_master is correctly and fully seeded (Breakfast/Lunch/Dinner, no
-- ambiguity), so the join-based backfill can be trusted here.
--
-- meal_type_id / meal_type_master left in place, untouched.

ALTER TABLE mess_menu
  ADD COLUMN meal_type VARCHAR(20) NULL AFTER day_of_week;

UPDATE mess_menu mm
JOIN meal_type_master mtm ON mm.meal_type_id = mtm.id
SET mm.meal_type = mtm.name;
